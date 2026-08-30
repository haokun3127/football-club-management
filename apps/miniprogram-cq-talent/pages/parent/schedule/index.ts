import { getContentArticles, getParentCalendar, getParentChildren, getParentReminders } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_PARENT_PAGE_DATE_OVERRIDE } from "../../../utils/config";
import { currentLocalDate, resolveParentPageDate, shiftCalendarDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { activityStatus, childNames, formatCalendarDate, formatShortDate, formatTimeRange, resolveMenuInset, resolveNavInset, resolveTopBarHeight } from "../../../utils/presentation";
import { countUnreadReminders } from "../../../utils/reminders";
import { setCurrentStudentId } from "../../../utils/store";
import type { ContentArticle, LoadState, ScheduleEvent, StudentSummary } from "../../../utils/types";

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

type HeroView = {
  todayLabel: string;
  weekCount: number;
  weekHours: string;
} & (
  | {
      mode: "upcoming";
      id: string;
      title: string;
      timeText: string;
      teamName: string;
      venue: string;
    }
  | {
      mode: "empty";
      title: "该日期暂无日程";
      description: "暂未安排训练、比赛或其他活动";
    }
);

const TYPE_COLORS: Record<string, string> = {
  training: "#a80f1b",
  match: "#1a3a6b",
  other: "#6b7280",
};

export interface NoticeBannerView {
  id: string;
  title: string;
  summary: string;
  metaLabel: string;
  hasDetail: boolean;
}

interface PageData {
  navInset: number;
  topBarHeight: number;
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
  dateOptions: Array<{ date: string; isToday: boolean; isSelected: boolean; day: string; weekday: string; weekShort: string; dayNumber: string; count: number }>;
  isMonthPickerExpanded: boolean;
  monthKey: string;
  monthLabel: string;
  monthWeekdays: string[];
  monthDays: MonthDayView[];
  hasUnreadReminders: boolean;
  unreadCount: number;
  todayLabel: string;
  selectedCountLabel: string;
  menuInset: number;
  todayCount: number;
  weekCount: number;
  weekHours: string;
  hero: HeroView | null;
  noticeBanner: NoticeBannerView | null;
}

const typeTabs: PageData["typeTabs"] = [
  { label: "全部", value: "all" },
  { label: "训练", value: "training" },
  { label: "比赛", value: "match" },
  { label: "其他", value: "other" },
];

const initialDate = resolveParentPageDate(new Date(), DEV_PARENT_PAGE_DATE_OVERRIDE);
let scheduleLoadToken = 0;

export interface MonthDayView {
  key: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTraining: boolean;
  hasMatch: boolean;
  hasMultiple: boolean;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    topBarHeight: resolveTopBarHeight(),
    menuInset: resolveMenuInset(),
    state: "loading",
    message: "正在读取家庭日程",
    children: [],
    activeStudentId: "",
    activeStudentName: "",
    events: [],
    visibleEvents: [],
    selectedDate: initialDate,
    selectedDateLabel: formatCalendarDate(initialDate),
    monthKey: initialDate.slice(0, 7),
    monthLabel: formatMonthLabel(initialDate.slice(0, 7)),
    monthWeekdays: ["一", "二", "三", "四", "五", "六", "日"],
    monthDays: [],
    isMonthPickerExpanded: false,
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
    noticeBanner: null,
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
    const loadToken = ++scheduleLoadToken;
    const selectedDate = this.data.selectedDate;
    this.setData({ state: "loading", message: "正在读取家庭日程" });
    try {
      const children = await getParentChildren();
      if (loadToken !== scheduleLoadToken) return;
      if (!children.length) {
        this.setData({ state: "empty", message: "当前微信手机号尚未绑定孩子档案，请联系俱乐部确认登记信息。" });
        return;
      }
      const [events, articles] = await Promise.all([
        getParentCalendar(dateWindowStart(selectedDate), dateWindowEnd(selectedDate)),
        getContentArticles(),
      ]);
      if (loadToken !== scheduleLoadToken) return;
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (active && active.id !== session.currentStudentId) setCurrentStudentId(active.id);
      const childEvents = filterEvents(events, active?.id ?? "", "", "all");
      const visibleEvents = presentEvents(filterEvents(events, active?.id ?? "", selectedDate, this.data.selectedType));
      const digest = buildScheduleDigest(childEvents, selectedDate);
      const noticeBanner = presentNoticeBanner(articles);
      const monthKey = selectedDate.slice(0, 7);
      this.setData({
        state: "ready",
        message: "",
        children,
        activeStudentId: active?.id ?? "",
        activeStudentName: active?.name ?? "全部孩子",
        events,
        visibleEvents,
        selectedDateLabel: formatCalendarDate(selectedDate),
        dateOptions: buildDateOptions(selectedDate, childEvents),
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        monthDays: buildMonthDays(monthKey, selectedDate, childEvents),
        todayLabel: digest.todayLabel,
        selectedCountLabel: selectedCountLabel(this.data.selectedDate, digest.todayCount),
        todayCount: digest.todayCount,
        weekCount: digest.weekCount,
        weekHours: digest.weekHours,
        hero: digest.hero,
        noticeBanner,
      });
    } catch (error) {
      if (loadToken !== scheduleLoadToken) return;
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  onChildChange(event: { detail: { studentId: string } }) {
    const id = event.detail.studentId === "all" ? "" : event.detail.studentId;
    const child = this.data.children.find((item: StudentSummary) => item.id === id);
    if (id) setCurrentStudentId(id);
    const digest = buildScheduleDigest(filterEvents(this.data.events, id, "", "all"), this.data.selectedDate);
    const childEvents = filterEvents(this.data.events, id, "", "all");
    this.setData({
      activeStudentId: id,
      activeStudentName: child?.name ?? "全部孩子",
      todayCount: digest.todayCount,
      weekCount: digest.weekCount,
      weekHours: digest.weekHours,
      hero: digest.hero,
      dateOptions: buildDateOptions(this.data.selectedDate, childEvents),
      monthDays: buildMonthDays(this.data.monthKey, this.data.selectedDate, childEvents),
    });
    this.applyFilters();
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ selectedDate: event.detail.value, selectedDateLabel: formatCalendarDate(event.detail.value) });
    this.load();
  },
  selectDate(event: { currentTarget: { dataset: { date?: string } } }) {
    const date = event.currentTarget.dataset.date;
    if (!date) return;
    if (date === this.data.selectedDate) {
      this.setData({ isMonthPickerExpanded: false });
      return;
    }
    const monthKey = date.slice(0, 7);
    if (monthKey !== this.data.monthKey) {
      this.setData({ selectedDate: date, selectedDateLabel: formatCalendarDate(date), monthKey, monthLabel: formatMonthLabel(monthKey), isMonthPickerExpanded: false });
      this.load();
      return;
    }
    const childEvents = filterEvents(this.data.events, this.data.activeStudentId, "", "all");
    const digest = buildScheduleDigest(childEvents, date);
    this.setData({
      selectedDate: date,
      selectedDateLabel: formatCalendarDate(date),
      dateOptions: buildDateOptions(date, childEvents),
      monthDays: buildMonthDays(monthKey, date, childEvents),
      isMonthPickerExpanded: false,
      todayLabel: digest.todayLabel,
      selectedCountLabel: selectedCountLabel(date, digest.todayCount),
      todayCount: digest.todayCount,
      weekCount: digest.weekCount,
      weekHours: digest.weekHours,
      hero: digest.hero,
    });
    this.applyFilters();
  },
  changeMonth(event: { currentTarget: { dataset: { offset?: string | number } } }) {
    const offset = Number(event.currentTarget.dataset.offset);
    if (offset !== -1 && offset !== 1) return;
    const current = new Date(`${this.data.monthKey}-01T00:00:00.000Z`);
    current.setUTCMonth(current.getUTCMonth() + offset);
    const monthKey = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    const selectedDate = `${monthKey}-01`;
    this.setData({ selectedDate, selectedDateLabel: formatCalendarDate(selectedDate), monthKey, monthLabel: formatMonthLabel(monthKey) });
    this.load();
  },
  expandMonthPicker() {
    this.setData({ isMonthPickerExpanded: true });
  },
  collapseMonthPicker() {
    this.setData({ isMonthPickerExpanded: false });
  },
  changeWeek(event: { currentTarget: { dataset: { offset?: string | number } } }) {
    const offset = Number(event.currentTarget.dataset.offset);
    if (offset !== -7 && offset !== 7) return;
    const selectedDate = shiftCalendarDate(this.data.selectedDate, offset);
    this.setData({ selectedDate, selectedDateLabel: formatCalendarDate(selectedDate) });
    this.load();
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
  openNotice(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/parent/article/index?id=${encodeURIComponent(id)}`);
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

export function buildDateOptions(selectedDate: string, events: ScheduleEvent[]) {
  const base = weekWindowStart(selectedDate);
  const todayKey = currentLocalDate();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      isToday: key === todayKey,
      isSelected: key === selectedDate,
      day: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
      weekday: ["日", "一", "二", "三", "四", "五", "六"][date.getUTCDay()],
      weekShort: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getUTCDay()] ?? "",
      dayNumber: String(date.getUTCDate()),
      count: events.filter((event) => event.startsAt.slice(0, 10) === key).length,
    };
  });
}

export function presentNoticeBanner(articles: ContentArticle[]): NoticeBannerView | null {
  const article = articles.find((item) => item.category === "notice" && !isExpired(item.expiresAt));
  if (!article) return null;
  const source = (article.body || article.subtitle || article.title).replace(/\s+/g, " ").trim();
  return {
    id: article.id,
    title: article.title,
    summary: source.length > 52 ? `${source.slice(0, 52)}…` : source,
    metaLabel: article.expiresAt ? `有效期至${formatNoticeDate(article.expiresAt)}` : article.publishedAt ? `发布于${formatNoticeDate(article.publishedAt)}` : "俱乐部通知",
    hasDetail: Boolean(article.body || article.subtitle),
  };
}

function isExpired(value?: string) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function formatNoticeDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "日期待同步";
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function buildMonthDays(monthKey: string, selectedDate: string, events: ScheduleEvent[]): MonthDayView[] {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const leadingDays = (first.getUTCDay() + 6) % 7;
  const eventByDate = new Map<string, { training: boolean; match: boolean; count: number }>();
  events.forEach((event) => {
    const date = event.startsAt.slice(0, 10);
    const current = eventByDate.get(date) ?? { training: false, match: false, count: 0 };
    current.training = current.training || event.type === "training";
    current.match = current.match || event.type === "match";
    current.count += 1;
    eventByDate.set(date, current);
  });
  const today = currentLocalDate();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(date.getUTCDate() + index - leadingDays);
    const key = date.toISOString().slice(0, 10);
    const markers = eventByDate.get(key);
    return {
      key,
      dayNumber: String(date.getUTCDate()),
      isCurrentMonth: key.slice(0, 7) === monthKey,
      isToday: key === today,
      isSelected: key === selectedDate,
      hasTraining: markers?.training ?? false,
      hasMatch: markers?.match ?? false,
      hasMultiple: (markers?.count ?? 0) > 1,
    };
  });
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function dateWindowStart(date: string) {
  const month = monthWindow(date);
  return month.start.toISOString().slice(0, 10);
}

function dateWindowEnd(date: string) {
  const month = monthWindow(date);
  return month.end.toISOString().slice(0, 10);
}

function monthWindow(date: string) {
  const [yearText, monthText] = (date || initialDate).slice(0, 7).split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

function weekWindowStart(date: string) {
  const start = new Date(`${date || initialDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
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

export function buildScheduleDigest(events: ScheduleEvent[], selectedDate: string) {
  const selected = new Date(`${selectedDate || initialDate}T00:00:00.000Z`);
  const selectedKey = selected.toISOString().slice(0, 10);
  const weekStart = weekWindowStart(selectedDate);
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
  const todayLabel = `${selected.getUTCFullYear()}年${selected.getUTCMonth() + 1}月${selected.getUTCDate()}日 周${weekdays[selected.getUTCDay()]}`;
  const weekCount = weekEvents.length;
  const weekHours = (Math.round(weekMinutes / 6) / 10).toString();
  return {
    todayLabel,
    todayCount: events.filter((event) => event.startsAt.slice(0, 10) === selectedKey).length,
    weekCount,
    weekHours,
    hero: upcoming
      ? {
          mode: "upcoming",
          todayLabel,
          weekCount,
          weekHours,
          id: upcoming.id,
          title: upcoming.title,
          timeText: upcoming.startsAt.slice(11, 16) || "待定",
          teamName: upcoming.teamName ?? "",
          venue: upcoming.venue ?? "",
        }
      : {
          mode: "empty",
          todayLabel,
          weekCount,
          weekHours,
          title: "该日期暂无日程",
          description: "暂未安排训练、比赛或其他活动",
        },
  };
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "日程读取失败，请检查网络或稍后重试。";
}
