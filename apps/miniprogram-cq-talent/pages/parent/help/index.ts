import { getContentFaqs } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { ContentFaq, LoadState } from "../../../utils/types";

interface HelpCategory {
  label: string;
  value: string;
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
    activeCategory: "all",
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
    const visibleQuestions = filterQuestions(this.data.questions, activeCategory);
    this.setData({
      activeCategory,
      visibleQuestions,
      hasVisibleQuestions: visibleQuestions.length > 0,
      emptyMessage: this.data.questions.length > 0 ? "当前分类暂无帮助问题" : "暂无可展示的帮助问题",
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
  const categories = questions.reduce<string[]>((values, question) => {
    if (question.category && !values.includes(question.category)) values.push(question.category);
    return values;
  }, []);
  return [{ label: "全部", value: "all" }, ...categories.map((category) => ({ label: category, value: category }))];
}

function filterQuestions(questions: FaqQuestion[], category: string): VisibleFaqQuestion[] {
  const filtered = category === "all" ? questions : questions.filter((question) => question.category === category);
  return filtered.map((question, index) => ({ ...question, showDivider: index < filtered.length - 1 }));
}
