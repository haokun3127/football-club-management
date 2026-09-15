import { errorResponse } from "./schemas.js";
const id = { type: "string", minLength: 1 };
const revision = { type: "integer", minimum: 0 };
const params = (student = false) => ({ type: "object", additionalProperties: false, required: ["clubId", "clientId", "taskId", ...(student ? ["studentId"] : [])], properties: { clubId: id, clientId: id, taskId: id, ...(student ? { studentId: id } : {}) } });
const response = { 200: { type: "object", additionalProperties: true }, 400: errorResponse, 403: errorResponse, 404: errorResponse, 409: errorResponse };
const entry = {
  type: "object", additionalProperties: false, required: ["testItemId", "value"],
  properties: {
    testItemId: id, metricId: id,
    value: { type: "object", additionalProperties: false, required: ["kind", "score"], properties: { kind: { type: "string", enum: ["score_0_100", "rating_1_5"] }, score: { type: "number", minimum: 0, maximum: 100 } } },
  },
};
export const workflowSchemas = {
  summary: { params: params(), response },
  history: { params: params(true), response },
  save: { params: params(true), response, body: {
    type: "object", additionalProperties: false, required: ["expectedRevision", "entries"], properties: {
      expectedRevision: revision, reason: { type: "string", maxLength: 1000 },
      entries: { type: "array", minItems: 1, maxItems: 500, items: entry },
    },
  } },
  publish: { params: params(), response, body: { type: "object", additionalProperties: false, required: ["students"], properties: {
    students: { type: "array", minItems: 1, maxItems: 200, items: { type: "object", additionalProperties: false, required: ["studentId", "expectedRevision"], properties: { studentId: id, expectedRevision: revision } } },
  } } },
};
