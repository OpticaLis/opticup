// scripts/lib/m4-config-common.mjs
// Shared helpers for sync-prizma-config-to-demo.mjs + promote-config-to-prizma.mjs.
// Extracted to satisfy Iron Rule 21 (no duplicates) — established by M4_CONFIG_SYNC_INFRASTRUCTURE.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export const TENANT_PRIZMA = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
export const TENANT_DEMO   = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

export function loadCredentials() {
  const credPath = path.join(os.homedir(), '.optic-up', 'credentials.env');
  if (!fs.existsSync(credPath)) {
    console.error(`Missing credentials: ${credPath}`);
    process.exit(3);
  }
  const env = Object.fromEntries(
    fs.readFileSync(credPath, 'utf-8').split(/\r?\n/)
      .filter(l => l.includes('='))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
  const url = env.SUPABASE_URL || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in credentials.env'); process.exit(3); }
  return { url, key };
}

// Stable hash of a row's content (excludes volatile fields).
export function normalizeForHash(row) {
  const { id: _id, tenant_id: _tenant, created_at: _ca, updated_at: _ua, last_error: _le, ...rest } = row;
  function sort(v) {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.keys(v).sort().reduce((acc, k) => { acc[k] = sort(v[k]); return acc; }, {});
    }
    return v;
  }
  return JSON.stringify(sort(rest));
}
export function rowHash(row) { return crypto.createHash('md5').update(normalizeForHash(row)).digest('hex'); }
