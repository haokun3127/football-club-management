import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import type { AssessmentWorkingState } from "../src/application/assessment-workflow-types.js";

describe("assessment workflow persistence", () => {
  it("persists pinned versions, revisions and publication links across reopen", { timeout: 15000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), "assessment-workflow-"));
    const databasePath = join(directory, "test.sqlite");
    const clubId = "club-chongqing-talent";
    const taskId = "workflow-repository-test";
    let persistence = await createPlatformPersistence({ databasePath });
    try {
      persistence.repositories.assessmentTasks.save({ id: taskId, clubId, teamId: "team-u10-dev", templateId: "assessment-template-technical", termLabel: "2026", title: "Test", startsOn: "2026-01-01", dueOn: "2026-12-31" });
      const repo = persistence.repositories.assessmentWorkflow;
      repo.pin(clubId, taskId, "assessment-template-version-technical-table-20260904");
      const state: AssessmentWorkingState = { revision: 2, entries: {}, changes: [], publications: [{ revision: 2, assessmentId: "historical-link", coachId: "coach-1", publishedAt: "2026-09-15T00:00:00Z" }] };
      repo.save(clubId, taskId, "student-1", state);
      expect(() => repo.pin(clubId, taskId, "assessment-template-version-technical-1")).toThrow("already pinned");
      expect(repo.get("other-club", taskId, "student-1")).toBeNull();
      persistence.database.close();
      persistence = await createPlatformPersistence({ databasePath });
      expect(persistence.repositories.assessmentWorkflow.get(clubId, taskId, "student-1")).toEqual(state);
      expect(persistence.repositories.assessmentWorkflow.version(clubId, taskId)).toBe("assessment-template-version-technical-table-20260904");
      // Queue rejection must release the next SQLite transaction.
      const results = await Promise.allSettled([
        persistence.repositories.assessments.transaction(async () => { throw new Error("rollback"); }),
        persistence.repositories.assessments.transaction(async () => 42),
      ]);
      expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled"]);
    } finally { persistence.database.close(); rmSync(directory, { recursive: true, force: true }); }
  });
});
