import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

export interface ExcelRawRecord {
  rowNumber: number;
  rowHash: string;
  raw: Record<string, unknown>;
}

type ExcelWorkbookBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];

export async function readExcelWorksheetRecords(input: {
  buffer: Buffer;
  worksheetName?: string;
  headerRow?: number;
}): Promise<ExcelRawRecord[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input.buffer as unknown as ExcelWorkbookBuffer);

  const worksheet = input.worksheetName
    ? workbook.getWorksheet(input.worksheetName)
    : workbook.worksheets[0];
  if (!worksheet) {
    throw new Error(input.worksheetName ? `Worksheet ${input.worksheetName} not found.` : "Workbook has no worksheets.");
  }

  const headerRowNumber = input.headerRow ?? 1;
  const headers = rowValues(worksheet.getRow(headerRowNumber)).map((value) => String(value ?? "").trim());
  const records: ExcelRawRecord[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) {
      return;
    }

    const values = rowValues(row);
    const raw = Object.fromEntries(headers
      .map((header, index) => [header, normalizeCellValue(values[index])])
      .filter(([header, value]) => header && value !== undefined));

    if (Object.keys(raw).length === 0) {
      return;
    }

    const canonical = stableStringify(raw);
    records.push({
      rowNumber,
      rowHash: createHash("sha256").update(canonical).digest("hex"),
      raw,
    });
  });

  return records;
}

function rowValues(row: ExcelJS.Row): unknown[] {
  const values = Array.isArray(row.values) ? row.values.slice(1) : [];
  return values.map(normalizeCellValue);
}

function normalizeCellValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text);
  }

  if (typeof value === "object" && value !== null && "result" in value) {
    return normalizeCellValue((value as { result: unknown }).result);
  }

  return value === null ? undefined : value;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
