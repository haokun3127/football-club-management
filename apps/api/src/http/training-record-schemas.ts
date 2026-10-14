const id = { type: "string", minLength: 1 };
const record = {
  type: "object", additionalProperties: false,
  required: ["clubId", "eventId", "studentId", "revision", "counted", "source", "occurredAt", "updatedAt", "history"],
  properties: {
    clubId: id, eventId: id, studentId: id, revision: { type: "integer", minimum: 1 }, counted: { type: "boolean" },
    source: { enum: ["automatic", "correction"] }, occurredAt: id, updatedAt: id,
    title: { type: "string" }, teamId: { type: ["string", "null"] },
    history: { type: "array", items: {
      type: "object", additionalProperties: false, required: ["revision", "counted", "source", "reason", "changedAt"],
      properties: { revision: { type: "integer" }, counted: { type: "boolean" }, previousCounted: { type: ["boolean", "null"] }, source: { enum: ["automatic", "correction"] }, reason: { type: "string" }, actorUserId: id, actorDisplayName: { type: "string" }, changedAt: id },
    } },
  },
};
export const trainingRecordSchemas = {
  listResponse: { type: "object", additionalProperties: false, required: ["studentId", "total", "records"], properties: { studentId: id, total: { type: "integer" }, records: { type: "array", items: record } } },
  correctionResponse: { type: "object", additionalProperties: false, required: ["record"], properties: { record } },
  params: { type: "object", additionalProperties: false, required: ["clubId", "clientId", "studentId"], properties: { clubId: id, clientId: id, studentId: id } },
  correctionParams: { type: "object", additionalProperties: false, required: ["clubId", "clientId", "studentId", "eventId"], properties: { clubId: id, clientId: id, studentId: id, eventId: id } },
  correction: { type: "object", additionalProperties: false, required: ["expectedRevision", "counted", "reason"], properties: {
    expectedRevision: { type: "integer", minimum: 0 }, counted: { type: "boolean" }, reason: { type: "string", minLength: 1, maxLength: 500 },
  } },
};
