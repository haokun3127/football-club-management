import { describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

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

  it("rejects club-scoped requests without active membership", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/config",
      headers: {
        "x-user-id": "missing-user",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Active club membership required" });

    await app.close();
    persistence.database.close();
  });
});
