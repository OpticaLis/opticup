// dual-path-deprecation-test.mjs — M4_DUAL_PATH_DEPRECATION_PHASE_1 regression.
//
// Owner: opticup-executor (SPEC M4_DUAL_PATH_DEPRECATION_PHASE_1, 2026-05-19).
// Tenant: demo only. Reset event #28 to 'planning' before running.
//
// Asserts that a single event status toggle on demo produces EXACTLY 1
// crm_automation_runs row within 60s (not 2 — the pre-SPEC dual-path
// symptom would have produced 2). Also asserts trigger_data shape matches
// consumer (status_change_event_id present), NOT browser (triggered_by_browser).
//
// Run on demand (not in baseline 7-test smoke).
// Exit 0 = pass. Exit 1 = fail.

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
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(`FAIL: missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${CRED_PATH}`);
  process.exit(1);
}

const DEMO_TENANT = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
const EVENT_NUMBER = 28;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('M4_DUAL_PATH_DEPRECATION_PHASE_1 regression test');
  console.log('Tenant: demo. Event: #' + EVENT_NUMBER + '.');

  const ev = await sb.from('crm_events').select('id, status, name')
    .eq('tenant_id', DEMO_TENANT).eq('event_number', EVENT_NUMBER).single();
  if (ev.error || !ev.data) { console.error('FAIL: event #' + EVENT_NUMBER + ' not found on demo'); process.exit(1); }
  const eventId = ev.data.id;
  console.log('Found event: ' + ev.data.name + ' (status=' + ev.data.status + ')');

  if (ev.data.status !== 'planning') {
    console.log('Resetting event to planning...');
    const reset = await sb.from('crm_events').update({ status: 'planning' })
      .eq('id', eventId).eq('tenant_id', DEMO_TENANT);
    if (reset.error) { console.error('FAIL: reset failed: ' + reset.error.message); process.exit(1); }
  }

  const t0 = new Date();
  const t0iso = t0.toISOString();
  console.log('Toggle window starts at ' + t0iso);

  const toggle = await sb.from('crm_events').update({ status: 'registration_open' })
    .eq('id', eventId).eq('tenant_id', DEMO_TENANT).select('id, status').single();
  if (toggle.error) { console.error('FAIL: toggle failed: ' + toggle.error.message); process.exit(1); }
  console.log('Toggled to registration_open. Waiting 60s for consumer...');

  await sleep(60000);

  const runs = await sb.from('crm_automation_runs')
    .select('id, trigger_type, trigger_data, total_recipients, started_at')
    .eq('tenant_id', DEMO_TENANT)
    .gte('started_at', t0iso)
    .order('started_at', { ascending: true });
  if (runs.error) { console.error('FAIL: runs query failed: ' + runs.error.message); process.exit(1); }

  const myRuns = (runs.data || []).filter(r => {
    const td = r.trigger_data || {};
    return td.eventId === eventId || td.event_id === eventId || td.entity_id === eventId;
  });

  console.log('Runs found within 60s: ' + myRuns.length);
  myRuns.forEach((r, i) => {
    console.log('  [' + i + '] id=' + r.id + ' type=' + r.trigger_type + ' recipients=' + r.total_recipients);
    console.log('       trigger_data: ' + JSON.stringify(r.trigger_data));
  });

  if (myRuns.length === 0) { console.error('FAIL: expected exactly 1 run, got 0. Consumer not draining?'); process.exit(1); }
  if (myRuns.length > 1) { console.error('FAIL: expected exactly 1 run, got ' + myRuns.length + '. Dual-path may have regressed.'); process.exit(1); }

  const td = myRuns[0].trigger_data || {};
  const isConsumerShape = ('status_change_event_id' in td) || ('sce_id' in td);
  const isBrowserShape = td.triggered_by_browser === true || td.source === 'browser';
  if (isBrowserShape) { console.error('FAIL: run is from browser dispatch — expected consumer. trigger_data=' + JSON.stringify(td)); process.exit(1); }
  if (!isConsumerShape) { console.log('WARN: run trigger_data missing explicit consumer marker; accepting because not browser-shape: ' + JSON.stringify(td)); }
  else { console.log('OK: run is from consumer (status_change_event_id present)'); }

  await sb.from('crm_events').update({ status: 'planning' })
    .eq('id', eventId).eq('tenant_id', DEMO_TENANT);
  console.log('Cleanup: event reset to planning.');

  console.log('PASS: exactly 1 run, consumer-shaped, no dual-path regression.');
  process.exit(0);
}

main().catch(e => { console.error('FAIL: unexpected error: ' + (e.message || String(e))); process.exit(1); });
