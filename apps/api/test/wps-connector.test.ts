import { describe, expect, it } from "vitest";
import {
  createWpsConnector,
  sanitizeExternalConnection,
} from "../src/integration/wps-connector.js";
import type { ExternalSystemConnection, ExternalTableMapping } from "../src/data-capability/types.js";

describe("WPS connector runtime", () => {
  const connection: ExternalSystemConnection = {
    id: "connection-http",
    clubId: "club-chongqing-talent",
    provider: "wps",
    name: "HTTP WPS",
    status: "active",
    config: {
      mode: "http",
      apiBaseUrl: "https://wps.example.test",
      credentialRef: "wps-prod-secret",
      credentialStatus: "configured",
      documentToken: "doc-token",
      pageSize: 1,
      rawSecret: "must-not-leak",
    },
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
  };
  const tableMapping: ExternalTableMapping = {
    id: "mapping-http",
    clubId: "club-chongqing-talent",
    connectionId: "connection-http",
    externalTableKey: "full_users",
    targetType: "student",
    mappingVersion: "1.0.0",
    status: "active",
    config: {
      tableKind: "online_sheet",
      sheetId: "sheet-1",
      pageSize: 1,
    },
    createdAt: "2026-06-26T00:00:00.000Z",
    updatedAt: "2026-06-26T00:00:00.000Z",
  };

  it("normalizes paginated WPS records with stable row hashes", async () => {
    const requests: string[] = [];
    const connector = createWpsConnector(connection, {
      credentialResolver: (credentialRef) => ({
        authorizationHeader: `Bearer ${credentialRef}`,
      }),
      fetch: async (url) => {
        requests.push(url);
        if (!url.includes("pageToken=next-page")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              records: [
                { recordId: "row-1", rowNumber: 7, fields: { name: "李明", phone: "13800000000" } },
              ],
              nextPageToken: "next-page",
            }),
          };
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            records: [
              { rowId: "row-2", rowIndex: 8, fields: { phone: "13900000000", name: "王强" } },
            ],
          }),
        };
      },
    });

    const first = await connector.fetchRows({ clubId: "club-chongqing-talent", connection, tableMapping });
    const second = await connector.fetchRows({ clubId: "club-chongqing-talent", connection, tableMapping });

    expect(requests[0]).toContain("documentToken=doc-token");
    expect(requests[0]).toContain("sheetId=sheet-1");
    expect(requests[1]).toContain("pageToken=next-page");
    expect(first).toEqual([
      expect.objectContaining({ rowNumber: 7, externalRecordId: "row-1", raw: { name: "李明", phone: "13800000000" } }),
      expect.objectContaining({ rowNumber: 9, externalRecordId: "row-2", raw: { phone: "13900000000", name: "王强" } }),
    ]);
    expect(second.map((record) => record.rowHash)).toEqual(first.map((record) => record.rowHash));
  });

  it("rejects incomplete HTTP config and sanitizes connection output", async () => {
    const incomplete = {
      ...connection,
      config: { mode: "http", apiBaseUrl: "https://wps.example.test" },
    };

    expect(() => createWpsConnector(incomplete, {
      credentialResolver: () => ({ authorizationHeader: "Bearer test" }),
      fetch: async () => ({ ok: true, status: 200, json: async () => ({ records: [] }) }),
    })).toThrow("credentialRef");
    expect(sanitizeExternalConnection(connection).config).toEqual({
      mode: "http",
      apiBaseUrl: "https://wps.example.test",
      credentialRef: "wps-prod-secret",
      credentialStatus: "configured",
      documentToken: "doc-token",
      pageSize: 1,
    });
  });
});
