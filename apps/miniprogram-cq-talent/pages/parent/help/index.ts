import { requireRole } from "../../../utils/auth";

interface HelpCategory {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
}

interface Question {
  id: string;
  q: string;
  a: string;
}

interface PageData {
  categories: HelpCategory[];
  questions: Array<Question & { open: boolean }>;
}

// Figma P8.2 Help Center 设计内容（静态，待后端内容服务接入）
const CATEGORIES: HelpCategory[] = [
  { icon: "⛔", iconBg: "#fee2e2", iconColor: "#a80f1b", label: "训练规则" },
  { icon: "📅", iconBg: "#dbeafe", iconColor: "#3b82f6", label: "出勤说明" },
  { icon: "📊", iconBg: "#d1fae5", iconColor: "#10b981", label: "成长报告" },
  { icon: "⚙️", iconBg: "#f3f4f6", iconColor: "#6b7280", label: "账号设置" },
  { icon: "💬", iconBg: "#ffedd5", iconColor: "#f97316", label: "联系客服" },
  { icon: "⋯", iconBg: "#f5f3ff", iconColor: "#8b5cf6", label: "更多问题" },
];

const QUESTIONS: Question[] = [
  {
    id: "q1",
    q: "家长如何确认孩子到场？",
    a: "教练在活动开始时会进行点名，点名结果会同步到日程页的活动卡片上。您可以在「日程」页点击当天活动查看出勤状态。",
  },
  {
    id: "q2",
    q: "训练取消如何通知？",
    a: "训练取消或时间变更时，系统会在「提醒中心」推送通知，日程页铃铛出现红点即表示有新提醒，请及时查看。",
  },
  {
    id: "q3",
    q: "如何查看孩子的成长报告？",
    a: "在底部「成长」标签页可查看孩子的能力雷达图与最新评测数据；点击具体指标可查看历史趋势与教练评语。",
  },
];

Page<PageData>({
  data: {
    categories: CATEGORIES,
    questions: QUESTIONS.map((q) => ({ ...q, open: false })),
  },
  onLoad() {
    requireRole("parent");
  },
  openSearch() {
    wx.showToast({ title: "问题搜索即将上线", icon: "none" });
  },
  openCategory() {
    wx.showToast({ title: "分类内容即将上线", icon: "none" });
  },
  toggleQuestion(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    this.setData({
      questions: this.data.questions.map((item: Question & { open: boolean }) =>
        item.id === id ? { ...item, open: !item.open } : item,
      ),
    });
  },
  contactWechat() {
    wx.showToast({ title: "请添加俱乐部微信客服", icon: "none" });
  },
});
