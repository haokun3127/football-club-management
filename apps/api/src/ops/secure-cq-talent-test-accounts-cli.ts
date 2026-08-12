import { migrate, openSqliteDatabase } from "../persistence/sqlite.js";
import { rollbackSecureCqTalentTestAccounts } from "./rollback-secure-cq-talent-test-accounts.js";
import {
  importSecureCqTalentTestAccounts,
  readSecureCqTalentTestAccountPhones,
} from "./secure-cq-talent-test-accounts.js";

const confirmationFlag = "--confirm-secure-cq-talent-test-accounts";

export interface SecureCqTalentTestAccountCommandResult {
  operation: "import" | "rollback";
  status: "dry_run" | "imported" | "already_present" | "rolled_back";
  accountCount: number;
}

export function runSecureCqTalentTestAccountCommand(
  argumentsList: readonly string[],
  environment: Record<string, string | undefined>,
): SecureCqTalentTestAccountCommandResult {
  const [operation, ...flags] = argumentsList;
  const databasePath = environment.DATABASE_URL;
  if (!databasePath || databasePath === ":memory:") {
    throw new Error("A file DATABASE_URL is required for secure test-account operations.");
  }
  if (operation !== "import" && operation !== "rollback") {
    throw new Error("Expected secure test-account operation: import or rollback.");
  }

  const isDryRun = operation === "import" && flags.length === 1 && flags[0] === "--dry-run";
  const isConfirmed = flags.length === 1 && flags[0] === confirmationFlag;
  if (!isDryRun && !isConfirmed) {
    throw new Error("Confirmation flag is required for this secure test-account operation.");
  }
  if (operation === "import" && isConfirmed && environment.SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED !== "1") {
    throw new Error("Backup attestation is required before a confirmed secure test-account import.");
  }

  const phones = readSecureCqTalentTestAccountPhones(environment);
  const database = openSqliteDatabase(databasePath);
  try {
    if (operation === "import") {
      if (!isDryRun) migrate(database);
      const result = importSecureCqTalentTestAccounts(database, { phones, dryRun: isDryRun });
      return {
        operation,
        status: result.status,
        accountCount: result.manifest.accountIds.length,
      };
    }

    migrate(database);
    const imported = importSecureCqTalentTestAccounts(database, { phones, dryRun: true });
    if (imported.status !== "already_present") {
      throw new Error("No complete secure test-account installation is available for rollback.");
    }
    const result = rollbackSecureCqTalentTestAccounts(database, {
      ...imported.manifest,
      sideEffects: {},
    });
    return {
      operation,
      status: result.status,
      accountCount: result.accountCount,
    };
  } finally {
    database.close();
  }
}
