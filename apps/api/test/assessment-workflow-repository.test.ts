import { describe, expect, it, vi } from "vitest";
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
        persistence.repositories.matches.transaction(async () => 42),
      ]);
      expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled"]);
    } finally { persistence.database.close(); rmSync(directory, { recursive: true, force: true }); }
  });
});


it("restores actual published facts and unpublished corrections after restarting", { timeout: 15000 }, async () => {
  const { PersistentApiStore } = await import("../src/store.js");
  const { assessmentWorkflow } = await import("../src/application/assessment-workflow.js");
  const directory = mkdtempSync(join(tmpdir(), "assessment-published-restart-"));
  const databasePath = join(directory, "test.sqlite");
  const clubId = "club-chongqing-talent";
  vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS", clubId);
  let persistence = await createPlatformPersistence({ databasePath });
  try {
    const store = new PersistentApiStore(persistence.repositories);
    const task = { id: "restart-publication", clubId, teamId: "team-u10-dev", templateId: "assessment-template-technical", termLabel: "2026", title: "Restart test", startsOn: "2020-01-01", dueOn: "2099-12-31" };
    await store.saveAssessmentTask(task);
    const entries = store.listAssessmentTestItems(clubId).filter((item) => item.id.startsWith("assessment-test-cq-talent-")).map((item) => ({ testItemId: item.id, value: { kind: "score_0_100" as const, score: 80 } }));
    const workflow = assessmentWorkflow(store);
    await workflow.save(task, "student-1", "coach-1", { expectedRevision: 0, entries: entries.map(e=>({...e,eventId:"event-training-1"})) });
    const publication = await workflow.publish(task, "student-1", "coach-1", 1);
    await workflow.save(task, "student-1", "coach-1", { expectedRevision: 1, reason: "核对更正", entries: [{ ...entries[0]!, value: { kind: "score_0_100", score: 60 } }] });
    const facts = store.getStudentMetrics(clubId, "student-1");
    persistence.database.close();
    persistence = await createPlatformPersistence({ databasePath });
    const reopenedStore = new PersistentApiStore(persistence.repositories);
    const reopened = assessmentWorkflow(reopenedStore);
    const state = await reopened.state(task, "student-1");
    expect(state.revision).toBe(2);
    expect(state.publications[0]?.assessmentId).toBe(publication.assessmentId);
    expect(state.changes[1]?.reason).toBe("核对更正");
    expect(reopenedStore.getStudentMetrics(clubId, "student-1")).toEqual(facts);
    expect((await reopened.publish(task, "student-1", "coach-1", 1)).replayed).toBe(true);
    expect((await reopened.publish(task, "student-1", "coach-1", 2)).replayed).toBe(false);
  } finally { persistence.database.close(); vi.unstubAllEnvs(); rmSync(directory, { recursive: true, force: true }); }
});

 it("retains task selections and source course on SQLite reopen without inventing legacy selections", async () => {
   const directory=mkdtempSync(join(tmpdir(),"assessment-scope-restart-"));
   const databasePath=join(directory,"test.sqlite");
   let persistence=await createPlatformPersistence({databasePath});
   try {
     const legacy={id:"scope-legacy",clubId:"club-chongqing-talent",teamId:"team-u10-dev",templateId:"assessment-template-technical",title:"Scope",termLabel:"2026",startsOn:"2026-01-01",dueOn:"2026-12-31"};
     const selected={...legacy,id:"scope-fixed",studentIds:["student-1"],testItemIds:["assessment-test-cq-talent-03"],sourceEventId:"event-training-1"};
     persistence.repositories.assessmentTasks.save(legacy);
     persistence.repositories.assessmentTasks.save(selected);
     persistence.database.close();persistence=await createPlatformPersistence({databasePath});
     const tasks=persistence.repositories.assessmentTasks.listByClub(legacy.clubId);
     expect(tasks.find((t)=>t.id===selected.id)).toEqual(selected);
     expect(tasks.find((t)=>t.id===legacy.id)).toEqual(legacy);
   }finally{persistence.database.close();rmSync(directory,{recursive:true,force:true});}
 });
