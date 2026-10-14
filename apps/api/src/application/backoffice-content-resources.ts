import type {
  BackofficeField,
  BackofficeResource,
  FieldKind,
} from "./backoffice-resources.js";
const f = (
  key: string,
  label: string,
  kind: FieldKind = "text",
  extra: Partial<BackofficeField> = {},
): BackofficeField => ({ key, label, kind, ...extra });
const state = f("status", "状态", "select", {
  required: true,
  options: [
    { value: "active", label: "启用" },
    { value: "inactive", label: "停用" },
  ],
});
export const featureEntries = [
  { value: "leave", label: "请假", path: "/pages/parent/schedule/index" },
  {
    value: "records",
    label: "训练记录",
    path: "/pages/parent/training-history/index",
  },
  {
    value: "results",
    label: "测评结果",
    path: "/pages/parent/ability-history/index",
  },
  { value: "service", label: "私教咨询", path: "/pages/parent/private/index" },
  { value: "growth", label: "成长记录", path: "/pages/parent/growth/index" },
  {
    value: "content",
    label: "俱乐部内容",
    path: "/pages/parent/content/index",
  },
  { value: "venues", label: "场地", path: "/pages/parent/venues/index" },
  { value: "faq", label: "常见问题", path: "/pages/parent/help/index" },
];
export const contentResources: BackofficeResource[] = [
  {
    key: "branding",
    title: "队徽与展示主题",
    table: "club_branding",
    document: true,
    adminOnly: true,
    fields: [
      f("name", "主题名称", "text", { required: true }),
      f("logoUrl", "队徽图片地址"),
      f("primaryColor", "主题色"),
      state,
    ],
  },
  {
    key: "banners",
    title: "新闻 Banner",
    table: "news_banners",
    document: true,
    fields: [
      f("name", "标题", "text", { required: true }),
      f("imageUrl", "图片地址", "text", { required: true }),
      f("articleId", "关联新闻", "reference", { reference: "articles" }),
      f("startsAt", "开始展示", "datetime"),
      f("endsAt", "结束展示", "datetime"),
      f("sortOrder", "排列序号", "number", {
        required: true,
        minimum: 0,
        maximum: 9999,
      }),
      state,
    ],
  },
  {
    key: "share-templates",
    title: "预制分享模板",
    table: "share_templates",
    document: true,
    fields: [
      f("name", "模板名称", "text", { required: true }),
      f("title", "分享标题", "text", { required: true }),
      f("description", "分享说明", "textarea"),
      f("backgroundUrl", "背景图片地址"),
      state,
    ],
  },
  {
    key: "evaluation-phrases",
    title: "评价用语",
    table: "evaluation_phrases",
    document: true,
    fields: [
      f("name", "用语名称", "text", { required: true }),
      f("text", "评价内容", "textarea", { required: true }),
      f("tags", "适用标签", "tags"),
      state,
    ],
  },
  {
    key: "optional-features",
    title: "小程序可选功能目录",
    table: "optional_feature_catalog",
    document: true,
    adminOnly: true,
    fields: [
      f("key", "功能", "select", {
        required: true,
        options: featureEntries.map(({ value, label }) => ({ value, label })),
      }),
      f("name", "展示名称", "text", { required: true }),
      f("sortOrder", "排列序号", "number", {
        required: true,
        minimum: 0,
        maximum: 9999,
      }),
      state,
    ],
  },
];
