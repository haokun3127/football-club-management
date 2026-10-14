import { requireRole } from "../../../utils/auth";
import { getSession } from "../../../utils/store";
import { resolveNavInset, resolveMenuInset } from "../../../utils/presentation";
import { evaluationHistory, getStudentEvaluations, saveStudentEvaluation } from "../../../utils/student-evaluations";
import type { EvaluationList, EvaluationRevision } from "../../../utils/student-evaluations";
import type { LoadState } from "../../../utils/types";
type Mode = "current" | "edit" | "history";
const initialData = { navInset: resolveNavInset(), menuInset: resolveMenuInset(), state: "idle" as LoadState, message: "", mode: "current" as Mode, pageTitle: "学员评价", studentId: "", studentName: "", teamId: "", teamName: "", teams: [] as EvaluationList["teams"], phrases: [] as Array<{ id: string; text: string; selected: boolean }>, revision: 0, note: "", canEdit: false, submitting: false, mustReload: false, current: null as EvaluationRevision | null, history: [] as ReturnType<typeof evaluationHistory> };
Page<typeof initialData>({
  data: initialData,
  onLoad(query: { student?: string; team?: string; mode?: string }) {
    const session = getSession(); if (!session || !requireRole(session.role)) return;
    this.setData({ studentId: query.student || (session.role === "parent" ? session.currentStudentId || "" : ""), teamId: query.team || "", mode: mode(query.mode) });
    return this.load();
  },
  onUnload() { nextRequest(this); },
  async load() {
    const session = getSession(); if (!session || !requireRole(session.role)) return;
    const token = nextRequest(this); this.setData({ state: "loading", message: "正在读取评价", canEdit: false, mustReload: false, submitting: false });
    try {
      const result = await getStudentEvaluations(this.data.studentId); if (!current(this, token)) return;
      if (result.studentId !== this.data.studentId || !Array.isArray(result.teams) || !Array.isArray(result.phrases)) throw new Error("Invalid evaluation response");
      if (this.data.teamId && !result.teams.some(t => t.id === this.data.teamId)) throw new Error("Team no longer accessible");
      this._phraseCatalog = result.phrases;
      this.setData({ studentName: result.studentName, teams: result.teams, phrases: result.phrases.map(p => ({ ...p, selected: false })), state: result.teams.length ? "ready" : "empty", message: result.teams.length ? "" : "暂无队伍评价" });
      // An explicit team link never silently changes to another team's evaluation.
      this.selectTeam(this.data.teamId || result.teams[0]?.id || "");
    } catch { if (current(this, token)) this.setData({ state: "error", message: "评价读取失败或当前队伍已无访问权限，请重试。", canEdit: false }); }
  },
  selectTeam(id: string) {
    const team = this.data.teams.find((t: EvaluationList["teams"][number]) => t.id === id); if (!team) return;
    const latest = team.evaluation?.history[team.evaluation.history.length - 1] ?? null;
    const catalog = (this._phraseCatalog ?? this.data.phrases) as Array<{ id: string; text: string }>;
    const phrases = [...catalog, ...(latest?.phrases.filter((p: { id: string; text: string }) => !catalog.some(active => active.id === p.id)) ?? [])];
    const canEdit = getSession()?.role === "coach" && team.canEdit === true;
    const selectedMode = this.data.mode === "edit" && !canEdit ? "current" : this.data.mode;
    this.setData({ teamId: id, teamName: team.name, current: latest, revision: team.evaluation?.revision ?? 0, note: latest?.note ?? "", canEdit, mode: selectedMode, pageTitle: title(selectedMode), history: evaluationHistory(team.evaluation?.history ?? []), phrases: phrases.map((p: { id: string; text: string }) => ({ ...p, selected: latest?.phrases.some((old: { id: string }) => old.id === p.id) ?? false })) });
  },
  changeTeam(event: { detail: { value: string } }) { if (this.data.submitting || this.data.mustReload || this.data.mode === "edit") return; const team = this.data.teams[Number(event.detail.value)]; if (team) this.selectTeam(team.id); },
  edit() { if (!this.data.canEdit || this.data.state !== "ready") return; this.setData({ mode: "edit", pageTitle: title("edit") }); },
  showHistory() { this.setData({ mode: "history", pageTitle: title("history") }); },
  togglePhrase(event: { currentTarget: { dataset: { id: string } } }) { if (!this.data.canEdit || this.data.submitting || this.data.mustReload) return; this.setData({ phrases: this.data.phrases.map((p: typeof initialData.phrases[number]) => p.id === event.currentTarget.dataset.id ? { ...p, selected: !p.selected } : p) }); },
  inputNote(event: { detail: { value: string } }) { if (this.data.canEdit && !this.data.submitting && !this.data.mustReload) this.setData({ note: event.detail.value.slice(0, 500) }); },
  async save() {
    if (!this.data.canEdit || getSession()?.role !== "coach" || this.data.state !== "ready" || this.data.submitting || this.data.mustReload) return;
    const token = requestId(this), teamId = this.data.teamId, studentId = this.data.studentId;
    const input = { expectedRevision: this.data.revision, phraseIds: this.data.phrases.filter((p: typeof initialData.phrases[number]) => p.selected).map((p: typeof initialData.phrases[number]) => p.id), note: this.data.note.trim() };
    this.setData({ submitting: true, message: "" });
    try {
      const response = await saveStudentEvaluation(studentId, teamId, input); if (!current(this, token)) return;
      const saved = response.evaluation, latest = saved?.history[saved.history.length - 1];
      if (saved ? saved.studentId !== studentId || saved.teamId !== teamId || !latest || saved.revision < input.expectedRevision || saved.revision > input.expectedRevision + 1 || latest.note !== input.note || latest.phrases.length !== input.phraseIds.length || !latest.phrases.every(p => input.phraseIds.includes(p.id)) : input.expectedRevision !== 0 || input.phraseIds.length > 0 || !!input.note) throw new Error("Unconfirmed save");
      this.setData({ teams: this.data.teams.map((t: EvaluationList["teams"][number]) => t.id === teamId ? { ...t, evaluation: saved } : t), mode: "current", submitting: false }); this.selectTeam(teamId);
      wx.showToast({ title: saved?.revision === input.expectedRevision || !saved ? "评价未发生变化" : "评价已保存", icon: "none" });
    } catch { if (current(this, token)) this.setData({ submitting: false, mustReload: true, message: "未能确认保存结果，可能已有其他教练更新。已保留输入，请重新读取后再修改。" }); }
  },
  reload() { if (!this.data.mustReload) return this.load(); wx.showModal({ title: "重新读取评价", content: "重新读取将用最新评价替换当前保留的输入。", success: result => { if (result.confirm) void this.load(); } }); },
  goBack() { if (this.data.submitting) return; if (this.data.mode === "edit") { wx.showModal({ title: "离开编辑", content: "未保存的修改不会保留。", success: result => { if (result.confirm) wx.navigateBack(); } }); } else wx.navigateBack(); },
});
function mode(value?: string): Mode { return value === "edit" || value === "history" ? value : "current"; }
function title(value: Mode) { return { current: "学员评价", edit: "更新学员评价", history: "评价变化" }[value]; }
function requestId(page: unknown) { return (page as { _request?: number })._request || 0; }
function nextRequest(page: unknown) { const p = page as { _request?: number }; p._request = requestId(page) + 1; return p._request; }
function current(page: unknown, token: number) { return requestId(page) === token; }
