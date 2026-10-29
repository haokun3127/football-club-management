import type { PlayerMetricRecord } from "@football-club/domain";

/** Both stores supply newest append order first; stable sort retains it for exact ties. */
export function compareMetricRecordTimes(left: PlayerMetricRecord, right: PlayerMetricRecord): number {
  return Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
    || Date.parse(right.createdAt) - Date.parse(left.createdAt);
}
