import { createCoachAssessmentTask, getCoachAssessmentTaskOptions } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";

interface TemplateOption {
  id: string;
  name: string;
}

interface PageData {
  navInset: number;
  menuInset: number;
  templates: TemplateOption[];
  templateNames: string[];
  templateIndex: number;
  title: string;
  startsOn: string;
  dueOn: string;
  today: string;
  submitting: boolean;
  canSubmit: boolean;
}

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    templates: [],
    templateNames: [],
    templateIndex: 0,
    title: "",
    startsOn: todayLocal(),
    dueOn: todayLocal(),
    today: todayLocal(),
    submitting: false,
    canSubmit: false,
  },
  onLoad() {
    requireRole("coach");
    void this.load();
  },
  async load() {
    try {
      const options = await getCoachAssessmentTaskOptions();
      this.setData({
        templates: options.templates,
        templateNames: options.templates.map((template) => template.name),
      });
      this.refreshCanSubmit();
    } catch {
      wx.showToast({ title: "模板列表读取失败", icon: "none" });
    }
  },
  onTitleInput(event: { detail: { value: string } }) {
    this.setData({ title: event.detail.value });
    this.refreshCanSubmit();
  },
  onTemplateChange(event: { detail: { value: string } }) {
    this.setData({ templateIndex: Number(event.detail.value) || 0 });
    this.refreshCanSubmit();
  },
  onStartDateChange(event: { detail: { value: string } }) {
    this.setData({ startsOn: event.detail.value });
    this.refreshCanSubmit();
  },
  onDueDateChange(event: { detail: { value: string } }) {
    this.setData({ dueOn: event.detail.value });
    this.refreshCanSubmit();
  },
  refreshCanSubmit() {
    const template = this.data.templates[this.data.templateIndex];
    this.setData({
      canSubmit: Boolean(this.data.title.trim()) && Boolean(template) && this.data.dueOn >= this.data.startsOn,
    });
  },
  async submit() {
    if (!this.data.canSubmit || this.data.submitting) return;
    const template = this.data.templates[this.data.templateIndex];
    if (!template) return;
    if (this.data.dueOn < this.data.startsOn) {
      wx.showToast({ title: "截止日期不能早于开始日期", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      await createCoachAssessmentTask({
        title: this.data.title.trim(),
        templateId: template.id,
        startsOn: this.data.startsOn,
        dueOn: this.data.dueOn,
      });
      wx.showToast({ title: "测评任务已创建", icon: "success" });
      wx.navigateBack();
    } catch {
      this.setData({ submitting: false });
      wx.showToast({ title: "创建失败，请重试", icon: "none" });
    }
  },
  goBack() {
    wx.navigateBack();
  },
});
