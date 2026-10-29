import { createStudentResultsPage } from "../../../utils/student-results-page";
import { openPage } from "../../../utils/navigation";
import type { ConfirmedStudentResult } from "../../../utils/types";
import { parentResultUnit, parentResultValue } from "../result-presentation";

const resultsPage = createStudentResultsPage("parent");
Page({
  ...resultsPage,
  data: { ...resultsPage.data, sourceExpanded: false, sourceRawUnit: "" },
  async load(studentId: string) {
    this.setData({ sourceExpanded: false });
    await resultsPage.load.call(this, studentId);
  },
  selectResult(id: string) {
    if (!this.data.results.some((row: ConfirmedStudentResult) => row.id === id)) return;
    resultsPage.selectResult.call(this, id);
    const selected = this.data.selected;
    if (!selected) return;
    const unit = parentResultUnit(selected);
    const present = <T extends ConfirmedStudentResult>(row: T) => ({ ...row, valueLabel: parentResultValue(row) });
    // Only display labels change. The shared factory retains original version/unit grouping and numeric scales.
    const scaleLabel = !unit.known ? "历史原始成绩 · 单位待确认，暂不合并绘图"
      : selected.displayUnit && this.data.scaleLabel.endsWith(selected.displayUnit)
        ? this.data.scaleLabel.slice(0, -selected.displayUnit.length) + unit.label : this.data.scaleLabel;
    this.setData({
      selected: present(selected), history: this.data.history.map(present), alternatives: this.data.alternatives.map(present),
      bars: unit.known ? this.data.bars.map((bar: { id: string; valueLabel: string }) => {
        const row = this.data.results.find((candidate: ConfirmedStudentResult) => candidate.id === bar.id);
        return { ...bar, valueLabel: row ? parentResultValue(row) : bar.valueLabel };
      }) : [],
      scaleLabel, sourceExpanded: false, sourceRawUnit: unit.raw || (unit.known ? unit.label ? "未提供（按值类型显示）" : "不适用" : "未提供，单位待确认"),
    });
  },
  toggleSource() { this.setData({ sourceExpanded: !this.data.sourceExpanded }); },
  openSourceEvent() {
    const id = this.data.selected?.eventId;
    if (id) openPage(`/pages/parent/event/index?id=${encodeURIComponent(id)}&studentId=${encodeURIComponent(this.data.studentId)}`);
  },
});
