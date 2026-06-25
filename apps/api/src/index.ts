import { HeaderMembershipResolver } from "./auth/context.js";
import { createPlatformPersistence } from "./persistence/platform-persistence.js";
import { buildServer } from "./server.js";
import { PersistentApiStore } from "./store.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const databasePath = process.env.DATABASE_URL ?? "apps/api/data/dev.sqlite";
const persistence = await createPlatformPersistence({ databasePath });
const store = new PersistentApiStore(persistence.repositories);
const membershipResolver = new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships);

const server = buildServer(store, { membershipResolver });

await server.listen({ port, host });
