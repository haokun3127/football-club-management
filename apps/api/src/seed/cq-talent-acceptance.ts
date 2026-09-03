import type { SeedData } from "./types.js";
import { chongqingTalentClubId as clubId, seedNow as now } from "./types.js";
import { createTalentEliteAssessmentCatalog } from "./cq-talent-assessment-model.js";
import { createCqTalentSyntheticFixture, type CqTalentBusinessRow, type CqTalentSyntheticStudent } from "./cq-talent-test-data.js";

const connectionId = "external-connection-wps-cq-talent";
const importedAt = "2026-06-25T08:01:00.000Z";
const acceptanceParentUserId = "user-parent-cq-talent-acceptance";
const acceptanceParentId = "parent-cq-talent-acceptance";
const acceptanceCoachId = "coach-cq-talent-acceptance-demo";
const acceptanceDemoTeamId = "team-cq-talent-acceptance-demo";
const acceptanceDemoEventIds = {
  completedTrainingFoundation: "event-cq-talent-demo-training-foundation",
  completedTrainingFinishing: "event-cq-talent-demo-training-finishing",
  completedTraining: "event-cq-talent-demo-training-completed",
  completedMatch: "event-cq-talent-demo-match-completed",
  upcomingTraining: "event-cq-talent-demo-training-upcoming",
  upcomingTacticalMatch: "event-cq-talent-demo-match-tactical",
} as const;
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
  const acceptancePhone = process.env.FCM_CQ_TALENT_ACCEPTANCE_PHONE?.trim() || families[0]!.phone;
  const familyUserIds = new Map(families.map((family) => [
    family.id,
    family.id === acceptanceFamilyId ? acceptanceParentUserId : `user-parent-${family.id}`,
  ]));
  const familyParentIds = new Map(families.map((family) => [
    family.id,
    family.id === acceptanceFamilyId ? acceptanceParentId : `parent-${family.id}`,
  ]));
  const acceptanceStudents = students.filter((student) => student.familyId === acceptanceFamilyId);
  const acceptanceDemoRosterStudents = acceptanceStudents.concat(
    students.filter((student) => student.familyId !== acceptanceFamilyId).slice(0, 14),
  );

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
        phone: family.id === acceptanceFamilyId ? acceptancePhone : family.phone,
        roles: family.id === acceptanceFamilyId ? ["parent" as const, "coach" as const] : ["parent" as const],
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
        roles: family.id === acceptanceFamilyId ? ["parent" as const, "coach" as const] : ["parent" as const],
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
      phone: family.id === acceptanceFamilyId ? acceptancePhone : family.phone,
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
    })).concat({
      id: acceptanceCoachId,
      clubId,
      userId: acceptanceParentUserId,
      name: "王教练（体验）",
      specialties: ["双角色体验", "训练计划", "能力评测"],
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    }),
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
      })).concat({
        id: acceptanceDemoTeamId,
        clubId,
        name: "双角色体验队",
        ageGroup: "U8-U9",
        level: "development" as const,
        defaultCoachId: acceptanceCoachId,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
      }),
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
    }))).concat(acceptanceDemoRosterStudents.map((student, index) => ({
      id: `team-member-cq-talent-acceptance-demo-${index + 1}`,
      clubId,
      teamId: acceptanceDemoTeamId,
      studentId: student.id,
      startsAt: "2026-08-01",
      isPrimaryTeam: false,
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
      {
        id: acceptanceDemoEventIds.completedTrainingFoundation,
        clubId,
        type: "training" as const,
        title: "演示 · 双角色体验队控球协调训练",
        timeRange: { startsAt: "2026-08-03T01:00:00.000Z", endsAt: "2026-08-03T02:30:00.000Z" },
        primaryTeamId: acceptanceDemoTeamId,
        ownerCoachId: acceptanceCoachId,
        status: "completed" as const,
        notes: "演示数据：控球、协调与传接基础训练。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: acceptanceDemoEventIds.completedTrainingFinishing,
        clubId,
        type: "training" as const,
        title: "演示 · 双角色体验队传接射门训练",
        timeRange: { startsAt: "2026-08-06T01:00:00.000Z", endsAt: "2026-08-06T02:30:00.000Z" },
        primaryTeamId: acceptanceDemoTeamId,
        ownerCoachId: acceptanceCoachId,
        status: "completed" as const,
        notes: "演示数据：传接配合与终结训练。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: acceptanceDemoEventIds.completedTraining,
        clubId,
        type: "training" as const,
        title: "演示 · 双角色体验队训练复盘",
        timeRange: { startsAt: "2026-08-10T01:00:00.000Z", endsAt: "2026-08-10T02:30:00.000Z" },
        primaryTeamId: acceptanceDemoTeamId,
        ownerCoachId: acceptanceCoachId,
        status: "completed" as const,
        notes: "演示数据：签到、训练内容和能力测评回看。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: acceptanceDemoEventIds.completedMatch,
        clubId,
        type: "match" as const,
        title: "演示 · 双角色体验队友谊赛",
        timeRange: { startsAt: "2026-08-09T01:30:00.000Z", endsAt: "2026-08-09T03:00:00.000Z" },
        primaryTeamId: acceptanceDemoTeamId,
        ownerCoachId: acceptanceCoachId,
        status: "completed" as const,
        notes: "演示数据：比赛记录、球员表现和战术布置。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: acceptanceDemoEventIds.upcomingTraining,
        clubId,
        type: "training" as const,
        title: "演示 · 双角色体验队本周训练",
        timeRange: { startsAt: "2026-08-12T10:30:00.000Z", endsAt: "2026-08-12T12:00:00.000Z" },
        primaryTeamId: acceptanceDemoTeamId,
        ownerCoachId: acceptanceCoachId,
        status: "scheduled" as const,
        notes: "演示数据：可在教练端检查训练内容、点名和战术板。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: acceptanceDemoEventIds.upcomingTacticalMatch,
        clubId,
        type: "match" as const,
        title: "演示 · 双角色体验队战术演练赛",
        timeRange: { startsAt: "2026-08-13T10:30:00.000Z", endsAt: "2026-08-13T12:00:00.000Z" },
        primaryTeamId: acceptanceDemoTeamId,
        ownerCoachId: acceptanceCoachId,
        status: "scheduled" as const,
        notes: "演示数据：可在教练端保存阵型并验证重启后仍可读取。",
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
      ...acceptanceDemoRosterStudents.flatMap((student, index) => [
        {
          id: `participant-cq-talent-demo-training-foundation-${index + 1}`,
          clubId,
          eventId: acceptanceDemoEventIds.completedTrainingFoundation,
          studentId: student.id,
          status: "present" as const,
          note: "演示数据：已完成控球协调训练",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `participant-cq-talent-demo-training-finishing-${index + 1}`,
          clubId,
          eventId: acceptanceDemoEventIds.completedTrainingFinishing,
          studentId: student.id,
          status: index === 0 ? "present" as const : "late" as const,
          note: "演示数据：已完成传接射门训练",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `participant-cq-talent-demo-training-completed-${index + 1}`,
          clubId,
          eventId: acceptanceDemoEventIds.completedTraining,
          studentId: student.id,
          status: index < 10 ? "present" as const : index < 12 ? "late" as const : index < 14 ? "absent" as const : index === 14 ? "leave_requested" as const : "excused" as const,
          note: index < 10 ? "演示数据：已完成签到" : index < 12 ? "演示数据：迟到 5 分钟" : index < 14 ? "演示数据：已确认缺席" : index === 14 ? "演示数据：已确认请假" : "演示数据：已确认免扣",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `participant-cq-talent-demo-match-completed-${index + 1}`,
          clubId,
          eventId: acceptanceDemoEventIds.completedMatch,
          studentId: student.id,
          status: "present" as const,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `participant-cq-talent-demo-training-upcoming-${index + 1}`,
          clubId,
          eventId: acceptanceDemoEventIds.upcomingTraining,
          studentId: student.id,
          status: "confirmed" as const,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `participant-cq-talent-demo-match-tactical-${index + 1}`,
          clubId,
          eventId: acceptanceDemoEventIds.upcomingTacticalMatch,
          studentId: student.id,
          status: "confirmed" as const,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    ],
    metricRecords: students.flatMap((student, index) => createMetricRecords(student, index)).concat(createAcceptanceDemoMetricRecords(acceptanceDemoRosterStudents)),
    trainingSessions: [
      {
        id: "training-session-cq-talent-demo-foundation",
        clubId,
        eventId: acceptanceDemoEventIds.completedTrainingFoundation,
        kind: "team" as const,
        sessionPlanId: "session-plan-finishing",
        intensity: "low" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "training-session-cq-talent-demo-finishing",
        clubId,
        eventId: acceptanceDemoEventIds.completedTrainingFinishing,
        kind: "team" as const,
        sessionPlanId: "session-plan-finishing",
        intensity: "medium" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "training-session-cq-talent-demo-completed",
        clubId,
        eventId: acceptanceDemoEventIds.completedTraining,
        kind: "team" as const,
        sessionPlanId: "session-plan-finishing",
        intensity: "medium" as const,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "training-session-cq-talent-demo-upcoming",
        clubId,
        eventId: acceptanceDemoEventIds.upcomingTraining,
        kind: "team" as const,
        sessionPlanId: "session-plan-finishing",
        intensity: "medium" as const,
        createdAt: now,
        updatedAt: now,
      },
    ],
    matches: [{
      id: "match-cq-talent-demo-completed",
      clubId,
      eventId: acceptanceDemoEventIds.completedMatch,
      matchType: "friendly" as const,
      opponentName: "重庆青年体验队",
      homeScore: 3,
      awayScore: 2,
      status: "completed" as const,
      createdAt: now,
      updatedAt: now,
    }],
    matchRosters: acceptanceDemoRosterStudents.map((student, index) => ({
      id: `match-roster-cq-talent-demo-${index + 1}`,
      clubId,
      matchId: "match-cq-talent-demo-completed",
      studentId: student.id,
      teamId: acceptanceDemoTeamId,
      started: true,
      minutesPlayed: index === 0 ? 60 : 48,
      position: index === 0 ? "FW" : "MF",
      createdAt: now,
      updatedAt: now,
    })),
    matchEvents: [{
      id: "match-event-cq-talent-demo-goal-1",
      clubId,
      matchId: "match-cq-talent-demo-completed",
      type: "goal" as const,
      studentId: acceptanceStudents[0]!.id,
      minute: 22,
      linkedMetricId: "metric-goals",
      createdAt: now,
      updatedAt: now,
    }, {
      id: "match-event-cq-talent-demo-assist-1",
      clubId,
      matchId: "match-cq-talent-demo-completed",
      type: "assist" as const,
      studentId: acceptanceStudents[1]!.id,
      minute: 22,
      linkedMetricId: "metric-assists",
      createdAt: now,
      updatedAt: now,
    }, {
      id: "match-event-cq-talent-demo-yellow-card-1",
      clubId,
      matchId: "match-cq-talent-demo-completed",
      type: "yellow_card" as const,
      studentId: acceptanceDemoRosterStudents[2]!.id,
      minute: 37,
      note: "防守回追时的战术犯规。",
      createdAt: now,
      updatedAt: now,
    }, {
      id: "match-event-cq-talent-demo-save-1",
      clubId,
      matchId: "match-cq-talent-demo-completed",
      type: "save" as const,
      studentId: acceptanceDemoRosterStudents[3]!.id,
      minute: 64,
      note: "门前近距离扑救。",
      createdAt: now,
      updatedAt: now,
    }],
    matchPlayerNotes: acceptanceDemoRosterStudents.map((student, index) => ({
      id: `match-note-cq-talent-demo-${index + 1}`,
      clubId,
      matchId: "match-cq-talent-demo-completed",
      studentId: student.id,
      coachId: acceptanceCoachId,
      note: index === 0 ? "演示数据：前场跑位积极，终结果断。" : "演示数据：中场衔接流畅，传接选择合理。",
      createdAt: now,
      updatedAt: now,
    })),
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
        teamId: "team-u10-dev",
        termLabel: "2026 夏季学期",
        title: "体能综合测评",
        templateId: "assessment-template-technical",
        startsOn: "2026-07-01",
        dueOn: "2026-07-31",
      },
      {
        id: "assessment-task-cq-talent-speed-august",
        clubId,
        teamId: "team-u10-dev",
        termLabel: "2026 夏季学期",
        title: "速度耐力体测",
        templateId: "assessment-template-technical",
        startsOn: "2026-08-01",
        dueOn: "2026-08-31",
      },
    ],
    contentArticles: [
      { id: "article-cq-talent-autumn-plan", clubId, title: "2026秋季训练计划", subtitle: "了解最新的训练课程安排与重点内容", accent: "#a80f1b", category: "guide", body: "秋季学期训练将于 9 月第一周正式开始，每周二、四晚间及周六上午安排训练课。\n\n本学期重点：一是夯实传接球与控球基本功，二是引入小场地对抗提升实战决策能力，三是为 11 月区青少年联赛选拔阵容。\n\n请家长关注「日程」页的课程安排，如有时间冲突请提前在变更申请中说明。" },
      { id: "article-cq-talent-growth-report", clubId, title: "球员成长评估报告", subtitle: "详细分析球员近期训练表现与成长点", accent: "#1976d2", category: "help", body: "俱乐部每学期为每位学员生成成长评估报告，覆盖技术、体能、战术理解、心理四个维度。\n\n报告由带训教练根据测评任务与日常观察填写，可在「成长」页查看雷达图与各指标明细。\n\n如对评估结果有疑问，可通过私教沟通渠道与教练预约一对一反馈。" },
      { id: "article-cq-talent-notice-autumn-opening", clubId, title: "秋季训练安排提醒", subtitle: "请家长留意近期训练安排", accent: "#a80f1b", category: "notice", publishedAt: "2026-08-25T09:00:00.000Z", expiresAt: "2026-09-30T23:59:59.000Z", body: "秋季训练将于 9 月第一周开始，请家长提前查看日程安排。若孩子无法参加，请在活动详情中及时提交请假说明。" },
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

function createAcceptanceDemoMetricRecords(students: CqTalentSyntheticStudent[]) {
  return students.flatMap((student, studentIndex) => talentRadarMetricIds.map((metricId, metricIndex) => ({
    id: `metric-record-cq-talent-demo-${student.id}-${metricIndex + 1}`,
    clubId,
    studentId: student.id,
    metricId,
    value: { kind: "measurement" as const, value: 70 + ((studentIndex * 5 + metricIndex * 3) % 18), unit: "score" },
    source: "assessment" as const,
    occurredAt: "2026-08-10T02:15:00.000Z",
    eventId: acceptanceDemoEventIds.completedTraining,
    templateVersionId: "assessment-template-version-cq-talent-elite-20260326",
    recordedByCoachId: acceptanceCoachId,
    visibility: "parent" as const,
    note: "演示数据：双角色体验队本周能力评测。",
    createdAt: now,
    updatedAt: now,
  })));
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
