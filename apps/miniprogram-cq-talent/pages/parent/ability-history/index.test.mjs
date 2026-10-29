import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentChildren: mocks.getParentChildren, getParentGrowth: mocks.getParentGrowth }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 0, resolveNavInset: () => 0 }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance() {
  return {
    ...pageDefinition,
    data: { ...pageDefinition.data },
    setData(patch) { this.data = { ...this.data, ...patch }; },
  };
}

describe("parent ability model history", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.getParentChildren.mockReset().mockResolvedValue([{ id: "student-1", name: "罗志炫", teams: ["U10精英队"] }]);
    mocks.getParentGrowth.mockReset().mockResolvedValue({
      timeline: [{
        id: "training-assessment-1",
        kind: "ability_update",
        occurredAt: "2026-09-04T10:20:00.000Z",
        title: "训练内容评测已记录",
        subtitle: "传接球 82 分",
        eventId: "event-training-1",
        abilityUpdate: {
          source: "training_content_assessment",
          metrics: [{ metricId: "passing", label: "传球", previousValue: 78, value: 82 }],
        },
      }],
    });
  });

  it("renders source, before/after value, delta, and an event source link from the real growth timeline", async () => {
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows).toEqual([expect.objectContaining({
      sourceLabel: "课堂表现",
      metricLabel: "传球 78 → 82",
      deltaLabel: "未比较",
      sourceUrl: "/pages/parent/event/index?id=event-training-1&studentId=student-1",
    })]);
    expect(template).toContain("bindtap=\"openSource\"");
  });

  it("does not promote a single metric to an overall score", () => {
    expect(template).not.toContain(">综合分</view>");
    expect(template).not.toContain(">最新分</view>");
  });
});

it("does not calculate a trend without comparable versions and units",async()=>{
 mocks.getParentGrowth.mockResolvedValueOnce({timeline:[{id:"precision",kind:"ability_update",occurredAt:"2026-10-21T01:00:00Z",abilityUpdate:{source:"semester_assessment",metrics:[{metricId:"m",label:"精神",value:67.8,previousValue:75.9}]}}]});
 const page=createPageInstance();await page.load();expect(page.data.rows[0].deltaLabel).toBe("未比较");
});
it("does not call missing comparison data stable or invent an overall score",async()=>{
 mocks.requireRole.mockReturnValue({role:"parent",currentStudentId:"s"});mocks.getParentChildren.mockResolvedValue([{id:"s",name:"孩子",teams:[]}]);mocks.getParentGrowth.mockResolvedValue({timeline:[{id:"one",kind:"ability_update",occurredAt:"2026-10-01",abilityUpdate:{source:"semester_assessment",metrics:[{metricId:"m",label:"单项",value:0,previousValue:null}]}}]});
 const p=createPageInstance();await p.load();expect(p.data.rows[0]).toMatchObject({metricLabel:"单项 – → 0",deltaLabel:"未比较",deltaTone:"neutral",sourceLabel:"测评模型"});expect(p.data.scoreLabel).toBeUndefined();
});
it("ignores a delayed history read after unloading",async()=>{
 let finish;mocks.getParentGrowth.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const p=createPageInstance();const read=p.load();await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));p.onUnload();finish({timeline:[]});await read;expect(p.data.state).toBe("loading");
});
