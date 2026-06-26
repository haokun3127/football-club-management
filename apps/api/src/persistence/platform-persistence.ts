import type { DatabaseSync } from "node:sqlite";
import { createSeedData, type SeedData } from "../seed.js";
import { DataCapabilityRepository } from "./data-capability-repositories.js";
import {
  ClubRepository,
  ClubUserMembershipRepository,
  CoachProfileRepository,
  ParentProfileRepository,
  StudentProfileRepository,
  TeamMemberRepository,
  TeamRepository,
  UserAccountRepository,
} from "./platform-repositories.js";
import { migrate, openSqliteDatabase } from "./sqlite.js";

export interface PlatformRepositories {
  clubs: ClubRepository;
  users: UserAccountRepository;
  memberships: ClubUserMembershipRepository;
  parents: ParentProfileRepository;
  students: StudentProfileRepository;
  coaches: CoachProfileRepository;
  teams: TeamRepository;
  teamMembers: TeamMemberRepository;
  dataCapability: DataCapabilityRepository;
}

export interface PlatformPersistence {
  database: DatabaseSync;
  repositories: PlatformRepositories;
}

export function createPlatformRepositories(database: DatabaseSync): PlatformRepositories {
  return {
    clubs: new ClubRepository(database),
    users: new UserAccountRepository(database),
    memberships: new ClubUserMembershipRepository(database),
    parents: new ParentProfileRepository(database),
    students: new StudentProfileRepository(database),
    coaches: new CoachProfileRepository(database),
    teams: new TeamRepository(database),
    teamMembers: new TeamMemberRepository(database),
    dataCapability: new DataCapabilityRepository(database),
  };
}

export async function seedPlatformData(repositories: PlatformRepositories, data: SeedData = createSeedData()): Promise<void> {
  for (const club of data.clubs) {
    await repositories.clubs.save(club);
  }

  for (const user of data.users) {
    await repositories.users.save(user);
  }

  for (const membership of data.clubMemberships) {
    await repositories.memberships.save(membership);
  }

  for (const parent of data.parents) {
    await repositories.parents.save(parent);
  }

  for (const student of data.students) {
    await repositories.students.save(student);
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

  for (const connection of data.externalConnections) {
    repositories.dataCapability.saveExternalConnection(connection);
  }

  for (const tableMapping of data.externalTableMappings) {
    repositories.dataCapability.saveExternalTableMapping(tableMapping);
  }

  for (const fieldMapping of data.externalFieldMappings) {
    repositories.dataCapability.saveExternalFieldMapping(fieldMapping);
  }

  for (const syncRun of data.externalSyncRuns) {
    repositories.dataCapability.saveExternalSyncRun(syncRun);
  }

  for (const rawRecord of data.externalRawRecords) {
    repositories.dataCapability.saveExternalRawRecord(rawRecord);
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
