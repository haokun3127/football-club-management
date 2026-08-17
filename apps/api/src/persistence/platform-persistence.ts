import type { DatabaseSync } from "node:sqlite";
import { createSeedData, type SeedData } from "../seed.js";
import { AppClientSessionRepository } from "./app-client-session-repository.js";
import { AssessmentRepository } from "./assessment-repositories.js";
import { AssessmentTaskRepository } from "./assessment-task-repository.js";
import { CalendarRepository } from "./calendar-repositories.js";
import { DataCapabilityRepository } from "./data-capability-repositories.js";
import { MatchRepository } from "./match-repository.js";
import {
  ClubRepository,
  ClubUserMembershipRepository,
  CoachProfileRepository,
  ParentProfileRepository,
  StudentGuardianBindingRepository,
  StudentProfileRepository,
  TeamMemberRepository,
  TeamRepository,
  UserAccountRepository,
} from "./platform-repositories.js";
import { migrate, openSqliteDatabase } from "./sqlite.js";
import { TacticalBoardRepository } from "./tactical-board-repository.js";

export interface PlatformRepositories {
  appClientSessions: AppClientSessionRepository;
  assessments: AssessmentRepository;
  assessmentTasks: AssessmentTaskRepository;
  calendar: CalendarRepository;
  matches: MatchRepository;
  clubs: ClubRepository;
  users: UserAccountRepository;
  memberships: ClubUserMembershipRepository;
  parents: ParentProfileRepository;
  guardianBindings: StudentGuardianBindingRepository;
  students: StudentProfileRepository;
  coaches: CoachProfileRepository;
  teams: TeamRepository;
  teamMembers: TeamMemberRepository;
  dataCapability: DataCapabilityRepository;
  tacticalBoards: TacticalBoardRepository;
}

export interface PlatformPersistence {
  database: DatabaseSync;
  repositories: PlatformRepositories;
}

export function createPlatformRepositories(database: DatabaseSync): PlatformRepositories {
  return {
    appClientSessions: new AppClientSessionRepository(database),
    assessments: new AssessmentRepository(database),
    assessmentTasks: new AssessmentTaskRepository(database),
    calendar: new CalendarRepository(database),
    matches: new MatchRepository(database),
    clubs: new ClubRepository(database),
    users: new UserAccountRepository(database),
    memberships: new ClubUserMembershipRepository(database),
    parents: new ParentProfileRepository(database),
    guardianBindings: new StudentGuardianBindingRepository(database),
    students: new StudentProfileRepository(database),
    coaches: new CoachProfileRepository(database),
    teams: new TeamRepository(database),
    teamMembers: new TeamMemberRepository(database),
    dataCapability: new DataCapabilityRepository(database),
    tacticalBoards: new TacticalBoardRepository(database),
  };
}

export async function seedPlatformData(repositories: PlatformRepositories, data: SeedData = createSeedData()): Promise<void> {
  for (const club of data.clubs) {
    await repositories.clubs.save(club);
  }

  for (const user of data.users) {
    const existing = await repositories.users.getById(user.id);
    await repositories.users.save({
      ...user,
      phone: existing?.phone || user.phone,
    });
  }

  for (const membership of data.clubMemberships) {
    await repositories.memberships.save(membership);
  }

  for (const parent of data.parents) {
    const existing = await repositories.parents.getByClubAndId(parent.clubId, parent.id);
    await repositories.parents.save({
      ...parent,
      phone: existing?.phone || parent.phone,
    });
  }

  for (const student of data.students) {
    await repositories.students.save(student);
  }

  for (const guardianBinding of data.guardianBindings) {
    await repositories.guardianBindings.save(guardianBinding);
  }

  for (const coach of data.coaches) {
    await repositories.coaches.save(coach);
  }

  for (const team of data.teams) {
    await repositories.teams.save(team);
  }

  for (const teamMember of data.teamMembers) {
    await repositories.teamMembers.save(teamMember);
  }

  for (const event of data.events) {
    repositories.calendar.insertEventIfAbsent(event);
  }

  for (const participant of data.participants) {
    repositories.calendar.insertParticipantIfAbsent(participant);
  }

  for (const match of data.matches) {
    repositories.matches.insertMatchIfAbsent(match);
  }

  for (const matchEvent of data.matchEvents) {
    repositories.matches.insertEventIfAbsent(matchEvent);
  }

  for (const request of data.privateLessonRequests) {
    repositories.dataCapability.savePrivateLessonRequest(request);
  }

  for (const request of data.eventChangeRequests) {
    repositories.dataCapability.saveEventChangeRequest(request);
  }

  for (const metric of data.metrics) {
    repositories.dataCapability.saveAbilityMetric(metric);
  }

  for (const definition of data.derivedMetricDefinitions) {
    repositories.assessments.insertDerivedMetricDefinitionIfAbsent(definition);
  }

  for (const metricGraphVersion of data.metricGraphVersions) {
    repositories.dataCapability.saveMetricGraphVersion(metricGraphVersion);
  }

  for (const assessmentTemplate of data.assessmentTemplates) {
    repositories.dataCapability.saveAssessmentTemplate(assessmentTemplate);
  }

  for (const metricDependency of data.metricDependencies) {
    repositories.dataCapability.saveMetricDependency(metricDependency);
  }

  for (const metricView of data.metricViews) {
    repositories.dataCapability.saveMetricView(metricView);
  }

  for (const metricViewNode of data.metricViewNodes) {
    repositories.dataCapability.saveMetricViewNode(metricViewNode);
  }

  for (const assessmentTemplateVersion of data.assessmentTemplateVersions) {
    repositories.dataCapability.saveAssessmentTemplateVersion(assessmentTemplateVersion);
  }

  for (const assessmentTestItem of data.assessmentTestItems) {
    repositories.dataCapability.saveAssessmentTestItem(assessmentTestItem);
  }

  for (const assessmentMetricBinding of data.assessmentMetricBindings) {
    repositories.dataCapability.saveAssessmentMetricBinding(assessmentMetricBinding);
  }

  for (const assessmentTask of data.assessmentTasks) {
    repositories.assessmentTasks.insertIfAbsent(assessmentTask);
  }

  for (const assessment of data.playerAssessments) {
    repositories.assessments.insertAssessmentIfAbsent(assessment);
  }

  for (const rawResult of data.assessmentRawResults) {
    repositories.assessments.insertRawResultIfAbsent(rawResult);
  }

  for (const score of data.assessmentScores) {
    repositories.assessments.insertScoreIfAbsent(score);
  }

  for (const metricRecord of data.metricRecords) {
    if (metricRecord.source === "match_event") {
      repositories.matches.insertMetricRecordIfAbsent(metricRecord);
    } else {
      repositories.assessments.insertMetricRecordIfAbsent(metricRecord);
    }
  }

  for (const lineage of data.metricLineages) {
    repositories.assessments.insertMetricLineageIfAbsent(lineage);
  }

  for (const connection of data.externalConnections) {
    repositories.dataCapability.saveExternalConnection(connection);
  }

  for (const appClient of data.appClients) {
    repositories.dataCapability.saveClubAppClient(appClient);
  }

  for (const tableMapping of data.externalTableMappings) {
    repositories.dataCapability.saveExternalTableMapping(tableMapping);
  }

  for (const fieldMapping of data.externalFieldMappings) {
    repositories.dataCapability.saveExternalFieldMapping(fieldMapping);
  }

  for (const syncPolicy of data.externalSyncPolicies) {
    repositories.dataCapability.saveExternalSyncPolicy(syncPolicy);
  }

  for (const syncRun of data.externalSyncRuns) {
    repositories.dataCapability.saveExternalSyncRun(syncRun);
  }

  for (const rawRecord of data.externalRawRecords) {
    repositories.dataCapability.saveExternalRawRecord(rawRecord);
  }

  for (const link of data.externalRecordLinks) {
    repositories.dataCapability.confirmExternalRecord(link.clubId, link.rawRecordId, {
      targetType: link.targetType,
      targetId: link.targetId,
      confirmedBy: link.confirmedBy,
    }, {
      linkId: link.id,
      now: link.confirmedAt,
    });
  }

  for (const privacyFieldPolicy of data.privacyFieldPolicies) {
    repositories.dataCapability.savePrivacyFieldPolicy(privacyFieldPolicy);
  }

  for (const privacyNoticeVersion of data.privacyNoticeVersions) {
    repositories.dataCapability.savePrivacyNoticeVersion(privacyNoticeVersion);
  }

  for (const privacyRetentionPolicy of data.privacyRetentionPolicies) {
    repositories.dataCapability.savePrivacyRetentionPolicy(privacyRetentionPolicy);
  }

  for (const studentConsentRecord of data.studentConsentRecords) {
    repositories.dataCapability.saveStudentConsentRecord(studentConsentRecord);
  }
}

export async function createPlatformPersistence(options: {
  databasePath?: string;
  seed?: boolean;
  seedData?: SeedData;
} = {}): Promise<PlatformPersistence> {
  const database = openSqliteDatabase(options.databasePath);
  migrate(database);

  const repositories = createPlatformRepositories(database);

  if (options.seed ?? true) {
    await seedPlatformData(repositories, options.seedData);
  }

  return {
    database,
    repositories,
  };
}
