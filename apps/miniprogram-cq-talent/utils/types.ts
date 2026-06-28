export type AppRole = "parent" | "coach";

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
  userName: string;
  currentStudentId?: string;
}

export interface StudentSummary {
  id: string;
  name: string;
  ageGroup: string;
  teams: string[];
  coachNames: string[];
}

export interface ScheduleEvent {
  id: string;
  type: "training" | "match" | "other";
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  studentName?: string;
  teamName?: string;
  status: string;
}

export interface RadarMetricPoint {
  metricId: string;
  label: string;
  value?: number;
  peerAverage?: number;
  maxValue: number;
}
