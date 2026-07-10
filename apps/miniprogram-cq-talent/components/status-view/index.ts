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
    state(this: any, value: string) { this.setData({ symbol: SYMBOLS[value] ?? "" }); },
  },
  lifetimes: {
    attached(this: any) { this.setData({ symbol: SYMBOLS[this.data.state] ?? "" }); },
  },
  methods: {
    handleAction(this: any) { this.triggerEvent("action", {}); },
  },
});
