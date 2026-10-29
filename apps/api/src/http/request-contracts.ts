import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ApiStore } from "../store.js";
import { apiError } from "./errors.js";
import { isBackofficePath } from "../runtime/backoffice.js";

const idempotencyTtlMs = 1000 * 60 * 30;

export function registerHttpRequestContracts(app: FastifyInstance, store: ApiStore) {
  app.addHook("preHandler", async (request, reply) => {
    applyPrivateCacheHeaders(request, reply);

    // Protect revisioned writes before idempotency replay/pruning. Old clients
    // must explicitly upgrade; never fetch a fresh revision on their behalf.
    if (request.routeOptions.config.requireExpectedRevision) {
      const expected = (request.body as { expectedRevision?: unknown } | undefined)?.expectedRevision;
      if (expected === undefined) return reply.code(428).send(apiError("precondition_required", "请更新小程序客户端并重新打开课堂表现，读取最新版本后再保存"));
    }

    if (isBackofficePath(request.url) || !isMutatingMethod(request.method) || request.routeOptions.config.disableHttpIdempotency) {
      return;
    }

    const idempotencyKey = headerValue(request.headers["idempotency-key"]);
    if (!idempotencyKey) {
      return;
    }

    const cacheKey = buildIdempotencyCacheKey(request, idempotencyKey);
    const fingerprint = hashStable({
      method: request.method,
      url: request.url,
      body: request.body ?? null,
    });
    // A fingerprint is not authorization. The route explicitly reaches the
    // checkpoint after its current identity, role and object-scope guards.
    request.idempotency = { cacheKey, fingerprint, authorized: false };
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (!isBackofficePath(request.url) && request.method === "GET" && typeof payload === "string" && reply.statusCode === 200) {
      const etag = `"${hash(payload)}"`;
      reply.header("ETag", etag);

      if (headerValue(request.headers["if-none-match"]) === etag) {
        reply.code(304);
        return "";
      }
    }

    if (
      request.idempotency
      && request.idempotency.authorized && !request.idempotency.replayed
      && isMutatingMethod(request.method)
      && reply.statusCode >= 200
      && reply.statusCode < 500
      && typeof payload === "string"
    ) {
      const now = new Date();
      await store.saveHttpIdempotencyRecord({
        key: request.idempotency.cacheKey,
        fingerprint: request.idempotency.fingerprint,
        statusCode: reply.statusCode,
        payload,
        contentType: reply.getHeader("content-type")?.toString(),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + idempotencyTtlMs).toISOString(),
      });
      reply.header("Idempotency-Status", "stored");
    }

    return payload;
  });
}

/** Call only after all route action-authorization guards, before any mutation. */
export async function replayAuthorizedMutation(store: ApiStore, request: FastifyRequest, reply: FastifyReply, authorizeCachedResponse?: () => boolean | Promise<boolean>): Promise<boolean> {
  const state = request.idempotency;
  if (reply.sent) return true;
  if (!state) return false;
  state.authorized = true;
  await store.pruneHttpIdempotencyRecords(new Date().toISOString());
  const existing = await store.getHttpIdempotencyRecord(state.cacheKey);
  if (!existing) return false;
  state.replayed = true;
  if (authorizeCachedResponse && !await authorizeCachedResponse()) {
    state.authorized = false;
    if (!reply.sent) reply.code(403).send(apiError("forbidden", "Current action scope does not permit this cached response"));
    return true;
  }
  if (existing.fingerprint !== state.fingerprint) {
    reply.code(409).header("Idempotency-Status", "conflict")
      .send(apiError("idempotency_conflict", "Idempotency-Key was reused with a different request payload"));
    return true;
  }
  reply.code(existing.statusCode).header("Idempotency-Status", "replayed")
    .type(existing.contentType ?? "application/json").send(existing.payload);
  return true;
}

function applyPrivateCacheHeaders(request: FastifyRequest, reply: FastifyReply) {
  if (isBackofficePath(request.url)) {
    reply.header("Cache-Control", "no-store");
    reply.header("Vary", "Cookie, X-FCM-Environment");
    return;
  }
  if (request.method !== "GET") {
    reply.header("Cache-Control", "no-store");
    return;
  }

  if (request.url === "/health") {
    reply.header("Cache-Control", "no-store");
    return;
  }

  if (request.url === "/openapi.json") {
    reply.header("Cache-Control", "public, max-age=60");
    return;
  }

  reply.header("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  reply.header("Vary", "Authorization, X-User-Id, X-App-Id");
}

function isMutatingMethod(method: string) {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function buildIdempotencyCacheKey(request: FastifyRequest, idempotencyKey: string) {
  return hashStable({
    idempotencyKey,
    method: request.method,
    url: request.url,
    userId: headerValue(request.headers["x-user-id"]) ?? "anonymous",
    authorization: headerValue(request.headers.authorization) ?? "",
  });
}

function hashStable(value: unknown) {
  return hash(JSON.stringify(stableJson(value)));
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableJson(child)]),
    );
  }

  return value;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

declare module "fastify" {
  interface FastifyContextConfig { disableHttpIdempotency?: boolean; requireExpectedRevision?: boolean; }
  interface FastifyRequest {
    idempotency?: {
      cacheKey: string;
      fingerprint: string;
      authorized: boolean;
      replayed?: boolean;
    };
  }
}
