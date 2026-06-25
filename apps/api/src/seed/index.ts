import { createAssessmentSeed } from "./assessment.js";
import { createMatchSeed } from "./match.js";
import { createPlatformSeed } from "./platform.js";
import { createTrainingSeed } from "./training.js";
import type { SeedData } from "./types.js";

export type { SeedData } from "./types.js";

export function createSeedData(): SeedData {
  return {
    ...createPlatformSeed(),
    ...createTrainingSeed(),
    ...createMatchSeed(),
    ...createAssessmentSeed(),
  };
}
