import {describe,expect,it,vi} from "vitest";
let definition;globalThis.Component=value=>{definition=value};
await import("../../../components/schedule-calendar/index.ts");
function instance(patch={}) {const page={...definition.methods,data:{date:"2026-01-31",expanded:true,...patch},triggerEvent:vi.fn()};return page;}
describe("shared calendar interactions",()=>{
  it("changes dates without implicitly closing the month",()=>{
    const page=instance();page.choose({currentTarget:{dataset:{date:"2026-01-20"}}});
    expect(page.triggerEvent).toHaveBeenCalledExactlyOnceWith("change",{date:"2026-01-20"});expect(page.data.expanded).toBe(true);
  });
  it("uses the same clamped month move and explicit collapse for both roles",()=>{
    const page=instance();page.shift({currentTarget:{dataset:{offset:1}}});expect(page.triggerEvent).toHaveBeenLastCalledWith("change",{date:"2026-02-28"});
    page.toggle();expect(page.triggerEvent).toHaveBeenLastCalledWith("viewchange",{expanded:false});
  });
  it("ignores vertical scrolling and only shifts on a clear horizontal gesture",()=>{
    const page=instance({date:"2026-08-13",expanded:false});
    page.touchStart({touches:[{clientX:100,clientY:100}]});page.touchEnd({changedTouches:[{clientX:105,clientY:200}]});expect(page.triggerEvent).not.toHaveBeenCalled();
    page.touchStart({touches:[{clientX:100,clientY:100}]});page.touchEnd({changedTouches:[{clientX:20,clientY:105}]});expect(page.triggerEvent).toHaveBeenCalledExactlyOnceWith("change",{date:"2026-08-20"});
  });
});
