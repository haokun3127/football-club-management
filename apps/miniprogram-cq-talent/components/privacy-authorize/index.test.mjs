import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscribePrivacyAuthorization: vi.fn(),
  settlePrivacyAuthorization: vi.fn(),
  openPrivacyContract: vi.fn(),
  getPrivacyContractName: vi.fn(),
}));

vi.mock("../../utils/privacy", () => ({
  subscribePrivacyAuthorization: mocks.subscribePrivacyAuthorization,
  settlePrivacyAuthorization: mocks.settlePrivacyAuthorization,
  openPrivacyContract: mocks.openPrivacyContract,
  getPrivacyContractName: mocks.getPrivacyContractName,
}));

let componentDefinition;
globalThis.Component = (definition) => {
  componentDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

function createComponentInstance() {
  const instance = {
    ...componentDefinition,
    data: { ...componentDefinition.data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("privacy authorize popup", () => {
  beforeEach(() => {
    mocks.subscribePrivacyAuthorization.mockReset().mockReturnValue(vi.fn());
    mocks.settlePrivacyAuthorization.mockReset().mockReturnValue(true);
    mocks.openPrivacyContract.mockReset();
    mocks.getPrivacyContractName.mockReset().mockReturnValue("《重庆天才隐私保护指引》");
  });

  it("subscribes on attach and unsubscribes on detach", () => {
    const instance = createComponentInstance();
    const unsubscribe = vi.fn();
    mocks.subscribePrivacyAuthorization.mockReturnValue(unsubscribe);

    componentDefinition.lifetimes.attached.call(instance);
    expect(mocks.subscribePrivacyAuthorization).toHaveBeenCalledTimes(1);
    expect(instance.data.visible).toBe(false);

    componentDefinition.lifetimes.detached.call(instance);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("shows for a pending request and hides once it settles", () => {
    const instance = createComponentInstance();
    let subscriber;
    mocks.subscribePrivacyAuthorization.mockImplementation((listener) => {
      subscriber = listener;
      return vi.fn();
    });
    componentDefinition.lifetimes.attached.call(instance);

    subscriber({ resolve: vi.fn(), referrer: "wx.setClipboardData" });
    expect(instance.data.visible).toBe(true);
    expect(instance.data.contractName).toBe("《重庆天才隐私保护指引》");

    subscriber(null);
    expect(instance.data.visible).toBe(false);
  });

  it("settles agreement with the official agree button id", () => {
    const instance = createComponentInstance();

    componentDefinition.methods.handleAgree.call(instance);

    expect(mocks.settlePrivacyAuthorization).toHaveBeenCalledWith({ buttonId: "privacy-agree-btn", event: "agree" });
  });

  it("settles refusal without a button id", () => {
    const instance = createComponentInstance();

    componentDefinition.methods.handleDisagree.call(instance);

    expect(mocks.settlePrivacyAuthorization).toHaveBeenCalledWith({ event: "disagree" });
  });

  it("opens the platform privacy contract from the link", () => {
    const instance = createComponentInstance();

    componentDefinition.methods.openContract.call(instance);

    expect(mocks.openPrivacyContract).toHaveBeenCalledTimes(1);
  });

  it("renders the official agree protocol controls in the popup", () => {
    expect(template).toContain('id="privacy-agree-btn"');
    expect(template).toContain('open-type="agreePrivacyAuthorization"');
    expect(template).toContain('bindagreeprivacyauthorization="handleAgree"');
    expect(template).toContain('bindtap="handleDisagree"');
    expect(template).toContain('bindtap="openContract"');
    expect(template).toContain("{{contractName}}");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).toContain('const AGREE_BUTTON_ID = "privacy-agree-btn"');
  });

  it("styles the popup with club tokens instead of hardcoded colors", () => {
    expect(styles).toContain("var(--club-nav)");
    expect(styles).toContain("var(--club-shadow)");
    expect(styles).toContain("var(--color-brand)");
    expect(styles).toContain("var(--club-muted)");
    // 唯一允许的字面色：主按钮白字（与 role-tabbar 深色态的既有惯例一致）。
    expect(styles.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []).toEqual(["#ffffff"]);
  });
});
