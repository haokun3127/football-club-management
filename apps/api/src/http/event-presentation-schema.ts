const namedObject = {
  anyOf: [{
    type: "object", additionalProperties: false, required: ["id", "name"],
    properties: { id: { type: "string" }, name: { type: "string" } },
  }, { type: "null" }],
} as const;

export const eventPresentationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["startsAt", "endsAt", "team", "venue", "coach", "training"],
  properties: {
    startsAt: { type: "string" },
    endsAt: { type: "string" },
    team: namedObject,
    venue: namedObject,
    coach: namedObject,
    training: { anyOf: [{
      type: "object", additionalProperties: false,
      required: ["state", "summary", "abilityTags", "count", "configuredMinutes", "groups"],
      properties: {
        state: { type: "string", enum: ["planned", "not_arranged", "unavailable"] },
        summary: { type: "string" },
        abilityTags: { type: "array", items: { type: "string" } },
        count: { type: "integer", minimum: 0 },
        configuredMinutes: { anyOf: [{ type: "number" }, { type: "null" }] },
        groups: { type: "array", items: {
          type: "object", additionalProperties: false, required: ["id", "label", "items"],
          properties: {
            id: { type: "string" }, label: { type: "string" },
            items: { type: "array", items: {
              type: "object", additionalProperties: false, required: ["id", "name", "configuredMinutes"],
              properties: {
                id: { type: "string" }, name: { type: "string" },
                configuredMinutes: { anyOf: [{ type: "number" }, { type: "null" }] },
              },
            } },
          },
        } },
      },
    }, { type: "null" }] },
  },
} as const;
