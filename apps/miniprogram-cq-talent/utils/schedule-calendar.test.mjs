import {it,expect} from "vitest";
import {calendarDataRanges,calendarDays} from "./schedule-calendar";
it("covers all 42 month cells across two legal reads and adds UTC padding only for coach date-only queries",()=>{
 expect(calendarDays("2026-08-13",true,[],"2026-08-13")).toHaveLength(42);
 expect(calendarDataRanges("2026-08-13",true)).toEqual([{from:"2026-07-27",to:"2026-08-26"},{from:"2026-08-27",to:"2026-09-06"}]);
 expect(calendarDataRanges("2026-08-13",true,true)).toEqual([{from:"2026-07-26",to:"2026-08-25"},{from:"2026-08-26",to:"2026-09-06"}]);
 expect(calendarDataRanges("2026-08-13",false,true)).toEqual([{from:"2026-08-09",to:"2026-08-16"}]);
});
it("puts a UTC evening event in the next club calendar day, deduplicates ids and retains type markers",()=>{
 const e={id:"same",type:"training",title:"边界",startsAt:"2026-08-02T16:00:00Z"};const days=calendarDays("2026-08-03",false,[e,e,{...e,id:"match",type:"match"}],"2026-08-03");
 expect(days[0]).toMatchObject({date:"2026-08-03",markers:["training","match"],overflow:1});
});
