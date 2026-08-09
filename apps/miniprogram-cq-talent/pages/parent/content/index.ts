import { getContentArticles } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { ContentArticle, LoadState } from "../../../utils/types";

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

interface ArticleView {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  category: ContentArticle["category"];
}

interface PageData {
  state: LoadState;
  message: string;
  categories: Category[];
  activeCategory: string;

  quickLinks: QuickLink[];
  articles: ArticleView[];
  visibleArticles: ArticleView[];
  hasVisibleArticles: boolean;
  emptyMessage: string;
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
    state: "loading",
    message: "正在加载内容",
    categories: CATEGORIES,
    activeCategory: "all",

    quickLinks: QUICK_LINKS,
    articles: [],
    visibleArticles: [],
    hasVisibleArticles: false,
    emptyMessage: "暂无可展示的内容",
  },
  onLoad() {
    requireRole("parent");
    this.loadArticles();
  },
  async loadArticles() {
    this.setData({ state: "loading", message: "正在加载内容" });
    try {
      const articles = presentArticles(await getContentArticles());
      const visibleArticles = filterArticles(articles, this.data.activeCategory);
      const hasArticles = articles.length > 0;
      this.setData({
        state: hasArticles ? "ready" : "empty",
        message: hasArticles ? "" : "暂无可展示的内容",
        articles,
        visibleArticles,
        hasVisibleArticles: visibleArticles.length > 0,
        emptyMessage: hasArticles ? "当前分类暂无内容" : "暂无可展示的内容",
      });
    } catch {
      this.setData({
        state: "error",
        message: "内容加载失败，请点击重试",
        articles: [],
        visibleArticles: [],
        hasVisibleArticles: false,
        emptyMessage: "",
      });
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
    const activeCategory = CATEGORIES.some((item) => item.value === category) ? category : "all";
    const visibleArticles = filterArticles(this.data.articles, activeCategory);
    this.setData({
      activeCategory,
      visibleArticles,
      hasVisibleArticles: visibleArticles.length > 0,
      emptyMessage: this.data.articles.length > 0 ? "当前分类暂无内容" : "暂无可展示的内容",
    });
  },
});

function presentArticles(articles: ContentArticle[]): ArticleView[] {
  return articles.map(({ id, title, subtitle, accent, category }) => ({ id, title, subtitle, accent, category }));
}

function filterArticles(articles: ArticleView[], category: string): ArticleView[] {
  return category === "all" ? articles : articles.filter((article) => article.category === category);
}
