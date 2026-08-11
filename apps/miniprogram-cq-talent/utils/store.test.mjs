import { beforeEach, describe, expect, it } from "vitest";

const storage = new Map();

globalThis.wx = {
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
};

const { clearSession, getSession, persistAuthenticatedSession } = await import("./store.ts");

describe("session storage compatibility", () => {
  beforeEach(() => {
    clearSession();
    storage.clear();
  });

  it("treats a stored session without availableRoles as its active role only", () => {
    storage.set("cqTalentSession", {
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
});
