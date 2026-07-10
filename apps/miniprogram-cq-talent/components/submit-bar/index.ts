Component({
  properties: {
    primaryText: { type: String, value: "保存" },
    secondaryText: { type: String, value: "" },
    hint: { type: String, value: "" },
    loading: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
  },
  methods: {
    handlePrimary(this: any) { if (!this.data.loading && !this.data.disabled) this.triggerEvent("submit", {}); },
    handleSecondary(this: any) { this.triggerEvent("secondary", {}); },
  },
});
