// Deterministic idempotency keys.
//
// Server-side semantics (apps/api/src/http/request-contracts.ts):
// - Mutating requests carrying Idempotency-Key are deduplicated for 30 minutes.
// - The server cache key includes the idempotency key, method, url, X-User-Id
//   and Authorization header, so identical keys are scoped per user/token.
// - The fingerprint covers method, url and body; the same key with a different
//   body is rejected with 409 idempotency_conflict.
// - Responses with status 200-499 are stored and replayed verbatim; 5xx (and
//   requests that never reach the server) are not stored, so retrying them
//   with the same key re-executes the request.
//
// Client strategy derived from that contract:
// - Derive the key from method + path + a stable serialization of the body so
//   a retry of the same business action reuses the same key. If the previous
//   attempt actually succeeded, the server would otherwise replay the stored
//   response and silently swallow a legitimate new submission with identical
//   content (e.g. re-saving the same attendance roster). The key therefore
//   rotates (attempt counter +1) once an attempt has succeeded.
// - After a failure (transport error, timeout, 5xx or even a stored 4xx) the
//   key is reused: 5xx/transport retries re-execute, and a request that the
//   server processed before the client lost the response is answered from the
//   idempotency store, which resolves the "outcome unknown" retry state.
// - While an attempt is in flight the key is reused as well, so a duplicate
//   concurrent submission of the same body replays instead of double-writing.

export function createIdempotencyKey(prefix = "mp") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

export function createRequestId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `req-${Date.now()}-${random}`;
}

const SERVER_IDEMPOTENCY_TTL_MS = 30 * 60 * 1000;
const MAX_TRACKED_KEYS = 200;

type AttemptState = "inflight" | "retryable" | "consumed";

interface KeyAttemptRecord {
  attempt: number;
  state: AttemptState;
  updatedAt: number;
}

const attemptRecords = new Map<string, KeyAttemptRecord>();

export function resolveIdempotencyKey(method: string, path: string, body: unknown): string {
  pruneExpiredRecords();
  const digest = digestRequestAction(method, path, body);
  const record = attemptRecords.get(digest);
  if (record && (record.state === "inflight" || record.state === "retryable")) {
    record.updatedAt = Date.now();
    return `mp-${digest}-a${record.attempt}`;
  }
  const attempt = (record?.attempt ?? 0) + 1;
  attemptRecords.set(digest, { attempt, state: "inflight", updatedAt: Date.now() });
  return `mp-${digest}-a${attempt}`;
}

export function markIdempotencyOutcome(key: string, succeeded: boolean): void {
  // Only keys derived by resolveIdempotencyKey are tracked here; explicit
  // caller-supplied keys manage their own lifecycle.
  const match = /^mp-(.+)-a(\d+)$/.exec(key);
  if (!match || match[1] === undefined || match[2] === undefined) return;
  const record = attemptRecords.get(match[1]);
  if (!record || record.attempt !== Number(match[2])) return;
  record.state = succeeded ? "consumed" : "retryable";
  record.updatedAt = Date.now();
}

/** Test-only: clears derived-key attempt memory between assertions. */
export function resetIdempotencyKeyStateForTesting(): void {
  attemptRecords.clear();
}

function digestRequestAction(method: string, path: string, body: unknown): string {
  return hash64(`${method.toUpperCase()} ${path} ${stableStringify(body)}`);
}

// Stable serialization: object keys are sorted and undefined members are
// dropped, matching how the server fingerprint treats equivalent JSON bodies.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "undefined") return "undefined";
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => typeof child !== "undefined")
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`);
  return `{${entries.join(",")}}`;
}

// Two independent 32-bit FNV-style hashes combined into ~13 base36 chars. Not
// cryptographic, but keys only need to avoid collisions between distinct
// in-flight business actions; the server fingerprint still guards payload
// equality.
function hash64(input: string): string {
  let primary = 0x811c9dc5;
  let secondary = 0x1505;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    primary = Math.imul(primary ^ code, 0x01000193) >>> 0;
    secondary = (Math.imul(secondary, 33) + code + index) >>> 0;
  }
  return `${primary.toString(36)}${secondary.toString(36).padStart(7, "0")}`;
}

function pruneExpiredRecords(): void {
  const now = Date.now();
  for (const [digest, record] of attemptRecords) {
    if (now - record.updatedAt > SERVER_IDEMPOTENCY_TTL_MS) attemptRecords.delete(digest);
  }
  while (attemptRecords.size > MAX_TRACKED_KEYS) {
    const oldest = attemptRecords.keys().next().value;
    if (oldest === undefined) break;
    attemptRecords.delete(oldest);
  }
}
