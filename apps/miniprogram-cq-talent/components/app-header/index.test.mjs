import {describe,expect,it,vi} from "vitest";
let definition;globalThis.Component=value=>{definition=value;};await import("./index.ts");
describe("shared native app header",()=>{
 it.each([320,375,430])("reserves the status bar plus 44 logical pixels at width %s",width=>{
  globalThis.wx={getWindowInfo:()=>({statusBarHeight:24,windowWidth:width}),getMenuButtonBoundingClientRect:()=>({left:width-84})};
  const header={data:{...definition.data},setData(patch){Object.assign(this.data,patch);}};definition.lifetimes.attached.call(header);
  expect(header.data).toMatchObject({statusBarHeight:24,contentHeight:44,actionInset:92});
 });
 it("returns to launch when a deep link has no previous page",()=>{
  globalThis.wx={navigateBack:vi.fn(({fail})=>fail()),reLaunch:vi.fn()};const header={data:{backDisabled:false},triggerEvent:vi.fn()};definition.methods.handleBack.call(header);
  expect(wx.navigateBack).toHaveBeenCalledWith(expect.objectContaining({delta:1}));expect(wx.reLaunch).toHaveBeenCalledWith({url:"/pages/launch/index"});
 });
});

it("blocks header back while a save or publication is active",()=>{
 globalThis.wx={navigateBack:vi.fn()}; const header={data:{backDisabled:true},triggerEvent:vi.fn()};
 definition.methods.handleBack.call(header); expect(wx.navigateBack).not.toHaveBeenCalled(); expect(header.triggerEvent).not.toHaveBeenCalled();
});

it("delegates custom back without bypassing the page's unsaved-change confirmation",()=>{
 globalThis.wx={navigateBack:vi.fn()};const header={data:{backDisabled:false,customBack:true},triggerEvent:vi.fn()};
 definition.methods.handleBack.call(header);expect(header.triggerEvent).toHaveBeenCalledWith("back",{});expect(wx.navigateBack).not.toHaveBeenCalled();
});
