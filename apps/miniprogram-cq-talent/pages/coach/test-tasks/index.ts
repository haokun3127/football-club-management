import { getCoachAssessmentTasks } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachAssessmentTask, LoadState } from "../../../utils/types";

type FilterId = "all" | "unfinished" | "completed";

type FilterView = {
  id: FilterId;
  label: string;
  className: string;
};

interface TaskCard extends CoachAssessmentTask {
  teamContextLabel: string;
  statusLabel: string;
  statusClass: string;
  dateRange: string;
  progressLabel: string;
  progressStyle: string;
  progressClass: string;
  isEntryEnabled: boolean;
}

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  statusTitle: string;
  statusActionText: string;
  message: string;
  filters: FilterView[];
  activeFilter: FilterId;
  tasks: TaskCard[];
  visibleTasks: TaskCard[];
  hasVisibleTasks: boolean;
}

type RefreshFlags = {
  assessmentTasksLoadedSuccessfully?: boolean;
  assessmentTasksLoading?: boolean;
  skipInitialAssessmentTasksShow?: boolean;
};

const STATUS_LABELS: Record<CoachAssessmentTask["status"], string> = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
};

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    statusTitle: "测评任务",
    statusActionText: "",
    message: "",
    filters: presentFilters("all"),
    activeFilter: "all",
    tasks: [],
    visibleTasks: [],
    hasVisibleTasks: false,
  },

  onLoad() {
    const flags = this as typeof this & RefreshFlags;
    flags.skipInitialAssessmentTasksShow = true;
    return this.load();
  },

  onShow() {
    const flags = this as typeof this & RefreshFlags;
    if (flags.skipInitialAssessmentTasksShow) {
      flags.skipInitialAssessmentTasksShow = false;
      return;
    }
    if (flags.assessmentTasksLoadedSuccessfully && !flags.assessmentTasksLoading) {
      return this.load();
    }
  },

  async load() {
    const flags = this as typeof this & RefreshFlags;
    if (flags.assessmentTasksLoading) return;
    if (!requireRole("coach")) return;

    flags.assessmentTasksLoading = true;
    this.setData({
      state: "loading",
      statusTitle: "正在读取测评任务",
      statusActionText: "",
      message: "",
    });

    try {
      const tasks = (await getCoachAssessmentTasks()).map(presentTask);
      flags.assessmentTasksLoadedSuccessfully = true;
      const visibleTasks = filterTasks(tasks, this.data.activeFilter);
      this.setData({
        state: tasks.length ? "ready" : "empty",
        statusTitle: tasks.length ? "" : "暂无测评任务",
        statusActionText: "",
        message: tasks.length ? "" : "当前暂无测评任务。",
        filters: presentFilters(this.data.activeFilter),
        tasks,
        visibleTasks,
        hasVisibleTasks: visibleTasks.length > 0,
      });
    } catch {
      this.setData({
        state: "error",
        statusTitle: "读取失败",
        statusActionText: "重试",
        message: "测评任务读取失败，请稍后重试。",
        tasks: [],
        visibleTasks: [],
        hasVisibleTasks: false,
      });
    } finally {
      flags.assessmentTasksLoading = false;
    }
  },

  retry() {
    return this.load();
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  openCreate() {
    wx.navigateTo({ url: "/pages/coach/test-task-create/index" });
  },

  selectFilter(event: { currentTarget: { dataset: { id: FilterId } } }) {
    const activeFilter = event.currentTarget.dataset.id;
    if (!isFilterId(activeFilter)) return;
    const visibleTasks = filterTasks(this.data.tasks, activeFilter);
    this.setData({
      activeFilter,
      filters: presentFilters(activeFilter),
      visibleTasks,
      hasVisibleTasks: visibleTasks.length > 0,
    });
  },

  openTask(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    const task = this.data.tasks.find((item: TaskCard) => item.id === id);
    if (!task) return;

    if (task.status === "not_started") {
      wx.showToast({ title: "任务尚未开始，暂不能录入。", icon: "none" });
      return;
    }
    if (task.status === "completed") {
      wx.showToast({ title: "任务已完成，暂未提供详情。", icon: "none" });
      return;
    }
    if (!task.isEntryEnabled || !task.templateId) {
      wx.showToast({ title: "当前任务暂不能录入。", icon: "none" });
      return;
    }

    openPage(`/pages/coach/assessment-entry/index?taskId=${encodeURIComponent(task.id)}&templateId=${encodeURIComponent(task.templateId)}&title=${encodeURIComponent(task.title)}`);
  },
});

function presentTask(task: CoachAssessmentTask): TaskCard {
  const progressPercent = safeProgressPercent(task.completedStudents, task.totalStudents);
  return {
    ...task,
    teamContextLabel: `${task.teamName?.trim() || "球队待同步"} · ${task.termLabel?.trim() || "学期待同步"}`,
    statusLabel: STATUS_LABELS[task.status],
    statusClass: `task-card__status task-card__status--${task.status}`,
    dateRange: `${task.startsOn} ~ ${task.dueOn}`,
    progressLabel: `${task.completedStudents}/${task.totalStudents}名学员`,
    progressStyle: `width: ${progressPercent}%`,
    progressClass: task.status === "not_started" ? "task-card__bar--muted" : "",
    isEntryEnabled: task.status === "in_progress" && Boolean(task.templateId),
  };
}

function safeProgressPercent(completedStudents: number, totalStudents: number) {
  if (!Number.isFinite(completedStudents) || !Number.isFinite(totalStudents) || totalStudents <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completedStudents / totalStudents) * 100)));
}

function filterTasks(tasks: TaskCard[], filter: FilterId) {
  if (filter === "unfinished") return tasks.filter((task) => task.status === "not_started" || task.status === "in_progress");
  if (filter === "completed") return tasks.filter((task) => task.status === "completed");
  return tasks;
}

function presentFilters(activeFilter: FilterId): FilterView[] {
  const filters: Array<Pick<FilterView, "id" | "label">> = [
    { id: "all", label: "全部" },
    { id: "unfinished", label: "未完成" },
    { id: "completed", label: "已完成" },
  ];
  return filters.map((filter) => ({
    ...filter,
    className: filter.id === activeFilter ? "filter-chip filter-chip--active" : "filter-chip",
  }));
}

function isFilterId(value: string): value is FilterId {
  return value === "all" || value === "unfinished" || value === "completed";
}
