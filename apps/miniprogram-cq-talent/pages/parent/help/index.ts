import { getContentFaqs } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { ContentFaq } from "../../../utils/types";

interface HelpCategory {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
}

interface PageData {
  categories: HelpCategory[];
  questions: Array<ContentFaq & { open: boolean }>;
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

Page<PageData>({
  data: {
    categories: CATEGORIES,
    questions: [],
  },
  onLoad() {
    requireRole("parent");
    this.loadFaqs();
  },
  async loadFaqs() {
    try {
      const faqs = await getContentFaqs();
      this.setData({ questions: faqs.map((item) => ({ ...item, open: false })) });
    } catch {
      wx.showToast({ title: "问题加载失败，请稍后重试", icon: "none" });
    }
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
      questions: this.data.questions.map((item: ContentFaq & { open: boolean }) =>
        item.id === id ? { ...item, open: !item.open } : item,
      ),
    });
  },
  contactWechat() {
    wx.showToast({ title: "客服信息待同步", icon: "none" });
  },
  goBack() { wx.navigateBack(); },
});
