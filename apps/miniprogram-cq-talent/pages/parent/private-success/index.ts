import { getPrivateLessonRequests } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, PrivateLessonRequest } from "../../../utils/types";

interface PrivateLessonView {
  id: string;
  studentId: string;
  coachName: string;
  date: string;
  timeSlot: string;
  goalsLabel: string;
  hasGoals: boolean;
  note: string;
  hasNote: boolean;
  status: PrivateLessonRequest["status"];
  statusLabel: string;
  navTitle: string;
  headline: string;
  confirmHint: string;
  hasConfirmation: boolean;
}

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  requestId: string;
  studentId: string;
  request: PrivateLessonView | null;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    message: "",
    requestId: "",
    studentId: "",
    request: null,
  },
  onLoad(query: { request?: string; student?: string }) {
    return this.load(query?.request || "", query?.student || "");
  },
  async load(requestId: string, studentId: string) {
    const session = requireRole("parent");
    if (!session) return;
    if (!requestId || !studentId) {
      this.setData({
        state: "error",
        message: "缺少咨询记录信息，无法读取提交结果",
        requestId,
        studentId,
        request: null,
      });
      return;
    }

    this.setData({
      state: "loading",
      message: "正在读取咨询详情",
      requestId,
      studentId,
      request: null,
    });
    try {
      const requests = await getPrivateLessonRequests(studentId);
      const request = requests.find((item) => item.id === requestId && item.studentId === studentId);
      if (!request) {
        this.setData({ state: "error", message: "未找到对应的咨询记录", request: null });
        return;
      }
      this.setData({ state: "ready", message: "", request: presentRequest(request) });
    } catch {
      this.setData({ state: "error", message: "无法读取咨询记录，请稍后重试", request: null });
    }
  },
  retry() {
    this.load(this.data.requestId, this.data.studentId);
  },
  backToSchedule() {
    wx.reLaunch({ url: "/pages/parent/schedule/index" });
  },
  backToHome() {
    wx.reLaunch({ url: "/pages/parent/schedule/index" });
  },
  goBack() {
    wx.navigateBack();
  },
});

function presentRequest(request: PrivateLessonRequest): PrivateLessonView {
  // F-11：只呈现真实咨询状态（待处理/已承接/取消），不自动承诺预约或购买
  const hasConfirmation = request.status === "confirmed";
  return {
    id: request.id,
    studentId: request.studentId,
    coachName: request.coachName,
    date: request.date,
    timeSlot: request.timeSlot,
    goalsLabel: request.goals.join(", "),
    hasGoals: request.goals.length > 0,
    note: request.note || "",
    hasNote: Boolean(request.note),
    status: request.status,
    statusLabel: statusLabel(request.status),
    navTitle: statusNavTitle(request.status),
    headline: statusHeadline(request.status),
    confirmHint: request.status === "pending"
      ? "咨询已提交，教练会尽快与你确认训练安排，请留意通知"
      : `当前状态：${statusLabel(request.status)}`,
    hasConfirmation,
  };
}

function statusLabel(status: PrivateLessonRequest["status"]): string {
  const labels: Record<PrivateLessonRequest["status"], string> = {
    pending: "待处理",
    confirmed: "已承接",
    declined: "未承接",
    cancelled: "已取消",
  };
  return labels[status];
}

function statusNavTitle(status: PrivateLessonRequest["status"]): string {
  if (status === "confirmed") return "咨询已承接";
  if (status === "declined") return "咨询未承接";
  if (status === "cancelled") return "咨询已取消";
  return "咨询已提交";
}

function statusHeadline(status: PrivateLessonRequest["status"]): string {
  if (status === "confirmed") return "教练已承接本次咨询";
  if (status === "declined") return "本次咨询未承接";
  if (status === "cancelled") return "本次咨询已取消";
  return "咨询已提交";
}
