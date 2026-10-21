import { contentResources } from "./backoffice-content-resources.js";
import { serviceResources } from "./backoffice-service-resources.js";
export type FieldKind =
  | "text"
  | "textarea"
  | "date"
  | "datetime"
  | "number"
  | "boolean"
  | "select"
  | "tags"
  | "reference";
export interface BackofficeField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  reference?: string;
  multiple?: boolean;
  sensitive?: boolean;
  minimum?: number;
  maximum?: number;
  virtual?: boolean;
  appliesTo?: string;
}
export interface BackofficeResource {
  key: string;
  title: string;
  table: string;
  fields: BackofficeField[];
  columns?: Record<string, string>;
  document?: boolean;
  grant?: string;
  adminOnly?: boolean;
  appendOnly?: boolean;
  scopeColumn?: string;
  singleton?: boolean;
}
const field = (
  key: string,
  label: string,
  kind: FieldKind = "text",
  extra: Partial<BackofficeField> = {},
): BackofficeField => ({ key, label, kind, ...extra });
const required = { required: true };
const options = (values: string[], labels: string[]) =>
  values.map((value, i) => ({ value, label: labels[i] ?? value }));
const status = field("status", "状态", "select", {
  required: true,
  options: options(["active", "inactive"], ["开展中", "已停用"]),
});
const ref = (
  key: string,
  label: string,
  reference: string,
  must = false,
): BackofficeField =>
  field(key, label, "reference", { reference, required: must });
export const backofficeResources: BackofficeResource[] = [
  {key:"app-role-preferences",title:"默认小程序身份",table:"app_client_role_preferences",adminOnly:true,fields:[ref("userId","账号","accounts",true),ref("appClientId","小程序","app-clients",true),field("defaultRole","默认身份","select",{options:options(["parent","coach"],["家长","教练"])})]},
  ...serviceResources,
  ...contentResources,
  {
    key: "club",
    title: "俱乐部资料",
    table: "clubs",
    scopeColumn: "id",
    singleton: true,
    adminOnly: true,
    fields: [
      field("name", "名称", "text", required),
      field("code", "简称", "text", required),
      field("timezone", "时区", "text", required),
      field("locale", "语言区域", "text", required),
    ],
  },
  {
    key: "students",
    title: "学员档案",
    table: "student_profiles",
    fields: [
      field("name", "姓名", "text", required),
      field("birthDate", "出生日期", "date", required),
      field("gender", "性别", "select", {
        options: options(
          ["male", "female", "unspecified"],
          ["男", "女", "未填写"],
        ),
      }),
      field("dominantFoot", "惯用脚", "select", {
        options: options(
          ["left", "right", "both", "unknown"],
          ["左脚", "右脚", "双脚", "未填写"],
        ),
      }),
      field("currentLevel", "水平"),
      field("notes", "教学备注", "textarea", { sensitive: true }),
    ],
  },
  {
    key: "coaches",
    title: "教练",
    table: "coach_profiles",
    columns: {
      specialties: "specialties_json",
      availabilitySlots: "availability_json",
    },
    fields: [
      field("name", "姓名", "text", required),
      ref("userId", "登录账号", "accounts", true),
      field("specialties", "专长", "tags", required),
      status,
      field("acceptsPrivateLessons", "接受私教咨询", "boolean"),
      field("availabilitySlots", "可用时间", "tags"),
      field("wechatId", "微信", "text", { sensitive: true }),
    ],
  },
  {
    key: "teams",
    title: "队伍",
    table: "teams",
    fields: [
      field("name", "队伍名称", "text", required),
      field("ageGroup", "年龄组", "text", required),
      field("level", "水平", "select", {
        required: true,
        options: options(
          ["introductory", "development", "advanced", "elite"],
          ["入门", "发展", "进阶", "精英"],
        ),
      }),
      ref("defaultCoachId", "主教练", "coaches"),
      ref("defaultLocationId", "默认场地", "venues"),
      status,
    ],
  },
  {
    key: "members",
    title: "队伍成员",
    table: "team_members",
    fields: [
      ref("teamId", "队伍", "teams", true),
      ref("studentId", "学员", "students", true),
      field("startsAt", "加入时间", "datetime", required),
      field("endsAt", "结束时间", "datetime"),
      field("isPrimaryTeam", "主队", "boolean", required),
      field("status", "状态", "select", {
        required: true,
        options: options(
          ["active", "paused", "graduated", "left"],
          ["在队", "暂停", "毕业", "离队"],
        ),
      }),
    ],
  },
  {
    key: "assignments",
    title: "教练任职",
    table: "coach_assignments",
    fields: [
      ref("coachId", "教练", "coaches", true),
      ref("teamId", "队伍", "teams", true),
      field("role", "职责", "select", {
        required: true,
        options: options(
          ["head_coach", "assistant_coach", "guest_coach"],
          ["主教练", "协同教练", "客座教练"],
        ),
      }),
      status,
    ],
  },
  {
    key: "parents",
    title: "家长资料",
    table: "parent_profiles",
    grant: "sensitive",
    fields: [
      field("name", "姓名", "text", required),
      ref("userId", "登录账号", "accounts", true),
      field("phone", "联系电话", "text", required),
    ],
  },
  {
    key: "guardians",
    title: "家长绑定",
    table: "student_guardian_bindings",
    grant: "sensitive",
    fields: [
      ref("studentId", "学员", "students", true),
      ref("parentId", "家长", "parents", true),
      field("relationship", "关系", "select", {
        required: true,
        options: options(
          ["father", "mother", "guardian", "other"],
          ["父亲", "母亲", "监护人", "其他"],
        ),
      }),
      field("isPrimaryContact", "主要联系人", "boolean", required),
    ],
  },
  {
    key: "contacts",
    title: "学员联系人",
    table: "student_contacts",
    grant: "sensitive",
    fields: [
      ref("studentId", "学员", "students", true),
      field("name", "姓名", "text", required),
      field("relationship", "关系", "text", required),
      field("phone", "电话"),
      field("wechat", "微信"),
      field("isPrimaryContact", "主要联系人", "boolean", required),
      field("receivesNotifications", "接收通知", "boolean", required),
    ],
  },
  {
    key: "operations",
    title: "学员运营资料",
    table: "student_operational_profiles",
    grant: "sensitive",
    fields: [
      ref("studentId", "学员", "students", true),
      field("region", "区域"),
      field("school", "学校"),
      field("acquisitionChannel", "来源渠道"),
      field("studentStatus", "学员状态"),
      field("communicationStage", "沟通阶段"),
      ref("responsibleCoachId", "负责教练", "coaches"),
      field("notes", "备注", "textarea"),
    ],
  },
  {
    key: "events",
    title: "课程与活动",
    table: "calendar_events",
    fields: [
      field("title", "活动名称", "text", required),
      field("type", "类型", "select", {
        required: true,
        options: options(
          ["training", "match", "other"],
          ["训练", "比赛", "其他"],
        ),
      }),
      field("startsAt", "开始时间", "datetime", required),
      field("endsAt", "结束时间", "datetime", required),
      ref("locationId", "场地", "venues"),
      ref("primaryTeamId", "队伍", "teams"),
      ref("ownerCoachId", "负责教练", "coaches"),
      field("status", "状态", "select", {
        required: true,
        options: options(
          ["scheduled", "completed", "cancelled"],
          ["已安排", "已结束", "已取消"],
        ),
      }),
      field("notes", "说明", "textarea"),
      field("kind", "训练形式", "select", {
        virtual: true,
        appliesTo: "training",
        options: options(
          ["team", "small_group", "private", "specialty"],
          ["队伍训练", "小组", "私教", "专项"],
        ),
      }),
      {
        ...ref("sessionPlanId", "训练计划", "plans"),
        virtual: true,
        appliesTo: "training",
      },
      field("intensity", "训练强度", "select", {
        virtual: true,
        appliesTo: "training",
        options: options(["low", "medium", "high"], ["低", "中", "高"]),
      }),
      field("matchType", "比赛形式", "select", {
        virtual: true,
        appliesTo: "match",
        options: options(
          ["internal", "friendly", "league", "cup"],
          ["队内", "友谊赛", "联赛", "杯赛"],
        ),
      }),
      field("opponentName", "对手", "text", {
        virtual: true,
        appliesTo: "match",
      }),
      field("ageGroup", "比赛年龄组", "text", {
        virtual: true,
        appliesTo: "match",
      }),
      field("competitionFormat", "赛制", "text", {
        virtual: true,
        appliesTo: "match",
      }),
    ],
  },
  {
    key: "participants",
    title: "活动参训记录",
    table: "event_participants",
    fields: [
      ref("eventId", "活动", "events", true),
      ref("studentId", "学员", "students", true),
      field("status", "参与状态", "select", {
        required: true,
        options: options(
          [
            "invited",
            "confirmed",
            "present",
            "absent",
            "leave_requested",
            "late",
            "excused",
          ],
          ["已邀请", "已确认", "参加", "缺席", "已请假", "迟到", "免参加"],
        ),
      }),
      field("note", "说明", "textarea"),
    ],
  },
  {
    key: "insurance",
    title: "保险资料",
    table: "insurance_policies",
    grant: "sensitive",
    fields: [
      ref("studentId", "学员", "students", true),
      field("purchasedAt", "购买日期", "date"),
      field("expiresAt", "到期日期", "date", required),
      field("provider", "保险机构"),
      field("policyNumber", "保单号"),
      field("sport", "运动项目"),
      field("reviewStatus", "核对状态", "select", {
        required: true,
        options: options(
          ["pending", "approved", "rejected"],
          ["待核对", "已核对", "未通过"],
        ),
      }),
      field("note", "备注", "textarea"),
    ],
  },
  {
    key: "credits",
    title: "课包台账",
    table: "lesson_credit_ledger",
    grant: "finance",
    appendOnly: true,
    fields: [
      ref("studentId", "学员", "students", true),
      ref("teamId", "队伍", "teams"),
      ref("eventId", "活动", "events"),
      field("occurredAt", "记账时间", "datetime", required),
      field("entryType", "类型", "select", {
        required: true,
        options: options(
          ["credit", "debit", "adjustment", "external_snapshot"],
          ["增加", "扣减", "调整", "外部快照"],
        ),
      }),
      field("lessonDelta", "课时变化", "number", required),
      field("balanceAfter", "记账后余额", "number", { virtual: true }),
      field("note", "说明", "textarea", required),
    ],
  },
  {
    key: "venues",
    title: "场地",
    table: "training_locations",
    document: true,
    fields: [
      field("name", "名称", "text", required),
      field("type", "类型", "text", required),
      field("address", "地址", "text", required),
      field("tags", "标签", "tags", required),
      field("facilities", "设施", "tags", required),
      field("latitude", "纬度", "number", { minimum: -90, maximum: 90 }),
      field("longitude", "经度", "number", { minimum: -180, maximum: 180 }),
      status,
    ],
  },
  {
    key: "terms",
    title: "学期",
    table: "club_terms",
    document: true,
    fields: [
      field("name", "学期名称", "text", required),
      field("startsOn", "开始日期", "date", required),
      field("endsOn", "结束日期", "date", required),
      status,
    ],
  },
  {
    key: "articles",
    title: "公告与内容",
    table: "content_articles",
    document: true,
    fields: [
      field("title", "标题", "text", required),
      field("subtitle", "摘要", "text", required),
      field("category", "分类", "select", {
        required: true,
        options: options(
          ["notice", "venue", "help", "coach", "guide"],
          ["公告", "场地", "帮助", "教练", "指南"],
        ),
      }),
      field("body", "正文", "textarea"),
      field("accent", "展示色"),
      field("publishedAt", "发布时间", "datetime"),
      field("expiresAt", "结束时间", "datetime"),
      field("status", "发布状态", "select", {
        required: true,
        options: options(
          ["draft", "published", "inactive"],
          ["草稿", "已发布", "已停用"],
        ),
      }),
    ],
  },
  {
    key: "drills",
    title: "训练练习库",
    table: "training_drills",
    document: true,
    fields: [
      field("name", "练习名称", "text", required),
      { ...status, required: false },
      field("recordingCapability", "记录能力", "select", {
        options: options(["friendly_match"], ["友谊赛记录"]),
      }),
      { ...ref("objectiveIds", "训练目标", "objectives"), multiple: true },
      { ...ref("metricIds", "能力指标", "metrics"), multiple: true },
      field("durationMinutes", "时长（分钟）", "number", {
        required: true,
        minimum: 1,
        maximum: 1440,
      }),
      field("quantityLabel", "数量说明"),
      field("difficulty", "难度", "select", {
        required: true,
        options: options(
          ["introductory", "standard", "advanced"],
          ["入门", "标准", "进阶"],
        ),
      }),
      field("recommendedAgeGroups", "建议年龄组", "tags"),
      field("recommendedLevels", "建议水平", "tags"),
      field("equipment", "器材", "tags"),
      field("setup", "场地布置", "textarea"),
      field("coachingPoints", "教学要点", "tags"),
    ],
  },
  {
    key: "metrics",
    title: "能力指标定义",
    table: "ability_metrics",
    scopeColumn: "scope_club_id",
    grant: "assessment",
    columns: { sourceKinds: "source_kinds_json" },
    fields: [
      field("name", "名称", "text", required),
      field("code", "稳定编码", "text", required),
      ref("dimensionId", "能力维度", "dimensions", true),
      field("valueKind", "数据类型", "select", {
        required: true,
        options: options(
          [
            "rating_1_5",
            "score_0_100",
            "count",
            "percentage",
            "duration_minutes",
            "duration_seconds",
            "distance_meters",
            "measurement",
            "tag",
            "text",
          ],
          [
            "1–5 量表",
            "0–100 分",
            "次数",
            "百分比",
            "分钟",
            "秒",
            "米",
            "数值测量",
            "标签",
            "文本",
          ],
        ),
      }),
      field("metricKind", "指标类型", "select", {
        required: true,
        options: options(
          ["atomic", "computed", "composite", "view_only"],
          ["原子指标", "计算指标", "复合指标", "展示组织"],
        ),
      }),
      field("unit", "单位"),
      field("maxScore", "分值上限", "number", { minimum: 1, maximum: 1000000 }),
      field("sourceKinds", "允许来源", "select", {
        multiple: true,
        options: options(
          [
            "training_observation",
            "match_event",
            "assessment",
            "fitness_test",
            "manual_adjustment",
            "algorithm",
          ],
          ["训练观察", "比赛记录", "测评", "体测", "人工调整", "模型计算"],
        ),
      }),
      status,
      field("description", "说明", "textarea"),
    ],
  },
  {
    key: "testitems",
    title: "测评采集项目",
    table: "assessment_test_items",
    grant: "assessment",
    columns: { tags: "tags_json" },
    fields: [
      field("name", "项目名称", "text", required),
      ref("metricId", "关联原子指标", "metrics", true),
      field("valueKind", "原始数据类型", "select", {
        required: true,
        options: options(
          [
            "rating_1_5",
            "score_0_100",
            "count",
            "percentage",
            "duration_minutes",
            "duration_seconds",
            "distance_meters",
            "measurement",
            "tag",
            "text",
          ],
          [
            "1–5 量表",
            "0–100 分",
            "次数",
            "百分比",
            "分钟",
            "秒",
            "米",
            "数值测量",
            "标签",
            "文本",
          ],
        ),
      }),
      field("unit", "原始单位"),
      field("precision", "保留小数位", "number", { minimum: 0, maximum: 8 }),
      field("minimumValue", "合理最小值", "number"),
      field("maximumValue", "合理最大值", "number"),
      field("direction", "比较方向", "select", {
        options: options(
          ["higher", "lower", "neutral"],
          ["较高较好", "较低较好", "仅记录"],
        ),
      }),
      field("applicability", "适用条件", "textarea"),
      field("tags", "分类标签", "tags"),
      field("protocol", "测量方法", "textarea"),
      status,
    ],
  },
  {
    key: "memberships",
    title: "账号与角色",
    table: "club_user_memberships",
    columns: { roles: "roles_json" },
    adminOnly: true,
    fields: [
      ref("userId", "账号", "accounts", true),
      field("roles", "角色", "tags", {
        required: true,
        options: options(
          ["owner", "admin", "operator", "coach", "parent", "finance"],
          ["所有者", "管理员", "运营", "教练", "家长", "财务"],
        ),
      }),
      field("status", "账号状态", "select", {
        required: true,
        options: options(
          ["active", "invited", "inactive"],
          ["有效", "受邀", "已停用"],
        ),
      }),
    ],
  },
];
export function resourceByKey(key: string): BackofficeResource | undefined {
  return backofficeResources.find((resource) => resource.key === key);
}
export function fieldSchema(field: BackofficeField) {
  const nullable = !field.required;
  if (field.kind === "tags" || field.multiple)
    return {
      type: nullable ? ["array", "null"] : "array",
      maxItems: 100,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 128,
        ...(field.options
          ? { enum: field.options.map((option) => option.value) }
          : {}),
      },
      uniqueItems: true,
    };
  if (field.kind === "boolean")
    return { type: nullable ? ["boolean", "null"] : "boolean" };
  if (field.kind === "number")
    return {
      type: nullable ? ["number", "null"] : "number",
      minimum: field.minimum,
      maximum: field.maximum,
    };
  return {
    type: nullable ? ["string", "null"] : "string",
    minLength: field.required ? 1 : 0,
    maxLength: field.kind === "textarea" ? 5000 : 500,
    ...(field.options
      ? {
          enum: nullable
            ? [...field.options.map((o) => o.value), null]
            : field.options.map((o) => o.value),
        }
      : {}),
    ...(field.kind === "date"
      ? { format: "date" }
      : field.kind === "datetime"
        ? { format: "date-time" }
        : {}),
  };
}
export function valuesSchema(resource: BackofficeResource) {
  return {
    type: "object",
    additionalProperties: false,
    required: resource.fields.filter((f) => f.required).map((f) => f.key),
    properties: Object.fromEntries(
      resource.fields.map((f) => [f.key, fieldSchema(f)]),
    ),
  };
}
