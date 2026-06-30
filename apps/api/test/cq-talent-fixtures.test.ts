import { computeMetricGraph } from "@football-club/domain";
import { describe, expect, it } from "vitest";
import {
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

describe("Chongqing Talent synthetic fixtures", () => {
  it("generates 200 students across the real customer table fields with matching coach names", () => {
    const fixture = createCqTalentSyntheticFixture(200);
    const coachNames = new Set(fixture.coaches.map((coach) => coach.name));
    const phones = fixture.students.map((student) => student.phone);
    const phoneCounts = new Map<string, number>();
    for (const phone of phones) {
      phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
    }
    const teamNames = new Set(fixture.students.flatMap((student) => student.teamMemberships.map((membership) => membership.teamName)));

    expect(fixture.students).toHaveLength(200);
    expect(fixture.families.length).toBeGreaterThan(120);
    expect(fixture.families.length).toBeLessThan(200);
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
    const parentIds = new Set((seed.parents ?? []).map((parent) => parent.id));
    const acceptanceParentId = "parent-cq-talent-acceptance";
    const familyBindings = (seed.guardianBindings ?? []).filter((binding) => binding.parentId !== acceptanceParentId);
    const acceptanceBindings = (seed.guardianBindings ?? []).filter((binding) => binding.parentId === acceptanceParentId);
    const bindingsByParent = new Map<string, number>();
    const participantsByEvent = new Map<string, number>();

    for (const binding of familyBindings) {
      bindingsByParent.set(binding.parentId, (bindingsByParent.get(binding.parentId) ?? 0) + 1);
    }
    for (const participant of seed.participants ?? []) {
      participantsByEvent.set(participant.eventId, (participantsByEvent.get(participant.eventId) ?? 0) + 1);
    }

    expect(seed.students).toHaveLength(200);
    expect(seed.parents?.length).toBeGreaterThan(120);
    expect(seed.parents?.length).toBeLessThan(200);
    expect(familyBindings).toHaveLength(200);
    expect(acceptanceBindings).toHaveLength(200);
    expect((seed.guardianBindings ?? []).every((binding) => parentIds.has(binding.parentId))).toBe(true);
    expect(Math.max(...bindingsByParent.values())).toBeLessThanOrEqual(3);
    expect(Array.from(bindingsByParent.values()).some((count) => count > 1)).toBe(true);
    expect(seed.teamMembers?.length).toBeGreaterThan(200);
    expect(seed.events?.filter((event) => event.type === "training").length).toBeGreaterThanOrEqual(8);
    expect(seed.events?.filter((event) => event.type === "match").length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...participantsByEvent.values())).toBeLessThan(100);
  });
});

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
});
