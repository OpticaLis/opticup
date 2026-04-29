// Apply P5_V2_REBUILD_RUNG1_PLUMBING template seed via PostgREST.
// Reads 22 V2 files from campaigns/supersale/MESSAGES_V2/ and either UPDATEs
// or UPSERTs into crm_message_templates on demo.
//
// Why PostgREST and not psql/SQL: large HTML bodies have many quotes and
// special chars; PATCH/POST with a JSON body sidesteps SQL escaping entirely.
//
// Usage: node modules/Module\ 4\ -\ CRM/go-live/apply-rung1-seed.mjs
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from $HOME/.optic-up/credentials.env

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const REPO = 'C:/Users/User/opticup';
const SRC = path.join(REPO, 'campaigns/supersale/MESSAGES_V2');
const DEMO = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
const CRED = path.join(os.homedir(), '.optic-up/credentials.env');

// Load credentials from env file
const envText = fs.readFileSync(CRED, 'utf8');
const env = Object.fromEntries(
  envText.split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const URL = env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TEMPLATES = [
  { slug: 'lead_intake_new_email_he', file: 'email-welcome.html', channel: 'email',
    name: 'אישור הרשמה למערכת אירועי המותגים (Email)',
    subject: '%name%, נרשמת לאירוע המותגים — הנה מה שקורה הלאה' },
  { slug: 'lead_intake_new_sms_he', file: 'lead_intake_new_sms_he.txt', channel: 'sms',
    name: 'אישור הרשמה למערכת אירועי המותגים (SMS)', subject: null },
  { slug: 'lead_intake_duplicate_email_he', file: 'lead_intake_duplicate_email_he.html', channel: 'email',
    name: 'ליד כפול - הפרטים שלך כבר במערכת (Email)',
    subject: 'היי %name%, אתה כבר רשום במערכת אירועי המותגים' },
  { slug: 'lead_intake_duplicate_sms_he', file: 'lead_intake_duplicate_sms_he.txt', channel: 'sms',
    name: 'ליד כפול - הפרטים שלך כבר במערכת (SMS)', subject: null },
  { slug: 'event_will_open_tomorrow_email_he', file: 'event_will_open_tomorrow_email_he.html', channel: 'email',
    name: 'מחר נפתחת ההרשמה לאירוע המותגים (Email)',
    subject: '%name%, מחר נפתחת ההרשמה לאירוע המותגים' },
  { slug: 'event_will_open_tomorrow_sms_he', file: 'event_will_open_tomorrow_sms_he.txt', channel: 'sms',
    name: 'מחר נפתחת ההרשמה לאירוע המותגים (SMS)', subject: null },
  { slug: 'event_registration_open_email_he', file: 'event_registration_open_email_he.html', channel: 'email',
    name: 'נפתחה ההרשמה לאירוע (Email)',
    subject: '%name%, ההרשמה לאירוע %event_name% נפתחה' },
  { slug: 'event_registration_open_sms_he', file: 'event_registration_open_sms_he.txt', channel: 'sms',
    name: 'נפתחה ההרשמה לאירוע (SMS)', subject: null },
  { slug: 'event_invite_new_email_he', file: 'event_invite_new_email_he.html', channel: 'email',
    name: 'הזמנה לאירוע פתוח להרשמה (Email)',
    subject: '%name%, יש לך אירוע פתוח להרשמה: %event_name%' },
  { slug: 'event_invite_new_sms_he', file: 'event_invite_new_sms_he.txt', channel: 'sms',
    name: 'הזמנה לאירוע פתוח להרשמה (SMS)', subject: null },
  { slug: 'event_waiting_list_email_he', file: 'event_waiting_list_email_he.html', channel: 'email',
    name: 'נרשמת לרשימת המתנה (Email)',
    subject: '%name%, נרשמת לרשימת ההמתנה - %event_name%' },
  { slug: 'event_waiting_list_sms_he', file: 'event_waiting_list_sms_he.txt', channel: 'sms',
    name: 'נרשמת לרשימת המתנה (SMS)', subject: null },
  { slug: 'event_invite_waiting_list_email_he', file: 'event_invite_waiting_list_email_he.html', channel: 'email',
    name: 'הזמנה לאירוע נוסף - רשימת המתנה (Email)',
    subject: '%name%, נפתח אירוע נוסף - יש לך מקום ב-%event_name%' },
  { slug: 'event_invite_waiting_list_sms_he', file: 'event_invite_waiting_list_sms_he.txt', channel: 'sms',
    name: 'הזמנה לאירוע נוסף - רשימת המתנה (SMS)', subject: null },
  { slug: 'event_2_3d_before_email_he', file: 'event_2_3d_before_email_he.html', channel: 'email',
    name: 'תזכורת - 3 ימים לפני האירוע (Email)',
    subject: '%name%, נתראה בקרוב באירוע %event_name%' },
  { slug: 'event_2_3d_before_sms_he', file: 'event_2_3d_before_sms_he.txt', channel: 'sms',
    name: 'תזכורת - 3 ימים לפני האירוע (SMS)', subject: null },
  { slug: 'event_day_email_he', file: 'event_day_email_he.html', channel: 'email',
    name: 'בוקר טוב - יום האירוע (Email)',
    subject: 'בוקר טוב %name% - היום זה קורה' },
  { slug: 'event_day_sms_he', file: 'event_day_sms_he.txt', channel: 'sms',
    name: 'בוקר טוב - יום האירוע (SMS)', subject: null },
  { slug: 'event_attendee_moved_unpaid_email_he', file: 'event_attendee_moved_unpaid_email_he.html', channel: 'email',
    name: 'מקומך הועבר - דרושה השלמת שריון (Email)',
    subject: '%name%, מקומך הועבר לאירוע %event_name% - דרושה השלמת שריון',
    insert: true },
  { slug: 'event_attendee_moved_unpaid_sms_he', file: 'event_attendee_moved_unpaid_sms_he.txt', channel: 'sms',
    name: 'מקומך הועבר - דרושה השלמת שריון (SMS)', subject: null, insert: true },
  { slug: 'event_attendee_moved_paid_email_he', file: 'event_attendee_moved_paid_email_he.html', channel: 'email',
    name: 'מקומך הועבר - דמי הרישום עברו יחד (Email)',
    subject: '%name%, מקומך הועבר לאירוע %event_name%',
    insert: true },
  { slug: 'event_attendee_moved_paid_sms_he', file: 'event_attendee_moved_paid_sms_he.txt', channel: 'sms',
    name: 'מקומך הועבר - דמי הרישום עברו יחד (SMS)', subject: null, insert: true },
];

const HEADERS = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

let ok = 0, fail = 0;
for (const t of TEMPLATES) {
  const body = fs.readFileSync(path.join(SRC, t.file), 'utf8');
  if (t.insert) {
    // UPSERT — POST with Prefer: resolution=merge-duplicates
    const resp = await fetch(`${URL}/rest/v1/crm_message_templates`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({
        tenant_id: DEMO, slug: t.slug, name: t.name,
        channel: t.channel, language: 'he',
        subject: t.subject, body, is_active: true,
      }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error(`FAIL INSERT ${t.slug}: ${resp.status} ${text.slice(0, 200)}`);
      fail++;
    } else {
      const len = JSON.parse(text)[0]?.body?.length ?? 0;
      console.log(`✓ INSERT ${t.slug} (${len} chars)`);
      ok++;
    }
  } else {
    // UPDATE — PATCH with eq filters
    const filter = `tenant_id=eq.${DEMO}&slug=eq.${t.slug}&channel=eq.${t.channel}&language=eq.he`;
    const resp = await fetch(`${URL}/rest/v1/crm_message_templates?${filter}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ body, subject: t.subject, name: t.name }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error(`FAIL UPDATE ${t.slug}: ${resp.status} ${text.slice(0, 200)}`);
      fail++;
      continue;
    }
    const rows = JSON.parse(text);
    if (rows.length !== 1) {
      console.error(`FAIL UPDATE ${t.slug}: expected 1 row, got ${rows.length}`);
      fail++;
      continue;
    }
    const dbBody = rows[0].body;
    if (dbBody !== body) {
      console.error(`BYTE-MISMATCH ${t.slug}: file ${body.length} vs db ${dbBody.length}`);
      fail++;
      continue;
    }
    console.log(`✓ UPDATE ${t.slug} (${dbBody.length} chars, byte-equal)`);
    ok++;
  }
}

console.log(`\n${ok} ok / ${fail} fail / ${TEMPLATES.length} total`);
process.exit(fail > 0 ? 1 : 0);
