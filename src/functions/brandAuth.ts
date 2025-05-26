import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database/postgresClient";

interface BrandRegisterRequest {
    brand_name: string;
    email: string;
    password: string;
}

interface BrandLoginRequest {
    email: string;
    password: string;
}

// Brand Registration
app.http('brandRegister', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "brands/auth/register",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as BrandRegisterRequest;
            const { brand_name, email, password } = body;

            // Guard clauses for validation
            if (!brand_name || !email || !password) {
                return {
                    status: 400,
                    jsonBody: { error: "Missing required fields: brand_name, email, or password." }
                };
            }

            if (password.length < 6) {
                return {
                    status: 400,
                    jsonBody: { error: "Password must be at least 6 characters long." }
                };
            }

            // Check if brand with this email already exists
            const existingBrand = await pool.query(
                "SELECT brand_id FROM dbo.brands WHERE email = $1", 
                [email]
            );

            if (existingBrand.rows.length > 0) {
                return {
                    status: 409,
                    jsonBody: { error: "A brand with this email already exists." }
                };
            }

            // Check if brand name is already taken
            const nameCheck = await pool.query(
                "SELECT brand_id FROM dbo.brands WHERE brand_name = $1",
                [brand_name]
            );

            if (nameCheck.rows.length > 0) {
                return {
                    status: 409,
                    jsonBody: { error: "Brand name is already taken." }
                };
            }

            // Hash the password
            const saltRounds = 12;
            const passwordHash = await bcryptjs.hash(password, saltRounds);

            // Insert the new brand
            const result = await pool.query(
                `INSERT INTO dbo.brands (brand_name, email, password_hash, is_verified, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                 RETURNING brand_id, brand_name, email, is_verified, created_at`,
                [brand_name, email, passwordHash, false]
            );

            const brand = result.rows[0];

            return {
                status: 201,
                jsonBody: { 
                    message: "Brand registered successfully",
                    brand: {
                        brand_id: brand.brand_id,
                        brand_name: brand.brand_name,
                        email: brand.email,
                        is_verified: brand.is_verified,
                        created_at: brand.created_at
                    }
                }
            };
        } catch (error) {
            context.error('Error in brandRegister function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

// Brand Login
app.http('brandLogin', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: "brands/auth/login",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as BrandLoginRequest;
            const { email, password } = body;

            // Guard clauses for validation
            if (!email || !password) {
                return {
                    status: 400,
                    jsonBody: { error: "Missing required fields: email or password." }
                };
            }

            // Find the brand by email
            const result = await pool.query(
                `SELECT brand_id, brand_name, email, password_hash, is_verified, created_at 
                 FROM dbo.brands WHERE email = $1`,
                [email]
            );

            if (result.rows.length === 0) {
                return {
                    status: 401,
                    jsonBody: { error: "Invalid email or password." }
                };
            }

            const brand = result.rows[0];

            // Verify the password
            const isPasswordValid = await bcryptjs.compare(password, brand.password_hash);
            if (!isPasswordValid) {
                return {
                    status: 401,
                    jsonBody: { error: "Invalid email or password." }
                };
            }

            // Generate JWT token
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                context.error('JWT_SECRET environment variable is not set');
                return {
                    status: 500,
                    jsonBody: { error: "Server configuration error." }
                };
            }

            const token = jwt.sign(
                {
                    brandId: brand.brand_id,
                    email: brand.email,
                    brand_name: brand.brand_name,
                    is_verified: brand.is_verified,
                    type: 'brand' // Distinguish from user tokens
                },
                jwtSecret,
                { expiresIn: '24h' }
            );

            // Update last login timestamp
            await pool.query(
                "UPDATE dbo.brands SET updated_at = CURRENT_TIMESTAMP WHERE brand_id = $1",
                [brand.brand_id]
            );

            return {
                status: 200,
                jsonBody: {
                    message: "Login successful",
                    brand: {
                        brand_id: brand.brand_id,
                        brand_name: brand.brand_name,
                        email: brand.email,
                        is_verified: brand.is_verified,
                        created_at: brand.created_at
                    },
                    token
                }
            };
        } catch (error) {
            context.error('Error in brandLogin function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
}); 