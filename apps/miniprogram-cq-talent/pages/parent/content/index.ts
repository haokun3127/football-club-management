import { requireRole } from "../../../utils/auth";

interface Category {
  label: string;
  value: string;
}

interface QuickLink {
  icon: string;
  color: string;
  label: string;
  category: string;
}

interface Article {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  category: string;
}

interface PageData {
  categories: Category[];
  activeCategory: string;
  featured: { category: string; title: string; subtitle: string };
  quickLinks: QuickLink[];
  articles: Article[];
  visibleArticles: Article[];
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
  { icon: "📍", color: "#1976d2", label: "场地信息", category: "venue" },
  { icon: "❓", color: "#ff9800", label: "帮助中心", category: "help" },
  { icon: "👥", color: "#22c55e", label: "教练团队", category: "coach" },
  { icon: "📖", color: "#a80f1b", label: "训练攻略", category: "guide" },
];

const ARTICLES: Article[] = [
  { id: "a1", title: "2023秋季训练计划", subtitle: "了解最新的训练课程安排与重点内容", accent: "#a80f1b", category: "guide" },
  { id: "a2", title: "球员成长评估报告", subtitle: "详细分析球员近期训练表现与成长点", accent: "#1976d2", category: "help" },
  { id: "a3", title: "新手入门：如何选择合适场地", subtitle: "为您提供最优的场地选择与预订技巧", accent: "#ff9800", category: "venue" },
];

Page<PageData>({
  data: {
    categories: CATEGORIES,
    activeCategory: "all",
    featured: { category: "场地", title: "球场预订指南", subtitle: "了解各场地设施与预订流程" },
    quickLinks: QUICK_LINKS,
    articles: ARTICLES,
    visibleArticles: ARTICLES,
  },
  onLoad() {
    requireRole("parent");
  },
  selectCategory(event: { currentTarget: { dataset: { value: string } } }) {
    this.applyFilter(event.currentTarget.dataset.value);
  },
  openQuickLink(event: { currentTarget: { dataset: { category: string } } }) {
    this.applyFilter(event.currentTarget.dataset.category);
  },
  applyFilter(category: string) {
    this.setData({
      activeCategory: category,
      visibleArticles: category === "all"
        ? this.data.articles
        : this.data.articles.filter((article: Article) => article.category === category),
    });
  },
  openArticle() {
    wx.showToast({ title: "内容详情即将上线", icon: "none" });
  },
  openSearch() {
    wx.showToast({ title: "内容搜索即将上线", icon: "none" });
  },
});
