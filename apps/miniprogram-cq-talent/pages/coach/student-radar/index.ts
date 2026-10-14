import { getCoachStudentProfile, getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveNavInset, resolveMenuInset } from "../../../utils/presentation";
import type { CoachStudentProfile, LoadState, RadarMetricPoint } from "../../../utils/types";

type ProfileSection = "summary" | "personal" | "training" | "ability";
type LabelValue = { label: string; value: string };
interface PageData {
  section: ProfileSection; pageTitle: string; menuInset: number; personalSummary: string; moduleSummary: string; confirmedSummary: string;
  hasRecords: boolean; hasModules: boolean; hasStudents: boolean;
  navInset: number; state: LoadState; message: string; teamId: string;
  students: Array<{ id: string; name: string; initial: string }>;
  activeStudentId: string; activeStudentName: string; initial: string; radarContext: string;
  basic: LabelValue[]; attendance: LabelValue[]; profile: CoachStudentProfile | null;
  radar: RadarMetricPoint[]; dimensions: Array<LabelValue & { metricId: string; date: string }>; hasRadar: boolean;
  overall: string; modelName: string; assessmentPeriod: string;
  recordLimit: number; records: Array<{ eventId: string; title: string; date: string; statusLabel: string; countLabel: string; revised: boolean }>;
  hasMoreRecords: boolean; historyEventId: string; history: Array<{ revision: number; label: string; reason: string; date: string }>;
  modules: Array<LabelValue>; participation: LabelValue[];
}

Page<PageData>({
  data: emptyData(),
  onLoad(query: { student?: string; team?: string; section?: string }) {
    const section = validSection(query.section);
    this.setData({ teamId: query.team || "", section, pageTitle: sectionTitle(section) });
    return this.load(query.student || "");
  },
  onUnload() { nextRequest(this); },
  onShow() { if (this.data.state === "ready") void this.load(this.data.activeStudentId); },
  async load(studentId: string) {
    if (!requireRole("coach")) return;
    const token = nextRequest(this);
    this.setData({ activeStudentId: studentId });
    this.setData({ state: "loading", message: "正在读取学员档案", profile: null, records: [], radar: [], dimensions: [], hasRadar: false, history: [], students: [], hasStudents: false });
    try {
      // A direct student link must never silently switch to the default team's first child.
      if (!studentId) {
        const team = await getCoachTeam(this.data.teamId || undefined);
        if (!current(this, token)) return;
        studentId = team.members[0]?.id || "";
        if (!studentId) { this.setData({ state: "empty", message: "当前队伍暂无学员" }); return; }
      }
      const result = await getCoachStudentProfile(studentId);
      if (!current(this, token)) return;
      const p = result.profile;
      const radar = result.radar.filter(validPoint);
      this.setData({
        state: "ready", message: "", profile: p, hasModules: p.training.modules.length > 0, activeStudentId: p.student.id, activeStudentName: p.student.name, initial: p.student.name.slice(0, 1),
        radarContext: p.student.teams.map(team => team.name).join(" · "),
        personalSummary: [p.student.age === null ? "年龄未记录" : `${p.student.age}岁`, p.student.school || "学校未记录", ({ left: "左脚", right: "右脚", both: "双脚" } as Record<string, string>)[p.student.dominantFoot || ""] || "惯用脚未记录"].join(" · "),
        moduleSummary: p.training.modules.map(module => `${module.label} ${module.courses}次`).join(" · ") || "暂无可归类的训练内容",
        confirmedSummary: Array.isArray(result.confirmedResults) ? `已确认测评 ${new Set(result.confirmedResults.map(row => row.taskId ?? row.assessmentId)).size}次` : "已确认成绩暂不可用",
        basic: [pair("年龄", p.student.age === null ? null : `${p.student.age}岁`), pair("学校", p.student.school), pair("年级", null), pair("位置", null),
          pair("惯用脚", ({ left: "左脚", right: "右脚", both: "双脚" } as Record<string, string>)[p.student.dominantFoot || ""]),
          ...p.student.teams.map(team => pair(`${team.name}入队`, date(team.joinedAt)))],
        attendance: [pair("应到", p.attendance.expected), pair("实到（含迟到）", p.attendance.present), pair("缺勤", p.attendance.absent), pair("请假", p.attendance.leave), pair("迟到", p.attendance.late), pair("待记录出勤", p.attendance.unrecorded), pair("早退", p.attendance.earlyLeave), pair("有效培训课次", p.attendance.effectiveLessons)],
        participation: [pair("训练实到", p.training.participation), pair("正式比赛参与", p.training.formalMatches), pair("训练内友谊赛", p.training.friendlyMatches)],
        modules: p.training.modules.map(module => pair(module.label, `${module.courses}次课程 · 编排${module.configuredMinutes === null ? "时长未记录" : `${module.configuredMinutes}分钟`}`)),
        modelName: result.modelName, overall: result.overall === null ? "未形成完整结果" : String(result.overall),
        hasRadar: radar.length >= 3, radar: radar.length >= 3 ? radar : [],
        dimensions: result.radar.map(point => ({ metricId: point.metricId, label: point.label, value: validPoint(point) ? String(point.value) : "未测评", date: date(point.occurredAt) || "发生时间未记录" })),
        assessmentPeriod: radar.map(point => date(point.occurredAt)).filter(Boolean).sort().reverse()[0] || "暂无已发布测评",
        recordLimit: 6, historyEventId: "", history: [],
      });
      this.showRecords();
      if (this.data.teamId) {
        const team = await getCoachTeam(this.data.teamId).catch(() => null);
        if (team && current(this, token)) this.setData({ hasStudents: team.members.length > 0, students: team.members.map(member => ({ ...member, initial: member.name.slice(0, 1) })) });
      }
    } catch {
      if (current(this, token)) this.setData({ state: "error", message: "学员档案读取失败，请稍后重试。", profile: null });
    }
  },
  showRecords() {
    const all: CoachStudentProfile["records"] = this.data.profile?.records || [];
    this.setData({ hasRecords: all.length > 0, records: all.slice(0, this.data.recordLimit).map(record => ({ eventId: record.eventId, title: record.title, date: date(record.occurredAt),
      statusLabel: ({ present: "实到", late: "迟到", absent: "缺勤", excused: "请假", leave_requested: "请假" } as Record<string, string>)[record.status] || "出勤待记录",
      countLabel: record.counted ? "已计次" : "不计次", revised: record.history.some(entry => entry.source === "correction") })), hasMoreRecords: all.length > this.data.recordLimit });
  },
  moreRecords() { this.setData({ recordLimit: this.data.recordLimit + 20 }); this.showRecords(); },
  showHistory(event: { currentTarget: { dataset: { id: string } } }) {
    const record = this.data.profile?.records.find((item: CoachStudentProfile["records"][number]) => item.eventId === event.currentTarget.dataset.id);
    if (!record) return;
    this.setData({ historyEventId: record.eventId, history: record.history.map((entry: CoachStudentProfile["records"][number]["history"][number]) => ({ revision: entry.revision, label: entry.counted ? "计次" : "不计次", reason: entry.reason, date: date(entry.changedAt) })) });
  },
  openCourse(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (this.data.profile?.records.some((record: CoachStudentProfile["records"][number]) => record.eventId === id)) openPage(`/pages/coach/event/index?id=${encodeURIComponent(id)}`);
  },
  selectStudent(event: { currentTarget: { dataset: { id: string } } }) {
    const student = this.data.students.find((item: PageData["students"][number]) => item.id === event.currentTarget.dataset.id);
    if (student && student.id !== this.data.activeStudentId) return this.load(student.id);
  },
  openSection(event: { currentTarget: { dataset: { section: string } } }) {
    const section = validSection(event.currentTarget.dataset.section);
    if (section === "summary" || !this.data.activeStudentId || this.data.state !== "ready") return;
    openPage(`/pages/coach/student-radar/index?student=${encodeURIComponent(this.data.activeStudentId)}&team=${encodeURIComponent(this.data.teamId)}&section=${section}`);
  },
  openEvaluation() { if (this.data.activeStudentId && this.data.state === "ready") openPage(`/pages/shared/student-evaluation/index?student=${encodeURIComponent(this.data.activeStudentId)}&team=${encodeURIComponent(this.data.teamId)}`); },
  openConfirmedResults() { if (this.data.activeStudentId) openPage(`/pages/coach/student-results/index?student=${encodeURIComponent(this.data.activeStudentId)}&team=${encodeURIComponent(this.data.teamId)}`); },
  retry() { return this.load(this.data.activeStudentId); },
  goBack() { wx.navigateBack(); },
});
function emptyData(): PageData { return { section: "summary", pageTitle: "学员详情", menuInset: resolveMenuInset(), personalSummary: "", moduleSummary: "", confirmedSummary: "", hasRecords: false, hasModules: false, hasStudents: false, navInset: resolveNavInset(), state: "idle", message: "", teamId: "", students: [], activeStudentId: "", activeStudentName: "", initial: "", radarContext: "", basic: [], attendance: [], profile: null, radar: [], dimensions: [], hasRadar: false, overall: "", modelName: "", assessmentPeriod: "", recordLimit: 6, records: [], hasMoreRecords: false, historyEventId: "", history: [], modules: [], participation: [] }; }
function pair(label: string, value: string | number | null | undefined): LabelValue { return { label, value: value === null || value === undefined || value === "" ? "未记录" : String(value) }; }
function date(value?: string) { if (!value || !Number.isFinite(Date.parse(value))) return ""; return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 10); }
function validPoint(point: RadarMetricPoint): point is RadarMetricPoint & { value: number } { return typeof point.value === "number" && Number.isFinite(point.value) && point.maxValue > 0 && Number.isFinite(point.maxValue); }
function nextRequest(page: unknown) { const p = page as { _request?: number }; p._request = (p._request || 0) + 1; return p._request; }
function current(page: unknown, token: number) { return (page as { _request?: number })._request === token; }

function validSection(value?: string): ProfileSection { return value === "personal" || value === "training" || value === "ability" ? value : "summary"; }
function sectionTitle(section: ProfileSection) { return { summary: "学员详情", personal: "个人资料与评价", training: "学员训练记录", ability: "训练内容与已确认能力" }[section]; }
