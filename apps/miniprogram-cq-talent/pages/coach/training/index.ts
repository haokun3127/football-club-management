import { getCoachHome, getCoachTrainingProjectTree, getCoachWorkbench, saveCoachTrainingProjects } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachHome, CoachWorkbench, LoadState, TrainingProjectTree } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取训练管理",
    home: null as CoachHome | null,
    teamsText: "",
    workbench: null as CoachWorkbench | null,
    projectTree: null as TrainingProjectTree | null,
    selectedProjectIds: [] as string[],
    selectedProjectMap: {} as Record<string, boolean>,
    savingProjects: false,
    projectNote: "",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取训练管理" });
    try {
      const home = await getCoachHome();
      const firstEvent = home.events.find((event) => event.type === "training") ?? home.events[0];
      const workbench = firstEvent ? await getCoachWorkbench(firstEvent.id) : null;
      const projectTree = await getCoachTrainingProjectTree();
      this.setData({
        state: "ready",
        message: "",
        home,
        teamsText: home.teams.length ? home.teams.join("、") : "负责球队接口待同步",
        workbench,
        projectTree,
        selectedProjectIds: [],
        selectedProjectMap: {},
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  openTestEntry() {
    const eventId = this.data.workbench?.event.id || "";
    const templateId = this.data.workbench?.assessmentTemplateId || "";
    openPage(`/pages/coach/test-entry/index?eventId=${eventId}&templateId=${templateId}`);
  },
  toggleProject(event: { currentTarget: { dataset: Record<string, unknown> } }) {
    const projectId = String(event.currentTarget.dataset.id ?? "");
    if (!projectId) return;
    const selected = new Set(this.data.selectedProjectIds as string[]);
    if (selected.has(projectId)) {
      selected.delete(projectId);
    } else {
      selected.add(projectId);
    }
    const selectedProjectIds = Array.from(selected);
    this.setData({
      selectedProjectIds,
      selectedProjectMap: selectedProjectIds.reduce<Record<string, boolean>>((map, id) => {
        map[id] = true;
        return map;
      }, {} as Record<string, boolean>),
    });
  },
  onProjectNoteInput(event: { detail: { value: string } }) {
    this.setData({ projectNote: event.detail.value });
  },
  async saveProjects() {
    const eventId = this.data.workbench?.event.id;
    if (!eventId || this.data.savingProjects) return;
    if (!this.data.selectedProjectIds.length) {
      wx.showToast({ title: "请选择训练项目", icon: "none" });
      return;
    }
    this.setData({ savingProjects: true });
    try {
      await saveCoachTrainingProjects(eventId, this.data.selectedProjectIds, this.data.projectNote || "重庆天才小程序教练端训练内容选择");
      wx.showToast({ title: "训练内容已保存", icon: "success" });
      const workbench = await getCoachWorkbench(eventId);
      this.setData({ workbench });
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

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "训练管理读取失败。";
}
