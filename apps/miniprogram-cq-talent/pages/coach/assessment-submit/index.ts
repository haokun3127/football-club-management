import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { LoadState } from "../../../utils/types";

interface PageData {
  state: LoadState;
  statusTitle: string;
  message: string;
  taskTitle: string;
  studentCount: number;
  countLabel: string;
  dateLabel: string;
}

Page<PageData>({
  data: {
    state: "idle",
    statusTitle: "评估提交",
    message: "",
    taskTitle: "",
    studentCount: 0,
    countLabel: "",
    dateLabel: "",
  },
  onLoad(query: { title?: string; count?: string }) {
    if (!requireRole("coach")) return;

    const taskTitle = decodeRouteTitle(query?.title);
    const studentCount = parseConfirmedCount(query?.count);
    if (!taskTitle || !studentCount) {
      this.setData({
        state: "empty",
        statusTitle: "提交信息不可用",
        message: "未找到可确认的评估提交信息，请返回评估任务列表。",
        taskTitle: "",
        studentCount: 0,
        countLabel: "",
        dateLabel: "",
      });
      return;
    }

    this.setData({
      state: "ready",
      statusTitle: "评估已提交",
      message: "",
      taskTitle,
      studentCount,
      countLabel: `${studentCount} 名`,
      dateLabel: formatRelativeLocalDate(new Date()),
    });
  },
  viewResults() {
    if (this.data.state !== "ready") return;
    openPage("/pages/coach/team-ability/index");
  },
  backToList() {
    wx.navigateBack({ delta: 1 });
  },
});

function decodeRouteTitle(value?: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return "";
  }
}

function parseConfirmedCount(value?: string) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 0;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : 0;
}

function formatRelativeLocalDate(value: Date) {
  const today = new Date();
  if (
    value.getFullYear() === today.getFullYear()
    && value.getMonth() === today.getMonth()
    && value.getDate() === today.getDate()
  ) return "今天";
  return `${value.getMonth() + 1}月${value.getDate()}日`;
}
