import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openPage: vi.fn(),
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  getParentConfirmedResults: vi.fn(),
  getParentGrowth: vi.fn(),
  getParentMetricDetail: vi.fn(),
  requireRole: vi.fn(),
  setCurrentStudentId: vi.fn(),
  consumeGrowthStale: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
  getParentConfirmedResults: mocks.getParentConfirmedResults,
  getParentGrowth: mocks.getParentGrowth,
  getParentMetricDetail: mocks.getParentMetricDetail,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/growth-invalidation", () => ({ consumeGrowthStale: mocks.consumeGrowthStale }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatDateTime: () => "2026-08-10 10:00",
  formatTenure: (startsAt, prefix = "在队") => (startsAt ? `${prefix}1年7个月` : ""),
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.setCurrentStudentId }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

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

describe("parent growth training history", () => {
  beforeEach(() => {
    mocks.openPage.mockReset();
    mocks.getParentCalendar.mockReset().mockResolvedValue([]);
    mocks.getParentChildren.mockReset();
    mocks.getParentConfirmedResults.mockReset().mockResolvedValue({confirmedResults:[]});
    mocks.getParentGrowth.mockReset();
    mocks.getParentMetricDetail.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.setCurrentStudentId.mockReset();
    mocks.consumeGrowthStale.mockReset().mockReturnValue(false);
  });

  it("binds the training-history view action to its handler", () => {
    expect(template).toContain('<view class="p4-card__title">训练历程 📊</view><view class="p4-card__link" bindtap="openTrainingHistory">查看›</view>');
  });

  it("uses the Figma P4 copy for the growth-footprint action", () => {
    expect(template).toContain('<view class="p4-card__title">成长足迹 🏆</view><view class="p4-card__link" bindtap="openMilestones">查看全部 ›</view>');
  });

  it("labels the peer-average preview outline as a statistical reference, not a standard (REQ-PAR-004)", () => {
    expect(template).not.toContain("radarPreview.peerPath");
    expect(template).not.toContain("同队测评统计均值");
    expect(template).not.toContain("同龄标准");
  });

  it("opens the exact team evaluation for the displayed child", () => {
    const page = createPageInstance({ activeStudentId: "student-1" }); page.openEvaluation({ currentTarget: { dataset: { team: "team-1" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/shared/student-evaluation/index?student=student-1&team=team-1");
  });
  it("opens the training-history page", () => {
    const page = createPageInstance({ activeStudentId: "student-1" });

    page.openTrainingHistory();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/training-history/index");
  });

  it("refreshes growth after returning from the child switch and renders the server-scoped timeline", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00.000Z"));
    mocks.requireRole.mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "第一位学员", teams: ["U8"], coachNames: [] },
      { id: "student-2", name: "第二位学员", teams: ["U9"], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
      timeline: [
        { id: "timeline-training", kind: "training", occurredAt: "2026-08-10T01:00:00.000Z", title: "训练复盘", subtitle: "完成 2 项训练内容" },
        { id: "timeline-match", kind: "match", occurredAt: "2026-08-09T01:00:00.000Z", title: "友谊赛", subtitle: "对阵渝北青训" },
        { id: "timeline-ability", kind: "ability_update", occurredAt: "2026-08-08T01:00:00.000Z", title: "训练内容评测已记录", subtitle: "传接球 91 分" },
      ],
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance({ activeStudentId: "student-1" });

    await page.onShow();

    expect(mocks.setCurrentStudentId).toHaveBeenCalledWith("student-2");
    expect(mocks.getParentGrowth).toHaveBeenCalledWith("student-2", expect.objectContaining({ name: "第二位学员" }));
    expect(mocks.getParentCalendar).not.toHaveBeenCalled();
    expect(page.data).toMatchObject({
      activeStudentId: "student-2",
      heroName: "第二位学员",
      heroSummaryMessage: "近30天记录 1 次训练、1 场比赛",
      milestoneMessage: "最新足迹：训练复盘",
      trainingHistoryMessage: "近30天记录 1 次训练，点击查看完整历程",
    });
    expect(page.data.milestones).toEqual([
      expect.objectContaining({ id: "timeline-training", title: "训练复盘", state: "完成 2 项训练内容" }),
      expect.objectContaining({ id: "timeline-match", title: "友谊赛", state: "对阵渝北青训" }),
      expect.objectContaining({ id: "timeline-ability", title: "训练内容评测已记录", state: "传接球 91 分" }),
    ]);
    expect(page.data.trainingBars).toEqual([]);
  });

  it("refreshes growth on return after a training-record correction marked the facts stale", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance();

    await page.load();
    expect(mocks.getParentGrowth).toHaveBeenCalledTimes(1);

    // 同一孩子、训练记录更正写入成功后打脏（F-06）
    mocks.consumeGrowthStale.mockReturnValue(true);
    await page.onShow();

    expect(mocks.consumeGrowthStale).toHaveBeenCalledTimes(1);
    expect(mocks.getParentGrowth).toHaveBeenCalledTimes(2);
    expect(mocks.getParentGrowth).toHaveBeenLastCalledWith("student-1", expect.objectContaining({ name: "真实球员" }));
  });

  it("refreshes externally changed facts when returning to the same child", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance();

    await page.load();
    await page.onShow();

    expect(mocks.consumeGrowthStale).toHaveBeenCalledTimes(1);
    expect(mocks.getParentGrowth).toHaveBeenCalledTimes(2);
  });

  it("opens the milestones page from the footprint card", () => {
    const page = createPageInstance({ activeStudentId: "" });

    page.openMilestones();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/milestones/index");
  });

  it("draws the P4 radar only from three real metrics and keeps activity copy explicit when none is returned", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      heroName: "真实球员",
      heroTeam: "球队待同步",
      heroSummaryMessage: "近30天暂无活动记录",
      milestoneMessage: "成长足迹正在积累",
      trainingHistoryMessage: "近30天暂无训练记录",
      canDrawRadar: true,
    });
    expect(page.data.radar).toHaveLength(3);
  });

  it("uses P4 empty states instead of sample milestones, month bars, or fallback team facts", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
      ],
      metricItems: [],
      views: [],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.state).toBe("ready");
    expect(page.data.canDrawRadar).toBe(false);
    expect(template).toContain('wx:if="{{growth && state === \'ready\'}}"');
    expect(template).toContain("p4-milestone");
    expect(template).toContain("p4-bars");
    expect(template).not.toContain("1月");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(readFileSync(new URL("./index.ts", import.meta.url), "utf8")).not.toContain("重庆天才");
  });

  it("renders the P08 overview stats and monthly bars from server trainingStats", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: ["U10 精英队"], coachNames: [], teamStartsAt: "2025-01-05" },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
      evaluations: [
        { teamId: "team-1", teamName: "U10 精英队", history: [{ phrases: [], note: "敢于持球", actorDisplayName: "陈教练", changedAt: "2026-09-12T00:00:00.000Z" }] },
        { teamId: "team-2", teamName: "U12 梯队", history: [{ phrases: [], note: "跑位积极", actorDisplayName: "陈教练", changedAt: "2026-09-12T00:00:00.000Z" }] },
      ],
      trainingStats: {
        totalTrainings: 46,
        attendanceRate: 89,
        lessonStats: { attendedLessons: 41, expectedLessons: 46, attendanceRate: 89 },
        monthTrainings: 12,
        monthly: [
          { month: 1, count: 4 }, { month: 2, count: 6 }, { month: 3, count: 5 }, { month: 4, count: 8 },
          { month: 5, count: 7 }, { month: 6, count: 9 }, { month: 7, count: 5 }, { month: 8, count: 2 },
        ],
      },
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance();

    await page.load();

    expect(page.data.heroStats).toEqual([
      { value: "46", label: "训练记录" },
    ]);
    expect(page.data.trainingBars.map((bar) => bar.label)).toEqual(["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月"]);
    expect(Math.max(...page.data.trainingBars.map((bar) => bar.height))).toBe(80);
    expect(template).toContain("p4-overview__stats");
    expect(template).toContain("p4-overview__stat-value");
    expect(template).not.toContain("p4-hero__tags");
  });

  it("keeps the P08 overview stats row free of borders, dark surfaces, and hardcoded colors", () => {
    expect(styles).not.toMatch(/\.p4-overview__stats\s*\{[^}]*border(?:-top)?:/);
    expect(styles).not.toMatch(/\.p4-overview__stat\s*\+\s*\.p4-overview__stat\s*\{[^}]*border-left:/);
    expect(styles).not.toMatch(/background:\s*#(0[0-9a-f]|1[0-9a-f]|07111f)/i);
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(template).toContain("p4-overview__summary");
    expect(template).toContain("能力组合概览");
    expect(template).toContain('wx:if="{{activeStudentId && (state === \'ready\' || state === \'empty\')}}" class="p4-evaluations"');
  });
  it("ignores stale metric responses after switching children, including cache and errors",async()=>{
    let resolveOld; mocks.getParentMetricDetail.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}));
    const page=createPageInstance({activeStudentId:"student-1",selectedMetricId:"speed",detailCache:{}});
    const old=page.loadMetricDetail("speed");
    mocks.requireRole.mockReturnValue({role:"parent",currentStudentId:"student-2"});
    mocks.getParentChildren.mockResolvedValue([{id:"student-2",name:"乙",teams:[]}]);
    mocks.getParentGrowth.mockResolvedValue({radar:[],views:[],timeline:[],trainingStats:{totalTrainings:0,monthly:[]}});
    await page.load();resolveOld({metricId:"speed",records:[{value:99}],sourceEvents:[]});await old;
    expect(page.data.activeStudentId).toBe("student-2");expect(page.data.detailCache).toEqual({});expect(page.data.selectedDetail).toBeNull();expect(page.data.trainingBars).toEqual([]);
  });

});

describe("CQ-20 confirmed facts and refresh states",()=>{
 const child={id:"student-1",name:"甲",teams:["U10"],coachNames:[]};
 const growth=()=>({radar:[{metricId:"m",label:"模型指标",value:0,maxValue:100,occurredAt:"2026-10-01T00:00:00Z"}],views:[],timeline:[],evaluations:[],trainingStats:{totalTrainings:0,monthly:[]}});
 const result=(id="raw")=>({id,name:"短跑",value:{kind:"duration_seconds",seconds:0},unit:"秒",templateVersionId:"v1",eventId:"course",taskId:"task",occurredAt:"2026-10-01T00:00:00Z",mapping:null});
 const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
 beforeEach(()=>{
  vi.useRealTimers();vi.clearAllMocks();mocks.requireRole.mockReturnValue({role:"parent",currentStudentId:child.id,userId:"u",clubId:"club",clientId:"client"});
  mocks.getParentChildren.mockResolvedValue([child]);mocks.getParentGrowth.mockResolvedValue(growth());mocks.getParentConfirmedResults.mockResolvedValue({confirmedResults:[result()]});
 });
 it("shows confirmed raw zero, unit, date, version, provenance and missing mapping before auxiliary charts",async()=>{
  const p=createPageInstance();await p.load();
  expect(p.data.confirmedRows[0]).toMatchObject({value:"0 秒",version:"项目版本 v1",mapping:"暂无完整分值/等级映射",eventId:"course",source:"已确认测评 · 关联活动",date:"2026-08-10 10:00"});
  expect(template.indexOf("{{item.name}} · 原始成绩 {{item.value}}")).toBeLessThan(template.indexOf("<radar-canvas"));
  expect(template.indexOf("当前教练评价")).toBeLessThan(template.indexOf("<radar-canvas"));
  p.openResultSource({currentTarget:{dataset:{id:"raw"}}});expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/event/index?id=course&studentId=student-1");
 });
 it("keeps confirmed results usable when growth and chart data fail",async()=>{
  mocks.getParentGrowth.mockRejectedValueOnce(new Error("汇总离线"));const p=createPageInstance();await p.load();
  expect(p.data).toMatchObject({state:"ready",activeStudentId:child.id,growth:null,growthState:"error",resultsState:"ready",confirmedRows:[expect.objectContaining({id:"raw"})]});
  expect(p.data.refreshMessage).toContain("汇总离线");p.openConfirmedResults();expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/confirmed-results/index?student=student-1");
 });
 it("retains same-child facts during pending refresh and after both module failures",async()=>{
  const p=createPageInstance();await p.load();const a=deferred(),b=deferred();mocks.getParentGrowth.mockReturnValueOnce(a.promise);mocks.getParentConfirmedResults.mockReturnValueOnce(b.promise);
  const refreshing=p.onShow();await vi.waitFor(()=>expect(p.data.resultsState).toBe("loading"));
  expect(p.data).toMatchObject({state:"ready",heroName:"甲",growthState:"loading",confirmedRows:[expect.objectContaining({id:"raw"})],radarRows:[expect.objectContaining({value:"0 / 100"})]});
  a.reject(new Error("汇总离线"));b.reject(new Error("成绩离线"));await refreshing;
  expect(p.data).toMatchObject({state:"ready",resultsLoaded:true,resultsState:"error",confirmedRows:[expect.objectContaining({id:"raw"})],heroStats:[{value:"0",label:"训练记录"}]});
  expect(p.data.resultsMessage).toContain("上次读取");await p.retryResults();expect(p.data.resultsState).toBe("ready");
 });
 it("keeps cached content when the same-child profile refresh fails",async()=>{
  const p=createPageInstance();await p.load();mocks.getParentChildren.mockRejectedValueOnce(new Error("档案离线"));await p.load();
  expect(p.data.state).toBe("ready");expect(p.data.confirmedRows[0].id).toBe("raw");expect(p.data.refreshMessage).toContain("上次读取");
 });
 it("clears all old child facts immediately and rejects delayed success and failure",async()=>{
  const p=createPageInstance();await p.load();const old=deferred(),oldGrowth=deferred();mocks.getParentConfirmedResults.mockReturnValueOnce(old.promise);mocks.getParentGrowth.mockReturnValueOnce(oldGrowth.promise);const refresh=p.load();await vi.waitFor(()=>expect(p.data.resultsState).toBe("loading"));
  mocks.requireRole.mockReturnValue({role:"parent",currentStudentId:"b",userId:"u",clubId:"club",clientId:"client"});mocks.getParentChildren.mockResolvedValueOnce([{...child,id:"b",name:"乙"}]);mocks.getParentConfirmedResults.mockResolvedValueOnce({confirmedResults:[result("b-result")]});const next=p.load();
  expect(p.data).toMatchObject({state:"loading",growth:null,confirmedRows:[],radarRows:[],evaluationCards:[],activeStudentId:""});await next;
  old.resolve({confirmedResults:[result("old")]});oldGrowth.reject(new Error("旧错误"));await refresh;
  expect(p.data.activeStudentId).toBe("b");expect(p.data.confirmedRows[0].id).toBe("b-result");expect(p.data.refreshMessage).toBe("");
 });
 it("rejects same-child results from an old account and after unload",async()=>{
  const p=createPageInstance();await p.load();const pending=deferred();mocks.getParentConfirmedResults.mockReturnValueOnce(pending.promise);const refresh=p.retryResults();
  mocks.requireRole.mockReturnValue({role:"parent",currentStudentId:child.id,userId:"other"});await p.load();pending.resolve({confirmedResults:[result("old-account")]});await refresh;expect(p.data.confirmedRows[0].id).toBe("raw");
  const late=deferred();mocks.getParentConfirmedResults.mockReturnValueOnce(late.promise);const read=p.retryResults();p.onUnload();late.resolve({confirmedResults:[result("unloaded")]});await read;expect(p.data.confirmedRows[0].id).toBe("raw");
 });
 it("keeps metric text independent of the canvas fallback and does not fabricate standards",async()=>{
  const p=createPageInstance();await p.load();expect(p.data.radarRows[0]).toMatchObject({value:"0 / 100",date:"2026-08-10 10:00"});
  expect(template.indexOf("p4-metric-list")).toBeGreaterThan(template.indexOf("</radar-canvas>") >= 0 ? template.indexOf("</radar-canvas>") : template.indexOf("<radar-canvas"));
  expect(template).toContain("未提供标准时不判断达标");expect(readFileSync(new URL("../../../components/radar-canvas/index.wxml",import.meta.url),"utf8")).toContain("图形加载失败，请查看下方数值明细");
 });
});

describe("CQ-20 latest request owns each module",()=>{
 const child={id:"s",name:"孩子",teams:[]};
 const summary=count=>({radar:[],views:[],timeline:[],evaluations:[],trainingStats:{totalTrainings:count,monthly:[]}});
 const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
 beforeEach(()=>{vi.useRealTimers();vi.clearAllMocks();mocks.requireRole.mockReturnValue({role:"parent",currentStudentId:"s"});mocks.getParentChildren.mockResolvedValue([child]);mocks.getParentGrowth.mockResolvedValue(summary(0));mocks.getParentConfirmedResults.mockResolvedValue({confirmedResults:[]});});
 it.each(["summary","results"].flatMap(module=>["success","failure"].map(outcome=>({module,outcome}))))("ignores older $module $outcome without invalidating the other module",async({module,outcome})=>{
  const p=createPageInstance();await p.load();const generation=p.growthRequestId,old=deferred();
  const result=id=>({confirmedResults:[{id,name:id,value:{kind:"count",count:0},unit:"次",occurredAt:"2026-10-01",templateVersionId:"v1",mapping:null}]});
  const mock=module==="summary"?mocks.getParentGrowth:mocks.getParentConfirmedResults;
  mock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(module==="summary"?summary(2):result("new"));
  const older=module==="summary"?p.loadGrowth(generation,child):p.loadConfirmed(generation,"s");
  await(module==="summary"?p.loadGrowth(generation,child):p.loadConfirmed(generation,"s"));
  if(outcome==="success")old.resolve(module==="summary"?summary(99):result("old"));else old.reject(new Error("older failure"));await older;
  expect(p.growthRequestId).toBe(generation);
  if(module==="summary"){expect(p.data.heroStats[0].value).toBe("2");expect(p.data.growthState).toBe("ready");expect(p.data.resultsState).toBe("ready");}
  else{expect(p.data.confirmedRows[0].id).toBe("new");expect(p.data.resultsState).toBe("ready");expect(p.data.heroStats[0].value).toBe("0");}
  expect(p.data.refreshMessage).toBe("");expect(p.data.resultsMessage).toBe("");
 });
 it("ignores an older metric detail read in the same generation including its cache",async()=>{
  const p=createPageInstance({activeStudentId:"s",selectedMetricId:"m"});const old=deferred();
  mocks.getParentMetricDetail.mockReturnValueOnce(old.promise).mockResolvedValueOnce({metricId:"m",latest:{value:2},records:[],sourceEvents:[]});
  const first=p.loadMetricDetail("m");await p.loadMetricDetail("m");old.resolve({metricId:"m",latest:{value:99},records:[],sourceEvents:[]});await first;
  expect(p.data.selectedDetail.latest.value).toBe(2);expect(p.data.detailCache.m.latest.value).toBe(2);
 });
});
