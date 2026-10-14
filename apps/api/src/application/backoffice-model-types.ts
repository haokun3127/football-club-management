export interface ModelDefinition {
  name: string;
  version: string;
  applicability: string;
  basis: "trial" | "official";
  reference: string;
  ageGroup?: string;
  teamLevel?: string;
  references?: Array<{
    versionId: string;
    metricId: string;
    selection: "same_assessment";
  }>;
  inputs: Array<{
    testItemId: string;
    scoreMappingVersionId?: string;
    gradeMappingVersionId?: string;
  }>;
  outputs: Array<{
    metricId: string;
    method: "weighted_average" | "normalized_weighted_sum" | "sum";
    inputs: Array<{ metricId: string; weight: number }>;
    rounding: "none" | "integer" | "two_decimals";
    inputScale?: number;
    maxScore?: number;
  }>;
}
export interface ModelInput {
  definition: ModelDefinition;
  expectedRevision: string | null;
  requestId: string;
  templateId?: string;
  sourceId?: string;
  sourceRevision?: string;
}
