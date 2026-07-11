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
  token: string;
  userId?: string;
  displayName?: string;
  currentStudentId?: string;
  expiresAt: string;
}

export interface LoginResult {
  status: "authenticated" | "binding_required";
  phoneBinding: "required" | "received" | "accepted" | "not_provided";
  session: { token: string; expiresInSeconds: number } | null;
  role: AppRole | null;
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
