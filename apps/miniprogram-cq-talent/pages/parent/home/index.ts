import { getContentArticles, getParentCalendar, getParentChildren, getParentGrowth } from "../../../utils/api";
import { getClubPresentation, defaultParentShortcuts, parentShortcutOptions, restoreParentShortcuts, saveParentShortcuts } from "../../../utils/club-presentation";
import type { ParentShortcut, ClubPresentation } from "../../../utils/club-presentation";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatTimeRange } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import { getTrainingRecords } from "../../../utils/training-records";
import type { ContentArticle, LoadState, ScheduleEvent, StudentSummary } from "../../../utils/types";

let generation = 0;

function formatMilestoneDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

/** L-02：辅助模块独立三态，不阻塞主体呈现 */
type ModuleState = "loading" | "ready" | "error";

Page({
  data: {
    state: "loading" as LoadState, message: "正在读取球员档案", children: [] as StudentSummary[],
    student: null as StudentSummary | null, showChildren: false, trainingTotal: 0,
    playerSlide: 0, milestoneDate: "", latestGrowthText: "成长正在发生",
    teamLabel: "", milestoneTitle: "成长正在发生", milestoneDescription: "完成训练和测评后，成长记录会在这里更新。",
    milestoneCount: "—", news: null as ContentArticle | null, nextEvent: null as ScheduleEvent | null, nextEventTime: "",
    clubTitle: "天才足球俱乐部", banner: null as ClubPresentation["banners"][number] | null,
    shortcuts: defaultParentShortcuts, shortcutOptions: [] as ParentShortcut[], editingShortcuts: false,
    shortcutDraft: [] as ParentShortcut[], shortcutSlots: [] as Array<{ index: number; label: string }>,
    shortcutMessage: "", contentMessage: "", activeShortcutSlot: 0,
    growthState: "loading" as ModuleState, growthMessage: "",
    newsState: "loading" as ModuleState, newsMessage: "",
    presentationState: "loading" as ModuleState,
  },
  onLoad() { void this.load(); },
  onShow() {
    const session = requireRole("parent");
    if (session && this.data.state !== "loading") void this.load();
  },
  onUnload() { generation++; },
  /**
   * L-02 分块呈现：核心 = 孩子列表/球员卡（含训练累计）+ 下一次训练；核心就绪即渲染主体。
   * 辅助 = 成长统计（growthState）、新闻/文章（newsState）、俱乐部展示（presentationState），
   * 与核心请求同时并行发出（并发上限不变），各自独立呈现、独立重试，失败只影响本模块。
   */
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const ticket = ++generation;
    this.setData({ state: "loading", message: "正在读取球员档案", showChildren: false, editingShortcuts: false,
      growthState: "loading", growthMessage: "", newsState: "loading", newsMessage: "",
      presentationState: "loading", contentMessage: "" });
    try {
      const children = await getParentChildren();
      if (ticket !== generation) return;
      const student = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!student) { this.setData({ state: "empty", message: "当前账号尚未绑定孩子，请联系俱乐部。", children, student: null }); return; }
      setCurrentStudentId(student.id);
      const core = Promise.all([getTrainingRecords(student.id), getParentCalendar()]).then(([training, events]) => {
        if (ticket !== generation) return;
        const nextEvent = events.filter((event) => event.type === "training" && event.status !== "cancelled"
          && Date.parse(event.startsAt) > Date.now() && event.childIds?.includes(student.id))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;
        this.setData({
          state: "ready", message: "", children, student,
          teamLabel: student.teams.filter(Boolean).join(" · ") || "队伍待同步",
          trainingTotal: training.total,
          nextEvent, nextEventTime: nextEvent ? formatTimeRange(nextEvent.startsAt, nextEvent.endsAt) : "",
        });
      });
      void this.loadGrowth(ticket, student);
      void this.loadNews(ticket);
      void this.loadPresentation(ticket);
      await core;
    } catch (error) {
      if (ticket !== generation) return;
      this.setData({ state: "error", message: (error as { message?: string }).message || "球员档案暂时无法读取，请重试。" });
    }
  },
  async loadGrowth(ticket: number, student: StudentSummary) {
    this.setData({ growthState: "loading", growthMessage: "" });
    try {
      const growth = await getParentGrowth(student.id, student);
      if (ticket !== generation) return;
      const milestone = growth.milestones[0];
      const milestoneTitle = milestone?.title || "成长正在发生";
      const milestoneDate = milestone?.date ? formatMilestoneDate(milestone.date) : "";
      this.setData({ growthState: "ready",
        milestoneCount: growth.milestonesAvailable ? String(growth.milestones.length) : "—",
        milestoneTitle, milestoneDescription: milestone?.description || "完成训练和测评后，成长记录会在这里更新。",
        milestoneDate, latestGrowthText: milestoneDate ? `${milestoneTitle} · ${milestoneDate}` : milestoneTitle });
    } catch (error) {
      if (ticket !== generation) return;
      this.setData({ growthState: "error", growthMessage: (error as { message?: string }).message || "成长统计暂时无法读取，请稍后重试。" });
    }
  },
  async loadNews(ticket: number) {
    this.setData({ newsState: "loading", newsMessage: "" });
    try {
      const articles = await getContentArticles();
      if (ticket !== generation) return;
      this.setData({ newsState: "ready", news: articles.find((article) => article.category === "notice") ?? articles[0] ?? null });
    } catch (error) {
      if (ticket !== generation) return;
      this.setData({ newsState: "error", newsMessage: (error as { message?: string }).message || "俱乐部动态暂时无法读取，请稍后重试。" });
    }
  },
  async loadPresentation(ticket: number) {
    this.setData({ presentationState: "loading", contentMessage: "" });
    try {
      const presentation = await getClubPresentation();
      if (ticket !== generation) return;
      const options = parentShortcutOptions(presentation ?? { branding: null, banners: [], shareTemplates: [], optionalFeatures: [] });
      this.setData({ presentationState: "ready", contentMessage: "",
        clubTitle: presentation?.branding?.name || "天才足球俱乐部", banner: presentation?.banners[0] ?? null,
        shortcuts: restoreParentShortcuts(options), shortcutOptions: options });
    } catch {
      if (ticket !== generation) return;
      this.setData({ presentationState: "error", contentMessage: "俱乐部展示配置暂时无法读取，请稍后重试。" });
    }
  },
  retry() { void this.load(); },
  retryGrowth() {
    const student = this.data.student;
    if (!student || this.data.state !== "ready") return;
    void this.loadGrowth(generation, student);
  },
  retryNews() { if (this.data.state === "ready") void this.loadNews(generation); },
  retryContent() { if (this.data.state === "ready") void this.loadPresentation(generation); },
  onSlideChange(event: { detail: { current: number } }) { this.setData({ playerSlide: event.detail.current }); },
  toggleChildren() { this.setData({ showChildren: !this.data.showChildren }); },
  switchChild(event: { detail: { studentId: string } }) {
    if (!this.data.children.some((child: StudentSummary) => child.id === event.detail.studentId)) return;
    setCurrentStudentId(event.detail.studentId);
    void this.load();
  },
  openShortcut(event: { currentTarget: { dataset: { key?: string } } }) {
    const shortcut = this.data.shortcuts.find((item: { key: string; path: string }) => item.key === event.currentTarget.dataset.key);
    if (shortcut) openPage(shortcut.key === "results" && this.data.student ? `${shortcut.path}?student=${encodeURIComponent(this.data.student.id)}` : shortcut.path);
  },
  openNews() { if (this.data.banner) { openPage(this.data.banner.articleId ? `/pages/parent/article/index?id=${encodeURIComponent(this.data.banner.articleId)}` : "/pages/parent/content/index"); return; } openPage(this.data.news ? `/pages/parent/article/index?id=${encodeURIComponent(this.data.news.id)}` : "/pages/parent/content/index"); },
  editShortcuts() {
    if (this.data.state !== "ready" || this.data.presentationState !== "ready") return;
    const draft = [...this.data.shortcuts];
    this.setData({ editingShortcuts: true, shortcutDraft: draft, activeShortcutSlot: 0, shortcutMessage: "", shortcutSlots: draft.map((item, index) => ({ index, label: item.label })) });
  },
  selectShortcutSlot(event: { detail: { value: string } }) { this.setData({ activeShortcutSlot: Number(event.detail.value) }); },
  chooseShortcut(event: { currentTarget: { dataset: { key?: string } } }) {
    const chosen = this.data.shortcutOptions.find((item: ParentShortcut) => item.key === event.currentTarget.dataset.key);
    if (!chosen || !this.data.editingShortcuts) return;
    const draft = [...this.data.shortcutDraft], slot = this.data.activeShortcutSlot;
    const old = draft.findIndex((item: ParentShortcut) => item.key === chosen.key);
    if (old >= 0) draft[old] = draft[slot];
    draft[slot] = chosen;
    this.setData({ shortcutDraft: draft, shortcutMessage: "", shortcutSlots: draft.map((item, index) => ({ index, label: item.label })) });
  },
  saveShortcuts() {
    try { const shortcuts = saveParentShortcuts(this.data.shortcutDraft.map((item: ParentShortcut) => item.key), this.data.shortcutOptions); this.setData({ shortcuts, editingShortcuts: false }); }
    catch (error) { this.setData({ shortcutMessage: (error as Error).message || "配置保存失败，已保留选择。" }); }
  },
  cancelShortcuts() { this.setData({ editingShortcuts: false }); },
  openGrowth() { openPage("/pages/parent/growth/index"); },
  openNextEvent() { if (this.data.nextEvent) openPage(`/pages/parent/event/index?id=${encodeURIComponent(this.data.nextEvent.id)}`); },
  openSchedule() { openPage("/pages/parent/schedule/index"); },
});
