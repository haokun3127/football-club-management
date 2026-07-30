import type { SeedData } from "./types.js";
import { chongqingTalentClubId as clubId, seedNow as now } from "./types.js";
import { createTalentEliteAssessmentCatalog } from "./cq-talent-assessment-model.js";
import { createCqTalentSyntheticFixture, type CqTalentBusinessRow, type CqTalentSyntheticStudent } from "./cq-talent-test-data.js";

const connectionId = "external-connection-wps-cq-talent";
const importedAt = "2026-06-25T08:01:00.000Z";
const acceptanceParentUserId = "user-parent-cq-talent-acceptance";
const acceptanceParentId = "parent-cq-talent-acceptance";
const talentAssessmentCatalog = createTalentEliteAssessmentCatalog();
const talentRadarViewId = talentAssessmentCatalog.metricViews.find((view) => view.name.includes("核心能力雷达"))?.id;
const talentRadarMetricIds = talentAssessmentCatalog.metricViewNodes
  .filter((node) => node.viewId === talentRadarViewId)
  .sort((left, right) => left.sortOrder - right.sortOrder)
  .map((node) => node.metricId)
  .filter((metricId): metricId is string => Boolean(metricId));
type Rating = 1 | 2 | 3 | 4 | 5;

const tableIds = {
  fullUsers: "external-table-full-users-cq-talent",
  paymentEvents: "external-table-payment-events-cq-talent",
  attendance: "external-table-attendance-spring-summer-2025-2026-cq-talent",
  insurance: "external-table-insurance-policies-cq-talent",
} as const;

const teamIdByName = new Map([
  ["U8精英队", "team-cq-talent-u8-elite"],
  ["U9精英队", "team-cq-talent-u9-elite"],
  ["U10发展队", "team-u10-dev"],
  ["U10精英队", "team-cq-talent-u10-elite"],
  ["U11精英队", "team-cq-talent-u11-elite"],
  ["U12精英队", "team-cq-talent-u12-elite"],
  ["周末提高班", "team-cq-talent-weekend-improvement"],
  ["精英小班课", "team-cq-talent-elite-small-group"],
]);

const coachIdByName = new Map([
  ["陈教练", "coach-1"],
  ["刘启航", "coach-cq-talent-01"],
  ["李教练", "coach-cq-talent-02"],
  ["赵教练", "coach-cq-talent-04"],
  ["刘教练", "coach-cq-talent-05"],
  ["周教练", "coach-cq-talent-06"],
  ["何教练", "coach-cq-talent-07"],
  ["孙教练", "coach-cq-talent-08"],
]);

const coachNameByTeamName = new Map([
  ["U8精英队", "刘启航"],
  ["U9精英队", "李教练"],
  ["U10发展队", "陈教练"],
  ["U10精英队", "赵教练"],
  ["U11精英队", "刘教练"],
  ["U12精英队", "周教练"],
  ["周末提高班", "何教练"],
  ["精英小班课", "孙教练"],
]);

export function createCqTalentAcceptanceSeed(): Partial<SeedData> {
  const fixture = createCqTalentSyntheticFixture(200);
  const students = fixture.students;
  const families = fixture.families;
  const tableRows = fixture.tables;
  const importedCoaches = fixture.coaches.filter((coach) => coach.name !== "陈教练");
  const acceptanceFamilyId = families[0]!.id;
  const familyUserIds = new Map(families.map((family) => [
    family.id,
    family.id === acceptanceFamilyId ? acceptanceParentUserId : `user-parent-${family.id}`,
  ]));
  const familyParentIds = new Map(families.map((family) => [
    family.id,
    family.id === acceptanceFamilyId ? acceptanceParentId : `parent-${family.id}`,
  ]));

  return {
    users: [
      ...importedCoaches.map((coach) => ({
        id: `user-${coachIdByName.get(coach.name) ?? coach.id}`,
        displayName: coach.name,
        phone: coach.phone,
        roles: ["coach" as const],
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      })),
      ...families.map((family) => ({
        id: familyUserIds.get(family.id)!,
        displayName: family.parentName,
        phone: family.phone,
        roles: ["parent" as const],
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      })),
    ],
    clubMemberships: [
      ...importedCoaches.map((coach) => ({
        id: `club-member-${coachIdByName.get(coach.name) ?? coach.id}`,
        clubId,
        userId: `user-${coachIdByName.get(coach.name) ?? coach.id}`,
        roles: ["coach" as const],
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      })),
      ...families.map((family) => ({
        id: `club-member-${familyUserIds.get(family.id)!}`,
        clubId,
        userId: familyUserIds.get(family.id)!,
        roles: ["parent" as const],
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      })),
    ],
    parents: families.map((family) => ({
      id: familyParentIds.get(family.id)!,
      clubId,
      userId: familyUserIds.get(family.id)!,
      name: family.parentName,
      phone: family.phone,
      createdAt: now,
      updatedAt: now,
    })),
    coaches: importedCoaches.map((coach) => ({
      id: coachIdByName.get(coach.name) ?? coach.id,
      clubId,
      userId: `user-${coachIdByName.get(coach.name) ?? coach.id}`,
      name: coach.name,
      specialties: ["重庆天才导入数据", ...coach.teams],
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    })),
    teams: Array.from(teamIdByName.entries())
      .filter(([name]) => name !== "U10发展队")
      .map(([name, id]) => ({
        id,
        clubId,
        name,
        ageGroup: name.slice(0, 3).startsWith("U") ? name.slice(0, 3) : "U10-U12",
        level: name.includes("精英") ? "elite" as const : "development" as const,
        defaultCoachId: coachIdByName.get(students.find((student) => student.teamName === name)?.coachName ?? "") ?? "coach-1",
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      })),
    students: students.map((student) => ({
      id: student.id,
      clubId,
      name: student.name,
      birthDate: student.birthDate,
      gender: "unspecified" as const,
      dominantFoot: "unknown" as const,
      currentLevel: student.teamName,
      createdAt: now,
      updatedAt: now,
    })),
    guardianBindings: students.map((student, index) => ({
      id: `guardian-cq-talent-import-${String(index + 1).padStart(3, "0")}`,
      clubId,
      studentId: student.id,
      parentId: familyParentIds.get(student.familyId)!,
      relationship: (families.find((family) => family.id === student.familyId)?.relationship ?? "guardian") as "father" | "mother" | "guardian",
      isPrimaryContact: true,
      createdAt: now,
      updatedAt: now,
    })),
    teamMembers: students.flatMap((student, studentIndex) => student.teamMemberships.map((membership, membershipIndex) => ({
      id: `team-member-cq-talent-import-${String(studentIndex + 1).padStart(3, "0")}-${membershipIndex + 1}`,
      clubId,
      teamId: teamIdByName.get(membership.teamName) ?? "team-u10-dev",
      studentId: student.id,
      startsAt: membership.isPrimary ? "2026-06-01" : "2026-06-15",
      isPrimaryTeam: membership.isPrimary,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    }))),
    events: [
      ...Array.from(teamIdByName.entries()).map(([teamName, teamId], index) => ({
        id: trainingEventId(teamName),
        clubId,
        type: "training" as const,
        title: `${teamName} 导入数据训练`,
        timeRange: {
          startsAt: `2026-06-${padDate(28 + index % 2)}T${padDate(9 + index % 3)}:00:00.000Z`,
          endsAt: `2026-06-${padDate(28 + index % 2)}T${padDate(10 + index % 3)}:30:00.000Z`,
        },
        primaryTeamId: teamId,
        ownerCoachId: coachIdByTeamName(teamName),
        status: "scheduled" as const,
        notes: "用于重庆天才 200 人导入数据的分队训练验收。",
        createdAt: now,
        updatedAt: now,
      })),
      ...matchTeamNames().map((teamName, index) => ({
        id: matchEventId(teamName),
        clubId,
        type: "match" as const,
        title: `${teamName} 导入数据分组赛`,
        timeRange: {
          startsAt: `2026-07-${padDate(4 + index)}T08:30:00.000Z`,
          endsAt: `2026-07-${padDate(4 + index)}T10:00:00.000Z`,
        },
        primaryTeamId: teamIdByName.get(teamName) ?? "team-u10-dev",
        ownerCoachId: coachIdByTeamName(teamName),
        status: "scheduled" as const,
        createdAt: now,
        updatedAt: now,
      })),
      {
        id: "event-cq-talent-family-assessment-day",
        clubId,
        type: "other" as const,
        title: "青训体测与家长说明会",
        timeRange: {
          startsAt: "2026-07-03T09:30:00.000Z",
          endsAt: "2026-07-03T11:00:00.000Z",
        },
        primaryTeamId: "team-cq-talent-u8-elite",
        ownerCoachId: "coach-1",
        status: "scheduled" as const,
        notes: "用于验收家庭日历中的其他活动、双孩参与和活动通知展示。",
        createdAt: now,
        updatedAt: now,
      },
    ],
    participants: [
      ...students.flatMap((student, index) => {
      const primaryTeamName = student.teamMemberships.find((membership) => membership.isPrimary)?.teamName ?? student.teamName;
      const trainingParticipants = student.teamMemberships.map((membership, membershipIndex) => ({
        id: `participant-cq-talent-training-${String(index + 1).padStart(3, "0")}-${membershipIndex + 1}`,
        clubId,
        eventId: trainingEventId(membership.teamName),
        studentId: student.id,
        status: "confirmed" as const,
        createdAt: now,
        updatedAt: now,
      }));
      const matchParticipant = matchTeamNames().includes(primaryTeamName)
        ? [{
        id: `participant-cq-talent-match-${String(index + 1).padStart(3, "0")}`,
        clubId,
        eventId: matchEventId(primaryTeamName),
        studentId: student.id,
        status: "invited" as const,
        createdAt: now,
        updatedAt: now,
      }]
        : [];

        return [...trainingParticipants, ...matchParticipant];
      }),
      ...students
        .filter((student) => student.familyId === acceptanceFamilyId)
        .map((student, index) => ({
          id: `participant-cq-talent-family-assessment-${index + 1}`,
          clubId,
          eventId: "event-cq-talent-family-assessment-day",
          studentId: student.id,
          status: "confirmed" as const,
          createdAt: now,
          updatedAt: now,
        })),
    ],
    metricRecords: students.flatMap((student, index) => createMetricRecords(student, index)),
    sessionObservations: students.slice(0, 40).map((student, index) => ({
      id: `session-observation-cq-talent-import-${String(index + 1).padStart(3, "0")}`,
      clubId,
      trainingSessionId: "training-session-1",
      studentId: student.id,
      coachId: coachIdByTeamName(student.teamName),
      metricId: "metric-finishing",
      rating: ratingForIndex(index),
      tags: ["cq_talent_import", "finishing"],
      note: "导入测试数据生成的训练观察，用于小程序雷达和成长页验收。",
      sourceReference: { kind: "calendar_event", eventId: trainingEventId(student.teamName) },
      createdAt: now,
      updatedAt: now,
    })),
    externalSyncRuns: [
      createSyncRun("external-sync-run-cq-talent-full-users-200", tableIds.fullUsers, students.length),
      createSyncRun("external-sync-run-cq-talent-payment-events-200", tableIds.paymentEvents, students.length),
      createSyncRun("external-sync-run-cq-talent-attendance-200", tableIds.attendance, students.length),
      createSyncRun("external-sync-run-cq-talent-insurance-200", tableIds.insurance, students.length),
    ],
    externalRawRecords: [
      ...createRawRecords("fullUsers", tableRows.fullUsers, students, normalizeFullUser),
      ...createRawRecords("paymentEvents", tableRows.paymentEvents, students, normalizePaymentEvent),
      ...createRawRecords("attendance", tableRows.attendance, students, normalizeAttendance),
      ...createRawRecords("insurance", tableRows.insurance, students, normalizeInsurance),
    ],
    externalRecordLinks: [
      ...createRecordLinks("fullUsers", students),
      ...createRecordLinks("paymentEvents", students),
      ...createRecordLinks("attendance", students),
      ...createRecordLinks("insurance", students),
    ],
    lessonLedger: students.map((student, index) => {
      const otherDeductedHours = index % 5 === 0 ? 1 : 0;
      const balance = Math.max(student.lessonHours - student.checkInCount - otherDeductedHours, 0);
      return {
        id: `lesson-ledger-cq-talent-import-${String(index + 1).padStart(3, "0")}`,
        clubId,
        studentId: student.id,
        teamId: teamIdByName.get(student.teamName),
        occurredAt: importedAt,
        entryType: "external_snapshot" as const,
        lessonDelta: balance,
        balanceAfter: balance,
        source: "external_import" as const,
        sourceId: rawRecordId("attendance", student),
        note: "重庆天才课时表同步余额。",
        createdAt: now,
        updatedAt: importedAt,
      };
    }),
    insurancePolicies: students.map((student, index) => ({
      id: `insurance-policy-cq-talent-import-${String(index + 1).padStart(3, "0")}`,
      clubId,
      studentId: student.id,
      purchasedAt: `2026-${padDate(index % 12 + 1)}-${padDate(index % 26 + 1)}`,
      expiresAt: student.insuranceExpiresAt,
      policyNumber: `CQTFB${String(index + 1).padStart(6, "0")}`,
      provider: index % 2 === 0 ? "太平洋保险" : "平安保险",
      sport: "足球",
      approved: true,
      reviewStatus: "approved" as const,
      currentStatus: "active" as const,
      source: "external_import",
      sourceId: rawRecordId("insurance", student),
      note: "重庆天才保险表同步记录。",
      createdAt: now,
      updatedAt: importedAt,
    })),
    assessmentTasks: [
      {
        id: "assessment-task-cq-talent-fitness-july",
        clubId,
        title: "体能综合测评",
        templateId: "assessment-template-technical",
        startsOn: "2026-07-01",
        dueOn: "2026-07-31",
      },
      {
        id: "assessment-task-cq-talent-speed-august",
        clubId,
        title: "速度耐力体测",
        templateId: "assessment-template-technical",
        startsOn: "2026-08-01",
        dueOn: "2026-08-31",
      },
    ],
  };
}

function createMetricRecords(student: CqTalentSyntheticStudent, index: number) {
  const score = ratingForIndex(index);
  const eventId = trainingEventId(student.teamName);
  const coachId = coachIdByTeamName(student.teamName);
  const radarRecords = talentRadarMetricIds.flatMap((metricId, metricIndex) => {
    const currentScore = 62 + ((index * 7 + metricIndex * 4) % 31);
    const previousScore = Math.max(0, currentScore - 3 - (metricIndex % 2));
    return [
      {
        id: `metric-record-cq-talent-radar-current-${student.id}-${metricIndex + 1}`,
        clubId,
        studentId: student.id,
        metricId,
        value: { kind: "measurement" as const, value: currentScore, unit: "score" },
        source: "assessment" as const,
        occurredAt: "2026-06-29T10:10:00.000Z",
        eventId,
        templateVersionId: "assessment-template-version-cq-talent-elite-20260326",
        recordedByCoachId: coachId,
        visibility: "parent" as const,
        note: "重庆天才核心能力阶段评测。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `metric-record-cq-talent-radar-previous-${student.id}-${metricIndex + 1}`,
        clubId,
        studentId: student.id,
        metricId,
        value: { kind: "measurement" as const, value: previousScore, unit: "score" },
        source: "training_observation" as const,
        occurredAt: "2026-06-15T10:10:00.000Z",
        eventId,
        recordedByCoachId: coachId,
        visibility: "parent" as const,
        note: "重庆天才核心能力训练观察。",
        createdAt: now,
        updatedAt: now,
      },
    ];
  });

  return [
    {
      id: `metric-record-cq-talent-training-${student.id}`,
      clubId,
      studentId: student.id,
      metricId: "metric-finishing",
      value: { kind: "rating_1_5" as const, score },
      source: "training_observation" as const,
      occurredAt: "2026-06-28T10:20:00.000Z",
      eventId,
      recordedByCoachId: coachId,
      visibility: "parent" as const,
      note: "导入测试数据训练观察。",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `metric-record-cq-talent-assessment-${student.id}`,
      clubId,
      studentId: student.id,
      metricId: "metric-finishing",
      value: { kind: "rating_1_5" as const, score },
      source: "assessment" as const,
      occurredAt: "2026-06-29T10:00:00.000Z",
      eventId,
      templateVersionId: "assessment-template-version-technical-1",
      recordedByCoachId: coachId,
      visibility: "parent" as const,
      note: "导入测试数据周期评测。",
      createdAt: now,
      updatedAt: now,
    },
    ...radarRecords,
  ];
}

function coachIdByTeamName(teamName: string) {
  const coachName = coachNameByTeamName.get(teamName);
  return coachName ? coachIdByName.get(coachName) ?? "coach-1" : "coach-1";
}

function trainingEventId(teamName: string) {
  return `event-cq-talent-${teamSlug(teamName)}-training`;
}

function matchEventId(teamName: string) {
  return `event-cq-talent-${teamSlug(teamName)}-match`;
}

function teamSlug(teamName: string) {
  return teamIdByName.get(teamName)?.replace(/^team-cq-talent-/, "").replace(/^team-/, "") ?? "team";
}

function matchTeamNames() {
  return Array.from(teamIdByName.keys()).filter((teamName) => !["周末提高班", "精英小班课"].includes(teamName));
}

function padDate(value: number) {
  return String(value).padStart(2, "0");
}

function ratingForIndex(index: number): Rating {
  return [3, 4, 5][index % 3] as Rating;
}

function createSyncRun(id: string, tableMappingId: string, count: number) {
  return {
    id,
    clubId,
    connectionId,
    tableMappingId,
    status: "completed" as const,
    startedAt: "2026-06-25T08:00:00.000Z",
    finishedAt: importedAt,
    totalRecords: count,
    importedRecords: count,
    failedRecords: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function createRawRecords(
  tableKey: keyof typeof tableIds,
  rows: CqTalentBusinessRow[],
  students: CqTalentSyntheticStudent[],
  normalize: (row: CqTalentBusinessRow, student: CqTalentSyntheticStudent) => Record<string, unknown>,
) {
  return rows.map((row, index) => {
    const student = students[index]!;
    const rawId = rawRecordId(tableKey, student);

    return {
      id: rawId,
      clubId,
      connectionId,
      tableMappingId: tableIds[tableKey],
      syncRunId: syncRunId(tableKey),
      externalRecordId: `${tableKey}:row-${index + 2}`,
      payload: row,
      payloadHash: `${rawId}-hash`,
      reviewStatus: "pending" as const,
      normalizedPreview: normalize(row, student),
      importedAt,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function createRecordLinks(tableKey: keyof typeof tableIds, students: CqTalentSyntheticStudent[]) {
  return students.map((student, index) => ({
    id: `external-record-link-cq-talent-${tableKey}-${String(index + 1).padStart(3, "0")}`,
    clubId,
    rawRecordId: rawRecordId(tableKey, student),
    targetType: "student",
    targetId: student.id,
    linkStatus: "confirmed" as const,
    confirmedBy: "user-admin-1",
    confirmedAt: importedAt,
    createdAt: now,
    updatedAt: now,
  }));
}

function rawRecordId(tableKey: keyof typeof tableIds, student: CqTalentSyntheticStudent) {
  return `external-raw-cq-talent-${tableKey}-${student.id}`;
}

function syncRunId(tableKey: keyof typeof tableIds) {
  switch (tableKey) {
    case "fullUsers":
      return "external-sync-run-cq-talent-full-users-200";
    case "paymentEvents":
      return "external-sync-run-cq-talent-payment-events-200";
    case "attendance":
      return "external-sync-run-cq-talent-attendance-200";
    case "insurance":
      return "external-sync-run-cq-talent-insurance-200";
  }
}

function normalizeFullUser(row: CqTalentBusinessRow) {
  return {
    "student.identityNumber": row["身份证号"],
    "student.name": row["学员姓名"],
    "student.birthDate": row["出生年月"],
    "student.status": row["学员状态"],
    "studentOperationalProfile.channel": row["渠道"],
    "studentOperationalProfile.area": row["区域"],
    "studentOperationalProfile.schoolName": row["学校"],
    "studentOperationalProfile.communicationFeedback": row["沟通反馈"],
    "team.name": row["队伍名称"],
    "coach.name": row["教练"],
    "contact.phone": row["手机"],
    "contact.wechat": row["微信"],
    "billing.lastPaymentDates": row["历次充值日期"],
    "billing.paymentCount": row["充值笔数"],
    "insurance.expiresAt": row["保险到期日期"],
    "attendance.checkInCount": row["签到次数"],
    "attendance.lastCheckInAt": row["最近签到时间"],
  };
}

function normalizePaymentEvent(row: CqTalentBusinessRow) {
  return {
    "student.identityNumber": row["身份证号"],
    "payment.paidAt": row["收费日期"],
    "payment.stage": row["收费阶段"],
    "payment.communicationProgress": row["沟通进度"],
    "student.name": row["学员姓名"],
    "payment.type": row["充值类型"],
    "contact.phone": row["手机"],
    "contact.wechat": row["微信"],
    "studentOperationalProfile.area": row["区域"],
    "studentOperationalProfile.schoolName": row["学校"],
    "team.name": row["队伍名称"],
    "coach.name": row["教练"],
    "payment.amount": row["金额"],
    "payment.courseHours": row["课时"],
    "payment.note": row["备注"],
    "insurance.expiresAt": row["保险到期日期"],
    "payment.auditPassed": row["审核通过"],
  };
}

function normalizeAttendance(row: CqTalentBusinessRow) {
  return {
    "student.identityNumber": row["身份证号"],
    "attendance.stage": row["阶段"],
    "student.name": row["姓名"],
    "studentOperationalProfile.area": row["区域"],
    "studentOperationalProfile.schoolName": row["学校"],
    "team.name": row["队伍名称"],
    "coach.name": row["教练"],
    "attendance.teamPaidCourseHours": row["在该队充值课时"],
    "attendance.teamOtherDeductedCourseHours": row["在该队其他情况划课"],
    "attendance.termTeamCheckInCount": row["本学期在该队签到"],
    "attendance.teamCourseBalance": row["在该队的剩余课时"],
    "attendance.createdAt": row["创建时间"],
  };
}

function normalizeInsurance(row: CqTalentBusinessRow) {
  return {
    "insurance.purchasedAt": row["投保日期"],
    "student.identityNumber": row["身份证号"],
    "insurance.expiresAt": row["保险到期日期"],
    "insurance.policyNo": row["保单号"],
    "insurance.sport": row["运动项目"],
    "student.name": row["学员姓名"],
    "studentOperationalProfile.schoolName": row["学校"],
    "insurance.vendor": row["购买公司"],
    "insurance.auditPassed": row["审核通过"],
    "insurance.note": row["备注"],
  };
}
