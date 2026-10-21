import {it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({read:vi.fn()}));vi.mock("../../utils/api",()=>({getRadarComparison:m.read}));let def;globalThis.Component=value=>{def=value;};await import("./index.ts");
const make=()=>({...def.methods,data:{...structuredClone(def.data),studentId:"child",role:"parent",teamId:""},setData(p){Object.assign(this.data,p);}});
it("clears previous data when the identity is removed and rejects the late request",async()=>{
 let resolve;m.read.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const p=make();def.lifetimes.attached.call(p);p.data.data={old:true};p.data.studentId="";await p.load();expect(p.data.data).toBeNull();resolve({views:[]});await Promise.resolve();expect(p.data.state).toBe("idle");def.lifetimes.detached.call(p);
});
it("removes previous plotted data while a replacement source fails, leaving explicit retry",async()=>{
 m.read.mockRejectedValueOnce(new Error("withdrawn"));const p=make();p.data.data={old:true};def.lifetimes.attached.call(p);await new Promise(r=>setTimeout(r,0));expect(p.data).toMatchObject({state:"error",data:null,plots:[]});def.lifetimes.detached.call(p);
});

it("can clear a withdrawn comparison and reload the current source instead of retrying a stale ID forever",async()=>{
 const p=make();p.data.historyResultId="withdrawn";p.data.standardId="old";p.data.hiddenIds=["current"];p.load=vi.fn().mockResolvedValue();await p.clearComparisons();expect(p.data).toMatchObject({historyResultId:"",standardId:"",hiddenIds:[]});expect(p.load).toHaveBeenCalledWith(true);
});
