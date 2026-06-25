import type { EntityId, ISODateTimeString } from "./primitives.js";

export type DomainEventName =
  | "calendar.event_scheduled"
  | "calendar.participation_recorded"
  | "training.session_delivered"
  | "training.observation_recorded"
  | "match.event_recorded"
  | "player.metric_recorded"
  | "player.derived_metric_computed";

export interface DomainEvent<TName extends DomainEventName = DomainEventName, TPayload = Record<string, unknown>> {
  id: EntityId;
  clubId: EntityId;
  name: TName;
  occurredAt: ISODateTimeString;
  payload: TPayload;
}

export function createDomainEvent<TName extends DomainEventName, TPayload>(
  event: DomainEvent<TName, TPayload>,
): DomainEvent<TName, TPayload> {
  return event;
}
