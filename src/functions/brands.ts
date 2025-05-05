import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BrandsFunction } from "../services/brandsService";
import { rateLimit } from "../utils/rateLimitMiddleware";
import { addCorsHeaders, handleCorsPreflight } from "../utils/corsMiddleware";

// Register the brands function
export const brands = app.http('brands', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: "brands/{id?}",
    handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
        // Rate-limit guard
        const limited = rateLimit(req, ctx);
        if (limited) return limited;
        // CORS preflight
        if (req.method === 'OPTIONS') return handleCorsPreflight();
        // Execute original handler and add CORS headers
        const resp = await BrandsFunction(req, ctx);
        return addCorsHeaders(resp);
    }
}); 