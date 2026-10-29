import { assessmentTaskFlow, assessmentTaskProjectRoute, type AssessmentTaskFlow } from "../assessment-task-flow";
import { getCoachAssessmentTasks, getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { loadActiveTeam } from "../../../utils/coach-team-context";
import { calendarDateKey, currentLocalDate, shiftCalendarDate } from "../../../utils/date";
import { calendarDataRanges } from "../../../utils/schedule-calendar";
import { openPage } from "../../../utils/navigation";
import { activityTypeLabel, formatCalendarDate, formatTimeOnly } from "../../../utils/presentation";
import type { CoachAssessmentTask, LoadState, ScheduleEvent } from "../../../utils/types";

type CourseCard = ScheduleEvent & { timeLabel: string; typeLabel: string };
type PendingTask = CoachAssessmentTask & AssessmentTaskFlow;
const generations = new WeakMap<object, number>();
const routes: Record<string, string> = {
  roster: "/pages/coach/team/index?section=roster", training: "/pages/coach/training/index?section=training",
  tasks: "/pages/coach/test-tasks/index?", ability: "/pages/coach/team-ability/index?",
  matches: "/pages/coach/team/index?section=matches", coaches: "/pages/coach/team/index?section=coaches",
};
Page({
  data: {
    state: "loading" as LoadState, message: "正在读取球队", teamId: "", teamName: "", season: "", section: "workspace",
    trainingCards: [] as CourseCard[], upcomingCards: [] as CourseCard[], pendingTasks: [] as PendingTask[], visiblePendingTasks: [] as PendingTask[],
    overviewLoading: false, courseError: "", taskError: "",
    entries: [
      { id: "roster", name: "队员名单", note: "在队学员" }, { id: "training", name: "训练安排", note: "课程与内容" },
      { id: "tasks", name: "测评任务", note: "录入与确认" }, { id: "ability", name: "能力分析", note: "已确认结果" },
      { id: "matches", name: "比赛记录", note: "正式赛事" },
    ],
  },
  requestedTeamId: "",
  onLoad(query?: { teamId?: string; section?: string }) {
    this.requestedTeamId = query?.teamId || "";
    this.setData({ section: query?.section === "training" ? "training" : "workspace" });
    return this.load();
  },
  onShow() { if (this.data.state !== "loading" && !this.data.overviewLoading) return this.load(); },
  onUnload() { generations.set(this, (generations.get(this) ?? 0) + 1); },
  async load() {
    if (!requireRole("coach")) return;
    const version = (generations.get(this) ?? 0) + 1;
    generations.set(this, version);
    this.setData({ state: "loading", message: "正在读取球队", trainingCards: [], upcomingCards: [], pendingTasks: [], visiblePendingTasks: [], courseError: "", taskError: "" });
    try {
      const context = await loadActiveTeam(this.requestedTeamId || undefined);
      if (generations.get(this) !== version) return;
      if (!context.id) {
        this.setData({ state: "empty", teamId: "", teamName: "", overviewLoading: false, message: context.options.length ? "请先选择要管理的球队" : "暂无授权球队，请联系俱乐部管理员" });
        return;
      }
      this.requestedTeamId = "";
      this.setData({ teamId: context.id, teamName: context.detail!.team!.name, season: context.detail!.team!.season || "当前学期", state: "ready", message: "", overviewLoading: true });
      const date = currentLocalDate();
      const isMonth = this.data.section === "training";
      const from = isMonth ? `${date.slice(0, 7)}-01` : date;
      const to = isMonth ? new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10) : shiftCalendarDate(date, 13);
      const ranges = isMonth ? calendarDataRanges(date, true, true) : [{ from: shiftCalendarDate(from, -1), to }];
      const [courses, tasks] = await Promise.allSettled([
        Promise.all(ranges.map(range => getCoachHome({ ...range, teamIds: [context.id] })))
          .then(homes => ({ events: [...new Map(homes.flatMap(home => home.events).map(event => [event.id, event])).values()] })),
        isMonth ? Promise.resolve([] as CoachAssessmentTask[]) : getCoachAssessmentTasks({ teamId: context.id, forceRefresh: true }),
      ]);
      if (generations.get(this) !== version) return;
      const cards = courses.status === "fulfilled" ? courses.value.events
        .filter(event => {
          const day = calendarDateKey(event.startsAt);
          return (!isMonth || event.type === "training") && event.teamIds?.includes(context.id) && (!isMonth || day >= from) && day <= to
            && (isMonth || (event.status !== "cancelled" && event.status !== "completed" && Date.parse(event.endsAt || event.startsAt) > Date.now()));
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(event => ({ ...event, typeLabel: activityTypeLabel(event.type), timeLabel: `${formatCalendarDate(event.startsAt)} · ${formatTimeOnly(event.startsAt)}` })) : [];
      const pendingTasks = tasks.status === "fulfilled" ? tasks.value.filter(task => task.teamId === context.id).map(task => ({...task, ...assessmentTaskFlow(task)})).filter(task => task.actionable)
        .sort((a, b) => a.dueOn.localeCompare(b.dueOn)) : [];
      this.setData({ trainingCards: cards, upcomingCards: cards.slice(0, 1), pendingTasks, visiblePendingTasks: pendingTasks.slice(0,2),
        overviewLoading: false, courseError: courses.status === "rejected" ? "课程读取失败，请重试" : "", taskError: tasks.status === "rejected" ? "测评任务读取失败，请重试" : "" });
    } catch (error) {
      if (generations.get(this) === version) this.setData({ state: "error", teamId: "", teamName: "", overviewLoading: false, message: error instanceof Error ? error.message : "球队读取失败，请重试" });
    }
  },
  chooseTeam() { openPage("/pages/coach/team-selector/index"); },
  openEntry(event: { currentTarget: { dataset: { id?: string } } }) {
    const route = routes[event.currentTarget.dataset.id || ""];
    if (!route) return;
    if (!this.data.teamId) return this.chooseTeam();
    openPage(`${route}${route.endsWith("?") ? "" : "&"}teamId=${encodeURIComponent(this.data.teamId)}`);
  },
  openTask(event: { currentTarget: { dataset: { id?: string } } }) {
    const task = this.data.pendingTasks.find((item: CoachAssessmentTask) => item.id === event.currentTarget.dataset.id);
    if (task) { const route = assessmentTaskProjectRoute(task, task.intent === "review"); if (route) openPage(route); }
  },
  openTrainingEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (this.data.trainingCards.some((item: ScheduleEvent) => item.id === id)) openPage(`/pages/coach/event/index?id=${encodeURIComponent(id!)}&teamId=${encodeURIComponent(this.data.teamId)}`);
  },
  openScouts() { openPage("/pages/coach/scout/index"); },
  retry() { return this.load(); },
});
