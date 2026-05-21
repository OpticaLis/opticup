#!/usr/bin/env node
// scripts/inject-demo-load-test-leads.mjs
// SPEC: modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_SUMMARY_MODE/SPEC.md §10
//
// Injects 1,200 synthetic load-test leads into the DEMO tenant ONLY.
//   - phone format `05000NNNNN` (10 digits, Israeli mobile syntax, NOT in any
//     allowlist; dispatch-queue rejects with phone_not_allowed).
//   - email format `m4_load_test_NNNN@demo.opticalis.test` (RFC-valid syntax,
//     `.test` TLD which the dispatch-queue email allowlist will not match).
//   - utm_campaign='M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21' — sentinel for
//     idempotent re-runs + targeted cleanup.
//
// Iron Rule 33: demo-only. Hardcoded assertion below — refuses any other tenant.
// Iron Rule 32: tenant-scoped INSERT, sentinel-bound, no DROP / TRUNCATE.
// Even if dispatch fires by accident, every recipient fails allowlist → zero real sends.

import { TENANT_DEMO, loadCredentials } from './lib/m4-config-common.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

const SENTINEL = 'M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21';
const TARGET_COUNT = 1200;
const CHUNK = 200;

async function main() {
  // Iron Rule 33 — demo-only assertion inline (Rule 21: not extracted to shared lib
  // because we want the refusal to be obvious in each script, with the script's
  // own name in the error message; deliberately not a reusable helper).
  if (TENANT_DEMO !== '8d8cfa7e-ef58-49af-9702-a862d459cccb') {
    throw new Error('inject-demo-load-test-leads: TENANT_DEMO uuid drift. Refusing.');
  }

  const creds = loadCredentials();
  const sb = createClient(creds.url, creds.serviceRoleKey, { auth: { persistSession: false } });

  const pre = await sb.from('crm_leads').select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_DEMO).eq('utm_campaign', SENTINEL);
  if (pre.error) throw new Error('pre-count: ' + pre.error.message);
  const existing = pre.count || 0;
  console.log(`pre-count existing sentinel leads: ${existing}`);

  const toInsert = TARGET_COUNT - existing;
  if (toInsert <= 0) {
    console.log(`Already at or above target (${existing} >= ${TARGET_COUNT}). No insert.`);
    return;
  }
  console.log(`Inserting ${toInsert} new synthetic leads in chunks of ${CHUNK}...`);

  let inserted = 0;
  for (let i = 0; i < toInsert; i += CHUNK) {
    const batch = [];
    for (let j = 0; j < CHUNK && (i + j) < toInsert; j++) {
      const idx = existing + i + j;
      const padded = String(idx).padStart(4, '0');
      // 10-digit Israeli mobile syntax: 05 + 8 digits. Use 0500-prefix range.
      const phoneSuffix = String(1000 + idx).padStart(8, '0');
      batch.push({
        tenant_id: TENANT_DEMO,
        full_name: `Load Test Lead ${padded}`,
        phone: `05${phoneSuffix}`,
        email: `m4_load_test_${padded}@demo.opticalis.test`,
        status: 'waiting',
        utm_campaign: SENTINEL,
        utm_source: 'm4_dispatch_preview_summary_mode_spec',
        is_deleted: false,
        language: 'he',
      });
    }
    const r = await sb.from('crm_leads').insert(batch).select('id');
    if (r.error) throw new Error(`chunk ${i}: ${r.error.message}`);
    inserted += (r.data || []).length;
    console.log(`  chunk ${i}-${i + batch.length - 1}: +${(r.data || []).length} rows (running total ${existing + inserted})`);
  }

  const post = await sb.from('crm_leads').select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_DEMO).eq('utm_campaign', SENTINEL);
  if (post.error) throw new Error('post-count: ' + post.error.message);
  console.log(`post-count sentinel leads: ${post.count}`);
  if (Math.abs((post.count || 0) - TARGET_COUNT) > 5) {
    throw new Error(`post-count ${post.count} outside acceptance band [${TARGET_COUNT - 5}, ${TARGET_COUNT + 5}]`);
  }
  console.log('Inject complete.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
