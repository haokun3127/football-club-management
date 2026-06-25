import type { AuditFields, EntityId } from "./primitives.js";

export type UserRole = "admin" | "coach" | "parent" | "student";

export interface UserAccount extends AuditFields {
  id: EntityId;
  displayName: string;
  phone?: string;
  roles: UserRole[];
  status: "active" | "inactive";
}

export interface ParentProfile extends AuditFields {
  id: EntityId;
  userId: EntityId;
  name: string;
  phone: string;
}

export interface StudentProfile extends AuditFields {
  id: EntityId;
  name: string;
  birthDate: string;
  gender?: "male" | "female" | "unspecified";
  dominantFoot?: "left" | "right" | "both" | "unknown";
  currentLevel?: string;
  notes?: string;
}

export interface StudentGuardianBinding extends AuditFields {
  id: EntityId;
  studentId: EntityId;
  parentId: EntityId;
  relationship: "father" | "mother" | "guardian" | "other";
  isPrimaryContact: boolean;
}

export interface CoachProfile extends AuditFields {
  id: EntityId;
  userId: EntityId;
  name: string;
  specialties: string[];
  status: "active" | "inactive";
}
