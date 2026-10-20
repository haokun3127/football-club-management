/**
 * 试点：迁移到官方 Component 泛型（miniprogram-api-typings）。
 * 由官方 Component 构造器按 properties/data/observers/lifetimes/methods 推断
 * 实例类型（WechatMiniprogram.Component.Instance），移除此前手写的
 * `this: any` 防御注解，setData/triggerEvent/data 访问均受官方类型约束。
 */
const SYMBOLS: Record<string, string> = {
  loading: "",
  empty: "○",
  pending: "…",
  error: "!",
  success: "✓",
};

Component({
  properties: {
    state: { type: String, value: "idle" },
    title: { type: String, value: "" },
    message: { type: String, value: "" },
    actionText: { type: String, value: "" },
    compact: { type: Boolean, value: false },
  },
  data: { symbol: "" },
  observers: {
    state(value: string) { this.setData({ symbol: SYMBOLS[value] ?? "" }); },
  },
  lifetimes: {
    attached() { this.setData({ symbol: SYMBOLS[this.data.state] ?? "" }); },
  },
  methods: {
    handleAction() { this.triggerEvent("action", {}); },
  },
});
