import {afterEach,describe,it,expect,vi} from "vitest";
import {createPlatformPersistence} from "../src/persistence/platform-persistence.js";
import {PersistentApiStore} from "../src/store.js";
import {reconcileTrainingRecords,startTrainingRecordJob} from "../src/application/training-record-job.js";
import {correctTrainingRecord} from "../src/application/training-records.js";
afterEach(()=>vi.useRealTimers());
describe("automatic training records without page visits",()=>{
 it("catches up idempotently, keeps corrections and never changes finance",async()=>{
  const persistence=await createPlatformPersistence({databasePath:":memory:"});const store=new PersistentApiStore(persistence.repositories);const clubId="club-chongqing-talent";
  try {
   const ledger=structuredClone(store.getLessonLedger(clubId,"student-1"));
   await reconcileTrainingRecords(store,"2026-09-29T00:00:00Z");
   const scope={clubId,eventId:"event-training-1",studentId:"student-1"};const first=store.trainingRecords.get(clubId,scope.eventId,scope.studentId)!;
   expect(first).toMatchObject({counted:true,source:"automatic"});
   await reconcileTrainingRecords(store,"2026-09-29T01:00:00Z");expect(store.trainingRecords.get(clubId,scope.eventId,scope.studentId)).toEqual(first);
   correctTrainingRecord(store.trainingRecords,scope,{expectedRevision:first.revision,counted:false,reason:"核对缺席",actorUserId:"user-coach-1"});
   await reconcileTrainingRecords(store,"2026-09-29T02:00:00Z");expect(store.trainingRecords.get(clubId,scope.eventId,scope.studentId)).toMatchObject({counted:false,source:"correction"});expect(store.getLessonLedger(clubId,"student-1")).toEqual(ledger);
  }finally{persistence.database.close();}
 });
 it("does not overlap runs, retries failure and stops on shutdown",async()=>{
  vi.useFakeTimers();let finish:()=>void=()=>{};const errors=vi.fn();const run=vi.fn().mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;})).mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(undefined);
  const stop=startTrainingRecordJob(run,errors,1000);await vi.advanceTimersByTimeAsync(2000);expect(run).toHaveBeenCalledTimes(1);finish();await vi.advanceTimersByTimeAsync(1000);expect(errors).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(1000);expect(run).toHaveBeenCalledTimes(3);await stop();await vi.advanceTimersByTimeAsync(3000);expect(run).toHaveBeenCalledTimes(3);
 });
});
