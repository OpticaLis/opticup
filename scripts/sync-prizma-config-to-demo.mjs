#!/usr/bin/env node
// scripts/sync-prizma-config-to-demo.mjs
// Copies M4 config tables from Prizma → demo. Read CLAUDE.md Iron Rule 33 before editing.
// SPEC: modules/Module 4 - CRM/docs/specs/M4_CONFIG_SYNC_INFRASTRUCTURE/
//
// Tables: crm_message_templates, crm_automation_rules, crm_statuses, crm_field_visibility, crm_tags.
//
// Flags:
//   --dry-run                              Print diff, do not apply. Default behavior.
//   --allow-destructive                    Allow DELETE of demo-only rows not on allowlist.
//   --confirm-destructive=YES-I-READ-THE-DIFF  Non-interactive confirm (overnight Pipeline only).
//   --table=<name>                         Sync a single table.
//   --diff-out=<path>                      Append diff text to file.
//
// Allowlist: scripts/checks/demo-config-allowlist.json — demo-only rows authorized to keep.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { TENANT_PRIZMA, TENANT_DEMO, loadCredentials, rowHash } from './lib/m4-config-common.mjs';

const TABLE_KEYS = {
  crm_message_templates: row => `${row.slug}`,
  crm_automation_rules:  row => `${row.name}`,
  crm_statuses:          row => `${row.entity_type}::${row.slug}`,
  crm_field_visibility:  row => `${row.role_id}::${row.entity_type}::${row.field_key}`,
  crm_tags:              row => `${row.name}`,
};
const TABLES = Object.keys(TABLE_KEYS);

function parseSyncArgs(argv) {
  const a = { dryRun: true, allowDestructive: false, confirmFlag: null, table: null, diffOut: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') a.dryRun = true;
    else if (arg === '--allow-destructive') a.allowDestructive = true;
    else if (arg.startsWith('--confirm-destructive=')) a.confirmFlag = arg.slice('--confirm-destructive='.length);
    else if (arg.startsWith('--table=')) a.table = arg.slice('--table='.length);
    else if (arg.startsWith('--diff-out=')) a.diffOut = arg.slice('--diff-out='.length);
    else if (arg === '--apply') a.dryRun = false;
    else if (arg === '--help' || arg === '-h') { printSyncHelp(); process.exit(0); }
    else { console.error(`Unknown flag: ${arg}`); printSyncHelp(); process.exit(2); }
  }
  return a;
}

function printSyncHelp() {
  console.log(`Usage: node scripts/sync-prizma-config-to-demo.mjs [flags]
  --dry-run                              Print diff, do not apply (default).
  --apply                                Apply changes (still requires confirm).
  --allow-destructive                    Allow DELETE of demo-only rows not on allowlist.
  --confirm-destructive=YES-I-READ-THE-DIFF  Non-interactive confirm.
  --table=<name>                         Sync only one table (one of ${TABLES.join(', ')}).
  --diff-out=<path>                      Append diff text to file.`);
}

function loadAllowlist() {
  const p = path.join(process.cwd(), 'scripts', 'checks', 'demo-config-allowlist.json');
  if (!fs.existsSync(p)) {
    console.error(`Missing allowlist: ${p}`);
    process.exit(3);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function selectAll(url, key, table, tenantId) {
  // PostgREST: use Range header in chunks if needed. Most M4 config tables are < 1000 rows so single fetch is fine.
  const resp = await fetch(`${url}/rest/v1/${table}?tenant_id=eq.${tenantId}&select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Range: '0-9999' }
  });
  if (!resp.ok) throw new Error(`${table} SELECT failed: ${resp.status} ${await resp.text()}`);
  return await resp.json();
}

function diffTable(prizmaRows, demoRows, keyFn, allowlistEntries) {
  const allowlist = new Set(allowlistEntries || []);
  const prizmaByKey = new Map(prizmaRows.map(r => [keyFn(r), r]));
  const demoByKey   = new Map(demoRows.map(r => [keyFn(r), r]));

  const inserts = []; // present in prizma, missing in demo
  const updates = []; // same key, content differs
  const deletes = []; // present in demo, missing in prizma, NOT in allowlist
  const preserved = []; // present in demo, missing in prizma, IS in allowlist
  const unchanged = []; // same key, same content

  for (const [k, p] of prizmaByKey) {
    if (!demoByKey.has(k)) {
      inserts.push({ key: k, prizma: p });
    } else {
      const d = demoByKey.get(k);
      if (rowHash(p) !== rowHash(d)) updates.push({ key: k, prizma: p, demo: d });
      else unchanged.push({ key: k });
    }
  }
  for (const [k, d] of demoByKey) {
    if (!prizmaByKey.has(k)) {
      if (allowlist.has(k)) preserved.push({ key: k, demo: d });
      else deletes.push({ key: k, demo: d });
    }
  }
  return { inserts, updates, deletes, preserved, unchanged };
}

function printDiff(table, d, args, sink) {
  function line(s) { sink.push(s); if (!args.diffOut) console.log(s); }
  line(`\n=== ${table} ===`);
  line(`  inserts:    ${d.inserts.length}   (prizma rows missing in demo)`);
  line(`  updates:    ${d.updates.length}   (same key, content differs)`);
  line(`  deletes:    ${d.deletes.length}   (demo rows not in prizma, not in allowlist)`);
  line(`  preserved:  ${d.preserved.length} (demo-only rows on allowlist — kept)`);
  line(`  unchanged:  ${d.unchanged.length}`);
  if (d.inserts.length) line(`    Inserts: ${d.inserts.slice(0, 10).map(x => x.key).join(', ')}${d.inserts.length > 10 ? ' …' : ''}`);
  if (d.updates.length) line(`    Updates: ${d.updates.slice(0, 10).map(x => x.key).join(', ')}${d.updates.length > 10 ? ' …' : ''}`);
  if (d.deletes.length) line(`    Deletes: ${d.deletes.slice(0, 10).map(x => x.key).join(', ')}${d.deletes.length > 10 ? ' …' : ''}`);
  if (d.preserved.length) line(`    Preserved: ${d.preserved.slice(0, 10).map(x => x.key).join(', ')}${d.preserved.length > 10 ? ' …' : ''}`);
}

async function applyTable(url, key, table, d, args) {
  let inserted = 0, updated = 0, deleted = 0;
  // INSERT: tenant_id rewritten to demo. Generate new id by stripping prizma's id (let Postgres default if applicable; otherwise generate UUID v4 client-side).
  for (const { prizma } of d.inserts) {
    const row = { ...prizma };
    delete row.id;
    delete row.created_at;
    delete row.updated_at;
    row.tenant_id = TENANT_DEMO;
    const resp = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!resp.ok) throw new Error(`INSERT ${table}/${d.inserts.find(x => x.prizma === prizma).key} failed: ${resp.status} ${await resp.text()}`);
    inserted++;
  }
  // UPDATE: preserve demo's id, copy prizma's content fields (skip id/tenant_id/created_at; copy updated_at).
  for (const { prizma, demo } of d.updates) {
    const patch = { ...prizma };
    delete patch.id;
    delete patch.created_at;
    patch.tenant_id = TENANT_DEMO;
    const resp = await fetch(`${url}/rest/v1/${table}?id=eq.${demo.id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (!resp.ok) throw new Error(`UPDATE ${table}/${demo.id} failed: ${resp.status} ${await resp.text()}`);
    updated++;
  }
  // DELETE: only with --allow-destructive.
  if (args.allowDestructive) {
    for (const { demo } of d.deletes) {
      const resp = await fetch(`${url}/rest/v1/${table}?id=eq.${demo.id}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
      });
      if (!resp.ok) throw new Error(`DELETE ${table}/${demo.id} failed: ${resp.status} ${await resp.text()}`);
      deleted++;
    }
  }
  return { inserted, updated, deleted, skipped_deletes: args.allowDestructive ? 0 : d.deletes.length };
}

async function confirmInteractive() {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(res => rl.question("Type 'YES SYNC' to apply, anything else to abort: ", res));
  rl.close();
  return answer === 'YES SYNC';
}

async function main() {
  const args = parseSyncArgs(process.argv);
  const { url, key } = loadCredentials();
  const allowlist = loadAllowlist();
  const tablesToProcess = args.table ? [args.table] : TABLES;
  for (const t of tablesToProcess) {
    if (!TABLE_KEYS[t]) { console.error(`Unknown table: ${t}`); process.exit(2); }
  }

  console.log(`sync-prizma-config-to-demo — ${args.dryRun ? 'DRY-RUN' : 'APPLY'} mode${args.allowDestructive ? ' (destructive enabled)' : ''}`);
  console.log(`Tables: ${tablesToProcess.join(', ')}`);

  const sink = [];
  const allDiffs = {};
  let totalInsert = 0, totalUpdate = 0, totalDelete = 0, totalPreserved = 0;

  for (const t of tablesToProcess) {
    const [prizma, demo] = await Promise.all([selectAll(url, key, t, TENANT_PRIZMA), selectAll(url, key, t, TENANT_DEMO)]);
    const d = diffTable(prizma, demo, TABLE_KEYS[t], allowlist[t] || []);
    allDiffs[t] = d;
    totalInsert += d.inserts.length;
    totalUpdate += d.updates.length;
    totalDelete += d.deletes.length;
    totalPreserved += d.preserved.length;
    printDiff(t, d, args, sink);
  }

  if (args.diffOut) {
    fs.appendFileSync(args.diffOut, sink.join('\n') + '\n', 'utf-8');
    console.log(`\nDiff written to: ${args.diffOut}`);
  }

  console.log(`\n--- Totals ---`);
  console.log(`  Inserts:   ${totalInsert}`);
  console.log(`  Updates:   ${totalUpdate}`);
  console.log(`  Deletes:   ${totalDelete} ${args.allowDestructive ? '(will apply)' : '(BLOCKED — no --allow-destructive)'}`);
  console.log(`  Preserved: ${totalPreserved}`);

  if (args.dryRun) {
    console.log(`\nDry-run complete. No changes applied.`);
    process.exit(0);
  }

  let confirmed = false;
  if (args.confirmFlag === 'YES-I-READ-THE-DIFF') {
    console.log(`\nNon-interactive confirm via --confirm-destructive=YES-I-READ-THE-DIFF`);
    confirmed = true;
  } else if (process.stdin.isTTY) {
    confirmed = await confirmInteractive();
  } else {
    console.error(`\nRefusing to apply non-interactively without --confirm-destructive=YES-I-READ-THE-DIFF flag.`);
    process.exit(4);
  }
  if (!confirmed) { console.log('Aborted.'); process.exit(0); }

  console.log(`\nApplying...`);
  let appI = 0, appU = 0, appD = 0;
  for (const t of tablesToProcess) {
    const r = await applyTable(url, key, t, allDiffs[t], args);
    console.log(`  ${t}: ${r.inserted} inserted, ${r.updated} updated, ${r.deleted} deleted${r.skipped_deletes ? ` (${r.skipped_deletes} delete-skipped — no --allow-destructive)` : ''}`);
    appI += r.inserted; appU += r.updated; appD += r.deleted;
  }
  console.log(`\nDone. Total: ${appI} inserted, ${appU} updated, ${appD} deleted.`);
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
