import { getParentActivityDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { activityStatus, activityTypeLabel, resolveMenuActionTop, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
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
  confirmationText: string;
  offlineConfirmText: string;
  attendanceConfirmed: boolean;
  matchEvents: MatchEventView[];
  hasMatchEvents: boolean;
  matchResultLabel: string;
  matchNote: string;
  hasMatchNote: boolean;
};

const NAV_TITLES = { training: "训练详情", match: "比赛详情", other: "活动详情" } as const;

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    navActionTop: resolveMenuActionTop(),
    state: "loading" as LoadState,
    message: "正在读取活动详情",
    eventId: "",
    detail: null as ActivityDetailView | null,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("parent");
    const eventId = query?.id || "";
    this.setData({ eventId });
    this.load(eventId);
  },
  async load(id: string) {
    if (!id) {
      this.setData({ state: "error", message: "这条活动信息暂时无法打开，请从日程重新进入。" });
      return;
    }
    try {
      const detail = await getParentActivityDetail(id);
      this.setData({ state: "ready", detail: presentDetail(detail), message: "" });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  goBack() {
    wx.navigateBack();
  },
  onShareAppMessage() {
    const detail = this.data.detail;
    return {
      title: detail ? `${detail.title} · 邀请你来看比赛` : "重庆天才足球俱乐部",
      path: detail ? `/pages/parent/event/index?id=${this.data.eventId}` : "/pages/parent/schedule/index",
    };
  },
  retry() {
    this.load(this.data.eventId);
  },
});

function fieldValue(detail: ActivityDetail, keywords: string[]) {
  const hit = detail.fields.find((field) => keywords.some((keyword) => field.label.includes(keyword)));
  return hit?.value ?? "";
}

function sectionValue(detail: ActivityDetail, sectionKeywords: string[], itemKeywords: string[]) {
  const section = detail.sections.find((item) => sectionKeywords.some((keyword) => item.title.includes(keyword)));
  const hit = section?.items.find((item) => itemKeywords.some((keyword) => item.label.includes(keyword)));
  return hit?.value ?? "";
}

function presentDetail(detail: ActivityDetail): ActivityDetailView {
  const status = activityStatus(detail.status);
  const child = detail.participants[0];
  const statusTone = status.label === "已确认" || status.label === "已结束" ? "success" : status.label === "待确认" ? "warning" : "muted";
  const coachName = fieldValue(detail, ["教练"]) || "教练待同步";
  const coachRole = fieldValue(detail, ["教练角色", "职务"]) || "教练信息待同步";
  const otherDescription = sectionValue(detail, ["活动说明"], ["内容"]) || fieldValue(detail, ["活动描述", "描述"]) || "活动说明待同步";
  const otherNotice = sectionValue(detail, ["活动说明"], ["通知", "注意"]) || "注意事项待同步";
  const rawDateTime = fieldValue(detail, ["时间", "日期"]);
  const dateTime = parseDateTimeParts(rawDateTime);
  const rawScore = sectionValue(detail, ["比赛信息"], ["比分"]).trim();
  const childStatusLabel = child ? participantStatusLabel(child.status) : "出勤状态待同步";
  const trainingPill = detail.type === "training"
    ? childStatusLabel === "已到场"
      ? { label: "已到场", tone: "success" as const }
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
    dateText: dateTime.date ? `${dateTime.date} ${dateTime.start}`.trim() : rawDateTime || "日期待确认",
    timeText: dateTime.range || dateTime.start || "时间待确认",
    trainingDateText: dateTime.date ? `${dateTime.range || dateTime.start} · ${dateTime.date}` : rawDateTime || "日期待确认",
    venueText: fieldValue(detail, ["地点", "场地", "场馆"]) || "地点待确认",
    trainingSummary: sectionValue(detail, ["本次训练"], ["训练内容"]) || "训练内容待同步",
    abilityChips: collectAbilityChips(detail),
    homeTeam: displayValue(fieldValue(detail, ["主队", "队伍"]), "主队待确认"),
    awayTeam: sectionValue(detail, ["比赛信息"], ["对手"]) || "对手待确认",
    scoreText: /^\d+\s*[:：]\s*\d+$/.test(rawScore) ? rawScore : status.label === "待开始" ? "0:0" : "比分待确认",
    roster: detail.participants.slice(0, 3).map((participant, index) => rosterItem(participant, index)),
    otherDescription,
    otherNotice,
    childName: resolveChildName(detail, child),
    childInitial: resolveChildName(detail, child).slice(0, 1),
    childStatusLabel,
    confirmationText: childStatusLabel,
    offlineConfirmText: `本次训练须经教练或家长在现场确认，无需在 APP 进行操作。请${child?.name || "学员"}准时到场。`,
    attendanceConfirmed: childStatusLabel === "已到场",
    matchEvents: toMatchEvents(detail.matchEvents),
    hasMatchEvents: toMatchEvents(detail.matchEvents).length > 0,
    matchResultLabel: matchResultLabel(rawScore, status.label),
    matchNote: fieldValue(detail, ["教练点评", "点评", "评语"]) || sectionValue(detail, ["比赛过程"], ["教练点评", "评语", "表现"]),
    hasMatchNote: Boolean(fieldValue(detail, ["教练点评", "点评", "评语"]) || sectionValue(detail, ["比赛过程"], ["教练点评", "评语", "表现"])),
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
  return eventName || participantName || "孩子待同步";
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

function displayValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed && trimmed !== "待确认" && trimmed !== "待同步" ? trimmed : fallback;
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
  if (["absent", "cancelled"].includes(value)) return "未到场";
  return value ? "状态待确认" : "状态待同步";
}

function collectAbilityChips(detail: ActivityDetail) {
  const value = sectionValue(detail, ["本次训练"], ["关联能力"]);
  const chips = value.split(/[、，,；;]/).map((item) => item.trim()).filter(Boolean);
  return chips.length ? chips.slice(0, 4) : ["能力数据待同步"];
}

function parseDateTimeParts(value: string) {
  // 形如 "7月4日 08:30 · 08:30~10:00"，拆出日期/开始时间/时间段
  const [left = "", right = ""] = value.split(" · ");
  const date = left.match(/\d{1,2}月\d{1,2}日/)?.[0] ?? value.match(/\d{1,2}月\d{1,2}日/)?.[0] ?? "";
  const start = left.match(/\d{1,2}:\d{2}/)?.[0] ?? right.match(/\d{1,2}:\d{2}/)?.[0] ?? "";
  const rangeMatch = right.match(/(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/) ?? left.match(/(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/);
  const range = rangeMatch ? `${rangeMatch[1]}-${rangeMatch[2]}` : "";
  return { date, start, range };
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动详情读取失败。";
}
