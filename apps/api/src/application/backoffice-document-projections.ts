import type { TrainingDrill } from "@football-club/domain";
import type { ContentArticle, VenueInfo } from "../data-capability/types.js";
import type {
  BackofficeRecord,
  BackofficeValues,
} from "../persistence/backoffice-management-repository.js";
function text(values: BackofficeValues, key: string): string {
  const value = values[key];
  if (typeof value !== "string")
    throw new Error("Invalid persisted business document");
  return value;
}
function optionalText(
  values: BackofficeValues,
  key: string,
): string | undefined {
  return values[key] == null ? undefined : text(values, key);
}
function number(values: BackofficeValues, key: string): number {
  const value = values[key];
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Invalid persisted business document");
  return value;
}
function tags(values: BackofficeValues, key: string): string[] {
  const value = values[key];
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    throw new Error("Invalid persisted business document");
  return value;
}
function choice<const T extends readonly string[]>(
  values: BackofficeValues,
  key: string,
  allowed: T,
): T[number] {
  const result = allowed.find((value) => value === values[key]);
  if (result === undefined)
    throw new Error("Invalid persisted business document");
  return result;
}
export function venueProjection(
  clubId: string,
  row: BackofficeRecord,
): VenueInfo {
  const v = row.values;
  return {
    id: row.id,
    clubId,
    status: choice(v, "status", ["active", "inactive"]),
    name: text(v, "name"),
    type: text(v, "type"),
    address: text(v, "address"),
    tags: tags(v, "tags"),
    facilities: tags(v, "facilities"),
    ...(v.latitude == null ? {} : { latitude: number(v, "latitude") }),
    ...(v.longitude == null ? {} : { longitude: number(v, "longitude") }),
  };
}
export function articleProjection(
  clubId: string,
  row: BackofficeRecord,
): ContentArticle {
  const v = row.values;
  return {
    id: row.id,
    clubId,
    title: text(v, "title"),
    subtitle: text(v, "subtitle"),
    accent: optionalText(v, "accent") ?? "#A80F1B",
    category: choice(v, "category", [
      "venue",
      "help",
      "coach",
      "guide",
      "notice",
    ]),
    body: optionalText(v, "body"),
    publishedAt: optionalText(v, "publishedAt"),
    expiresAt: optionalText(v, "expiresAt"),
  };
}
export function drillProjection(
  clubId: string,
  row: BackofficeRecord,
  previous?: TrainingDrill,
): TrainingDrill {
  const v = row.values;
  return {
    id: row.id,
    catalogScope: { scope: "club", clubId },
    createdAt: previous?.createdAt ?? row.updatedAt,
    updatedAt: row.updatedAt,
    ...(v.recordingCapability
      ? {
          recordingCapability: choice(v, "recordingCapability", [
            "friendly_match",
          ]),
        }
      : previous?.recordingCapability && !("recordingCapability" in v)
        ? { recordingCapability: previous.recordingCapability }
        : {}),
    name: text(v, "name"),
    status:
      v.status == null ? "active" : choice(v, "status", ["active", "inactive"]),
    objectiveIds: tags(v, "objectiveIds"),
    metricIds: tags(v, "metricIds"),
    durationMinutes: number(v, "durationMinutes"),
    difficulty: choice(v, "difficulty", [
      "introductory",
      "standard",
      "advanced",
    ]),
    quantityLabel: optionalText(v, "quantityLabel"),
    recommendedAgeGroups: tags(v, "recommendedAgeGroups"),
    recommendedLevels: tags(v, "recommendedLevels"),
    equipment: tags(v, "equipment"),
    setup: optionalText(v, "setup"),
    coachingPoints: tags(v, "coachingPoints"),
  };
}
