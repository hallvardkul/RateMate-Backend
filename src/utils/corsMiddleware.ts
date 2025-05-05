import { HttpResponseInit } from "@azure/functions";
import { rateLimit } from './rateLimitMiddleware';
import { HttpRequest, InvocationContext } from "@azure/functions";

/**
 * Adds CORS headers to the response
 * @param response The response object to add headers to
 * @returns Response with CORS headers
 */
export function addCorsHeaders(response: HttpResponseInit): HttpResponseInit {
    return {
        ...response,
        headers: {
            ...response.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400' // 24 hours
        }
    };
}

/**
 * Handles OPTIONS requests for CORS preflight
 * @returns Response with CORS headers for preflight requests
 */
export function handleCorsPreflight(): HttpResponseInit {
    return {
        status: 204, // No content
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400' // 24 hours
        }
    };
}

/**
 * Wraps a handler with rate limiting, CORS preflight, and CORS headers.
 * @param handler The original function logic returning HttpResponseInit.
 */
export function withGuards(
  handler: (req: HttpRequest, ctx: InvocationContext) => Promise<HttpResponseInit>
): (req: HttpRequest, ctx: InvocationContext) => Promise<HttpResponseInit> {
  return async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    // Exempt auth endpoints from rate limiting
    const path = new URL(req.url).pathname;  // e.g. /api/auth/register
    const isAuth = path.startsWith('/api/auth/register') || path.startsWith('/api/auth/login');
    if (!isAuth) {
      const limited = rateLimit(req, ctx);
      if (limited) return limited;   // 429 Too Many Requests
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflight();
    }
    // Call actual handler
    const resp = await handler(req, ctx);
    // Inject CORS headers
    return addCorsHeaders(resp);
  };
} 