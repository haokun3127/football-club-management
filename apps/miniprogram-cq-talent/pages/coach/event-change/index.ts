import { createCoachEventChangeRequest, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { LoadState } from "../../../utils/types";

type ChangeReason = "venue" | "time" | "weather" | "other";

interface ReasonOption {
  value: ChangeReason;
  label: string;
}

interface ChangeRequestInput {
  reason: ChangeReason;
  newStartsAt?: string;
  newVenue?: string;
  note?: string;
}

interface PageData {
  state: LoadState;
  message: string;
  eventId: string;
  eventTitle: string;
  eventMeta: string;
  hasEventMeta: boolean;
  eventStatus: string;
  reasons: ReasonOption[];
  reasonIndex: number;
  originalStartsAt: string;
  originalVenue: string;
  newDate: string;
  newTime: string;
  newVenue: string;
  note: string;
  requiresTime: boolean;
  requiresVenue: boolean;
  hasNewDate: boolean;
  hasNewTime: boolean;
  dateDisplay: string;
  timeDisplay: string;
  canSubmit: boolean;
  submitting: boolean;
  hasSubmitError: boolean;
  submitError: string;
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
    hasEventMeta: false,
    eventStatus: "",
    reasons: REASONS,
    reasonIndex: 0,
    originalStartsAt: "",
    originalVenue: "",
    newDate: "",
    newTime: "",
    newVenue: "",
    note: "",
    requiresTime: false,
    requiresVenue: true,
    hasNewDate: false,
    hasNewTime: false,
    dateDisplay: "选择日期",
    timeDisplay: "选择时间",
    canSubmit: false,
    submitting: false,
    hasSubmitError: false,
    submitError: "",
  },
  onLoad(query: { id?: string }) {
    this.load(query?.id || "");
  },
  async load(eventId: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!eventId) {
      this.setData({ state: "empty", message: "缺少活动参数，请从活动详情页进入。", canSubmit: false });
      return;
    }
    this.setData({
      state: "loading",
      message: "正在读取活动信息",
      eventId,
      submitting: false,
      hasSubmitError: false,
      submitError: "",
    });
    try {
      const workbench = await getCoachWorkbench(eventId);
      const event = workbench.event;
      const isCancelled = event.status === "cancelled";
      const eventMeta = eventMetadata(event.teamName, event.startsAt, event.endsAt);
      this.setData({
        state: isCancelled ? "empty" : "ready",
        message: isCancelled ? "该活动已取消，不能提交变更申请。" : "",
        eventId,
        eventTitle: event.title,
        eventMeta,
        hasEventMeta: Boolean(eventMeta),
        eventStatus: eventStatusLabel(event.status),
        originalStartsAt: event.startsAt || "",
        originalVenue: event.venue || "",
        newDate: "",
        newTime: "",
        newVenue: "",
        note: "",
        requiresTime: false,
        requiresVenue: true,
        hasNewDate: false,
        hasNewTime: false,
        dateDisplay: "选择日期",
        timeDisplay: "选择时间",
        canSubmit: false,
        submitting: false,
        hasSubmitError: false,
        submitError: "",
      });
    } catch {
      this.setData({ state: "error", message: "活动信息读取失败，请稍后重试。", canSubmit: false });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  selectReason(event: { currentTarget: { dataset: { index: number } } }) {
    if (this.data.submitting) return;
    const index = Number(event.currentTarget.dataset.index);
    const reason = this.data.reasons[index];
    if (!reason) return;
    this.setData({
      reasonIndex: index,
      requiresTime: reason.value === "time",
      requiresVenue: reason.value === "venue",
      canSubmit: canSubmitChange(reason.value, this.data.originalStartsAt, this.data.originalVenue, this.data.newDate, this.data.newTime, this.data.newVenue),
      hasSubmitError: false,
      submitError: "",
    });
  },
  selectDate(event: { detail: { value: string } }) {
    if (this.data.submitting) return;
    const newDate = event.detail.value;
    const reason = selectedReason(this.data.reasons, this.data.reasonIndex);
    this.setData({
      newDate,
      hasNewDate: Boolean(newDate),
      dateDisplay: newDate || "选择日期",
      canSubmit: canSubmitChange(reason, this.data.originalStartsAt, this.data.originalVenue, newDate, this.data.newTime, this.data.newVenue),
      hasSubmitError: false,
      submitError: "",
    });
  },
  selectTime(event: { detail: { value: string } }) {
    if (this.data.submitting) return;
    const newTime = event.detail.value;
    const reason = selectedReason(this.data.reasons, this.data.reasonIndex);
    this.setData({
      newTime,
      hasNewTime: Boolean(newTime),
      timeDisplay: newTime || "选择时间",
      canSubmit: canSubmitChange(reason, this.data.originalStartsAt, this.data.originalVenue, this.data.newDate, newTime, this.data.newVenue),
      hasSubmitError: false,
      submitError: "",
    });
  },
  inputVenue(event: { detail: { value: string } }) {
    if (this.data.submitting) return;
    const newVenue = event.detail.value;
    const reason = selectedReason(this.data.reasons, this.data.reasonIndex);
    this.setData({
      newVenue,
      canSubmit: canSubmitChange(reason, this.data.originalStartsAt, this.data.originalVenue, this.data.newDate, this.data.newTime, newVenue),
      hasSubmitError: false,
      submitError: "",
    });
  },
  inputNote(event: { detail: { value: string } }) {
    if (this.data.submitting) return;
    this.setData({ note: event.detail.value.slice(0, 500), hasSubmitError: false, submitError: "" });
  },
  async submit() {
    if (this.data.submitting || this.data.state !== "ready") return;
    const reason = selectedReason(this.data.reasons, this.data.reasonIndex);
    const result = buildChangeRequest(reason, this.data.originalStartsAt, this.data.originalVenue, this.data.newDate, this.data.newTime, this.data.newVenue, this.data.note);
    if ("error" in result) {
      this.setData({ canSubmit: false, hasSubmitError: true, submitError: result.error });
      return;
    }

    this.setData({ submitting: true, hasSubmitError: false, submitError: "" });
    try {
      await createCoachEventChangeRequest(this.data.eventId, result.input);
      wx.navigateBack({ delta: 1 });
    } catch (error) {
      this.setData({ submitting: false, hasSubmitError: true, submitError: submitErrorMessage(error) });
    }
  },
});

function selectedReason(reasons: ReasonOption[], index: number): ChangeReason {
  return reasons[index]?.value ?? "other";
}

function canSubmitChange(reason: ChangeReason, originalStartsAt: string, originalVenue: string, newDate: string, newTime: string, newVenue: string) {
  return !("error" in buildChangeRequest(reason, originalStartsAt, originalVenue, newDate, newTime, newVenue, ""));
}

function buildChangeRequest(
  reason: ChangeReason,
  originalStartsAt: string,
  originalVenue: string,
  newDate: string,
  newTime: string,
  newVenue: string,
  note: string,
): { input: ChangeRequestInput } | { error: string } {
  const optionalNote = note.trim() ? { note: note.trim() } : {};
  if (reason === "venue") {
    const venue = newVenue.trim();
    if (!venue) return { error: "请填写新场地。" };
    if (normalizeVenue(venue) === normalizeVenue(originalVenue)) return { error: "新场地需与原场地不同。" };
    return { input: { reason, newVenue: venue, ...optionalNote } };
  }
  if (reason === "time") {
    if (!newDate || !newTime) return { error: "请选择新的日期和时间。" };
    const newStartsAt = `${newDate}T${newTime}:00+08:00`;
    if (!isNewDatetime(newStartsAt, originalStartsAt)) return { error: "新时间需与原活动时间不同。" };
    return { input: { reason, newStartsAt, ...optionalNote } };
  }
  return { input: { reason, ...optionalNote } };
}

function normalizeVenue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isNewDatetime(next: string, original: string) {
  const nextTime = Date.parse(next);
  const originalTime = Date.parse(original);
  return Number.isFinite(nextTime) && (!Number.isFinite(originalTime) || nextTime !== originalTime);
}

function eventMetadata(teamName?: string, startsAt?: string, endsAt?: string) {
  const parts = [teamName, startsAt && endsAt ? `${startsAt.slice(0, 16).replace("T", " ")}` : ""].filter(Boolean);
  return parts.join(" · ");
}

function eventStatusLabel(status: string) {
  if (status === "cancelled") return "已取消";
  if (status === "completed") return "已完成";
  return "已排定";
}

function submitErrorMessage(error: unknown) {
  const status = (error as { status?: unknown })?.status;
  if (status === 400) return "请检查变更信息后重试。";
  if (status === 403) return "当前账号无权提交该活动变更。";
  if (status === 404) return "活动不存在或已不可访问。";
  return "提交失败，请稍后重试。";
}
