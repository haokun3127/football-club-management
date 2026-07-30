import { getContentArticles } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { ContentArticle } from "../../../utils/types";

interface Category {
  label: string;
  value: string;
}

interface QuickLink {
  icon: string;
  color: string;
  label: string;
  category: string;
  page?: string;
}

interface PageData {
  categories: Category[];
  activeCategory: string;
  featured: { category: string; title: string; subtitle: string };
  quickLinks: QuickLink[];
  articles: ContentArticle[];
  visibleArticles: ContentArticle[];
}

// Figma P8 Content Center 设计内容（静态，待后端内容服务接入后替换为 API 数据）
const CATEGORIES: Category[] = [
  { label: "全部", value: "all" },
  { label: "场地", value: "venue" },
  { label: "帮助", value: "help" },
  { label: "教练团队", value: "coach" },
  { label: "攻略", value: "guide" },
];

const QUICK_LINKS: QuickLink[] = [
  { icon: "📍", color: "#1976d2", label: "场地信息", category: "venue", page: "/pages/parent/venues/index" },
  { icon: "❓", color: "#ff9800", label: "帮助中心", category: "help", page: "/pages/parent/help/index" },
  { icon: "👥", color: "#22c55e", label: "教练团队", category: "coach", page: "/pages/parent/coaches/index" },
  { icon: "📖", color: "#a80f1b", label: "训练攻略", category: "guide" },
];

Page<PageData>({
  data: {
    categories: CATEGORIES,
    activeCategory: "all",
    featured: { category: "场地", title: "球场预订指南", subtitle: "了解各场地设施与预订流程" },
    quickLinks: QUICK_LINKS,
    articles: [],
    visibleArticles: [],
  },
  onLoad() {
    requireRole("parent");
    this.loadArticles();
  },
  async loadArticles() {
    try {
      const articles = await getContentArticles();
      this.setData({ articles, visibleArticles: this.data.activeCategory === "all" ? articles : articles.filter((article: ContentArticle) => article.category === this.data.activeCategory) });
    } catch {
      wx.showToast({ title: "内容加载失败，请稍后重试", icon: "none" });
    }
  },
  selectCategory(event: { currentTarget: { dataset: { value: string } } }) {
    this.applyFilter(event.currentTarget.dataset.value);
  },
  openQuickLink(event: { currentTarget: { dataset: { category: string } } }) {
    const link = QUICK_LINKS.find((item) => item.category === event.currentTarget.dataset.category);
    if (link?.page) {
      openPage(link.page);
      return;
    }
    this.applyFilter(event.currentTarget.dataset.category);
  },
  applyFilter(category: string) {
    this.setData({
      activeCategory: category,
      visibleArticles: category === "all"
        ? this.data.articles
        : this.data.articles.filter((article: ContentArticle) => article.category === category),
    });
  },
  openArticle() {
    wx.showToast({ title: "内容详情即将上线", icon: "none" });
  },
  openSearch() {
    wx.showToast({ title: "内容搜索即将上线", icon: "none" });
  },
});
