import { getContentArticles } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { ContentArticle, LoadState } from "../../../utils/types";

interface GuideItem {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
}

interface PageData {
  state: LoadState;
  message: string;
  guides: GuideItem[];
  hasGuides: boolean;
}

Page<PageData>({
  data: {
    menuInset: resolveMenuInset(),
    navInset: resolveNavInset(),
    state: "loading",
    message: "正在加载训练攻略",
    guides: [],
    hasGuides: false,
  },
  onLoad() {
    requireRole("parent");
    this.loadGuides();
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  async loadGuides() {
    this.setData({ state: "loading", message: "正在加载训练攻略" });
    try {
      const articles = await getContentArticles();
      const guides = presentGuides(articles);
      this.setData({
        state: "ready",
        message: "",
        guides,
        hasGuides: guides.length > 0,
      });
    } catch {
      this.setData({ state: "error", message: "攻略读取失败，请点击重试。", guides: [], hasGuides: false });
    }
  },
  openGuide(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    openPage(`/pages/parent/article/index?id=${encodeURIComponent(id)}`);
  },
});

function presentGuides(articles: ContentArticle[]): GuideItem[] {
  return articles
    .filter((article) => article.category === "guide")
    .map(({ id, title, subtitle, accent }) => ({ id, title, subtitle, accent }));
}
