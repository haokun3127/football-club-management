import { describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({results:vi.fn(),coach:vi.fn(),role:vi.fn()}));
vi.mock("../../../utils/api",()=>({getParentConfirmedResults:mock.results,getCoachStudentProfile:mock.coach,getCoachTeam:vi.fn()}));
vi.mock("../../../utils/auth",()=>({requireRole:mock.role}));
vi.mock("../../../utils/presentation",()=>({formatShortDate:s=>s.slice(5,10),resolveMenuInset:()=>0,resolveNavInset:()=>0}));
let definition;globalThis.Page=value=>{definition=value;};globalThis.wx={navigateBack:vi.fn()};
await import("./index.ts");
describe("parent confirmed results",()=>{
 it("uses the guardian endpoint and preserves raw zero and mapped rule versions",async()=>{
  mock.role.mockReturnValue({currentStudentId:"s1"});mock.results.mockResolvedValue({student:{id:"s1",name:"孩子",teams:[]},confirmedResults:[{id:"r",testItemId:"t",value:{kind:"duration_seconds",seconds:0},unit:"秒",templateVersionId:"v1",occurredAt:"2026-10-10T08:00:00Z",mapping:{integerScore:80,grade:"A+",rawScoreVersionId:"raw-v1",gradeVersionId:"grade-v1"}}]});
  const page={...definition,data:structuredClone(definition.data),setData(p){Object.assign(this.data,p);}};await page.load("s1");
  expect(mock.role).toHaveBeenCalledWith("parent");expect(mock.results).toHaveBeenCalledWith("s1");expect(mock.coach).not.toHaveBeenCalled();expect(page.data.selected.valueLabel).toBe("0 秒");expect(page.data.selected.mapping.gradeVersionId).toBe("grade-v1");expect(page.data.teamId).toBe("");
 });
});
