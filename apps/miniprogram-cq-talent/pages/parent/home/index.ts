import {
  getContentArticles,
  getParentCalendar,
  getParentChildren,
  getParentGrowth,
} from "../../../utils/api";
import {
  getClubPresentation,
  defaultParentShortcuts,
  parentShortcutOptions,
  restoreParentShortcuts,
  saveParentShortcuts,
} from "../../../utils/club-presentation";
import type {
  ParentShortcut,
  ClubPresentation,
} from "../../../utils/club-presentation";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import {
  activityTypeLabel,
  formatCalendarDate,
  formatTimeRange,
} from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import { getTrainingRecords } from "../../../utils/training-records";
import type {
  ContentArticle,
  LoadState,
  ScheduleEvent,
  StudentSummary,
} from "../../../utils/types";

function formatMilestoneDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

/** L-02：辅助模块独立三态，不阻塞主体呈现 */
type ModuleState = "loading" | "ready" | "error";

Page({
  generation: 0,
  trainingRequest: 0,
  calendarRequest: 0,
  data: {
    state: "loading" as LoadState,
    message: "正在读取球员档案",
    children: [] as StudentSummary[],
    student: null as StudentSummary | null,
    showChildren: false,
    trainingTotal: null as number | null,
    trainingState: "loading" as ModuleState,
    trainingMessage: "",
    calendarState: "loading" as ModuleState,
    calendarMessage: "",
    nextEventHeading: "下一项活动",
    nextEventType: "",
    playerSlide: 0,
    milestoneDate: "",
    latestGrowthText: "成长正在发生",
    teamLabel: "",
    milestoneTitle: "成长正在发生",
    milestoneDescription: "完成训练和测评后，成长记录会在这里更新。",
    milestoneCount: "—",
    news: null as ContentArticle | null,
    nextEvent: null as ScheduleEvent | null,
    nextEventTime: "",
    clubTitle: "天才足球俱乐部",
    banner: null as ClubPresentation["banners"][number] | null,
    shortcuts: defaultParentShortcuts,
    shortcutOptions: [] as ParentShortcut[],
    editingShortcuts: false,
    shortcutDraft: [] as ParentShortcut[],
    shortcutSlots: [] as Array<{ index: number; label: string }>,
    shortcutMessage: "",
    contentMessage: "",
    activeShortcutSlot: 0,
    growthState: "loading" as ModuleState,
    growthMessage: "",
    newsState: "loading" as ModuleState,
    newsMessage: "",
    presentationState: "loading" as ModuleState,
  },
  onLoad() {
    void this.load();
  },
  onShow() {
    const session = requireRole("parent");
    if (session && this.data.state !== "loading") void this.load();
  },
  onUnload() {
    this.generation++;
  },
  /** 孩子档案就绪即可操作；安排、累计、成长和展示各自读取与重试。 */
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const ticket = ++this.generation;
    this.setData({
      state: "loading", message: "正在读取球员档案", student: null,
      showChildren: false, editingShortcuts: false,
      trainingTotal: null, trainingState: "loading", trainingMessage: "",
      nextEvent: null, nextEventTime: "", nextEventType: "",
      calendarState: "loading", calendarMessage: "", nextEventHeading: "下一项活动",
      growthState: "loading", growthMessage: "", milestoneCount: "—",
      newsState: "loading", newsMessage: "", news: null,
      presentationState: "loading", contentMessage: "",
    });
    try {
      const children = await getParentChildren();
      if (ticket !== this.generation) return;
      const student = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!student) {
        this.setData({ state: "empty", message: "当前账号尚未绑定孩子，请联系俱乐部。", children, student: null });
        return;
      }
      setCurrentStudentId(student.id);
      this.setData({ state: "ready", message: "", children, student,
        teamLabel: student.teams.filter(Boolean).join(" · ") || "队伍待同步" });
      void this.loadGrowth(ticket, student);
      void this.loadNews(ticket);
      void this.loadPresentation(ticket);
      await Promise.all([this.loadTraining(ticket, student), this.loadCalendar(ticket, student)]);
    } catch (error) {
      if (ticket !== this.generation) return;
      this.setData({ state: "error", message: (error as { message?: string }).message || "球员档案暂时无法读取，请重试。" });
    }
  },
  async loadTraining(ticket: number, student: StudentSummary) {
    const request = ++this.trainingRequest;
    this.setData({ trainingState: "loading", trainingMessage: "", trainingTotal: null });
    try {
      const training = await getTrainingRecords(student.id);
      if (ticket !== this.generation || request !== this.trainingRequest || student.id !== this.data.student?.id) return;
      this.setData({ trainingState: "ready", trainingTotal: training.total });
    } catch (error) {
      if (ticket !== this.generation || request !== this.trainingRequest) return;
      this.setData({ trainingState: "error", trainingMessage: (error as Error).message || "训练累计暂时无法读取，请重试。" });
    }
  },
  async loadCalendar(ticket: number, student: StudentSummary) {
    const request = ++this.calendarRequest;
    this.setData({ calendarState: "loading", calendarMessage: "", nextEvent: null, nextEventTime: "" });
    try {
      const events = await getParentCalendar();
      if (ticket !== this.generation || request !== this.calendarRequest || student.id !== this.data.student?.id) return;
      const now = Date.now();
      const nextEvent = events.filter(event => {
        const start = Date.parse(event.startsAt), end = Date.parse(event.endsAt || "");
        return event.childIds?.includes(student.id) && event.status !== "cancelled" && event.status !== "completed"
          && Number.isFinite(start) && (start > now || end > now || (!Number.isFinite(end) && event.status === "in_progress"));
      }).sort((a, b) => {
        const aStart = Date.parse(a.startsAt), bStart = Date.parse(b.startsAt);
        return Number(aStart > now) - Number(bStart > now) || aStart - bStart || a.id.localeCompare(b.id);
      })[0] ?? null;
      this.setData({ calendarState: "ready", nextEvent,
        nextEventHeading: nextEvent && Date.parse(nextEvent.startsAt) <= now ? "进行中的活动" : "下一项活动",
        nextEventType: nextEvent ? activityTypeLabel(nextEvent.type) : "",
        nextEventTime: nextEvent ? `${formatCalendarDate(nextEvent.startsAt, true)} · ${formatTimeRange(nextEvent.startsAt, nextEvent.endsAt)}` : "" });
    } catch (error) {
      if (ticket !== this.generation || request !== this.calendarRequest) return;
      this.setData({ calendarState: "error", calendarMessage: (error as Error).message || "活动安排暂时无法读取，请重试。" });
    }
  },
  retryTraining() {
    if (this.data.state === "ready" && this.data.student) void this.loadTraining(this.generation, this.data.student);
  },
  retryCalendar() {
    if (this.data.state === "ready" && this.data.student) void this.loadCalendar(this.generation, this.data.student);
  },
  async loadGrowth(ticket: number, student: StudentSummary) {
    this.setData({ growthState: "loading", growthMessage: "" });
    try {
      const growth = await getParentGrowth(student.id, student);
      if (ticket !== this.generation) return;
      const milestone = growth.milestones[0];
      const milestoneTitle = milestone?.title || "成长正在发生";
      const milestoneDate = milestone?.date
        ? formatMilestoneDate(milestone.date)
        : "";
      this.setData({
        growthState: "ready",
        milestoneCount: growth.milestonesAvailable
          ? String(growth.milestones.length)
          : "—",
        milestoneTitle,
        milestoneDescription:
          milestone?.description || "完成训练和测评后，成长记录会在这里更新。",
        milestoneDate,
        latestGrowthText: milestoneDate
          ? `${milestoneTitle} · ${milestoneDate}`
          : milestoneTitle,
      });
    } catch (error) {
      if (ticket !== this.generation) return;
      this.setData({
        growthState: "error",
        growthMessage:
          (error as { message?: string }).message ||
          "成长统计暂时无法读取，请稍后重试。",
      });
    }
  },
  async loadNews(ticket: number) {
    this.setData({ newsState: "loading", newsMessage: "" });
    try {
      const articles = await getContentArticles();
      if (ticket !== this.generation) return;
      this.setData({
        newsState: "ready",
        news:
          articles.find((article) => article.category === "notice") ??
          articles[0] ??
          null,
      });
    } catch (error) {
      if (ticket !== this.generation) return;
      this.setData({
        newsState: "error",
        newsMessage:
          (error as { message?: string }).message ||
          "俱乐部动态暂时无法读取，请稍后重试。",
      });
    }
  },
  async loadPresentation(ticket: number) {
    this.setData({ presentationState: "loading", contentMessage: "" });
    try {
      const presentation = await getClubPresentation();
      if (ticket !== this.generation) return;
      const options = parentShortcutOptions(
        presentation ?? {
          branding: null,
          banners: [],
          shareTemplates: [],
          optionalFeatures: [],
        },
      );
      this.setData({
        presentationState: "ready",
        contentMessage: "",
        clubTitle: presentation?.branding?.name || "天才足球俱乐部",
        banner: presentation?.banners[0] ?? null,
        shortcuts: restoreParentShortcuts(options),
        shortcutOptions: options,
      });
    } catch {
      if (ticket !== this.generation) return;
      this.setData({
        presentationState: "error",
        contentMessage: "俱乐部展示配置暂时无法读取，请稍后重试。",
      });
    }
  },
  retry() {
    void this.load();
  },
  retryGrowth() {
    const student = this.data.student;
    if (!student || this.data.state !== "ready") return;
    void this.loadGrowth(this.generation, student);
  },
  retryNews() {
    if (this.data.state === "ready") void this.loadNews(this.generation);
  },
  retryContent() {
    if (this.data.state === "ready") void this.loadPresentation(this.generation);
  },
  onSlideChange(event: { detail: { current: number } }) {
    this.setData({ playerSlide: event.detail.current });
  },
  toggleChildren() {
    this.setData({ showChildren: !this.data.showChildren });
  },
  switchChild(event: { detail: { studentId: string } }) {
    if (
      !this.data.children.some(
        (child: StudentSummary) => child.id === event.detail.studentId,
      )
    )
      return;
    setCurrentStudentId(event.detail.studentId);
    void this.load();
  },
  openShortcut(event: { currentTarget: { dataset: { key?: string } } }) {
    const shortcut = this.data.shortcuts.find(
      (item: { key: string; path: string }) =>
        item.key === event.currentTarget.dataset.key,
    );
    if (shortcut)
      openPage(
        shortcut.key === "results" && this.data.student
          ? `${shortcut.path}?student=${encodeURIComponent(this.data.student.id)}`
          : shortcut.path,
      );
  },
  openNews() {
    if (this.data.banner) {
      openPage(
        this.data.banner.articleId
          ? `/pages/parent/article/index?id=${encodeURIComponent(this.data.banner.articleId)}`
          : "/pages/parent/content/index",
      );
      return;
    }
    openPage(
      this.data.news
        ? `/pages/parent/article/index?id=${encodeURIComponent(this.data.news.id)}`
        : "/pages/parent/content/index",
    );
  },
  editShortcuts() {
    if (this.data.state !== "ready" || this.data.presentationState !== "ready")
      return;
    const draft = [...this.data.shortcuts];
    this.setData({
      editingShortcuts: true,
      shortcutDraft: draft,
      activeShortcutSlot: 0,
      shortcutMessage: "",
      shortcutSlots: draft.map((item, index) => ({ index, label: item.label })),
    });
  },
  selectShortcutSlot(event: { detail: { value: string } }) {
    this.setData({ activeShortcutSlot: Number(event.detail.value) });
  },
  chooseShortcut(event: { currentTarget: { dataset: { key?: string } } }) {
    const chosen = this.data.shortcutOptions.find(
      (item: ParentShortcut) => item.key === event.currentTarget.dataset.key,
    );
    if (!chosen || !this.data.editingShortcuts) return;
    const draft = [...this.data.shortcutDraft],
      slot = this.data.activeShortcutSlot;
    const old = draft.findIndex(
      (item: ParentShortcut) => item.key === chosen.key,
    );
    if (old >= 0) draft[old] = draft[slot];
    draft[slot] = chosen;
    this.setData({
      shortcutDraft: draft,
      shortcutMessage: "",
      shortcutSlots: draft.map((item, index) => ({ index, label: item.label })),
    });
  },
  saveShortcuts() {
    try {
      const shortcuts = saveParentShortcuts(
        this.data.shortcutDraft.map((item: ParentShortcut) => item.key),
        this.data.shortcutOptions,
      );
      this.setData({ shortcuts, editingShortcuts: false });
    } catch (error) {
      this.setData({
        shortcutMessage:
          (error as Error).message || "配置保存失败，已保留选择。",
      });
    }
  },
  cancelShortcuts() {
    this.setData({ editingShortcuts: false });
  },
  openGrowth() {
    openPage("/pages/parent/growth/index");
  },
  openNextEvent() {
    if (this.data.nextEvent)
      openPage(
        `/pages/parent/event/index?id=${encodeURIComponent(this.data.nextEvent.id)}&studentId=${encodeURIComponent(this.data.student!.id)}`,
      );
  },
  openSchedule() {
    openPage("/pages/parent/schedule/index");
  },
});
