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
});
