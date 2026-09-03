import { createAssessmentSeed } from "./assessment.js";
import { createCqTalentAcceptanceSeed } from "./cq-talent-acceptance.js";
import { createDataCapabilitySeed } from "./data-capability.js";
import { createMatchSeed } from "./match.js";
import { createPlatformSeed } from "./platform.js";
import { createPrivacySeed } from "./privacy.js";
import { createTrainingSeed } from "./training.js";
import type { SeedData } from "./types.js";

export type { SeedData } from "./types.js";

export function createSeedData(): SeedData {
  const base = {
    ...createPlatformSeed(),
    ...createTrainingSeed(),
    ...createMatchSeed(),
    ...createAssessmentSeed(),
    ...createDataCapabilitySeed(),
    ...createPrivacySeed(),
    trainingContentAssessments: [],
  };

  if (!shouldIncludeCqTalentAcceptanceSeed()) {
    return base;
  }

  return mergeSeedData(base, createCqTalentAcceptanceSeed());
}

function mergeSeedData(base: SeedData, extra: Partial<SeedData>): SeedData {
  const merged = { ...base };

  for (const key of Object.keys(extra) as Array<keyof SeedData>) {
    const additions = extra[key];
    if (!Array.isArray(additions)) {
      continue;
    }
    // 同 id 实体只保留先出现的一份：base 种子与验收种子可能携带同 id 内容（如场地/文章），避免重复下发
    const seen = new Set<string>();
    const combined = [...merged[key], ...additions] as Array<{ id?: string }>;
    merged[key] = combined.filter((item) => {
      if (!item || typeof item.id !== "string") return true;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }) as never;
  }

  return merged;
}

function shouldIncludeCqTalentAcceptanceSeed() {
  return process.env.NODE_ENV !== "production" && process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED === "1";
}
