import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ClubUserMembership } from "@football-club/domain";
import { afterAll, describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createSeedData, type SeedData } from "../src/seed.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const clubId = "club-chongqing-talent";
const clientId = "app-client-cq-talent-wechat-main";
const loginPath = `/clubs/${clubId}/app-clients/${clientId}/wechat-login`;
const rolePath = `/clubs/${clubId}/app-clients/${clientId}/session/role`;
const childrenPath = `/clubs/${clubId}/app-clients/${clientId}/parent/children`;
const coachHomePath = `/clubs/${clubId}/app-clients/${clientId}/coach/home?date=2026-07-01`;

type AppSession = {
  token: string;
  activeRole: "parent" | "coach" | null;
  expiresAt: string;
};

type LoginResponse = {
  role: "parent" | "coach" | null;
  availableRoles: Array<"parent" | "coach">;
  session: AppSession | null;
  children: Array<{ id: string }>;
};

function addUserWithMembership(data: SeedData, id: string, roles: ClubUserMembership["roles"]) {
  const templateUser = data.users.find((user) => user.id === "user-parent-1")!;
  const templateMembership = data.clubMemberships.find((membership) => membership.userId === templateUser.id)!;
  data.users.push({
    ...templateUser,
    id,
    displayName: id,
    phone: undefined,
    roles: [...roles],
  });
  data.clubMemberships.push({
    ...templateMembership,
    id: `membership-${id}`,
    userId: id,
    roles: [...roles],
  });
}

function createApp(data: SeedData, persistence: Awaited<ReturnType<typeof createPlatformPersistence>>) {
  return buildServer(new PersistentApiStore(persistence.repositories, data), {
    logger: false,
    membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships, null),
  });
}

const temporaryRoleSwitchDirectories = new Set<string>();

function createRoleSwitchDatabasePath() {
  const directory = mkdtempSync(join(tmpdir(), "football-role-switch-"));
  temporaryRoleSwitchDirectories.add(directory);
  return join(directory, "club.sqlite");
}

async function login(
  app: ReturnType<typeof buildServer>,
  userId: string,
  capabilities?: string,
) {
  return app.inject({
    method: "POST",
    url: loginPath,
    headers: {
      "x-user-id": userId,
      ...(capabilities ? { "x-app-client-capabilities": capabilities } : {}),
    },
    payload: { wxLoginCode: `wx-${userId}` },
  });
}

describe("app-client active role sessions", () => {
  afterAll(() => {
    for (const directory of temporaryRoleSwitchDirectories) {
      rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it("derives entrypoint-filtered available roles without treating finance as an app role", async () => {
    const data = createSeedData();
    addUserWithMembership(data, "user-dual-role", ["parent", "coach"]);
    addUserWithMembership(data, "user-operator-role", ["operator"]);
    addUserWithMembership(data, "user-finance-role", ["finance"]);
    const persistence = await createPlatformPersistence({ databasePath: ":memory:", seedData: data });
    const app = createApp(data, persistence);

    const [parent, coach, dual, operator, finance] = await Promise.all([
      login(app, "user-parent-1"),
      login(app, "user-coach-1"),
      login(app, "user-dual-role", "active-role-switch-v1"),
      login(app, "user-operator-role"),
      login(app, "user-finance-role"),
    ]);

    expect(parent.statusCode).toBe(200);
    const parentSession = parent.json<LoginResponse>();
    expect(parentSession).toEqual(expect.objectContaining({
      role: "parent",
      availableRoles: ["parent"],
      session: expect.objectContaining({ activeRole: "parent" }),
    }));
    const unavailableRole = await app.inject({
      method: "POST",
      url: rolePath,
      headers: { authorization: `Bearer ${parentSession.session?.token ?? ""}` },
      payload: { role: "coach" },
    });
    expect(unavailableRole.statusCode).toBe(403);
    expect(unavailableRole.json().error.code).toBe("forbidden");
    const bearerFallback = await app.inject({
      method: "POST",
      url: loginPath,
      headers: {
        authorization: "bearer unknown-token",
        "x-user-id": "user-coach-1",
      },
      payload: { wxLoginCode: "wx-bearer-fallback" },
    });
    expect(bearerFallback.statusCode).toBe(401);
    expect(bearerFallback.json().error.code).toBe("authentication_required");
    expect(coach.statusCode).toBe(200);
    expect(coach.json<LoginResponse>()).toEqual(expect.objectContaining({
      role: "coach",
      availableRoles: ["coach"],
      session: expect.objectContaining({ activeRole: "coach" }),
    }));
    expect(dual.statusCode).toBe(200);
    expect(dual.json<LoginResponse>()).toEqual(expect.objectContaining({
      role: "coach",
      availableRoles: ["parent", "coach"],
      session: expect.objectContaining({ activeRole: null }),
      children: [],
    }));
    expect(operator.statusCode).toBe(200);
    expect(operator.json<LoginResponse>()).toEqual(expect.objectContaining({
      role: "coach",
      availableRoles: ["coach"],
      session: expect.objectContaining({ activeRole: "coach" }),
    }));
    expect(finance.statusCode).toBe(403);
    expect(finance.json().error.code).toBe("forbidden");

    const unsupportedCapability = await login(app, "user-parent-1", "unsupported-role-switch-protocol");
    expect(unsupportedCapability.statusCode).toBe(400);

    await app.close();
    persistence.database.close();
  });

  it("shares pending sessions across API instances, rotates every selection, and revalidates authority", async () => {
    const databasePath = createRoleSwitchDatabasePath();
    const data = createSeedData();
    const dualMembership = data.clubMemberships.find((membership) => membership.userId === "user-parent-1")!;
    dualMembership.roles = ["parent", "coach"];

    let first: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let second: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let firstApp: ReturnType<typeof buildServer> | undefined;
    let secondApp: ReturnType<typeof buildServer> | undefined;
    let restarted: Awaited<ReturnType<typeof createPlatformPersistence>> | undefined;
    let restartedApp: ReturnType<typeof buildServer> | undefined;

    try {
      first = await createPlatformPersistence({ databasePath, seedData: data });
      second = await createPlatformPersistence({ databasePath, seed: false });
      firstApp = createApp(data, first);
      secondApp = createApp(data, second);

      const pendingLogin = await login(firstApp, "user-parent-1", "active-role-switch-v1");
      const pending = pendingLogin.json<LoginResponse>();
      expect(pendingLogin.statusCode).toBe(200);
      expect(pending).toEqual(expect.objectContaining({
        availableRoles: ["parent", "coach"],
        session: expect.objectContaining({ activeRole: null }),
      }));
      expect(pending.children).toEqual([]);
      const persistedPending = first.database.prepare(`
        SELECT token_hash, active_role, membership_id
        FROM app_client_sessions
        WHERE token_hash = ?
      `).get(createHash("sha256").update(pending.session?.token ?? "").digest("hex")) as {
        token_hash: string;
        active_role: string | null;
        membership_id: string;
      };
      expect(persistedPending).toEqual({
        token_hash: createHash("sha256").update(pending.session?.token ?? "").digest("hex"),
        active_role: null,
        membership_id: dualMembership.id,
      });
      expect(persistedPending.token_hash).not.toContain(pending.session?.token ?? "");

      const pendingParentRead = await firstApp.inject({
        method: "GET",
        url: childrenPath,
        headers: { authorization: `Bearer ${pending.session?.token ?? ""}` },
      });
      expect(pendingParentRead.statusCode).toBe(401);
      expect(pendingParentRead.json().error.code).toBe("authentication_required");

      const selectedParent = await secondApp.inject({
        method: "POST",
        url: rolePath,
        headers: { authorization: `Bearer ${pending.session?.token ?? ""}` },
        payload: { role: "parent" },
      });
      const parentSession = selectedParent.json<LoginResponse>();
      expect(selectedParent.statusCode).toBe(200);
      expect(parentSession).toEqual(expect.objectContaining({
        role: "parent",
        session: expect.objectContaining({ activeRole: "parent" }),
        children: [expect.objectContaining({ id: "student-1" })],
      }));
      expect(parentSession.session?.token).not.toBe(pending.session?.token);

      const revokedPending = await firstApp.inject({
        method: "GET",
        url: childrenPath,
        headers: { authorization: `Bearer ${pending.session?.token ?? ""}` },
      });
      const parentReadOnOtherInstance = await firstApp.inject({
        method: "GET",
        url: childrenPath,
        headers: { authorization: `Bearer ${parentSession.session?.token ?? ""}` },
      });
      const parentCoachRead = await firstApp.inject({
        method: "GET",
        url: coachHomePath,
        headers: { authorization: `Bearer ${parentSession.session?.token ?? ""}` },
      });
      expect(revokedPending.statusCode).toBe(401);
      expect(parentReadOnOtherInstance.statusCode).toBe(200);
      expect(parentCoachRead.statusCode).toBe(403);

      const legacyLogin = await login(firstApp, "user-parent-1");
      const legacy = legacyLogin.json<LoginResponse>();
      expect(legacyLogin.statusCode).toBe(200);
      expect(legacy.session).toEqual(expect.objectContaining({ activeRole: "coach" }));
      const rotatedDefault = await firstApp.inject({
        method: "POST",
        url: rolePath,
        headers: { authorization: `Bearer ${legacy.session?.token ?? ""}` },
        payload: { role: "coach" },
      });
      const coachSession = rotatedDefault.json<LoginResponse>();
      expect(rotatedDefault.statusCode).toBe(200);
      expect(coachSession.session?.token).not.toBe(legacy.session?.token);
      const revokedLegacy = await firstApp.inject({
        method: "GET",
        url: coachHomePath,
        headers: { authorization: `Bearer ${legacy.session?.token ?? ""}` },
      });
      expect(revokedLegacy.statusCode).toBe(401);

      await second.repositories.memberships.save({ ...dualMembership, roles: ["parent"] });
      const removedRole = await firstApp.inject({
        method: "GET",
        url: coachHomePath,
        headers: { authorization: `Bearer ${coachSession.session?.token ?? ""}` },
      });
      expect(removedRole.statusCode).toBe(401);
      expect(removedRole.json().error.code).toBe("authentication_required");

      await second.repositories.memberships.save(dualMembership);
      const membershipSession = (await login(firstApp, "user-parent-1")).json<LoginResponse>().session!;
      await second.repositories.memberships.save({ ...dualMembership, status: "inactive" });
      const inactiveMembership = await firstApp.inject({
        method: "GET",
        url: coachHomePath,
        headers: { authorization: `Bearer ${membershipSession.token}` },
      });
      expect(inactiveMembership.statusCode).toBe(401);

      await second.repositories.memberships.save(dualMembership);
      const userSession = (await login(firstApp, "user-parent-1")).json<LoginResponse>().session!;
      const parentUser = data.users.find((user) => user.id === "user-parent-1")!;
      await second.repositories.users.save({ ...parentUser, status: "inactive" });
      const inactiveUser = await firstApp.inject({
        method: "GET",
        url: coachHomePath,
        headers: { authorization: `Bearer ${userSession.token}` },
      });
      expect(inactiveUser.statusCode).toBe(401);

      await second.repositories.users.save(parentUser);
      const clientSession = (await login(firstApp, "user-parent-1")).json<LoginResponse>().session!;
      const client = second.repositories.dataCapability.listClubAppClients(clubId).find((item) => item.id === clientId)!;
      second.repositories.dataCapability.saveClubAppClient({ ...client, status: "paused" });
      const inactiveClient = await firstApp.inject({
        method: "GET",
        url: coachHomePath,
        headers: { authorization: `Bearer ${clientSession.token}` },
      });
       expect(inactiveClient.statusCode).toBe(401);
       second.repositories.dataCapability.saveClubAppClient(client);

       const restartLogin = await login(firstApp, "user-parent-1");
       const restartSession = restartLogin.json<LoginResponse>().session!;
       expect(restartLogin.statusCode).toBe(200);
       expect(restartSession.activeRole).toBe("coach");

       await firstApp.close();
       firstApp = undefined;
       await secondApp.close();
       secondApp = undefined;
       first.database.close();
       first = undefined;
       second.database.close();
       second = undefined;
       restarted = await createPlatformPersistence({ databasePath, seed: false });
       restartedApp = createApp(data, restarted);
       const restartedCoachRead = await restartedApp.inject({
         method: "GET",
         url: coachHomePath,
         headers: { authorization: `Bearer ${restartSession.token}` },
       });
       expect(restartedCoachRead.statusCode).toBe(200);
     } finally {
       if (restartedApp) await restartedApp.close();
       if (firstApp) await firstApp.close();
       if (secondApp) await secondApp.close();
       if (restarted) restarted.database.close();
       if (first) first.database.close();
       if (second) second.database.close();
     }
  }, 15_000);
});
