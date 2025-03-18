import { HttpRequest, InvocationContext } from "@azure/functions";
import jwt from "jsonwebtoken";

export interface AuthUser {
    userId: number;
    email: string;
    is_admin?: boolean;
}

export interface AuthResult {
    isAuthenticated: boolean;
    user?: AuthUser;
    error?: string;
}

/**
 * Middleware to authenticate requests using JWT tokens
 * @param request The HTTP request
 * @param context The function invocation context
 * @returns Authentication result with user info if successful
 */
export async function authenticate(request: HttpRequest, context: InvocationContext): Promise<AuthResult> {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return { isAuthenticated: false, error: "No authorization header provided" };
        }

        // Check if it's a Bearer token
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return { isAuthenticated: false, error: "Invalid authorization format. Use 'Bearer [token]'" };
        }

        const token = parts[1];
        
        // Get JWT secret from environment
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            context.log('JWT_SECRET environment variable is not set');
            return { isAuthenticated: false, error: "Server configuration error" };
        }

        // Verify the token
        const decoded = jwt.verify(token, jwtSecret) as AuthUser;
        
        return {
            isAuthenticated: true,
            user: {
                userId: decoded.userId,
                email: decoded.email
            }
        };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return { isAuthenticated: false, error: "Invalid token" };
        } else if (error instanceof jwt.TokenExpiredError) {
            return { isAuthenticated: false, error: "Token expired" };
        } else {
            context.log('Error in authentication middleware:', error);
            return { isAuthenticated: false, error: "Authentication error" };
        }
    }
}

/**
 * Helper function to require authentication for an endpoint
 * @param request The HTTP request
 * @param context The function invocation context
 * @returns Authentication result or throws an error that will return a 401 response
 */
export async function requireAuth(request: HttpRequest, context: InvocationContext): Promise<AuthUser> {
    const authResult = await authenticate(request, context);
    
    if (!authResult.isAuthenticated || !authResult.user) {
        const error = new Error(authResult.error || "Unauthorized");
        error.name = "UnauthorizedError";
        throw error;
    }
    
    return authResult.user;
}

/**
 * Helper function to check if a user is an admin
 * @param user The authenticated user
 * @returns True if the user is an admin, false otherwise
 */
export function isAdmin(user: AuthUser): boolean {
    return user.is_admin === true;
} 