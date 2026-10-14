import ExcelJS from "exceljs";
import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import { BackofficeManagement } from "./backoffice-management.js";
import { resourceByKey } from "./backoffice-resources.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
export async function exportBackofficeResource(
  store: PersistentApiStore,
  actor: AuthContext,
  key: string,
  input: {
    fields: string[];
    search?: string;
    snapshot: string;
    requestId: string;
  },
) {
  const management = new BackofficeManagement(store),
    resource = resourceByKey(key);
  if (!resource) throw new BackofficeFault(404, "not_found");
  const captured = await management.repository.transaction(async () => {
    management.require(actor, resource);
    if (
      !management.repository.activeBrowser(
        actor.clubId,
        actor.user.id,
        actor.membership.id,
      )
    )
      throw new BackofficeFault(401, "authentication_required");
    if (!management.has(actor, "export"))
      throw new BackofficeFault(403, "export_authorization_required");
    const allowed = new Set(
      management.fields(actor, resource).map((field) => field.key),
    );
    if (input.fields.some((key) => !allowed.has(key)))
      throw new BackofficeFault(403, "permission_denied");
    const search = (input.search ?? "").trim().toLocaleLowerCase();
    const rows = (await management.records(resource, actor.clubId))
      .map((row) => management.projection(actor, resource, row))
      .filter((row) =>
        [row.id, ...Object.values(row.values)].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(search),
        ),
      );
    if (digest(rows) !== input.snapshot)
      throw new BackofficeFault(409, "export_snapshot_changed");
    if (rows.length > 10000) throw new BackofficeFault(400, "export_row_limit");
    const hash = digest({ action: "export", key, input }),
      replay = management.repository.replay(
        actor.clubId,
        actor.user.id,
        input.requestId,
        hash,
      );
    const exportedAt = replay
      ? (replay as { exportedAt: string }).exportedAt
      : new Date().toISOString();
    if (!replay) {
      management.repository.audit(
        actor.clubId,
        "exports",
        key,
        actor.user.id,
        "export",
        undefined,
        {
          fields: input.fields,
          search: input.search ?? "",
          snapshot: input.snapshot,
          rowCount: rows.length,
        },
        input.requestId,
        exportedAt,
      );
      management.repository.remember(
        actor.clubId,
        actor.user.id,
        input.requestId,
        hash,
        { exportedAt },
      );
    }
    return { rows, exportedAt };
  });
  const workbook = new ExcelJS.Workbook(),
    sheet = workbook.addWorksheet("明细");
  sheet.addRow(["externalId", "targetId", "expectedRevision", ...input.fields]);
  for (const row of captured.rows)
    sheet.addRow([
      row.id,
      row.id,
      row.revision,
      ...input.fields.map((key) => {
        const value = row.values[key];
        return Array.isArray(value) ? value.join("|") : value;
      }),
    ]);
  const meta = workbook.addWorksheet("导出条件");
  meta.addRow(["俱乐部", actor.clubId]);
  meta.addRow(["对象", resource.title]);
  meta.addRow(["检索", input.search ?? ""]);
  meta.addRow(["事实版本", input.snapshot]);
  meta.addRow(["导出时间", captured.exportedAt]);
  meta.addRow(["行数", captured.rows.length]);
  return {
    fileName: `${key}-export.xlsx`,
    contentBase64: Buffer.from(await workbook.xlsx.writeBuffer()).toString(
      "base64",
    ),
    snapshot: input.snapshot,
    rowCount: captured.rows.length,
    exportedAt: captured.exportedAt,
  };
}
