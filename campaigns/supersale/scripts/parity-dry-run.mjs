#!/usr/bin/env node
// Monday → Optic Up parity dry-run validator.
//
// Reads the same Monday exports that import-monday-data.mjs reads, but
// instead of producing SQL it walks each row of a sampled subset and
// emits a per-column field-by-field diff vs the importer's mapping.
//
// Exit code 0 = every Monday column with data is either mapped to a
// crm_* target or has an explicit ignore reason (per
// MONDAY_TO_OPTIC_UP_PARITY.md). Exit code 1 = at least one column
// has live data with no mapping (cutover blocker — Daniel must triage).
//
// Usage:
//   node campaigns/supersale/scripts/parity-dry-run.mjs            # default sample 5
//   node campaigns/supersale/scripts/parity-dry-run.mjs --sample N
//
// SPEC reference: PRE_CUTOVER_QA_A_DATA_AND_LOGIC §3 #19.

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_EXPORTS = path.join(ROOT, 'campaigns', 'supersale', 'exports');

// ---- args ----
const argv = process.argv.slice(2);
let sampleSize = 5;
let sourceDir = null;
let tenantIdArg = null; // accepted for symmetry with importer; not used by parity
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--sample' && argv[i + 1]) {
    const n = parseInt(argv[i + 1], 10);
    if (Number.isFinite(n) && n > 0) sampleSize = n;
  }
  if (argv[i] === '--source-dir' && argv[i + 1]) {
    sourceDir = argv[i + 1];
  }
  if (argv[i] === '--tenant-id' && argv[i + 1]) {
    tenantIdArg = argv[i + 1];
  }
}
const EXPORTS = sourceDir ? path.resolve(sourceDir) : DEFAULT_EXPORTS;

// When --source-dir is provided, the timestamp suffix in filenames may differ.
// Resolve a SPEC entry's `file` to whatever export currently matches its prefix.
function resolveFile(declaredFile) {
  // declaredFile examples: "Tier_2_Master_Board_1776697136.xlsx"
  // We strip the trailing _<digits>.xlsx and search the dir for any file whose
  // base starts with the same prefix and ends with .xlsx.
  const m = declaredFile.match(/^(.+?)_\d+\.xlsx$/);
  const prefix = m ? m[1] + '_' : declaredFile.replace(/\.xlsx$/, '_');
  if (!fs.existsSync(EXPORTS)) return null;
  const all = fs.readdirSync(EXPORTS);
  const exact = all.find((f) => f === declaredFile);
  if (exact) return exact;
  const match = all.find((f) => f.startsWith(prefix) && f.endsWith('.xlsx'));
  return match || null;
}

// ---- mapping spec (mirror of MONDAY_TO_OPTIC_UP_PARITY.md tables) ----
//
// Each entry: { col, label, target, transform, note }
//   target='IGNORED' marks an explicit non-mapping with a reason in `note`.
//   target='FK_ONLY' marks a column used only for the JOIN (e.g. phone, event_number).

const SPEC = {
  Events_Management: {
    file: 'Events_Management_1776697208.xlsx',
    headerRow: 2,
    cols: [
      { col: 0,  label: 'name',                target: 'crm_events.name' },
      { col: 1,  label: 'event_number',         target: 'crm_events.event_number' },
      { col: 2,  label: 'event_date',           target: 'crm_events.event_date' },
      { col: 3,  label: 'available_time',       target: 'crm_events.start_time + end_time' },
      { col: 4,  label: 'event_status',         target: 'crm_events.status' },
      { col: 5,  label: 'event_opening',        target: 'IGNORED', note: 'Redundant with status' },
      { col: 6,  label: 'form_link',            target: 'crm_events.registration_form_url' },
      { col: 7,  label: 'interests',            target: 'crm_events.campaign_id (lookup)' },
      { col: 8,  label: 'total_registered',     target: 'IGNORED', note: 'Derived in Optic Up' },
      { col: 9,  label: 'total_confirmed',      target: 'IGNORED', note: 'Derived in Optic Up' },
      { col: 10, label: 'total_attended',       target: 'IGNORED', note: 'Derived in Optic Up' },
      { col: 11, label: 'total_purchases',      target: 'IGNORED', note: 'Derived in Optic Up' },
      { col: 12, label: 'revenue',              target: 'IGNORED', note: 'Derived in Optic Up' },
      { col: 13, label: 'address',              target: 'crm_events.location_address' },
      { col: 14, label: 'coupon',               target: 'crm_events.coupon_code' },
      { col: 15, label: 'notes',                target: 'crm_events.notes' },
      { col: 16, label: 'extra_a',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 17, label: 'extra_b',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 18, label: 'extra_c',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 19, label: 'extra_d',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 20, label: 'extra_e',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 21, label: 'extra_f',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 22, label: 'extra_g',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 23, label: 'extra_h',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 24, label: 'extra_i',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 25, label: 'extra_j',              target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
    ],
  },
  Tier_2_Master_Board: {
    file: 'Tier_2_Master_Board_1776697136.xlsx',
    headerRow: 2,
    cols: [
      { col: 0,  label: 'full_name',            target: 'crm_leads.full_name' },
      { col: 1,  label: 'created_at',           target: 'crm_leads.created_at' },
      { col: 2,  label: 'status',               target: 'crm_leads.status' },
      { col: 3,  label: 'person',               target: 'IGNORED', note: 'Monday ownership marker' },
      { col: 4,  label: 'phone',                target: 'crm_leads.phone' },
      { col: 5,  label: 'email',                target: 'crm_leads.email' },
      { col: 6,  label: 'last_update_mirror',   target: 'IGNORED', note: 'Mirrors created_at; Optic Up uses updated_at' },
      { col: 7,  label: 'notes',                target: 'crm_lead_notes.content' },
      { col: 8,  label: 'first_contact_ts',     target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 9,  label: 'last_update_ts_a',     target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 10, label: 'last_update_ts_b',     target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 11, label: 'last_update_ts_c',     target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 12, label: 'city',                 target: 'crm_leads.city' },
      { col: 13, label: 'pulse_a',              target: 'IGNORED', note: 'Monday telemetry-only' },
      { col: 14, label: 'pulse_b',              target: 'IGNORED', note: 'Monday telemetry-only' },
      { col: 15, label: 'terms_approved',       target: 'crm_leads.terms_approved' },
      { col: 16, label: 'approve_type',         target: 'IGNORED', note: 'Detail not stored in Optic Up' },
      { col: 17, label: 'language_iso',         target: 'crm_leads.language' },
      { col: 18, label: 'marketing_consent',    target: 'crm_leads.marketing_consent' },
      { col: 19, label: 'approval_ts',          target: 'crm_leads.terms_approved_at' },
      { col: 20, label: 'last_modifier',        target: 'IGNORED', note: 'Monday user metadata' },
      { col: 21, label: 'utm_source',           target: 'crm_leads.utm_source' },
      { col: 22, label: 'utm_medium',           target: 'crm_leads.utm_medium' },
      { col: 23, label: 'utm_campaign',         target: 'crm_leads.utm_campaign' },
      { col: 24, label: 'utm_content',          target: 'crm_leads.utm_content' },
      { col: 25, label: 'utm_term',             target: 'crm_leads.utm_term' },
      { col: 26, label: 'utm_id_internal',      target: 'IGNORED', note: 'Internal Monday id; col 27 is FB canonical' },
      { col: 27, label: 'utm_campaign_id',      target: 'crm_leads.utm_campaign_id' },
      { col: 28, label: 'subitems',             target: 'IGNORED', note: 'Monday subitems helper' },
      { col: 29, label: 'recipient',            target: 'IGNORED', note: 'Monday mailing-list helper' },
      { col: 30, label: 'monday_item_id',       target: 'crm_leads.monday_item_id' },
      { col: 31, label: 'language_hebrew',      target: 'crm_leads.language (fallback)' },
    ],
  },
  Events_Record_Attendees: {
    file: 'Events_Record_Attendees_1776697299.xlsx',
    headerRow: 2,
    cols: [
      { col: 0,  label: 'item_name',            target: 'IGNORED', note: 'Header-mislabeled; full_name from JOIN' },
      { col: 1,  label: 'created_at',           target: 'crm_event_attendees.registered_at' },
      { col: 2,  label: 'phone',                target: 'FK_ONLY', note: 'Used to JOIN crm_leads' },
      { col: 3,  label: 'person',               target: 'IGNORED', note: 'Monday ownership marker' },
      { col: 4,  label: 'approval_type',        target: 'IGNORED', note: 'Redundant descriptor' },
      { col: 5,  label: 'status',               target: 'crm_event_attendees.status' },
      { col: 6,  label: 'client_notes',         target: 'crm_event_attendees.client_notes' },
      { col: 7,  label: 'scheduled_time',       target: 'crm_event_attendees.scheduled_time' },
      { col: 8,  label: 'purchase_amount',      target: 'crm_event_attendees.purchase_amount' },
      { col: 9,  label: 'derived_revenue',      target: 'IGNORED', note: 'Redundant with col 8' },
      { col: 10, label: 'event_number',         target: 'FK_ONLY', note: 'Used to JOIN crm_events' },
      { col: 11, label: 'workflow_ts_a',        target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 12, label: 'workflow_ts_b',        target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 13, label: 'workflow_ts_c',        target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 14, label: 'workflow_ts_d',        target: 'IGNORED', note: 'Monday workflow marker' },
      { col: 15, label: 'monday_item_id',       target: 'crm_event_attendees.monday_item_id' },
      { col: 16, label: 'scheduled_time_alt',   target: 'crm_event_attendees.scheduled_time (fallback)' },
      { col: 17, label: 'eye_exam_needed',      target: 'crm_event_attendees.eye_exam_needed' },
      { col: 18, label: 'attendee_extra_a',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 19, label: 'attendee_extra_b',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 20, label: 'attendee_extra_c',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 21, label: 'attendee_extra_d',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 22, label: 'attendee_extra_e',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 23, label: 'attendee_extra_f',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 24, label: 'attendee_extra_g',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
      { col: 25, label: 'attendee_extra_h',     target: 'IGNORED', note: 'Monday workflow column not consumed by importer' },
    ],
  },
};

function parityReadSheet(fileName) {
  const wb = XLSX.readFile(path.join(EXPORTS, fileName), { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true });
}

function parityNonNullCount(row) {
  return row.filter((c) => c !== null && c !== '').length;
}

function previewVal(v) {
  if (v === null || v === undefined) return '∅';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  if (s.length <= 36) return s;
  return s.slice(0, 33) + '...';
}

function checkEntity(name, def) {
  const resolved = resolveFile(def.file);
  if (!resolved) {
    return { name, status: 'SKIP', reason: `Export file not found (looked for ${def.file} or matching prefix in ${EXPORTS})`, mapped: 0, ignored: 0, gaps: [] };
  }
  const filePath = path.join(EXPORTS, resolved);
  if (resolved !== def.file) {
    console.log(`  (${name}: resolved ${def.file} → ${resolved})`);
  }
  const rows = parityReadSheet(resolved);
  const dataRows = [];
  // first non-header data row starts at headerRow + 1
  for (let i = def.headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (parityNonNullCount(r) <= 1) continue;
    if (r[0] === 'שם מלא' || r[0] === 'שמך המלא' || r[0] === 'טלפון') continue; // header re-emission
    dataRows.push({ i, r });
    if (dataRows.length >= sampleSize) break;
  }

  const mapped = def.cols.filter((c) => c.target !== 'IGNORED' && c.target !== 'FK_ONLY').length;
  const fkOnly = def.cols.filter((c) => c.target === 'FK_ONLY').length;
  const ignored = def.cols.filter((c) => c.target === 'IGNORED').length;
  const total = def.cols.length;
  const gaps = [];

  console.log(`\n── ${name} (${def.file}) ──`);
  console.log(`spec: ${total} columns | ${mapped} mapped | ${fkOnly} fk-only | ${ignored} ignored`);
  console.log(`sampling first ${dataRows.length} non-header data rows...`);

  for (const { i, r } of dataRows) {
    console.log(`\n  row #${i}:`);
    for (const c of def.cols) {
      const val = r[c.col];
      const has = val !== null && val !== undefined && val !== '';
      const flag = c.target === 'IGNORED' ? '⛔' : c.target === 'FK_ONLY' ? '🔗' : '✅';
      const valStr = has ? previewVal(val) : '∅';
      console.log(`    ${flag} col ${String(c.col).padStart(2)} ${c.label.padEnd(24)} → ${c.target.padEnd(40)} | ${valStr}`);
      // Coverage gap = column has data AND is not in spec at all
    }
    // detect any out-of-spec column with data
    for (let col = 0; col < r.length; col++) {
      if (def.cols.find((c) => c.col === col)) continue;
      const val = r[col];
      if (val !== null && val !== undefined && val !== '') {
        const gap = `${name} row #${i} col ${col} has data ("${previewVal(val)}") but is not declared in mapping spec`;
        if (!gaps.includes(gap)) gaps.push(gap);
      }
    }
  }
  return { name, status: gaps.length === 0 ? 'PASS' : 'FAIL', mapped, fkOnly, ignored, gaps };
}

function parityMain() {
  console.log(`Monday → Optic Up parity dry-run (sample=${sampleSize}/entity)`);
  console.log(`Exports: ${EXPORTS}`);
  const results = [];
  for (const [name, def] of Object.entries(SPEC)) {
    results.push(checkEntity(name, def));
  }
  console.log(`\n══ SUMMARY ══`);
  let totalGaps = 0;
  for (const r of results) {
    const gapTxt = r.gaps && r.gaps.length ? `  [${r.gaps.length} GAPS]` : '';
    console.log(`  ${r.status.padEnd(4)} ${r.name.padEnd(28)} mapped:${r.mapped}  fk:${r.fkOnly || 0}  ignored:${r.ignored}${gapTxt}`);
    totalGaps += (r.gaps?.length) || 0;
    for (const g of r.gaps || []) console.log(`        ${g}`);
  }
  console.log(`\n${totalGaps === 0 ? '✅ 0 unmapped fields' : `❌ ${totalGaps} unmapped fields`}`);
  process.exit(totalGaps === 0 ? 0 : 1);
}

parityMain();
