import { assessmentTaskFlow, assessmentTaskProjectRoute, resolveCourseAssessmentTasks, type AssessmentTaskFlow } from "../assessment-task-flow";
import { getCoachAssessmentTaskOptions, getCoachAssessmentCourses } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachAssessmentTask, LoadState } from "../../../utils/types";

// Keep historical event-only URLs, but resolve an authorized task before editing.
Page({
  data: {
    state: "loading" as LoadState,
    eventId: "", teamId: "", courseTitle: "", message: "正在查找本课测评任务",
    tasks: [] as Array<CoachAssessmentTask & AssessmentTaskFlow>,
  },
  requestVersion: 0,
  onLoad(query?: {eventId?:string; teamId?:string}) {
    this.setData({eventId: query?.eventId || "", teamId: query?.teamId || ""});
    return this.load();
  },
  onUnload() { this.requestVersion += 1; },
  async load() {
    if (!requireRole("coach")) return;
    const version = ++this.requestVersion;
    if (!this.data.eventId) { this.setData({state:"error", message:"缺少课程信息，请从日程重新进入。"}); return; }
    this.setData({state:"loading", message:"正在查找本课测评任务", tasks:[]});
    try {
      const options = await getCoachAssessmentTaskOptions(this.data.eventId, this.data.teamId || undefined);
      if (version !== this.requestVersion) return;
      const resolved = await resolveCourseAssessmentTasks(options, this.data.eventId, this.data.teamId || undefined, getCoachAssessmentCourses);
      if (version !== this.requestVersion) return;
      const tasks = resolved.tasks.map(task => ({...task, ...assessmentTaskFlow(task)}));
      this.setData({tasks, courseTitle: options.sourceCourse?.title || "本课测评", state: tasks.length ? "ready" : "empty",
        message: tasks.length > 1 ? "本课有多个测评任务，请选择后进入项目与核对。" : tasks.length ? "已找到本课测评任务。" : "本课暂无可录入测评任务。可返回课堂查看训练记录或发起随堂测评。"});
      if (tasks.length === 1 && tasks[0]!.canOpen) this.openTask({currentTarget:{dataset:{id:tasks[0]!.id}}});
    } catch {
      if (version === this.requestVersion) this.setData({state:"error", message:"任务读取失败，请重试。尚未进入成绩录入。"});
    }
  },
  openTask(event: {currentTarget:{dataset:{id?:string}}}) {
    const task = this.data.tasks.find((item: CoachAssessmentTask) => item.id === event.currentTarget.dataset.id);
    if (task) { const route = assessmentTaskProjectRoute(task, task.intent === "review"); if (route) openPage(route); }
  },
  openCourse() { if (this.data.eventId) openPage(`/pages/coach/event/index?id=${encodeURIComponent(this.data.eventId)}`); },
  retry() { return this.load(); },
});
