import type { FastifyInstance } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { AuthContext } from "../auth/context.js";
import { backofficeSchemas } from "../http/backoffice-schemas.js";
import { sendError } from "../http/errors.js";
import { registerBackofficeErrors } from "../http/backoffice-errors.js";

export async function registerBackofficeRoutes(app: FastifyInstance, options: { auth?: BackofficeAuth }) {
  registerBackofficeErrors(app);
  const auth = options.auth;
  const view = (context: AuthContext) => ({ environment: auth!.config.environment, clubId: context.clubId, user: { name: context.user.displayName, roles: context.membership.roles } });
  app.post<{ Body: { clubId: string; username: string; password: string } }>("/backoffice/api/login", { schema: backofficeSchemas.login, bodyLimit: 2048 }, async (request, reply) => {
    if (!auth) return sendError(reply, 503, "backoffice_not_configured", "Backoffice login is not configured");
    const result = await auth.login(request.body.clubId, request.body.username, request.body.password, request.ip);
    if (result.status === "limited") { reply.header("Retry-After", "900"); return sendError(reply, 429, "login_rate_limited", "Too many login attempts; retry later"); }
    if (result.status !== "ok") return sendError(reply, 401, "authentication_required", "Invalid account or password");
    reply.header("Set-Cookie", result.cookie);
    return view(result.auth);
  });
  app.get("/backoffice/api/session", { schema: backofficeSchemas.session }, async (request, reply) => {
    if (!auth) return sendError(reply, 503, "backoffice_not_configured", "Backoffice login is not configured");
    const context = await auth.resolve(request);
    if (!context) return sendError(reply, 401, "authentication_required", "Active backoffice session required");
    return view(context);
  });
  app.post("/backoffice/api/logout", { schema: backofficeSchemas.logout }, async (request, reply) => {
    if (!auth) return sendError(reply, 503, "backoffice_not_configured", "Backoffice login is not configured");
    reply.header("Set-Cookie", await auth.logout(request));
    return { signedOut: true };
  });
}
