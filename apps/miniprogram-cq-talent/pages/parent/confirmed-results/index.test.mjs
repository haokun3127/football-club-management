import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({results:vi.fn(),coach:vi.fn(),role:vi.fn(),open:vi.fn()}));
vi.mock("../../../utils/api",()=>({getParentConfirmedResults:mock.results,getCoachStudentProfile:mock.coach,getCoachTeam:vi.fn()}));
vi.mock("../../../utils/navigation",()=>({openPage:mock.open}));
vi.mock("../../../utils/auth",()=>({requireRole:mock.role}));
vi.mock("../../../utils/presentation",()=>({formatShortDate:s=>s.slice(5,10),resolveMenuInset:()=>0,resolveNavInset:()=>0}));
let definition;globalThis.Page=value=>{definition=value;};globalThis.wx={navigateBack:vi.fn()};
await import("./index.ts");
beforeEach(()=>{vi.clearAllMocks();mock.results.mockReset();mock.role.mockReturnValue({currentStudentId:"s1"});});
describe("parent confirmed results",()=>{
 it("uses the guardian endpoint and preserves raw zero and mapped rule versions",async()=>{
  mock.role.mockReturnValue({currentStudentId:"s1"});mock.results.mockResolvedValue({student:{id:"s1",name:"孩子",teams:[]},confirmedResults:[{id:"r",testItemId:"t",value:{kind:"duration_seconds",seconds:0},unit:"秒",templateVersionId:"v1",occurredAt:"2026-10-10T08:00:00Z",mapping:{integerScore:80,grade:"A+",rawScoreVersionId:"raw-v1",gradeVersionId:"grade-v1"}}]});
  const page={...definition,data:structuredClone(definition.data),setData(p){Object.assign(this.data,p);}};await page.load("s1");
  expect(mock.role).toHaveBeenCalledWith("parent");expect(mock.results).toHaveBeenCalledWith("s1");expect(mock.coach).not.toHaveBeenCalled();expect(page.data.selected.valueLabel).toBe("0 秒");expect(page.data.selected.mapping.gradeVersionId).toBe("grade-v1");expect(page.data.teamId).toBe("");
 });
});

const template=(await import("node:fs")).readFileSync(new URL("./index.wxml",import.meta.url),"utf8");
const page=()=>({...definition,data:structuredClone(definition.data),setData(p){Object.assign(this.data,p);}});
const result=(id,version="assessment-template-version-cq-talent-elite-20260326",unit="score")=>({id,testItemId:"juggle",name:"1分钟颠球次数",value:{kind:"measurement",value:66,unit},unit,templateVersionId:version,occurredAt:"2026-10-21T01:00:00Z",eventId:"course",mapping:{integerScore:80,grade:"A",rawScoreVersionId:"raw-internal-version-id",gradeVersionId:"grade-internal-version-id"}});
it("localizes selected, history, alternatives and chart units while preserving original grouping and raw facts",async()=>{
 mock.results.mockResolvedValue({student:{id:"s1",name:"孩子",teams:[]},confirmedResults:[result("current"),result("past"),result("other","v2")]});
 const p=page();await p.load("s1");expect(p.data.selected.valueLabel).toBe("66 分");expect(p.data.results[0].unit).toBe("score");
 expect(p.data.history).toHaveLength(2);expect(p.data.history.every(row=>row.valueLabel==="66 分")).toBe(true);expect(p.data.alternatives[0].valueLabel).toBe("66 分");expect(p.data.bars.every(bar=>bar.valueLabel==="66 分")).toBe(true);expect(p.data.scaleLabel).not.toContain("score");
 expect(p.data.sourceExpanded).toBe(false);p.toggleSource();expect(p.data.sourceExpanded).toBe(true);expect(p.data.selected.mapping.rawScoreVersionId).toBe("raw-internal-version-id");
 p.openSourceEvent();expect(mock.open).toHaveBeenCalledWith("/pages/parent/event/index?id=course&studentId=s1");
 p.selectResult("other");expect(p.data.sourceExpanded).toBe(false);expect(p.data.history).toHaveLength(1);
});
it("keeps unknown-unit text available and the raw unit in collapsed provenance without plotting a scale",async()=>{
 mock.results.mockResolvedValue({student:{id:"s1",name:"孩子",teams:[]},confirmedResults:[result("r","v1","unrecognized-unit")]});const p=page();await p.load("s1");
 expect(p.data.selected.valueLabel).toBe("66（单位待确认）");expect(p.data.bars).toEqual([]);expect(p.data.sourceRawUnit).toBe("unrecognized-unit");expect(p.data.sourceExpanded).toBe(false);expect(p.data.scaleLabel).toContain("单位待确认");
});
it("places project and rule IDs only within the expandable source section",()=>{
 const source=template.indexOf('wx:if="{{sourceExpanded}}"');expect(source).toBeGreaterThan(0);
 for(const field of ["templateVersionId","rawScoreVersionId","gradeVersionId"])expect(template.indexOf(`selected.${field}`)>source || template.indexOf(`selected.mapping.${field}`)>source).toBe(true);
 expect(template.slice(0,source)).not.toContain("rawScoreVersionId");expect(template).toContain('bindtap="toggleSource"');
});
