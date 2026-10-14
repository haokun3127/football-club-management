import { ScoutError } from "./scout-identity.js";
import {
  specialImportResources,
  isSpecialImport,
  assessmentImportInput,
  validateSpecialImport,
} from "./backoffice-import-special.js";
import { BackofficeAssessmentTasks } from "./backoffice-assessment-tasks.js";
import { saveBackofficeTrainingRecordInTransaction } from "./backoffice-training-records.js";
import ExcelJS from "exceljs";
import { randomUUID } from "node:crypto";
import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import { BackofficeManagement } from "./backoffice-management.js";
import {
  backofficeResources,
  type BackofficeField,
  type BackofficeResource,
} from "./backoffice-resources.js";
import {
  BackofficeImportRepository,
  type ImportBatch,
  type ImportRow,
} from "../persistence/backoffice-import-repository.js";
import {
  BackofficeFault,
  digest,
  type BackofficeValues,
} from "../persistence/backoffice-management-repository.js";
import { readExcelWorksheetRecords } from "../integration/excel-import.js";
export interface ImportPreviewInput {
  resourceKey: string;
  sourceName: string;
  fileName: string;
  contentBase64: string;
  blankPolicy: "preserve" | "clear";
  mapping?: Record<string, string>;
  requestId: string;
}
export const importableResources = [
  ...specialImportResources,
  ...backofficeResources.filter(
    (resource) =>
      !resource.singleton && !["memberships"].includes(resource.key),
  ),
];
export class BackofficeImports {
  readonly management: BackofficeManagement;
  readonly repository: BackofficeImportRepository;
  constructor(readonly store: PersistentApiStore) {
    this.management = new BackofficeManagement(store);
    this.repository = new BackofficeImportRepository(
      store.repositories.backofficeManagement.database,
    );
  }
  resource(actor: AuthContext, key: string, write = false) {
    const resource = importableResources.find(
      (resource) => resource.key === key,
    );
    if (!resource) throw new BackofficeFault(404, "not_found");
    this.management.require(actor, resource, write);
    if (
      write &&
      key === "scouts" &&
      !this.store.repositories.scoutPlayers.configured
    )
      throw new BackofficeFault(503, "identity_not_configured");
    return resource;
  }
  templates(actor: AuthContext) {
    return importableResources
      .filter((resource) => this.management.allow(actor, resource))
      .map((resource) => ({
        key: resource.key,
        title: resource.title,
        version: "1",
        canImport:
          this.management.allow(actor, resource, true) &&
          (resource.key !== "scouts" ||
            this.store.repositories.scoutPlayers.configured),
        policy:
          resource.key === "scouts"
            ? "身份加密暂存，预览仅显示尾号；沿既有实名结构校验和自然身份去重，不自动入队。"
            : resource.key === "assessment-drafts"
              ? "同任务同学员的所选项目原子保存为一份草稿；各行须使用相同草稿修订与更正原因；不自动发布。"
              : "逐行事务；合格行入库，失败行修正后重试；空值默认保留；更新须核对版本",
        fields: this.management
          .fields(actor, resource)
          .filter((field) => !field.virtual),
      }));
  }
  async template(actor: AuthContext, key: string) {
    const resource = this.resource(actor, key);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("导入");
    sheet.addRow([
      "externalId",
      ...(!isSpecialImport(resource.key)
        ? ["targetId", "expectedRevision"]
        : []),
      ...this.management
        .fields(actor, resource)
        .filter((field) => !field.virtual)
        .map((field) => field.key),
    ]);
    const guide = workbook.addWorksheet("字段说明");
    guide.addRow(["字段", "说明", "类型", "必填", "选项与单位"]);
    guide.addRow([
      "externalId",
      "同一来源内稳定外部标识",
      "text",
      "是",
      "重复确认不新增对象",
    ]);
    if (!isSpecialImport(resource.key)) {
      guide.addRow([
        "targetId",
        "更新现有对象时填写系统标识",
        "text",
        "否",
        "同俱乐部已有标识",
      ]);
      guide.addRow([
        "expectedRevision",
        "更新指定对象必须填写当前 revision",
        "text",
        "更新时",
        "从明细导出获取",
      ]);
    }
    for (const field of this.management
      .fields(actor, resource)
      .filter((field) => !field.virtual)) {
      guide.addRow([
        field.key,
        field.label,
        field.kind,
        field.required ? "是" : "否",
        field.options?.map((o) => `${o.value}=${o.label}`).join("; ") ??
          (field.reference
            ? `关联 ${field.reference} 标识；多值用 | 分隔`
            : ""),
      ]);
      if (field.reference) {
        const options = await this.management.options(actor, field.reference);
        for (const option of options)
          guide.addRow([
            "关联选项",
            field.reference,
            option.value,
            option.label,
          ]);
      }
    }
    guide.addRow([
      "空值",
      "preserve 保留已有值；clear 清空已映射的空字段；必填字段不能清空",
    ]);
    return {
      fileName: `${resource.key}-v1.xlsx`,
      contentBase64: Buffer.from(await workbook.xlsx.writeBuffer()).toString(
        "base64",
      ),
    };
  }
  parse(field: BackofficeField, value: unknown): BackofficeValues[string] {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "object")
      throw new BackofficeFault(400, "invalid_import_cell");
    if (field.kind === "tags" || field.multiple)
      return String(value)
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean);
    if (field.kind === "number") {
      const n = Number(value);
      if (!Number.isFinite(n))
        throw new BackofficeFault(400, "invalid_import_number");
      return n;
    }
    if (field.kind === "boolean") {
      if (["true", "1", "是"].includes(String(value))) return true;
      if (["false", "0", "否"].includes(String(value))) return false;
      throw new BackofficeFault(400, "invalid_import_boolean");
    }
    if (field.kind === "date") return String(value).slice(0, 10);
    return String(value).trim();
  }
  projection(actor: AuthContext, batch: ImportBatch) {
    const resource = this.resource(actor, batch.resourceKey),
      allowed = new Set(
        this.management.fields(actor, resource).map((field) => field.key),
      );
    return {
      ...batch,
      canExport: this.management.has(actor, "export"),
      fields: batch.fields.filter((key) => allowed.has(key)),
      rows: batch.rows.map((row) => ({
        ...row,
        values: Object.fromEntries(
          Object.entries(row.values).filter(([key]) => allowed.has(key)),
        ),
      })),
      revision: digest(batch),
    };
  }
  list(actor: AuthContext) {
    return this.repository
      .list(actor.clubId)
      .filter((batch) => {
        try {
          this.resource(actor, batch.resourceKey);
          return true;
        } catch {
          return false;
        }
      })
      .map((batch) => this.projection(actor, batch));
  }
  get(actor: AuthContext, id: string) {
    const batch = this.repository.get(actor.clubId, id);
    if (!batch) throw new BackofficeFault(404, "not_found");
    return this.projection(actor, batch);
  }
  async exportFailures(actor: AuthContext, id: string, requestId: string) {
    let batch: ReturnType<BackofficeImports["get"]>;
    await this.management.repository.transaction(async () => {
      if (
        !this.management.repository.activeBrowser(
          actor.clubId,
          actor.user.id,
          actor.membership.id,
        )
      )
        throw new BackofficeFault(401, "authentication_required");
      if (!this.management.has(actor, "export"))
        throw new BackofficeFault(403, "export_authorization_required");
      batch = this.get(actor, id);
      const hash = digest({ action: "import_failures", id, requestId }),
        repo = this.management.repository;
      const replay = repo.replay(actor.clubId, actor.user.id, requestId, hash);
      if (replay !== undefined) {
        const original = replay as typeof batch;
        const resource = this.resource(actor, original.resourceKey);
        const allowed = new Set(
          this.management.fields(actor, resource).map((field) => field.key),
        );
        batch = {
          ...original,
          fields: original.fields.filter((field) => allowed.has(field)),
          rows: original.rows.map((row) => ({
            ...row,
            values: Object.fromEntries(
              Object.entries(row.values).filter(([key]) => allowed.has(key)),
            ),
          })),
        };
        return;
      }
      repo.audit(
        actor.clubId,
        "import-exports",
        id,
        actor.user.id,
        "export_failed_rows",
        undefined,
        {
          revision: batch.revision,
          rowCount: batch.rows.filter((row) => row.status === "failed").length,
        },
        requestId,
      );
      repo.remember(actor.clubId, actor.user.id, requestId, hash, batch);
    });
    const workbook = new ExcelJS.Workbook(),
      sheet = workbook.addWorksheet("失败行");
    sheet.addRow([
      "rowNumber",
      "externalId",
      "targetId",
      "expectedRevision",
      ...batch!.fields,
      "error",
    ]);
    batch!.rows
      .filter((row) => row.status === "failed")
      .forEach((row) =>
        sheet.addRow([
          row.rowNumber,
          row.externalId,
          row.targetId ?? "",
          row.expectedRevision ?? "",
          ...batch!.fields.map((key) =>
            Array.isArray(row.values[key])
              ? (row.values[key] as string[]).join("|")
              : (row.values[key] ?? ""),
          ),
          row.error ?? "",
        ]),
      );
    return {
      fileName: `${batch!.resourceKey}-failed.xlsx`,
      contentBase64: Buffer.from(await workbook.xlsx.writeBuffer()).toString(
        "base64",
      ),
    };
  }
  async preview(actor: AuthContext, input: ImportPreviewInput) {
    const resource = this.resource(actor, input.resourceKey, true),
      allowed = this.management
        .fields(actor, resource)
        .filter((field) => !field.virtual),
      mapping =
        input.mapping ??
        Object.fromEntries(allowed.map((field) => [field.key, field.key]));
    if (
      Object.keys(mapping).some(
        (key) => !allowed.some((field) => field.key === key),
      ) ||
      new Set(Object.values(mapping)).size !== Object.values(mapping).length
    )
      throw new BackofficeFault(400, "invalid_import_mapping");
    let records;
    try {
      records = await readExcelWorksheetRecords({
        buffer: Buffer.from(input.contentBase64, "base64"),
      });
    } catch {
      throw new BackofficeFault(400, "invalid_import_file");
    }
    if (!records.length || records.length > 500)
      throw new BackofficeFault(400, "import_row_limit");
    const repo = this.management.repository;
    const id = await repo.transaction(async () => {
      if (!repo.activeAdmin(actor.clubId, actor.user.id, actor.membership.id))
        throw new BackofficeFault(401, "authentication_required");
      this.resource(actor, resource.key, true);
      const hash =
          resource.key === "scouts"
            ? this.store.repositories.scoutPlayers.importFingerprint({
                action: "import_preview",
                input,
              })
            : digest({ action: "import_preview", input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return (replay as { id: string }).id;
      const now = new Date().toISOString(),
        id = `import-batch-${randomUUID()}`,
        connectionId = `backoffice-import-${digest([actor.clubId, input.sourceName, resource.key])}`,
        mappingVersion = digest({ version: 1, mapping }),
        tableMappingId = `backoffice-map-${digest([connectionId, mappingVersion])}`,
        config = this.store.repositories.dataCapability;
      config.saveExternalConnection({
        id: connectionId,
        clubId: actor.clubId,
        provider: "excel",
        name: input.sourceName,
        status: "active",
        config: { direction: "inbound", applyPolicy: "manual_confirm" },
        createdAt: now,
        updatedAt: now,
      });
      config.saveExternalTableMapping({
        id: tableMappingId,
        clubId: actor.clubId,
        connectionId,
        externalTableKey: `backoffice-${resource.key}`,
        targetType: resource.key,
        mappingVersion,
        status: "active",
        config: { mapping, blankPolicy: input.blankPolicy },
        createdAt: now,
        updatedAt: now,
      });
      for (const [target, source] of Object.entries(mapping))
        config.saveExternalFieldMapping({
          id: `backoffice-field-${digest([tableMappingId, target])}`,
          clubId: actor.clubId,
          tableMappingId,
          externalFieldKey: source,
          targetFieldKey: target,
          targetFieldKind: allowed.find((field) => field.key === target)!.kind,
          required:
            allowed.find((field) => field.key === target)!.required ?? false,
          createdAt: now,
          updatedAt: now,
        });
      config.saveExternalSyncRun({
        id,
        clubId: actor.clubId,
        connectionId,
        tableMappingId,
        status: "queued",
        totalRecords: records.length,
        importedRecords: 0,
        failedRecords: 0,
        createdAt: now,
        updatedAt: now,
      });
      const rows: ImportRow[] = [],
        seen = new Set<string>();
      for (const record of records) {
        const sourceExternalId = String(record.raw.externalId ?? "").trim();
        const externalId =
            resource.key === "scouts" && /\d{17}[\dXx]/.test(sourceExternalId)
              ? `opaque-${this.store.repositories.scoutPlayers.importFingerprint(sourceExternalId)}`
              : sourceExternalId,
          payloadInput = {
            raw: record.raw,
            mappingVersion,
            blankPolicy: input.blankPolicy,
          },
          payloadHash =
            resource.key === "scouts"
              ? this.store.repositories.scoutPlayers.importFingerprint(
                  payloadInput,
                )
              : digest(payloadInput),
          rawId = `backoffice-raw-${digest([connectionId, externalId, payloadHash])}`,
          linked = this.repository.link(actor.clubId, connectionId, externalId),
          targetId = record.raw.targetId
            ? String(record.raw.targetId)
            : linked?.targetId,
          previous =
            targetId && !isSpecialImport(resource.key)
              ? (await this.management.records(resource, actor.clubId)).find(
                  (row) => row.id === targetId,
                )
              : undefined;
        const row: ImportRow = {
          rowNumber: record.rowNumber,
          rawId,
          externalId,
          values: {},
          targetId,
          expectedRevision: previous?.revision ?? null,
          action:
            linked?.hash === payloadHash
              ? "duplicate"
              : targetId
                ? "update"
                : "create",
          status: "pending",
        };
        try {
          if (!externalId || externalId.length > 128 || seen.has(externalId))
            throw new BackofficeFault(400, "invalid_external_id");
          seen.add(externalId);
          if (
            linked &&
            !isSpecialImport(resource.key) &&
            record.raw.targetId &&
            String(record.raw.targetId) !== linked.targetId
          )
            throw new BackofficeFault(409, "external_id_already_linked");
          if (isSpecialImport(resource.key) && record.raw.targetId)
            throw new BackofficeFault(400, "invalid_import_target");
          if (!isSpecialImport(resource.key) && targetId && !previous)
            throw new BackofficeFault(400, "invalid_reference");
          if (
            !isSpecialImport(resource.key) &&
            record.raw.targetId &&
            String(record.raw.expectedRevision ?? "") !== previous?.revision
          )
            throw new BackofficeFault(409, "revision_conflict");
          if (resource.appendOnly && targetId && row.action !== "duplicate")
            throw new BackofficeFault(403, "append_only_record");
          for (const field of allowed) {
            const sourceField = mapping[field.key];
            if (!sourceField) continue;
            const value = record.raw[sourceField];
            if (value === undefined || value === "") {
              if (input.blankPolicy === "clear")
                row.values[field.key] =
                  field.multiple || field.kind === "tags" ? [] : null;
            } else row.values[field.key] = this.parse(field, value);
          }
          if (resource.key === "scouts") {
            row.values.identityNumber =
              this.store.repositories.scoutPlayers.stageImportIdentity(
                actor.clubId,
                rawId,
                String(row.values.name ?? ""),
                String(row.values.identityNumber ?? ""),
              );
            if (row.action === "duplicate") row.status = "duplicate";
            if (linked) row.targetId = linked.targetId;
          } else if (row.action !== "duplicate") {
            if (isSpecialImport(resource.key)) {
              await validateSpecialImport(
                this.store,
                actor,
                resource,
                row.values,
              );
              const target =
                resource.key === "assessment-drafts"
                  ? (await assessmentImportInput(this.store, actor, row.values))
                      .targetId
                  : JSON.stringify([row.values.eventId, row.values.studentId]);
              if (linked && linked.targetId !== target)
                throw new BackofficeFault(409, "external_id_already_linked");
              row.targetId = target;
            } else
              await this.management.validate(
                actor,
                resource,
                { ...previous?.values, ...row.values },
                previous,
              );
          } else row.status = "duplicate";
        } catch (e) {
          row.error =
            e instanceof BackofficeFault || e instanceof ScoutError
              ? e.code
              : "invalid_import_row";
          row.status = "failed";
        }
        if (resource.key === "scouts" && row.status === "failed")
          delete row.targetId;
        if (
          resource.key === "scouts" &&
          !String(row.values.identityNumber ?? "").startsWith("**************")
        )
          row.values.identityNumber = "（身份校验未通过）";
        config.saveExternalRawRecord({
          id: rawId,
          clubId: actor.clubId,
          connectionId,
          tableMappingId,
          syncRunId: id,
          externalRecordId:
            externalId || `invalid-row-${record.rowNumber}-${id}`,
          payload: resource.key === "scouts" ? row.values : record.raw,
          payloadHash,
          reviewStatus: row.status === "duplicate" ? "confirmed" : "pending",
          validationErrors: row.error ? [row.error] : [],
          normalizedPreview: row.values,
          importedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        rows.push(row);
      }
      const batch: ImportBatch = {
        id,
        clubId: actor.clubId,
        actorId: actor.user.id,
        resourceKey: resource.key,
        sourceName: input.sourceName,
        mappingVersion,
        blankPolicy: input.blankPolicy,
        fields: Object.keys(mapping),
        rows,
        createdAt: now,
        updatedAt: now,
      };
      this.repository.save(batch);
      repo.audit(
        actor.clubId,
        "imports",
        id,
        actor.user.id,
        "preview",
        undefined,
        { resourceKey: resource.key, rowCount: rows.length, mappingVersion },
        input.requestId,
        now,
      );
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, { id });
      return id;
    });
    return this.get(actor, id);
  }
  async confirm(
    actor: AuthContext,
    id: string,
    input: {
      expectedRevision: string;
      rowNumbers: number[];
      requestId: string;
    },
  ) {
    const original = this.repository.get(actor.clubId, id);
    if (!original) throw new BackofficeFault(404, "not_found");
    const resource = this.resource(actor, original.resourceKey, true);
    if (
      input.rowNumbers.some(
        (n) => !original.rows.some((row) => row.rowNumber === n),
      )
    )
      throw new BackofficeFault(400, "invalid_import_row");
    const confirmHash = digest({ action: "import_confirm", id, input });
    await this.management.repository.transaction(async () => {
      const repo = this.management.repository;
      this.resource(actor, resource.key, true);
      if (!repo.activeAdmin(actor.clubId, actor.user.id, actor.membership.id))
        throw new BackofficeFault(401, "authentication_required");
      if (
        repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          confirmHash,
        ) !== undefined
      )
        return;
      const current = this.repository.get(actor.clubId, id)!;
      if (digest(current) !== input.expectedRevision)
        throw new BackofficeFault(409, "revision_conflict");
      repo.remember(actor.clubId, actor.user.id, input.requestId, confirmHash, {
        id,
      });
    });
    if (resource.key === "assessment-drafts") {
      await this.confirmAssessmentGroups(
        actor,
        id,
        input.rowNumbers,
        input.requestId,
      );
      return this.get(actor, id);
    }
    for (const number of input.rowNumbers) {
      const repo = this.management.repository;
      try {
        await repo.transaction(async () => {
          const batch = this.repository.get(actor.clubId, id)!;
          this.resource(actor, resource.key, true);
          if (
            !repo.activeAdmin(actor.clubId, actor.user.id, actor.membership.id)
          )
            throw new BackofficeFault(401, "authentication_required");
          const row = batch.rows.find((row) => row.rowNumber === number)!;
          if (["success", "duplicate"].includes(row.status)) return;
          const confirmed = this.repository.confirmedRaw(
            actor.clubId,
            row.rawId,
          );
          if (confirmed) {
            row.status = "duplicate";
            row.resultId = confirmed;
            delete row.error;
            batch.updatedAt = new Date().toISOString();
            this.repository.save(batch, true);
            return;
          }
          const visible = new Set(
            this.management.fields(actor, resource).map((field) => field.key),
          );
          if (Object.keys(row.values).some((key) => !visible.has(key)))
            throw new BackofficeFault(403, "permission_denied");
          if (
            row.error &&
            row.status === "failed" &&
            ![
              "revision_conflict",
              "import_row_failed",
              "data_conflict",
            ].includes(row.error)
          )
            return;
          let resultId: string;
          if (resource.key === "scouts") {
            const saved =
              await this.store.repositories.scoutPlayers.createInTransaction(
                {
                  clubId: actor.clubId,
                  actorUserId: actor.user.id,
                  name: String(row.values.name),
                  identityNumber:
                    this.store.repositories.scoutPlayers.openImportIdentity(
                      actor.clubId,
                      row.rawId,
                    ),
                },
                {
                  authorize: async () => {
                    this.resource(actor, "scouts", true);
                    if (
                      !repo.activeAdmin(
                        actor.clubId,
                        actor.user.id,
                        actor.membership.id,
                      )
                    )
                      throw new BackofficeFault(401, "authentication_required");
                  },
                  audit: (player) =>
                    repo.audit(
                      actor.clubId,
                      "scouts",
                      player.id,
                      actor.user.id,
                      "create",
                      undefined,
                      player,
                      this.rowRequestId(row.rawId),
                    ),
                },
              );
            resultId = saved.player.id;
            if (row.targetId && row.targetId !== resultId)
              throw new BackofficeFault(409, "external_id_already_linked");
          } else if (resource.key === "training-records") {
            await validateSpecialImport(
              this.store,
              actor,
              resource,
              row.values,
            );
            const saved = await saveBackofficeTrainingRecordInTransaction(
              this.store,
              actor,
              {
                eventId: String(row.values.eventId),
                studentId: String(row.values.studentId),
                expectedRevision: Number(row.values.recordRevision),
                counted: Boolean(row.values.counted),
                reason: String(row.values.reason),
                requestId: this.rowRequestId(row.rawId),
              },
            );
            resultId = JSON.stringify([saved.eventId, saved.studentId]);
          } else {
            const response = await this.management.saveInTransaction(
              actor,
              resource,
              row.targetId,
              {
                values: row.values,
                expectedRevision: row.expectedRevision,
                requestId: this.rowRequestId(row.rawId),
              },
            );
            resultId = response.id;
          }
          row.status = "success";
          row.resultId = resultId;
          delete row.error;
          batch.updatedAt = new Date().toISOString();
          this.repository.confirmLink(batch, row, actor.user.id, resultId);
          this.repository.save(batch, true);
          repo.audit(
            actor.clubId,
            "imports",
            id,
            actor.user.id,
            "confirm_row",
            undefined,
            { rowNumber: number, targetId: resultId },
            input.requestId,
          );
        });
        this.store.refreshBackofficeFacts(actor.clubId);
      } catch (e) {
        if (e instanceof BackofficeFault && [401, 403].includes(e.status))
          throw e;
        await repo.transaction(async () => {
          const batch = this.repository.get(actor.clubId, id)!;
          const row = batch.rows.find((row) => row.rowNumber === number)!;
          if (!["success", "duplicate"].includes(row.status)) {
            row.status = "failed";
            row.error =
              e instanceof BackofficeFault || e instanceof ScoutError
                ? e.code
                : "import_row_failed";
            batch.updatedAt = new Date().toISOString();
            this.repository.save(batch, true);
          }
        });
      }
    }
    return this.get(actor, id);
  }
  async confirmAssessmentGroups(
    actor: AuthContext,
    id: string,
    numbers: number[],
    requestId: string,
  ) {
    const batch = this.repository.get(actor.clubId, id)!,
      groups = new Map<string, ImportRow[]>();
    for (const row of batch.rows.filter(
      (row) =>
        numbers.includes(row.rowNumber) &&
        !["success", "duplicate"].includes(row.status) &&
        (!row.error ||
          [
            "import_row_failed",
            "revision_conflict",
            "assessment_revision_conflict",
          ].includes(row.error)),
    )) {
      const key = JSON.stringify([row.values.taskId, row.values.studentId]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    for (const group of groups.values()) {
      try {
        const entries = await Promise.all(
            group.map((row) =>
              assessmentImportInput(this.store, actor, row.values),
            ),
          ),
          first = entries[0]!;
        if (
          entries.some(
            (entry) =>
              entry.input.expectedRevision !== first.input.expectedRevision ||
              entry.input.reason !== first.input.reason,
          )
        )
          throw new BackofficeFault(400, "inconsistent_import_revision");
        await new BackofficeAssessmentTasks(this.store).save(
          actor,
          first.taskId,
          first.studentId,
          {
            ...first.input,
            entries: entries.flatMap((entry) => entry.input.entries),
          },
          () => {
            this.resource(actor, "assessment-drafts", true);
            if (
              !this.management.repository.activeAdmin(
                actor.clubId,
                actor.user.id,
                actor.membership.id,
              )
            )
              throw new BackofficeFault(401, "authentication_required");
            const current = this.repository.get(actor.clubId, id)!;
            for (const inputRow of group) {
              const row = current.rows.find(
                  (row) => row.rowNumber === inputRow.rowNumber,
                )!,
                target = JSON.stringify([
                  row.values.taskId,
                  row.values.studentId,
                  row.values.testItemId,
                ]),
                confirmed = this.repository.confirmedRaw(
                  actor.clubId,
                  row.rawId,
                );
              row.status = confirmed ? "duplicate" : "success";
              row.resultId = confirmed ?? target;
              delete row.error;
              this.repository.confirmLink(
                current,
                row,
                actor.user.id,
                row.resultId,
              );
              this.management.repository.audit(
                actor.clubId,
                "imports",
                id,
                actor.user.id,
                "confirm_draft",
                undefined,
                { rowNumber: row.rowNumber, targetId: row.resultId },
                requestId,
              );
            }
            current.updatedAt = new Date().toISOString();
            this.repository.save(current, true);
          },
        );
      } catch (e) {
        if (e instanceof BackofficeFault && [401, 403].includes(e.status))
          throw e;
        await this.management.repository.transaction(async () => {
          const current = this.repository.get(actor.clubId, id)!;
          for (const inputRow of group) {
            const row = current.rows.find(
              (row) => row.rowNumber === inputRow.rowNumber,
            )!;
            if (!["success", "duplicate"].includes(row.status)) {
              row.status = "failed";
              row.error =
                e instanceof BackofficeFault || e instanceof ScoutError
                  ? e.code
                  : "import_row_failed";
            }
          }
          current.updatedAt = new Date().toISOString();
          this.repository.save(current, true);
        });
      }
    }
  }
  rowRequestId(rawId: string) {
    const hash = digest(rawId);
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }
}
