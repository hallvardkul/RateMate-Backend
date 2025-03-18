import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";
import { requireAuth } from "../utils/authMiddleware";

// Get user profile (requires authentication)
app.http('profile', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "user/profile",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Authenticate the request
            const user = await requireAuth(request, context);
            
            // Get user profile from database
            const result = await pool.query(
                "SELECT user_id, username, email, created_at FROM dbo.users WHERE user_id = $1",
                [user.userId]
            );

            if (result.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "User not found" }
                };
            }

            return {
                status: 200,
                jsonBody: { profile: result.rows[0] }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.log('Error in profile function:', error);
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

// Update user profile (requires authentication)
app.http('updateProfile', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: "user/profile",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Authenticate the request
            const user = await requireAuth(request, context);
            
            // Get update data from request body
            const updates = await request.json() as { username?: string, email?: string };
            
            if (!updates.username && !updates.email) {
                return {
                    status: 400,
                    jsonBody: { error: "No update fields provided" }
                };
            }
            
            // Build the update query dynamically based on provided fields
            let query = "UPDATE dbo.users SET ";
            const queryParams: any[] = [];
            const updateFields: string[] = [];
            
            if (updates.username) {
                updateFields.push("username = $" + (queryParams.length + 1));
                queryParams.push(updates.username);
            }
            
            if (updates.email) {
                // Check if email is already in use
                if (updates.email) {
                    const emailCheck = await pool.query(
                        "SELECT user_id FROM dbo.users WHERE email = $1 AND user_id != $2",
                        [updates.email, user.userId]
                    );
                    
                    if (emailCheck.rows.length > 0) {
                        return {
                            status: 409,
                            jsonBody: { error: "Email is already in use" }
                        };
                    }
                }
                
                updateFields.push("email = $" + (queryParams.length + 1));
                queryParams.push(updates.email);
            }
            
            query += updateFields.join(", ");
            query += " WHERE user_id = $" + (queryParams.length + 1);
            queryParams.push(user.userId);
            query += " RETURNING user_id, username, email, created_at";
            
            // Execute the update
            const result = await pool.query(query, queryParams);
            
            if (result.rows.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: "User not found" }
                };
            }
            
            return {
                status: 200,
                jsonBody: { profile: result.rows[0] }
            };
        } catch (error) {
            if (error instanceof Error && error.name === "UnauthorizedError") {
                return {
                    status: 401,
                    jsonBody: { error: error.message }
                };
            }
            
            context.log('Error in updateProfile function:', error);
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