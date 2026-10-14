import { errorResponse } from "./schemas.js";
const text = { type: "string", minLength: 1, maxLength: 128, pattern: "\\S" },
  uuid = { type: "string", format: "uuid" },
  errors = {
    400: errorResponse,
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse,
    503: errorResponse,
  };
const params = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: text },
};
const row = {
  type: "object",
  additionalProperties: false,
  required: [
    "rowNumber",
    "rawId",
    "externalId",
    "values",
    "expectedRevision",
    "action",
    "status",
  ],
  properties: {
    rowNumber: { type: "integer" },
    rawId: text,
    externalId: { type: "string" },
    values: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          { type: "null" },
          { type: "array", items: { type: "string" } },
        ],
      },
    },
    targetId: text,
    expectedRevision: { type: ["string", "null"] },
    action: { enum: ["create", "update", "duplicate"] },
    status: { enum: ["pending", "success", "failed", "duplicate"] },
    error: text,
    resultId: text,
  },
};
const batch = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "clubId",
    "actorId",
    "resourceKey",
    "sourceName",
    "mappingVersion",
    "blankPolicy",
    "fields",
    "rows",
    "createdAt",
    "updatedAt",
    "revision",
  ],
  properties: {
    id: text,
    clubId: text,
    actorId: text,
    resourceKey: text,
    sourceName: text,
    mappingVersion: text,
    blankPolicy: { enum: ["preserve", "clear"] },
    fields: { type: "array", items: text },
    rows: { type: "array", items: row },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    revision: text,
    canExport: { type: "boolean" },
  },
};
const file = {
  type: "object",
  additionalProperties: false,
  required: ["fileName", "contentBase64"],
  properties: { fileName: text, contentBase64: { type: "string" } },
};
export const exportSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["key"],
    properties: { key: text },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["fields", "snapshot", "requestId"],
    properties: {
      fields: {
        type: "array",
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
        items: text,
      },
      search: { type: "string", maxLength: 60 },
      snapshot: text,
      requestId: uuid,
    },
  },
  response: {
    ...errors,
    200: {
      ...file,
      required: [
        "fileName",
        "contentBase64",
        "snapshot",
        "rowCount",
        "exportedAt",
      ],
      properties: {
        ...file.properties,
        snapshot: text,
        rowCount: { type: "integer" },
        exportedAt: { type: "string" },
      },
    },
  },
};
export const importSchemas = {
  failures: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["requestId"],
      properties: { requestId: uuid },
    },
    response: { ...errors, 200: file },
  },
  templates: {
    response: {
      ...errors,
      200: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
    },
  },
  template: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["key"],
      properties: { key: text },
    },
    response: { ...errors, 200: file },
  },
  list: { response: { ...errors, 200: { type: "array", items: batch } } },
  detail: { params, response: { ...errors, 200: batch } },
  preview: {
    body: {
      type: "object",
      additionalProperties: false,
      required: [
        "resourceKey",
        "sourceName",
        "fileName",
        "contentBase64",
        "blankPolicy",
        "requestId",
      ],
      properties: {
        resourceKey: text,
        sourceName: text,
        fileName: text,
        contentBase64: {
          type: "string",
          minLength: 1,
          maxLength: 3000000,
          pattern: "^[A-Za-z0-9+/]*={0,2}$",
        },
        blankPolicy: { enum: ["preserve", "clear"] },
        requestId: uuid,
        mapping: {
          type: "object",
          maxProperties: 100,
          additionalProperties: text,
        },
      },
    },
    response: { ...errors, 200: batch },
  },
  confirm: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["expectedRevision", "rowNumbers", "requestId"],
      properties: {
        expectedRevision: text,
        rowNumbers: {
          type: "array",
          minItems: 1,
          maxItems: 500,
          uniqueItems: true,
          items: { type: "integer", minimum: 2 },
        },
        requestId: uuid,
      },
    },
    response: { ...errors, 200: batch },
  },
};
