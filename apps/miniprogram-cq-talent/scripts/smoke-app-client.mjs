#!/usr/bin/env node

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
const clubId = process.env.CLUB_ID ?? "club-chongqing-talent";
const clientKey = process.env.CLIENT_KEY ?? "cq-talent-wechat-main";
const expectedClientId = process.env.CLIENT_ID ?? "app-client-cq-talent-wechat-main";
const parentUserId = process.env.PARENT_USER_ID ?? "user-parent-cq-talent-acceptance";
const coachUserId = process.env.COACH_USER_ID ?? "user-coach-1";
const coachProfileId = process.env.COACH_PROFILE_ID ?? "coach-1";
const testDate = process.env.TEST_DATE ?? "2026-06-28";
const assessmentTemplateId = process.env.ASSESSMENT_TEMPLATE_ID ?? "assessment-template-cq-talent-elite";

const summary = [];

async function main() {
  await expectHealth();
  const clientId = await expectResolve();
  await expectCapabilities(clientId);
  const parentStudentId = await expectParentRead(clientId);
  const { eventId, studentId } = await expectCoachRead(clientId);
  await expectCoachWrites(clientId, eventId, studentId);
  await expectAssessmentSubmit(clientId, eventId, studentId);

  printSummary(parentStudentId, eventId, studentId);
}

async function expectHealth() {
  const health = await request("/health", { userId: coachUserId });
  pass("health", health.service ?? health.status ?? "ok");
}

async function expectResolve() {
  const resolved = await request(`/app-clients/resolve?clientKey=${encodeURIComponent(clientKey)}`, {
    userId: coachUserId,
  });
  assertEqual(resolved.clubId, clubId, "resolve clubId");
  const clientId = resolved.clientId ?? resolved.client?.id;
  assertEqual(clientId, expectedClientId, "resolve clientId");
  pass("resolve", `${resolved.clubId} / ${clientId}`);
  return clientId;
}

async function expectCapabilities(clientId) {
  const capabilities = await request(`/clubs/${clubId}/capabilities?clientId=${encodeURIComponent(clientId)}`, {
    userId: coachUserId,
  });
  const moduleCount = Array.isArray(capabilities.modules) ? capabilities.modules.length : Object.keys(capabilities).length;
  pass("capabilities", `${moduleCount} top-level entries`);
}

async function expectParentRead(clientId) {
  const childrenResponse = await request(`/clubs/${clubId}/app-clients/${clientId}/parent/children`, {
    userId: parentUserId,
  });
  const children = arrayOf(childrenResponse.children, childrenResponse.students);
  assertEqual(children.length, 200, "parent children count");
  const studentId = children[0]?.id ?? children[0]?.studentId;
  assert(studentId, "parent first student id missing");
  pass("parent.children", `${children.length} students, first=${studentId}`);

  const home = await request(`/clubs/${clubId}/app-clients/${clientId}/parent/students/${studentId}/home`, {
    userId: parentUserId,
  });
  pass("parent.home", home.student?.id ?? home.studentId ?? studentId);

  const schedule = await request(`/clubs/${clubId}/app-clients/${clientId}/parent/students/${studentId}/schedule`, {
    userId: parentUserId,
  });
  const events = arrayOf(schedule.events, schedule.items);
  assert(events.length > 0, "parent schedule should include imported test events");
  pass("parent.schedule", `${events.length} events`);

  const calendar = await request(`/clubs/${clubId}/app-clients/${clientId}/parent/calendar?from=${encodeURIComponent(testDate)}&to=${encodeURIComponent("2026-07-05")}`, {
    userId: parentUserId,
  });
  const familyEvents = arrayOf(calendar.events);
  assert(familyEvents.length > 0, "parent family calendar should include aggregated events");
  assert(arrayOf(familyEvents[0]?.children).length > 0 || arrayOf(familyEvents[0]?.childIds).length > 0, "family calendar event should include child binding");
  pass("parent.calendar", `${familyEvents.length} aggregated events`);

  const growth = await request(`/clubs/${clubId}/app-clients/${clientId}/parent/students/${studentId}/growth-summary`, {
    userId: parentUserId,
  });
  pass("parent.growth", `keys=${Object.keys(growth).slice(0, 5).join(",")}`);
  const metricId = arrayOf(growth.latest)[0]?.metricId;
  assert(metricId, "parent growth should include a metric for drilldown");
  const metricDetail = await request(`/clubs/${clubId}/app-clients/${clientId}/parent/students/${studentId}/ability-metrics/${metricId}`, {
    userId: parentUserId,
  });
  assert(metricDetail.metric?.id === metricId, "metric detail should preserve selected metric identity");
  pass("parent.metric-detail", `${arrayOf(metricDetail.records).length} records`);

  return studentId;
}

async function expectCoachRead(clientId) {
  const home = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/home?date=${encodeURIComponent(testDate)}`, {
    userId: coachUserId,
  });
  const events = arrayOf(home.events, home.workbench?.events);
  assert(events.length > 0, `coach home should include events for ${testDate}`);
  const eventId = events[0].id;
  pass("coach.home", `${events.length} events, first=${eventId}`);
  const weekHome = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/home?from=${encodeURIComponent(testDate)}&to=${encodeURIComponent("2026-07-05")}`, {
    userId: coachUserId,
  });
  assert(weekHome.workbench?.summary?.total >= events.length, "coach week workbench should include summary totals");
  assert(arrayOf(weekHome.workbench?.tasks).length >= events.length, "coach week workbench should include tasks");
  pass("coach.week-workbench", `${weekHome.workbench.summary.pending} pending tasks`);

  const workbench = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/workbench`, {
    userId: coachUserId,
  });
  const roster = arrayOf(
    workbench.roster,
    workbench.students,
    workbench.event?.students,
    workbench.event?.participants,
    workbench.rosterContext?.participants,
  );
  assert(roster.length > 0, "coach workbench roster should not be empty");
  const studentId = roster[0].studentId ?? roster[0].id;
  assert(studentId, "coach roster first student id missing");
  pass("coach.workbench", `${roster.length} participants, first=${studentId}`);

  return { eventId, studentId };
}

async function expectCoachWrites(clientId, eventId, studentId) {
  const workbench = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/workbench`, {
    userId: coachUserId,
  });
  const roster = arrayOf(workbench.event?.participants, workbench.rosterContext?.participants, workbench.roster);
  const participants = roster.slice(0, 3).map((item) => ({
    studentId: item.studentId ?? item.id,
    status: "present",
  }));
  assert(participants.length > 0, "attendance participants missing");

  const attendance = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/attendance`, {
    method: "PUT",
    userId: coachUserId,
    body: { participants },
    idempotent: true,
  });
  pass("coach.attendance", `${arrayOf(attendance.participants).length} updated`);

  const lesson = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/lesson-confirmation`, {
    method: "POST",
    userId: coachUserId,
    body: {
      studentIds: [studentId],
      actorUserId: coachUserId,
      note: "CQ Talent mini-program app-client smoke lesson confirmation",
    },
    idempotent: true,
  });
  pass("coach.lesson.confirm", `${arrayOf(lesson.ledgers).length} ledger entries`);

  const correction = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/lesson-confirmation`, {
    method: "PATCH",
    userId: coachUserId,
    body: {
      studentId,
      lessonDelta: 1,
      actorUserId: coachUserId,
      reason: "CQ Talent mini-program app-client smoke correction",
    },
    idempotent: true,
  });
  assert(correction.ledger, "lesson correction response missing ledger");
  pass("coach.lesson.correct", correction.ledger.id ?? "ok");

  const trainingTree = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/training-project-tree`, {
    userId: coachUserId,
  });
  const projects = arrayOf(trainingTree.projects);
  assert(projects.length > 0, "training project tree should include projects");
  const trainingProjectIds = projects.slice(0, 2).map((project) => project.id).filter(Boolean);
  const trainingProjects = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/training-projects`, {
    method: "PUT",
    userId: coachUserId,
    body: {
      projectIds: trainingProjectIds,
      note: "CQ Talent mini-program app-client smoke training projects",
    },
    idempotent: true,
  });
  pass("coach.training-projects", `${arrayOf(trainingProjects.projects).length} projects saved`);
  const restoredWorkbench = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/events/${eventId}/workbench`, {
    userId: coachUserId,
  });
  assert(arrayOf(restoredWorkbench.training?.selectedProjectIds).length === trainingProjectIds.length, "saved training projects should restore in workbench");
  pass("coach.training-projects-restore", `${arrayOf(restoredWorkbench.training?.selectedProjectIds).length} projects restored`);

  const match = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/matches`, {
    method: "POST",
    userId: coachUserId,
    body: {
      eventId,
      matchType: "friendly",
      status: "completed",
      opponentName: "smoke opponent",
      homeScore: 3,
      awayScore: 1,
      events: [
        { studentId, type: "goal", minute: 12, note: "smoke goal" },
        { studentId, type: "assist", minute: 20, note: "smoke assist" },
      ],
    },
    idempotent: true,
  });
  assert(arrayOf(match.events).length >= 2, "match response should include player events");
  assert(arrayOf(match.metricRecords).length >= 2, "goal/assist should create metric records");
  pass("coach.match", `${match.match?.id ?? match.id ?? "ok"}, metrics=${arrayOf(match.metricRecords).length}`);
}

async function expectAssessmentSubmit(clientId, eventId, studentId) {
  const form = await request(
    `/clubs/${clubId}/app-clients/${clientId}/coach/assessments/templates/${assessmentTemplateId}/form`,
    { userId: coachUserId },
  );
  const fields = arrayOf(form.fields).filter((field) => field.binding?.testItemId || field.testItem?.id);
  assert(fields.length > 0, "assessment form fields missing");
  const rawResults = fields.map((field) => ({
    testItemId: field.binding?.testItemId ?? field.testItem?.id,
    metricId: field.binding?.metricId ?? field.metric?.id,
    value: { score: 88 },
    note: "CQ Talent mini-program app-client smoke",
  }));

  const assessment = await request(`/clubs/${clubId}/app-clients/${clientId}/coach/assessments`, {
    method: "POST",
    userId: coachUserId,
    body: {
      studentId,
      eventId,
      templateId: assessmentTemplateId,
      templateVersionId: form.templateVersion?.id ?? form.templateVersionId ?? form.versionId,
      assessedByCoachId: coachProfileId,
      assessedAt: new Date().toISOString(),
      summary: "CQ Talent mini-program app-client smoke assessment",
      rawResults,
    },
    idempotent: true,
  });
  pass(
    "coach.assessment",
    `${rawResults.length} rawResults, ${arrayOf(assessment.scores).length} scores, ${arrayOf(assessment.metricRecords).length} metricRecords`,
  );
}

async function request(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    "x-user-id": options.userId ?? parentUserId,
    "x-request-id": makeKey("req"),
  };
  if (options.idempotent) {
    headers["idempotency-key"] = makeKey("idem");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = parseBody(text);
  if (!response.ok) {
    const preview = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${preview.slice(0, 800)}`);
  }
  return data;
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function arrayOf(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function pass(label, detail) {
  summary.push({ label, detail });
  console.log(`ok ${label}: ${detail}`);
}

function makeKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function printSummary(parentStudentId, eventId, coachStudentId) {
  console.log("");
  console.log("CQ Talent app-client smoke passed");
  console.log(`baseUrl=${baseUrl}`);
  console.log(`clubId=${clubId}`);
  console.log(`clientId=${expectedClientId}`);
  console.log(`parentUserId=${parentUserId}; firstStudentId=${parentStudentId}`);
  console.log(`coachUserId=${coachUserId}; eventId=${eventId}; firstRosterStudentId=${coachStudentId}`);
  console.log(`checks=${summary.length}`);
}

main().catch((error) => {
  console.error("");
  console.error("CQ Talent app-client smoke failed");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
