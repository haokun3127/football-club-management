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
