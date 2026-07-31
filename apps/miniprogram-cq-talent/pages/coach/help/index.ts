import { requireRole } from "../../../utils/auth";

interface HelpTopic {
  key: string;
  icon: string;
  label: string;
  answer: string;
  matchesSearch?: boolean;
}

const TOPICS: HelpTopic[] = [
  { key: "attendance", icon: "✓", label: "出勤操作", answer: "进入活动详情 → 出勤，可逐个或批量标记到场/请假/缺席，保存后家长端实时可见。" },
  { key: "event", icon: "日", label: "活动管理", answer: "活动页支持录入训练内容、发起变更申请（改期/取消需管理员审核）。" },
  { key: "assessment", icon: "评", label: "评分评估", answer: "测评任务列表选择进行中的任务 → 按维度为学员滑杆评分 → 提交后同步成长档案。" },
  { key: "content", icon: "练", label: "训练内容", answer: "训练页选择活动后从项目库勾选训练项目，或进入“分类选择”按维度挑选。" },
  { key: "stats", icon: "数", label: "数据统计", answer: "“我的”页可查看球队详情、学员雷达与团队能力总览，数据来自出勤与测评记录。" },
  { key: "faq", icon: "问", label: "常见问题", answer: "看不到学员？请确认管理员已将你加入对应球队。数据未更新？下拉重新进入页面即可刷新。" },
];

Page({
  data: {
    searchText: "",
    topics: TOPICS.map((topic) => ({ ...topic, matchesSearch: true })),
    openKey: "",
  },
  onLoad() {
    requireRole("coach");
  },
  onSearchInput(event: { detail: { value: string } }) {
    const searchText = event.detail.value;
    const query = searchText.trim().toLowerCase();
    this.setData({
      searchText,
      topics: TOPICS.map((topic) => ({ ...topic, matchesSearch: !query || topic.label.toLowerCase().includes(query) || topic.answer.toLowerCase().includes(query) })),
    });
  },
  toggleTopic(event: { currentTarget: { dataset: { key: string } } }) {
    const key = event.currentTarget.dataset.key;
    this.setData({ openKey: this.data.openKey === key ? "" : key });
  },
});
