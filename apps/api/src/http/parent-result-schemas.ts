const text = { type: "string" };
const nullableText = { type: ["string", "null"] };
export const parentResultSchema = {
  response: { 200: { type: "object", additionalProperties: false, required: ["student", "confirmedResults"], properties: {
    student: { type: "object", additionalProperties: false, properties: { id: text, name: text, teams: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: text } } } } },
    confirmedResults: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      id: text, assessmentId: text, taskId: nullableText, testItemId: text, metricId: text, name: text,
      value: { type: "object", additionalProperties: true }, unit: nullableText, templateVersionId: nullableText, eventId: nullableText, occurredAt: text, recordedAt: text,
      mapping: { type: ["object", "null"], additionalProperties: false, properties: { integerScore: { type: "integer" }, grade: text, rawScoreVersionId: text, gradeVersionId: text, mappedAt: text } },
    } } },
  } } },
};
