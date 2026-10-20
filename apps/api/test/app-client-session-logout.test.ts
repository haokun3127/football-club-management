import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData, type SeedData } from "../src/seed.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const loginPath = `/clubs/${clubId}/app-clients/${clientId}/wechat-login`;
const logoutPath = `/clubs/${clubId}/app-clients/${clientId}/session/logout`;
const childrenPath = `/clubs/${clubId}/app-clients/${clientId}/parent/children`;

type AppSession = {
  token: string;
  activeRole: "parent" | "coach" | null;
  expiresAt: string;
};

type LoginResponse = {
  session: AppSession | null;
};

function createApp(data: SeedData, persistence: Awaited<ReturnType<typeof createPlatformPersistence>>) {
  return buildServer(new PersistentApiStore(persistence.repositories, data), {
    logger: false,
    membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships, null),
  });
}

async function login(app: ReturnType<typeof buildServer>, userId: string) {
  const response = await app.inject({
    method: "POST",
    url: loginPath,
    headers: { "x-user-id": userId },
    payload: { wxLoginCode: `wx-${userId}` },
  });
  expect(response.statusCode).toBe(200);
  return response.json<LoginResponse>().session!;
}

async function logout(app: ReturnType<typeof buildServer>, token: string) {
  return app.inject({
    method: "POST",
    url: logoutPath,
    headers: { authorization: `Bearer ${token}` },
  });
}

const temporaryLogoutDirectories = new Set<string>();

function createLogoutDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), "football-session-logout-"));
  temporaryLogoutDirectories.add(directory);
  return join(directory, "club.sqlite");
}

describe("app-client session logout", () => {
  afterAll(() => {
    for (const directory of temporaryLogoutDirectories) {
      rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it("revokes only the current bearer session and keeps other sessions valid", async () => {
    const data = createSeedData();
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: data });
    const app = createApp(data, persistence);

    try {
      const parentSession = await login(app, "user-parent-1");
      const otherSession = await login(app, "user-coach-1");

      const firstLogout = await logout(app, parentSession.token);
      expect(firstLogout.statusCode).toBe(200);
      expect(firstLogout.json()).toEqual({
        clubId: clubId,
        status: "logged_out",
      });

      const revokedRead = await app.inject({
        method: "GET",
        url: childrenPath,
        headers: { authorization: `Bearer ${parentSession.token}` },
      });
      expect(revokedRead.statusCode).toBe(401);
      expect(revokedRead.json().error.code).toBe("authentication_required");

      const otherRead = await app.inject({
        method: "GET",
        url: `/clubs/${clubId}/app-clients/${clientId}/coach/home?date=2026-07-01`,
        headers: { authorization: `Bearer ${otherSession.token}` },
      });
      expect(otherRead.statusCode).toBe(200);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("rejects repeated logout with the revoked token and rejects unknown or missing bearer tokens", async () => {
    const data = createSeedData();
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: data });
    const app = createApp(data, persistence);

    try {
      const session = await login(app, "user-parent-1");
      const firstLogout = await logout(app, session.token);
      expect(firstLogout.statusCode).toBe(200);

      const secondLogout = await logout(app, session.token);
      expect(secondLogout.statusCode).toBe(401);
      expect(secondLogout.json().error.code).toBe("authentication_required");

      const unknownLogout = await app.inject({
        method: "POST",
        url: logoutPath,
        headers: { authorization: "Bearer wx-session-unknown" },
      });
      expect(unknownLogout.statusCode).toBe(401);

      const anonymousLogout = await app.inject({
        method: "POST",
        url: logoutPath,
      });
      expect(anonymousLogout.statusCode).toBe(401);
    } finally {
      await app.close();
      persistence.database.close();
    }
  });

  it("persists revocation so the revoked token stays rejected across API instances", async () => {
    const databasePath = createLogoutDatabasePath();
    const data = createSeedData();

    let first: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let second: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let firstApp: ReturnType<typeof buildServer> | undefined;
    let secondApp: ReturnType<typeof buildServer> | undefined;

    try {
      first = await createPlatformPersistence({ databasePath, seedData: data });
      second = await createPlatformPersistence({ databasePath, seed: false });
      firstApp = createApp(data, first);
      secondApp = createApp(data, second);

      const session = await login(firstApp, "user-parent-1");
      const logoutResponse = await logout(firstApp, session.token);
      expect(logoutResponse.statusCode).toBe(200);

      const revokedOnOtherInstance = await secondApp.inject({
        method: "GET",
        url: childrenPath,
        headers: { authorization: `Bearer ${session.token}` },
      });
      expect(revokedOnOtherInstance.statusCode).toBe(401);

      const logoutOnOtherInstance = await logout(secondApp, session.token);
      expect(logoutOnOtherInstance.statusCode).toBe(401);
    } finally {
      if (firstApp) await firstApp.close();
      if (secondApp) await secondApp.close();
      if (first) first.database.close();
      if (second) second.database.close();
    }
  });
});
