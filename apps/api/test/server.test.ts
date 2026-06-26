import ExcelJS from "exceljs";
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
    expect(body.paths["/clubs/{clubId}/capabilities"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/imports/excel/preview"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/students/{studentId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/admin/sync-runs/{syncRunId}"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/coach/today"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/training/sessions/{trainingSessionId}/observations"]).toBeDefined();
    expect(body.paths["/clubs/{clubId}/assessments"]).toBeDefined();
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
    expect(body.assessment.views).toEqual([expect.objectContaining({ name: "天才精英队评分视图" })]);
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
    expect(config.metricGraphVersions).toEqual([expect.objectContaining({ id: "metric-graph-version-chongqing-talent" })]);
    expect(config.assessmentTemplateVersions).toEqual([
      expect.objectContaining({
        id: "assessment-template-version-technical-1",
        graphVersionId: "metric-graph-version-chongqing-talent",
      }),
    ]);
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
