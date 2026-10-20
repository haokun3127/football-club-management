import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  registerGlobalPrivacyHandler,
  subscribePrivacyAuthorization,
  settlePrivacyAuthorization,
  ensurePrivacyAuthorized,
  openPrivacyContract,
  getPrivacyContractName,
  resetPrivacyStateForTesting,
} = await import("./privacy.ts");

function createWxMock() {
  return {
    getPrivacySetting: vi.fn(),
    onNeedPrivacyAuthorization: vi.fn(),
    requirePrivacyAuthorize: vi.fn(),
    openPrivacyContract: vi.fn(),
  };
}

describe("privacy authorization chain", () => {
  let wxMock;

  beforeEach(() => {
    wxMock = createWxMock();
    globalThis.wx = wxMock;
    resetPrivacyStateForTesting();
  });

  it("registers the global handler once and is idempotent", () => {
    registerGlobalPrivacyHandler();
    registerGlobalPrivacyHandler();
    expect(wxMock.onNeedPrivacyAuthorization).toHaveBeenCalledTimes(1);
    expect(typeof wxMock.onNeedPrivacyAuthorization.mock.calls[0][0]).toBe("function");
  });

  it("leaves the request to the official fallback popup when no popup subscriber exists", () => {
    registerGlobalPrivacyHandler();
    const listener = wxMock.onNeedPrivacyAuthorization.mock.calls[0][0];
    const resolve = vi.fn();

    listener(resolve, { referrer: "wx.setClipboardData" });

    expect(resolve).not.toHaveBeenCalled();
  });

  it("reports exposure, delivers the request to subscribers, and settles on agree", () => {
    registerGlobalPrivacyHandler();
    const listener = wxMock.onNeedPrivacyAuthorization.mock.calls[0][0];
    const resolve = vi.fn();
    const received = [];
    subscribePrivacyAuthorization((request) => received.push(request));
    received.length = 0;

    listener(resolve, { referrer: "wx.setClipboardData" });

    expect(resolve).toHaveBeenCalledWith({ event: "exposureAuthorization" });
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ resolve, referrer: "wx.setClipboardData" });

    const settled = settlePrivacyAuthorization({ buttonId: "privacy-agree-btn", event: "agree" });
    expect(settled).toBe(true);
    expect(resolve).toHaveBeenCalledWith({ buttonId: "privacy-agree-btn", event: "agree" });
    expect(received[received.length - 1]).toBeNull();
  });

  it("settles on disagree so the blocked privacy API fails explicitly", () => {
    registerGlobalPrivacyHandler();
    const listener = wxMock.onNeedPrivacyAuthorization.mock.calls[0][0];
    const resolve = vi.fn();
    subscribePrivacyAuthorization(() => {});

    listener(resolve, { referrer: "wx.setClipboardData" });
    const settled = settlePrivacyAuthorization({ event: "disagree" });

    expect(settled).toBe(true);
    expect(resolve).toHaveBeenCalledWith({ event: "disagree" });
    expect(settlePrivacyAuthorization({ event: "agree", buttonId: "x" })).toBe(false);
  });

  it("delivers the pending request to a late-attaching subscriber", () => {
    registerGlobalPrivacyHandler();
    const listener = wxMock.onNeedPrivacyAuthorization.mock.calls[0][0];
    const resolve = vi.fn();
    subscribePrivacyAuthorization(() => {});
    listener(resolve, { referrer: "wx.setClipboardData" });

    const lateReceived = [];
    subscribePrivacyAuthorization((request) => lateReceived.push(request));

    expect(lateReceived).toHaveLength(1);
    expect(lateReceived[0].resolve).toBe(resolve);
  });

  it("auto-settles as disagree when the last popup subscriber detaches mid-request", () => {
    registerGlobalPrivacyHandler();
    const listener = wxMock.onNeedPrivacyAuthorization.mock.calls[0][0];
    const resolve = vi.fn();
    const unsubscribe = subscribePrivacyAuthorization(() => {});
    listener(resolve, { referrer: "wx.setClipboardData" });

    unsubscribe();

    expect(resolve).toHaveBeenCalledWith({ event: "disagree" });
    expect(settlePrivacyAuthorization({ event: "agree", buttonId: "x" })).toBe(false);
  });

  it("passes through immediately when the user already agreed (no repeated prompting)", async () => {
    wxMock.getPrivacySetting.mockImplementation(({ success }) => success({ needAuthorization: false, privacyContractName: "《重庆天才隐私保护指引》" }));

    await expect(ensurePrivacyAuthorized()).resolves.toBe(true);
    expect(wxMock.requirePrivacyAuthorize).not.toHaveBeenCalled();
    expect(getPrivacyContractName()).toBe("《重庆天才隐私保护指引》");
  });

  it("runs the full popup flow for a first-time user and allows the API after agree", async () => {
    wxMock.getPrivacySetting.mockImplementation(({ success }) => success({ needAuthorization: true, privacyContractName: "《重庆天才隐私保护指引》" }));
    wxMock.requirePrivacyAuthorize.mockImplementation((options) => {
      // 模拟微信：requirePrivacyAuthorize 触发全局 onNeedPrivacyAuthorization 处理。
      const listener = wxMock.onNeedPrivacyAuthorization.mock.calls[0][0];
      const resolve = (resolution) => {
        if (resolution.event === "agree") options.success({ errMsg: "requirePrivacyAuthorize:ok" });
        if (resolution.event === "disagree") options.fail({ errMsg: "requirePrivacyAuthorize:fail privacy permission is not authorized" });
      };
      listener(resolve, { referrer: "wx.requirePrivacyAuthorize" });
    });
    registerGlobalPrivacyHandler();
    const popupRequests = [];
    subscribePrivacyAuthorization((request) => popupRequests.push(request));
    popupRequests.length = 0;

    const outcome = ensurePrivacyAuthorized();
    expect(popupRequests).toHaveLength(1);

    settlePrivacyAuthorization({ buttonId: "privacy-agree-btn", event: "agree" });
    await expect(outcome).resolves.toBe(true);
  });

  it("blocks the privacy API when the user refuses consent", async () => {
    wxMock.getPrivacySetting.mockImplementation(({ success }) => success({ needAuthorization: true, privacyContractName: "《重庆天才隐私保护指引》" }));
    wxMock.requirePrivacyAuthorize.mockImplementation(({ fail }) => fail({ errMsg: "requirePrivacyAuthorize:fail privacy permission is not authorized" }));

    await expect(ensurePrivacyAuthorized()).resolves.toBe(false);
  });

  it("fails open when privacy APIs are unavailable or the setting query fails", async () => {
    delete globalThis.wx;
    await expect(ensurePrivacyAuthorized()).resolves.toBe(true);

    globalThis.wx = { getPrivacySetting: vi.fn().mockImplementation(({ fail }) => fail({ errMsg: "getPrivacySetting:fail" })) };
    await expect(ensurePrivacyAuthorized()).resolves.toBe(true);
  });

  it("opens the platform privacy contract page", () => {
    openPrivacyContract();
    expect(wxMock.openPrivacyContract).toHaveBeenCalledTimes(1);
  });
});
