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
      const resolvedWindowInfo = windowInfo ?? { statusBarHeight: 20, windowWidth: 375 };
      const statusBarHeight = resolvedWindowInfo.statusBarHeight ?? 20;
      const menu = wx.getMenuButtonBoundingClientRect?.();
      const contentHeight = 44;
      const actionInset = menu ? Math.max(16, resolvedWindowInfo.windowWidth - menu.left + 8) : 16;
      this.setData({ statusBarHeight, contentHeight, actionInset });
    },
  },
  methods: {
    handleBack(this: any) {
      this.triggerEvent("back", {});
      wx.navigateBack({ delta: 1,fail:()=>wx.reLaunch({url:"/pages/launch/index"}) });
    },
    handleAction(this: any) {
      this.triggerEvent("action", {});
    },
  },
});
