import {describe,expect,it,vi} from "vitest";
let definition;globalThis.Component=d=>{definition=d;};
await import("./index.ts");
function instance(patch={}) {const x={...definition.methods,data:{mode:"date",value:"",start:"",end:"",disabled:false,...patch},triggerEvent:vi.fn()};x.setData=p=>Object.assign(x.data,p);return x;}
describe("official date field adapter",()=>{
 it("defaults an empty date to today without silently committing it",()=>{const x=instance();x.configure();expect(x.data.pickerValue).toMatch(/^20\d{2}-\d{2}-\d{2}$/);expect(x.triggerEvent).not.toHaveBeenCalled();});
 it("preserves the existing time string and emits exactly one confirmed value",()=>{const x=instance({mode:"time",value:"09:30"});x.configure();expect(x.data).toMatchObject({pickerValue:"09:30",format:"HH:mm",pickerMode:["hour","minute"]});x.confirm({detail:{value:"10:45"}});expect(x.triggerEvent).toHaveBeenCalledExactlyOnceWith("change",{value:"10:45"});});
 it("does not commit cancel or a form that became disabled",()=>{const x=instance({disabled:true});x.open();expect(x.data.visible).not.toBe(true);x.confirm({detail:{value:"2026-10-21"}});x.close();expect(x.triggerEvent).not.toHaveBeenCalled();});
});
