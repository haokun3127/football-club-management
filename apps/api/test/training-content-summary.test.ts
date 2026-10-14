import {expect,it} from "vitest";
import {summarizeSelectedTraining} from "../src/application/training-content-summary.js";
import {createSeedData} from "../src/seed.js";
it("groups each selected item by configured roots and uses plan duration, not mutable catalog duration",()=>{
 const seed=createSeedData();const drill=seed.drills[0]!;const plan=seed.sessionPlans[0]!;
 const result=summarizeSelectedTraining({...plan,blocks:[{id:"block",drillId:drill.id,order:1,plannedMinutes:7},{id:"duplicate",drillId:drill.id,order:2,plannedMinutes:7}]},[drill],{viewId:"view",viewName:"当前分类",nodes:[{id:"root",metricId:"root",level:1,label:"后台配置分类",drills:[],children:[{id:"leaf",metricId:"metric",label:"中间层",level:2,children:[],drills:[{...drill,metricNames:[]}]}]}]});
 expect(result.count).toBe(1);expect(result.configuredMinutes).toBe(7);expect(result.groups[0]).toMatchObject({label:"后台配置分类",items:[{id:drill.id,name:drill.name,configuredMinutes:7}]});
 expect(summarizeSelectedTraining(null,[drill],{viewId:"view",viewName:"",nodes:[]})).toEqual({groups:[],count:0,configuredMinutes:null});
});
