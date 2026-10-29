import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTeam: vi.fn(),
  getTeamTrainingGames: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachTeam: mocks.getCoachTeam, getTeamTrainingGames:mocks.getTeamTrainingGames }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 88, resolveNavInset: () => 0 }));

globalThis.wx = { navigateBack: mocks.navigateBack };

vi.mock("../../../utils/coach-team-context",()=>({loadActiveTeam:async id=>{const detail=await mocks.getCoachTeam(id);return {id:detail?.team?.id || "",options:detail?.teamOptions || [],detail:detail?.team ? detail : null};}}));
let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

const teamDetail = {
  team: { id: "team-1", name: "Actual team", season: "2026-2027" },
  stats: { memberCount: 1, trainingCount: 6, completedTrainingCount: 3, attendanceRate: 95 },
  members: [{ id: "student-1", name: "Actual student" }],
  coaches: [{ id: "coach-1", name: "Actual coach", role: "教练" }],
};

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach team detail", () => {
  beforeEach(() => {
    mocks.getTeamTrainingGames.mockReset().mockResolvedValue({enabled:true,games:[]});
    mocks.getCoachTeam.mockReset().mockResolvedValue(teamDetail);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    mocks.navigateBack.mockReset();
  });

  it("links the same formal event and preserves unrecorded versus zero scores", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({ ...teamDetail, formalMatches: [
      { eventId: "formal-1", title: "正式赛", startsAt: "2026-09-20T00:00:00Z", venue: "测试场", match: { opponentName: "测试队" } },
      { eventId: "formal-2", title: "第二场", startsAt: "2026-09-21T00:00:00Z", venue: "测试场", match: { homeScore: 0, awayScore: 0 } },
    ] });
    const page = createPageInstance(); await page.load("team-1"); expect(mocks.getCoachTeam).toHaveBeenCalledWith("team-1");
    expect(Object.fromEntries(page.data.matches.map(item => [item.eventId,item.score]))).toEqual({"formal-1":"未记录比分","formal-2":"0 : 0"});
    page.openMatch({ currentTarget: { dataset: { id: "formal-1" } } }); expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/match/index?id=formal-1");
  });

  it("does not invent a team when the coach scope has no team", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: null,
      stats: { memberCount: 0, trainingCount: 0, completedTrainingCount: 0, attendanceRate: null },
      members: [],
    });
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      state: "empty",
      teamName: "",
      season: "",
      hasTeam: false,
      hasMembers: false,
      heroStats: [
        { label: "在队人数", value: "--", valueClass: "" },
        { label: "累计训练", value: "--", valueClass: "" },
        { label: "点名到场占比", value: "--", valueClass: "" },
      ],
    });
  });

  it("keeps a real team hero when its member list is empty", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: { id: "team-1", name: "Actual team", season: "2026-2027" },
      stats: { memberCount: 0, trainingCount: 5, completedTrainingCount: 3, attendanceRate: null },
      members: [],
    });
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      hasTeam: true,
      hasMembers: false,
      teamName: "Actual team",
      season: "2026-2027",
      memberEmptyMessage: "本队暂无在队学员",
      heroStats: [
        { label: "在队人数", value: "0", valueClass: "" },
        { label: "累计训练", value: "3", valueClass: "" },
        { label: "点名到场占比", value: "--", valueClass: "" },
      ],
    });
  });

  it("uses the BFF's cumulative completed-training metric and only navigates with a real student id", async () => {
    const page = createPageInstance();
    await page.load();
    page.openRadar({ currentTarget: { dataset: { id: "student-1" } } });
    page.openRadar({ currentTarget: { dataset: {} } });
    page.goBack();

    expect(page.data.heroStats).toEqual([
      { label: "在队人数", value: "1", valueClass: "" },
      { label: "累计训练", value: "3", valueClass: "" },
      { label: "点名到场占比", value: "95%", valueClass: "hero-stat__value--positive" },
    ]);
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/student-radar/index?student=student-1&team=team-1");
    expect(mocks.openPage).toHaveBeenCalledTimes(1);
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
  });

  it("maps only BFF-provided coaches into the C9 coach-card view model", async () => {
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      hasCoaches: true,
      coaches: [{
        id: "coach-1",
        name: "Actual coach",
        initial: "A",
        roleLabel: "教练",
      }],
    });
  });

  it("keeps the real team content visible while an older BFF response has no coach field", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: { id: "team-1", name: "Actual team", season: "2026-2027" },
      stats: { memberCount: 1, trainingCount: 6, completedTrainingCount: 3, attendanceRate: 95 },
      members: [{ id: "student-1", name: "Actual student" }],
    });
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      hasTeam: true,
      hasCoaches: false,
      coaches: [],
      coachEmptyMessage: "暂未配置队伍教练",
    });
  });

  it("does not request as a non-coach and clears stale values behind a safe error", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.onLoad();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();

    const page = createPageInstance();
    await page.load();
    mocks.getCoachTeam.mockRejectedValueOnce(new Error("raw upstream error"));
    await page.load();
    expect(page.data).toMatchObject({
      state: "error",
      teamName: "",
      hasTeam: false,
      hasMembers: false,
      members: [],
    });
    expect(page.data.message).not.toContain("raw upstream error");
  });

  it("keeps supported coach content and uses shared detail navigation", () => {
    expect(pageConfig).toContain('"app-header"');
    expect(template).toContain('class="coaches-section"');
    expect(template).toContain('wx:for="{{coaches}}"');
    expect(template).not.toMatch(/凤凰山|U10精英队|林教练|主教练|王助教|李体能/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
  it("preserves zero and team counts while identifying the attendance ratio as marked records", async () => {
    const detail=await mocks.getCoachTeam();mocks.getCoachTeam.mockResolvedValue({...detail,stats:{...detail.stats,attendanceRate:0}});const p=createPageInstance();await p.load();expect(p.data.heroStats.find(stat=>stat.label==="点名到场占比").value).toBe("0%");expect(p.data.heroStatsHint).toContain("与训练计次分别统计");expect(p.data.heroStats).toHaveLength(3);
  });
});

it("searches visible members without losing roster identity or allowing foreign navigation", async () => {
  const page = createPageInstance(); await page.load();
  page.searchMembers({ detail: { value: "actual" } }); expect(page.data.visibleMembers.map(member => member.id)).toEqual(["student-1"]);
  page.searchMembers({ detail: { value: "missing" } }); expect(page.data.visibleMembers).toEqual([]); expect(page.data.members).toHaveLength(1);
  page.openRadar({ currentTarget: { dataset: { id: "foreign" } } }); expect(mocks.openPage).not.toHaveBeenCalled();
});
it("refreshes the active team after returning from the selector", async()=>{
 const page=createPageInstance();await page.onLoad({teamId:"team-1",section:"roster"});
 mocks.getCoachTeam.mockClear();await page.onShow();
 expect(mocks.getCoachTeam).toHaveBeenCalledWith(undefined);
 expect(page.data.section).toBe("roster");
});

it("keeps two games in one training course distinct and links their stable IDs",async()=>{
 mocks.requireRole.mockReturnValue({role:"coach"});mocks.getCoachTeam.mockResolvedValue(teamDetail);mocks.openPage.mockClear();
 const rows=["g1","g2"].map(id=>({game:{id,eventId:"shared-course",sideAName:"红队",sideBName:"蓝队",scoreA:null,scoreB:null,state:"draft"},event:{id:"shared-course",title:"课堂",startsAt:"2026-10-22T08:00:00Z",status:"scheduled"}}));
 mocks.getTeamTrainingGames.mockResolvedValue({enabled:true,games:rows});
 const p=createPageInstance();await p.onLoad({teamId:"team-1",section:"matches"});await Promise.resolve();await Promise.resolve();
 expect(p.data.visibleMatches.map(item=>item.key)).toEqual(["training_friendly:g1","training_friendly:g2"]);
 p.openMatch({currentTarget:{dataset:{id:"training_friendly:g2"}}});expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/training-game/index?eventId=shared-course&gameId=g2");
 p.selectMatchFilter({currentTarget:{dataset:{kind:"formal"}}});expect(p.data.visibleMatches).toEqual([]);


});
