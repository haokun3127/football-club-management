import { errorResponse } from "./schemas.js";
const text = { type: ["string", "null"] };
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  properties,
});
const list = (properties: Record<string, unknown>) => ({
  type: "array",
  items: object(properties),
});
const status = { enum: ["active"] };
export const clubPresentationSchema = {
  response: {
    200: object({
      clubId: { type: "string" },
      presentation: object({
        branding: {
          ...object({ name: text, logoUrl: text, primaryColor: text }),
          type: ["object", "null"],
        },
        banners: list({
          id: text,
          name: text,
          imageUrl: text,
          articleId: text,
          startsAt: text,
          endsAt: text,
          sortOrder: { type: "number" },
          status,
        }),
        shareTemplates: list({
          id: text,
          name: text,
          title: text,
          description: text,
          backgroundUrl: text,
          status,
        }),
        evaluationPhrases: list({
          id: text,
          name: text,
          text,
          tags: { type: "array", items: { type: "string" } },
          status,
        }),
        optionalFeatures: list({ key: text, name: text, path: text }),
      }),
    }),
    401: errorResponse,
    403: errorResponse,
    404: errorResponse,
  },
};
