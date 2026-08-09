import { createPrivateLessonRequest, getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, StudentSummary } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  requestedStudentId: string;
  studentId: string;
  studentName: string;
  coachOptions: string[];
  coachIndex: number;
  selectedCoachName: string;
  coachDisplayName: string;
  hasCoaches: boolean;
  date: string;
  dateLabel: string;
  startTime: string;
  startTimeLabel: string;
  endTime: string;
  endTimeLabel: string;
  timeSlot: string;
  goalsInput: string;
  goals: string[];
  note: string;
  canSubmit: boolean;
  submitLabel: string;
  submitting: boolean;
  formMessage: string;
  hasFormMessage: boolean;
}

interface FormValues {
  studentId: string;
  selectedCoachName: string;
  date: string;
  startTime: string;
  endTime: string;
  goalsInput: string;
  submitting: boolean;
}

interface PrivateLessonPage extends PageData {
  privateLessonSubmitting?: boolean;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    message: "",
    requestedStudentId: "",
    studentId: "",
    studentName: "",
    coachOptions: [],
    coachIndex: -1,
    selectedCoachName: "",
    coachDisplayName: "暂无可用教练",
    hasCoaches: false,
    date: "",
    dateLabel: "请选择日期",
    startTime: "",
    startTimeLabel: "选择开始时间",
    endTime: "",
    endTimeLabel: "选择结束时间",
    timeSlot: "",
    goalsInput: "",
    goals: [],
    note: "",
    canSubmit: false,
    submitLabel: "暂无可用教练",
    submitting: false,
    formMessage: "",
    hasFormMessage: false,
  },
  onLoad(query: { student?: string }) {
    this.load(query?.student || "");
  },
  async load(requestedStudentId: string) {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取孩子与教练信息", requestedStudentId });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子" });
        return;
      }
      const active = requestedStudentId
        ? children.find((child: StudentSummary) => child.id === requestedStudentId)
        : children[0];
      if (!active) {
        this.setData({ state: "empty", message: "未找到可预约的孩子" });
        return;
      }
      const coachOptions = active.coachNames.filter((name) => Boolean(name));
      const selectedCoachName = coachOptions[0] ?? "";
      const formState = buildFormState({
        studentId: active.id,
        selectedCoachName,
        date: "",
        startTime: "",
        endTime: "",
        goalsInput: "",
        submitting: false,
      });
      const formMessage = selectedCoachName ? "" : "当前孩子尚未分配教练，暂不能提交";
      this.setData({
        state: "ready",
        message: "",
        studentId: active.id,
        studentName: active.name,
        coachOptions,
        coachIndex: selectedCoachName ? 0 : -1,
        selectedCoachName,
        hasCoaches: coachOptions.length > 0,
        note: "",
        formMessage,
        hasFormMessage: Boolean(formMessage),
        ...formState,
      });
    } catch {
      this.setData({ state: "error", message: "预约信息读取失败，请点击重试" });
    }
  },
  retry() {
    this.load(this.data.requestedStudentId);
  },
  goBack() { wx.navigateBack(); },
  selectCoach(event: { detail: { value: string } }) {
    const coachIndex = Number(event.detail.value);
    const selectedCoachName = this.data.coachOptions[coachIndex] ?? "";
    this.setData({
      coachIndex: selectedCoachName ? coachIndex : -1,
      selectedCoachName,
      formMessage: selectedCoachName ? "" : "当前孩子尚未分配教练，暂不能提交",
      hasFormMessage: !selectedCoachName,
      ...buildFormState({ ...this.data, selectedCoachName }),
    });
  },
  selectDate(event: { detail: { value: string } }) {
    this.updateForm({ date: event.detail.value });
  },
  selectStartTime(event: { detail: { value: string } }) {
    this.updateForm({ startTime: event.detail.value });
  },
  selectEndTime(event: { detail: { value: string } }) {
    this.updateForm({ endTime: event.detail.value });
  },
  inputGoals(event: { detail: { value: string } }) {
    this.updateForm({ goalsInput: event.detail.value });
  },
  inputNote(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },
  updateForm(this: { data: PageData; setData: (patch: Partial<PageData>) => void }, values: Partial<FormValues>) {
    const formState = buildFormState({ ...this.data, ...values });
    const formMessage = this.data.selectedCoachName ? "" : "当前孩子尚未分配教练，暂不能提交";
    this.setData({
      ...values,
      ...formState,
      formMessage,
      hasFormMessage: Boolean(formMessage),
    });
  },
  async submit() {
    const page = this as unknown as PrivateLessonPage;
    if (page.privateLessonSubmitting || !this.data.canSubmit) return;
    page.privateLessonSubmitting = true;
    this.setData({
      submitting: true,
      formMessage: "",
      hasFormMessage: false,
      ...buildFormState({ ...this.data, submitting: true }),
    });
    try {
      const request = await createPrivateLessonRequest({
        studentId: this.data.studentId,
        coachName: this.data.selectedCoachName,
        date: this.data.date,
        timeSlot: this.data.timeSlot,
        goals: this.data.goals,
        note: this.data.note || undefined,
      });
      if (!request.id || request.studentId !== this.data.studentId) {
        throw new Error("Invalid private lesson response");
      }
      wx.redirectTo({
        url: `/pages/parent/private-success/index?request=${encodeURIComponent(request.id)}&student=${encodeURIComponent(request.studentId)}`,
      });
    } catch (error) {
      page.privateLessonSubmitting = false;
      this.setData({
        submitting: false,
        formMessage: resolveSubmitMessage(error),
        hasFormMessage: true,
        ...buildFormState({ ...this.data, submitting: false }),
      });
    }
  },
});

function buildFormState(values: FormValues) {
  const goals = parseGoals(values.goalsInput);
  const timeSlot = buildTimeSlot(values.startTime, values.endTime);
  const canSubmit = Boolean(
    values.studentId
      && values.selectedCoachName
      && values.date
      && timeSlot
      && goals.length
      && !values.submitting,
  );
  return {
    goals,
    timeSlot,
    coachDisplayName: values.selectedCoachName || "暂无可用教练",
    dateLabel: values.date || "请选择日期",
    startTimeLabel: values.startTime || "选择开始时间",
    endTimeLabel: values.endTime || "选择结束时间",
    canSubmit,
    submitLabel: values.submitting ? "提交中…" : canSubmit ? "提交预约" : values.selectedCoachName ? "请完善必填信息" : "暂无可用教练",
  };
}

function buildTimeSlot(startTime: string, endTime: string): string {
  return startTime && endTime && startTime < endTime ? `${startTime}-${endTime}` : "";
}

function parseGoals(value: string): string[] {
  return value.split(/[，,\n]/).map((goal) => goal.trim()).filter(Boolean);
}

function resolveSubmitMessage(error: unknown): string {
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  if (status === 400) return "提交信息有误，请检查后重试";
  if (status === 403) return "当前账号无权为该孩子提交申请";
  return "提交失败，请稍后重试";
}
