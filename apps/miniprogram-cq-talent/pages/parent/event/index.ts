import { getParentActivityDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { markGrowthStale } from "../../../utils/growth-invalidation";
import { activityStatus, activityTypeLabel, formatCalendarDate, formatTimeRange, formatDateTime, resolveMenuActionTop, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { getTrainingRecords, requestTrainingLeave, revokeTrainingLeave, type TrainingRecord } from "../../../utils/training-records";
import type { ActivityDetail, LoadState } from "../../../utils/types";

type RosterItem = {
  id: string;
  name: string;
  initial: string;
  tone: "brand" | "blue" | "amber";
  statusLabel: string;
  statusTone: "present" | "pending";
};

type MatchEventView = {
  id: string;
  icon: string;
  label: string;
  tone: "score" | "assist" | "defense" | "discipline" | "neutral";
  studentName: string;
  minuteLabel: string;
  hasMinute: boolean;
  note: string;
  hasNote: boolean;
};

type ActivityDetailView = Omit<ActivityDetail, "matchEvents"> & {
  navTitle: string;
  statusLabel: string;
  statusTone: "warning" | "success" | "muted";
  typeLabel: string;
  coachName: string;
  coachInitial: string;
  coachRole: string;
  dateText: string;
  timeText: string;
  trainingDateText: string;
  venueText: string;
  trainingSummary: string;
  abilityChips: string[];
  homeTeam: string;
  awayTeam: string;
  scoreText: string;
  roster: RosterItem[];
  otherDescription: string;
  otherNotice: string;
  childName: string;
  childInitial: string;
  childStatusLabel: string;
  matchEvents: MatchEventView[];
  hasMatchEvents: boolean;
  matchResultLabel: string;
  matchNote: string;
  hasMatchNote: boolean;
};

// 请假与课时视图（F-01 / REQ-ATT-001）：请假直接生效、可撤回、双方可见历史
type LeaveView = {
  visible: boolean;
  available: boolean;
  eventId: string;
  studentId: string;
  studentName: string;
  onLeave: boolean;
  cancelled: boolean;
  statusLabel: string;
  resultLabel: string;
  historyLabels: string[];
  revision: number;
  submitting: boolean;
  message: string;
};

const NAV_TITLES = { training: "训练详情", match: "比赛详情", other: "活动详情" } as const;

Page({
  requestGeneration: 0,
  requestedStudentId: "",
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    navActionTop: resolveMenuActionTop(),
    state: "loading" as LoadState,
    message: "正在读取活动详情",
    eventId: "",
    selectedStudentId: "",
    children: [] as Array<{ id: string; name: string }>,
    detail: null as ActivityDetailView | null,
    leave: null as LeaveView | null,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("parent");
    const eventId = query?.id || "";
    this.requestedStudentId = query?.studentId || "";
    this.setData({ eventId });
    this.load(eventId, this.requestedStudentId);
  },
  onUnload() { this.requestGeneration += 1; },
  async load(id: string, requestedChildId?: string) {
    const studentId = requestedChildId ?? (id === this.data.eventId ? this.data.selectedStudentId || this.requestedStudentId : "");
    const generation = ++this.requestGeneration;
    this.setData({ eventId: id, state: "loading", detail: null, leave: null, message: "正在读取活动详情" });
    if (!id) {
      this.setData({ state: "error", message: "这条活动信息暂时无法打开，请从日程重新进入。" });
      return;
    }
    const session = requireRole("parent");
    if (!session) return;
    try {
      const detail = await getParentActivityDetail(id);
      if (generation !== this.requestGeneration) return;
      const children = detail.participants.map(participant => ({ id: participant.studentId, name: participant.name }));
      if (studentId && !children.some(child => child.id === studentId)) {
        this.setData({ state: "error", message: "这个孩子不在本次活动中，请从日程重新选择。", children: [], selectedStudentId: "" });
        return;
      }
      const preferred = studentId || (children.some(child => child.id === session.currentStudentId) ? session.currentStudentId : "");
      const selectedStudentId = preferred || (children.length === 1 ? children[0]!.id : "");
      const leave = detail.type === "training" && selectedStudentId ? await this.loadLeave(detail, id, selectedStudentId) : null;
      if (generation !== this.requestGeneration) return;
      this.setData({ state: "ready", detail: presentDetail(detail, selectedStudentId), leave, children, selectedStudentId, message: "" });
    } catch (error) {
      if (generation === this.requestGeneration) this.setData({ state: "error", message: readableError(error) });
    }
  },
  selectChild(event: WechatMiniprogram.CustomEvent<{ studentId: string }>) {
    const studentId = event.detail.studentId;
    if (this.data.leave?.submitting || !this.data.children.some((child: { id: string }) => child.id === studentId) || studentId === this.data.selectedStudentId) return;
    return this.load(this.data.eventId, studentId);
  },
  async loadLeave(detail: ActivityDetail, eventId: string, studentId: string) {
    const child = detail.participants.find(participant => participant.studentId === studentId);
    if (!child) return null;
    try {
      const result = await getTrainingRecords(child.studentId);
      return presentLeave(detail, eventId, child.studentId, child.name, child.status, result.records.find(item => item.eventId === eventId));
    } catch {
      return { ...presentLeave(detail, eventId, child.studentId, child.name, child.status), available: false, resultLabel: "计次记录暂不可用", message: "计次记录读取失败，请重新加载后再操作。" };
    }
  },
  async submitLeave() {
    await this.writeLeave("request");
  },
  async revokeLeave() {
    await this.writeLeave("revoke");
  },
  async writeLeave(action: "request" | "revoke") {
    const leave = this.data.leave;
    if (!leave?.visible || !leave.available || leave.submitting || leave.cancelled) return;
    if (action === "request" && leave.onLeave) return;
    if (action === "revoke" && !leave.onLeave) return;
    const generation = this.requestGeneration;
    this.setData({ leave: { ...leave, submitting: true, message: "" } });
    try {
      const input = { expectedRevision: leave.revision };
      if (action === "request") await requestTrainingLeave(leave.studentId, leave.eventId, input);
      else await revokeTrainingLeave(leave.studentId, leave.eventId, input);
      // 请假/撤回改变了销课事实，返回成长页时定向重拉（F-06 同款失效标记）
      markGrowthStale();
      if (generation !== this.requestGeneration) return;
      wx.showToast({ title: action === "request" ? "请假已生效" : "请假已撤回", icon: "success" });
      await this.load(leave.eventId);
    } catch (error) {
      if (generation !== this.requestGeneration) return;
      const failure = error as { message?: string; code?: string; errorType?: string; userMessage?: string };
      const conflict = failure.errorType === "conflict" || failure.code === "training_record_conflict";
      if (conflict) {
        // 冲突时先刷新到最新事实，再在最新视图上提示核对，避免提示被刷新覆盖
        await this.load(leave.eventId);
        if (this.data.eventId === leave.eventId && this.data.selectedStudentId === leave.studentId && this.data.leave) {
          this.setData({ leave: { ...this.data.leave, submitting: false, message: "这条记录刚被更新，请核对最新状态后重试。" } });
        }
        return;
      }
      this.setData({
        leave: {
          ...leave,
          submitting: false,
          message: failure.userMessage || failure.message || "提交失败，请稍后重试。",
        },
      });
    }
  },
  goBack() {
    wx.navigateBack();
  },
  onShareAppMessage() {
    const detail = this.data.detail;
    return {
      title: detail ? `${detail.title} · 邀请你来看比赛` : "重庆天才足球俱乐部",
      path: detail ? `/pages/parent/event/index?id=${encodeURIComponent(this.data.eventId)}` : "/pages/parent/schedule/index",
    };
  },
  retry() {
    this.load(this.data.eventId);
  },
});

function presentDetail(detail: ActivityDetail, selectedStudentId: string): ActivityDetailView {
  const status = activityStatus(detail.status);
  const child = detail.participants.find(participant => participant.studentId === selectedStudentId);
  const facts = detail.presentation;
  const statusTone = status.label === "已确认" || status.label === "已结束" ? "success" : status.label === "待确认" ? "warning" : "muted";
  const coachName = facts.coachName || "教练暂未安排";
  const coachRole = facts.coachName ? "本次活动教练" : "请联系俱乐部确认安排";
  const otherDescription = detail.other?.description || "活动说明待同步";
  const otherNotice = detail.other?.notice || "注意事项待同步";
  const dateText = formatCalendarDate(facts.startsAt);
  const timeText = formatTimeRange(facts.startsAt, facts.endsAt);
  const rawScore = typeof detail.match?.homeScore === "number" && typeof detail.match?.awayScore === "number"
    ? `${detail.match.homeScore}:${detail.match.awayScore}` : "";
  const explicitComment = detail.match?.comment?.trim() || "";
  const showMatchComment = detail.type === "match" && detail.status === "completed";
  const matchEvents = toMatchEvents((detail.matchEvents ?? []).filter(event => event.studentId === selectedStudentId));
  const childStatusLabel = child ? participantStatusLabel(child.status) : "出勤状态待同步";
  const trainingPill = detail.type === "training"
    ? childStatusLabel === "已到场"
      ? { label: "已到场", tone: "success" as const }
      : childStatusLabel === "已请假"
        ? { label: "已请假", tone: "muted" as const }
        : childStatusLabel === "未到场"
          ? { label: "未到场", tone: "muted" as const }
          : { label: "待确认", tone: "warning" as const }
    : { label: status.label, tone: statusTone as "warning" | "success" | "muted" };
  return {
    ...detail,
    navTitle: NAV_TITLES[detail.type],
    statusLabel: trainingPill.label,
    statusTone: trainingPill.tone,
    typeLabel: activityTypeLabel(detail.type),
    coachName,
    coachInitial: coachName.slice(0, 1),
    coachRole,
    dateText: `${dateText} ${timeText}`,
    timeText,
    trainingDateText: `${dateText} · ${timeText}`,
    venueText: facts.venueName || "地点待确认",
    trainingSummary: facts.training?.summary || (facts.training?.state === "not_arranged" ? "本次训练尚未安排内容" : "训练内容暂不可用，请稍后重试"),
    abilityChips: facts.training?.abilityTags.length ? facts.training.abilityTags.slice(0, 4) : ["暂无已配置的关联能力"],
    homeTeam: facts.teamName || "主队待确认",
    awayTeam: detail.match?.opponentName || "对手待确认",
    scoreText: /^\d+\s*[:：]\s*\d+$/.test(rawScore) ? rawScore : status.label === "待开始" ? "0:0" : "比分待确认",
    roster: detail.participants.slice(0, 3).map((participant, index) => rosterItem(participant, index)),
    otherDescription,
    otherNotice,
    childName: resolveChildName(detail, child),
    childInitial: resolveChildName(detail, child).slice(0, 1),
    childStatusLabel,
    matchEvents,
    hasMatchEvents: matchEvents.length > 0,
    matchResultLabel: matchResultLabel(rawScore, status.label),
    matchNote: showMatchComment ? explicitComment || "教练尚未点评" : "",
    hasMatchNote: showMatchComment,
  };
}

function matchResultLabel(score: string, status: string) {
  const match = score.match(/(\d+)\s*[:：]\s*(\d+)/);
  if (!match) return status === "已结束" ? "比赛已结束" : status;
  const home = Number(match[1]);
  const away = Number(match[2]);
  return home > away ? "胜利" : home < away ? "失利" : "平局";
}

function toMatchEvents(events: ActivityDetail["matchEvents"]): MatchEventView[] {
  return (events ?? []).map((event) => ({
    id: event.id,
    icon: matchEventIcon(event.type),
    label: matchEventLabel(event.type),
    tone: matchEventTone(event.type),
    studentName: event.studentName || "学员待同步",
    minuteLabel: typeof event.minute === "number" ? `第 ${event.minute} 分钟` : "时间待同步",
    hasMinute: typeof event.minute === "number",
    note: event.note || "",
    hasNote: Boolean(event.note),
  }));
}

function resolveChildName(detail: ActivityDetail, child: ActivityDetail["participants"][number] | undefined) {
  const participantName = child?.name?.trim();
  if (participantName && participantName !== "学员" && participantName !== "孩子") return participantName;
  const eventName = detail.matchEvents?.find((event) => event.studentId === child?.studentId)?.studentName?.trim();
  return eventName || participantName || "请选择孩子";
}

function matchEventIcon(type: NonNullable<ActivityDetail["matchEvents"]>[number]["type"]) {
  const icons: Record<typeof type, string> = {
    goal: "⚽",
    assist: "↗",
    save: "✦",
    tackle: "✦",
    foul: "!",
    yellow_card: "▮",
    red_card: "▮",
    penalty: "⚽",
    own_goal: "↩",
  };
  return icons[type];
}

function matchEventLabel(type: NonNullable<ActivityDetail["matchEvents"]>[number]["type"]) {
  const labels: Record<typeof type, string> = {
    goal: "进球",
    assist: "助攻",
    save: "扑救",
    tackle: "抢断",
    foul: "犯规",
    yellow_card: "黄牌",
    red_card: "红牌",
    penalty: "点球",
    own_goal: "乌龙球",
  };
  return labels[type];
}

function matchEventTone(type: NonNullable<ActivityDetail["matchEvents"]>[number]["type"]): MatchEventView["tone"] {
  if (type === "goal" || type === "penalty" || type === "own_goal") return "score";
  if (type === "assist") return "assist";
  if (type === "save" || type === "tackle" || type === "foul") return "defense";
  if (type === "yellow_card" || type === "red_card") return "discipline";
  return "neutral";
}

function rosterItem(participant: ActivityDetail["participants"][number], index: number): RosterItem {
  const statusLabel = participantStatusLabel(participant.status);
  return {
    id: participant.studentId,
    name: participant.name,
    initial: participant.name.slice(0, 1),
    tone: index % 3 === 0 ? "blue" : index % 3 === 1 ? "amber" : "brand",
    statusLabel,
    statusTone: statusLabel === "已到场" ? "present" : "pending",
  };
}

function participantStatusLabel(status?: string) {
  const value = String(status ?? "").toLowerCase();
  if (["present", "confirmed", "completed", "accepted"].includes(value)) return "已到场";
  if (["leave_requested", "excused"].includes(value)) return "已请假";
  if (["absent", "cancelled"].includes(value)) return "未到场";
  if (value === "late") return "迟到";
  return value ? "状态待确认" : "状态待同步";
}

// 请假视图：statusLabel 表达参与事实，resultLabel 表达销课结果
function presentLeave(detail: ActivityDetail, eventId: string, studentId: string, studentName: string, participantStatus: string, record?: TrainingRecord): LeaveView {
  const cancelled = detail.status === "cancelled";
  const onLeave = ["leave_requested", "excused"].includes(String(participantStatus ?? "").toLowerCase());
  return {
    visible: true,
    available: true,
    eventId,
    studentId,
    studentName: studentName || "孩子",
    onLeave,
    cancelled,
    statusLabel: cancelled ? "课程已取消" : participantStatusLabel(participantStatus),
    resultLabel: cancelled
      ? "取消课不销课"
      : record
        ? record.counted ? "已销课" : onLeave ? "本课不销课（请假）" : record.source === "automatic" ? "课程结束后自动记录" : "本课不销课"
        : "课程结束后自动记录",
    historyLabels: (record?.history ?? []).map((item) =>
      `${formatDateTime(item.changedAt)} · ${item.counted ? "销课" : "不销课"} · ${item.reason}`),
    revision: record?.revision ?? 0,
    submitting: false,
    message: "",
  };
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动详情读取失败。";
}
