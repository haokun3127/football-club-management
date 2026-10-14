import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: "a", club: "club", values: new Map() }));
vi.mock("./store", () => ({ getSession: () => ({ role: "parent", userId: state.user, clubId: state.club, clientId: "app" }), getAppContext: () => ({ clubId: state.club, clientId: "app" }) }));
vi.mock("./config", () => ({ environmentStorageKey: key => `cqTalent:trial:${key}` }));
vi.mock("./request", () => ({ request: vi.fn() }));
import { parentShortcutOptions, restoreParentShortcuts, saveParentShortcuts } from "./club-presentation";
const presentation = { optionalFeatures: [{ key: "growth", name: "成长记录", path: "/pages/parent/growth/index" }], banners: [], shareTemplates: [], branding: null };
beforeEach(() => { state.values.clear(); state.user = "a"; state.club = "club"; globalThis.wx = { getStorageSync: key => state.values.get(key), setStorageSync: (key,value) => state.values.set(key, structuredClone(value)) }; });
describe("parent shortcut configuration", () => {
 it("retains exactly four ordered allowed actions across reopen, with account and club isolation", () => {
  const options = parentShortcutOptions(presentation);
  saveParentShortcuts(["growth", "service", "leave", "results"], options);
  expect(restoreParentShortcuts(options).map(i => i.key)).toEqual(["growth", "service", "leave", "results"]);
  expect([...state.values.keys()][0]).toMatch(/^cqTalent:trial:/);
  state.user = "b"; expect(restoreParentShortcuts(options).map(i => i.key)).toEqual(["leave", "records", "results", "service"]);
  state.user = "a"; state.club = "other"; expect(restoreParentShortcuts(options)[0].key).toBe("leave");
 });
 it("drops withdrawn features and untrusted routes, rejects duplicate or invalid saves without overwriting preference", () => {
  const options = parentShortcutOptions(presentation); saveParentShortcuts(["growth", "service", "leave", "results"], options);
  expect(parentShortcutOptions({ ...presentation, optionalFeatures: [{ key: "growth", path: "https://invalid", name: "外链" }] })).toHaveLength(4);
  expect(restoreParentShortcuts(parentShortcutOptions({ ...presentation, optionalFeatures: [] })).map(i => i.key)).toEqual(["service", "leave", "results", "records"]);
  expect(() => saveParentShortcuts(["leave", "leave", "results", "service"], options)).toThrow();
  expect(restoreParentShortcuts(options)[0].key).toBe("growth");
 });
});
