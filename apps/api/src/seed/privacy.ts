import type {
  PrivacyFieldPolicy,
  PrivacyNoticeVersion,
  PrivacyRetentionPolicy,
  StudentConsentRecord,
} from "@football-club/domain";
import type { SeedData } from "./types.js";
import { chongqingTalentClubId as clubId, seedNow as now } from "./types.js";

const mvpGrantedScopes: StudentConsentRecord["scope"][] = [
  "core_training_service",
  "schedule_attendance",
  "assessment_metrics",
  "match_stats",
  "insurance_lesson_status",
];

export function createPrivacySeed(): Pick<
  SeedData,
  "privacyFieldPolicies" | "privacyNoticeVersions" | "privacyRetentionPolicies" | "studentConsentRecords"
> {
  const privacyNoticeVersions: PrivacyNoticeVersion[] = [
    {
      id: "privacy-notice-cq-talent-v1",
      clubId,
      version: "2026.06",
      title: "重庆天才足球俱乐部平台隐私告知",
      contentRef: "privacy://club-chongqing-talent/notices/2026.06",
      effectiveAt: now,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const privacyFieldPolicies: PrivacyFieldPolicy[] = [
    field("student.name", "学员姓名", "student", "personal", ["admin", "coach", "parent"], true, "student_profile", "mask"),
    field("student.birthDate", "出生日期", "student", "minor_sensitive", ["admin", "coach", "parent"], false, "student_profile", "mask"),
    field("student.identityNumber", "身份证号/证件标识", "student", "minor_sensitive", ["admin"], false, "identity_document", "mask"),
    field("student.school", "学校", "student", "personal", ["admin", "coach"], false, "student_profile", "mask"),
    field("student.currentLevel", "当前水平", "student", "internal", ["admin", "coach", "parent"], true, "assessment", "none"),
    field("contact.phone", "联系电话", "parent", "sensitive", ["admin"], false, "guardian_contact", "mask"),
    field("contact.wechat", "微信", "parent", "sensitive", ["admin"], false, "guardian_contact", "mask"),
    field("guardian.relationship", "监护关系", "parent", "personal", ["admin", "parent"], false, "guardian_contact", "summary_only"),
    field("insurance.status", "保险状态", "student", "personal", ["admin", "coach", "parent"], false, "operations_status", "summary_only"),
    field("insurance.policyNumber", "保单号", "student", "sensitive", ["admin"], false, "operations_status", "mask"),
    field("lesson.balance", "剩余课时", "student", "personal", ["admin", "coach", "parent"], false, "operations_status", "summary_only"),
    field("attendance.snapshot", "到课/签到状态", "student", "personal", ["admin", "coach", "parent"], false, "attendance", "summary_only"),
    field("assessment.metrics", "能力评测结果", "student", "minor_sensitive", ["admin", "coach", "parent"], true, "assessment", "summary_only"),
    field("training.observation", "训练观察", "student", "minor_sensitive", ["admin", "coach"], false, "training_record", "summary_only"),
    field("match.stats", "比赛事件统计", "student", "internal", ["admin", "coach", "parent"], true, "match_record", "summary_only"),
    field("media.attachment", "媒体附件", "student", "minor_sensitive", ["admin", "coach"], false, "media", "hide"),
    field("ai.performance", "AI 表现分析", "student", "minor_sensitive", ["admin", "coach"], false, "ai_result", "hide"),
    field("external.rawRecord", "外部原始同步记录", "external_record", "sensitive", ["admin"], false, "external_raw_record", "hide"),
  ];

  const privacyRetentionPolicies: PrivacyRetentionPolicy[] = [
    retention("student_profile", "personal", undefined, "retain"),
    retention("identity_document", "minor_sensitive", undefined, "anonymize"),
    retention("guardian_contact", "sensitive", undefined, "anonymize"),
    retention("operations_status", "personal", 1095, "delete_after_review"),
    retention("attendance", "personal", 1095, "delete_after_review"),
    retention("assessment", "minor_sensitive", 2190, "anonymize"),
    retention("training_record", "minor_sensitive", 1095, "anonymize"),
    retention("match_record", "internal", 2190, "retain"),
    retention("external_raw_record", "sensitive", 180, "delete_after_review"),
    retention("media", "minor_sensitive", 365, "delete_after_review"),
    retention("ai_result", "minor_sensitive", 365, "delete_after_review"),
  ];

  const studentConsentRecords: StudentConsentRecord[] = ["student-1"].flatMap((studentId) =>
    mvpGrantedScopes.map((scope) => ({
      id: `student-consent-${studentId}-${scope}`,
      clubId,
      studentId,
      scope,
      status: "granted" as const,
      noticeVersionId: "privacy-notice-cq-talent-v1",
      guardianUserId: "user-parent-1",
      relationship: "guardian",
      source: "admin_recorded" as const,
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return {
    privacyFieldPolicies,
    privacyNoticeVersions,
    privacyRetentionPolicies,
    studentConsentRecords,
  };
}

function field(
  fieldKey: string,
  label: string,
  subjectType: PrivacyFieldPolicy["subjectType"],
  dataClass: PrivacyFieldPolicy["dataClass"],
  visibleToRoles: PrivacyFieldPolicy["visibleToRoles"],
  exportable: boolean,
  retentionCategory: string,
  redactionMode: PrivacyFieldPolicy["redactionMode"],
): PrivacyFieldPolicy {
  return {
    id: `privacy-field-${fieldKey.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`,
    clubId,
    fieldKey,
    label,
    subjectType,
    dataClass,
    visibleToRoles,
    exportable,
    retentionCategory,
    redactionMode,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function retention(
  category: string,
  dataClass: PrivacyRetentionPolicy["dataClass"],
  retentionDays: number | undefined,
  action: PrivacyRetentionPolicy["action"],
): PrivacyRetentionPolicy {
  return {
    id: `privacy-retention-${category}`,
    clubId,
    category,
    dataClass,
    retentionDays,
    action,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}
