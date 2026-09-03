import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { GrowthTimelineItem, LoadState } from "../../../utils/types";

type AbilityHistoryRow = {
  id: string;
  sourceLabel: "课堂训练" | "学期测评";
  sourceTone: "training" | "assessment";
  title: string;
  occurredAtLabel: string;
  metricLabel: string;
  deltaLabel: string;
  deltaTone: "positive" | "negative" | "neutral";
  sourceUrl: string;
  hasSourceUrl: boolean;
};

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取能力模型更新",
    rows: [] as AbilityHistoryRow[],
    updateCountLabel: "已更新 0 次",
    latestUpdateLabel: "暂无更新记录",
    scoreLabel: "–",
  },
  onLoad() {
    void this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取能力模型更新", rows: [] });
    try {
      const children = await getParentChildren();
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", rows: [] });
        return;
      }
      const growth = await getParentGrowth(active.id, active);
      const rows = buildAbilityHistoryRows(growth.timeline ?? [], active.id);
      const latest = rows[0];
      this.setData({
        state: rows.length ? "ready" : "empty",
        message: rows.length ? "" : "暂无能力模型更新",
        rows,
        updateCountLabel: `已更新 ${rows.length} 次`,
        latestUpdateLabel: latest ? `最近更新 ${shortDate(latest.occurredAtLabel)}` : "暂无更新记录",
        scoreLabel: latest ? latest.metricLabel.split(" ")[2] ?? "–" : "–",
      });
    } catch {
      this.setData({ state: "error", message: "能力模型更新读取失败，请点击重试", rows: [] });
    }
  },
  openSource(event: { currentTarget?: { dataset?: { url?: string } } }) {
    const url = event.currentTarget?.dataset?.url;
    if (url) openPage(url);
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    void this.load();
  },
});

function buildAbilityHistoryRows(timeline: GrowthTimelineItem[], studentId: string): AbilityHistoryRow[] {
  return timeline
    .filter((item) => item.kind === "ability_update" && item.abilityUpdate?.metrics.length)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .map((item) => presentAbilityHistoryRow(item, studentId));
}

function presentAbilityHistoryRow(item: GrowthTimelineItem, studentId: string): AbilityHistoryRow {
  const update = item.abilityUpdate;
  const source = update?.source === "semester_assessment" ? "semester_assessment" : "training_content_assessment";
  const firstMetric = update?.metrics[0];
  const previousValue = firstMetric?.previousValue;
  const value = firstMetric?.value;
  const delta = typeof value === "number" && typeof previousValue === "number" ? value - previousValue : undefined;
  const sourceUrl = source === "training_content_assessment"
    ? item.eventId ? `/pages/parent/event/index?id=${encodeURIComponent(item.eventId)}` : ""
    : firstMetric?.metricId ? `/pages/parent/metric/index?metricId=${encodeURIComponent(firstMetric.metricId)}&studentId=${encodeURIComponent(studentId)}` : "";
  return {
    id: item.id,
    sourceLabel: source === "training_content_assessment" ? "课堂训练" : "学期测评",
    sourceTone: source === "training_content_assessment" ? "training" : "assessment",
    title: item.title || (source === "training_content_assessment" ? "课堂训练评测" : "学期能力测评"),
    occurredAtLabel: formatAbilityDate(item.occurredAt),
    metricLabel: metricLabel(firstMetric?.label, previousValue, value),
    deltaLabel: deltaLabel(delta),
    deltaTone: delta === undefined || delta === 0 ? "neutral" : delta > 0 ? "positive" : "negative",
    sourceUrl,
    hasSourceUrl: Boolean(sourceUrl),
  };
}

function metricLabel(label: string | undefined, previousValue: number | null | undefined, value: number | null | undefined) {
  const name = label || "能力指标";
  const previous = typeof previousValue === "number" ? String(previousValue) : "–";
  const current = typeof value === "number" ? String(value) : "–";
  return `${name} ${previous} → ${current}`;
}

function deltaLabel(delta: number | undefined) {
  if (delta === undefined || delta === 0) return "持平";
  return delta > 0 ? `+${delta}` : String(delta);
}

function shortDate(value: string) {
  const matched = value.match(/\d{1,2}月\d{1,2}日/);
  return matched?.[0] || value;
}

function formatAbilityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待同步";
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
