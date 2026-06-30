import { createHash } from "node:crypto";
import type { EntityId } from "@football-club/domain";
import type {
  ExternalSystemConnection,
  ExternalTableMapping,
  StageExternalImportRecord,
} from "../data-capability/types.js";

export type WpsConnectionMode = "manual_import" | "stub" | "http";
export type WpsTableKind = "online_sheet" | "data_table" | "lightweight_table";

export interface WpsConnectionConfig {
  mode: WpsConnectionMode;
  apiBaseUrl?: string;
  credentialRef?: string;
  credentialStatus?: string;
  documentToken?: string;
  fileToken?: string;
  pageSize?: number;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  rateLimitPerMinute?: number;
}

export interface WpsTableMappingConfig {
  sheetId?: string;
  tableId?: string;
  tableKind: WpsTableKind;
  pageSize?: number;
}

export interface WpsCredential {
  authorizationHeader: string;
  status?: string;
}

export type WpsCredentialResolver = (credentialRef: string) => WpsCredential | Promise<WpsCredential>;

export type WpsFetch = (
  url: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text?(): Promise<string>;
}>;

export interface WpsConnector {
  fetchRows(input: {
    clubId: EntityId;
    connection: ExternalSystemConnection;
    tableMapping: ExternalTableMapping;
  }): Promise<StageExternalImportRecord[]>;
}

export interface WpsConnectorFactoryOptions {
  fetch?: WpsFetch;
  credentialResolver?: WpsCredentialResolver;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

export function createWpsConnector(
  connection: ExternalSystemConnection,
  options: WpsConnectorFactoryOptions = {},
): WpsConnector {
  const config = parseWpsConnectionConfig(connection.config);

  if (config.mode !== "http") {
    return new DeterministicWpsStubConnector();
  }

  const fetchImpl = options.fetch ?? defaultFetch();
  if (!fetchImpl) {
    throw new Error("WPS HTTP connector requires an injected fetch implementation.");
  }
  if (!options.credentialResolver) {
    throw new Error("WPS HTTP connector requires an injected credential resolver.");
  }

  return new HttpWpsConnector(fetchImpl, options.credentialResolver, options);
}

export function parseWpsConnectionConfig(config: Record<string, unknown>): WpsConnectionConfig {
  const mode = optionalString(config, "mode") ?? "manual_import";
  if (mode !== "manual_import" && mode !== "stub" && mode !== "http") {
    throw new Error("WPS connection config mode must be manual_import, stub, or http.");
  }

  const parsed: WpsConnectionConfig = {
    mode,
    apiBaseUrl: optionalString(config, "apiBaseUrl"),
    credentialRef: optionalString(config, "credentialRef"),
    credentialStatus: optionalString(config, "credentialStatus"),
    documentToken: optionalString(config, "documentToken"),
    fileToken: optionalString(config, "fileToken"),
    pageSize: optionalPositiveInteger(config, "pageSize"),
    timeoutMs: optionalPositiveInteger(config, "timeoutMs"),
    maxRetries: optionalNonNegativeInteger(config, "maxRetries"),
    retryBaseDelayMs: optionalPositiveInteger(config, "retryBaseDelayMs"),
    rateLimitPerMinute: optionalPositiveInteger(config, "rateLimitPerMinute"),
  };

  if (mode === "http") {
    if (!parsed.apiBaseUrl) {
      throw new Error("WPS HTTP connection config requires apiBaseUrl.");
    }
    if (!parsed.credentialRef) {
      throw new Error("WPS HTTP connection config requires credentialRef.");
    }
    if (!parsed.documentToken && !parsed.fileToken) {
      throw new Error("WPS HTTP connection config requires documentToken or fileToken.");
    }
  }

  return parsed;
}

export function parseWpsTableMappingConfig(config: Record<string, unknown> | undefined): WpsTableMappingConfig {
  if (!config) {
    throw new Error("WPS table mapping config is required for HTTP sync.");
  }

  const tableKind = optionalString(config, "tableKind");
  if (tableKind !== "online_sheet" && tableKind !== "data_table" && tableKind !== "lightweight_table") {
    throw new Error("WPS table mapping config tableKind must be online_sheet, data_table, or lightweight_table.");
  }

  const parsed: WpsTableMappingConfig = {
    sheetId: optionalString(config, "sheetId"),
    tableId: optionalString(config, "tableId"),
    tableKind,
    pageSize: optionalPositiveInteger(config, "pageSize"),
  };

  if (tableKind === "online_sheet" && !parsed.sheetId) {
    throw new Error("WPS online_sheet mapping requires sheetId.");
  }
  if ((tableKind === "data_table" || tableKind === "lightweight_table") && !parsed.tableId) {
    throw new Error("WPS data table mapping requires tableId.");
  }

  return parsed;
}

export function sanitizeExternalConnection(connection: ExternalSystemConnection): ExternalSystemConnection {
  return {
    ...connection,
    config: connection.provider === "wps"
      ? sanitizeWpsConnectionConfig(connection.config)
      : sanitizeGenericConfig(connection.config),
  };
}

export function sanitizeWpsConnectionConfig(config: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const key of [
    "mode",
    "apiBaseUrl",
    "credentialRef",
    "credentialStatus",
    "documentToken",
    "fileToken",
    "pageSize",
    "timeoutMs",
    "maxRetries",
    "retryBaseDelayMs",
    "rateLimitPerMinute",
    "webhookSigningMode",
    "webhookSecretRef",
    "webhookMaxSkewSeconds",
  ]) {
    if (config[key] !== undefined) {
      sanitized[key] = config[key];
    }
  }

  return sanitized;
}

export class DeterministicWpsStubConnector implements WpsConnector {
  async fetchRows(input: {
    clubId: EntityId;
    connection: ExternalSystemConnection;
    tableMapping: ExternalTableMapping;
  }): Promise<StageExternalImportRecord[]> {
    const raw = stubRowForTable(input.tableMapping.externalTableKey);
    const externalRecordId = `${input.tableMapping.externalTableKey}:stub-row-1`;

    return [{
      rowNumber: 1,
      externalRecordId,
      rowHash: stableWpsRowHash(input.connection.id, input.tableMapping.id, externalRecordId, raw),
      raw,
    }];
  }
}

export class HttpWpsConnector implements WpsConnector {
  private readonly limiter: SimpleRateLimiter;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(
    private readonly fetchImpl: WpsFetch,
    private readonly credentialResolver: WpsCredentialResolver,
    options: Pick<WpsConnectorFactoryOptions, "sleep" | "now"> = {},
  ) {
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.limiter = new SimpleRateLimiter(options.now ?? (() => Date.now()), this.sleep);
  }

  async fetchRows(input: {
    clubId: EntityId;
    connection: ExternalSystemConnection;
    tableMapping: ExternalTableMapping;
  }): Promise<StageExternalImportRecord[]> {
    const connectionConfig = parseWpsConnectionConfig(input.connection.config);
    const tableConfig = parseWpsTableMappingConfig(input.tableMapping.config);
    const credential = await this.credentialResolver(connectionConfig.credentialRef ?? "");
    const rows: StageExternalImportRecord[] = [];
    let pageToken: string | undefined;

    do {
      await this.limiter.wait(connectionConfig.rateLimitPerMinute);
      const response = await fetchWpsWithRetry(
        this.fetchImpl,
        buildRecordsUrl(connectionConfig, tableConfig, pageToken),
        {
        headers: { authorization: credential.authorizationHeader },
        timeoutMs: connectionConfig.timeoutMs ?? 10_000,
        maxRetries: connectionConfig.maxRetries ?? 2,
        retryBaseDelayMs: connectionConfig.retryBaseDelayMs ?? 250,
        sleep: this.sleep,
      },
      );

      if (!response.ok) {
        const body = response.text ? await response.text() : "";
        throw new Error(`WPS records request failed with status ${response.status}${body ? `: ${redactWpsErrorBody(body)}` : ""}`);
      }

      const page = parseWpsRecordsPage(await response.json());
      for (const [pageIndex, record] of page.records.entries()) {
        const rowNumber = record.rowNumber ?? (record.rowIndex !== undefined ? record.rowIndex + 1 : rows.length + pageIndex + 1);
        const externalRecordId = record.id ?? `${input.tableMapping.externalTableKey}:row-${rowNumber}`;
        rows.push({
          rowNumber,
          externalRecordId,
          rowHash: stableWpsRowHash(input.connection.id, input.tableMapping.id, externalRecordId, record.fields),
          raw: record.fields,
        });
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    return rows;
  }
}

export function createEnvWpsCredentialResolver(env: Record<string, string | undefined> = process.env): WpsCredentialResolver {
  return (credentialRef) => {
    const envKey = `WPS_CREDENTIAL_${credentialRef.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
    const authorizationHeader = env[envKey];
    if (!authorizationHeader) {
      throw new Error(`WPS credential ${credentialRef} is not configured.`);
    }

    return { authorizationHeader, status: "configured" };
  };
}

async function fetchWpsWithRetry(
  fetchImpl: WpsFetch,
  url: string,
  options: {
    headers: Record<string, string>;
    timeoutMs: number;
    maxRetries: number;
    retryBaseDelayMs: number;
    sleep: (milliseconds: number) => Promise<void>;
  },
): ReturnType<WpsFetch> {
  let lastResponse: Awaited<ReturnType<WpsFetch>> | undefined;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetchImpl(url, { headers: options.headers, signal: controller.signal });
      if (!isRetryableStatus(response.status) || attempt === options.maxRetries) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      if (attempt === options.maxRetries) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await options.sleep(options.retryBaseDelayMs * 2 ** attempt);
  }

  return lastResponse as Awaited<ReturnType<WpsFetch>>;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function redactWpsErrorBody(body: string): string {
  return body.replace(/(authorization|access_token|refresh_token|secret|password|credential)["'\s:=]+[^"',}\s]+/gi, "$1=[redacted]");
}

class SimpleRateLimiter {
  private nextAvailableAt = 0;

  constructor(
    private readonly now: () => number,
    private readonly sleep: (milliseconds: number) => Promise<void>,
  ) {}

  async wait(rateLimitPerMinute: number | undefined) {
    if (!rateLimitPerMinute) {
      return;
    }

    const intervalMs = Math.ceil(60_000 / rateLimitPerMinute);
    const current = this.now();
    const waitMs = Math.max(0, this.nextAvailableAt - current);
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
    this.nextAvailableAt = Math.max(current, this.nextAvailableAt) + intervalMs;
  }
}

export function stableWpsRowHash(
  connectionId: EntityId,
  tableMappingId: EntityId,
  externalRecordId: string,
  raw: Record<string, unknown>,
): string {
  return createHash("sha256")
    .update(`${connectionId}:${tableMappingId}:${externalRecordId}:${canonicalJson(raw)}`)
    .digest("hex");
}

function buildRecordsUrl(
  connection: WpsConnectionConfig,
  tableMapping: WpsTableMappingConfig,
  pageToken: string | undefined,
): string {
  const url = new URL("/v1/records", connection.apiBaseUrl);
  if (connection.documentToken) {
    url.searchParams.set("documentToken", connection.documentToken);
  }
  if (connection.fileToken) {
    url.searchParams.set("fileToken", connection.fileToken);
  }
  if (tableMapping.sheetId) {
    url.searchParams.set("sheetId", tableMapping.sheetId);
  }
  if (tableMapping.tableId) {
    url.searchParams.set("tableId", tableMapping.tableId);
  }
  url.searchParams.set("tableKind", tableMapping.tableKind);
  url.searchParams.set("pageSize", String(tableMapping.pageSize ?? connection.pageSize ?? 100));
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  return url.toString();
}

function parseWpsRecordsPage(value: unknown): {
  records: Array<{ id?: string; rowNumber?: number; rowIndex?: number; fields: Record<string, unknown> }>;
  nextPageToken?: string;
} {
  const source = objectValue(value);
  if (!source) {
    throw new Error("WPS records response must be an object.");
  }

  const data = objectValue(source.data) ?? source;
  const rawRecords = arrayValue(data.records);

  return {
    records: rawRecords.map((record) => {
      const row = objectValue(record);
      if (!row) {
        throw new Error("WPS record must be an object.");
      }

      const fields = objectValue(row.fields) ?? objectValue(row.values) ?? objectValue(row.payload);
      if (!fields) {
        throw new Error("WPS record requires fields.");
      }

      return {
        id: optionalString(row, "id") ?? optionalString(row, "recordId") ?? optionalString(row, "rowId"),
        rowNumber: optionalNumber(row, "rowNumber"),
        rowIndex: optionalNumber(row, "rowIndex"),
        fields,
      };
    }),
    nextPageToken: optionalString(data, "nextPageToken") ?? optionalString(data, "next") ?? undefined,
  };
}

function defaultFetch(): WpsFetch | undefined {
  return typeof fetch === "function"
    ? ((url, init) => fetch(url, init))
    : undefined;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function arrayValue(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("WPS records response requires records array.");
  }

  return value;
}

function optionalString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }

  return value;
}

function optionalNumber(row: Record<string, unknown>, key: string): number | undefined {
  const value = row[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Expected ${key} to be an integer.`);
  }

  return value;
}

function optionalPositiveInteger(row: Record<string, unknown>, key: string): number | undefined {
  const value = optionalNumber(row, key);
  if (value !== undefined && value <= 0) {
    throw new Error(`Expected ${key} to be a positive integer.`);
  }

  return value;
}

function optionalNonNegativeInteger(row: Record<string, unknown>, key: string): number | undefined {
  const value = optionalNumber(row, key);
  if (value !== undefined && value < 0) {
    throw new Error(`Expected ${key} to be a non-negative integer.`);
  }

  return value;
}

function sanitizeGenericConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !/secret|token|password|credential/i.test(key)),
  );
}

function stubRowForTable(externalTableKey: string): Record<string, unknown> {
  switch (externalTableKey) {
    case "payment_events":
      return {
        "身份证号": "500000201505010000",
        "收费日期": "2026-06-26",
        "收费阶段": "2025-2026春夏",
        "学员姓名": "李明",
        "充值类型": "线下课时充值",
        "手机": "13800000000",
        "微信": "wx_li_parent",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "金额": 3200,
        "课时": 24,
        "公司实收": 3200,
        "审核通过": true,
        "已同步": false,
      };
    case "attendance_2025_2026_spring_summer":
      return {
        "身份证号": "500000201505010000",
        "阶段": "2025-2026春夏",
        "姓名": "李明",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "第1周": 1,
        "第2周": 1,
        "本学期在该队签到": 10,
        "在该队的剩余课时": 14,
        "创建时间": "2026-06-26T08:00:00.000Z",
      };
    case "insurance_policies":
      return {
        "投保日期": "2026-06-26",
        "身份证号": "500000201505010000",
        "保险到期日期": "2027-06-26",
        "保单号": "WPS-STUB-POLICY-001",
        "运动项目": "足球",
        "学员姓名": "李明",
        "学校": "重庆天才合作学校",
        "购买公司": "线下保险公司",
        "审核通过": true,
      };
    case "talent_elite_assessment":
      return {
        "核心能力": "进攻能力",
        "得分": 4,
        "二级子项": "射门终结",
        "得分_2": 4,
        "三级子项": "正脚背射门",
        "得分_3": 4,
        "测试项目": "禁区外射门",
        "推荐训练项目": "射门专项",
      };
    case "full_users":
    default:
      return {
        "身份证号": "500000201505010000",
        "学员姓名": "李明",
        "渠道": "老学员转介绍",
        "区域": "重庆",
        "学校": "重庆天才合作学校",
        "队伍名称": "U10发展队",
        "教练": "陈教练",
        "学员状态": "在训",
        "出生年月": "2015-05",
        "手机": "13800000000",
        "微信": "wx_li_parent",
        "历次充值日期": "2026-06-01",
        "充值笔数": 1,
        "保险到期日期": "2027-06-01",
        "沟通反馈": "家长关注精英队升组路径",
        "签到次数": 8,
        "最近签到时间": "2026-06-24T10:00:00.000Z",
      };
  }
}
