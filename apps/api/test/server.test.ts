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
  });

  it("records an assessment score and writes assessment metric records", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-demo/assessments",
      payload: {
        studentId: "student-1",
        templateId: "assessment-template-technical",
        assessedByCoachId: "coach-1",
        assessedAt: "2026-06-25T09:30:00.000Z",
        summary: "Mid-cycle technical assessment",
        scores: [
          {
            metricId: "metric-finishing",
            score: 4,
            comment: "Composed in front of goal.",
          },
        ],
      },
    });

    const body = response.json() as {
      scores: Array<{ metricId: string; score: number }>;
      metricRecords: Array<{ source: string; value: { kind: string; score: number } }>;
    };

    expect(response.statusCode).toBe(201);
    expect(body.scores).toEqual([expect.objectContaining({ metricId: "metric-finishing", score: 4 })]);
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
    expect(response.json()).toEqual({ error: "Active club membership required" });

    await app.close();
    persistence.database.close();
  });
});
