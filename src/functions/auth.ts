import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../database/postgresClient";
import { withGuards } from "../utils/corsMiddleware";

interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

interface LoginRequest {
    email: string;
    password: string;
}

app.http('register', {
    methods: ['POST','OPTIONS'],
    authLevel: 'anonymous',
    route: "auth/register",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as RegisterRequest;
            const { username, email, password } = body;

            if (!username || !email || !password) {
                return {
                    status: 400,
                    jsonBody: { error: "Missing required fields: username, email, or password." }
                };
            }

            // Check if the user already exists
            const existingUser = await pool.query("SELECT * FROM dbo.users WHERE email = $1", [email]);
            if (existingUser.rows.length > 0) {
                return {
                    status: 400,
                    jsonBody: { error: "A user with this email already exists." }
                };
            }

            // Hash the password
            const saltRounds = 10;
            const passwordHash = await bcryptjs.hash(password, saltRounds);

            // Insert the new user into the database
            const result = await pool.query(
                "INSERT INTO dbo.users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email",
                [username, email, passwordHash]
            );

            const user = result.rows[0];

            return {
                status: 201,
                jsonBody: { user }
            };
        } catch (error) {
            context.log('Error in register function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    })
});

app.http('login', {
    methods: ['POST','OPTIONS'],
    authLevel: 'anonymous',
    route: "auth/login",
    handler: withGuards(async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            const body = await request.json() as LoginRequest;
            const { email, password } = body;

            if (!email || !password) {
                return {
                    status: 400,
                    jsonBody: { error: "Missing required fields: email or password." }
                };
            }

            // Find the user by email
            const result = await pool.query(
                "SELECT user_id, username, email, password_hash FROM dbo.users WHERE email = $1",
                [email]
            );

            if (result.rows.length === 0) {
                return {
                    status: 401,
                    jsonBody: { error: "Invalid email or password." }
                };
            }

            const user = result.rows[0];

            // Verify the password
            const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return {
                    status: 401,
                    jsonBody: { error: "Invalid email or password." }
                };
            }

            // Generate JWT token
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                context.log('JWT_SECRET environment variable is not set');
                return {
                    status: 500,
                    jsonBody: { error: "Server configuration error." }
                };
            }

            const token = jwt.sign(
                {
                    userId: user.user_id,
                    email: user.email
                },
                jwtSecret,
                { expiresIn: '24h' }
            );

            // Return user info and token
            return {
                status: 200,
                jsonBody: {
                    user: {
                        user_id: user.user_id,
                        username: user.username,
                        email: user.email
                    },
                    token
                }
            };
        } catch (error) {
            context.log('Error in login function:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: "Internal server error",
                    details: error instanceof Error ? error.message : String(error)
                }
            };
        }
    })
}); 