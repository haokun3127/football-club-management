import type { DomainEvent } from "./events.js";
import type { EntityId, ISODateTimeString } from "./primitives.js";

export interface Repository<TEntity> {
  getById(id: EntityId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
}

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface Clock {
  now(): ISODateTimeString;
}

export interface IdGenerator {
  next(prefix?: string): EntityId;
}
