import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { AssessmentMappingRepository } from "../src/persistence/assessment-mapping-repository.js";
import { BackofficeStandardRepository } from "../src/persistence/backoffice-standard-repository.js";
import type { RadarComparison } from "../src/application/radar-comparison.js";
const clubId = "club-chongqing-talent",
  clientId = "app-client-cq-talent-wechat-main";
describe("published radar comparison", () => {
  it("returns actual zero, complete confirmed history and approved multi-axis standards with per-axis versions", async () => {
    const p = await createPlatformPersistence({ databasePath: ":memory:" });
    let store = new PersistentApiStore(p.repositories);
    const config = await store.getDataCapabilityConfig(clubId),
      now = "2026-10-01T01:00:00.000Z";
    const items = store
      .listAssessmentTestItems(clubId)
      .filter((item) => item.id.startsWith("assessment-test-cq-talent-"))
      .slice(0, 3);
    expect(new Set(items.map((item) => item.metricId)).size).toBe(3);
    const templateVersionId = "ui-radar-version",
      sourceVersion = config.assessmentTemplateVersions.find(
        (version) =>
          version.id === "assessment-template-version-technical-table-20260904",
      )!;
    p.repositories.dataCapability.saveMetricGraphVersion({
      ...config.metricGraphVersions[0]!,
      id: "ui-radar-graph",
      name: "合成雷达",
      version: "ui-v1",
      status: "active",
    });
    p.repositories.dataCapability.saveAssessmentTemplateVersion({
      ...sourceVersion,
      id: templateVersionId,
      graphVersionId: "ui-radar-graph",
      status: "active",
      version: "ui-radar-v1",
    });
    const mappings = new AssessmentMappingRepository(p.database),
      standards = new BackofficeStandardRepository(p.database);
    for (const [index, item] of items.entries()) {
      for (const stage of ["raw_score", "score_grade"] as const)
        mappings.save({
          id: `ui-${stage}-${index}`,
          clubId,
          testItemId: item.id,
          status: "active",
          createdAt: now,
          updatedAt: now,
          definition: {
            name: `合成验收${stage}`,
            stage,
            unit: stage === "raw_score" ? item.unit || "score" : "score",
            minimum: 0,
            maximum: 100,
            applicability: "本地合成验收",
            basis: "official",
            reference: "Synthetic approved acceptance fixture",
            rules:
              stage === "raw_score"
                ? Array.from({ length: 101 }, (_, value) => ({
                    lower: value,
                    upper: value === 100 ? 100 : value + 1,
                    lowerInclusive: true,
                    upperInclusive: value === 100,
                    score: value,
                  }))
                : [
                    {
                      lower: 0,
                      upper: 100,
                      lowerInclusive: true,
                      upperInclusive: true,
                      grade: "合成等级",
                    },
                  ],
          },
        });
      const original = config.assessmentMetricBindings.find(
        (binding) =>
          binding.testItemId === item.id &&
          binding.templateVersionId === sourceVersion.id,
      )!;
      p.repositories.dataCapability.saveAssessmentMetricBinding({
        ...original,
        id: `ui-binding-${index}`,
        templateVersionId,
        scoreMappingVersionId: `ui-raw_score-${index}`,
        gradeMappingVersionId: `ui-score_grade-${index}`,
        maxScore: 100,
      });
      const metric = store
        .listAbilityMetrics(clubId)
        .find((metric) => metric.id === item.metricId)!;
      standards.save({
        id: `ui-standard-${index}`,
        familyId: `ui-standard-family-${index}`,
        clubId,
        status: "active",
        createdAt: now,
        updatedAt: now,
        definition: {
          name: `合成标准${index}`,
          version: "ui-standard-v1",
          targetType: "metric",
          targetId: metric.id,
          unit: metric.unit || "score",
          direction: "higher",
          minimum: 40,
          maximum: 100,
          applicability: "本地合成验收",
          effectiveFrom: "2026-01-01",
          basis: "official",
          reference: "Synthetic approved acceptance fixture",
          modelVersionId: templateVersionId,
        },
      });
    }
    const view = config.metricViews[0]!,
      node = config.metricViewNodes[0]!;
    p.repositories.dataCapability.saveMetricView({
      ...view,
      id: "ui-radar-view",
      graphVersionId: "ui-radar-graph",
      name: "合成三轴",
      status: "active",
    });
    for (const [index, item] of items.entries())
      p.repositories.dataCapability.saveMetricViewNode({
        ...node,
        id: `ui-node-${index}`,
        viewId: "ui-radar-view",
        metricId: item.metricId,
        parentViewNodeId: undefined,
        label: item.name,
        sortOrder: index,
      });
    store = new PersistentApiStore(p.repositories);
    const results = [];
    for (const [id, values, date] of [
      ["ui-history", [20, 60, 80], "2026-10-01T01:00:00Z"],
      ["ui-current", [0, 70, 90], "2026-10-20T01:00:00Z"],
    ] as const) {
      await store.saveAssessmentTask({
        id,
        clubId,
        teamId: "team-u10-dev",
        templateId: "assessment-template-technical",
        title: id,
        termLabel: "合成验收",
        startsOn: "2026-01-01",
        dueOn: "2026-12-31",
      });
      const result = await store.recordAssessment({
        clubId,
        studentId: "student-1",
        assessedByCoachId: "coach-1",
        assessmentTaskId: id,
        templateId: "assessment-template-technical",
        templateVersionId,
        eventId: "event-training-1",
        assessedAt: date,
        rawResults: items.map((item, index) => ({
          testItemId: item.id,
          value: { kind: "score_0_100" as const, score: values[index]! },
          occurredAt: date,
        })),
      });
      results.push(result.assessment.id);
    }
    const sessions = new SessionRegistry(p.repositories.appClientSessions),
      app = buildServer(store, {
        logger: false,
        sessionRegistry: sessions,
        membershipResolver: createProductionMembershipResolver(
          p.repositories.users,
          p.repositories.memberships,
        ),
      });
    async function headers(role: "parent" | "coach") {
      const userId = `user-${role}-1`,
        membership = await p.repositories.memberships.findActiveByClubAndUser(
          clubId,
          userId,
        );
      const session = await sessions.create({
        clubId,
        appClientId: clientId,
        userId,
        membershipId: membership!.id,
        activeRole: role,
      });
      return { authorization: `Bearer ${session.token}` };
    }
    try {
      const parent = await headers("parent"),
        coach = await headers("coach"),
        base = `/clubs/${clubId}/app-clients/${clientId}`,
        path = `${base}/parent/students/student-1/radar-comparison`;
      const initial = await app.inject({ url: path, headers: parent });
      expect(initial.statusCode, initial.body).toBe(200);
      const data = initial.json<RadarComparison>();
      expect(
        data.current.points.find(
          (point) => point.metricId === items[0]!.metricId,
        ),
      ).toMatchObject({ score: 0, status: "measured" });
      expect(data.selectedComparisons).toEqual([]);
      expect(
        data.views.find((view) => view.id === "ui-radar-view")!.metricIds,
      ).toHaveLength(3);
      const standardId = data.comparisonOptions.standards[0]!.id;
      const selected = await app.inject({
        url: `${path}?historyResultId=${results[0]}&standardId=${standardId}`,
        headers: parent,
      });
      expect(selected.statusCode, selected.body).toBe(200);
      const comparison = selected.json<RadarComparison>();
      expect(comparison.selectedComparisons).toHaveLength(2);
      for (const series of [
        comparison.current,
        ...comparison.selectedComparisons,
      ])
        for (const item of items)
          expect(
            series.points.find((point) => point.metricId === item.metricId),
          ).toMatchObject({ status: "measured" });
      expect(
        new Set(
          items.map(
            (item) =>
              comparison.current.points.find(
                (point) => point.metricId === item.metricId,
              )!.mappingVersion,
          ),
        ).size,
      ).toBe(3);
      if (process.env.CQ_RADAR_NATIVE_FIXTURE)
        writeFileSync(
          process.env.CQ_RADAR_NATIVE_FIXTURE,
          JSON.stringify(comparison),
        );
      expect(
        (
          await app.inject({
            url: `${path}?historyResultId=foreign`,
            headers: parent,
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            url: path.replace("student-1", "foreign-child"),
            headers: parent,
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            url: `${base}/coach/students/student-1/radar-comparison?teamId=foreign`,
            headers: coach,
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            url: `${base}/coach/students/student-1/radar-comparison?teamId=team-u10-dev`,
            headers: coach,
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (await app.inject("/openapi.json")).json().paths[
          "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/radar-comparison"
        ],
      ).toBeDefined();
      // A configured but unmeasured axis must remain selectable and explicitly missing.
      const extra = store
        .listAbilityMetrics(clubId)
        .find((metric) => !items.some((item) => item.metricId === metric.id))!;
      p.repositories.dataCapability.saveMetricViewNode({
        ...node,
        id: "ui-node-missing",
        viewId: "ui-radar-view",
        metricId: extra.id,
        parentViewNodeId: undefined,
        label: extra.name,
        sortOrder: 10,
      });
      store.refreshBackofficeFacts(clubId);
      const missing = (
        await app.inject({ url: path, headers: parent })
      ).json<RadarComparison>();
      expect(
        missing.views.find((view) => view.id === "ui-radar-view")!.metricIds,
      ).toContain(extra.id);
      for (const row of standards
        .list(clubId)
        .filter((row) => row.id.startsWith("ui-standard-")))
        standards.save({ ...row, status: "archived" });
      expect(
        (
          await app.inject({
            url: `${path}?standardId=${standardId}`,
            headers: parent,
          })
        ).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
      p.database.close();
    }
  }, 15_000);
});
