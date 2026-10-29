import { afterEach, describe, expect, it, vi } from "vitest";

const storage = new Map([["cqTalent:develop:cqTalentAppContext", { clubId: "club", clientId: "client", capabilities: {} }]]);
const network = vi.fn();
globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getStorageSync: key => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key),
  request: network,
};
const { getCoachTrainingContentAssessments, saveCoachTrainingContentAssessments } = await import("./api.ts");
const rows = [{ studentId: "student", trainingProjectId: "project", score: 0, note: "有效零分" }];
afterEach(() => network.mockReset());
describe("classroom snapshot concurrency transport", () => {
  it("continues reading older snapshots but refuses missing/invalid write revisions without fetching or writing", async () => {
    network.mockImplementationOnce(({ success }) => success({ statusCode: 200, data: { eventId: "event", selectedProjectIds: ["project"], presentStudentIds: ["student"], assessments: [] } }));
    const old = await getCoachTrainingContentAssessments("event");
    expect(old.revision).toBeUndefined();
    for (const revision of [undefined, -1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(saveCoachTrainingContentAssessments("event", rows, revision)).rejects.toMatchObject({ code: "precondition_required", statusCode: 428 });
    }
    expect(network).toHaveBeenCalledTimes(1); // No automatic GET-and-rebase of stale rows.
  });

  it("sends the revision actually reviewed, preserves zero and reuses the key after an unknown outcome", async () => {
    network.mockImplementationOnce(({ fail }) => fail({ errMsg: "request:fail timeout" }));
    await expect(saveCoachTrainingContentAssessments("event", rows, 3)).rejects.toMatchObject({ errorType: "timeout" });
    const first = network.mock.calls[0][0];
    expect(first.method).toBe("PUT");
    expect(first.data).toEqual({ expectedRevision: 3, assessments: rows });
    network.mockImplementationOnce(({ success }) => success({ statusCode: 200, data: { eventId: "event", revision: 4, assessments: rows } }));
    await expect(saveCoachTrainingContentAssessments("event", rows, 3)).resolves.toEqual({ eventId: "event", revision: 4, assessments: rows });
    expect(network.mock.calls[1][0].header["Idempotency-Key"]).toBe(first.header["Idempotency-Key"]);
  });

  it("returns conflicts and upgrade guidance to the page without retrying with a newly fetched revision", async () => {
    network.mockImplementationOnce(({ success }) => success({ statusCode: 409, data: { error: { code: "training_assessment_revision_conflict", message: "请保留输入核对", details: [{ revision: 7 }] } } }));
    await expect(saveCoachTrainingContentAssessments("event", rows, 4)).rejects.toMatchObject({ code: "training_assessment_revision_conflict", errorType: "conflict", details: [{ revision: 7 }] });
    network.mockImplementationOnce(({ success }) => success({ statusCode: 428, data: { error: { code: "precondition_required", message: "请更新客户端" } } }));
    await expect(saveCoachTrainingContentAssessments("event", rows, 4)).rejects.toMatchObject({ code: "precondition_required", errorType: "precondition_required", userMessage: expect.stringContaining("更新小程序") });
    expect(network).toHaveBeenCalledTimes(2);
  });
});
