import { APP_CLIENT_KEY, DEV_COACH_PROFILE_IDS, DEV_MODE, DEV_TEST_DATE } from "./config";
import { request } from "./request";
import { getAppContext, getSession } from "./store";
import type {
  ActivityDetail,
  AppContext,
  AssessmentForm,
  CoachHome,
  CoachWorkbench,
  GrowthSummary,
  RadarMetricPoint,
  ScheduleEvent,
  StudentHome,
  StudentSummary,
} from "./types";

export async function resolveClient() {
  return request<AppContext>({
    path: `/app-clients/resolve?clientKey=${APP_CLIENT_KEY}`,
  });
}

export async function getParentChildren() {
  const context = requireContext();
  const response = await request<{ children?: Array<Record<string, unknown>> }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/children`,
  });
  return normalizeStudents(response.children ?? []);
}

export async function getParentSchedule(studentId: string) {
  const context = requireContext();
  const response = await request<{ events?: Array<Record<string, unknown>> }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/students/${studentId}/schedule`,
  });
  return normalizeEvents(response.events ?? []);
}

export async function getParentActivityDetail(eventId: string) {
  const context = requireContext();
  try {
    const response = await request<Record<string, unknown>>({
      path: `/clubs/${context.clubId}/app-clients/${context.clientId}/events/${eventId}`,
    });
    return normalizeActivityDetail(response);
  } catch (error) {
    return pendingActivityDetail(eventId);
  }
}

export async function getParentGrowth(studentId: string, student?: StudentSummary): Promise<GrowthSummary> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/students/${studentId}/growth-summary`,
  });
  return normalizeGrowth(response, student);
}

export async function getParentStudentHome(student: StudentSummary): Promise<StudentHome> {
  const context = requireContext();
  try {
    const response = await request<Record<string, unknown>>({
      path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/students/${student.id}/home`,
    });
    return normalizeStudentHome(response, student);
  } catch (error) {
    return {
      profile: [
        { label: "姓名", value: student.name },
        { label: "年龄组", value: student.ageGroup || "待同步" },
        { label: "队伍", value: textOrPending(student.teams.join("、")) },
        { label: "教练", value: textOrPending(student.coachNames.join("、")) },
      ],
      lessonStatus: [{ label: "课时状态", value: "接口待接入", status: "pending" }],
      insuranceStatus: [{ label: "保险状态", value: "接口待接入", status: "pending" }],
      clubInfo: pendingClubInfo(context),
    };
  }
}

export async function getCoachHome(date = DEV_TEST_DATE): Promise<CoachHome> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/home?date=${date}`,
  });
  return normalizeCoachHome(response, date);
}

export async function getCoachWorkbench(eventId: string): Promise<CoachWorkbench> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/workbench`,
  });
  return normalizeCoachWorkbench(response, eventId);
}

export async function saveCoachAttendance(eventId: string, roster: CoachWorkbench["roster"]) {
  const context = requireContext();
  const participants = roster
    .filter((student) => student.studentId)
    .map((student) => ({
      studentId: student.studentId,
      status: normalizeParticipantStatus(student.status),
    }));

  return request<Record<string, unknown>, { participants: Array<{ studentId: string; status: string }> }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/attendance`,
    method: "PUT",
    data: { participants },
    idempotent: true,
  });
}

export async function confirmCoachLesson(eventId: string, studentIds: string[]) {
  const context = requireContext();
  const session = getSession();

  return request<Record<string, unknown>, { studentIds: string[]; actorUserId?: string; note: string }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/lesson-confirmation`,
    method: "POST",
    data: {
      studentIds,
      actorUserId: session?.userId,
      note: "重庆天才小程序教练端确认销课",
    },
    idempotent: true,
  });
}

export async function correctCoachLesson(eventId: string, studentId: string, lessonDelta: number, reason: string) {
  const context = requireContext();
  const session = getSession();

  return request<Record<string, unknown>, {
    studentId: string;
    lessonDelta: number;
    actorUserId?: string;
    reason: string;
  }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/lesson-confirmation`,
    method: "PATCH",
    data: {
      studentId,
      lessonDelta,
      actorUserId: session?.userId,
      reason,
    },
    idempotent: true,
  });
}

export async function recordCoachMatch(input: {
  eventId: string;
  matchType: string;
  status: string;
  opponentName?: string;
  homeScore?: number;
  awayScore?: number;
}) {
  const context = requireContext();

  return request<Record<string, unknown>, typeof input>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/matches`,
    method: "POST",
    data: input,
    idempotent: true,
  });
}

export async function getAssessmentForm(templateId: string): Promise<AssessmentForm> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/assessments/templates/${templateId}/form`,
  });
  return normalizeAssessmentForm(response);
}

export async function submitCoachAssessment(input: {
  studentId: string;
  eventId?: string;
  templateId: string;
  templateVersionId?: string;
  rawResults: Array<{
    testItemId: string;
    metricId?: string;
    value: Record<string, unknown>;
    note?: string;
  }>;
}) {
  const context = requireContext();
  const session = getSession();
  const assessedByCoachId = resolveCoachProfileId(session?.userId);
  if (!assessedByCoachId) {
    throw new Error("教练身份 BFF 待接入，无法提交评测。");
  }

  return request<Record<string, unknown>, {
    studentId: string;
    templateId: string;
    templateVersionId?: string;
    assessedByCoachId: string;
    assessedAt: string;
    eventId?: string;
    summary: string;
    rawResults: Array<{
      testItemId: string;
      metricId?: string;
      value: Record<string, unknown>;
      note?: string;
    }>;
  }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/assessments`,
    method: "POST",
    data: {
      studentId: input.studentId,
      templateId: input.templateId,
      templateVersionId: input.templateVersionId,
      assessedByCoachId,
      assessedAt: new Date().toISOString(),
      eventId: input.eventId || undefined,
      summary: "重庆天才小程序教练端评测录入",
      rawResults: input.rawResults,
    },
    idempotent: true,
  });
}

export async function pendingWrite(label: string) {
  return {
    ok: false,
    title: `${label}接口待接入`,
    message: "小程序已预留 BFF 调用、requestId 和 Idempotency-Key；当前不会拼接 admin API。",
  };
}

function requireContext() {
  const context = getAppContext() ?? getSession();
  if (!context) {
    throw new Error("Mini-program context is not initialized");
  }
  return context;
}

function normalizeStudents(students: Array<Record<string, unknown>>): StudentSummary[] {
  return students.map((raw) => {
    const teams = Array.isArray(raw.teams) ? raw.teams : [];
    const teamNames = teams.map((team) => {
      if (typeof team === "string") return team;
      const item = team as Record<string, unknown>;
      return String(item.name ?? item.teamName ?? "");
    }).filter(Boolean);
    const coachNames = teams.map((team) => {
      if (typeof team === "string") return "";
      const item = team as Record<string, unknown>;
      return String(item.defaultCoachName ?? item.coachName ?? "");
    }).filter(Boolean);
    return {
      id: String(raw.id ?? raw.studentId ?? ""),
      name: String(raw.name ?? raw.studentName ?? "学员"),
      ageGroup: stringOrUndefined(raw.ageGroup ?? raw.currentLevel),
      teams: teamNames,
      coachNames: Array.from(new Set(coachNames)),
      trainingStatus: stringOrUndefined(raw.status ?? raw.trainingStatus),
    };
  }).filter((student) => student.id);
}

function normalizeEvents(events: Array<Record<string, unknown>>): ScheduleEvent[] {
  return events.map((raw) => normalizeEvent(raw)).filter((event) => event.id);
}

function normalizeEvent(raw: Record<string, unknown>): ScheduleEvent {
  const timeRange = raw.timeRange as { startsAt?: string; endsAt?: string } | undefined;
  const event = (raw.event && typeof raw.event === "object" ? raw.event : raw) as Record<string, unknown>;
  return {
    id: String(event.id ?? raw.id ?? ""),
    type: normalizeEventType(event.type ?? raw.type),
    title: String(event.title ?? raw.title ?? "活动"),
    startsAt: String(event.startsAt ?? raw.startsAt ?? timeRange?.startsAt ?? ""),
    endsAt: stringOrUndefined(event.endsAt ?? raw.endsAt ?? timeRange?.endsAt),
    venue: String(event.venue ?? event.locationName ?? raw.venue ?? raw.locationName ?? "地点待确认"),
    studentName: stringOrUndefined(event.studentName ?? raw.studentName),
    teamName: stringOrUndefined(event.teamName ?? raw.teamName),
    status: String(event.status ?? raw.status ?? "待确认"),
    summary: stringOrUndefined(event.summary ?? raw.summary),
  };
}

function normalizeActivityDetail(raw: Record<string, unknown>): ActivityDetail {
  const event = normalizeEvent((raw.event && typeof raw.event === "object" ? raw.event : raw) as Record<string, unknown>);
  const training = asRecord(raw.training);
  const match = asRecord(raw.match);
  const fields = [
    { label: "活动类型", value: typeLabel(event.type) },
    { label: "时间", value: compactRange(event.startsAt, event.endsAt) },
    { label: "地点", value: event.venue },
    { label: "队伍", value: event.teamName || "待同步" },
    { label: "状态", value: event.status },
  ];
  const sections = [
    {
      title: event.type === "match" ? "比赛摘要" : event.type === "training" ? "训练摘要" : "活动说明",
      items: [
        { label: "内容", value: String(training?.summary ?? match?.summary ?? event.summary ?? "课后结果待更新") },
        { label: "关联能力", value: String(training?.abilityTags ?? training?.abilitySummary ?? "能力标签待同步"), status: "pending" },
      ],
    },
    {
      title: "课时与出勤",
      items: [
        { label: "出勤", value: String(raw.attendanceStatus ?? "待更新") },
        { label: "销课", value: String(raw.lessonStatus ?? "待更新") },
      ],
    },
  ];
  return {
    id: event.id,
    type: event.type,
    title: event.title,
    status: event.status,
    fields,
    sections,
    pending: [{ title: "详情字段待补齐", message: "活动详情 BFF 可读；训练内容、课后摘要、课时状态按后端可见字段逐步补齐。" }],
  };
}

function pendingActivityDetail(eventId: string): ActivityDetail {
  return {
    id: eventId,
    type: "other",
    title: "活动详情待接入",
    status: "pending",
    fields: [{ label: "接口", value: "GET /clubs/:clubId/app-clients/:clientId/events/:eventId" }],
    sections: [],
    pending: [{ title: "活动详情 BFF 待接入", message: "当前仅保留页面结构，不拼接 admin API。" }],
  };
}

function normalizeGrowth(raw: Record<string, unknown>, student?: StudentSummary): GrowthSummary {
  const latest = Array.isArray(raw.latest) ? raw.latest : [];
  const radar = latest.map((item) => normalizeRadarMetric(item as Record<string, unknown>)).filter((item) => typeof item.value === "number");
  const metrics = radar.map((point) => ({
    metricId: point.metricId,
    label: point.label,
    value: `${point.value ?? "-"} / ${point.maxValue}`,
    peerAverage: point.peerAverage === undefined ? undefined : `${point.peerAverage}`,
  }));
  return {
    student,
    radar,
    milestones: [
      { title: "成长足迹", description: "成长里程碑聚合接口待接入，当前展示最新评测能力数据。" },
    ],
    trainingHistory: [
      { label: "训练历程", value: "训练次数、出勤率和能力覆盖聚合接口待接入" },
      { label: "更新时间", value: String(raw.updatedAt ?? raw.generatedAt ?? "以后端同步时间为准") },
    ],
    metricItems: metrics,
    updatedAt: stringOrUndefined(raw.updatedAt ?? raw.generatedAt),
  };
}

function normalizeRadarMetric(item: Record<string, unknown>): RadarMetricPoint {
  const metric = asRecord(item.metric);
  const record = asRecord(item.record);
  const value = asRecord(record?.value);
  const numericValue = numberOrUndefined(record?.numericValue ?? value?.score ?? value?.number);
  const maxValue = numberOrUndefined(metric?.maxScore) ?? inferMaxValue(value);
  return {
    metricId: String(metric?.id ?? item.metricId ?? "metric"),
    label: String(metric?.name ?? item.label ?? "指标"),
    value: numericValue,
    peerAverage: numberOrUndefined(item.peerAverage),
    maxValue,
  };
}

function normalizeStudentHome(raw: Record<string, unknown>, student: StudentSummary): StudentHome {
  const profile = asRecord(raw.profile);
  const status = asRecord(raw.status ?? raw.statusSummary);
  return {
    profile: [
      { label: "姓名", value: String(profile?.name ?? student.name) },
      { label: "年龄组", value: String(profile?.ageGroup ?? student.ageGroup ?? "待同步") },
      { label: "队伍", value: textOrPending(student.teams.join("、")) },
      { label: "教练", value: textOrPending(student.coachNames.join("、")) },
    ],
    lessonStatus: [
      { label: "剩余课时", value: String(status?.remainingLessons ?? status?.remainingClassHours ?? "待同步") },
      { label: "最近更新", value: String(raw.updatedAt ?? "以后端同步时间为准") },
    ],
    insuranceStatus: [
      { label: "保险状态", value: String(status?.insuranceStatus ?? "待同步") },
      { label: "到期日期", value: String(status?.insuranceExpiresAt ?? status?.insuranceEndDate ?? "待同步") },
    ],
    clubInfo: pendingClubInfo(requireContext()),
    updatedAt: stringOrUndefined(raw.updatedAt),
  };
}

function normalizeCoachHome(raw: Record<string, unknown>, date: string): CoachHome {
  const workbench = asRecord(raw.workbench) ?? raw;
  const events = Array.isArray(workbench.events) ? normalizeEvents(workbench.events as Array<Record<string, unknown>>) : [];
  const teams = Array.isArray(workbench.teams)
    ? (workbench.teams as unknown[]).map((team) => typeof team === "string" ? team : String((team as Record<string, unknown>).name ?? "")).filter(Boolean)
    : [];
  return {
    date,
    coachName: stringOrUndefined(workbench.coachName ?? raw.coachName),
    teams,
    events,
    pendingItems: [
      { label: "点名写入", value: "app-client BFF 已接入" },
      { label: "销课确认", value: "app-client BFF 已接入" },
      { label: "比赛摘要", value: "app-client BFF 已接入" },
      { label: "评测提交", value: "手动完整提交已接入" },
    ],
  };
}

function normalizeCoachWorkbench(raw: Record<string, unknown>, eventId: string): CoachWorkbench {
  const event = normalizeEvent((raw.event && typeof raw.event === "object" ? raw.event : { id: eventId, title: "活动" }) as Record<string, unknown>);
  const rosterContext = asRecord(raw.rosterContext);
  const participants = Array.isArray(rosterContext?.participants) ? rosterContext?.participants as Array<Record<string, unknown>> : [];
  const students = Array.isArray(rosterContext?.students) ? rosterContext?.students as Array<Record<string, unknown>> : [];
  const roster = (participants.length ? participants : students).map((item) => ({
    studentId: String(item.studentId ?? item.id ?? ""),
    name: String(item.studentName ?? item.name ?? "学员"),
    status: String(item.status ?? item.attendanceStatus ?? "待点名"),
    lessonAction: stringOrUndefined(item.lessonAction ?? item.lessonStatus),
  }));
  const workflow = asRecord(raw.workflow);
  const training = asRecord(raw.training);
  const match = asRecord(raw.match);
  const assessment = asRecord(raw.assessment);
  const templateVersions = Array.isArray(assessment?.templateVersions) ? assessment?.templateVersions as Array<Record<string, unknown>> : [];
  return {
    event,
    roster,
    workflow: [
      { label: "点名", value: boolStatus(workflow?.pendingAttendance, "待完成", "已完成"), status: workflow?.pendingAttendance ? "pending" : "ready" },
      { label: "销课", value: boolStatus(workflow?.pendingLessonConfirmation, "待确认", "已确认"), status: workflow?.pendingLessonConfirmation ? "pending" : "ready" },
      { label: "记录完善度", value: String(workflow?.completionStatus ?? workflow?.recordCompleteness ?? "待同步") },
    ],
    training: [
      { label: "训练记录", value: String(training?.title ?? training?.summary ?? "训练内容选择接口待接入") },
      { label: "能力覆盖", value: String(training?.abilityCoverage ?? "能力覆盖预览接口待接入") },
    ],
    match: [
      { label: "比赛记录", value: String(match?.summary ?? "可录入比赛摘要；球员事件/点评待完善") },
    ],
    assessmentTemplateId: stringOrUndefined(templateVersions[0]?.templateId ?? templateVersions[0]?.id),
    pending: [
      { title: "部分能力待完善", message: "点名、销课、比赛摘要和评测完整提交已接入 app-client BFF；训练内容保存、比赛球员事件和评测自动保存仍需补齐。" },
    ],
  };
}

function normalizeParticipantStatus(status: string) {
  const value = status.trim();
  if (value === "present" || value === "absent" || value === "late" || value === "leave_requested" || value === "excused") {
    return value;
  }
  if (value === "已到" || value === "出勤" || value === "confirmed" || value === "待点名") {
    return "present";
  }
  if (value === "请假") return "leave_requested";
  if (value === "缺勤") return "absent";
  if (value === "迟到") return "late";
  return "present";
}

function normalizeAssessmentForm(raw: Record<string, unknown>): AssessmentForm {
  const template = asRecord(raw.template);
  const version = asRecord(raw.templateVersion);
  const fieldsSource = Array.isArray(raw.fields) ? raw.fields : Array.isArray(raw.items) ? raw.items : Array.isArray(raw.bindings) ? raw.bindings : [];
  const fields = (fieldsSource as Array<Record<string, unknown>>).map((field, index) => {
    const testItem = asRecord(field.testItem) ?? field;
    const metric = asRecord(field.metric);
    const binding = asRecord(field.binding);
    return {
      id: String(testItem.id ?? field.id ?? `field-${index}`),
      metricId: stringOrUndefined(testItem.metricId ?? metric?.id ?? binding?.metricId),
      testItemId: stringOrUndefined(testItem.id ?? binding?.testItemId),
      label: String(testItem.name ?? testItem.label ?? field.label ?? "测试项目"),
      inputType: String(testItem.inputType ?? field.inputType ?? "number"),
      valueKind: String(testItem.valueKind ?? metric?.valueKind ?? field.valueKind ?? "score_0_100"),
      unit: stringOrUndefined(testItem.unit ?? metric?.unit),
      required: Boolean(testItem.required ?? field.required ?? binding?.role === "input"),
      bindingRole: stringOrUndefined(binding?.role),
    };
  }).filter((field) => field.testItemId && field.bindingRole !== "output" && field.bindingRole !== "display_only");
  return {
    templateId: String(template?.id ?? ""),
    templateName: String(template?.name ?? "评测表单"),
    templateVersionId: stringOrUndefined(version?.id),
    versionName: String(version?.name ?? version?.id ?? "当前版本"),
    fields,
    pending: [{ title: "自动保存待完善", message: "当前支持手动提交已输入项目；单格自动保存和缺测任务模型仍需 assessment-task BFF。" }],
  };
}

function resolveCoachProfileId(userId?: string) {
  if (!userId) return undefined;
  const devCoachIds = DEV_COACH_PROFILE_IDS as Record<string, string>;
  if (DEV_MODE && devCoachIds[userId]) return devCoachIds[userId];
  return undefined;
}

function normalizeEventType(type: unknown): ScheduleEvent["type"] {
  if (type === "training" || type === "match") return type;
  return "other";
}

function pendingClubInfo(context: AppContext) {
  return [
    { label: "俱乐部", value: context.capabilities.client?.name || "俱乐部信息待同步" },
    { label: "内容中心", value: "俱乐部信息、球场分布、青训帮助、教练团队内容接口待接入" },
  ];
}

function typeLabel(type: ScheduleEvent["type"]) {
  if (type === "training") return "训练";
  if (type === "match") return "比赛";
  return "活动";
}

function compactRange(start?: string, end?: string) {
  return [start, end].filter(Boolean).join(" - ") || "时间待确认";
}

function textOrPending(value: string) {
  return value || "待同步";
}

function boolStatus(value: unknown, pending: string, ready: string) {
  return value ? pending : ready;
}

function inferMaxValue(value: Record<string, unknown> | undefined) {
  if (value?.kind === "rating_1_5") return 5;
  if (value?.kind === "rating_1_10") return 10;
  return 100;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function stringOrUndefined(value: unknown) {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}

function numberOrUndefined(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
