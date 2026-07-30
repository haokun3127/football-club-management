import { getCoachAssessmentTasks } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachAssessmentTask, LoadState } from "../../../utils/types";

interface TaskCard extends CoachAssessmentTask {
  statusLabel: string;
  statusClass: string;
  dateRange: string;
  progressLabel: string;
  progressPercent: number;
}

interface PageData {
  state: LoadState;
  message: string;
  filters: string[];
  activeFilter: string;
  tasks: TaskCard[];
}

const STATUS_LABELS: Record<CoachAssessmentTask["status"], string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
};

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    filters: ["全部", "未完成", "已完成"],
    activeFilter: "全部",
    tasks: [],
  },
  onLoad() {
    this.load();
  },
  onShow() {
    if (this.data.state === "ready") {
      this.load();
    }
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取测评任务" });
    try {
      const tasks = await getCoachAssessmentTasks();
      this.setData({
        state: tasks.length ? "ready" : "empty",
        message: tasks.length ? "" : "暂无测评任务。",
        tasks: tasks.map((task) => ({
          ...task,
          statusLabel: STATUS_LABELS[task.status],
          statusClass: `task-card__status--${task.status}`,
          dateRange: `${task.startsOn} ~ ${task.dueOn}`,
          progressLabel: `${task.completedStudents}/${task.totalStudents}名学员`,
          progressPercent: task.totalStudents ? Math.round((task.completedStudents / task.totalStudents) * 100) : 0,
        })),
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "测评任务读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
  selectFilter(event: { currentTarget: { dataset: { name: string } } }) {
    this.setData({ activeFilter: event.currentTarget.dataset.name });
  },
  openTask(event: { currentTarget: { dataset: { templateId: string; title: string; status: string } } }) {
    const { templateId, title, status } = event.currentTarget.dataset;
    if (status === "not_started") {
      wx.showToast({ title: "任务尚未开始", icon: "none" });
      return;
    }
    openPage(`/pages/coach/assessment-entry/index?templateId=${templateId}&title=${encodeURIComponent(title)}`);
  },
  createTask() {
    wx.showToast({ title: "新增任务由俱乐部管理员发布", icon: "none" });
  },
});
