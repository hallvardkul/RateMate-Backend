import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

// Very simple per-IP counter (resets every minute). Accept up to 100 requests.
const counters = new Map<string, { count: number; expires: number }>();
const LIMIT = 100;
const WINDOW = 60_000; // 1 min

export function rateLimit(req: HttpRequest, ctx: InvocationContext): HttpResponseInit | void {
  // Identify caller by IP (X-Forwarded-For first, else req.ip)
  const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("x-client-ip") ?? req.headers.get("x-real-ip") ?? "unknown").split(",")[0].trim();

  const now = Date.now();
  const entry = counters.get(ip);
  if (!entry || entry.expires < now) {
    counters.set(ip, { count: 1, expires: now + WINDOW });
    return; // allow
  }
  if (entry.count < LIMIT) {
    entry.count++;
    return; // allow
  }

  ctx.warn(`Rate limit hit for ${ip}`);
  return {
    status: 429,
    jsonBody: { error: "Too many requests. Try again later." }
  };
} 