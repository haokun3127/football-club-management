export type AppRole = "parent" | "coach";
export type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "pending";
export type PhoneBinding = "required" | "received" | "accepted" | "not_provided";

export interface Capabilities {
  client?: {
    id?: string;
    name?: string;
    theme?: {
      primaryColor?: string;
      pressedColor?: string;
      lightColor?: string;
    };
    roleEntrypoints?: Partial<Record<AppRole, string[]>>;
  };
  calendar?: {
    participantStatuses?: string[];
  };
  match?: {
    eventTypes?: string[];
  };
  assessment?: {
    views?: unknown[];
    viewNodes?: unknown[];
    templateVersions?: Array<{ id: string; templateId: string; name?: string }>;
  };
  features?: Record<string, boolean>;
}

export interface AppContext {
  clubId: string;
  clientId: string;
  capabilities: Capabilities;
}

export interface SessionState extends AppContext {
  role: AppRole;
  availableRoles: AppRole[];
  token: string;
  userId?: string;
  displayName?: string;
  phone?: string;
  phoneBinding?: PhoneBinding;
  currentStudentId?: string;
  expiresAt: string;
}

export interface LoginResult {
  clubId: string;
  client: { id: string };
  status: "authenticated" | "binding_required" | "role_configuration_required";
  phoneBinding: PhoneBinding;
  session: { token: string; expiresInSeconds: number; expiresAt: string; activeRole: AppRole | null } | null;
  role: AppRole | null;
  availableRoles: AppRole[];
  profile: { userId: string; displayName: string; phone?: string } | null;
  children: StudentSummary[];
  capabilities: Capabilities;
}

export interface StudentSummary {
  id: string;
  name: string;
  ageGroup?: string;
  teams: string[];
  coachNames: string[];
  trainingStatus?: string;
  teamStartsAt?: string;
}

export interface StudentHome {
  profile: Array<{ label: string; value: string }>;
  lessonStatus: Array<{ label: string; value: string; status?: string }>;
  insuranceStatus: Array<{ label: string; value: string; status?: string }>;
  clubInfo: Array<{ label: string; value: string }>;
  updatedAt?: string;
}

export interface ScheduleEvent {
  teamIds?: string[];
  id: string;
  type: "training" | "match" | "other";
  title: string;
  startsAt: string;
  endsAt?: string;
  venue: string;
  studentName?: string;
  childIds?: string[];
  children?: Array<{ id: string; name: string }>;
  teamName?: string;
  status: string;
  summary?: string;
  participantCount?: number;
  nextAction?: CoachTaskAction;
  nextActionLabel?: string;
  match?: {
    opponentName?: string;
    ageGroup?: string; competitionFormat?: string; handbookUrl?: string;
    homeScore?: number;
    awayScore?: number;
    status?: string;
  };
}

export type CoachTaskAction = "attendance" | "lesson" | "match" | "assessment" | "training" | "view";

export interface CoachTask {
  templateId?: string;
  taskId?: string;
  title?: string;
  teamId?: string;
  teamName?: string;
  periodLabel?: string;
  completedStudents?: number;
  totalStudents?: number;
  readyStudents?: number;
  eventId: string;
  eventType: ScheduleEvent["type"];
  action: CoachTaskAction;
  label: string;
  dueAt?: string;
}

export interface CoachTaskSummary {
  total: number;
  training: number;
  matches: number;
  pending: number;
  attendance?: { confirmed: number; total: number };
}

export interface CoachWeekStats {
  sessions: number;
  hours: number;
  attendanceRate: number | null;
}

export interface ActivityPresentation {
  startsAt: string;
  endsAt?: string;
  teamName?: string;
  venueName?: string;
  coachName?: string;
  training: null | {
    state: "planned" | "not_arranged" | "unavailable";
    summary: string;
    abilityTags: string[];
  };
}

export interface ActivityDetail {
  presentation: ActivityPresentation;
  match: null | { opponentName?: string; homeScore?: number; awayScore?: number; comment?: string };
  other: null | { description?: string; notice?: string };
  id: string;
  type: "training" | "match" | "other";
  title: string;
  status: string;
  participants: Array<{ studentId: string; name: string; status: string }>;
  fields: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; items: Array<{ label: string; value: string; status?: string }> }>;
  pending: Array<{ title: string; message: string }>;
  matchEvents?: Array<{
    id: string;
    type: CoachMatchPlayerEvent["type"];
    studentId: string;
    studentName?: string;
    minute?: number;
    note?: string;
  }>;
}

export interface RadarMetricPoint {
  overallScore?: number | null;
  metricId: string;
  label: string;
  value?: number;
  peerAverage?: number;
  maxValue: number;
  occurredAt?: string;
}

export interface MetricViewOption {
  id: string;
  name: string;
  metricIds: string[];
}

export interface MetricDetailRecord {
  id: string;
  value?: number;
  occurredAt: string;
  source: string;
  note?: string;
  eventId?: string;
}

export interface MetricDetail {
  metricId: string;
  label: string;
  unit?: string;
  maxValue?: number;
  description?: string;
  latest?: MetricDetailRecord;
  records: MetricDetailRecord[];
  sourceEvents: Array<{ recordId: string; eventId: string; title: string; type: ScheduleEvent["type"]; startsAt?: string }>;
}

export interface GrowthTrainingStats {
  totalTrainings: number;
  attendanceRate: number | null;
  lessonStats: {
    attendedLessons: number;
    expectedLessons: number;
    attendanceRate: number | null;
  };
  monthTrainings: number;
  monthly: Array<{ month: number; count: number }>;
}

export interface GrowthTimelineItem {
  id: string;
  kind: "training" | "match" | "ability_update" | "evaluation";
  teamId?: string;
  evaluationRevision?: number;
  occurredAt: string;
  title: string;
  subtitle: string;
  teamName?: string;
  venue?: string;
  eventId?: string;
  training?: {
    items: Array<{ trainingProjectId: string; name: string; score?: number; note?: string }>;
    lessonProgress?: { attendedLessons: number; expectedLessons: number };
  };
  match?: {
    opponentName?: string;
    scoreLabel?: string;
    events: Array<{ id: string; studentId: string; type: string; minute?: number; note?: string }>;
  };
  abilityUpdate?: {
    source: "training_content_assessment" | "semester_assessment";
    metrics: Array<{ metricId: string; label: string; value: number | null; previousValue: number | null }>;
  };
}

export interface GrowthSummary {
  evaluations?: Array<import("./student-evaluations").StudentEvaluation & { teamName: string }>;
  overall?: number | null;
  student?: StudentSummary;
  radar: RadarMetricPoint[];
  milestones: Array<{ title: string; description: string; date?: string }>;
  milestonesAvailable?: boolean;
  trainingHistory: Array<{ label: string; value: string }>;
  metricItems: Array<{ metricId: string; label: string; value: string; peerAverage?: string }>;
  views: MetricViewOption[];
  updatedAt?: string;
  trainingStats?: GrowthTrainingStats;
  timeline: GrowthTimelineItem[];
}

export interface CoachHome {
  clubName?: string;
  teamOptions?: Array<{ id: string; name: string }>;
  selectedTeamIds?: string[];
  date: string;
  dateRange: { from: string; to: string };
  coachName?: string;
  teams: string[];
  events: ScheduleEvent[];
  tasks: CoachTask[];
  summary: CoachTaskSummary;
  weekStats?: CoachWeekStats;
  pendingItems: Array<{ label: string; value: string }>;
}

export interface TrainingContentSummary {count:number;configuredMinutes:number|null;groups:Array<{id:string;label:string;items:Array<{id:string;name:string;configuredMinutes:number|null}>}>}

export interface CoachWorkbench {
  trainingContentRevision?: string;
  trainingRecords?: import("./training-records").TrainingRecord[];
  contentSummary?:TrainingContentSummary;
  canEditTraining?: boolean;
  canManageRoster?: boolean;
  event: ScheduleEvent;
  roster: Array<{ studentId: string; name: string; status: string; note?: string; lessonAction?: string; shouldConsume?: boolean; exceptionReason?: string; remainingLessons?: number }>;
  workflow: Array<{ label: string; value: string; status?: string }>;
  training: Array<{ label: string; value: string }>;
  selectedTrainingProjects: TrainingProject[];
  selectedTrainingProjectIds: string[];
  match: Array<{ label: string; value: string }>;
  assessmentTemplateId?: string;
  pending: Array<{ title: string; message: string }>;
}

export interface CoachTrainingContentAssessment {
  studentId: string;
  trainingProjectId: string;
  score: number;
  note?: string;
}

export interface CoachTrainingContentAssessmentScope {
  eventId: string;
  /** Absent only on an older service; writes must then stay disabled. */
  revision?: number;
  selectedProjectIds: string[];
  presentStudentIds: string[];
  assessments: CoachTrainingContentAssessment[];
}

export interface CoachMatchDetail {
  canManageRoster?: boolean;
  event: ScheduleEvent;
  roster: Array<{ studentId: string; name?: string; status?: string }>;
  match: {
    id: string;
    eventId?: string;
    matchType?: string;
    opponentName?: string;
    ageGroup?: string; competitionFormat?: string; handbookUrl?: string;
    homeScore?: number;
    awayScore?: number;
    status?: string;
  } | null;
  events: Array<{
    id: string;
    type: CoachMatchPlayerEvent["type"];
    studentId: string;
    minute?: number;
    note?: string;
    createdAt?: string;
  }>;
}

export interface FormationTemplate {
  name: string;
  label: string;
  positions: Array<{ positionLabel: string; x: number; y: number }>;
}

export interface TacticalBoardPlayer {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  role: "starter" | "substitute" | "reserve";
  positionLabel?: string;
  x: number;
  y: number;
}

export interface TacticalBoardState {
  event: { id: string; title: string; status: string };
  board: {
    id: string;
    eventId: string;
    formationName: string;
    players: TacticalBoardPlayer[];
    updatedAt: string;
  };
  roster: Array<{ studentId: string; displayName: string }>;
  saved: boolean;
  readOnly: boolean;
}

export interface TrainingProject {
  id: string;
  name: string;
  description?: string;
  metricIds: string[];
  metricNames?: string[];
  tags: string[];
  selected?: boolean;
  durationMinutes?: number;
  quantityLabel?: string;
  difficulty?: string;
  coachingPoints?: string[];
  imageSrc?: string;
}

export interface TrainingProjectGroup {
  id: string;
  name: string;
  projects: TrainingProject[];
}

export interface TrainingProjectTree {
  groups: TrainingProjectGroup[];
  projects: TrainingProject[];
  pending: Array<{ title: string; message: string }>;
  contentTree?: TrainingContentTree;
  team?: TrainingTeamOption | null;
  teamOptions?: TrainingTeamOption[];
}

export interface TrainingTeamOption {
  id: string;
  name: string;
  season?: string;
}

export interface TrainingContentDrill extends TrainingProject {
  metricNames: string[];
  coachingPoints: string[];
}

export interface TrainingContentMetricNode {
  id: string;
  metricId: string;
  label: string;
  level: 1 | 2 | 3;
  children: TrainingContentMetricNode[];
  drills: TrainingContentDrill[];
}

export interface TrainingContentTree {
  viewId: string;
  viewName: string;
  graphVersionId?: string;
  nodes: TrainingContentMetricNode[];
}

export interface CoachLessonConfirmation {
  participants: CoachWorkbench["roster"];
  ledgers: Array<{ studentId: string; remainingLessons?: number; balance?: number; status?: string; sourceIds?: string[] }>;
  pending: Array<{ title: string; message: string }>;
}

export interface CoachMatchPlayerEvent {
  type: "goal" | "assist" | "save" | "tackle" | "foul" | "yellow_card" | "red_card" | "penalty" | "own_goal";
  studentId: string;
  minute?: number;
  assistStudentId?: string;
  note?: string;
}

export interface CoachMatchEventCreateInput {
  studentId: string;
  type: CoachMatchPlayerEvent["type"];
  minute?: number;
  note?: string;
}

export interface CoachMatchEventCreateResult {
  event: {
    id: string;
    studentId: string;
    type: CoachMatchPlayerEvent["type"];
    minute?: number;
    note?: string;
  };
}

export interface AssessmentForm {
  templateId: string;
  templateName: string;
  templateVersionId?: string;
  versionName: string;
  fields: Array<{
    id: string;
    metricId?: string;
    testItemId?: string;
    label: string;
    inputType: string;
    valueKind: string;
    unit?: string;
    required: boolean;
    protocol?: string;
    groupId: string;
    groupLabel: string;
    minValue?: number;
    maxValue?: number;
    precision?: number;
  }>;
  pending: Array<{ title: string; message: string }>;
}

export interface CoachAssessmentEntries {
  entrySourcesByStudent?: Record<string, Record<string, {eventId?:string;occurredAt?:string;recordedAt?:string}>>;
  studentStates?: Record<string, { revision: number; publishedRevision: number | null }>;
  taskId: string;
  projectId: string;
  savedValuesByStudent: Record<string, Record<string, Record<string, unknown>>>;
}

export type AssessmentDraftStatus = "empty" | "recorded" | "missing";

export interface AssessmentDraftEntry {
  studentId: string;
  testItemId: string;
  status: AssessmentDraftStatus;
  rawValue: string;
  missingReason?: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  type: "event_upcoming" | "insurance_expiring" | "lesson_credit_low";
  severity: "info" | "warning" | "urgent";
  studentId: string;
  studentName: string;
  dueAt: string;
  event?: {
    id: string;
    type: string;
    title: string;
    startsAt: string;
    endsAt: string;
  };
  insurance?: {
    status: "expiring" | "expired";
    expiresAt?: string;
  };
  lessonCredit?: {
    balance: number;
  };
}

export interface PrivateLessonRequest {
  id: string;
  studentId: string;
  coachName: string;
  date: string;
  timeSlot: string;
  goals: string[];
  note?: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  createdAt: string;
}

export interface CoachTeamDetail {
  teamOptions?: Array<{ id: string; name: string }>;
  formalMatches?: Array<{ eventId: string; title: string; startsAt: string; venue: string | null; match: NonNullable<CoachMatchDetail["match"]> }>;
  team: { id: string; name: string; season: string } | null;
  stats: { memberCount: number; trainingCount: number; completedTrainingCount: number; attendanceRate: number | null };
  members: Array<{ id: string; name: string }>;
  coaches?: Array<{ id: string; name: string; role: string }>;
}

export interface CoachTeamAbilityOverview {
  studentCount: number;
  overall: number | null;
  trendDelta: number | null;
  students?: Array<{ studentId: string; overall: number | null }>;
  dimensions: Array<{
    metricId: string;
    label: string;
    average: number | null;
    top: number | null;
    bottom: number | null;
  }>;
}

export interface AssessmentCourse { id:string; title:string; occurredAt:string; studentIds:string[]; }

export interface AssessmentWorkflowSummary {
  testItemIds?: string[];
  courseSelectionRequired?: boolean;
  enabled: boolean;
  canEdit: boolean;
  templateVersionId: string;
  totalStudents: number;
  completedStudents: number;
  publishedStudents: number;
  readyStudents: number;
  students: Array<{ studentId: string; name: string; revision: number; completedFields: number; totalFields: number; publishedRevision: number | null; canPublish: boolean }>;
  error?: string;
}

export interface AssessmentWorkingHistory {
  entries?:Record<string,{testItemId:string;metricId?:string;value:Record<string,unknown>;eventId?:string;occurredAt?:string;recordedAt?:string}>;
  revision: number;
  changes: Array<{ revision: number; coachId: string; changedAt: string; reason?: string; entries: Array<{ testItemId: string; before: Record<string, unknown> | null; after: Record<string, unknown> }> }>;
  publications: Array<{ revision: number; assessmentId: string; coachId: string; publishedAt: string }>;
}

export interface CoachAssessmentTask {
  studentIds?: string[];
  testItemIds?: string[];
  sourceEventId?: string;
  workflow?: AssessmentWorkflowSummary;
  id: string;
  teamId: string;
  teamName?: string;
  termLabel: string;
  title: string;
  templateId: string;
  startsOn: string;
  dueOn: string;
  status: "not_started" | "in_progress" | "completed";
  completedStudents: number;
  totalStudents: number;
}

export interface ContentArticle {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  category: "venue" | "help" | "coach" | "guide" | "notice";
  body?: string;
  publishedAt?: string;
  expiresAt?: string;
}

export interface ContentFaq {
  id: string;
  q: string;
  a: string;
  category: string;
}

export interface VenueInfo {
  id: string;
  name: string;
  type: string;
  address: string;
  tags: string[];
  facilities: string[];
  latitude: number;
  longitude: number;
  monthlyCount: number;
}

export interface CoachStudentProfile {
  student: { id: string; name: string; age: number | null; school: string | null; dominantFoot: string | null; level: string | null; teams: Array<{ id: string; name: string; joinedAt: string }> };
  attendance: { expected: number; present: number; absent: number; leave: number; late: number; unrecorded: number; effectiveLessons: number; earlyLeave: number | null };
  records: Array<{ eventId: string; title: string; occurredAt: string; status: string; counted: boolean; source: string; revision: number; history: Array<{ revision: number; counted: boolean; source: string; reason: string; changedAt: string }> }>;
  training: { modules: Array<{ label: string; courses: number; configuredMinutes: number | null }>; participation: number; formalMatches: number; friendlyMatches: number | null; completionTargets: null };
}

export interface ClubCoachTeam {
  teamName: string;
  teamChips: string[];
  teamGoal: string;
  coaches: Array<{
    id: string;
    name: string;
    role: string;
    bio: string;
    wechatId?: string | null;
  }>;
}

export interface TrainingTemplateSummary { id: string; title: string; visibility: "private" | "club"; items: Array<{ id: string; name: string; configuredMinutes: number }>; configuredMinutes: number; }
export interface TrainingTransferSource { sourceEventId?: string; sourceTemplateId?: string; }
export interface TrainingTransferOutcome { items: TrainingTemplateSummary["items"]; count: number; configuredMinutes: number; }
export interface TrainingTransferPreview {
  source: { title: string; revision: string; items: TrainingTemplateSummary["items"]; excluded: string[]; count: number; configuredMinutes: number };
  targets: Array<{ eventId: string; title: string; startsAt: string; revision: string; existing: TrainingTemplateSummary["items"]; outcomes?: { merge: TrainingTransferOutcome; replace: TrainingTransferOutcome } }>;
}

export interface ConfirmedStudentResult {
  mapping?: { integerScore: number; grade: string; rawScoreVersionId: string; gradeVersionId: string; mappedAt: string } | null;
  id: string; assessmentId: string; taskId: string | null; testItemId: string; metricId: string;
  name: string; value: Record<string, unknown>; unit: string | null; templateVersionId: string | null;
  eventId: string | null; occurredAt: string; recordedAt: string;
}
