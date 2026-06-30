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
    merged[key] = [...merged[key], ...additions] as never;
  }

  return merged;
}

function shouldIncludeCqTalentAcceptanceSeed() {
  if (process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED === "1") {
    return true;
  }
  if (process.env.FCM_CQ_TALENT_ACCEPTANCE_SEED === "0") {
    return false;
  }
  return process.env.NODE_ENV !== "test";
}
