import {beforeEach, describe, expect, it, vi} from "vitest";
const mocks = vi.hoisted(()=>({options:vi.fn(), open:vi.fn(), role:vi.fn()}));
vi.mock("../../../utils/api",()=>({getCoachAssessmentTaskOptions:mocks.options}));
vi.mock("../../../utils/navigation",()=>({openPage:mocks.open}));
vi.mock("../../../utils/auth",()=>({requireRole:mocks.role}));
let definition; globalThis.Page=d=>definition=d;
await import("./index.ts");
function page(){ const p={...definition,data:structuredClone(definition.data)};p.setData=d=>Object.assign(p.data,d);return p; }
const task=(id)=>({id,sourceEventId:"course/a",templateId:"template/a",title:id,status:"in_progress"});
describe("legacy assessment URL resolves tasks before any editing",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.role.mockReturnValue({role:"coach"});});
  it("explains zero tasks without writing or choosing another course",async()=>{
    mocks.options.mockResolvedValue({tasks:[{...task("other"),sourceEventId:"another"}]});const p=page();
    await p.onLoad({eventId:"course/a",teamId:"team-a"});
    expect(mocks.options).toHaveBeenCalledWith("course/a","team-a");expect(p.data.state).toBe("empty");expect(mocks.open).not.toHaveBeenCalled();
    p.openCourse();expect(mocks.open).toHaveBeenCalledWith("/pages/coach/event/index?id=course%2Fa");
  });
  it("opens the only valid task with real task and template identity",async()=>{
    mocks.options.mockResolvedValue({tasks:[task("real/task")]});await page().onLoad({eventId:"course/a"});
    expect(mocks.open).toHaveBeenCalledWith(expect.stringContaining("taskId=real%2Ftask&templateId=template%2Fa"));
  });
  it("requires explicit selection with multiple tasks and rejects arbitrary ids",async()=>{
    mocks.options.mockResolvedValue({tasks:[task("one"),task("two")]});const p=page();await p.onLoad({eventId:"course/a"});
    expect(p.data.tasks).toHaveLength(2);expect(mocks.open).not.toHaveBeenCalled();p.openTask({currentTarget:{dataset:{id:"unknown"}}});expect(mocks.open).not.toHaveBeenCalled();
    p.openTask({currentTarget:{dataset:{id:"two"}}});expect(mocks.open).toHaveBeenCalledWith(expect.stringContaining("taskId=two"));
  });
  it("keeps retry local and ignores responses after unload",async()=>{
    mocks.options.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({tasks:[]});const p=page();await p.onLoad({eventId:"course/a"});expect(p.data.state).toBe("error");await p.retry();expect(p.data.state).toBe("empty");
    let resolve;mocks.options.mockImplementation(()=>new Promise(r=>resolve=r));const pending=p.load();p.onUnload();resolve({tasks:[task("late")]});await pending;expect(mocks.open).not.toHaveBeenCalled();
  });
  it("does not read tasks without coach authorization or a course",async()=>{
    mocks.role.mockReturnValue(null);await page().onLoad({eventId:"course/a"});expect(mocks.options).not.toHaveBeenCalled();
    mocks.role.mockReturnValue({});const p=page();await p.onLoad({});expect(p.data.state).toBe("error");expect(mocks.options).not.toHaveBeenCalled();
  });
  it("explains the existing future legacy task gate instead of silently dropping the task",async()=>{
    mocks.options.mockResolvedValue({tasks:[{...task("future"),status:"not_started",startsOn:"2099-01-01"}]});const p=page();await p.onLoad({eventId:"course/a"});
    expect(p.data.state).toBe("ready");expect(p.data.tasks).toHaveLength(1);expect(p.data.tasks[0]).toMatchObject({canOpen:false,actionLabel:"任务尚未开始"});expect(p.data.tasks[0].reason).toContain("2099-01-01");expect(mocks.open).not.toHaveBeenCalled();p.openTask({currentTarget:{dataset:{id:"future"}}});expect(mocks.open).not.toHaveBeenCalled();
  });
  it("preserves future managed read access and completed legacy viewing",async()=>{
    mocks.options.mockResolvedValue({tasks:[{...task("managed"),status:"not_started",workflow:{canEdit:false,readyStudents:0}}]});const p=page();await p.onLoad({eventId:"course/a"});expect(p.data.tasks[0].intent).toBe("view");expect(mocks.open).toHaveBeenLastCalledWith(expect.stringContaining("taskId=managed"));
    mocks.options.mockResolvedValue({tasks:[{...task("legacy-done"),status:"completed",completedStudents:19,totalStudents:19}]});await p.retry();expect(p.data.tasks[0].actionLabel).toBe("查看已完成测评");expect(mocks.open).toHaveBeenLastCalledWith(expect.stringContaining("taskId=legacy-done"));
  });
  it("keeps incomplete legacy editing and routes a real ready workflow to the original review panel",async()=>{
    mocks.options.mockResolvedValue({tasks:[{...task("legacy"),completedStudents:0,totalStudents:40}]});const p=page();await p.onLoad({eventId:"course/a"});expect(p.data.tasks[0].intent).toBe("collect");expect(mocks.open).toHaveBeenLastCalledWith(expect.stringContaining("taskId=legacy"));
    mocks.options.mockResolvedValue({tasks:[{...task("ready"),workflow:{canEdit:true,totalStudents:40,completedStudents:1,publishedStudents:0,readyStudents:1}}]});await p.retry();expect(p.data.tasks[0].intent).toBe("review");expect(mocks.open).toHaveBeenLastCalledWith(expect.stringContaining("&review=1"));
  });

});
