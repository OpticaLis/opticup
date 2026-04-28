// qa-runner.mjs — Direct Supabase REST QA harness for the P5_V2 cutover smoke.
// Used while MCP execute_sql auth was unstable. Uses SERVICE_ROLE_KEY from
// $HOME/.optic-up/credentials.env, hits the PostgREST + EF endpoints
// directly. Provides:
//   - sql(): generic SQL execution via PostgREST RPC pgmeta-style isn't
//     exposed, so we use REST-table CRUD where possible
//   - rest(): GET/POST/PATCH/DELETE against PostgREST tables
//   - rpc(): Supabase RPC call
//   - ef():  invoke an Edge Function (lead-intake, send-message, etc.)
//
// Usage: node qa-runner.mjs <command> [args...]
//
// Commands:
//   set-payment-link        Apply tenants.payment_links UPDATE for demo
//   baseline                Print pre-state baseline
//   leads                   List demo leads with statuses
//   events                  List demo events with statuses
//   attendees [event_id]    List attendees (optionally for one event)
//   recent-log              Last 30 crm_message_log rows for demo
//   intake <name> <phone> <email>      curl lead-intake EF (T1/T2/T5 path)
//   sync <lead_id>          Call sync_lead_status_from_attendee
//   register <lead_id> <event_id>      Call register_lead_to_event RPC
//   move <attendee_id> <target_event_id>  Call move_attendee_between_events RPC
//   send <slug> <lead_id> <event_id> <channel>   Direct send-message call
//   set-event-status <event_id> <status>   UPDATE crm_events.status (no engine — DB-only)
//   queue <slug> <lead_id> <event_id> <channel> <scheduled_at>   Insert crm_message_queue row
//   exec <sql>              Execute arbitrary SQL via the pg_meta /sql endpoint? Not available.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CRED = path.join(os.homedir(), '.optic-up/credentials.env');
const env = Object.fromEntries(
  fs.readFileSync(CRED, 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const URL = env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.PUBLIC_SUPABASE_ANON_KEY;
const DEMO = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
const PRIZMA = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
// Default to Prizma since this is the active QA target post-replication.
const TENANT = process.env.QA_TENANT === 'demo' ? DEMO : PRIZMA;

const H_SVC = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const H_SVC_REPR = { ...H_SVC, 'Prefer': 'return=representation' };

async function rest(method, table, query = '', body = null) {
  const r = await fetch(`${URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
    method, headers: H_SVC_REPR, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${table}: ${r.status} ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function rpc(name, args) {
  const r = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: H_SVC, body: JSON.stringify(args || {}),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`rpc ${name}: ${r.status} ${text.slice(0, 400)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function ef(name, payload, useAnon = false) {
  const auth = useAnon ? ANON : KEY;
  const r = await fetch(`${URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${auth}`, 'apikey': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  return { status: r.status, ok: r.ok, body: text };
}

const cmd = process.argv[2];
const a = process.argv.slice(3);
function p(o) { console.log(JSON.stringify(o, null, 2)); }

try {
  switch (cmd) {
    case 'set-payment-link': {
      const r = await rest('PATCH', 'tenants', `id=eq.${TENANT}`, { payment_links: { '50': 'https://prizmaoptic.short.gy/gmapy' } });
      p({ ok: true, payment_links: r[0]?.payment_links });
      break;
    }
    case 'baseline': {
      const t = await rest('GET', 'tenants', `id=eq.${TENANT}&select=payment_links,slug`);
      const leads = await rest('GET', 'crm_leads', `tenant_id=eq.${TENANT}&is_deleted=eq.false&select=count`);
      const events = await rest('GET', 'crm_events', `tenant_id=eq.${TENANT}&is_deleted=eq.false&select=count`);
      const attendees = await rest('GET', 'crm_event_attendees', `tenant_id=eq.${TENANT}&is_deleted=eq.false&select=count`);
      const log = await rest('GET', 'crm_message_log', `tenant_id=eq.${TENANT}&select=count`);
      p({ payment_links: t[0]?.payment_links, leads, events, attendees, log });
      break;
    }
    case 'leads': {
      const r = await rest('GET', 'crm_leads', `tenant_id=eq.${TENANT}&is_deleted=eq.false&select=id,full_name,phone,email,status,unsubscribed_at&order=created_at.desc`);
      p(r);
      break;
    }
    case 'events': {
      const r = await rest('GET', 'crm_events', `tenant_id=eq.${TENANT}&is_deleted=eq.false&select=id,name,event_date,status,max_capacity,booking_fee&order=event_date.desc`);
      p(r);
      break;
    }
    case 'attendees': {
      const eq = a[0] ? `&event_id=eq.${a[0]}` : '';
      const r = await rest('GET', 'crm_event_attendees', `tenant_id=eq.${TENANT}&is_deleted=eq.false${eq}&select=id,event_id,lead_id,status,payment_status,crm_leads(full_name,phone,status)&order=created_at.desc`);
      p(r);
      break;
    }
    case 'recent-log': {
      const r = await rest('GET', 'crm_message_log', `tenant_id=eq.${TENANT}&select=id,created_at,channel,status,error_message,template_id,lead_id,event_id,content&order=created_at.desc&limit=30`);
      p(r);
      break;
    }
    case 'intake': {
      const slug = TENANT === DEMO ? 'demo' : 'prizma';
      const r = await ef('lead-intake', { tenant_slug: slug, name: a[0], phone: a[1], email: a[2] }, true);
      p(r);
      break;
    }
    case 'sync': {
      const r = await rpc('sync_lead_status_from_attendee', { p_lead_id: a[0], p_tenant_id: TENANT });
      p(r);
      break;
    }
    case 'register': {
      const r = await rpc('register_lead_to_event', { p_tenant_id: TENANT, p_lead_id: a[0], p_event_id: a[1], p_method: 'qa-test' });
      p(r);
      break;
    }
    case 'move': {
      const r = await rpc('move_attendee_between_events', { p_attendee_id: a[0], p_target_event_id: a[1] });
      p(r);
      break;
    }
    case 'send': {
      const [slug, leadId, eventId, channel] = a;
      // resolve recipient phone/email from lead
      const ld = await rest('GET', 'crm_leads', `id=eq.${leadId}&select=phone,email,full_name`);
      const variables = { name: ld[0].full_name || '', phone: ld[0].phone || '', email: ld[0].email || '' };
      const r = await ef('send-message', { tenant_id: TENANT, lead_id: leadId, event_id: eventId, channel, template_slug: slug, variables, language: 'he' }, true);
      p(r);
      break;
    }
    case 'set-event-status': {
      const r = await rest('PATCH', 'crm_events', `id=eq.${a[0]}`, { status: a[1] });
      p({ ok: true, status: r[0]?.status });
      break;
    }
    case 'queue': {
      const [slug, leadId, eventId, channel, scheduledAt] = a;
      const ld = await rest('GET', 'crm_leads', `id=eq.${leadId}&select=phone,email,full_name`);
      const r = await rest('POST', 'crm_message_queue', '', {
        tenant_id: TENANT, lead_id: leadId, event_id: eventId, channel,
        template_slug: slug,
        variables: { name: ld[0].full_name || '', phone: ld[0].phone || '', email: ld[0].email || '' },
        language: 'he', status: 'queued', scheduled_at: scheduledAt,
      });
      p(r[0]);
      break;
    }
    case 'create-event': {
      // create-event "name" YYYY-MM-DD status capacity fee
      const [name, date, status, cap, fee] = a;
      const r = await rest('POST', 'crm_events', '', {
        tenant_id: TENANT, campaign_id: '00000000-0000-0000-0000-000000000000', // placeholder
        event_number: Math.floor(Math.random() * 90000) + 9999000,
        name, event_date: date, status, max_capacity: parseInt(cap), booking_fee: parseFloat(fee),
        location_address: 'הרצל 32, אשקלון', coupon_code: 'QA' + Date.now().toString().slice(-6),
        start_time: '09:00:00', end_time: '14:00:00',
      });
      p(r[0]);
      break;
    }
    default:
      console.error('Unknown command:', cmd);
      process.exit(2);
  }
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
