import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentCalendar: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  navigateBack: vi.fn(),
  showActionSheet: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentCalendar: mocks.getParentCalendar }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/config", () => ({ DEV_PARENT_PAGE_DATE_OVERRIDE: null }));
vi.mock("../../../utils/date", () => ({ resolveParentPageDate: () => "2026-09-06" }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuActionTop: () => 0, resolveMenuInset: () => 0, resolveNavInset: () => 0 }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: mocks.navigateBack, showActionSheet: mocks.showActionSheet };

await import("./index.ts");

function createPageInstance() {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("parent day schedule", () => {
  beforeEach(() => {
    mocks.getParentCalendar.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    mocks.openPage.mockReset();
    mocks.navigateBack.mockReset();
    mocks.showActionSheet.mockReset();
  });

  it("does not expose backend error details when the day read fails", async () => {
    mocks.getParentCalendar.mockRejectedValueOnce(new Error("backend database detail"));
    const page = createPageInstance();

    await page.onLoad({ date: "2026-09-06" });

    expect(page.data.state).toBe("error");
    expect(page.data.message).toBe("活动读取失败，请稍后重试。");
  });

  it("reads the selected day, filters locally, and opens the real event detail", async () => {
    mocks.getParentCalendar.mockResolvedValueOnce([
      { id: "training-1", type: "training", title: "控球训练", startsAt: "2026-09-06T10:00:00.000Z", endsAt: "2026-09-06T12:00:00.000Z", venue: "九龙坡足球公园", teamName: "U10精英队", status: "scheduled" },
      { id: "match-1", type: "match", title: "周末联赛", startsAt: "2026-09-06T14:00:00.000Z", endsAt: "2026-09-06T16:00:00.000Z", venue: "九龙坡足球公园", teamName: "U10精英队", status: "scheduled" },
    ]);
    const page = createPageInstance();

    await page.onLoad({ date: "2026-09-06" });

    expect(mocks.getParentCalendar).toHaveBeenCalledWith("2026-09-06", "2026-09-06");
    expect(page.data).toMatchObject({ state: "ready", dateLabel: "9月6日 星期日" });
    expect(page.data.events).toHaveLength(2);

    page.openFilter();
    const options = mocks.showActionSheet.mock.calls[0][0];
    options.success({ tapIndex: 1 });
    expect(page.data.events).toEqual([expect.objectContaining({ id: "training-1", type: "training" })]);

    page.openEvent({ currentTarget: { dataset: { id: "training-1" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/event/index?id=training-1");
  });

  it("keeps the template declarative and the custom navigation shell intact", () => {
    const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
    const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).toContain('bindaction="openFilter"');
    expect(template).toContain('bindtap="openEvent"');
    expect(pageConfig).toContain('"navigationStyle": "custom"');
  });
});
