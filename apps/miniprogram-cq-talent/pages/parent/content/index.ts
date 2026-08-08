import { getContentArticles } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
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

  quickLinks: QuickLink[];
  articles: ContentArticle[];
  visibleArticles: ContentArticle[];
}


const CATEGORIES: Category[] = [
  { label: "全部", value: "all" },
  { label: "场地", value: "venue" },
  { label: "帮助", value: "help" },
  { label: "教练团队", value: "coach" },
  { label: "攻略", value: "guide" },
];

const QUICK_LINKS: QuickLink[] = [
  { icon: "场", color: "#2068d8", label: "场地信息", category: "venue", page: "/pages/parent/venues/index" },
  { icon: "问", color: "#b06800", label: "帮助中心", category: "help", page: "/pages/parent/help/index" },
  { icon: "教", color: "#188050", label: "教练团队", category: "coach", page: "/pages/parent/coaches/index" },
  { icon: "训", color: "#a80818", label: "训练攻略", category: "guide" },
];

Page<PageData>({
  data: {
    menuInset: resolveMenuInset(),
    navInset: resolveNavInset(),
    categories: CATEGORIES,
    activeCategory: "all",

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
