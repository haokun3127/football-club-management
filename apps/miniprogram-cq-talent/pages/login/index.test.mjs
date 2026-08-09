import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  wechatLogin: vi.fn(),
  getAppContext: vi.fn(),
  setSession: vi.fn(),
  routeHome: vi.fn(),
}));

vi.mock("../../utils/api", () => ({ wechatLogin: mocks.wechatLogin }));
vi.mock("../../utils/auth", () => ({ routeHome: mocks.routeHome }));
vi.mock("../../utils/store", () => ({
  getAppContext: mocks.getAppContext,
  setSession: mocks.setSession,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

globalThis.wx = {
  login: vi.fn(),
  reLaunch: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const ctaRule = styles.match(/\.login-cta\s*{([^}]*)}/)?.[1] ?? "";

describe("login page", () => {
  beforeEach(() => {
    mocks.wechatLogin.mockReset();
    mocks.getAppContext.mockReset().mockReturnValue({
      clubId: "club-chongqing-talent",
      clientId: "client-cq-talent",
    });
    mocks.setSession.mockReset();
    mocks.routeHome.mockReset();
    globalThis.wx.login.mockReset().mockImplementation(({ success }) => success({ code: "wx-code" }));
  });

  function createPageInstance(data = {}) {
    const instance = {
      ...pageDefinition,
      data: { ...pageDefinition.data, ...data },
    };
    instance.setData = (patch) => {
      instance.data = { ...instance.data, ...patch };
    };
    return instance;
  }

  function authenticatedParent(children = [{ id: "student-1" }]) {
    return {
      status: "authenticated",
      session: { token: "session-token", expiresInSeconds: 3600 },
      role: "parent",
      profile: { userId: "user-parent", displayName: "Parent" },
      children,
      capabilities: {},
    };
  }

  it("reserves synchronously before deferring the visual authorization lock", () => {
    vi.useFakeTimers();
    try {
      const page = createPageInstance({ wxLoginCode: "wx-code" });

      page.onPhoneAuthorizationTap();

      expect(page.phoneAuthorizationReserved).toBe(true);
      expect(page.data.submitting).toBe(false);
      expect(page.data.authorizationLocked).toBe(false);
      expect(page.data.state).toBe("ready");

      vi.advanceTimersByTime(1);

      expect(page.data.submitting).toBe(true);
      expect(page.data.authorizationLocked).toBe(true);
      expect(page.data.state).toBe("loading");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a retryable timeout when the native authorization callback never arrives", () => {
    vi.useFakeTimers();
    try {
      const page = createPageInstance({ wxLoginCode: "wx-code" });

      page.onPhoneAuthorizationTap();
      vi.advanceTimersByTime(1);
      vi.advanceTimersByTime(10_000);

      expect(page.data.state).toBe("error");
      expect(page.data.errorType).toBe("authorization_timeout");
      expect(page.data.submitting).toBe(false);
      expect(page.data.authorizationLocked).toBe(true);
      expect(page.data.message).toBe("微信授权未返回，请点击重试。");
      expect(globalThis.wx.login).not.toHaveBeenCalled();

      page.retry();
      expect(globalThis.wx.login).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("locks at touch entry and ignores duplicate native callbacks", async () => {
    mocks.wechatLogin.mockResolvedValue(authenticatedParent());
    const page = createPageInstance({ wxLoginCode: "wx-code" });

    page.onPhoneAuthorizationTap();
    page.onPhoneAuthorizationTap();
    const firstCallback = page.onGetPhoneNumber({ detail: { code: "phone-code" } });
    const duplicateCallback = page.onGetPhoneNumber({ detail: { code: "duplicate-phone-code" } });
    await Promise.all([firstCallback, duplicateCallback]);

    expect(mocks.wechatLogin).toHaveBeenCalledTimes(1);
    expect(mocks.setSession).toHaveBeenCalledTimes(1);
    expect(mocks.routeHome).toHaveBeenCalledTimes(1);
    expect(globalThis.wx.login).not.toHaveBeenCalled();
  });

  it("does not auto-retry cancellation, frequency errors, empty code, or a missing login code", async () => {
    const cases = [
      { detail: { errMsg: "getPhoneNumber:fail cancel" } },
      { detail: { errMsg: "getPhoneNumber:fail invoke getPhoneNumber too frequently" } },
      { detail: {} },
    ];

    for (const detail of cases) {
      const page = createPageInstance({ wxLoginCode: "wx-code" });
      page.onPhoneAuthorizationTap();
      await page.onGetPhoneNumber(detail);
      expect(globalThis.wx.login).not.toHaveBeenCalled();
      expect(mocks.wechatLogin).not.toHaveBeenCalled();
      expect(page.data.authorizationLocked).toBe(true);
    }

    const missingLoginCodePage = createPageInstance({ wxLoginCode: "" });
    missingLoginCodePage.onPhoneAuthorizationTap();
    await missingLoginCodePage.onGetPhoneNumber({ detail: { code: "phone-code" } });
    expect(globalThis.wx.login).not.toHaveBeenCalled();
    expect(mocks.wechatLogin).not.toHaveBeenCalled();
    expect(missingLoginCodePage.data.authorizationLocked).toBe(true);

    missingLoginCodePage.retry();
    expect(missingLoginCodePage.data.authorizationLocked).toBe(false);
    expect(globalThis.wx.login).toHaveBeenCalledTimes(1);
  });

  it("keeps binding_required and parent-without-children responses restricted", async () => {
    mocks.wechatLogin
      .mockResolvedValueOnce({ status: "binding_required" })
      .mockResolvedValueOnce(authenticatedParent([]));

    const bindingPage = createPageInstance({ wxLoginCode: "wx-code" });
    bindingPage.onPhoneAuthorizationTap();
    await bindingPage.onGetPhoneNumber({ detail: { code: "phone-code" } });
    expect(bindingPage.data.isBlocked).toBe(true);
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.routeHome).not.toHaveBeenCalled();

    const emptyParentPage = createPageInstance({ wxLoginCode: "wx-code" });
    emptyParentPage.onPhoneAuthorizationTap();
    await emptyParentPage.onGetPhoneNumber({ detail: { code: "phone-code" } });
    expect(emptyParentPage.data.isBlocked).toBe(true);
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.routeHome).not.toHaveBeenCalled();
  });

  it("renders safe fixed error states instead of raw native or API errors", async () => {
    mocks.wechatLogin.mockRejectedValue({ code: "wechat_login_failed", message: "phone=13800000000 token=secret" });
    const page = createPageInstance({ wxLoginCode: "wx-code" });
    page.onPhoneAuthorizationTap();
    await page.onGetPhoneNumber({ detail: { code: "phone-code" } });
    expect(page.data.message).not.toContain("13800000000");
    expect(page.data.message).not.toContain("token=secret");

    globalThis.wx.login.mockReset().mockImplementation(({ fail }) => fail({ errMsg: "session=secret-phone" }));
    page.refreshWechatCode();
    expect(page.data.message).not.toContain("session=secret-phone");
  });

  it("uses a single real WeChat phone authorization action", () => {
    expect(template.match(/open-type="getPhoneNumber"/g)).toHaveLength(1);
    expect(template).not.toContain("验证码");
    expect(template).not.toContain("获取验证码");
    expect(template).not.toContain("绑定孩子");
    expect(template).toContain("身份验证");
    expect(template).toContain("微信手机号授权并继续");
    expect(template).toContain("自动匹配俱乐部档案");
    expect(template).not.toContain("login-field--wechat");
    expect(template).toContain('disabled="{{submitting || state === \'loading\' || authorizationLocked}}"');
    expect(template).toContain('bindtap="onPhoneAuthorizationTap"');
  });

  it("keeps the G2 device-frame geometry for the login card stack", () => {
    expect(styles).toContain("width: 662rpx");
    expect(styles).toContain("height: 348rpx");
    expect(styles).toContain("height: 288rpx");
    expect(styles).toContain("height: 100rpx");
    expect(styles.match(/box-shadow: 0 2rpx 4rpx rgba\(0,0,0,.06\);/g)).toHaveLength(2);
  });

  it("keeps the G3 restricted-account hierarchy and real return action", () => {
    expect(template).toContain('wx:if="{{isBlocked}}"');
    expect(template).toContain("账号暂时受限");
    expect(template).toContain("当前账号无法进入小程序");
    expect(template).toContain('bindtap="backToLaunch"');
    expect(controller).toContain('wx.reLaunch({ url: "/pages/launch/index" });');
  });

  it("uses the 88px G2 top navigation envelope", () => {
    expect(controller.match(/navTop:\s*88/g)).toHaveLength(2);
    expect(controller).toMatch(/data:\s*{[\s\S]*navTop:\s*88/);
    expect(controller).toContain("this.setData({ wxLoginCode: code, navTop: 88 });");
  });

  it("keeps both verification rows on the shared geometry track", () => {
    expect(template.match(/class="login-field__line"/g)).toHaveLength(2);
    expect(styles).toContain(".login-field__label { flex: 0 0 140rpx; }");
    expect(styles).toContain(".login-field__status { overflow: hidden; flex: 1;");
    expect(styles).toContain("text-align: left;");
    expect(styles).not.toContain("justify-content: space-between");
    expect(template.match(/open-type="getPhoneNumber"/g)).toHaveLength(1);
    expect(template).not.toMatch(/\.(map|filter|slice|indexOf)\s*\(/);
  });

  it("centers the native CTA label within its button box", () => {
    expect(ctaRule).toContain("display: flex;");
    expect(ctaRule).toContain("align-items: center;");
    expect(ctaRule).toContain("justify-content: center;");
    expect(ctaRule).toContain("padding: 0;");
    expect(ctaRule).not.toContain("line-height: 100rpx;");
    expect(ctaRule).toContain("line-height: 38rpx;");
  });
});
