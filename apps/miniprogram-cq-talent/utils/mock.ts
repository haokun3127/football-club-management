import type { AppContext, RadarMetricPoint, ScheduleEvent, SessionState, StudentSummary } from "./types";

export const mockContext: AppContext = {
  clubId: "club-chongqing-talent",
  clientId: "app-client-cq-talent-wechat-main",
  capabilities: {
    client: {
      id: "app-client-cq-talent-wechat-main",
      name: "重庆天才足球小程序",
      theme: {
        primaryColor: "#E60012",
        pressedColor: "#C4000F",
        lightColor: "#FFF1F0",
      },
      roleEntrypoints: {
        parent: ["schedule", "growth", "child"],
        coach: ["schedule", "training", "me"],
      },
    },
    calendar: {
      participantStatuses: ["present", "late", "absent", "leave", "no_charge"],
    },
    match: {
      eventTypes: ["goal", "assist", "appearance"],
    },
  },
};

export function createMockSession(role: "parent" | "coach"): SessionState {
  return {
    ...mockContext,
    role,
    token: `dev-${role}-session`,
    userName: role === "parent" ? "张小明家长" : "王教练",
    currentStudentId: role === "parent" ? "student-1" : undefined,
  };
}

export const mockStudents: StudentSummary[] = [
  {
    id: "student-1",
    name: "张小明",
    ageGroup: "U8",
    teams: ["U8精英队", "周末提高班"],
    coachNames: ["王教练", "李教练"],
  },
];

export const mockEvents: ScheduleEvent[] = [
  {
    id: "event-training-1",
    type: "training",
    title: "传接球与变向带球训练",
    startsAt: "2026-07-01 18:30",
    endsAt: "2026-07-01 20:00",
    venue: "奥体中心 3 号场",
    studentName: "张小明",
    teamName: "U8精英队",
    status: "未开始",
  },
  {
    id: "event-match-1",
    type: "match",
    title: "U8 友谊赛",
    startsAt: "2026-07-06 09:00",
    endsAt: "2026-07-06 10:20",
    venue: "大学城足球公园",
    studentName: "张小明",
    teamName: "U8精英队",
    status: "待赛",
  },
];

export const mockRadar: RadarMetricPoint[] = [
  { metricId: "ball-control", label: "控球", value: 75, peerAverage: 70, maxValue: 100 },
  { metricId: "passing", label: "传接球", value: 68, peerAverage: 72, maxValue: 100 },
  { metricId: "shooting", label: "射门", value: 71, peerAverage: 66, maxValue: 100 },
  { metricId: "speed", label: "速度", value: 82, peerAverage: 74, maxValue: 100 },
  { metricId: "decision", label: "决策", value: 64, peerAverage: 69, maxValue: 100 },
  { metricId: "spirit", label: "精神", value: 80, peerAverage: 76, maxValue: 100 },
];
