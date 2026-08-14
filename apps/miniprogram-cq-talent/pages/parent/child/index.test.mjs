import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  getParentSchedule: vi.fn(),
  getParentStudentHome: vi.fn(),
  switchActiveRole: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
  routeHome: vi.fn(),
  persistAuthenticatedSession: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
  getParentSchedule: mocks.getParentSchedule,
  getParentStudentHome: mocks.getParentStudentHome,
  switchActiveRole: mocks.switchActiveRole,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole, routeHome: mocks.routeHome }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatDateTime: (value) => value,
  formatTenure: (startsAt, prefix = "在队") => (startsAt ? `${prefix}1年7个月` : ""),
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));
vi.mock("../../../utils/store", () => ({
  persistAuthenticatedSession: mocks.persistAuthenticatedSession,
  setCurrentStudentId: mocks.setCurrentStudentId,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent profile hub", () => {
  beforeEach(() => {
    mocks.getParentChildren.mockReset().mockResolvedValue([
      { id: "student-1", name: "Player", teams: ["Team A"], coachNames: [] },
    ]);
    mocks.getParentSchedule.mockReset().mockResolvedValue([
      { id: "event-1", type: "training", title: "Actual training", startsAt: "2026-08-10T09:00:00.000Z", status: "completed", venue: "Field" },
    ]);
    mocks.getParentStudentHome.mockReset().mockResolvedValue({
      profile: [],
      lessonStatus: [{ label: "Remaining lessons", value: "12" }],
      insuranceStatus: [{ label: "Insurance", value: "Registered", status: "active" }],
      clubInfo: [],
      updatedAt: "2026-08-10T09:00:00.000Z",
    });
    mocks.openPage.mockReset();
    mocks.getParentGrowth.mockReset().mockResolvedValue({});
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", availableRoles: ["parent"], currentStudentId: "student-1" });
    mocks.switchActiveRole.mockReset();
    mocks.routeHome.mockReset();
    mocks.persistAuthenticatedSession.mockReset();
    mocks.setCurrentStudentId.mockReset();
  });

  it("uses only supplied status rows and child schedule activities", async () => {
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({ state: "ready", teamLabel: "Team A" });
    expect(page.data.heroStats).toEqual([{ label: "Remaining lessons", value: "12" }]);
    expect(page.data.recentActivities).toEqual([{ title: "Actual training", date: "2026-08-10T09:00:00.000Z" }]);
  });

  it("prefers real training stats for the stats row when growth summary supplies them", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      trainingStats: { totalTrainings: 11, attendanceRate: 93, monthTrainings: 5, monthly: [] },
    });
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "Player", teams: ["Team A"], coachNames: [], teamStartsAt: "2025-01-05" },
    ]);
    const page = createPageInstance();

    await page.load();

    expect(page.data.heroStats).toEqual([
      { label: "训练课时", value: "11" },
      { label: "出勤率", value: "93%" },
      { label: "在队时长", value: "1年7个月" },
    ]);
  });

  it("surfaces a student-home failure as the page error state", async () => {
    mocks.getParentStudentHome.mockRejectedValue(new Error("home unavailable"));
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({ state: "error", message: "home unavailable" });
  });

  it("shows a persistent coach switch only for a server-confirmed dual-role parent", async () => {
    const selectedSession = {
      clubId: "club-chongqing-talent",
      client: { id: "client-cq-talent" },
      status: "authenticated",
      session: { token: "coach-session-token", expiresInSeconds: 3600, expiresAt: "2099-01-01T00:00:00.000Z", activeRole: "coach" },
      role: "coach",
      availableRoles: ["parent", "coach"],
      profile: { userId: "user-dual", displayName: "Dual role" },
      children: [],
      capabilities: {},
    };
    mocks.requireRole.mockReturnValue({ role: "parent", availableRoles: ["parent", "coach"], currentStudentId: "student-1" });
    mocks.switchActiveRole.mockResolvedValue(selectedSession);
    mocks.persistAuthenticatedSession.mockReturnValue({ role: "coach" });
    const page = createPageInstance();

    await page.load();
    expect(page.data.canSwitchToCoach).toBe(true);

    await page.switchToCoach();

    expect(mocks.switchActiveRole).toHaveBeenCalledWith("coach");
    expect(mocks.persistAuthenticatedSession).toHaveBeenCalledWith(selectedSession);
    expect(mocks.routeHome).toHaveBeenCalledWith("coach");
    expect(template).toContain('wx:if="{{canSwitchToCoach}}"');
    expect(template).toContain('bindtap="switchToCoach"');
    expect(template).toContain('class="p7-role-switch"');
    expect(template).toContain('wx:if="{{canSwitchToCoach && !studentHome}}"');
  });

  it("does not expose a role switch to a parent-only session", async () => {
    const page = createPageInstance();

    await page.load();
    await page.switchToCoach();

    expect(page.data.canSwitchToCoach).toBe(false);
    expect(mocks.switchActiveRole).not.toHaveBeenCalled();
  });

  it("does not render invented activities or reminders and keeps template expressions precomputed", () => {
    expect(template).toContain('wx:if="{{recentActivities.length}}"');
    expect(template).toContain("p7-card--pending");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
