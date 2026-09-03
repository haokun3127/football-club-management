import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { formatShortDate, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { GrowthTimelineItem, LoadState } from "../../../utils/types";

interface HistoryRow {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  placeLabel: string;
  lessonProgressLabel: string;
  statusLabel: string;
  done: boolean;
}

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取训练历程",
    rows: [] as HistoryRow[],
  },
  onLoad() {
    void this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取训练历程" });
    try {
      const children = await getParentChildren();
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", rows: [] });
        return;
      }
      const growth = await getParentGrowth(active.id, active);
      const trainings = (growth.timeline ?? [])
        .filter((item) => item.kind === "training")
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
      const rows = trainings.map(presentRow);
      this.setData({ state: rows.length ? "ready" : "empty", message: rows.length ? "" : "暂无训练历程", rows });
    } catch {
      this.setData({ state: "error", message: "训练历程读取失败，请点击重试" });
    }
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    void this.load();
  },
});

function presentRow(event: GrowthTimelineItem): HistoryRow {
  const progress = event.training?.lessonProgress;
  return {
    id: event.eventId || event.id,
    title: event.title,
    dateLabel: formatShortDate(event.occurredAt),
    timeLabel: timeLabel(event.occurredAt),
    placeLabel: [event.teamName, event.venue].filter(Boolean).join(" · "),
    lessonProgressLabel: progress ? `${progress.attendedLessons}/${progress.expectedLessons}课时` : "课时待同步",
    statusLabel: "已完成",
    done: true,
  };
}

function timeLabel(occurredAt: string) {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "时间待同步";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
