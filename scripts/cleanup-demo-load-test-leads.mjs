#!/usr/bin/env node
// scripts/cleanup-demo-load-test-leads.mjs
// SPEC: modules/Module 4 - CRM/docs/specs/M4_DISPATCH_PREVIEW_LAZY_ROWS/SPEC.md §13
//       (renamed from M4_DISPATCH_PREVIEW_SUMMARY_MODE 2026-05-21 rev 2; sentinel name unchanged)
//
// Deletes the synthetic load-test leads inserted by inject-demo-load-test-leads.mjs.
// Tenant-scoped DELETE on the sentinel predicate (utm_campaign). Demo-only.
//
// Iron Rule 33: demo-only. Hardcoded assertion below.
// Iron Rule 32: tenant-scoped DELETE bound to sentinel — NOT a mass-delete-without-scope.

import { TENANT_DEMO, loadCredentials } from './lib/m4-config-common.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

const SENTINEL = 'M4_DISPATCH_PREVIEW_LOAD_TEST_2026_05_21';

async function main() {
  // Iron Rule 33 — demo-only assertion inline (Rule 21: not extracted to shared lib
  // because we want the refusal to be obvious in each script, with the script's
  // own name in the error message; deliberately not a reusable helper).
  if (TENANT_DEMO !== '8d8cfa7e-ef58-49af-9702-a862d459cccb') {
    throw new Error('cleanup-demo-load-test-leads: TENANT_DEMO uuid drift. Refusing.');
  }

  const creds = loadCredentials();
  const sb = createClient(creds.url, creds.serviceRoleKey, { auth: { persistSession: false } });

  const pre = await sb.from('crm_leads').select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_DEMO).eq('utm_campaign', SENTINEL);
  if (pre.error) throw new Error('pre-count: ' + pre.error.message);
  console.log(`pre-count sentinel leads on demo: ${pre.count}`);

  if (!pre.count || pre.count === 0) {
    console.log('Nothing to clean up. Exit.');
    return;
  }

  let totalDeleted = 0;
  while (true) {
    const sel = await sb.from('crm_leads').select('id')
      .eq('tenant_id', TENANT_DEMO).eq('utm_campaign', SENTINEL)
      .limit(500);
    if (sel.error) throw new Error('select-chunk: ' + sel.error.message);
    const ids = (sel.data || []).map((r) => r.id);
    if (!ids.length) break;
    const del = await sb.from('crm_leads').delete()
      .eq('tenant_id', TENANT_DEMO)
      .in('id', ids);
    if (del.error) throw new Error('delete-chunk: ' + del.error.message);
    totalDeleted += ids.length;
    console.log(`  deleted chunk of ${ids.length} (running total ${totalDeleted})`);
  }

  const post = await sb.from('crm_leads').select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_DEMO).eq('utm_campaign', SENTINEL);
  if (post.error) throw new Error('post-count: ' + post.error.message);
  if ((post.count || 0) !== 0) {
    throw new Error(`post-count ${post.count} is non-zero — cleanup incomplete`);
  }
  console.log(`Cleanup complete. Deleted ${totalDeleted} synthetic leads.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
