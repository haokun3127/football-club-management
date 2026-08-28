import { describe, expect, it } from "vitest";

const storage = new Map([
  ["cqTalentAppContext", {
    clubId: "club-chongqing-talent",
    clientId: "app-client-cq-talent-wechat-main",
    capabilities: { client: { roleEntrypoints: { coach: ["attendance"] } } },
  }],
]);

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  request: ({ success }) => success({
    statusCode: 200,
    data: {
      event: {
        id: "event-training-1",
        title: "Training",
        type: "training",
        startsAt: "2026-07-01T09:00:00.000Z",
        endsAt: "2026-07-01T10:30:00.000Z",
        status: "scheduled",
      },
      rosterContext: {
        participants: [{ studentId: "student-1", status: "present", note: "Saved by backend" }],
        students: [{ id: "student-1", name: "Player" }],
      },
      workflow: {},
      training: {},
      match: {},
      assessment: {},
    },
  }),
};

const { correctCoachLesson, createCoachMatchEvent, getCoachMatchDetail, getCoachWorkbench, getParentActivityDetail, getParentStudentHome, saveCoachAttendance, submitCoachAssessment, switchActiveRole, wechatLogin } = await import("./api.ts");

describe("active-role session transport", () => {
  it("advertises the role-switch capability when starting WeChat login", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ header, success }) => {
      received = header;
      success({ statusCode: 200, data: { status: "binding_required" } });
    };

    try {
      await wechatLogin("wx-code", "phone-code");
      expect(received).toMatchObject({
        "X-App-Client-Capabilities": "active-role-switch-v1",
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("uses the pending login token only for the role-selection request", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ url, method, data, header, success }) => {
      received = { url, method, data, header };
      success({ statusCode: 200, data: { status: "authenticated" } });
    };

    try {
      await switchActiveRole("parent", "pending-role-token");
      expect(received).toMatchObject({
        method: "POST",
        url: expect.stringContaining("/session/role"),
        data: { role: "parent" },
        header: expect.objectContaining({ Authorization: "Bearer pending-role-token" }),
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach workbench participant normalization", () => {
  it("uses backend participant.status and note fields", async () => {
    const workbench = await getCoachWorkbench("event-training-1");
    expect(workbench.roster).toEqual([
      expect.objectContaining({ studentId: "student-1", status: "present", note: "Saved by backend" }),
    ]);
  });

  it("treats RSVP confirmations as pending until a coach records attendance", async () => {
    const originalRequest = globalThis.wx.request;
    globalThis.wx.request = ({ success }) => success({
      statusCode: 200,
      data: {
        event: {
          id: "event-training-pending",
          title: "Upcoming training",
          type: "training",
          startsAt: "2026-08-13T09:00:00.000Z",
          endsAt: "2026-08-13T10:30:00.000Z",
          status: "scheduled",
        },
        rosterContext: {
          participants: [
            { studentId: "student-confirmed", status: "confirmed" },
            { studentId: "student-invited", status: "invited" },
          ],
          students: [
            { id: "student-confirmed", name: "Confirmed RSVP" },
            { id: "student-invited", name: "Invited RSVP" },
          ],
        },
        workflow: {},
        training: {},
        match: {},
        assessment: {},
      },
    });

    try {
      const workbench = await getCoachWorkbench("event-training-pending");
      expect(workbench.roster.map((student) => student.status)).toEqual(["pending", "pending"]);
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("preserves an explicit empty note so a coach can clear a saved attendance note", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ data, success }) => {
      received = data;
      success({ statusCode: 200, data: { participants: [] } });
    };

    try {
      await saveCoachAttendance("event-training-1", [{ studentId: "student-1", name: "Player", status: "present", note: "" }]);
      expect(received).toEqual({ participants: [{ studentId: "student-1", status: "present", note: "" }] });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach lesson correction request boundary", () => {
  it("sends only the correction payload with the page-owned stable idempotency key", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ data, header, success }) => {
      received = { data, header };
      success({ statusCode: 200, data: { ledger: {} } });
    };

    try {
      await correctCoachLesson("event-training-1", "student-1", 0.5, "Attendance follow-up", "lesson-correction-key");
      expect(received).toEqual(expect.objectContaining({
        data: {
          studentId: "student-1",
          lessonDelta: 0.5,
          reason: "Attendance follow-up",
        },
        header: expect.objectContaining({ "Idempotency-Key": "lesson-correction-key" }),
      }));
      expect(received.data).not.toHaveProperty("actorUserId");
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach lesson confirmation ledger normalization", () => {
  it("unwraps the backend ledger object and keeps source ids for settlement checks", async () => {
    const originalRequest = globalThis.wx.request;
    globalThis.wx.request = ({ success }) => success({
      statusCode: 200,
      data: {
        participants: [{ studentId: "student-1", status: "present" }],
        ledgers: [{
          studentId: "student-1",
          ledger: {
            balance: 8,
            entries: [{ sourceId: "app-client-lesson-event-1-student-1" }],
          },
        }],
      },
    });

    try {
      const { getCoachLessonConfirmation } = await import("./api.ts");
      await expect(getCoachLessonConfirmation("event-1")).resolves.toMatchObject({
        participants: [{
          studentId: "student-1",
          remainingLessons: 8,
        }],
        ledgers: [{
          studentId: "student-1",
          balance: 8,
          sourceIds: ["app-client-lesson-event-1-student-1"],
        }],
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach assessment submission boundary", () => {
  it("sends the BFF-owned actor-free assessment body and treats 200 as unconfirmed", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ data, success }) => {
      received = data;
      success({ statusCode: 200, data: { assessment: { id: "not-confirmed" } } });
    };

    try {
      await expect(submitCoachAssessment({
        studentId: "student-1",
        templateId: "template-real",
        templateVersionId: "version-real",
        rawResults: [{ testItemId: "item-real", metricId: "metric-real", value: { kind: "score_0_100", score: 80 } }],
      })).rejects.toMatchObject({ code: "unexpected_status", statusCode: 200 });
      expect(received).toEqual(expect.objectContaining({
        studentId: "student-1",
        templateId: "template-real",
        templateVersionId: "version-real",
        rawResults: [{ testItemId: "item-real", metricId: "metric-real", value: { kind: "score_0_100", score: 80 } }],
      }));
      expect(received).not.toHaveProperty("assessedByCoachId");
      expect(received).not.toHaveProperty("eventId");
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach match detail request boundary", () => {
  it("reads the authorized event-match projection without producing a synthetic summary", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ url, method, success }) => {
      received = { url, method };
      success({
        statusCode: 200,
        data: {
          event: { id: "event-match-1", type: "match", title: "Real match", startsAt: "2026-08-13T09:00:00.000Z", endsAt: "2026-08-13T10:00:00.000Z", status: "completed" },
          roster: [{ studentId: "student-1", name: "Athlete One", status: "present" }],
          match: { id: "match-1", homeScore: 2, awayScore: 1, status: "completed" },
          events: [{ id: "match-event-1", type: "goal", studentId: "student-1", minute: 18, createdAt: "2026-08-13T09:18:00.000Z" }],
        },
      });
    };

    try {
      const detail = await getCoachMatchDetail("event-match-1");
      expect(received).toEqual(expect.objectContaining({
        method: "GET",
        url: expect.stringContaining("/coach/events/event-match-1/match"),
      }));
      expect(detail).toMatchObject({ event: { id: "event-match-1" }, match: { id: "match-1" } });
      expect(detail).not.toHaveProperty("summary");
      expect(detail.events[0]).not.toHaveProperty("assistStudentId");
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach match-event create request boundary", () => {
  it("uses the scoped POST with only the approved body and an exact 201 response", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ url, method, data, header, success }) => {
      received = { url, method, data, header };
      success({
        statusCode: 201,
        data: { event: { id: "server-event", studentId: "student-1", type: "goal", minute: 12, note: "Recorded fact" } },
      });
    };

    try {
      await expect(createCoachMatchEvent(
        "event-match-1",
        { studentId: "student-1", type: "goal", minute: 12, note: "Recorded fact" },
        "match-event-stable-key",
      )).resolves.toEqual({ event: expect.objectContaining({ id: "server-event", studentId: "student-1", type: "goal" }) });
      expect(received).toEqual(expect.objectContaining({
        method: "POST",
        url: expect.stringContaining("/coach/events/event-match-1/match/events"),
        data: { studentId: "student-1", type: "goal", minute: 12, note: "Recorded fact" },
        header: expect.objectContaining({ "Idempotency-Key": "match-event-stable-key" }),
      }));
      expect(received.data).not.toHaveProperty("actorUserId");
      expect(received.data).not.toHaveProperty("matchId");
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("rejects a body-bearing 200 response so C6.1 retains its device-local draft", async () => {
    const originalRequest = globalThis.wx.request;
    globalThis.wx.request = ({ success }) => {
      success({
        statusCode: 200,
        data: { event: { id: "server-event", studentId: "student-1", type: "goal", minute: 12 } },
      });
    };

    try {
      await expect(createCoachMatchEvent(
        "event-match-1",
        { studentId: "student-1", type: "goal", minute: 12 },
        "match-event-stable-key",
      )).rejects.toEqual({
        code: "unexpected_status",
        message: "Unexpected response status",
        statusCode: 200,
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("parent activity detail request boundary", () => {
  it("renders internal match types as Chinese labels in parent activity details", async () => {
    const originalRequest = globalThis.wx.request;
    globalThis.wx.request = ({ success }) => success({
      statusCode: 200,
      data: {
        event: {
          id: "event-match-label",
          title: "周末友谊赛战报",
          type: "match",
          startsAt: "2026-08-17T09:00:00.000Z",
          endsAt: "2026-08-17T11:00:00.000Z",
          status: "completed",
        },
        match: { opponentName: "山城少年足球队", matchType: "friendly", homeScore: 4, awayScore: 2 },
      },
    });

    try {
      const detail = await getParentActivityDetail("event-match-label");
      const matchSection = detail.sections.find((section) => section.title === "比赛信息");
      expect(matchSection?.items).toContainEqual({ label: "比赛类型", value: "友谊赛" });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("rejects an unavailable activity instead of returning a fictional pending detail", async () => {
    const originalRequest = globalThis.wx.request;
    globalThis.wx.request = ({ fail }) => fail({ errMsg: "activity missing" });

    try {
      await expect(getParentActivityDetail("missing-event")).rejects.toMatchObject({
        code: "network_error",
        message: "activity missing",
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("parent student-home request boundary", () => {
  it("rejects an unavailable student home instead of returning fictional lesson or insurance data", async () => {
    const originalRequest = globalThis.wx.request;
    globalThis.wx.request = ({ fail }) => fail({ errMsg: "student home unavailable" });

    try {
      await expect(getParentStudentHome({ id: "student-1", name: "Player", teams: [], coachNames: [] })).rejects.toMatchObject({
        code: "network_error",
        message: "student home unavailable",
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});
