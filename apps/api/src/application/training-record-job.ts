import type { CalendarEvent } from "@football-club/domain";
import type { ApiStore } from "../store.js";
import { reconcileTrainingRecord } from "./training-records.js";

/** Catch up after downtime, then repeat without requiring anyone to open a page. */
export async function reconcileTrainingRecords(store:ApiStore,now=new Date().toISOString()) {
  let processed=0;
  for(const club of await store.listClubs()) {
    const participants=store.listEventParticipants(club.id);
    const byEvent=new Map<string,typeof participants>();
    for(const participant of participants){const group=byEvent.get(participant.eventId)??[];group.push(participant);byEvent.set(participant.eventId,group);}
    for(const event of store.listCalendarEvents(club.id) as CalendarEvent[]) {
      if(event.type!=="training")continue;
      for(const participant of byEvent.get(event.id)??[]) {
        if(reconcileTrainingRecord(store.trainingRecords,event,participant,now))processed+=1;
      }
    }
  }
  return {processed};
}

export function startTrainingRecordJob(run:()=>Promise<unknown>,onError:(error:unknown)=>void,intervalMs=60_000) {
  let stopped=false;let inFlight:Promise<void>|undefined;
  const tick=()=>{
    if(stopped||inFlight)return;
    inFlight=Promise.resolve().then(run).then(()=>{},onError).finally(()=>{inFlight=undefined;});
  };
  tick();const timer=setInterval(tick,intervalMs);timer.unref();
  return async()=>{stopped=true;clearInterval(timer);await inFlight;};
}
