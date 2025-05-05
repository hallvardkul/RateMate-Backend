import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";
import { addCorsHeaders, handleCorsPreflight } from "../utils/corsMiddleware";

export const health = app.http("health", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "health",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return handleCorsPreflight();

    return addCorsHeaders({ status: 200, jsonBody: { ok: true } });
  }
}); 