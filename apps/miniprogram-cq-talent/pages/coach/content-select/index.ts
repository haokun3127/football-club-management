import { getCoachTrainingProjectTree, getCoachWorkbench, saveCoachTrainingProjects } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState, TrainingProject, TrainingProjectTree } from "../../../utils/types";

type CategoryView = {
  id: string;
  label: string;
  className: string;
};

type ProjectView = TrainingProject & {
  groupIds: string[];
  groupNames: string[];
  hasDifficulty: boolean;
  hasDuration: boolean;
  durationLabel: string;
  isSelected: boolean;
  cardClass: string;
  iconClass: string;
  selectClass: string;
  iconSrc: string;
  searchText: string;
};

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  statusTitle: string;
  statusActionText: string;
  message: string;
  eventId: string;
  searchText: string;
  categories: CategoryView[];
  activeCategoryId: string;
  projects: ProjectView[];
  visibleProjects: ProjectView[];
  hasProjects: boolean;
  hasVisibleProjects: boolean;
  selectedIds: string[];
  selectedCount: number;
  durationText: string;
  summaryLabel: string;
  canSave: boolean;
  isConfirmDisabled: boolean;
  confirmClass: string;
  confirmLabel: string;
  submitting: boolean;
  hasSaveError: boolean;
  saveError: string;
}

const TARGET_ICONS = [
  "/assets/icons/c10-target-rose.svg",
  "/assets/icons/c10-target-amber.svg",
  "/assets/icons/c10-target-violet.svg",
  "/assets/icons/c10-target-green.svg",
];

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    statusTitle: "训练内容选择",
    statusActionText: "",
    message: "",
    eventId: "",
    searchText: "",
    categories: presentCategories([], "all"),
    activeCategoryId: "all",
    projects: [],
    visibleProjects: [],
    hasProjects: false,
    hasVisibleProjects: false,
    selectedIds: [],
    selectedCount: 0,
    durationText: "",
    summaryLabel: "已选 0 项",
    canSave: false,
    isConfirmDisabled: true,
    confirmClass: "select-bar__confirm select-bar__confirm--disabled",
    confirmLabel: "选择 (0)",
    submitting: false,
    hasSaveError: false,
    saveError: "",
  },

  onLoad(query: { eventId?: string }) {
    return this.load(query?.eventId || "");
  },

  async load(eventId: string) {
    if (!requireRole("coach")) {
      this.showLoadError(eventId, "当前账号无法读取训练内容。");
      return;
    }
    if (!eventId) {
      this.showLoadError("", "缺少活动信息，暂时不能保存训练内容。");
      return;
    }

    this.setData({
      state: "loading",
      statusTitle: "正在读取训练内容",
      statusActionText: "",
      message: "",
      eventId,
      canSave: false,
      isConfirmDisabled: true,
      submitting: false,
      hasSaveError: false,
      saveError: "",
    });

    try {
      const treeRequest = getCoachTrainingProjectTree();
      const workbenchRequest = getCoachWorkbench(eventId);
      const [tree, workbench] = await Promise.all([treeRequest, workbenchRequest]);

      if (!isWritableTrainingWorkbench(workbench, eventId)) {
        this.showLoadError(eventId, "当前活动不可编辑训练内容。");
        return;
      }

      const projects = mergeProjects(tree);
      const categories = presentCategories(tree.groups.map((group) => ({ id: group.id, label: group.name })), "all");
      const selectedIds = canonicalizeSelection(workbench.selectedTrainingProjectIds, projects);
      const selection = buildSelectionPatch(projects, categories, selectedIds, "all", "", true, false);
      const hasProjects = projects.length > 0;

      this.setData({
        state: hasProjects ? "ready" : "empty",
        statusTitle: hasProjects ? "" : "暂无训练内容",
        statusActionText: "",
        message: hasProjects ? "" : "当前没有可选择的训练内容。",
        eventId,
        ...selection,
        hasProjects,
        canSave: true,
      });
    } catch {
      this.showLoadError(eventId, "训练内容读取失败，请点击重试。");
    }
  },

  retry() {
    return this.load(this.data.eventId);
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  onSearchInput(event: { detail: { value: string } }) {
    const selection = buildSelectionPatch(
      this.data.projects,
      this.data.categories,
      this.data.selectedIds,
      this.data.activeCategoryId,
      event.detail.value,
      this.data.canSave,
      this.data.submitting,
    );
    this.setData({ ...selection, hasSaveError: false, saveError: "" });
  },

  selectCategory(event: { currentTarget: { dataset: { id: string } } }) {
    const activeCategoryId = event.currentTarget.dataset.id;
    if (!this.data.categories.some((category: CategoryView) => category.id === activeCategoryId)) return;
    const selection = buildSelectionPatch(
      this.data.projects,
      this.data.categories,
      this.data.selectedIds,
      activeCategoryId,
      this.data.searchText,
      this.data.canSave,
      this.data.submitting,
    );
    this.setData({ ...selection, hasSaveError: false, saveError: "" });
  },

  toggleProject(event: { currentTarget: { dataset: { id: string } } }) {
    if (!this.data.canSave || this.data.submitting) return;
    const id = event.currentTarget.dataset.id;
    if (!this.data.projects.some((project: ProjectView) => project.id === id)) return;

    const selected = new Set<string>(this.data.selectedIds);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);

    const selection = buildSelectionPatch(
      this.data.projects,
      this.data.categories,
      [...selected],
      this.data.activeCategoryId,
      this.data.searchText,
      this.data.canSave,
      false,
    );
    this.setData({ ...selection, hasSaveError: false, saveError: "" });
  },

  async confirmSelection() {
    if (!this.data.canSave || this.data.submitting || !this.data.eventId) return;
    if (!this.data.selectedIds.length) {
      this.setData({
        hasSaveError: true,
        saveError: "请至少选择一项训练内容。",
      });
      return;
    }

    const selectedIds = canonicalizeSelection(this.data.selectedIds, this.data.projects);
    if (!selectedIds.length) {
      this.setData({
        hasSaveError: true,
        saveError: "请重新选择训练内容后再保存。",
      });
      return;
    }

    this.setData({
      submitting: true,
      isConfirmDisabled: true,
      confirmClass: "select-bar__confirm select-bar__confirm--disabled",
      confirmLabel: "保存中",
      hasSaveError: false,
      saveError: "",
    });

    try {
      await saveCoachTrainingProjects(this.data.eventId, selectedIds);
      const readback = await getCoachWorkbench(this.data.eventId);
      const savedIds = canonicalizeSelection(readback.selectedTrainingProjectIds, this.data.projects);
      if (!isWritableTrainingWorkbench(readback, this.data.eventId) || !sameSelection(selectedIds, savedIds)) {
        this.showSaveError("训练内容尚未确认，请重试。", selectedIds);
        return;
      }

      this.setData({
        submitting: false,
        isConfirmDisabled: false,
        confirmClass: "select-bar__confirm",
        confirmLabel: `选择 (${selectedIds.length})`,
        hasSaveError: false,
        saveError: "",
      });
      wx.navigateBack({ delta: 1 });
    } catch {
      this.showSaveError("训练内容保存失败，请重试。", selectedIds);
    }
  },

  showLoadError(eventId: string, message: string) {
    this.setData({
      state: "error",
      statusTitle: "无法读取训练内容",
      statusActionText: eventId ? "重试" : "",
      message,
      eventId,
      projects: [],
      visibleProjects: [],
      hasProjects: false,
      hasVisibleProjects: false,
      selectedIds: [],
      selectedCount: 0,
      durationText: "",
      summaryLabel: "已选 0 项",
      canSave: false,
      isConfirmDisabled: true,
      confirmClass: "select-bar__confirm select-bar__confirm--disabled",
      confirmLabel: "选择 (0)",
      submitting: false,
      hasSaveError: false,
      saveError: "",
    });
  },

  showSaveError(saveError: string, selectedIds: string[]) {
    const selection = buildSelectionPatch(
      this.data.projects,
      this.data.categories,
      selectedIds,
      this.data.activeCategoryId,
      this.data.searchText,
      this.data.canSave,
      false,
    );
    this.setData({ ...selection, submitting: false, hasSaveError: true, saveError });
  },
});

function mergeProjects(tree: TrainingProjectTree): ProjectView[] {
  const records = new Map<string, { project: TrainingProject; groupIds: string[]; groupNames: string[] }>();
  const addProject = (project: TrainingProject) => {
    if (!project.id) return;
    if (!records.has(project.id)) records.set(project.id, { project, groupIds: [], groupNames: [] });
  };

  tree.projects.forEach(addProject);
  tree.groups.forEach((group) => {
    group.projects.forEach((project) => {
      addProject(project);
      const record = records.get(project.id);
      if (!record) return;
      if (!record.groupIds.includes(group.id)) {
        record.groupIds.push(group.id);
        record.groupNames.push(group.name);
      }
    });
  });

  return Array.from(records.values()).map(({ project, groupIds, groupNames }, index) => presentProject(project, groupIds, groupNames, index, false));
}

function presentProject(project: TrainingProject, groupIds: string[], groupNames: string[], index: number, isSelected: boolean): ProjectView {
  const durationMinutes = project.durationMinutes;
  const hasDuration = typeof durationMinutes === "number" && durationMinutes > 0;
  const searchText = [project.name, project.description || "", project.difficulty || "", ...project.tags, ...groupNames].join(" ").toLowerCase();
  return {
    ...project,
    metricIds: [...project.metricIds],
    tags: [...project.tags],
    groupIds,
    groupNames,
    hasDifficulty: Boolean(project.difficulty),
    hasDuration,
    durationLabel: hasDuration ? `${durationMinutes} 分钟` : "",
    isSelected,
    cardClass: isSelected ? "project-card project-card--selected" : "project-card",
    iconClass: `project-card__icon project-card__icon--tone-${index % TARGET_ICONS.length}`,
    selectClass: isSelected ? "project-card__select project-card__select--selected" : "project-card__select",
    iconSrc: TARGET_ICONS[index % TARGET_ICONS.length] || TARGET_ICONS[0] || "",
    searchText,
  };
}

function buildSelectionPatch(
  projects: ProjectView[],
  categories: CategoryView[],
  sourceSelectedIds: string[],
  activeCategoryId: string,
  searchText: string,
  canSave: boolean,
  submitting: boolean,
) {
  const selectedIds = canonicalizeSelection(sourceSelectedIds, projects);
  const selected = new Set(selectedIds);
  const presentedProjects = projects.map((project, index) => presentProject(project, project.groupIds, project.groupNames, index, selected.has(project.id)));
  const presentedCategories = presentCategories(categories, activeCategoryId);
  const visibleProjects = filterProjects(presentedProjects, activeCategoryId, searchText);
  const durationText = selectedDurationText(selectedIds, presentedProjects);
  const isConfirmDisabled = !canSave || submitting || selectedIds.length === 0;
  return {
    searchText,
    categories: presentedCategories,
    activeCategoryId,
    projects: presentedProjects,
    visibleProjects,
    hasVisibleProjects: visibleProjects.length > 0,
    selectedIds,
    selectedCount: selectedIds.length,
    durationText,
    summaryLabel: selectedSummaryLabel(selectedIds.length, durationText),
    isConfirmDisabled,
    confirmClass: isConfirmDisabled ? "select-bar__confirm select-bar__confirm--disabled" : "select-bar__confirm",
    confirmLabel: submitting ? "保存中" : `选择 (${selectedIds.length})`,
  };
}

function canonicalizeSelection(sourceIds: readonly string[], projects: ProjectView[]) {
  const requested = new Set(sourceIds);
  return projects.filter((project) => requested.has(project.id)).map((project) => project.id);
}

function sameSelection(expected: string[], actual: string[]) {
  return expected.length === actual.length && expected.every((id, index) => actual[index] === id);
}

function filterProjects(projects: ProjectView[], activeCategoryId: string, searchText: string) {
  const query = searchText.trim().toLowerCase();
  return projects.filter((project) => {
    const inCategory = activeCategoryId === "all" || project.groupIds.includes(activeCategoryId);
    return inCategory && (!query || project.searchText.includes(query));
  });
}

function presentCategories(source: Array<Pick<CategoryView, "id" | "label">>, activeCategoryId: string): CategoryView[] {
  const all = [{ id: "all", label: "全部" }, ...source.filter((category) => category.id !== "all")];
  const seen = new Set<string>();
  return all.filter((category) => {
    if (seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  }).map((category) => ({
    ...category,
    className: category.id === activeCategoryId ? "category-chip category-chip--active" : "category-chip",
  }));
}

function selectedDurationText(selectedIds: string[], projects: ProjectView[]) {
  if (!selectedIds.length) return "";
  const selected = new Set(selectedIds);
  const selectedProjects = projects.filter((project) => selected.has(project.id));
  const durations = selectedProjects.filter((project) => project.hasDuration).map((project) => project.durationMinutes || 0);
  const total = durations.reduce((sum, value) => sum + value, 0);
  if (durations.length === selectedProjects.length) return `约 ${total} 分钟`;
  if (durations.length > 0) return `已知 ${total} 分钟，部分时长待补充`;
  return "时长待补充";
}

function selectedSummaryLabel(selectedCount: number, durationText: string) {
  const countLabel = `已选 ${selectedCount} 项`;
  return durationText ? `${countLabel} · ${durationText}` : countLabel;
}

function isWritableTrainingWorkbench(workbench: CoachWorkbench, eventId: string) {
  return workbench.event.id === eventId && workbench.event.type === "training" && workbench.event.status !== "cancelled";
}
