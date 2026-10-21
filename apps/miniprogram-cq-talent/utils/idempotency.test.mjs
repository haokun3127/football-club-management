import { beforeEach, expect, it, vi } from "vitest";
const storage = new Map();
globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getStorageSync: key => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
};
beforeEach(() => { storage.clear(); vi.resetModules(); });
it("never replays a completed operation after a module restart", async () => {
  let keys = await import("./idempotency.ts");
  const first = keys.resolveIdempotencyKey("PUT", "/attendance", { status: "present" });
  keys.markIdempotencyOutcome(first, true);
  vi.resetModules();
  keys = await import("./idempotency.ts");
  expect(keys.resolveIdempotencyKey("PUT", "/attendance", { status: "present" })).not.toBe(first);
});
it("retains an unknown outcome across a module restart", async () => {
  let keys = await import("./idempotency.ts");
  const first = keys.resolveIdempotencyKey("POST", "/assessment", { value: 3 });
  keys.markIdempotencyOutcome(first, false);
  vi.resetModules();
  keys = await import("./idempotency.ts");
  expect(keys.resolveIdempotencyKey("POST", "/assessment", { value: 3 })).toBe(first);
});
it("does not resurrect an old server key after bounded-cache eviction", async () => {
  const keys = await import("./idempotency.ts");
  const first = keys.resolveIdempotencyKey("PUT", "/attendance", {});
  keys.markIdempotencyOutcome(first, true);
  for (let i=0; i<205; i++) keys.resolveIdempotencyKey("PUT", `/other/${i}`, {});
  expect(keys.resolveIdempotencyKey("PUT", "/attendance", {})).not.toBe(first);
});
it("a late duplicate failure cannot undo a known success", async () => {
  const keys = await import("./idempotency.ts");
  const first = keys.resolveIdempotencyKey("PUT", "/attendance", {});
  keys.markIdempotencyOutcome(first, true);
  keys.markIdempotencyOutcome(first, false);
  expect(keys.resolveIdempotencyKey("PUT", "/attendance", {})).not.toBe(first);
});
