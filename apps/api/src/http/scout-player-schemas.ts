const id = { type: "string", minLength: 1 };
const player = { type: "object", additionalProperties: false, required: ["id", "name", "birthDate", "maskedDocument", "status", "createdAt"], properties: {
  id, name: id, birthDate: id, maskedDocument: id, status: { enum: ["active", "enrolled"] }, createdAt: id,
} };
export const scoutSchemas = {
  detailParams: { type: "object", additionalProperties: false, required: ["clubId", "clientId", "studentId"], properties: { clubId: id, clientId: id, studentId: id } },
  detail: { type: "object", additionalProperties: false, required: ["player", "participations"], properties: { player, participations: { type: "array", items: { type: "object", additionalProperties: false, required: ["eventId", "title", "startsAt", "type", "status"], properties: { eventId: id, title: id, startsAt: id, type: id, status: id } } } } },
  params: { type: "object", additionalProperties: false, required: ["clubId", "clientId"], properties: { clubId: id, clientId: id } },
  query: { type: "object", additionalProperties: false, properties: { search: { type: "string", maxLength: 60 }, offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 50 } } },
  create: { type: "object", additionalProperties: false, required: ["name", "identityNumber"], properties: { name: { type: "string", minLength: 1, maxLength: 60 }, identityNumber: { type: "string", minLength: 18, maxLength: 20 } } },
  created: { type: "object", additionalProperties: false, required: ["created", "player"], properties: { created: { type: "boolean" }, player } },
  list: { type: "object", additionalProperties: false, required: ["players", "total", "nextOffset", "canCreate"], properties: { players: { type: "array", items: player }, total: { type: "integer" }, nextOffset: { type: ["integer", "null"] }, canCreate: { type: "boolean" } } },
};
