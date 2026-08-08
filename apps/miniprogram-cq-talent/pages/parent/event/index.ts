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

type ActivityDetailView = ActivityDetail & {
  navTitle: string;
  statusLabel: string;
  statusTone: "warning" | "success" | "muted";
  typeLabel: string;
  coachName: string;
  coachInitial: string;
  dateText: string;
  timeText: string;
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
  attendanceConfirmed: boolean;
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
  inviteFriend() {
    wx.showToast({ title: "邀请海报即将上线", icon: "none" });
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
  const otherDescription = sectionValue(detail, ["活动说明"], ["内容"]) || fieldValue(detail, ["活动描述", "描述"]) || "活动说明待同步";
  const otherNotice = sectionValue(detail, ["活动说明"], ["通知", "注意"]) || "线下到场后检查身份完成确认";
  return {
    ...detail,
    navTitle: NAV_TITLES[detail.type],
    statusLabel: status.label,
    statusTone,
    typeLabel: activityTypeLabel(detail.type),
    coachName,
    coachInitial: coachName.slice(0, 1),
    dateText: fieldValue(detail, ["时间", "日期"]) || "日期待确认",
    timeText: timePart(fieldValue(detail, ["时间", "日期"])) || "时间待确认",
    venueText: fieldValue(detail, ["地点", "场地", "场馆"]) || "地点待确认",
    trainingSummary: sectionValue(detail, ["本次训练"], ["训练内容"]) || "训练内容待同步",
    abilityChips: collectAbilityChips(detail),
    homeTeam: fieldValue(detail, ["队伍", "主队"]) || "天才队",
    awayTeam: sectionValue(detail, ["比赛信息"], ["对手"]) || "对手待确认",
    scoreText: sectionValue(detail, ["比赛信息"], ["比分"]) || "0 : 0",
    roster: detail.participants.slice(0, 3).map((participant, index) => rosterItem(participant, index)),
    otherDescription,
    otherNotice,
    childName: child?.name || "孩子待同步",
    childInitial: (child?.name || "学").slice(0, 1),
    childStatusLabel: participantStatusLabel(child?.status),
    attendanceConfirmed: ["已确认", "已结束"].includes(status.label),
  };
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
  return "未确认";
}

function collectAbilityChips(detail: ActivityDetail) {
  const value = sectionValue(detail, ["本次训练"], ["关联能力"]);
  const chips = value.split(/[、，,；;]/).map((item) => item.trim()).filter(Boolean);
  return chips.length ? chips.slice(0, 4) : ["能力数据待同步"];
}

function timePart(value: string) {
  const matched = value.match(/(\d{1,2}:\d{2}(?:\s*[-–]\s*\d{1,2}:\d{2})?)/);
  return matched?.[1] ?? value;
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动详情读取失败。";
}
