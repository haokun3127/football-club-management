import { describe, it, expect, vi } from "vitest";
vi.mock("../../../utils/auth", () => ({ requireRole: () => ({ role: "coach" }) }));
let definition;
globalThis.Page = (p) => { definition = p; };
globalThis.wx = { redirectTo: vi.fn() };
await import("./index.ts");
describe("legacy training detail links", () => {
  it("keeps the event identity when opening the replacement training record screen", () => {
    definition.onLoad.call({ setData: vi.fn() }, { id: "event/a" });
    expect(wx.redirectTo).toHaveBeenCalledWith(expect.objectContaining({ url: "/pages/coach/lesson/index?id=event%2Fa" }));
  });
  it("does not redirect without an event id", () => {
    wx.redirectTo.mockClear(); const setData = vi.fn(); definition.onLoad.call({ setData }, {});
    expect(wx.redirectTo).not.toHaveBeenCalled(); expect(setData).toHaveBeenCalled();
  });
});
