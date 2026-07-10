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
  activeStudentId: string;
  activeStudentName: string;
  events: ScheduleEvent[];
  visibleEvents: ScheduleEvent[];
  selectedDate: string;
  selectedType: "all" | ScheduleEvent["type"];
  typeTabs: Array<{ label: string; value: "all" | ScheduleEvent["type"] }>;
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
    selectedType: "all",
    typeTabs,
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
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "当前微信手机号尚未绑定孩子档案，请联系俱乐部确认登记信息。" });
        return;
      }
      setCurrentStudentId(active.id);
      const events = await getParentCalendar(dateWindowStart(this.data.selectedDate), dateWindowEnd(this.data.selectedDate));
      const visibleEvents = filterEvents(events, active.id, this.data.selectedDate, this.data.selectedType);
      this.setData({
        state: visibleEvents.length ? "ready" : "empty",
        message: visibleEvents.length ? "" : "当前筛选条件暂无活动安排。",
        children,
        activeStudentId: active.id,
        activeStudentName: active.name,
        events,
        visibleEvents,
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  switchChild(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id || id === this.data.activeStudentId) return;
    const child = this.data.children.find((item: StudentSummary) => item.id === id);
    if (!child) return;
    setCurrentStudentId(id);
    this.setData({ activeStudentId: id, activeStudentName: child.name });
    this.applyFilters();
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ selectedDate: event.detail.value });
    this.load();
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
