import { getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { formatDateTime, formatShortDate, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { correctTrainingRecord, type TrainingRecord } from "../../../utils/training-records";
import type { LoadState } from "../../../utils/types";

type Row = { recorded: boolean; studentId: string; eventId: string; name: string; counted: boolean; revision: number; dateLabel: string; statusLabel: string; sourceLabel: string; historyLabels: string[] };
Page({
  data: {
    navInset: resolveNavInset(), menuInset: resolveMenuInset(), state: "loading" as LoadState,
    message: "正在读取训练记录", eventId: "", eventTitle: "", total: 0, rows: [] as Row[], visibleRows: [] as Row[],
    filter: "all", search: "", canEdit: false, expandedId: "", editing: null as Row | null, draftCounted: false, reason: "", saving: false,
    saveError: "", conflict: false,
  },
  onLoad(query?: Record<string, string | undefined>) { this.setData({ eventId: query?.id || "", expandedId: query?.studentId || "" }); void this.load(); },
  onUnload() { nextRequest(this); },
  async load() {
    if (!requireRole("coach")) return;
    const ticket = nextRequest(this);
    this.setData({ state: "loading", message: "正在读取训练记录" });
    try {
      if (!this.data.eventId) { this.setData({ state: "empty", message: "缺少训练活动，请从日历重新进入。", rows: [], visibleRows: [] }); return; }
      const workbench = await getCoachWorkbench(this.data.eventId);
      if (!currentRequest(this, ticket)) return;
      if (workbench.event.type !== "training" || !Array.isArray(workbench.trainingRecords)) throw new Error("训练记录暂不可用，请稍后重试。");
      const records = new Map(workbench.trainingRecords.map(record => [record.studentId, record]));
      const roster = [...new Map(workbench.roster.filter(student => Boolean(student.studentId)).map(student => [student.studentId, student])).values()];
      const rows = roster.map(student => presentRow(student.name, student.studentId, this.data.eventId, workbench.event.startsAt, records.get(student.studentId)));
      this.setData({ state: rows.length ? "ready" : "empty", message: rows.length ? "" : "本课暂无学员。", eventTitle: workbench.event.title, canEdit: workbench.event.status !== "cancelled", rows, ...summarize(rows, this.data.filter, this.data.search) });
    } catch (error) {
      if (currentRequest(this, ticket)) this.setData({ state: "error", message: (error as { message?: string }).message || "训练记录读取失败，请重试", canEdit: false });
    }
  },
  changeFilter(event: { currentTarget: { dataset: { filter: string } } }) {
    const filter = event.currentTarget.dataset.filter;
    if (["all", "counted", "uncounted", "pending"].includes(filter)) this.setData({ filter, ...summarize(this.data.rows, filter, this.data.search) });
  },
  searchRows(event: { detail: { value: string } }) {
    const search = event.detail.value;
    this.setData({ search, ...summarize(this.data.rows, this.data.filter, search) });
  },
  toggleHistory(event: { currentTarget: { dataset: { id: string } } }) { this.setData({ expandedId: this.data.expandedId === event.currentTarget.dataset.id ? "" : event.currentTarget.dataset.id }); },
  edit(event: { currentTarget: { dataset: { id: string } } }) {
    if (!this.data.canEdit) return;
    const row = this.data.rows.find((item: Row) => item.studentId === event.currentTarget.dataset.id);
    if (row) this.setData({ editing: row, draftCounted: row.counted, reason: "", saveError: "", conflict: false });
  },
  changeCounted(event: { detail: { value: boolean } }) { if (!this.data.saving) this.setData({ draftCounted: event.detail.value }); },
  changeReason(event: { detail: { value: string } }) { if (!this.data.saving) this.setData({ reason: event.detail.value }); },
  closeEditor() { if (!this.data.saving) this.setData({ editing: null }); },
  async refreshConflict() {
    const editing = this.data.editing;
    if (!editing || this.data.saving) return;
    const ticket = nextRequest(this);
    this.setData({ saving: true });
    try {
      const workbench = await getCoachWorkbench(this.data.eventId);
      if (!currentRequest(this, ticket)) return;
      const record = workbench.trainingRecords?.find(row => row.studentId === editing.studentId);
      if (!record || workbench.event.status === "cancelled" || !workbench.roster.some(row => row.studentId === editing.studentId)) throw new Error("该记录当前不可更正，请返回后重新读取。");
      const current = presentRow(editing.name, editing.studentId, editing.eventId, record.occurredAt, record);
      const rows = this.data.rows.map((row: Row) => row.studentId === editing.studentId ? current : row);
      this.setData({ rows, ...summarize(rows, this.data.filter, this.data.search), editing: current, conflict: false, saveError: "已读到最新记录。请核对当前状态，再保存你的更正。" });
    } catch (error) { if (currentRequest(this, ticket)) this.setData({ saveError: (error as { message?: string }).message || "最新记录读取失败" }); }
    finally { if (currentRequest(this, ticket)) this.setData({ saving: false }); }
  },
  async save() {
    const editing = this.data.editing;
    if (!editing || !this.data.canEdit || this.data.saving || this.data.conflict) return;
    if (!this.data.reason.trim()) { this.setData({ saveError: "请填写更正原因" }); return; }
    const ticket = nextRequest(this);
    const counted = this.data.draftCounted;
    this.setData({ saving: true, saveError: "" });
    try {
      const response = await correctTrainingRecord(editing.studentId, editing.eventId, { expectedRevision: editing.revision, counted, reason: this.data.reason.trim() });
      if (!currentRequest(this, ticket)) return;
      const record = response.record;
      if (!record || record.studentId !== editing.studentId || record.eventId !== editing.eventId || record.revision !== editing.revision + 1 || record.counted !== counted) throw new Error("保存结果未确认");
      const rows = this.data.rows.map((row: Row) => row.studentId === editing.studentId ? presentRow(row.name, row.studentId, row.eventId, record.occurredAt, record) : row);
      this.setData({ rows, ...summarize(rows, this.data.filter, this.data.search), editing: null });
      wx.showToast({ title: "更正已保存", icon: "success" });
    } catch (error) {
      if (!currentRequest(this, ticket)) return;
      this.setData({ conflict: true, saveError: (error as { code?: string }).code === "training_record_conflict" ? "这条记录刚被更新，你的输入已保留。请先核对最新记录。" : "保存结果未确认，输入已保留。请先核对最新记录。" });
    } finally { if (currentRequest(this, ticket)) this.setData({ saving: false }); }
  },
  goBack() { if (this.data.editing) this.closeEditor(); else wx.navigateBack(); },
  retry() { void this.load(); },
});
function presentRow(name: string, studentId: string, eventId: string, occurredAt: string, record?: TrainingRecord): Row {
  return { recorded: Boolean(record), name, studentId, eventId, counted: record?.counted ?? false, revision: record?.revision ?? 0,
    dateLabel: formatShortDate(occurredAt), statusLabel: record ? record.counted ? "已计课次" : "不计课次" : "待课程结束自动记录",
    sourceLabel: record ? record.source === "automatic" ? "系统记录" : "人工更正" : "尚未生成",
    historyLabels: (record?.history ?? []).map((item, index, history) => {
      const previous = item.previousCounted === undefined ? history[index - 1]?.counted : item.previousCounted;
      const label = (value: boolean | null | undefined) => value === true ? "已计课次" : value === false ? "不计课次" : "尚无记录";
      return `${formatDateTime(item.changedAt)} · ${item.actorDisplayName || item.actorUserId || "系统"} · ${label(previous)} → ${label(item.counted)} · ${item.reason}`;
    }) };
}
function summarize(rows: Row[], filter: string, search = "") {
  const query = search.trim().toLocaleLowerCase();
  return {
    total: rows.filter(row => row.counted).length,
    visibleRows: rows.filter(row => row.name.toLocaleLowerCase().includes(query) &&
      (filter === "all" || (filter === "pending" ? !row.recorded : filter === "counted" ? row.counted : row.recorded && !row.counted))),
  };
}
function nextRequest(page: unknown) { const p = page as { _request?: number }; return p._request = (p._request ?? 0) + 1; }
function currentRequest(page: unknown, request: number) { return (page as { _request?: number })._request === request; }
