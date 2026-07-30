import { createCoachEventChangeRequest, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { LoadState } from "../../../utils/types";

interface ReasonOption {
  value: "venue" | "time" | "weather" | "other";
  label: string;
}

interface PageData {
  state: LoadState;
  message: string;
  eventId: string;
  eventTitle: string;
  eventMeta: string;
  eventStatus: string;
  reasons: ReasonOption[];
  reasonIndex: number;
  newDate: string;
  newTime: string;
  newVenue: string;
  note: string;
  submitting: boolean;
}

const REASONS: ReasonOption[] = [
  { value: "venue", label: "场地变更" },
  { value: "time", label: "时间调整" },
  { value: "weather", label: "天气原因" },
  { value: "other", label: "其他" },
];

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    eventId: "",
    eventTitle: "",
    eventMeta: "",
    eventStatus: "",
    reasons: REASONS,
    reasonIndex: 0,
    newDate: "",
    newTime: "",
    newVenue: "",
    note: "",
    submitting: false,
  },
  onLoad(query: { id?: string }) {
    this.load(query?.id || "");
  },
  async load(eventId: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!eventId) {
      this.setData({ state: "empty", message: "缺少活动参数，请从活动详情页进入。" });
      return;
    }
    this.setData({ state: "loading", message: "正在读取活动信息", eventId });
    try {
      const workbench = await getCoachWorkbench(eventId);
      const event = workbench.event;
      this.setData({
        state: "ready",
        message: "",
        eventTitle: event.title,
        eventMeta: [event.teamName, (event.startsAt || "").slice(0, 16).replace("T", " ")].filter(Boolean).join(" · "),
        eventStatus: event.status === "cancelled" ? "已取消" : "已排定",
        newVenue: event.venue || "",
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "活动信息读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  selectReason(event: { currentTarget: { dataset: { index: number } } }) {
    this.setData({ reasonIndex: event.currentTarget.dataset.index });
  },
  selectDate(event: { detail: { value: string } }) {
    this.setData({ newDate: event.detail.value });
  },
  selectTime(event: { detail: { value: string } }) {
    this.setData({ newTime: event.detail.value });
  },
  inputVenue(event: { detail: { value: string } }) {
    this.setData({ newVenue: event.detail.value });
  },
  inputNote(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },
  async submit() {
    if (this.data.submitting) return;
    const reason = this.data.reasons[this.data.reasonIndex].value;
    const newStartsAt = this.data.newDate && this.data.newTime
      ? `${this.data.newDate}T${this.data.newTime}:00+08:00`
      : undefined;
    if (reason === "time" && !newStartsAt) {
      wx.showToast({ title: "请选择新的日期和时间", icon: "none" });
      return;
    }
    if (reason === "venue" && !this.data.newVenue.trim()) {
      wx.showToast({ title: "请填写新场地", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      await createCoachEventChangeRequest(this.data.eventId, {
        reason,
        newStartsAt,
        newVenue: this.data.newVenue.trim() || undefined,
        note: this.data.note.trim() || undefined,
      });
      wx.showToast({ title: "变更申请已提交", icon: "success" });
      wx.navigateBack({ delta: 1 });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error instanceof Error ? error.message : "提交失败，请稍后重试", icon: "none" });
    }
  },
});
