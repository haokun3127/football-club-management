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

const { getCoachWorkbench, getParentActivityDetail } = await import("./api.ts");

describe("coach workbench participant normalization", () => {
  it("uses backend participant.status and note fields", async () => {
    const workbench = await getCoachWorkbench("event-training-1");
    expect(workbench.roster).toEqual([
      expect.objectContaining({ studentId: "student-1", status: "present", note: "Saved by backend" }),
    ]);
  });
});

describe("parent activity detail request boundary", () => {
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
