import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({children:vi.fn(), calendar:vi.fn(), articles:vi.fn(), reminders:vi.fn(), session:vi.fn(), select:vi.fn(), open:vi.fn()}));
vi.mock("../../../utils/api", () => ({getParentChildren:mocks.children,getParentCalendar:mocks.calendar,getContentArticles:mocks.articles,getParentReminders:mocks.reminders}));
vi.mock("../../../utils/auth", () => ({requireRole:mocks.session}));
vi.mock("../../../utils/store", () => ({setCurrentStudentId:mocks.select}));
vi.mock("../../../utils/navigation", () => ({openPage:mocks.open}));
globalThis.wx={getAccountInfoSync:()=>({miniProgram:{envVersion:"develop"}}),getWindowInfo:()=>({statusBarHeight:20,windowWidth:375}),getMenuButtonBoundingClientRect:()=>({top:24,left:300,width:64,height:32})};
let definition; globalThis.Page=value=>{definition=value;};
await import("./index.ts");
function page() { return {...definition,data:structuredClone(definition.data),setData(patch){Object.assign(this.data,patch);}}; }
const activity=(id,childIds,type="training")=>({id,childIds,type,title:id,status:"scheduled",startsAt:"2026-10-29T10:00:00+08:00",endsAt:"2026-10-29T11:00:00+08:00",venue:"球场"});
beforeEach(()=>{
 vi.clearAllMocks();mocks.session.mockReturnValue({role:"parent",currentStudentId:"a"});
 mocks.children.mockResolvedValue([{id:"a",name:"大宝",teams:[]},{id:"b",name:"小宝",teams:[]}]);
 mocks.calendar.mockResolvedValue([activity("a-only",["a"]),activity("shared",["a","b"],"match")]);mocks.articles.mockResolvedValue([]);mocks.reminders.mockResolvedValue([]);
});
describe("CQ-12 schedule return context",()=>{
 it("opens the selected child's event with an explicit child query",async()=>{
  const p=page();p.data.selectedDate="2026-10-29";await p.load();p.onChildChange({detail:{studentId:"b"}});
  p.openEvent({detail:{eventId:"shared"}});expect(mocks.open).toHaveBeenCalledWith("/pages/parent/event/index?id=shared&studentId=b");
 });
 it("refreshes returned facts without losing selected date, month mode, type or all-children choice",async()=>{
  const p=page();p.data.selectedDate="2026-10-29";p.data.isMonthPickerExpanded=true;await p.load();
  p.onChildChange({detail:{studentId:"all"}});p.switchType({currentTarget:{dataset:{type:"match"}}});
  mocks.session.mockReturnValue({role:"parent",currentStudentId:"b"});
  mocks.calendar.mockResolvedValue([activity("updated",["a","b"],"match")]);p.onShow();
  await vi.waitFor(()=>expect(p.data.visibleEvents[0]?.id).toBe("updated"));
  expect(p.data).toMatchObject({selectedDate:"2026-10-29",isMonthPickerExpanded:true,selectedType:"match",activeStudentId:"",activeStudentName:"全部孩子"});
  p.openEvent({currentTarget:{dataset:{id:"updated"}}});expect(mocks.open).toHaveBeenCalledWith("/pages/parent/event/index?id=updated");
 });
 it("ignores a stale earlier date response",async()=>{
  const p=page();p.data.selectedDate="2026-10-29";let finish;
  mocks.calendar.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const old=p.load();
  await vi.waitFor(()=>expect(finish).toBeTypeOf("function"));
  p.data.selectedDate="2026-10-30";mocks.calendar.mockResolvedValue([]);await p.load();finish([activity("old",["a"])]);await old;
  expect(p.data.selectedDate).toBe("2026-10-30");expect(p.data.events).toEqual([]);
 });
});
