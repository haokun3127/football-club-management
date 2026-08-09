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
  headline: string;
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
        message: "缺少预约凭据，无法读取申请结果",
        requestId,
        studentId,
        request: null,
      });
      return;
    }

    this.setData({
      state: "loading",
      message: "正在读取预约申请",
      requestId,
      studentId,
      request: null,
    });
    try {
      const requests = await getPrivateLessonRequests(studentId);
      const request = requests.find((item) => item.id === requestId && item.studentId === studentId);
      if (!request) {
        this.setData({ state: "error", message: "未找到对应的预约申请", request: null });
        return;
      }
      this.setData({ state: "ready", message: "", request: presentRequest(request) });
    } catch {
      this.setData({ state: "error", message: "无法读取预约申请，请稍后重试", request: null });
    }
  },
  retry() {
    this.load(this.data.requestId, this.data.studentId);
  },
  backToSchedule() {
    wx.reLaunch({ url: "/pages/parent/schedule/index" });
  },
  backToChild() {
    wx.reLaunch({ url: "/pages/parent/child/index" });
  },
  goBack() {
    wx.navigateBack();
  },
});

function presentRequest(request: PrivateLessonRequest): PrivateLessonView {
  const hasConfirmation = request.status === "pending" || request.status === "confirmed";
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
    headline: statusHeadline(request.status),
    hasConfirmation,
  };
}

function statusLabel(status: PrivateLessonRequest["status"]): string {
  const labels: Record<PrivateLessonRequest["status"], string> = {
    pending: "待处理",
    confirmed: "已确认",
    declined: "未确认",
    cancelled: "已取消",
  };
  return labels[status];
}

function statusHeadline(status: PrivateLessonRequest["status"]): string {
  if (status === "confirmed") return "预约已确认";
  if (status === "declined") return "预约未获确认";
  if (status === "cancelled") return "预约已取消";
  return "预约申请已提交";
}
