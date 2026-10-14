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
Page({
  data: {
    state: "loading" as LoadState, message: "正在读取球员档案", children: [] as StudentSummary[],
    student: null as StudentSummary | null, showChildren: false, trainingTotal: 0,
    teamLabel: "", milestoneTitle: "成长正在发生", milestoneDescription: "完成训练和测评后，成长记录会在这里更新。",
    milestoneCount: "—", news: null as ContentArticle | null, nextEvent: null as ScheduleEvent | null, nextEventTime: "",
    clubTitle: "天才足球俱乐部", banner: null as ClubPresentation["banners"][number] | null,
    shortcuts: defaultParentShortcuts, shortcutOptions: [] as ParentShortcut[], editingShortcuts: false,
    shortcutDraft: [] as ParentShortcut[], shortcutSlots: [] as Array<{ index: number; label: string }>,
    shortcutMessage: "", contentMessage: "", activeShortcutSlot: 0,
  },
  onLoad() { void this.load(); },
  onShow() {
    const session = requireRole("parent");
    if (session && this.data.state !== "loading") void this.load();
  },
  onUnload() { generation++; },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const ticket = ++generation;
    this.setData({ state: "loading", message: "正在读取球员档案", showChildren: false, editingShortcuts: false });
    try {
      const children = await getParentChildren();
      if (ticket !== generation) return;
      const student = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!student) { this.setData({ state: "empty", message: "当前账号尚未绑定孩子，请联系俱乐部。", children, student: null }); return; }
      setCurrentStudentId(student.id);
      const responses = await Promise.all([
        getTrainingRecords(student.id), getParentGrowth(student.id, student), getContentArticles(), getParentCalendar(),
        getClubPresentation().then(presentation => ({ presentation, error: "" })).catch(() => ({ presentation: null, error: "俱乐部展示配置暂时无法读取，请稍后重试。" })),
      ]);
      if (ticket !== generation) return;
      const training = responses[0], growth = responses[1], articles = responses[2], events = responses[3], content = responses[4];
      const presentation = content.presentation;
      const options = parentShortcutOptions(presentation ?? { branding: null, banners: [], shareTemplates: [], optionalFeatures: [] });
      const milestone = growth.milestones[0];
      const nextEvent = events.filter((event) => event.type === "training" && event.status !== "cancelled"
        && Date.parse(event.startsAt) > Date.now() && event.childIds?.includes(student.id))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;
      this.setData({
        state: "ready", message: "", children, student,
        clubTitle: presentation?.branding?.name || "天才足球俱乐部", banner: presentation?.banners[0] ?? null,
        shortcuts: restoreParentShortcuts(options), shortcutOptions: options, contentMessage: content.error, teamLabel: student.teams.filter(Boolean).join(" · ") || "队伍待同步",
        trainingTotal: training.total, milestoneCount: growth.milestonesAvailable ? String(growth.milestones.length) : "—",
        milestoneTitle: milestone?.title || "成长正在发生", milestoneDescription: milestone?.description || "完成训练和测评后，成长记录会在这里更新。",
        news: articles.find((article) => article.category === "notice") ?? articles[0] ?? null,
        nextEvent, nextEventTime: nextEvent ? formatTimeRange(nextEvent.startsAt, nextEvent.endsAt) : "",
      });
    } catch (error) {
      if (ticket !== generation) return;
      this.setData({ state: "error", message: (error as { message?: string }).message || "球员档案暂时无法读取，请重试。" });
    }
  },
  retry() { void this.load(); },
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
    if (this.data.state !== "ready" || this.data.contentMessage) return;
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
