#!/usr/bin/env node
// Monday.com → Supabase CRM import planner.
//
// Parses the 9 Monday board exports from campaigns/supersale/exports/,
// applies every transformation rule from DATA_DISCOVERY_REPORT.md, and
// emits batched SQL files under campaigns/supersale/scripts/_sql/ for the
// executor to run via Supabase MCP execute_sql. The script never talks
// to the database itself — it only produces SQL + a skipped-rows log.
//
// Usage:  node campaigns/supersale/scripts/import-monday-data.mjs
//
// Output:
//   campaigns/supersale/scripts/_sql/01_events.sql
//   campaigns/supersale/scripts/_sql/02_leads_NN.sql      (batched, 100 per file)
//   campaigns/supersale/scripts/_sql/03_affiliates_enrich_NN.sql
//   campaigns/supersale/scripts/_sql/04_lead_notes_NN.sql
//   campaigns/supersale/scripts/_sql/05_attendees_NN.sql
//   campaigns/supersale/scripts/_sql/06_ad_spend.sql
//   campaigns/supersale/scripts/_sql/07_cx_surveys.sql
//   campaigns/supersale/scripts/_sql/08_audit_log.sql
//   campaigns/supersale/scripts/import-skipped.json
//   campaigns/supersale/scripts/import-report.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readSheet as _readSheet,
  q,
  normalizePhone,
  toISODate,
  toISOTimestamp,
  nonNullCount,
  trimOrNull,
  lower,
  makeSkipLogger,
  eventStatusMap,
  leadStatusMap,
  mapHebrewLang,
  mapEyeExamDefault,
} from './import-monday-helpers.mjs';
import {
  buildStubLeads,
  buildAttendees,
  buildSynthMessageLog,
  buildAdSpend,
} from './import-monday-builders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

// ---- CLI args (added per MONDAY_MIGRATION_DRYRUN_AND_LIVE Δ-3) ----
//   --source-dir <path>   directory containing the Monday Excel exports
//                         (default: campaigns/supersale/exports/)
//   --tenant-id  <uuid>   tenant UUID for INSERT statements
//                         (default: prizma 6ad0781b-...)
const argv = process.argv.slice(2);
let sourceDirArg = null;
let tenantIdArg = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--source-dir' && argv[i + 1]) sourceDirArg = argv[i + 1];
  if (argv[i] === '--tenant-id' && argv[i + 1]) tenantIdArg = argv[i + 1];
}

const EXPORTS = sourceDirArg
  ? path.resolve(sourceDirArg)
  : path.join(ROOT, 'campaigns', 'supersale', 'exports');
const OUT = path.join(ROOT, 'campaigns', 'supersale', 'scripts', '_sql');

fs.mkdirSync(OUT, { recursive: true });

const TENANT = tenantIdArg || '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const SUPERSALE = '32423133-5f25-4ce4-8bf2-66207c29a50f';
const BATCH = 100;
const skipped = [];
const logSkip = makeSkipLogger(skipped);
function readSheetLocal(fileName) {
  return _readSheet(EXPORTS, fileName);
}

// ---------- STEP 3: Events ----------

function buildEvents() {
  const rows = readSheetLocal('Events_Management_1776697208.xlsx');
  const values = [];
  const multiSaleEventNumbers = new Set(); // D-5: skip these and their attendees
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    const eventNumber = r[1];
    if (eventNumber === null || eventNumber === '' || !r[0]) {
      logSkip('Events_Management', i, 'no event_number or name (totals row)', r);
      continue;
    }
    const num = parseInt(eventNumber, 10);
    if (isNaN(num)) {
      logSkip('Events_Management', i, 'event_number not numeric', r);
      continue;
    }
    const name = String(r[0]).trim();
    const eventDate = toISODate(r[2]);
    if (!eventDate) {
      logSkip('Events_Management', i, 'no event_date', r);
      continue;
    }
    const available = String(r[3] || '09:00 - 14:00').trim();
    const times = available.split(/\s*[-–]\s*/);
    const startTime = (times[0] || '09:00').trim();
    const endTime = (times[1] || '14:00').trim();
    const statusRaw = trimOrNull(r[4]);
    const status = eventStatusMap[statusRaw] || 'planning';
    const formLink = trimOrNull(r[6]);
    const interests = trimOrNull(r[7]);
    // D-5 (REC-005): MultiSale events are skipped at cutover. Record their
    // event_number so buildAttendees() can drop their attendees too.
    if (interests && interests.includes('MultiSale')) {
      multiSaleEventNumbers.add(num);
      logSkip('Events_Management', i, `D-5: MultiSale event skipped (event #${num} "${name}")`, r);
      continue;
    }
    const campaignId = interests === 'SuperSale' ? SUPERSALE : null;
    if (!campaignId) {
      logSkip('Events_Management', i, `unknown Interests: ${interests}`, r);
      continue;
    }
    let address = String(r[13] || '').trim();
    if (address.endsWith('.')) address = address.slice(0, -1);
    if (!address) {
      logSkip('Events_Management', i, 'no address', r);
      continue;
    }
    const coupon = trimOrNull(r[14]) || `event_${num}`;
    const notes = trimOrNull(r[15]);

    values.push(
      `(${q(TENANT)}, ${q(campaignId)}, ${num}, ${q(name)}, ${q(eventDate)}, ${q(startTime)}, ${q(endTime)}, ${q(address)}, ${q(status)}, ${q(coupon)}, ${q(formLink)}, ${q(notes)})`
    );
  }
  const sql = `-- Step 3: Events (${values.length} rows; ${multiSaleEventNumbers.size} MultiSale events dropped per D-5)
INSERT INTO crm_events (tenant_id, campaign_id, event_number, name, event_date, start_time, end_time, location_address, status, coupon_code, registration_form_url, notes) VALUES
${values.join(',\n')}
ON CONFLICT (tenant_id, event_number) DO NOTHING;
`;
  return { sql, count: values.length, multiSaleEventNumbers };
}

// ---------- STEP 4a: Leads ----------

function buildLeads() {
  const rows = readSheetLocal('Tier_2_Master_Board_1776697136.xlsx');
  const batches = [];
  let batch = [];
  const seenPhones = new Set(); // also returned for D-1 orphan detection

  // D-2 (REC-002) DROP vision questionnaire summary: not read here. The
  // questionnaire actually lives in Events_Record col 14 (Optic Summery), not
  // Tier_2 col 14 — see SPEC §14 Δ-6. Either way it is intentionally not
  // mapped to client_notes per Daniel's directive.
  //
  // D-4 (REC-004) DROP "Category" tags: Tier_2 col 16 (approve_type / category)
  // is not read here, intentionally not mapped to any tag table.

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    // header re-emission: col 0 is literally 'שם מלא' or col 4 is 'Phone Number'
    if (r[0] === 'שם מלא' || r[4] === 'Phone Number' || r[2] === 'Status') {
      logSkip('Tier_2', i, 'header re-emission', r);
      continue;
    }
    const fullName = trimOrNull(r[0]);
    if (!fullName) {
      logSkip('Tier_2', i, 'no full_name', r);
      continue;
    }
    const phone = normalizePhone(r[4]);
    if (!phone) {
      logSkip('Tier_2', i, 'invalid phone', r);
      continue;
    }
    if (seenPhones.has(phone)) {
      logSkip('Tier_2', i, 'duplicate phone within Tier 2', r);
      continue;
    }
    seenPhones.add(phone);

    const created = toISOTimestamp(r[1]);
    const statusRaw = trimOrNull(r[2]);
    const status = leadStatusMap[statusRaw] || 'new';
    const email = lower(r[5]);
    const eyeExamDefault = mapEyeExamDefault(r[11]); // D-6
    const city = trimOrNull(r[12]);
    const termsYes = r[15] === 'כן';
    const lg = trimOrNull(r[17]);
    const languageHeb = mapHebrewLang(trimOrNull(r[31]));
    const language = lg === 'he' || lg === 'ru' ? lg : languageHeb || 'he';
    const marketing = r[18] === 'on';
    const approvalTime = toISOTimestamp(r[19]);
    const termsApprovedAt = termsYes ? approvalTime || created : null;
    const utmSource = lower(r[21]);
    const utmMedium = lower(r[22]);
    const utmCampaign = trimOrNull(r[23]);
    const utmContent = trimOrNull(r[24]);
    const utmTerm = trimOrNull(r[25]);
    const utmCampaignId = trimOrNull(r[27]);
    const itemId = trimOrNull(r[30]);

    batch.push(
      `(${q(TENANT)}, ${q(fullName)}, ${q(phone)}, ${q(email)}, ${q(city)}, ${q(language)}, ${q(status)}, 'monday_legacy', ${q(eyeExamDefault)}, ${q(utmSource)}, ${q(utmMedium)}, ${q(utmCampaign)}, ${q(utmContent)}, ${q(utmTerm)}, ${q(utmCampaignId)}, ${termsYes ? 'true' : 'false'}, ${q(termsApprovedAt)}, ${marketing ? 'true' : 'false'}, ${q(itemId)}, ${q(created)})`
    );

    if (batch.length >= BATCH) {
      batches.push(batch);
      batch = [];
    }
  }
  if (batch.length) batches.push(batch);

  const files = batches.map((b, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    return {
      name: `02_leads_${num}.sql`,
      sql: `-- Step 4a: Leads batch ${num} (${b.length} rows) — REC-006 eye_exam_default mapped
INSERT INTO crm_leads (tenant_id, full_name, phone, email, city, language, status, source, eye_exam_default, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id, terms_approved, terms_approved_at, marketing_consent, monday_item_id, created_at) VALUES
${b.join(',\n')}
ON CONFLICT (tenant_id, phone) WHERE is_deleted = false DO NOTHING;
`,
    };
  });
  const totalLeads = batches.reduce((a, b) => a + b.length, 0);
  return { files, count: totalLeads, tier2Phones: seenPhones };
}

// Step 4b (orphan stub leads), Step 6 (attendees), Step 6b (synth message_log),
// and Step 7 (ad spend) live in import-monday-builders.mjs. They take a `ctx`
// arg from main() with { TENANT, BATCH, readSheet, logSkip }.


// CX surveys (Step 8) and audit_log (Step 9) entity helpers removed per Δ-4
// scope reduction. If a future SPEC re-introduces these entities, restore
// from git history at commit 7912a51 (the original importer commit).

// ---------- Main ----------

function write(name, sql) {
  fs.writeFileSync(path.join(OUT, name), sql, 'utf8');
}

function main() {
  console.log(`source-dir: ${EXPORTS}`);
  console.log(`tenant-id:  ${TENANT}`);

  // Clean _sql dir first (idempotent re-runs)
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.sql')) fs.unlinkSync(path.join(OUT, f));
  }

  // Builder context — passed to imported builders that don't have closure access.
  const ctx = { TENANT, BATCH, readSheet: readSheetLocal, logSkip };

  // Step 1: Events (D-5 drops MultiSale events; returns multiSaleEventNumbers)
  const events = buildEvents();
  write('01_events.sql', events.sql);
  console.log(
    `  events: ${events.count} (${events.multiSaleEventNumbers.size} MultiSale event(s) dropped per D-5)`
  );

  // Step 2: Master leads from Tier_2 (D-6 maps eye_exam_default; source='monday_legacy')
  const leads = buildLeads();
  for (const f of leads.files) write(f.name, f.sql);
  console.log(`  leads: ${leads.count} in ${leads.files.length} batches`);

  // Step 3: Stub leads for orphan attendees (D-1, source='monday_legacy_orphan')
  const stubs = buildStubLeads(ctx, leads.tier2Phones);
  for (const f of stubs.files) write(f.name, f.sql);
  console.log(`  stub leads: ${stubs.count} in ${stubs.files.length} batches`);

  // Step 4: Attendees (D-3 sets coupon_sent; D-5 drops MultiSale attendees)
  const atts = buildAttendees(ctx, events.multiSaleEventNumbers);
  for (const f of atts.files) write(f.name, f.sql);
  console.log(
    `  attendees: ${atts.count} in ${atts.files.length} batches (${atts.multiSaleAttendeesSkipped} MultiSale attendees dropped per D-5)`
  );

  // Step 5: Synthesized message_log for coupon-sent markers (D-3)
  const synth = buildSynthMessageLog(ctx, atts.couponRecords);
  for (const f of synth.files) write(f.name, f.sql);
  console.log(`  synth message_log: ${synth.count} in ${synth.files.length} batches`);

  // Step 6: Ad spend (kept per Δ-4)
  const ad = buildAdSpend(ctx);
  write('07_ad_spend.sql', ad.sql);
  console.log(`  ad_spend: ${ad.count}`);

  // Δ-4 DROPPED: affiliates_enrich, lead_notes, cx_surveys, audit_log

  const skippedPath = path.join(path.dirname(OUT), 'import-skipped.json');
  fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');
  console.log(`  skipped rows: ${skipped.length} → ${skippedPath}`);

  const reportPath = path.join(path.dirname(OUT), 'import-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_dir: EXPORTS,
        tenant_id: TENANT,
        counts: {
          events: events.count,
          events_multisale_dropped: events.multiSaleEventNumbers.size,
          leads: leads.count,
          stub_leads: stubs.count,
          attendees: atts.count,
          attendees_multisale_dropped: atts.multiSaleAttendeesSkipped,
          synth_message_log: synth.count,
          ad_spend: ad.count,
          skipped: skipped.length,
        },
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`  report: ${reportPath}`);
}

main();
