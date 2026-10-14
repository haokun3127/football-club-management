import { errorResponse, metricValue } from "./schemas.js";
const text = { type: "string", minLength: 1, maxLength: 128, pattern: "\\S" };
const errors = {
  400: errorResponse,
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  409: errorResponse,
  500: errorResponse,
  503: errorResponse,
};
const issue = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: { code: text, objectId: text },
};
export const modelDefinition = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "version",
    "applicability",
    "basis",
    "reference",
    "inputs",
    "outputs",
  ],
  properties: {
    name: { ...text, maxLength: 100 },
    version: { ...text, maxLength: 32 },
    applicability: { ...text, maxLength: 500 },
    basis: { type: "string", enum: ["trial", "official"] },
    reference: { type: "string", maxLength: 1000 },
    ageGroup: { ...text, maxLength: 32 },
    teamLevel: { ...text, maxLength: 32 },
    references: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["versionId", "metricId", "selection"],
        properties: {
          versionId: text,
          metricId: text,
          selection: { type: "string", const: "same_assessment" },
        },
      },
    },
    inputs: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["testItemId"],
        properties: {
          testItemId: text,
          scoreMappingVersionId: text,
          gradeMappingVersionId: text,
        },
      },
    },
    outputs: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metricId", "method", "inputs", "rounding"],
        properties: {
          metricId: text,
          method: {
            type: "string",
            enum: ["weighted_average", "normalized_weighted_sum", "sum"],
          },
          rounding: {
            type: "string",
            enum: ["none", "integer", "two_decimals"],
          },
          inputScale: { type: "number", exclusiveMinimum: 0, maximum: 1000000 },
          maxScore: { type: "number", exclusiveMinimum: 0, maximum: 1000000 },
          inputs: {
            type: "array",
            maxItems: 200,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["metricId", "weight"],
              properties: {
                metricId: text,
                weight: {
                  type: "number",
                  exclusiveMinimum: 0,
                  maximum: 1000000,
                },
              },
            },
          },
        },
      },
    },
  },
};
const displayGroups = {
  type: "array",
  maxItems: 20,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["name", "metricIds"],
    properties: {
      name: { ...text, maxLength: 100 },
      metricIds: {
        type: "array",
        minItems: 1,
        maxItems: 200,
        uniqueItems: true,
        items: text,
      },
    },
  },
};
const display = {
  type: "object",
  additionalProperties: false,
  required: ["groups", "revision"],
  properties: { groups: displayGroups, revision: text },
};
const record = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "templateId",
    "scope",
    "status",
    "definition",
    "legacy",
    "canEdit",
    "revision",
    "issues",
  ],
  properties: {
    id: text,
    templateId: text,
    scope: { type: "string", enum: ["club", "system"] },
    status: { type: "string", enum: ["draft", "active", "archived"] },
    definition: modelDefinition,
    legacy: { type: "boolean" },
    canEdit: { type: "boolean" },
    revision: text,
    issues: { type: "array", items: issue },
    display,
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
    definition: modelDefinition,
    expectedRevision: { type: ["string", "null"], maxLength: 128 },
    requestId: { type: "string", format: "uuid" },
    sourceId: text,
    sourceRevision: text,
    templateId: text,
  },
};
const change = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: { ...modelDefinition.properties, status: text },
};
const history = {
  type: "object",
  additionalProperties: false,
  required: ["id", "actor", "occurredAt", "action"],
  properties: {
    id: { type: "integer" },
    actor: text,
    occurredAt: text,
    action: text,
    before: change,
    after: change,
  },
};
export const backofficeModelSchemas = {
  catalog: {
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["items", "metrics"],
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "name", "metricId", "valueKind"],
              properties: {
                id: text,
                name: { type: "string" },
                metricId: text,
                valueKind: text,
                unit: { type: "string" },
                status: text,
                minimumValue: { type: "number" },
                maximumValue: { type: "number" },
              },
            },
          },
          metrics: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "name", "metricKind", "valueKind"],
              properties: {
                id: text,
                name: { type: "string" },
                metricKind: text,
                valueKind: text,
                unit: { type: "string" },
                maxScore: { type: "number" },
                status: text,
              },
            },
          },
        },
      },
    },
  },
  list: { response: { ...errors, 200: { type: "array", items: record } } },
  detail: {
    params,
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["record", "history"],
        properties: {
          record,
          history: { type: "array", items: history },
          displayHistory: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "integer" },
                actor: text,
                occurredAt: text,
                action: text,
                before: {
                  type: ["object", "null"],
                  additionalProperties: false,
                  properties: { groups: displayGroups },
                },
                after: {
                  type: "object",
                  additionalProperties: false,
                  properties: { groups: displayGroups },
                },
              },
            },
          },
        },
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
      required: ["values"],
      properties: {
        values: {
          type: "array",
          maxItems: 200,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["testItemId", "value"],
            properties: { testItemId: text, value: metricValue },
          },
        },
      },
    },
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["versionId", "revision", "outputs", "inputCount"],
        properties: {
          versionId: text,
          revision: text,
          inputCount: { type: "integer" },
          outputs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["metricId", "value"],
              properties: { metricId: text, value: metricValue },
            },
          },
        },
      },
    },
  },
  display: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["groups", "expectedRevision", "requestId"],
      properties: {
        groups: displayGroups,
        expectedRevision: text,
        requestId: { type: "string", format: "uuid" },
      },
    },
    response: { ...errors, 200: display },
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
};
