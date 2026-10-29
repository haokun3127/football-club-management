import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { GrowthTimelineItem, LoadState } from "../../../utils/types";

type AbilityHistoryRow = {
  id: string;
  sourceLabel: "课堂表现" | "测评模型";
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
  requestGeneration: 0,
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取能力模型更新",
    rows: [] as AbilityHistoryRow[],
    updateCountLabel: "已更新 0 次",
    latestUpdateLabel: "暂无更新记录",
  },
  onLoad() {
    void this.load();
  },
  onUnload() { this.requestGeneration++; },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const generation = ++this.requestGeneration;
    this.setData({ state: "loading", message: "正在读取能力模型更新", rows: [] });
    try {
      const children = await getParentChildren();
      if (generation !== this.requestGeneration) return;
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", rows: [] });
        return;
      }
      const growth = await getParentGrowth(active.id, active);
      if (generation !== this.requestGeneration) return;
      const rows = buildAbilityHistoryRows(growth.timeline ?? [], active.id);
      const latest = rows[0];
      this.setData({
        state: rows.length ? "ready" : "empty",
        message: rows.length ? "" : "暂无能力模型更新",
        rows,
        updateCountLabel: `已更新 ${rows.length} 次`,
        latestUpdateLabel: latest ? `最近更新 ${shortDate(latest.occurredAtLabel)}` : "暂无更新记录",
      });
    } catch {
      if (generation !== this.requestGeneration) return;
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
  const sourceUrl = source === "training_content_assessment"
    ? item.eventId ? `/pages/parent/event/index?id=${encodeURIComponent(item.eventId)}&studentId=${encodeURIComponent(studentId)}` : ""
    : firstMetric?.metricId ? `/pages/parent/metric/index?metricId=${encodeURIComponent(firstMetric.metricId)}&studentId=${encodeURIComponent(studentId)}` : "";
  return {
    id: item.id,
    sourceLabel: source === "training_content_assessment" ? "课堂表现" : "测评模型",
    sourceTone: source === "training_content_assessment" ? "training" : "assessment",
    title: item.title || (source === "training_content_assessment" ? "课堂训练评测" : "学期能力测评"),
    occurredAtLabel: formatAbilityDate(item.occurredAt),
    metricLabel: metricLabel(firstMetric?.label, previousValue, value),
    deltaLabel: "未比较",
    deltaTone: "neutral",
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

function shortDate(value: string) {
  const matched = value.match(/\d{1,2}月\d{1,2}日/);
  return matched?.[0] || value;
}

function formatAbilityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待同步";
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
