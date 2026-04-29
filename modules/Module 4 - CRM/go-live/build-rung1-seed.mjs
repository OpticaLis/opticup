// Build P5_V2_REBUILD_RUNG1_PLUMBING template-load SQL.
// Reads 22 V2 files from campaigns/supersale/MESSAGES_V2/ and emits an
// idempotent SQL script: 18 UPDATEs (existing slugs) + 4 ON CONFLICT INSERTs
// (manual-move slugs).
// Output: modules/Module 4 - CRM/go-live/seed-templates-v2-demo.sql

import fs from 'node:fs';
import path from 'node:path';

const REPO = 'C:/Users/User/opticup';
const SRC = path.join(REPO, 'campaigns/supersale/MESSAGES_V2');
const OUT = path.join(REPO, 'modules/Module 4 - CRM/go-live/seed-templates-v2-demo.sql');
const DEMO = '8d8cfa7e-ef58-49af-9702-a862d459cccb';

// slug → { file, channel, name, subject (email only) }
const TEMPLATES = [
  // T1 — lead_intake_new
  { slug: 'lead_intake_new_email_he', file: 'email-welcome.html', channel: 'email',
    name: 'אישור הרשמה למערכת אירועי המותגים (Email)',
    subject: '%name%, נרשמת לאירוע המותגים — הנה מה שקורה הלאה' },
  { slug: 'lead_intake_new_sms_he', file: 'lead_intake_new_sms_he.txt', channel: 'sms',
    name: 'אישור הרשמה למערכת אירועי המותגים (SMS)', subject: null },

  // T2 — lead_intake_duplicate
  { slug: 'lead_intake_duplicate_email_he', file: 'lead_intake_duplicate_email_he.html', channel: 'email',
    name: 'ליד כפול - הפרטים שלך כבר במערכת (Email)',
    subject: 'היי %name%, אתה כבר רשום במערכת אירועי המותגים' },
  { slug: 'lead_intake_duplicate_sms_he', file: 'lead_intake_duplicate_sms_he.txt', channel: 'sms',
    name: 'ליד כפול - הפרטים שלך כבר במערכת (SMS)', subject: null },

  // T3 — event_will_open_tomorrow
  { slug: 'event_will_open_tomorrow_email_he', file: 'event_will_open_tomorrow_email_he.html', channel: 'email',
    name: 'מחר נפתחת ההרשמה לאירוע המותגים (Email)',
    subject: '%name%, מחר נפתחת ההרשמה לאירוע המותגים' },
  { slug: 'event_will_open_tomorrow_sms_he', file: 'event_will_open_tomorrow_sms_he.txt', channel: 'sms',
    name: 'מחר נפתחת ההרשמה לאירוע המותגים (SMS)', subject: null },

  // T4 — event_registration_open
  { slug: 'event_registration_open_email_he', file: 'event_registration_open_email_he.html', channel: 'email',
    name: 'נפתחה ההרשמה לאירוע (Email)',
    subject: '%name%, ההרשמה לאירוע %event_name% נפתחה' },
  { slug: 'event_registration_open_sms_he', file: 'event_registration_open_sms_he.txt', channel: 'sms',
    name: 'נפתחה ההרשמה לאירוע (SMS)', subject: null },

  // T5 — event_invite_new (active event found at lead-intake)
  { slug: 'event_invite_new_email_he', file: 'event_invite_new_email_he.html', channel: 'email',
    name: 'הזמנה לאירוע פתוח להרשמה (Email)',
    subject: '%name%, יש לך אירוע פתוח להרשמה: %event_name%' },
  { slug: 'event_invite_new_sms_he', file: 'event_invite_new_sms_he.txt', channel: 'sms',
    name: 'הזמנה לאירוע פתוח להרשמה (SMS)', subject: null },

  // T6 — event_waiting_list (REVIVED purpose: over-capacity registration)
  { slug: 'event_waiting_list_email_he', file: 'event_waiting_list_email_he.html', channel: 'email',
    name: 'נרשמת לרשימת המתנה (Email)',
    subject: '%name%, נרשמת לרשימת ההמתנה - %event_name%' },
  { slug: 'event_waiting_list_sms_he', file: 'event_waiting_list_sms_he.txt', channel: 'sms',
    name: 'נרשמת לרשימת המתנה (SMS)', subject: null },

  // T7 — event_invite_waiting_list (parallel event opens)
  { slug: 'event_invite_waiting_list_email_he', file: 'event_invite_waiting_list_email_he.html', channel: 'email',
    name: 'הזמנה לאירוע נוסף - רשימת המתנה (Email)',
    subject: '%name%, נפתח אירוע נוסף - יש לך מקום ב-%event_name%' },
  { slug: 'event_invite_waiting_list_sms_he', file: 'event_invite_waiting_list_sms_he.txt', channel: 'sms',
    name: 'הזמנה לאירוע נוסף - רשימת המתנה (SMS)', subject: null },

  // T8 — event_2_3d_before
  { slug: 'event_2_3d_before_email_he', file: 'event_2_3d_before_email_he.html', channel: 'email',
    name: 'תזכורת - 3 ימים לפני האירוע (Email)',
    subject: '%name%, נתראה בקרוב באירוע %event_name%' },
  { slug: 'event_2_3d_before_sms_he', file: 'event_2_3d_before_sms_he.txt', channel: 'sms',
    name: 'תזכורת - 3 ימים לפני האירוע (SMS)', subject: null },

  // T9 — event_day
  { slug: 'event_day_email_he', file: 'event_day_email_he.html', channel: 'email',
    name: 'בוקר טוב - יום האירוע (Email)',
    subject: 'בוקר טוב %name% - היום זה קורה' },
  { slug: 'event_day_sms_he', file: 'event_day_sms_he.txt', channel: 'sms',
    name: 'בוקר טוב - יום האירוע (SMS)', subject: null },

  // T11 — event_attendee_moved_unpaid (NEW INSERT)
  { slug: 'event_attendee_moved_unpaid_email_he', file: 'event_attendee_moved_unpaid_email_he.html', channel: 'email',
    name: 'מקומך הועבר - דרושה השלמת שריון (Email)',
    subject: '%name%, מקומך הועבר לאירוע %event_name% - דרושה השלמת שריון',
    insert: true },
  { slug: 'event_attendee_moved_unpaid_sms_he', file: 'event_attendee_moved_unpaid_sms_he.txt', channel: 'sms',
    name: 'מקומך הועבר - דרושה השלמת שריון (SMS)', subject: null, insert: true },

  // T12 — event_attendee_moved_paid (NEW INSERT)
  { slug: 'event_attendee_moved_paid_email_he', file: 'event_attendee_moved_paid_email_he.html', channel: 'email',
    name: 'מקומך הועבר - דמי הרישום עברו יחד (Email)',
    subject: '%name%, מקומך הועבר לאירוע %event_name%',
    insert: true },
  { slug: 'event_attendee_moved_paid_sms_he', file: 'event_attendee_moved_paid_sms_he.txt', channel: 'sms',
    name: 'מקומך הועבר - דמי הרישום עברו יחד (SMS)', subject: null, insert: true },
];

function dq(s) {
  // Use $V2$ ... $V2$ (we verified bodies don't contain $V2$ or $BODY$)
  return `$V2$${s}$V2$`;
}
function dqOrNull(s) {
  return s == null ? 'NULL' : dq(s);
}

function buildStmt(t) {
  const body = fs.readFileSync(path.join(SRC, t.file), 'utf8');
  if (body.includes('$V2$')) throw new Error(`$V2$ collision: ${t.file}`);
  let s = '';
  if (t.insert) {
    s += `-- ${t.slug} (NEW INSERT)\n`;
    s += `INSERT INTO crm_message_templates\n`;
    s += `  (tenant_id, slug, name, channel, language, subject, body, is_active, created_at)\n`;
    s += `VALUES (\n`;
    s += `  '${DEMO}',\n`;
    s += `  '${t.slug}',\n`;
    s += `  ${dq(t.name)},\n`;
    s += `  '${t.channel}',\n`;
    s += `  'he',\n`;
    s += `  ${dqOrNull(t.subject)},\n`;
    s += `  ${dq(body)},\n`;
    s += `  true,\n`;
    s += `  now()\n`;
    s += `)\n`;
    s += `ON CONFLICT (tenant_id, slug) DO UPDATE\n`;
    s += `  SET body = EXCLUDED.body,\n`;
    s += `      subject = EXCLUDED.subject,\n`;
    s += `      name = EXCLUDED.name,\n`;
    s += `      is_active = EXCLUDED.is_active;\n\n`;
  } else {
    s += `-- ${t.slug} (UPDATE existing V1 → V2)\n`;
    s += `UPDATE crm_message_templates\n`;
    s += `   SET body = ${dq(body)},\n`;
    s += `       subject = ${dqOrNull(t.subject)},\n`;
    s += `       name = ${dq(t.name)}\n`;
    s += ` WHERE tenant_id = '${DEMO}'\n`;
    s += `   AND slug      = '${t.slug}'\n`;
    s += `   AND channel   = '${t.channel}'\n`;
    s += `   AND language  = 'he';\n\n`;
  }
  return s;
}

// Single combined file (for repo artifact, replay, audit)
let combined = `-- P5_V2_REBUILD_RUNG1_PLUMBING — 22 V2 message templates on demo
-- Generated by build-rung1-seed.mjs from campaigns/supersale/MESSAGES_V2/
-- Idempotent: re-running this file is safe.
-- Demo tenant: ${DEMO}

BEGIN;
`;
for (const t of TEMPLATES) combined += buildStmt(t);
combined += `COMMIT;\n`;
fs.writeFileSync(OUT, combined, 'utf8');
console.log(`Combined ${OUT}: ${combined.length} chars, ${TEMPLATES.length} templates`);

// Also emit per-template SQL chunks for safe MCP execute_sql payloads
const CHUNK_DIR = path.join(REPO, 'modules/Module 4 - CRM/go-live/_rung1-chunks');
fs.mkdirSync(CHUNK_DIR, { recursive: true });
TEMPLATES.forEach((t, i) => {
  const chunk = buildStmt(t);
  const fn = path.join(CHUNK_DIR, `${String(i + 1).padStart(2, '0')}_${t.slug}.sql`);
  fs.writeFileSync(fn, chunk, 'utf8');
});
console.log(`Wrote ${TEMPLATES.length} chunk files to ${CHUNK_DIR}`);

// And emit batched files (5 batches of ~5 templates each) wrapped in BEGIN/COMMIT.
const BATCH_DIR = path.join(REPO, 'modules/Module 4 - CRM/go-live/_rung1-batches');
fs.mkdirSync(BATCH_DIR, { recursive: true });
const PER_BATCH = 5;
let bi = 1;
for (let i = 0; i < TEMPLATES.length; i += PER_BATCH) {
  let batch = `-- batch ${bi} of ${Math.ceil(TEMPLATES.length / PER_BATCH)}\nBEGIN;\n\n`;
  for (const t of TEMPLATES.slice(i, i + PER_BATCH)) batch += buildStmt(t);
  batch += `COMMIT;\n`;
  const fn = path.join(BATCH_DIR, `batch_${String(bi).padStart(2, '0')}.sql`);
  fs.writeFileSync(fn, batch, 'utf8');
  bi++;
}
console.log(`Wrote ${bi - 1} batch files to ${BATCH_DIR}`);
