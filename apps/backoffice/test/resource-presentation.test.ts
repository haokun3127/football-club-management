import { describe, expect, it } from "vitest";
import {
  DATA_RESOURCE_GROUPS,
  groupResourceFields,
} from "../src/services/resource-presentation";
import type { Field } from "../src/services/resource-fields";

describe("resource presentation compatibility", () => {
  it("retains every existing data URL exactly once across the five groups", () => {
    const original =
      "imports students scouts teams coaches events members assignments parents guardians contacts operations venues terms participants training-records insurance credits articles branding banners share-templates evaluation-phrases optional-features drills plans metrics testitems memberships".split(
        " ",
      );
    const keys = DATA_RESOURCE_GROUPS.flatMap((group) =>
      group.resources.map(([key]) => key),
    );
    expect(DATA_RESOURCE_GROUPS).toHaveLength(5);
    expect([...keys].sort()).toEqual(original.sort());
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("groups known fields without dropping unknown server fields or changing their contract", () => {
    const fields: Field[] = [
      { key: "name", label: "姓名", kind: "text", required: true },
      { key: "currentLevel", label: "水平", kind: "text" },
      { key: "futureField", label: "新增字段", kind: "number", minimum: 0 },
    ];
    const groups = groupResourceFields("students", fields);
    expect(groups.map((group) => group.title)).toEqual([
      "基本身份",
      "训练档案",
      "其他资料",
    ]);
    expect(groups.flatMap((group) => group.fields)).toEqual(fields);
    expect(groups[0]!.fields[0]).toBe(fields[0]);
    expect(groupResourceFields("future-resource", fields)).toEqual([
      { title: "基本资料", fields },
    ]);
    expect(groupResourceFields("events", [])).toEqual([]);
  });
});
