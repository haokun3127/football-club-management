Component({
  properties: {
    eventId: { type: String, value: "" },
    type: { type: String, value: "training" },
    title: { type: String, value: "" },
    time: { type: String, value: "" },
    venue: { type: String, value: "" },
    description: { type: String, value: "" },
    statusLabel: { type: String, value: "" },
    statusTone: { type: String, value: "neutral" },
    action: { type: String, value: "" },
    actionLabel: { type: String, value: "" },
    meta: { type: Array, value: [] },
  },
  methods: {
    handleTap(this: any) { this.triggerEvent("open", { eventId: this.data.eventId, type: this.data.type }); },
    handleAction(this: any) { this.triggerEvent("action", { eventId: this.data.eventId, action: this.data.action }); },
  },
});
