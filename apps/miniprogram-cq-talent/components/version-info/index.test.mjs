import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const mocked = vi.hoisted(() => ({ client: vi.fn(), service: vi.fn() }));
vi.mock("../../utils/version", () => ({ getClientVersion: mocked.client, getServiceVersion: mocked.service }));
let definition;
globalThis.Component = value => { definition = value; };
await import("./index.ts");
const make = () => { const instance = { ...definition.methods, data: structuredClone(definition.data), setData: vi.fn(function(patch) { Object.assign(this.data, patch); }) }; definition.lifetimes.attached.call(instance); return instance; };
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => { mocked.client.mockReset().mockReturnValue({ environment: "develop", version: null, build: null }); mocked.service.mockReset().mockResolvedValue({ environment: null, build: null }); });
describe("explicit shared version diagnostics", () => {
  it("stays collapsed without reads until the user opens it, then displays unknown metadata honestly", async () => {
    const instance = make();
    expect(instance.data.expanded).toBe(false);
    expect(mocked.client).not.toHaveBeenCalled(); expect(mocked.service).not.toHaveBeenCalled();
    instance.handleToggle(); await settle();
    expect(mocked.service).toHaveBeenCalledTimes(1);
    expect(instance.data.clientRows.find(row => row.label === "微信版本").value).toBe("版本待确认");
    expect(instance.data.serverRows.find(row => row.label === "运行环境").value).toBe("环境待确认");
    instance.handleToggle(); expect(mocked.service).toHaveBeenCalledTimes(1);
    expect(instance.data.serverRows).toEqual([]);
    definition.lifetimes.detached.call(instance);
  });
  it("keeps local package facts visible on failure, redacts raw errors and supports explicit retry", async () => {
    mocked.service.mockRejectedValueOnce(new Error("private-path-sentinel"));
    const instance = make(); instance.handleToggle(); await settle();
    expect(instance.data.failed).toBe(true);
    expect(instance.data.clientRows).toHaveLength(5);
    expect(JSON.stringify(instance.data)).not.toContain("private-path-sentinel");
    await instance.handleRefresh(); expect(mocked.service).toHaveBeenCalledTimes(2);
    expect(instance.data.failed).toBe(false);
    definition.lifetimes.detached.call(instance);
  });
  it("ignores a collapsed read after re-opening and ignores responses after detach", async () => {
    let resolveFirst; mocked.service.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const instance = make(); instance.handleToggle(); instance.handleToggle(); instance.handleToggle(); await settle();
    const current = structuredClone(instance.data);
    resolveFirst({ environment: "trial", build: { sourceRevision: "a".repeat(40), buildId: "old", builtAt: "2026-10-30T00:00:00.000Z" } }); await settle();
    expect(instance.data).toEqual(current);
    let resolveDetached; mocked.service.mockImplementationOnce(() => new Promise(resolve => { resolveDetached = resolve; }));
    const pending = instance.handleRefresh(); definition.lifetimes.detached.call(instance);
    const calls = instance.setData.mock.calls.length; resolveDetached({ environment: null, build: null }); await pending;
    expect(instance.setData).toHaveBeenCalledTimes(calls);
  });
  it("uses native/TDesign controls, existing tokens and a registered component without a new route", () => {
    const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(template).toContain('bindtap="handleToggle"'); expect(template).toContain('bindtap="handleRefresh"');
    expect(template).toContain('wx:if="{{expanded}}"'); expect(template).toContain("var(--control-height)");
    expect(styles).toContain("var(--font-size-body)"); expect(styles).not.toMatch(/#[a-f\d]{3,8}/i);
    expect(JSON.parse(readFileSync(new URL("./index.json", import.meta.url), "utf8")).component).toBe(true);
  });
});
