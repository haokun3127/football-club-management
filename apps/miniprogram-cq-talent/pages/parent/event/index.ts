import { getParentActivityDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { activityStatus, activityTypeLabel, resolveNavInset } from "../../../utils/presentation";
import type { ActivityDetail, LoadState } from "../../../utils/types";

type ActivityDetailView = ActivityDetail & {
  typeLabel: string;
  navTitle: string;
  statusLabel: string;
  statusTone: string;
  coachName: string;
  dateTimeText: string;
  venueText: string;
  homeTeam: string;
  awayTeam: string;
  scoreText: string;
  attendanceConfirmed: boolean;
};

const NAV_TITLES = { training: "训练详情", match: "比赛详情", other: "活动详情" } as const;

Page({
  data: {
    navInset: resolveNavInset(),
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

function presentDetail(detail: ActivityDetail): ActivityDetailView {
  const status = activityStatus(detail.status);
  const dateTime = [fieldValue(detail, ["时间", "日期"]), fieldValue(detail, ["时段"])].filter(Boolean).join(" · ");
  const score = fieldValue(detail, ["比分"]);
  return {
    ...detail,
    typeLabel: activityTypeLabel(detail.type),
    navTitle: NAV_TITLES[detail.type] ?? "活动详情",
    statusLabel: status.label,
    statusTone: status.tone,
    coachName: fieldValue(detail, ["教练"]),
    dateTimeText: dateTime || "时间待确认",
    venueText: fieldValue(detail, ["地点", "场地", "场馆"]) || "地点待确认",
    homeTeam: fieldValue(detail, ["队伍", "主队"]) || "天才队",
    awayTeam: fieldValue(detail, ["对手", "客队"]) || "对手待确认",
    scoreText: score || "– : –",
    attendanceConfirmed: ["已确认", "已结束"].includes(status.label),
  };
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动详情读取失败。";
}
