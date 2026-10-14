import { beforeEach, describe, expect, it } from "vitest";

const storage = new Map();

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  getStorageInfoSync: () => ({ keys: Array.from(storage.keys()) }),
};

const store = await import("./store.ts");
const { clearSession, getDevRole, getSession, persistAuthenticatedSession, mergeSessionContext, toggleDevRole } = store;

describe("session storage compatibility", () => {
  beforeEach(() => {
    clearSession();
    storage.clear();
  });

  it("treats a stored session without availableRoles as its active role only", () => {
    storage.set("cqTalent:develop:cqTalentSession", {
      clubId: "club-1",
      clientId: "client-1",
      capabilities: {},
      role: "coach",
      token: "legacy-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    expect(getSession()).toMatchObject({
      role: "coach",
      availableRoles: ["coach"],
    });
  });

  it("refuses an authenticated response whose active role is not server-confirmed as available", () => {
    const persisted = persistAuthenticatedSession({
      clubId: "club-1",
      client: { id: "client-1" },
      status: "authenticated",
      phoneBinding: "accepted",
      session: {
        token: "server-token",
        expiresInSeconds: 3600,
        expiresAt: "2099-01-01T00:00:00.000Z",
        activeRole: "parent",
      },
      role: "coach",
      availableRoles: ["coach"],
      profile: { userId: "user-1", displayName: "Role conflict" },
      children: [],
      capabilities: {},
    });

    expect(persisted).toBeNull();
    expect(getSession()).toBeNull();
  });

  it("refreshes stale session capabilities from the latest resolved client context", () => {
    const existing = {
      clubId: "club-1",
      clientId: "client-1",
      capabilities: {},
      role: "coach",
      availableRoles: ["coach"],
      token: "server-token",
      userId: "user-1",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };
    const context = {
      clubId: "club-1",
      clientId: "client-1",
      capabilities: { match: { eventTypes: ["goal", "assist"] } },
    };

    expect(mergeSessionContext(existing, context)).toMatchObject({
      role: "coach",
      token: "server-token",
      capabilities: { match: { eventTypes: ["goal", "assist"] } },
    });
  });

  it("keeps the real phone binding in the authenticated session", () => {
    const persisted = persistAuthenticatedSession({
      clubId: "club-1",
      client: { id: "client-1" },
      status: "authenticated",
      phoneBinding: "accepted",
      session: {
        token: "server-token",
        expiresInSeconds: 3600,
        expiresAt: "2099-01-01T00:00:00.000Z",
        activeRole: "coach",
      },
      role: "coach",
      availableRoles: ["coach"],
      profile: { userId: "user-1", displayName: "真实教练", phone: "19922961921" },
      children: [],
      capabilities: {},
    });

    expect(persisted).toMatchObject({ phone: "19922961921", phoneBinding: "accepted" });
  });

  it("clears only disposable local drafts and preserves the authenticated session", () => {
    storage.set("cqTalent:develop:cqTalentSession", { token: "keep-session" });
    storage.set("cqTalent:develop:cqTalentAppContext", { clubId: "club-1" });
    storage.set("cqTalent:develop:cqTalentAssessmentDraft:event-1:current", { score: 80 });
    storage.set("cqTalent:develop:coach-assessment-entry:task-1:template:version", { score: 80 });
    storage.set("cqTalent:develop:coach-assessment-bulk:task-1:project-1", { score: 80 });
    storage.set("cqTalent:develop:match-event-draft:v1:event-1", { minute: 12 });
    storage.set("cqTalent:develop:cq-parent-reminder-read-ids", ["notice-1"]);
    storage.set("cqTalent:develop:coach-training-team-id", "team-1");

    expect(store.clearDisposableLocalCache).toBeTypeOf("function");
    const cleared = store.clearDisposableLocalCache?.();

    expect(cleared).toBe(5);
    expect(storage.has("cqTalent:develop:cqTalentSession")).toBe(true);
    expect(storage.has("cqTalent:develop:cqTalentAppContext")).toBe(true);
    expect(storage.has("cqTalent:develop:coach-training-team-id")).toBe(true);
    expect(storage.has("cqTalent:develop:cqTalentAssessmentDraft:event-1:current")).toBe(false);
    expect(storage.has("cqTalent:develop:coach-assessment-entry:task-1:template:version")).toBe(false);
    expect(storage.has("cqTalent:develop:coach-assessment-bulk:task-1:project-1")).toBe(false);
    expect(storage.has("cqTalent:develop:match-event-draft:v1:event-1")).toBe(false);
    expect(storage.has("cqTalent:develop:cq-parent-reminder-read-ids")).toBe(false);
  });

  it("keeps the selected development role after resetting an old session", () => {
    storage.set("cqTalent:develop:cqTalentSession", { token: "stale-session" });

    expect(toggleDevRole()).toBe("coach");
    expect(storage.has("cqTalent:develop:cqTalentSession")).toBe(false);
    expect(getDevRole()).toBe("coach");
  });
});
