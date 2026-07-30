import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { signWpsWebhookPayload } from "../src/integration/wps-webhook-security.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";
import { createSeedData } from "../src/seed.js";

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
    expect(body.paths["/app-clients/resolve"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/capabilities"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/app-clients"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/children"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/wechat-login"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/home"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/schedule"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/calendar"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/reminders"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/activity-summaries"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/growth-summary"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/status-summary"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/ability-metrics/{metricId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/events/{eventId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/home"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/workbench"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/training-project-tree"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-projects"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/attendance"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/lesson-confirmation"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/matches"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/tactical-board/formations"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/tactical-board"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/assessments"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/app-clients/{clientId}/coach/assessments/templates/{templateId}/form"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/imports/excel/preview"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students/{studentId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/connections"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/sync-policies"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/sync-policies/due"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/sync-policies/run-due"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/sync-policies/{policyId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/sync-policies/{policyId}/run"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/integrations/wps/webhook"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students/{studentId}/lesson-ledger"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students/{studentId}/lesson-adjustments"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students/{studentId}/insurance-policies"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/students/{studentId}/status-summary"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/sync-runs/{syncRunId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/coach/today"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/training/sessions"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/training/sessions/ensure"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/training/sessions/{trainingSessionId}/observations"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/matches"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/assessments"]).toBeDefined();
  });

  it("returns client-scoped capabilities for multiple app clients", async () => {
    const app = buildServer(undefined, { logger: false });
    const defaultResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/capabilities",
    });
    const miniProgramResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/capabilities?appId=wx-cq-talent-main",
    });
    const adminClientsResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/app-clients",
    });
    const resolvedResponse = await app.inject({
      method: "GET",
      url: "/app-clients/resolve?appId=wx-cq-talent-main",
    });
    const missingClientResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/capabilities?appId=missing-app",
    });

    const defaultBody = defaultResponse.json() as { client?: unknown; features: Record<string, boolean> };
    const miniProgramBody = miniProgramResponse.json() as {
      client: {
        id: string;
        channel: string;
        appId: string;
        navigation: Array<{ key: string; enabled?: boolean }>;
        roleEntrypoints: Record<string, string[]>;
      };
      features: Record<string, boolean>;
      match: { eventTypes: string[] };
      visibility: { parent: { metricScope: string; showLessonBalance: boolean; showStatusUpdatedAt: boolean } };
      operations: { statusDisplay: { lesson: { showUpdatedAt: boolean }; insurance: { showPolicyNumber: boolean } } };
      defaultTemplates: { features: Record<string, boolean>; appClientVisibility: Record<string, unknown> };
    };
    const appClients = adminClientsResponse.json() as Array<{ id: string; channel: string; clientKey: string }>;
    const resolved = resolvedResponse.json() as {
      clubId: string;
      clientId: string;
      capabilities: { client: { appId: string }; features: Record<string, boolean> };
    };

    expect(defaultResponse.statusCode).toBe(200);
    expect(defaultBody.client).toBeUndefined();
    expect(miniProgramResponse.statusCode).toBe(200);
    expect(miniProgramBody.client).toEqual(expect.objectContaining({
      id: "app-client-cq-talent-wechat-main",
      channel: "wechat_miniprogram",
      appId: "wx-cq-talent-main",
    }));
    expect(miniProgramBody.client.navigation.map((item) => item.key)).toEqual(expect.arrayContaining(["calendar", "attendance", "assessment"]));
    expect(miniProgramBody.client.roleEntrypoints.parent).toEqual(expect.arrayContaining(["calendar", "status"]));
    expect(miniProgramBody.features.payments).toBe(false);
    expect(miniProgramBody.match.eventTypes).toEqual(["goal", "assist", "save", "tackle"]);
    expect(miniProgramBody.visibility.parent).toEqual(expect.objectContaining({
      metricScope: "published_summary",
      showLessonBalance: true,
      showStatusUpdatedAt: true,
    }));
    expect(miniProgramBody.operations.statusDisplay.insurance.showPolicyNumber).toBe(true);
    expect(miniProgramBody.defaultTemplates.features.payments).toBe(false);
    expect(adminClientsResponse.statusCode).toBe(200);
    expect(appClients).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "app-client-cq-talent-wechat-main", channel: "wechat_miniprogram" }),
      expect.objectContaining({ id: "app-client-cq-talent-admin", channel: "admin_portal" }),
    ]));
    expect(resolvedResponse.statusCode).toBe(200);
    expect(resolved).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      clientId: "app-client-cq-talent-wechat-main",
      capabilities: expect.objectContaining({
        client: expect.objectContaining({ appId: "wx-cq-talent-main" }),
      }),
    }));
    expect(missingClientResponse.statusCode).toBe(404);
  });

  it("serves client-scoped mini-program BFF contracts for parent and coach entrypoints", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const parentHome = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/home",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentSchedule = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/schedule?from=2026-07-01&to=2026-07-31",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentCalendar = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/calendar?from=2026-07-01&to=2026-07-31",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentEvent = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/events/event-training-1",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentUsingAdminClient = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-admin/parent/students/student-1/home",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentOtherStudent = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-other/home",
      headers: { "x-user-id": "user-parent-1" },
    });
    const coachHome = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/home?date=2026-07-01",
      headers: { "x-user-id": "user-coach-1" },
    });
    const coachWeek = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/home?from=2026-07-01&to=2026-07-07",
      headers: { "x-user-id": "user-coach-1" },
    });
    const parentCoachHome = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/home?date=2026-07-01",
      headers: { "x-user-id": "user-parent-1" },
    });

    const homeBody = parentHome.json() as {
      client: { id: string; channel: string };
      role: string;
      student: { id: string; lessonBalance?: number; insuranceStatus: Record<string, unknown> };
      status: { studentId: string; lessonBalance?: number; insurance: Record<string, unknown> };
      schedule: { upcoming: Array<{ id: string }>; recent: Array<{ id: string }> };
      metrics: { latest: Array<{ metricId: string }>; trends: Array<{ metricId: string }> };
    };
    const scheduleBody = parentSchedule.json() as { events: Array<{ id: string; type: string }> };
    const calendarBody = parentCalendar.json() as {
      children: Array<{ id: string }>;
      events: Array<{ id: string; participants: Array<{ studentId: string }>; childIds: string[] }>;
    };
    const eventBody = parentEvent.json() as { role: string; event: { id: string; participants: Array<{ studentId: string }> } };
    const coachBody = coachHome.json() as { role: string; workbench: { coachId: string; events: Array<{ id: string }> } };
    const coachWeekBody = coachWeek.json() as {
      workbench: { dateRange: { from: string; to: string }; summary: { total: number; pending: number }; tasks: Array<{ eventId: string; action: string }> };
    };

    expect(parentHome.statusCode).toBe(200);
    expect(homeBody.client).toEqual(expect.objectContaining({
      id: "app-client-cq-talent-wechat-main",
      channel: "wechat_miniprogram",
    }));
    expect(homeBody.role).toBe("parent");
    expect(homeBody.student).toEqual(expect.objectContaining({ id: "student-1" }));
    expect(homeBody.status).toEqual(expect.objectContaining({ studentId: "student-1" }));
    expect(homeBody.schedule.upcoming.map((event) => event.id)).toEqual(expect.arrayContaining(["event-training-1"]));
    expect(homeBody.metrics.latest.length).toBeGreaterThan(0);
    expect(homeBody.metrics.trends.length).toBeGreaterThan(0);
    expect(parentSchedule.statusCode).toBe(200);
    expect(scheduleBody.events.map((event) => event.id)).toEqual(expect.arrayContaining(["event-training-1", "event-match-1"]));
    expect(parentCalendar.statusCode).toBe(200);
    expect(calendarBody.children).toEqual([expect.objectContaining({ id: "student-1" })]);
    expect(calendarBody.events.map((event) => event.id)).toEqual(expect.arrayContaining(["event-training-1", "event-match-1"]));
    expect(calendarBody.events.every((event) => event.childIds.includes("student-1"))).toBe(true);
    expect(calendarBody.events.flatMap((event) => event.participants).every((participant) => participant.studentId === "student-1")).toBe(true);
    expect(parentEvent.statusCode).toBe(200);
    expect(eventBody).toEqual(expect.objectContaining({
      role: "parent",
      event: expect.objectContaining({
        id: "event-training-1",
        participants: expect.arrayContaining([expect.objectContaining({ studentId: "student-1" })]),
      }),
    }));
    expect(eventBody.event.participants.every((participant) => participant.studentId === "student-1")).toBe(true);
    expect(parentUsingAdminClient.statusCode).toBe(403);
    expect(parentUsingAdminClient.json().error.code).toBe("forbidden");
    expect(parentOtherStudent.statusCode).toBe(403);
    expect(parentOtherStudent.json().error.code).toBe("forbidden");
    expect(coachHome.statusCode).toBe(200);
    expect(coachBody.role).toBe("coach");
    expect(coachBody.workbench.coachId).toBe("coach-1");
    expect(coachBody.workbench.events.map((event) => event.id)).toEqual(["event-training-1"]);
    expect(coachWeek.statusCode).toBe(200);
    expect(coachWeekBody.workbench.dateRange).toEqual({ from: "2026-07-01", to: "2026-07-07" });
    expect(coachWeekBody.workbench.summary.total).toBeGreaterThan(0);
    expect(coachWeekBody.workbench.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: "event-training-1", action: "attendance" }),
    ]));
    expect(parentCoachHome.statusCode).toBe(403);
    expect(parentCoachHome.json().error.code).toBe("forbidden");

    await app.close();
    persistence.database.close();
  });

  it("persists and validates coach tactical board snapshots", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const seed = createSeedData();
    const scheduledMatch = seed.events.find((event) => event.id === "event-match-1")!;
    scheduledMatch.status = "scheduled";
    seed.events.push({ ...scheduledMatch, id: "event-match-readonly", status: "completed" });
    seed.participants.push(...seed.participants.filter((participant) => participant.eventId === "event-match-1").map((participant) => ({ ...participant, id: `${participant.id}-readonly`, eventId: "event-match-readonly" })));
    const app = buildServer(new PersistentApiStore(persistence.repositories, seed), {
      logger: false,
      membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
    });
    const base = "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main";
    const headers = { "x-user-id": "user-coach-1" };
    const formations = await app.inject({ method: "GET", url: `${base}/coach/tactical-board/formations`, headers });
    const initial = await app.inject({ method: "GET", url: `${base}/coach/events/event-match-1/tactical-board`, headers });
    expect(initial.statusCode, initial.body).toBe(200);
    const initialBody = initial.json() as { board: { formationName: string; players: Array<Record<string, unknown>> }; roster: unknown[]; saved: boolean };
    const saved = await app.inject({
      method: "PUT",
      url: `${base}/coach/events/event-match-1/tactical-board`,
      headers: { ...headers, "idempotency-key": "tactical-board-contract-1" },
      payload: { formationName: "4-3-3", players: initialBody.board.players.map((player, index) => index === 0 ? { ...player, x: 0.42 } : player) },
    });
    const restored = await app.inject({ method: "GET", url: `${base}/coach/events/event-match-1/tactical-board`, headers });
    const parent = await app.inject({ method: "GET", url: `${base}/coach/events/event-match-1/tactical-board`, headers: { "x-user-id": "user-parent-1" } });
    const readonly = await app.inject({
      method: "PUT",
      url: `${base}/coach/events/event-match-readonly/tactical-board`,
      headers: { ...headers, "idempotency-key": "tactical-board-readonly-1" },
      payload: { formationName: "4-3-3", players: [] },
    });

    expect(formations.statusCode).toBe(200);
    expect(formations.json().formations).toHaveLength(3);
    expect(formations.json().formations.every((item: { positions: unknown[] }) => item.positions.length === 11)).toBe(true);
    expect(initial.statusCode).toBe(200);
    expect(initialBody.roster).toHaveLength(1);
    expect(initialBody.board.players.filter((player) => player.role === "starter")).toHaveLength(1);
    expect(saved.statusCode).toBe(200);
    expect(restored.json().saved).toBe(true);
    expect(restored.json().board.players[0].x).toBe(0.42);
    expect(parent.statusCode).toBe(403);
    expect(readonly.statusCode).toBe(409);
    expect(readonly.json().error.code).toBe("tactical_board_read_only");

    await app.close();
    persistence.database.close();
  });

  it("serves parent reminders derived from real store data with guardian scoping", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const store = new PersistentApiStore(persistence.repositories);
    const app = buildServer(
      store,
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    await store.createCalendarEvent("club-chongqing-talent", {
      type: "training",
      title: "U10 提醒测试训练课",
      startsAt: new Date(now + dayMs).toISOString(),
      endsAt: new Date(now + dayMs + 90 * 60 * 1000).toISOString(),
      participants: [{ studentId: "student-1", status: "invited" }],
    });
    await store.createInsurancePolicy("club-chongqing-talent", "student-1", {
      expiresAt: new Date(now + 10 * dayMs).toISOString().slice(0, 10),
      reviewStatus: "approved",
      source: "offline_insurance",
    });
    await store.recordLessonAdjustment("club-chongqing-talent", "student-1", {
      entryType: "credit",
      lessonDelta: 2,
      source: "offline_recharge",
    });

    const parentResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/reminders",
      headers: { "x-user-id": "user-parent-1" },
    });
    const coachResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/reminders",
      headers: { "x-user-id": "user-coach-1" },
    });

    expect(parentResponse.statusCode, parentResponse.body).toBe(200);
    const body = parentResponse.json() as {
      role: string;
      reminders: Array<{ type: string; severity: string; studentId: string; dueAt: string }>;
    };
    expect(body.role).toBe("parent");
    expect(body.reminders.length).toBeGreaterThanOrEqual(3);
    expect(new Set(body.reminders.map((item) => item.type))).toEqual(
      new Set(["event_upcoming", "insurance_expiring", "lesson_credit_low"]),
    );
    // Guardian scoping: every reminder must belong to the bound child only.
    expect(body.reminders.every((item) => item.studentId === "student-1")).toBe(true);
    // Severity ordering: urgent first, then warning, then info.
    const severityRank = { urgent: 0, warning: 1, info: 2 } as const;
    const ranks = body.reminders.map((item) => severityRank[item.severity as keyof typeof severityRank]);
    expect([...ranks].sort((left, right) => left - right)).toEqual(ranks);

    expect(coachResponse.statusCode).toBe(403);

    await app.close();
    persistence.database.close();
  });

  it("accepts parent private lesson requests with guardian scoping and validation", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const store = new PersistentApiStore(persistence.repositories);
    const app = buildServer(
      store,
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const url = "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/private-lessons";
    const validBody = {
      studentId: "student-1",
      coachName: "林教练",
      date: "2026-08-05",
      timeSlot: "16:00-17:00",
      goals: ["传球", "射门"],
      note: "希望加强弱侧脚",
    };

    const created = await app.inject({
      method: "POST",
      url,
      headers: { "x-user-id": "user-parent-1" },
      payload: validBody,
    });
    expect(created.statusCode, created.body).toBe(201);
    const createdBody = created.json() as {
      request: { id: string; status: string; studentId: string; coachName: string; goals: string[] };
    };
    expect(createdBody.request.status).toBe("pending");
    expect(createdBody.request.studentId).toBe("student-1");
    expect(createdBody.request.goals).toEqual(["传球", "射门"]);

    // Guardian scoping: another guardian's student is rejected, never re-targeted.
    const foreign = await app.inject({
      method: "POST",
      url,
      headers: { "x-user-id": "user-parent-1" },
      payload: { ...validBody, studentId: "student-2" },
    });
    expect(foreign.statusCode).toBe(403);

    // Validation: empty goals -> 400.
    const invalid = await app.inject({
      method: "POST",
      url,
      headers: { "x-user-id": "user-parent-1" },
      payload: { ...validBody, goals: [] },
    });
    expect(invalid.statusCode).toBe(400);

    // Coach role denied.
    const coachCreate = await app.inject({
      method: "POST",
      url,
      headers: { "x-user-id": "user-coach-1" },
      payload: validBody,
    });
    expect(coachCreate.statusCode).toBe(403);

    // GET lists own requests; foreign student filter denied.
    const list = await app.inject({
      method: "GET",
      url,
      headers: { "x-user-id": "user-parent-1" },
    });
    expect(list.statusCode).toBe(200);
    const listBody = list.json() as { requests: Array<{ id: string; studentId: string }> };
    expect(listBody.requests.some((item) => item.id === createdBody.request.id)).toBe(true);
    expect(listBody.requests.every((item) => item.studentId === "student-1")).toBe(true);

    const foreignList = await app.inject({
      method: "GET",
      url: `${url}?student=student-2`,
      headers: { "x-user-id": "user-parent-1" },
    });
    expect(foreignList.statusCode).toBe(403);

    await app.close();
    persistence.database.close();
  });

  it("serves next-stage mini-program BFF aggregates without leaking cross-role access", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const children = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/children",
      headers: { "x-user-id": "user-parent-1" },
    });
    const summaries = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/activity-summaries?type=match",
      headers: { "x-user-id": "user-parent-1" },
    });
    const growth = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/growth-summary",
      headers: { "x-user-id": "user-parent-1" },
    });
    const coachWorkbench = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/workbench",
      headers: { "x-user-id": "user-coach-1" },
    });
    const trainingProjectTree = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/training-project-tree",
      headers: { "x-user-id": "user-coach-1" },
    });
    const trainingProjects = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/training-projects",
      headers: { "x-user-id": "user-coach-1", "idempotency-key": "training-projects-submit-1" },
      payload: {
        projectIds: ["drill-cq-talent-assessment-001", "drill-cq-talent-assessment-002"],
        intensity: "medium",
        note: "小程序训练管理保存",
      },
    });
    const workbenchAfterTrainingSave = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/workbench",
      headers: { "x-user-id": "user-coach-1" },
    });
    const assessmentForm = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/assessments/templates/assessment-template-technical/form",
      headers: { "x-user-id": "user-coach-1" },
    });
    const parentAssessmentForm = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/assessments/templates/assessment-template-technical/form",
      headers: { "x-user-id": "user-parent-1" },
    });

    const childrenBody = children.json() as { children: Array<{ id: string }> };
    const summariesBody = summaries.json() as { summaries: Array<{ event: { id: string; type: string }; metrics: unknown[] }> };
    const growthBody = growth.json() as {
      assessment: { views: unknown[]; viewNodes: unknown[] };
      latest: Array<{ metricId: string; metric: { id: string } | null }>;
      trends: Array<{ metricId: string; records: unknown[] }>;
    };
    const workbenchBody = coachWorkbench.json() as {
      event: { id: string };
      rosterContext: { participants: unknown[]; students: unknown[] };
      workflow: Record<string, unknown>;
      training: { session: { id: string } | null; selectedProjectIds: string[]; projects: Array<{ id: string }> };
    };
    const trainingTreeBody = trainingProjectTree.json() as {
      dimensions: Array<{ objectives: Array<{ projects: Array<{ id: string; name: string; metrics: unknown[] }> }> }>;
      projects: Array<{ id: string; name: string; metricIds: string[] }>;
    };
    const trainingProjectsBody = trainingProjects.json() as {
      trainingSession: { eventId: string; sessionPlanId: string; intensity?: string };
      sessionPlan: { id: string; blocks: Array<{ drillId: string }> };
      projects: Array<{ id: string }>;
    };
    const formBody = assessmentForm.json() as {
      template: { id: string };
      templateVersion: { id: string };
      fields: Array<{ binding: { metricId: string; testItemId?: string }; metric: { id: string } | null; dimension: { id: string; name: string } | null; testItem: { id: string } | null }>;
    };

    expect(children.statusCode).toBe(200);
    expect(childrenBody.children).toEqual([expect.objectContaining({ id: "student-1" })]);
    expect(summaries.statusCode).toBe(200);
    expect(summariesBody.summaries).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ id: "event-match-1", type: "match" }),
      }),
    ]);
    expect(summariesBody.summaries[0]?.metrics.length).toBeGreaterThan(0);
    expect(growth.statusCode).toBe(200);
    expect(growthBody.assessment.views.length).toBeGreaterThan(0);
    expect(growthBody.latest).toEqual(expect.arrayContaining([
      expect.objectContaining({ metricId: "metric-finishing", metric: expect.objectContaining({ id: "metric-finishing" }) }),
    ]));
    expect(growthBody.trends.length).toBeGreaterThan(0);
    expect(coachWorkbench.statusCode).toBe(200);
    expect(workbenchBody.event.id).toBe("event-training-1");
    expect(workbenchBody.rosterContext.participants.length).toBeGreaterThan(0);
    expect(workbenchBody.rosterContext.students.length).toBeGreaterThan(0);
    expect(workbenchBody.workflow).toEqual(expect.objectContaining({ pendingAttendance: true }));
    expect(workbenchBody.training.session).toEqual(expect.objectContaining({ id: "training-session-1" }));
    expect(trainingProjectTree.statusCode).toBe(200);
    expect(trainingTreeBody.projects).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "drill-cq-talent-assessment-001" }),
    ]));
    expect(trainingTreeBody.dimensions.flatMap((dimension) =>
      dimension.objectives.flatMap((objective) => objective.projects),
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "drill-cq-talent-assessment-001" }),
    ]));
    expect(trainingProjects.statusCode).toBe(200);
    expect(trainingProjects.headers["idempotency-status"]).toBe("stored");
    expect(trainingProjectsBody.trainingSession).toEqual(expect.objectContaining({
      eventId: "event-training-1",
      sessionPlanId: "session-plan-app-client-event-training-1",
      intensity: "medium",
    }));
    expect(trainingProjectsBody.sessionPlan.blocks.map((block) => block.drillId)).toEqual([
      "drill-cq-talent-assessment-001",
      "drill-cq-talent-assessment-002",
    ]);
    expect(workbenchAfterTrainingSave.statusCode).toBe(200);
    expect(workbenchAfterTrainingSave.json().training).toEqual(expect.objectContaining({
      selectedProjectIds: ["drill-cq-talent-assessment-001", "drill-cq-talent-assessment-002"],
      projects: expect.arrayContaining([
        expect.objectContaining({ id: "drill-cq-talent-assessment-001" }),
        expect.objectContaining({ id: "drill-cq-talent-assessment-002" }),
      ]),
    }));
    expect(assessmentForm.statusCode).toBe(200);
    expect(formBody.template.id).toBe("assessment-template-technical");
    expect(formBody.templateVersion.id).toBe("assessment-template-version-technical-1");
    expect(formBody.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        binding: expect.objectContaining({ metricId: "metric-finishing" }),
        metric: expect.objectContaining({ id: "metric-finishing" }),
        dimension: expect.objectContaining({ id: "dimension-technical", name: "技术能力" }),
        testItem: expect.objectContaining({ id: "assessment-test-finishing-cq-talent" }),
      }),
    ]));
    expect(parentAssessmentForm.statusCode).toBe(403);
    expect(parentAssessmentForm.json().error.code).toBe("forbidden");

    await app.close();
    persistence.database.close();
  });

  it("serves app-client login, status, metric drilldown, and coach write contracts", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const login = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/wechat-login",
      payload: {
        wxLoginCode: "wx-code-placeholder",
        phoneCode: "phone-code-placeholder",
        roleHint: "parent",
      },
    });
    const status = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/status-summary",
      headers: { "x-user-id": "user-parent-1" },
    });
    const metric = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/ability-metrics/metric-finishing",
      headers: { "x-user-id": "user-parent-1" },
    });
    const attendance = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/attendance",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        participants: [{ studentId: "student-1", status: "present", note: "Arrived on time" }],
      },
    });
    const lessonRead = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/lesson-confirmation",
      headers: { "x-user-id": "user-coach-1" },
    });
    const lessonConfirm = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/lesson-confirmation",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        studentIds: ["student-1"],
        actorUserId: "user-coach-1",
      },
    });
    const lessonCorrection = await app.inject({
      method: "PATCH",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/lesson-confirmation",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        studentId: "student-1",
        lessonDelta: 1,
        actorUserId: "user-coach-1",
        reason: "Correct duplicated deduction",
      },
    });
    const match = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/matches",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
        events: [{ studentId: "student-1", type: "goal", minute: 18 }],
      },
    });
    const assessment = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/assessments",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        studentId: "student-1",
        templateId: "assessment-template-technical",
        templateVersionId: "assessment-template-version-technical-1",
        assessedByCoachId: "coach-1",
        rawResults: [{
          testItemId: "assessment-test-finishing-cq-talent",
          value: { kind: "rating_1_5", score: 4 },
        }],
      },
    });
    const parentWrite = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/attendance",
      headers: { "x-user-id": "user-parent-1" },
      payload: {
        participants: [{ studentId: "student-1", status: "present" }],
      },
    });

    const loginBody = login.json() as { status: string; phoneBinding: string; session: { token: string } | null; role: string };
    const sessionHome = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/home?date=2026-07-01",
      headers: { authorization: `Bearer ${loginBody.session?.token ?? ""}` },
    });
    const statusBody = status.json() as { status: { studentId: string; insurance: Record<string, unknown> } };
    const metricBody = metric.json() as { metric: { id: string }; records: unknown[]; privacy: { minorProfile: string } };

    expect(login.statusCode).toBe(200);
    expect(loginBody).toEqual(expect.objectContaining({
      status: "authenticated",
      phoneBinding: "accepted",
      role: "coach",
      session: expect.objectContaining({ token: expect.stringMatching(/^wx-session-/) }),
    }));
    expect(sessionHome.statusCode).toBe(200);
    expect(status.statusCode).toBe(200);
    expect(statusBody.status).toEqual(expect.objectContaining({ studentId: "student-1" }));
    expect(metric.statusCode).toBe(200);
    expect(metricBody.metric.id).toBe("metric-finishing");
    expect(metricBody.records.length).toBeGreaterThan(0);
    expect(metricBody.privacy.minorProfile).toBe("redacted_contact_fields");
    expect(attendance.statusCode).toBe(200);
    expect(lessonRead.statusCode).toBe(200);
    expect(lessonConfirm.statusCode).toBe(201);
    expect(lessonCorrection.statusCode).toBe(200);
    expect(match.statusCode).toBe(201);
    expect(assessment.statusCode).toBe(201);
    expect(parentWrite.statusCode).toBe(403);
    expect(parentWrite.json().error.code).toBe("forbidden");

    await app.close();
    persistence.database.close();
  });

  it("authenticates a WeChat phone through the connector and reuses the issued session", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const membershipResolver = new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships, null);
    const unconfiguredApp = buildServer(new PersistentApiStore(persistence.repositories), { logger: false, membershipResolver });
    const bindingRequired = await unconfiguredApp.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/wechat-login",
      payload: { wxLoginCode: "wx-code", phoneCode: "phone-code", roleHint: "coach" },
    });
    expect(bindingRequired.statusCode).toBe(200);
    expect(bindingRequired.json()).toEqual(expect.objectContaining({ status: "binding_required", role: null, session: null }));
    await unconfiguredApp.close();

    const app = buildServer(new PersistentApiStore(persistence.repositories), {
      logger: false,
      membershipResolver,
      wechatIdentityConnector: {
        async resolve() {
          return { openId: "openid-parent-1", phone: "13800000000" };
        },
      },
    });

    const login = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/wechat-login",
      payload: { wxLoginCode: "wx-code", phoneCode: "phone-code", roleHint: "coach" },
    });
    const body = login.json() as { role: string; status: string; session: { token: string }; profile: { userId: string } };
    expect(login.statusCode).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      role: "parent",
      status: "authenticated",
      profile: expect.objectContaining({ userId: "user-parent-1" }),
      session: expect.objectContaining({ token: expect.stringMatching(/^wx-session-/) }),
    }));

    const children = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/children",
      headers: { authorization: `Bearer ${body.session.token}` },
    });
    expect(children.statusCode).toBe(200);
    expect(children.json().children).toEqual([expect.objectContaining({ id: "student-1" })]);

    const expired = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/children",
      headers: { authorization: "Bearer expired-token" },
    });
    expect(expired.statusCode).toBe(401);
    expect(expired.json().error.code).toBe("authentication_required");

    await app.close();
    persistence.database.close();
  });

  it("sets private ETags for user-scoped reads and replays mutating requests by idempotency key", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const readResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/home",
      headers: { "x-user-id": "user-parent-1" },
    });
    const etag = readResponse.headers.etag;
    const notModifiedResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/home",
      headers: { "x-user-id": "user-parent-1", "if-none-match": etag },
    });
    const payload = {
      participants: [
        { studentId: "student-1", status: "present" },
      ],
    };
    const firstWrite = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/admin/calendar/events/event-training-1/participants",
      headers: { "x-user-id": "user-coach-1", "idempotency-key": "attendance-submit-1" },
      payload,
    });
    const replayedWrite = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/admin/calendar/events/event-training-1/participants",
      headers: { "x-user-id": "user-coach-1", "idempotency-key": "attendance-submit-1" },
      payload,
    });
    const conflictingWrite = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/admin/calendar/events/event-training-1/participants",
      headers: { "x-user-id": "user-coach-1", "idempotency-key": "attendance-submit-1" },
      payload: {
        participants: [
          { studentId: "student-1", status: "absent" },
        ],
      },
    });
    const idempotencyRows = persistence.database.prepare(`
      SELECT status_code, payload, expires_at FROM http_idempotency_records
    `).all() as Array<{ status_code: number; payload: string; expires_at: string }>;

    expect(readResponse.statusCode).toBe(200);
    expect(readResponse.headers["cache-control"]).toBe("private, max-age=30, stale-while-revalidate=60");
    expect(readResponse.headers.vary).toContain("X-User-Id");
    expect(etag).toBeTruthy();
    expect(notModifiedResponse.statusCode).toBe(304);
    expect(firstWrite.statusCode).toBe(200);
    expect(firstWrite.headers["cache-control"]).toBe("no-store");
    expect(firstWrite.headers["idempotency-status"]).toBe("stored");
    expect(replayedWrite.statusCode).toBe(200);
    expect(replayedWrite.headers["idempotency-status"]).toBe("replayed");
    expect(replayedWrite.body).toBe(firstWrite.body);
    expect(conflictingWrite.statusCode).toBe(409);
    expect(conflictingWrite.json().error.code).toBe("idempotency_conflict");
    expect(idempotencyRows).toHaveLength(1);
    expect(idempotencyRows[0]).toEqual(expect.objectContaining({
      status_code: 200,
      payload: firstWrite.body,
    }));
    expect(Date.parse(idempotencyRows[0]?.expires_at ?? "")).toBeGreaterThan(Date.now());

    await app.close();
    persistence.database.close();
  });

  it("computes a derived 进攻贡献 metric", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/students/student-1/derived-metrics/attacking-contribution",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.record.source).toBe("algorithm");
    expect(body.record.clubId).toBe("club-chongqing-talent");
    expect(body.lineage.inputRecordIds).toEqual(["metric-record-goal-1", "metric-record-assist-1"]);
  });

  it("returns only club-scoped calendar events", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/calendar/events",
    });

    const body = response.json() as Array<{ clubId: string; participants: Array<{ clubId: string }> }>;

    expect(response.statusCode).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((event) => event.clubId === "club-chongqing-talent")).toBe(true);
    expect(body.flatMap((event) => event.participants).every((participant) => participant.clubId === "club-chongqing-talent")).toBe(true);
  });

  it("returns club-specific configuration", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/config",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.club.id).toBe("club-chongqing-talent");
    expect(body.featureFlags.some((item: { feature: string }) => item.feature === "matches")).toBe(true);
    expect(body.customFields.some((item: { key: string }) => item.key === "school")).toBe(true);
  });

  it("returns mini-program capabilities for 重庆天才足球俱乐部", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/capabilities",
    });

    const body = response.json() as {
      club: { id: string; code: string; name: string };
      calendar: { eventTypes: string[] };
      operations: { standardFields: Array<{ key: string; label: string }> };
      assessment: { views: Array<{ name: string }>; viewNodes: Array<{ label: string }> };
      integration: { tableMappings: Array<{ externalTableKey: string }>; fieldMappings: Array<{ externalFieldKey: string }> };
    };

    expect(response.statusCode).toBe(200);
    expect(body.club).toEqual(expect.objectContaining({
      id: "club-chongqing-talent",
      code: "cq-talent",
      name: "重庆天才足球俱乐部",
    }));
    expect(body.calendar.eventTypes).toEqual(["training", "match", "other"]);
    expect(body.operations.standardFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "insurance.expiresAt", label: "保险到期日期" }),
      expect.objectContaining({ key: "billing.courseBalance", label: "剩余课时" }),
    ]));
    expect(body.assessment.views).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "天才精英队核心能力雷达" }),
      expect.objectContaining({ name: "天才精英队完整评分图谱" }),
      expect.objectContaining({ name: "天才精英队评分视图" }),
    ]));
    expect(body.assessment.viewNodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "射门终结" }),
      expect.objectContaining({ label: "技术综合指数" }),
    ]));
    expect(body.integration.tableMappings.map((mapping) => mapping.externalTableKey).sort()).toEqual([
      "attendance_2025_2026_spring_summer",
      "full_users",
      "insurance_policies",
      "payment_events",
      "talent_elite_assessment",
    ]);
    expect(body.integration.fieldMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ externalFieldKey: "身份证号" }),
      expect.objectContaining({ externalFieldKey: "推荐训练项目" }),
    ]));
  });

  it("returns coach today workbench scoped to coach-owned events", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const coachResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/coach/today?date=2026-07-01",
      headers: { "x-user-id": "user-coach-1" },
    });
    const parentResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/coach/today?date=2026-07-01",
      headers: { "x-user-id": "user-parent-1" },
    });

    const body = coachResponse.json() as {
      date: string;
      coachId: string;
      events: Array<{
        id: string;
        ownerCoachId: string;
        teams: Array<{ id: string }>;
        students: Array<{ id: string }>;
        workflow: { pendingAttendance: boolean; pendingRecord: boolean; pendingAssessment: boolean };
      }>;
    };

    expect(coachResponse.statusCode).toBe(200);
    expect(body.date).toBe("2026-07-01");
    expect(body.coachId).toBe("coach-1");
    expect(body.events).toEqual([
      expect.objectContaining({
        id: "event-training-1",
        ownerCoachId: "coach-1",
        teams: [expect.objectContaining({ id: "team-u10-dev" })],
        students: [expect.objectContaining({ id: "student-1" })],
        workflow: expect.objectContaining({
          pendingAttendance: true,
          pendingRecord: false,
          pendingAssessment: true,
        }),
      }),
    ]);
    expect(parentResponse.statusCode).toBe(403);
    expect(parentResponse.json().error.code).toBe("forbidden");

    await app.close();
    persistence.database.close();
  });

  it("returns data capability config and staged import status", async () => {
    const app = buildServer(undefined, { logger: false });
    const configResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/data/config",
    });
    const previewResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/import-preview?reviewStatus=pending",
    });
    const syncRunsResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/sync-runs",
    });
    const syncRunDetailResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/sync-runs/external-sync-run-cq-talent",
    });
    const studentListResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/students?teamId=team-u10-dev&coachId=coach-1",
    });
    const studentDetailResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/students/student-1",
    });

    const config = configResponse.json() as {
      metricGraphVersions: Array<{ id: string }>;
      assessmentTemplateVersions: Array<{ id: string; graphVersionId?: string }>;
      externalConnections: Array<{ provider: string }>;
      tableMappings: Array<{ externalTableKey: string }>;
      fieldMappings: Array<{ externalFieldKey: string }>;
    };
    const preview = previewResponse.json() as { records: Array<{ id: string; reviewStatus: string }> };
    const syncRuns = syncRunsResponse.json() as Array<{ id: string; status: string }>;
    const syncRunDetail = syncRunDetailResponse.json() as {
      syncRun: { id: string };
      rawRecords: Array<{ id: string }>;
      validationSummary: { totalRecords: number; pendingRecords: number };
    };
    const students = studentListResponse.json() as Array<{ id: string; teams: Array<{ teamId: string }> }>;
    const studentDetail = studentDetailResponse.json() as {
      id: string;
      primaryContact?: { phone?: string };
      teams: Array<{ teamId: string }>;
    };

    expect(configResponse.statusCode).toBe(200);
    expect(config.metricGraphVersions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "metric-graph-version-cq-talent-elite-20260326" }),
      expect.objectContaining({ id: "metric-graph-version-chongqing-talent" }),
    ]));
    expect(config.assessmentTemplateVersions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "assessment-template-version-cq-talent-elite-20260326",
        graphVersionId: "metric-graph-version-cq-talent-elite-20260326",
      }),
      expect.objectContaining({
        id: "assessment-template-version-technical-1",
        graphVersionId: "metric-graph-version-chongqing-talent",
      }),
    ]));
    expect(config.externalConnections).toEqual([expect.objectContaining({ provider: "wps" })]);
    expect(config.tableMappings).toHaveLength(5);
    expect(config.tableMappings.map((mapping) => mapping.externalTableKey)).toEqual(expect.arrayContaining([
      "full_users",
      "payment_events",
      "attendance_2025_2026_spring_summer",
      "insurance_policies",
      "talent_elite_assessment",
    ]));
    expect(config.fieldMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ externalFieldKey: "课时" }),
      expect.objectContaining({ externalFieldKey: "第27周" }),
      expect.objectContaining({ externalFieldKey: "推荐训练项目" }),
    ]));
    expect(preview.records).toEqual([
      expect.objectContaining({
        id: "external-raw-student-cq-talent",
        reviewStatus: "pending",
      }),
    ]);
    expect(syncRuns).toEqual([expect.objectContaining({ id: "external-sync-run-cq-talent", status: "completed" })]);
    expect(syncRunDetailResponse.statusCode).toBe(200);
    expect(syncRunDetail.syncRun.id).toBe("external-sync-run-cq-talent");
    expect(syncRunDetail.rawRecords).toEqual([expect.objectContaining({ id: "external-raw-student-cq-talent" })]);
    expect(syncRunDetail.validationSummary).toEqual(expect.objectContaining({ totalRecords: 1, pendingRecords: 1 }));
    expect(studentListResponse.statusCode).toBe(200);
    expect(students).toEqual([expect.objectContaining({ id: "student-1" })]);
    expect(studentDetailResponse.statusCode).toBe(200);
    expect(studentDetail).toEqual(expect.objectContaining({
      id: "student-1",
      primaryContact: expect.objectContaining({ phone: "13800000000" }),
      teams: expect.arrayContaining([expect.objectContaining({ teamId: "team-u10-dev" })]),
    }));
  });

  it("stages Excel imports through field mappings with row-hash idempotency", async () => {
    const app = buildServer(undefined, { logger: false });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("全量用户");
    worksheet.addRow(["身份证号", "学员姓名", "渠道", "区域", "学校", "队伍名称", "教练", "学员状态"]);
    worksheet.addRow(["500000201601010000", "张三", "转介绍", "重庆", "重庆天才合作学校", "周末精英队", "陈教练", "在训"]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const payload = {
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-full-users-cq-talent",
      contentBase64: buffer.toString("base64"),
      worksheetName: "全量用户",
      fileName: "全量用户.xlsx",
    };

    const firstResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/imports/excel/preview",
      payload,
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/imports/excel/preview",
      payload,
    });

    const first = firstResponse.json() as {
      syncRun: { totalRecords: number; failedRecords: number };
      records: Array<{ id: string; normalizedPreview: Record<string, unknown>; validationErrors?: unknown[] }>;
    };
    const second = secondResponse.json() as {
      records: Array<{ id: string }>;
    };

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);
    expect(first.syncRun).toEqual(expect.objectContaining({ totalRecords: 1, failedRecords: 0 }));
    expect(first.records[0]?.normalizedPreview).toEqual(expect.objectContaining({
      "student.identityNumber": "500000201601010000",
      "student.name": "张三",
      "team.name": "周末精英队",
    }));
    expect(first.records[0]?.validationErrors).toBeUndefined();
    expect(second.records[0]?.id).toBe(first.records[0]?.id);
  });

  it("manages WPS sync policies and runs deterministic stub syncs", async () => {
    const app = buildServer(undefined, { logger: false });

    const connectionsResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/integrations/connections",
    });
    const policiesResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies",
    });
    const createResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies",
      payload: {
        connectionId: "external-connection-wps-cq-talent",
        tableMappingId: "external-table-insurance-policies-cq-talent",
        name: "Insurance WPS Manual Sync",
        status: "active",
        triggerMode: "manual",
        direction: "inbound",
        applyPolicy: "manual_confirm",
        conflictPolicy: "manual_review",
        writebackPolicy: "disabled",
      },
    });
    const created = createResponse.json() as { id: string };
    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/clubs/club-chongqing-talent/admin/integrations/sync-policies/${created.id}`,
      payload: {
        name: "Insurance WPS Manual Sync Updated",
      },
    });
    const runResponse = await app.inject({
      method: "POST",
      url: `/clubs/club-chongqing-talent/admin/integrations/sync-policies/${created.id}/run`,
    });
    const secondRunResponse = await app.inject({
      method: "POST",
      url: `/clubs/club-chongqing-talent/admin/integrations/sync-policies/${created.id}/run`,
    });
    const outboundResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies",
      payload: {
        connectionId: "external-connection-wps-cq-talent",
        tableMappingId: "external-table-insurance-policies-cq-talent",
        name: "Outbound Insurance Sync",
        status: "active",
        triggerMode: "manual",
        direction: "bidirectional",
        applyPolicy: "manual_confirm",
        conflictPolicy: "manual_review",
        writebackPolicy: "disabled",
      },
    });
    const outbound = outboundResponse.json() as { id: string };
    const rejectedRunResponse = await app.inject({
      method: "POST",
      url: `/clubs/club-chongqing-talent/admin/integrations/sync-policies/${outbound.id}/run`,
    });
    const invalidScheduledResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies",
      payload: {
        connectionId: "external-connection-wps-cq-talent",
        tableMappingId: "external-table-insurance-policies-cq-talent",
        name: "Invalid Scheduled Sync",
        status: "active",
        triggerMode: "scheduled",
        direction: "inbound",
        applyPolicy: "manual_confirm",
        conflictPolicy: "manual_review",
        writebackPolicy: "disabled",
      },
    });
    const scheduledResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies",
      payload: {
        connectionId: "external-connection-wps-cq-talent",
        tableMappingId: "external-table-insurance-policies-cq-talent",
        name: "Insurance Scheduled Sync",
        status: "active",
        triggerMode: "scheduled",
        schedule: { kind: "interval_minutes", intervalMinutes: 30 },
        direction: "inbound",
        applyPolicy: "manual_confirm",
        conflictPolicy: "manual_review",
        writebackPolicy: "disabled",
      },
    });
    const scheduled = scheduledResponse.json() as { id: string };
    const dueResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies/due?now=2999-01-01T00:00:00.000Z",
    });
    const runDueResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies/run-due",
      payload: {
        now: "2999-01-01T00:00:00.000Z",
      },
    });
    const webhookResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/wps/webhook",
      payload: {
        eventId: "event-001",
        eventType: "table.updated",
        connectionId: "external-connection-wps-cq-talent",
        tableMappingId: "external-table-insurance-policies-cq-talent",
        policyId: scheduled.id,
        occurredAt: "2026-06-26T09:05:00.000Z",
        payload: { changedRows: 2 },
      },
    });

    const connections = connectionsResponse.json() as Array<{ provider: string }>;
    const policies = policiesResponse.json() as Array<{ id: string; direction: string; applyPolicy: string }>;
    const run = runResponse.json() as {
      syncRun: { status: string; totalRecords: number };
      records: Array<{ id: string; normalizedPreview: Record<string, unknown> }>;
    };
    const secondRun = secondRunResponse.json() as { records: Array<{ id: string }> };

    expect(connectionsResponse.statusCode).toBe(200);
    expect(connections).toEqual([expect.objectContaining({ provider: "wps" })]);
    expect(policiesResponse.statusCode).toBe(200);
    expect(policies).toEqual([expect.objectContaining({
      id: "external-sync-policy-wps-cq-talent-manual",
      direction: "inbound",
      applyPolicy: "manual_confirm",
    })]);
    expect(createResponse.statusCode).toBe(201);
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toEqual(expect.objectContaining({ name: "Insurance WPS Manual Sync Updated" }));
    expect(runResponse.statusCode).toBe(201);
    expect(run.syncRun).toEqual(expect.objectContaining({ status: "completed", totalRecords: 1 }));
    expect(run.records).toEqual([expect.objectContaining({
      normalizedPreview: expect.objectContaining({
        "insurance.policyNo": "WPS-STUB-POLICY-001",
      }),
    })]);
    expect(secondRunResponse.statusCode).toBe(201);
    expect(secondRun.records[0]?.id).toBe(run.records[0]?.id);
    expect(outboundResponse.statusCode).toBe(201);
    expect(rejectedRunResponse.statusCode).toBe(400);
    expect(rejectedRunResponse.json().error.message).toBe("Only inbound sync policies can be run in MVP.");
    expect(invalidScheduledResponse.statusCode).toBe(400);
    expect(scheduledResponse.statusCode).toBe(201);
    expect(dueResponse.statusCode).toBe(200);
    expect(dueResponse.json()).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      policies: expect.arrayContaining([
        expect.objectContaining({
          policy: expect.objectContaining({ id: scheduled.id }),
          due: true,
          runnable: true,
        }),
      ]),
    }));
    expect(runDueResponse.statusCode).toBe(201);
    expect(runDueResponse.json()).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      results: expect.arrayContaining([
        expect.objectContaining({
          policyId: scheduled.id,
          due: true,
          runnable: true,
          status: "completed",
        }),
      ]),
    }));
    expect(webhookResponse.statusCode).toBe(202);
    expect(webhookResponse.json()).toEqual(expect.objectContaining({
      status: "queued",
      matchedPolicy: expect.objectContaining({ id: scheduled.id }),
      syncRun: expect.objectContaining({ status: "queued", totalRecords: 0 }),
    }));
  });

  it("verifies WPS webhook signatures and rejects replayed events", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const connection = persistence.repositories.dataCapability
      .listExternalConnections("club-chongqing-talent")
      .find((item) => item.id === "external-connection-wps-cq-talent");
    if (!connection) {
      throw new Error("Expected seeded WPS connection.");
    }
    persistence.repositories.dataCapability.saveExternalConnection({
      ...connection,
      config: {
        ...connection.config,
        webhookSigningMode: "hmac_sha256",
        webhookSecretRef: "cq-talent-webhook",
        webhookMaxSkewSeconds: 300,
      },
    });

    const previousSecret = process.env.WPS_WEBHOOK_SECRET_CQ_TALENT_WEBHOOK;
    process.env.WPS_WEBHOOK_SECRET_CQ_TALENT_WEBHOOK = "local-webhook-secret";

    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const body = {
      eventId: "signed-event-001",
      eventType: "table.updated",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-full-users-cq-talent",
      policyId: "external-sync-policy-wps-cq-talent-manual",
      occurredAt: "2026-06-26T09:05:00.000Z",
      payload: { changedRows: 1 },
    };
    const timestamp = String(Date.now());
    const nonce = "nonce-001";
    const signature = signWpsWebhookPayload({
      timestamp,
      nonce,
      secret: "local-webhook-secret",
      payload: body,
    });

    const accepted = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/wps/webhook",
      headers: {
        "x-user-id": "user-admin-1",
        "x-wps-timestamp": timestamp,
        "x-wps-nonce": nonce,
        "x-wps-signature": signature,
      },
      payload: body,
    });
    const replayed = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/wps/webhook",
      headers: {
        "x-user-id": "user-admin-1",
        "x-wps-timestamp": timestamp,
        "x-wps-nonce": nonce,
        "x-wps-signature": signature,
      },
      payload: body,
    });

    expect(accepted.statusCode).toBe(202);
    expect(accepted.json()).toEqual(expect.objectContaining({
      status: "queued",
      syncRun: expect.objectContaining({ id: "external-sync-run-wps-webhook-signed-event-001" }),
    }));
    expect(replayed.statusCode).toBe(400);
    expect(replayed.json().error.message).toBe("WPS webhook replay detected.");

    if (previousSecret === undefined) {
      delete process.env.WPS_WEBHOOK_SECRET_CQ_TALENT_WEBHOOK;
    } else {
      process.env.WPS_WEBHOOK_SECRET_CQ_TALENT_WEBHOOK = previousSecret;
    }
    await app.close();
    persistence.database.close();
  });

  it("rejects non-admin access to WPS automation controls", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const coachDueResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/integrations/sync-policies/due",
      headers: { "x-user-id": "user-coach-1" },
    });
    const parentWebhookResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/integrations/wps/webhook",
      headers: { "x-user-id": "user-parent-1" },
      payload: {
        eventType: "table.updated",
        connectionId: "external-connection-wps-cq-talent",
        tableMappingId: "external-table-full-users-cq-talent",
      },
    });

    expect(coachDueResponse.statusCode).toBe(403);
    expect(parentWebhookResponse.statusCode).toBe(403);

    await app.close();
    persistence.database.close();
  });

  it("confirms staged external records without realtime external sync", async () => {
    const app = buildServer(undefined, { logger: false });
    const confirmResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/external-records/external-raw-student-cq-talent/confirm",
      payload: {
        targetType: "student",
        targetId: "student-1",
        confirmedBy: "user-coach-1",
      },
    });
    const previewResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/import-preview?reviewStatus=confirmed",
    });

    expect(confirmResponse.statusCode).toBe(200);
    expect(confirmResponse.json()).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      rawRecordId: "external-raw-student-cq-talent",
      targetType: "student",
      targetId: "student-1",
      linkStatus: "confirmed",
    }));
    expect(previewResponse.json()).toEqual({
      records: [expect.objectContaining({ id: "external-raw-student-cq-talent", reviewStatus: "confirmed" })],
    });
  });

  it("records lesson credit, attendance debit, and manual adjustment with balance", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const creditResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/lesson-adjustments",
      headers: { "x-user-id": "user-admin-1" },
      payload: {
        entryType: "credit",
        lessonDelta: 12,
        source: "offline_recharge",
        sourceId: "offline-payment-1",
        actorUserId: "user-admin-1",
        amount: 2400,
        paymentType: "offline_bank_transfer",
        note: "Offline recharge confirmed",
      },
    });
    const attendanceResponse = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/admin/calendar/events/event-training-1/participants",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        participants: [{ studentId: "student-1", status: "present" }],
      },
    });
    const adjustmentResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/lesson-adjustments",
      headers: { "x-user-id": "user-admin-1" },
      payload: {
        entryType: "adjustment",
        lessonDelta: 2,
        source: "manual_adjustment",
        sourceId: "manual-adjustment-1",
        actorUserId: "user-admin-1",
        note: "Correct offline ledger",
      },
    });
    const ledgerResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/lesson-ledger",
      headers: { "x-user-id": "user-admin-1" },
    });
    const summaryResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/students/student-1/status-summary",
      headers: { "x-user-id": "user-parent-1" },
    });

    const ledger = ledgerResponse.json() as {
      balance: number;
      entries: Array<{ entryType: string; lessonDelta: number; source: string; sourceId?: string; paymentEventId?: string }>;
    };
    const summary = summaryResponse.json() as { lesson?: { balance?: number; status: string; updatedAt?: string; source?: string } };

    expect(creditResponse.statusCode).toBe(201);
    expect(attendanceResponse.statusCode).toBe(200);
    expect(adjustmentResponse.statusCode).toBe(201);
    expect(ledgerResponse.statusCode).toBe(200);
    expect(ledger.balance).toBe(13);
    expect(ledger.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ entryType: "credit", lessonDelta: 12, source: "offline_recharge", sourceId: "offline-payment-1" }),
      expect.objectContaining({ entryType: "debit", lessonDelta: -1, source: "attendance", sourceId: "event-training-1-student-1" }),
      expect.objectContaining({ entryType: "adjustment", lessonDelta: 2, source: "manual_adjustment", sourceId: "manual-adjustment-1" }),
    ]));
    expect(ledger.entries.find((entry) => entry.entryType === "credit")?.paymentEventId).toBeTruthy();
    expect(summaryResponse.statusCode).toBe(200);
    expect(summary.lesson).toEqual(expect.objectContaining({
      balance: 13,
      status: "confirmed",
      source: "manual_adjustment",
    }));
    expect(summary.lesson?.updatedAt).toBeTruthy();

    await app.close();
    persistence.database.close();
  });

  it("keeps insurance renewal history and derives current status", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const expiredResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/insurance-policies",
      headers: { "x-user-id": "user-admin-1" },
      payload: {
        purchasedAt: "2025-01-01",
        expiresAt: "2025-12-31",
        policyNumber: "POLICY-OLD",
        provider: "Offline Insurance Co",
        reviewStatus: "approved",
        source: "offline_insurance",
        sourceId: "insurance-old",
        actorUserId: "user-admin-1",
      },
    });
    const renewalResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/insurance-policies",
      headers: { "x-user-id": "user-admin-1" },
      payload: {
        purchasedAt: "2026-06-26",
        expiresAt: "2027-06-26",
        policyNumber: "POLICY-NEW",
        provider: "Offline Insurance Co",
        reviewStatus: "approved",
        source: "offline_insurance",
        sourceId: "insurance-renewal",
        actorUserId: "user-admin-1",
      },
    });
    const policiesResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/insurance-policies",
      headers: { "x-user-id": "user-admin-1" },
    });
    const summaryResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/students/student-1/status-summary",
      headers: { "x-user-id": "user-parent-1" },
    });

    const policies = policiesResponse.json() as {
      current: { status: string; policyNumber?: string; expiresAt?: string };
      policies: Array<{ policyNumber?: string; currentStatus: string }>;
    };
    const summary = summaryResponse.json() as {
      insurance: { status: string; policyNumber?: string; updatedAt?: string; source?: string; sourceId?: string };
    };

    expect(expiredResponse.statusCode).toBe(201);
    expect(renewalResponse.statusCode).toBe(201);
    expect(policiesResponse.statusCode).toBe(200);
    expect(policies.current).toEqual(expect.objectContaining({
      status: "active",
      policyNumber: "POLICY-NEW",
      expiresAt: "2027-06-26",
    }));
    expect(policies.policies).toHaveLength(2);
    expect(policies.policies).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyNumber: "POLICY-OLD", currentStatus: "expired" }),
      expect.objectContaining({ policyNumber: "POLICY-NEW", currentStatus: "active" }),
    ]));
    expect(summaryResponse.statusCode).toBe(200);
    expect(summary.insurance).toEqual(expect.objectContaining({
      status: "active",
      policyNumber: "POLICY-NEW",
      source: "offline_insurance",
      sourceId: "insurance-renewal",
    }));
    expect(summary.insurance.updatedAt).toBeTruthy();

    await app.close();
    persistence.database.close();
  });

  it("rejects parent and coach writes to lesson recharge and insurance flows", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const parentLessonWrite = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/lesson-adjustments",
      headers: { "x-user-id": "user-parent-1" },
      payload: {
        entryType: "credit",
        lessonDelta: 4,
        source: "offline_recharge",
      },
    });
    const coachLessonWrite = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/lesson-adjustments",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        entryType: "credit",
        lessonDelta: 4,
        source: "offline_recharge",
      },
    });
    const parentInsuranceWrite = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/insurance-policies",
      headers: { "x-user-id": "user-parent-1" },
      payload: {
        expiresAt: "2027-06-26",
        reviewStatus: "approved",
      },
    });
    const coachInsuranceWrite = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/students/student-1/insurance-policies",
      headers: { "x-user-id": "user-coach-1" },
      payload: {
        expiresAt: "2027-06-26",
        reviewStatus: "approved",
      },
    });

    expect(parentLessonWrite.statusCode).toBe(403);
    expect(coachLessonWrite.statusCode).toBe(403);
    expect(parentInsuranceWrite.statusCode).toBe(403);
    expect(coachInsuranceWrite.statusCode).toBe(403);

    await app.close();
    persistence.database.close();
  });

  it("creates a training session through the training route", async () => {
    const app = buildServer(undefined, { logger: false });

    const eventResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/calendar/events",
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
      url: "/clubs/club-chongqing-talent/training/sessions",
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
    expect(session.clubId).toBe("club-chongqing-talent");
    expect(session.eventId).toBe(event.id);
    expect(session.kind).toBe("private");
  });

  it("expands recurring training events with participants and detects conflicts", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/calendar/events",
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
      url: "/clubs/club-chongqing-talent/admin/calendar/conflicts",
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
    expect(events.every((event) => event.clubId === "club-chongqing-talent")).toBe(true);
    expect(events.every((event) => event.participants[0]?.studentId === "student-1")).toBe(true);
    expect(events.every((event) => event.trainingSession?.eventId === event.id)).toBe(true);
    expect(conflictResponse.statusCode).toBe(200);
    expect(conflicts.some((conflict) => conflict.existingEventId === events[1]?.id && conflict.subjectKind === "coach")).toBe(true);
    expect(conflicts.some((conflict) => conflict.existingEventId === events[1]?.id && conflict.subjectKind === "student")).toBe(true);
  });

  it("updates attendance statuses and detects multi-team private lesson conflicts", async () => {
    const app = buildServer(undefined, { logger: false });
    const attendanceResponse = await app.inject({
      method: "PUT",
      url: "/clubs/club-chongqing-talent/admin/calendar/events/event-training-1/participants",
      payload: {
        participants: [
          { studentId: "student-1", status: "present", note: "arrived on time" },
        ],
      },
    });
    const conflictResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/calendar/conflicts",
      payload: {
        startsAt: "2026-07-01T09:30:00.000Z",
        endsAt: "2026-07-01T10:15:00.000Z",
        coachId: "coach-1",
        studentIds: ["student-1"],
      },
    });

    const attendance = attendanceResponse.json() as Array<{ studentId: string; status: string; note?: string }>;
    const conflicts = conflictResponse.json() as Array<{ existingEventId: string; subjectKind: string }>;

    expect(attendanceResponse.statusCode).toBe(200);
    expect(attendance).toEqual([
      expect.objectContaining({ studentId: "student-1", status: "present", note: "arrived on time" }),
    ]);
    expect(conflictResponse.statusCode).toBe(200);
    expect(conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({ existingEventId: "event-training-1", subjectKind: "coach" }),
      expect.objectContaining({ existingEventId: "event-training-1", subjectKind: "student" }),
    ]));
  });

  it("records training observations and writes training metric records", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/training/sessions/training-session-1/observations",
      payload: {
        studentId: "student-1",
        coachId: "coach-1",
        metricId: "metric-finishing",
        rating: 5,
        tags: ["finishing"],
        note: "Excellent first touch before finishing.",
      },
    });
    const metricsResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/students/student-1/metrics?source=training_observation",
    });

    const body = response.json() as {
      observation: { metricId: string; rating: number };
      metricRecord: { id: string; source: string; metricId: string; value: { kind: string; score: number } };
    };
    const metrics = metricsResponse.json() as Array<{ id: string; source: string; value: { kind: string; score: number } }>;

    expect(response.statusCode).toBe(201);
    expect(body.observation).toEqual(expect.objectContaining({ metricId: "metric-finishing", rating: 5 }));
    expect(body.metricRecord).toEqual(expect.objectContaining({
      source: "training_observation",
      metricId: "metric-finishing",
      value: { kind: "rating_1_5", score: 5 },
    }));
    expect(metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: body.metricRecord.id, source: "training_observation" }),
    ]));
  });

  it("reads and ensures training sessions by event", async () => {
    const app = buildServer(undefined, { logger: false });
    const listResponse = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/training/sessions?eventId=event-training-1",
    });
    const ensureResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/training/sessions/ensure",
      payload: {
        eventId: "event-training-1",
        kind: "team",
        intensity: "high",
      },
    });
    const invalidResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/training/sessions/ensure",
      payload: {
        eventId: "event-match-1",
      },
    });

    const sessions = listResponse.json() as Array<{ id: string; eventId: string; intensity?: string }>;
    const ensured = ensureResponse.json() as { id: string; eventId: string; intensity?: string };

    expect(listResponse.statusCode).toBe(200);
    expect(sessions).toEqual([expect.objectContaining({ id: "training-session-1", eventId: "event-training-1" })]);
    expect(ensureResponse.statusCode).toBe(201);
    expect(ensured).toEqual(expect.objectContaining({
      id: "training-session-1",
      eventId: "event-training-1",
      intensity: "high",
    }));
    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json().error.message).toBe("Training session must link to a training event.");
  });

  it("records match events and writes match metric records", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/matches",
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
        opponentName: "重庆中心小学U10",
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

  it("reads match detail by event for submitted results", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/matches?eventId=event-match-1",
    });

    const body = response.json() as {
      match: { id: string; eventId: string };
      rosters: Array<{ studentId: string }>;
      events: Array<{ type: string; studentId: string }>;
      notes: Array<{ studentId: string }>;
      metricRecords: Array<{ source: string; eventId: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.match).toEqual(expect.objectContaining({ id: "match-1", eventId: "event-match-1" }));
    expect(body.rosters).toEqual([expect.objectContaining({ studentId: "student-1" })]);
    expect(body.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "goal", studentId: "student-1" }),
      expect.objectContaining({ type: "assist", studentId: "student-1" }),
    ]));
    expect(body.notes).toEqual([expect.objectContaining({ studentId: "student-1" })]);
    expect(body.metricRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "match_event", eventId: "event-match-1" }),
    ]));
  });

  it("records repeated scoring and assist events as separate count metric records", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/matches",
      payload: {
        eventId: "event-match-1",
        matchType: "friendly",
        status: "completed",
        events: [
          { studentId: "student-1", type: "goal", minute: 8 },
          { studentId: "student-1", type: "goal", minute: 21 },
          { studentId: "student-1", type: "assist", minute: 34 },
        ],
      },
    });

    const body = response.json() as {
      events: Array<{ type: string; linkedMetricId?: string }>;
      metricRecords: Array<{ metricId: string; source: string; value: { kind: string; count: number } }>;
    };

    expect(response.statusCode).toBe(201);
    expect(body.events.map((event) => event.linkedMetricId)).toEqual([
      "metric-goals",
      "metric-goals",
      "metric-assists",
    ]);
    expect(body.metricRecords.filter((record) => record.metricId === "metric-goals")).toHaveLength(2);
    expect(body.metricRecords.filter((record) => record.metricId === "metric-assists")).toHaveLength(1);
    expect(body.metricRecords.every((record) => record.source === "match_event" && record.value.count === 1)).toBe(true);
  });

  it("rejects misspelled match roster payloads", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/matches",
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
      url: "/clubs/club-chongqing-talent/assessments",
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
      url: "/clubs/club-chongqing-talent/matches",
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
      url: "/clubs/club-chongqing-talent/assessments",
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
    expect(body.metricRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: "assessment",
        value: expect.objectContaining({ kind: "rating_1_5", score: 4 }),
      }),
      expect.objectContaining({
        source: "algorithm",
        metricId: "metric-technical-index",
        value: expect.objectContaining({ kind: "measurement", value: 80 }),
      }),
    ]));
  });

  it("records assessment raw results, scores, metric records, and graph lineage", async () => {
    const app = buildServer(undefined, { logger: false });
    const response = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/assessments",
      payload: {
        studentId: "student-1",
        templateId: "assessment-template-technical",
        templateVersionId: "assessment-template-version-technical-1",
        assessedByCoachId: "coach-1",
        assessedAt: "2026-07-07T09:30:00.000Z",
        rawResults: [
          {
            testItemId: "assessment-test-finishing-cq-talent",
            value: { kind: "rating_1_5", score: 5 },
            note: "Recommended drill metadata stays on the test item protocol.",
          },
        ],
      },
    });

    const body = response.json() as {
      rawResults: Array<{ id: string; testItemId: string; metricId: string }>;
      scores: Array<{ rawResultId?: string; metricId: string; value: { kind: string; score: number } }>;
      metricRecords: Array<{
        id: string;
        metricId: string;
        source: string;
        rawResultId?: string;
        lineageId?: string;
        value: { kind: string; score?: number; value?: number };
      }>;
    };

    expect(response.statusCode).toBe(201);
    expect(body.rawResults).toEqual([
      expect.objectContaining({
        testItemId: "assessment-test-finishing-cq-talent",
        metricId: "metric-finishing",
      }),
    ]);
    expect(body.scores).toEqual([
      expect.objectContaining({
        rawResultId: body.rawResults[0]?.id,
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 5 },
      }),
    ]);
    expect(body.metricRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: "assessment",
        metricId: "metric-finishing",
        rawResultId: body.rawResults[0]?.id,
      }),
      expect.objectContaining({
        source: "algorithm",
        metricId: "metric-technical-index",
        value: expect.objectContaining({ kind: "measurement", value: 100 }),
      }),
    ]));
    expect(body.metricRecords.find((record) => record.metricId === "metric-technical-index")?.lineageId).toBeTruthy();
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
      url: "/clubs/club-chongqing-talent/config",
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
      url: "/clubs/club-chongqing-talent/students/student-1/metrics",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });
    const otherMetrics = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/students/student-other/metrics",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });
    const writeResponse = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/students/student-1/derived-metrics/attacking-contribution",
      headers: {
        "x-user-id": "user-parent-1",
      },
    });
    const observationWrite = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/training/sessions/training-session-1/observations",
      headers: {
        "x-user-id": "user-parent-1",
      },
      payload: {
        studentId: "student-1",
        coachId: "coach-1",
        metricId: "metric-finishing",
        rating: 4,
      },
    });
    const assessmentWrite = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/assessments",
      headers: {
        "x-user-id": "user-parent-1",
      },
      payload: {
        studentId: "student-1",
        templateId: "assessment-template-technical",
        assessedByCoachId: "coach-1",
        rawResults: [
          {
            testItemId: "assessment-test-finishing-cq-talent",
            value: { kind: "rating_1_5", score: 4 },
          },
        ],
      },
    });

    expect(ownMetrics.statusCode).toBe(200);
    expect(otherMetrics.statusCode).toBe(403);
    expect(otherMetrics.json().error.code).toBe("forbidden");
    expect(writeResponse.statusCode).toBe(403);
    expect(writeResponse.json().error.code).toBe("forbidden");
    expect(observationWrite.statusCode).toBe(403);
    expect(observationWrite.json().error.code).toBe("forbidden");
    expect(assessmentWrite.statusCode).toBe(403);
    expect(assessmentWrite.json().error.code).toBe("forbidden");

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
      url: "/clubs/club-chongqing-talent/matches",
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
      url: "/clubs/club-chongqing-talent/teams",
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

  it("enforces platform-side minor privacy controls and audit trails", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(
      new PersistentApiStore(persistence.repositories),
      {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships),
      },
    );

    const capabilities = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/capabilities?appId=wx-cq-talent-main",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentHome = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/home",
      headers: { "x-user-id": "user-parent-1" },
    });
    const adminDetail = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/students/student-1",
      headers: { "x-user-id": "user-admin-1" },
    });
    const exportPreview = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/admin/privacy/export-preview",
      headers: { "x-user-id": "user-admin-1" },
      payload: {
        targetType: "student",
        targetId: "student-1",
        purpose: "guardian copy review",
        fieldKeys: ["student.name", "contact.phone", "student.identityNumber"],
      },
    });
    const parentPrivacy = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/privacy",
      headers: { "x-user-id": "user-parent-1" },
    });
    const parentRequest = await app.inject({
      method: "POST",
      url: "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/privacy/requests",
      headers: { "x-user-id": "user-parent-1" },
      payload: {
        requestType: "correction",
        description: "修正联系电话",
      },
    });
    const auditLogs = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/privacy/audit-logs",
      headers: { "x-user-id": "user-admin-1" },
    });
    const adminRequests = await app.inject({
      method: "GET",
      url: "/clubs/club-chongqing-talent/admin/privacy/requests",
      headers: { "x-user-id": "user-admin-1" },
    });

    const capabilityBody = capabilities.json() as {
      privacy: {
        features: Record<string, boolean>;
        fieldVisibility: Array<{ fieldKey: string; dataClass: string }>;
        consentScopes: Array<{ scope: string; enabledByDefault: boolean }>;
      };
    };
    const homeBody = parentHome.json() as {
      student: { primaryContact?: Record<string, unknown> };
    };
    const exportBody = exportPreview.json() as {
      allowedFieldKeys: string[];
      deniedFieldKeys: string[];
      redactedFieldKeys: string[];
      data: Record<string, unknown>;
    };
    const privacyBody = parentPrivacy.json() as { consents: Array<{ scope: string; status: string }> };
    const auditBody = auditLogs.json() as Array<{ action: string; targetType: string; fieldKeys: string[] }>;
    const requestBody = adminRequests.json() as Array<{ requestType: string; status: string; studentId: string }>;

    expect(capabilities.statusCode).toBe(200);
    expect(capabilityBody.privacy.features.aiPerformanceAnalysis).toBe(false);
    expect(capabilityBody.privacy.consentScopes).toContainEqual(expect.objectContaining({
      scope: "ai_video_editing",
      enabledByDefault: false,
    }));
    expect(capabilityBody.privacy.fieldVisibility).toContainEqual(expect.objectContaining({
      fieldKey: "student.identityNumber",
      dataClass: "minor_sensitive",
    }));
    expect(parentHome.statusCode).toBe(200);
    expect(homeBody.student.primaryContact).toEqual(expect.not.objectContaining({
      phone: expect.anything(),
      wechat: expect.anything(),
    }));
    expect(adminDetail.statusCode).toBe(200);
    expect(exportPreview.statusCode).toBe(200);
    expect(exportBody.allowedFieldKeys).toEqual(["student.name"]);
    expect(exportBody.deniedFieldKeys).toEqual(expect.arrayContaining(["contact.phone", "student.identityNumber"]));
    expect(exportBody.redactedFieldKeys).toEqual(["student.name"]);
    expect(parentPrivacy.statusCode).toBe(200);
    expect(privacyBody.consents).toContainEqual(expect.objectContaining({
      scope: "core_training_service",
      status: "granted",
    }));
    expect(parentRequest.statusCode).toBe(201);
    expect(adminRequests.statusCode).toBe(200);
    expect(requestBody).toContainEqual(expect.objectContaining({
      requestType: "correction",
      status: "open",
      studentId: "student-1",
    }));
    expect(auditLogs.statusCode).toBe(200);
    expect(auditBody).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: "read", targetType: "student" }),
      expect.objectContaining({ action: "export", targetType: "student" }),
      expect.objectContaining({ action: "request_create", targetType: "student" }),
    ]));

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
