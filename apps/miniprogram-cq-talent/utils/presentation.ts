import type { ScheduleEvent } from "./types";

export interface StatusPresentation {
  label: string;
  tone: "neutral" | "brand" | "success" | "warning" | "error" | "info" | "pending";
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function activityTypeLabel(type: ScheduleEvent["type"]) {
  return type === "training" ? "训练" : type === "match" ? "比赛" : "俱乐部活动";
}

export function activityStatus(status: string): StatusPresentation {
  const value = status.trim().toLowerCase();
  if (["已结束", "已完成"].includes(value)) return { label: "已结束", tone: "success" };
  if (["进行中"].includes(value)) return { label: "进行中", tone: "info" };
  if (["已取消"].includes(value)) return { label: "已取消", tone: "error" };
  if (["有变更", "已变更"].includes(value)) return { label: "有变更", tone: "warning" };
  if (["已确认"].includes(value)) return { label: "已确认", tone: "brand" };
  if (["待确认"].includes(value)) return { label: "待确认", tone: "pending" };
  if (["待开始"].includes(value)) return { label: "待开始", tone: "brand" };
  if (["completed", "finished", "done"].includes(value)) return { label: "已结束", tone: "success" };
  if (["ongoing", "in_progress", "started"].includes(value)) return { label: "进行中", tone: "info" };
  if (["cancelled", "canceled", "closed"].includes(value)) return { label: "已取消", tone: "error" };
  if (["changed", "rescheduled", "updated"].includes(value)) return { label: "有变更", tone: "warning" };
  if (["confirmed", "accepted"].includes(value)) return { label: "已确认", tone: "brand" };
  if (["pending", "draft", "unconfirmed"].includes(value)) return { label: "待确认", tone: "pending" };
  if (["scheduled", "published", "active", "upcoming"].includes(value)) return { label: "待开始", tone: "brand" };
  return { label: "安排中", tone: "neutral" };
}

export function formatCalendarDate(value?: string) {
  const parts = dateParts(value);
  if (!parts) return "时间待确认";
  return `${parts.month}月${parts.day}日 ${weekday(parts.year, parts.month, parts.day)}`;
}

export function formatShortDate(value?: string) {
  const parts = dateParts(value);
  if (!parts) return "日期待确认";
  return `${parts.month}月${parts.day}日`;
}

export function formatDateTime(value?: string) {
  const parts = dateParts(value);
  if (!parts) return "时间待确认";
  const time = timePart(value);
  return `${parts.month}月${parts.day}日 ${time || "时间待确认"}`;
}

export function formatTimeRange(startsAt?: string, endsAt?: string) {
  const start = timePart(startsAt);
  const end = timePart(endsAt);
  if (!start) return "时间待确认";
  return end ? `${start}–${end}` : start;
}

export function childNames(event: ScheduleEvent) {
  const names = event.children?.map((child) => child.name).filter(Boolean) ?? [];
  if (names.length) return names.join("、");
  return event.studentName || "家庭活动";
}

function dateParts(value?: string) {
  const matched = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matched) return null;
  return { year: Number(matched[1]), month: Number(matched[2]), day: Number(matched[3]) };
}

function timePart(value?: string) {
  return String(value ?? "").match(/T(\d{2}):(\d{2})/)?.slice(1).join(":") ?? "";
}

function weekday(year: number, month: number, day: number) {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? "";
}

/** navigationStyle:custom 页面的顶部安全区（状态栏高度，px） */
export function resolveNavInset() {
  try {
    const info = (wx as unknown as { getWindowInfo?: () => { statusBarHeight?: number } }).getWindowInfo?.();
    return info?.statusBarHeight ?? 20;
  } catch (_error) {
    return 20;
  }
}
