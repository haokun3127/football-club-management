import { describe, expect, it } from "vitest";

const storage = new Map([
  ["cqTalent:develop:cqTalentAppContext", {
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
const { clearSession, getSession, setSession } = await import("./store.ts");

const SESSION_CONTEXT = {
  clubId: "club-chongqing-talent",
  clientId: "app-client-cq-talent-wechat-main",
  capabilities: {},
};

function installSession(token) {
  setSession({
    ...SESSION_CONTEXT,
    role: "coach",
    availableRoles: ["parent", "coach"],
    token,
    userId: `user-${token}`,
    displayName: "测试教练",
    expiresAt: "4100-01-01T00:00:00.000Z",
  });
}

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
    storage.set("cqTalent:develop:cqTalentAppContext", {
      clubId: "club-chongqing-talent",
      clientId: "app-client-cq-talent-wechat-main",
      capabilities: {},
    });
    storage.set("cqTalent:develop:cqTalentSession", {
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

describe("request timeouts", () => {
  it("applies a 10s budget to reads and a 15s budget to writes", async () => {
    const originalRequest = globalThis.wx.request;
    const captured = [];
    globalThis.wx.request = (options) => {
      captured.push({ method: options.method, timeout: options.timeout });
      options.success({ statusCode: 200, data: { ok: true } });
    };

    try {
      await request({ path: "/reads-default" });
      await request({ path: "/reads-post", method: "POST" });
      await request({ path: "/reads-override", method: "POST", timeout: 3_000 });

      expect(captured).toEqual([
        { method: "GET", timeout: 10_000 },
        { method: "POST", timeout: 15_000 },
        { method: "POST", timeout: 3_000 },
      ]);
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("request error mapping", () => {
  const originalRequest = globalThis.wx.request;

  it("maps transport failures to a structured network error with unified copy", async () => {
    globalThis.wx.request = ({ fail }) => fail({ errMsg: "request:fail " });

    try {
      await expect(request({ path: "/flaky" })).rejects.toMatchObject({
        code: "network_error",
        message: "request:fail ",
        errorType: "network",
        userMessage: "网络连接不可用，请检查网络后重试",
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("distinguishes timeouts from generic network failures", async () => {
    globalThis.wx.request = ({ fail }) => fail({ errMsg: "request:fail timeout" });

    try {
      await expect(request({ path: "/slow" })).rejects.toMatchObject({
        code: "timeout",
        errorType: "timeout",
        userMessage: "请求超时，请检查网络后重试",
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("keeps the server error payload while classifying http status codes", async () => {
    const scenarios = [
      { statusCode: 403, data: { error: { code: "capability_missing", message: "denied" } }, errorType: "forbidden" },
      { statusCode: 409, data: { error: { code: "idempotency_conflict", message: "reused key" } }, errorType: "conflict" },
      { statusCode: 500, data: {}, errorType: "server_error" },
      { statusCode: 422, data: { error: { code: "validation_failed", message: "bad input" } }, errorType: "http_error" },
    ];

    for (const scenario of scenarios) {
      globalThis.wx.request = ({ success }) => success({ statusCode: scenario.statusCode, data: scenario.data });
      const expectation = await request({ path: "/errors" }).then(
        () => Promise.reject(new Error("expected rejection")),
        (error) => error,
      );
      expect(expectation.errorType).toBe(scenario.errorType);
      expect(expectation.statusCode).toBe(scenario.statusCode);
      expect(typeof expectation.userMessage).toBe("string");
      expect(expectation.userMessage.length).toBeGreaterThan(0);
      if (scenario.data.error) {
        expect(expectation.code).toBe(scenario.data.error.code);
        expect(expectation.message).toBe(scenario.data.error.message);
      } else {
        expect(expectation.code).toBe("http_error");
      }
    }

    globalThis.wx.request = originalRequest;
  });

  it("classifies genuine 401 responses as unauthorized errors", async () => {
    clearSession();
    installSession("token-a");
    const relaunches = [];
    globalThis.wx.request = ({ success }) => success({
      statusCode: 401,
      data: { error: { code: "authentication_required", message: "Session expired" } },
    });
    globalThis.wx.reLaunch = (options) => { relaunches.push(options.url); };

    try {
      await expect(request({ path: "/coach/events" })).rejects.toMatchObject({
        code: "authentication_required",
        statusCode: 401,
        errorType: "unauthorized",
        userMessage: "登录已过期，请重新登录",
      });
      expect(relaunches).toEqual(["/pages/login/index"]);
      expect(getSession()).toBeNull();
    } finally {
      globalThis.wx.request = originalRequest;
      clearSession();
    }
  });
});

describe("request 401 session race", () => {
  const originalRequest = globalThis.wx.request;

  it("ignores a stale 401 issued by a session that has since been replaced", async () => {
    clearSession();
    installSession("token-a");
    let respond;
    const relaunches = [];
    globalThis.wx.request = ({ success }) => { respond = success; };
    globalThis.wx.reLaunch = (options) => { relaunches.push(options.url); };

    try {
      const pending = request({ path: "/coach/events", method: "GET" });
      installSession("token-b");
      respond({ statusCode: 401, data: { error: { code: "authentication_required", message: "Session expired" } } });

      await expect(pending).rejects.toMatchObject({ code: "authentication_required" });
      expect(getSession()?.token).toBe("token-b");
      expect(relaunches).toEqual([]);
    } finally {
      globalThis.wx.request = originalRequest;
      clearSession();
    }
  });

  it("ignores a stale 401 carrying an explicit bearer after a new session was established", async () => {
    clearSession();
    let respond;
    const relaunches = [];
    globalThis.wx.request = ({ success }) => { respond = success; };
    globalThis.wx.reLaunch = (options) => { relaunches.push(options.url); };

    try {
      const pending = request({ path: "/session/role", method: "POST", bearerToken: "pending-role-token" });
      installSession("token-b");
      respond({ statusCode: 401, data: { error: { code: "authentication_required", message: "Role token expired" } } });

      await expect(pending).rejects.toMatchObject({ code: "authentication_required" });
      expect(getSession()?.token).toBe("token-b");
      expect(relaunches).toEqual([]);
    } finally {
      globalThis.wx.request = originalRequest;
      clearSession();
    }
  });

  it("converges concurrent 401 responses from the same session to a single login navigation", async () => {
    clearSession();
    installSession("token-a");
    const responders = [];
    const relaunches = [];
    globalThis.wx.request = ({ success }) => { responders.push(success); };
    globalThis.wx.reLaunch = (options) => { relaunches.push(options.url); };

    try {
      const pending = ["/a", "/b", "/c"].map((path) => request({ path, method: "GET" }));
      responders.forEach((respond) => respond({
        statusCode: 401,
        data: { error: { code: "authentication_required", message: "Session expired" } },
      }));

      await Promise.allSettled(pending);
      expect(relaunches).toEqual(["/pages/login/index"]);
      expect(getSession()).toBeNull();
    } finally {
      globalThis.wx.request = originalRequest;
      clearSession();
    }
  });

  it("converges concurrent explicit-bearer 401s without a surrounding session to one navigation", async () => {
    clearSession();
    const responders = [];
    const relaunches = [];
    globalThis.wx.request = ({ success }) => { responders.push(success); };
    globalThis.wx.reLaunch = (options) => { relaunches.push(options.url); };

    try {
      const pending = [0, 1].map(() => request({ path: "/session/role", method: "POST", bearerToken: "pending-role-token" }));
      responders.forEach((respond) => respond({
        statusCode: 401,
        data: { error: { code: "authentication_required", message: "Role token expired" } },
      }));

      await Promise.allSettled(pending);
      expect(relaunches).toEqual(["/pages/login/index"]);
    } finally {
      globalThis.wx.request = originalRequest;
      clearSession();
    }
  });
});
