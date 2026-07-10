Component({
  properties: {
    students: { type: Array, value: [] },
    selectedId: { type: String, value: "all" },
    showAll: { type: Boolean, value: true },
    allLabel: { type: String, value: "全部孩子" },
  },
  methods: {
    select(this: any, event: { currentTarget: { dataset: { id?: string } } }) {
      const studentId = event.currentTarget.dataset.id ?? "all";
      if (studentId !== this.data.selectedId) this.triggerEvent("change", { studentId });
    },
  },
});
