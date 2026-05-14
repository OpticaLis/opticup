#!/usr/bin/env node
// One-shot pre-edit JSON backup dumper for M3_SHORTGY_TO_INTERNAL_REDIRECT.
// Reads credentials from $HOME/.optic-up/credentials.env, dumps 10
// crm_message_templates rows + 2 tenants rows as JSON files into the
// SPEC's gitignored backup folder. Read-only against the DB.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createClient } from '@supabase/supabase-js';

const envPath = join(homedir(), '.optic-up', 'credentials.env');
const envText = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText.split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env.PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });

const BACKUP_DIR = 'modules/Module 4 - CRM/backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT';
mkdirSync(`${BACKUP_DIR}/db-rows`, { recursive: true });

const stamp = new Date().toISOString();

// Dump matching template rows
const tpl = await sb.from('crm_message_templates').select('*').ilike('body', '%short.gy%');
if (tpl.error) { console.error('templates error:', tpl.error); process.exit(1); }
console.log(`Found ${tpl.data.length} template rows.`);
for (const row of tpl.data) {
  const fn = `${BACKUP_DIR}/db-rows/template_${row.tenant_id.slice(0, 4)}_${row.id}.json`;
  writeFileSync(fn, JSON.stringify({ _backup_at: stamp, ...row }, null, 2), 'utf8');
}

// Dump tenants with short.gy in payment_links
const ten = await sb.from('tenants').select('id,slug,payment_links');
if (ten.error) { console.error('tenants error:', ten.error); process.exit(1); }
const targets = ten.data.filter(t => JSON.stringify(t.payment_links || {}).includes('short.gy'));
console.log(`Found ${targets.length} tenant rows with short.gy in payment_links.`);
for (const row of targets) {
  const fn = `${BACKUP_DIR}/db-rows/tenant_${row.slug}_payment_links.json`;
  writeFileSync(fn, JSON.stringify({ _backup_at: stamp, ...row }, null, 2), 'utf8');
}

console.log('Backup dump complete.');
