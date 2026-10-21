import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { loadActiveTeam } from "../../../utils/coach-team-context";
import { currentLocalDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate,formatTimeOnly,resolveNavInset,resolveMenuInset } from "../../../utils/presentation";
import type { LoadState, ScheduleEvent } from "../../../utils/types";
const generations=new WeakMap<object,number>();
const routes:Record<string,string>={roster:"/pages/coach/team/index?section=roster",training:"/pages/coach/training/index?section=training",tasks:"/pages/coach/test-tasks/index?",ability:"/pages/coach/team-ability/index?",matches:"/pages/coach/team/index?section=matches",coaches:"/pages/coach/team/index?section=coaches"};
Page({
  data:{navInset:resolveNavInset(),menuInset:resolveMenuInset(),state:"loading" as LoadState,message:"正在读取球队",teamId:"",teamName:"",season:"",section:"workspace",trainingCards:[] as Array<ScheduleEvent & {timeLabel:string}>,
    entries:[{id:"roster",name:"队员名单",note:"在队学员"},{id:"training",name:"训练安排",note:"课程与内容"},{id:"tasks",name:"测评任务",note:"录入与确认"},{id:"ability",name:"能力分析",note:"已确认结果"},{id:"matches",name:"比赛记录",note:"正式赛事"}]},
  requestedTeamId:"",
  onLoad(query?:{teamId?:string;section?:string}) {this.requestedTeamId=query?.teamId || "";this.setData({section:query?.section==="training" ? "training" : "workspace"});return this.load();},
  onShow(){if(this.data.state!=="loading")return this.load();},
  onUnload(){generations.set(this,(generations.get(this)??0)+1);},
  async load(){
    if(!requireRole("coach"))return;
    const version=(generations.get(this)??0)+1;generations.set(this,version);
    this.setData({state:"loading",message:"正在读取球队"});
    try{
      const context=await loadActiveTeam(this.requestedTeamId || undefined);
      if(generations.get(this)!==version)return;
      if(!context.id){this.setData({state:"empty",teamId:"",teamName:"",trainingCards:[],message:context.options.length ? "请先选择要管理的球队" : "暂无授权球队，请联系俱乐部管理员"});return;}
      this.requestedTeamId="";
      this.setData({teamId:context.id,teamName:context.detail!.team!.name,season:context.detail!.team!.season || "当前学期",state:"ready",message:"",trainingCards:[]});
      if(this.data.section!=="training")return;
      const date=currentLocalDate(),year=Number(date.slice(0,4)),month=Number(date.slice(5,7));
      const home=await getCoachHome({from:`${date.slice(0,7)}-01`,to:new Date(Date.UTC(year,month,0)).toISOString().slice(0,10),teamIds:[context.id]});
      if(generations.get(this)!==version)return;
      this.setData({trainingCards:home.events.filter(event=>event.type==="training" && event.teamIds?.includes(context.id)).map(event=>({...event,timeLabel:`${formatCalendarDate(event.startsAt)} · ${formatTimeOnly(event.startsAt)}`}))});
    }catch(error){if(generations.get(this)===version)this.setData({state:"error",teamId:"",teamName:"",trainingCards:[],message:error instanceof Error ? error.message : "球队读取失败，请重试"});}
  },
  chooseTeam(){openPage("/pages/coach/team-selector/index");},
  openEntry(event:{currentTarget:{dataset:{id?:string}}}){
    const route=routes[event.currentTarget.dataset.id || ""];
    if(!route)return;
    if(!this.data.teamId)return this.chooseTeam();
    openPage(`${route}${route.endsWith("?") ? "" : "&"}teamId=${encodeURIComponent(this.data.teamId)}`);
  },
  openTrainingEvent(event:{currentTarget:{dataset:{id?:string}}}){const id=event.currentTarget.dataset.id;if(this.data.trainingCards.some((item:ScheduleEvent)=>item.id===id))openPage(`/pages/coach/event/index?id=${encodeURIComponent(id!)}&teamId=${encodeURIComponent(this.data.teamId)}`);},
  openScouts(){openPage("/pages/coach/scout/index");},
  retry(){return this.load();},
});
