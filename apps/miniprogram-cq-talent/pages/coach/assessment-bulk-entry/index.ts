import { environmentStorageKey } from "../../../utils/config";
import { getAssessmentForm, getCoachAssessmentEntries, getCoachAssessmentTasks, getCoachTeam, submitCoachAssessment, saveCoachAssessmentEntries, getCoachAssessmentHistory, getCoachAssessmentCourses } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { AssessmentCourse, AssessmentForm, CoachAssessmentEntries, CoachAssessmentTask, CoachTeamDetail, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];
type DraftValues = Record<string, Record<string, string>>;
// assessedAt 提交快照：同一学员同一笔提交（含失败重试）复用同一测评发生时间（REQ-ASM-002）
type AssessedAtSnapshot = { assessedAt: string; signature: string };

type MetricView = {
  fieldId: string;
  label: string;
  inputType: "digit" | "text";
  value: string;
  unitLabel: string;
  placeholder: string;
  scoreLabel: string;
  courseLabel: string;
};

type BulkRow = {
  studentId: string;
  name: string;
  initials: string;
  rawInputValue: string;
  scoreLabel: string;
  statusLabel: string;
  metrics: MetricView[];
  courses: Array<AssessmentCourse & {label:string}>;
};

interface BulkDraft {
  signature: string;
  courseIds?: DraftValues;
  studentStates?: CoachAssessmentEntries["studentStates"];
  savedAt: string;
  valuesByStudent: DraftValues;
  savedStudentIds: string[];
}

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  statusTitle: string;
  message: string;
  taskId: string;
  templateId: string;
  templateVersionId: string;
  projectId: string;
  projectTitle: string;
  taskTitle: string;
  teamName: string;
  termLabel: string;
  fields: AssessmentField[];
  rows: BulkRow[];
  savedValuesByStudent: DraftValues;
  valuesByStudent: DraftValues;
  savedStudentIds: string[];
  projectIds: string[];
  projectIndex: number;
  filledLabel: string;
  lastSavedLabel: string;
  readOnly: boolean;
  submitting: boolean;
  managed: boolean;
  draftTaskKey: string;
  studentStates: NonNullable<CoachAssessmentEntries["studentStates"]>;
  correctionReason: string;
  saveError: string;
  historyTitle: string;
  historyLines: string[];
  historyVisible: boolean;
  courseSelectionRequired: boolean;
  courses: Array<AssessmentCourse & {label:string}>;
  courseIds: DraftValues;
  savedCourseIds: DraftValues;
}

let latestLoadToken = 0;

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    statusTitle: "全队录入",
    message: "",
    taskId: "",
    templateId: "",
    templateVersionId: "",
    projectId: "",
    projectTitle: "测评项目",
    taskTitle: "能力评估",
    teamName: "",
    termLabel: "",
    fields: [],
    rows: [],
    savedValuesByStudent: {},
    valuesByStudent: {},
    savedStudentIds: [],
    projectIds: [],
    projectIndex: 0,
    filledLabel: "已填写 0 人 · 未填写 0 人",
    lastSavedLabel: "",
    readOnly: false,
    submitting: false,
    managed: false,
    draftTaskKey: "",
    studentStates: {},
    correctionReason: "",
    saveError: "",
    historyTitle: "",
    historyLines: [],
    historyVisible: false,
    courseSelectionRequired:false, courses:[],courseIds:{},savedCourseIds:{},
  },

  // 非渲染实例状态：学员 → 待提交 assessedAt 快照（见 resolveAssessedAtSnapshot）
  assessmentAssessedAt: undefined as Record<string, AssessedAtSnapshot> | undefined,

  onLoad(query?: { taskId?: string; templateId?: string; projectId?: string; projectIds?: string; title?: string }) {
    const title = query?.title ? decodeURIComponent(query.title) : "能力评估";
    const selectedProjectIds = query?.projectIds ? decodeURIComponent(query.projectIds).split(",").filter(Boolean) : [];
    return this.load(query?.taskId || "", query?.templateId || "", query?.projectId || "", title, selectedProjectIds);
  },

  async load(taskId: string, templateId: string, projectId: string, taskTitle: string, selectedProjectIds: string[] = []) {
    const session = requireRole("coach");
    if (!session) return;
    if (!taskId || !templateId || !projectId) {
      this.setData({ state: "empty", statusTitle: "无法录入", message: "缺少测评项目参数，请返回项目列表后重试。", rows: [] });
      return;
    }

    const loadToken = ++latestLoadToken;
    this.setData({
      state: "loading",
      statusTitle: "正在读取全队名单",
      message: "",
      taskId,
      templateId,
      projectId,
      taskTitle,
      rows: [],
      fields: [],
      savedValuesByStudent: {},
      valuesByStudent: {},
      savedStudentIds: [],
      readOnly: false,
      submitting: false,
    });

    try {
      const tasks = await getCoachAssessmentTasks({ forceRefresh: true });
      if (loadToken !== latestLoadToken) return;
      const task = tasks.find((item) => item.id === taskId);
      if (!isUsableTask(task, templateId)) {
        this.setData({ state: "empty", statusTitle: "无法录入", message: "当前测评任务不可录入，请返回任务列表后重试。" });
        return;
      }

      if (task.workflow?.error) {
        this.setData({ state: "error", statusTitle: "当前任务暂不可录入", message: task.workflow.error });
        return;
      }
      const [form, team, savedEntries, courseResponse] = await Promise.all([
        task.workflow ? getAssessmentForm(templateId, task.workflow.templateVersionId) : getAssessmentForm(templateId),
        getCoachTeam(task.teamId),
        getCoachAssessmentEntries(task.id, projectId),
        task.workflow?.courseSelectionRequired ? getCoachAssessmentCourses(task.id) : Promise.resolve({courses:[]}),
      ]);
      if (loadToken !== latestLoadToken) return;
      const fields = form.fields.filter((field) =>
        (field.id === projectId || field.testItemId === projectId || field.groupId === projectId)
        && Boolean(field.id)
        && Boolean(field.testItemId)
        && (!task.testItemIds || task.testItemIds.includes(field.testItemId!)),
      );
      const members = (task.workflow?.students ? task.workflow.students.map((s) => ({id:s.studentId,name:s.name})) : team.members).filter((member) => Boolean(member.id) && Boolean(member.name) && (!task.studentIds || task.studentIds.includes(member.id)));
      if (!form.templateVersionId || !fields.length || !members.length) {
        this.setData({
          state: "empty",
          statusTitle: "暂无可录入内容",
          message: !members.length ? "当前球队没有可录入的真实学员。" : "当前测评项目没有可录入的真实指标。",
          fields,
          rows: [],
        });
        return;
      }

      const draftTaskKey = task.workflow
        ? [session.clubId, session.userId || "coach", taskId, form.templateVersionId].map(encodeURIComponent).join(":")
        : taskId;
      const signature = createSignature(fields, members);
      const savedValuesByStudent = normalizeSavedValues(savedEntries, fields, members);
      const draftValuesByStudent = (task.workflow ? !task.workflow.canEdit : task.status === "completed") ? {} : restoreDraft(draftTaskKey, projectId, signature, fields, members);
      const valuesByStudent = mergeValues(savedValuesByStudent, draftValuesByStudent);
      const savedStudentIds = Object.keys(savedValuesByStudent);
      const availableProjectIds = uniqueProjectIds(form.fields.filter((f) => !task.testItemIds || task.testItemIds.includes(f.testItemId || f.id)));
      const projectIds = selectedProjectIds.length
        ? availableProjectIds.filter((id) => selectedProjectIds.includes(id))
        : availableProjectIds;
      const projectIndex = Math.max(0, projectIds.indexOf(projectId));
      const readOnly = task.workflow ? !task.workflow.canEdit : task.status === "completed";
      const studentStates = { ...savedEntries.studentStates };
      const localDraft = wx.getStorageSync<BulkDraft | "">(draftKey(draftTaskKey, projectId));
      // Preserve the revision against which each restored edit was made.
      for (const studentId of Object.keys(draftValuesByStudent)) {
        if (localDraft && localDraft.studentStates?.[studentId]) studentStates[studentId] = localDraft.studentStates[studentId]!;
      }
      const courses = courseResponse.courses.map((course)=>({...course,label:`${courseDate(course.occurredAt)} · ${course.title}`}));
      const savedCourseIds: DraftValues = {};
      for (const member of members) for (const field of fields) {
        const id = savedEntries.entrySourcesByStudent?.[member.id]?.[field.testItemId || ""]?.eventId;
        if (id) (savedCourseIds[member.id] ??= {})[field.id] = id;
      }
      const courseIds = mergeValues(savedCourseIds, !readOnly && localDraft && localDraft.signature === signature ? localDraft.courseIds || {} : {});
      const sourceCourse = courses.find((c) => c.id === task.sourceEventId);
      if (!readOnly && sourceCourse) for (const member of members) if (sourceCourse.studentIds.includes(member.id)) for (const field of fields) {
        if (!courseIds[member.id]?.[field.id]) (courseIds[member.id] ??= {})[field.id] = sourceCourse.id;
      }
      this.setData({
        courseSelectionRequired:Boolean(task.workflow?.courseSelectionRequired),courses,courseIds,savedCourseIds,
        state: "ready",
        statusTitle: "全队录入",
        message: "",
        taskId: task.id,
        templateId: form.templateId,
        templateVersionId: form.templateVersionId,
        projectId,
        projectTitle: fields[0]?.label || fields[0]?.groupLabel || "测评项目",
        taskTitle: task.title,
        teamName: team.team?.name?.trim() || "球队待同步",
        termLabel: task.termLabel?.trim() || "学期待同步",
        fields,
        rows: buildRows(members, fields, valuesByStudent, savedStudentIds, courses, courseIds),
        savedValuesByStudent,
        valuesByStudent,
        savedStudentIds,
        projectIds,
        projectIndex,
        filledLabel: readOnly ? buildCompletedLabel(members, valuesByStudent) : buildFilledLabel(members, valuesByStudent),
        lastSavedLabel: savedStudentIds.length ? "已恢复已保存成绩" : hasDraftValues(valuesByStudent) ? "已恢复本机草稿" : "",
        readOnly,
        managed: Boolean(task.workflow),
        draftTaskKey,
        studentStates,
        correctionReason: "",
        saveError: "",
        submitting: false,
      });
    } catch {
      if (loadToken !== latestLoadToken) return;
      this.setData({ state: "error", statusTitle: "读取失败", message: "暂时无法读取全队测评信息，请稍后重试。", rows: [] });
    }
  },

  onRawInput(event: { currentTarget: { dataset: { studentId?: string; fieldId?: string } }; detail: { value: string | number } }) {
    if (this.data.readOnly || this.data.submitting) return;
    const studentId = event.currentTarget.dataset.studentId;
    const fieldId = event.currentTarget.dataset.fieldId;
    if (!studentId || !fieldId || !this.data.fields.some((field: AssessmentField) => field.id === fieldId)) return;
    const rawValue = String(event.detail.value ?? "");
    const valuesByStudent = { ...this.data.valuesByStudent, [studentId]: { ...(this.data.valuesByStudent[studentId] || {}) } };
    if (rawValue.trim()) valuesByStudent[studentId][fieldId] = rawValue;
    else {
      delete valuesByStudent[studentId][fieldId];
      if (!Object.keys(valuesByStudent[studentId]).length) delete valuesByStudent[studentId];
    }
    const savedValue = this.data.savedValuesByStudent[studentId]?.[fieldId];
    if (!rawValue.trim() && savedValue) valuesByStudent[studentId][fieldId] = savedValue;
    const members = this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name }));
    this.setData({ valuesByStudent, rows: buildRows(members, this.data.fields, valuesByStudent, this.data.savedStudentIds, this.data.courses, this.data.courseIds), filledLabel: buildFilledLabel(members, valuesByStudent) });
    const draftValuesByStudent = pendingChanges(valuesByStudent, this.data.savedValuesByStudent, this.data.courseIds, this.data.savedCourseIds);
    if (hasDraftValues(draftValuesByStudent)) this.persistDraft(draftValuesByStudent);
    else wx.removeStorageSync(draftKey(this.data.draftTaskKey || this.data.taskId, this.data.projectId));
  },

  persistDraft(valuesByStudent: DraftValues) {
    if (!this.data.taskId || !this.data.projectId || !this.data.fields.length) return;
    this.writeDraft(valuesByStudent);
    this.setData({ lastSavedLabel: "草稿已保存在本机" });
  },

  writeDraft(valuesByStudent: DraftValues) {
    if (!this.data.taskId || !this.data.projectId || !this.data.fields.length) return;
    const members = this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name }));
    wx.setStorageSync(draftKey(this.data.draftTaskKey || this.data.taskId, this.data.projectId), {
      signature: createSignature(this.data.fields, members),
      savedAt: new Date().toISOString(),
      valuesByStudent,
      savedStudentIds: this.data.savedStudentIds,
      studentStates: this.data.studentStates,
      courseIds:this.data.courseIds,
    } satisfies BulkDraft);
  },

  selectCourse(event: {currentTarget:{dataset:{studentId?:string;fieldId?:string}};detail:{value:string}}) {
    if (this.data.readOnly || this.data.submitting) return;
    const {studentId,fieldId}=event.currentTarget.dataset;
    const options=studentId ? this.data.courses.filter((course:AssessmentCourse)=>course.studentIds.includes(studentId)) : this.data.courses;
    const course=options[Number(event.detail.value)];if(!course)return;
    const courseIds=mergeValues(this.data.courseIds,{});
    for(const row of this.data.rows as BulkRow[]) {
      if ((studentId && row.studentId!==studentId) || !course.studentIds.includes(row.studentId)) continue;
      for(const field of this.data.fields as AssessmentField[]) {
        if(fieldId && field.id!==fieldId)continue;
        (courseIds[row.studentId] ??= {})[field.id]=course.id;
      }
    }
    this.setData({courseIds,rows:buildRows(this.data.rows.map((row:BulkRow)=>({id:row.studentId,name:row.name})),this.data.fields,this.data.valuesByStudent,this.data.savedStudentIds,this.data.courses,courseIds)});
    this.persistDraft(pendingChanges(this.data.valuesByStudent,this.data.savedValuesByStudent,courseIds,this.data.savedCourseIds));
  },
  saveDraft() {
    this.persistDraft(this.data.valuesByStudent);
  },

  async saveProject() {
    if (this.data.readOnly) {
      wx.showToast({ title: this.data.managed ? "当前任务仅支持查看" : "任务已完成，仅支持查看已保存成绩", icon: "none" });
      return;
    }
    if (this.data.submitting) return;
    const pendingValuesByStudent = pendingChanges(this.data.valuesByStudent, this.data.savedValuesByStudent, this.data.courseIds, this.data.savedCourseIds);
    const members = this.data.rows.filter((row: BulkRow) => hasStudentValues(pendingValuesByStudent[row.studentId]));
    if (!members.length) {
      wx.showToast({ title: "请先录入至少一名学员", icon: "none" });
      return;
    }
    if (this.data.managed && members.some((row: BulkRow) => (this.data.studentStates[row.studentId]?.publishedRevision ?? null) !== null) && !this.data.correctionReason.trim()) {
      this.setData({ saveError: "更正已发布成绩，请先填写更正原因。" });
      return;
    }
    this.setData({ submitting: true, saveError: "" });
    const succeeded: string[] = [];
    for (const row of members) {
      if (this.data.managed && !validStandardInputs(this.data.fields, pendingValuesByStudent[row.studentId] || {})) {
        this.setData({ saveError: `${row.name}：请填写范围内的标准分（0–100），评级须为1–5整数。` });
        continue;
      }
      const rawResults = buildRawResults(this.data.fields, pendingValuesByStudent[row.studentId] || {}).map((entry)=>{
        const field = this.data.fields.find((item:AssessmentField)=>item.testItemId===entry.testItemId);
        const eventId = field && this.data.courseIds[row.studentId]?.[field.id];
        return {...entry,...(eventId ? {eventId} : {})};
      });
      if (this.data.courseSelectionRequired && rawResults.some((entry)=>!entry.eventId)) {this.setData({saveError:`${row.name}：请选择各项成绩所属训练课。`});continue;}
      if (!rawResults.length) continue;
      try {
        if (this.data.managed) {
          const revision = this.data.studentStates[row.studentId]?.revision;
          if (revision === undefined) throw new Error("缺少成绩版本，请重新读取服务器成绩");
          const saved = await saveCoachAssessmentEntries(this.data.taskId, row.studentId, {
            expectedRevision: revision, entries: rawResults, reason: this.data.correctionReason.trim() || undefined,
          });
          this.setData({ studentStates: { ...this.data.studentStates, [row.studentId]: {
            revision: saved.revision, publishedRevision: saved.publications[saved.publications.length - 1]?.revision ?? null,
          } } });
        } else {
          const assessedAtStore = (this.assessmentAssessedAt ??= {});
          const snapshotKey = `${this.data.taskId}:${row.studentId}`;
          const assessedAt = resolveAssessedAtSnapshot(assessedAtStore, snapshotKey, rawResults);
          await submitCoachAssessment({
            studentId: row.studentId,
            assessmentTaskId: this.data.taskId,
            templateId: this.data.templateId,
            templateVersionId: this.data.templateVersionId,
            assessedAt,
            rawResults,
          });
          // 提交成功后清掉快照：后续对同一学员的重新提交属于新的业务事实
          delete assessedAtStore[snapshotKey];
        }
        succeeded.push(row.studentId);
      } catch (error) {
        // 失败保留快照，重试复用同一 assessedAt，让确定性幂等键保持不变
        this.setData({ saveError: error && typeof error === "object" && "message" in error ? String(error.message) : "保存失败，请稍后重试；本机草稿已保留。" });
        // Keep this student's draft so the coach can retry only the failed row.
      }
    }
    const savedCourseIds=mergeValues(this.data.savedCourseIds,{});
    for(const studentId of succeeded) savedCourseIds[studentId]={...(this.data.courseIds[studentId] || {})};
    this.setData({savedCourseIds});
    const draftValuesByStudent = withoutStudents(pendingValuesByStudent, succeeded);
    if (hasDraftValues(draftValuesByStudent)) this.writeDraft(draftValuesByStudent);
    else wx.removeStorageSync(draftKey(this.data.draftTaskKey || this.data.taskId, this.data.projectId));
    const savedValuesByStudent = { ...this.data.savedValuesByStudent };
    for (const studentId of succeeded) {
      savedValuesByStudent[studentId] = { ...(this.data.valuesByStudent[studentId] || {}) };
    }
    const valuesByStudent = mergeValues(savedValuesByStudent, draftValuesByStudent);
    const savedStudentIds = Array.from(new Set([...this.data.savedStudentIds, ...succeeded]));
    this.setData({
      submitting: false,
      savedValuesByStudent,
      savedStudentIds,
      valuesByStudent,
      rows: buildRows(this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name })), this.data.fields, valuesByStudent, savedStudentIds, this.data.courses, this.data.courseIds),
      filledLabel: buildFilledLabel(this.data.rows.map((row: BulkRow) => ({ id: row.studentId })), valuesByStudent),
      lastSavedLabel: succeeded.length ? `已保存${succeeded.length}名学员` : this.data.lastSavedLabel,
    });
    if (succeeded.length < members.length) wx.showToast({ title: "部分学员未保存，已保留草稿", icon: "none" });
    else wx.showToast({ title: `已保存${succeeded.length}名学员`, icon: "success" });
  },

  nextProject() {
    if (this.data.submitting) return;
    if (this.data.readOnly) {
      openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
      return;
    }
    const nextProjectId = this.data.projectIds[this.data.projectIndex + 1];
    if (!nextProjectId) {
      openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
      return;
    }
    openPage(`/pages/coach/assessment-bulk-entry/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&projectId=${encodeURIComponent(nextProjectId)}&projectIds=${encodeURIComponent(this.data.projectIds.join(","))}&title=${encodeURIComponent(this.data.taskTitle)}`);
  },

  goBack() {
    if (this.data.submitting) return;
    wx.navigateBack({ delta: 1 });
  },

  onReasonInput(event: { detail: { value: string } }) {
    if (!this.data.submitting) this.setData({ correctionReason: event.detail.value });
  },

  async reloadServer() {
    if (this.data.submitting) return;
    const answer = await new Promise<{ confirm: boolean }>((resolve) => wx.showModal({ success: resolve, title: "重新读取服务器成绩", content: "将放弃当前项目的本机未保存修改，读取服务器最新成绩。是否继续？" }));
    if (!answer.confirm) return;
    wx.removeStorageSync(draftKey(this.data.draftTaskKey, this.data.projectId));
    await this.load(this.data.taskId, this.data.templateId, this.data.projectId, this.data.taskTitle, this.data.projectIds);
  },

  async showHistory(event: { currentTarget: { dataset: { studentId?: string } } }) {
    const studentId = event.currentTarget.dataset.studentId;
    if (!studentId || !this.data.managed) return;
    this.setData({ historyVisible: true, historyTitle: "录入与发布记录", historyLines: ["正在读取记录…"] });
    try {
      const history = await getCoachAssessmentHistory(this.data.taskId, studentId);
      const labels = new Map(this.data.fields.map((field: AssessmentField) => [field.testItemId, field.label]));
      const changes = history.changes.flatMap((change) => change.entries.filter((entry) => labels.has(entry.testItemId)).map((entry) =>
        `修订 ${change.revision} · ${change.changedAt.replace("T", " ").slice(0, 19)} UTC · ${change.coachId}\n${labels.get(entry.testItemId)}：${historyValue(entry.before)} → ${historyValue(entry.after)}${change.reason ? `\n原因：${change.reason}` : ""}`));
      const publications = history.publications.map((publication) => `发布修订 ${publication.revision} · ${publication.publishedAt.replace("T", " ").slice(0, 19)} UTC · ${publication.coachId}`);
      this.setData({ historyLines: [...publications.reverse(), ...changes.reverse()].length ? [...publications, ...changes] : ["当前项目暂无记录"] });
    } catch {
      this.setData({ historyLines: ["记录读取失败，请关闭后重试。"] });
    }
  },

  closeHistory() { this.setData({ historyVisible: false }); },

  retry() {
    void this.load(this.data.taskId, this.data.templateId, this.data.projectId, this.data.taskTitle);
  },
});

// assessedAt 幂等快照（REQ-ASM-002 / A 线移交项）：
// 同一学员同一内容的提交（含失败重试）复用同一 assessedAt，保证请求体稳定、
// 请求层的确定性幂等键不变；仅内容变化后的重新提交才生成新的测评发生时间。
function resolveAssessedAtSnapshot(store: Record<string, AssessedAtSnapshot>, key: string, rawResults: unknown[]) {
  const signature = JSON.stringify(rawResults);
  const snapshot = store[key];
  if (snapshot && snapshot.signature === signature) return snapshot.assessedAt;
  const assessedAt = new Date().toISOString();
  store[key] = { assessedAt, signature };
  return assessedAt;
}

function isUsableTask(task: CoachAssessmentTask | undefined, templateId: string): task is CoachAssessmentTask {
  return Boolean(task && task.templateId === templateId && (task.status === "in_progress" || task.status === "completed" || (task.status === "not_started" && task.workflow)));
}

function buildRows(members: Array<{ id: string; name: string }>, fields: AssessmentField[], valuesByStudent: DraftValues, savedStudentIds: string[] = [], courses: Array<AssessmentCourse & {label:string}> = [], courseIds:DraftValues = {}): BulkRow[] {
  return members.map((member) => {
    const values = valuesByStudent[member.id] || {};
    const metrics = fields.map((field) => {
      const value = values[field.id] || "";
      return {
        fieldId: field.id,
        label: field.label,
        inputType: field.inputType === "number" ? "digit" as const : "text" as const,
        value,
        unitLabel: displayUnit(field),
        placeholder: field.required ? "录入" : "选填",
        courseLabel: courses.find((course)=>course.id===courseIds[member.id]?.[field.id])?.label || (courseIds[member.id]?.[field.id] ? "原关联课程当前不可用，请核对" : "选择所属训练课"),
        scoreLabel: value && field.valueKind === "score_0_100" ? `${value}分` : "待提交",
      };
    });
    const first = metrics[0];
    const hasValues = Object.keys(values).length > 0;
    return {
      studentId: member.id,
      name: member.name.trim(),
      initials: member.name.trim().slice(0, 1) || "学",
      rawInputValue: first?.value || "",
      scoreLabel: first?.scoreLabel || "待提交",
      statusLabel: savedStudentIds.includes(member.id) ? "已保存" : hasValues ? "已填写" : "待录入",
      courses:courses.filter((course)=>course.studentIds.includes(member.id)),
      metrics,
    };
  });
}

function normalizeSavedValues(response: CoachAssessmentEntries, fields: AssessmentField[], members: Array<{ id: string }>): DraftValues {
  const valuesByStudent: DraftValues = {};
  const fieldByTestItemId = new Map(fields.map((field) => [field.testItemId, field]));
  for (const member of members) {
    const stored = response.savedValuesByStudent?.[member.id];
    if (!stored) continue;
    const values: Record<string, string> = {};
    for (const [testItemId, value] of Object.entries(stored)) {
      const field = fieldByTestItemId.get(testItemId);
      const rawValue = formatSavedValue(field, value);
      if (field && rawValue) values[field.id] = rawValue;
    }
    if (hasStudentValues(values)) valuesByStudent[member.id] = values;
  }
  return valuesByStudent;
}

function formatSavedValue(field: AssessmentField | undefined, value: Record<string, unknown>) {
  if (!field || !value || typeof value !== "object") return "";
  const numeric = value.score ?? value.count ?? value.percentage ?? value.minutes ?? value.seconds ?? value.meters ?? value.value;
  if (typeof numeric === "number" && Number.isFinite(numeric)) return String(numeric);
  if (typeof value.text === "string") return value.text;
  if (typeof value.tag === "string") return value.tag;
  return "";
}

function mergeValues(base: DraftValues, override: DraftValues): DraftValues {
  const merged: DraftValues = {};
  for (const [studentId, values] of Object.entries(base)) merged[studentId] = { ...values };
  for (const [studentId, values] of Object.entries(override)) merged[studentId] = { ...(merged[studentId] || {}), ...values };
  return merged;
}

function buildFilledLabel(members: Array<{ id: string }>, valuesByStudent: DraftValues) {
  const filled = members.reduce((count, member) => count + (hasStudentValues(valuesByStudent[member.id]) ? 1 : 0), 0);
  return `已填写 ${filled} 人 · 未填写 ${Math.max(0, members.length - filled)} 人`;
}

function buildCompletedLabel(members: Array<{ id: string }>, valuesByStudent: DraftValues) {
  const completed = members.reduce((count, member) => count + (hasStudentValues(valuesByStudent[member.id]) ? 1 : 0), 0);
  return `全队 ${completed} 人已完成 · 成绩已保存`;
}

function createSignature(fields: AssessmentField[], members: Array<{ id: string }>) {
  return `${fields.map((field) => `${field.id}:${field.testItemId}`).join("|")}::${members.map((member) => member.id).join("|")}`;
}

function restoreDraft(taskId: string, projectId: string, signature: string, fields: AssessmentField[], members: Array<{ id: string }>): DraftValues {
  const draft = wx.getStorageSync<BulkDraft | "">(draftKey(taskId, projectId));
  if (!draft || draft.signature !== signature || !draft.valuesByStudent) return {};
  const fieldIds = new Set(fields.map((field) => field.id));
  const valuesByStudent: DraftValues = {};
  for (const member of members) {
    const stored = draft.valuesByStudent[member.id];
    if (!stored) continue;
    const values: Record<string, string> = {};
    for (const [fieldId, value] of Object.entries(stored)) if (fieldIds.has(fieldId) && typeof value === "string") values[fieldId] = value;
    if (hasStudentValues(values)) valuesByStudent[member.id] = values;
  }
  return valuesByStudent;
}

function uniqueProjectIds(fields: AssessmentField[]) {
  const ids: string[] = [];
  for (const field of fields) {
    const id = field.testItemId || field.id || field.groupId;
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function draftKey(taskId: string, projectId: string) {
  return `${environmentStorageKey("coach-assessment-bulk")}:${taskId}:${projectId}`;
}

function hasStudentValues(values: Record<string, string> | undefined) {
  return Boolean(values && Object.values(values).some((value) => Boolean(value.trim())));
}

function hasDraftValues(valuesByStudent: DraftValues) {
  return Object.values(valuesByStudent).some((values) => hasStudentValues(values));
}

function withoutStudents(valuesByStudent: DraftValues, studentIds: string[]) {
  const next = { ...valuesByStudent };
  for (const studentId of studentIds) delete next[studentId];
  return next;
}

function changedValues(valuesByStudent: DraftValues, savedValuesByStudent: DraftValues): DraftValues {
  const changed: DraftValues = {};
  for (const [studentId, values] of Object.entries(valuesByStudent)) {
    const saved = savedValuesByStudent[studentId] || {};
    const next: Record<string, string> = {};
    for (const [fieldId, value] of Object.entries(values)) {
      if (value.trim() && saved[fieldId] !== value) next[fieldId] = value;
    }
    if (hasStudentValues(next)) changed[studentId] = next;
  }
  return changed;
}

function displayUnit(field: AssessmentField) {
  if (field.unit) return field.unit;
  const labels: Record<string, string> = { duration_seconds: "秒", duration_minutes: "分钟", distance_meters: "米", count: "次", percentage: "%", score_0_100: "分", rating_1_5: "分" };
  return labels[field.valueKind] || "";
}

function buildRawResults(fields: AssessmentField[], values: Record<string, string>) {
  const results: Array<{ testItemId: string; metricId?: string; value: Record<string, unknown> }> = [];
  for (const field of fields) {
    if (!field.testItemId) continue;
    const rawValue = values[field.id]?.trim();
    if (!rawValue) continue;
    const value = buildMetricValue(field.valueKind, rawValue, field.unit);
    if (value) results.push({ testItemId: field.testItemId, metricId: field.metricId, value });
  }
  return results;
}

function buildMetricValue(kind: string, rawValue: string, unit?: string): Record<string, unknown> | null {
  if (kind === "tag") return { kind, tag: rawValue };
  if (kind === "text") return { kind, text: rawValue };
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return null;
  if (kind === "rating_1_5") return { kind, score: Math.max(1, Math.min(5, Math.round(numeric))) };
  if (kind === "score_0_100") return { kind, score: Math.max(0, Math.min(100, numeric)) };
  if (kind === "count") return { kind, count: numeric };
  if (kind === "percentage") return { kind, percentage: numeric };
  if (kind === "duration_minutes") return { kind, minutes: numeric };
  if (kind === "duration_seconds") return { kind, seconds: numeric };
  if (kind === "distance_meters") return { kind, meters: numeric };
  return { kind: "measurement", value: numeric, unit: unit || "value" };
}

function validStandardInputs(fields: AssessmentField[], values: Record<string, string>): boolean {
  return fields.every((field) => {
    const text = values[field.id];
    if (!text?.trim()) return true;
    const score = Number(text);
    return Number.isFinite(score) && (field.valueKind === "score_0_100" ? score >= 0 && score <= 100 : field.valueKind === "rating_1_5" && Number.isInteger(score) && score >= 1 && score <= 5);
  });
}

function historyValue(value: Record<string, unknown> | null): string {
  return value === null ? "未录入" : String(value.score ?? value.value ?? "—");
}

function courseDate(value:string) {
  const date=new Date(Date.parse(value)+8*3600000);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0,16).replace("T"," ") : "日期未知";
}
function pendingChanges(values:DraftValues,saved:DraftValues,courses:DraftValues,savedCourses:DraftValues):DraftValues {
  const result=changedValues(values,saved);
  for(const [studentId,fields] of Object.entries(values)) for(const [fieldId,value] of Object.entries(fields)) {
    if (value.trim() && courses[studentId]?.[fieldId] !== savedCourses[studentId]?.[fieldId]) (result[studentId] ??= {})[fieldId]=value;
  }
  return result;
}
