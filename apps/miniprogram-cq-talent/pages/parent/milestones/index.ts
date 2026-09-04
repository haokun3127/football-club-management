import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { GrowthTimelineItem, LoadState } from "../../../utils/types";

interface MilestoneRow {
  id: string;
  title: string;
  state: string;
  tone: "green" | "red" | "blue";
  icon: string;
  detail: string;
  meta: string;
  isAbilityUpdate: boolean;
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
    void this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取成长足迹" });
    try {
      const children = await getParentChildren();
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", milestones: [] });
        return;
      }
      const growth = await getParentGrowth(active.id, active);
      const milestones = buildMilestoneRows(growth.timeline ?? []);
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
  openAbilityHistory() {
    openPage("/pages/parent/ability-history/index");
  },
});

function buildMilestoneRows(timeline: GrowthTimelineItem[]): MilestoneRow[] {
  return timeline.map((item) => ({
    id: item.id,
    title: item.title,
    state: item.kind === "training" ? "训练" : item.kind === "match" ? "比赛" : "能力更新",
    tone: item.kind === "training" ? "green" : item.kind === "match" ? "red" : "blue",
    icon: item.kind === "training" ? "✓" : item.kind === "match" ? "⚽" : "•",
    detail: timelineDetail(item),
    meta: timelineMeta(item),
    isAbilityUpdate: item.kind === "ability_update",
  }));
}

function timelineDetail(item: GrowthTimelineItem) {
  if (item.kind === "training") {
    const first = item.training?.items[0];
    if (!first) return item.subtitle || "完成训练";
    const score = typeof first.score === "number" ? `：${first.score}分` : "";
    const note = first.note ? ` · ${first.note}` : "";
    return `${first.name}${score}${note}`;
  }
  if (item.kind === "match") {
    const score = item.match?.scoreLabel ? `比分 ${item.match.scoreLabel}` : item.subtitle || "完成比赛";
    const firstEvent = item.match?.events[0];
    if (!firstEvent) return score;
    const label = firstEvent.type === "goal" ? "进球" : firstEvent.type === "assist" ? "助攻" : firstEvent.type === "foul" ? "犯规" : "比赛事件";
    return `${score} · ${label}${typeof firstEvent.minute === "number" ? ` ${firstEvent.minute}'` : ""}`;
  }
  const first = item.abilityUpdate?.metrics[0];
  if (!first) return item.subtitle || "能力模型已更新";
  const current = typeof first.value === "number" ? ` ${first.value}` : "";
  const previous = typeof first.previousValue === "number" ? `（上次 ${first.previousValue}）` : "";
  return `${first.label}${current}${previous}`;
}

function timelineMeta(item: GrowthTimelineItem) {
  const date = item.occurredAt ? item.occurredAt.slice(0, 10) : "日期待同步";
  const contexts = [item.teamName, item.venue].filter(Boolean);
  return contexts.length ? `${date} · ${contexts.join(" · ")}` : date;
}
