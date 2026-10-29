import type { AssessmentTaskOptions } from "../../utils/api";
import type { AssessmentCourse, CoachAssessmentTask } from "../../utils/types";

export type AssessmentTaskFlow = {
  intent: "collect" | "review" | "view" | "unavailable";
  actionLabel: string;
  reason: string;
  canOpen: boolean;
  actionable: boolean;
};

// Match the existing projects/bulk-entry compatibility gate. A workflow may
// remain readable before its start date; canEdit continues to govern editing.
export function assessmentTaskFlow(task: CoachAssessmentTask): AssessmentTaskFlow {
  const result = (intent: AssessmentTaskFlow["intent"], actionLabel: string, reason = ""): AssessmentTaskFlow => ({
    intent, actionLabel, reason, canOpen: intent !== "unavailable", actionable: intent === "collect" || intent === "review",
  });
  if (!task.templateId) return result("unavailable", "暂不可进入", "任务尚未配置测评表，请联系负责人核对。");
  if (task.workflow?.error) return result("unavailable", "暂不可进入", task.workflow.error);
  if (!task.workflow) {
    if (task.status === "not_started") return result("unavailable", "任务尚未开始", `任务尚未开始${task.startsOn ? `，开始日期为 ${task.startsOn}` : ""}，请开始后再录入。`);
    if (task.status === "completed" || (task.totalStudents > 0 && task.completedStudents >= task.totalStudents)) return result("view", "查看已完成测评");
    return result("collect", "继续采集测评");
  }
  const workflow = task.workflow;
  if (!workflow.canEdit) return result("view", "查看测评与进度", "当前任务仅支持查看，暂不能录入或确认发布。");
  if (workflow.readyStudents > 0) return result("review", "核对测评成绩", `有 ${workflow.readyStudents} 名学员待核对确认。`);
  if (workflow.totalStudents > 0 && workflow.publishedStudents >= workflow.totalStudents) return result("view", "查看已确认测评", "全部学员已确认发布，可查看已有结果。");
  if (workflow.totalStudents === 0 || workflow.completedStudents >= workflow.totalStudents) return result("view", "查看测评与进度");
  return result("collect", "继续采集测评");
}

export function assessmentTaskProjectRoute(task: CoachAssessmentTask, review = false): string {
  if (!assessmentTaskFlow(task).canOpen) return "";
  return `/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(task.id)}&templateId=${encodeURIComponent(task.templateId)}&title=${encodeURIComponent(task.title)}${review ? "&review=1" : ""}`;
}


export async function resolveCourseAssessmentTasks(
  options: AssessmentTaskOptions,
  eventId: string,
  teamId: string | undefined,
  readCourses: (taskId: string) => Promise<{courses: AssessmentCourse[]}>,
) {
  const course = options.sourceCourse;
  if (!course || course.id !== eventId || (teamId && course.teamId !== teamId)) throw new Error("课程范围不可用");
  // Origin links are explicit associations. Periodic applicability uses the
  // authorized course/team/date scope and the task's legal course contract.
  const candidates = options.tasks.filter(task => task.teamId === course.teamId);
  const applicable = await Promise.all(candidates.map(async task => {
    if (task.sourceEventId === course.id) return task;
    if (!task.startsOn || !task.dueOn || course.date < task.startsOn || course.date > task.dueOn) return null;
    if (!task.workflow) return task;
    const response = await readCourses(task.id);
    return response.courses.some(item => item.id === course.id) ? task : null;
  }));
  return {course, tasks: applicable.filter((task): task is CoachAssessmentTask => task !== null)};
}
