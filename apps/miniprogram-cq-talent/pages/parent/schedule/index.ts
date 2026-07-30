import { getParentCalendar, getParentChildren, getParentReminders } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_MODE, DEV_TEST_DATE } from "../../../utils/config";
import { openPage } from "../../../utils/navigation";
import { activityStatus, childNames, formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import { countUnreadReminders } from "../../../utils/reminders";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, ScheduleEvent, StudentSummary } from "../../../utils/types";

type ScheduleEventView = ScheduleEvent & {
  timeLabel: string;
  statusLabel: string;
  statusTone: string;
  description: string;
  meta: Array<{ label: string; value: string }>;
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
  dateOptions: Array<{ date: string; day: string; weekday: string; count: number }>;
  hasUnreadReminders: boolean;
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
      this.setData({ hasUnreadReminders: countUnreadReminders(reminders) > 0 });
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
      const visibleEvents = presentEvents(filterEvents(events, this.data.activeStudentId, this.data.selectedDate, this.data.selectedType));
      this.setData({
        state: visibleEvents.length ? "ready" : "empty",
        message: visibleEvents.length ? "" : "当前筛选条件暂无活动安排。",
        children,
        activeStudentId: active?.id ?? "",
        activeStudentName: active?.name ?? "全部孩子",
        events,
        visibleEvents,
        selectedDateLabel: formatCalendarDate(this.data.selectedDate),
        dateOptions: buildDateOptions(this.data.selectedDate, events),
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  onChildChange(event: { detail: { studentId: string } }) {
    const id = event.detail.studentId === "all" ? "" : event.detail.studentId;
    const child = this.data.children.find((item: StudentSummary) => item.id === id);
    if (id) setCurrentStudentId(id);
    this.setData({ activeStudentId: id, activeStudentName: child?.name ?? "全部孩子" });
    this.applyFilters();
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ selectedDate: event.detail.value, selectedDateLabel: formatCalendarDate(event.detail.value) });
    this.load();
  },
  selectDate(event: { currentTarget: { dataset: { date?: string } } }) {
    const date = event.currentTarget.dataset.date;
    if (!date || date === this.data.selectedDate) return;
    this.setData({ selectedDate: date, selectedDateLabel: formatCalendarDate(date) });
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
      state: visibleEvents.length ? "ready" : "empty",
      message: visibleEvents.length ? "" : "当前筛选条件暂无活动安排。",
    });
  },
  openEvent(event: { detail?: { eventId?: string }; currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.detail?.eventId || event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/parent/event/index?id=${id}`);
  },
  openReminders() {
    openPage("/pages/parent/reminders/index");
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
      meta: [
        { label: "孩子", value: childNames(event) },
        { label: "队伍", value: event.teamName || "待确认" },
      ],
    };
  });
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
