import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const ctaRule = styles.match(/\.login-cta\s*{([^}]*)}/)?.[1] ?? "";

describe("login page", () => {
  it("uses a single real WeChat phone authorization action", () => {
    expect(template.match(/open-type="getPhoneNumber"/g)).toHaveLength(1);
    expect(template).not.toContain("验证码");
    expect(template).not.toContain("获取验证码");
    expect(template).not.toContain("绑定孩子");
    expect(template).toContain("身份验证");
    expect(template).toContain("微信手机号授权并继续");
    expect(template).toContain("自动匹配俱乐部档案");
    expect(template).not.toContain("login-field--wechat");
    expect(template).toContain('disabled="{{submitting || state === \'loading\'}}"');
  });

  it("keeps the G2 device-frame geometry for the login card stack", () => {
    expect(styles).toContain("width: 662rpx");
    expect(styles).toContain("height: 348rpx");
    expect(styles).toContain("height: 256rpx");
    expect(styles).toContain("height: 100rpx");
    expect(styles.match(/box-shadow: 0 2rpx 4rpx rgba\(0,0,0,.06\);/g)).toHaveLength(2);
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
