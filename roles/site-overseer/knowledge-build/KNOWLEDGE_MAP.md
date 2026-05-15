# KNOWLEDGE_MAP — CRM + Funnel + Measurement Architecture (Optic Up)

> **SPEC:** `roles/site-overseer/knowledge-build/SPEC.md` (SITE_OVERSEER_KNOWLEDGE_BUILD_FUNNEL)
> **Author:** opticup-executor (read-only run, 2026-05-14)
> **Mode:** PURE DIAGNOSTIC — every claim cites code (file:line) or DB row.
> **Tenant scope:** Prizma Optics (tenant_id `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) unless stated otherwise.
> **Status:** DRAFT — to be reviewed with Daniel one layer at a time before any merge to `SITE_OVERSEER_SKILL.md`.

---

## Layer 1 — Lead Acquisition (top of funnel)

**Definition:** every entry point that creates or touches a `crm_leads` row.

### Entry points (verified)

| Entry point | Caller | Server endpoint | Source value written to `crm_leads.source` | Evidence |
|---|---|---|---|---|
| Storefront `/supersale/` form | `submit-lead`? No — uses `lead-intake` (see below) | `POST /functions/v1/lead-intake` | `supersale_form` (default if caller omits `source`) | `supabase/functions/lead-intake/index.ts:26` (`DEFAULT_SOURCE = "supersale_form"`) |
| Storefront `/quick-register/?event=N` (QR walk-in) | Browser JS on quick-register page | `POST /functions/v1/quick-register` | `quick_register_qr` | `supabase/functions/quick-register/index.ts:31` (`SOURCE_TAG = "quick_register_qr"`) |
| Storefront product page "Notify me when in stock" | NotifyMe.astro component (in sibling repo) | `POST /functions/v1/submit-lead` → RPC `submit_storefront_lead` | NOT `crm_leads` — writes to `storefront_leads` (separate table) | `supabase/functions/submit-lead/index.ts:134` |
| Manual creation in ERP CRM UI | Employee using CRM | direct INSERT via `sb.from('crm_leads')` (helper) | whatever the UI puts in (often `null` or admin-entered) | `modules/crm/crm-leads-form*.js` (not read in this SPEC) — declared elsewhere |
| Make scenario `1) A. SuperSale` (legacy, scenario 8247377) | INACTIVE today | — | n/a today | Make MCP scenarios_list — `isActive=false` |
| `/r/<code>` short-link clicks | Storefront `resolve-link` EF | redirect only — no lead creation | n/a | `supabase/functions/resolve-link/index.ts` — only inserts to `short_link_clicks`, never to `crm_leads` |

### Field capture on a fresh `crm_leads` insert from `/supersale/`

Required by EF (HTTP 400 otherwise): `tenant_slug`, `name`, `phone`, `email`.
Optional/defaulted: `language` (default `'he'`), `source` (default `'supersale_form'`), `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_campaign_id`, `client_notes` (from `notes` field), `eye_exam_default`, `terms_approved`, `marketing_consent`.

Inserted row construction: `supabase/functions/lead-intake/index.ts:230-250`.

### Status on insert

- Fresh insert always: `status='new'` (line 237).
- Then `dispatchFreshLead` (dispatch.ts:137) immediately looks up an active event for this tenant (`status IN ('registration_open','waiting_list')`) and:
  - If found → calls `dispatchIntakeMessages(..., 'event_invite_new', ...)` (T5), upserts a `crm_event_attendees` row with `status='invited'`, AND flips `crm_leads.status` to `'invited'` (dispatch.ts:166-169).
  - If none → calls `dispatchIntakeMessages(..., 'lead_intake_new', ...)` (T1). Status stays `'new'`.

**MEASURED:** lead row created (yes/no), source, UTMs, timestamp.
**UNMEASURED / weak:** no client-side fingerprint, no IP, no user-agent, no `landing_url` (only the UTM bag), no session id, no time-on-page before submit. Cannot reconstruct "this lead clicked the SMS link and then submitted" from `crm_leads` alone — see Layer 7.

---

## Layer 2 — UTM & Attribution

### Capture
UTMs come in the request body to `/functions/v1/lead-intake` and are written directly to the new lead's row: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_campaign_id` (text, nullable — `crm_leads` schema dump, public.crm_leads columns 10-15).

Source-of-truth for the field list: `crm_leads` columns (verified via `information_schema` 2026-05-14).

### Storage semantics

- All 6 UTM columns are `text NULLABLE` with no default. (DB column list, this SPEC.)
- They are written **only at fresh insert**. The duplicate-lead branch (`lead-intake/index.ts:204-227`) updates `unsubscribed_at = null` and `updated_at = now()` — and nothing else. UTMs on the existing row are NOT touched.
- The race-safety branch (line 252-298, code 23505) likewise re-fetches the existing row and dispatches `lead_intake_duplicate` (T2) without touching UTMs.
- `quick-register` follows the same pattern (existingLead branch at index.ts:227-236 updates `unsubscribed_at`, `updated_at`, `acquired_via` — but does NOT update UTMs).

**This is the trap the SPEC §2 third wrong conclusion hit.** A lead created via FB Ads in March will keep `utm_source='facebook'` forever, even if the same person later clicks an SMS broadcast link in May and registers for event #24. The May registration leaves a new `crm_event_attendees` row but does NOT update the lead's UTMs. Reading event-24 attendee UTMs and inferring "13 of the 13 registrants came from FB" is mis-stated — the right reading is "13 of 13 of these PEOPLE originally entered the system from FB; we have no UTM-grade evidence about what made them click `register` for event #24."

### What UTMs measure vs. don't

- ✅ Measures: the lead's **original acquisition channel** (first-touch).
- ❌ Does NOT measure: re-engagement source, event-specific source, multi-touch attribution.

### Open question for Daniel
Q: should the duplicate-branch update `utm_*` when fresh values arrive in the body (last-touch model)? Or persist first-touch forever and add a separate per-event-attendee `acquisition_source` column for second-touch?

### Update 2026-05-14 (M3_UTM_TRIPLE_LAYER_PERSISTENCE — Phase 1 P1.1 closed)

The first-touch trap above is **partially closed** — `crm_leads.utm_*` columns still freeze at first insert (intentional, per Daniel's Q1 decision in FUNNEL_ROADMAP) BUT every active funnel interaction now also writes a row to a new table `crm_lead_touchpoints` with its own UTM bag + timestamp + type (`short_link_click`, `lead_submit`, `event_register`). Touchpoint capture is wired in:

- **`resolve-link` Edge Function** (v6): on every `/r/<code>` short-link click, records a `short_link_click` touchpoint with UTMs parsed from `short_links.target_url`. `lead_id` is pre-filled from `short_links.lead_id` when present (per-recipient broadcast SMS); otherwise NULL.
- **`lead-intake` Edge Function** (v25): on every form submit (fresh + duplicate + race branches), records a `lead_submit` touchpoint with UTMs from the request body. Then async-queues `resolve_touchpoints_to_lead` via `EdgeRuntime.waitUntil` to backfill `lead_id` on prior anonymous touchpoints (30-day window, matched by `phone_normalized`).
- **`register_lead_to_event` RPC** (signature expanded 4→13 params, old callers unaffected): on every state-changing terminal (T3 auto-move, T4 invited-promote, T6 undelete, T7 fresh over-cap, T8 fresh under-cap), records an `event_register` touchpoint with UTMs forwarded as RPC params. Dedupe_key uses `attendee_id` so revivals of the same attendee don't double-record.

**The Layer 2 wrong-conclusion trap from 2026-05-14 morning is now reading-only — for new touchpoints recorded post-P1.1. Pre-P1.1 leads will only have `crm_leads.utm_*` (historical first-touch) and no journey rows. The new view `v_crm_lead_first_touch` falls back to `crm_leads.utm_*` for those.**

The architectural debt FIND-2 from `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` is **structurally resolved** by this SPEC — Phase 4 E1 (MTA Engine) now has its substrate. E7 (Customer Journey Analytics) now has its event log. See `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/`.

---

## Layer 3 — Automation Rules

### Table — `crm_automation_rules`

Columns (verified): `id`, `tenant_id`, `name`, `trigger_entity`, `trigger_event`, `trigger_condition` (jsonb), `action_type`, `action_config` (jsonb), `sort_order`, `is_active`, `created_at`, `updated_at`.

### Live rules on prizma (17 rows, ordered by `sort_order`)

| # | Name (Hebrew) | trigger_entity / event | action_type | active? |
|---|---|---|---|---|
| 0 | צ'ק אין לאירוע | attendee / status_change | send_message | ✅ |
| 10 | שינוי סטטוס: ייפתח מחר | event / status_change | send_message | ✅ |
| 20 | שינוי סטטוס: נפתחה הרשמה | event / status_change | send_message | ✅ |
| 25 | אירוע פתח להרשמה - הזמנת רשימת המתנה | event / status_change | send_message | ✅ |
| 30 | שינוי סטטוס: הזמנה חדשה | event / status_change | send_message | ✅ |
| 40 | שינוי סטטוס: אירוע נסגר | event / status_change | send_message | ❌ |
| 50 | שינוי סטטוס: רשימת המתנה | event / status_change | send_message | ❌ |
| 60 | שינוי סטטוס: 2-3 ימים לפני | event / status_change | **queue_send** | ✅ |
| 70 | שינוי סטטוס: יום אירוע | event / status_change | **queue_send** | ✅ |
| 80 | שינוי סטטוס: הזמנה ממתינים | event / status_change | send_message | ✅ |
| 100 | הרשמה: אישור הרשמה | attendee / created | send_message | ✅ |
| 100 | שינוי סטטוס ליד: ברוך הבא לרשומים | lead / status_change | send_message | ❌ |
| 100 | שינוי סטטוס: אירוע הושלם | event / status_change | send_message | ✅ |
| 101 | ליד חדש: ברוך הבא | lead / created | send_message | ✅ |
| 110 | הרשמה: אישור רשימת המתנה | attendee / created | send_message | ✅ |
| 120 | העברת משתתף ידנית - לא שילם | attendee / moved | send_message | ✅ |
| 121 | העברת משתתף ידנית - שילם | attendee / moved | send_message | ✅ |

Source: `crm_automation_rules` SELECT, tenant=prizma, 2026-05-14.

### Trigger types known to the engine

`supabase/functions/automation-engine/engine.ts:14-21` defines:

```ts
event_status_change:     { entity: "event",    event: "status_change" }
event_registration:      { entity: "attendee", event: "created"       }
lead_status_change:      { entity: "lead",     event: "status_change" }
lead_intake:             { entity: "lead",     event: "created"       }
attendee_moved:          { entity: "attendee", event: "moved"         }
attendee_status_change:  { entity: "attendee", event: "status_change" }
```

### Two execution paths

1. **`send_message` action** — synchronous dispatch via send-message EF directly (one fetch per recipient × channel).
2. **`queue_send` action** — inserts rows into `crm_message_queue`; `dispatch-queue` EF (pg_cron every minute) drains them throttled. Used today for `2_3d_before` and `event_day` rules — high-fan-out paths.

### How rules get fired

- Browser ERP UI: `modules/crm/crm-automation-engine.js` (client-side) calls `CrmAutomation.evaluate(...)` on status changes the operator makes from the UI. Then either fires send-message directly or inserts queue rows.
- Server side: `pg_cron` jobs (`event_day_status_flip`, `event_2_3d_before_status_flip`) trigger automation-engine in `mode='dispatch'` (engine/index.ts:55-93).
- `consume_status_events` mode: pg_cron consumer that reads `crm_status_change_events` table and fires rules from there. Added 2026-05-12 (STATUS_CHANGE_TRIGGERS_FRAMEWORK).

### Critical distinction — `event_invite_new` is NOT a `crm_automation_rules` row

The `event_invite_new` template (T5) is fired by `lead-intake`'s server-side path (`supabase/functions/lead-intake/dispatch.ts:151-152`), bypassing `crm_automation_rules.evaluate` entirely. The same is true for `event_registration_confirmation` (event-register EF index.ts:317-321) and `event_coupon_delivery` (quick-register dispatch.ts:48-51). Public-form paths use a **hardcoded** template-base mapping.

→ This means the operator-visible automation-rules screen does NOT show every fire. T1/T2/T5/coupon-delivery dispatches happen from EFs and only appear in `crm_message_log` + synthetic `crm_automation_runs` rows (lead-intake/dispatch.ts:31-46).

---

## Layer 4 — Event System

### `crm_events` columns (verified)

`id, tenant_id, campaign_id, event_number, name, event_date, start_time, end_time, location_address, location_waze_url, status, max_capacity, booking_fee, coupon_code, registration_form_url, notes, monday_item_id, created_at, is_deleted, max_coupons, extra_coupons`.

### `crm_events.status` values observed in the live DB (DISTINCT scan, 2026-05-14)

`planning, invite_new, invite_waiting_list, registration_open, waiting_list, 2_3d_before, event_day, completed, closed`.

The intended transition order (inferred from rule names + timing rules): `planning → invite_new → invite_waiting_list → registration_open → waiting_list → 2_3d_before → event_day → completed → closed`.

**Caveat (UNRESOLVED):** the SPEC mentions `draft` and `live`. Those did NOT appear in the live DISTINCT scan on prizma's data — they may be additional planned states or stale historical strings. Add to open questions.

### Capacity logic

`crm_events` has `max_capacity` (int), `max_coupons` (int), `extra_coupons` (int). The RPC `register_lead_to_event` is the single source of truth that enforces capacity, dedup, and waiting-list transition (referenced by both `event-register/index.ts:270` and `quick-register/index.ts:308`). The RPC body lives in DB; the migration history is in `modules/Module 4 - CRM/migrations/2026_05_13_invited_ghost_attendee_fix_up.sql`, `modules/Module 4 - CRM/migrations/2026_05_14_register_lead_to_event_return_shape_fix_up.sql`, and (latest) `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_04_register_lead_to_event_up.sql`. **Full line-by-line RPC mapping completed 2026-05-14** in SPEC `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` (P1.4 — see `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/STATE_TRANSITIONS.md` for the 8-terminal state diagram + line-annotation table). FIND-1 from that mapping (return-shape inconsistency on the fresh-INSERT closed-and-full branch) was closed 2026-05-14 by SPEC `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` — the RPC now returns `status='event_closed'` (not `'waiting_list'`) when the event is closed AND capacity is full AND no existing same-event row exists.

**Update 2026-05-14 (M3_UTM_TRIPLE_LAYER_PERSISTENCE — Phase 1 P1.1 closed):** the RPC signature was expanded from 4 to 13 params (9 new optional UTM/context params with NULL defaults; old 4-arg callers unaffected). On every state-changing terminal (T3 auto-move, T4 invited-promote, T6 undelete, T7 fresh over-cap, T8 fresh under-cap), the RPC now also records an `event_register` touchpoint in `crm_lead_touchpoints` via `PERFORM public._record_touchpoint(...)`. Dedupe_key = `'event_register:' || attendee_id::text` ensures revival of the same attendee does NOT create a duplicate touchpoint row (ON CONFLICT DO NOTHING in helper RPC). T1 (RAISE 42501), T2 (event_not_found), T5 (already_registered) — no touchpoint (no registration state change). Body md5 transitioned `31fea2ea...` → `07e1904a...`. P1.4's FIND-2 (RPC writes no journey log) is structurally resolved by this change.

### `crm_event_attendees` columns + status values

Columns (selected): `id, tenant_id, lead_id, event_id, status, registration_method, registered_at, confirmed_at, checked_in_at, purchased_at, cancelled_at, purchase_amount, coupon_sent, coupon_sent_at, scheduled_time, eye_exam_needed, client_notes, waiting_list_position, payment_status, paid_at, refund_requested_at, refunded_at, credit_expires_at, credit_used_for_attendee_id, no_refund_due_marked, paid_via_credit`.

Status values observed (DISTINCT scan): `invited, registered, waiting_list, confirmed, attended, cancelled, purchased, duplicate, no_show`.

### How attendee rows are created (4 known paths)

1. **`lead-intake` server-side** when a fresh lead enters during an active event → `upsert` with `status='invited'` (dispatch.ts:153-159). `registration_method` is not set on this path.
2. **`event-register` form submission** → RPC `register_lead_to_event` with `p_method='form'` (event-register/index.ts:270-275).
3. **`quick-register` QR walk-in** → RPC `register_lead_to_event` with `p_method='quick_register_qr'` (quick-register/index.ts:308-313).
4. **Operator action in CRM UI** (manual move / mass-invite) → modules/crm/* — not read in detail for this SPEC.

**MEASURED:** registration_method on paths 2 and 3. **UNMEASURED:** on path 1 (server-side invite from active-event lookup) the row has `registration_method=null`. So "how was this attendee created?" cannot be fully answered from a single column.

### Fast-Path Automation Registry (D2 — Q10 decision, 2026-05-14)

**What this is.** A fast-path is any code path that calls `send-message` (and writes `crm_message_log` + a synthetic `crm_automation_runs` row) **directly from an Edge Function**, without first consulting `crm_automation_rules.evaluate` or `automation-engine`. Daniel's Q10 decision (FUNNEL_ROADMAP.md) accepted these as intentional optimizations — the registry below is the canonical inventory so future SPEC authors don't accidentally duplicate or undermine them.

**Why fast-paths exist (Daniel, Q10):** "The goal was that if someone joins the event-system and there's an open event, they shouldn't go through the whole flow — they go straight to 'registered' board and get the message." Latency + simplicity for inbound, user-initiated paths where the trigger is already deterministic (form submit, QR scan, intake EF). Going through `crm_automation_rules` would add a SELECT + rule-eval + queue insert for zero behavioral gain.

**Registry — 3 fast-paths in production (verified 2026-05-14):**

| # | Fast-path slug | Trigger | Target EF + template(s) | Bypassed layer | Why bypassed | Code anchor |
|---|---|---|---|---|---|---|
| FP-1 | `event_invite_new` | `lead-intake` finds an active event (`crm_events.status IN ('registration_open','waiting_list')`) on a fresh-lead success | `send-message` → T5 `event_invite_new_sms_he` / `event_invite_new_email_he` + upsert `crm_event_attendees(status='invited')` + flip `crm_leads.status='invited'` | `crm_automation_rules.evaluate` (browser engine + status-change consumer) | Active-event invite is deterministic on the intake side — no rule needed. Round-trip via automation-engine would add a SELECT+eval for no decision. Synthetic `crm_automation_runs` row preserves history visibility. | `supabase/functions/lead-intake/dispatch.ts:137-176` (fresh-lead branch) + `dispatch.ts:76-96` (intake messages helper) |
| FP-2 | `event_registration_confirmation` / `event_waiting_list_confirmation` | Public form posts to `event-register` and `register_lead_to_event` RPC returns `status IN ('registered','waiting_list')` | `send-message` → T (registered) or waiting-list template (SMS + optional email) | `crm_automation_rules.evaluate` | Public-form path is the canonical "registered" trigger; rule lookup would just rediscover the same hardcoded mapping (commented as "matches rules #9/#10 on demo"). | `supabase/functions/event-register/index.ts:316-336` (template selection + dispatch) + `index.ts:95-105` (dispatch helper) |
| FP-3 | `event_coupon_delivery` / `event_waiting_list_confirmation` (QR walk-in branch) | `quick-register` (QR walk-in) calls `register_lead_to_event` with `p_method='quick_register_qr'` and gets back a non-`already_registered` status | `send-message` → T `event_coupon_delivery` (registered) or waiting-list template; on success also flips `crm_event_attendees.coupon_sent=true` | `crm_automation_rules.evaluate` | QR walk-in needs the coupon SMS in <1s so the customer sees it on the device they just scanned with. Going through queue+cron would add up to 60s latency. `coupon_sent=true` flip mirrors the manual operator UI to prevent duplicate sends. | `supabase/functions/quick-register/index.ts:307-338` + `supabase/functions/quick-register/dispatch.ts:37-85` |

**Decision rule — when is it OK to add a new fast-path?**

A new fast-path is acceptable **only when ALL of these hold:**

1. **Trigger is deterministic at the EF boundary.** The decision "send this template now" is fully knowable from the EF's existing inputs — no operator choice, no scheduled phase, no cross-lead aggregation.
2. **Latency is user-visible.** The customer is actively waiting for the SMS (form-submit confirmation, QR-scan coupon, intake reply) — adding `crm_automation_rules.evaluate` + `crm_message_queue` + pg_cron drain (up to 60s) would degrade UX.
3. **Single template family.** The fast-path picks from a hardcoded template-base slug (or waiting-list variant) — NOT a list of rules that could change per tenant per event.
4. **Synthetic run is recorded.** The path opens a `crm_automation_runs` row (`trigger_type='lead_intake'` or equivalent) and stamps `run_id` on every `send-message` call, so operator history still shows the fire (see `lead-intake/dispatch.ts:openRun/closeRun`).
5. **Touchpoint is recorded (P1.1 era and later).** Any fast-path that creates or revives a `crm_event_attendees` row must result in a `crm_lead_touchpoints` row (either directly or via the RPC). Without this, MTA (E1) loses the touchpoint.

**If ANY criterion fails — DO NOT add a fast-path.** Route through `crm_automation_rules` or `automation-engine` so the rule is operator-visible, tenant-configurable, and historically auditable. Examples that MUST go through the engine: status-driven blasts (`registration_open`, `event_day`, `2_3d_before`), broadcast wizard sends, multi-rule cascades, anything an operator can toggle on/off per tenant.

**SPEC-author checklist (mandatory before changing automation behavior):**

- [ ] Read this Fast-Path Automation Registry. Identify which fast-path (if any) the SPEC touches.
- [ ] If extending an existing fast-path: confirm all 5 decision-rule criteria still hold; update the registry row above in the same SPEC.
- [ ] If adding a new fast-path: justify each of the 5 criteria explicitly in the SPEC §4 design section; add a new FP-N row to the registry; flag for Site Overseer review.
- [ ] If removing a fast-path (e.g., migrating to `automation-engine`): plan latency impact + operator UX + history continuity (synthetic `crm_automation_runs` rows must still appear).
- [ ] If modifying `crm_automation_rules` evaluation: check that no fast-path template slug above is also a rule — if it is, the fast-path will fire FIRST and the rule may be a no-op or worse, a duplicate.

**Maintenance.** Update this registry whenever a new fast-path is added, removed, or its trigger/template changes. The registry is co-located with Layer 4 (event system) because all 3 current fast-paths are event-system-adjacent — if a non-event fast-path is ever added, consider promoting the registry to its own Layer.

---

## Layer 5 — Broadcasts

### `crm_broadcasts` columns (verified)

`id, tenant_id, employee_id, name, channel, template_id, filter_criteria (jsonb), total_recipients, total_sent, total_failed, status, created_at`.

### Send flow (current, post-2026-05-12 BROADCAST_QUEUE_INTEGRATION)

```
ERP Broadcast Wizard UI (crm-messaging-broadcast.js)
   ↓ CrmBroadcastQueue.enqueueBroadcast(...)
   ↓
   ├─→ INSERT crm_broadcasts (status='queued', total_sent=0, total_failed=0)
   └─→ INSERT crm_message_queue rows × N recipients
        (tenant_id, lead_id, channel, language, template_slug|body, variables, event_id, status='queued')
   ↓
pg_cron tick (every minute)
   ↓
dispatch-queue EF (drains queue, throttled 500ms email / 1000ms SMS)
   ↓ POST /functions/v1/send-message  (one per claimed row)
   ↓
send-message EF
   ↓ INSERT crm_message_log (status='pending')
   ↓ POST Make webhook 9104395 (Optic Up — Send Message)
   ↓ UPDATE crm_message_log SET status='sent'|'failed'
   ↓
Make scenario 9104395
   ↓ Router → Global SMS module OR Gmail module
   ↓ Webhook returns 200 to send-message EF
```

Code anchors: `modules/crm/crm-messaging-broadcast-queue.js:111-138` (broadcast insert), `74-98` (queue row build), `100-109` (chunked insert). `supabase/functions/dispatch-queue/index.ts:101-172` (drain). `supabase/functions/send-message/index.ts:312-323` and `supabase/functions/send-message/dispatch.ts:30-155` (the final-stage write).

### The `total_sent` / `status` bookkeeping problem (CRITICAL FINDING)

`crm_broadcasts` is **inserted** at line 112-135 of `crm-messaging-broadcast-queue.js` with `total_sent: 0, total_failed: 0, status: 'queued'`. After that:

- A whole-repo grep for `crm_broadcasts.*update`, `update.*crm_broadcasts`, `broadcasts.*total_sent`, `broadcasts.*set.*status` returns **zero matches** (verified 2026-05-14, this SPEC).
- A whole-repo grep for `broadcast_id` returns exactly **one** non-schema hit — the FK column definition in `campaigns/supersale/migrations/001_crm_schema.sql:286`. No code anywhere writes `broadcast_id` into `crm_message_log`, and no code anywhere updates `crm_broadcasts.total_sent` / `status`.
- The queue row builder (`buildQueueRows`, lines 74-98) does NOT include `broadcast_id` in the row (and `crm_message_queue` schema has no `broadcast_id` column anyway — verified). `run_id` is also `null` for broadcasts since they come from the UI path, not from automation-engine's `createRun`.

**Consequence:** after the 2026-05-12 BROADCAST_QUEUE_INTEGRATION change, every new broadcast row stays at `status='queued', total_sent=0` forever — even though the queue rows DID drain and the SMS/email DID send. The DB confirms this:

```
status     | cnt | with_sent | min_at                 | max_at
-----------+-----+-----------+------------------------+------------------------
completed  |  5  |     5     | 2026-04-23 08:38:00+00 | 2026-05-12 12:36:26+00
partial    |  3  |     1     | 2026-04-25 03:49:40+00 | 2026-05-12 11:12:17+00
queued     |  4  |     0     | 2026-05-12 13:08:19+00 | 2026-05-13 07:37:34+00
```

(SQL run against `crm_broadcasts` 2026-05-14, this SPEC.)

The cutoff at 2026-05-12 is the date BROADCAST_QUEUE_INTEGRATION shipped. Prior broadcasts went through a different path that DID update counters — that path no longer exists in the codebase.

**This is the root of SPEC §2 wrong-conclusion #1.** "1170 broadcasts queued but never sent" was a misreading of bookkeeping rot: the per-recipient queue rows DID send, but the parent broadcast row never advanced from `status='queued', total_sent=0`. A correct counter would require either (a) joining `crm_message_log` to `crm_broadcasts` via a `broadcast_id` column that is currently unused on writes, or (b) a post-drain aggregation hook that we do not have.

### Per-recipient send authority

`crm_message_log` is the authoritative per-recipient ledger (`channel, content, status='pending'|'sent'|'failed'|'rejected', template_id, lead_id, event_id, run_id, broadcast_id`). It records:
- 1 row per send attempt (send-message EF dispatch.ts:37-50).
- Status transitions: `pending → sent` (Make webhook 200) or `pending → failed` (Make non-2xx / exception / unsubstituted placeholder).
- Suppression rejects (`unsubscribed_at` or `status='unsubscribed'`) write a row with `status='rejected'` and never call Make (send-message/index.ts:142-148).
- Allowlist rejects same pattern (lines 296-310).

**MEASURED:** every send attempt — yes/no/failed, per lead, per channel, with content body.
**UNMEASURED:** delivery (we get Make's `200` back but Make is fire-and-forget — see Layer 10). No telco DLR (delivery report) anywhere. No open tracking on email. No bounce tracking on email.

---

## Layer 6 — Message Templates

### Table `crm_message_templates` (verified)

`id, tenant_id, slug, name, channel, language, subject, body, is_active, created_at, required_variables (jsonb), show_in_automations`.

### Slug naming convention

`{templateBase}_{channel}_{language}`. send-message EF builds the lookup key at index.ts:177: `` `${templateSlug}_${channel}_${language}` ``.

Examples on prizma (30 active templates queried 2026-05-14):
- `lead_intake_new_sms_he`, `lead_intake_new_email_he` (T1)
- `lead_intake_duplicate_sms_he`, `lead_intake_duplicate_email_he` (T2)
- `event_invite_new_sms_he`, `event_invite_new_email_he` (T5)
- `event_registration_confirmation_sms_he`, `event_registration_confirmation_email_he`
- `event_coupon_delivery_sms_he`, `event_coupon_delivery_email_he`
- `event_waiting_list_*`, `event_waiting_list_confirmation_*`
- `event_day_*`, `event_2_3d_before_*`, `event_will_open_tomorrow_*`
- `event_attendee_moved_paid_*`, `event_attendee_moved_unpaid_*`
- `event_registration_open_*`, `event_invite_waiting_list_*`
- `check_in_attendee_sms_he`, `payment_received_email_he`

### Variable substitution

send-message/index.ts:68-78 — pattern `%(\w+)%` replaced from `vars`. If a key is missing, the literal `%name%` stays in the body (intentionally — see comment at line 64-67). After substitution, a universal scanner at index.ts:263-278 rejects any send whose body still contains unsubstituted `%X%` literals (Pattern P33 Fix B). The `crm_message_log` row records `status='failed'` with `error_message='unsubstituted_placeholder: name'` etc.

### Auto-injected variables

`injectLeadVariables` (lead-variables.ts) fills `%name%`, `%phone%`, `%email%`, `%lead_id%` from `crm_leads` for the given `lead_id`. Caller-wins (only fills gaps). Runs on EVERY dispatch — guarantees no template can leak a literal `%name%` to a customer if the lead row exists.

`injectAutoUrls` (url-builders.ts via send-message/index.ts:157) creates two short-link rows on every dispatch (when `eventId` is provided):
- An unsubscribe URL → `%unsubscribe_url%` (always).
- A registration URL → `%registration_url%` (only when `eventId` is set).

Both URLs are HMAC-signed tokens (SERVICE_ROLE_KEY signing key) and TTL = 90 days (TOKEN_TTL_SECONDS in url-builders.ts:23). Both are wrapped in `short_links` rows and returned as `{storefront_url}/r/{code}` strings. **So `%registration_url%` IS per-recipient unique** — every broadcast generates 1170 unique short_links codes, each with its own `lead_id` + `event_id`. (Critical fact for Daniel — was an unknown going into this SPEC.)

`injectEventVariables` (event-variables.ts) fills `%event_name%`, `%event_date%`, `%event_time%`, `%event_location%`, `%payment_url_<fee>%`, etc. from `crm_events`.

### `required_variables`

A jsonb array. send-message/index.ts:212-236 validates that each required key is present and non-empty BEFORE substitution. Missing → HTTP 400 + failed log row.

In the live prizma DB right now: **every active template has `required_variables: []`** (verified — all 30 active rows queried in this SPEC). So the validation path is dormant. (Open question: was this intentional, or never filled in?)

### Per-recipient unsubscribe URLs

Yes — every dispatch generates a unique unsubscribe `short_links` row tied to (lead_id, tenant_id). Verified at url-builders.ts:100-111.

---

## Layer 7 — Click Tracking & Short URLs

### The `r.html` redirector at repo root (`/r.html`)

`r.html` (24 lines, repo root) is a static HTML page that uses JS `window.location.replace` to forward the browser to `modules/crm/public/event-register.html` + query string. **It does NOT touch the DB, does NOT log a click, does NOT increment any counter.** It is a legacy "soft redirect" for hand-shared ERP links — distinct from the storefront `/r/<code>` short-link path below.

### The storefront `/r/<code>` short-link redirector

Path: `/r/<code>` on the storefront origin → resolve-link Edge Function (`supabase/functions/resolve-link/`).

What it does:
1. SELECT `short_links` row by `code` (line 149-154).
2. If found and not expired → return HTTP 302 to `target_url`.
3. **Fire-and-forget:** increment legacy `short_links.click_count` (line 176-180).
4. **Fire-and-forget:** insert one `short_link_clicks` row with `tenant_id, short_link_id, ip_hash (sha256), user_agent (≤200 chars), referer (≤200 chars), clicked_at`. 30-second idempotency window per (short_link_id, ip_hash) deduplicates rapid double-clicks (line 86-130). Added 2026-05-14 (M4_MESSAGE_PERFORMANCE_TRACKING).

### `short_links` columns

`id, tenant_id, code, target_url, link_type, lead_id, event_id, expires_at, click_count, created_at, message_log_id`.

The `message_log_id` FK (added 2026-05-14) is backfilled by send-message/dispatch.ts:61-75 once the `crm_message_log` row is inserted. **Caveat:** when `injectAutoUrls` runs without a `crm_message_log` row first (e.g. when both insertion paths race in unusual ways), the FK can be NULL. The current send-message flow inserts the log row deterministically before backfill, so this is rare.

### `short_link_clicks` columns

`id, short_link_id, tenant_id, clicked_at, ip_hash, user_agent, referer, created_at`. Index/PK setup not inspected in this SPEC.

### Inventory of what is and isn't tracked

| Click source | Tracked? | Evidence |
|---|---|---|
| Click on `/r/<code>` (storefront short link inside SMS or email body) | ✅ Per-click row in `short_link_clicks` + `click_count++` on `short_links` | resolve-link/index.ts:176-188 |
| Click on `/r.html?...` legacy redirector (rare today) | ❌ Not tracked | r.html:12-18 — JS-only redirect, no fetch |
| Click on raw `https://prizmaoptic.short.gy/...` (external short.gy service) | ⚠️ **DEPRECATED 2026-05-14 (M3_SHORTGY_TO_INTERNAL_REDIRECT, P1.3)** — every statically-embedded short.gy reference migrated to internal `/r/<code>` (templates + tenants.payment_links). Historical short.gy clicks stay in short.gy's UI; no backfill. From 2026-05-14 forward all new clicks are internal + tracked. | Templates / tenants.payment_links DB queries return zero short.gy refs post-migration. `crm_message_log.content` (4,370 rows) + `crm_message_queue.body` status=sent (1,170 rows) remain immutable historical record. |
| Email open | ❌ No tracking pixel injected today | No `<img>` open-tracker URL builder in templates |
| Email bounce | ❌ No bounce handler hooked from Gmail | Make scenario 9104395 has Gmail module but no error-route bounce handler |
| SMS delivery (DLR) | ❌ Not captured | Make 9104395 returns success on webhook accept, not on telco confirm |
| Form submission (storefront pixel `Lead` event) | ✅ Browser-side via `pixel_events` config (Layer 9) | storefront_config.analytics.pixel_events on prizma, this SPEC |

### Critical: linking a click back to a specific broadcast

Today: `short_links.message_log_id → crm_message_log.id`, and `crm_message_log` HAS a `broadcast_id` column. So in principle a click can be linked to a broadcast via `short_link_clicks → short_links → crm_message_log.broadcast_id`. **BUT** — and this is the trap — `broadcast_id` is NEVER WRITTEN in any code path (see Layer 5 finding). So `crm_message_log.broadcast_id IS NULL` for every row created post-BROADCAST_QUEUE_INTEGRATION (2026-05-12). The linkage chain is broken at that hop.

---

## Layer 8 — Form Submission

### `/supersale/` form → fresh lead → confirmation message

1. Browser submits `POST /functions/v1/lead-intake` with `{tenant_slug, name, phone, email, eye_exam, notes, language?, source?, utm_*?, terms_approved, marketing_consent}`.
2. EF normalizes phone (E.164), validates email, lowercases email (line 147).
3. Resolves `tenants.id` from `tenant_slug` (line 174-185).
4. Duplicate-check by `(tenant_id, phone, is_deleted=false)` (line 190-202).
5. If existing → return HTTP **409** with `{duplicate:true, is_new:false, id, existing_name}`. Background T2 dispatch + clear `unsubscribed_at`.
6. If new → INSERT row → HTTP **201** `{id, is_new:true}`. Background `dispatchFreshLead` runs (waitUntil at line 304-307).
7. `dispatchFreshLead` looks up an active event:
   - If event found → T5 SMS+email + upsert attendee `status='invited'` + flip lead.status to `'invited'`.
   - If no event found → T1 SMS+email.

Source: `supabase/functions/lead-intake/index.ts:105-313` + `dispatch.ts:137-176`.

### Public form pre-fill on `event-register` URL with token

When a recipient clicks `%registration_url%` from an SMS:
- Browser GETs `https://<storefront>/event-register?token=<hmac>`.
- The storefront page (in sibling repo, not read in this SPEC) calls `GET /functions/v1/event-register?token=...`.
- EF verifies HMAC (event-register/index.ts:46-80), decodes `(leadId, tenantId, eventId, exp)`.
- EF returns pre-fill payload: lead's stored `full_name, phone, email` + event fields (lines 152-213).
- Browser pre-populates the form with those values. Lead never has to re-type their name or phone.

The HMAC is signed with `SERVICE_ROLE_KEY`. TTL = 90 days (TOKEN_TTL_SECONDS, url-builders.ts:23).

### When does each row get created (decision table)

| Action | `crm_leads` row | `crm_event_attendees` row | Status fields |
|---|---|---|---|
| `/supersale/` submit, fresh lead, NO active event | INSERT (status='new') | none | lead.status='new' |
| `/supersale/` submit, fresh lead, active event exists | INSERT (status='new', then UPDATE → 'invited') | UPSERT (status='invited') | both 'invited' |
| `/supersale/` submit, duplicate (existing phone) | UPDATE unsubscribed_at=null only | none | unchanged |
| `/event-register?token=...` submit by invited lead | UPDATE updated_at only (via RPC) | `register_lead_to_event` RPC: insert or transition `invited → registered/waiting_list/event_closed` | attendee.status='registered' OR 'waiting_list' (event open + full) OR 'event_closed' (event closed + full); RPC return matches row state after 2026-05-14 fix |
| `/quick-register/?event=N` walk-in, fresh | INSERT (status='new') | RPC → `registered` (or `waiting_list` if capped) | attendee.coupon_sent=true after dispatch |
| `/quick-register/?event=N` walk-in, existing lead | UPDATE `unsubscribed_at=null, acquired_via=quick_register_qr` | RPC same as above | same |

---

## Layer 9 — Pixel & Conversion Tracking

### Pixel ID & where it's stored

`storefront_config.analytics.facebook_pixel_id = '304574492100180'` on prizma (verified 2026-05-14, this SPEC).

### Event mapping

`storefront_config.analytics.pixel_events` is a jsonb array. On prizma today:

```json
[
  {"event":"Lead","label":"סופרסייל - טופס נשלח","url_pattern":"/successfulsupersale/"},
  {"event":"Lead","label":"SuperSale EN",          "url_pattern":"/en/successfulsupersale/"},
  {"event":"Lead","label":"SuperSale RU",          "url_pattern":"/ru/successfulsupersale/"},
  {"event":"Lead","label":"טופס כללי - נשלח",     "url_pattern":"/successfulmulti/"}
]
```

(Verified 2026-05-14, this SPEC.)

### How the pixel fires (PARTIALLY UNRESOLVED in this SPEC)

The storefront pixel firing code lives in the **sibling `opticup-storefront` repo**, which is NOT in this working directory. A repo-wide grep for `fbq(`, `FacebookPixel`, `connect.facebook.net` in the current ERP repo returns **only** `modules/storefront/storefront-settings.js` (which is the ERP-side editor UI for analytics config, not the firing code).

Inferred from `pixel_events`: the storefront loads the FB Pixel base library, fires `PageView` on every navigation, and fires a `Lead` event when the URL path matches one of the four `url_pattern` entries above. That means the `Lead` event is bound to **landing on a thank-you page** (`/successfulsupersale/`), NOT to the form-submit DOM event. If the submit redirects to that path via `window.location`, the pixel sees it as a PageView and matches the pattern → fires `Lead`.

**This is a measurement weakness.** If the redirect fails (network error, blocker, user closes tab), the lead-intake EF still creates the lead but the pixel never fires. The lead is in our DB and NOT in FB Ads' attribution. **Cannot quantify from the ERP repo alone** — flagged for Daniel.

### Match-quality side (what FB knows about each lead)

Browser-side `Lead` event today carries no PII — only the cookies the browser already has (`_fbp`, `_fbc`). Match-quality is whatever FB can resolve from the cookies alone. Email and phone are NOT hashed-and-sent on the browser-pixel side from prizma's storefront — that would require either an Advanced Matching block on the pixel base script or a CAPI call. Neither is in the ERP repo. (Storefront repo not inspected — flagged.)

### Server-side / CAPI

The DB schema supports it: `storefront_config.analytics.fb_capi_token` is a settable field (storefront-settings.js:28+91). On prizma right now: `fb_capi_token` is NOT PRESENT in the analytics object (verified — only `pixel_events` + `facebook_pixel_id` keys exist).

Code that calls graph.facebook.com: **none in this repo.** Grep for `fb_capi_token|CAPI|conversions/event|graph\.facebook\.com` returns only the editor UI hits and nothing that calls the API.

Make scenario `שליחת רכישות לפייסבוק` (id 8542928) exists as a likely CAPI sender — but is **inactive** (verified via Make MCP, this SPEC).

**Conclusion:** server-side CAPI is **not running today** for prizma. All conversion measurement is browser-side `Lead` events bound to thank-you-page loads.

---

## Layer 10 — Make Scenarios

### Inventory (prizma team 402680, scenarios_list 2026-05-14)

24 scenarios total. Only **3 are active** today:

| ID | Name | Last edit | Role |
|---|---|---|---|
| 9104395 | Optic Up — Send Message | 2026-04-29 | **Send-only pipe** — webhook → router → Global SMS or Gmail. The single dispatch channel used by every send-message EF call. |
| 8464122 | 1) WhatsApp - ניהול וואטספ נכנסות | 2026-05-04 | Inbound WhatsApp handler — Green-API webhook → Monday + send-message EF. Customer service path. |
| 8502052 | Unsubscribe הורדה מרשימת התפוצה מייל בלבד | 2026-03-02 | Email-side unsubscribe (legacy — modern path is the `unsubscribe` EF + `crm_leads.unsubscribed_at`). |

The other 21 are **inactive** legacy SuperSale + MultiSale flows from before Architecture v3 (the 2026-04-22 rebuild). Names like `1) A. SuperSale אישור תקנון`, `2) רישום משתתפים לאירוע`, `5)A. פתיחת אירוע ושליחת הודעות`, `6) א. SuperSale + Manual` — they used to do the work that lead-intake / event-register EFs now do. Daniel migrated, the scenarios were turned off, but the records remain.

### Inactive but notable (FB-side measurement)

- `Facebook Campaigns → Optic Up CRM (PRIZMA)` (9126542, INACTIVE) — would sync FB Campaigns → CRM if active.
- `Facebook ADS Integration Facebook Insights` (8467639, INACTIVE) — would pull FB Ads Insights.
- `Facebook ADS יצירת מודעות חדשות` (8467280, INACTIVE) and `ניקוי מודעות` (8484085, INACTIVE).
- **`שליחת רכישות לפייסבוק` (8542928, INACTIVE)** — the would-be CAPI sender for purchases. Not running.

### What 9104395 writes back to Supabase

**Nothing.** The Make scenario has 4 modules (Webhook → Router → Global SMS | Gmail) and no Supabase connection in the v3 rebuild (`modules/Module 4 - CRM/go-live/make-send-message.md:28-30`). The Supabase write-back lives in the send-message EF itself: send-message gets the Make HTTP response (200 → mark `crm_message_log.status='sent'`; non-2xx → mark `failed`). Make does NOT confirm telco delivery — it confirms only that the SMS/email vendor accepted the payload.

### What execution logs look like

- Make scenario execution history lives in Make's internal logs (accessible via MCP `executions_list` / `executions_get`, not inspected in this SPEC).
- Our DB has no mirror table for Make execution rows.
- `crm_message_log` is the closest thing — for every Make POST, send-message EF writes one row, with `status='sent'|'failed'|'rejected'` + `error_message` if failed.

### Make execution success ≠ user received the message

Make returning 200 to send-message means the vendor (Global SMS or Gmail) returned 200 to Make. It does NOT mean:
- the SMS arrived at the handset (no DLR captured).
- the email landed in the inbox (no bounce captured).
- the email was opened (no open-tracker pixel).
- the link was clicked (we DO capture this via `short_link_clicks` for links that went through `/r/<code>` only).

---

## What is MEASURED / UNMEASURED / PARTIAL — funnel summary

| Funnel stage | Status | Where measured |
|---|---|---|
| Storefront page view (`/supersale/`) | **PARTIAL** | Browser pixel `PageView` only; no server-side log |
| Form submit attempt (button click) | **UNMEASURED** | No tracking on click; only on successful submit |
| Form submit success (HTTP 201/409) | **MEASURED** | `crm_leads` row created OR 409 returned |
| Pixel `Lead` event fired | **PARTIAL** | Only if redirect to `/successfulsupersale/` lands; if redirect fails, pixel doesn't fire even though lead exists in DB |
| Lead's original UTMs captured | **MEASURED** | `crm_leads.utm_*` — but only on FIRST insert |
| Lead's re-engagement source (e.g., SMS click) | **UNMEASURED** | UTMs frozen at first-touch; no per-engagement source column |
| Automation rule fire | **MEASURED** | `crm_automation_runs` (browser path) + synthetic runs in lead-intake path |
| Message send attempt | **MEASURED** | `crm_message_log` row per send, with status |
| Message send → vendor accepted | **MEASURED** | `crm_message_log.status='sent'` |
| Message → telco delivered (DLR) | **UNMEASURED** | No DLR webhook from Make/vendor |
| Email opened | **UNMEASURED** | No open pixel in templates |
| Email bounced | **UNMEASURED** | No bounce route in Make scenario 9104395 |
| SMS link clicked | **MEASURED** | `short_link_clicks` for `/r/<code>` URLs (post-2026-05-14) |
| External short.gy link clicked | **UNMEASURED** in our DB | Lives only in short.gy's dashboard |
| Click → which broadcast / which message | **MEASURED (post-2026-05-14 P1.2)** | `crm_message_log.broadcast_id` populated via send-message EF v25; `short_links.broadcast_id` stamped at link-build time (X1 substrate); `short_link_clicks.broadcast_id` + `crm_lead_touchpoints.broadcast_id` populated by resolve-link EF v7. See `M4_BROADCAST_ID_PROPAGATION` (P1.2). |
| Form arrival (landed on event-register page) | **UNMEASURED** | No "arrived from short-link" log; the click is logged but the landing is not |
| Event registration submit | **MEASURED** | RPC `register_lead_to_event` → `crm_event_attendees` row |
| Walk-in QR registration | **MEASURED** | `registration_method='quick_register_qr'` on attendee row |
| Attendee checked in at event | **MEASURED** | `crm_event_attendees.checked_in_at` |
| Attendee purchased | **MEASURED** | `crm_event_attendees.purchased_at, purchase_amount` |
| Purchase → FB CAPI for ROAS | **UNMEASURED** | Scenario 8542928 exists but is INACTIVE; no graph.facebook.com call in code |
| Broadcast aggregate counters | **MEASURED (post-2026-05-14 P1.2)** | pg_cron `crm_broadcast_total_sent_refresh` updates `total_sent`/`total_failed`/`status` every minute from `crm_message_log` aggregation. See `M4_BROADCAST_ID_PROPAGATION`. |

---

## Top 5 Tracking Gaps

### Gap #1 — Broadcast bookkeeping is dead (RESOLVED 2026-05-14 by `M4_BROADCAST_ID_PROPAGATION` P1.2)
**Previously:** Every broadcast since 2026-05-12 stayed `crm_broadcasts.status='queued', total_sent=0` forever.
**Fix:** pg_cron job `crm_broadcast_total_sent_refresh` runs every minute, aggregates `crm_message_log` by `broadcast_id`, updates `total_sent` / `total_failed` / flips `status` from 'queued'/'sending' to 'sent' when all queue rows drained. Idempotent via `WHERE b.status IN ('queued','sending')` so finished broadcasts are never re-touched.
**Backfill note:** 2026-05-12 → 2026-05-14 historical broadcasts remain at `total_sent=0` by design (Option-X choice — no heuristic backfill). Phase 2.5 dashboards filter "broadcasts after 2026-05-14" for clean charts.

### Gap #2 — No `broadcast_id` propagation from broadcast → queue → log (RESOLVED 2026-05-14 by `M4_BROADCAST_ID_PROPAGATION` P1.2)
**Previously:** `crm_message_queue` schema had no `broadcast_id`; `crm_message_log.broadcast_id` existed but was never populated.
**Fix:** End-to-end X1 chain wired — `crm_message_queue.broadcast_id` column added; `crm-messaging-broadcast-queue.js` `buildQueueRows` stamps it on every queue row; `dispatch-queue` EF v14 SELECTs + forwards to `send-message` payload; `send-message` EF v25 writes `broadcast_id` on `crm_message_log` row (all 8 insert paths) AND threads it through `injectAutoUrls` → `createShortLink` to stamp `short_links.broadcast_id`; `resolve-link` EF v7 reads `short_links.broadcast_id` at click time, writes it to `short_link_clicks.broadcast_id` + `crm_lead_touchpoints.broadcast_id`. All hops carry `broadcast_id` end-to-end. `register_lead_to_event` RPC also gained 14th param `p_broadcast_id uuid DEFAULT NULL` so the event_register touchpoint can carry the attribution when callers know the broadcast (current ERP/EF callers pass NULL — wiring deferred to a future SPEC).

### Gap #3 — `registration_method` is NULL for server-side invites (MEDIUM)
The lead-intake server-side path (`dispatch.ts:153-159`) upserts `crm_event_attendees` with `status='invited'` and no `registration_method`. So `attendees WHERE registration_method='form'` excludes server-invited rows. The 4 paths in Layer 4 collapse to 3 distinguishable in the data.
**Impact:** "how many attendees came from the auto-invite at lead-intake vs the form vs the QR" cannot be answered cleanly.

### Gap #4 — UTMs are first-touch only; no per-event acquisition source (HIGH for marketing attribution)
A lead created in March from FB and registered for event #24 in May has `utm_source='facebook'` forever. There is no `crm_event_attendees.acquisition_source` column or equivalent. Evidence: `crm_leads` dedup branch at lead-intake/index.ts:204-227.
**Impact:** direct cause of SPEC §2 wrong-conclusion #3. Reading UTMs on a registered attendee tells you about the LEAD'S history, not about the REGISTRATION'S cause.

### Gap #5 — Browser pixel `Lead` is bound to thank-you page load, no server-side CAPI (HIGH for FB ad attribution)

> **STATUS: ✅ CLOSED via P2.1 — `M4_FB_CAPI_HYBRID_DEDUPLICATION` (2026-05-15)**
> See `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/` and `docs/FB_CAPI.md`.
> **Note on Q7 (thank-you-page only model):** Daniel's directive preserved — CAPI fires at lead INSERT
> (server-side coverage), browser pixel still fires on thank-you page. Meta counts each source; the
> shared `event_id` dedup round-trip (storefront SPEC `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF`) ensures
> both are deduplicated once that ships. Until then: CAPI provides additional coverage; no double-counting
> risk (different trigger point — INSERT vs page-load). Q7 model is SUPPORTED by this architecture.

`pixel_events` fires `Lead` only when the URL matches `/successfulsupersale/` etc. If the post-submit redirect fails, the lead is in our DB but Facebook never gets a `Lead` event → ROAS under-counts. There is no server-side CAPI today (scenario 8542928 INACTIVE, `fb_capi_token` not configured on prizma, no graph.facebook.com calls in code). Match-quality is cookie-only (`_fbp`, `_fbc`); no `em` / `ph` advanced matching.
**Impact:** FB Ads attribution systematically under-counts and has weak match quality. Defending or growing ad spend on this data is unreliable.
**CLOSED:** ERP-side CAPI substrate shipped. `fb-capi-dispatch` EF dispatches `Lead` events server-side on every `crm_leads` INSERT via `crm_capi_dispatch_queue` + `fb_capi_dispatch_consumer` pg_cron job (every minute). Advanced matching: `em` + `ph` SHA-256 hashed server-side (no cookie dependency). Token: `storefront_config.analytics.fb_capi_token`. Demo runs `skipped_no_token` (no sandbox token). Make scenario 8542928 retired. Storefront handoff deferred to `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` (shared `event_id` UUID for dedup).

---

## Top 8+ Open Questions for Daniel (one-sentence-answerable)

1. **Q1 (Layer 2):** Should the `lead-intake` duplicate branch update `utm_*` when the body carries new values (last-touch model)? Or keep first-touch and add an `acquisition_source` column to `crm_event_attendees` for second-touch?

2. **Q2 (Layer 4):** The SPEC §4 mentions `crm_events.status` values `draft` and `live`. The live DB DISTINCT scan does not show them. Are those reserved future states, deprecated old states, or did I miss a column?

3. **Q3 (Layer 4):** The `register_lead_to_event` RPC was not read line-by-line in this SPEC. Do you want a follow-up SPEC that dumps the current RPC body and produces a state-transition diagram, or is the existing `STATUS_MODEL.md` (file at module root) sufficient?

4. **Q4 (Layer 5):** Should the BROADCAST_QUEUE_INTEGRATION fix be (a) add `broadcast_id` to `crm_message_queue` + propagate to `crm_message_log` + post-drain UPDATE on `crm_broadcasts`, or (b) leave `crm_broadcasts.status='queued'` as a known no-op and deprecate the counters? (Either is a one-SPEC fix.)

5. **Q5 (Layer 6):** Every active template on prizma has `required_variables: []`. Was the per-template required-vars system shipped but never populated, or was the empty array intentional after a refactor?

6. **Q6 (Layer 7):** Are `prizmaoptic.short.gy` external links still being sent in any template today, or was that retired in favor of `/r/<code>`? A grep for `short.gy` in templates would answer.

7. **Q7 (Layer 9):** Is the storefront-repo pixel firing on the `submit` DOM event in addition to the thank-you-page pattern match, or only on the page match? (Cannot answer from ERP repo.)

8. **Q8 (Layer 9):** Is enabling FB CAPI (server-side) a planned next-quarter task, or has it been intentionally deferred? The infrastructure (scenario 8542928 + `fb_capi_token` field) exists but is dormant.

9. **Q9 (Layer 10):** Should the 21 inactive legacy Make scenarios be deleted (cleanup) or kept as documentation of how the pre-v3 flow worked?

10. **Q10 (Layer 4):** The `event_invite_new` template fires from `lead-intake/dispatch.ts` directly, bypassing `crm_automation_rules`. Is that intentional (faster path, fewer round-trips) or a structural shortcut to undo when the automation-engine is mature?

---

## What this map does NOT cover (deferred, explicitly)

- The exact body of `register_lead_to_event` RPC. (Q3 — separate SPEC.)
- The browser-side broadcast wizard UI code (`crm-messaging-broadcast.js` full read). The send path was traced; the UI wizard state machine was not.
- The storefront-repo pixel firing code. Lives in `opticup-storefront`.
- Make scenario blueprints (only names + active/inactive status verified; per-module config not pulled).
- pg_cron job list and exact timing — only the names of two cron-triggered flips (`event_day_status_flip`, `event_2_3d_before_status_flip`) are referenced.

These are good candidates for a Layer 11+ SPEC after Daniel verifies what's here.

---

*End of KNOWLEDGE_MAP.md.*
