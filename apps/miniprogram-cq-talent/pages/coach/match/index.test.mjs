import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachMatchDetail: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachMatchDetail: mocks.getCoachMatchDetail,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

const detail = {
  event: {
    id: "event-match-1",
    type: "match",
    title: "Real match title",
    startsAt: "2026-08-13T09:00:00.000Z",
    endsAt: "2026-08-13T10:00:00.000Z",
    status: "completed",
    teamName: "Real team",
  },
  roster: [
    { studentId: "student-1", name: "Athlete One", status: "present" },
    { studentId: "student-2", name: "Athlete Two", status: "present" },
  ],
  match: { id: "match-1", opponentName: "Real opponent", homeScore: 2, awayScore: 1, status: "completed" },
  events: [
    { id: "event-no-minute", type: "save", studentId: "student-2", createdAt: "2026-08-13T09:50:00.000Z" },
    { id: "event-42", type: "yellow_card", studentId: "student-2", minute: 42, createdAt: "2026-08-13T09:42:00.000Z" },
    { id: "event-18-b", type: "assist", studentId: "student-2", minute: 18, createdAt: "2026-08-13T09:19:00.000Z" },
    { id: "event-18-a", type: "goal", studentId: "student-1", minute: 18, createdAt: "2026-08-13T09:18:00.000Z" },
  ],
};

describe("coach match detail", () => {
  beforeEach(() => {
    mocks.getCoachMatchDetail.mockReset().mockResolvedValue(detail);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    globalThis.wx.navigateBack.mockReset();
  });

  it("shows only API-backed detail and sorts the timeline stably by minute then actual fields", async () => {
    const page = createPageInstance();
    await page.onLoad({ id: "event-match-1" });

    expect(mocks.getCoachMatchDetail).toHaveBeenCalledWith("event-match-1");
    expect(page.data).toMatchObject({
      state: "ready",
      eventId: "event-match-1",
      eventTitle: "Real match title",
      teamName: "Real team",
      opponentName: "Real opponent",
      scoreLabel: "2:1",
    });
    expect(page.data.timeline.map((item) => item.id)).toEqual(["event-18-a", "event-18-b", "event-42", "event-no-minute"]);
    expect(page.data.timeline[0]).toMatchObject({ studentName: "Athlete One" });
    expect(page.data.timeline[1]).not.toHaveProperty("assistStudentName");
  });

  it("keeps missing IDs, empty matches, and failed reads as safe states", async () => {
    const missing = createPageInstance();
    await missing.onLoad({});
    expect(mocks.getCoachMatchDetail).not.toHaveBeenCalled();
    expect(missing.data).toMatchObject({ state: "empty", hasMatch: false, timeline: [] });

    mocks.getCoachMatchDetail.mockResolvedValueOnce({ ...detail, match: null, events: [] });
    const empty = createPageInstance();
    await empty.onLoad({ id: "event-match-empty" });
    expect(empty.data).toMatchObject({ state: "empty", hasMatch: false, timeline: [] });

    mocks.getCoachMatchDetail.mockRejectedValueOnce(new Error("raw backend failure"));
    const failed = createPageInstance();
    await failed.onLoad({ id: "event-failure" });
    expect(failed.data).toMatchObject({ state: "error", timeline: [] });
    expect(failed.data.message).not.toContain("raw backend failure");
  });

  it("links add-event only to C6.1", () => {
    const page = createPageInstance({ eventId: "event-match-1", canAddEvent: true });
    page.openMatchEventAdd();
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/match-event-add/index?eventId=event-match-1");
  });

  it("uses the local role tab bar and excludes legacy writes, tactical UI, Figma samples, and template helpers", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"submit-bar"');
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(template).not.toContain("Phoenix");
    expect(template).not.toContain("Star team");
    expect(template).not.toContain("half-time");
    expect(template).not.toContain("submit-bar");
    expect(template).not.toContain("tactical");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("recordCoachMatch");
    expect(controller).not.toContain("openTacticalBoard");
  });
});
