import type { FastifyInstance } from "fastify";
import type { RuntimeConfig } from "../runtime/environment.js";
import { apiError } from "./errors.js";
import { isBackofficePath } from "../runtime/backoffice.js";

/** Routing protection, not authentication: Bearer and club/role checks still apply. */
export function registerEnvironmentGuard(app: FastifyInstance, config: RuntimeConfig) {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-FCM-Environment", config.environment);
    const path = request.url.split("?", 1)[0];
    if ((request.method === "GET" || request.method === "HEAD")
      && (path === "/health" || path === "/openapi.json")) return;

    if (isBackofficePath(request.url)) {
      const web = config.backoffice;
      const api = path?.startsWith("/backoffice/api/");
      const mutation = request.method !== "GET" && request.method !== "HEAD";
      let sourceMatches = false;
      try {
        const source = new URL(request.headers.referer ?? "");
        sourceMatches = !!web && source.origin === web.origin && (source.pathname === web.path || source.pathname.startsWith(`${web.path}/`));
      } catch { /* A browser API call must have an explicit matching page source. */ }
      const allowed = web && web.environment === config.environment
        && (!api || (request.headers["x-fcm-environment"] === config.environment && sourceMatches))
        && (!mutation || request.headers.origin === web.origin)
        && (request.headers["x-miniprogram-env"] === undefined);
      reply.header("Cache-Control", "no-store");
      if (!allowed) return reply.code(403).send(apiError("environment_mismatch", "Backoffice source does not match this environment"));
      return;
    }

    const declared = request.headers["x-miniprogram-env"];
    const referer = request.headers.referer;
    const match = typeof referer === "string"
      ? /^https:\/\/servicewechat\.com\/(wx[0-9a-f]{16})\/(0|devtools|[1-9][0-9]*)\/page-frame\.html$/.exec(referer)
      : null;
    const validReferer = match !== null && match[1] === config.wechatAppId;
    const releaseReferer = validReferer && match[2] !== "0" && match[2] !== "devtools";
    const isAppClient = /(?:^|\/)app-clients(?:\/|$)/.test(path ?? "");
    const denied =
      // Reject prefix leakage: proxy must strip exactly one configured environment prefix.
      (path ?? "").startsWith("/__env")
      || (declared !== undefined && declared !== config.environment)
      || (referer !== undefined && (!validReferer || releaseReferer !== (config.environment === "release")))
      || (config.environment !== "release" && declared !== config.environment)
      || (config.environment === "release" && (
        (isAppClient && !releaseReferer)
        || (declared === undefined && !releaseReferer)
      ));

    if (denied) {
      reply.header("Cache-Control", "no-store");
      return reply.code(403).send(apiError("environment_mismatch", "Request environment does not match this API"));
    }
  });
}
