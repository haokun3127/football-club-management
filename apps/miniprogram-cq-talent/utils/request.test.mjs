import { describe, expect, it } from "vitest";

const storage = new Map([
  ["cqTalentAppContext", {
    clubId: "club-chongqing-talent",
    clientId: "app-client-cq-talent-wechat-main",
    capabilities: { client: { roleEntrypoints: { coach: ["lesson"] } } },
  }],
]);

let capturedHeaders;
globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  request: ({ header, success }) => {
    capturedHeaders = header;
    success({ statusCode: 200, data: { ok: true } });
  },
};

const { request } = await import("./request.ts");
const { clearSession, getSession } = await import("./store.ts");

describe("request idempotency keys", () => {
  it("preserves a caller supplied key instead of creating a new one", async () => {
    await request({
      path: "/correction",
      method: "PATCH",
      data: { studentId: "student-1" },
      idempotencyKey: "lesson-correction-stable-key",
    });

    expect(capturedHeaders["Idempotency-Key"]).toBe("lesson-correction-stable-key");
  });
});

describe("request expected status", () => {
  it("keeps the default 2xx behavior but rejects an unexpected successful status when explicitly required", async () => {
    await expect(request({ path: "/legacy" })).resolves.toEqual({ ok: true });
    await expect(request({ path: "/created", expectedStatus: 201 })).rejects.toMatchObject({
      code: "unexpected_status",
      statusCode: 200,
    });
  });
});

describe("request authentication failures", () => {
  it("clears the stored session when a temporary role-selection bearer is rejected", async () => {
    clearSession();
    storage.clear();
    storage.set("cqTalentAppContext", {
      clubId: "club-chongqing-talent",
      clientId: "app-client-cq-talent-wechat-main",
      capabilities: {},
    });
    storage.set("cqTalentSession", {
      clubId: "club-chongqing-talent",
      clientId: "app-client-cq-talent-wechat-main",
      capabilities: {},
      role: "coach",
      availableRoles: ["parent", "coach"],
      token: "active-session-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    const originalRequest = globalThis.wx.request;
    const originalRelaunch = globalThis.wx.reLaunch;
    globalThis.wx.request = ({ success }) => success({
      statusCode: 401,
      data: { error: { code: "authentication_required", message: "Role session expired" } },
    });
    globalThis.wx.reLaunch = () => {};

    try {
      await expect(request({ path: "/session/role", method: "POST", bearerToken: "pending-role-token" })).rejects.toMatchObject({
        code: "authentication_required",
      });
      expect(getSession()).toBeNull();
    } finally {
      globalThis.wx.request = originalRequest;
      globalThis.wx.reLaunch = originalRelaunch;
    }
  });
});
