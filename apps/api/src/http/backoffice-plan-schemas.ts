import { errorResponse } from "./schemas.js";
const text = { type: "string", minLength: 1, maxLength: 128 },
  errors = {
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse,
    503: errorResponse,
  };
const block = {
  type: "object",
  additionalProperties: false,
  required: ["drillId", "plannedMinutes"],
  properties: {
    drillId: text,
    plannedMinutes: { type: "number", minimum: 1, maximum: 1440 },
    notes: { type: "string", maxLength: 500 },
  },
};
const savedBlock = {
  ...block,
  required: [...block.required, "id", "order"],
  properties: { ...block.properties, id: text, order: { type: "integer" } },
};
export const planRecord = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "name",
    "blocks",
    "estimatedMinutes",
    "revision",
    "scope",
    "canEdit",
    "used",
  ],
  properties: {
    id: text,
    name: { type: "string" },
    blocks: { type: "array", items: savedBlock },
    objectiveIds: { type: "array", items: text },
    metricIds: { type: "array", items: text },
    estimatedMinutes: { type: "number" },
    revision: text,
    scope: { type: "string", enum: ["system", "club"] },
    canEdit: { type: "boolean" },
    used: { type: "boolean" },
    status: { type: "string", enum: ["active", "inactive"] },
    canSetStatus: { type: "boolean" },
    createdAt: text,
    updatedAt: text,
  },
};
const params = {
    type: "object",
    additionalProperties: false,
    required: ["id"],
    properties: { id: text },
  },
  body = {
    type: "object",
    additionalProperties: false,
    required: ["name", "blocks", "expectedRevision", "requestId"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100, pattern: "\\S" },
      blocks: { type: "array", minItems: 1, maxItems: 100, items: block },
      expectedRevision: { type: ["string", "null"], maxLength: 128 },
      requestId: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["active", "inactive"] },
      sourceId: text,
      sourceRevision: text,
    },
  };
export const backofficePlanSchemas = {
  list: { response: { ...errors, 200: { type: "array", items: planRecord } } },
  detail: {
    params,
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["record", "history"],
        properties: {
          record: planRecord,
          history: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "actor", "occurredAt", "action"],
              properties: {
                id: { type: "integer" },
                actor: { type: "string" },
                occurredAt: { type: "string" },
                action: { type: "string" },
                before: {
                  type: ["object", "null"],
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    estimatedMinutes: { type: "number" },
                    status: { type: "string" },
                    blocks: { type: "array", items: savedBlock },
                  },
                },
                after: {
                  type: ["object", "null"],
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    estimatedMinutes: { type: "number" },
                    status: { type: "string" },
                    blocks: { type: "array", items: savedBlock },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  create: { body, response: { ...errors, 200: planRecord } },
  update: { params, body, response: { ...errors, 200: planRecord } },
};
