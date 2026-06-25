import type { AuditFields, EntityId } from "./primitives.js";

export interface OtherActivity extends AuditFields {
  id: EntityId;
  eventId: EntityId;
  category: "club_visit" | "pro_match_visit" | "team_building" | "lecture" | "assessment_day" | "other";
  description?: string;
}
