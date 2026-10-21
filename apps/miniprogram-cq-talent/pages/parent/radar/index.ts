import {getParentChildren,getParentGrowth} from "../../../utils/api";
import {requireRole} from "../../../utils/auth";
import {openPage} from "../../../utils/navigation";
import {formatShortDate} from "../../../utils/presentation";
import {setCurrentStudentId} from "../../../utils/store";
import type {LoadState,RadarMetricPoint,StudentSummary} from "../../../utils/types";
const generations=new WeakMap<object,number>();
Page({
 data:{state:"loading" as LoadState,message:"正在读取孩子信息",children:[] as StudentSummary[],activeStudentId:"",radar:[] as RadarMetricPoint[],compositeScore:"" as number|"",updatedAtLabel:""},
 onLoad(){return this.load();},onUnload(){generations.set(this,(generations.get(this)??0)+1);},
 async load(){const session=requireRole("parent");if(!session)return;const version=(generations.get(this)??0)+1;generations.set(this,version);this.setData({state:"loading",message:"正在读取孩子信息"});try{const children=await getParentChildren();if(generations.get(this)!==version)return;const active=children.find(child=>child.id===session.currentStudentId) ?? children[0];if(!active){this.setData({state:"empty",message:"当前账号没有绑定孩子",children:[],activeStudentId:"",radar:[],compositeScore:""});return;}setCurrentStudentId(active.id);this.setData({state:"ready",message:"",children,activeStudentId:active.id,radar:[],compositeScore:"",updatedAtLabel:""});const growth=await getParentGrowth(active.id,active).catch(()=>null);if(!growth || generations.get(this)!==version)return;this.setData({radar:growth.radar.map(point=>({...point,peerAverage:undefined})),compositeScore:typeof growth.overall==="number" ? growth.overall : "",updatedAtLabel:growth.updatedAt ? `数据更新：${formatShortDate(growth.updatedAt)}` : ""});}catch{if(generations.get(this)===version)this.setData({state:"error",message:"孩子信息读取失败，请重试"});}},
 switchChild(event:{detail?:{studentId?:string};currentTarget?:{dataset?:{id?:string}}}){const id=event.detail?.studentId || event.currentTarget?.dataset?.id;if(!id || id===this.data.activeStudentId || !(this.data.children as StudentSummary[]).some(child=>child.id===id))return;setCurrentStudentId(id);return this.load();},
 openMetric(event:{detail?:{metricId?:string};currentTarget?:{dataset?:{id?:string}}}){const id=event.detail?.metricId || event.currentTarget?.dataset?.id;if(id && this.data.activeStudentId)openPage(`/pages/parent/metric/index?metricId=${encodeURIComponent(id)}&studentId=${encodeURIComponent(this.data.activeStudentId)}`);},
retry(){return this.load();},
});
