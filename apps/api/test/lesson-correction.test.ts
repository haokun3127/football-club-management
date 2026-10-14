import { describe, expect, it } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

describe("retired app-client financial lesson flow", () => {
  it("rejects all historical financial operations without modifying the ledger", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const app = buildServer(new PersistentApiStore(persistence.repositories), { logger: false,
      membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
    const url = "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1/lesson-confirmation";
    try {
      const before = persistence.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all();
      for (const method of ["GET", "POST", "PATCH"] as const) {
        const response = await app.inject({ method, url, headers: { "x-user-id": "user-coach-1" },
          ...(method === "GET" ? {} : { payload: { studentId: "student-1", lessonDelta: -1 } }) });
        expect(response.statusCode).toBe(410);
        expect(response.json().error.code).toBe("financial_lesson_flow_retired");
      }
      expect(persistence.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(before);
      expect((await app.inject({ method: "PATCH", url, headers: { "x-user-id": "user-parent-1" }, payload: {} })).statusCode).toBe(403);
    } finally { await app.close(); persistence.database.close(); }
  });
});
