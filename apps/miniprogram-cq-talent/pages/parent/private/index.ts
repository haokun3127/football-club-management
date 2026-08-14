import { createPrivateLessonRequest, getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, StudentSummary } from "../../../utils/types";

interface ChipOption {
  label: string;
  value: string;
  selected: boolean;
}

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
  timeSlots: ChipOption[];
  selectedSlot: string;
  goalOptions: ChipOption[];
  goals: string[];
  timeSlot: string;
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
  selectedSlot: string;
  goals: string[];
  submitting: boolean;
}

interface PrivateLessonPage extends PageData {
  privateLessonSubmitting?: boolean;
}

// 设计稿时段/目标 chips：预约时段为整点课节，目标为四类专项
const TIME_SLOTS = ["09:00-10:00", "10:30-11:30", "14:00-15:00", "16:00-17:00", "19:00-20:00"];
const GOAL_OPTIONS = ["传球", "射门", "体能", "技巧"];

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
    timeSlots: presentChips(TIME_SLOTS, ""),
    selectedSlot: "",
    goalOptions: presentChips(GOAL_OPTIONS, ""),
    goals: [],
    timeSlot: "",
    note: "",
    canSubmit: false,
    submitLabel: "提交预约",
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
        selectedSlot: "",
        goals: [],
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
  selectSlot(event: { currentTarget: { dataset: { value: string } } }) {
    const value = event.currentTarget.dataset.value;
    const selectedSlot = this.data.selectedSlot === value ? "" : value;
    this.setData({ timeSlots: presentChips(TIME_SLOTS, selectedSlot) });
    this.updateForm({ selectedSlot });
  },
  toggleGoal(event: { currentTarget: { dataset: { value: string } } }) {
    const value = event.currentTarget.dataset.value;
    const goals = this.data.goals.includes(value)
      ? this.data.goals.filter((goal: string) => goal !== value)
      : [...this.data.goals, value];
    this.setData({ goalOptions: GOAL_OPTIONS.map((label) => ({ label, value: label, selected: goals.includes(label) })) });
    this.updateForm({ goals });
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

function presentChips(options: string[], selected: string): ChipOption[] {
  return options.map((option) => ({ label: option, value: option, selected: option === selected }));
}

function buildFormState(values: FormValues) {
  const timeSlot = values.selectedSlot;
  const canSubmit = Boolean(
    values.studentId
      && values.selectedCoachName
      && values.date
      && timeSlot
      && values.goals.length
      && !values.submitting,
  );
  return {
    timeSlot,
    coachDisplayName: values.selectedCoachName ? `${values.selectedCoachName}（主教练）` : "暂无可用教练",
    dateLabel: values.date || "请选择日期",
    canSubmit,
    submitLabel: values.submitting ? "提交中…" : "提交预约",
  };
}

function resolveSubmitMessage(error: unknown): string {
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  if (status === 400) return "提交信息有误，请检查后重试";
  if (status === 403) return "当前账号无权为该孩子提交申请";
  return "提交失败，请稍后重试";
}
