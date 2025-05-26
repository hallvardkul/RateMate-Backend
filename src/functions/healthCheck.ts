import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import pool from "../database/postgresClient";

// Health Check endpoint
app.http('healthCheck', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: "health",
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        try {
            // Test database connection with a simple query
            const result = await pool.query('SELECT NOW() as current_time');
            
            return {
                status: 200,
                jsonBody: {
                    status: "healthy",
                    database: "connected",
                    timestamp: result.rows[0].current_time,
                    message: "Backend is running and database is accessible"
                }
            };
        } catch (error) {
            context.error('Health check failed:', error);
            return {
                status: 500,
                jsonBody: {
                    status: "unhealthy",
                    database: "disconnected",
                    error: error instanceof Error ? error.message : String(error),
                    message: "Database connection failed"
                }
            };
        }
    }
}); 