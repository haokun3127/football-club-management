import { describe, expect, it } from "vitest";

const storage = new Map([
  ["cqTalent:develop:cqTalentAppContext", {
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

const { attendanceLeaveConflictMessage, createCoachMatchEvent, getCoachAssessmentTasks, getCoachMatchDetail, getCoachWorkbench, getParentActivityDetail, getParentStudentHome, isAttendanceLeaveConflictError, resolveAttendanceLeaveConflicts, saveCoachAttendance, submitCoachAssessment, switchActiveRole, wechatLogin } = await import("./api.ts");

describe("assessment task creation transport", () => {
  it("sends the stable retry key and requires a created task identity", async () => {
    const {createCoachAssessmentTask}=await import("./api.ts");
    const originalRequest=globalThis.wx.request;
    let received;let response={statusCode:201,data:{task:{id:"new-task"}}};
    globalThis.wx.request=({header,success})=>{received=header;success(response);};
    const payload={title:"随堂测评",templateId:"template",teamId:"team",termLabel:"秋季",startsOn:"2026-09-19",dueOn:"2026-09-19"};
    try {
      await expect(createCoachAssessmentTask(payload,"assessment-task-retry")).resolves.toEqual({id:"new-task"});
      expect(received["Idempotency-Key"]).toBe("assessment-task-retry");
      response={statusCode:201,data:{task:{}}};
      await expect(createCoachAssessmentTask(payload,"assessment-task-retry")).rejects.toThrow("任务标识");
      response={statusCode:200,data:{task:{id:"unexpected"}}};
      await expect(createCoachAssessmentTask(payload,"assessment-task-retry")).rejects.toMatchObject({code:"unexpected_status"});
    } finally {globalThis.wx.request=originalRequest;}
  });
});

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
        "X-App-Client-Capabilities": "auto-active-role-v1",
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

  it("preserves RSVP statuses so an attendance save can leave untouched members unchanged", async () => {
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
      expect(workbench.roster.map((student) => student.status)).toEqual(["confirmed", "invited"]);
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

  it("sends untouched RSVP statuses without converting them to attendance decisions", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ data, success }) => {
      received = data;
      success({ statusCode: 200, data: { participants: [] } });
    };

    try {
      await saveCoachAttendance("event-training-1", [
        { studentId: "student-confirmed", name: "已确认学员", status: "confirmed" },
        { studentId: "student-invited", name: "受邀学员", status: "invited" },
      ]);
      expect(received).toEqual({
        participants: [
          { studentId: "student-confirmed", status: "confirmed", note: undefined },
          { studentId: "student-invited", status: "invited", note: undefined },
        ],
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("attendance leave conflict protection (REQ-ATT-002)", () => {
  it("carries the roster snapshot previousStatus per participant and omits it when absent", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ data, success }) => {
      received = data;
      success({ statusCode: 200, data: { participants: [] } });
    };

    try {
      await saveCoachAttendance("event-training-1", [
        { studentId: "student-1", name: "到场学员", status: "present", previousStatus: "confirmed" },
        { studentId: "student-2", name: "请假学员", status: "present", previousStatus: "leave_requested" },
        { studentId: "student-3", name: "无快照学员", status: "absent" },
      ]);
      expect(received).toEqual({
        participants: [
          { studentId: "student-1", status: "present", note: undefined, previousStatus: "confirmed" },
          { studentId: "student-2", status: "present", note: undefined, previousStatus: "leave_requested" },
          { studentId: "student-3", status: "absent", note: undefined, previousStatus: undefined },
        ],
      });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("detects the conflict through structured errorType and code instead of message matching", () => {
    expect(isAttendanceLeaveConflictError({ code: "attendance_leave_conflict", errorType: "conflict", statusCode: 409 })).toBe(true);
    expect(isAttendanceLeaveConflictError({ code: "attendance_leave_conflict", errorType: "http_error", statusCode: 400 })).toBe(false);
    expect(isAttendanceLeaveConflictError({ code: "training_record_conflict", errorType: "conflict" })).toBe(false);
    expect(isAttendanceLeaveConflictError({ message: "attendance_leave_conflict" })).toBe(false);
    expect(isAttendanceLeaveConflictError(new Error("部分学员有家长提交的请假"))).toBe(false);
    expect(isAttendanceLeaveConflictError(null)).toBe(false);
    expect(isAttendanceLeaveConflictError(undefined)).toBe(false);
  });

  it("rebuilds the conflict list from the refreshed roster using the server pass rule", () => {
    const refreshed = [
      { studentId: "student-1", name: "甲", status: "leave_requested" },
      { studentId: "student-2", name: "乙", status: "leave_requested" },
      { studentId: "student-3", name: "丙", status: "excused" },
      { studentId: "student-4", name: "丁", status: "present" },
    ];
    const attempted = [
      { studentId: "student-1", status: "present", previousStatus: "confirmed" },
      { studentId: "student-2", status: "leave_requested", previousStatus: "confirmed" },
      { studentId: "student-3", status: "present", previousStatus: "excused" },
      { studentId: "student-4", status: "absent", previousStatus: "present" },
    ];
    // 甲：家长在快照后新请假 → 冲突；乙：点名原样传回请假 → 放行；
    // 丙：携带一致的 previousStatus 显式覆盖 → 放行；丁：非请假状态 → 不适用。
    expect(resolveAttendanceLeaveConflicts(refreshed, attempted)).toEqual([
      { studentId: "student-1", name: "甲", status: "leave_requested" },
    ]);
    // 学员不在本次提交中（如新加入名单）不构成冲突
    expect(resolveAttendanceLeaveConflicts([{ studentId: "student-new", name: "新", status: "leave_requested" }], attempted)).toEqual([]);
  });

  it("formats the conflict message with the affected student names", () => {
    expect(attendanceLeaveConflictMessage([{ studentId: "student-1", name: "甲", status: "leave_requested" }]))
      .toBe("甲的家长已提交请假，名单已刷新，请核对后再提交点名。");
    expect(attendanceLeaveConflictMessage([{ studentId: "student-x", name: "", status: "excused" }]))
      .toBe("student-x的家长已提交请假，名单已刷新，请核对后再提交点名。");
    expect(attendanceLeaveConflictMessage([]))
      .toBe("部分学员的家长已提交请假，名单已刷新，请核对后再提交点名。");
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
  it("sends the caller-owned assessedAt and BFF-owned actor-free body, treating 200 as unconfirmed", async () => {
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
        assessedAt: "2026-10-21T08:00:00.000Z",
        rawResults: [{ testItemId: "item-real", metricId: "metric-real", value: { kind: "score_0_100", score: 80 } }],
      })).rejects.toMatchObject({ code: "unexpected_status", statusCode: 200 });
      expect(received).toEqual(expect.objectContaining({
        studentId: "student-1",
        templateId: "template-real",
        templateVersionId: "version-real",
        assessedAt: "2026-10-21T08:00:00.000Z",
        rawResults: [{ testItemId: "item-real", metricId: "metric-real", value: { kind: "score_0_100", score: 80 } }],
      }));
      expect(received).not.toHaveProperty("assessedByCoachId");
      expect(received).not.toHaveProperty("eventId");
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("reuses the caller-supplied assessedAt verbatim so a failed retry keeps an identical body", async () => {
    const originalRequest = globalThis.wx.request;
    const bodies = [];
    globalThis.wx.request = ({ data, success }) => {
      bodies.push(data);
      success({ statusCode: 200, data: {} });
    };

    try {
      const input = {
        studentId: "student-1",
        templateId: "template-real",
        templateVersionId: "version-real",
        assessedAt: "2026-10-21T08:00:00.000Z",
        rawResults: [{ testItemId: "item-real", metricId: "metric-real", value: { kind: "score_0_100", score: 80 } }],
      };
      // 200 被视为未确认（expectedStatus 201），两次调用等价于失败后重试同一笔提交
      await expect(submitCoachAssessment(input)).rejects.toMatchObject({ code: "unexpected_status" });
      await expect(submitCoachAssessment(input)).rejects.toMatchObject({ code: "unexpected_status" });
      expect(bodies).toHaveLength(2);
      expect(bodies[0]).toEqual(bodies[1]);
      expect(bodies[0].assessedAt).toBe("2026-10-21T08:00:00.000Z");
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("keeps the api layer free of an internally generated assessment timestamp", async () => {
    const { readFileSync } = await import("node:fs");
    const controller = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
    const fnStart = controller.indexOf("export async function submitCoachAssessment");
    const fnEnd = controller.indexOf("function requireContext");
    const fnBody = controller.slice(fnStart, fnEnd);
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    // assessedAt 只能来自调用方；api 层自造时间戳会让 body 每次变化、幂等键失效
    expect(fnBody).not.toContain("new Date().toISOString()");
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
          events: [
            { id: "match-event-1", type: "goal", studentId: "student-1", minute: 18, createdAt: "2026-08-13T09:18:00.000Z" },
            { id: "match-event-2", type: "interception", studentId: "student-1", minute: 24, createdAt: "2026-08-13T09:24:00.000Z" },
          ],
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
      expect(detail.events[1]).toMatchObject({ id: "match-event-2", type: "tackle" });
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });

  it("uses a distinct read URL when the caller requires a post-write refresh", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ url, method, success }) => {
      received = { url, method };
      success({
        statusCode: 200,
        data: {
          event: { id: "event-match-refresh", type: "match", title: "赛后刷新", startsAt: "2026-08-13T09:00:00.000Z", status: "completed" },
          roster: [],
          match: { id: "match-refresh", homeScore: 1, awayScore: 0, status: "completed" },
          events: [],
        },
      });
    };

    try {
      await getCoachMatchDetail("event-match-refresh", { forceRefresh: true });
      expect(received).toEqual(expect.objectContaining({
        method: "GET",
        url: expect.stringMatching(/\/coach\/events\/event-match-refresh\/match\?refresh=\d+-\d+$/),
      }));
    } finally {
      globalThis.wx.request = originalRequest;
    }
  });
});

describe("coach assessment task request boundary", () => {
  it("uses a distinct read URL when the caller requires a post-write refresh", async () => {
    const originalRequest = globalThis.wx.request;
    let received;
    globalThis.wx.request = ({ url, method, success }) => {
      received = { url, method };
      success({ statusCode: 200, data: { tasks: [] } });
    };

    try {
      await getCoachAssessmentTasks({ forceRefresh: true });
      expect(received).toEqual(expect.objectContaining({
        method: "GET",
        url: expect.stringMatching(/\/coach\/assessment-tasks\?refresh=\d+-\d+$/),
      }));
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

describe("published score display transport", () => {
  it("preserves standard scores while scaling score measurements by their actual maximum", async () => {
    const { getCoachStudentRadar } = await import("./api.ts");
    const original = wx.request;
    wx.request = ({ success }) => success({ statusCode: 200, data: { overall: 76.5, latest: [
      { metric: { id: "computed", name: "运控球", maxScore: 20 }, record: { value: { kind: "measurement", value: 15, unit: "score" } } },
      { metric: { id: "legacy", name: "传接球", maxScore: 10 }, record: { value: { kind: "score_0_100", score: 75 } } },
      { metric: { id: "unknown", name: "未配置" }, record: { value: { kind: "measurement", value: 5, unit: "score" } } },
    ] } });
    try {
      const points = await getCoachStudentRadar("student-1");
      expect(points.map((point) => [point.value, point.maxValue, point.overallScore])).toEqual([[15, 20, 76.5], [75, 100, 76.5], [5, 0, 76.5]]);
    } finally { wx.request = original; }
  });
});


describe("event presentation transport", () => {
  it("normalizes typed facts and keeps a real zero score without depending on labels", async () => {
    const original = wx.request;
    wx.request = ({ success }) => success({ statusCode: 200, data: {
      event: { id: "training", type: "training", title: "本次训练", participants: [{ studentId: "child", studentName: "小宝", status: "confirmed" }] },
      presentation: {
        startsAt: "2026-10-22T09:00:00+08:00", endsAt: "2026-10-22T10:30:00+08:00",
        team: { id: "team", name: "U10" }, venue: { id: "venue", name: "足球公园" }, coach: { id: "coach", name: "王教练" },
        training: { state: "planned", summary: "射门、带球", abilityTags: ["技术"] },
      },
    } });
    try {
      const result = await getParentActivityDetail("training");
      expect(result.presentation).toMatchObject({ teamName: "U10", venueName: "足球公园", coachName: "王教练", training: { state: "planned", summary: "射门、带球", abilityTags: ["技术"] } });
      expect(result.participants[0]).toMatchObject({ studentId: "child", name: "小宝" });
      wx.request = ({ success }) => success({ statusCode: 200, data: { event: { id: "match", type: "match" }, match: { homeScore: 0, awayScore: 1 } } });
      expect((await getParentActivityDetail("match")).match).toMatchObject({ homeScore: 0, awayScore: 1 });
    } finally { wx.request = original; }
  });
  it("keeps legacy responses readable but does not describe unavailable content as unarranged", async () => {
    const original = wx.request;
    wx.request = ({ success }) => success({ statusCode: 200, data: { event: { id: "legacy", type: "training", venue: "既有场地", teamName: "既有球队", timeRange: { startsAt: "2026-10-22T09:00:00+08:00" } } } });
    try {
      const result = await getParentActivityDetail("legacy");
      expect(result.presentation).toMatchObject({ venueName: "既有场地", teamName: "既有球队", training: { state: "unavailable", summary: "" } });
      expect(JSON.stringify(result.sections)).not.toContain("教练尚未补充");
    } finally { wx.request = original; }
  });
});
