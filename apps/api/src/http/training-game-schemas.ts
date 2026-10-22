import { errorResponse } from "./schemas.js";
const id = { type: "string", minLength: 1, maxLength: 150 };
const text = { type: "string" };
const side = { type: "string", enum: ["A", "B"] };
const score = { type: ["integer", "null"], minimum: 0, maximum: 999 };
const minute = { type: ["integer", "null"], minimum: 0, maximum: 300 };
const state = { type: "string", enum: ["draft", "completed", "voided"] };
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({ type: "object", additionalProperties: false, properties, required });
const array = (items: unknown, maxItems?: number) => ({
  type: "array",
  items,
  ...(maxItems === undefined ? {} : { maxItems }),
});
const participantInput = object({ studentId: id, side });
const participant = object({ studentId: id, side, nameSnapshot: text });
const gameEvent = object({
  id,
  type: { type: "string", enum: ["goal", "assist", "save"] },
  side,
  studentId: { type: ["string", "null"], minLength: 1, maxLength: 150 },
  minute,
  note: { type: "string", maxLength: 500 },
});
const content = {
  sideAName: { type: "string", minLength: 1, maxLength: 80 },
  sideBName: { type: "string", minLength: 1, maxLength: 80 },
  scoreA: score,
  scoreB: score,
  state,
};
const snapshot = object({
  planId: id,
  drillId: id,
  name: text,
  revision: text,
});
const game = object(
  {
    id,
    clubId: id,
    eventId: id,
    contentBlockId: id,
    contentSnapshot: snapshot,
    ...content,
    participants: array(participant, 100),
    events: array(gameEvent, 500),
    revision: { type: "integer" },
    createdBy: id,
    updatedBy: id,
    createdAt: text,
    updatedAt: text,
    sourceAdjusted: { type: "boolean" },
  },
  [
    "id",
    "clubId",
    "eventId",
    "contentBlockId",
    "contentSnapshot",
    ...Object.keys(content),
    "participants",
    "events",
    "revision",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt",
  ],
);
const event = object({
  id,
  title: text,
  startsAt: text,
  status: text,
  teamId: { type: ["string", "null"], minLength: 1, maxLength: 150 },
});
const response = (success: unknown) => ({
  200: success,
  400: errorResponse,
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  409: errorResponse,
});
const params = (detail = false) =>
  object({
    clubId: id,
    clientId: id,
    eventId: id,
    ...(detail ? { gameId: id } : {}),
  });
const history = array(
  object({
    revision: { type: "integer" },
    changedAt: text,
    reason: text,
    state,
    scoreA: score,
    scoreB: score,
    participantCount: { type: "integer" },
    eventCount: { type: "integer" },
  }),
);
const parentGame = object({
  id,
  eventId: id,
  contentName: text,
  sideAName: text,
  sideBName: text,
  scoreA: score,
  scoreB: score,
  revision: { type: "integer" },
  updatedAt: text,
  events: array(
    object({
      id,
      type: { type: "string", enum: ["goal", "assist", "save"] },
      side,
      minute,
    }),
  ),
});
export const trainingGameSchemas = {
  list: {
    params: params(),
    response: response(
      object({
        enabled: { type: "boolean" },
        canEdit: { type: "boolean" },
        event,
        sources: array(
          object({ contentBlockId: id, contentSnapshot: snapshot }),
        ),
        participants: array(object({ studentId: id, name: text })),
        games: array(game),
      }),
    ),
  },
  detail: {
    params: params(true),
    response: response(object({ game, history })),
  },
  create: {
    params: params(),
    body: object({
      contentBlockId: id,
      sideAName: content.sideAName,
      sideBName: content.sideBName,
      requestId: id,
    }),
    response: response(object({ game })),
  },
  update: {
    params: params(true),
    body: object(
      {
        ...content,
        participants: array(participantInput, 100),
        events: array(gameEvent, 500),
        expectedRevision: { type: "integer", minimum: 1 },
        requestId: id,
        reason: { type: "string", maxLength: 500 },
      },
      [
        ...Object.keys(content),
        "participants",
        "events",
        "expectedRevision",
        "requestId",
      ],
    ),
    response: response(object({ game })),
  },
  parent: {
    params: params(),
    querystring: object({ studentId: id }),
    response: response(
      object({ enabled: { type: "boolean" }, games: array(parentGame) }),
    ),
  },
  directory: {
    params: object({ clubId: id, clientId: id }),
    querystring: object({ teamId: id }),
    response: response(
      object({
        enabled: { type: "boolean" },
        games: array(object({ game, event })),
      }),
    ),
  },
};
