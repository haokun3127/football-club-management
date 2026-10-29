import {readFileSync} from "node:fs";
import {expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({init:vi.fn()}));
vi.mock("../../../vendor/ec-canvas/echarts",()=>({init:mocks.init}));
let canvas;globalThis.Component=definition=>{canvas=definition;};
await import("../../../components/radar-canvas/index.ts");
it("reports canvas initialization failure while the growth page keeps text outside the canvas",()=>{
 mocks.init.mockImplementation(()=>{throw new Error("canvas unavailable");});
 const component={...canvas.methods,data:{metrics:["a","b","c"].map(id=>({metricId:id,label:id,value:0,maxValue:100})),series:[],configured:false,dark:false},setData(patch){Object.assign(this.data,patch);},selectComponent:()=>({init(callback){callback({},320,300,2);}})};
 canvas.lifetimes.ready.call(component);expect(component.data.failed).toBe(true);
 const template=readFileSync(new URL("./index.wxml",import.meta.url),"utf8"),fallback=readFileSync(new URL("../../../components/radar-canvas/index.wxml",import.meta.url),"utf8");
 expect(fallback).toContain("图形加载失败，请查看下方数值明细");
 expect(template).toContain('<view class="p4-metric-list">');expect(template).toContain("{{item.label}} · {{item.value}}");
 expect(template).not.toContain('wx:if="{{!failed}}"');canvas.lifetimes.detached.call(component);
});
it.each(["growth","metric","semester-report"])("registers the TDesign controls used by %s",page=>{
 const template=readFileSync(new URL(`../${page}/index.wxml`,import.meta.url),"utf8"),config=JSON.parse(readFileSync(new URL(`../${page}/index.json`,import.meta.url),"utf8"));
 for(const match of template.matchAll(/<(t-[a-z-]+)/g))expect(config.usingComponents[match[1]]).toBeDefined();
});
