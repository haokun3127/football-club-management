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
  clubTeamParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId", "teamId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
        teamId: { type: "string", minLength: 1 },
      },
    },
  },
  clubEventParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId", "eventId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
        eventId: { type: "string", minLength: 1 },
      },
    },
  },
  createTeam: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["name", "ageGroup", "level"],
      properties: {
        name: { type: "string", minLength: 1 },
        ageGroup: { type: "string", minLength: 1 },
        level: { type: "string", minLength: 1 },
        defaultCoachId: { type: "string" },
        defaultLocationId: { type: "string" },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  joinTeam: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["studentId", "startsAt"],
      properties: {
        studentId: { type: "string", minLength: 1 },
        startsAt: { type: "string", minLength: 1 },
        endsAt: { type: "string" },
        isPrimaryTeam: { type: "boolean" },
        status: { type: "string" },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  createCalendarEvent: {
    body: {
      type: "object",
      additionalProperties: true,
      required: ["type", "title", "startsAt", "endsAt"],
      properties: {
        type: { type: "string", enum: ["training", "match", "other"] },
        title: { type: "string", minLength: 1 },
        startsAt: { type: "string", minLength: 1 },
        endsAt: { type: "string", minLength: 1 },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  eventParticipants: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["participants"],
      properties: {
        participants: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["studentId"],
            properties: {
              studentId: { type: "string", minLength: 1 },
              status: { type: "string" },
              note: { type: "string" },
            },
          },
        },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  scheduleConflicts: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["startsAt", "endsAt"],
      properties: {
        eventId: { type: "string" },
        startsAt: { type: "string", minLength: 1 },
        endsAt: { type: "string", minLength: 1 },
        coachId: { type: "string" },
        studentIds: { type: "array", items: { type: "string" } },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  createTrainingSession: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["eventId", "kind"],
      properties: {
        eventId: { type: "string", minLength: 1 },
        kind: { type: "string", minLength: 1 },
        sessionPlanId: { type: "string" },
        intensity: { type: "string" },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  recordMatch: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["eventId", "matchType", "status"],
      properties: {
        eventId: { type: "string", minLength: 1 },
        matchType: { type: "string", minLength: 1 },
        status: { type: "string", minLength: 1 },
        opponentName: { type: "string" },
        homeScore: { type: "number" },
        awayScore: { type: "number" },
        rosters: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["studentId", "started"],
            properties: {
              studentId: { type: "string", minLength: 1 },
              teamId: { type: "string" },
              started: { type: "boolean" },
              minutesPlayed: { type: "number" },
              position: { type: "string" },
            },
          },
        },
        events: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["studentId", "type"],
            properties: {
              studentId: { type: "string", minLength: 1 },
              type: { type: "string", minLength: 1 },
              minute: { type: "number" },
              note: { type: "string" },
              linkedMetricId: { type: "string" },
            },
          },
        },
        notes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["studentId", "coachId", "note"],
            properties: {
              studentId: { type: "string", minLength: 1 },
              coachId: { type: "string", minLength: 1 },
              note: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
    response: {
      403: errorResponse,
    },
  },
  recordAssessment: {
    body: {
      type: "object",
      additionalProperties: true,
      required: ["studentId", "templateId", "assessedByCoachId", "scores"],
      properties: {
        studentId: { type: "string", minLength: 1 },
        templateId: { type: "string", minLength: 1 },
        assessedByCoachId: { type: "string", minLength: 1 },
        scores: { type: "array", minItems: 1, items: { type: "object", additionalProperties: true } },
      },
    },
    response: {
      403: errorResponse,
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
