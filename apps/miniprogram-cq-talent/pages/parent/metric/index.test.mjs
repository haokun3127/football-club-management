import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentMetricDetail: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentMetricDetail: mocks.getParentMetricDetail }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  activityTypeLabel: (type) => type,
  formatDateTime: (value) => value,
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn(), showToast: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data, ...data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent metric detail", () => {
  beforeEach(() => {
    mocks.getParentMetricDetail.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  });

  it("renders a trend only from at least two real metric records", async () => {
    mocks.getParentMetricDetail.mockResolvedValue({
      metricId: "speed",
      label: "Speed",
      unit: "pts",
      latest: { value: 80 },
      records: [
        { id: "record-2", value: 80, occurredAt: "2026-08-10T09:00:00.000Z", source: "assessment" },
        { id: "record-1", value: 75, occurredAt: "2026-07-10T09:00:00.000Z", source: "assessment" },
      ],
      sourceEvents: [{ recordId: "record-2", eventId: "event-1", title: "Assessment", type: "assessment", startsAt: "2026-08-10T09:00:00.000Z" }],
    });
    const page = createPageInstance({ metricId: "speed", studentId: "student-1" });

    await page.load();

    expect(page.data).toMatchObject({ state: "ready", heroValue: "80" });
    expect(page.data.chartPoints).toHaveLength(2);
    expect(page.data.records).toHaveLength(2);
  });

  it("does not draw a trend chart from a single real metric record", async () => {
    mocks.getParentMetricDetail.mockResolvedValue({
      metricId: "speed",
      label: "Speed",
      unit: "pts",
      latest: { value: 80 },
      records: [{ id: "record-1", value: 80, occurredAt: "2026-08-10T09:00:00.000Z", source: "assessment" }],
      sourceEvents: [],
    });
    const page = createPageInstance({ metricId: "speed", studentId: "student-1" });

    await page.load();

    expect(page.data.chartPoints).toEqual([]);
  });

  it("hides unsupported coach, team, range, and score-baseline samples", () => {
    expect(template).not.toContain("coach-feedback-card");
    expect(template).not.toContain("team-compare-card");
    expect(template).not.toContain("p6-nav__range");
    expect(template).not.toContain("'/'+ (100)");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("coachFeedback");
    expect(controller).not.toContain("teamCompareMessage");
    expect(controller).not.toContain("switchRange");
  });
});
