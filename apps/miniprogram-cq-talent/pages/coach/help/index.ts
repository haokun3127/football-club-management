import { getContentFaqs } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
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
  navInset: number;
  state: LoadState;
  message: string;
  searchText: string;
  categories: HelpCategory[];
  hasCategories: boolean;
  activeCategory: string;
  questions: FaqQuestion[];
  visibleQuestions: VisibleFaqQuestion[];
  hasVisibleQuestions: boolean;
  emptyMessage: string;
}

Page<PageData>({
  data: helpPageData(),
  onLoad() {
    const session = requireRole("coach");
    if (!session) return;
    return this.loadFaqs();
  },
  async loadFaqs() {
    const requestToken = nextRequestToken(this);
    this.setData(helpPageData("loading", "正在同步帮助内容"));

    try {
      const questions = presentQuestions(await getContentFaqs());
      if (!isCurrentRequest(this, requestToken)) return;

      const categories = presentCategories(questions);
      const visibleQuestions = filterQuestions(questions, "all", "");
      const hasQuestions = questions.length > 0;
      this.setData({
        state: hasQuestions ? "ready" : "empty",
        message: hasQuestions ? "" : "暂无可展示的帮助问题",
        searchText: "",
        categories,
        hasCategories: categories.length > 1,
        activeCategory: "all",
        questions,
        visibleQuestions,
        hasVisibleQuestions: visibleQuestions.length > 0,
        emptyMessage: hasQuestions ? "没有匹配的帮助问题" : "暂无可展示的帮助问题",
      });
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData(helpPageData("error", "帮助内容待同步"));
    }
  },
  onSearchInput(event: { detail: { value: string } }) {
    const searchText = event.detail.value || "";
    this.setData({
      searchText,
      ...visibleQuestionData(this.data.questions, this.data.activeCategory, searchText),
    });
  },
  selectCategory(event: { currentTarget: { dataset: { value: string } } }) {
    const selected = event.currentTarget.dataset.value;
    const activeCategory = this.data.categories.some((category: HelpCategory) => category.value === selected)
      ? selected
      : "all";
    this.setData({
      activeCategory,
      ...visibleQuestionData(this.data.questions, activeCategory, this.data.searchText),
    });
  },
  toggleQuestion(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!this.data.visibleQuestions.some((question: VisibleFaqQuestion) => question.id === id)) return;

    const questions = this.data.questions.map((question: FaqQuestion) =>
      question.id === id ? { ...question, open: !question.open } : question,
    );
    this.setData({
      questions,
      ...visibleQuestionData(questions, this.data.activeCategory, this.data.searchText),
    });
  },
  goBack() {
    wx.navigateBack();
  },
});

function helpPageData(state: LoadState = "loading", message = "正在同步帮助内容"): PageData {
  return {
    navInset: resolveNavInset(),
    state,
    message,
    searchText: "",
    categories: [],
    hasCategories: false,
    activeCategory: "all",
    questions: [],
    visibleQuestions: [],
    hasVisibleQuestions: false,
    emptyMessage: "暂无可展示的帮助问题",
  };
}

function presentQuestions(faqs: ContentFaq[]): FaqQuestion[] {
  return faqs.map(({ id, q, a, category }) => ({ id, q, a, category, open: false }));
}

function presentCategories(questions: FaqQuestion[]): HelpCategory[] {
  const values = questions.reduce<string[]>((categories, question) => {
    const category = question.category.trim();
    if (category && !categories.includes(category)) categories.push(category);
    return categories;
  }, []);
  return [{ label: "全部", value: "all" }, ...values.map((value) => ({ label: value, value }))];
}

function visibleQuestionData(questions: FaqQuestion[], activeCategory: string, searchText: string) {
  const visibleQuestions = filterQuestions(questions, activeCategory, searchText);
  return {
    visibleQuestions,
    hasVisibleQuestions: visibleQuestions.length > 0,
    emptyMessage: questions.length ? "没有匹配的帮助问题" : "暂无可展示的帮助问题",
  };
}

function filterQuestions(questions: FaqQuestion[], activeCategory: string, searchText: string): VisibleFaqQuestion[] {
  const query = searchText.trim().toLowerCase();
  const filtered = questions.filter((question) => {
    const category = question.category.trim();
    const categoryMatches = activeCategory === "all" || category === activeCategory;
    const searchableText = `${question.q} ${question.a} ${category}`.toLowerCase();
    return categoryMatches && (!query || searchableText.includes(query));
  });
  return filtered.map((question, index) => ({ ...question, showDivider: index < filtered.length - 1 }));
}

function nextRequestToken(page: unknown) {
  const state = page as { _c164RequestToken?: number };
  state._c164RequestToken = (state._c164RequestToken ?? 0) + 1;
  return state._c164RequestToken;
}

function isCurrentRequest(page: unknown, requestToken: number) {
  return (page as { _c164RequestToken?: number })._c164RequestToken === requestToken;
}
