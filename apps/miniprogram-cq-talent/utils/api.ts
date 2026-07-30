import { APP_CLIENT_KEY, DEV_TEST_DATE } from "./config";
import { activityStatus, formatDateTime, formatTimeRange } from "./presentation";
import { request } from "./request";
import { getAppContext, getSession } from "./store";
import type {
  ActivityDetail,
  AppContext,
  AssessmentForm,
  CoachLessonConfirmation,
  CoachMatchPlayerEvent,
  CoachHome,
  CoachWorkbench,
  GrowthSummary,
  MetricDetail,
  LoginResult,
  RadarMetricPoint,
  ReminderItem,
  ScheduleEvent,
  StudentHome,
  StudentSummary,
  TrainingProjectTree,
  FormationTemplate,
  TacticalBoardPlayer,
  TacticalBoardState,
} from "./types";

export async function resolveClient() {
  return request<AppContext>({
    path: `/app-clients/resolve?clientKey=${APP_CLIENT_KEY}`,
  });
}

export async function wechatLogin(wxLoginCode: string, phoneCode?: string): Promise<LoginResult> {
  const context = requireContext();
  return request<LoginResult, { wxLoginCode: string; phoneCode?: string }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/wechat-login`,
    method: "POST",
    data: { wxLoginCode, phoneCode },
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

export async function getParentReminders(): Promise<ReminderItem[]> {
  const context = requireContext();
  const response = await request<{ reminders?: ReminderItem[] }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/reminders`,
  });
  return response.reminders ?? [];
}

export async function getParentCalendar(from?: string, to?: string) {
  const context = requireContext();
  const query = [
    from ? `from=${encodeURIComponent(from)}` : "",
    to ? `to=${encodeURIComponent(to)}` : "",
  ].filter(Boolean).join("&");
  const response = await request<{ events?: Array<Record<string, unknown>> }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/calendar${query ? `?${query}` : ""}`,
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

export async function getParentMetricDetail(studentId: string, metricId: string): Promise<MetricDetail> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/parent/students/${studentId}/ability-metrics/${metricId}`,
  });
  return normalizeMetricDetail(response, metricId);
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
      lessonStatus: [{ label: "课时状态", value: "数据同步中", status: "pending" }],
      insuranceStatus: [{ label: "保险状态", value: "数据同步中", status: "pending" }],
      clubInfo: pendingClubInfo(context),
    };
  }
}

export async function getCoachHome(range: string | { from: string; to: string } = DEV_TEST_DATE): Promise<CoachHome> {
  const context = requireContext();
  const query = typeof range === "string"
    ? `date=${encodeURIComponent(range)}`
    : `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/home?${query}`,
  });
  const from = typeof range === "string" ? range : range.from;
  const to = typeof range === "string" ? range : range.to;
  return normalizeCoachHome(response, from, to);
}

export async function getCoachWorkbench(eventId: string): Promise<CoachWorkbench> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/workbench`,
  });
  return normalizeCoachWorkbench(response, eventId);
}

export async function getCoachLessonConfirmation(eventId: string): Promise<CoachLessonConfirmation> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/lesson-confirmation`,
  });
  return normalizeLessonConfirmation(response);
}

export async function saveCoachAttendance(eventId: string, roster: CoachWorkbench["roster"]) {
  const context = requireContext();
  const participants = roster
    .filter((student) => student.studentId)
    .map((student) => {
      const status = normalizeParticipantStatus(student.status);
      if (!status) throw new Error(`请先完成${student.name}的点名`);
      return { studentId: student.studentId, status, note: student.note || undefined };
    });

  return request<Record<string, unknown>, { participants: Array<{ studentId: string; status: string; note?: string }> }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/attendance`,
    method: "PUT",
    data: { participants },
    idempotent: true,
  });
}

export async function confirmCoachLesson(eventId: string, studentIds: string[], note?: string) {
  const context = requireContext();
  const session = getSession();

  return request<Record<string, unknown>, { studentIds: string[]; actorUserId?: string; note: string }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/lesson-confirmation`,
    method: "POST",
    data: {
      studentIds,
      actorUserId: session?.userId,
      note: note || "重庆天才小程序教练端确认销课",
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
  events?: CoachMatchPlayerEvent[];
}) {
  const context = requireContext();

  return request<Record<string, unknown>, typeof input>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/matches`,
    method: "POST",
    data: input,
    idempotent: true,
  });
}

export async function getCoachTrainingProjectTree(): Promise<TrainingProjectTree> {
  const context = requireContext();
  const response = await request<Record<string, unknown>>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/training-project-tree`,
  });
  return normalizeTrainingProjectTree(response);
}

export async function getTacticalBoardFormations(): Promise<FormationTemplate[]> {
  const context = requireContext();
  const response = await request<{ formations: FormationTemplate[] }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/tactical-board/formations`,
  });
  return response.formations ?? [];
}

export async function getCoachTacticalBoard(eventId: string): Promise<TacticalBoardState> {
  const context = requireContext();
  return request<TacticalBoardState>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/tactical-board`,
  });
}

export async function saveCoachTacticalBoard(eventId: string, formationName: string, players: TacticalBoardPlayer[]): Promise<TacticalBoardState> {
  const context = requireContext();
  return request<TacticalBoardState, { formationName: string; players: TacticalBoardPlayer[] }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/tactical-board`,
    method: "PUT",
    data: { formationName, players },
    idempotent: true,
  });
}

export async function saveCoachTrainingProjects(eventId: string, projectIds: string[], note?: string) {
  const context = requireContext();
  return request<Record<string, unknown>, { projectIds: string[]; note?: string }>({
    path: `/clubs/${context.clubId}/app-clients/${context.clientId}/coach/events/${eventId}/training-projects`,
    method: "PUT",
    data: { projectIds, note },
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

  return request<Record<string, unknown>, {
    studentId: string;
    templateId: string;
    templateVersionId?: string;
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
      assessedAt: new Date().toISOString(),
      eventId: input.eventId || undefined,
      summary: "重庆天才小程序教练端评测录入",
      rawResults: input.rawResults,
    },
    idempotent: true,
  });
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
  const children = Array.isArray(raw.children) ? raw.children as Array<Record<string, unknown>> : [];
  const childIds = Array.isArray(raw.childIds)
    ? (raw.childIds as unknown[]).map(String).filter(Boolean)
    : children.map((child) => String(child.id ?? child.studentId ?? "")).filter(Boolean);
  const participants = Array.isArray(raw.participants) ? raw.participants : Array.isArray(raw.students) ? raw.students : [];
  return {
    id: String(event.id ?? raw.id ?? ""),
    type: normalizeEventType(event.type ?? raw.type),
    title: String(event.title ?? raw.title ?? "活动"),
    startsAt: String(event.startsAt ?? raw.startsAt ?? timeRange?.startsAt ?? ""),
    endsAt: stringOrUndefined(event.endsAt ?? raw.endsAt ?? timeRange?.endsAt),
    venue: String(event.venue ?? event.locationName ?? raw.venue ?? raw.locationName ?? "地点待确认"),
    studentName: stringOrUndefined(event.studentName ?? raw.studentName),
    childIds,
    children: children.map((child) => ({
      id: String(child.id ?? child.studentId ?? ""),
      name: String(child.name ?? child.studentName ?? "学员"),
    })).filter((child) => child.id),
    teamName: stringOrUndefined(event.teamName ?? raw.teamName),
    status: String(event.status ?? raw.status ?? "待确认"),
    summary: stringOrUndefined(event.summary ?? raw.summary),
    participantCount: participants.length || undefined,
  };
}

function normalizeActivityDetail(raw: Record<string, unknown>): ActivityDetail {
  const eventSource = (raw.event && typeof raw.event === "object" ? raw.event : raw) as Record<string, unknown>;
  const event = normalizeEvent(eventSource);
  const training = asRecord(raw.training ?? eventSource.trainingSession);
  const match = asRecord(raw.match ?? eventSource.match);
  const other = asRecord(raw.other ?? eventSource.otherActivity);
  const participants = Array.isArray(eventSource.participants) ? eventSource.participants as Array<Record<string, unknown>> : [];
  const participantStatus = participants.map((item) => statusLabel(item.status)).filter(Boolean).join("、") || "待更新";
  const fields = [
    { label: "活动类型", value: typeLabel(event.type) },
    { label: "时间", value: `${formatDateTime(event.startsAt)} · ${formatTimeRange(event.startsAt, event.endsAt)}` },
    { label: "地点", value: event.venue },
    { label: "队伍", value: event.teamName || "待确认" },
    { label: "状态", value: activityStatus(event.status).label },
  ];
  const sections = event.type === "training"
    ? [
      {
        title: "本次训练",
        items: [
          { label: "训练内容", value: String(training?.summary ?? event.summary ?? "教练尚未补充训练内容") },
          { label: "关联能力", value: listText(training?.abilityTags ?? training?.metricIds, "保存训练内容后显示") },
        ],
      },
      {
        title: "出勤与课时",
        items: [
          { label: "出勤", value: participantStatus },
          { label: "课时结果", value: String(raw.lessonStatus ?? "活动结束后更新") },
          { label: "课后摘要", value: String(training?.note ?? training?.observation ?? "活动结束后由教练补充") },
        ],
      },
    ]
    : event.type === "match"
      ? [
        {
          title: "比赛信息",
          items: [
            { label: "对手", value: String(match?.opponentName ?? "待确认") },
            { label: "比分", value: scoreText(match) },
            { label: "比赛类型", value: String(match?.matchType ?? "待确认") },
          ],
        },
        {
          title: "比赛过程",
          items: [
            { label: "关键事件", value: String(match?.summary ?? event.summary ?? "比赛结束后更新") },
            { label: "孩子表现", value: participantStatus === "待更新" ? "比赛结束后更新" : participantStatus },
          ],
        },
      ]
      : [
        {
          title: "活动说明",
          items: [
            { label: "内容", value: String(other?.description ?? event.summary ?? "暂无补充说明") },
            { label: "参与状态", value: participantStatus },
            { label: "通知", value: event.status === "cancelled" ? "活动已取消，请留意俱乐部通知" : "如有变更，俱乐部将另行通知" },
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
    pending: [],
  };
}

function pendingActivityDetail(eventId: string): ActivityDetail {
  return {
    id: eventId,
    type: "other",
    title: "暂时无法读取活动",
    status: "pending",
    fields: [],
    sections: [],
    pending: [{ title: "活动信息暂不可用", message: "请稍后重试；如持续无法查看，请联系俱乐部。" }],
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
  const assessment = asRecord(raw.assessment);
  const viewsSource = Array.isArray(assessment?.views) ? assessment.views as Array<Record<string, unknown>> : [];
  const nodesSource = Array.isArray(assessment?.viewNodes) ? assessment.viewNodes as Array<Record<string, unknown>> : [];
  const views = viewsSource
    .filter((view) => !view.status || view.status === "active")
    .map((view) => {
      const metricIds = nodesSource
        .filter((node) => node.viewId === view.id && node.metricId)
        .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0))
        .map((node) => String(node.metricId))
        .filter((metricId) => radar.some((point) => point.metricId === metricId));
      return { id: String(view.id ?? ""), name: String(view.name ?? "能力视图"), metricIds };
    })
    .filter((view) => view.id && view.metricIds.length >= 3 && view.metricIds.length <= 12)
    .sort((left, right) => Number(/雷达|radar/i.test(right.name)) - Number(/雷达|radar/i.test(left.name)));
  return {
    student,
    radar,
    milestones: [
      { title: "成长足迹", description: "成长记录正在积累，当前先展示最新评测能力数据。" },
    ],
    trainingHistory: [
      { label: "训练历程", value: "训练统计正在同步" },
      { label: "更新时间", value: String(raw.updatedAt ?? raw.generatedAt ?? "尚未同步") },
    ],
    metricItems: metrics,
    views: views.length ? views : [{ id: "default", name: "能力概览", metricIds: radar.map((point) => point.metricId) }],
    updatedAt: stringOrUndefined(raw.updatedAt ?? raw.generatedAt),
  };
}

function normalizeMetricDetail(raw: Record<string, unknown>, fallbackMetricId: string): MetricDetail {
  const metric = asRecord(raw.metric);
  const recordsSource = Array.isArray(raw.records) ? raw.records as Array<Record<string, unknown>> : [];
  const records = recordsSource.map((record) => ({
    id: String(record.id ?? ""),
    value: metricRecordNumber(record),
    occurredAt: String(record.occurredAt ?? record.updatedAt ?? ""),
    source: sourceLabel(record.source),
    note: stringOrUndefined(record.note),
    eventId: stringOrUndefined(record.eventId),
  })).filter((record) => record.id);
  const sourceEventsSource = Array.isArray(raw.sourceEvents) ? raw.sourceEvents as Array<Record<string, unknown>> : [];
  const sourceEvents = sourceEventsSource.map((item) => {
    const event = asRecord(item.event);
    const timeRange = asRecord(event?.timeRange);
    return {
      recordId: String(item.recordId ?? ""),
      eventId: String(event?.id ?? ""),
      title: String(event?.title ?? "相关活动"),
      type: normalizeEventType(event?.type),
      startsAt: stringOrUndefined(timeRange?.startsAt ?? event?.startsAt),
    };
  }).filter((item) => item.recordId && item.eventId);
  return {
    metricId: String(metric?.id ?? fallbackMetricId),
    label: String(metric?.name ?? "能力指标"),
    unit: userFacingMetricUnit(metric?.unit),
    description: userFacingMetricDescription(metric?.description),
    latest: records[0],
    records,
    sourceEvents: sourceEvents.filter((item, index) =>
      sourceEvents.findIndex((candidate) => candidate.eventId === item.eventId) === index,
    ),
  };
}

function userFacingMetricUnit(value: unknown) {
  const unit = stringOrUndefined(value);
  if (!unit) return undefined;
  return ({ score: "分", goal: "个", assist: "次" } as Record<string, string>)[unit] ?? unit;
}

function userFacingMetricDescription(value: unknown) {
  const description = stringOrUndefined(value);
  if (!description || /公式|权重|[=＋+*/]/.test(description)) return undefined;
  return description;
}

function metricRecordNumber(record: Record<string, unknown>) {
  const value = asRecord(record.value);
  return numberOrUndefined(record.numericValue ?? value?.score ?? value?.number ?? value?.count ?? value?.percentage ?? value?.minutes ?? value?.seconds ?? value?.meters ?? value?.value);
}

function sourceLabel(value: unknown) {
  const labels: Record<string, string> = {
    training_observation: "训练观察",
    match_event: "比赛记录",
    assessment: "阶段评测",
    fitness_test: "体能测试",
    manual_adjustment: "人工复核",
    algorithm: "系统计算",
  };
  const key = String(value ?? "");
  return labels[key] ?? "训练记录";
}

function normalizeRadarMetric(item: Record<string, unknown>): RadarMetricPoint {
  const metric = asRecord(item.metric);
  const record = asRecord(item.record);
  const value = asRecord(record?.value);
  const numericValue = numberOrUndefined(
    record?.numericValue
    ?? value?.score
    ?? value?.number
    ?? value?.value
    ?? value?.count
    ?? value?.percentage
    ?? value?.minutes
    ?? value?.seconds
    ?? value?.meters,
  );
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
  const profile = asRecord(raw.profile ?? raw.student);
  const status = asRecord(raw.status ?? raw.statusSummary);
  const lesson = asRecord(status?.lesson);
  const insurance = asRecord(status?.insurance);
  const sync = asRecord(status?.sync ?? raw.sync);
  const latestRun = asRecord(sync?.latestRun);
  const updatedAt = stringOrUndefined(lesson?.updatedAt ?? insurance?.updatedAt ?? latestRun?.updatedAt ?? raw.updatedAt);
  return {
    profile: [
      { label: "姓名", value: String(profile?.name ?? student.name) },
      { label: "年龄组", value: String(profile?.ageGroup ?? student.ageGroup ?? "未填写") },
      { label: "队伍", value: textOrPending(student.teams.join("、")) },
      { label: "教练", value: textOrPending(student.coachNames.join("、")) },
    ],
    lessonStatus: [
      { label: "剩余课时", value: lessonCountLabel(status?.lessonBalance ?? lesson?.balance ?? status?.remainingLessons ?? status?.remainingClassHours) },
      { label: "最近更新", value: updatedAt ? formatDateTime(updatedAt) : "尚未同步" },
    ],
    insuranceStatus: [
      { label: "保险状态", value: insuranceStatusLabel(insurance?.status ?? status?.insuranceStatus) },
      { label: "到期日期", value: String(insurance?.expiresAt ?? status?.insuranceExpiresAt ?? status?.insuranceEndDate ?? "未登记") },
    ],
    clubInfo: pendingClubInfo(requireContext()),
    updatedAt,
  };
}

function lessonCountLabel(value: unknown) {
  const count = numberOrUndefined(value);
  return count === undefined ? "请联系俱乐部核对" : `${count} 课时`;
}

function insuranceStatusLabel(value: unknown) {
  const labels: Record<string, string> = { active: "保障中", expired: "已到期", pending: "待审核", unknown: "未登记" };
  const key = String(value ?? "unknown").toLowerCase();
  return labels[key] ?? String(value ?? "未登记");
}

function normalizeCoachHome(raw: Record<string, unknown>, from: string, to: string): CoachHome {
  const workbench = asRecord(raw.workbench) ?? raw;
  const tasksSource = Array.isArray(workbench.tasks) ? workbench.tasks as Array<Record<string, unknown>> : [];
  const tasks = tasksSource.map((task) => ({
    eventId: String(task.eventId ?? ""),
    eventType: normalizeEventType(task.eventType),
    action: normalizeCoachTaskAction(task.action),
    label: String(task.label ?? "查看活动"),
    dueAt: stringOrUndefined(task.dueAt),
  })).filter((task) => task.eventId);
  const taskByEventId = new Map(tasks.map((task) => [task.eventId, task]));
  const events = Array.isArray(workbench.events)
    ? normalizeEvents(workbench.events as Array<Record<string, unknown>>).map((event) => {
      const task = taskByEventId.get(event.id);
      return { ...event, nextAction: task?.action, nextActionLabel: task?.label };
    })
    : [];
  const teams = Array.isArray(workbench.teams)
    ? (workbench.teams as unknown[]).map((team) => typeof team === "string" ? team : String((team as Record<string, unknown>).name ?? "")).filter(Boolean)
    : [];
  return {
    date: from,
    dateRange: { from, to },
    coachName: stringOrUndefined(workbench.coachName ?? raw.coachName),
    teams,
    events,
    tasks,
    summary: normalizeCoachSummary(asRecord(workbench.summary), events, tasks.length),
    pendingItems: [],
  };
}

function normalizeCoachWorkbench(raw: Record<string, unknown>, eventId: string): CoachWorkbench {
  const event = normalizeEvent((raw.event && typeof raw.event === "object" ? raw.event : { id: eventId, title: "活动" }) as Record<string, unknown>);
  const rosterContext = asRecord(raw.rosterContext);
  const participants = Array.isArray(rosterContext?.participants) ? rosterContext?.participants as Array<Record<string, unknown>> : [];
  const students = Array.isArray(rosterContext?.students) ? rosterContext?.students as Array<Record<string, unknown>> : [];
  const studentsById = new Map(students.map((student) => [String(student.id ?? student.studentId ?? ""), student]));
  const roster = (participants.length ? participants : students).map((item) => ({
    studentId: String(item.studentId ?? item.id ?? ""),
    name: String(item.studentName ?? item.name ?? studentsById.get(String(item.studentId ?? item.id ?? ""))?.name ?? "学员"),
    status: String(item.attendanceStatus ?? item.checkInStatus ?? "pending"),
    note: stringOrUndefined(item.note ?? item.attendanceNote),
    lessonAction: stringOrUndefined(item.lessonAction ?? item.lessonStatus),
    shouldConsume: item.shouldConsume === undefined ? true : Boolean(item.shouldConsume),
    exceptionReason: stringOrUndefined(item.exceptionReason),
    remainingLessons: numberOrUndefined(item.remainingLessons ?? item.remainingClassHours ?? item.balance),
  }));
  const workflow = asRecord(raw.workflow);
  const training = asRecord(raw.training);
  const match = asRecord(raw.match);
  const assessment = asRecord(raw.assessment);
  const templateVersions = Array.isArray(assessment?.templateVersions) ? assessment?.templateVersions as Array<Record<string, unknown>> : [];
  const preferredTemplateVersion = templateVersions.find((version) =>
    String(version.templateId ?? version.id ?? "").includes("cq-talent-elite"),
  ) ?? templateVersions[0];
  const selectedProjectsSource = Array.isArray(training?.projects) ? training.projects as Array<Record<string, unknown>> : [];
  const selectedTrainingProjects = selectedProjectsSource.map(normalizeTrainingProject).filter((project) => project.id);
  const selectedTrainingProjectIds = Array.isArray(training?.selectedProjectIds)
    ? (training.selectedProjectIds as unknown[]).map(String).filter(Boolean)
    : selectedTrainingProjects.map((project) => project.id);
  return {
    event,
    roster,
    workflow: [
      { label: "点名", value: boolStatus(workflow?.pendingAttendance, "待完成", "已完成"), status: workflow?.pendingAttendance ? "pending" : "ready" },
      { label: "销课", value: boolStatus(workflow?.pendingLessonConfirmation, "待确认", "已确认"), status: workflow?.pendingLessonConfirmation ? "pending" : "ready" },
      { label: "记录完善度", value: String(workflow?.completionStatus ?? workflow?.recordCompleteness ?? "待同步") },
    ],
    training: [
      { label: "训练项目", value: selectedTrainingProjects.length ? `${selectedTrainingProjects.length} 项` : "尚未设置" },
      { label: "能力覆盖", value: String(training?.abilityCoverage ?? "保存后生成覆盖摘要") },
    ],
    selectedTrainingProjects,
    selectedTrainingProjectIds,
    match: [
      { label: "比赛记录", value: String(match?.summary ?? "可录入比赛摘要和进球/助攻等球员事件") },
    ],
    assessmentTemplateId: stringOrUndefined(preferredTemplateVersion?.templateId ?? preferredTemplateVersion?.id),
    pending: [],
  };
}

function normalizeLessonConfirmation(raw: Record<string, unknown>): CoachLessonConfirmation {
  const participants = Array.isArray(raw.participants) ? raw.participants as Array<Record<string, unknown>> : [];
  const ledgers = Array.isArray(raw.ledgers) ? raw.ledgers as Array<Record<string, unknown>> : [];
  const ledgerByStudentId = new Map<string, Record<string, unknown>>();
  ledgers.forEach((ledger) => {
    const studentId = String(ledger.studentId ?? "");
    if (studentId) ledgerByStudentId.set(studentId, ledger);
  });
  return {
    participants: participants.map((item) => {
      const studentId = String(item.studentId ?? item.id ?? "");
      const ledger = ledgerByStudentId.get(studentId);
      return {
        studentId,
        name: String(item.studentName ?? item.name ?? "学员"),
        status: String(item.status ?? item.attendanceStatus ?? "待确认"),
        lessonAction: stringOrUndefined(item.lessonAction ?? item.lessonStatus),
        shouldConsume: item.shouldConsume === undefined ? true : Boolean(item.shouldConsume),
        exceptionReason: stringOrUndefined(item.exceptionReason),
        remainingLessons: numberOrUndefined(item.remainingLessons ?? item.remainingClassHours ?? item.balance ?? ledger?.balanceAfter ?? ledger?.remainingLessons),
      };
    }).filter((item) => item.studentId),
    ledgers: ledgers.map((ledger) => ({
      studentId: String(ledger.studentId ?? ""),
      remainingLessons: numberOrUndefined(ledger.remainingLessons ?? ledger.balanceAfter),
      balance: numberOrUndefined(ledger.balance ?? ledger.balanceAfter),
      status: stringOrUndefined(ledger.status),
    })).filter((ledger) => ledger.studentId),
    pending: [{ title: "课时余额", message: ledgers.length ? "余额已按最近一次课时记录更新。" : "余额暂未核对时仍可确认，俱乐部会按课时规则更新。" }],
  };
}

function normalizeTrainingProjectTree(raw: Record<string, unknown>): TrainingProjectTree {
  const dimensions = Array.isArray(raw.dimensions) ? raw.dimensions as Array<Record<string, unknown>> : [];
  const projects = Array.isArray(raw.projects) ? raw.projects as Array<Record<string, unknown>> : [];
  const normalizedProjects = projects.map(normalizeTrainingProject).filter((project) => project.id);
  const groups = dimensions.map((dimension) => {
    const dimensionId = String(dimension.id ?? "");
    const objectives = Array.isArray(dimension.objectives) ? dimension.objectives as Array<Record<string, unknown>> : [];
    const objectiveProjects = objectives.flatMap((objective) => {
      const source = Array.isArray(objective.projects) ? objective.projects as Array<Record<string, unknown>> : [];
      return source.map(normalizeTrainingProject).filter((project) => project.id);
    });
    const groupProjects = objectiveProjects.length ? objectiveProjects : normalizedProjects.slice(0, 8);
    return {
      id: dimensionId || String(dimension.name ?? "group"),
      name: String(dimension.name ?? "训练分组"),
      projects: groupProjects.length ? groupProjects : normalizedProjects.slice(0, 8),
    };
  }).filter((group) => group.id);
  return {
    groups: groups.length ? groups : [{ id: "all", name: "训练项目", projects: normalizedProjects }],
    projects: normalizedProjects,
    pending: normalizedProjects.length ? [] : [{ title: "暂无训练项目", message: "当前还没有可选项目，请联系俱乐部完善训练内容。" }],
  };
}

function normalizeTrainingProject(project: Record<string, unknown>) {
  const metricIds = Array.isArray(project.metricIds) ? (project.metricIds as unknown[]).map(String).filter(Boolean) : [];
  const tags = Array.isArray(project.tags) ? (project.tags as unknown[]).map(String).filter(Boolean) : [];
  return {
    id: String(project.id ?? ""),
    name: String(project.name ?? project.title ?? "训练项目"),
    description: stringOrUndefined(project.description ?? project.summary),
    metricIds,
    tags,
  };
}

function normalizeCoachTaskAction(value: unknown): "attendance" | "lesson" | "match" | "assessment" | "training" | "view" {
  if (value === "attendance" || value === "lesson" || value === "match" || value === "assessment" || value === "training") {
    return value;
  }
  return "view";
}

function normalizeCoachSummary(raw: Record<string, unknown> | undefined, events: ScheduleEvent[], taskCount: number) {
  return {
    total: numberOrUndefined(raw?.total) ?? events.length,
    training: numberOrUndefined(raw?.training) ?? events.filter((event) => event.type === "training").length,
    matches: numberOrUndefined(raw?.matches) ?? events.filter((event) => event.type === "match").length,
    pending: numberOrUndefined(raw?.pending) ?? taskCount,
  };
}

function normalizeParticipantStatus(status: string): "present" | "absent" | "late" | "leave_requested" | "excused" | undefined {
  const value = status.trim();
  if (value === "present" || value === "absent" || value === "late" || value === "leave_requested" || value === "excused") {
    return value;
  }
  if (value === "已到" || value === "出勤") {
    return "present";
  }
  if (value === "请假") return "leave_requested";
  if (value === "缺勤") return "absent";
  if (value === "迟到") return "late";
  return undefined;
}

function normalizeAssessmentForm(raw: Record<string, unknown>): AssessmentForm {
  const template = asRecord(raw.template);
  const version = asRecord(raw.templateVersion);
  const fieldsSource = Array.isArray(raw.fields) ? raw.fields : Array.isArray(raw.items) ? raw.items : Array.isArray(raw.bindings) ? raw.bindings : [];
  const fields = (fieldsSource as Array<Record<string, unknown>>).map((field, index) => {
    const testItem = asRecord(field.testItem) ?? field;
    const metric = asRecord(field.metric);
    const binding = asRecord(field.binding);
    const dimension = asRecord(field.dimension);
    return {
      id: String(testItem.id ?? field.id ?? `field-${index}`),
      metricId: stringOrUndefined(testItem.metricId ?? metric?.id ?? binding?.metricId),
      testItemId: stringOrUndefined(testItem.id ?? binding?.testItemId),
      label: String(testItem.name ?? testItem.label ?? field.label ?? "测试项目"),
      inputType: String(testItem.inputType ?? field.inputType ?? "number"),
      valueKind: String(testItem.valueKind ?? metric?.valueKind ?? field.valueKind ?? "score_0_100"),
      unit: userFacingMetricUnit(testItem.unit ?? metric?.unit),
      required: Boolean(testItem.required ?? field.required ?? binding?.role === "input"),
      protocol: userFacingAssessmentProtocol(testItem.protocol),
      groupId: String(dimension?.id ?? metric?.dimensionId ?? "other"),
      groupLabel: String(dimension?.name ?? "其他项目"),
      minValue: numberOrUndefined(testItem.minValue ?? field.minValue),
      maxValue: numberOrUndefined(testItem.maxValue ?? binding?.maxScore ?? metric?.maxScore),
      precision: numberOrUndefined(testItem.precision ?? field.precision),
      bindingRole: stringOrUndefined(binding?.role),
    };
  }).filter((field) => field.testItemId && field.bindingRole !== "output" && field.bindingRole !== "display_only");
  return {
    templateId: String(template?.id ?? ""),
    templateName: String(template?.name ?? "评测表单"),
    templateVersionId: stringOrUndefined(version?.id),
    versionName: userFacingVersionName(version?.name ?? version?.id),
    fields,
    pending: [{ title: "保存提示", message: "当前填写完成后统一提交，请在离开页面前确认保存。" }],
  };
}

function userFacingAssessmentProtocol(value: unknown) {
  const protocol = stringOrUndefined(value);
  if (!protocol || /公式|来源：.*第\d+行|[A-Z]\d+/.test(protocol)) return undefined;
  return protocol;
}

function userFacingVersionName(value: unknown) {
  const name = stringOrUndefined(value);
  if (!name || /assessment-template|version-/i.test(name)) return "当前版本";
  return name;
}

function normalizeEventType(type: unknown): ScheduleEvent["type"] {
  if (type === "training" || type === "match") return type;
  return "other";
}

function pendingClubInfo(context: AppContext) {
  return [
    { label: "俱乐部", value: context.capabilities.client?.name || "俱乐部信息待同步" },
    { label: "俱乐部服务", value: "俱乐部信息、球场和教练团队内容正在整理" },
  ];
}

function typeLabel(type: ScheduleEvent["type"]) {
  if (type === "training") return "训练";
  if (type === "match") return "比赛";
  return "活动";
}

function textOrPending(value: string) {
  return value || "待同步";
}

function boolStatus(value: unknown, pending: string, ready: string) {
  return value ? pending : ready;
}

function listText(value: unknown, fallback: string) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join("、") || fallback;
  return value ? String(value) : fallback;
}

function scoreText(match: Record<string, unknown> | undefined) {
  const home = numberOrUndefined(match?.homeScore);
  const away = numberOrUndefined(match?.awayScore);
  return home === undefined || away === undefined ? "比赛结束后更新" : `${home} : ${away}`;
}

function statusLabel(value: unknown) {
  const labels: Record<string, string> = {
    invited: "待确认",
    confirmed: "已确认",
    present: "已到课",
    absent: "缺席",
    late: "迟到",
    leave_requested: "请假",
    excused: "免扣",
  };
  const key = String(value ?? "");
  return labels[key] ?? key;
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
