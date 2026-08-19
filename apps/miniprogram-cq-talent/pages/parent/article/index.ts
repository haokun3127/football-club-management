import { getContentArticles } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  articleId: string;
  title: string;
  subtitle: string;
  accent: string;
  hasSubtitle: boolean;
  paragraphs: string[];
}

Page<PageData>({
  data: {
    menuInset: resolveMenuInset(),
    navInset: resolveNavInset(),
    state: "loading",
    message: "正在加载文章",
    articleId: "",
    title: "",
    subtitle: "",
    accent: "#a80f1b",
    hasSubtitle: false,
    paragraphs: [],
  },
  onLoad(query: { id?: string }) {
    requireRole("parent");
    this.load(query?.id || "");
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  retryLoad() {
    this.load(this.data.articleId);
  },
  async load(articleId: string) {
    if (!articleId) {
      this.setData({ state: "empty", message: "文章不存在或已下线。" });
      return;
    }
    this.setData({ state: "loading", message: "正在加载文章", articleId });
    try {
      const articles = await getContentArticles();
      const article = articles.find((item) => item.id === articleId);
      if (!article) {
        this.setData({ state: "empty", message: "文章不存在或已下线。" });
        return;
      }
      const paragraphs = (article.body || "").split(/\n{2,}/).map((part) => part.trim()).filter((part) => part.length > 0);
      this.setData({
        state: "ready",
        message: "",
        title: article.title,
        subtitle: article.subtitle,
        accent: article.accent || "#a80f1b",
        hasSubtitle: Boolean(article.subtitle),
        paragraphs: paragraphs.length > 0 ? paragraphs : [article.subtitle || article.title],
      });
    } catch {
      this.setData({ state: "error", message: "文章读取失败，请点击重试。" });
    }
  },
});
