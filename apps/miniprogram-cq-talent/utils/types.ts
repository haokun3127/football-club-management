export type AppRole = "parent" | "coach";
export type LoadState = "idle" | "loading" | "ready" | "empty" | "error" | "pending";

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
  currentStudentId?: string;
  expiresAt: string;
}

export interface LoginResult {
  clubId: string;
  client: { id: string };
  status: "authenticated" | "binding_required";
  phoneBinding: "required" | "received" | "accepted" | "not_provided";
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
}

export interface StudentHome {
  profile: Array<{ label: string; value: string }>;
  lessonStatus: Array<{ label: string; value: string; status?: string }>;
  insuranceStatus: Array<{ label: string; value: string; status?: string }>;
  clubInfo: Array<{ label: string; value: string }>;
  updatedAt?: string;
}

export interface ScheduleEvent {
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
}

export type CoachTaskAction = "attendance" | "lesson" | "match" | "assessment" | "training" | "view";

export interface CoachTask {
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
}

export interface ActivityDetail {
  id: string;
  type: "training" | "match" | "other";
  title: string;
  status: string;
  participants: Array<{ studentId: string; name: string; status: string }>;
  fields: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; items: Array<{ label: string; value: string; status?: string }> }>;
  pending: Array<{ title: string; message: string }>;
}

export interface RadarMetricPoint {
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
  description?: string;
  latest?: MetricDetailRecord;
  records: MetricDetailRecord[];
  sourceEvents: Array<{ recordId: string; eventId: string; title: string; type: ScheduleEvent["type"]; startsAt?: string }>;
}

export interface GrowthSummary {
  student?: StudentSummary;
  radar: RadarMetricPoint[];
  milestones: Array<{ title: string; description: string; date?: string }>;
  trainingHistory: Array<{ label: string; value: string }>;
  metricItems: Array<{ metricId: string; label: string; value: string; peerAverage?: string }>;
  views: MetricViewOption[];
  updatedAt?: string;
}

export interface CoachHome {
  date: string;
  dateRange: { from: string; to: string };
  coachName?: string;
  teams: string[];
  events: ScheduleEvent[];
  tasks: CoachTask[];
  summary: CoachTaskSummary;
  pendingItems: Array<{ label: string; value: string }>;
}

export interface CoachWorkbench {
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

export interface CoachMatchDetail {
  event: ScheduleEvent;
  roster: Array<{ studentId: string; name?: string; status?: string }>;
  match: {
    id: string;
    eventId?: string;
    matchType?: string;
    opponentName?: string;
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
  tags: string[];
  selected?: boolean;
  durationMinutes?: number;
  difficulty?: string;
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
}

export interface CoachLessonConfirmation {
  participants: CoachWorkbench["roster"];
  ledgers: Array<{ studentId: string; remainingLessons?: number; balance?: number; status?: string }>;
  pending: Array<{ title: string; message: string }>;
}

export interface CoachMatchPlayerEvent {
  type: "goal" | "assist" | "save" | "tackle" | "yellow_card" | "red_card" | "penalty" | "own_goal";
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
  team: { id: string; name: string; season: string } | null;
  stats: { memberCount: number; trainingCount: number; attendanceRate: number | null };
  members: Array<{ id: string; name: string }>;
}

export interface CoachTeamAbilityOverview {
  studentCount: number;
  overall: number | null;
  trendDelta: number | null;
  dimensions: Array<{
    metricId: string;
    label: string;
    average: number | null;
    top: number | null;
    bottom: number | null;
  }>;
}

export interface CoachTrainingCoverageStudent {
  studentId: string;
  name: string;
  coveredCount: number;
  totalCount: number;
  dimensions: Array<{
    dimensionId: string;
    label: string;
    covered: boolean;
    scorePercent: number | null;
  }>;
}

export interface CoachAssessmentTask {
  id: string;
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
  category: "venue" | "help" | "coach" | "guide";
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

export interface ClubCoachTeam {
  teamName: string;
  teamChips: string[];
  teamGoal: string;
  coaches: Array<{
    id: string;
    name: string;
    role: string;
    bio: string;
  }>;
}
