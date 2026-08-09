import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

describe("launch page", () => {
  it("keeps the G1 club identity and three truthful service rows", () => {
    expect(template).toContain("重庆天才足球俱乐部");
    expect(template).toContain("连接重庆天才服务");
    expect(template).toContain("客户端状态");
    expect(template).toContain("异常处理");
    expect(template).toContain("加载中");
    expect(template).toContain("待完成");
    expect(styles).toContain("width: 662rpx");
    expect(styles).toContain("height: 424rpx");
  });

  it("keeps launch decisions in the existing real bootstrap flow", () => {
    expect(controller).toContain("const context = await resolveClient();");
    expect(controller).toContain("const code = await requestWechatCode();");
    expect(controller).toContain('wx.reLaunch({ url: `/pages/login/index?code=${encodeURIComponent(code)}` });');
  });
});
