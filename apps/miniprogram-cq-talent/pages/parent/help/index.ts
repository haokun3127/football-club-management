import { getContentFaqs } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { ContentFaq, LoadState } from "../../../utils/types";

interface HelpCategory {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface FaqQuestion extends ContentFaq {
  open: boolean;
}

interface VisibleFaqQuestion extends FaqQuestion {
  showDivider: boolean;
}

interface PageData {
  state: LoadState;
  message: string;
  categories: HelpCategory[];
  activeCategory: string;
  searchKeyword: string;
  questions: FaqQuestion[];
  visibleQuestions: VisibleFaqQuestion[];
  hasVisibleQuestions: boolean;
  emptyMessage: string;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading",
    message: "正在加载帮助问题",
    categories: [],
    activeCategory: "",
    searchKeyword: "",
    questions: [],
    visibleQuestions: [],
    hasVisibleQuestions: false,
    emptyMessage: "暂无可展示的帮助问题",
  },
  onLoad() {
    requireRole("parent");
    this.loadFaqs();
  },
  async loadFaqs() {
    this.setData({ state: "loading", message: "正在加载帮助问题" });
    try {
      const questions = presentQuestions(await getContentFaqs());
      const categories = presentCategories(questions);
      const visibleQuestions = filterQuestions(questions, this.data.activeCategory);
      const hasQuestions = questions.length > 0;
      this.setData({
        state: hasQuestions ? "ready" : "empty",
        message: hasQuestions ? "" : "暂无可展示的帮助问题",
        categories,
        questions,
        visibleQuestions,
        hasVisibleQuestions: visibleQuestions.length > 0,
        emptyMessage: hasQuestions ? "当前分类暂无帮助问题" : "暂无可展示的帮助问题",
      });
    } catch {
      this.setData({
        state: "error",
        message: "帮助问题加载失败，请点击重试",
        categories: [],
        questions: [],
        visibleQuestions: [],
        hasVisibleQuestions: false,
        emptyMessage: "",
      });
    }
  },
  selectCategory(event: { currentTarget: { dataset: { value: string } } }) {
    const activeCategory = this.data.categories.some((category: HelpCategory) => category.value === event.currentTarget.dataset.value)
      ? event.currentTarget.dataset.value
      : "all";
    const visibleQuestions = filterQuestions(this.data.questions, activeCategory, this.data.searchKeyword);
    this.setData({
      activeCategory,
      visibleQuestions,
      hasVisibleQuestions: visibleQuestions.length > 0,
      emptyMessage: this.data.questions.length > 0 ? "当前分类暂无帮助问题" : "暂无可展示的帮助问题",
    });
  },
  onSearchInput(event: { detail: { value: string } }) {
    const searchKeyword = (event.detail.value ?? "").trim();
    const visibleQuestions = filterQuestions(this.data.questions, this.data.activeCategory, searchKeyword);
    this.setData({
      searchKeyword,
      visibleQuestions,
      hasVisibleQuestions: visibleQuestions.length > 0,
      emptyMessage: searchKeyword ? "没有匹配的常见问题" : "当前分类暂无帮助问题",
    });
  },
  toggleQuestion(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    const questions = this.data.questions.map((item: FaqQuestion) =>
      item.id === id ? { ...item, open: !item.open } : item,
    );
    const visibleQuestions = filterQuestions(questions, this.data.activeCategory);
    this.setData({
      questions,
      visibleQuestions,
    });
  },
  goBack() { wx.navigateBack(); },
});

function presentQuestions(faqs: ContentFaq[]): FaqQuestion[] {
  return faqs.map(({ id, category, q, a }) => ({ id, category, q, a, open: false }));
}

function presentCategories(questions: FaqQuestion[]): HelpCategory[] {
  const present = questions.reduce<string[]>((values, question) => {
    if (question.category && !values.includes(question.category)) values.push(question.category);
    return values;
  }, []);
  // 设计稿顺序：训练规则/出勤说明/成长报告/账号设置/联系客服 + 更多问题（=全部）
  const ordered = CATEGORY_ORDER.filter((category) => present.includes(category));
  const extras = present.filter((category) => !CATEGORY_ORDER.includes(category));
  return [
    ...[...ordered, ...extras].map((category) => ({
      label: category,
      value: category,
      icon: CATEGORY_META[category]?.icon ?? "/assets/icons/content-help-circle.svg",
      color: CATEGORY_META[category]?.color ?? "#667085",
    })),
    { label: "更多问题", value: "all", icon: "/assets/icons/more-horizontal.svg", color: "#7c3aed" },
  ];
}

const CATEGORY_ORDER = ["训练规则", "出勤说明", "成长报告", "账号设置", "联系客服"];
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  训练规则: { icon: "/assets/icons/content-book.svg", color: "#a80f1b" },
  出勤说明: { icon: "/assets/icons/tab-calendar.svg", color: "#1976d2" },
  成长报告: { icon: "/assets/icons/tab-growth.svg", color: "#22c55e" },
  账号设置: { icon: "/assets/icons/settings-gear.svg", color: "#667085" },
  联系客服: { icon: "/assets/icons/content-help-circle.svg", color: "#ff9800" },
};

function filterQuestions(questions: FaqQuestion[], category: string, keyword = ""): VisibleFaqQuestion[] {
  const byCategory = !category || category === "all" ? questions : questions.filter((question) => question.category === category);
  const filtered = keyword
    ? byCategory.filter((question) => question.q.includes(keyword) || question.a.includes(keyword))
    : byCategory;
  return filtered.map((question, index) => ({ ...question, showDivider: index < filtered.length - 1 }));
}
