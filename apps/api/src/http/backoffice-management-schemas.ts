import { trainingRecordSchemas } from "./training-record-schemas.js";
import {
  backofficeResources,
  valuesSchema,
  type BackofficeResource,
} from "../application/backoffice-resources.js";
import { errorResponse } from "./schemas.js";
const text = { type: "string", minLength: 1, maxLength: 128 };
export const capabilities = [
  "sensitive",
  "export",
  "assessment",
  "assessment_entry",
  "service",
  "finance",
];
const errors = {
  400: errorResponse,
  401: errorResponse,
  403: errorResponse,
  404: errorResponse,
  409: errorResponse,
  500: errorResponse,
  503: errorResponse,
};
export const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", maxLength: 60 },
    offset: { type: "integer", minimum: 0, maximum: 1000000 },
  },
};
const params = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: text },
};
const options = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["value", "label"],
    properties: { value: text, label: { type: "string" } },
  },
};
const field = {
  type: "object",
  additionalProperties: false,
  required: ["key", "label", "kind"],
  properties: {
    key: text,
    label: text,
    kind: { type: "string" },
    required: { type: "boolean" },
    options,
    reference: text,
    multiple: { type: "boolean" },
    sensitive: { type: "boolean" },
    minimum: { type: "number" },
    maximum: { type: "number" },
    virtual: { type: "boolean" },
    appliesTo: { type: "string" },
  },
};
export function recordSchema(resource: BackofficeResource) {
  const values = valuesSchema(resource);
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "revision", "values", "updatedAt"],
    properties: {
      id: text,
      revision: text,
      values: { ...values, required: [] },
      updatedAt: { type: "string" },
      readOnly: { type: "boolean" },
    },
  };
}
export function managementSchemas(resource: BackofficeResource) {
  const record = recordSchema(resource),
    values = valuesSchema(resource);
  const body = {
    type: "object",
    additionalProperties: false,
    required: ["values", "expectedRevision", "requestId"],
    properties: {
      values,
      expectedRevision: { type: ["string", "null"], maxLength: 128 },
      requestId: { type: "string", format: "uuid" },
    },
  };
  const history = {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      required: ["id", "actor", "occurredAt", "action", "before", "after"],
      properties: {
        id: { type: "integer" },
        actor: { type: "string" },
        occurredAt: { type: "string" },
        action: { type: "string" },
        before: { ...values, type: ["object", "null"], required: [] },
        after: { ...values, type: ["object", "null"], required: [] },
      },
    },
  };
  return {
    list: {
      querystring: listQuery,
      response: {
        ...errors,
        200: {
          type: "object",
          additionalProperties: false,
          required: [
            "resource",
            "title",
            "fields",
            "canWrite",
            "canCreate",
            "canExport",
            "rows",
            "total",
            "pageSize",
            "offset",
            "snapshot",
          ],
          properties: {
            resource: text,
            title: text,
            fields: { type: "array", items: field },
            canWrite: { type: "boolean" },
            canCreate: { type: "boolean" },
            canExport: { type: "boolean" },
            rows: { type: "array", items: record },
            total: { type: "integer" },
            pageSize: { type: "integer" },
            offset: { type: "integer" },
            snapshot: text,
          },
        },
      },
    },
    detail: {
      params,
      response: {
        ...errors,
        200: {
          type: "object",
          additionalProperties: false,
          required: ["record", "history"],
          properties: { record, history },
        },
      },
    },
    create: { body, response: { ...errors, 200: record } },
    update: { params, body, response: { ...errors, 200: record } },
  };
}
export const resourceIndexSchema = {
  response: {
    ...errors,
    200: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "canWrite"],
        properties: { key: text, title: text, canWrite: { type: "boolean" } },
      },
    },
  },
};
export const optionSchema = {
  params: {
    type: "object",
    required: ["key"],
    additionalProperties: false,
    properties: {
      key: {
        type: "string",
        enum: [
          ...backofficeResources.map((r) => r.key),
          "accounts",
          "app-clients",
          "objectives",
          "dimensions",
          "plans",
        ],
      },
    },
  },
  response: { ...errors, 200: options },
};
export const grantsSchema = {
  response: {
    ...errors,
    200: {
      type: "object",
      additionalProperties: false,
      required: ["accounts", "capabilities", "rows", "revision"],
      properties: {
        accounts: options,
        capabilities: { type: "array", items: text },
        revision: text,
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["userId", "capabilities"],
            properties: {
              userId: text,
              capabilities: { type: "array", items: text },
            },
          },
        },
      },
    },
  },
};
export const saveGrantsSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["userId", "capabilities", "expectedRevision", "requestId"],
    properties: {
      userId: text,
      capabilities: {
        type: "array",
        items: { type: "string", enum: capabilities },
        uniqueItems: true,
      },
      expectedRevision: text,
      requestId: { type: "string", format: "uuid" },
    },
  },
  response: grantsSchema.response,
};

const player = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "name",
    "birthDate",
    "maskedDocument",
    "status",
    "createdAt",
  ],
  properties: {
    id: text,
    name: { type: "string" },
    birthDate: { type: "string" },
    maskedDocument: { type: "string" },
    status: { type: "string", enum: ["active", "enrolled"] },
    createdAt: { type: "string" },
  },
};
export const scoutManagementSchemas = {
  list: {
    querystring: listQuery,
    response: {
      ...errors,
      200: {
        type: "object",
        additionalProperties: false,
        required: ["players", "total", "canCreate"],
        properties: {
          players: { type: "array", items: player },
          total: { type: "integer" },
          canCreate: { type: "boolean" },
        },
      },
    },
  },
  create: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["name", "identityNumber", "requestId"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 60 },
        identityNumber: { type: "string", minLength: 18, maxLength: 18 },
        requestId: { type: "string", format: "uuid" },
      },
    },
    response: { ...errors, 200: player },
  },
  enroll: {
    params,
    body: {
      type: "object",
      additionalProperties: false,
      required: ["requestId"],
      properties: { requestId: { type: "string", format: "uuid" } },
    },
    response: { ...errors, 200: player },
  },
};

export const backofficeTrainingSchemas = {
  list: {
    response: {
      ...errors,
      200: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["eventId", "studentId", "title", "name", "record"],
          properties: {
            eventId: text,
            studentId: text,
            title: { type: "string" },
            name: { type: "string" },
            record: {
              ...trainingRecordSchemas.correctionResponse.properties.record,
              type: ["object", "null"],
            },
          },
        },
      },
    },
  },
  save: {
    body: {
      ...trainingRecordSchemas.correction,
      required: [
        ...trainingRecordSchemas.correction.required,
        "studentId",
        "eventId",
        "requestId",
      ],
      properties: {
        ...trainingRecordSchemas.correction.properties,
        studentId: text,
        eventId: text,
        requestId: { type: "string", format: "uuid" },
      },
    },
    response: {
      ...errors,
      200: trainingRecordSchemas.correctionResponse.properties.record,
    },
  },
};
