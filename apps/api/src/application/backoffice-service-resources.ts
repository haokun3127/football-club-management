import type {
  BackofficeField,
  BackofficeResource,
  FieldKind,
} from "./backoffice-resources.js";
const field = (
  key: string,
  label: string,
  kind: FieldKind = "text",
  extra: Partial<BackofficeField> = {},
): BackofficeField => ({ key, label, kind, ...extra });
const ref = (
  key: string,
  label: string,
  reference: string,
  required = false,
  extra: Partial<BackofficeField> = {},
) => field(key, label, "reference", { reference, required, ...extra });
const select = (
  key: string,
  label: string,
  values: string[],
  labels: string[],
) =>
  field(key, label, "select", {
    required: true,
    options: values.map((value, i) => ({ value, label: labels[i]! })),
  });
const serviceType = select(
  "type",
  "服务类型",
  ["private", "development", "assessment", "scout"],
  ["私教", "定制培养", "专业测评与分析", "球探"],
);
const handling = [
  ref("serviceId", "服务目录", "service-catalog"),
  ref("responsibleCoachId", "负责教练", "coaches"),
  ref("candidateCoachIds", "候选教练", "coaches", false, { multiple: true }),
  field("communication", "真实沟通记录", "textarea"),
  field("acceptanceEvidence", "承接确认依据", "textarea"),
  field("nextFollowUp", "下次跟进", "datetime"),
  field("internalNotes", "内部意见", "textarea", { sensitive: true }),
  ref("eventId", "关联共同活动", "events"),
];
export const serviceResources: BackofficeResource[] = [
  {
    key: "service-catalog",
    title: "服务目录",
    table: "service_catalog",
    document: true,
    grant: "service",
    fields: [
      field("name", "服务名称", "text", { required: true }),
      serviceType,
      field("introduction", "服务介绍", "textarea", { required: true }),
      field("applicability", "适用对象"),
      field("goals", "服务目标", "textarea"),
      ref("responsibleCoachIds", "负责教练", "coaches", false, {
        multiple: true,
      }),
      field("period", "周期或次数说明"),
      field("deliverables", "交付内容", "textarea"),
      field("consultationEntry", "咨询入口说明"),
      select(
        "status",
        "开展状态",
        ["draft", "active", "inactive"],
        ["草稿", "开展中", "已停用"],
      ),
      field("tags", "标签", "tags"),
    ],
  },
  {
    key: "consultations",
    title: "私教咨询与承接",
    table: "private_lesson_requests",
    grant: "service",
    columns: {
      goals: "goals_json",
      candidateCoachIds: "candidate_coach_ids_json",
    },
    fields: [
      ref("studentId", "学员", "students", true),
      field("coachName", "家长期望教练", "text", { required: true }),
      field("date", "期望日期", "date", { required: true }),
      field("timeSlot", "期望时间段", "text", { required: true }),
      field("goals", "需求方向", "tags", { required: true }),
      field("note", "家长咨询说明", "textarea"),
      select(
        "status",
        "咨询处理",
        ["pending", "confirmed", "declined", "cancelled"],
        ["待沟通", "已明确承接", "未承接", "已取消"],
      ),
      ...handling,
    ],
  },
  {
    key: "service-cases",
    title: "培养与测评服务需求",
    table: "service_cases",
    document: true,
    grant: "service",
    fields: [
      field("name", "需求标题", "text", { required: true }),
      ref("studentId", "学员", "students", true),
      ref("serviceId", "服务目录", "service-catalog", true),
      field("requestSource", "真实需求来源", "text", { required: true }),
      field("goals", "需求目标", "textarea", { required: true }),
      select(
        "status",
        "处理阶段",
        [
          "pending",
          "communicating",
          "accepted",
          "executing",
          "delivered",
          "declined",
          "cancelled",
        ],
        [
          "待沟通",
          "沟通中",
          "已明确承接",
          "执行中",
          "已交付",
          "未承接",
          "已取消",
        ],
      ),
      ...handling.filter((f) => f.key !== "serviceId"),
      field("plan", "方案与目标", "textarea"),
      ref("assessmentTaskId", "关联共同测评任务", "assessment-tasks"),
      field("delivery", "交付反馈与来源", "textarea"),
    ],
  },
  {
    key: "scout-work",
    title: "球探观察与跟进",
    table: "scout_work_records",
    document: true,
    grant: "service",
    fields: [
      field("name", "工作记录名称", "text", { required: true }),
      ref("scoutPlayerId", "球探人员", "scout-players", true),
      ref("responsibleCoachId", "负责教练", "coaches", true),
      select(
        "stage",
        "工作阶段",
        ["observing", "trial", "follow_up", "closed"],
        ["观察", "试训", "跟进", "已结束"],
      ),
      field("source", "发现来源", "text", { required: true }),
      field("observedAt", "观察时间", "datetime", { required: true }),
      ref("eventId", "关联共同活动", "events"),
      field("evidence", "观察与证据", "textarea", {
        required: true,
        sensitive: true,
      }),
      field("opinion", "专业意见", "textarea", { sensitive: true }),
      field("nextFollowUp", "下次跟进", "datetime"),
      field("outcome", "跟进结果", "textarea", { sensitive: true }),
    ],
  },
];
