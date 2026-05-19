// baseline.test.mjs — smoke-tests v1 for opticup-localhost-tester safety chain.
//
// Owner: opticup-localhost-tester skill (Task 3 of safety infra, 2026-05-10).
// Tenant: demo (8d8cfa7e-ef58-49af-9702-a862d459cccb), PIN 12345.
//
// v1 covers M1+M4 (the only modules in production today). Test 2/3/6 will
// be re-pointed to customers/orders in v2 once M5 + M7 ship.
//
// Each SPEC may add its own follow-up test file alongside this one; this
// file is the project-wide baseline that runs unconditionally.
//
// Exit 0 = all pass. Exit 1 = at least one failed.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOME = process.env.USERPROFILE || process.env.HOME;
const CRED_PATH = join(HOME, '.optic-up', 'credentials.env');

function loadEnv() {
  const txt = readFileSync(CRED_PATH, 'utf8');
  const out = {};
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = env.PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(`FAIL: missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in ${CRED_PATH}`);
  process.exit(1);
}

const DEMO_TENANT = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
const DEMO_SLUG = 'demo';
const DEMO_PIN = '12345';
const ERP_BASE = 'http://localhost:3000';
const STORE_BASE = 'http://localhost:4321';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

let authToken = null;
let createdLeadId = null;

// ─── Test 1: PIN login → JWT with tenant_id=demo ─────────────────────
test('1. PIN login returns JWT with tenant_id=demo', async () => {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/pin-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: DEMO_PIN, slug: DEMO_SLUG })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const { token, employee } = await r.json();
  if (!token) throw new Error('no token in response');
  if (employee?.tenant_id !== DEMO_TENANT) {
    throw new Error(`tenant_id mismatch: got ${employee?.tenant_id}`);
  }
  authToken = token;
});

// ─── Test 2: create CRM lead (M4) ────────────────────────────────────
// v2-TODO: replace with create-customer once M5 ships.
test('2. Create CRM lead succeeds (M4)', async () => {
  if (!authToken) throw new Error('skip: test-1 must pass first');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  const { data, error } = await sb.from('crm_leads').insert({
    tenant_id: DEMO_TENANT,
    full_name: `_SMOKE_TEST_ ${Date.now()}`,
    phone: '+972500000000',  // fake but well-formed; demo tenant only
    source: 'smoke-test',
    marketing_consent: false,  // no SMS risk
    terms_approved: true
  }).select().single();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('no id returned');
  createdLeadId = data.id;
});

// ─── Test 3: read inventory count (M1, read-only) ────────────────────
// v2-TODO: replace with create-order once M7 ships.
test('3. Read inventory count for demo tenant (M1)', async () => {
  if (!authToken) throw new Error('skip: test-1 must pass first');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  const { count, error } = await sb.from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', DEMO_TENANT);
  if (error) throw new Error(error.message);
  if (typeof count !== 'number') throw new Error('count not returned');
});

// ─── Test 4: storefront homepage 200 ─────────────────────────────────
test('4. Storefront homepage returns 200', async () => {
  const r = await fetch(`${STORE_BASE}/`, { method: 'HEAD' });
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
});

// ─── Test 5: storefront lead-form page (supersale) 200 ──────────────
// /supersale is the live lead-capture form (storefront → lead-intake EF
// → crm_leads). There's no /contact route on this storefront.
test('5. Storefront /supersale lead-form page returns 200', async () => {
  const r = await fetch(`${STORE_BASE}/supersale`, { method: 'HEAD' });
  if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
});

// ─── Test 6: cross-module — lead from test-2 → activity_log ─────────
test('6. Cross-module: lead from test-2 visible via crm_leads SELECT', async () => {
  if (!createdLeadId) throw new Error('skip: test-2 did not produce a lead');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  const { data, error } = await sb.from('crm_leads')
    .select('id, tenant_id, full_name')
    .eq('id', createdLeadId)
    .single();
  if (error) throw new Error(error.message);
  if (data.tenant_id !== DEMO_TENANT) {
    throw new Error(`RLS leaked: lead from wrong tenant ${data.tenant_id}`);
  }
});

// ─── Test 7: HEAD critical pages, count 5xx ─────────────────────────
// v2-TODO: replace with Playwright (real console.error count) when added.
test('7. No 5xx on critical pages (HEAD only)', async () => {
  const urls = [
    `${ERP_BASE}/index.html`,
    `${ERP_BASE}/crm.html`,
    `${ERP_BASE}/inventory.html`,
    `${STORE_BASE}/`,
  ];
  const failures = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { method: 'HEAD' });
      if (r.status >= 500) failures.push(`${u} → ${r.status}`);
    } catch (e) {
      failures.push(`${u} → ${e.message}`);
    }
  }
  if (failures.length) throw new Error(failures.join(', '));
});

// ─── Test 8: Layer D lint module loaded in crm.html ──────────────────
// Criterion 14 — M4_TEMPLATE_VALIDATION_UI_LINT (2026-05-19).
// Approach: readFileSync on crm.html (served as static file) and grep for
// the lint module script tag + key symbol. No JSDOM mount needed — the
// assertion is structural (lint module is declared in the page) not runtime.
test('8. Layer D lint module declared in crm.html (M4_TEMPLATE_VALIDATION_UI_LINT)', async () => {
  const crmHtml = readFileSync(join(process.cwd(), 'crm.html'), 'utf8');
  if (!crmHtml.includes('crm-template-lint.js')) {
    throw new Error('crm-template-lint.js script tag not found in crm.html');
  }
  const lintJs = readFileSync(join(process.cwd(), 'modules/crm/crm-template-lint.js'), 'utf8');
  if (!lintJs.includes('validateTemplateBodyPlaceholders') && !lintJs.includes('window.CrmTemplateLint')) {
    throw new Error('CrmTemplateLint global not exposed in crm-template-lint.js');
  }
  if (!lintJs.includes('KNOWN_PLACEHOLDERS')) {
    throw new Error('KNOWN_PLACEHOLDERS not found in crm-template-lint.js');
  }
});

// ─── Cleanup: delete test lead ──────────────────────────────────────
async function cleanup() {
  if (!createdLeadId || !authToken) return;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  });
  await sb.from('crm_leads').delete().eq('id', createdLeadId);
}

// ─── Run ─────────────────────────────────────────────────────────────
(async () => {
  console.log(`\nopticup baseline smoke — ${tests.length} tests`);
  console.log(`Tenant: ${DEMO_TENANT} (demo)\n`);

  let passed = 0, failed = 0;
  for (const t of tests) {
    const t0 = Date.now();
    try {
      await t.fn();
      const ms = Date.now() - t0;
      console.log(`  PASS  ${t.name}  (${ms}ms)`);
      passed++;
    } catch (e) {
      const ms = Date.now() - t0;
      console.log(`  FAIL  ${t.name}  (${ms}ms): ${e.message}`);
      failed++;
    }
  }
  await cleanup();
  console.log(`\n${passed}/${tests.length} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
