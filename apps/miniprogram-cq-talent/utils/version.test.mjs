import { describe, it, expect, vi, afterEach } from "vitest";

const build = { sourceRevision: "b".repeat(40), buildId: "cq-client-1", builtAt: "2026-10-30T01:02:03.000Z" };
const request = vi.fn();
vi.mock("./request", () => ({ request }));
async function load({ environment = "develop", version = "", stamped = null, throws = false } = {}) {
  vi.resetModules();
  vi.doMock("./build-metadata", () => ({ CLIENT_BUILD: stamped }));
  globalThis.wx = { getAccountInfoSync: () => { if (throws) throw new Error("unsupported"); return { miniProgram: { envVersion: environment, version } }; } };
  return import("./version.ts");
}
afterEach(() => { vi.clearAllMocks(); vi.resetModules(); vi.doUnmock("./build-metadata"); });
describe("version diagnostics", () => {
  it("does not infer client source identity from platform/API versions and makes no implicit request", async () => {
    const { getClientVersion } = await load({ version: "1.2.3" });
    expect(getClientVersion()).toEqual({ environment: "develop", version: "1.2.3", build: null });
    expect(request).not.toHaveBeenCalled();
  });
  it("reads stamped public identity, including a true platform version if available", async () => {
    const { getClientVersion } = await load({ stamped: { ...build, token: "private" }, version: "2.0" });
    expect(getClientVersion()).toEqual({ environment: "develop", version: "2.0", build });
  });
  it("supports older health responses and refuses an explicit environment mismatch", async () => {
    const { getServiceVersion } = await load();
    request.mockResolvedValueOnce({ status: "ok", service: "@football-club/api" });
    expect(await getServiceVersion()).toEqual({ environment: null, build: null });
    expect(request).toHaveBeenCalledWith({ path: "/health" });
    request.mockResolvedValueOnce({ status: "ok", service: "@football-club/api", environment: "develop", build: { ...build, token: "private" } });
    expect(await getServiceVersion()).toEqual({ environment: "develop", build });
    request.mockResolvedValueOnce({ status: "ok", service: "@football-club/api", environment: "trial", build });
    await expect(getServiceVersion()).rejects.toThrow("环境不一致");
    request.mockResolvedValueOnce({ status: "ok", service: "proxy" });
    await expect(getServiceVersion()).rejects.toThrow("无法读取");
  });
  it("leaves unreadable/invalid metadata unknown and preserves request failures", async () => {
    let api = await load({ throws: true });
    expect(api.getClientVersion()).toEqual({ environment: null, version: null, build: null });
    api = await load({ stamped: { ...build, sourceRevision: "main" } });
    expect(api.getClientVersion().build).toBeNull();
    request.mockRejectedValueOnce(new Error("offline"));
    await expect(api.getServiceVersion()).rejects.toThrow("offline");
  });
});
