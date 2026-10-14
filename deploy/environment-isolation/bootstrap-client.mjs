#!/usr/bin/env node
// Run from the reviewed repository/container root; never imports production data.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (process.argv.slice(2).join(" ") !== "--apply") throw new Error("Pass only --apply to register nonproduction client configuration");
if (!["develop", "trial"].includes(process.env.FCM_RUNTIME_ENV)) throw new Error("Client bootstrap is forbidden outside develop/trial");
const load = (file) => import(pathToFileURL(resolve("apps/api/dist", file)).href);
const { readRuntimeConfig } = await load("runtime/environment.js");
const config = readRuntimeConfig();
if (!existsSync(config.databasePath)) throw new Error("Start the isolated API and migrate its own database before registering the client");
const { openRuntimeDatabase } = await load("persistence/runtime-database.js");
const { createPlatformRepositories } = await load("persistence/platform-persistence.js");
const { createPlatformSeed } = await load("seed/platform.js");
const { createDataCapabilitySeed } = await load("seed/data-capability.js");
const client = createDataCapabilitySeed().appClients.find((item) => item.clientKey === "cq-talent-wechat-main");
const club = createPlatformSeed().clubs.find((item) => item.id === client?.clubId);
if (!client || !club) throw new Error("Reviewed club/client configuration is missing");
client.appId = config.wechatAppId;
const db = openRuntimeDatabase(config);
try {
  db.exec("BEGIN IMMEDIATE");
  try {
    const clubs = db.prepare("SELECT id, code, status FROM clubs WHERE id = ? OR code = ?").all(club.id, club.code);
    if (clubs.some((row) => row.id !== club.id || row.code !== club.code || row.status !== "active")) throw new Error("Conflicting club registration; refusing to overwrite");
    const clients = db.prepare("SELECT id, club_id, app_id, client_key, status FROM club_app_clients WHERE id = ? OR client_key = ? OR app_id = ?").all(client.id, client.clientKey, client.appId);
    if (clients.some((row) => row.id !== client.id || row.club_id !== club.id || row.app_id !== client.appId || row.client_key !== client.clientKey || row.status !== "active")) throw new Error("Conflicting client registration; refusing to overwrite");
    const repositories = createPlatformRepositories(db);
    if (!clubs.length) await repositories.clubs.save(club);
    if (!clients.length) repositories.dataCapability.saveClubAppClient(client);
    db.exec("COMMIT");
    console.log(JSON.stringify({ environment: config.environment, status: clubs.length && clients.length ? "already_present" : "registered", clubId: club.id, clientId: client.id, appId: client.appId, scope: "club-and-client-only" }));
  } catch (error) { db.exec("ROLLBACK"); throw error; }
} finally { db.close(); }
