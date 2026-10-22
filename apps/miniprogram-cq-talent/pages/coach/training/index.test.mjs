import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({getCoachHome:vi.fn(),getCoachAssessmentTasks:vi.fn(),requireRole:vi.fn(),loadActiveTeam:vi.fn(),openPage:vi.fn()}));
vi.mock("../../../utils/api",()=>({getCoachHome:m.getCoachHome,getCoachAssessmentTasks:m.getCoachAssessmentTasks}));vi.mock("../../../utils/auth",()=>({requireRole:m.requireRole}));vi.mock("../../../utils/coach-team-context",()=>({loadActiveTeam:m.loadActiveTeam}));vi.mock("../../../utils/navigation",()=>({openPage:m.openPage}));vi.mock("../../../utils/presentation",()=>({resolveNavInset:()=>0,resolveMenuInset:()=>0,formatCalendarDate:v=>v.slice(0,10),formatTimeOnly:()=>"09:00"}));
let def;globalThis.Page=d=>def=d;await import("./index.ts");
const page=()=>({...def,data:structuredClone(def.data),setData(p){Object.assign(this.data,p);}});
const team={id:"b",name:"同名队",season:"本学期"};
beforeEach(()=>{vi.clearAllMocks();m.requireRole.mockReturnValue({role:"coach"});m.loadActiveTeam.mockResolvedValue({id:"b",options:[team],detail:{team}});m.getCoachHome.mockResolvedValue({events:[]});m.getCoachAssessmentTasks.mockResolvedValue([]);});
describe("team workspace",()=>{
 it("opens all five sections with the same stable ID",async()=>{const p=page();await p.onLoad({teamId:"b"});expect(m.loadActiveTeam).toHaveBeenCalledWith("b");expect(m.getCoachHome).toHaveBeenCalledWith(expect.objectContaining({teamIds:["b"]}));for(const id of ["roster","training","tasks","ability","matches"]){p.openEntry({currentTarget:{dataset:{id}}});expect(m.openPage).toHaveBeenLastCalledWith(expect.stringContaining("teamId=b"));}expect(p.data.entries.map(e=>e.name)).toEqual(["队员名单","训练安排","测评任务","能力分析","比赛记录"]);});
 it("filters courses by ID when team names collide",async()=>{m.getCoachHome.mockResolvedValue({events:[{id:"a1",type:"training",teamIds:["a"],teamName:team.name},{id:"b1",type:"training",teamIds:["b"],teamName:team.name,startsAt:"2026-10-21T01:00:00Z"}]});const p=page();await p.onLoad({teamId:"b",section:"training"});expect(p.data.trainingCards.map(e=>e.id)).toEqual(["b1"]);p.openTrainingEvent({currentTarget:{dataset:{id:"a1"}}});expect(m.openPage).not.toHaveBeenCalled();p.openTrainingEvent({currentTarget:{dataset:{id:"b1"}}});expect(m.openPage).toHaveBeenCalledWith(expect.stringContaining("id=b1&teamId=b"));});
 it("requires a choice instead of inventing a default and exposes authorization failures",async()=>{m.loadActiveTeam.mockResolvedValue({id:"",options:[team,{...team,id:"a"}],detail:null});const p=page();await p.load();expect(p.data.state).toBe("empty");p.openEntry({currentTarget:{dataset:{id:"roster"}}});expect(m.openPage).toHaveBeenLastCalledWith("/pages/coach/team-selector/index");m.loadActiveTeam.mockRejectedValue(new Error("无权访问"));await p.load();expect(p.data).toMatchObject({state:"error",teamId:"",message:"无权访问"});});
 it("ignores stale team responses and requests nothing for an ineligible role",async()=>{let resolve;m.loadActiveTeam.mockImplementationOnce(()=>new Promise(r=>resolve=r));const p=page(),first=p.load();await p.load();resolve({id:"a",options:[],detail:{team:{id:"a",name:"旧队"}}});await first;expect(p.data.teamId).toBe("b");m.requireRole.mockReturnValue(null);m.loadActiveTeam.mockClear();await p.load();expect(m.loadActiveTeam).not.toHaveBeenCalled();});
});

it("shows scoped unfinished tasks, orders courses, and preserves partial failures", async()=>{
 m.getCoachHome.mockRejectedValueOnce(new Error("offline"));
 m.getCoachAssessmentTasks.mockResolvedValueOnce([{id:"foreign",teamId:"a",status:"in_progress",dueOn:"2026-10-25"},{id:"done",teamId:"b",status:"completed",dueOn:"2026-10-25"},{id:"todo",teamId:"b",status:"in_progress",dueOn:"2026-10-25",templateId:"tpl",title:"测试"}]);
 const p=page();await p.load();expect(p.data.state).toBe("ready");expect(p.data.courseError).toContain("失败");expect(p.data.pendingTasks.map(x=>x.id)).toEqual(["todo"]);
 p.openTask({currentTarget:{dataset:{id:"foreign"}}});expect(m.openPage).not.toHaveBeenCalled();p.openTask({currentTarget:{dataset:{id:"todo"}}});expect(m.openPage).toHaveBeenCalledWith(expect.stringContaining("taskId=todo"));
});
it("uses club dates for the month boundary and excludes ended courses from upcoming", async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-22T00:00:00Z"));
 try {
  const first={id:"first",teamIds:["b"],type:"training",startsAt:"2026-09-30T23:00:00Z",endsAt:"2026-10-01T01:00:00Z",status:"scheduled"};
  m.getCoachHome.mockResolvedValueOnce({events:[first,{...first,id:"outside",startsAt:"2026-09-30T14:00:00Z"}]});
  const p=page();await p.onLoad({teamId:"b",section:"training"});
  expect(m.getCoachHome.mock.calls.every(([range]) => (Date.parse(range.to)-Date.parse(range.from))/86400000 < 31)).toBe(true);expect(p.data.trainingCards.map(x=>x.id)).toEqual(["first"]);
  m.getCoachHome.mockResolvedValueOnce({events:[{...first,id:"ended",startsAt:"2026-10-21T23:00:00Z",endsAt:"2026-10-21T23:30:00Z"},{...first,id:"next",startsAt:"2026-10-22T01:00:00Z",endsAt:"2026-10-22T02:00:00Z"}]});
  const q=page();await q.load();expect(q.data.upcomingCards.map(x=>x.id)).toEqual(["next"]);
 }finally{vi.useRealTimers();}
});
