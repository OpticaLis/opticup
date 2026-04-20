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

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');
const EXPORTS = path.join(ROOT, 'campaigns', 'supersale', 'exports');
const OUT = path.join(ROOT, 'campaigns', 'supersale', 'scripts', '_sql');

fs.mkdirSync(OUT, { recursive: true });

const TENANT = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const SUPERSALE = '32423133-5f25-4ce4-8bf2-66207c29a50f';
const MULTISALE = 'f5aebad0-c050-4919-8956-aaaa9b96cdd0';
const BATCH = 100;
const skipped = [];

// ---------- helpers ----------

function readSheet(fileName) {
  const wb = XLSX.readFile(path.join(EXPORTS, fileName), { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: null,
    raw: true,
  });
}

// SQL-escape a value. Returns a literal SQL fragment (quoted if string).
function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'NULL';
    return String(v);
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return 'NULL';
    return `'${v.toISOString()}'`;
  }
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

// Normalize a phone per DATA_DISCOVERY_REPORT §4.
function normalizePhone(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let s = String(raw).trim();
  if (s === 'Phone Number' || s === 'טלפון' || s === 'שם מלא') return null;
  // Strip non-digits
  s = s.replace(/\D/g, '');
  if (s.length === 0) return null;
  if (s.length === 12 && s.startsWith('972')) return '+' + s;
  if (s.length === 9 && s.startsWith('5')) return '+972' + s;
  if (s.length === 10 && s.startsWith('05')) return '+972' + s.slice(1);
  return null; // flag / skip
}

function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function toISODate(v) {
  const d = toDate(v);
  if (!d) return null;
  // Event dates — use UTC date part (timezone-shifted back 1 day in some cases).
  // Compensate: if the time is between 20:00 and 23:59 UTC, it's likely local
  // midnight shifted by UTC+2/3. Shift forward to get intended local date.
  const shifted = new Date(d.getTime() + 6 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function toISOTimestamp(v) {
  const d = toDate(v);
  return d ? d.toISOString() : null;
}

function nonNullCount(row) {
  return row.filter((c) => c !== null && c !== '').length;
}

function isGroupBreakRow(row, expectedHeaders) {
  if (!row) return true;
  if (nonNullCount(row) <= 1) return true;
  // Header re-emission: the row's col 0 matches the header's col 0 (e.g. "שם מלא")
  if (expectedHeaders && row[0] === expectedHeaders[0]) return true;
  return false;
}

function trimOrNull(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v.toISOString();
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

function lower(v) {
  const s = trimOrNull(v);
  return s === null ? null : s.toLowerCase();
}

function logSkip(file, rowIndex, reason, row) {
  skipped.push({
    file,
    row_index: rowIndex,
    reason,
    row: row ? row.slice(0, 8).map((c) => (c instanceof Date ? c.toISOString() : c)) : null,
  });
}

// ---------- STEP 2: unit_economics (handled inline in 01_events.sql) ----------

const unitEconSql = `-- Step 2: MultiSale unit_economics
INSERT INTO crm_unit_economics (tenant_id, campaign_id, gross_margin_pct, kill_multiplier, scaling_multiplier)
VALUES ('${TENANT}', '${MULTISALE}', 0.50, 5, 7)
ON CONFLICT (tenant_id, campaign_id) DO NOTHING;
`;

// ---------- STEP 3: Events ----------

const eventStatusMap = {
  'Completed': 'completed',
  'Closed': 'closed',
  'Registration Open': 'registration_open',
};

function buildEvents() {
  const rows = readSheet('Events_Management_1776697208.xlsx');
  const headers = rows[2];
  const values = [];
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
    const campaignId = interests === 'SuperSale' ? SUPERSALE : interests === 'MultiSale' ? MULTISALE : null;
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
  const sql = `-- Step 3: Events (${values.length} rows)
INSERT INTO crm_events (tenant_id, campaign_id, event_number, name, event_date, start_time, end_time, location_address, status, coupon_code, registration_form_url, notes) VALUES
${values.join(',\n')}
ON CONFLICT (tenant_id, event_number) DO NOTHING;
`;
  return { sql, count: values.length };
}

// ---------- STEP 4a: Leads ----------

const leadStatusMap = {
  'ממתין לאירוע': 'waiting',
  'ביטל Unsubscribe': 'unsubscribed',
  'הוזמן לאירוע': 'invited',
  'לא מעוניין': 'not_interested',
};

function mapHebrewLang(v) {
  if (v === 'עברית') return 'he';
  if (v === 'רוסית') return 'ru';
  return null;
}

function buildLeads() {
  const rows = readSheet('Tier_2_Master_Board_1776697136.xlsx');
  const batches = [];
  const notes = []; // { phone, content, created_at }
  let batch = [];
  const seenPhones = new Set();

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
    const notesRaw = trimOrNull(r[7]);
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
      `(${q(TENANT)}, ${q(fullName)}, ${q(phone)}, ${q(email)}, ${q(city)}, ${q(language)}, ${q(status)}, ${q(utmSource)}, ${q(utmMedium)}, ${q(utmCampaign)}, ${q(utmContent)}, ${q(utmTerm)}, ${q(utmCampaignId)}, ${termsYes ? 'true' : 'false'}, ${q(termsApprovedAt)}, ${marketing ? 'true' : 'false'}, ${q(itemId)}, ${q(created)})`
    );

    if (notesRaw) {
      notes.push({ phone, content: notesRaw });
    }

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
      sql: `-- Step 4a: Leads batch ${num} (${b.length} rows)
INSERT INTO crm_leads (tenant_id, full_name, phone, email, city, language, status, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id, terms_approved, terms_approved_at, marketing_consent, monday_item_id, created_at) VALUES
${b.join(',\n')}
ON CONFLICT (tenant_id, phone) DO NOTHING;
`,
    };
  });
  const totalLeads = batches.reduce((a, b) => a + b.length, 0);
  return { files, notes, count: totalLeads };
}

// ---------- STEP 4b: Affiliates UTM enrichment ----------

function buildAffiliatesEnrich() {
  const rows = readSheet('Affiliates_1776697312.xlsx');
  const values = [];
  const seen = new Set();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    const phone = normalizePhone(r[2]);
    if (!phone) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    const utmSource = lower(r[8]);
    const utmMedium = lower(r[9]);
    const utmCampaign = trimOrNull(r[10]);
    const utmContent = trimOrNull(r[11]);
    const utmTerm = trimOrNull(r[12]);
    const utmCampaignId = trimOrNull(r[13]);
    if (!utmSource && !utmMedium && !utmCampaign && !utmContent && !utmTerm && !utmCampaignId) continue;
    values.push(
      `(${q(phone)}, ${q(utmSource)}, ${q(utmMedium)}, ${q(utmCampaign)}, ${q(utmContent)}, ${q(utmTerm)}, ${q(utmCampaignId)})`
    );
  }
  // Split into batches
  const files = [];
  for (let i = 0; i < values.length; i += BATCH) {
    const slice = values.slice(i, i + BATCH);
    const num = String(Math.floor(i / BATCH) + 1).padStart(2, '0');
    files.push({
      name: `03_affiliates_enrich_${num}.sql`,
      sql: `-- Step 4b: Affiliates UTM enrichment batch ${num} (${slice.length} rows) — only fill NULLs
WITH src(phone, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id) AS (VALUES
${slice.join(',\n')}
)
UPDATE crm_leads l SET
  utm_source      = COALESCE(l.utm_source, src.utm_source),
  utm_medium      = COALESCE(l.utm_medium, src.utm_medium),
  utm_campaign    = COALESCE(l.utm_campaign, src.utm_campaign),
  utm_content     = COALESCE(l.utm_content, src.utm_content),
  utm_term        = COALESCE(l.utm_term, src.utm_term),
  utm_campaign_id = COALESCE(l.utm_campaign_id, src.utm_campaign_id)
FROM src
WHERE l.tenant_id = '${TENANT}' AND l.phone = src.phone;
`,
    });
  }
  return { files, count: values.length };
}

// ---------- STEP 5: Lead notes ----------

function buildLeadNotes(notes) {
  const files = [];
  for (let i = 0; i < notes.length; i += BATCH) {
    const slice = notes.slice(i, i + BATCH);
    const values = slice.map((n) => {
      const content =
        '--- היסטוריה ממאנדיי (ייבוא 2026-04-20) ---\n' + n.content;
      return `(${q(n.phone)}, ${q(content)})`;
    });
    const num = String(Math.floor(i / BATCH) + 1).padStart(2, '0');
    files.push({
      name: `04_lead_notes_${num}.sql`,
      sql: `-- Step 5: Lead notes batch ${num} (${slice.length} rows)
INSERT INTO crm_lead_notes (tenant_id, lead_id, content)
SELECT '${TENANT}', l.id, src.content
FROM (VALUES
${values.join(',\n')}
) AS src(phone, content)
JOIN crm_leads l ON l.tenant_id = '${TENANT}' AND l.phone = src.phone;
`,
    });
  }
  return { files, count: notes.length };
}

// ---------- STEP 6: Attendees ----------

const attendeeStatusMap = {
  'הגיע': 'attended',
  'אישר': 'confirmed',
  'ביטל': 'cancelled',
  'כבר נרשם': 'duplicate',
  'חדש': 'registered',
  'רשימת המתנה': 'waiting_list',
  'לא הגיע': 'no_show',
  'אירוע נסגר': 'event_closed',
  'הגיע ולא קנה': 'attended', // with purchase_amount = NULL
};

function buildAttendees() {
  const rows = readSheet('Events_Record_Attendees_1776697299.xlsx');
  const values = [];
  const seenKey = new Set();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    if (r[0] === 'טלפון' || r[0] === 'שמך המלא' || r[5] === 'Status') {
      logSkip('Events_Record', i, 'header re-emission', r);
      continue;
    }
    // NOTE: header labels col 0 as "טלפון" but Monday actually exports the
    // attendee NAME in col 0 (item-name column). The real phone is col 2
    // ("Phone Number"). Logged as a finding against DATA_DISCOVERY_REPORT §2.4.
    const phone = normalizePhone(r[2]);
    if (!phone) {
      logSkip('Events_Record', i, 'invalid phone', r);
      continue;
    }
    const eventNumRaw = r[10];
    if (eventNumRaw === null || eventNumRaw === '') {
      logSkip('Events_Record', i, 'no event_number', r);
      continue;
    }
    const eventNum = parseInt(eventNumRaw, 10);
    if (isNaN(eventNum)) {
      logSkip('Events_Record', i, 'event_number not numeric', r);
      continue;
    }
    const key = `${phone}|${eventNum}`;
    if (seenKey.has(key)) {
      logSkip('Events_Record', i, 'duplicate (phone, event_number)', r);
      continue;
    }
    seenKey.add(key);

    const registeredAt = toISOTimestamp(r[1]) || new Date().toISOString();
    const statusRaw = trimOrNull(r[5]);
    let status = attendeeStatusMap[statusRaw] || 'registered';
    const clientNotes = trimOrNull(r[6]);
    const scheduledTime = trimOrNull(r[7]) || trimOrNull(r[16]);
    let purchaseAmountRaw = r[8];
    let purchaseAmount = null;
    if (purchaseAmountRaw !== null && purchaseAmountRaw !== '' && statusRaw !== 'הגיע ולא קנה') {
      const n = parseFloat(purchaseAmountRaw);
      if (!isNaN(n) && n > 0) purchaseAmount = n;
    }
    const itemId = trimOrNull(r[15]);
    const eyeExamRaw = trimOrNull(r[17]);
    const eyeExam = eyeExamRaw === 'כן' || eyeExamRaw === 'לא' ? eyeExamRaw : null;
    const confirmedAt = status === 'confirmed' || status === 'attended' ? registeredAt : null;
    const checkedInAt = status === 'attended' ? registeredAt : null;
    const purchasedAt = purchaseAmount !== null && purchaseAmount > 0 ? registeredAt : null;
    const cancelledAt = status === 'cancelled' ? registeredAt : null;

    values.push(
      `(${q(phone)}, ${eventNum}, ${q(status)}, ${q(registeredAt)}, ${q(confirmedAt)}, ${q(checkedInAt)}, ${q(purchasedAt)}, ${q(cancelledAt)}, ${purchaseAmount === null ? 'NULL' : purchaseAmount}, ${q(scheduledTime)}, ${q(eyeExam)}, ${q(clientNotes)}, ${q(itemId)})`
    );
  }
  const files = [];
  for (let i = 0; i < values.length; i += BATCH) {
    const slice = values.slice(i, i + BATCH);
    const num = String(Math.floor(i / BATCH) + 1).padStart(2, '0');
    files.push({
      name: `05_attendees_${num}.sql`,
      sql: `-- Step 6: Attendees batch ${num} (${slice.length} rows)
INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registered_at, confirmed_at, checked_in_at, purchased_at, cancelled_at, purchase_amount, scheduled_time, eye_exam_needed, client_notes, monday_item_id)
SELECT '${TENANT}', l.id, e.id, src.status, src.registered_at, src.confirmed_at, src.checked_in_at, src.purchased_at, src.cancelled_at, src.purchase_amount, src.scheduled_time, src.eye_exam, src.client_notes, src.item_id
FROM (VALUES
${slice.join(',\n')}
) AS src(phone, event_number, status, registered_at, confirmed_at, checked_in_at, purchased_at, cancelled_at, purchase_amount, scheduled_time, eye_exam, client_notes, item_id)
JOIN crm_leads l  ON l.tenant_id = '${TENANT}' AND l.phone = src.phone
JOIN crm_events e ON e.tenant_id = '${TENANT}' AND e.event_number = src.event_number
ON CONFLICT (tenant_id, lead_id, event_id) DO NOTHING;
`,
    });
  }
  return { files, count: values.length };
}

// ---------- STEP 7: Ad spend ----------

function buildAdSpend() {
  const fbRows = readSheet('Facebook_ADS_1776697328.xlsx');
  // Build Affiliates cross-ref map: Campaign ID (col 13) → { campaign, content, term }
  const affRows = readSheet('Affiliates_1776697312.xlsx');
  const utmMap = new Map();
  for (let i = 3; i < affRows.length; i++) {
    const r = affRows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    const campId = trimOrNull(r[13]);
    if (!campId) continue;
    if (utmMap.has(campId)) continue;
    utmMap.set(campId, {
      campaign: trimOrNull(r[10]),
      content: trimOrNull(r[11]),
      term: trimOrNull(r[12]),
    });
  }

  const values = [];
  let utmMatches = 0;
  for (let i = 3; i < fbRows.length; i++) {
    const r = fbRows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    if (r[0] === 'שם מלא' || r[2] === 'Status') {
      logSkip('Facebook_ADS', i, 'header re-emission', r);
      continue;
    }
    const name = trimOrNull(r[0]);
    if (!name) {
      logSkip('Facebook_ADS', i, 'no name', r);
      continue;
    }
    const createdAt = toISOTimestamp(r[1]);
    const statusRaw = trimOrNull(r[2]);
    const status = statusRaw ? statusRaw.toLowerCase() : 'active';
    const eventType = trimOrNull(r[3]);
    const campaignId = eventType === 'MultiSale' ? MULTISALE : SUPERSALE;
    const adCampaignId = trimOrNull(r[4]);
    const totalSpendRaw = r[5];
    let totalSpend = 0;
    if (totalSpendRaw !== null && totalSpendRaw !== '') {
      const n = parseFloat(totalSpendRaw);
      if (!isNaN(n)) totalSpend = n;
    }
    const dailyBudgetRaw = r[6];
    let dailyBudget = null;
    if (dailyBudgetRaw !== null && dailyBudgetRaw !== '') {
      const n = parseFloat(dailyBudgetRaw);
      if (!isNaN(n)) dailyBudget = n;
    }
    let utmCampaign = null,
      utmContent = null,
      utmTerm = null;
    if (adCampaignId && utmMap.has(adCampaignId)) {
      const m = utmMap.get(adCampaignId);
      utmCampaign = m.campaign;
      utmContent = m.content;
      utmTerm = m.term;
      utmMatches++;
    }

    values.push(
      `(${q(TENANT)}, ${q(campaignId)}, ${q(name)}, ${q(adCampaignId)}, ${q(status)}, ${q(eventType)}, ${totalSpend}, ${dailyBudget === null ? 'NULL' : dailyBudget}, ${q(utmCampaign)}, ${q(utmContent)}, ${q(utmTerm)}, ${q(createdAt)})`
    );
  }
  const sql = `-- Step 7: Ad spend (${values.length} rows, ${utmMatches} UTM matches from Affiliates)
INSERT INTO crm_ad_spend (tenant_id, campaign_id, ad_campaign_name, ad_campaign_id, status, event_type, total_spend, daily_budget, utm_campaign, utm_content, utm_term, created_at) VALUES
${values.join(',\n')};
`;
  return { sql, count: values.length, utmMatches };
}

// ---------- STEP 8: CX surveys ----------

function parseRating(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v);
  const stars = (s.match(/⭐|★/g) || []).length;
  if (stars > 0) return Math.min(5, stars);
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1 && n <= 5) return n;
  return null;
}

function buildCxSurveys() {
  const rows = readSheet('CX_Ambassadors_Events_Management_1776697276.xlsx');
  const values = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    if (r[0] === 'שמך המלא' || r[2] === 'Phone Number') {
      logSkip('CX_Ambassadors', i, 'header re-emission', r);
      continue;
    }
    const phone = normalizePhone(r[2]);
    if (!phone) {
      logSkip('CX_Ambassadors', i, 'invalid phone', r);
      continue;
    }
    const eventNumRaw = r[11];
    if (eventNumRaw === null || eventNumRaw === '') {
      logSkip('CX_Ambassadors', i, 'no event_number', r);
      continue;
    }
    const eventNum = parseInt(eventNumRaw, 10);
    if (isNaN(eventNum)) {
      logSkip('CX_Ambassadors', i, 'event_number not numeric', r);
      continue;
    }
    const createdAt = toISOTimestamp(r[1]);
    const rating = parseRating(r[6]);
    const comment = trimOrNull(r[8]);
    values.push(
      `(${q(phone)}, ${eventNum}, ${rating === null ? 'NULL' : rating}, ${q(comment)}, ${q(createdAt)})`
    );
  }
  const sql = `-- Step 8: CX surveys (${values.length} rows)
INSERT INTO crm_cx_surveys (tenant_id, attendee_id, rating, comment, created_at)
SELECT '${TENANT}', a.id, src.rating, src.comment, src.created_at
FROM (VALUES
${values.join(',\n')}
) AS src(phone, event_number, rating, comment, created_at)
JOIN crm_leads l         ON l.tenant_id = '${TENANT}' AND l.phone = src.phone
JOIN crm_events e        ON e.tenant_id = '${TENANT}' AND e.event_number = src.event_number
JOIN crm_event_attendees a ON a.tenant_id = '${TENANT}' AND a.lead_id = l.id AND a.event_id = e.id;
`;
  return { sql, count: values.length };
}

// ---------- STEP 9: Audit log ----------

function buildAuditLog(counts) {
  const placeholder = '00000000-0000-0000-0000-000000000000';
  const rows = [
    ['event', 'Events_Management_1776697208.xlsx', counts.events],
    ['lead', 'Tier_2_Master_Board_1776697136.xlsx', counts.leads],
    ['lead_note', 'Tier_2_Master_Board_1776697136.xlsx', counts.leadNotes],
    ['event_attendee', 'Events_Record_Attendees_1776697299.xlsx', counts.attendees],
    ['ad_spend', 'Facebook_ADS_1776697328.xlsx', counts.adSpend],
    ['cx_survey', 'CX_Ambassadors_Events_Management_1776697276.xlsx', counts.cxSurveys],
  ];
  const skipByFile = {};
  for (const s of skipped) {
    skipByFile[s.file] = (skipByFile[s.file] || 0) + 1;
  }
  const values = rows.map(([entity, file, imported]) => {
    const fileKey = file.replace(/_17\d+\.xlsx$/, '').replace(/_/g, '_');
    const skippedCount =
      skipByFile[file.replace(/_17\d+\.xlsx$/, '').replace(/_1776697.*/, '')] ||
      skipByFile['Tier_2'] ||
      0;
    const metadata = JSON.stringify({
      source: 'monday_export',
      file,
      rows_imported: imported,
      import_date: '2026-04-20',
    }).replace(/'/g, "''");
    return `(${q(TENANT)}, ${q(entity)}, ${q(placeholder)}, 'import', '${metadata}'::jsonb)`;
  });
  const sql = `-- Step 9: Audit log import summaries
INSERT INTO crm_audit_log (tenant_id, entity_type, entity_id, action, metadata) VALUES
${values.join(',\n')};
`;
  return { sql };
}

// ---------- Main ----------

function write(name, sql) {
  fs.writeFileSync(path.join(OUT, name), sql, 'utf8');
}

function main() {
  // Clean _sql dir first (idempotent re-runs)
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.sql')) fs.unlinkSync(path.join(OUT, f));
  }

  write('00_unit_economics.sql', unitEconSql);

  const events = buildEvents();
  write('01_events.sql', events.sql);
  console.log(`  events: ${events.count}`);

  const leads = buildLeads();
  for (const f of leads.files) write(f.name, f.sql);
  console.log(`  leads: ${leads.count} in ${leads.files.length} batches`);

  const aff = buildAffiliatesEnrich();
  for (const f of aff.files) write(f.name, f.sql);
  console.log(`  affiliates UTM enrich: ${aff.count} in ${aff.files.length} batches`);

  const notes = buildLeadNotes(leads.notes);
  for (const f of notes.files) write(f.name, f.sql);
  console.log(`  lead notes: ${notes.count} in ${notes.files.length} batches`);

  const atts = buildAttendees();
  for (const f of atts.files) write(f.name, f.sql);
  console.log(`  attendees: ${atts.count} in ${atts.files.length} batches`);

  const ad = buildAdSpend();
  write('06_ad_spend.sql', ad.sql);
  console.log(`  ad_spend: ${ad.count} (UTM matches: ${ad.utmMatches})`);

  const cx = buildCxSurveys();
  write('07_cx_surveys.sql', cx.sql);
  console.log(`  cx_surveys: ${cx.count}`);

  const audit = buildAuditLog({
    events: events.count,
    leads: leads.count,
    leadNotes: notes.count,
    attendees: atts.count,
    adSpend: ad.count,
    cxSurveys: cx.count,
  });
  write('08_audit_log.sql', audit.sql);

  const skippedPath = path.join(path.dirname(OUT), 'import-skipped.json');
  fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');
  console.log(`  skipped rows: ${skipped.length} → ${skippedPath}`);

  const reportPath = path.join(path.dirname(OUT), 'import-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        counts: {
          events: events.count,
          leads: leads.count,
          affiliates_enrich: aff.count,
          lead_notes: notes.count,
          attendees: atts.count,
          ad_spend: ad.count,
          ad_spend_utm_matches: ad.utmMatches,
          cx_surveys: cx.count,
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
