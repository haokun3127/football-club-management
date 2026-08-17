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
    titleAlign: { type: String, value: "center" },
    largeTitle: { type: Boolean, value: false },
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
      // Figma's Top Nav is a fixed 88px envelope, including the status bar.
      // Do not let device menu geometry expand the page header beyond that frame.
      const contentHeight = Math.max(40, 88 - statusBarHeight);
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
