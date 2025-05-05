import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { addCorsHeaders, handleCorsPreflight } from "../utils/corsMiddleware";

export async function test(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return handleCorsPreflight();
    }

    try {
        const response = {
            status: 200,
            jsonBody: {
                message: "Test endpoint working",
                timestamp: new Date().toISOString()
            }
        };

        return addCorsHeaders(response);
    } catch (error) {
        context.error('Error in test function:', error);
        return addCorsHeaders({
            status: 500,
            jsonBody: { error: 'Internal server error' }
        });
    }
} 