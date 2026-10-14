import { errorResponse } from "./schemas.js";
const text = { type: "string" },
  number = { type: "integer", minimum: 0 };
const rows = (properties: Record<string, unknown>) => ({
  type: "array",
  items: { type: "object", additionalProperties: false, properties },
});
export const workbenchSchema = {
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        counts: {
          type: "object",
          additionalProperties: false,
          properties: {
            students: number,
            teams: number,
            coaches: number,
            events: number,
          },
        },
        upcoming: rows({
          id: text,
          title: text,
          startsAt: text,
          leaveCount: number,
        }),
        pendingTasks: rows({
          id: text,
          title: text,
          error: { type: ["string", "null"] },
          pending: { type: ["integer", "null"] },
          unpublished: { type: ["integer", "null"] },
        }),
        failedImports: rows({ id: text, sourceName: text, failed: number }),
        pendingServices: { type: ["integer", "null"] },
      },
    },
    401: errorResponse,
    403: errorResponse,
    500: errorResponse,
    503: errorResponse,
  },
};
