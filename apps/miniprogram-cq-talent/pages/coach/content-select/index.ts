import { getCoachTrainingProjectTree, saveCoachTrainingProjects } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { LoadState, TrainingProject } from "../../../utils/types";

interface ProjectCard extends TrainingProject {
  difficultyLabel: string;
  durationLabel: string;
}

interface PageData {
  state: LoadState;
  message: string;
  eventId: string;
  searchText: string;
  categories: string[];
  activeCategory: string;
  projects: ProjectCard[];
  visibleProjects: ProjectCard[];
  selectedMap: Record<string, boolean>;
  selectedCount: number;
  submitting: boolean;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
};

function filterProjects(projects: ProjectCard[], category: string, searchText: string) {
  const query = searchText.trim().toLowerCase();
  return projects.filter((project) => {
    const categoryMatches = category === "全部" || project.tags.includes(category);
    const searchMatches = !query || project.name.toLowerCase().includes(query);
    return categoryMatches && searchMatches;
  });
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    eventId: "",
    searchText: "",
    categories: ["全部"],
    activeCategory: "全部",
    projects: [],
    visibleProjects: [],
    selectedMap: {},
    selectedCount: 0,
    submitting: false,
  },
  onLoad(query: { eventId?: string }) {
    this.load(query?.eventId || "");
  },
  async load(eventId: string) {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取训练项目库", eventId });
    try {
      const tree = await getCoachTrainingProjectTree();
      const categories = ["全部", ...tree.groups.map((group) => group.name)];
      const projects: ProjectCard[] = tree.groups.flatMap((group) =>
        group.projects.map((project) => ({
          ...project,
          tags: [...project.tags, group.name],
          difficultyLabel: DIFFICULTY_LABELS[project.difficulty || ""] || project.difficulty || "",
          durationLabel: project.durationMinutes ? `${project.durationMinutes}分钟` : "",
        })),
      );
      // 去重（同一项目可能出现在多个分组）
      const seen = new Set<string>();
      const uniqueProjects = projects.filter((project) => {
        if (seen.has(project.id)) return false;
        seen.add(project.id);
        return true;
      });
      this.setData({
        state: uniqueProjects.length ? "ready" : "empty",
        message: uniqueProjects.length ? "" : "当前还没有可选训练项目。",
        categories,
        projects: uniqueProjects,
        visibleProjects: uniqueProjects,
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "训练项目读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  onSearchInput(event: { detail: { value: string } }) {
    const searchText = event.detail.value;
    this.setData({ searchText, visibleProjects: filterProjects(this.data.projects, this.data.activeCategory, searchText) });
  },
  selectCategory(event: { currentTarget: { dataset: { name: string } } }) {
    const activeCategory = event.currentTarget.dataset.name;
    this.setData({ activeCategory, visibleProjects: filterProjects(this.data.projects, activeCategory, this.data.searchText) });
  },
  toggleProject(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    const selectedMap = { ...this.data.selectedMap, [id]: !this.data.selectedMap[id] };
    const selectedCount = Object.values(selectedMap).filter(Boolean).length;
    this.setData({ selectedMap, selectedCount });
  },
  openCoverage() {
    openPage("/pages/coach/coverage/index");
  },
  async confirmSelection() {
    if (this.data.submitting) return;
    const selectedIds = Object.keys(this.data.selectedMap).filter((id) => this.data.selectedMap[id]);
    if (!selectedIds.length) {
      wx.showToast({ title: "请先选择训练项目", icon: "none" });
      return;
    }
    if (!this.data.eventId) {
      wx.showToast({ title: `已选 ${selectedIds.length} 项（未关联活动）`, icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      await saveCoachTrainingProjects(this.data.eventId, selectedIds);
      wx.showToast({ title: "已保存到活动", icon: "success" });
      wx.navigateBack({ delta: 1 });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error instanceof Error ? error.message : "保存失败，请稍后重试", icon: "none" });
    }
  },
});
