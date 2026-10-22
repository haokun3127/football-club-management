import { beforeEach, expect, it, vi } from "vitest";
import { openRoleTab, ROLE_TABS } from "./navigation";
beforeEach(() => vi.stubGlobal("wx", { reLaunch: vi.fn() }));
it("resolves the shared role registry and retains discover deep-link compatibility", () => {
  for (const [role, tabs] of Object.entries(ROLE_TABS)) for (const tab of tabs) { openRoleTab(role, tab.key); expect(wx.reLaunch).toHaveBeenLastCalledWith({url:tab.path}); }
  openRoleTab("parent", "discover"); expect(wx.reLaunch).toHaveBeenLastCalledWith({url:"/pages/parent/content/index"});
  wx.reLaunch.mockClear(); openRoleTab("coach", "home"); expect(wx.reLaunch).not.toHaveBeenCalled();
});
