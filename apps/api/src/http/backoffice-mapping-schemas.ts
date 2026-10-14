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
const rule = {
  type: "object",
  additionalProperties: false,
  required: ["lower", "upper", "lowerInclusive", "upperInclusive"],
  properties: {
    lower: { type: "number" },
    upper: { type: "number" },
    lowerInclusive: { type: "boolean" },
    upperInclusive: { type: "boolean" },
    score: { type: "integer", minimum: 0, maximum: 1000000 },
    grade: { type: "string", minLength: 1, maxLength: 32 },
  },
};
export const mappingDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "stage",
    "unit",
    "minimum",
    "maximum",
    "applicability",
    "basis",
    "reference",
    "rules",
  ],
  properties: {
    name: { ...text, maxLength: 100, pattern: "\\S" },
    stage: { type: "string", enum: ["raw_score", "score_grade"] },
    unit: { ...text, maxLength: 32 },
    minimum: { type: "number" },
    maximum: { type: "number" },
    applicability: { ...text, maxLength: 500 },
    basis: { type: "string", enum: ["trial", "official"] },
    reference: { type: "string", maxLength: 1000 },
    rules: { type: "array", maxItems: 500, items: rule },
  },
};
const issue = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: { code: text, rule: { type: "integer" } },
};
const record = {
  type: "object",
  additionalProperties: false,
  required: ["id", "testItemId", "status", "definition", "revision", "issues"],
  properties: {
    id: text,
    testItemId: text,
    status: { type: "string", enum: ["draft", "active", "archived"] },
    definition: mappingDefinition,
    revision: text,
    createdAt: text,
    updatedAt: text,
    issues: { type: "array", items: issue },
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
  required: ["testItemId", "definition", "expectedRevision", "requestId"],
  properties: {
    testItemId: text,
    definition: mappingDefinition,
    expectedRevision: { type: ["string", "null"], maxLength: 128 },
    requestId: { type: "string", format: "uuid" },
    sourceId: text,
    sourceRevision: text,
  },
};
const history = {
  type: "object",
  additionalProperties: false,
  required: ["id", "actor", "occurredAt", "action"],
  properties: {
    id: { type: "integer" },
    actor: { type: "string" },
    occurredAt: text,
    action: text,
    before: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: record.properties,
    },
    after: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: record.properties,
    },
  },
};
export const backofficeMappingSchemas = {
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
  trial: {
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
        required: ["versionId", "revision", "basis", "input"],
        properties: {
          versionId: text,
          revision: text,
          basis: { type: "string" },
          input: {
            type: "object",
            additionalProperties: false,
            properties: { value: { type: "number" }, unit: text },
          },
          score: { type: "integer" },
          grade: { type: "string" },
        },
      },
    },
  },
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
  items: {
    response: {
      ...errors,
      200: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name", "valueKind"],
          properties: {
            id: text,
            name: { type: "string" },
            valueKind: text,
            unit: { type: "string" },
          },
        },
      },
    },
  },
};
