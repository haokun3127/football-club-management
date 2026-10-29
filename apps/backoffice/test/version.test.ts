import { afterEach, describe, expect, it, vi } from "vitest";
import { getServiceVersion, publicBuild } from "../src/services/version";
const build = { sourceRevision: "a".repeat(40), buildId: "cq00-test", builtAt: "2026-10-30T00:00:00.000Z" };
afterEach(() => vi.unstubAllGlobals());
describe("explicit safe version read", () => {
  it.each([ ["develop", "/__env/develop/backoffice", "/__env/develop/health"], ["trial", "/__env/trial/backoffice", "/__env/trial/health"], ["release", "/backoffice", "/health"] ])("reads %s only from its configured prefix without credentials", async (environment, path, expected) => {
    vi.stubGlobal("window", { __FCM_CONFIG__: { environment, path } });
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ status: "ok", service: "@football-club/api", environment, build: { ...build, secret: "do-not-show" } }) })); vi.stubGlobal("fetch", fetch);
    expect(fetch).not.toHaveBeenCalled();
    expect(await getServiceVersion()).toEqual({ environment, build });
    expect(fetch).toHaveBeenCalledWith(expected, expect.objectContaining({ credentials: "omit", cache: "no-store", redirect: "error" }));
  });
  it("keeps old metadata unknown and rejects mismatched environments or another service", async () => {
    vi.stubGlobal("window", { __FCM_CONFIG__: { environment: "develop", path: "/__env/develop/backoffice" } });
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok", service: "@football-club/api" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok", service: "@football-club/api", environment: "release" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok", service: "proxy" }) }); vi.stubGlobal("fetch", fetch);
    expect(await getServiceVersion()).toEqual({ environment: null, build: null });
    await expect(getServiceVersion()).rejects.toThrow("environment");
    await expect(getServiceVersion()).rejects.toThrow("service");
    expect(publicBuild({ ...build, sourceRevision: "main" })).toBeNull();
  });
});
