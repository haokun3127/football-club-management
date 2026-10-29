import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it, expect } from "vitest";
import { readBuildInfo, normalizeBuildInfo } from "../src/runtime/build-info.js";
import { buildServer } from "../src/server.js";

const build = { sourceRevision: "a".repeat(40), buildId: "cq-20261030-01", builtAt: "2026-10-30T01:02:03.000Z" };
describe("safe build identity", () => {
  it("reads only baked public metadata and handles missing/malformed files", () => {
    const directory = mkdtempSync(join(tmpdir(), "fcm-build-"));
    const file = pathToFileURL(join(directory, "build.json"));
    try {
      expect(readBuildInfo(file)).toBeNull();
      for (const value of ["{", "null", JSON.stringify({ ...build, sourceRevision: "main" }), JSON.stringify({ ...build, buildId: "secret\npath" }), JSON.stringify({ ...build, builtAt: "invalid" })]) {
        writeFileSync(file, value);
        expect(readBuildInfo(file)).toBeNull();
      }
      writeFileSync(file, JSON.stringify({ ...build, databasePath: "/private/test.sqlite", WECHAT_SECRET: "private" }));
      expect(readBuildInfo(file)).toEqual(build);
    } finally { rmSync(directory, { recursive: true, force: true }); }
    expect(normalizeBuildInfo(undefined)).toBeNull();
  });

  it("keeps health status/service, returns environment and whitelisted build without auth, matches OpenAPI", async () => {
    const app = buildServer(undefined, { logger: false, buildInfo: { ...build, secret: "must-not-leak" } as typeof build, runtimeConfig: { environment: "develop", databasePath: "/private/database", wechatAppId: "wx0000000000000000" } });
    try {
      const health = await app.inject("/health");
      expect(health.statusCode).toBe(200);
      expect(health.headers["cache-control"]).toBe("no-store");
      expect(health.json()).toEqual({ status: "ok", service: "@football-club/api", environment: "develop", build });
      expect(health.body).not.toMatch(/must-not-leak|database|wechatAppId/);
      const document = (await app.inject("/openapi.json")).json();
      const schema = document.paths["/health"].get.responses["200"].content["application/json"].schema;
      expect(schema.required).toEqual(["status", "service"]);
      expect(schema.properties.build.anyOf[1].required).toEqual(["sourceRevision", "buildId", "builtAt"]);
      expect(schema.properties.environment.enum).toEqual(["develop", "trial", "release"]);
    } finally { await app.close(); }
  });

  it("reports unknown metadata explicitly while the legacy status/service contract remains usable", async () => {
    const app = buildServer(undefined, { logger: false, buildInfo: null });
    try { expect((await app.inject("/health")).json()).toEqual({ status: "ok", service: "@football-club/api", build: null }); }
    finally { await app.close(); }
  });
});
