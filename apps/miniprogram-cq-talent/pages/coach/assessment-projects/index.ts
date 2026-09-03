import { getAssessmentForm, getCoachAssessmentEntries, getCoachAssessmentTasks } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { AssessmentForm, LoadState } from "../../../utils/types";

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  statusLabel: string;
  statusTone: "pending";
  itemCountLabel: string;
  completedStudents: number;
};

const TASK_STATUS_LABELS: Record<string, string> = { in_progress: "进行中", completed: "已完成" };

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取测评项目",
    taskTitle: "能力评估",
    taskId: "",
    templateId: "",
    teamContextLabel: "球队与学期待同步",
    progressLabel: "",
    projectProgressLabel: "",
    taskStatusLabel: "",
    taskStatusClass: "",
    projects: [] as ProjectRow[],
  },
  onLoad(query?: { taskId?: string; templateId?: string; title?: string }) {
    return this.load(query?.taskId || "", query?.templateId || "", query?.title ? decodeURIComponent(query.title) : "能力评估");
  },
  async load(taskId: string, templateId: string, taskTitle: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!taskId || !templateId) {
      this.setData({ state: "empty", message: "缺少测评任务参数，请从测评任务列表进入。", projects: [] });
      return;
    }
    this.setData({ state: "loading", message: "正在读取测评项目", taskTitle, taskId, templateId });
    try {
      const tasks = await getCoachAssessmentTasks({ forceRefresh: true });
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.templateId !== templateId || (task.status !== "in_progress" && task.status !== "completed")) {
        this.setData({ state: "empty", message: "当前测评任务不可录入，请返回任务列表后重试。", projects: [] });
        return;
      }
      const form = await getAssessmentForm(templateId);
      const baseProjects = buildProjectRows(form);
      const projects = await hydrateProjectProgress(task.id, task.totalStudents, baseProjects);
      const completedProjects = projects.reduce((count, project) => count + (project.completedStudents >= task.totalStudents && task.totalStudents > 0 ? 1 : 0), 0);
      this.setData({
        state: projects.length ? "ready" : "empty",
        message: projects.length ? "" : "当前测评表单暂无可录入项目。",
        taskTitle: task.title,
        teamContextLabel: `${task.teamName?.trim() || "球队待同步"} · ${task.termLabel?.trim() || "学期待同步"}`,
        progressLabel: `${task.completedStudents}/${task.totalStudents}名学员已完成`,
        projectProgressLabel: `已完成 ${completedProjects}/${projects.length} 个项目 · ${task.completedStudents}/${task.totalStudents} 名学员`,
        taskStatusLabel: TASK_STATUS_LABELS[task.status] || "进行中",
        taskStatusClass: `projects-progress__status--${task.status}`,
        projects,
      });
    } catch {
      this.setData({ state: "error", message: "测评项目读取失败，请稍后重试。", projects: [] });
    }
  },
  openProject(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const projectId = event.currentTarget?.dataset?.id;
    if (!projectId) return;
    openPage(`/pages/coach/assessment-bulk-entry/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&projectId=${encodeURIComponent(projectId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  retry() {
    void this.load(this.data.taskId, this.data.templateId, this.data.taskTitle);
  },
});

function buildProjectRows(form: AssessmentForm): ProjectRow[] {
  const groups = new Map<string, { label: string; fields: AssessmentForm["fields"] }>();
  for (const field of form.fields) {
    if (!field.id || !field.testItemId || !field.groupId) continue;
    const current = groups.get(field.groupId) || { label: field.groupLabel || "测评项目", fields: [] };
    current.fields.push(field);
    groups.set(field.groupId, current);
  }
  return Array.from(groups.entries()).map(([id, group]) => ({
    id,
    title: group.label,
    description: projectDescription(group.fields[0]),
    statusLabel: "待录入",
    statusTone: "pending",
    itemCountLabel: `${group.fields.length}个指标`,
    completedStudents: 0,
  }));
}

async function hydrateProjectProgress(taskId: string, totalStudents: number, projects: ProjectRow[]): Promise<ProjectRow[]> {
  const responses = await Promise.all(projects.map((project) => getCoachAssessmentEntries(taskId, project.id).catch(() => ({ savedValuesByStudent: {} }))));
  return projects.map((project, index) => {
    const completedStudents = Object.keys(responses[index]?.savedValuesByStudent || {}).length;
    return { ...project, completedStudents, statusLabel: completedStudents > 0 ? `已录 ${Math.min(completedStudents, totalStudents)}/${totalStudents}` : "待录入" };
  });
}

function projectDescription(field?: AssessmentForm["fields"][number]) {
  const unit = unitLabel(field);
  const manual = field?.valueKind === "score_0_100" || field?.valueKind === "rating_1_5";
  return manual ? "无换算规则 · 手动评分" : `原始成绩：${unit} · 自动换算标准分`;
}

function unitLabel(field?: AssessmentForm["fields"][number]) {
  if (field?.unit) return field.unit;
  const labels: Record<string, string> = { duration_seconds: "秒", duration_minutes: "分钟", distance_meters: "米", count: "次数", percentage: "%", score_0_100: "分", rating_1_5: "分" };
  return labels[field?.valueKind || ""] || "原始值";
}
