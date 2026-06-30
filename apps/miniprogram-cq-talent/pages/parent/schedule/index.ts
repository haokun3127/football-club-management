import { getParentChildren, getParentSchedule } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
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
  selectedDate: string;
}

Page<PageData>({
  data: {
    state: "loading",
    message: "正在读取家庭日程",
    children: [],
    activeStudentId: "",
    activeStudentName: "",
    events: [],
    selectedDate: "2026-07-01",
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
      const events = await getParentSchedule(active.id);
      this.setData({
        state: events.length ? "ready" : "empty",
        message: events.length ? "" : "该孩子当前日期范围暂无活动安排。",
        children,
        activeStudentId: active.id,
        activeStudentName: active.name,
        events,
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
    this.load();
  },
  openEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id) openPage(`/pages/parent/event/index?id=${id}`);
  },
  retry() {
    this.load();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "日程读取失败，请检查网络或稍后重试。";
}
