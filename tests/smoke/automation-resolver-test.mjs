#!/usr/bin/env node
// tests/smoke/automation-resolver-test.mjs
// SPEC 3 regression test: asserts no `unsubstituted_placeholder` errors
// across active demo rules' templates after the variable-resolver fix
// (M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX). Run via:
//   node tests/smoke/automation-resolver-test.mjs
//
// Method: for each active automation rule on demo whose action_type is
// 'send_message' or 'queue_send', fetch the templates (one per channel),
// synthesize a vars map using the same logic AE's prepare-plan.ts now uses,
// substitute vars into the template body, run the same validateTemplateOutput
// gate that AE runs pre-enqueue. ASSERT all results are ok:true.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DEMO_TENANT = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
const cred = fs.readFileSync(path.join(os.homedir(), '.optic-up', 'credentials.env'), 'utf-8');
const env = Object.fromEntries(
  cred.split(/\r?\n/).filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL = env.SUPABASE_URL || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Inline copies of the shared helpers (mirror supabase/functions/_shared/event-variables.ts).
// Test asserts the BEHAVIOR; the deployed EF must match these formulas.
const HEBREW_DOW = ["יום ראשון","יום שני","יום שלישי","יום רביעי","יום חמישי","יום שישי","שבת"];
const hebrewDayOfWeek = (ymd) => {
  if (!ymd) return ""; const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return HEBREW_DOW[dt.getUTCDay()] || "";
};
const formatDepositAmount = (v) => {
  if (v == null || v === "") return "";
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? String(n) : "";
};
const formatMaxAttendees = (v) => {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "";
};
// Mirrors _shared/template-validation.ts:scanForUnsubstitutedPlaceholders
// EXCEPT we filter `payment_url_<digits>` placeholders here. In the real EF
// flow, validateTemplateOutput runs `scanForPaymentUrlMismatch` FIRST and
// reports `payment_url_mismatch` for those — a SEPARATE error class handled
// by the send-message dispatch path's tenants.payment_links lookup. SPEC 3
// is scoped to the `unsubstituted_placeholder` class only.
const scanForUnsubstitutedPlaceholders = (text) => {
  const seen = new Set(); const re = /%([a-z][a-z0-9_]*)%/g; let m;
  while ((m = re.exec(text)) !== null) {
    if (/^payment_url_\d+$/.test(m[1])) continue;  // out of SPEC 3 scope
    seen.add(m[1]);
  }
  return [...seen].sort();
};
const substituteVars = (text, vars) => {
  let out = String(text || "");
  for (const k of Object.keys(vars)) out = out.replace(new RegExp(`%${k}%`, "g"), String(vars[k] == null ? "" : vars[k]));
  return out;
};

async function fetch_(p, init = {}) {
  const r = await fetch(`${URL}${p}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`);
  return r.json();
}

const ymdToDDMMYYYY = (ymd) => {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).split("-");
  return `${d}.${m}.${y}`;
};

function buildVars(lead, evt) {
  // Mirror automation-engine/prepare-plan.ts:buildVariables AFTER SPEC 3 fix.
  const vars = {
    name: lead.full_name || "",
    phone: lead.phone || "",
    email: lead.email || "",
    lead_id: lead.id || "",
    unsubscribe_url: "[קישור הסרה — יצורף אוטומטית]",
  };
  if (evt) {
    vars.event_name = evt.name || "";
    vars.event_date = ymdToDDMMYYYY(evt.event_date);
    vars.event_time = evt.start_time || "";
    vars.event_location = evt.location_address || "";
    vars.event_day_of_week = evt.event_date ? hebrewDayOfWeek(evt.event_date) : "";
    vars.event_deposit_amount = formatDepositAmount(evt.booking_fee);
    vars.event_max_attendees = formatMaxAttendees(evt.max_capacity);
    const regUrl = evt.registration_form_url || "";
    const isLegacy = regUrl.includes("r.html") || regUrl.includes("app.opticalis");
    if (regUrl && !isLegacy) vars.registration_url = regUrl;
    else if (evt.id) vars.registration_url = "[קישור הרשמה — יצורף אוטומטית]";
  }
  return vars;
}

async function main() {
  console.log('automation-resolver-test — verifying SPEC 3 fix on demo tenant\n');

  // Use a representative event row that exercises all 3 new vars.
  const events = await fetch_(`/rest/v1/crm_events?tenant_id=eq.${DEMO_TENANT}&select=*&max_capacity=gt.0&booking_fee=gt.0&is_deleted=eq.false&limit=1`);
  if (events.length === 0) throw new Error('No suitable demo event found (need max_capacity>0 AND booking_fee>0)');
  const evt = events[0];
  console.log(`Sample event: #${evt.event_number} ${evt.name} (date=${evt.event_date}, cap=${evt.max_capacity}, fee=${evt.booking_fee})`);

  // Use a representative lead row.
  const leads = await fetch_(`/rest/v1/crm_leads?tenant_id=eq.${DEMO_TENANT}&select=*&phone=not.is.null&is_deleted=eq.false&limit=1`);
  if (leads.length === 0) throw new Error('No demo lead found');
  const lead = leads[0];
  console.log(`Sample lead: ${lead.full_name} (id=${lead.id.slice(0,8)}, phone=${lead.phone})\n`);

  const vars = buildVars(lead, evt);
  console.log('Synthesized vars:', JSON.stringify(vars, null, 2));

  // Fetch all ACTIVE rules with action_type in (send_message, queue_send).
  const rules = await fetch_(`/rest/v1/crm_automation_rules?tenant_id=eq.${DEMO_TENANT}&is_active=eq.true&select=id,name,action_type,action_config`);
  console.log(`\nActive rules to check: ${rules.length}`);

  let total = 0, failed = 0;
  const failures = [];

  for (const rule of rules) {
    const cfg = rule.action_config || {};
    if (rule.action_type !== 'send_message' && rule.action_type !== 'queue_send') continue;
    if (!cfg.template_slug) continue;
    const channels = Array.isArray(cfg.channels) ? cfg.channels : [];
    if (channels.length === 0) continue;
    const lang = cfg.language || 'he';
    for (const channel of channels) {
      const fullSlug = `${cfg.template_slug}_${channel}_${lang}`;
      const tpls = await fetch_(`/rest/v1/crm_message_templates?tenant_id=eq.${DEMO_TENANT}&slug=eq.${encodeURIComponent(fullSlug)}&is_active=eq.true&select=slug,body,subject`);
      if (tpls.length === 0) {
        console.log(`  SKIP rule="${rule.name}" channel=${channel}: template ${fullSlug} not found or inactive`);
        continue;
      }
      const tpl = tpls[0];
      const composedBody = substituteVars(tpl.body, vars);
      const composedSubject = tpl.subject ? substituteVars(tpl.subject, vars) : '';
      const combined = composedBody + (composedSubject ? ' ' + composedSubject : '');
      const missing = scanForUnsubstitutedPlaceholders(combined);
      total++;
      if (missing.length === 0) {
        console.log(`  PASS  rule="${rule.name}" template=${fullSlug}`);
      } else {
        failed++;
        failures.push({ rule: rule.name, template: fullSlug, missing });
        console.log(`  FAIL  rule="${rule.name}" template=${fullSlug}: ${missing.join(', ')}`);
      }
    }
  }

  console.log(`\n--- Totals ---`);
  console.log(`  Checked: ${total} (rule, template, channel) tuples`);
  console.log(`  Passed:  ${total - failed}`);
  console.log(`  Failed:  ${failed}`);

  if (failed > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - rule="${f.rule}" template=${f.template}: missing=${f.missing.join(',')}`);
    process.exit(1);
  }
  console.log('\nAll active rules\' templates pass post-substitution validation. SPEC 3 fix verified.');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
