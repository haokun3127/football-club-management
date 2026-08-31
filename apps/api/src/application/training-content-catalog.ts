import type {
  AbilityMetric,
  EntityId,
  MetricView,
  MetricViewNode,
  TrainingDrill,
} from "@football-club/domain";

export interface TrainingContentDrill {
  id: EntityId;
  name: string;
  metricIds: EntityId[];
  metricNames: string[];
  durationMinutes: number;
  quantityLabel?: string;
  difficulty: TrainingDrill["difficulty"];
  coachingPoints: string[];
  imageSrc?: string;
}

export interface TrainingContentMetricNode {
  id: EntityId;
  metricId: EntityId;
  label: string;
  level: 1 | 2 | 3;
  children: TrainingContentMetricNode[];
  drills: TrainingContentDrill[];
}

export interface TrainingContentTree {
  viewId: EntityId;
  viewName: string;
  graphVersionId?: EntityId;
  nodes: TrainingContentMetricNode[];
}

export interface BuildTrainingContentTreeInput {
  views: MetricView[];
  viewNodes: MetricViewNode[];
  metrics: AbilityMetric[];
  drills: TrainingDrill[];
  viewId?: EntityId;
}

export function buildTrainingContentTree(input: BuildTrainingContentTreeInput): TrainingContentTree {
  const view = selectView(input.views, input.viewId);
  if (!view) {
    return { viewId: input.viewId ?? "training-content-view-missing", viewName: "", nodes: [] };
  }

  const metricsById = new Map(input.metrics.map((metric) => [metric.id, metric]));
  const nodes = input.viewNodes
    .filter((node) => node.viewId === view.id && node.metricId !== undefined && metricsById.has(node.metricId))
    .sort(compareViewNodes);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParentId = new Map<EntityId, MetricViewNode[]>();
  const roots: MetricViewNode[] = [];

  for (const node of nodes) {
    if (!node.parentViewNodeId) {
      roots.push(node);
      continue;
    }
    if (!nodesById.has(node.parentViewNodeId)) continue;
    const children = childrenByParentId.get(node.parentViewNodeId) ?? [];
    children.push(node);
    childrenByParentId.set(node.parentViewNodeId, children);
  }

  const drillsByMetricId = indexDrillsByMetric(input.drills, metricsById);
  const treeNodes = roots
    .sort(compareViewNodes)
    .map((node) => buildNode(node, 1, new Set<EntityId>(), childrenByParentId, metricsById, drillsByMetricId))
    .filter((node): node is TrainingContentMetricNode => node !== null);

  return {
    viewId: view.id,
    viewName: view.name,
    graphVersionId: view.graphVersionId,
    nodes: treeNodes,
  };
}

function selectView(views: MetricView[], requestedViewId?: EntityId): MetricView | undefined {
  if (requestedViewId) {
    const requested = views.find((view) => view.id === requestedViewId);
    if (requested) return requested;
  }

  const activeViews = views
    .filter((view) => view.status === "active")
    .sort((left, right) => left.id.localeCompare(right.id));
  return activeViews.find((view) => view.id.endsWith("full-graph")) ?? activeViews[0];
}

function buildNode(
  source: MetricViewNode,
  level: number,
  ancestors: Set<EntityId>,
  childrenByParentId: Map<EntityId, MetricViewNode[]>,
  metricsById: Map<EntityId, AbilityMetric>,
  drillsByMetricId: Map<EntityId, TrainingContentDrill[]>,
): TrainingContentMetricNode | null {
  if (level > 3 || !source.metricId || ancestors.has(source.id)) return null;
  const metric = metricsById.get(source.metricId);
  if (!metric) return null;

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(source.id);
  const children = (childrenByParentId.get(source.id) ?? [])
    .sort(compareViewNodes)
    .map((child) => buildNode(child, level + 1, nextAncestors, childrenByParentId, metricsById, drillsByMetricId))
    .filter((child): child is TrainingContentMetricNode => child !== null);

  return {
    id: source.id,
    metricId: source.metricId,
    label: source.label || metric.name,
    level: level as 1 | 2 | 3,
    children,
    drills: level === 3 ? drillsByMetricId.get(source.metricId) ?? [] : [],
  };
}

function indexDrillsByMetric(
  drills: TrainingDrill[],
  metricsById: Map<EntityId, AbilityMetric>,
): Map<EntityId, TrainingContentDrill[]> {
  const summariesByDrillId = new Map<EntityId, TrainingContentDrill>();
  for (const drill of drills) {
    if (!summariesByDrillId.has(drill.id)) {
      summariesByDrillId.set(drill.id, summarizeTrainingDrill(drill, metricsById));
    }
  }

  const result = new Map<EntityId, TrainingContentDrill[]>();
  for (const summary of summariesByDrillId.values()) {
    for (const metricId of summary.metricIds) {
      if (!metricsById.has(metricId)) continue;
      const summaries = result.get(metricId) ?? [];
      if (!summaries.some((item) => item.id === summary.id)) summaries.push(summary);
      summaries.sort(compareDrills);
      result.set(metricId, summaries);
    }
  }
  return result;
}

function summarizeTrainingDrill(
  drill: TrainingDrill,
  metricsById: Map<EntityId, AbilityMetric>,
): TrainingContentDrill {
  const metricIds = Array.from(new Set(drill.metricIds));
  const metricNames = metricIds
    .map((metricId) => metricsById.get(metricId)?.name)
    .filter((name): name is string => Boolean(name));
  return {
    id: drill.id,
    name: drill.name,
    metricIds,
    metricNames: Array.from(new Set(metricNames)),
    durationMinutes: drill.durationMinutes,
    quantityLabel: drill.quantityLabel,
    difficulty: drill.difficulty,
    coachingPoints: [...drill.coachingPoints],
  };
}

function compareViewNodes(left: MetricViewNode, right: MetricViewNode): number {
  return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
}

function compareDrills(left: TrainingContentDrill, right: TrainingContentDrill): number {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}
