import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentActivityDetail: vi.fn(),
  getParentTrainingGames:vi.fn(),
  getTrainingRecords: vi.fn(),
  requestTrainingLeave: vi.fn(),
  revokeTrainingLeave: vi.fn(),
  markGrowthStale: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentActivityDetail: mocks.getParentActivityDetail, getParentTrainingGames:mocks.getParentTrainingGames }));
vi.mock("../../../utils/training-records", () => ({
  getTrainingRecords: mocks.getTrainingRecords,
  requestTrainingLeave: mocks.requestTrainingLeave,
  revokeTrainingLeave: mocks.revokeTrainingLeave,
}));
vi.mock("../../../utils/growth-invalidation", () => ({ markGrowthStale: mocks.markGrowthStale }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  activityStatus: (status) => ({ label: status === "scheduled" ? "待开始" : status, tone: "brand" }),
  activityTypeLabel: (type) => type === "training" ? "训练" : type === "match" ? "比赛" : "活动",
  formatDateTime: (value) => String(value),
  formatCalendarDate: (value) => value ? "10月22日 周四" : "日期待确认",
  formatTimeRange: () => "09:00–10:30",
  resolveMenuActionTop: () => 24,
  resolveMenuInset: () => 16,
  resolveNavInset: () => 20,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

globalThis.wx = {
  navigateBack: vi.fn(),
  showToast: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
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

function detail(overrides = {}) {
  return {
    id: "event-1",
    type: "training",
    title: "真实训练",
    status: "scheduled",
    participants: [{ studentId: "student-1", name: "小天", status: "invited" }],
    presentation: { startsAt: "2026-10-22T09:00:00+08:00", endsAt: "2026-10-22T10:30:00+08:00", training: { state: "unavailable", summary: "", abilityTags: [] } },
    match: null,
    other: null,
    fields: [],
    sections: [],
    pending: [],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.getParentActivityDetail.mockReset();
  mocks.getParentTrainingGames.mockReset().mockResolvedValue({enabled:true,games:[]});
  mocks.getTrainingRecords.mockReset().mockResolvedValue({ total: 0, records: [] });
  mocks.requestTrainingLeave.mockReset();
  mocks.revokeTrainingLeave.mockReset();
  mocks.markGrowthStale.mockReset();
  mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  globalThis.wx.showToast.mockReset();
});

describe("parent activity detail", () => {
  it.each(["scheduled", "in_progress", "cancelled"])("hides post-match comments for %s matches", async (status) => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match", status,
      match: { comment: "积极拼抢" },
      sections: [{ title: "比赛过程", items: [{ label: "孩子表现", value: "已点评" }] }],
    }));
    const page = createPageInstance();
    await page.load("match-event");
    expect(page.data.detail).toMatchObject({ hasMatchNote: false, matchNote: "" });
  });

  it("does not use attendance as a completed match comment", async () => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match", status: "completed",
      sections: [{ title: "比赛过程", items: [{ label: "孩子表现", value: "已到场" }] }],
    }));
    const page = createPageInstance();
    await page.load("match-event");
    expect(page.data.detail.matchNote).toBe("教练尚未点评");
  });

  it("preserves an explicit completed match comment", async () => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match", status: "completed",
      match: { comment: "  积极拼抢，传球及时。  " },
    }));
    const page = createPageInstance();
    await page.load("match-event");
    expect(page.data.detail).toMatchObject({ hasMatchNote: true, matchNote: "积极拼抢，传球及时。" });
  });

  it("keeps a rejected detail request in the route error state", async () => {
    mocks.getParentActivityDetail.mockRejectedValue({ code: "not_found", message: "活动不存在" });
    const page = createPageInstance();

    await page.load("missing-event");

    expect(page.data.state).toBe("error");
    expect(page.data.detail).toBeNull();
    expect(page.data.message).toBe("活动不存在");
  });

  it("derives missing match and other values as unavailable instead of Figma sample facts", async () => {
    mocks.getParentActivityDetail
      .mockResolvedValueOnce(detail({ type: "match", title: "真实比赛" }))
      .mockResolvedValueOnce(detail({ type: "match", title: "真实完赛", status: "completed" }))
      .mockResolvedValueOnce(detail({ type: "other", title: "真实活动" }));
    const matchPage = createPageInstance();

    await matchPage.load("match-event");

    // 设计稿语义：未开始的比赛显示 0:0
    expect(matchPage.data.detail).toMatchObject({
      type: "match",
      homeTeam: "主队待确认",
      awayTeam: "对手待确认",
      scoreText: "0:0",
    });

    const finishedPage = createPageInstance();
    await finishedPage.load("finished-match-event");

    // 已结束但比分未录入：保持如实占位，不伪造比分
    expect(finishedPage.data.detail).toMatchObject({
      type: "match",
      scoreText: "比分待确认",
    });

    const otherPage = createPageInstance();
    await otherPage.load("other-event");

    expect(otherPage.data.detail).toMatchObject({
      type: "other",
      otherDescription: "活动说明待同步",
      otherNotice: "注意事项待同步",
    });
  });

  it("projects only API-backed match events into the parent match detail", async () => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match",
      title: "真实比赛",
      matchEvents: [
        { id: "match-event-1", type: "goal", studentId: "student-1", studentName: "小明", minute: 18, note: "右脚推射" },
        { id: "match-event-2", type: "own_goal", studentId: "student-1", studentName: "小明", minute: 42 },
      ],
    }));
    const page = createPageInstance();

    await page.load("match-event");

    expect(page.data.detail).toMatchObject({
      matchEvents: [
        { id: "match-event-1", label: "进球", studentName: "小明", minuteLabel: "第 18 分钟" },
        { id: "match-event-2", label: "乌龙球", studentName: "小明", minuteLabel: "第 42 分钟" },
      ],
      hasMatchEvents: true,
    });
  });

  it("uses the matching event player name and the V7 icon-plus-minute event rows", async () => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match",
      participants: [{ studentId: "student-1", name: "学员", status: "present" }],
      matchEvents: [{ id: "match-event-1", type: "goal", studentId: "student-1", studentName: "小明", minute: 18 }],
    }));
    const page = createPageInstance();

    await page.load("match-event");

    expect(page.data.detail.childName).toBe("小明");
    expect(page.data.detail.matchEvents[0]).toMatchObject({ icon: "⚽", minuteLabel: "第 18 分钟" });
    expect(template).toContain("match-events-title");
    expect(template).toContain("{{item.icon}}");
    expect(template).toContain("{{item.label}}");
    expect(template).toContain("{{item.minuteLabel}}");
    expect(styles).toContain(".match-event-row__icon");
    expect(styles).not.toMatch(/\.match-event-row__name\s*\{\s*display:\s*none\s*;\s*\}/);
  });

  it("keeps the three P2 hierarchies page-owned and method-free in WXML", () => {
    expect(template).toContain("detail.type === 'training'");
    expect(template).toContain("detail.type === 'match'");
    expect(template).toContain('wx:elif="{{detail}}"');
    expect(template).toContain("{{detail.otherNotice}}");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("线下到场后检查身份完成确认");
    expect(controller).not.toContain('"天才队"');
    expect(controller).not.toContain('"0 : 0"');
    expect(styles).toContain(".training-hero");
    expect(styles).toContain(".match-hero");
    expect(styles).toContain(".other-hero");
    expect(template).toContain("detail.hasMatchEvents");
    expect(template).toContain("detail.matchEvents");
  });


  it("uses the V7 full-screen match detail hierarchy", () => {
    expect(template).toContain("match-summary");
    expect(template).toContain("match-summary__venue");
    expect(template).toContain("{{detail.matchResultLabel}}");
    expect(template).toContain("{{detail.childName}}的比赛数据");
    expect(template).toContain("match-note");
    expect(template).toContain('wx:if="{{!detail || detail.type !== \'match\'}}"');
    expect(styles).toContain(".match-summary");
    expect(styles).toContain(".match-note");
  });
});

describe("parent training leave flow (F-01)", () => {
  const trainingDetail = (overrides = {}) => detail({
    type: "training",
    participants: [{ studentId: "student-1", name: "小天", status: "invited" }],
    ...overrides,
  });
  const leaveRecord = {
    eventId: "event-1", studentId: "student-1", revision: 1, counted: false,
    source: "correction", occurredAt: "2026-10-01T08:00:00Z", updatedAt: "2026-10-01T02:00:00Z",
    history: [{ revision: 1, counted: false, previousCounted: null, source: "correction", reason: "家长请假", actorUserId: "user-parent-1", changedAt: "2026-10-01T02:00:00Z" }],
  };

  it("shows leave state, history and a pending result before any leave", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(trainingDetail());
    mocks.getTrainingRecords.mockResolvedValue({ total: 0, records: [] });
    const page = createPageInstance();

    await page.load("event-1");

    expect(mocks.getTrainingRecords).toHaveBeenCalledWith("student-1");
    expect(page.data.leave).toMatchObject({ visible: true, onLeave: false, cancelled: false, statusLabel: "状态待确认", resultLabel: "课程结束后自动记录", revision: 0 });
    expect(template).toContain("leave-card");
    expect(template).toContain("提交请假");
    expect(template).not.toContain("线下确认");
  });

  it("submits leave with the loaded revision, marks growth stale, and reflects the effective leave immediately", async () => {
    mocks.getParentActivityDetail
      .mockResolvedValueOnce(trainingDetail())
      .mockResolvedValueOnce(trainingDetail({ participants: [{ studentId: "student-1", name: "小天", status: "leave_requested" }] }));
    mocks.getTrainingRecords
      .mockResolvedValueOnce({ total: 0, records: [] })
      .mockResolvedValueOnce({ total: 0, records: [leaveRecord] });
    mocks.requestTrainingLeave.mockResolvedValueOnce({ record: leaveRecord, participant: { studentId: "student-1", status: "leave_requested" } });
    const page = createPageInstance();

    await page.load("event-1");
    await page.submitLeave();

    expect(mocks.requestTrainingLeave).toHaveBeenCalledWith("student-1", "event-1", { expectedRevision: 0 });
    expect(mocks.markGrowthStale).toHaveBeenCalledTimes(1);
    expect(globalThis.wx.showToast).toHaveBeenCalledWith({ title: "请假已生效", icon: "success" });
    expect(page.data.leave).toMatchObject({ onLeave: true, statusLabel: "已请假", resultLabel: "本课不销课（请假）", revision: 1 });
    expect(page.data.leave.historyLabels[0]).toContain("家长请假");
    // 已请假时重复点击提交不再发起请求
    await page.submitLeave();
    expect(mocks.requestTrainingLeave).toHaveBeenCalledTimes(1);
  });

  it("revokes an active leave back to a counted lesson and refreshes the growth cache", async () => {
    mocks.getParentActivityDetail
      .mockResolvedValueOnce(trainingDetail({ participants: [{ studentId: "student-1", name: "小天", status: "leave_requested" }] }))
      .mockResolvedValueOnce(trainingDetail({ participants: [{ studentId: "student-1", name: "小天", status: "confirmed" }] }));
    mocks.getTrainingRecords
      .mockResolvedValueOnce({ total: 0, records: [leaveRecord] })
      .mockResolvedValueOnce({ total: 1, records: [{ ...leaveRecord, revision: 2, counted: true }] });
    mocks.revokeTrainingLeave.mockResolvedValueOnce({ record: { ...leaveRecord, revision: 2, counted: true }, participant: { studentId: "student-1", status: "confirmed" } });
    const page = createPageInstance();

    await page.load("event-1");
    await page.revokeLeave();

    expect(mocks.revokeTrainingLeave).toHaveBeenCalledWith("student-1", "event-1", { expectedRevision: 1 });
    expect(mocks.markGrowthStale).toHaveBeenCalledTimes(1);
    expect(page.data.leave).toMatchObject({ onLeave: false, statusLabel: "已到场", resultLabel: "已销课", revision: 2 });
  });

  it("shows a retained pre-class withdrawal as pending, not an active leave", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(trainingDetail({ participants: [{ studentId: "student-1", name: "小天", status: "confirmed" }] }));
    mocks.getTrainingRecords.mockResolvedValue({ total: 0, records: [{ ...leaveRecord, revision: 2, source: "automatic" }] });
    const page = createPageInstance();
    await page.load("event-1");
    expect(page.data.leave).toMatchObject({ onLeave: false, resultLabel: "课程结束后自动记录", revision: 2 });
    expect(page.data.leave.historyLabels).toHaveLength(1);
  });

  it("keeps the form usable after a conflict and surfaces the structured network error copy", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(trainingDetail());
    mocks.getTrainingRecords.mockResolvedValue({ total: 0, records: [] });
    const page = createPageInstance();
    await page.load("event-1");

    mocks.requestTrainingLeave.mockRejectedValueOnce({ code: "training_record_conflict", errorType: "conflict" });
    await page.submitLeave();
    expect(page.data.leave.submitting).toBe(false);
    expect(page.data.leave.message).toContain("请核对最新状态");
    expect(mocks.getParentActivityDetail).toHaveBeenCalledTimes(2);

    mocks.requestTrainingLeave.mockRejectedValueOnce({ code: "network_error", errorType: "network", userMessage: "网络连接不可用，请检查网络后重试" });
    await page.submitLeave();
    expect(page.data.leave.message).toBe("网络连接不可用，请检查网络后重试");
    expect(mocks.getParentActivityDetail).toHaveBeenCalledTimes(2);
  });
  it("uses the currently selected child when the training involves multiple children", async () => {
    mocks.requireRole.mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentActivityDetail.mockResolvedValue(trainingDetail({
      participants: [
        { studentId: "student-1", name: "大宝", status: "invited" },
        { studentId: "student-2", name: "小宝", status: "leave_requested" },
      ],
    }));
    mocks.getTrainingRecords.mockResolvedValue({ total: 0, records: [] });
    const page = createPageInstance();

    await page.load("event-1");

    expect(mocks.getTrainingRecords).toHaveBeenCalledWith("student-2");
    expect(page.data.leave).toMatchObject({ studentId: "student-2", studentName: "小宝", onLeave: true, statusLabel: "已请假" });
  });

  it("does not offer leave actions for a cancelled training", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(trainingDetail({ status: "cancelled" }));
    mocks.getTrainingRecords.mockResolvedValue({ total: 0, records: [] });
    const page = createPageInstance();

    await page.load("event-1");
    await page.submitLeave();

    expect(page.data.leave).toMatchObject({ cancelled: true, statusLabel: "课程已取消", resultLabel: "取消课不销课" });
    expect(mocks.requestTrainingLeave).not.toHaveBeenCalled();
    expect(template).toContain("课程已取消，本课不销课，无需请假");
  });
});


describe("typed activity facts and explicit child context", () => {
  const siblings = [
    { studentId: "student-1", name: "大宝", status: "confirmed" },
    { studentId: "student-2", name: "小宝", status: "leave_requested" },
  ];
  it("uses typed facts regardless of translated display labels", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(detail({
      presentation: { startsAt: "2026-10-22T09:00:00+08:00", teamName: "U10", venueName: "足球公园", coachName: "王教练", training: { state: "planned", summary: "射门、带球", abilityTags: ["技术"] } },
      fields: [{ label: "地点", value: "错误的展示标签值" }],
      sections: [{ title: "本次训练", items: [{ label: "训练内容", value: "过期文案" }] }],
    }));
    const page = createPageInstance();
    await page.load("event-1");
    expect(page.data.detail).toMatchObject({ venueText: "足球公园", coachName: "王教练", trainingSummary: "射门、带球", abilityChips: ["技术"] });
    expect(page.data.detail.trainingDateText).toContain("10月22日");
  });
  it("requires a child choice for siblings without a valid saved preference", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(detail({ participants: siblings }));
    const page = createPageInstance();
    await page.load("event-1");
    expect(page.data.selectedStudentId).toBe("");
    expect(page.data.leave).toBeNull();
    expect(mocks.getTrainingRecords).not.toHaveBeenCalled();
    await page.selectChild({ detail: { studentId: "student-2" } });
    expect(page.data.detail.childName).toBe("小宝");
    expect(page.data.leave.studentId).toBe("student-2");
  });
  it("rejects an explicit unrelated child instead of silently picking the first", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(detail({ participants: siblings }));
    const page = createPageInstance();
    await page.load("event-1", "foreign-child");
    expect(page.data.state).toBe("error");
    expect(page.data.detail).toBeNull();
    expect(mocks.getTrainingRecords).not.toHaveBeenCalled();
  });
  it("keeps the selected child's own match events separate", async () => {
    mocks.requireRole.mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentActivityDetail.mockResolvedValue(detail({ type: "match", participants: siblings, matchEvents: [
      { id: "first", type: "goal", studentId: "student-1" },
      { id: "second", type: "save", studentId: "student-2" },
    ] }));
    const page = createPageInstance();
    await page.load("event-1");
    expect(page.data.detail.childName).toBe("小宝");
    expect(page.data.detail.matchEvents.map(item => item.id)).toEqual(["second"]);
  });
  it("retains event facts but blocks writes when training records fail to load", async () => {
    mocks.getParentActivityDetail.mockResolvedValue(detail());
    mocks.getTrainingRecords.mockRejectedValue(new Error("offline"));
    const page = createPageInstance();
    await page.load("event-1");
    await page.submitLeave();
    expect(page.data.state).toBe("ready");
    expect(page.data.leave.available).toBe(false);
    expect(page.data.leave.resultLabel).toBe("计次记录暂不可用");
    expect(mocks.requestTrainingLeave).not.toHaveBeenCalled();
  });
  it("ignores an earlier detail response after another child is selected", async () => {
    let resolveEarlier;
    mocks.getParentActivityDetail.mockImplementationOnce(() => new Promise(resolve => { resolveEarlier = resolve; }))
      .mockResolvedValueOnce(detail({ participants: siblings }));
    const page = createPageInstance();
    const earlier = page.load("event-1", "student-1");
    await page.load("event-1", "student-2");
    resolveEarlier(detail({ participants: siblings }));
    await earlier;
    expect(page.data.detail.childName).toBe("小宝");
    expect(page.data.leave.studentId).toBe("student-2");
  });
  it("does not update a page after unloading during a record read", async () => {
    let resolveRecords;
    mocks.getParentActivityDetail.mockResolvedValue(detail());
    mocks.getTrainingRecords.mockImplementation(() => new Promise(resolve => { resolveRecords = resolve; }));
    const page = createPageInstance();
    const pending = page.load("event-1");
    await Promise.resolve();
    page.onUnload();
    resolveRecords({ records: [] });
    await pending;
    expect(page.data.detail).toBeNull();
  });
});

it("ignores a late first-child game response after selecting the second child",async()=>{
 mocks.getParentActivityDetail.mockResolvedValue(detail({participants:[{studentId:"student-1",name:"甲",status:"confirmed"},{studentId:"student-2",name:"乙",status:"confirmed"}]}));
 let resolveFirst; mocks.getParentTrainingGames.mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve;})).mockResolvedValueOnce({enabled:true,games:[{id:"second-game",sideAName:"红队",sideBName:"蓝队",scoreA:0,scoreB:0,events:[{type:"save",minute:0}]}]});
 const p=createPageInstance();await p.load("event-1","student-1");await p.selectChild({detail:{studentId:"student-2"}});await Promise.resolve();
 resolveFirst({enabled:true,games:[{id:"first-game",sideAName:"甲队",sideBName:"乙队",scoreA:9,scoreB:0,events:[]}]});await Promise.resolve();await Promise.resolve();
 expect(mocks.getParentTrainingGames).toHaveBeenCalledWith("event-1","student-2");expect(p.data.friendlyGames.map(item=>item.id)).toEqual(["second-game"]);expect(p.data.friendlyGames[0].score).toBe("0 : 0");expect(p.data.friendlyGames[0].events).toContain("扑救");
});
