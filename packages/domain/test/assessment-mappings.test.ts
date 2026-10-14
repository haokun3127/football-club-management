import {describe,it,expect} from "vitest";
import {createAssessmentService,type AssessmentCatalogLookup,type AssessmentStore,type AssessmentMappingVersion,type AssessmentRawResult,type AssessmentTestItem,type AssessmentMetricBinding} from "../src/index.js";
const now="2026-10-10T00:00:00.000Z",clubId="synthetic",item:AssessmentTestItem={id:"speed",clubId,metricId:"score",name:"合成速度",valueKind:"duration_seconds",unit:"s",minimumValue:0,maximumValue:10,createdAt:now,updatedAt:now};
const raw:AssessmentMappingVersion={id:"raw-v1",testItemId:item.id,status:"active",definition:{name:"合成原始规则",stage:"raw_score",unit:"s",minimum:0,maximum:10,applicability:"合成测试",basis:"official",reference:"Synthetic test only",rules:[{lower:0,upper:5,lowerInclusive:true,upperInclusive:false,score:90},{lower:5,upper:10,lowerInclusive:true,upperInclusive:true,score:70}]}};
const grade:AssessmentMappingVersion={id:"grade-v1",testItemId:item.id,status:"archived",definition:{name:"合成等级规则",stage:"score_grade",unit:"score",minimum:0,maximum:100,applicability:"合成测试",basis:"official",reference:"Synthetic test only",rules:[{lower:0,upper:79,lowerInclusive:true,upperInclusive:true,grade:"B"},{lower:80,upper:100,lowerInclusive:true,upperInclusive:true,grade:"A"}]}};
function fixture(maxScore:number|undefined=100,unknown=false) {
 const raws:AssessmentRawResult[]=[],assessments:unknown[]=[];
 const binding:AssessmentMetricBinding={id:"binding",clubId,templateVersionId:"template-v1",metricId:item.metricId,testItemId:item.id,role:"input",scoreMappingVersionId:raw.id,gradeMappingVersionId:grade.id,sortOrder:1,createdAt:now,updatedAt:now};
 const catalog:AssessmentCatalogLookup={findTemplateById:()=>({id:"template",catalogScope:{scope:"club",clubId},name:"合成模板",status:"active",createdAt:now,updatedAt:now}),findTemplateVersion:()=>({id:"template-v1",clubId,templateId:"template",version:"1",status:"active",createdAt:now,updatedAt:now}),findMetricGraphVersion:()=>null,listTemplateMetricBindings:()=>[binding],listAssessmentTestItems:()=>[item],listMetricGraphDependencies:()=>[],listAbilityMetrics:()=>[{id:item.metricId,catalogScope:{scope:"club",clubId},code:"synthetic-score",name:"合成分值",dimensionId:"dimension",valueKind:"measurement",metricKind:"atomic",unit:"score",maxScore:unknown?undefined:maxScore,createdAt:now,updatedAt:now}],listDerivedMetricDefinitions:()=>[],findScoreMapping:(_club,id)=>id===raw.id?raw:id===grade.id?grade:null};
 const store:AssessmentStore={saveAssessment:a=>{assessments.push(a);},saveRawResult:r=>{raws.push(r);},saveScore:()=>{},saveMetricRecord:()=>{},saveMetricLineage:()=>{}};
 let id=0;const service=createAssessmentService({clock:{now:()=>now},ids:{next:prefix=>`${prefix}-${++id}`},catalog,store});
 return {service,raws,assessments};
}
const input={clubId,studentId:"student",templateId:"template",templateVersionId:"template-v1",assessedByCoachId:"coach"};
describe("immutable two-stage mapping in canonical assessment facts",()=>{
 it("keeps raw precision, maps integer/grade and records both pinned versions and time",async()=>{
  const f=fixture();const result=await f.service.recordPlayerAssessment({...input,rawResults:[{testItemId:item.id,value:{kind:"duration_seconds",seconds:4.123},normalizedScore:1}]});
  expect(result.rawResults[0]?.value).toEqual({kind:"duration_seconds",seconds:4.123});
  expect(result.rawResults[0]?.mapping).toEqual({rawScoreVersionId:raw.id,gradeVersionId:grade.id,integerScore:90,grade:"A",mappedAt:now});
  expect(result.scores[0]?.normalizedScore).toBe(90);
  expect(result.metricRecords[0]?.value).toEqual({kind:"measurement",value:90,unit:"score"});
  expect(result.scores[0]?.rawResultId).toBe(result.rawResults[0]?.id);
 });
 it.each([50,undefined])("rejects incompatible or unknown score scales before facts: %s",async(maximum)=>{const f=fixture(maximum,maximum===undefined);await expect(f.service.recordPlayerAssessment({...input,rawResults:[{testItemId:item.id,value:{kind:"duration_seconds",seconds:4}}]})).rejects.toThrow("score scale");expect(f.assessments).toHaveLength(0);expect(f.raws).toHaveLength(0)});
 it("rejects direct-score bypasses and invalid raw inputs before writing facts",async()=>{
  const f=fixture();await expect(f.service.recordPlayerAssessment({...input,scores:[{metricId:item.metricId,value:{kind:"score_0_100",score:100}}]})).rejects.toThrow("original raw");
  await expect(f.service.recordPlayerAssessment({...input,rawResults:[{testItemId:item.id,value:{kind:"duration_seconds",seconds:11}}]})).rejects.toThrow("raw");
  await expect(f.service.recordPlayerAssessment({...input,rawResults:[{testItemId:item.id,value:{kind:"distance_meters",meters:4}}]})).rejects.toThrow("kind");
  expect(f.assessments).toHaveLength(0);expect(f.raws).toHaveLength(0);
 });
});
