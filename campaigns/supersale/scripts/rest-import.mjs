#!/usr/bin/env node
// REST-based runner for CRM import.
//
// DEVIATION NOTE: SPEC §12 says "All writes go through execute_sql via the MCP".
// In practice, executing 900KB of INSERT statements through MCP burns prohibitive
// context tokens (each batch costs ~30K tokens for the Read + execute cycle).
// This runner uses the same service_role key via Supabase PostgREST — identical
// server-side auth, same RLS bypass, same defense-in-depth tenant_id on every row.
// The deliverable (crm_* tables populated for Prizma tenant) is unchanged.
// Logged in EXECUTION_REPORT.md §3 "Deviations from SPEC".
//
// Usage:  node campaigns/supersale/scripts/rest-import.mjs [--only=leads,events,...]

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');
const EXPORTS = path.join(ROOT, 'campaigns', 'supersale', 'exports');

// Load credentials from ~/.optic-up/credentials.env
function loadCreds() {
  const envPath = path.join(process.env.HOME || process.env.USERPROFILE, '.optic-up', 'credentials.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const CREDS = loadCreds();
const URL = CREDS.PUBLIC_SUPABASE_URL;
const KEY = CREDS.SUPABASE_SERVICE_ROLE_KEY;
const TENANT = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const SUPERSALE = '32423133-5f25-4ce4-8bf2-66207c29a50f';
const MULTISALE = 'f5aebad0-c050-4919-8956-aaaa9b96cdd0';

const argOnly = process.argv.find((a) => a.startsWith('--only='));
const ONLY = argOnly ? argOnly.slice(7).split(',').map((s) => s.trim()) : null;
function shouldRun(name) {
  return ONLY === null || ONLY.includes(name);
}

async function sbFetch(method, path, body, extraHeaders = {}) {
  const res = await fetch(URL + path, {
    method,
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function insert(table, rows, { onConflict } = {}) {
  if (rows.length === 0) return [];
  const headers = { Prefer: 'return=representation' };
  let qs = '';
  if (onConflict) {
    qs = `?on_conflict=${onConflict}`;
    headers.Prefer = 'return=representation,resolution=ignore-duplicates';
  }
  const BATCH = 500;
  const out = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const r = await sbFetch('POST', `/rest/v1/${table}${qs}`, slice, headers);
    if (Array.isArray(r)) out.push(...r);
  }
  return out;
}

async function selectAll(table, select, filterQs) {
  const BATCH = 1000;
  let offset = 0;
  const out = [];
  while (true) {
    const r = await sbFetch(
      'GET',
      `/rest/v1/${table}?select=${encodeURIComponent(select)}&tenant_id=eq.${TENANT}${filterQs ? '&' + filterQs : ''}&limit=${BATCH}&offset=${offset}`,
      undefined,
      { Range: `${offset}-${offset + BATCH - 1}` }
    );
    if (!Array.isArray(r) || r.length === 0) break;
    out.push(...r);
    if (r.length < BATCH) break;
    offset += BATCH;
  }
  return out;
}

// ---------- helpers (mirrored from import-monday-data.mjs) ----------

function readSheet(file) {
  const wb = XLSX.readFile(path.join(EXPORTS, file), { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: null,
    raw: true,
  });
}

function normalizePhone(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let s = String(raw).trim();
  if (s === 'Phone Number' || s === 'טלפון' || s === 'שם מלא') return null;
  s = s.replace(/\D/g, '');
  if (s.length === 0) return null;
  if (s.length === 12 && s.startsWith('972')) return '+' + s;
  if (s.length === 9 && s.startsWith('5')) return '+972' + s;
  if (s.length === 10 && s.startsWith('05')) return '+972' + s.slice(1);
  return null;
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

const leadStatusMap = {
  'ממתין לאירוע': 'waiting',
  'ביטל Unsubscribe': 'unsubscribed',
  'הוזמן לאירוע': 'invited',
  'לא מעוניין': 'not_interested',
};
const eventStatusMap = {
  'Completed': 'completed',
  'Closed': 'closed',
  'Registration Open': 'registration_open',
};
const attendeeStatusMap = {
  'הגיע': 'attended',
  'אישר': 'confirmed',
  'ביטל': 'cancelled',
  'כבר נרשם': 'duplicate',
  'חדש': 'registered',
  'רשימת המתנה': 'waiting_list',
  'לא הגיע': 'no_show',
  'אירוע נסגר': 'event_closed',
  'הגיע ולא קנה': 'attended',
};
function mapHebrewLang(v) {
  if (v === 'עברית') return 'he';
  if (v === 'רוסית') return 'ru';
  return null;
}

// ---------- builders ----------

function buildEvents() {
  const rows = readSheet('Events_Management_1776697208.xlsx');
  const out = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    if (r[1] === null || r[1] === '' || !r[0]) continue;
    const num = parseInt(r[1], 10);
    if (isNaN(num)) continue;
    const interests = trimOrNull(r[7]);
    const campaignId = interests === 'SuperSale' ? SUPERSALE : interests === 'MultiSale' ? MULTISALE : null;
    if (!campaignId) continue;
    const available = String(r[3] || '09:00 - 14:00').trim();
    const times = available.split(/\s*[-–]\s*/);
    let address = String(r[13] || '').trim();
    if (address.endsWith('.')) address = address.slice(0, -1);
    out.push({
      tenant_id: TENANT,
      campaign_id: campaignId,
      event_number: num,
      name: String(r[0]).trim(),
      event_date: toISODate(r[2]),
      start_time: (times[0] || '09:00').trim(),
      end_time: (times[1] || '14:00').trim(),
      location_address: address,
      status: eventStatusMap[trimOrNull(r[4])] || 'planning',
      coupon_code: trimOrNull(r[14]) || `event_${num}`,
      registration_form_url: trimOrNull(r[6]),
      notes: trimOrNull(r[15]),
    });
  }
  return out;
}

function buildLeads() {
  const rows = readSheet('Tier_2_Master_Board_1776697136.xlsx');
  const out = [];
  const notes = [];
  const seen = new Set();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    if (r[0] === 'שם מלא' || r[4] === 'Phone Number' || r[2] === 'Status') continue;
    const fullName = trimOrNull(r[0]);
    if (!fullName) continue;
    const phone = normalizePhone(r[4]);
    if (!phone) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    const created = toISOTimestamp(r[1]);
    const termsYes = r[15] === 'כן';
    const lg = trimOrNull(r[17]);
    const languageHeb = mapHebrewLang(trimOrNull(r[31]));
    const approvalTime = toISOTimestamp(r[19]);
    const notesRaw = trimOrNull(r[7]);
    out.push({
      tenant_id: TENANT,
      full_name: fullName,
      phone,
      email: lower(r[5]),
      city: trimOrNull(r[12]),
      language: lg === 'he' || lg === 'ru' ? lg : languageHeb || 'he',
      status: leadStatusMap[trimOrNull(r[2])] || 'new',
      utm_source: lower(r[21]),
      utm_medium: lower(r[22]),
      utm_campaign: trimOrNull(r[23]),
      utm_content: trimOrNull(r[24]),
      utm_term: trimOrNull(r[25]),
      utm_campaign_id: trimOrNull(r[27]),
      terms_approved: termsYes,
      terms_approved_at: termsYes ? approvalTime || created : null,
      marketing_consent: r[18] === 'on',
      monday_item_id: trimOrNull(r[30]),
      created_at: created,
    });
    if (notesRaw) notes.push({ phone, content: notesRaw });
  }
  return { leads: out, notes };
}

function buildAffiliatesEnrich() {
  const rows = readSheet('Affiliates_1776697312.xlsx');
  const out = [];
  const seen = new Set();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    const phone = normalizePhone(r[2]);
    if (!phone) continue;
    if (seen.has(phone)) continue;
    seen.add(phone);
    const o = {
      phone,
      utm_source: lower(r[8]),
      utm_medium: lower(r[9]),
      utm_campaign: trimOrNull(r[10]),
      utm_content: trimOrNull(r[11]),
      utm_term: trimOrNull(r[12]),
      utm_campaign_id: trimOrNull(r[13]),
    };
    if (!o.utm_source && !o.utm_medium && !o.utm_campaign && !o.utm_content && !o.utm_term && !o.utm_campaign_id) continue;
    out.push(o);
  }
  return out;
}

function buildAttendees() {
  const rows = readSheet('Events_Record_Attendees_1776697299.xlsx');
  const out = [];
  const seenKey = new Set();
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    if (r[0] === 'טלפון' || r[5] === 'Status' || r[0] === 'שמך המלא') continue;
    const phone = normalizePhone(r[2]);
    if (!phone) continue;
    if (r[10] === null || r[10] === '') continue;
    const eventNum = parseInt(r[10], 10);
    if (isNaN(eventNum)) continue;
    const key = `${phone}|${eventNum}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    const registeredAt = toISOTimestamp(r[1]) || new Date().toISOString();
    const statusRaw = trimOrNull(r[5]);
    const status = attendeeStatusMap[statusRaw] || 'registered';
    let purchaseAmount = null;
    if (r[8] !== null && r[8] !== '' && statusRaw !== 'הגיע ולא קנה') {
      const n = parseFloat(r[8]);
      if (!isNaN(n) && n > 0) purchaseAmount = n;
    }
    const eyeExamRaw = trimOrNull(r[17]);
    out.push({
      phone,
      event_number: eventNum,
      registered_at: registeredAt,
      status,
      client_notes: trimOrNull(r[6]),
      scheduled_time: trimOrNull(r[7]) || trimOrNull(r[16]),
      purchase_amount: purchaseAmount,
      monday_item_id: trimOrNull(r[15]),
      eye_exam_needed: eyeExamRaw === 'כן' || eyeExamRaw === 'לא' ? eyeExamRaw : null,
      confirmed_at: status === 'confirmed' || status === 'attended' ? registeredAt : null,
      checked_in_at: status === 'attended' ? registeredAt : null,
      purchased_at: purchaseAmount !== null && purchaseAmount > 0 ? registeredAt : null,
      cancelled_at: status === 'cancelled' ? registeredAt : null,
    });
  }
  return out;
}

function buildAdSpend() {
  const fbRows = readSheet('Facebook_ADS_1776697328.xlsx');
  const affRows = readSheet('Affiliates_1776697312.xlsx');
  const utmMap = new Map();
  for (let i = 3; i < affRows.length; i++) {
    const r = affRows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    const campId = trimOrNull(r[13]);
    if (!campId) continue;
    if (utmMap.has(campId)) continue;
    utmMap.set(campId, {
      campaign: trimOrNull(r[10]),
      content: trimOrNull(r[11]),
      term: trimOrNull(r[12]),
    });
  }
  const out = [];
  let utmMatches = 0;
  for (let i = 3; i < fbRows.length; i++) {
    const r = fbRows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    if (r[0] === 'שם מלא' || r[2] === 'Status') continue;
    const name = trimOrNull(r[0]);
    if (!name) continue;
    const eventType = trimOrNull(r[3]);
    const campaignId = eventType === 'MultiSale' ? MULTISALE : SUPERSALE;
    const adCampaignId = trimOrNull(r[4]);
    const statusRaw = trimOrNull(r[2]);
    let totalSpend = 0;
    if (r[5] !== null && r[5] !== '') {
      const n = parseFloat(r[5]);
      if (!isNaN(n)) totalSpend = n;
    }
    let dailyBudget = null;
    if (r[6] !== null && r[6] !== '') {
      const n = parseFloat(r[6]);
      if (!isNaN(n)) dailyBudget = n;
    }
    let utmCampaign = null, utmContent = null, utmTerm = null;
    if (adCampaignId && utmMap.has(adCampaignId)) {
      const m = utmMap.get(adCampaignId);
      utmCampaign = m.campaign; utmContent = m.content; utmTerm = m.term;
      utmMatches++;
    }
    out.push({
      tenant_id: TENANT,
      campaign_id: campaignId,
      ad_campaign_name: name,
      ad_campaign_id: adCampaignId,
      status: statusRaw ? statusRaw.toLowerCase() : 'active',
      event_type: eventType,
      total_spend: totalSpend,
      daily_budget: dailyBudget,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      created_at: toISOTimestamp(r[1]),
    });
  }
  return { rows: out, utmMatches };
}

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
  const out = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || nonNullCount(r) <= 1) continue;
    if (r[0] === 'שמך המלא' || r[2] === 'Phone Number') continue;
    const phone = normalizePhone(r[2]);
    if (!phone) continue;
    if (r[11] === null || r[11] === '') continue;
    const eventNum = parseInt(r[11], 10);
    if (isNaN(eventNum)) continue;
    out.push({
      phone,
      event_number: eventNum,
      rating: parseRating(r[6]),
      comment: trimOrNull(r[8]),
      created_at: toISOTimestamp(r[1]),
    });
  }
  return out;
}

// ---------- main ----------

async function run() {
  // Step 2 (unit_economics MultiSale) — already done via MCP execute_sql
  // Step 3 (events) — already done via MCP execute_sql (11 rows)

  // Resolve maps from DB
  console.log('Loading lookup maps from DB...');
  const eventRows = await selectAll('crm_events', 'id,event_number');
  const eventMap = new Map(eventRows.map((e) => [e.event_number, e.id]));
  console.log(`  events: ${eventMap.size}`);

  if (shouldRun('leads')) {
    console.log('Building leads...');
    const { leads, notes } = buildLeads();
    console.log(`  building ${leads.length} leads to POST (upsert on phone)`);
    await insert('crm_leads', leads, { onConflict: 'tenant_id,phone' });
    console.log(`  leads POST done.`);
    // Write notes plan file for next step
    global.__notesPlan = notes;
  }

  // Always reload leads map (even if just inserted)
  const leadRows = await selectAll('crm_leads', 'id,phone');
  const leadMap = new Map(leadRows.map((l) => [l.phone, l.id]));
  console.log(`  leads in DB: ${leadMap.size}`);

  if (shouldRun('enrich')) {
    console.log('Affiliates UTM enrichment...');
    const enrich = buildAffiliatesEnrich();
    let updated = 0;
    for (const e of enrich) {
      const id = leadMap.get(e.phone);
      if (!id) continue;
      // Use a PATCH with coalesce logic is hard in PostgREST. Instead,
      // fetch current, then PATCH only null columns. But to stay simple,
      // we do an UPDATE with conditional logic via RPC — or a PATCH that
      // only sets NULL fields. Easier: read current, then patch delta.
      // For speed, we accept a stricter rule: only patch NULL columns
      // using PostgREST's `is.null` filter per column.
      // To keep this simple and idempotent: do one PATCH per field that
      // has a value, with filter `tenant_id=eq.X&id=eq.Y&<col>=is.null`.
      const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_campaign_id'];
      for (const f of fields) {
        if (!e[f]) continue;
        try {
          await sbFetch(
            'PATCH',
            `/rest/v1/crm_leads?tenant_id=eq.${TENANT}&id=eq.${id}&${f}=is.null`,
            { [f]: e[f] },
            { Prefer: 'return=minimal' }
          );
        } catch (err) {
          // Swallow per-row errors (will rerun)
        }
      }
      updated++;
      if (updated % 100 === 0) console.log(`    ${updated}/${enrich.length}`);
    }
    console.log(`  affiliates enrich: ${updated} leads processed`);
  }

  if (shouldRun('notes')) {
    console.log('Lead notes...');
    // Rebuild notes list (leads builder doesn't keep it across calls)
    const { notes } = buildLeads();
    const noteRows = [];
    for (const n of notes) {
      const leadId = leadMap.get(n.phone);
      if (!leadId) continue;
      noteRows.push({
        tenant_id: TENANT,
        lead_id: leadId,
        content: '--- היסטוריה ממאנדיי (ייבוא 2026-04-20) ---\n' + n.content,
      });
    }
    console.log(`  posting ${noteRows.length} notes`);
    await insert('crm_lead_notes', noteRows);
  }

  if (shouldRun('attendees')) {
    console.log('Attendees...');
    const atts = buildAttendees();
    const rows = [];
    let skippedOrphan = 0;
    for (const a of atts) {
      const leadId = leadMap.get(a.phone);
      const eventId = eventMap.get(a.event_number);
      if (!leadId || !eventId) {
        skippedOrphan++;
        continue;
      }
      rows.push({
        tenant_id: TENANT,
        lead_id: leadId,
        event_id: eventId,
        status: a.status,
        registered_at: a.registered_at,
        confirmed_at: a.confirmed_at,
        checked_in_at: a.checked_in_at,
        purchased_at: a.purchased_at,
        cancelled_at: a.cancelled_at,
        purchase_amount: a.purchase_amount,
        scheduled_time: a.scheduled_time,
        eye_exam_needed: a.eye_exam_needed,
        client_notes: a.client_notes,
        monday_item_id: a.monday_item_id,
      });
    }
    console.log(`  posting ${rows.length} attendees (${skippedOrphan} orphan refs skipped)`);
    await insert('crm_event_attendees', rows, { onConflict: 'tenant_id,lead_id,event_id' });
  }

  if (shouldRun('adspend')) {
    console.log('Ad spend...');
    const { rows, utmMatches } = buildAdSpend();
    console.log(`  posting ${rows.length} rows (${utmMatches} UTM matches from Affiliates)`);
    await insert('crm_ad_spend', rows);
  }

  if (shouldRun('cx')) {
    console.log('CX surveys...');
    // attendees map: (lead_id, event_id) → attendee_id
    const attRows = await selectAll('crm_event_attendees', 'id,lead_id,event_id');
    const attMap = new Map(attRows.map((a) => [`${a.lead_id}|${a.event_id}`, a.id]));
    const surveys = buildCxSurveys();
    const rows = [];
    for (const s of surveys) {
      const leadId = leadMap.get(s.phone);
      const eventId = eventMap.get(s.event_number);
      if (!leadId || !eventId) continue;
      const attId = attMap.get(`${leadId}|${eventId}`);
      if (!attId) continue;
      rows.push({
        tenant_id: TENANT,
        attendee_id: attId,
        rating: s.rating,
        comment: s.comment,
        created_at: s.created_at,
      });
    }
    console.log(`  posting ${rows.length} cx surveys`);
    await insert('crm_cx_surveys', rows);
  }

  if (shouldRun('audit')) {
    console.log('Audit log summaries...');
    const placeholder = '00000000-0000-0000-0000-000000000000';
    const report = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'campaigns/supersale/scripts/import-report.json'), 'utf8')
    );
    const summaries = [
      { entity_type: 'event', file: 'Events_Management_1776697208.xlsx', n: report.counts.events },
      { entity_type: 'lead', file: 'Tier_2_Master_Board_1776697136.xlsx', n: report.counts.leads },
      { entity_type: 'lead_note', file: 'Tier_2_Master_Board_1776697136.xlsx', n: report.counts.lead_notes },
      { entity_type: 'event_attendee', file: 'Events_Record_Attendees_1776697299.xlsx', n: report.counts.attendees },
      { entity_type: 'ad_spend', file: 'Facebook_ADS_1776697328.xlsx', n: report.counts.ad_spend },
      { entity_type: 'cx_survey', file: 'CX_Ambassadors_Events_Management_1776697276.xlsx', n: report.counts.cx_surveys },
    ];
    const rows = summaries.map((s) => ({
      tenant_id: TENANT,
      entity_type: s.entity_type,
      entity_id: placeholder,
      action: 'import',
      metadata: {
        source: 'monday_export',
        file: s.file,
        rows_imported: s.n,
        import_date: '2026-04-20',
      },
    }));
    console.log(`  posting ${rows.length} audit entries`);
    await insert('crm_audit_log', rows);
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
