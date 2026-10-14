import { environmentStorageKey } from "../../../utils/config";
import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate } from "../../../utils/date";
import { openPage, openTab } from "../../../utils/navigation";
import { activityStatus, formatCalendarDate, resolveMenuInset, resolveNavInset, resolveTopBarHeight } from "../../../utils/presentation";
import type { CoachHome, CoachTask, CoachTaskAction, LoadState, ScheduleEvent } from "../../../utils/types";

const WEEK_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const initialDate = currentLocalDate();
const loadVersions = new WeakMap<object, number>();
const selectionOwners = new WeakMap<object, string>();
const calendarTouches = new WeakMap<object, {x: number; y: number}>();

type Filter = "all" | "training" | "match" | "pending";
type ViewMode = "day" | "week" | "month";

export interface CoachMonthDayView {
  key: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTraining: boolean;
  hasMatch: boolean;
  hasMultiple: boolean;
  events: Array<{id: string; title: string; typeLabel: string; tone: string}>;
  overflow: number;
}

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

type CoachDayStripItem = {
  date: string;
  weekLabel: string;
  dayNum: string;
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
    taskCount:0,
    date: initialDate,
    selectedDate: initialDate,
    viewMode: "day" as ViewMode,
    activeFilter: "all" as Filter,
    dayStrip: [] as CoachDayStripItem[],
    collapsedDayStrip: [] as CoachDayStripItem[],
    rangeLabel: "",
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
    heroPills: [] as HeroPillView[],
    monthKey: initialDate.slice(0, 7),
    monthLabel: formatMonthLabel(initialDate.slice(0, 7)),
    monthWeekdays: ["一", "二", "三", "四", "五", "六", "日"],
    monthDays: [] as CoachMonthDayView[],
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
    const range = resolveRange(this.data.date, this.data.viewMode);
    const selectionKey = session.userId ? environmentStorageKey(`coach-team-selection:${session.clubId}:${session.userId}`) : null;
    if (selectionKey && selectionOwners.get(this) !== selectionKey) {
      selectionOwners.set(this, selectionKey); this.setData({selectedTeamIds: []});
    }
    let stored: unknown = [];
    try { stored = selectionKey ? wx.getStorageSync<string[]>(selectionKey) : []; } catch { /* Selection remains usable without local storage. */ }
    const selectedIds = this.data.selectedTeamIds.length ? this.data.selectedTeamIds : Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
    this.setData({ state: "loading", message: "正在读取教练日程" });
    try {
      const home = await getCoachHome(selectedIds.length ? { ...range, teamIds: selectedIds } : range);
      if (loadVersions.get(this) !== version) return;
      const selectedTeamIds = home.selectedTeamIds ?? [];
      if (selectionKey) { try { wx.setStorageSync(selectionKey, selectedTeamIds); } catch { /* Do not turn a cache failure into a schedule failure. */ } }
      const coachName = home.coachName?.trim() || "";
      const eventViews = home.events.map((event) => toCoachEventView(event));
      const taskCards = home.tasks.map(toCoachTaskView);
      const selectedDateEvents = eventViews.filter((event) => event.startsAt.slice(0, 10) === this.data.date);
      const heroEvent = selectedDateEvents.find((event) => event.status === "in_progress") ?? selectedDateEvents[0] ?? null;
      const hasWork = eventViews.length > 0 || taskCards.length > 0;
      const dayStrip = buildDayStrip(startOfWeek(this.data.date));
      this.setData({
        state: hasWork ? "ready" : "empty",
        message: hasWork ? "" : "所选日期范围内没有日程或待处理任务",
        home,
        clubName: home.clubName || "俱乐部",
        selectedTeamIds,
        hasTeamOptions:Boolean(home.teamOptions?.length),taskCount:taskCards.length,
        teamOptions: (home.teamOptions ?? []).map((team) => ({ ...team, selected: selectedTeamIds.includes(team.id) })),
        allTeamsSelected: selectedTeamIds.length === (home.teamOptions ?? []).length,
        selectedDate: this.data.date,
        dayStrip,
        collapsedDayStrip: dayStrip,
        rangeLabel: rangeLabel(range, this.data.viewMode),
        coachName,
        coachInitial: coachName.slice(0, 1),
        hasCoachInitial: Boolean(coachName),
        heroPills: buildHeroPills(home),
        eventViews,
        heroEvent,
        hasHeroEvent: Boolean(heroEvent),
        heroDateLabel: heroDateLabel(this.data.date),
        taskCards,
        hasTaskCards: taskCards.length > 0,
        monthKey: this.data.date.slice(0, 7),
        monthLabel: formatMonthLabel(this.data.date.slice(0, 7)),
        monthDays: this.data.viewMode === "month" ? buildMonthDays(this.data.date.slice(0, 7), this.data.date, eventViews) : [],
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
  goToday() { this.setData({date: currentLocalDate(), viewMode:"day"}); return this.load(); },
  showTasks() { wx.pageScrollTo({selector:"#coach-tasks",duration:200}); },
  openAssessmentTask(event: {currentTarget: {dataset: {id?: string}}}) {
    const task = (this.data.taskCards as CoachTask[]).find((item) => item.taskId === event.currentTarget.dataset.id);
    if (task?.taskId && task.templateId) openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(task.taskId)}&templateId=${encodeURIComponent(task.templateId)}&title=${encodeURIComponent(task.title || "测评任务")}`);
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ date: event.detail.value });
    this.load();
  },
  selectDay(event: { currentTarget: { dataset: { date?: string } } }) {
    const date = event.currentTarget.dataset.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    this.setData({ date });
    this.load();
  },
  calendarTouchStart(event: {touches: Array<{clientX: number; clientY: number}>}) {
    const touch = event.touches[0];
    if (touch) calendarTouches.set(this, {x: touch.clientX, y: touch.clientY});
  },
  calendarTouchEnd(event: {changedTouches: Array<{clientX: number; clientY: number}>}) {
    const start = calendarTouches.get(this); const end = event.changedTouches[0]; calendarTouches.delete(this);
    if (!start || !end || Math.abs(end.clientX - start.x) > 40) return;
    if (end.clientY - start.y > 60 && this.data.viewMode !== "month") return this.expandMonthPicker();
    if (start.y - end.clientY > 60 && this.data.viewMode === "month") return this.collapseMonthPicker();
  },
  expandMonthPicker() {
    this.setData({ viewMode: "month", monthKey: this.data.date.slice(0, 7), monthLabel: formatMonthLabel(this.data.date.slice(0, 7)) });
    return this.load();
  },
  collapseMonthPicker() {
    this.setData({ viewMode: "day" });
    return this.load();
  },
  changeMonth(event: { currentTarget: { dataset: { offset?: string | number } } }) {
    const offset = Number(event.currentTarget.dataset.offset);
    if (offset !== -1 && offset !== 1) return;
    const current = new Date(`${this.data.monthKey}-01T00:00:00.000Z`);
    current.setUTCMonth(current.getUTCMonth() + offset);
    const monthKey = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    const date = `${monthKey}-01`;
    this.setData({ date, selectedDate: date, monthKey, monthLabel: formatMonthLabel(monthKey), viewMode: "month" });
    return this.load();
  },
  changeWeek(event: { currentTarget: { dataset: { offset?: string | number } } }) {
    const offset = Number(event.currentTarget.dataset.offset);
    if (offset !== -7 && offset !== 7) return;
    this.setData({ date: addDays(this.data.date, offset), viewMode: "day" });
    this.load();
  },
  openMe() {
    openTab("/pages/coach/me/index");
  },
  switchView(event: { currentTarget: { dataset: { mode?: ViewMode } } }) {
    const viewMode = event.currentTarget.dataset.mode;
    if (!viewMode || viewMode === this.data.viewMode) return;
    this.setData({ viewMode });
    this.load();
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
      if (this.data.viewMode === "month" && event.startsAt.slice(0, 10) !== this.data.date) return false;
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
    startTime: event.startsAt?.slice(11, 16) || "",
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

function resolveRange(date: string, viewMode: ViewMode) {
  if (viewMode === "day") return { from: date, to: date };
  if (viewMode === "month") return monthWindow(date);
  const monday = startOfWeek(date);
  return { from: monday, to: addDays(monday, 6) };
}

function startOfWeek(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value.toISOString().slice(0, 10);
}

function buildDayStrip(monday: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const value = new Date(`${date}T00:00:00.000Z`);
    return { date, weekLabel: WEEK_LABELS[value.getUTCDay()], dayNum: String(value.getUTCDate()) };
  });
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function rangeLabel(range: { from: string; to: string }, viewMode: ViewMode): string {
  if (viewMode === "day") return formatCalendarDate(range.from);
  if (viewMode === "month") return formatMonthLabel(range.from.slice(0, 7));
  return `${formatCalendarDate(range.from)} - ${formatCalendarDate(range.to)}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function monthWindow(date: string) {
  const [yearText, monthText] = date.slice(0, 7).split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export function buildMonthDays(monthKey: string, selectedDate: string, events: ScheduleEvent[]): CoachMonthDayView[] {
  const [yearText, monthText] = monthKey.split("-");
  const first = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  const leadingDays = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(Number(yearText), Number(monthText), 0)).getUTCDate();
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const eventByDate = new Map<string, ScheduleEvent[]>();
  events.forEach((event) => {
    const key = event.startsAt.slice(0, 10);
    const current = eventByDate.get(key) ?? [];
    if (!current.some((item) => item.id === event.id)) current.push(event);
    eventByDate.set(key, current);
  });
  const today = currentLocalDate();
  return Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `${monthKey}-empty-${index}`,
        dayNumber: "",
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasTraining: false,
        hasMatch: false,
        hasMultiple: false,
        events: [], overflow: 0,
      };
    }
    const date = new Date(first);
    date.setUTCDate(dayNumber);
    const key = date.toISOString().slice(0, 10);
    const markers = (eventByDate.get(key) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
    return {
      key,
      dayNumber: String(date.getUTCDate()),
      isCurrentMonth: key.slice(0, 7) === monthKey,
      isToday: key === today,
      isSelected: key === selectedDate,
      hasTraining: markers.some((event) => event.type === "training"),
      hasMatch: markers.some((event) => event.type === "match"),
      hasMultiple: markers.length > 1,
      events: markers.slice(0, 2).map((event) => ({id: event.id, title: event.title, tone: event.type === "training" ? "training" : event.type === "match" ? "match" : "other", typeLabel: event.type === "training" ? "训练" : event.type === "match" ? "比赛" : "其他"})),
      overflow: Math.max(0, markers.length - 2),
    };
  });
}
