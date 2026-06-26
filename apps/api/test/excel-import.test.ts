import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { readExcelWorksheetRecords } from "../src/integration/excel-import.js";

describe("readExcelWorksheetRecords", () => {
  it("maps worksheet rows into stable raw records", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("全量用户");
    worksheet.addRow(["身份证号", "学员姓名", "队伍名称"]);
    worksheet.addRow(["id-1", "张三", "U10"]);
    worksheet.addRow([]);
    worksheet.addRow(["id-2", "李四", "U12"]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const records = await readExcelWorksheetRecords({ buffer, worksheetName: "全量用户" });
    const repeated = await readExcelWorksheetRecords({ buffer, worksheetName: "全量用户" });

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual(expect.objectContaining({
      rowNumber: 2,
      raw: {
        "身份证号": "id-1",
        "学员姓名": "张三",
        "队伍名称": "U10",
      },
    }));
    expect(records.map((record) => record.rowHash)).toEqual(repeated.map((record) => record.rowHash));
  });

  it("keeps duplicate headers addressable for assessment workbooks", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("表格_20260326 (2)");
    worksheet.addRow(["天才精英队测试大纲", "天才精英队测试大纲", "天才精英队测试大纲"]);
    worksheet.addRow(["核心能力", "得分", "二级子项", "得分", "三级子项", "得分", "测试项目", "推荐训练项目"]);
    worksheet.addRow(["运控球", 16.045, "球性球感", 3.35, "基础球性", 67, "1 分钟颠球次数", "颠球"]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const records = await readExcelWorksheetRecords({
      buffer,
      worksheetName: "表格_20260326 (2)",
      headerRow: 2,
    });

    expect(records[0]?.raw).toEqual({
      "核心能力": "运控球",
      "得分": 16.045,
      "二级子项": "球性球感",
      "得分_2": 3.35,
      "三级子项": "基础球性",
      "得分_3": 67,
      "测试项目": "1 分钟颠球次数",
      "推荐训练项目": "颠球",
    });
  });
});
