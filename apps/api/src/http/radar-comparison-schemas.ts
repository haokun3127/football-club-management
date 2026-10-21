const text = { type: "string" },
  nullableText = { type: ["string", "null"] };
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const array = (items: unknown) => ({ type: "array", items });
const point = object({
  metricId: text,
  score: { type: ["number", "null"] },
  rawLabel: text,
  factId: nullableText,
  occurredAt: nullableText,
  metricVersion: nullableText,
  mappingVersion: nullableText,
  status: {
    type: "string",
    enum: ["measured", "missing", "unmapped", "incompatible"],
  },
  reason: text,
});
const series = object({
  id: text,
  name: text,
  kind: { type: "string", enum: ["latest_per_metric", "history", "standard"] },
  points: array(point),
});
const option = object({ id: text, label: text, date: text });
export const radarComparisonSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      teamId: { type: "string", minLength: 1, maxLength: 200 },
      historyResultId: { type: "string", minLength: 1, maxLength: 200 },
      standardId: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  response: {
    200: object({
      views: array(object({ id: text, name: text, metricIds: array(text) })),
      axes: array(
        object({
          metricId: text,
          label: text,
          rawUnit: nullableText,
          scoreMin: { type: "number" },
          scoreMax: { type: "number" },
          metricVersion: nullableText,
          mappingVersion: nullableText,
        }),
      ),
      current: series,
      comparisonOptions: object({
        history: array(option),
        standards: array(option),
        historyReason: text,
        standardReason: text,
      }),
      selectedComparisons: array(series),
    }),
  },
};
