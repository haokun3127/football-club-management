import { environmentStorageKey } from "../../../utils/config";
import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { calendarDateKey, currentLocalDate } from "../../../utils/date";
import { openPage, openTab } from "../../../utils/navigation";
import { activityStatus, formatCalendarDate, formatTimeOnly, resolveMenuInset, resolveNavInset, resolveTopBarHeight } from "../../../utils/presentation";
import type { CoachHome, CoachTask, CoachTaskAction, LoadState, ScheduleEvent } from "../../../utils/types";

const initialDate = currentLocalDate();
const loadVersions = new WeakMap<object, number>();
const selectionOwners = new WeakMap<object, string>();

type Filter = "all" | "training" | "match" | "pending";
type ViewMode = "day" | "month";

type CoachEventView = ScheduleEvent & {
  startTime: string;
  durationText: string;
  hasDuration: boolean;
  statusLabel: string;
  statusTone: string;
  typeLabel: string;
  typeTone: string;
  cardTone: "training" | "match" | "other";
  typeColor: string;
  locationLabel: string;
  hasLocationDetail: boolean;
  hasTeamName: boolean;
  hasVenue: boolean;
  hasNextAction: boolean;
};

type CoachTaskView = CoachTask & {
  hasDueAt: boolean;
  dueLabel: string;
};

type HeroPillView = {
  value: string;
  label: string;
  tone: "primary" | "neutral";
};

Page({
  data: {
    navInset: resolveNavInset(),
    topBarHeight: resolveTopBarHeight(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取教练日程",
    home: null as CoachHome | null,
    clubName: "俱乐部",
    teamOptions: [] as Array<{id: string; name: string; selected: boolean}>,
    selectedTeamIds: [] as string[],
    allTeamsSelected: true,
    hasTeamOptions:false,
    showTeamPicker:false,
    taskCount:0,
    date: initialDate,
    viewMode: "day" as ViewMode,
    activeFilter: "all" as Filter,
    coachName: "",
    coachInitial: "",
    hasCoachInitial: false,
    eventViews: [] as CoachEventView[],
    visibleEvents: [] as CoachEventView[],
    hasVisibleEvents: false,
    taskCards: [] as CoachTaskView[],
    hasTaskCards: false,
    heroEvent: null as CoachEventView | null,
    hasHeroEvent: false,
    heroDateLabel: "",
    heroKindLabel: "",
    heroPills: [] as HeroPillView[],
  },
  onLoad() {
    this.load();
  },
  onShow() {
    if (this.data.state === "ready" || this.data.state === "empty") this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    const version = (loadVersions.get(this) ?? 0) + 1; loadVersions.set(this, version);
    const range = monthWindow(this.data.date);
    const selectionKey = session.userId ? environmentStorageKey(`coach-team-selection:${session.clubId}:${session.userId}`) : null;
    if (selectionKey && selectionOwners.get(this) !== selectionKey) {
      selectionOwners.set(this, selectionKey); this.setData({selectedTeamIds: []});
    }
    let stored: unknown = [];
    try { stored = selectionKey ? wx.getStorageSync<string[]>(selectionKey) : []; } catch { /* Selection remains usable without local storage. */ }
    const selectedIds = this.data.selectedTeamIds.length ? this.data.selectedTeamIds : Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
    this.setData({ state: "loading", message: "正在读取教练日程" });
    try {
      const teamScope = selectedIds.length ? {teamIds:selectedIds} : {};
      // The month query supplies markers; the selected-day query retains the API's
      // selected-week statistics instead of treating the first week as this week.
      const [dayHome, calendarHome] = await Promise.all([
        getCoachHome({from:this.data.date,to:this.data.date,...teamScope}),
        getCoachHome({...range,...teamScope}),
      ]);
      const home = {...dayHome,events:calendarHome.events};
      if (loadVersions.get(this) !== version) return;
      const selectedTeamIds = home.selectedTeamIds ?? [];
      if (selectionKey) { try { wx.setStorageSync(selectionKey, selectedTeamIds); } catch { /* Do not turn a cache failure into a schedule failure. */ } }
      const coachName = home.coachName?.trim() || "";
      const eventViews = home.events.map((event) => toCoachEventView(event));
      const taskCards = home.tasks.map(toCoachTaskView);
      const selectedDateEvents = eventViews.filter((event) => calendarDateKey(event.startsAt) === this.data.date);
      const heroEvent = selectedDateEvents.find((event) => event.status === "in_progress") ?? selectedDateEvents[0] ?? null;
      const hasWork = eventViews.length > 0 || taskCards.length > 0;
      this.setData({
        state: hasWork ? "ready" : "empty",
        message: hasWork ? "" : "所选日期范围内没有日程或待处理任务",
        home,
        clubName: home.clubName || "俱乐部",
        selectedTeamIds,
        hasTeamOptions:Boolean(home.teamOptions?.length),taskCount:taskCards.length,
        teamOptions: (home.teamOptions ?? []).map((team) => ({ ...team, selected: selectedTeamIds.includes(team.id) })),
        allTeamsSelected: selectedTeamIds.length === (home.teamOptions ?? []).length,
        coachName,
        coachInitial: coachName.slice(0, 1),
        hasCoachInitial: Boolean(coachName),
        heroPills: buildHeroPills(home),
        eventViews,
        heroEvent,
        hasHeroEvent: Boolean(heroEvent),
        heroDateLabel: heroDateLabel(this.data.date),
        heroKindLabel: heroEvent ? heroKindLabel(heroEvent.type) : "",
        taskCards,
        hasTaskCards: taskCards.length > 0,
      });
      this.applyFilter();
    } catch {
      if (loadVersions.get(this) !== version) return;
      this.setData({
        state: "error",
        message: "日程读取失败，请稍后重试",
        visibleEvents: [],
        hasVisibleEvents: false,
        taskCards: [],
        hasTaskCards: false,taskCount:0,
      });
    }
  },
  onUnload() { loadVersions.set(this, (loadVersions.get(this) ?? 0) + 1); },
  toggleTeamPicker() { this.setData({ showTeamPicker: !this.data.showTeamPicker }); },
  openSelectedTeam() { openPage("/pages/coach/team/index"); },
  selectTeam(event: {currentTarget: {dataset: {id?: string}}}) {
    const id = event.currentTarget.dataset.id;
    const options = this.data.teamOptions as Array<{id: string}>;
    if (id === "all") { this.setData({selectedTeamIds: options.map((team) => team.id)}); return this.load(); }
    if (!id || !options.some((team) => team.id === id)) return;
    const selected = new Set<string>(this.data.selectedTeamIds);
    if (selected.has(id)) { if (selected.size === 1) { wx.showToast({title:"至少选择一个队伍",icon:"none"}); return; } selected.delete(id); }
    else selected.add(id);
    this.setData({selectedTeamIds: [...selected]}); return this.load();
  },
  goToday() { this.setData({date: currentLocalDate()}); return this.load(); },
  showTasks() { wx.pageScrollTo({selector:"#coach-tasks",duration:200}); },
  openAssessmentTask(event: {currentTarget: {dataset: {id?: string}}}) {
    const task = (this.data.taskCards as CoachTask[]).find((item) => item.taskId === event.currentTarget.dataset.id);
    if (task?.taskId && task.templateId) openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(task.taskId)}&templateId=${encodeURIComponent(task.templateId)}&title=${encodeURIComponent(task.title || "测评任务")}`);
  },
  onCalendarChange(event: {detail:{date:string}}) {
    if (event.detail.date === this.data.date) return;
    return this.onDateChange({detail:{value:event.detail.date}});
  },
  onCalendarViewChange(event: {detail:{expanded:boolean}}) { this.setData({viewMode:event.detail.expanded ? "month" : "day"}); },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ date: event.detail.value });
    this.load();
  },
  openMe() {
    openTab("/pages/coach/me/index");
  },
  switchFilter(event: { currentTarget: { dataset: { filter?: Filter } } }) {
    const activeFilter = event.currentTarget.dataset.filter;
    if (!activeFilter) return;
    this.setData({ activeFilter });
    this.applyFilter();
  },
  applyFilter() {
    const activeFilter = this.data.activeFilter as Filter;
    const visibleEvents = (this.data.eventViews as CoachEventView[]).filter((event) => {
      if (calendarDateKey(event.startsAt) !== this.data.date) return false;
      if (activeFilter === "pending") return event.hasNextAction;
      if (activeFilter === "training" || activeFilter === "match") return event.type === activeFilter;
      return true;
    });
    this.setData({ visibleEvents, hasVisibleEvents: visibleEvents.length > 0 });
  },
  openEvent(event: { detail?: { eventId?: string }; currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.detail?.eventId ?? event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/event/index?id=${id}`);
  },
  openTask(event: { detail?: { eventId?: string; action?: CoachTaskAction }; currentTarget?: { dataset?: { id?: string; action?: CoachTaskAction } } }) {
    const id = event.detail?.eventId ?? event.currentTarget?.dataset?.id;
    const action = event.detail?.action ?? event.currentTarget?.dataset?.action;
    if (!id) return;
    const routes: Record<CoachTaskAction, string> = {
      attendance: `/pages/coach/attendance/index?id=${id}`,
      lesson: `/pages/coach/attendance/index?id=${id}`,
      match: `/pages/coach/match/index?id=${id}`,
      assessment: `/pages/coach/test-entry/index?eventId=${id}`,
      training: `/pages/coach/content-select/index?eventId=${id}`,
      view: `/pages/coach/event/index?id=${id}`,
    };
    const route = routes[action ?? "view"];
    if (route) openPage(route);
  },
  retry() {
    this.load();
  },
});

function toCoachEventView(event: ScheduleEvent): CoachEventView {
  const status = activityStatus(event.status);
  const locationLabel = [event.teamName, event.venue].filter(Boolean).join(" · ");
  return {
    ...event,
    startTime: formatTimeOnly(event.startsAt),
    durationText: durationLabel(event.startsAt, event.endsAt),
    hasDuration: Boolean(durationLabel(event.startsAt, event.endsAt)),
    statusLabel: status.label,
    statusTone: status.tone,
    typeLabel: event.type === "training" ? "训练" : event.type === "match" ? "比赛" : "其他",
    typeTone: event.type === "training" ? "training" : event.type === "match" ? "match" : "other",
    cardTone: event.type === "training" ? "training" : event.type === "match" ? "match" : "other",
    typeColor: event.type === "training" ? "#397ac7" : event.type === "match" ? "#a80f1b" : "#328660",
    locationLabel,
    hasLocationDetail: Boolean(locationLabel),
    hasTeamName: Boolean(event.teamName),
    hasVenue: Boolean(event.venue),
    hasNextAction: Boolean(event.nextAction && event.nextActionLabel),
  };
}

function toCoachTaskView(task: CoachTask): CoachTaskView {
  return {
    ...task,
    hasDueAt: Boolean(task.dueAt),
    dueLabel: task.dueAt ? formatCalendarDate(task.dueAt) : "",
  };
}

function heroDateLabel(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(value.getTime())) return formatCalendarDate(date);
  const weekLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${value.getUTCFullYear()}年${value.getUTCMonth() + 1}月${value.getUTCDate()}日 ${weekLabels[value.getUTCDay()]}`;
}

function heroKindLabel(type: ScheduleEvent["type"]): string {
  if (type === "match") return "比赛安排";
  if (type === "training") return "训练安排";
  return "活动安排";
}

function buildHeroPills(home: CoachHome): HeroPillView[] {
  const stats = home.weekStats;
  if (!stats) return [];
  const pills: HeroPillView[] = [];
  if (stats.attendanceRate !== null && stats.attendanceRate !== undefined) {
    pills.push({ value: `${stats.attendanceRate}%`, label: "出席率", tone: "primary" });
  }
  pills.push({ value: `${stats.hours}h`, label: "本周安排时长", tone: "neutral" });
  pills.push({ value: `${stats.sessions}节`, label: "本周安排", tone: "neutral" });
  return pills;
}

function durationLabel(startsAt?: string, endsAt?: string): string {
  const start = Date.parse(startsAt ?? "");
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "";
  return `${Math.round((end - start) / 60000)}分钟`;
}


function monthWindow(date: string) {
  const year = Number(date.slice(0,4));
  const month = Number(date.slice(5,7));
  return { from: `${date.slice(0,7)}-01`, to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0,10) };
}
