import { getParentReminders } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
import { countUnreadReminders, getReminderReadIds, markAllRemindersRead } from "../../../utils/reminders";
import type { LoadState, ReminderItem } from "../../../utils/types";

interface ReminderView {
  id: string;
  title: string;
  timeAgo: string;
  timeLabel: string;
  iconSrc: string;
  iconBg: string;
  dotColor: string;
  read: boolean;
}

interface PageData {
  state: LoadState;
  message: string;
  today: ReminderView[];
  earlier: ReminderView[];
  unreadCount: number;
  navInset: number;
}

const TYPE_META: Record<ReminderItem["type"], Omit<ReminderView, "id" | "title" | "timeAgo" | "timeLabel" | "read">> = {
  event_upcoming: { iconSrc: "/assets/icons/tab-calendar.svg", iconBg: "#f3f4f6", dotColor: "#a80f1b" },
  insurance_expiring: { iconSrc: "/assets/icons/reminder-note.svg", iconBg: "#eff6ff", dotColor: "#1976d2" },
  lesson_credit_low: { iconSrc: "/assets/icons/reminder-badge.svg", iconBg: "#fef3c7", dotColor: "#f59e0b" },
};

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    today: [],
    earlier: [],
    unreadCount: 0,
    navInset: resolveNavInset(),
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取提醒" });
    try {
      this.render(await getParentReminders());
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "提醒读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
  goBack() {
    wx.navigateBack();
  },
  markAllRead() {
    const views = [...this.data.today, ...this.data.earlier];
    if (!views.length) return;
    markAllRemindersRead(views);
    this.setData({
      today: this.data.today.map((view: ReminderView) => ({ ...view, read: true })),
      earlier: this.data.earlier.map((view: ReminderView) => ({ ...view, read: true })),
      unreadCount: 0,
    });
  },
  render(reminders: ReminderItem[]) {
    const readIds = new Set(getReminderReadIds());
    const today: ReminderView[] = [];
    const earlier: ReminderView[] = [];
    reminders.forEach((item) => {
      const view = presentReminder(item, readIds.has(item.id));
      (isToday(item.dueAt) ? today : earlier).push(view);
    });
    this.setData({
      state: reminders.length ? "ready" : "empty",
      message: reminders.length ? "" : "暂无新提醒",
      today,
      earlier,
      unreadCount: countUnreadReminders(reminders),
    });
  },
});

function presentReminder(item: ReminderItem, read: boolean): ReminderView {
  const meta = TYPE_META[item.type];
  return {
    id: item.id,
    title: reminderTitle(item),
    timeAgo: timeAgoLabel(item.dueAt),
    timeLabel: timeLabel(item.dueAt),
    iconSrc: meta.iconSrc,
    iconBg: meta.iconBg,
    dotColor: meta.dotColor,
    read,
  };
}

function reminderTitle(item: ReminderItem) {
  if (item.type === "event_upcoming") return item.event?.title || "活动即将开始";
  if (item.type === "insurance_expiring") return `${item.studentName} 保险${item.insurance?.status === "expired" ? "已到期" : "即将到期"}`;
  return `${item.studentName} 课时不足，剩余 ${item.lessonCredit?.balance ?? 0} 节`;
}

function isToday(iso: string) {
  return dayOffset(iso) === 0;
}

function dayOffset(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return -1;
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((dStart - dayStart) / 86400000);
}

function timeAgoLabel(iso: string) {
  const offset = dayOffset(iso);
  if (offset === 0) return "今日";
  if (offset === 1) return "明天";
  if (offset > 1) return `${offset}天后`;
  if (offset === -1) return "昨天";
  return `${-offset}天前`;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
