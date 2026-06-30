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
  teamName?: string;
  status: string;
  summary?: string;
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

export interface GrowthSummary {
  student?: StudentSummary;
  radar: RadarMetricPoint[];
  milestones: Array<{ title: string; description: string; date?: string }>;
  trainingHistory: Array<{ label: string; value: string }>;
  metricItems: Array<{ metricId: string; label: string; value: string; peerAverage?: string }>;
  updatedAt?: string;
}

export interface CoachHome {
  date: string;
  coachName?: string;
  teams: string[];
  events: ScheduleEvent[];
  pendingItems: Array<{ label: string; value: string }>;
}

export interface CoachWorkbench {
  event: ScheduleEvent;
  roster: Array<{ studentId: string; name: string; status: string; lessonAction?: string }>;
  workflow: Array<{ label: string; value: string; status?: string }>;
  training: Array<{ label: string; value: string }>;
  match: Array<{ label: string; value: string }>;
  assessmentTemplateId?: string;
  pending: Array<{ title: string; message: string }>;
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
  }>;
  pending: Array<{ title: string; message: string }>;
}
