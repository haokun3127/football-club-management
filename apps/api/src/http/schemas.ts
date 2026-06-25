const auditFields = {
  createdAt: { type: "string" },
  updatedAt: { type: "string" },
} as const;

const club = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "code", "timezone", "locale", "status", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    code: { type: "string" },
    timezone: { type: "string" },
    locale: { type: "string" },
    status: { type: "string", enum: ["active", "inactive"] },
    ...auditFields,
  },
} as const;

const errorResponse = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: {
    error: { type: "string" },
  },
} as const;

const metricValue = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "score"],
      properties: {
        kind: { type: "string", const: "rating_1_5" },
        score: { type: "number" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "count"],
      properties: {
        kind: { type: "string", const: "count" },
        count: { type: "number" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "minutes"],
      properties: {
        kind: { type: "string", const: "duration_minutes" },
        minutes: { type: "number" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "value", "unit"],
      properties: {
        kind: { type: "string", const: "measurement" },
        value: { type: "number" },
        unit: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "tag"],
      properties: {
        kind: { type: "string", const: "tag" },
        tag: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "text"],
      properties: {
        kind: { type: "string", const: "text" },
        text: { type: "string" },
      },
    },
  ],
} as const;

export const schemas = {
  health: {
    response: {
      200: {
        type: "object",
        additionalProperties: false,
        required: ["status", "service"],
        properties: {
          status: { type: "string", const: "ok" },
          service: { type: "string" },
        },
      },
    },
  },
  clubParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
      },
    },
  },
  clubStudentParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId", "studentId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
        studentId: { type: "string", minLength: 1 },
      },
    },
  },
  clubsResponse: {
    response: {
      200: {
        type: "array",
        items: club,
      },
    },
  },
  clubConfig: {
    response: {
      200: {
        type: "object",
        additionalProperties: false,
        required: ["club", "featureFlags", "policies", "customFields"],
        properties: {
          club,
          featureFlags: { type: "array", items: { type: "object", additionalProperties: true } },
          policies: { type: "array", items: { type: "object", additionalProperties: true } },
          customFields: { type: "array", items: { type: "object", additionalProperties: true } },
        },
      },
      403: errorResponse,
      404: errorResponse,
    },
  },
  derivedMetric: {
    response: {
      200: {
        type: "object",
        additionalProperties: false,
        required: ["record", "lineage"],
        properties: {
          record: {
            type: "object",
            additionalProperties: true,
            required: ["id", "clubId", "studentId", "metricId", "value", "source", "occurredAt", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string" },
              clubId: { type: "string" },
              studentId: { type: "string" },
              metricId: { type: "string" },
              value: metricValue,
              source: { type: "string" },
              occurredAt: { type: "string" },
              ...auditFields,
            },
          },
          lineage: {
            type: "object",
            additionalProperties: true,
            required: ["id", "clubId", "outputRecordId", "definitionId", "inputRecordIds", "computedAt", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string" },
              clubId: { type: "string" },
              outputRecordId: { type: "string" },
              definitionId: { type: "string" },
              inputRecordIds: { type: "array", items: { type: "string" } },
              computedAt: { type: "string" },
              ...auditFields,
            },
          },
        },
      },
      403: errorResponse,
    },
  },
} as const;
