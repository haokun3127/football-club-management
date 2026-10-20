import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  restoreAppState: vi.fn(),
  onNeedPrivacyAuthorization: vi.fn(),
}));

vi.mock("./utils/store", () => ({ restoreAppState: mocks.restoreAppState }));

let appDefinition;
globalThis.App = (definition) => {
  appDefinition = definition;
  return definition;
};
globalThis.wx = {
  onNeedPrivacyAuthorization: mocks.onNeedPrivacyAuthorization,
};

await import("./app.ts");

const controller = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

describe("app privacy handler registration", () => {
  beforeEach(() => {
    mocks.restoreAppState.mockReset();
    mocks.onNeedPrivacyAuthorization.mockReset();
  });

  it("registers the global privacy authorization handler on launch", () => {
    appDefinition.onLaunch();

    expect(mocks.restoreAppState).toHaveBeenCalledTimes(1);
    expect(mocks.onNeedPrivacyAuthorization).toHaveBeenCalledTimes(1);
    expect(typeof mocks.onNeedPrivacyAuthorization.mock.calls[0][0]).toBe("function");
  });

  it("keeps the platform-side privacy declaration as an explicit human todo", () => {
    // 平台侧动作（后台配置《小程序用户隐私保护指引》并过审）无法由代码替代。
    expect(controller).toContain("平台侧人工待办");
    expect(controller).toContain("用户隐私保护指引");
    expect(controller).toContain("registerGlobalPrivacyHandler()");
  });
});
