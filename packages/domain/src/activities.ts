import type { AuditFields, EntityId } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";

export interface OtherActivity extends AuditFields, ClubScoped {
  id: EntityId;
  eventId: EntityId;
  category: "club_visit" | "pro_match_visit" | "team_building" | "lecture" | "assessment_day" | "other";
  description?: string;
}
