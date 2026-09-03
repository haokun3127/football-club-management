import { getCoachStudentRadar, getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveNavInset } from "../../../utils/presentation";
import type { LoadState, RadarMetricPoint } from "../../../utils/types";

interface StudentChip { id: string; name: string; initial: string; }
interface RadarDimension { metricId: string; label: string; value: string; width: string; }
interface PageData {
  navInset: number; state: LoadState; message: string; radarContext: string;
  students: StudentChip[]; activeStudentId: string; activeStudentName: string;
  radar: RadarMetricPoint[]; dimensions: RadarDimension[]; hasRadar: boolean;
  overall: string; assessmentPeriod: string;
}

Page<PageData>({
  data: emptyPageData("idle", ""),
  onLoad(query: { student?: string }) { return this.load(query?.student || ""); },
  async load(preferredStudentId: string) {
    if (!requireRole("coach")) { this.setData(emptyPageData("empty", "当前账号暂无可查看的学员。")); return; }
    const requestToken = nextRequestToken(this);
    this.setData(emptyPageData("loading", "正在读取学员名单"));
    try {
      const team = await getCoachTeam();
      if (!isCurrentRequest(this, requestToken)) return;
      const students = toStudentChips(team.members);
      if (!students.length) { this.setData(emptyPageData("empty", "近 30 天暂无执教学员。")); return; }
      const active = students.find((student) => student.id === preferredStudentId) ?? students[0];
      this.setData({ students, radarContext: `${team.team?.name?.trim() || "球队待同步"} · ${formatSeason(team.team?.season)}` });
      if (active) await this.loadRadar(active);
    } catch {
      if (isCurrentRequest(this, requestToken)) this.setData(emptyPageData("error", "学员名单读取失败，请稍后重试。"));
    }
  },
  async loadRadar(student: StudentChip) {
    const requestToken = nextRequestToken(this);
    this.setData({ state: "loading", message: `正在读取${student.name}的能力雷达`, activeStudentId: student.id, activeStudentName: student.name, radar: [], dimensions: [], hasRadar: false, overall: "-", assessmentPeriod: "评估时间待同步" });
    try {
      const radar = await getCoachStudentRadar(student.id);
      if (!isCurrentRequest(this, requestToken)) return;
      const dimensions = projectDimensions(radar);
      const hasRadar = dimensions.length >= 3;
      const normalizedValues = dimensions.map((dimension) => Number.parseFloat(dimension.width));
      this.setData({ state: hasRadar ? "ready" : "empty", message: hasRadar ? "" : `${student.name} 暂无足够的有效评测数据生成雷达图。`, activeStudentId: student.id, activeStudentName: student.name, radar: hasRadar ? radar.filter(isValidRadarPoint) : [], dimensions, hasRadar, overall: hasRadar ? String(Math.round(average(normalizedValues))) : "-", assessmentPeriod: formatAssessmentPeriod(radar), radarContext: buildRadarContext(this.data.radarContext, radar) });
    } catch {
      if (isCurrentRequest(this, requestToken)) this.setData({ state: "error", message: "能力雷达读取失败，请稍后重试。", radar: [], dimensions: [], hasRadar: false, overall: "-", assessmentPeriod: "评估时间待同步" });
    }
  },
  selectStudent(event: { currentTarget: { dataset: { id: string } } }) {
    const student = this.data.students.find((item: StudentChip) => item.id === event.currentTarget.dataset.id);
    if (!student || student.id === this.data.activeStudentId) return;
    openPage(`/pages/coach/student-radar/index?student=${encodeURIComponent(student.id)}`);
  },
  retry() { return this.load(this.data.activeStudentId); },
  goBack() { wx.navigateBack(); },
});

function emptyPageData(state: LoadState, message: string): PageData { return { navInset: resolveNavInset(), state, message, radarContext: "球队待同步 · 评估时间待同步", students: [], activeStudentId: "", activeStudentName: "", radar: [], dimensions: [], hasRadar: false, overall: "-", assessmentPeriod: "评估时间待同步" }; }
function toStudentChips(members: Array<{ id: string; name: string }>): StudentChip[] { const ids = new Set<string>(); const students: StudentChip[] = []; for (const member of members) { const name = member.name.trim(); if (!member.id || !name || ids.has(member.id)) continue; ids.add(member.id); students.push({ id: member.id, name: name.slice(0, 4), initial: name.slice(0, 1) || "学" }); } return students; }
function projectDimensions(radar: RadarMetricPoint[]): RadarDimension[] { return radar.filter(isValidRadarPoint).map((point) => { const normalized = clamp((point.value / point.maxValue) * 100); return { metricId: point.metricId, label: point.label, value: formatScore(point.value), width: `${formatScore(normalized)}%` }; }); }
function isValidRadarPoint(point: RadarMetricPoint): point is RadarMetricPoint & { value: number } { return typeof point.value === "number" && Number.isFinite(point.value) && Number.isFinite(point.maxValue) && point.maxValue > 0; }
function formatAssessmentPeriod(radar: RadarMetricPoint[]): string { const dates = radar.map((point) => point.occurredAt).filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value))).map((value) => value.slice(0, 10)).sort(); const first = dates[0]; const last = dates[dates.length - 1]; if (!first || !last) return "评估时间待同步"; return first === last ? `${first} 评估` : `${first} 至 ${last} 评估`; }
function buildRadarContext(currentContext: string, radar: RadarMetricPoint[]) { const teamName = currentContext.split(" · ")[0] || "球队待同步"; const dates = radar.map((point) => point.occurredAt).filter((value): value is string => typeof value === "string" && Number.isFinite(Date.parse(value))).sort(); const latest = dates[dates.length - 1]; if (!latest) return currentContext; return `${teamName} · 最近一次更新 ${Number(latest.slice(5, 7))}月${Number(latest.slice(8, 10))}日`; }
function formatSeason(season: string | undefined) { return season?.trim() || "赛季待同步"; }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function clamp(value: number) { return Math.max(0, Math.min(value, 100)); }
function formatScore(value: number) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1))); }
function nextRequestToken(page: unknown) { const state = page as { _c13RequestToken?: number }; state._c13RequestToken = (state._c13RequestToken ?? 0) + 1; return state._c13RequestToken; }
function isCurrentRequest(page: unknown, requestToken: number) { return (page as { _c13RequestToken?: number })._c13RequestToken === requestToken; }
