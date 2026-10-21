import {calendarDataRanges} from "../../../utils/schedule-calendar";
import { getContentArticles, getParentCalendar, getParentChildren, getParentReminders } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_PARENT_PAGE_DATE_OVERRIDE } from "../../../utils/config";
import { calendarDateKey, currentLocalDate, resolveParentPageDate } from "../../../utils/date";
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

const TYPE_COLORS: Record<string, string> = {
  training: "#2268d8",
  match: "#a80f1b",
  other: "#188754",
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
  calendarEvents: ScheduleEvent[];
  visibleEvents: ScheduleEventView[];
  selectedDate: string;
  selectedDateLabel: string;
  selectedType: "all" | ScheduleEvent["type"];
  typeTabs: Array<{ label: string; value: "all" | ScheduleEvent["type"] }>;
  isMonthPickerExpanded: boolean;
  hasUnreadReminders: boolean;
  unreadCount: number;
  todayLabel: string;
  selectedCountLabel: string;
  menuInset: number;
  todayCount: number;
  weekCount: number;
  weekHours: string;
  noticeBanner: NoticeBannerView | null;
}

const typeTabs: PageData["typeTabs"] = [
  { label: "全部", value: "all" },
  { label: "训练", value: "training" },
  { label: "比赛", value: "match" },
  { label: "其他", value: "other" },
];

const initialDate = resolveParentPageDate(new Date(), DEV_PARENT_PAGE_DATE_OVERRIDE);
const scheduleLoadTokens=new WeakMap<object,number>();
const familySelections=new WeakSet<object>();

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
    calendarEvents: [],
    visibleEvents: [],
    selectedDate: initialDate,
    selectedDateLabel: formatCalendarDate(initialDate),
    isMonthPickerExpanded: false,
    selectedType: "all",
    typeTabs,
    hasUnreadReminders: false,
    unreadCount: 0,
    todayLabel: "",
    selectedCountLabel: "",
    todayCount: 0,
    weekCount: 0,
    weekHours: "0",
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
    const loadToken=(scheduleLoadTokens.get(this)??0)+1;scheduleLoadTokens.set(this,loadToken);
    const selectedDate = this.data.selectedDate;
    this.setData({ state: "loading", message: "正在读取家庭日程" });
    try {
      const children = await getParentChildren();
      if (loadToken !== scheduleLoadTokens.get(this)) return;
      if (!children.length) {
        this.setData({ state: "empty", message: "当前微信手机号尚未绑定孩子档案，请联系俱乐部确认登记信息。" });
        return;
      }
      const ranges=calendarDataRanges(selectedDate,this.data.isMonthPickerExpanded);
      const [batches,articles]=await Promise.all([
        Promise.all(ranges.map(range=>getParentCalendar(`${range.from}T00:00:00+08:00`,`${range.to}T23:59:59.999+08:00`))),getContentArticles(),
      ]);
      const events=[...new Map(batches.flat().map(event=>[event.id,event])).values()];
      if (loadToken !== scheduleLoadTokens.get(this)) return;
      const preferred=familySelections.has(this) ? this.data.activeStudentId : session.currentStudentId;
      const active=familySelections.has(this) && !preferred ? null : children.find(child=>child.id===preferred) ?? children[0];
      if (active && active.id !== session.currentStudentId) setCurrentStudentId(active.id);
      const childEvents = filterEvents(events, active?.id ?? "", "", "all");
      const visibleEvents = presentEvents(filterEvents(events, active?.id ?? "", selectedDate, this.data.selectedType));
      const digest = buildScheduleDigest(childEvents, selectedDate);
      const noticeBanner = presentNoticeBanner(articles);
      this.setData({
        state: "ready",
        message: "",
        children,
        activeStudentId: active?.id ?? "",
        activeStudentName: active?.name ?? "全部孩子",
        events,
        calendarEvents: childEvents,
        visibleEvents,
        selectedDateLabel: formatCalendarDate(selectedDate),
        todayLabel: digest.todayLabel,
        selectedCountLabel: selectedCountLabel(this.data.selectedDate, digest.todayCount),
        todayCount: digest.todayCount,
        weekCount: digest.weekCount,
        weekHours: digest.weekHours,
        noticeBanner,
      });
    } catch (error) {
      if (loadToken !== scheduleLoadTokens.get(this)) return;
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  onUnload(){scheduleLoadTokens.set(this,(scheduleLoadTokens.get(this)??0)+1);familySelections.delete(this);},
  onChildChange(event: { detail: { studentId: string } }) {
    familySelections.add(this);
    const id = event.detail.studentId === "all" ? "" : event.detail.studentId;
    if(id && !this.data.children.some((child:StudentSummary)=>child.id===id))return;
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
      calendarEvents: childEvents,
    });
    this.applyFilters();
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ selectedDate: event.detail.value, selectedDateLabel: formatCalendarDate(event.detail.value) });
    this.load();
  },
  onCalendarChange(event: {detail:{date:string}}) {
    if (event.detail.date === this.data.selectedDate) return;
    return this.onDateChange({detail:{value:event.detail.date}});
  },
  onCalendarViewChange(event: {detail:{expanded:boolean}}) {this.setData({isMonthPickerExpanded:event.detail.expanded});if(event.detail.expanded)return this.load();},
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
    const dateMatched = !selectedDate || calendarDateKey(event.startsAt) === selectedDate;
    return childMatched && typeMatched && dateMatched;
  });
}

export function presentNoticeBanner(articles: ContentArticle[]): NoticeBannerView | null {
  const now = Date.now();
  const article = articles.find((item) => {
    const publishedAt = item.publishedAt ? Date.parse(item.publishedAt) : null;
    const expiresAt = item.expiresAt ? Date.parse(item.expiresAt) : null;
    return item.category === "notice"
      && (publishedAt === null || (Number.isFinite(publishedAt) && publishedAt <= now))
      && (expiresAt === null || (Number.isFinite(expiresAt) && expiresAt > now));
  });
  if (!article) return null;
  const source = (article.subtitle?.trim() || article.body || article.title).replace(/\s+/g, " ").trim();
  return {
    id: article.id,
    title: article.title,
    summary: source.length > 52 ? `${source.slice(0, 52)}…` : source,
    metaLabel: "俱乐部公告",
    hasDetail: Boolean(article.body || article.subtitle),
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
  const startTime=Date.parse(`${weekStart.toISOString().slice(0,10)}T00:00:00+08:00`);
  const endTime=startTime+7*86400000;
  const weekEvents = events.filter((event) => {
    const startsAt = Date.parse(event.startsAt);
    return Number.isFinite(startsAt) && startsAt >= startTime && startsAt < endTime;
  });
  const weekMinutes = weekEvents.reduce((total, event) => {
    const span = Date.parse(event.endsAt ?? "") - Date.parse(event.startsAt ?? "");
    return total + (Number.isFinite(span) && span > 0 ? span : 0);
  }, 0) / 60000;
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const todayLabel = `${selected.getUTCFullYear()}年${selected.getUTCMonth() + 1}月${selected.getUTCDate()}日 周${weekdays[selected.getUTCDay()]}`;
  const weekCount = weekEvents.length;
  const weekHours = (Math.round(weekMinutes / 6) / 10).toString();
  return {
    todayLabel,
    todayCount: events.filter((event) => calendarDateKey(event.startsAt) === selectedKey).length,
    weekCount,
    weekHours,

  };
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "日程读取失败，请检查网络或稍后重试。";
}
