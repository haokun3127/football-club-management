import { afterEach, describe, expect, it, vi } from "vitest";

const storage = new Map();
const network = vi.fn(({ success }) => success({ statusCode: 200, data: { ok: true } }));
async function load(envVersion) {
  vi.resetModules();
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion } }),
    getStorageSync: (key) => storage.get(key) ?? "",
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
    request: network,
  };
  return { config: await import("./config.ts"), store: await import("./store.ts"), request: (await import("./request.ts")).request };
}
afterEach(() => { storage.clear(); network.mockClear(); vi.resetModules(); });

describe("mini-program environment isolation", () => {
  it.each([
    ["develop", "https://cqtc.pomi.tech/__env/develop"],
    ["trial", "https://cqtc.pomi.tech/__env/trial"],
    ["release", "https://cqtc.pomi.tech"],
  ])("routes %s only to its fixed base and prevents header override", async (environment, base) => {
    const { config, request } = await load(environment);
    expect(config.assertRuntimeApiConfigured()).toBe(base);
    await request({ path: "/health", headers: { "x-miniprogram-env": "release", "X-MiniProgram-Env": "trial" } });
    const sent = network.mock.calls[0][0];
    expect(sent.url).toBe(`${base}/health`);
    expect(sent.header["X-MiniProgram-Env"]).toBe(environment);
    expect(Object.keys(sent.header).filter((key) => key.toLowerCase() === "x-miniprogram-env")).toHaveLength(1);
  });

  it.each([undefined, "", "production", "unknown"])("fails closed for unknown runtime %s before network access", async (environment) => {
    const { request } = await load(environment);
    await expect(request({ path: "/write", method: "POST" })).rejects.toMatchObject({ code: "runtime_not_configured" });
    expect(network).not.toHaveBeenCalled();
  });

  it("never reuses legacy or another environment's session, context or mutable drafts", async () => {
    storage.set("cqTalentSession", { token: "legacy-production-token" });
    storage.set("cqTalentAppContext", { clubId: "legacy" });
    for (const environment of ["develop", "trial", "release"]) {
      const { config, store } = await load(environment);
      expect(store.getSession()).toBeNull();
      expect(store.getAppContext()).toBeNull();
      store.setSession({ role: "coach", token: environment, clubId: environment, clientId: "client", capabilities: {} });
      storage.set(`${config.environmentStorageKey("coach-assessment-bulk")}:task:project`, { score: 80 });
    }
    const { store } = await load("trial");
    expect(store.getSession().token).toBe("trial");
    expect(store.clearDisposableLocalCache()).toBe(1);
    expect(storage.has("cqTalent:develop:coach-assessment-bulk:task:project")).toBe(true);
    expect(storage.has("cqTalent:release:coach-assessment-bulk:task:project")).toBe(true);
    store.clearSession();
    expect(storage.has("cqTalent:release:cqTalentSession")).toBe(true);
    expect(storage.has("cqTalentSession")).toBe(true);
  });
});

describe("write smoke safety", () => {
  async function runSmoke(baseUrl) {
    const { spawn } = await import("node:child_process");
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [new URL("../scripts/smoke-app-client.mjs", import.meta.url).pathname], {
        env: { ...process.env, API_BASE_URL: baseUrl }, stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (data) => { output += data; });
      child.stderr.on("data", (data) => { output += data; });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, output }));
    });
  }
  it("refuses the production URL without making a network request", async () => {
    const result = await runSmoke("https://cqtc.pomi.tech");
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("only supports an explicit localhost develop API");
  });
  it("stops after health if localhost is accidentally routed to release", async () => {
    const { createServer } = await import("node:http");
    const requests = [];
    const server = createServer((req, res) => {
      requests.push([req.method, req.url]);
      res.setHeader("x-fcm-environment", "release");
      res.end(JSON.stringify({ status: "ok" }));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const result = await runSmoke(`http://127.0.0.1:${server.address().port}`);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain("requires a verified develop API");
      expect(requests).toEqual([["GET", "/health"]]);
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });
});
