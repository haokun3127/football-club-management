Component({
  properties: {
    title: { type: String, value: "" },
    subtitle: { type: String, value: "" },
    showBack: { type: Boolean, value: false },
    actionText: { type: String, value: "" },
    actionIcon: { type: String, value: "" },
    actionDot: { type: Boolean, value: false },
    actionPill: { type: Boolean, value: false },
    theme: { type: String, value: "light" },
  },
  data: {
    statusBarHeight: 20,
    contentHeight: 44,
    actionInset: 16,
  },
  lifetimes: {
    attached(this: any) {
      const windowInfo = wx.getWindowInfo?.();
      const fallback = windowInfo ?? wx.getSystemInfoSync();
      const resolvedWindowInfo = windowInfo ?? fallback;
      const statusBarHeight = resolvedWindowInfo.statusBarHeight ?? fallback.statusBarHeight ?? 20;
      const menu = wx.getMenuButtonBoundingClientRect?.();
      const contentHeight = menu ? Math.max(44, menu.height + Math.max(0, menu.top - statusBarHeight) * 2) : 44;
      const actionInset = menu ? Math.max(16, resolvedWindowInfo.windowWidth - menu.left + 8) : 16;
      this.setData({ statusBarHeight, contentHeight, actionInset });
    },
  },
  methods: {
    handleBack(this: any) {
      this.triggerEvent("back", {});
      wx.navigateBack({ delta: 1 });
    },
    handleAction(this: any) {
      this.triggerEvent("action", {});
    },
  },
});
