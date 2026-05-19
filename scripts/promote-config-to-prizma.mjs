#!/usr/bin/env node
// scripts/promote-config-to-prizma.mjs
// Promotes a SINGLE validated config row from demo → Prizma. Read CLAUDE.md Iron Rule 33 first.
// SPEC: modules/Module 4 - CRM/docs/specs/M4_CONFIG_SYNC_INFRASTRUCTURE/
//
// Required flag (exactly one):
//   --slug=<value>        For crm_message_templates or crm_statuses (Foreman picks table via --table)
//   --rule-name=<value>   For crm_automation_rules
//   --status=<value>      Alias for --slug when --table=crm_statuses
//
// Required for slug/status: --table=<name>
// Required always: --table=<name>
//
// Behavior:
//   1. SELECT named row from demo.
//   2. SELECT same row (by natural key) from Prizma.
//   3. Print before/after diff.
//   4. Confirm: prompt 'YES PROMOTE' (TTY) or --confirm-promote=YES-I-READ-THE-DIFF (non-TTY).
//   5. UPSERT into Prizma with tenant_id rewritten.
//   6. Write audit row to crm_audit_log.

import readline from 'node:readline';
import { TENANT_PRIZMA, TENANT_DEMO, loadCredentials, rowHash } from './lib/m4-config-common.mjs';

const TABLE_KEY_FIELD = {
  crm_message_templates: 'slug',
  crm_automation_rules:  'name',
  crm_statuses:          'slug',
  crm_field_visibility:  null, // composite key, not supported for promote — too rare to need
  crm_tags:              'name',
};
const TABLES = Object.keys(TABLE_KEY_FIELD);

function parsePromoteArgs(argv) {
  const a = { table: null, slug: null, ruleName: null, status: null, confirmFlag: null };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--table=')) a.table = arg.slice('--table='.length);
    else if (arg.startsWith('--slug=')) a.slug = arg.slice('--slug='.length);
    else if (arg.startsWith('--rule-name=')) a.ruleName = arg.slice('--rule-name='.length);
    else if (arg.startsWith('--status=')) a.status = arg.slice('--status='.length);
    else if (arg.startsWith('--confirm-promote=')) a.confirmFlag = arg.slice('--confirm-promote='.length);
    else if (arg === '--help' || arg === '-h') { printPromoteHelp(); process.exit(0); }
    else { console.error(`Unknown flag: ${arg}`); printPromoteHelp(); process.exit(2); }
  }
  return a;
}

function printPromoteHelp() {
  console.log(`Usage: node scripts/promote-config-to-prizma.mjs --table=<name> --<slug|rule-name|status>=<value> [--confirm-promote=YES-I-READ-THE-DIFF]
  --table=<name>          One of: ${TABLES.join(', ')}.
  --slug=<value>          For templates / statuses (with --table=crm_statuses).
  --rule-name=<value>     For crm_automation_rules.
  --status=<value>        Alias for --slug when promoting a status row.
  --confirm-promote=YES-I-READ-THE-DIFF   Non-interactive confirm.`);
}

async function selectByKey(url, key, table, tenantId, field, value) {
  const resp = await fetch(`${url}/rest/v1/${table}?tenant_id=eq.${tenantId}&${field}=eq.${encodeURIComponent(value)}&select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!resp.ok) throw new Error(`SELECT ${table} ${field}=${value} for tenant ${tenantId.slice(0, 8)}: ${resp.status} ${await resp.text()}`);
  return await resp.json();
}

async function confirmInteractive() {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise(res => rl.question("Type 'YES PROMOTE' to apply, anything else to abort: ", res));
  rl.close();
  return ans === 'YES PROMOTE';
}

async function main() {
  const args = parsePromoteArgs(process.argv);

  // Validation: must have --table.
  if (!args.table || !TABLES.includes(args.table)) {
    console.error(`Missing or invalid --table (must be one of: ${TABLES.join(', ')}).`);
    printPromoteHelp(); process.exit(2);
  }
  const valueByField = { slug: args.slug, name: args.ruleName, status: args.status };
  const keyField = TABLE_KEY_FIELD[args.table];
  if (!keyField) { console.error(`Table ${args.table} not supported (composite-keyed tables excluded from promote).`); process.exit(2); }
  let value = null;
  if (args.table === 'crm_automation_rules') value = args.ruleName;
  else if (args.table === 'crm_statuses') value = args.status || args.slug;
  else value = args.slug;
  if (!value) {
    console.error(`Missing identifier flag for table ${args.table}. Required: --${keyField === 'name' ? 'rule-name' : 'slug'}=<value>`);
    process.exit(2);
  }

  const { url, key } = loadCredentials();

  console.log(`promote-config-to-prizma — table=${args.table} ${keyField}=${value}`);

  const [demoRows, prizmaRows] = await Promise.all([
    selectByKey(url, key, args.table, TENANT_DEMO, keyField, value),
    selectByKey(url, key, args.table, TENANT_PRIZMA, keyField, value),
  ]);
  if (demoRows.length !== 1) {
    console.error(`Demo source row not found uniquely (got ${demoRows.length}). Refusing to promote.`);
    process.exit(5);
  }
  const demoRow = demoRows[0];
  const prizmaRow = prizmaRows[0] || null;
  const beforeHash = prizmaRow ? rowHash(prizmaRow) : null;
  const afterHash  = rowHash(demoRow);

  console.log(`\nDemo (source) ${keyField}=${value}:`, JSON.stringify(demoRow, null, 2));
  console.log(`\nPrizma (target) ${keyField}=${value}:`, prizmaRow ? JSON.stringify(prizmaRow, null, 2) : '(none — will INSERT)');
  console.log(`\nHashes: before=${beforeHash} after=${afterHash}  ${beforeHash === afterHash ? '(NO CHANGE — promote will be no-op)' : '(WILL UPDATE)'}`);

  let confirmed = false;
  if (args.confirmFlag === 'YES-I-READ-THE-DIFF') { console.log('\nNon-interactive confirm.'); confirmed = true; }
  else if (process.stdin.isTTY) confirmed = await confirmInteractive();
  else { console.error('\nRefusing to apply non-interactively without --confirm-promote=YES-I-READ-THE-DIFF flag.'); process.exit(4); }
  if (!confirmed) { console.log('Aborted.'); process.exit(0); }

  // Build payload: copy demo row, rewrite tenant_id, drop volatile fields.
  const payload = { ...demoRow };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  payload.tenant_id = TENANT_PRIZMA;

  if (prizmaRow) {
    const resp = await fetch(`${url}/rest/v1/${args.table}?id=eq.${prizmaRow.id}`, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) { console.error(`PATCH failed: ${resp.status} ${await resp.text()}`); process.exit(6); }
    console.log(`✓ Updated Prizma row ${prizmaRow.id}`);
  } else {
    const resp = await fetch(`${url}/rest/v1/${args.table}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) { console.error(`INSERT failed: ${resp.status} ${await resp.text()}`); process.exit(6); }
    console.log(`✓ Inserted new Prizma row`);
  }

  // Audit row to crm_audit_log.
  const auditRow = {
    tenant_id: TENANT_PRIZMA,
    actor: 'promote-config-to-prizma.mjs',
    action: 'config.promote',
    entity_type: args.table,
    entity_id: prizmaRow?.id || null,
    details: { source_demo_id: demoRow.id, before_md5: beforeHash, after_md5: afterHash, key_field: keyField, key_value: value },
  };
  const auditResp = await fetch(`${url}/rest/v1/crm_audit_log`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(auditRow),
  });
  if (!auditResp.ok) {
    console.warn(`Audit row insert failed: ${auditResp.status} ${await auditResp.text()}`);
    console.warn(`(Promote completed but audit trail missing — investigate crm_audit_log table state.)`);
  } else {
    console.log(`✓ Audit row written to crm_audit_log`);
  }

  console.log(`\nDone.`);
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
