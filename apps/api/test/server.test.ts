import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

describe("api server", () => {
  it("returns health status", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "@football-club/api",
    });
  });

  it("computes a derived attacking contribution metric", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/students/student-1/derived-metrics/attacking-contribution",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.record.source).toBe("algorithm");
    expect(body.record.clubId).toBe("club-demo");
    expect(body.lineage.inputRecordIds).toEqual(["metric-record-goal-1", "metric-record-assist-1"]);
  });

  it("returns club-specific configuration", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/config",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.club.id).toBe("club-demo");
    expect(body.featureFlags.some((item: { feature: string }) => item.feature === "matches")).toBe(true);
    expect(body.customFields.some((item: { key: string }) => item.key === "school")).toBe(true);
  });
});
