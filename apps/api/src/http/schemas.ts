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

export const errorResponse = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: {
    error: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {},
      },
    },
  },
} as const;

const flexibleObject = {
  type: "object",
  additionalProperties: true,
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
      required: ["kind", "score"],
      properties: {
        kind: { type: "string", const: "score_0_100" },
        score: { type: "number", minimum: 0, maximum: 100 },
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
      required: ["kind", "percentage"],
      properties: {
        kind: { type: "string", const: "percentage" },
        percentage: { type: "number" },
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
      required: ["kind", "seconds"],
      properties: {
        kind: { type: "string", const: "duration_seconds" },
        seconds: { type: "number" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "meters"],
      properties: {
        kind: { type: "string", const: "distance_meters" },
        meters: { type: "number" },
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

const domainObject = {
  type: "object",
  additionalProperties: true,
  required: ["id", "clubId", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    clubId: { type: "string" },
    ...auditFields,
  },
} as const;

const playerMetricRecord = {
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
} as const;

const calendarEventDetail = {
  type: "object",
  additionalProperties: true,
  required: ["id", "clubId", "type", "title", "timeRange", "status", "participants", "trainingSession", "match", "otherActivity", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    clubId: { type: "string" },
    type: { type: "string", enum: ["training", "match", "other"] },
    title: { type: "string" },
    timeRange: {
      type: "object",
      additionalProperties: false,
      required: ["startsAt", "endsAt"],
      properties: {
        startsAt: { type: "string" },
        endsAt: { type: "string" },
      },
    },
    status: { type: "string" },
    participants: { type: "array", items: domainObject },
    trainingSession: { anyOf: [domainObject, { type: "null" }] },
    match: { anyOf: [domainObject, { type: "null" }] },
    otherActivity: { anyOf: [domainObject, { type: "null" }] },
    ...auditFields,
  },
} as const;

const successArray = (items: unknown) => ({
  200: { type: "array", items },
  403: errorResponse,
} as const);

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
  clubTrainingSessionParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId", "trainingSessionId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
        trainingSessionId: { type: "string", minLength: 1 },
      },
    },
  },
  clubRawRecordParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId", "rawRecordId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
        rawRecordId: { type: "string", minLength: 1 },
      },
    },
  },
  clubSyncRunParams: {
    params: {
      type: "object",
      additionalProperties: false,
      required: ["clubId", "syncRunId"],
      properties: {
        clubId: { type: "string", minLength: 1 },
        syncRunId: { type: "string", minLength: 1 },
      },
    },
  },
  adminStudentListQuery: {
    querystring: {
      type: "object",
      additionalProperties: false,
      properties: {
        teamId: { type: "string", minLength: 1 },
        coachId: { type: "string", minLength: 1 },
        studentStatus: { type: "string", minLength: 1 },
        school: { type: "string", minLength: 1 },
        insuranceExpiringSoon: { type: "boolean" },
        lessonBalanceLow: { type: "boolean" },
      },
    },
  },
  importPreviewQuery: {
    querystring: {
      type: "object",
      additionalProperties: false,
      properties: {
        connectionId: { type: "string", minLength: 1 },
        tableMappingId: { type: "string", minLength: 1 },
        reviewStatus: { type: "string", enum: ["pending", "confirmed", "rejected", "linked"] },
      },
    },
  },
  dataCapabilityConfig: {
    response: {
      200: flexibleObject,
      403: errorResponse,
    },
  },
  clubCapabilities: {
    response: {
      200: flexibleObject,
      403: errorResponse,
      404: errorResponse,
    },
  },
  importPreview: {
    response: {
      200: flexibleObject,
      403: errorResponse,
    },
  },
  excelImportPreview: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["connectionId", "tableMappingId", "contentBase64"],
      properties: {
        connectionId: { type: "string", minLength: 1 },
        tableMappingId: { type: "string", minLength: 1 },
        contentBase64: { type: "string", minLength: 1 },
        worksheetName: { type: "string", minLength: 1 },
        headerRow: { type: "integer", minimum: 1 },
        fileName: { type: "string", minLength: 1 },
      },
    },
    response: {
      201: flexibleObject,
      400: errorResponse,
      403: errorResponse,
    },
  },
  syncRuns: {
    response: {
      200: {
        type: "array",
        items: flexibleObject,
      },
      403: errorResponse,
    },
  },
  syncRunDetail: {
    response: {
      200: flexibleObject,
      403: errorResponse,
      404: errorResponse,
    },
  },
  operationalStudentList: {
    response: {
      200: {
        type: "array",
        items: flexibleObject,
      },
      403: errorResponse,
    },
  },
  operationalStudentDetail: {
    response: {
      200: flexibleObject,
      403: errorResponse,
      404: errorResponse,
    },
  },
  confirmExternalRecord: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["targetType", "targetId"],
      properties: {
        targetType: { type: "string", minLength: 1 },
        targetId: { type: "string", minLength: 1 },
        confirmedBy: { type: "string", minLength: 1 },
      },
    },
    response: {
      200: flexibleObject,
      400: errorResponse,
      403: errorResponse,
      404: errorResponse,
    },
  },
  coachToday: {
    querystring: {
      type: "object",
      additionalProperties: false,
      properties: {
        date: { type: "string", minLength: 10 },
      },
    },
    response: {
      200: flexibleObject,
      403: errorResponse,
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
      additionalProperties: false,
      required: ["type", "title", "startsAt", "endsAt"],
      properties: {
        type: { type: "string", enum: ["training", "match", "other"] },
        title: { type: "string", minLength: 1 },
        startsAt: { type: "string", minLength: 1 },
        endsAt: { type: "string", minLength: 1 },
        locationId: { type: "string", minLength: 1 },
        primaryTeamId: { type: "string", minLength: 1 },
        ownerCoachId: { type: "string", minLength: 1 },
        status: { type: "string", enum: ["scheduled", "cancelled", "completed"] },
        notes: { type: "string" },
        recurrence: {
          type: "object",
          additionalProperties: false,
          required: ["frequency"],
          properties: {
            frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
            interval: { type: "integer", minimum: 1 },
            count: { type: "integer", minimum: 1, maximum: 60 },
            until: { type: "string" },
            byWeekday: {
              type: "array",
              items: { type: "string", enum: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] },
            },
          },
        },
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
        trainingSession: {
          type: "object",
          additionalProperties: false,
          required: ["kind"],
          properties: {
            kind: { type: "string", minLength: 1 },
            sessionPlanId: { type: "string", minLength: 1 },
            intensity: { type: "string" },
          },
        },
        match: {
          type: "object",
          additionalProperties: false,
          required: ["matchType"],
          properties: {
            matchType: { type: "string", minLength: 1 },
            opponentName: { type: "string" },
            homeScore: { type: "number", minimum: 0 },
            awayScore: { type: "number", minimum: 0 },
            status: { type: "string" },
          },
        },
        otherActivity: {
          type: "object",
          additionalProperties: false,
          required: ["category"],
          properties: {
            category: { type: "string", minLength: 1 },
            description: { type: "string" },
          },
        },
      },
    },
    response: {
      200: {
        anyOf: [
          calendarEventDetail,
          { type: "array", items: calendarEventDetail },
        ],
      },
      400: errorResponse,
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
  recordTrainingObservation: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["studentId", "coachId", "metricId"],
      properties: {
        studentId: { type: "string", minLength: 1 },
        coachId: { type: "string", minLength: 1 },
        metricId: { type: "string", minLength: 1 },
        rating: { type: "integer", minimum: 1, maximum: 5 },
        value: metricValue,
        tags: { type: "array", items: { type: "string" } },
        note: { type: "string" },
      },
    },
    response: {
      201: {
        type: "object",
        additionalProperties: false,
        required: ["observation", "metricRecord"],
        properties: {
          observation: domainObject,
          metricRecord: playerMetricRecord,
        },
      },
      400: errorResponse,
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
      201: {
        type: "object",
        additionalProperties: false,
        required: ["match", "rosters", "events", "notes", "metricRecords"],
        properties: {
          match: domainObject,
          rosters: { type: "array", items: domainObject },
          events: { type: "array", items: domainObject },
          notes: { type: "array", items: domainObject },
          metricRecords: { type: "array", items: playerMetricRecord },
        },
      },
      400: errorResponse,
      403: errorResponse,
    },
  },
  recordAssessment: {
    body: {
      type: "object",
      additionalProperties: false,
      required: ["studentId", "templateId", "assessedByCoachId"],
      properties: {
        studentId: { type: "string", minLength: 1 },
        templateId: { type: "string", minLength: 1 },
        templateVersionId: { type: "string", minLength: 1 },
        assessedByCoachId: { type: "string", minLength: 1 },
        assessedAt: { type: "string", minLength: 1 },
        eventId: { type: "string", minLength: 1 },
        summary: { type: "string" },
        scores: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["metricId", "value"],
            properties: {
              metricId: { type: "string", minLength: 1 },
              value: metricValue,
              normalizedScore: { type: "number" },
              rawResultId: { type: "string", minLength: 1 },
              comment: { type: "string" },
            },
          },
        },
        rawResults: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["testItemId", "value"],
            properties: {
              testItemId: { type: "string", minLength: 1 },
              metricId: { type: "string", minLength: 1 },
              value: metricValue,
              normalizedScore: { type: "number" },
              note: { type: "string" },
              comment: { type: "string" },
            },
          },
        },
      },
      anyOf: [
        { required: ["scores"] },
        { required: ["rawResults"] },
      ],
    },
    response: {
      201: {
        type: "object",
        additionalProperties: false,
        required: ["assessment", "rawResults", "scores", "metricRecords"],
        properties: {
          assessment: domainObject,
          rawResults: { type: "array", items: domainObject },
          scores: { type: "array", items: domainObject },
          metricRecords: { type: "array", items: playerMetricRecord },
        },
      },
      400: errorResponse,
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
  calendarEvents: {
    response: successArray(calendarEventDetail),
  },
  studentTimeline: {
    response: successArray(calendarEventDetail),
  },
  abilityMetrics: {
    response: successArray(domainObject),
  },
  studentMetrics: {
    querystring: {
      type: "object",
      additionalProperties: false,
      properties: {
        source: {
          anyOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
        },
      },
    },
    response: successArray(playerMetricRecord),
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
      400: errorResponse,
      403: errorResponse,
    },
  },
} as const;
