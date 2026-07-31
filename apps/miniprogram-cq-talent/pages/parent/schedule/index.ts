import { getParentCalendar, getParentChildren, getParentReminders } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_MODE, DEV_TEST_DATE } from "../../../utils/config";
import { openPage } from "../../../utils/navigation";
import { activityStatus, childNames, formatCalendarDate, formatShortDate, formatTimeRange, resolveMenuActionTop, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { countUnreadReminders } from "../../../utils/reminders";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, ScheduleEvent, StudentSummary } from "../../../utils/types";

type ScheduleEventView = ScheduleEvent & {
  timeLabel: string;
  statusLabel: string;
  statusTone: string;
  description: string;
  meta: Array<{ label: string; value: string }>;
  typeColor: string;
  durationText: string;
  childNames: string;
};

interface HeroView {
  id: string;
  title: string;
  timeText: string;
  teamName: string;
  venue: string;
}

const TYPE_COLORS: Record<string, string> = {
  training: "#a80f1b",
  match: "#1a3a6b",
  other: "#6b7280",
};

interface PageData {
  state: LoadState;
  message: string;
  children: StudentSummary[];
  activeStudentId: string;
  activeStudentName: string;
  events: ScheduleEvent[];
  visibleEvents: ScheduleEventView[];
  selectedDate: string;
  selectedDateLabel: string;
  selectedType: "all" | ScheduleEvent["type"];
  typeTabs: Array<{ label: string; value: "all" | ScheduleEvent["type"] }>;
  dateOptions: Array<{ date: string; day: string; weekday: string; weekShort: string; dayNumber: string; count: number }>;
  hasUnreadReminders: boolean;
  unreadCount: number;
  todayLabel: string;
  selectedCountLabel: string;
  menuInset: number;
  navActionTop: number;
  todayCount: number;
  weekCount: number;
  weekHours: string;
  hero: HeroView | null;
}

const typeTabs: PageData["typeTabs"] = [
  { label: "全部", value: "all" },
  { label: "训练", value: "training" },
  { label: "比赛", value: "match" },
  { label: "其他", value: "other" },
];

const initialDate = DEV_MODE ? DEV_TEST_DATE : currentLocalDate();

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    navActionTop: resolveMenuActionTop(),
    state: "loading",
    message: "正在读取家庭日程",
    children: [],
    activeStudentId: "",
    activeStudentName: "",
    events: [],
    visibleEvents: [],
    selectedDate: initialDate,
    selectedDateLabel: formatCalendarDate(initialDate),
    selectedType: "all",
    typeTabs,
    dateOptions: [],
    hasUnreadReminders: false,
    unreadCount: 0,
    todayLabel: "",
    selectedCountLabel: "",
    todayCount: 0,
    weekCount: 0,
    weekHours: "0",
    hero: null,
  },
  onLoad() {
    this.load();
  },
  onShow() {
    this.refreshRemindersBadge();
  },
  async refreshRemindersBadge() {
    try {
      const reminders = await getParentReminders();
      const unreadCount = countUnreadReminders(reminders);
      this.setData({ hasUnreadReminders: unreadCount > 0, unreadCount });
    } catch (error) {
      // 角标失败不影响主流程
    }
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取家庭日程" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前微信手机号尚未绑定孩子档案，请联系俱乐部确认登记信息。" });
        return;
      }
      const events = await getParentCalendar(dateWindowStart(this.data.selectedDate), dateWindowEnd(this.data.selectedDate));
      const active = children.find((child) => child.id === this.data.activeStudentId);
      const childEvents = filterEvents(events, this.data.activeStudentId, "", "all");
      const visibleEvents = presentEvents(filterEvents(events, this.data.activeStudentId, this.data.selectedDate, this.data.selectedType));
      const digest = buildScheduleDigest(childEvents, this.data.selectedDate);
      this.setData({
        state: "ready",
        message: "",
        children,
        activeStudentId: active?.id ?? "",
        activeStudentName: active?.name ?? "全部孩子",
        events,
        visibleEvents,
        selectedDateLabel: formatCalendarDate(this.data.selectedDate),
        dateOptions: buildDateOptions(this.data.selectedDate, events),
        todayLabel: digest.todayLabel,
        selectedCountLabel: selectedCountLabel(this.data.selectedDate, digest.todayCount),
        todayCount: digest.todayCount,
        weekCount: digest.weekCount,
        weekHours: digest.weekHours,
        hero: digest.hero,
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  onChildChange(event: { detail: { studentId: string } }) {
    const id = event.detail.studentId === "all" ? "" : event.detail.studentId;
    const child = this.data.children.find((item: StudentSummary) => item.id === id);
    if (id) setCurrentStudentId(id);
    const digest = buildScheduleDigest(filterEvents(this.data.events, id, "", "all"), this.data.selectedDate);
    this.setData({
      activeStudentId: id,
      activeStudentName: child?.name ?? "全部孩子",
      todayCount: digest.todayCount,
      weekCount: digest.weekCount,
      weekHours: digest.weekHours,
      hero: digest.hero,
    });
    this.applyFilters();
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ selectedDate: event.detail.value, selectedDateLabel: formatCalendarDate(event.detail.value) });
    this.load();
  },
  selectDate(event: { currentTarget: { dataset: { date?: string } } }) {
    const date = event.currentTarget.dataset.date;
    if (!date || date === this.data.selectedDate) return;
    const digest = buildScheduleDigest(filterEvents(this.data.events, this.data.activeStudentId, "", "all"), date);
    this.setData({
      selectedDate: date,
      selectedDateLabel: formatCalendarDate(date),
      todayLabel: digest.todayLabel,
      selectedCountLabel: selectedCountLabel(date, digest.todayCount),
      todayCount: digest.todayCount,
      weekCount: digest.weekCount,
      weekHours: digest.weekHours,
      hero: digest.hero,
    });
    this.applyFilters();
  },
  switchType(event: { currentTarget: { dataset: { type?: PageData["selectedType"] } } }) {
    const selectedType = event.currentTarget.dataset.type;
    if (!selectedType || selectedType === this.data.selectedType) return;
    this.setData({ selectedType });
    this.applyFilters();
  },
  applyFilters() {
    const visibleEvents = presentEvents(filterEvents(this.data.events, this.data.activeStudentId, this.data.selectedDate, this.data.selectedType));
    this.setData({
      visibleEvents,
      state: "ready",
      message: "",
    });
  },
  openEvent(event: { detail?: { eventId?: string }; currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.detail?.eventId || event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/parent/event/index?id=${id}`);
  },
  openReminders() {
    openPage("/pages/parent/reminders/index");
  },
  openDay() {
    openPage(`/pages/parent/day/index?date=${this.data.selectedDate}`);
  },
  retry() {
    this.load();
  },
});

function filterEvents(events: ScheduleEvent[], studentId: string, selectedDate: string, selectedType: PageData["selectedType"]) {
  return events.filter((event) => {
    const childMatched = !studentId || !event.childIds?.length || event.childIds.includes(studentId);
    const typeMatched = selectedType === "all" || event.type === selectedType;
    const dateMatched = !selectedDate || event.startsAt.slice(0, 10) === selectedDate;
    return childMatched && typeMatched && dateMatched;
  });
}

function buildDateOptions(start: string, events: ScheduleEvent[]) {
  const base = new Date(`${start}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      day: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
      weekday: ["日", "一", "二", "三", "四", "五", "六"][date.getUTCDay()],
      weekShort: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getUTCDay()] ?? "",
      dayNumber: String(date.getUTCDate()),
      count: events.filter((event) => event.startsAt.slice(0, 10) === key).length,
    };
  });
}

function dateWindowStart(date: string) {
  return date || initialDate;
}

function dateWindowEnd(date: string) {
  const base = new Date(`${date || initialDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + 6);
  return base.toISOString().slice(0, 10);
}

function presentEvents(events: ScheduleEvent[]): ScheduleEventView[] {
  return events.map((event) => {
    const status = activityStatus(event.status);
    return {
      ...event,
      timeLabel: formatTimeRange(event.startsAt, event.endsAt),
      statusLabel: status.label,
      statusTone: status.tone,
      description: event.summary || "",
      typeColor: TYPE_COLORS[event.type] ?? "#6b7280",
      durationText: durationLabel(event.startsAt, event.endsAt),
      childNames: childNames(event),
      meta: [
        { label: "孩子", value: childNames(event) },
        { label: "队伍", value: event.teamName || "待确认" },
      ],
    };
  });
}

function durationLabel(startsAt?: string, endsAt?: string) {
  const start = Date.parse(startsAt ?? "");
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "时长待确认";
  return `${Math.round((end - start) / 60000)}分钟`;
}

function selectedCountLabel(date: string, count: number) {
  const selected = formatShortDate(date);
  return date === currentLocalDate() ? `今日${count}节` : `${selected}${count}节`;
}

function buildScheduleDigest(events: ScheduleEvent[], selectedDate: string) {
  const selected = new Date(`${selectedDate || initialDate}T00:00:00.000Z`);
  const selectedKey = selected.toISOString().slice(0, 10);
  const weekStart = new Date(selected);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const weekEvents = events.filter((event) => {
    const startsAt = Date.parse(event.startsAt);
    return Number.isFinite(startsAt) && startsAt >= weekStart.getTime() && startsAt < weekEnd.getTime();
  });
  const weekMinutes = weekEvents.reduce((total, event) => {
    const span = Date.parse(event.endsAt ?? "") - Date.parse(event.startsAt ?? "");
    return total + (Number.isFinite(span) && span > 0 ? span : 0);
  }, 0) / 60000;
  const upcoming = events
    .filter((event) => event.startsAt.slice(0, 10) === selectedKey && event.status !== "cancelled")
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return {
    todayLabel: `${selected.getUTCFullYear()}年${selected.getUTCMonth() + 1}月${selected.getUTCDate()}日 周${weekdays[selected.getUTCDay()]}`,
    todayCount: events.filter((event) => event.startsAt.slice(0, 10) === selectedKey).length,
    weekCount: weekEvents.length,
    weekHours: (Math.round(weekMinutes / 6) / 10).toString(),
    hero: upcoming
      ? {
          id: upcoming.id,
          title: upcoming.title,
          timeText: upcoming.startsAt.slice(11, 16) || "待定",
          teamName: upcoming.teamName ?? "",
          venue: upcoming.venue ?? "",
        }
      : null,
  };
}

function currentLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "日程读取失败，请检查网络或稍后重试。";
}
