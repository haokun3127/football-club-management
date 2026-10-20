import { describe, expect, it } from "vitest";
import type { FastifyError } from "fastify";
import { buildServer } from "../src/server.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const loginPath = `/clubs/${clubId}/app-clients/${clientId}/wechat-login`;

const internalSecret = "private database diagnostic sentinel";

function addBoomRoute(app: ReturnType<typeof buildServer>, options: { statusCode?: number }) {
  app.get("/__boom", async () => {
    const error = new Error(internalSecret) as FastifyError;
    if (options.statusCode !== undefined) {
      error.statusCode = options.statusCode;
    }
    throw error;
  });
}

describe("global error handler", () => {
  it("maps unmarked exceptions to 500 and never echoes the internal message", async () => {
    const app = buildServer(undefined, { logger: false });
    addBoomRoute(app, {});
    const response = await app.inject({ method: "GET", url: "/__boom" });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: "internal_error", message: "Internal server error" },
    });
    expect(response.body).not.toContain(internalSecret);
    await app.close();
  });

  it("keeps masking marked 5xx exceptions", async () => {
    const app = buildServer(undefined, { logger: false });
    addBoomRoute(app, { statusCode: 503 });
    const response = await app.inject({ method: "GET", url: "/__boom" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: { code: "internal_error", message: "Internal server error" },
    });
    expect(response.body).not.toContain(internalSecret);
    await app.close();
  });

  it("still returns intentional 4xx exception messages", async () => {
    const app = buildServer(undefined, { logger: false });
    addBoomRoute(app, { statusCode: 400 });
    const response = await app.inject({ method: "GET", url: "/__boom" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: "bad_request", message: internalSecret },
    });
    await app.close();
  });

  it("still maps validation failures to 400 with validation details", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: loginPath,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe("bad_request");
    expect(body.error.message).toBe("Request validation failed");
    expect(body.error.details).toBeTruthy();
    await app.close();
  });
});
