import { RUNTIME_ENV } from "./config";

// Equivalent unresolved requests reuse one operation key. Completed/rejected
// operations rotate; random identity prevents replay after restart or eviction.
// Persist only hashes/keys, never request bodies or credentials.
export function createIdempotencyKey(prefix = "mp") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
export function createRequestId() { return createIdempotencyKey("req"); }
const TTL_MS = 30 * 60 * 1000;
const MAX_TRACKED_KEYS = 200;
const STORAGE_KEY = `cqTalent:${RUNTIME_ENV}:request-attempts-v2`;
type Attempt = { key: string; attempt: number; state: "inflight" | "retryable" | "consumed"; updatedAt: number };
const records = new Map<string, Attempt>();
let loaded = false;

function loadRecords() {
  if (loaded) return;
  loaded = true;
  try {
    const saved: unknown = wx.getStorageSync(STORAGE_KEY);
    if (!Array.isArray(saved)) return;
    for (const entry of saved.slice(-MAX_TRACKED_KEYS)) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string") continue;
      const item = entry[1] as Attempt | undefined;
      if (item && typeof item.key === "string" && Number.isInteger(item.attempt)
        && ["inflight", "retryable", "consumed"].includes(item.state)
        && Number.isFinite(item.updatedAt) && Date.now() - item.updatedAt < TTL_MS) records.set(entry[0], item);
    }
  } catch { /* Storage unavailable: in-memory retries still work. */ }
}
function persist() {
  try { wx.setStorageSync(STORAGE_KEY, Array.from(records.entries())); } catch { /* Do not block a request on a full cache. */ }
}
export function resolveIdempotencyKey(method: string, path: string, body: unknown, scope = ""): string {
  loadRecords();
  const now = Date.now();
  for (const [digest, item] of records) if (now - item.updatedAt >= TTL_MS) records.delete(digest);
  const digest = digestRequestAction(method, `${scope} ${path}`, body);
  const record = records.get(digest);
  if (record && record.state !== "consumed") return record.key;
  const attempt = (record?.attempt ?? 0) + 1;
  const key = `${createIdempotencyKey(`mp-${digest}`)}-a${attempt}`;
  records.delete(digest);
  records.set(digest, { key, attempt, state: "inflight", updatedAt: now });
  while (records.size > MAX_TRACKED_KEYS) records.delete(records.keys().next().value!);
  persist();
  return key;
}
// terminal=true includes a definite HTTP rejection. Only transport/5xx outcomes
// remain uncertain. A late duplicate failure cannot downgrade a known success.
export function markIdempotencyOutcome(key: string, terminal: boolean): void {
  for (const record of records.values()) {
    if (record.key !== key || record.state === "consumed") continue;
    record.state = terminal ? "consumed" : "retryable";
    persist();
    return;
  }
}
export function resetIdempotencyKeyStateForTesting(): void {
  records.clear(); loaded = true; persist();
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
