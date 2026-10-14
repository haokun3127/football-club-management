import { applyTrainingTransfer, previewTrainingTransfer } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { formatCalendarDate, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { TrainingTransferPreview } from "../../../utils/types";

type Mode = "merge" | "replace";
type Target = TrainingTransferPreview["targets"][number] & { selected: boolean; dateLabel: string; existingMinutes: number };
type Result = { eventId: string; title: string; label: string; applied: boolean };
const resultLabels: Record<string, string> = { applied: "已保存", skipped: "已跳过", conflict: "课程已变化，请重新预览", forbidden: "已无编排权限", failed: "保存失败，请重新预览后核对" };

Page({
  data: {
    navInset: resolveNavInset(), menuInset: resolveMenuInset(),
    loading: false, saving: false, loadError: "", message: "", view: "summary",
    source: null as TrainingTransferPreview["source"] | null,
    targets: [] as Target[], selectedTargets: [] as Target[], selectedCount: 0, pendingCount: 0,
    mode: "merge" as Mode, previewRows: [] as Array<{ eventId: string; title: string; count: number; minutes: number; names: string }>,
    canSubmit: false, needsRefresh: false, results: [] as Result[],
  },
  onLoad(query?: { eventId?: string }) {
    if (!requireRole("coach")) return;
    this._eventId = query?.eventId || "";
    void this.load();
  },
  onUnload() { this._request = (this._request || 0) + 1; },
  async load() {
    if (this.data.saving) return;
    const token = this._request = (this._request || 0) + 1;
    this.setData({ loading: true, loadError: "", canSubmit: false, source: null, targets: [], selectedTargets: [], selectedCount: 0, pendingCount: 0, previewRows: [], results: [], message: "", needsRefresh: false });
    try {
      if (!this._eventId) throw new Error("missing source");
      const preview = await previewTrainingTransfer({ sourceEventId: this._eventId });
      if (token !== this._request) return;
      if (!preview.source?.revision || !Array.isArray(preview.targets) || preview.targets.some(t => !t.outcomes?.merge || !t.outcomes.replace)) throw new Error("preview unavailable");
      this.setData({ loading: false, source: preview.source, targets: preview.targets.map(target => ({ ...target, selected: false, dateLabel: formatCalendarDate(target.startsAt), existingMinutes: target.existing.reduce((sum, item) => sum + item.configuredMinutes, 0) })),
        message: !preview.source.count ? "排除友谊赛后没有可复制的内容。" : !preview.targets.length ? "暂无可编排的未来课程。" : "" });
    } catch {
      if (token !== this._request) return;
      this.setData({ loading: false, loadError: "复制预览读取失败，请重试并核对课程权限。", needsRefresh: true });
    }
  },
  openTargets() {
    if (this.data.loading || this.data.saving || this.data.needsRefresh ) return;
    this._selectedBefore = this.data.targets.filter((t: Target) => t.selected).map((t: Target) => t.eventId);
    this.setData({ view: "targets", pendingCount: this._selectedBefore.length, message: "" });
  },
  toggleTarget(event: { currentTarget: { dataset: { id: string } } }) {
    if (this.data.saving || this.data.view !== "targets") return;
    const id = event.currentTarget.dataset.id;
    const target = this.data.targets.find((t: Target) => t.eventId === id);
    if (!target) return;
    if (!target.selected && this.data.targets.filter((t: Target) => t.selected).length >= 20) { this.setData({ message: "每次最多选择 20 堂课程。" }); return; }
    const targets = this.data.targets.map((t: Target) => t.eventId === id ? { ...t, selected: !t.selected } : t);
    this.setData({ targets, pendingCount: targets.filter((t: Target) => t.selected).length, message: "" });
  },
  applyTargets() { if (this.data.saving) return; this.setData({ view: "summary" }); this.updatePreview(); },
  selectMode(event: { currentTarget: { dataset: { mode: Mode } } }) {
    const mode = event.currentTarget.dataset.mode;
    if (this.data.saving || this.data.needsRefresh || !["merge", "replace"].includes(mode)) return;
    this.setData({ mode }); this.updatePreview();
  },
  updatePreview() {
    const selectedTargets: Target[] = this.data.targets.filter((t: Target) => t.selected);
    const mode: Mode = this.data.mode;
    this.setData({ selectedTargets, selectedCount: selectedTargets.length,
      previewRows: selectedTargets.map(t => { const outcome = t.outcomes![mode]; return { eventId: t.eventId, title: t.title, count: outcome.count, minutes: outcome.configuredMinutes, names: outcome.items.map(item => item.name).join(" · ") }; }),
      canSubmit: !this.data.loading && !this.data.needsRefresh && Boolean(this.data.source?.count) && selectedTargets.length > 0 && selectedTargets.length <= 20 });
  },
  async submit() {
    if (!this.data.canSubmit || this.data.saving) return;
    const selected: Target[] = this.data.selectedTargets;
    const token = this._request = (this._request || 0) + 1;
    this.setData({ saving: true, canSubmit: false, message: "" });
    try {
      const result = await applyTrainingTransfer({ sourceEventId: this._eventId, sourceRevision: this.data.source.revision,
        targets: selected.map(t => ({ eventId: t.eventId, expectedRevision: t.revision, action: this.data.mode })) });
      if (token !== this._request) return;
      if (!Array.isArray(result.results) || result.results.length !== selected.length || new Set(result.results.map(r => r.eventId)).size !== selected.length || result.results.some(r => !selected.some(t => t.eventId === r.eventId) || !resultLabels[r.status])) throw new Error("unconfirmed result");
      const results = result.results.map(r => ({ eventId: r.eventId, title: selected.find(t => t.eventId === r.eventId)!.title, label: resultLabels[r.status], applied: r.status === "applied" }));
      this.setData({ results, needsRefresh: true, message: results.every(r => r.applied) ? "所选课程内容已保存。" : "请逐课核对结果；再次操作前重新读取预览。" });
    } catch {
      if (token !== this._request) return;
      this.setData({ needsRefresh: true, message: "未能确认全部保存结果，请重新预览核对；不会自动重复覆盖。" });
    } finally {
      if (token === this._request) this.setData({ saving: false });
    }
  },
  goBack() {
    if (this.data.saving) return;
    if (this.data.view === "targets") {
      const ids: string[] = this._selectedBefore || [];
      this.setData({ view: "summary", targets: this.data.targets.map((t: Target) => ({ ...t, selected: ids.includes(t.eventId) })), message: "" });
      this.updatePreview(); return;
    }
    wx.navigateBack();
  },
});
