import { getParentCalendar, getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_MODE, DEV_TEST_DATE } from "../../../utils/config";
import { openPage } from "../../../utils/navigation";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, ScheduleEvent, StudentSummary } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  children: StudentSummary[];
  childOptions: Array<{ id: string; name: string }>;
  childIndex: number;
  activeStudentId: string;
  activeStudentName: string;
  events: ScheduleEvent[];
  visibleEvents: ScheduleEvent[];
  selectedDate: string;
  selectedType: "all" | ScheduleEvent["type"];
  typeTabs: Array<{ label: string; value: "all" | ScheduleEvent["type"] }>;
  dateOptions: Array<{ date: string; day: string; count: number }>;
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
    childOptions: [{ id: "", name: "全部孩子" }],
    childIndex: 0,
    activeStudentId: "",
    activeStudentName: "",
    events: [],
    visibleEvents: [],
    selectedDate: initialDate,
    selectedType: "all",
    typeTabs,
    dateOptions: [],
  },
  onLoad() {
    this.load();
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
      const visibleEvents = filterEvents(events, this.data.activeStudentId, this.data.selectedDate, this.data.selectedType);
      this.setData({
        state: visibleEvents.length ? "ready" : "empty",
        message: visibleEvents.length ? "" : "当前筛选条件暂无活动安排。",
        children,
        childOptions: [{ id: "", name: "全部孩子" }, ...children.map((child) => ({ id: child.id, name: child.name }))],
        childIndex: active ? children.findIndex((child) => child.id === active.id) + 1 : 0,
        activeStudentId: active?.id ?? "",
        activeStudentName: active?.name ?? "全部孩子",
        events,
        visibleEvents,
        dateOptions: buildDateOptions(this.data.selectedDate, events),
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  onChildChange(event: { detail: { value: string | number } }) {
    const childIndex = Number(event.detail.value);
    const option = this.data.childOptions[childIndex];
    if (!option) return;
    if (option.id) setCurrentStudentId(option.id);
    this.setData({ childIndex, activeStudentId: option.id, activeStudentName: option.name });
    this.applyFilters();
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ selectedDate: event.detail.value });
    this.load();
  },
  selectDate(event: { currentTarget: { dataset: { date?: string } } }) {
    const date = event.currentTarget.dataset.date;
    if (!date || date === this.data.selectedDate) return;
    this.setData({ selectedDate: date });
    this.applyFilters();
  },
  switchType(event: { currentTarget: { dataset: { type?: PageData["selectedType"] } } }) {
    const selectedType = event.currentTarget.dataset.type;
    if (!selectedType || selectedType === this.data.selectedType) return;
    this.setData({ selectedType });
    this.applyFilters();
  },
  applyFilters() {
    const visibleEvents = filterEvents(this.data.events, this.data.activeStudentId, this.data.selectedDate, this.data.selectedType);
    this.setData({
      visibleEvents,
      state: visibleEvents.length ? "ready" : "empty",
      message: visibleEvents.length ? "" : "当前筛选条件暂无活动安排。",
    });
  },
  openEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id) openPage(`/pages/parent/event/index?id=${id}`);
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
      count: events.filter((event) => event.startsAt.slice(0, 10) === key).length,
    };
  });
}

function dateWindowStart(date: string) {
  return date || initialDate;
}

function dateWindowEnd(date: string) {
  const base = new Date(`${date || initialDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + 7);
  return base.toISOString().slice(0, 10);
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
