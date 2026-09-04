import { getCoachTeam, getCoachTeamAbilityOverview } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachTeamAbilityOverview, LoadState, RadarMetricPoint } from "../../../utils/types";

const COACH_TRAINING_TEAM_KEY = "coach-training-team-id";

type StudentView = { id: string; name: string; initial: string; scoreLabel: string; };
interface PageData {
  navInset: number; menuInset: number; state: LoadState; message: string; hasTeam: boolean;
  teamContext: string; teamHint: string; students: StudentView[]; hasStudents: boolean;
  summaryOverall: string; summaryBestDimension: string; summaryNeedDimension: string;
  radar: RadarMetricPoint[]; dimensions: Array<{ metricId: string; label: string; value: string; width: string }>;
  hasRadar: boolean; radarMounted: boolean; overall: string; assessmentPeriod: string;
}

Page<PageData>({
  data: emptyPageData("idle", ""),
  onLoad() { return this.load(); },
  onShow() { if (this.data.state !== "loading") return this.load(); },
  async load() {
    if (!requireRole("coach")) { this.setData(emptyPageData("empty", "当前账号暂无可查看的球队能力数据。")); return; }
    const requestToken = nextRequestToken(this);
    const teamId = wx.getStorageSync<string>(COACH_TRAINING_TEAM_KEY);
    this.setData(emptyPageData("loading", "正在读取能力评估"));
    try {
      // Start the aggregate request with the fast roster request. The roster is rendered
      // as soon as it arrives; score enrichment must never block navigation or selection.
      const overviewRequest = getCoachTeamAbilityOverview(teamId).catch(() => null);
      const detail = await getCoachTeam(teamId);
      if (!isCurrentRequest(this, requestToken)) return;
      if (!detail.team) { this.setData(emptyPageData("empty", "训练管理尚未选择可用球队。")); return; }
      const students = toStudents(detail.members);
      if (!students.length) { this.setData({ ...emptyPageData("empty", "当前训练球队暂无在队学员。"), hasTeam: true, teamContext: detail.team.name, teamHint: "由训练管理选择" }); return; }
      const baseData = { state: "ready" as const, message: "", hasTeam: true, teamContext: detail.team.name, teamHint: "由训练管理选择", students, hasStudents: true, summaryOverall: "-", summaryBestDimension: "待同步", summaryNeedDimension: "待同步", radar: [], dimensions: [], hasRadar: false, radarMounted: false, overall: "-", assessmentPeriod: "评估时间待同步" };
      this.setData(baseData);
      const overview = await overviewRequest;
      if (!isCurrentRequest(this, requestToken)) return;
      if (!overview) return;
      const scoreByStudentId = new Map((overview.students ?? []).map((student) => [student.studentId, student.overall]));
      const summary = summarizeTeam(overview);
      this.setData({ students: students.map((student) => ({ ...student, scoreLabel: formatScore(scoreByStudentId.get(student.id)) })), summaryOverall: summary.overall, summaryBestDimension: summary.best, summaryNeedDimension: summary.need });
    } catch {
      if (isCurrentRequest(this, requestToken)) this.setData(emptyPageData("error", "球队能力读取失败，请稍后重试。"));
    }
  },
  selectStudent(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const studentId = event.currentTarget?.dataset?.id;
    if (!studentId) return;
    openPage(`/pages/coach/student-radar/index?student=${encodeURIComponent(studentId)}`);
  },
  retry() { return this.load(); },
  goBack() { wx.navigateBack(); },
});

function emptyPageData(state: LoadState, message: string): PageData { return { navInset: resolveNavInset(), menuInset: resolveMenuInset(), state, message, hasTeam: false, teamContext: "当前训练球队待同步", teamHint: "由训练管理选择", students: [], hasStudents: false, summaryOverall: "-", summaryBestDimension: "待同步", summaryNeedDimension: "待同步", radar: [], dimensions: [], hasRadar: false, radarMounted: false, overall: "-", assessmentPeriod: "评估时间待同步" }; }
function toStudents(members: Array<{ id: string; name: string }>): StudentView[] { const ids = new Set<string>(); const students: StudentView[] = []; for (const member of members) { const name = member.name.trim(); if (!member.id || !name || ids.has(member.id)) continue; ids.add(member.id); students.push({ id: member.id, name: name.slice(0, 4), initial: name.slice(0, 1) || "学", scoreLabel: "-" }); } return students; }
function formatScore(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value)) : "-"; }
function summarizeTeam(overview: CoachTeamAbilityOverview) { const ranked = overview.dimensions.filter((item) => typeof item.average === "number" && Number.isFinite(item.average)).sort((left, right) => (right.average ?? 0) - (left.average ?? 0)); return { overall: formatScore(overview.overall), best: ranked[0]?.label ?? "待同步", need: ranked[ranked.length - 1]?.label ?? "待同步" }; }
function nextRequestToken(page: unknown) { const state = page as { _c14RequestToken?: number }; state._c14RequestToken = (state._c14RequestToken ?? 0) + 1; return state._c14RequestToken; }
function isCurrentRequest(page: unknown, requestToken: number) { return (page as { _c14RequestToken?: number })._c14RequestToken === requestToken; }
