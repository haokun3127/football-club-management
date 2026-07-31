import { getCoachHome, getCoachTrainingProjectTree, getCoachWorkbench, saveCoachTrainingProjects } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeRange, resolveNavInset } from "../../../utils/presentation";
import type { CoachHome, CoachWorkbench, LoadState, ScheduleEvent, TrainingProject, TrainingProjectGroup, TrainingProjectTree } from "../../../utils/types";

type TrainingEventOption = ScheduleEvent & { displayTime: string };

Page({
  data: {
    navInset: resolveNavInset(),
    state: "loading" as LoadState,
    message: "正在读取训练管理",
    home: null as CoachHome | null,
    teamsText: "",
    eventOptions: [] as TrainingEventOption[],
    eventIndex: 0,
    workbench: null as CoachWorkbench | null,
    projectTree: null as TrainingProjectTree | null,
    filteredGroups: [] as TrainingProjectGroup[],
    expandedGroupMap: {} as Record<string, boolean>,
    selectedProjectIds: [] as string[],
    selectedProjectMap: {} as Record<string, boolean>,
    selectedProjects: [] as TrainingProject[],
    savingProjects: false,
    projectNote: "",
    searchText: "",
    requestedEventId: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    this.setData({ requestedEventId: query?.eventId || "" });
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取训练管理" });
    try {
      const home = await getCoachHome();
      const eventOptions = home.events.filter((event) => event.type === "training").map((event) => ({
        ...event,
        displayTime: `${formatCalendarDate(event.startsAt)} · ${formatTimeRange(event.startsAt, event.endsAt)}`,
      }));
      const requestedIndex = eventOptions.findIndex((event) => event.id === this.data.requestedEventId);
      const eventIndex = requestedIndex >= 0 ? requestedIndex : 0;
      const selectedEvent = eventOptions[eventIndex];
      const [workbench, projectTree] = await Promise.all([
        selectedEvent ? getCoachWorkbench(selectedEvent.id) : Promise.resolve(null),
        getCoachTrainingProjectTree(),
      ]);
      const selectedProjectIds = workbench?.selectedTrainingProjectIds ?? [];
      const selectedProjectMap = toSelectionMap(selectedProjectIds);
      this.setData({
        state: selectedEvent ? "ready" : "empty",
        message: selectedEvent ? "" : "当前日期没有可编辑的训练活动。",
        home,
        teamsText: home.teams.length ? home.teams.join("、") : "暂无负责球队",
        eventOptions,
        eventIndex,
        workbench,
        projectTree,
        filteredGroups: projectTree.groups,
        expandedGroupMap: projectTree.groups[0] ? { [projectTree.groups[0].id]: true } : {},
        selectedProjectIds,
        selectedProjectMap,
        selectedProjects: projectTree.projects.filter((project) => selectedProjectMap[project.id]),
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  async onEventChange(event: { detail: { value: string | number } }) {
    const eventIndex = Number(event.detail.value);
    const selectedEvent = this.data.eventOptions[eventIndex];
    if (!selectedEvent) return;
    this.setData({ eventIndex, requestedEventId: selectedEvent.id });
    await this.load();
  },
  async selectSession(event: { currentTarget: { dataset: { index?: string | number } } }) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;
    await this.onEventChange({ detail: { value: index } });
  },
  openTestEntry() {
    const eventId = this.data.workbench?.event.id || "";
    const templateId = this.data.workbench?.assessmentTemplateId || "";
    openPage(`/pages/coach/test-entry/index?eventId=${eventId}&templateId=${templateId}`);
  },
  openContentSelect() {
    const eventId = this.data.workbench?.event.id || "";
    openPage(`/pages/coach/content-select/index?eventId=${eventId}`);
  },
  toggleGroup(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    this.setData({ expandedGroupMap: { ...this.data.expandedGroupMap, [id]: !this.data.expandedGroupMap[id] } });
  },
  onSearchInput(event: { detail: { value: string } }) {
    const searchText = event.detail.value;
    const keyword = searchText.trim().toLowerCase();
    const groups = this.data.projectTree?.groups ?? [];
    const filteredGroups = keyword
      ? groups.map((group: TrainingProjectGroup) => ({
        ...group,
        projects: group.projects.filter((project: TrainingProject) => `${project.name} ${project.description ?? ""} ${project.tags.join(" ")}`.toLowerCase().includes(keyword)),
      })).filter((group: TrainingProjectGroup) => group.projects.length)
      : groups;
    const expandedGroupMap: Record<string, boolean> = keyword ? {} : this.data.expandedGroupMap;
    if (keyword) {
      (filteredGroups as TrainingProjectGroup[]).forEach((group) => {
        expandedGroupMap[group.id] = true;
      });
    }
    this.setData({ searchText, filteredGroups, expandedGroupMap });
  },
  toggleProject(event: { currentTarget: { dataset: Record<string, unknown> } }) {
    const projectId = String(event.currentTarget.dataset.id ?? "");
    if (!projectId) return;
    const selected = new Set(this.data.selectedProjectIds as string[]);
    selected.has(projectId) ? selected.delete(projectId) : selected.add(projectId);
    const selectedProjectIds = Array.from(selected);
    const selectedProjectMap = toSelectionMap(selectedProjectIds);
    this.setData({
      selectedProjectIds,
      selectedProjectMap,
      selectedProjects: (this.data.projectTree?.projects ?? []).filter((project: TrainingProject) => selectedProjectMap[project.id]),
    });
  },
  onProjectNoteInput(event: { detail: { value: string } }) {
    this.setData({ projectNote: event.detail.value });
  },
  async saveProjects() {
    const eventId = this.data.workbench?.event.id;
    if (!eventId || this.data.savingProjects) return;
    if (!this.data.selectedProjectIds.length) {
      wx.showToast({ title: "请至少选择一个训练项目", icon: "none" });
      return;
    }
    this.setData({ savingProjects: true });
    try {
      await saveCoachTrainingProjects(eventId, this.data.selectedProjectIds, this.data.projectNote || undefined);
      const workbench = await getCoachWorkbench(eventId);
      const selectedProjectMap = toSelectionMap(workbench.selectedTrainingProjectIds);
      this.setData({
        workbench,
        selectedProjectIds: workbench.selectedTrainingProjectIds,
        selectedProjectMap,
        selectedProjects: (this.data.projectTree?.projects ?? []).filter((project: TrainingProject) => selectedProjectMap[project.id]),
      });
      wx.showToast({ title: "训练内容已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
    } finally {
      this.setData({ savingProjects: false });
    }
  },
  retry() {
    this.load();
  },
});

function toSelectionMap(ids: string[]) {
  return ids.reduce<Record<string, boolean>>((map, id) => {
    map[id] = true;
    return map;
  }, {});
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "训练管理读取失败。";
}
