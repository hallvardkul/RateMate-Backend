import { HttpRequest, InvocationContext } from "@azure/functions";
import jwt from "jsonwebtoken";

export interface BrandAuthPayload {
    brandId: number;
    email: string;
    brand_name: string;
    is_verified: boolean;
    type: 'brand';
}

export class BrandUnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BrandUnauthorizedError';
    }
}

export async function requireBrandAuth(request: HttpRequest, context: InvocationContext): Promise<BrandAuthPayload> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
        throw new BrandUnauthorizedError('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
        throw new BrandUnauthorizedError('Authorization header must start with "Bearer "');
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    if (!token) {
        throw new BrandUnauthorizedError('Token is required');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        context.error('JWT_SECRET environment variable is not set');
        throw new Error('Server configuration error');
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // Verify this is a brand token
        if (decoded.type !== 'brand') {
            throw new BrandUnauthorizedError('Invalid token type. Brand token required.');
        }

        // Ensure required fields are present
        if (!decoded.brandId || !decoded.email || !decoded.brand_name) {
            throw new BrandUnauthorizedError('Invalid token payload');
        }

        return {
            brandId: decoded.brandId,
            email: decoded.email,
            brand_name: decoded.brand_name,
            is_verified: decoded.is_verified || false,
            type: 'brand'
        };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new BrandUnauthorizedError('Invalid token');
        }
        if (error instanceof jwt.TokenExpiredError) {
            throw new BrandUnauthorizedError('Token has expired');
        }
        throw error; // Re-throw other errors
    }
} 