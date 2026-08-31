import { describe, expect, it } from "vitest";
import type { AbilityMetric, MetricView, MetricViewNode, TrainingDrill } from "@football-club/domain";
import { buildTrainingContentTree } from "./training-content-catalog.js";

const now = "2026-08-31T00:00:00.000Z";
const catalogScope = { catalogScope: { scope: "system" as const } };

function metric(id: string, name: string): AbilityMetric {
  return {
    ...catalogScope,
    id,
    code: id,
    name,
    dimensionId: "dimension-1",
    valueKind: "score_0_100",
    metricKind: "atomic",
    createdAt: now,
    updatedAt: now,
  };
}

function viewNode(
  id: string,
  label: string,
  metricId: string,
  sortOrder: number,
  parentViewNodeId?: string,
): MetricViewNode {
  return {
    ...catalogScope,
    id,
    viewId: "view-full",
    metricId,
    parentViewNodeId,
    label,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function drill(id: string, name: string, metricIds: string[], extra: Partial<TrainingDrill> = {}): TrainingDrill {
  return {
    ...catalogScope,
    id,
    name,
    objectiveIds: [],
    metricIds,
    durationMinutes: 12,
    difficulty: "standard",
    recommendedAgeGroups: ["U10"],
    recommendedLevels: ["development"],
    equipment: ["足球"],
    coachingPoints: ["保持抬头观察"],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

describe("buildTrainingContentTree", () => {
  const views: MetricView[] = [{
    ...catalogScope,
    id: "view-full",
    graphVersionId: "graph-1",
    name: "完整评分图谱",
    status: "active",
    createdAt: now,
    updatedAt: now,
  }];

  it("builds a sorted three-level chain and keeps dosage separate from duration", () => {
    const tree = buildTrainingContentTree({
      views,
      viewNodes: [
        viewNode("root-b", "射门", "metric-root-b", 20),
        viewNode("root-a", "运控球", "metric-root-a", 10),
        viewNode("secondary", "带球", "metric-secondary", 20, "root-a"),
        viewNode("tertiary", "变向带球", "metric-tertiary", 10, "secondary"),
      ],
      metrics: [
        metric("metric-root-a", "运控球"),
        metric("metric-root-b", "射门"),
        metric("metric-secondary", "带球"),
        metric("metric-tertiary", "变向带球"),
      ],
      drills: [drill("drill-1", "绕桩变向", ["metric-tertiary"], { quantityLabel: "每组 6 次", durationMinutes: 18 })],
      viewId: "view-full",
    });

    expect(tree.viewId).toBe("view-full");
    expect(tree.graphVersionId).toBe("graph-1");
    expect(tree.nodes.map((node) => node.label)).toEqual(["运控球", "射门"]);
    expect(tree.nodes[0]?.level).toBe(1);
    expect(tree.nodes[0]?.children[0]?.level).toBe(2);
    expect(tree.nodes[0]?.children[0]?.children[0]?.level).toBe(3);
    expect(tree.nodes[0]?.children[0]?.children[0]?.drills[0]).toMatchObject({
      id: "drill-1",
      quantityLabel: "每组 6 次",
      durationMinutes: 18,
    });
  });

  it("shows a cross-linked drill once per tertiary node while preserving its stable id", () => {
    const tree = buildTrainingContentTree({
      views,
      viewNodes: [
        viewNode("root", "运控球", "metric-root", 1),
        viewNode("secondary", "带球", "metric-secondary", 1, "root"),
        viewNode("tertiary-a", "直线带球", "metric-tertiary-a", 1, "secondary"),
        viewNode("tertiary-b", "变向带球", "metric-tertiary-b", 2, "secondary"),
      ],
      metrics: [
        metric("metric-root", "运控球"),
        metric("metric-secondary", "带球"),
        metric("metric-tertiary-a", "直线带球"),
        metric("metric-tertiary-b", "变向带球"),
      ],
      drills: [drill("drill-shared", "带球循环", ["metric-tertiary-a", "metric-tertiary-b"])],
      viewId: "view-full",
    });

    const tertiaryNodes = tree.nodes[0]?.children[0]?.children ?? [];
    expect(tertiaryNodes).toHaveLength(2);
    expect(tertiaryNodes.map((node) => node.drills.map((item) => item.id))).toEqual([
      ["drill-shared"],
      ["drill-shared"],
    ]);
  });

  it("ignores nodes with missing metrics, missing parents, and invalid descendants", () => {
    const tree = buildTrainingContentTree({
      views,
      viewNodes: [
        viewNode("valid-root", "运控球", "metric-root", 1),
        viewNode("valid-secondary", "带球", "metric-secondary", 1, "valid-root"),
        viewNode("valid-tertiary", "直线带球", "metric-tertiary", 1, "valid-secondary"),
        viewNode("missing-metric", "缺失指标", "metric-missing", 2),
        viewNode("missing-parent", "孤立节点", "metric-orphan", 3, "parent-missing"),
        viewNode("too-deep", "超出层级", "metric-too-deep", 1, "valid-tertiary"),
      ],
      metrics: [
        metric("metric-root", "运控球"),
        metric("metric-secondary", "带球"),
        metric("metric-tertiary", "直线带球"),
      ],
      drills: [],
      viewId: "view-full",
    });

    const allNodeIds = [
      ...tree.nodes,
      ...(tree.nodes[0]?.children ?? []),
      ...(tree.nodes[0]?.children[0]?.children ?? []),
    ].map((node) => node.id);
    expect(allNodeIds).toEqual(["valid-root", "valid-secondary", "valid-tertiary"]);
  });
});
