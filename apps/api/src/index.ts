import { readIdentityKeyring } from "./application/scout-identity.js";
import { reconcileTrainingRecords, startTrainingRecordJob } from "./application/training-record-job.js";
import { transaction } from "./persistence/transaction.js";
import { readRuntimeConfig } from "./runtime/environment.js";
import { createEntrypointMembershipResolver } from "./auth/context.js";
import { createPlatformPersistence } from "./persistence/platform-persistence.js";
import { buildServer } from "./server.js";
import { PersistentApiStore } from "./store.js";
import { WechatApiIdentityConnector } from "./integrations/wechat-identity-connector.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const runtimeConfig = readRuntimeConfig();
const persistence = await createPlatformPersistence({
  runtimeConfig,
  identityKeyring: readIdentityKeyring(process.env.SCOUT_IDENTITY_KEYRING),
  seed: runtimeConfig.environment === "develop" && process.env.NODE_ENV === "development",
});
const store = new PersistentApiStore(persistence.repositories);
const membershipResolver = createEntrypointMembershipResolver(
  persistence.repositories.users,
  persistence.repositories.memberships,
  process.env,
);

const wechatIdentityConnector = WechatApiIdentityConnector.fromEnvironment();
const server = buildServer(store, { membershipResolver, wechatIdentityConnector, runtimeConfig });

let stopTrainingRecords: (()=>Promise<void>) | undefined;
server.addHook("onReady",async()=>{
  stopTrainingRecords=startTrainingRecordJob(()=>transaction(persistence.database,()=>reconcileTrainingRecords(store)),error=>server.log.error({err:error},"Automatic training record reconciliation failed; retry scheduled"));
});
server.addHook("onClose",async()=>{await stopTrainingRecords?.();persistence.database.close();});
await server.listen({ port, host });
