import { getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { markGrowthStale } from "../../../utils/growth-invalidation";
import { formatDateTime, formatShortDate, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { correctTrainingRecord, getTrainingRecords, type TrainingRecord } from "../../../utils/training-records";
import type { LoadState } from "../../../utils/types";

type Row = TrainingRecord & { dateLabel: string; statusLabel: string; historyLabels: string[] };
let generation = 0;
Page({
  data: {
    navInset: resolveNavInset(), menuInset: resolveMenuInset(), state: "loading" as LoadState,
    message: "正在读取训练记录", studentId: "", studentName: "", total: 0, rows: [] as Row[],
    expandedId: "", editing: null as Row | null, draftCounted: false, reason: "", saving: false,
    saveError: "", conflict: false,
  },
  onLoad() { void this.load(); },
  onUnload() { generation++; },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const ticket = ++generation;
    this.setData({ state: "loading", message: "正在读取训练记录" });
    try {
      const children = await getParentChildren();
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (ticket !== generation) return;
      if (!active) { this.setData({ state: "empty", message: "暂无绑定学员", rows: [] }); return; }
      const result = await getTrainingRecords(active.id);
      if (ticket !== generation) return;
      this.setData({ state: result.records.length ? "ready" : "empty", message: result.records.length ? "" : "课程结束后，记录会自动显示在这里。", studentId: active.id, studentName: active.name, total: result.total, rows: result.records.map(presentRow) });
    } catch (error) {
      if (ticket === generation) this.setData({ state: "error", message: (error as { message?: string }).message || "训练记录读取失败，请重试" });
    }
  },
  toggleHistory(event: { currentTarget: { dataset: { id: string } } }) { this.setData({ expandedId: this.data.expandedId === event.currentTarget.dataset.id ? "" : event.currentTarget.dataset.id }); },
  edit(event: { currentTarget: { dataset: { id: string } } }) {
    const row = this.data.rows.find((item: Row) => item.eventId === event.currentTarget.dataset.id);
    if (row) this.setData({ editing: row, draftCounted: row.counted, reason: "", saveError: "", conflict: false });
  },
  changeCounted(event: { detail: { value: boolean } }) { this.setData({ draftCounted: event.detail.value }); },
  changeReason(event: { detail: { value: string } }) { this.setData({ reason: event.detail.value }); },
  closeEditor() { if (!this.data.saving) this.setData({ editing: null }); },
  async refreshConflict() {
    const editing = this.data.editing;
    if (!editing || this.data.saving) return;
    this.setData({ saving: true });
    try {
      const result = await getTrainingRecords(this.data.studentId);
      const current = result.records.find((row) => row.eventId === editing.eventId);
      if (!current) throw new Error("该记录当前不可更正，请返回后重新读取。");
      this.setData({ rows: result.records.map(presentRow), total: result.total, editing: presentRow(current), conflict: false, saveError: "已读到最新记录。请核对下方当前状态，再保存你的更正。" });
    } catch (error) { this.setData({ saveError: (error as { message?: string }).message || "最新记录读取失败" }); }
    finally { this.setData({ saving: false }); }
  },
  async save() {
    const editing = this.data.editing;
    if (!editing || this.data.saving || this.data.conflict) return;
    if (!this.data.reason.trim()) { this.setData({ saveError: "请填写更正原因" }); return; }
    this.setData({ saving: true, saveError: "" });
    try {
      const response = await correctTrainingRecord(this.data.studentId, editing.eventId, { expectedRevision: editing.revision, counted: this.data.draftCounted, reason: this.data.reason.trim() });
      // 更正写入成功后打脏成长数据，返回成长页时定向重拉（F-06）
      markGrowthStale();
      const rows = this.data.rows.map((row: Row) => row.eventId === editing.eventId ? presentRow({ ...row, ...response.record }) : row);
      this.setData({ rows, total: rows.filter((row: Row) => row.counted).length, editing: null });
      wx.showToast({ title: "更正已保存", icon: "success" });
    } catch (error) {
      const conflict = (error as { code?: string }).code === "training_record_conflict";
      this.setData({ conflict, saveError: conflict ? "这条记录刚被更新，你的输入已保留。请先核对最新记录。" : (error as { message?: string }).message || "保存失败，输入已保留，请重试" });
    } finally { this.setData({ saving: false }); }
  },
  goBack() { wx.navigateBack(); },
  retry() { void this.load(); },
});
function presentRow(record: TrainingRecord): Row {
  return { ...record, dateLabel: formatShortDate(record.occurredAt), statusLabel: record.counted ? "已计次" : "未计次",
    historyLabels: record.history.map((item) => `${formatDateTime(item.changedAt)} · ${item.counted ? "计次" : "不计次"} · ${item.reason}`) };
}
