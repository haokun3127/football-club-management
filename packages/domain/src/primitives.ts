export type EntityId = string;
export type ISODateTimeString = string;

export interface TimeRange {
  startsAt: ISODateTimeString;
  endsAt: ISODateTimeString;
}

export interface AuditFields {
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface NamedEntity extends AuditFields {
  id: EntityId;
  name: string;
}

export function isValidTimeRange(range: TimeRange): boolean {
  return Date.parse(range.startsAt) < Date.parse(range.endsAt);
}

export function timeRangesOverlap(left: TimeRange, right: TimeRange): boolean {
  return Date.parse(left.startsAt) < Date.parse(right.endsAt)
    && Date.parse(right.startsAt) < Date.parse(left.endsAt);
}
