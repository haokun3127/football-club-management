import { createPrivateLessonRequest, getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { LoadState, StudentSummary } from "../../../utils/types";

const TIME_SLOTS = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00"];
const GOALS = ["传球", "射门", "体能", "技巧"];

interface PageData {
  state: LoadState;
  message: string;
  studentId: string;
  studentName: string;
  coachOptions: string[];
  coachIndex: number;
  date: string;
  timeSlots: string[];
  slotIndex: number;
  goals: string[];
  selectedGoals: boolean[];
  note: string;
  submitting: boolean;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    studentId: "",
    studentName: "",
    coachOptions: [],
    coachIndex: 0,
    date: "",
    timeSlots: TIME_SLOTS,
    slotIndex: -1,
    goals: GOALS,
    selectedGoals: GOALS.map(() => false),
    note: "",
    submitting: false,
  },
  onLoad(query: { student?: string }) {
    this.load(query?.student || "");
  },
  async load(studentId: string) {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取孩子与教练信息" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      const active = children.find((child: StudentSummary) => child.id === studentId) ?? children[0] as StudentSummary;
      const coaches = active.coachNames.length ? active.coachNames : ["待分配教练"];
      this.setData({
        state: "ready",
        message: "",
        studentId: active.id,
        studentName: active.name,
        coachOptions: coaches,
        coachIndex: 0,
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "信息读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load("");
  },
  goBack() { wx.navigateBack(); },
  selectCoach(event: { detail: { value: string } }) {
    this.setData({ coachIndex: Number(event.detail.value) });
  },
  selectDate(event: { detail: { value: string } }) {
    this.setData({ date: event.detail.value });
  },
  selectSlot(event: { currentTarget: { dataset: { index: number } } }) {
    this.setData({ slotIndex: event.currentTarget.dataset.index });
  },
  toggleGoal(event: { currentTarget: { dataset: { index: number } } }) {
    const index = event.currentTarget.dataset.index;
    const selectedGoals = this.data.selectedGoals.slice();
    selectedGoals[index] = !selectedGoals[index];
    this.setData({ selectedGoals });
  },
  inputNote(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },
  async submit() {
    if (this.data.submitting) return;
    const goals = this.data.goals.filter((_: string, index: number) => this.data.selectedGoals[index]);
    if (!this.data.date) {
      wx.showToast({ title: "请选择预约日期", icon: "none" });
      return;
    }
    if (this.data.slotIndex < 0) {
      wx.showToast({ title: "请选择时段", icon: "none" });
      return;
    }
    if (!goals.length) {
      wx.showToast({ title: "请选择训练目标", icon: "none" });
      return;
    }
    const coachName = this.data.coachOptions[this.data.coachIndex];
    const timeSlot = this.data.timeSlots[this.data.slotIndex];
    this.setData({ submitting: true });
    try {
      await createPrivateLessonRequest({
        studentId: this.data.studentId,
        coachName,
        date: this.data.date,
        timeSlot,
        goals,
        note: this.data.note || undefined,
      });
      wx.redirectTo({
        url: `/pages/parent/private-success/index?coach=${encodeURIComponent(coachName)}&date=${this.data.date}&slot=${encodeURIComponent(timeSlot)}&goals=${encodeURIComponent(goals.join("、"))}`,
      });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error instanceof Error ? error.message : "提交失败，请稍后重试", icon: "none" });
    }
  },
});
