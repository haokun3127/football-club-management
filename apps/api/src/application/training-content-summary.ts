import type { SessionPlan, TrainingDrill } from "@football-club/domain";
import type { TrainingContentTree, TrainingContentMetricNode } from "./training-content-catalog.js";

export function summarizeSelectedTraining(plan:SessionPlan|null,drills:TrainingDrill[],tree:TrainingContentTree) {
  const allIds=(node:TrainingContentMetricNode):string[]=>[...node.drills.map(drill=>drill.id),...node.children.flatMap(allIds)];
  const roots=tree.nodes.map(node=>({label:node.label,ids:new Set(allIds(node))}));
  const seen=new Set<string>();
  const groups=new Map<string,{id:string;label:string;items:Array<{id:string;name:string;configuredMinutes:number|null}>}>();
  for(const block of plan?.blocks??[]) {
    if(seen.has(block.drillId))continue;
    const drill=drills.find(item=>item.id===block.drillId);if(!drill)continue;seen.add(drill.id);
    const labels=roots.filter(root=>root.ids.has(drill.id)).map(root=>root.label);
    const label=labels.length?labels.join(" / "):"未配置分类";
    const group=groups.get(label)??{id:label,label,items:[]};
    group.items.push({id:drill.id,name:drill.name,configuredMinutes:Number.isFinite(block.plannedMinutes)&&block.plannedMinutes>=0?block.plannedMinutes:null});groups.set(label,group);
  }
  const items=[...groups.values()].flatMap(group=>group.items);
  return {groups:[...groups.values()],count:items.length,configuredMinutes:items.length&&items.every(item=>item.configuredMinutes!==null)?items.reduce((sum,item)=>sum+item.configuredMinutes!,0):null};
}
