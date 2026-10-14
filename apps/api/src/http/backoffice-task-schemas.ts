import { errorResponse } from "./schemas.js";
import { workflowSchemas } from "./assessment-workflow-schemas.js";
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
// These scoped responses reuse the canonical workflow DTO (entries, changes, publications and course provenance).
const object = { type: "object", additionalProperties: true };
const params = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: text },
};
const studentParams = {
  type: "object",
  additionalProperties: false,
  required: ["id", "studentId"],
  properties: { id: text, studentId: text },
};
const selection = {
  type: "object",
  additionalProperties: false,
  required: ["teamId", "studentIds"],
  properties: {
    teamId: text,
    studentIds: {
      type: "array",
      minItems: 1,
      maxItems: 500,
      uniqueItems: true,
      items: text,
    },
  },
};
export const backofficeTaskSchemas = {
  catalog: { response: { ...errors, 200: object } },
  list: { response: { ...errors, 200: { type: "array", items: object } } },
  detail: { params, response: { ...errors, 200: object } },
  create: {
    body: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "termLabel",
        "templateVersionId",
        "teamIds",
        "startsOn",
        "dueOn",
        "requestId",
      ],
      properties: {
        title: { ...text, maxLength: 100 },
        termLabel: { ...text, maxLength: 100 },
        templateVersionId: text,
        teamIds: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          uniqueItems: true,
          items: text,
        },
        startsOn: date,
        dueOn: date,
        requestId: { type: "string", format: "uuid" },
        selections: { type: "array", maxItems: 50, items: selection },
      },
    },
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["taskIds"],
        properties: { taskIds: { type: "array", items: text } },
      },
    },
  },
  save: {
    params: studentParams,
    body: workflowSchemas.save.body,
    response: { ...errors, 200: object },
  },
  handling: {
    params: studentParams,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["expectedRevision", "reason"],
      properties: {
        expectedRevision: { type: "integer", minimum: 0 },
        reason: { type: ["string", "null"], maxLength: 1000 },
      },
    },
    response: { ...errors, 200: object },
  },
  publish: {
    params,
    body: workflowSchemas.publish.body,
    response: { ...errors, 200: object },
  },
};
