import { createHash } from "node:crypto";
import {
  getNumericMetricValue,
  type AbilityMetric,
  type PlayerMetricRecord,
} from "@football-club/domain";
import { PersistentApiStore, type ApiStore } from "../store.js";
import { confirmedStudentResults } from "./confirmed-student-results.js";
import {
  BackofficeStandardRepository,
  type StandardVersion,
} from "../persistence/backoffice-standard-repository.js";
export interface RadarPoint {
  metricId: string;
  score: number | null;
  rawLabel: string;
  factId: string | null;
  occurredAt: string | null;
  metricVersion: string | null;
  mappingVersion: string | null;
  status: "measured" | "missing" | "unmapped" | "incompatible";
  reason: string;
}
export interface RadarSeries {
  id: string;
  name: string;
  kind: "latest_per_metric" | "history" | "standard";
  points: RadarPoint[];
}
export interface RadarAxis {
  metricId: string;
  label: string;
  rawUnit: string | null;
  scoreMin: number;
  scoreMax: number;
  metricVersion: string | null;
  mappingVersion: string | null;
}
export interface RadarComparison {
  views: Array<{ id: string; name: string; metricIds: string[] }>;
  axes: RadarAxis[];
  current: RadarSeries;
  comparisonOptions: {
    history: Array<{ id: string; label: string; date: string }>;
    standards: Array<{ id: string; label: string; date: string }>;
    historyReason: string;
    standardReason: string;
  };
  selectedComparisons: RadarSeries[];
}
export class RadarSourceError extends Error {}
const dateKey = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 10)
    : "";
const empty = (metricId: string, reason = "尚无已确认成绩"): RadarPoint => ({
  metricId,
  score: null,
  rawLabel: "未测",
  factId: null,
  occurredAt: null,
  metricVersion: null,
  mappingVersion: null,
  status: "missing",
  reason,
});
const valueLabel = (value: Parameters<typeof getNumericMetricValue>[0]) => {
  const n = getNumericMetricValue(value);
  return n === null ? "非数值成绩" : String(n);
};
export async function radarComparison(
  store: ApiStore,
  clubId: string,
  studentId: string,
  teamIds: Set<string>,
  query: { historyResultId?: string; standardId?: string } = {},
): Promise<RadarComparison> {
  const config = await store.getDataCapabilityConfig(clubId),
    metrics = (await store.listAbilityMetrics(clubId)).filter(
      (metric) => metric.status !== "inactive",
    );
  const catalog = new Map(metrics.map((metric) => [metric.id, metric]));
  const views = config.metricViews
    .filter((view) => view.status === "active")
    .map((view) => ({
      id: view.id,
      name: view.name,
      metricIds: Array.from(
        new Set(
          config.metricViewNodes
            .filter(
              (node) =>
                node.viewId === view.id &&
                node.metricId &&
                catalog.has(node.metricId),
            )
            .sort(
              (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
            )
            .map((node) => node.metricId!),
        ),
      ),
    }))
    .filter((view) => view.metricIds.length);
  if (!views.length)
    views.push({
      id: "configured-metrics",
      name: "已配置指标",
      metricIds: metrics.map((metric) => metric.id),
    });
  const ids = Array.from(new Set(views.flatMap((view) => view.metricIds))),
    raw = await confirmedStudentResults(store, clubId, studentId, teamIds);
  const assessmentIds = new Set(raw.map((fact) => fact.assessmentId));
  const records = store
    .getStudentMetrics(clubId, studentId)
    .filter(
      (record) => record.assessmentId && assessmentIds.has(record.assessmentId),
    );
  const templateVersion = (id: string | null | undefined) =>
    config.assessmentTemplateVersions.find((version) => version.id === id);
  function definitionVersion(
    metric: AbilityMetric,
    templateId: string | null | undefined,
  ) {
    return (
      metric.version ?? templateVersion(templateId)?.graphVersionId ?? null
    );
  }
  function rawPoint(fact: (typeof raw)[number]): RadarPoint {
    const metric = catalog.get(fact.metricId)!,
      version = definitionVersion(metric, fact.templateVersionId),
      p = {
        ...empty(fact.metricId),
        factId: fact.id,
        occurredAt: fact.occurredAt,
        rawLabel: `${valueLabel(fact.value)}${fact.unit ? ` ${fact.unit}` : ""}`,
        metricVersion: version,
      };
    if (!fact.mapping)
      return { ...p, status: "unmapped", reason: "该原始成绩没有批准映射" };
    const grade = store.findAssessmentMappingVersion?.(
        clubId,
        fact.mapping.gradeVersionId,
      ),
      score = store.findAssessmentMappingVersion?.(
        clubId,
        fact.mapping.rawScoreVersionId,
      );
    const mappingVersion = `${fact.mapping.rawScoreVersionId}|${fact.mapping.gradeVersionId}`;
    if (
      !grade ||
      !score ||
      grade.definition.stage !== "score_grade" ||
      score.definition.stage !== "raw_score" ||
      score.testItemId !== fact.testItemId ||
      grade.status === "draft" ||
      score.status === "draft" ||
      grade.definition.minimum !== 0 ||
      grade.definition.maximum !== 100 ||
      !version
    )
      return {
        ...p,
        mappingVersion,
        status: "incompatible",
        reason: "缺少可核对的0–100量尺或指标版本",
      };
    if (
      !Number.isFinite(fact.mapping.integerScore) ||
      fact.mapping.integerScore < 0 ||
      fact.mapping.integerScore > 100
    )
      return {
        ...p,
        mappingVersion,
        status: "incompatible",
        reason: "映射分值不在批准量尺内",
      };
    return {
      ...p,
      mappingVersion,
      score: fact.mapping.integerScore,
      status: "measured",
      reason: "",
    };
  }
  function recordPoint(record: PlayerMetricRecord): RadarPoint {
    const metric = catalog.get(record.metricId)!,
      version = definitionVersion(metric, record.templateVersionId),
      p = {
        ...empty(record.metricId),
        factId: record.id,
        occurredAt: record.occurredAt,
        rawLabel: valueLabel(record.value),
        metricVersion: version,
      };
    const model = templateVersion(record.templateVersionId),
      binding = config.assessmentMetricBindings.find(
        (item) =>
          item.templateVersionId === model?.id && item.metricId === metric.id,
      );
    if (
      record.value.kind !== "score_0_100" ||
      !model ||
      !version ||
      model.status === "draft" ||
      (binding?.maxScore ?? metric.maxScore) !== 100
    )
      return {
        ...p,
        status: "unmapped",
        reason: "该指标未形成批准的0–100模型分值",
      };
    const score = record.value.score;
    return Number.isFinite(score) && score >= 0 && score <= 100
      ? {
          ...p,
          score,
          status: "measured",
          mappingVersion: `model:${model.id}`,
          reason: "",
        }
      : { ...p, status: "incompatible", reason: "模型分值超出量尺" };
  }
  const facts = new Map<string, Map<string, RadarPoint>>();
  function add(assessmentId: string, p: RadarPoint) {
    if (!catalog.has(p.metricId)) return;
    const group = facts.get(assessmentId) ?? new Map<string, RadarPoint>(),
      old = group.get(p.metricId);
    if (
      !old ||
      Date.parse(p.occurredAt ?? "") > Date.parse(old.occurredAt ?? "") ||
      (p.occurredAt === old.occurredAt && (p.factId ?? "") > (old.factId ?? ""))
    )
      group.set(p.metricId, p);
    facts.set(assessmentId, group);
  }
  // A confirmed raw fact owns an atomic metric. Derived model outputs retain their own provenance.
  for (const fact of raw)
    if (catalog.has(fact.metricId)) add(fact.assessmentId, rawPoint(fact));
  for (const record of records)
    if (
      catalog.has(record.metricId) &&
      !facts.get(record.assessmentId!)?.has(record.metricId)
    )
      add(record.assessmentId!, recordPoint(record));
  const currentPoints = ids.map(
    (id) =>
      [...facts.values()]
        .flatMap((group) => (group.has(id) ? [group.get(id)!] : []))
        .sort(
          (a, b) =>
            Date.parse(b.occurredAt ?? "") - Date.parse(a.occurredAt ?? "") ||
            (b.factId ?? "").localeCompare(a.factId ?? ""),
        )[0] ?? empty(id),
  );
  const axes = ids.map((metricId) => {
    const metric = catalog.get(metricId)!,
      point = currentPoints.find((p) => p.metricId === metricId)!;
    return {
      metricId,
      label: metric.name,
      rawUnit: metric.unit ?? null,
      scoreMin: 0,
      scoreMax: 100,
      metricVersion: point.metricVersion ?? metric.version ?? null,
      mappingVersion: point.mappingVersion,
    };
  });
  function aligned(points: RadarPoint[]) {
    return points.map((point) => {
      const axis = axes.find((item) => item.metricId === point.metricId)!;
      return point.status === "measured" &&
        (point.metricVersion !== axis.metricVersion ||
          point.mappingVersion !== axis.mappingVersion)
        ? {
            ...point,
            score: null,
            status: "incompatible" as const,
            reason: "与当前轴的指标或映射版本不同",
          }
        : point;
    });
  }
  const tasks = new Map(
    (await store.listAssessmentTasks(clubId)).map((task) => [task.id, task]),
  );
  const assessments = (await store.listPlayerAssessments(clubId)).filter(
    (item) => facts.has(item.id),
  );
  const history = assessments
    .map((item) => ({
      id: item.id,
      label: `${tasks.get(item.assessmentTaskId ?? "")?.title || "已确认测评"} · ${dateKey(item.assessedAt)}`,
      date: item.assessedAt,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const selectedComparisons: RadarSeries[] = [];
  if (query.historyResultId) {
    const option = history.find((item) => item.id === query.historyResultId);
    if (!option) throw new RadarSourceError("该历史结果已不可读，请重新选择");
    selectedComparisons.push({
      id: option.id,
      name: option.label,
      kind: "history",
      points: aligned(
        ids.map(
          (id) =>
            facts.get(option.id)?.get(id) ?? empty(id, "这场测评没有该项成绩"),
        ),
      ),
    });
  }
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10),
    student = store.listStudents(clubId).find((item) => item.id === studentId);
  const standardRows =
    store instanceof PersistentApiStore
      ? new BackofficeStandardRepository(
          store.repositories.backofficeManagement.database,
        )
          .list(clubId)
          .filter((row) => {
            const d = row.definition;
            if (
              row.status !== "active" ||
              d.basis !== "official" ||
              !d.modelVersionId ||
              d.effectiveFrom > today ||
              (d.effectiveTo && d.effectiveTo < today) ||
              d.teamLevel ||
              !templateVersion(d.modelVersionId) ||
              templateVersion(d.modelVersionId)?.status === "draft"
            )
              return false;
            if (d.ageMinimum !== undefined || d.ageMaximum !== undefined) {
              if (!d.ageReferenceDate || !student?.birthDate) return false;
              const age =
                Number(d.ageReferenceDate.slice(0, 4)) -
                Number(student.birthDate.slice(0, 4)) -
                (d.ageReferenceDate.slice(5, 10) <
                student.birthDate.slice(5, 10)
                  ? 1
                  : 0);
              if (
                !Number.isFinite(age) ||
                age < (d.ageMinimum ?? 0) ||
                age > (d.ageMaximum ?? 120)
              )
                return false;
            }
            return d.targetType === "metric" && catalog.has(d.targetId);
          })
      : [];
  const standardGroups = new Map<string, StandardVersion[]>();
  for (const row of standardRows) {
    const d = row.definition,
      key = JSON.stringify([
        d.modelVersionId,
        d.version,
        d.reference,
        d.effectiveFrom,
        d.effectiveTo,
        d.ageMinimum,
        d.ageMaximum,
        d.ageReferenceDate,
      ]);
    const group = standardGroups.get(key) ?? [];
    group.push(row);
    standardGroups.set(key, group);
  }
  const standards = [...standardGroups.values()].map((rows) => ({
    id: `standard-${createHash("sha256")
      .update(
        rows
          .map((row) => row.id)
          .sort()
          .join("|"),
      )
      .digest("hex")
      .slice(0, 24)}`,
    label: `批准标准 · 达标边界 · ${rows[0]!.definition.version}`,
    date: rows[0]!.definition.effectiveFrom,
    rows,
  }));
  if (query.standardId) {
    const option = standards.find((item) => item.id === query.standardId);
    if (!option) throw new RadarSourceError("该标准不适用或已撤下，请重新选择");
    const points = ids.map((id) => {
      const rows = option.rows.filter((row) => row.definition.targetId === id),
        metric = catalog.get(id)!;
      if (rows.length !== 1)
        return empty(
          id,
          rows.length ? "标准有歧义，未绘制" : "该标准组没有此项",
        );
      const row = rows[0]!,
        d = row.definition,
        version = definitionVersion(metric, d.modelVersionId),
        binding = config.assessmentMetricBindings.find(
          (item) =>
            item.templateVersionId === d.modelVersionId && item.metricId === id,
        ),
        mappingVersion =
          binding?.scoreMappingVersionId && binding.gradeMappingVersionId
            ? `${binding.scoreMappingVersionId}|${binding.gradeMappingVersionId}`
            : `model:${d.modelVersionId}`;
      const p = {
        ...empty(id),
        factId: row.id,
        metricVersion: version,
        mappingVersion,
        occurredAt: d.effectiveFrom,
        rawLabel: `${d.minimum}–${d.maximum} ${d.unit}`,
      };
      if (
        metric.valueKind !== "score_0_100" ||
        d.unit !== (metric.unit ?? "score") ||
        (d.direction === "within" && d.minimum !== d.maximum)
      )
        return {
          ...p,
          status: "incompatible" as const,
          reason: "区间或原始单位标准不能作为同量尺单线",
        };
      const score = d.direction === "lower" ? d.maximum : d.minimum;
      return Number.isFinite(score) && score >= 0 && score <= 100
        ? { ...p, score, status: "measured" as const, reason: "" }
        : {
            ...p,
            status: "incompatible" as const,
            reason: "标准不在0–100量尺内",
          };
    });
    selectedComparisons.push({
      id: option.id,
      name: option.label,
      kind: "standard",
      points: aligned(points),
    });
  }
  return {
    views,
    axes,
    current: {
      id: "current",
      name: "最新各项",
      kind: "latest_per_metric",
      points: currentPoints,
    },
    comparisonOptions: {
      history,
      standards: standards.map(({ id, label, date }) => ({ id, label, date })),
      historyReason: history.length ? "" : "暂无可追溯的已确认测评结果集",
      standardReason: standards.length ? "" : "暂无适用且已批准的同量尺标准组",
    },
    selectedComparisons,
  };
}
