import { getCoachStudentProfile, getCoachTeam, getParentConfirmedResults } from "./api";
import { requireRole } from "./auth";
import { formatShortDate, resolveNavInset, resolveMenuInset } from "./presentation";
import type { ConfirmedStudentResult, LoadState } from "./types";

type ResultView = ConfirmedStudentResult & { valueLabel: string; dateLabel: string; historyDate: string; numeric: number | null; displayUnit: string };
export function createStudentResultsPage(role: "parent" | "coach") {
  const data = {
    pageTitle: role === "parent" ? "孩子的已确认成绩" : "学员已确认成绩",
    navInset: resolveNavInset(), menuInset: resolveMenuInset(), state: "loading" as LoadState, message: "正在读取已确认成绩",
    studentId: "", studentName: "", teamId: "", teamName: "", selected: null as ResultView | null,
    results: [] as ResultView[], alternatives: [] as ResultView[], bars: [] as Array<{ id: string; valueLabel: string; dateLabel: string; height: string; latest: boolean }>, scaleLabel: "", history: [] as ResultView[], switching: false,
  };
  const options: WechatPageOptions<typeof data> & ThisType<{
    data: typeof data; setData(patch: Partial<typeof data>): void;
    load(studentId: string): Promise<void>; selectResult(id: string): void;
    showStudentPage(students: Array<{ id: string; name: string }>, offset: number, token: number): void;
  }> = { data,
  onLoad(query?: Record<string, string | undefined>) { this.setData({ teamId: role === "coach" ? query?.team || "" : "" }); const session = requireRole(role); void this.load(query?.student || session?.currentStudentId || ""); },
  onUnload() { requestToken(this); },
  async load(studentId: string) {
    if (!requireRole(role)) return;
    const token = requestToken(this);
    this.setData({ state: "loading", studentId, selected: null, results: [], alternatives: [], bars: [], history: [] });
    try {
      if (!studentId) throw new Error("请从学员档案进入成绩记录");
      const source = role === "parent" ? await getParentConfirmedResults(studentId) : null;
      const response = source ? { profile: { student: source.student }, confirmedResults: source.confirmedResults } : await getCoachStudentProfile(studentId);
      if (!active(this, token)) return;
      if (!Array.isArray(response.confirmedResults)) throw new Error("成绩记录暂不可用，请稍后重试");
      const results = response.confirmedResults.map(presentResult);
      this.setData({ state: results.length ? "ready" : "empty", message: results.length ? "" : "这名学员暂无已确认的原始成绩。", studentName: response.profile.student.name, teamName: response.profile.student.teams.map(team => team.name).join(" · "), results });
      if (results[0]) this.selectResult(results[0].id);
    } catch (error) { if (active(this, token)) this.setData({ state: "error", message: (error as { message?: string }).message || "成绩读取失败，请重试" }); }
  },
  select(event: { currentTarget: { dataset: { id: string } } }) { this.selectResult(event.currentTarget.dataset.id); },
  selectResult(id: string) {
    const selected = this.data.results.find((row: ResultView) => row.id === id);
    if (!selected) return;
    const sameDefinition = (row: ResultView) => row.testItemId === selected.testItemId && row.templateVersionId === selected.templateVersionId && row.value.kind === selected.value.kind && row.displayUnit === selected.displayUnit;
    const history = this.data.results.filter(sameDefinition).reverse();
    const numericRows = history.filter((row: ResultView) => row.numeric !== null && row.numeric >= 0);
    const max = Math.max(1, ...numericRows.map((row: ResultView) => row.numeric!));
    const scale = Math.ceil(max * 1.1 * 100) / 100;
    const bars = selected.templateVersionId && numericRows.length === history.length ? history.slice(-3).map((row: ResultView) => ({ id: row.id, valueLabel: row.valueLabel, dateLabel: row.dateLabel, height: `${Math.round(row.numeric! / scale * 200)}rpx`, latest: row.id === selected.id })) : [];
    const seen = new Set<string>();
    const alternatives = this.data.results.filter((row: ResultView) => {
      const key = JSON.stringify([row.testItemId, row.templateVersionId, row.value.kind, row.displayUnit]);
      if (seen.has(key)) return false; seen.add(key); return !sameDefinition(row);
    });
    this.setData({ selected, history, bars, alternatives, scaleLabel: bars.length ? `同版本成绩 · 统一刻度 0–${scale}${selected.displayUnit}` : "历史原始成绩 · 不合并比较不同版本" });
  },
  async switchStudent() {
    if (this.data.switching || !this.data.teamId) return;
    const token = currentToken(this);
    this.setData({ switching: true });
    try {
      const team = await getCoachTeam(this.data.teamId);
      if (!active(this, token)) return;
      const students = team.members.filter(student => student.id !== this.data.studentId);
      if (!students.length) { wx.showToast({ title: "暂无其他同队学员", icon: "none" }); return; }
      this.showStudentPage(students, 0, token);
    } catch { if (active(this, token)) wx.showToast({ title: "学员名单读取失败", icon: "none" }); }
    finally { if (active(this, token)) this.setData({ switching: false }); }
  },
  showStudentPage(students: Array<{ id: string; name: string }>, offset: number, token: number) {
    const options: Array<{ label: string; id?: string; offset?: number }> = students.slice(offset, offset + 4).map(student => ({ label: student.name, id: student.id }));
    if (offset > 0) options.push({ label: "上一页学员", offset: offset - 4 });
    if (offset + 4 < students.length) options.push({ label: "下一页学员", offset: offset + 4 });
    wx.showActionSheet({ itemList: options.map(option => option.label), success: (result) => {
      const option = options[result.tapIndex];
      if (!active(this, token) || !option) return;
      if (option.id) void this.load(option.id);
      else if (option.offset !== undefined) this.showStudentPage(students, option.offset, token);
    } });
  },
  retry() { void this.load(this.data.studentId); },
  goBack() { wx.navigateBack(); },
}; return options; }
function presentResult(row: ConfirmedStudentResult): ResultView {
  const fields: Record<string, [string, string]> = { rating_1_5: ["score", "分"], score_0_100: ["score", "分"], count: ["count", "次"], percentage: ["percentage", "%"], duration_minutes: ["minutes", "分钟"], duration_seconds: ["seconds", "秒"], distance_meters: ["meters", "米"], measurement: ["value", String(row.value.unit || "")] };
  const definition = fields[String(row.value.kind)];
  const raw = definition ? row.value[definition[0]] : row.value.text ?? row.value.tag;
  const numeric = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const displayUnit = row.unit ?? definition?.[1] ?? "";
  return { ...row, numeric, displayUnit, valueLabel: raw === undefined || raw === null ? "原始值未记录" : `${raw}${displayUnit ? ` ${displayUnit}` : ""}`, dateLabel: formatShortDate(row.occurredAt), historyDate: Number.isFinite(Date.parse(row.occurredAt)) ? new Date(Date.parse(row.occurredAt) + 8 * 3_600_000).toISOString().slice(0, 10) : "日期待确认" };
}
function requestToken(page: unknown) { const p = page as { _request?: number }; return p._request = (p._request ?? 0) + 1; }
function currentToken(page: unknown) { return (page as { _request?: number })._request ?? 0; }
function active(page: unknown, token: number) { return currentToken(page) === token; }
