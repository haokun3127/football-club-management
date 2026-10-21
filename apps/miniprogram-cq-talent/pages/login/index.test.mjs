import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  wechatLogin: vi.fn(),
  switchActiveRole: vi.fn(),
  getAppContext: vi.fn(),
  setSession: vi.fn(),
  persistAuthenticatedSession: vi.fn(),
  routeHome: vi.fn(),
}));

vi.mock("../../utils/api", () => ({
  wechatLogin: mocks.wechatLogin,
  switchActiveRole: mocks.switchActiveRole,
}));
vi.mock("../../utils/auth", () => ({ routeHome: mocks.routeHome }));
vi.mock("../../utils/store", () => ({
  getAppContext: mocks.getAppContext,
  setSession: mocks.setSession,
  persistAuthenticatedSession: mocks.persistAuthenticatedSession,
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
    mocks.persistAuthenticatedSession.mockReset().mockImplementation((result) => (
      result.session?.activeRole ? { role: result.session.activeRole } : null
    ));
    mocks.switchActiveRole.mockReset();
    mocks.routeHome.mockReset();
    globalThis.wx.reLaunch.mockReset();
    globalThis.wx.login.mockReset().mockImplementation(({ success }) => success({ code: "wx-code" }));
  });

  function createPageInstance(data = {}) {
    const instance = {
      ...pageDefinition,
      data: { ...pageDefinition.data, agreementAccepted:true, ...data },
    };
    instance.setData = (patch) => {
      instance.data = { ...instance.data, ...patch };
    };
    return instance;
  }

  function authenticatedParent(children = [{ id: "student-1" }]) {
    return {
      clubId: "club-chongqing-talent",
      client: { id: "client-cq-talent" },
      status: "authenticated",
      session: {
        token: "session-token",
        expiresInSeconds: 3600,
        expiresAt: "2099-01-01T00:00:00.000Z",
        activeRole: "parent",
      },
      role: "parent",
      availableRoles: ["parent"],
      profile: { userId: "user-parent", displayName: "Parent" },
      children,
      capabilities: {},
    };
  }

  function authenticatedCoach() {
    return {
      clubId: "club-chongqing-talent",
      client: { id: "client-cq-talent" },
      status: "authenticated",
      session: {
        token: "session-token",
        expiresInSeconds: 3600,
        expiresAt: "2099-01-01T00:00:00.000Z",
        activeRole: "coach",
      },
      role: "coach",
      availableRoles: ["coach"],
      profile: { userId: "user-coach", displayName: "Coach" },
      children: [],
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
    expect(mocks.persistAuthenticatedSession).toHaveBeenCalledTimes(1);
    expect(mocks.routeHome).toHaveBeenCalledTimes(1);
    expect(globalThis.wx.login).not.toHaveBeenCalled();
  });

  it("returns to the redirected page after re-login when the role is compatible", async () => {
    mocks.wechatLogin.mockResolvedValue(authenticatedCoach());
    const page = createPageInstance();
    page.onLoad({ redirect: encodeURIComponent("/pages/coach/schedule/index?teamId=team-1") });

    page.onPhoneAuthorizationTap();
    await page.onGetPhoneNumber({ detail: { code: "phone-code" } });

    expect(globalThis.wx.reLaunch).toHaveBeenCalledWith({ url: "/pages/coach/schedule/index?teamId=team-1" });
    expect(mocks.routeHome).not.toHaveBeenCalled();
  });

  it("falls back to the role home when the redirect target belongs to another role", async () => {
    mocks.wechatLogin.mockResolvedValue(authenticatedParent());
    const page = createPageInstance();
    page.onLoad({ redirect: encodeURIComponent("/pages/coach/schedule/index") });

    page.onPhoneAuthorizationTap();
    await page.onGetPhoneNumber({ detail: { code: "phone-code" } });

    expect(globalThis.wx.reLaunch).not.toHaveBeenCalled();
    expect(mocks.routeHome).toHaveBeenCalledWith("parent");
  });

  it("ignores redirect targets that are not inner pages", () => {
    const page = createPageInstance();
    page.onLoad({ redirect: encodeURIComponent("https://example.example/not-a-page") });
    expect(page.redirectTarget).toBe("");
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


  it("gates the phone number action behind privacy consent via the coupled official open-type", () => {
    // 官方推荐交互：耦合按钮同一次点击先同意隐私协议再取号，微信保证隐私未同意前不实际取号。
    expect(template).toContain('open-type="getPhoneNumber|agreePrivacyAuthorization"');
    expect(template).toContain('bindagreeprivacyauthorization="onPrivacyAgreed"');
    expect(controller).toContain("onPrivacyAgreed()");
    expect(template).not.toMatch(/open-type="getPhoneNumber"(?!\|)/);
  });


  it("explains privacy refusal separately from cancellation and frequency errors", async () => {
    const page = createPageInstance({ wxLoginCode: "wx-code" });
    page.onPhoneAuthorizationTap();
    await page.onGetPhoneNumber({ detail: { errMsg: "getPhoneNumber:fail privacy permission is not authorized" } });
    expect(page.data.errorType).toBe("privacy_refused");
    expect(page.data.message).toBe("需先同意《隐私政策》后才能授权手机号，请点击重试。");
    expect(mocks.wechatLogin).not.toHaveBeenCalled();
  });




  it("uses the 88px G2 top navigation envelope", () => {
    expect(controller.match(/navTop:\s*88/g)).toHaveLength(2);
    expect(controller).toMatch(/data:\s*{[\s\S]*navTop:\s*88/);
    expect(controller).toContain("this.setData({ wxLoginCode: code, navTop: 88 });");
  });



});

describe("automatic role login consent",()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.getAppContext.mockReturnValue({clubId:"club-chongqing-talent",clientId:"client-cq-talent"});});
 it("starts unchecked and never reserves phone authorization without consent",()=>{const page={...pageDefinition,data:{...pageDefinition.data},setData(p){Object.assign(this.data,p);}};expect(page.data.agreementAccepted).toBe(false);page.onPhoneAuthorizationTap();expect(page.phoneAuthorizationReserved).toBe(false);page.onAgreementChange({detail:{checked:true}});expect(page.data.privacyAgreed).toBe(false);page.openAgreement();page.closeAgreement();expect(page.data.agreementAccepted).toBe(true);});
 it("keeps one native privacy-and-phone button and no role chooser",()=>{expect(template.match(/open-type="getPhoneNumber\|agreePrivacyAuthorization"/g)).toHaveLength(1);expect(template).toContain('bindgetphonenumber="onGetPhoneNumber"');expect(template).toContain('bindagreeprivacyauthorization="onPrivacyAgreed"');expect(template).not.toContain('roleChooser');});
 it("shows missing role configuration without persisting a pending token",async()=>{mocks.wechatLogin.mockResolvedValue({status:"role_configuration_required",session:null});const page={...pageDefinition,data:{...pageDefinition.data,agreementAccepted:true,wxLoginCode:"wx-code"},setData(p){Object.assign(this.data,p);}};page.onPhoneAuthorizationTap();await page.onGetPhoneNumber({detail:{code:"phone-code"}});expect(page.data.errorType).toBe("role_configuration_required");expect(page.data.isBlocked).toBe(false);expect(mocks.persistAuthenticatedSession).not.toHaveBeenCalled();});

});
