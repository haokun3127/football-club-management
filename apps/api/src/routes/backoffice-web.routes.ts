import { existsSync, readFileSync, readdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import { backofficeCatalog, type CatalogTable } from "../application/backoffice-catalog.js";
import type { ApiStore } from "../store.js";
import { backofficeCatalogSchema } from "../http/backoffice-schemas.js";
import { sendError } from "../http/errors.js";
import { registerBackofficeErrors } from "../http/backoffice-errors.js";
import type { BuildInfo } from "../runtime/build-info.js";

export async function registerBackofficeWebRoutes(app: FastifyInstance, options: { auth?: BackofficeAuth; store: ApiStore; buildInfo?: BuildInfo | null }) {
  registerBackofficeErrors(app);
  const { auth, store } = options;
  if (!auth) return;
  const assets = new Map([ ["app.js", "text/javascript; charset=utf-8"], ["style.css", "text/css; charset=utf-8"] ]);
  const builtDirectory = fileURLToPath(new URL("../../../backoffice/dist/", import.meta.url));
  const builtAssets = new Map<string, string>();
  const mime: Record<string, string> = { ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon" };
  function collect(directory: string, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = `${prefix}${entry.name}`;
      if (entry.isDirectory()) collect(join(directory, entry.name), `${name}/`);
      else if (entry.isFile() && mime[extname(name)]) builtAssets.set(name, join(directory, entry.name));
    }
  }
  if (existsSync(join(builtDirectory, "index.html"))) collect(builtDirectory);
  const security = (reply: import("fastify").FastifyReply, nonce?: string) => {
    reply.header("Content-Security-Policy", `default-src 'none'; script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""}; style-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""}; style-src-attr 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`);
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "same-origin");
    reply.header("X-Frame-Options", "DENY");
  };
  app.get("/backoffice", async (_request, reply) => { security(reply); return reply.redirect(`${auth.config.path}/`); });
  app.get("/backoffice/", async (_request, reply) => {
    if (builtAssets.size) {
      const nonce = randomBytes(18).toString("base64");
      security(reply, nonce);
      const clubs = (await store.listClubs()).filter(club => club.status === "active").map(club => ({ id: club.id, name: club.name }));
      const config = JSON.stringify({ environment: auth.config.environment, path: auth.config.path, nonce, clubs, build: options.buildInfo ?? null }).replaceAll("<", "\\u003c");
      const bootstrap = `<script nonce="${nonce}">window.__FCM_CONFIG__=${config};window.publicPath=${JSON.stringify(`${auth.config.path}/assets/`)};window.__webpack_nonce__=${JSON.stringify(nonce)};</script>`;
      const html = readFileSync(join(builtDirectory, "index.html"), "utf8")
        .replaceAll("/__backoffice_assets__/", `${auth.config.path}/assets/`)
        .replace(/<script\b/g, `<script nonce="${nonce}"`)
        .replace("<head>", `<head><meta name="fcm-csp-nonce" content="${nonce}">${bootstrap}`)
        .replace("<html", `<html data-environment="${auth.config.environment}"`);
      return reply.type("text/html; charset=utf-8").send(html);
    }
    security(reply);
    const html = readFileSync(new URL("../../backoffice/index.html", import.meta.url), "utf8")
      .replaceAll("{{ENVIRONMENT}}", auth.config.environment);
    return reply.type("text/html; charset=utf-8").send(html);
  });
  app.get<{ Params: { asset: string } }>("/backoffice/assets/:asset", async (request, reply) => {
    security(reply);
    const type = assets.get(request.params.asset);
    if (!type) {
      const file = builtAssets.get(request.params.asset);
      if (!file) return sendError(reply, 404, "not_found", "Asset not found");
      return reply.type(mime[extname(request.params.asset)]!).send(readFileSync(file));
    }
    return reply.type(type).send(readFileSync(new URL(`../../backoffice/${request.params.asset}`, import.meta.url), "utf8"));
  });
  app.get<{ Params: { "*": string } }>("/backoffice/assets/*", async (request, reply) => {
    security(reply);
    const name = request.params["*"];
    const file = builtAssets.get(name);
    if (!file) return sendError(reply, 404, "not_found", "Asset not found");
    return reply.type(mime[extname(name)]!).send(readFileSync(file));
  });
  app.get<{ Params: { table: CatalogTable }; Querystring: { search?: string; offset?: number } }>("/backoffice/api/catalog/:table", {
    schema: backofficeCatalogSchema,
  }, async (request, reply) => {
    const context = await auth.resolve(request);
    if (!context) return sendError(reply, 401, "authentication_required", "Active backoffice session required");
    const data = backofficeCatalog(store, context.clubId, request.params.table);
    const search = (request.query.search ?? "").trim().toLocaleLowerCase();
    const matching = data.rows.filter(row => row.values.some(v => v.toLocaleLowerCase().includes(search)));
    const offset = request.query.offset ?? 0;
    return { ...data, rows: matching.slice(offset, offset + 20), total: matching.length, offset, pageSize: 20 };
  });
}
