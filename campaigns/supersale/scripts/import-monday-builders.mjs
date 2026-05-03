// Build* functions for import-monday-data.mjs (extracted to satisfy 350-line cap).
// Each builder takes a `ctx` with { TENANT, BATCH, readSheet, logSkip } plus
// any builder-specific arguments. Pure helpers come from import-monday-helpers.mjs.

import {
  q,
  normalizePhone,
  toISOTimestamp,
  nonNullCount,
  trimOrNull,
  attendeeStatusMap,
} from './import-monday-helpers.mjs';

// ---------- STEP 4b: Orphan stub leads (D-1 / REC-001) ----------
//
// Scan Events_Record_Attendees for phones that have NO corresponding row in
// Tier_2 master. Auto-create stub crm_leads rows so attendee FK joins resolve.
// Daniel's directive (DECISIONS_LOG REC-001): "STUB-CREATE — every orphan
// gets a real crm_leads row, source='monday_legacy_orphan', status='waiting'."
//
// Note: SPEC §3 D-1 also mentioned "client_notes" + "tag legacy_orphan", but
// per the Δ-4 scope reduction (no lead_notes, no lead_tags this run) we use
// only the `source` field as the orphan discriminator.
export function buildStubLeads(ctx, tier2Phones) {
  const { TENANT, BATCH, readSheet } = ctx;
  const rows = readSheet('Events_Record_Attendees_1776697299.xlsx');
  const stubsByPhone = new Map();

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    if (r[0] === 'טלפון' || r[0] === 'שמך המלא' || r[5] === 'Status') continue;
    const phone = normalizePhone(r[2]);
    if (!phone) continue;
    if (tier2Phones.has(phone)) continue;
    if (stubsByPhone.has(phone)) continue;
    const fullName = trimOrNull(r[0]) || '(unknown)';
    const registeredAt = toISOTimestamp(r[1]) || new Date().toISOString();
    stubsByPhone.set(phone, { fullName, registeredAt });
  }

  const stubs = Array.from(stubsByPhone.entries()).map(([phone, v]) => ({
    phone,
    fullName: v.fullName,
    registeredAt: v.registeredAt,
  }));

  const files = [];
  for (let i = 0; i < stubs.length; i += BATCH) {
    const slice = stubs.slice(i, i + BATCH);
    const values = slice.map(
      (s) =>
        `(${q(TENANT)}, ${q(s.fullName)}, ${q(s.phone)}, 'he', 'waiting', 'monday_legacy_orphan', ${q(s.registeredAt)})`
    );
    const num = String(Math.floor(i / BATCH) + 1).padStart(2, '0');
    files.push({
      name: `02b_stub_leads_${num}.sql`,
      sql: `-- Step 4b: D-1 stub leads batch ${num} (${slice.length} rows) — orphan attendees with no Tier_2 master
INSERT INTO crm_leads (tenant_id, full_name, phone, language, status, source, created_at) VALUES
${values.join(',\n')}
ON CONFLICT (tenant_id, phone) WHERE is_deleted = false DO NOTHING;
`,
    });
  }
  return { files, count: stubs.length };
}

// ---------- STEP 6: Attendees ----------

export function buildAttendees(ctx, multiSaleEventNumbers) {
  const { TENANT, BATCH, readSheet, logSkip } = ctx;
  const rows = readSheet('Events_Record_Attendees_1776697299.xlsx');
  const values = [];
  const couponRecords = []; // D-3: collect for synth message_log emission
  const seenKey = new Set();
  let multiSaleAttendeesSkipped = 0;
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (nonNullCount(r) <= 1) continue;
    if (r[0] === 'טלפון' || r[0] === 'שמך המלא' || r[5] === 'Status') {
      logSkip('Events_Record', i, 'header re-emission', r);
      continue;
    }
    // NOTE: header labels col 0 as "טלפון" but Monday actually exports the
    // attendee NAME there. The real phone is col 2 ("Phone Number").
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
    // D-5: drop attendees of MultiSale events.
    if (multiSaleEventNumbers && multiSaleEventNumbers.has(eventNum)) {
      multiSaleAttendeesSkipped++;
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
    // D-3: scan Send Messages (col 12) for coupon-sent marker.
    const sendMessages = trimOrNull(r[12]) || '';
    const couponSent = sendMessages.includes('קוד קופון');
    const couponSentAt = couponSent ? registeredAt : null;
    if (couponSent) {
      couponRecords.push({ phone, eventNum, sentAt: registeredAt });
    }

    values.push(
      `(${q(phone)}, ${eventNum}, ${q(status)}, ${q(registeredAt)}, ${q(confirmedAt)}, ${q(checkedInAt)}, ${q(purchasedAt)}, ${q(cancelledAt)}, ${purchaseAmount === null ? 'NULL' : purchaseAmount}, ${q(scheduledTime)}, ${q(eyeExam)}, ${q(clientNotes)}, ${q(itemId)}, ${couponSent ? 'true' : 'false'}, ${q(couponSentAt)})`
    );
  }
  const files = [];
  for (let i = 0; i < values.length; i += BATCH) {
    const slice = values.slice(i, i + BATCH);
    const num = String(Math.floor(i / BATCH) + 1).padStart(2, '0');
    files.push({
      name: `05_attendees_${num}.sql`,
      sql: `-- Step 6: Attendees batch ${num} (${slice.length} rows) — REC-003 coupon_sent flag, REC-005 MultiSale dropped
INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status, registered_at, confirmed_at, checked_in_at, purchased_at, cancelled_at, purchase_amount, scheduled_time, eye_exam_needed, client_notes, monday_item_id, coupon_sent, coupon_sent_at)
SELECT '${TENANT}', l.id, e.id, src.status, src.registered_at::timestamptz, src.confirmed_at::timestamptz, src.checked_in_at::timestamptz, src.purchased_at::timestamptz, src.cancelled_at::timestamptz, src.purchase_amount::numeric, src.scheduled_time, src.eye_exam, src.client_notes, src.item_id, src.coupon_sent::boolean, src.coupon_sent_at::timestamptz
FROM (VALUES
${slice.join(',\n')}
) AS src(phone, event_number, status, registered_at, confirmed_at, checked_in_at, purchased_at, cancelled_at, purchase_amount, scheduled_time, eye_exam, client_notes, item_id, coupon_sent, coupon_sent_at)
JOIN crm_leads l  ON l.tenant_id = '${TENANT}' AND l.phone = src.phone
JOIN crm_events e ON e.tenant_id = '${TENANT}' AND e.event_number = src.event_number
ON CONFLICT (tenant_id, lead_id, event_id) DO NOTHING;
`,
    });
  }
  return { files, count: values.length, couponRecords, multiSaleAttendeesSkipped };
}

// ---------- STEP 6b: Synthesized message_log rows (D-3 / REC-003) ----------
//
// For every Events_Record row whose `Send Messages` (col 12) contains "קוד קופון",
// synthesize a crm_message_log row marking the lead as having received the
// coupon code template. Body unavailable (Monday only stored the marker, not
// the message text), so content is a fixed migration placeholder.
//
// Live schema: crm_message_log has no `attendee_id` and no `template_slug`.
// Use `event_id` for the event link + LEFT JOIN crm_message_templates by slug
// to get template_id (slug 'event_coupon_delivery_sms_he' is closest match).
export function buildSynthMessageLog(ctx, couponRecords) {
  const { TENANT, BATCH } = ctx;
  if (!couponRecords || couponRecords.length === 0) {
    return { files: [], count: 0 };
  }
  const files = [];
  for (let i = 0; i < couponRecords.length; i += BATCH) {
    const slice = couponRecords.slice(i, i + BATCH);
    const values = slice.map(
      (cr) => `(${q(cr.phone)}, ${cr.eventNum}, ${q(cr.sentAt)})`
    );
    const num = String(Math.floor(i / BATCH) + 1).padStart(2, '0');
    files.push({
      name: `06_synth_message_log_${num}.sql`,
      sql: `-- Step 6b: D-3 synthesized message_log batch ${num} (${slice.length} rows) — REC-003
INSERT INTO crm_message_log (tenant_id, lead_id, event_id, template_id, channel, content, status, created_at)
SELECT '${TENANT}', l.id, e.id, t.id, 'sms', '[migrated from Monday — body unavailable]', 'sent', src.sent_at::timestamptz
FROM (VALUES
${values.join(',\n')}
) AS src(phone, event_number, sent_at)
JOIN crm_leads l            ON l.tenant_id = '${TENANT}' AND l.phone = src.phone
JOIN crm_events e           ON e.tenant_id = '${TENANT}' AND e.event_number = src.event_number
LEFT JOIN crm_message_templates t
                            ON t.tenant_id = '${TENANT}' AND t.slug = 'event_coupon_delivery_sms_he';
`,
    });
  }
  return { files, count: couponRecords.length };
}

// ---------- STEP 7: Ad spend (Δ-4 KEEP) ----------
//
// Live schema (verified 2026-05-03):
//   crm_facebook_campaigns: tenant_id, campaign_id TEXT, name, status, event_type,
//     total_spend, daily_budget, master, interests, raw_data, first_seen_at,
//     last_synced_at, start_time, city, audience_label, created_at, updated_at.
//     UNIQUE (tenant_id, campaign_id).
//   crm_ad_spend: tenant_id, campaign_id TEXT, spend_date DATE NOT NULL,
//     total_spend NUMERIC NOT NULL. UNIQUE (tenant_id, campaign_id, spend_date).
//
// Monday Facebook_ADS only has lifetime totals (no per-day breakdown), so we
// emit ONE crm_ad_spend row per campaign with spend_date = creation_date::date.
// The live FB sync continues from there with daily rows.
// Affiliates UTM cross-ref dropped per Δ-4 (Affiliates not re-exported).
export function buildAdSpend(ctx) {
  const { TENANT, readSheet, logSkip } = ctx;
  const fbRows = readSheet('Facebook_ADS_1776697328.xlsx');

  const campaignValues = [];
  const spendValues = [];
  const seenCampaignIds = new Set();
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
    const spendDate = createdAt ? createdAt.slice(0, 10) : null;
    if (!spendDate) {
      logSkip('Facebook_ADS', i, 'no creation date (required for spend_date)', r);
      continue;
    }
    const statusRaw = trimOrNull(r[2]);
    const status = statusRaw ? statusRaw.toLowerCase() : 'active';
    const eventType = trimOrNull(r[3]);
    const adCampaignId = trimOrNull(r[4]);
    if (!adCampaignId) {
      logSkip('Facebook_ADS', i, 'no FB campaign_id', r);
      continue;
    }
    if (seenCampaignIds.has(adCampaignId)) {
      logSkip('Facebook_ADS', i, `duplicate FB campaign_id ${adCampaignId}`, r);
      continue;
    }
    seenCampaignIds.add(adCampaignId);

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

    campaignValues.push(
      `(${q(TENANT)}, ${q(adCampaignId)}, ${q(name)}, ${q(status)}, ${q(eventType)}, ${totalSpend}, ${dailyBudget === null ? 'NULL' : dailyBudget}, ${q(createdAt)}, ${q(createdAt)})`
    );
    // crm_ad_spend snapshot row: lifetime spend booked on creation date.
    spendValues.push(
      `(${q(TENANT)}, ${q(adCampaignId)}, ${q(spendDate)}, ${totalSpend})`
    );
  }
  const sql = `-- Step 7a: Facebook campaigns metadata (${campaignValues.length} rows)
INSERT INTO crm_facebook_campaigns (tenant_id, campaign_id, name, status, event_type, total_spend, daily_budget, first_seen_at, last_synced_at) VALUES
${campaignValues.join(',\n')}
ON CONFLICT (tenant_id, campaign_id) DO NOTHING;

-- Step 7b: Lifetime ad_spend snapshot (${spendValues.length} rows)
INSERT INTO crm_ad_spend (tenant_id, campaign_id, spend_date, total_spend) VALUES
${spendValues.join(',\n')}
ON CONFLICT (tenant_id, campaign_id, spend_date) DO NOTHING;
`;
  return { sql, count: campaignValues.length };
}
