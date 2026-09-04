import { computeMetricGraph } from "@football-club/domain";
import { describe, expect, it } from "vitest";
import {
  cqTalentFamilyDistribution,
  createCqTalentSyntheticFixture,
  cqTalentAttendanceHeaders,
  cqTalentFullUsersHeaders,
  cqTalentInsuranceHeaders,
  cqTalentPaymentEventHeaders,
} from "../src/seed/cq-talent-test-data.js";
import { createCqTalentAcceptanceSeed } from "../src/seed/cq-talent-acceptance.js";
import {
  createTalentEliteAssessmentCatalog,
  createTalentEliteTrainingCatalog,
  splitRecommendedTrainingItems,
  talentEliteAssessmentBlueprintRows,
} from "../src/seed/cq-talent-assessment-model.js";
import { createSeedData } from "../src/seed.js";
import { createPlatformSeed } from "../src/seed/platform.js";

describe("Chongqing Talent synthetic fixtures", () => {
  it("ignores the acceptance seed flag in production but permits an explicit isolated non-production seed", () => {
    const original = process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED;
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED;
      expect(createSeedData().users.some((user) => user.id === "user-parent-cq-talent-acceptance")).toBe(false);
      process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED = "1";
      expect(createSeedData().users.some((user) => user.id === "user-parent-cq-talent-acceptance")).toBe(false);

      process.env.NODE_ENV = "test";
      expect(createSeedData().users.some((user) => user.id === "user-parent-cq-talent-acceptance")).toBe(true);
    } finally {
      if (original === undefined) {
        delete process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED;
      } else {
        process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED = original;
      }
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });

  it("uses the configured acceptance phone for the dual-role demo identity", () => {
    const original = process.env.FCM_CQ_TALENT_ACCEPTANCE_PHONE;
    const configuredPhone = "15500000000";
    try {
      process.env.FCM_CQ_TALENT_ACCEPTANCE_PHONE = configuredPhone;
      const seed = createCqTalentAcceptanceSeed();
      const user = seed.users?.find((candidate) => candidate.id === "user-parent-cq-talent-acceptance");
      const parent = seed.parents?.find((candidate) => candidate.id === "parent-cq-talent-acceptance");

      expect(user?.phone).toBe(configuredPhone);
      expect(parent?.phone).toBe(configuredPhone);
    } finally {
      if (original === undefined) {
        delete process.env.FCM_CQ_TALENT_ACCEPTANCE_PHONE;
      } else {
        process.env.FCM_CQ_TALENT_ACCEPTANCE_PHONE = original;
      }
    }
  });

  it("generates 200 students across the real customer table fields with matching coach names", () => {
    const fixture = createCqTalentSyntheticFixture(200);
    const coachNames = new Set(fixture.coaches.map((coach) => coach.name));
    const phones = fixture.students.map((student) => student.phone);
    const phoneCounts = new Map<string, number>();
    for (const phone of phones) {
      phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
    }
    const teamNames = new Set(fixture.students.flatMap((student) => student.teamMemberships.map((membership) => membership.teamName)));
    const familySizes = new Map<string, number>();
    for (const student of fixture.students) {
      familySizes.set(student.familyId, (familySizes.get(student.familyId) ?? 0) + 1);
    }
    const familySizeCounts = countValues(familySizes.values());

    expect(fixture.students).toHaveLength(200);
    expect(fixture.families).toHaveLength(cqTalentFamilyDistribution.totalFamilies);
    expect(familySizeCounts.get(1)).toBe(cqTalentFamilyDistribution.singleChildFamilies);
    expect(familySizeCounts.get(2)).toBe(cqTalentFamilyDistribution.twoChildFamilies);
    expect(familySizeCounts.get(3)).toBe(cqTalentFamilyDistribution.threeChildFamilies);
    expect(familySizes.get(fixture.families[0]!.id)).toBe(2);
    expect(fixture.tables.fullUsers).toHaveLength(200);
    expect(fixture.tables.paymentEvents).toHaveLength(200);
    expect(fixture.tables.attendance).toHaveLength(200);
    expect(fixture.tables.insurance).toHaveLength(200);
    expect(Object.keys(fixture.tables.fullUsers[0] ?? {})).toEqual([...cqTalentFullUsersHeaders]);
    expect(Object.keys(fixture.tables.paymentEvents[0] ?? {})).toEqual([...cqTalentPaymentEventHeaders]);
    expect(Object.keys(fixture.tables.attendance[0] ?? {})).toEqual([...cqTalentAttendanceHeaders]);
    expect(Object.keys(fixture.tables.insurance[0] ?? {})).toEqual([...cqTalentInsuranceHeaders]);
    expect(fixture.tables.fullUsers.every((row) => coachNames.has(String(row["教练"])))).toBe(true);
    expect(fixture.tables.paymentEvents.every((row) => row["审核通过"] === true && row["已同步"] === false)).toBe(true);
    expect(fixture.tables.attendance.every((row) => Number(row["在该队的剩余课时"]) >= 0)).toBe(true);
    expect(new Set(phones).size).toBe(fixture.families.length);
    expect(Math.max(...phoneCounts.values())).toBeLessThanOrEqual(3);
    expect(Array.from(phoneCounts.values()).some((count) => count > 1)).toBe(true);
    expect(fixture.students.every((student) => !student.name.startsWith("测试学员"))).toBe(true);
    expect(fixture.students.some((student) => student.teamMemberships.length > 1)).toBe(true);
    expect(teamNames.size).toBeGreaterThanOrEqual(8);
  });

  it("builds an acceptance seed with realistic family, team, coach, and activity distribution", () => {
    const seed = createCqTalentAcceptanceSeed();
    const platform = createPlatformSeed();
    const parents = seed.parents ?? [];
    const users = seed.users ?? [];
    const memberships = seed.clubMemberships ?? [];
    const bindings = seed.guardianBindings ?? [];
    const parentIds = new Set(parents.map((parent) => parent.id));
    const acceptanceParentId = "parent-cq-talent-acceptance";
    const acceptanceParentUserId = "user-parent-cq-talent-acceptance";
    const acceptanceBindings = bindings.filter((binding) => binding.parentId === acceptanceParentId);
    const bindingsByParent = new Map<string, number>();
    const bindingsByStudent = new Map<string, number>();
    const participantsByEvent = new Map<string, number>();

    for (const binding of bindings) {
      bindingsByParent.set(binding.parentId, (bindingsByParent.get(binding.parentId) ?? 0) + 1);
      bindingsByStudent.set(binding.studentId, (bindingsByStudent.get(binding.studentId) ?? 0) + 1);
    }
    for (const participant of seed.participants ?? []) {
      participantsByEvent.set(participant.eventId, (participantsByEvent.get(participant.eventId) ?? 0) + 1);
    }

    expect(seed.students).toHaveLength(200);
    expect(parents).toHaveLength(cqTalentFamilyDistribution.totalFamilies);
    expect(bindings).toHaveLength(200);
    expect(acceptanceBindings).toHaveLength(2);
    expect(bindings.every((binding) => binding.isPrimaryContact && parentIds.has(binding.parentId))).toBe(true);
    expect(bindingsByParent.size).toBe(parents.length);
    expect(bindingsByStudent.size).toBe(seed.students?.length);
    expect(bindings.every((binding) => seed.students?.some((student) => student.id === binding.studentId))).toBe(true);
    expect(Array.from(bindingsByStudent.values()).every((count) => count === 1)).toBe(true);
    expect(countValues(bindingsByParent.values()).get(1)).toBe(cqTalentFamilyDistribution.singleChildFamilies);
    expect(countValues(bindingsByParent.values()).get(2)).toBe(cqTalentFamilyDistribution.twoChildFamilies);
    expect(countValues(bindingsByParent.values()).get(3)).toBe(cqTalentFamilyDistribution.threeChildFamilies);
    expect(Math.max(...bindingsByParent.values())).toBeLessThanOrEqual(3);
    expect(parents.every((parent) => {
      const user = users.find((candidate) => candidate.id === parent.userId);
      return user?.phone === parent.phone
        && user.roles.includes("parent")
        && memberships.some((membership) => membership.userId === parent.userId && membership.roles.includes("parent"));
    })).toBe(true);
    expect(new Set(parents.map((parent) => parent.userId)).size).toBe(parents.length);
    expect(new Set(parents.map((parent) => parent.phone)).size).toBe(parents.length);
    expect(parents.find((parent) => parent.id === acceptanceParentId)?.userId).toBe(acceptanceParentUserId);
    expect(users.find((user) => user.id === acceptanceParentUserId)?.phone).not.toBe("13900000000");
    expect(seed.teamMembers?.length).toBeGreaterThan(200);
    expect(seed.events?.filter((event) => event.type === "training").length).toBeGreaterThanOrEqual(8);
    expect(seed.events?.filter((event) => event.type === "match").length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...participantsByEvent.values())).toBeLessThan(100);

    const allTeams = [...platform.teams, ...(seed.teams ?? [])];
    const allCoaches = [...platform.coaches, ...(seed.coaches ?? [])];
    const allUsers = [...platform.users, ...users];
    const allMemberships = [...platform.clubMemberships, ...memberships];
    const teamIds = new Set(allTeams.map((team) => team.id));
    const coachIds = new Set(allCoaches.map((coach) => coach.id));
    const eventIds = new Set((seed.events ?? []).map((event) => event.id));
    const studentIds = new Set((seed.students ?? []).map((student) => student.id));
    const teamMembersByStudent = new Map<string, Array<{ isPrimaryTeam: boolean }>>();

    for (const teamMember of seed.teamMembers ?? []) {
      const current = teamMembersByStudent.get(teamMember.studentId) ?? [];
      current.push(teamMember);
      teamMembersByStudent.set(teamMember.studentId, current);
    }

    expect((seed.teamMembers ?? []).every((teamMember) => teamIds.has(teamMember.teamId) && studentIds.has(teamMember.studentId))).toBe(true);
    expect(Array.from(teamMembersByStudent.values()).every((items) => items.filter((item) => item.isPrimaryTeam).length === 1)).toBe(true);
    expect(allTeams.every((team) => !team.defaultCoachId || coachIds.has(team.defaultCoachId))).toBe(true);
    expect((seed.events ?? []).every((event) => teamIds.has(event.primaryTeamId ?? "") && coachIds.has(event.ownerCoachId ?? ""))).toBe(true);
    expect((seed.participants ?? []).every((participant) => eventIds.has(participant.eventId) && studentIds.has(participant.studentId))).toBe(true);
    expect(allCoaches.every((coach) =>
      allUsers.some((user) => user.id === coach.userId && user.roles.includes("coach"))
      && allMemberships.some((membership) => membership.userId === coach.userId && membership.roles.includes("coach")),
    )).toBe(true);
  });

  it("makes the acceptance family a restart-safe dual-role demo with current operational data", () => {
    const seed = createCqTalentAcceptanceSeed();
    const acceptanceUserId = "user-parent-cq-talent-acceptance";
    const acceptanceStudentIds = ["student-cq-talent-001", "student-cq-talent-002"];
    const coachDemoRosterStudentIds = Array.from(
      { length: 16 },
      (_value, index) => `student-cq-talent-${String(index + 1).padStart(3, "0")}`,
    );
    const demoEventIds = [
      "event-cq-talent-demo-training-foundation",
      "event-cq-talent-demo-training-finishing",
      "event-cq-talent-demo-training-completed",
      "event-cq-talent-demo-match-completed",
      "event-cq-talent-demo-training-upcoming",
      "event-cq-talent-demo-match-tactical",
    ];

    expect(seed.users?.find((user) => user.id === acceptanceUserId)?.roles).toEqual(["parent", "coach"]);
    expect(seed.clubMemberships?.find((membership) => membership.userId === acceptanceUserId)?.roles).toEqual(["parent", "coach"]);
    expect(seed.coaches).toContainEqual(expect.objectContaining({
      id: "coach-cq-talent-acceptance-demo",
      userId: acceptanceUserId,
      status: "active",
    }));
    expect(seed.teams).toContainEqual(expect.objectContaining({
      id: "team-cq-talent-acceptance-demo",
      defaultCoachId: "coach-cq-talent-acceptance-demo",
      status: "active",
    }));
    expect(seed.teamMembers?.filter((member) => member.teamId === "team-cq-talent-acceptance-demo").map((member) => member.studentId))
      .toEqual(coachDemoRosterStudentIds);
    expect(seed.events?.filter((event) => demoEventIds.includes(event.id)).map((event) => event.id))
      .toEqual(demoEventIds);
    expect(seed.events?.filter((event) => demoEventIds.includes(event.id) && event.type === "training" && event.status === "completed"))
      .toHaveLength(3);
    for (const eventId of demoEventIds) {
      expect(seed.participants?.filter((participant) => participant.eventId === eventId).map((participant) => participant.studentId))
        .toEqual(coachDemoRosterStudentIds);
    }
    expect(new Set(seed.participants
      ?.filter((participant) => participant.eventId === "event-cq-talent-demo-training-completed")
      .map((participant) => participant.status)))
      .toEqual(new Set(["present", "late", "absent", "leave_requested", "excused"]));
    expect(new Set(seed.participants
      ?.filter((participant) => participant.eventId === "event-cq-talent-demo-training-upcoming")
      .map((participant) => participant.status)))
      .toEqual(new Set(["confirmed"]));
    expect(seed.events).toContainEqual(expect.objectContaining({
      id: "event-cq-talent-demo-match-tactical",
      type: "match",
      status: "scheduled",
    }));
    expect(seed.trainingSessions).toContainEqual(expect.objectContaining({
      eventId: "event-cq-talent-demo-training-upcoming",
      sessionPlanId: "session-plan-finishing",
    }));
    expect(seed.matches).toContainEqual(expect.objectContaining({
      eventId: "event-cq-talent-demo-match-completed",
      matchType: "friendly",
      homeScore: 3,
      awayScore: 2,
      status: "completed",
    }));
    expect(seed.matchRosters?.filter((roster) => roster.matchId === "match-cq-talent-demo-completed").map((roster) => roster.studentId))
      .toEqual(coachDemoRosterStudentIds);
    const completedMatchEvents = seed.matchEvents?.filter((event) => event.matchId === "match-cq-talent-demo-completed") ?? [];
    expect(completedMatchEvents.map((event) => event.type))
      .toEqual(["goal", "assist", "yellow_card", "save"]);
    expect(completedMatchEvents.every((event) => coachDemoRosterStudentIds.includes(event.studentId))).toBe(true);
    expect(completedMatchEvents.find((event) => event.type === "yellow_card")?.minute)
      .not.toBe(completedMatchEvents.find((event) => event.type === "save")?.minute);
    expect(seed.matchPlayerNotes?.filter((note) => note.matchId === "match-cq-talent-demo-completed").map((note) => note.studentId))
      .toEqual(coachDemoRosterStudentIds);
    for (const studentId of coachDemoRosterStudentIds) {
      expect(seed.metricRecords?.filter((record) =>
        record.studentId === studentId
        && record.recordedByCoachId === "coach-cq-talent-acceptance-demo"
        && record.occurredAt.startsWith("2026-08-"),
      )).toHaveLength(8);
    }
    expect(seed.guardianBindings?.filter((binding) => binding.parentId === "parent-cq-talent-acceptance").map((binding) => binding.studentId))
      .toEqual(acceptanceStudentIds);
  });
});

function countValues(values: Iterable<number>) {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

describe("Chongqing Talent elite assessment model", () => {
  it("extracts test items and recommended training projects from the real outline", () => {
    const training = createTalentEliteTrainingCatalog();
    const assessment = createTalentEliteAssessmentCatalog();

    expect(talentEliteAssessmentBlueprintRows).toHaveLength(62);
    expect(splitRecommendedTrainingItems("颠球、踩球拉球、左右脚交替触球")).toEqual(["颠球", "踩球拉球", "左右脚交替触球"]);
    expect(training.drills).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "颠球" }),
      expect.objectContaining({ name: "绕桩" }),
      expect.objectContaining({ name: "平板支撑" }),
    ]));
    expect(assessment.assessmentTestItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "1 分钟颠球次数",
        metricId: "metric-cq-talent-atomic-03",
      }),
    ]));
    expect(assessment.metricViews).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "metric-view-cq-talent-elite-core-radar" }),
      expect.objectContaining({ id: "metric-view-cq-talent-elite-full-graph" }),
    ]));
  });

  it("is wired into seed data as a computable metric graph with final score lineage", () => {
    const seed = createSeedData();
    const graphVersion = seed.metricGraphVersions.find((graph) => graph.id === "metric-graph-version-cq-talent-elite-20260326");
    const atomicMetrics = seed.metrics.filter((metric) => metric.id.startsWith("metric-cq-talent-atomic-"));
    const inputRecords = atomicMetrics.map((metric, index) => ({
      id: `test-record-${index + 1}`,
      clubId: "club-chongqing-talent",
      studentId: "student-1",
      metricId: metric.id,
      value: { kind: "score_0_100" as const, score: 80 },
      source: "assessment" as const,
      occurredAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    }));
    let idCounter = 0;

    if (!graphVersion) {
      throw new Error("Missing Chongqing Talent elite graph version.");
    }

    const result = computeMetricGraph({
      clubId: "club-chongqing-talent",
      studentId: "student-1",
      graphVersion,
      metrics: seed.metrics,
      dependencies: seed.metricDependencies,
      formulas: seed.derivedMetricDefinitions,
      inputRecords,
      ids: {
        next: (prefix = "id") => `${prefix}-${++idCounter}`,
      },
      now: "2026-07-01T00:00:00.000Z",
      assessmentId: "assessment-cq-talent-test",
      templateVersionId: "assessment-template-version-cq-talent-elite-20260326",
    });
    const finalRecord = result.records.find((record) => record.metricId === "metric-cq-talent-final-score");

    expect(atomicMetrics).toHaveLength(62);
    expect(result.records.length).toBeGreaterThan(30);
    expect(finalRecord?.value).toEqual({ kind: "measurement", value: 72, unit: "score" });
    expect(result.lineages.find((lineage) => lineage.outputRecordId === finalRecord?.id)).toBeDefined();
  });

  it("uses the supplied score table as the active technical assessment template", () => {
    const seed = createSeedData();
    const tableVersionId = "assessment-template-version-technical-table-20260904";
    const tableInputs = seed.assessmentMetricBindings.filter((binding) =>
      binding.templateVersionId === tableVersionId && binding.role === "input",
    );
    const tableItems = new Map(seed.assessmentTestItems.map((item) => [item.id, item]));
    const itemNames = tableInputs.map((binding) => tableItems.get(binding.testItemId ?? "")?.name).filter(Boolean);

    expect(seed.assessmentTemplateVersions).toContainEqual(expect.objectContaining({
      id: tableVersionId,
      templateId: "assessment-template-technical",
      graphVersionId: "metric-graph-version-cq-talent-elite-20260326",
      status: "active",
    }));
    expect(tableInputs).toHaveLength(62);
    expect(new Set(tableInputs.map((binding) => binding.metricId)).size).toBe(62);
    expect(itemNames).toEqual(expect.arrayContaining([
      "1 分钟颠球次数",
      "边路正面 1v1 突破",
      "30 米冲刺计时",
      "平板支撑时间",
    ]));
  });
});
