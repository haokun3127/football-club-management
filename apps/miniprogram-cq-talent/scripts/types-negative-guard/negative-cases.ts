/**
 * 微信小程序类型负例守卫 fixture（故意包含错误示例，正常 typecheck 必须失败）。
 *
 * 本目录被主 tsconfig exclude，仅由同目录 types-negative-guard.test.mjs 通过
 * `tsc -p scripts/types-negative-guard` 单独编译，并断言以下错误示例必然报错：
 *
 * ① Page 单参（宽松重载）：data 泛型约束必须生效——旧手写 shim 连 data 都不检查，
 *    这是技术评审 §1 负例的核心回归点；
 * ② Page 双参（严格重载）：生命周期回调与自定义方法均受官方
 *    WechatMiniprogram.Page.Options 约束；
 * ③ 官方 Component 全局声明：methods 必须是方法表。
 *
 * 若本 fixture 意外编译通过（exit 0），说明 Page/Component 泛型约束被削弱，
 * 守卫立即失败，不会静默回退到 any 时代。
 */
/// <reference path="../../types/wechat.d.ts" />

// ① 宽松重载也必须约束 data
Page<{ count: number }>({
  data: { count: "wrong-type" },
});

// ② 严格重载：生命周期与自定义方法受官方约束
Page<{ count: number }, { increment(): void }>({
  data: { count: "also-wrong-type" },
  onLoad: "not-a-function",
  increment: "not-a-function-either",
});

// ③ 官方 Component：methods 必须是方法表
Component({
  methods: 123,
});
