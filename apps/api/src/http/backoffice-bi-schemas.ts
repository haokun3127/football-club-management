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
  },
  topic = {
    enum: ["operations", "training", "assessment", "growth", "services"],
  };
const filters = {
  type: "object",
  additionalProperties: false,
  properties: {
    from: { type: "string", format: "date" },
    to: { type: "string", format: "date" },
    teamId: text,
    studentId: text,
    metricId: text,
  },
};
const snapshot = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "clubId",
    "actorId",
    "topic",
    "filters",
    "data",
    "factVersion",
    "createdAt",
  ],
  properties: {
    id: text,
    clubId: text,
    actorId: text,
    topic,
    filters,
    factVersion: text,
    createdAt: { type: "string" },
    stale: { type: "boolean" },
    data: {
      type: "object",
      additionalProperties: false,
      required: ["cards", "columns", "rows", "notes"],
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "value"],
            properties: {
              key: text,
              label: text,
              value: { type: ["number", "null"] },
              unit: { type: "string" },
            },
          },
        },
        columns: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label"],
            properties: { key: text, label: text },
          },
        },
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "values"],
            properties: {
              id: { type: "string" },
              values: {
                type: "object",
                additionalProperties: {
                  type: ["string", "number", "boolean", "null"],
                },
              },
            },
          },
        },
        notes: { type: "array", items: { type: "string" } },
      },
    },
  },
};
const params = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: text },
};
export const biSchemas = {
  catalog: {
    response: {
      ...errors,
      200: { type: "object", additionalProperties: true },
    },
  },
  create: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["topic", "filters", "requestId"],
      properties: {
        topic,
        filters,
        requestId: { type: "string", format: "uuid" },
      },
    },
    response: { ...errors, 200: snapshot },
  },
  detail: { params, response: { ...errors, 200: snapshot } },
  export: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["factVersion", "requestId"],
      properties: {
        factVersion: text,
        requestId: { type: "string", format: "uuid" },
      },
    },
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["fileName", "contentBase64", "factVersion"],
        properties: {
          fileName: { type: "string" },
          contentBase64: { type: "string" },
          factVersion: text,
        },
      },
    },
  },
};
