import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const loginPath = `/clubs/${clubId}/app-clients/${clientId}/wechat-login`;

describe("global rate limit", () => {
  it("returns 429 with the project error shape once the anonymous bucket is exhausted", async () => {
    const app = buildServer(undefined, {
      logger: false,
      rateLimit: { max: 2, timeWindow: "1 minute" },
    });
    try {
      const first = await app.inject({ method: "GET", url: "/health" });
      const second = await app.inject({ method: "GET", url: "/health" });
      const third = await app.inject({ method: "GET", url: "/health" });
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(third.statusCode).toBe(429);
      const body = third.json();
      expect(body.error.code).toBe("rate_limited");
      expect(body.error.message).toContain("Rate limit exceeded");
      expect(third.headers["retry-after"]).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it("buckets requests by the authorization token so distinct sessions are not throttled together", async () => {
    const app = buildServer(undefined, {
      logger: false,
      rateLimit: { max: 2, timeWindow: "1 minute" },
    });
    try {
      const headersA = { authorization: "Bearer token-session-a" };
      const headersB = { authorization: "Bearer token-session-b" };
      for (let index = 0; index < 2; index += 1) {
        expect((await app.inject({ method: "GET", url: "/health", headers: headersA })).statusCode).toBe(200);
      }
      const blocked = await app.inject({ method: "GET", url: "/health", headers: headersA });
      const otherSession = await app.inject({ method: "GET", url: "/health", headers: headersB });
      expect(blocked.statusCode).toBe(429);
      expect(otherSession.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("applies the stricter per-route limit to wechat-login only", async () => {
    const app = buildServer(undefined, {
      logger: false,
      rateLimit: { max: 100, timeWindow: "1 minute", loginMax: 2 },
    });
    try {
      const results = [];
      for (let index = 0; index < 3; index += 1) {
        results.push(await app.inject({
          method: "POST",
          url: loginPath,
          payload: { wxLoginCode: `wx-code-${index}` },
        }));
      }
      expect(results[0]!.statusCode).toBe(200);
      expect(results[1]!.statusCode).toBe(200);
      expect(results[2]!.statusCode).toBe(429);
      const otherRoute = await app.inject({ method: "GET", url: "/health" });
      expect(otherRoute.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("stays disabled for servers without runtime configuration", async () => {
    const app = buildServer(undefined, { logger: false });
    try {
      for (let index = 0; index < 6; index += 1) {
        const response = await app.inject({ method: "GET", url: "/health" });
        expect(response.statusCode).toBe(200);
      }
    } finally {
      await app.close();
    }
  });
});

describe("helmet security headers", () => {
  it("sets default security headers on API responses without a global CSP", async () => {
    const app = buildServer(undefined, { logger: false });
    try {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(response.headers["referrer-policy"]).toBe("no-referrer");
      expect(response.headers["content-security-policy"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
