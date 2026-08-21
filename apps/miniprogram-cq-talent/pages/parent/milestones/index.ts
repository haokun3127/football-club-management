import { getParentCalendar, getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveParentPageDate } from "../../../utils/date";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState } from "../../../utils/types";

interface MilestoneRow {
  id: string;
  title: string;
  state: string;
  tone: "green" | "red" | "blue";
  icon: string;
}

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取成长足迹",
    milestones: [] as MilestoneRow[],
  },
  onLoad() {
    const session = requireRole("parent");
    if (!session) return;
    void this.load();
  },
  async load() {
    this.setData({ state: "loading", message: "正在读取成长足迹" });
    try {
      const children = await getParentChildren();
      const active = children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", milestones: [] });
        return;
      }
      const today = resolveParentPageDate();
      const [growth, events] = await Promise.all([
        getParentGrowth(active.id, active),
        fetchCalendarRange(today, 180),
      ]);
      const hasMetrics = Array.isArray(growth.radar) && growth.radar.length > 0;
      const completed = events.filter((event) => event.status === "completed" && eventBelongsToStudent(event, active.id));
      const trainings = completed.filter((event) => event.type === "training").length;
      const matches = completed.filter((event) => event.type === "match").length;
      const milestones: MilestoneRow[] = [
        { id: "training", title: trainings ? `完成 ${trainings} 次训练` : "完成首次训练", state: trainings ? "已达成" : "待达成", tone: trainings ? "green" : "red", icon: trainings ? "✓" : "○" },
        { id: "match", title: matches ? `完成 ${matches} 场比赛` : "首次参加比赛", state: matches ? "已达成" : "待达成", tone: matches ? "green" : "red", icon: matches ? "✓" : "○" },
        { id: "assessment", title: "能力模型更新", state: hasMetrics ? "已更新" : "待达成", tone: hasMetrics ? "blue" : "red", icon: hasMetrics ? "•" : "○" },
      ];
      this.setData({ state: milestones.length ? "ready" : "empty", message: milestones.length ? "" : "暂无成长足迹", milestones });
    } catch {
      this.setData({ state: "error", message: "成长足迹读取失败，请点击重试" });
    }
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    void this.load();
  },
});

async function fetchCalendarRange(today: string, days: number) {
  const chunks: Array<Promise<Awaited<ReturnType<typeof getParentCalendar>>>> = [];
  for (let offset = days; offset > 0; offset -= 31) {
    const from = shiftDate(today, -offset);
    const to = offset - 31 <= 0 ? today : shiftDate(today, -offset + 30);
    chunks.push(getParentCalendar(from, to));
  }
  const results = await Promise.all(chunks);
  return results.flat();
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eventBelongsToStudent(event: { childIds?: string[]; studentId?: string }, studentId: string) {
  if (event.childIds?.length) return event.childIds.includes(studentId);
  return event.studentId === studentId;
}
