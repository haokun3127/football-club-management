Component({
  properties: {
    state: {
      type: String,
      value: "idle",
    },
    title: {
      type: String,
      value: "",
    },
    message: {
      type: String,
      value: "",
    },
    actionText: {
      type: String,
      value: "",
    },
  },
  methods: {
    handleAction(this: any) {
      this.triggerEvent("action", {});
    },
  },
});
