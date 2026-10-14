import { createCoachAssessmentTask, getCoachAssessmentTaskOptions } from "../../../utils/api";
import type { CoachAssessmentTask } from "../../../utils/types";
import { requireRole } from "../../../utils/auth";
import { createIdempotencyKey } from "../../../utils/idempotency";
import { formatShortDate, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";

interface TemplateOption { id: string; name: string; testItems?:Array<{id:string;name:string}>; }

interface TeamOption { id: string; name: string; students?:Array<{id:string;name:string}>; }

type Selection = {id:string;name:string;selected?:boolean;attendanceLabel?:string;attendanceWarning?:boolean};

interface PageData {
  courseOptions:Array<{id:string;title:string;teamId:string;date:string;label:string;timeLabel:string}>; courseIndex:number;
  view: "summary" | "courses" | "scope" | "settings"; pageTitle:string; loading:boolean;
  pendingCourseId:string; studentSearch:string; visibleStudents:Selection[];
  selectedStudentCount:number; selectedProjectCount:number; projectSummary:string;
  sourceTime:string; attendance:Array<{studentId:string;status:string}>; attendanceNotes:string[];
  taskMode:"continue" | "create"; existingTaskIndex:number; settingsReady:boolean;
  existingTasks:CoachAssessmentTask[]; matchingTasks:CoachAssessmentTask[];
  temporaryStudentIds:string[];
  sourceEventId:string; sourceTitle:string; sourceDate:string; sourceStudentIds:string[];
  projects:Array<{id:string;name:string;selected:boolean}>;
  students:Array<{id:string;name:string;selected:boolean}>;
  publicationEnabled:boolean; scopeLabel:string; loadError:string;
  navInset: number;
  menuInset: number;
  templates: TemplateOption[];
  templateNames: string[];
  templateIndex: number;
  teams: TeamOption[];
  teamNames: string[];
  teamIndex: number;
  termLabel: string;
  title: string;
  startsOn: string;
  dueOn: string;
  today: string;
  submitting: boolean;
  canSubmit: boolean;
}

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

Page<PageData>({
  data: {
    courseOptions:[],courseIndex:0,existingTasks:[],matchingTasks:[],
    view:"summary",pageTitle:"创建本队测评",loading:false,pendingCourseId:"",studentSearch:"",visibleStudents:[],
    selectedStudentCount:0,selectedProjectCount:0,projectSummary:"请选择项目",sourceTime:"",attendance:[],attendanceNotes:[],
    taskMode:"continue",existingTaskIndex:0,settingsReady:false,
    temporaryStudentIds:[], sourceEventId:"", sourceTitle:"", sourceDate:"", sourceStudentIds:[], projects:[], students:[], publicationEnabled:false, scopeLabel:"", loadError:"",
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    templates: [],
    templateNames: [],
    templateIndex: 0,
    teams: [],
    teamNames: [],
    teamIndex: 0,
    termLabel: "",
    title: "",
    startsOn: todayLocal(),
    dueOn: todayLocal(),
    today: todayLocal(),
    submitting: false,
    canSubmit: false,
  },
  onLoad(query?:{eventId?:string}) {
    if (!requireRole("coach")) return;
    this.setData({sourceEventId:query?.eventId || ""});
    void this.load();
  },
  async load(requestedEventId?:string) {
    const eventId=requestedEventId ?? this.data.sourceEventId;
    const sequence = this._loadSequence = (this._loadSequence || 0) + 1;
    this.setData({loading:true,canSubmit:false});
    try {
      const options = await getCoachAssessmentTaskOptions(eventId || undefined);
      if(sequence !== this._loadSequence)return;
      if (eventId && options.sourceCourse?.id !== eventId) throw new Error("来源课程不可用");
      const source = options.sourceCourse;
      this.setData({
        courseOptions:(options.courseOptions || []).map((c)=>({...c,label:`${formatShortDate(c.date)} ${c.title}`,timeLabel:c.startsAt ? formatTimeRange(c.startsAt,c.endsAt) : ""})),
        courseIndex:Math.max(0,(options.courseOptions || []).findIndex((c)=>c.id===source?.id)),existingTasks:options.tasks,
        publicationEnabled: Boolean(options.publicationEnabled),
        sourceEventId:source?.id || "",pendingCourseId:source?.id || "",sourceTime:source?.startsAt ? formatTimeRange(source.startsAt,source.endsAt) : "",
        temporaryStudentIds:(source?.temporaryStudents || []).map(s=>s.id),
        attendance:source?.attendance || [],loading:false,
        templateIndex:Math.max(0,options.templates.findIndex((t)=>t.id===this.data.templates[this.data.templateIndex]?.id)),
        sourceTitle:source?.title || "", sourceDate:source?.date || "", sourceStudentIds:source?.studentIds || [], loadError:"",
        ...(source ? {teamIndex: Math.max(0,options.teams.findIndex((t) => t.id === source.teamId)), startsOn:source.date, dueOn:source.date, title:`${source.title}测评`.slice(0,60)} : {}),
        templates: options.templates,
        templateNames: options.templates.map((template) => template.name),
        teams: options.teams.map(t=>t.id===source?.teamId ? {...t,students:[...(t.students||[]),...(source.temporaryStudents||[]).filter(p=>!t.students?.some(s=>s.id===p.id)).map(p=>({...p,name:`${p.name} · 临时`}))]} : t),
        teamNames: options.teams.map((team) => team.name),
      });
      this.resetScope();
      return true;
    } catch {
      if(sequence !== this._loadSequence)return;
      this.setData({loadError:"任务选项读取失败，请重试",canSubmit:false,loading:false});
      wx.showToast({ title: "任务选项读取失败", icon: "none" });
      return false;
    }
  },
  onUnload() { this._loadSequence = (this._loadSequence || 0) + 1; },
  retryLoad() { if(!this.data.loading)void this.load(this.data.view==="courses" ? this.data.pendingCourseId : this.data.sourceEventId); },
  openCourses() {
    if(this.data.submitting || this.data.loading)return;
    this.setData({view:"courses",pageTitle:"选择课程",pendingCourseId:this.data.sourceEventId});
  },
  selectCourse(event:{currentTarget:{dataset:{id:string}}}) {
    if(this.data.submitting || this.data.loading)return;
    const id=event.currentTarget.dataset.id;
    if(this.data.courseOptions.some((c:{id:string})=>c.id===id))this.setData({pendingCourseId:id});
  },
  async applyCourse() {
    if(!this.data.pendingCourseId || this.data.loading)return;
    if(await this.load(this.data.pendingCourseId))this.showSummary();
  },
  async chooseCourse(event:{detail:{value:string}}) {
    if(this.data.loading || this.data.submitting)return;
    const course=this.data.courseOptions[Number(event.detail.value)];if(!course)return;
    await this.load(course.id);
  },
  openScope() {
    if(this.data.submitting || this.data.loading)return;
    this._scopeSnapshot={students:this.data.students,projects:this.data.projects};
    this.setData({view:"scope",pageTitle:"项目与学员",studentSearch:"",visibleStudents:this.data.students});
  },
  onStudentSearch(event:{detail:{value:string}}) {
    this.setData({studentSearch:event.detail.value});this.refreshCanSubmit();
  },
  applyScope() {
    if(!this.data.selectedStudentCount || !this.data.selectedProjectCount)return;
    this._scopeSnapshot=null;this.showSummary();
  },
  openSettings() {
    if(this.data.submitting || this.data.loading)return;
    this._settingsSnapshot={title:this.data.title,termLabel:this.data.termLabel,templateIndex:this.data.templateIndex,startsOn:this.data.startsOn,dueOn:this.data.dueOn,projects:this.data.projects};
    this.setData({view:"settings",pageTitle:"任务设置"});
  },
  applySettings() {
    if(!this.data.settingsReady)return;
    this._settingsSnapshot=null;this.showSummary();
  },
  showSummary() { this.setData({view:"summary",pageTitle:"创建本队测评"}); },
  selectTaskMode(event:{currentTarget:{dataset:{mode:string}}}) {
    if(this.data.submitting || this.data.loading)return;
    const mode=event.currentTarget.dataset.mode;
    if(mode==="continue" || mode==="create")this.setData({taskMode:mode});
  },
  chooseExistingTask(event:{detail:{value:string}}) {
    const index=Number(event.detail.value);
    if(this.data.matchingTasks[index])this.setData({existingTaskIndex:index});
  },
  primaryAction() {
    if(this.data.loading || this.data.loadError || this.data.submitting)return;
    const task=this.data.matchingTasks[this.data.existingTaskIndex];
    if(this.data.taskMode==="continue" && task){this.continueTask({currentTarget:{dataset:{id:task.id}}});return;}
    return this.submit();
  },
  toggleAllStudents() {
    if(this.data.submitting)return;
    const selected=!this.data.students.every((s:Selection)=>s.selected);
    this.setData({students:this.data.students.map((s:Selection)=>({...s,selected}))});this.refreshCanSubmit();
  },
  toggleAllProjects() {
    if(this.data.submitting || !this.data.publicationEnabled)return;
    const selected=!this.data.projects.every((p:Selection)=>p.selected);
    this.setData({projects:this.data.projects.map((p:Selection)=>({...p,selected}))});this.refreshCanSubmit();
  },
  continueTask(event:{currentTarget:{dataset:{id:string}}}) {
    if(this.data.submitting)return;
    const task=this.data.matchingTasks.find((t:CoachAssessmentTask)=>t.id===event.currentTarget.dataset.id);if(!task)return;
    wx.redirectTo({url:`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(task.id)}&templateId=${encodeURIComponent(task.templateId)}`});
  },
  onTitleInput(event: { detail: { value: string } }) {
    this.setData({ title: event.detail.value });
    this.refreshCanSubmit();
  },
  onTemplateChange(event: { detail: { value: string } }) {
    this.setData({ templateIndex: Number(event.detail.value) || 0 });
    this.resetProjects();
  },
  onTeamChange(event: { detail: { value: string } }) {
    if(this.data.sourceEventId)return;
    this.setData({ teamIndex: Number(event.detail.value) || 0 });
    this.resetStudents();
  },
  onTermLabelInput(event: { detail: { value: string } }) {
    this.setData({ termLabel: event.detail.value });
    this.refreshCanSubmit();
  },
  onStartDateChange(event: { detail: { value: string } }) {
    this.setData({ startsOn: event.detail.value });
    this.refreshCanSubmit();
  },
  onDueDateChange(event: { detail: { value: string } }) {
    this.setData({ dueOn: event.detail.value });
    this.refreshCanSubmit();
  },
  resetProjects() {
    this.setData({projects:(this.data.templates[this.data.templateIndex]?.testItems || []).map((p:Selection)=>({...p,selected:true}))});
    this.refreshCanSubmit();
  },
  resetStudents() {
    const labels:Record<string,string>={present:"出勤",late:"迟到",absent:"缺勤",leave_requested:"请假",excused:"请假",invited:"待记录",confirmed:"待记录"};
    this.setData({students:(this.data.teams[this.data.teamIndex]?.students || []).filter((s:Selection)=>!this.data.sourceEventId || this.data.sourceStudentIds.includes(s.id)).map((s:Selection)=>{
      const status=this.data.attendance.find((p:{studentId:string;status:string})=>p.studentId===s.id)?.status || "";
      return {...s,selected:!this.data.temporaryStudentIds.includes(s.id),attendanceLabel:labels[status] || "待记录",attendanceWarning:["absent","leave_requested","excused"].includes(status)};
    })});
    this.refreshCanSubmit();
  },
  resetScope() {this.resetProjects();this.resetStudents();},
  toggleProject(event:{currentTarget:{dataset:{id:string}}}) {
    if(this.data.submitting || !this.data.publicationEnabled)return;
    this.setData({projects:this.data.projects.map((p:Selection)=>p.id===event.currentTarget.dataset.id ? {...p,selected:!p.selected}:p)});
    this.refreshCanSubmit();
  },
  toggleStudent(event:{currentTarget:{dataset:{id:string}}}) {
    if(this.data.submitting)return;
    this.setData({students:this.data.students.map((s:Selection)=>s.id===event.currentTarget.dataset.id ? {...s,selected:!s.selected}:s)});
    this.refreshCanSubmit();
  },
  refreshCanSubmit() {
    const template = this.data.templates[this.data.templateIndex];
    const team = this.data.teams[this.data.teamIndex];
    const selectedStudents=this.data.students.filter((s:Selection)=>s.selected).map((s:Selection)=>s.id);
    const selectedProjects=this.data.projects.filter((p:Selection)=>p.selected).map((p:Selection)=>p.id);
    const sameIds=(a:string[]|undefined,b:string[])=>Boolean(a && a.length===b.length && a.every((id)=>b.includes(id)));
    const matchingTasks=this.data.existingTasks.filter((t:CoachAssessmentTask)=>t.sourceEventId===this.data.sourceEventId && t.teamId===team?.id && t.templateId===template?.id && t.startsOn<=this.data.startsOn && t.dueOn>=this.data.dueOn && sameIds(t.studentIds,selectedStudents) && sameIds(t.testItemIds,selectedProjects));
    const sameMatches=sameIds(this.data.matchingTasks.map((t:CoachAssessmentTask)=>t.id),matchingTasks.map((t:CoachAssessmentTask)=>t.id));
    const settingsReady=Boolean(this.data.sourceEventId && this.data.title.trim() && this.data.termLabel.trim() && template && team) && this.data.startsOn<=this.data.sourceDate && this.data.dueOn>=this.data.sourceDate && this.data.dueOn>=this.data.startsOn;
    this.setData({
      matchingTasks,
      existingTaskIndex:sameMatches ? this.data.existingTaskIndex : 0,
      taskMode:sameMatches ? this.data.taskMode : matchingTasks.length ? "continue" : "create",
      settingsReady,
      selectedStudentCount:selectedStudents.length,selectedProjectCount:selectedProjects.length,
      projectSummary:this.data.projects.filter((p:Selection)=>p.selected).map((p:Selection)=>p.name).join(" / ") || "请选择项目",
      visibleStudents:this.data.students.filter((s:Selection)=>s.name.includes(this.data.studentSearch.trim())),
      attendanceNotes:this.data.students.filter((s:Selection)=>s.attendanceWarning).map((s:Selection)=>`${s.name} · ${s.attendanceLabel}`),
      scopeLabel:`已选 ${this.data.students.filter((s:Selection)=>s.selected).length} 名学员 · ${this.data.projects.filter((p:Selection)=>p.selected).length} 个项目`,
      canSubmit: settingsReady && !this.data.loading && !this.data.loadError && selectedStudents.length>0 && selectedProjects.length>0,
    });
  },
  async submit() {
    if (!this.data.canSubmit || this.data.submitting) return;
    const template = this.data.templates[this.data.templateIndex];
    const team = this.data.teams[this.data.teamIndex];
    if (!template || !team) return;
    if (this.data.dueOn < this.data.startsOn) {
      wx.showToast({ title: "截止日期不能早于开始日期", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const input = {
        studentIds:this.data.students.filter((s:Selection)=>s.selected).map((s:Selection)=>s.id),
        ...(this.data.publicationEnabled ? {testItemIds:this.data.projects.filter((p:Selection)=>p.selected).map((p:Selection)=>p.id)} : {}),
        ...(this.data.sourceEventId ? {sourceEventId:this.data.sourceEventId} : {}),
        title: this.data.title.trim(),
        templateId: template.id,
        teamId: team.id,
        termLabel: this.data.termLabel.trim(),
        startsOn: this.data.startsOn,
        dueOn: this.data.dueOn,
      };
      const fingerprint=JSON.stringify(input);
      if(this._createAttempt?.fingerprint!==fingerprint)this._createAttempt={fingerprint,key:createIdempotencyKey("assessment-task")};
      const task = await createCoachAssessmentTask(input,this._createAttempt.key);
      wx.showToast({ title: "测评任务已创建", icon: "success" });
      wx.redirectTo({url:`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(task.id)}&templateId=${encodeURIComponent(template.id)}`});
    } catch {
      this.setData({ submitting: false });
      wx.showToast({ title: "创建失败，请重试", icon: "none" });
    }
  },
  goBack() {
    if(this.data.submitting || this.data.loading)return;
    if(this.data.view!=="summary") {
      const snapshot=this.data.view==="scope" ? this._scopeSnapshot : this.data.view==="settings" ? this._settingsSnapshot : null;
      if(snapshot)this.setData(snapshot);
      this._scopeSnapshot=null;this._settingsSnapshot=null;this.refreshCanSubmit();this.showSummary();return;
    }
    wx.navigateBack();
  },
});
