import {describe,expect,it} from "vitest";
import {calendarDays,calendarGridHeight} from "../../../utils/schedule-calendar";
import {calendarDateKey,shiftCalendarMonth} from "../../../utils/date";
const event=(id,startsAt,type="training")=>({id,startsAt,type,title:id,endsAt:startsAt,childIds:[],status:"scheduled"});
describe("shared club calendar model",()=>{
  it("lays out seven days or a six-row Monday-first month",()=>{
    expect(calendarDays("2026-08-13",false,[]).map(x=>x.date)).toEqual(["2026-08-10","2026-08-11","2026-08-12","2026-08-13","2026-08-14","2026-08-15","2026-08-16"]);
    const days=calendarDays("2026-08-13",true,[],"2026-08-13");
    expect(days).toHaveLength(42);expect(days[0].date).toBe("2026-07-27");expect(days.at(-1).date).toBe("2026-09-06");
    expect(days.find(x=>x.date==="2026-08-13")).toMatchObject({selected:true,today:true});
  });
  it("uses club timezone, sorts facts and counts duplicate events once",()=>{
    expect(calendarDateKey("2026-08-12T16:30:00Z")).toBe("2026-08-13");
    const input=[event("later","2026-08-13T12:00:00+08:00","match"),event("first","2026-08-13T09:00:00+08:00"),event("first","2026-08-13T09:00:00+08:00")];
    const day=calendarDays("2026-08-13",true,input).find(x=>x.date==="2026-08-13");
    expect(day).toMatchObject({title:"first",type:"training",overflow:1,markers:["training","match"]});expect(day.label).toContain("另有1项");
  });
  it("clamps month end and crosses leap years without losing the intended day",()=>{
    expect(shiftCalendarMonth("2026-01-31",1)).toBe("2026-02-28");
    expect(shiftCalendarMonth("2028-01-31",1)).toBe("2028-02-29");
    expect(shiftCalendarMonth("2026-12-13",1)).toBe("2027-01-13");
  });
  it("keeps six rows scrollable within the same explicit height budget",()=>{
    expect(calendarGridHeight(42,400)).toBe(108);
    expect(calendarGridHeight(42,900)).toBe(288);
    expect(calendarGridHeight(42,400)+152).toBeLessThanOrEqual(400*.65);
  });
});
