import { getAssessmentForm, getCoachAssessmentTasks } from "../../../utils/api";
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
};

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
      const tasks = await getCoachAssessmentTasks();
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.templateId !== templateId || task.status !== "in_progress") {
        this.setData({ state: "empty", message: "当前测评任务不可录入，请返回任务列表后重试。", projects: [] });
        return;
      }
      const form = await getAssessmentForm(templateId);
      const projects = buildProjectRows(form);
      this.setData({
        state: projects.length ? "ready" : "empty",
        message: projects.length ? "" : "当前测评表单暂无可录入项目。",
        taskTitle: task.title,
        teamContextLabel: `${task.teamName?.trim() || "球队待同步"} · ${task.termLabel?.trim() || "学期待同步"}`,
        progressLabel: `${task.completedStudents}/${task.totalStudents}名学员已完成`,
        projects,
      });
    } catch {
      this.setData({ state: "error", message: "测评项目读取失败，请稍后重试。", projects: [] });
    }
  },
  openProject(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const projectId = event.currentTarget?.dataset?.id;
    if (!projectId) return;
    openPage(`/pages/coach/assessment-entry/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&projectId=${encodeURIComponent(projectId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
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
    description: `原始成绩 · ${unitLabel(group.fields[0])}`,
    statusLabel: "待录入",
    statusTone: "pending",
    itemCountLabel: `${group.fields.length}个指标`,
  }));
}

function unitLabel(field?: AssessmentForm["fields"][number]) {
  if (field?.unit) return field.unit;
  const labels: Record<string, string> = { duration_seconds: "秒", duration_minutes: "分钟", distance_meters: "米", count: "次数", percentage: "%", score_0_100: "分", rating_1_5: "分" };
  return labels[field?.valueKind || ""] || "原始值";
}
