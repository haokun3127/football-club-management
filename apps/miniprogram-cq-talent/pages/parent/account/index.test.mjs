import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  switchActiveRole: vi.fn(),
  requireRole: vi.fn(),
  routeHome: vi.fn(),
  persistAuthenticatedSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  switchActiveRole: mocks.switchActiveRole,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole, routeHome: mocks.routeHome }));
vi.mock("../../../utils/store", () => ({
  clearSession: mocks.clearSession,
  persistAuthenticatedSession: mocks.persistAuthenticatedSession,
}));

globalThis.wx = {
  showToast: vi.fn(),
  showModal: vi.fn(),
  reLaunch: vi.fn(),
};

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const parentSession = {
  role: "parent",
  availableRoles: ["parent", "coach"],
  displayName: "Dual role parent",
};

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("parent account role switch", () => {
  beforeEach(() => {
    mocks.getParentChildren.mockReset().mockResolvedValue([{ id: "student-1" }]);
    mocks.switchActiveRole.mockReset();
    mocks.requireRole.mockReset().mockReturnValue(parentSession);
    mocks.routeHome.mockReset();
    mocks.persistAuthenticatedSession.mockReset().mockImplementation((result) => ({ role: result.session.activeRole }));
    mocks.clearSession.mockReset();
  });

  it("shows the coach switch only for a dual-role parent and routes after a confirmed session", async () => {
    const selectedSession = {
      clubId: "club-chongqing-talent",
      client: { id: "client-cq-talent" },
      status: "authenticated",
      session: {
        token: "coach-session-token",
        expiresInSeconds: 3600,
        expiresAt: "2099-01-01T00:00:00.000Z",
        activeRole: "coach",
      },
      role: "parent",
      availableRoles: ["parent", "coach"],
      profile: { userId: "user-dual", displayName: "Dual role" },
      children: [],
      capabilities: {},
    };
    mocks.switchActiveRole.mockResolvedValue(selectedSession);
    const page = createPageInstance();

    await page.load();
    expect(page.data.canSwitchToCoach).toBe(true);

    await page.switchToCoach();

    expect(mocks.switchActiveRole).toHaveBeenCalledWith("coach");
    expect(mocks.persistAuthenticatedSession).toHaveBeenCalledWith(selectedSession);
    expect(mocks.routeHome).toHaveBeenCalledWith("coach");
    expect(template).toContain('wx:if="{{canSwitchToCoach}}"');
    expect(template).toContain('bindtap="switchToCoach"');
  });

  it("does not expose the coach switch to a parent-only session", async () => {
    mocks.requireRole.mockReturnValue({ ...parentSession, availableRoles: ["parent"] });
    const page = createPageInstance();

    await page.load();
    page.switchToCoach();

    expect(page.data.canSwitchToCoach).toBe(false);
    expect(mocks.switchActiveRole).not.toHaveBeenCalled();
  });
});
