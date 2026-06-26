import { describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

describe("api server", () => {
  it("returns health status", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "@football-club/api",
    });
  });

  it("returns an OpenAPI document", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/openapi.json",
    });

    const body = response.json() as { openapi: string; paths: Record<string, unknown> };

    expect(response.statusCode).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/clubs/{clubId}/assessments"]).toBeDefined();
  });

  it("computes a derived attacking contribution metric", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/students/student-1/derived-metrics/attacking-contribution",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.record.source).toBe("algorithm");
    expect(body.record.clubId).toBe("club-demo");
    expect(body.lineage.inputRecordIds).toEqual(["metric-record-goal-1", "metric-record-assist-1"]);
  });

  it("returns only club-scoped calendar events", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/calendar/events",
    });

    const body = response.json() as Array<{ clubId: string; participants: Array<{ clubId: string }> }>;

    expect(response.statusCode).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((event) => event.clubId === "club-demo")).toBe(true);
    expect(body.flatMap((event) => event.participants).every((participant) => participant.clubId === "club-demo")).toBe(true);
  });

  it("returns club-specific configuration", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/config",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.club.id).toBe("club-demo");
    expect(body.featureFlags.some((item: { feature: string }) => item.feature === "matches")).toBe(true);
    expect(body.customFields.some((item: { key: string }) => item.key === "school")).toBe(true);
  });

  it("returns data capability config and staged import status", async () => {
    const app = buildServer(undefined, { logger: false });
    const configResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/admin/data/config",
    });
    const previewResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/admin/import-preview?reviewStatus=pending",
    });
    const syncRunsResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/admin/sync-runs",
    });

    const config = configResponse.json() as {
      metricGraphVersions: Array<{ id: string }>;
      assessmentTemplateVersions: Array<{ id: string; graphVersionId?: string }>;
      externalConnections: Array<{ provider: string }>;
    };
    const preview = previewResponse.json() as { records: Array<{ id: string; reviewStatus: string }> };
    const syncRuns = syncRunsResponse.json() as Array<{ id: string; status: string }>;

    expect(configResponse.statusCode).toBe(200);
    expect(config.metricGraphVersions).toEqual([expect.objectContaining({ id: "metric-graph-version-demo" })]);
    expect(config.assessmentTemplateVersions).toEqual([
      expect.objectContaining({
        id: "assessment-template-version-technical-1",
        graphVersionId: "metric-graph-version-demo",
      }),
    ]);
    expect(config.externalConnections).toEqual([expect.objectContaining({ provider: "wps" })]);
    expect(preview.records).toEqual([
      expect.objectContaining({
        id: "external-raw-student-demo",
        reviewStatus: "pending",
      }),
    ]);
    expect(syncRuns).toEqual([expect.objectContaining({ id: "external-sync-run-demo", status: "completed" })]);
  });

  it("confirms staged external records without realtime external sync", async () => {
    const app = buildServer(undefined, { logger: false });
    const confirmResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/admin/external-records/external-raw-student-demo/confirm",
      payload: {
        targetType: "student",
        targetId: "student-1",
        confirmedBy: "user-coach-1",
      },
    });
    const previewResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/admin/import-preview?reviewStatus=confirmed",
    });

    expect(confirmResponse.statusCode).toBe(200);
    expect(confirmResponse.json()).toEqual(expect.objectContaining({
      clubId: "club-demo",
      rawRecordId: "external-raw-student-demo",
      targetType: "student",
      targetId: "student-1",
      linkStatus: "confirmed",
    }));
    expect(previewResponse.json()).toEqual({
      records: [expect.objectContaining({ id: "external-raw-student-demo", reviewStatus: "confirmed" })],
    });
  });

  it("creates a training session through the training route", async () => {
    const app = buildServer(undefined, { logger: false });

    const eventResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/admin/calendar/events",
      payload: {
        type: "training",
        title: "Private Finishing Tune-up",
        startsAt: "2026-07-08T09:00:00.000Z",
        endsAt: "2026-07-08T10:00:00.000Z",
        ownerCoachId: "coach-1",
        participants: [{ studentId: "student-1", status: "confirmed" }],
      },
    });

    const event = eventResponse.json() as { id: string };
    const sessionResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/training/sessions",
      payload: {
        eventId: event.id,
        kind: "private",
        sessionPlanId: "session-plan-finishing",
        intensity: "medium",
      },
    });

    const session = sessionResponse.json() as { clubId: string; eventId: string; kind: string };

    expect(eventResponse.statusCode).toBe(200);
    expect(sessionResponse.statusCode).toBe(200);
    expect(session.clubId).toBe("club-demo");
    expect(session.eventId).toBe(event.id);
    expect(session.kind).toBe("private");
  });

  it("expands recurring training events with participants and detects conflicts", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/admin/calendar/events",
      payload: {
        type: "training",
        title: "Weekly Finishing",
        startsAt: "2026-07-09T09:00:00.000Z",
        endsAt: "2026-07-09T10:00:00.000Z",
        ownerCoachId: "coach-1",
        recurrence: {
          frequency: "weekly",
          count: 3,
        },
        trainingSession: {
          kind: "team",
          sessionPlanId: "session-plan-finishing",
        },
        participants: [{ studentId: "student-1", status: "confirmed" }],
      },
    });

    const events = response.json() as Array<{
      id: string;
      clubId: string;
      participants: Array<{ studentId: string }>;
      trainingSession: { eventId: string } | null;
    }>;
    const conflictResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/admin/calendar/conflicts",
      payload: {
        startsAt: "2026-07-16T09:30:00.000Z",
        endsAt: "2026-07-16T10:30:00.000Z",
        coachId: "coach-1",
        studentIds: ["student-1"],
      },
    });
    const conflicts = conflictResponse.json() as Array<{ existingEventId: string; subjectKind: string }>;

    expect(response.statusCode).toBe(200);
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.clubId === "club-demo")).toBe(true);
    expect(events.every((event) => event.participants[0]?.studentId === "student-1")).toBe(true);
    expect(events.every((event) => event.trainingSession?.eventId === event.id)).toBe(true);
    expect(conflictResponse.statusCode).toBe(200);
    expect(conflicts.some((conflict) => conflict.existingEventId === events[1]?.id && conflict.subjectKind === "coach")).toBe(true);
    expect(conflicts.some((conflict) => conflict.existingEventId === events[1]?.id && conflict.subjectKind === "student")).toBe(true);
  });

  it("records match events and writes match metric records", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/matches",
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
        opponentName: "Central School U10",
        homeScore: 3,
        awayScore: 2,
        events: [
          {
            studentId: "student-1",
            type: "goal",
            minute: 12,
          },
        ],
      },
    });

    const body = response.json() as {
      events: Array<{ linkedMetricId?: string }>;
      metricRecords: Array<{ source: string; metricId: string }>;
    };

    expect(response.statusCode).toBe(201);
    expect(body.events[0]?.linkedMetricId).toBe("metric-goals");
    expect(body.metricRecords).toEqual([
      expect.objectContaining({ source: "match_event", metricId: "metric-goals" }),
    ]);
  });

  it("rejects misspelled match roster payloads", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/matches",
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
        roster: [
          {
            studentId: "student-1",
            started: true,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad_request");
  });

  it("rejects nested assessment scores with unknown fields", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/assessments",
      payload: {
        studentId: "student-1",
        templateId: "assessment-template-technical",
        assessedByCoachId: "coach-1",
        scores: [
          {
            metricId: "metric-finishing",
            value: { kind: "rating_1_5", score: 4 },
            typo: "should not pass",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("bad_request");
  });

  it("rejects match nested references outside the club", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/matches",
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
        rosters: [
          {
            studentId: "student-other",
            started: true,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toEqual({
      code: "bad_request",
      message: "Student not found for club.",
    });
  });

  it("records an assessment score and writes assessment metric records", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/assessments",
      payload: {
        studentId: "student-1",
        templateId: "assessment-template-technical",
        templateVersionId: "assessment-template-version-technical-1",
        assessedByCoachId: "coach-1",
        assessedAt: "2026-06-25T09:30:00.000Z",
        summary: "Mid-cycle technical assessment",
        scores: [
          {
            metricId: "metric-finishing",
            value: { kind: "rating_1_5", score: 4 },
            normalizedScore: 4,
            comment: "Composed in front of goal.",
          },
        ],
      },
    });

    const body = response.json() as {
      scores: Array<{ metricId: string; value: { kind: string; score: number }; normalizedScore: number }>;
      metricRecords: Array<{ source: string; value: { kind: string; score: number } }>;
    };

    expect(response.statusCode).toBe(201);
    expect(body.scores).toEqual([
      expect.objectContaining({
        metricId: "metric-finishing",
        value: expect.objectContaining({ kind: "rating_1_5", score: 4 }),
        normalizedScore: 4,
      }),
    ]);
    expect(body.metricRecords).toEqual([
      expect.objectContaining({
        source: "assessment",
        value: expect.objectContaining({ kind: "rating_1_5", score: 4 }),
      }),
    ]);
  });

  it("rejects club-scoped requests without active membership", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/config",
      headers: {
        "x-user-id": "missing-user",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "club_membership_required",
        message: "Active club membership required",
      },
    });

    await app.close();
    persistence.database.close();
  });

  it("rejects cross-club access even when the club exists", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    await persistence.repositories.clubs.save({
      id: "club-other",
      name: "Other Academy",
      code: "other",
      timezone: "Asia/Hong_Kong",
      locale: "zh-CN",
      status: "active",
      createdAt: "2026-06-25T00:00:00.000Z",
      updatedAt: "2026-06-25T00:00:00.000Z",
    });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-other/config",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("club_membership_required");

    await app.close();
    persistence.database.close();
  });

  it("allows parents to read only bound student data and rejects parent writes", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const ownMetrics = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/students/student-1/metrics",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });
    const otherMetrics = await app.inject({
      method: "GET",
      url: "/clubs/club-demo/students/student-other/metrics",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });
    const writeResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/students/student-1/derived-metrics/attacking-contribution",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });

    expect(ownMetrics.statusCode).toBe(200);
    expect(otherMetrics.statusCode).toBe(403);
    expect(otherMetrics.json().error.code).toBe("forbidden");
    expect(writeResponse.statusCode).toBe(403);
    expect(writeResponse.json().error.code).toBe("forbidden");

    await app.close();
    persistence.database.close();
  });

  it("allows coaches to write coaching records but rejects admin-only team management", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const matchResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/matches",
      headers: {
        "x-user-id": "user-coach-1",
      },
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
      },
    });
    const teamResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/teams",
      headers: {
        "x-user-id": "user-coach-1",
      },
      payload: {
        name: "Coach Managed Team",
        ageGroup: "U10",
        level: "development",
      },
    });

    expect(matchResponse.statusCode).toBe(201);
    expect(teamResponse.statusCode).toBe(403);
    expect(teamResponse.json().error.code).toBe("forbidden");

    await app.close();
    persistence.database.close();
  });

  it("returns a minimal OpenAPI document from the schema registry", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/openapi.json",
    });

    const body = response.json() as { openapi: string; paths: Record<string, unknown> };

    expect(response.statusCode).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/clubs/{clubId}/matches"]).toBeTruthy();
    expect(body.paths["/clubs/{clubId}/students/{studentId}/metrics"]).toBeTruthy();
  });
});
