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
