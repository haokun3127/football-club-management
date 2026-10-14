const id = { type: "string", minLength: 1 };
const phrase = { type: "object", additionalProperties: false, required: ["id", "text"], properties: { id, text: id } };
const revision = { type: "object", additionalProperties: false, required: ["revision", "phrases", "note", "actorDisplayName", "changedAt"], properties: {
  revision: { type: "integer", minimum: 1 }, phrases: { type: "array", items: phrase }, note: { type: "string" }, actorDisplayName: { type: "string" }, changedAt: id,
} };
const evaluation = { type: ["object", "null"], additionalProperties: false, required: ["clubId", "teamId", "studentId", "revision", "history"], properties: {
  clubId: id, teamId: id, studentId: id, revision: { type: "integer", minimum: 1 }, history: { type: "array", items: revision },
} };
const params = { type: "object", additionalProperties: false, required: ["clubId", "clientId", "studentId"], properties: { clubId: id, clientId: id, studentId: id } };
export const evaluationSchemas = {
  params,
  saveParams: { ...params, required: [...params.required, "teamId"], properties: { ...params.properties, teamId: id } },
  body: { type: "object", additionalProperties: false, required: ["expectedRevision", "phraseIds", "note"], properties: {
    expectedRevision: { type: "integer", minimum: 0 }, phraseIds: { type: "array", uniqueItems: true, maxItems: 30, items: id }, note: { type: "string", maxLength: 500 },
  } },
  saved: { type: "object", additionalProperties: false, required: ["evaluation"], properties: { evaluation } },
  list: { type: "object", additionalProperties: false, required: ["studentId", "studentName", "phrases", "teams"], properties: {
    studentId: id, studentName: { type: "string" }, phrases: { type: "array", items: phrase },
    teams: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "name", "canEdit", "evaluation"], properties: { id, name: { type: "string" }, canEdit: { type: "boolean" }, evaluation } } },
  } },
};
