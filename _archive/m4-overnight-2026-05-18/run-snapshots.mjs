#!/usr/bin/env node
// Overnight DB snapshot runner — captures 5 tables x 2 tenants = 10 JSON files.
// Uses SUPABASE_SERVICE_ROLE_KEY from $HOME/.optic-up/credentials.env to bypass RLS.
// Read-only — only SELECTs. No writes.
// Run once: `node _archive/m4-overnight-2026-05-18/run-snapshots.mjs`

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const credPath = path.join(os.homedir(), '.optic-up', 'credentials.env');
const cred = fs.readFileSync(credPath, 'utf-8');
const env = Object.fromEntries(cred.split(/\r?\n/).filter(l => l.includes('=')).map(l => {
  const i = l.indexOf('=');
  return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
}));

const SUPABASE_URL = env.SUPABASE_URL || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in credentials.env'); process.exit(2); }

const tenants = [
  { slug: 'demo',   uuid: '8d8cfa7e-ef58-49af-9702-a862d459cccb' },
  { slug: 'prizma', uuid: '6ad0781b-37f0-47a9-92e3-be9ed1477e1c' },
];
const tables = ['crm_message_templates', 'crm_automation_rules', 'crm_statuses', 'crm_field_visibility', 'crm_tags'];

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), 'db-snapshots');
fs.mkdirSync(outDir, { recursive: true });

let okCount = 0, failCount = 0;
for (const t of tables) {
  for (const tn of tenants) {
    const url = `${SUPABASE_URL}/rest/v1/${t}?tenant_id=eq.${tn.uuid}&select=*&order=id`;
    try {
      const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
      if (!res.ok) {
        console.error(`FAIL ${t}_${tn.slug}: HTTP ${res.status} ${await res.text()}`);
        failCount++;
        continue;
      }
      const json = await res.json();
      const outPath = path.join(outDir, `${t}_${tn.slug}.json`);
      fs.writeFileSync(outPath, JSON.stringify(json, null, 0), 'utf-8');
      const size = fs.statSync(outPath).size;
      console.log(`OK ${t}_${tn.slug} → ${json.length} rows, ${size} bytes`);
      okCount++;
    } catch (e) {
      console.error(`ERR ${t}_${tn.slug}:`, e.message);
      failCount++;
    }
  }
}
console.log(`---`);
console.log(`${okCount}/10 snapshots written, ${failCount} failed`);
process.exit(failCount === 0 ? 0 : 1);
