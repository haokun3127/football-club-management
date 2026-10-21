import {resolveAvailableAppRoles} from "../auth/app-roles.js";
import { validateBackofficeValues } from "./backoffice-value-validation.js";
import { AssessmentMappingRepository } from "../persistence/assessment-mapping-repository.js";
import type { AuthContext } from "../auth/context.js";
import {
  backofficeResources,
  resourceByKey,
  type BackofficeResource,
} from "./backoffice-resources.js";
import {
  BackofficeFault,
  digest,
  type BackofficeRecord,
  type BackofficeValues,
} from "../persistence/backoffice-management-repository.js";
import type { PersistentApiStore } from "../store.js";
export interface SaveBackofficeInput {
  values: BackofficeValues;
  expectedRevision: string | null;
  requestId: string;
}
export class BackofficeManagement {
  constructor(readonly store: PersistentApiStore) {}
  get repository() {
    return this.store.repositories.backofficeManagement;
  }
  admin(auth: AuthContext): boolean {
    return auth.membership.roles.some(
      (role) => role === "owner" || role === "admin",
    );
  }
  has(auth: AuthContext, capability: string): boolean {
    return this.repository
      .grants(auth.clubId, auth.user.id)
      .includes(capability);
  }
  allow(
    auth: AuthContext,
    resource: BackofficeResource,
    write = false,
  ): boolean {
    return (
      (!resource.adminOnly || this.admin(auth)) &&
      (!resource.grant || this.has(auth, resource.grant)) &&
      (resource.key !== "scout-work" || this.has(auth, "sensitive")) &&
      (!write || this.admin(auth))
    );
  }
  require(auth: AuthContext, resource: BackofficeResource, write = false) {
    if (!this.allow(auth, resource, write))
      throw new BackofficeFault(403, "permission_denied");
  }
  fields(auth: AuthContext, resource: BackofficeResource) {
    return resource.fields.filter(
      (field) => !field.sensitive || this.has(auth, "sensitive"),
    );
  }
  projection(
    auth: AuthContext,
    resource: BackofficeResource,
    row: BackofficeRecord,
  ): BackofficeRecord {
    const values = Object.fromEntries(
      this.fields(auth, resource).map((field) => [
        field.key,
        row.values[field.key] ?? null,
      ]),
    );
    return { ...row, values };
  }
  async records(
    resource: BackofficeResource,
    clubId: string,
  ): Promise<BackofficeRecord[]> {
    let rows = this.repository.list(resource, clubId);
    if (resource.key === "events") {
      const sessions =
          this.store.repositories.trainingSessions.listByClub(clubId),
        matches = this.store.repositories.matches.listMatches(clubId);
      rows = rows.map((row) => {
        const session = sessions.find((s) => s.eventId === row.id),
          match = matches.find((m) => m.eventId === row.id);
        const values = {
          ...row.values,
          kind: session?.kind ?? null,
          sessionPlanId: session?.sessionPlanId ?? null,
          intensity: session?.intensity ?? null,
          matchType: match?.matchType ?? null,
          opponentName: match?.opponentName ?? null,
          ageGroup: match?.ageGroup ?? null,
          competitionFormat: match?.competitionFormat ?? null,
        };
        return {
          ...row,
          values,
          revision: digest({ base: row.revision, session, match }),
        };
      });
    }
    if (resource.key === "students") {
      const scoutOnly = new Set(
        this.store.scoutPlayers
          .list(clubId)
          .filter((row) => row.status === "active")
          .map((row) => row.id),
      );
      rows = rows.filter((row) => !scoutOnly.has(row.id));
    }
    if (["venues", "articles", "drills", "metrics"].includes(resource.key)) {
      const seed =
        resource.key === "venues"
          ? await this.store.listVenues(clubId)
          : resource.key === "articles"
            ? await this.store.listContentArticles(clubId)
            : resource.key === "metrics"
              ? this.store.listAbilityMetrics(clubId)
              : this.store.listTrainingDrills(clubId);
      const existing = new Set(rows.map((row) => row.id));
      for (const item of seed)
        if (!existing.has(item.id)) {
          const value = item as unknown as Record<string, unknown>;
          const values: BackofficeValues = Object.fromEntries(
            resource.fields.map((field) => [
              field.key,
              value[field.key] ??
                (field.key === "status"
                  ? resource.key === "articles"
                    ? "published"
                    : "active"
                  : field.kind === "tags" || field.multiple
                    ? []
                    : null),
            ]),
          ) as BackofficeValues;
          rows.push({
            id: item.id,
            values,
            updatedAt:
              typeof value.updatedAt === "string" ? value.updatedAt : "",
            revision: digest(values),
            ...(["drills", "metrics"].includes(resource.key) &&
            (value.catalogScope as { scope?: string })?.scope === "system"
              ? { readOnly: true }
              : {}),
          });
        }
    }
    if (resource.appendOnly)
      rows = rows.map((row) => ({ ...row, readOnly: true }));
    return rows;
  }
  async options(auth: AuthContext, key: string) {
    if (key === "scout-players") {
      if (!this.has(auth, "service") || !this.has(auth, "sensitive"))
        throw new BackofficeFault(403, "permission_denied");
      return this.store.scoutPlayers.list(auth.clubId).map((row) => ({
        value: row.id,
        label: `${row.name} · ${row.maskedDocument}`,
      }));
    }
    if (key === "assessment-tasks") {
      if (!this.has(auth, "service"))
        throw new BackofficeFault(403, "permission_denied");
      return this.store.repositories.assessmentTasks
        .listByClub(auth.clubId)
        .map((row) => ({ value: row.id, label: row.title }));
    }
    if (key === "plans")
      return this.store.repositories.sessionPlans
        .listByClub(auth.clubId)
        .filter((row) => row.status !== "inactive")
        .map((row) => ({ value: row.id, label: row.name }));
    if(key === "app-clients")return (await this.store.listClubAppClients(auth.clubId)).filter(client=>client.status==="active" && client.channel==="wechat_miniprogram").map(client=>({value:client.id,label:client.name}));
    if (key === "accounts")
      return this.repository
        .accounts(auth.clubId)
        .filter((row) => row.status === "active")
        .map((row) => ({ value: row.id, label: row.name }));
    if (key === "objectives")
      return this.store
        .listTrainingObjectives(auth.clubId)
        .map((row) => ({ value: row.id, label: row.name }));
    if (key === "dimensions")
      return this.store
        .listDevelopmentDimensions(auth.clubId)
        .map((row) => ({ value: row.id, label: row.name }));
    if (key === "metrics")
      return this.store
        .listAbilityMetrics(auth.clubId)
        .filter((row) => row.status !== "inactive")
        .map((row) => ({ value: row.id, label: row.name }));
    const resource = resourceByKey(key);
    if (!resource) throw new BackofficeFault(404, "not_found");
    this.require(auth, resource);
    return (await this.records(resource, auth.clubId))
      .filter(
        (row) => !["inactive", "cancelled"].includes(String(row.values.status)),
      )
      .map((row) => ({
        value: row.id,
        label: String(row.values.name ?? row.values.title ?? row.id),
      }));
  }
  async list(
    auth: AuthContext,
    resource: BackofficeResource,
    query: { search?: string; offset?: number },
  ) {
    this.require(auth, resource);
    const search = (query.search ?? "").trim().toLocaleLowerCase();
    const all = (await this.records(resource, auth.clubId))
      .map((row) => this.projection(auth, resource, row))
      .filter((row) =>
        [row.id, ...Object.values(row.values)].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(search),
        ),
      );
    return {
      resource: resource.key,
      title: resource.title,
      fields: this.fields(auth, resource),
      canWrite: this.allow(auth, resource, true),
      canCreate: !resource.singleton && this.allow(auth, resource, true),
      canExport: this.has(auth, "export"),
      rows: all.slice(query.offset ?? 0, (query.offset ?? 0) + 20),
      total: all.length,
      pageSize: 20,
      offset: query.offset ?? 0,
      snapshot: digest(all),
    };
  }
  async detail(auth: AuthContext, resource: BackofficeResource, id: string) {
    this.require(auth, resource);
    const row = (await this.records(resource, auth.clubId)).find(
      (record) => record.id === id,
    );
    if (!row) throw new BackofficeFault(404, "not_found");
    const fields = new Set(
      this.fields(auth, resource).map((field) => field.key),
    );
    const trim = (value: BackofficeValues | null) =>
      value
        ? Object.fromEntries(
            Object.entries(value).filter(([key]) => fields.has(key)),
          )
        : null;
    return {
      record: this.projection(auth, resource, row),
      history: this.repository
        .history(auth.clubId, resource.key, id)
        .map((item) => ({
          ...item,
          before: trim(item.before),
          after: trim(item.after),
        })),
    };
  }
  async validate(
    auth: AuthContext,
    resource: BackofficeResource,
    values: BackofficeValues,
    previous?: BackofficeRecord,
  ) {
    validateBackofficeValues(resource, values);
    for (const key of ["logoUrl", "imageUrl", "backgroundUrl"])
      if (values[key]) {
        try {
          const url = new URL(String(values[key]), "https://club.invalid");
          if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            String(values[key]).startsWith("//")
          )
            throw new Error("url");
        } catch {
          throw new BackofficeFault(400, "invalid_image_url");
        }
      }
    if (resource.key === "branding") {
      if (
        values.primaryColor &&
        !/^#[0-9a-fA-F]{6}$/.test(String(values.primaryColor))
      )
        throw new BackofficeFault(400, "invalid_theme_color");
      if (
        values.status === "active" &&
        this.repository
          .list(resource, auth.clubId)
          .some(
            (row) => row.id !== previous?.id && row.values.status === "active",
          )
      )
        throw new BackofficeFault(409, "active_theme_exists");
    }
    if (
      ["banners", "optional-features"].includes(resource.key) &&
      !Number.isInteger(values.sortOrder)
    )
      throw new BackofficeFault(400, "invalid_sort_order");
    if (
      resource.key === "optional-features" &&
      this.repository
        .list(resource, auth.clubId)
        .some((row) => row.id !== previous?.id && row.values.key === values.key)
    )
      throw new BackofficeFault(409, "feature_entry_exists");
    const definitionChanged =
      previous &&
      resource.fields.some((field) => {
        if (field.key === "status") return false;
        const normalize = (value: unknown) =>
          value ?? (field.multiple || field.kind === "tags" ? [] : null);
        return (
          JSON.stringify(normalize(values[field.key])) !==
          JSON.stringify(normalize(previous.values[field.key]))
        );
      });
    for (const field of resource.fields) {
      if (
        field.appliesTo &&
        field.appliesTo !== values.type &&
        values[field.key]
      )
        throw new BackofficeFault(400, "invalid_event_extension");
      if (
        field.sensitive &&
        field.key in values &&
        !this.has(auth, "sensitive") &&
        values[field.key] !== previous?.values[field.key]
      )
        throw new BackofficeFault(403, "permission_denied");
      if (
        field.reference &&
        values[field.key] &&
        JSON.stringify(values[field.key]) !==
          JSON.stringify(previous?.values[field.key])
      ) {
        const available = new Set(
          (await this.options(auth, field.reference)).map((row) => row.value),
        );
        for (const id of field.multiple
          ? (values[field.key] as string[])
          : [String(values[field.key])])
          if (!available.has(id))
            throw new BackofficeFault(400, "invalid_reference");
      }
    }
    if (
      resource.key === "consultations" &&
      values.status === "confirmed" &&
      (!values.responsibleCoachId ||
        !String(values.acceptanceEvidence ?? "").trim())
    )
      throw new BackofficeFault(400, "explicit_acceptance_required");
    if (resource.key === "service-cases") {
      const service = this.repository
        .list(resourceByKey("service-catalog")!, auth.clubId)
        .find((row) => row.id === values.serviceId);
      if (
        service?.values.type === "private" ||
        service?.values.type === "scout"
      )
        throw new BackofficeFault(400, "use_dedicated_service_workflow");
      if (
        ["accepted", "executing", "delivered"].includes(
          String(values.status),
        ) &&
        (!values.responsibleCoachId ||
          !String(values.acceptanceEvidence ?? "").trim())
      )
        throw new BackofficeFault(400, "explicit_acceptance_required");
      if (
        values.status === "delivered" &&
        !String(values.delivery ?? "").trim()
      )
        throw new BackofficeFault(400, "delivery_feedback_required");
    }
    if (
      ["consultations", "service-cases"].includes(resource.key) &&
      values.eventId &&
      (values.eventId !== previous?.values.eventId ||
        values.studentId !== previous?.values.studentId)
    ) {
      if (
        !this.store
          .listEventParticipants(auth.clubId)
          .some(
            (person) =>
              person.eventId === values.eventId &&
              person.studentId === values.studentId,
          )
      )
        throw new BackofficeFault(400, "service_event_student_mismatch");
    }
    if (
      resource.key === "service-cases" &&
      values.assessmentTaskId &&
      (values.assessmentTaskId !== previous?.values.assessmentTaskId ||
        values.studentId !== previous?.values.studentId)
    ) {
      const task = this.store.repositories.assessmentTasks
        .listByClub(auth.clubId)
        .find((task) => task.id === values.assessmentTaskId);
      const roster =
        task?.studentIds ??
        this.store
          .listTeamMembers(auth.clubId)
          .filter(
            (member) =>
              member.teamId === task?.teamId && member.status === "active",
          )
          .map((member) => member.studentId);
      if (!roster.includes(String(values.studentId)))
        throw new BackofficeFault(400, "service_task_student_mismatch");
    }
    if (resource.key === "consultations" && values.serviceId) {
      const service = this.repository
        .list(resourceByKey("service-catalog")!, auth.clubId)
        .find((row) => row.id === values.serviceId);
      if (service?.values.type !== "private")
        throw new BackofficeFault(400, "invalid_service_type");
    }
    if (resource.key === "scout-work" && values.eventId) {
      const participant = this.store
        .listEventParticipants(auth.clubId)
        .some(
          (row) =>
            row.eventId === values.eventId &&
            row.studentId === values.scoutPlayerId,
        );
      if (!participant)
        throw new BackofficeFault(400, "scout_event_participation_required");
    }
    if (
      resource.key === "events" &&
      !(values.type === "training"
        ? values.kind
        : values.type === "match"
          ? values.matchType
          : true)
    )
      throw new BackofficeFault(400, "event_extension_required");
    if (
      resource.key === "members" &&
      values.isPrimaryTeam &&
      values.status === "active"
    ) {
      if (
        this.repository
          .list(resource, auth.clubId)
          .some(
            (row) =>
              row.id !== previous?.id &&
              row.values.studentId === values.studentId &&
              row.values.isPrimaryTeam &&
              row.values.status === "active",
          )
      )
        throw new BackofficeFault(409, "primary_team_exists");
    }
    if (resource.key === "club") {
      try {
        new Intl.DateTimeFormat(String(values.locale), {
          timeZone: String(values.timezone),
        });
      } catch {
        throw new BackofficeFault(400, "invalid_club_locale");
      }
    }
    if (
      values.birthDate &&
      String(values.birthDate) > new Date().toISOString().slice(0, 10)
    )
      throw new BackofficeFault(400, "invalid_birth_date");
    const from = values.startsAt ?? values.startsOn,
      to = values.endsAt ?? values.endsOn;
    if (from && to && Date.parse(String(to)) <= Date.parse(String(from)))
      throw new BackofficeFault(400, "invalid_time_range");
    if (
      resource.key === "venues" &&
      (values.latitude == null) !== (values.longitude == null)
    )
      throw new BackofficeFault(400, "coordinate_pair_required");
    if (
      resource.key === "events" &&
      previous &&
      values.type !== previous.values.type
    )
      throw new BackofficeFault(400, "event_type_immutable");
    if (
      resource.key === "articles" &&
      values.status === "published" &&
      !values.publishedAt
    )
      throw new BackofficeFault(400, "publication_date_required");
    if (
      (resource.key === "coaches" || resource.key === "parents") &&
      this.repository
        .list(resource, auth.clubId)
        .some(
          (row) =>
            row.id !== previous?.id && row.values.userId === values.userId,
        )
    )
      throw new BackofficeFault(409, "profile_account_exists");
    if (
      resource.key === "drills" &&
      previous &&
      definitionChanged &&
      this.store.repositories.sessionPlans
        .listByClub(auth.clubId)
        .some((plan) =>
          plan.blocks.some((block) => block.drillId === previous.id),
        )
    )
      throw new BackofficeFault(409, "drill_in_use_copy_required");
    if (resource.key === "testitems") {
      if (values.precision != null && !Number.isInteger(values.precision))
        throw new BackofficeFault(400, "invalid_precision");
      if (
        values.minimumValue != null &&
        values.maximumValue != null &&
        Number(values.minimumValue) > Number(values.maximumValue)
      )
        throw new BackofficeFault(400, "invalid_value_range");
      const metric = this.store
        .listAbilityMetrics(auth.clubId)
        .find((metric) => metric.id === values.metricId);
      if (!metric || metric.metricKind !== "atomic")
        throw new BackofficeFault(400, "invalid_reference");
      if (values.valueKind === "measurement" && !values.unit)
        throw new BackofficeFault(400, "measurement_unit_required");
      if (
        previous &&
        definitionChanged &&
        (this.store.repositories.dataCapability
          .listAssessmentMetricBindings(auth.clubId)
          .some((binding) => binding.testItemId === previous.id) ||
          this.store.repositories.assessments
            .listRawResults(auth.clubId)
            .some((raw) => raw.testItemId === previous.id) ||
          new AssessmentMappingRepository(this.repository.database)
            .list(auth.clubId)
            .some((mapping) => mapping.testItemId === previous.id))
      )
        throw new BackofficeFault(409, "project_in_use_copy_required");
    }
    if (
      resource.key === "metrics" &&
      previous &&
      definitionChanged &&
      (this.store.repositories.dataCapability
        .listAssessmentTestItems(auth.clubId)
        .some((item) => item.metricId === previous.id) ||
        this.store.repositories.dataCapability
          .listMetricDependencies(auth.clubId)
          .some(
            (edge) =>
              edge.inputMetricId === previous.id ||
              edge.outputMetricId === previous.id,
          ) ||
        this.store
          .listMetricRecords(auth.clubId)
          .some((record) => record.metricId === previous.id))
    )
      throw new BackofficeFault(409, "metric_in_use_copy_required");
    if(resource.key === "app-role-preferences") {
      const userId=String(values.userId),clientId=String(values.appClientId);
      const membership=await this.store.repositories.memberships.findActiveByClubAndUser(auth.clubId,userId);
      const client=(await this.store.listClubAppClients(auth.clubId)).find(item=>item.id===clientId && item.status==="active");
      if(!membership || !client)throw new BackofficeFault(400,"invalid_reference");
      const role=values.defaultRole;
      if(role && (!resolveAvailableAppRoles(membership.roles,client).includes(role as "parent"|"coach") || (role==="parent" ? !this.store.listParents(auth.clubId).some(parent=>parent.userId===userId) : !this.store.listCoaches(auth.clubId).some(coach=>coach.userId===userId && coach.status==="active"))))throw new BackofficeFault(400,"invalid_role_default");
      if(previous && (previous.values.userId!==userId || previous.values.appClientId!==clientId))throw new BackofficeFault(400,"immutable_role_scope");
    }
    if (resource.key === "memberships") {
      if (
        previous?.values.userId === auth.user.id &&
        (values.status !== "active" ||
          !(values.roles as string[]).some((role) =>
            ["owner", "admin"].includes(role),
          ))
      )
        throw new BackofficeFault(400, "cannot_revoke_self");
      if (
        (values.roles as string[]).includes("owner") &&
        !auth.membership.roles.includes("owner") &&
        !(previous?.values.roles as string[] | undefined)?.includes("owner")
      )
        throw new BackofficeFault(403, "owner_role_required");
    }
  }
  async save(
    auth: AuthContext,
    resource: BackofficeResource,
    id: string | undefined,
    input: SaveBackofficeInput,
  ) {
    this.require(auth, resource, true);
    if (resource.singleton && !id)
      throw new BackofficeFault(403, "singleton_record");
    const result = await this.repository.transaction(() =>
      this.saveInTransaction(auth, resource, id, input),
    );
    this.store.refreshBackofficeFacts(auth.clubId);
    return result;
  }
  /** Caller must hold the shared SQLite transaction; used by typed import rows. */
  async saveInTransaction(
    auth: AuthContext,
    resource: BackofficeResource,
    id: string | undefined,
    input: SaveBackofficeInput,
  ) {
    this.require(auth, resource, true);
    if (resource.singleton && !id)
      throw new BackofficeFault(403, "singleton_record");
    if (
      !this.repository.activeAdmin(
        auth.clubId,
        auth.user.id,
        auth.membership.id,
      )
    )
      throw new BackofficeFault(401, "authentication_required");
    this.require(auth, resource, true);
    const hash = digest({ resource: resource.key, id, input });
    const replay = this.repository.replay(
      auth.clubId,
      auth.user.id,
      input.requestId,
      hash,
    );
    if (replay !== undefined)
      return this.projection(auth, resource, replay as BackofficeRecord);
    const previous = id
      ? (await this.records(resource, auth.clubId)).find((row) => row.id === id)
      : undefined;
    if (id && resource.appendOnly)
      throw new BackofficeFault(403, "append_only_record");
    if (id && !previous) throw new BackofficeFault(404, "not_found");
    if (previous?.readOnly)
      throw new BackofficeFault(403, "shared_catalog_read_only");
    if ((previous?.revision ?? null) !== input.expectedRevision)
      throw new BackofficeFault(
        409,
        "revision_conflict",
        previous
          ? { latest: this.projection(auth, resource, previous) }
          : undefined,
      );
    const values: BackofficeValues = { ...previous?.values, ...input.values };
    for (const field of resource.fields)
      if (
        (field.kind === "tags" || field.multiple) &&
        values[field.key] == null
      )
        values[field.key] = [];
    await this.validate(auth, resource, values, previous);
    for (const field of resource.fields)
      if (field.kind === "datetime" && values[field.key])
        values[field.key] = new Date(String(values[field.key])).toISOString();
    const recordId = id ?? this.repository.newId(resource.key),
      now = new Date().toISOString();
    const persisted = this.repository
      .list(resource, auth.clubId)
      .some((row) => row.id === recordId);
    if (resource.key === "credits") {
      const amount = Number(values.lessonDelta);
      if (
        (values.entryType === "credit" && amount <= 0) ||
        (values.entryType === "debit" && amount >= 0)
      )
        throw new BackofficeFault(400, "invalid_credit_direction");
      const current = this.store.repositories.dataCapability.getLessonLedger(
        auth.clubId,
        String(values.studentId),
      );
      values.balanceAfter =
        values.entryType === "external_snapshot"
          ? amount
          : (current?.balance ?? 0) + amount;
    }
    this.repository.save(
      resource,
      auth.clubId,
      recordId,
      values,
      now,
      !persisted,
      auth.user.id,
    );
    if (resource.key === "events") {
      if (values.type === "training") {
        const old = this.store.repositories.trainingSessions.getByEvent(
          auth.clubId,
          recordId,
        );
        this.store.repositories.trainingSessions.save({
          id: old?.id ?? this.repository.newId("session"),
          clubId: auth.clubId,
          eventId: recordId,
          kind: values.kind as "team" | "small_group" | "private" | "specialty",
          ...(values.sessionPlanId
            ? { sessionPlanId: String(values.sessionPlanId) }
            : {}),
          ...(values.intensity
            ? { intensity: values.intensity as "low" | "medium" | "high" }
            : {}),
          createdAt: old?.createdAt ?? now,
          updatedAt: now,
        });
      }
      if (values.type === "match") {
        const old = this.store.repositories.matches
          .listMatches(auth.clubId)
          .find((m) => m.eventId === recordId);
        this.store.repositories.matches.saveMatch({
          id: old?.id ?? this.repository.newId("match"),
          clubId: auth.clubId,
          eventId: recordId,
          matchType: values.matchType as
            "internal" | "friendly" | "league" | "cup",
          status: values.status as "scheduled" | "completed" | "cancelled",
          ...(values.opponentName
            ? { opponentName: String(values.opponentName) }
            : {}),
          ...(values.ageGroup ? { ageGroup: String(values.ageGroup) } : {}),
          ...(values.competitionFormat
            ? { competitionFormat: String(values.competitionFormat) }
            : {}),
          ...(old?.homeScore !== undefined ? { homeScore: old.homeScore } : {}),
          ...(old?.awayScore !== undefined ? { awayScore: old.awayScore } : {}),
          ...(old?.handbookUrl ? { handbookUrl: old.handbookUrl } : {}),
          createdAt: old?.createdAt ?? now,
          updatedAt: now,
        });
      }
    }
    const saved = (await this.records(resource, auth.clubId)).find(
      (row) => row.id === recordId,
    )!;
    this.repository.audit(
      auth.clubId,
      resource.key,
      recordId,
      auth.user.id,
      previous ? "update" : "create",
      previous?.values,
      saved.values,
      input.requestId,
      now,
    );
    const response = this.projection(auth, resource, saved);
    this.repository.remember(
      auth.clubId,
      auth.user.id,
      input.requestId,
      hash,
      response,
    );
    return response;
  }
  resources(auth: AuthContext) {
    return backofficeResources
      .filter((resource) => this.allow(auth, resource))
      .map((resource) => ({
        key: resource.key,
        title: resource.title,
        canWrite: this.allow(auth, resource, true),
      }));
  }
}
