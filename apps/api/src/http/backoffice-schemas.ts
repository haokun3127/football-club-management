import { catalogTables } from "../application/backoffice-catalog.js";
import { errorResponse } from "./schemas.js";
const string = { type: "string", minLength: 1, maxLength: 128 };
const session = { type: "object", additionalProperties: false, required: ["environment", "clubId", "user"], properties: {
  environment: { type: "string", enum: ["develop", "trial", "release"] }, clubId: string,
  user: { type: "object", additionalProperties: false, required: ["name", "roles"], properties: { name: string, roles: { type: "array", items: string } } },
} };
export const backofficeSchemas = {
  login: {
    body: { type: "object", additionalProperties: false, required: ["clubId", "username", "password"], properties: {
      clubId: string, username: { type: "string", pattern: "^[A-Za-z0-9._-]{3,64}$" }, password: { type: "string", minLength: 1, maxLength: 128 },
    } },
    response: { 200: session, 401: errorResponse, 403: errorResponse, 429: errorResponse, 503: errorResponse },
  },
  session: { response: { 200: session, 401: errorResponse, 403: errorResponse, 503: errorResponse } },
  logout: { response: { 200: { type: "object", additionalProperties: false, required: ["signedOut"], properties: { signedOut: { type: "boolean" } } }, 403: errorResponse, 503: errorResponse } },
};

export const backofficeCatalogSchema = {
      params: { type: "object", required: ["table"], additionalProperties: false, properties: { table: { type: "string", enum: catalogTables } } },
      querystring: { type: "object", additionalProperties: false, properties: { search: { type: "string", maxLength: 60 }, offset: { type: "integer", minimum: 0, maximum: 1000000 } } },
      response: { 200: { type: "object", additionalProperties: false, required: ["title", "columns", "rows", "total", "offset", "pageSize"], properties: {
        title: { type: "string" }, columns: { type: "array", items: { type: "string" } }, total: { type: "integer" }, offset: { type: "integer" }, pageSize: { type: "integer" },
        rows: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "values"], properties: { id: { type: "string" }, values: { type: "array", items: { type: "string" } } } } },
      } } },
    };
