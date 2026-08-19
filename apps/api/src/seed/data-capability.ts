import type {
  ClubAppClient,
  ExternalFieldMapping,
  ExternalRawRecord,
  ExternalRecordLink,
  ExternalSyncRun,
  ExternalSyncPolicy,
  ExternalSystemConnection,
  ExternalTableMapping,
} from "../data-capability/types.js";
import type { SeedData } from "./types.js";
import { chongqingTalentClubId as clubId, seedNow as now } from "./types.js";

const connectionId = "external-connection-wps-cq-talent";

const tableMappings: Array<Pick<ExternalTableMapping, "id" | "externalTableKey" | "targetType">> = [
  {
    id: "external-table-full-users-cq-talent",
    externalTableKey: "full_users",
    targetType: "student_operational_profile",
  },
  {
    id: "external-table-payment-events-cq-talent",
    externalTableKey: "payment_events",
    targetType: "offline_payment_status",
  },
  {
    id: "external-table-attendance-spring-summer-2025-2026-cq-talent",
    externalTableKey: "attendance_2025_2026_spring_summer",
    targetType: "attendance_snapshot",
  },
  {
    id: "external-table-insurance-policies-cq-talent",
    externalTableKey: "insurance_policies",
    targetType: "insurance_status",
  },
  {
    id: "external-table-talent-elite-assessment-cq-talent",
    externalTableKey: "talent_elite_assessment",
    targetType: "assessment_graph_draft",
  },
];

export function createDataCapabilitySeed(): Pick<
  SeedData,
  | "appClients"
  | "externalConnections"
  | "externalTableMappings"
  | "externalFieldMappings"
  | "externalSyncPolicies"
  | "externalSyncRuns"
  | "externalRawRecords"
  | "externalRecordLinks"
  | "lessonLedger"
  | "insurancePolicies"
  | "privateLessonRequests"
  | "eventChangeRequests"
  | "assessmentTasks"
  | "contentArticles"
  | "contentFaqs"
  | "venues"
> {
  const appClients: ClubAppClient[] = [
    {
      id: "app-client-cq-talent-wechat-main",
      clubId,
      channel: "wechat_miniprogram" as const,
      name: "重庆天才家校训练小程序",
      status: "active" as const,
      appId: "wx-cq-talent-main",
      clientKey: "cq-talent-wechat-main",
      theme: {
        brandName: "重庆天才足球俱乐部",
        primaryColor: "#A80F1B",
        accentColor: "#7F0B14",
        lightColor: "#FCEEEF",
      },
      navigation: [
        { key: "home", label: "首页", roles: ["parent", "coach"], enabled: true },
        { key: "calendar", label: "日程", roles: ["parent", "coach"], enabled: true },
        { key: "attendance", label: "点名", roles: ["coach"], enabled: true },
        { key: "training", label: "训练", roles: ["parent", "coach"], enabled: true },
        { key: "matches", label: "比赛", roles: ["parent", "coach"], enabled: true },
        { key: "assessment", label: "能力", roles: ["parent", "coach"], enabled: true },
        { key: "status", label: "保险课时", roles: ["parent"], enabled: true },
      ],
      roleEntrypoints: {
        parent: ["home", "calendar", "training", "matches", "assessment", "status"],
        coach: ["home", "calendar", "attendance", "training", "matches", "assessment"],
        admin: [],
      },
      featureOverrides: {
        payments: false,
        crm: false,
        media_distribution: false,
      },
      visibility: {
        parentMetricScope: "published_summary",
        showInsurancePolicyNumber: true,
        showLessonBalance: true,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "app-client-cq-talent-admin",
      clubId,
      channel: "admin_portal" as const,
      name: "重庆天才运营后台",
      status: "active" as const,
      clientKey: "cq-talent-admin",
      theme: {
        brandName: "重庆天才运营后台",
        primaryColor: "#1f2937",
      },
      navigation: [
        { key: "students", label: "学员", roles: ["admin"], enabled: true },
        { key: "teams", label: "球队", roles: ["admin"], enabled: true },
        { key: "calendar", label: "日程", roles: ["admin"], enabled: true },
        { key: "integrations", label: "数据同步", roles: ["admin"], enabled: true },
        { key: "assessment_graph", label: "评测图谱", roles: ["admin"], enabled: true },
      ],
      roleEntrypoints: {
        parent: [],
        coach: [],
        admin: ["students", "teams", "calendar", "integrations", "assessment_graph"],
      },
      featureOverrides: {
        crm: true,
      },
      visibility: {
        integrationConfigVisible: true,
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalConnections: ExternalSystemConnection[] = [
    {
      id: connectionId,
      clubId,
      provider: "wps",
      name: "重庆天才 WPS 工作簿",
      status: "active",
      config: {
        mode: "manual_import",
        sourceFiles: [
          "全量用户",
          "交费事件",
          "2025-2026春夏",
          "保险购买",
          "天才精英队评分表",
        ],
      },
      lastSyncedAt: "2026-06-25T08:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalTableMappings: ExternalTableMapping[] = tableMappings.map((mapping) => ({
    ...mapping,
    clubId,
    connectionId,
    mappingVersion: "1.0.0",
    status: "active",
    createdAt: now,
    updatedAt: now,
  }));

  const externalFieldMappings: ExternalFieldMapping[] = [
    ...fields("external-table-full-users-cq-talent", [
      ["身份证号", "student.identityNumber", "text", true],
      ["学员姓名", "student.name", "text", true],
      ["渠道", "studentOperationalProfile.channel", "text"],
      ["区域", "studentOperationalProfile.area", "text"],
      ["学校", "studentOperationalProfile.schoolName", "text"],
      ["队伍名称", "team.name", "text"],
      ["教练", "coach.name", "text"],
      ["学员状态", "student.status", "text"],
      ["出生年月", "student.birthDate", "date"],
      ["手机", "contact.phone", "text"],
      ["微信", "contact.wechat", "text"],
      ["历次充值日期", "billing.lastPaymentDates", "date_list"],
      ["充值笔数", "billing.paymentCount", "number"],
      ["保险到期日期", "insurance.expiresAt", "date"],
      ["沟通反馈", "studentOperationalProfile.communicationFeedback", "text"],
      ["签到次数", "attendance.checkInCount", "number"],
      ["最近签到时间", "attendance.lastCheckInAt", "datetime"],
    ]),
    ...fields("external-table-payment-events-cq-talent", [
      ["身份证号", "student.identityNumber", "text", true],
      ["收费日期", "payment.paidAt", "date", true],
      ["收费阶段", "payment.stage", "text"],
      ["沟通进度", "payment.communicationProgress", "text"],
      ["学员姓名", "student.name", "text"],
      ["充值类型", "payment.type", "text"],
      ["手机", "contact.phone", "text"],
      ["微信", "contact.wechat", "text"],
      ["区域", "studentOperationalProfile.area", "text"],
      ["学校", "studentOperationalProfile.schoolName", "text"],
      ["队伍名称", "team.name", "text"],
      ["教练", "coach.name", "text"],
      ["金额", "payment.amount", "money"],
      ["课时", "payment.courseHours", "number"],
      ["缴费证明", "payment.proof", "file_ref"],
      ["备注", "payment.note", "text"],
      ["支付事件填写人", "payment.createdByName", "text"],
      ["核对人", "payment.checkedByName", "text"],
      ["公司实收", "payment.companyReceivedAmount", "money"],
      ["实收审核人", "payment.receiptReviewedByName", "text"],
      ["保险到期日期", "insurance.expiresAt", "date"],
      ["审核通过", "payment.auditPassed", "boolean"],
      ["最终审核人", "payment.finalReviewedByName", "text"],
      ["最后修改时间", "payment.updatedAt", "datetime"],
      ["审核通过时间", "payment.auditPassedAt", "datetime"],
      ["已同步", "payment.synced", "boolean"],
    ]),
    ...fields("external-table-attendance-spring-summer-2025-2026-cq-talent", [
      ["身份证号", "student.identityNumber", "text", true],
      ["阶段", "attendance.stage", "text"],
      ["姓名", "student.name", "text"],
      ["区域", "studentOperationalProfile.area", "text"],
      ["学校", "studentOperationalProfile.schoolName", "text"],
      ["队伍名称", "team.name", "text"],
      ["教练", "coach.name", "text"],
      ...Array.from({ length: 27 }, (_, index) => {
        const week = index + 1;
        return [`第${week}周`, `attendance.weeks.${String(week).padStart(2, "0")}`, "number"] as const;
      }),
      ["在该队充值课时", "attendance.teamPaidCourseHours", "number"],
      ["在该队其他情况划课", "attendance.teamOtherDeductedCourseHours", "number"],
      ["本学期在该队签到", "attendance.termTeamCheckInCount", "number"],
      ["在该队的剩余课时", "attendance.teamCourseBalance", "number"],
      ["创建时间", "attendance.createdAt", "datetime"],
    ]),
    ...fields("external-table-insurance-policies-cq-talent", [
      ["投保日期", "insurance.purchasedAt", "date", true],
      ["身份证号", "student.identityNumber", "text", true],
      ["保险到期日期", "insurance.expiresAt", "date", true],
      ["保单号", "insurance.policyNo", "text"],
      ["运动项目", "insurance.sport", "text"],
      ["学员姓名", "student.name", "text"],
      ["学校", "studentOperationalProfile.schoolName", "text"],
      ["购买公司", "insurance.vendor", "text"],
      ["审核通过", "insurance.auditPassed", "boolean"],
      ["备注", "insurance.note", "text"],
    ]),
    ...fields("external-table-talent-elite-assessment-cq-talent", [
      ["核心能力", "assessment.coreAbility", "text", true],
      ["得分", "assessment.coreScore", "number"],
      ["二级子项", "assessment.secondaryMetric", "text", true],
      ["得分_2", "assessment.secondaryScore", "number"],
      ["三级子项", "assessment.atomicMetric", "text", true],
      ["得分_3", "assessment.atomicScore", "number"],
      ["测试项目", "assessment.testItem", "text"],
      ["推荐训练项目", "assessment.recommendedTraining", "text"],
    ]),
  ];

  const externalSyncPolicies: ExternalSyncPolicy[] = [
    {
      id: "external-sync-policy-wps-cq-talent-manual",
      clubId,
      connectionId,
      tableMappingId: "external-table-full-users-cq-talent",
      name: "重庆天才 WPS 手动入站同步",
      status: "active",
      triggerMode: "manual",
      direction: "inbound",
      applyPolicy: "manual_confirm",
      conflictPolicy: "manual_review",
      writebackPolicy: "disabled",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalSyncRuns: ExternalSyncRun[] = [
    {
      id: "external-sync-run-cq-talent",
      clubId,
      connectionId,
      tableMappingId: "external-table-full-users-cq-talent",
      status: "completed",
      startedAt: "2026-06-25T08:00:00.000Z",
      finishedAt: "2026-06-25T08:01:00.000Z",
      totalRecords: 1,
      importedRecords: 0,
      failedRecords: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalRawRecords: ExternalRawRecord[] = [
    {
      id: "external-raw-student-cq-talent",
      clubId,
      connectionId,
      tableMappingId: "external-table-full-users-cq-talent",
      syncRunId: "external-sync-run-cq-talent",
      externalRecordId: "full_users:row-2",
      payload: {
        "身份证号": "500000201505010000",
        "学员姓名": "李明",
        "渠道": "老学员转介绍",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "学员状态": "在训",
        "出生年月": "2015-05",
        "手机": "13800000000",
        "微信": "wx_li_parent",
        "历次充值日期": "2026-06-01",
        "充值笔数": 1,
        "保险到期日期": "2027-06-01",
        "沟通反馈": "家长关注精英队升组路径",
        "签到次数": 8,
        "最近签到时间": "2026-06-24T10:00:00.000Z",
      },
      payloadHash: "cq-talent-row-2-hash",
      reviewStatus: "pending",
      normalizedPreview: {
        "student.identityNumber": "500000201505010000",
        "student.name": "李明",
        "student.birthDate": "2015-05",
        "student.status": "在训",
        "studentOperationalProfile.channel": "老学员转介绍",
        "studentOperationalProfile.area": "重庆",
        "studentOperationalProfile.schoolName": "重庆天才合作学校",
        "studentOperationalProfile.communicationFeedback": "家长关注精英队升组路径",
        "team.name": "U10发展队",
        "coach.name": "陈教练",
        "contact.phone": "13800000000",
        "contact.wechat": "wx_li_parent",
        "billing.lastPaymentDates": "2026-06-01",
        "billing.paymentCount": 1,
        "insurance.expiresAt": "2027-06-01",
        "attendance.checkInCount": 8,
        "attendance.lastCheckInAt": "2026-06-24T10:00:00.000Z",
      },
      importedAt: "2026-06-25T08:01:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalRecordLinks: ExternalRecordLink[] = [];

  return {
    appClients,
    externalConnections,
    externalTableMappings,
    externalFieldMappings,
    externalSyncPolicies,
    externalSyncRuns,
    externalRawRecords,
    externalRecordLinks,
    lessonLedger: [],
    insurancePolicies: [],
    privateLessonRequests: [],
    eventChangeRequests: [],
    assessmentTasks: [],
    // 内容中心/帮助中心/场地信息：与 Figma P8 内容中心、P8-2 帮助中心同源的真实内容
    contentArticles: [
      { id: "article-cq-talent-autumn-plan", clubId, title: "2026秋季训练计划", subtitle: "了解最新的训练课程安排与重点内容", accent: "#a80f1b", category: "guide", body: "秋季学期训练将于 9 月第一周正式开始，每周二、四晚间及周六上午安排训练课。\n\n本学期重点：一是夯实传接球与控球基本功，二是引入小场地对抗提升实战决策能力，三是为 11 月区青少年联赛选拔阵容。\n\n请家长关注「日程」页的课程安排，如有时间冲突请提前在变更申请中说明。" },
      { id: "article-cq-talent-growth-report", clubId, title: "球员成长评估报告", subtitle: "详细分析球员近期训练表现与成长点", accent: "#1976d2", category: "help", body: "俱乐部每学期为每位学员生成成长评估报告，覆盖技术、体能、战术理解、心理四个维度。\n\n报告由带训教练根据测评任务与日常观察填写，可在「成长」页查看雷达图与各指标明细。\n\n如对评估结果有疑问，可通过私教沟通渠道与教练预约一对一反馈。" },
      { id: "article-cq-talent-venue-guide", clubId, title: "新手入门：如何选择合适场地", subtitle: "为您提供最优的场地选择与预订技巧", accent: "#ff9800", category: "venue", body: "俱乐部现有三处合作场地：九龙坡足球公园（11 人制天然草）、奥体中心副场（8 人制人工草）与大学城训练基地（5 人制室内）。\n\nU8 以下年龄组默认安排室内或人工草场地；正式比赛优先使用九龙坡足球公园。\n\n场地信息与导航可在内容中心「场地信息」入口查看。" },
      { id: "article-cq-talent-coach-team", clubId, title: "认识我们的教练团队", subtitle: "主教练与专项教练的执教理念介绍", accent: "#22c55e", category: "coach", body: "俱乐部教练团队均持有中国足协 D 级及以上教练证书，主教练具备多年青训梯队执教经验。\n\n我们的理念：先做人、再踢球。技术训练之外，同样重视孩子的团队意识与抗挫折能力。\n\n教练简介与负责队伍可在内容中心「教练团队」入口查看。" },
    ],
    contentFaqs: [
      { id: "faq-cq-talent-attendance", clubId, q: "家长如何确认孩子到场？", a: "教练在活动开始时会进行点名，点名结果会同步到日程页的活动卡片上。您可以在「日程」页点击当天活动查看出勤状态。", category: "出勤说明" },
      { id: "faq-cq-talent-cancel", clubId, q: "训练取消如何通知？", a: "训练取消或时间变更时，系统会在「提醒中心」推送通知，日程页铃铛出现红点即表示有新提醒，请及时查看。", category: "训练规则" },
      { id: "faq-cq-talent-growth", clubId, q: "如何查看孩子的成长报告？", a: "在底部「成长」标签页可查看孩子的能力雷达图与最新评测数据；点击具体指标可查看历史趋势与教练评语。", category: "成长报告" },
      { id: "faq-cq-talent-account", clubId, q: "如何切换绑定的孩子？", a: "在「账号绑定」页可查看已绑定的学员，点击「切换学员」即可切换当前查看的孩子。", category: "账号设置" },
      { id: "faq-cq-talent-contact", clubId, q: "如何联系俱乐部？", a: "工作日 9:00-18:00 可通过俱乐部前台电话联系；训练相关问题也可在活动现场直接与教练沟通。", category: "联系客服" },
    ],
    venues: [
      { id: "venue-cq-talent-jiulongpo", clubId, name: "九龙坡足球公园", type: "11人制场地", address: "九龙坡区科园四路", tags: ["outdoor", "natural"], facilities: ["照明设施", "更衣室", "停车场"], latitude: 29.5063, longitude: 106.5108 },
      { id: "venue-cq-talent-sport-uni", clubId, name: "重庆体育学院训练馆", type: "5人制场地", address: "沙坪坝区大学城", tags: ["indoor", "artificial"], facilities: ["恒温室内", "淋浴间", "储物柜"], latitude: 29.6077, longitude: 106.2832 },
      { id: "venue-cq-talent-nanan", clubId, name: "南岸足球公园", type: "7人制场地", address: "南岸区茶园路", tags: ["outdoor", "artificial"], facilities: ["照明设施", "停车场"], latitude: 29.5319, longitude: 106.6442 },
    ],
  };
}

function fields(
  tableMappingId: string,
  definitions: Array<readonly [externalFieldKey: string, targetFieldKey: string, targetFieldKind: string, required?: boolean]>,
): ExternalFieldMapping[] {
  return definitions.map(([externalFieldKey, targetFieldKey, targetFieldKind, required], index) => ({
    id: `${tableMappingId}-field-${String(index + 1).padStart(2, "0")}`,
    clubId,
    tableMappingId,
    externalFieldKey,
    targetFieldKey,
    targetFieldKind,
    required: required ?? false,
    createdAt: now,
    updatedAt: now,
  }));
}
