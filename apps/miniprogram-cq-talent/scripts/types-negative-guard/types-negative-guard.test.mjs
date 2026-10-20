import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const guardDir = new URL(".", import.meta.url).pathname;
const tscJs = new URL("../../node_modules/typescript/lib/tsc.js", import.meta.url).pathname;

function runGuardTsc() {
  try {
    execFileSync(process.execPath, [tscJs, "-p", guardDir], { encoding: "utf8" });
    return { status: 0, output: "" };
  } catch (error) {
    return {
      status: error.status ?? 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

describe("微信类型负例守卫（miniprogram-api-typings）", () => {
  it("Page/Component 的错误示例必须被 tsc 拒绝", () => {
    const { status, output } = runGuardTsc();
    // fixture 全部为故意错误示例：编译必须失败
    expect(status).not.toBe(0);
    // ① data 泛型约束生效。若全局 Page 声明权意外翻转到官方包无默认值版本，
    // 单参调用会退化为 TS2558（Expected 2 type arguments）而丢失 data 值级约束，
    // 本断言随即失败——不会静默回到 any 时代。
    expect(output).toMatch(/Type 'string' is not assignable to type 'number'/);
    // ② 严格重载：生命周期与自定义方法同样被拒绝
    expect(output).toMatch(/'onLoad' does not exist in type|Type 'string' is not assignable to type/);
    // ③ 官方 Component：methods 必须是方法表
    expect(output).toMatch(/not assignable to type 'MethodOption'/);
  });
});
