#!/usr/bin/env node
// Phone is runtime-only; never print it or accept identity overrides.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.argv.slice(2).join(' ') !== '--apply') throw new Error('Pass only --apply');
if (!['develop', 'trial'].includes(process.env.FCM_RUNTIME_ENV)) throw new Error('Identity bootstrap forbidden outside nonproduction');
if (process.env.FCM_IDENTITY_BACKUP_ATTESTED !== '1') throw new Error('Nonproduction backup attestation required');
const phone = process.env.FCM_TEST_PHONE;
if (!phone || !/^\d{6,20}$/.test(phone)) throw new Error('Valid runtime test phone required');
const load = (file) => import(pathToFileURL(resolve('apps/api/dist', file)).href);
const { readRuntimeConfig } = await load('runtime/environment.js');
const { openRuntimeDatabase } = await load('persistence/runtime-database.js');
const config = readRuntimeConfig();
if (!existsSync(config.databasePath)) throw new Error('Existing migrated nonproduction database required');
const db = openRuntimeDatabase(config);
const club = 'club-chongqing-talent';
const user = 'user-cq-nonprod-reviewer';
const member = 'membership-cq-nonprod-reviewer';
const parent = 'parent-cq-nonprod-reviewer';
const coach = 'coach-cq-nonprod-reviewer';
const roles = ['parent', 'coach', 'admin'];
const roleJson = JSON.stringify(roles);
const sameRoles = (value) => {
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) && parsed.length === roles.length && roles.every((role) => parsed.includes(role));
};
try {
  db.exec('BEGIN IMMEDIATE');
  try {
    const client = db.prepare('SELECT id FROM club_app_clients WHERE id=? AND club_id=? AND app_id=? AND status=?').get('app-client-cq-talent-wechat-main', club, config.wechatAppId, 'active');
    if (!client || !db.prepare('SELECT id FROM clubs WHERE id=? AND status=?').get(club, 'active')) throw new Error('Active client and club registration required');
    const users = db.prepare('SELECT id, phone, roles_json, status FROM user_accounts WHERE id=? OR phone=?').all(user, phone);
    const members = db.prepare('SELECT id, club_id, user_id, roles_json, status FROM club_user_memberships WHERE id=? OR user_id=?').all(member, user);
    const parents = db.prepare('SELECT id, club_id, user_id, phone FROM parent_profiles WHERE id=? OR user_id=? OR phone=?').all(parent, user, phone);
    const coaches = db.prepare('SELECT id, club_id, user_id, status FROM coach_profiles WHERE id=? OR user_id=?').all(coach, user);
    if (users.some((r) => r.id !== user || r.phone !== phone || r.status !== 'active' || !sameRoles(r.roles_json))
      || members.some((r) => r.id !== member || r.user_id !== user || r.club_id !== club || r.status !== 'active' || !sameRoles(r.roles_json))
      || parents.some((r) => r.id !== parent || r.user_id !== user || r.club_id !== club || r.phone !== phone)
      || coaches.some((r) => r.id !== coach || r.user_id !== user || r.club_id !== club || r.status !== 'active')) throw new Error('Conflicting test identity; refusing to overwrite');
    const counts = [users.length, members.length, parents.length, coaches.length];
    const present = counts.every((n) => n === 1);
    if (!present && counts.some((n) => n !== 0)) throw new Error('Partial test identity; refusing to modify');
    if (!present) {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO user_accounts (id,display_name,phone,roles_json,status,created_at,updated_at) VALUES (?,?,?,?,'active',?,?)").run(user, '体验验收账号', phone, roleJson, now, now);
      db.prepare("INSERT INTO club_user_memberships (id,club_id,user_id,roles_json,status,created_at,updated_at) VALUES (?,?,?,?,'active',?,?)").run(member, club, user, roleJson, now, now);
      db.prepare('INSERT INTO parent_profiles (id,club_id,user_id,name,phone,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(parent, club, user, '体验家长', phone, now, now);
      db.prepare("INSERT INTO coach_profiles (id,club_id,user_id,name,specialties_json,status,created_at,updated_at) VALUES (?,?,?,?,'[]','active',?,?)").run(coach, club, user, '体验教练', now, now);
    }
    db.exec('COMMIT');
    console.log(JSON.stringify({ environment: config.environment, status: present ? 'already_present' : 'registered', accountCount: 1, roles, scope: 'identity-and-profiles-only' }));
  } catch (error) { db.exec('ROLLBACK'); throw error; }
} finally { db.close(); }
