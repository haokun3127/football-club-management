import type { SeedData } from "./types.js";
import { chongqingTalentClubId as clubId, seedNow as now } from "./types.js";

export function createPlatformSeed(): Pick<
  SeedData,
  | "clubs"
  | "clubMemberships"
  | "featureFlags"
  | "policies"
  | "customFields"
  | "users"
  | "parents"
  | "students"
  | "guardianBindings"
  | "coaches"
  | "teams"
  | "teamMembers"
> {
  return {
    clubs: [
      {
        id: clubId,
        name: "重庆天才足球俱乐部",
        code: "cq-talent",
        timezone: "Asia/Hong_Kong",
        locale: "zh-CN",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [
      {
        id: "user-admin-1",
        displayName: "王管理员",
        roles: ["admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-coach-1",
        displayName: "陈教练",
        phone: "13900000000",
        roles: ["coach"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-parent-1",
        displayName: "李明家长",
        phone: "13800000000",
        roles: ["parent"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    clubMemberships: [
      {
        id: "club-member-admin-1",
        clubId,
        userId: "user-admin-1",
        roles: ["admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "club-member-coach-1",
        clubId,
        userId: "user-coach-1",
        roles: ["coach"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "club-member-parent-1",
        clubId,
        userId: "user-parent-1",
        roles: ["parent"],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    featureFlags: [
      {
        id: "feature-matches",
        clubId,
        feature: "matches",
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "feature-private-lessons",
        clubId,
        feature: "private_lessons",
        enabled: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    policies: [
      {
        id: "policy-match-event-types",
        clubId,
        key: "match_event_types",
        value: ["goal", "assist", "save", "tackle"],
        version: "1.0.0",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    customFields: [
      {
        id: "custom-student-school",
        clubId,
        target: "student",
        key: "school",
        label: "School",
        valueKind: "text",
        required: false,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    parents: [
      {
        id: "parent-1",
        clubId,
        userId: "user-parent-1",
        name: "李明家长",
        phone: "13800000000",
        createdAt: now,
        updatedAt: now,
      },
    ],
    students: [
      {
        id: "student-1",
        clubId,
        name: "李明",
        birthDate: "2015-05-01",
        gender: "male",
        dominantFoot: "right",
        currentLevel: "U10 development",
        createdAt: now,
        updatedAt: now,
      },
    ],
    guardianBindings: [
      {
        id: "guardian-1",
        clubId,
        studentId: "student-1",
        parentId: "parent-1",
        relationship: "father",
        isPrimaryContact: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    coaches: [
      {
        id: "coach-1",
        clubId,
        userId: "user-coach-1",
        name: "陈教练",
        specialties: ["technical", "U10"],
        status: "active",
        wechatId: "cq-coach-chen",
        createdAt: now,
        updatedAt: now,
      },
    ],
    teams: [
      {
        id: "team-u10-dev",
        clubId,
        name: "U10发展队",
        ageGroup: "U10",
        level: "development",
        defaultCoachId: "coach-1",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "team-weekend-select",
        clubId,
        name: "周末精英队",
        ageGroup: "U10-U12",
        level: "advanced",
        defaultCoachId: "coach-1",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    teamMembers: [
      {
        id: "team-member-1",
        clubId,
        teamId: "team-u10-dev",
        studentId: "student-1",
        startsAt: "2026-06-01",
        isPrimaryTeam: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "team-member-2",
        clubId,
        teamId: "team-weekend-select",
        studentId: "student-1",
        startsAt: "2026-06-15",
        isPrimaryTeam: false,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
