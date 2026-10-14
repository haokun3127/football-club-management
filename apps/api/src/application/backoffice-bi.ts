import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import {
  getNumericMetricValue,
  type CalendarEvent,
} from "@football-club/domain";
import type { PersistentApiStore } from "../store.js";
import type { AuthContext } from "../auth/context.js";
import {
  BackofficeBiRepository,
  type BiData,
  type BiFilters,
  type BiTopic,
} from "../persistence/backoffice-bi-repository.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
import { BackofficeManagement } from "./backoffice-management.js";
import { BackofficeAssessmentTasks } from "./backoffice-assessment-tasks.js";
import { backofficeTrainingRecords } from "./backoffice-training-records.js";
import { taskDate } from "./assessment-workflow.js";
import { summarizeSelectedTraining } from "./training-content-summary.js";
import { buildTrainingContentTree } from "./training-content-catalog.js";
import { resourceByKey } from "./backoffice-resources.js";
export class BackofficeBi {
  readonly repository: BackofficeBiRepository;
  readonly management: BackofficeManagement;
  constructor(readonly store: PersistentApiStore) {
    this.repository = new BackofficeBiRepository(
      store.repositories.backofficeManagement.database,
    );
    this.management = new BackofficeManagement(store);
  }
  require(actor: AuthContext) {
    if (
      !this.management.repository.activeBrowser(
        actor.clubId,
        actor.user.id,
        actor.membership.id,
      ) ||
      !actor.membership.roles.some((role) =>
        ["owner", "admin", "operator"].includes(role),
      )
    )
      throw new BackofficeFault(403, "permission_denied");
  }
  requireTopic(actor: AuthContext, topic: BiTopic) {
    this.require(actor);
    if (topic === "services" && !this.management.has(actor, "service"))
      throw new BackofficeFault(403, "permission_denied");
  }
  catalog(actor: AuthContext) {
    this.require(actor);
    return {
      topics: [
        { value: "operations", label: "运营概况" },
        { value: "training", label: "训练记录与内容" },
        { value: "assessment", label: "测评执行" },
        { value: "growth", label: "已确认成长结果" },
        ...(this.management.has(actor, "service")
          ? [{ value: "services", label: "专业服务执行" }]
          : []),
      ],
      teams: this.store
        .listTeams(actor.clubId)
        .map((row) => ({ value: row.id, label: row.name })),
      students: this.store
        .listStudents(actor.clubId)
        .map((row) => ({ value: row.id, label: row.name })),
      metrics: this.store.listAbilityMetrics(actor.clubId).map((row) => ({
        value: row.id,
        label: `${row.name} · ${row.unit ?? row.valueKind}`,
      })),
    };
  }
  async data(
    actor: AuthContext,
    topic: BiTopic,
    filters: BiFilters,
  ): Promise<BiData> {
    this.requireTopic(actor, topic);
    if (filters.from && filters.to && filters.from > filters.to)
      throw new BackofficeFault(400, "invalid_date_range");
    const catalog = this.catalog(actor);
    for (const [key, options] of [
      ["teamId", catalog.teams],
      ["studentId", catalog.students],
      ["metricId", catalog.metrics],
    ] as const)
      if (
        filters[key] &&
        !options.some((option) => option.value === filters[key])
      )
        throw new BackofficeFault(400, "invalid_reference");
    const inDate = (date: string) => {
        const day = taskDate(new Date(date));
        return (
          (!filters.from || day >= filters.from) &&
          (!filters.to || day <= filters.to)
        );
      },
      teams = this.store.listTeams(actor.clubId),
      students = this.store.listStudents(actor.clubId),
      members = this.store.listTeamMembers(actor.clubId),
      studentName = (id: string) =>
        students.find((row) => row.id === id)?.name ?? id,
      teamName = (id: string) => teams.find((row) => row.id === id)?.name ?? id;
    const ids = new Set(
      students
        .filter(
          (student) =>
            (!filters.studentId || student.id === filters.studentId) &&
            (!filters.teamId ||
              members.some(
                (member) =>
                  member.studentId === student.id &&
                  member.teamId === filters.teamId &&
                  member.status === "active",
              )),
        )
        .map((student) => student.id),
    );
    const events = (await this.store.listCalendarEvents(
      actor.clubId,
    )) as CalendarEvent[];
    if (topic === "operations") {
      const formal = (
        await this.management.records(resourceByKey("students")!, actor.clubId)
      ).filter((row) => ids.has(row.id));
      const activity = events.filter(
        (event) =>
          (!filters.teamId || event.primaryTeamId === filters.teamId) &&
          inDate(event.timeRange.startsAt) &&
          (!filters.studentId ||
            this.store
              .listEventParticipants(actor.clubId)
              .some(
                (participant) =>
                  participant.eventId === event.id &&
                  participant.studentId === filters.studentId,
              )),
      );
      return {
        cards: [
          { key: "students", label: "当前正式学员", value: formal.length },
          {
            key: "teams",
            label: "开展中的队伍",
            value: teams.filter(
              (team) =>
                team.status === "active" &&
                (!filters.teamId || team.id === filters.teamId),
            ).length,
          },
          {
            key: "events",
            label: "范围内活动",
            value: activity.filter((event) => event.status !== "cancelled")
              .length,
          },
          {
            key: "cancelled",
            label: "已取消活动",
            value: activity.filter((event) => event.status === "cancelled")
              .length,
          },
          {
            key: "missing",
            label: "基础档案缺项",
            value: formal.filter(
              (row) => !row.values.name || !row.values.birthDate,
            ).length,
          },
        ],
        columns: [
          { key: "name", label: "学员" },
          { key: "teams", label: "当前有效队伍" },
          { key: "complete", label: "姓名及出生日期" },
          { key: "revision", label: "档案版本" },
        ],
        rows: formal.map((row) => ({
          id: row.id,
          values: {
            name: String(row.values.name ?? row.id),
            teams: members
              .filter(
                (member) =>
                  member.studentId === row.id && member.status === "active",
              )
              .map((member) => teamName(member.teamId))
              .join("、"),
            complete:
              row.values.name && row.values.birthDate ? "完整" : "待补齐",
            revision: row.revision,
          },
        })),
        notes: [
          "学员与队伍卡片是当前名册；日期条件仅作用于活动卡片，不以账号注册日期推算入训。",
          "此页不计算未确认的实际执教次数、入训累计天数或收入。",
        ],
      };
    }
    if (topic === "services") {
      const coaches = new Map(
        this.store
          .listCoaches(actor.clubId)
          .map((coach) => [coach.id, coach.name]),
      );
      const catalogs = new Map(
        this.management.repository
          .list(resourceByKey("service-catalog")!, actor.clubId)
          .map((row) => [row.id, row]),
      );
      const records = ["consultations", "service-cases"]
        .flatMap((key) =>
          this.management.repository
            .list(resourceByKey(key)!, actor.clubId)
            .map((row) => ({ key, row })),
        )
        .filter(
          ({ row }) =>
            (!filters.studentId ||
              row.values.studentId === filters.studentId) &&
            (!filters.teamId || ids.has(String(row.values.studentId))) &&
            inDate(row.updatedAt),
        );
      const rows = records.map(({ key, row }) => ({
        id: row.id,
        values: {
          student: studentName(String(row.values.studentId)),
          studentId: String(row.values.studentId),
          service: String(
            catalogs.get(String(row.values.serviceId))?.values.name ??
              "未关联目录",
          ),
          type:
            key === "consultations"
              ? "私教咨询"
              : String(
                  catalogs.get(String(row.values.serviceId))?.values.type ??
                    "未分类",
                ),
          status: String(row.values.status),
          owner: coaches.get(String(row.values.responsibleCoachId)) ?? null,
          nextFollowUp: row.values.nextFollowUp
            ? String(row.values.nextFollowUp)
            : null,
          eventId: row.values.eventId ? String(row.values.eventId) : null,
          updatedAt: row.updatedAt,
          resource: key,
          revision: row.revision,
        },
      }));
      const scout = this.management.repository
        .list(resourceByKey("scout-work")!, actor.clubId)
        .filter(
          (row) =>
            inDate(row.updatedAt) &&
            (!filters.studentId ||
              row.values.scoutPlayerId === filters.studentId) &&
            (!filters.teamId || ids.has(String(row.values.scoutPlayerId))),
        );
      return {
        cards: [
          { key: "demands", label: "范围内咨询与需求", value: rows.length },
          {
            key: "pending",
            label: "尚待沟通或承接",
            value: rows.filter((row) =>
              ["pending", "communicating"].includes(String(row.values.status)),
            ).length,
          },
          {
            key: "accepted",
            label: "已明确承接",
            value: rows.filter((row) =>
              ["confirmed", "accepted", "executing", "delivered"].includes(
                String(row.values.status),
              ),
            ).length,
          },
          {
            key: "delivered",
            label: "已记录交付",
            value: rows.filter((row) => row.values.status === "delivered")
              .length,
          },
          {
            key: "unassigned",
            label: "尚未分派负责人",
            value: rows.filter((row) => row.values.owner === null).length,
          },
          { key: "scout", label: "球探工作记录", value: scout.length },
        ],
        columns: [
          { key: "student", label: "学员" },
          { key: "service", label: "服务目录" },
          { key: "type", label: "需求类型" },
          { key: "status", label: "真实处理状态" },
          { key: "owner", label: "负责教练" },
          { key: "nextFollowUp", label: "下次跟进" },
          { key: "eventId", label: "共同活动ID" },
          { key: "updatedAt", label: "最近更新" },
          { key: "resource", label: "来源对象" },
          { key: "revision", label: "来源版本" },
        ],
        rows,
        notes: [
          "日期条件使用咨询或需求最近更新时间；球探卡片统计工作记录，不推定实际参训。",
          "分派负责人不计为承接；承接须显式记录确认依据。内部意见不进入统计或导出，统计不生成订单、支付或销课。",
        ],
      };
    }
    if (topic === "training") {
      const records = await backofficeTrainingRecords(this.store, actor.clubId),
        config = await this.store.getDataCapabilityConfig(actor.clubId),
        tree = buildTrainingContentTree({
          views: config.metricViews,
          viewNodes: config.metricViewNodes,
          metrics: this.store.listAbilityMetrics(actor.clubId),
          drills: this.store.listTrainingDrills(actor.clubId),
        });
      const rows = records
        .filter((row) => {
          const event = events.find((event) => event.id === row.eventId);
          return (
            event &&
            (!filters.teamId || event.primaryTeamId === filters.teamId) &&
            (!filters.studentId || row.studentId === filters.studentId) &&
            inDate(event.timeRange.startsAt) &&
            Date.parse(event.timeRange.endsAt) <= Date.now()
          );
        })
        .map((row) => {
          const event = events.find((event) => event.id === row.eventId)!,
            date = taskDate(new Date(event.timeRange.startsAt)),
            temporary = this.store.temporaryRosters
              .get(actor.clubId, event.id)
              .temporary.some((person) => person.studentId === row.studentId),
            formal = members.some(
              (member) =>
                member.studentId === row.studentId &&
                member.teamId === event.primaryTeamId &&
                Date.parse(member.startsAt) <=
                  Date.parse(event.timeRange.startsAt) &&
                (!member.endsAt ||
                  Date.parse(member.endsAt) >=
                    Date.parse(event.timeRange.startsAt)),
            );
          const session = this.store.repositories.trainingSessions.getByEvent(
              actor.clubId,
              event.id,
            ),
            plan = session?.sessionPlanId
              ? this.store.repositories.sessionPlans.getById(
                  actor.clubId,
                  session.sessionPlanId,
                )
              : null,
            content = summarizeSelectedTraining(
              plan,
              this.store.listTrainingDrills(actor.clubId),
              tree,
            );
          return {
            id: `${row.eventId}:${row.studentId}`,
            values: {
              student: row.name,
              studentId: row.studentId,
              event: row.title,
              eventId: row.eventId,
              date: event.timeRange.startsAt,
              cohort: temporary
                ? "临时参训"
                : formal
                  ? "正式参训"
                  : "历史名单来源不完整",
              counted: row.record?.counted ?? null,
              source:
                row.record?.source === "automatic"
                  ? "系统默认"
                  : row.record?.source === "correction"
                    ? "人工更正"
                    : "缺记录",
              revision: row.record?.revision ?? null,
              cancelled: event.status === "cancelled",
              contentCount: row.record?.counted ? content.count : null,
              configuredMinutes: row.record?.counted
                ? content.configuredMinutes
                : null,
            },
          };
        });
      const valid = rows.filter(
        (row) => row.values.counted && !row.values.cancelled,
      );
      return {
        cards: [
          {
            key: "sessions",
            label: "已计次课程（去重）",
            value: new Set(valid.map((row) => row.values.eventId)).size,
          },
          { key: "people", label: "当前有效计次人次", value: valid.length },
          {
            key: "notCounted",
            label: "不计次人次",
            value: rows.filter((row) => row.values.counted === false).length,
          },
          {
            key: "temporary",
            label: "临时参训计次人次",
            value: valid.filter((row) => row.values.cohort === "临时参训")
              .length,
          },
          {
            key: "missing",
            label: "缺记录人次",
            value: rows.filter((row) => row.values.counted === null).length,
          },
          {
            key: "minutes",
            label: "配置内容时长合计",
            unit: "分钟",
            value:
              valid.length &&
              valid.every((row) => row.values.configuredMinutes !== null)
                ? valid.reduce(
                    (sum, row) => sum + Number(row.values.configuredMinutes),
                    0,
                  )
                : null,
          },
        ],
        columns: [
          { key: "student", label: "学员" },
          { key: "event", label: "课程" },
          { key: "date", label: "课程发生时间" },
          { key: "cohort", label: "名单来源" },
          { key: "counted", label: "当前计次" },
          { key: "source", label: "结果来源" },
          { key: "revision", label: "修订" },
          { key: "contentCount", label: "配置内容数量" },
          { key: "configuredMinutes", label: "配置内容分钟" },
        ],
        rows,
        notes: [
          "采用共同的当前训练计次事实；人工更正覆盖默认值，取消课程不计次。正式与临时参训分列，缺记录不作为零分。",
          "内容和时长沿共同课程计划去重汇总，属于配置训练经历，不是实际动作次数或设备测量；缺配置时长显示无法汇总。",
        ],
      };
    }
    if (topic === "assessment") {
      const tasks = await new BackofficeAssessmentTasks(this.store).list(actor),
        rows = [] as BiData["rows"];
      for (const task of tasks) {
        if (
          (filters.teamId && task.teamId !== filters.teamId) ||
          (filters.from && task.dueOn < filters.from) ||
          (filters.to && task.startsOn > filters.to)
        )
          continue;
        if (!("summary" in task) || !task.summary) continue;
        for (const student of task.summary.students) {
          if (filters.studentId && student.studentId !== filters.studentId)
            continue;
          rows.push({
            id: `${task.id}:${student.studentId}`,
            values: {
              task: task.title,
              taskId: task.id,
              student: studentName(student.studentId),
              team: teamName(task.teamId),
              completed: student.completedFields,
              total: student.totalFields,
              notAssessed: !!student.notAssessed,
              handled:
                !!student.notAssessed ||
                student.completedFields === student.totalFields,
              published:
                student.publishedRevision === student.revision &&
                student.completedFields === student.totalFields,
              ready:
                !student.notAssessed &&
                student.completedFields === student.totalFields &&
                student.revision !== student.publishedRevision,
              revision: student.revision,
              templateVersionId: task.summary.templateVersionId,
            },
          });
        }
      }
      return {
        cards: [
          { key: "required", label: "应处理学员人次", value: rows.length },
          {
            key: "handled",
            label: "已处理人次",
            value: rows.filter((row) => row.values.handled).length,
          },
          {
            key: "measured",
            label: "已录齐人次",
            value: rows.filter(
              (row) =>
                !row.values.notAssessed &&
                row.values.completed === row.values.total,
            ).length,
          },
          {
            key: "notAssessed",
            label: "不测评人次",
            value: rows.filter((row) => row.values.notAssessed).length,
          },
          {
            key: "pending",
            label: "待确认结果",
            value: rows.filter((row) => row.values.ready).length,
          },
          {
            key: "rate",
            label: "处理完成率",
            unit: "%",
            value: rows.length
              ? Math.round(
                  (rows.filter((row) => row.values.handled).length /
                    rows.length) *
                    10000,
                ) / 100
              : null,
          },
        ],
        columns: [
          { key: "task", label: "任务" },
          { key: "student", label: "学员" },
          { key: "team", label: "队伍" },
          { key: "completed", label: "已录项目" },
          { key: "total", label: "必测项目" },
          { key: "notAssessed", label: "不测评" },
          { key: "published", label: "当前修订已确认" },
          { key: "revision", label: "当前修订" },
          { key: "templateVersionId", label: "固定模板版本" },
        ],
        rows,
        notes: [
          "处理完成包括录齐必测项目或明确不测评；不测评与实际已测分开。待确认按学员当前修订统计，不测評不产生分值。",
          "日期筛选按任务周期交集；缺模板的历史任务不参与完成率。",
        ],
      };
    }
    const assessments = await this.store.listPlayerAssessments(actor.clubId),
      currentIds = new Set<string>();
    for (const assessment of assessments) {
      if (!assessment.assessmentTaskId) {
        currentIds.add(assessment.id);
        continue;
      }
      const state = this.store.assessmentWorkflow.get(
        actor.clubId,
        assessment.assessmentTaskId,
        assessment.studentId,
      );
      const fallback = assessments
        .filter(
          (row) =>
            row.assessmentTaskId === assessment.assessmentTaskId &&
            row.studentId === assessment.studentId,
        )
        .sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
        )[0];
      if (
        (state?.publications.at(-1)?.assessmentId ?? fallback?.id) ===
        assessment.id
      )
        currentIds.add(assessment.id);
    }
    const selected = assessments.filter(
        (assessment) =>
          currentIds.has(assessment.id) &&
          inDate(assessment.assessedAt) &&
          (!filters.studentId || assessment.studentId === filters.studentId) &&
          (!filters.teamId ||
            this.store.repositories.assessmentTasks
              .listByClub(actor.clubId)
              .find((task) => task.id === assessment.assessmentTaskId)
              ?.teamId === filters.teamId ||
            events.find((event) => event.id === assessment.eventId)
              ?.primaryTeamId === filters.teamId),
      ),
      byId = new Map(selected.map((assessment) => [assessment.id, assessment])),
      lineages = new Map(
        this.store.repositories.assessments
          .listMetricLineages(actor.clubId)
          .map((lineage) => [lineage.outputRecordId, lineage]),
      ),
      metrics = this.store.listAbilityMetrics(actor.clubId);
    const rows = this.store
      .listMetricRecords(actor.clubId)
      .filter(
        (record) =>
          record.assessmentId &&
          byId.has(record.assessmentId) &&
          (!filters.metricId || record.metricId === filters.metricId) &&
          ["assessment", "algorithm"].includes(record.source),
      )
      .map((record) => {
        const assessment = byId.get(record.assessmentId!)!,
          metric = metrics.find((metric) => metric.id === record.metricId),
          lineage = lineages.get(record.id);
        return {
          id: record.id,
          values: {
            student: studentName(record.studentId),
            studentId: record.studentId,
            metric: metric?.name ?? record.metricId,
            metricId: record.metricId,
            value: getNumericMetricValue(record.value),
            unit:
              record.value.kind === "measurement"
                ? record.value.unit
                : (metric?.unit ?? record.value.kind),
            date: assessment.assessedAt,
            assessmentId: assessment.id,
            taskId: assessment.assessmentTaskId ?? null,
            templateVersionId:
              record.templateVersionId ??
              assessment.templateVersionId ??
              "历史版本不完整",
            source: record.source === "algorithm" ? "模型计算" : "测评原子分值",
            formulaVersion: lineage
              ? `${lineage.definitionId} · ${lineage.definitionVersion}`
              : null,
            inputRecords: lineage?.inputRecordIds.join("、") ?? null,
          },
        };
      });
    return {
      cards: [
        { key: "assessments", label: "有效已确认测评", value: selected.length },
        {
          key: "students",
          label: "有已确认结果的学员",
          value: new Set(selected.map((a) => a.studentId)).size,
        },
        {
          key: "values",
          label: "有效分值记录",
          value: rows.filter((row) => row.values.value !== null).length,
        },
        {
          key: "missing",
          label: "非数值记录",
          value: rows.filter((row) => row.values.value === null).length,
        },
      ],
      columns: [
        { key: "student", label: "学员" },
        { key: "metric", label: "指标" },
        { key: "value", label: "值" },
        { key: "unit", label: "单位" },
        { key: "date", label: "实际测评时间" },
        { key: "templateVersionId", label: "固定模板版本" },
        { key: "source", label: "来源" },
        { key: "formulaVersion", label: "计算公式版本" },
        { key: "inputRecords", label: "输入记录" },
      ],
      rows,
      notes: [
        "只读取已确认事实，草稿不进入成长。一次任务更正后采用最近确认修订，按真实测评时间排序；未确认的更正不替换已确认结果。",
        "不同单位和模型版本分别展示，不混算平均分、排名或未提供依据的培养目标。",
      ],
    };
  }
  async create(
    actor: AuthContext,
    input: { topic: BiTopic; filters: BiFilters; requestId: string },
  ) {
    this.requireTopic(actor, input.topic);
    const repo = this.management.repository;
    return repo.transaction(async () => {
      this.requireTopic(actor, input.topic);
      const hash = digest({ action: "bi_snapshot", input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined)
        return this.repository.get(
          actor.clubId,
          (replay as { id: string }).id,
        )!;
      const data = await this.data(actor, input.topic, input.filters),
        snapshot = {
          id: `bi-${randomUUID()}`,
          clubId: actor.clubId,
          actorId: actor.user.id,
          topic: input.topic,
          filters: input.filters,
          data,
          factVersion: digest(data),
          createdAt: new Date().toISOString(),
        };
      this.repository.save(snapshot);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, {
        id: snapshot.id,
      });
      return snapshot;
    });
  }
  async get(actor: AuthContext, id: string) {
    this.require(actor);
    const snapshot = this.repository.get(actor.clubId, id);
    if (!snapshot) throw new BackofficeFault(404, "not_found");
    this.requireTopic(actor, snapshot.topic);
    const current = await this.management.repository.transaction(() =>
      this.data(actor, snapshot.topic, snapshot.filters),
    );
    return { ...snapshot, stale: digest(current) !== snapshot.factVersion };
  }
  async export(
    actor: AuthContext,
    id: string,
    input: { factVersion: string; requestId: string },
  ) {
    this.require(actor);
    if (!this.management.has(actor, "export"))
      throw new BackofficeFault(403, "export_authorization_required");
    const snapshot = this.repository.get(actor.clubId, id);
    if (!snapshot) throw new BackofficeFault(404, "not_found");
    this.requireTopic(actor, snapshot.topic);
    if (input.factVersion !== snapshot.factVersion)
      throw new BackofficeFault(409, "export_snapshot_changed");
    await this.management.repository.transaction(async () => {
      this.requireTopic(actor, snapshot.topic);
      if (!this.management.has(actor, "export"))
        throw new BackofficeFault(403, "export_authorization_required");
      const hash = digest({ action: "bi_export", id, input }),
        repo = this.management.repository;
      if (
        repo.replay(actor.clubId, actor.user.id, input.requestId, hash) ===
        undefined
      ) {
        repo.audit(
          actor.clubId,
          "bi-exports",
          id,
          actor.user.id,
          "export",
          undefined,
          {
            topic: snapshot.topic,
            filters: JSON.stringify(snapshot.filters),
            factVersion: snapshot.factVersion,
          },
          input.requestId,
        );
        repo.remember(actor.clubId, actor.user.id, input.requestId, hash, {
          id,
        });
      }
    });
    const book = new ExcelJS.Workbook(),
      cards = book.addWorksheet("指标");
    cards.addRow(["指标", "值", "单位"]);
    snapshot.data.cards.forEach((card) =>
      cards.addRow([card.label, card.value ?? "不适用", card.unit ?? ""]),
    );
    const detail = book.addWorksheet("明细");
    detail.addRow([
      "记录ID",
      ...snapshot.data.columns.map((column) => column.label),
    ]);
    snapshot.data.rows.forEach((row) =>
      detail.addRow([
        row.id,
        ...snapshot.data.columns.map((column) => row.values[column.key]),
      ]),
    );
    const meta = book.addWorksheet("口径与版本");
    meta.addRow(["俱乐部", actor.clubId]);
    meta.addRow(["主题", snapshot.topic]);
    meta.addRow(["统计快照时间", snapshot.createdAt]);
    meta.addRow(["事实版本", snapshot.factVersion]);
    Object.entries(snapshot.filters).forEach(([key, value]) =>
      meta.addRow([key, value]),
    );
    snapshot.data.notes.forEach((note) => meta.addRow(["口径", note]));
    return {
      fileName: `${snapshot.topic}-${snapshot.id}.xlsx`,
      contentBase64: Buffer.from(await book.xlsx.writeBuffer()).toString(
        "base64",
      ),
      factVersion: snapshot.factVersion,
    };
  }
}
