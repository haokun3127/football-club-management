import { errorResponse } from "./schemas.js";
const text = { type: "string", minLength: 1, maxLength: 128, pattern: "\\S" },
  date = { type: "string", format: "date" };
const errors = {
  400: errorResponse,
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  409: errorResponse,
  500: errorResponse,
  503: errorResponse,
};
export const standardDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "version",
    "targetType",
    "targetId",
    "unit",
    "direction",
    "minimum",
    "maximum",
    "applicability",
    "effectiveFrom",
    "basis",
    "reference",
  ],
  properties: {
    name: { ...text, maxLength: 100 },
    version: { ...text, maxLength: 32 },
    targetType: { type: "string", enum: ["project", "metric"] },
    targetId: text,
    unit: { ...text, maxLength: 32 },
    direction: { type: "string", enum: ["higher", "lower", "within"] },
    minimum: { type: "number" },
    maximum: { type: "number" },
    applicability: { ...text, maxLength: 500 },
    ageMinimum: { type: "integer", minimum: 0, maximum: 120 },
    ageMaximum: { type: "integer", minimum: 0, maximum: 120 },
    ageReferenceDate: date,
    teamLevel: { ...text, maxLength: 32 },
    effectiveFrom: date,
    effectiveTo: date,
    basis: { type: "string", enum: ["trial", "official"] },
    reference: { type: "string", maxLength: 1000 },
    modelVersionId: text,
  },
};
const record = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "familyId",
    "status",
    "definition",
    "revision",
    "issues",
    "manualSelectionRequired",
  ],
  properties: {
    id: text,
    familyId: text,
    status: { type: "string", enum: ["draft", "active", "archived"] },
    definition: standardDefinition,
    revision: text,
    createdAt: text,
    updatedAt: text,
    issues: { type: "array", items: text },
    manualSelectionRequired: { type: "boolean" },
  },
};
const params = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: text },
};
const body = {
  type: "object",
  additionalProperties: false,
  required: ["definition", "expectedRevision", "requestId"],
  properties: {
    definition: standardDefinition,
    expectedRevision: { type: ["string", "null"], maxLength: 128 },
    requestId: { type: "string", format: "uuid" },
    sourceId: text,
    sourceRevision: text,
  },
};
const history = {
  type: "object",
  additionalProperties: false,
  required: ["id", "actor", "action", "occurredAt"],
  properties: {
    id: { type: "integer" },
    actor: text,
    action: text,
    occurredAt: text,
    before: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: { ...standardDefinition.properties, status: text },
    },
    after: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: { ...standardDefinition.properties, status: text },
    },
  },
};
export const backofficeStandardSchemas = {
  list: { response: { ...errors, 200: { type: "array", items: record } } },
  detail: {
    params,
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["record", "history"],
        properties: { record, history: { type: "array", items: history } },
      },
    },
  },
  create: { body, response: { ...errors, 200: record } },
  update: { params, body, response: { ...errors, 200: record } },
  transition: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["action", "expectedRevision", "requestId"],
      properties: {
        action: { type: "string", enum: ["publish", "deactivate"] },
        expectedRevision: text,
        requestId: { type: "string", format: "uuid" },
      },
    },
    response: { ...errors, 200: record },
  },
  compare: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["value", "unit"],
      properties: { value: { type: "number" }, unit: text },
    },
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: [
          "versionId",
          "revision",
          "basis",
          "manualSelectionRequired",
          "input",
          "meetsReference",
        ],
        properties: {
          versionId: text,
          revision: text,
          basis: text,
          manualSelectionRequired: { type: "boolean" },
          input: {
            type: "object",
            additionalProperties: false,
            properties: { value: { type: "number" }, unit: text },
          },
          meetsReference: { type: "boolean" },
        },
      },
    },
  },
};
