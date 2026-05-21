# KB — Module 4 (CRM) Mechanics + Shipped Improvements

> **Synthesized snapshot, 2026-05-21.** This is a curated reference, not a dump. Authority surface: `modules/Module 4 - CRM/docs/MODULE_SPEC.md` + per-SPEC FOREMAN_REVIEWs.
> **Read when:** task is in `CAMPAIGN_KB_MAP.md` row "Understand M4 mechanics" or "Analyze campaign performance."

---

## 1. M4 in one diagram

```
Storefront form / CRM UI / pg_cron
   │
   ▼
crm_leads  ◄────┐
   │            │ status_change DB trigger
   ▼            ▼
crm_status_change_events (SCE — append-only queue)
   │
   ▼ pg_cron every 15s
automation-engine EF (consumer)
   │  (filters rules by trigger_entity + trigger_event + trigger_condition)
   │  (Layer-3 self-loop guard via originated_by_rule_id)
   ▼
crm_message_queue  ─────► pg_cron every 15s ─► dispatch-queue EF (advisory-lock + retry)
                                                  │
                                                  ▼ per-row
                                              send-message EF (re-fetch template + substitute + Make webhook)
                                                  │
                                                  ▼
                                              crm_message_log (status='sent' / 'failed' / 'rejected')
                                                  │
                                                  └─► trg_promote_lead_on_message_sent (waiting → invited)

Parallel CAPI track:
crm_leads INSERT  ─►  crm_capi_dispatch_queue  ─► fb-capi-dispatch EF (every 60s)  ─► Meta Graph API
```

## 2. Core M4 tables (write-paths only)

| Table | Owner | Written by |
|---|---|---|
| `crm_leads` | M4 | lead-intake EF; CRM UI; sync RPCs; M3 storefront form |
| `crm_event_attendees` | M4 | `register_lead_to_event` RPC; CRM UI; `move_attendee_between_events` RPC |
| `crm_events` | M4 | CRM UI; pg_cron event_day status flip |
| `crm_message_templates` | M4 | Campaign Overseer (IR35 — config only); promote-config-to-prizma.mjs |
| `crm_automation_rules` | M4 | Campaign Overseer (IR35); rule editor UI |
| `crm_broadcasts` | M4 | CRM Broadcast Wizard (`crm-messaging-broadcast-queue.js`) |
| `crm_message_queue` | M4 | automation-engine EF; broadcast wizard; resend button (W1.1) — run_id=NULL on resend |
| `crm_message_log` | M4 | send-message EF |
| `crm_audit_log` | M4 | resend button (W1.1); ad-hoc audits |
| `crm_capi_dispatch_queue` | M4 | lead-intake EF; fb-capi-dispatch EF (status writes) |
| `crm_lead_touchpoints` | M4 | resolve-link EF; lead-intake EF; `_record_touchpoint` RPC |
| `crm_status_change_events` (SCE) | M4 | 3 trigger functions on leads/events/attendees |
| `m4_dispatch_lock` | M4 (system) | dispatch-queue EF advisory-lock (W2.1) |

Every public M4 table carries the canonical 2-policy RLS (`service_bypass` + `tenant_isolation` via JWT-claim). See `CLAUDE.md` Iron Rule 15 for the canonical pattern.

## 3. M4 Edge Functions (live versions)

| EF | Purpose | verify_jwt |
|---|---|---|
| `lead-intake` | accepts storefront/QR form POSTs; INSERTs `crm_leads` + `crm_capi_dispatch_queue`; records `lead_submit` touchpoint | false (anon) |
| `automation-engine` | rule consumer (mode=`consume_status_events`) + evaluator (mode=`dispatch`) + dispatch_preview | false (anon — service-key inside) |
| `dispatch-queue` | pg_cron-tick drain of `crm_message_queue`. Advisory lock + retry-with-backoff post W2.1 | false |
| `send-message` | per-row dispatch to Make webhook. Re-fetches template, substitutes, allow-lists phones, writes `crm_message_log` | false |
| `fb-capi-dispatch` | every 60s; sends CAPI Lead/CompleteRegistration/EventAttended/Purchase to Meta Graph | false |
| `pixel-fired` | storefront thank-you POSTs `{event_id, tenant_id}`; UPDATEs `crm_leads.fb_pixel_fired_at` | false |
| `resolve-link` | `/r/{code}` short-link resolver; records `short_link_click` + `crm_lead_touchpoints` | false (anon) |
| `unsubscribe` | `/unsubscribe/` form POST; sets `crm_leads.unsubscribed_at` | false |
| `register_lead_to_event` (RPC) | atomic lead↔event link; capacity-aware; returns `registered`/`waiting_list`/`event_closed` | service-role only via PostgREST |
| `event-register` / `quick-register` | thin wrappers calling `register_lead_to_event` | false (anon) |
| `retry-failed` | per-run retry of failed messages (older path; W1.1 supersedes for log/queue surfaces) | false |

## 4. Shipped improvements (2026-05 cohort) — the team should know all of these

| Date | SPEC | What it shipped |
|---|---|---|
| 2026-05-12 | `STATUS_CHANGE_TRIGGERS_FRAMEWORK` (EV-001) | SCE queue + trigger registry + 3 DB triggers + automation-engine consumer; multi-channel parallel dispatch (~38ms vs ~1000ms — 26× speedup) |
| 2026-05-13 | `BROADCAST_EVENT_LINK_SUPPORT` | Broadcast Wizard now collects `event_id` → flows through `crm_message_queue.event_id` → unblocks `%registration_url%` substitution |
| 2026-05-14 | `M3_UTM_TRIPLE_LAYER_PERSISTENCE` (P1.1) | `crm_lead_touchpoints` table + `_record_touchpoint` RPC + `v_crm_lead_first_touch` view (security_invoker) |
| 2026-05-14 | `M4_BROADCAST_ID_PROPAGATION` (P1.2) | broadcast_id flows queue → log → short_links → clicks → touchpoints; pg_cron `crm_broadcast_total_sent_refresh` |
| 2026-05-14 | `M3_SHORTGY_TO_INTERNAL_REDIRECT` (P1.3) | all `prizmaoptic.short.gy` → internal `/r/{code}`; every click attributable; MVP Short-Links Stats tab |
| 2026-05-14 | `M4_TEMPLATE_VALIDATION_UNIFIED` (P2.3) | template-output validation moved SEND-time → PRE-ENQUEUE time; failed items become `rejected` log rows; `crm_automation_rules.last_error` populated |
| 2026-05-15 | `M4_FB_CAPI_HYBRID_DEDUPLICATION` (P2.1) | hybrid Pixel+CAPI: storefront UUID `fb_event_id` → ERP-side hashing → Meta dedupes via `event_id`; `storefront_config.analytics.fb_capi_token` storage |
| 2026-05-15 | `M4_FAILED_MESSAGE_BADGE_CLEANUP` | `acknowledge_failed_messages` RPC + per-lead × badge + bulk modal; 758 historical Prizma `unsubstituted_placeholder` rows acked |
| 2026-05-16 | `M3_FUNNEL_PIXEL_BACKWIRE` | `pixel-fired` EF stamps `crm_leads.fb_pixel_fired_at` — closes the measurement loop (CAPI dispatched vs Pixel actually fired) |
| 2026-05-19 | `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` | post-action chaining + Layer-3 self-loop guard (`originated_by_rule_id`); `update_lead_status_with_origin` RPC; `docs/CRM_RULE_CHAINING.md` canonical reference |
| 2026-05-19 | `M4_AUTO_PROMOTE_GOVERNANCE_2026_05_19` | explicit `auto_promote_lead_status` opt-in on rules; `skip_auto_promote` legacy still honored |
| 2026-05-19 | `M4_MODAL_DESELECTION_RESTORE_2026_05_19` | `update_event_status_with_overrides` RPC carries operator deselections via SCE payload (`exclude_lead_ids` + `recipient_subset`) |
| 2026-05-19 | `M4_CAPI_PURCHASE_EVENTS_2026_05_19` | `Purchase` CAPI event added (in addition to Lead + CompleteRegistration + EventAttended) |
| 2026-05-19 | `M4_FUNNEL_HEALTH_DASHBOARD` | `mv_funnel_health_dashboard` materialized view + pg_cron `refresh_funnel_health_dashboard` every 5 min |
| 2026-05-19 | `M4_WEEKLY_OPTIMIZATION_BRIEF` | `funnel_weekly_briefs` + Sunday 03:00 cron job → weekly auto-generated brief |
| 2026-05-19 | `M4_SHORT_LINKS_DASHBOARD_REDESIGN` | 4-component Short-Links Stats dashboard; real-vs-raw metrics rule codified; bot-decontamination via `crm_leads.unsubscribed_at` |
| 2026-05-20 (P0) | `M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20` | dispatch-queue `batchSize: 60 → 15` band-aid; 1,179/1,179 Prizma SMS recovered |
| 2026-05-20 (overnight) | `M4_NIGHT_RUN_2026_05_20` W1.1 | Resend Failed Messages button (log + queue surfaces); failure-class gating (resendable / template_error / recipient_blocked / unknown); run_id=NULL requeue (F-M04-1); `crm_audit_log` entry; index `idx_crm_message_log_tenant_status_created` |
| 2026-05-20 (overnight) | `M4_NIGHT_RUN_2026_05_20` W2.1 | dispatch-queue advisory lock (`m4_dispatch_lock` table — single-row, 90s hold, auto-reclaim on stale) + retry-with-backoff (1m/2m/4m/8m/16m → permanent at MAX_RETRIES=5) + catch-block retries++ fix |
| 2026-05-20 (overnight) | `M4_NIGHT_RUN_2026_05_20` W2.2 | 3 stale Prizma 'queued' broadcasts → 'cancelled' (snapshot saved) |
| 2026-05-20 (overnight) | `M4_NIGHT_RUN_2026_05_20` W2.3 | pg_cron `crm_message_queue_cleanup` daily 04:00 UTC — DELETE sent rows > 90 days |

## 5. Key invariants the team must respect

- **Iron Rule 14:** every M4 table has `tenant_id UUID NOT NULL` (except infrastructure rows like `m4_dispatch_lock` with platform-table exception via nullable `owner_tenant_id`).
- **Iron Rule 15:** canonical 2-policy RLS (`service_bypass` + JWT-claim `tenant_isolation`). NEVER `auth.uid()` — PIN-based auth puts tenant_id in JWT claims.
- **Iron Rule 22:** every `.insert()` / `.update()` chains `.eq('tenant_id', getTenantId())`. Belt + suspenders alongside RLS.
- **Iron Rule 33:** all M4 config changes (templates/rules/statuses/field-visibility/tags) flow demo-first via `scripts/promote-config-to-prizma.mjs`.
- **Iron Rule 35:** config = Campaign Overseer; infrastructure = Architect SPEC. See [`KB_MESSAGING`](KB_MESSAGING.md) §"IR35 boundary" for the exact split.

## 6. pg_cron jobs (active)

| Job | Schedule | What it does |
|---|---|---|
| `daily-alert-generation` | 05:00 daily | per-tenant `generate_daily_alerts` |
| `event_day_status_flip` | 05:30 daily | flip events with `event_date=today` → status='event_day' + fire automation |
| `event_2_3d_before_status_flip` | 05:30 daily | flip events with `event_date=today+3d` → status='2_3d_before' |
| `crm_broadcast_total_sent_refresh` | every minute | aggregate `crm_message_log` per `broadcast_id` → update `crm_broadcasts.total_sent/total_failed/status` |
| `fb_capi_dispatch_consumer` | every minute | drain `crm_capi_dispatch_queue` (up to 20 rows; status='queued' or retries<3) |
| `dispatch_queue` | every 15s | invoke `dispatch-queue` EF — advisory-lock guarantees at most one tick active |
| `consume_status_change_events` | every 15s | per-tenant call to `automation-engine` mode=`consume_status_events` |
| `refresh_funnel_health_dashboard` | every 5 min | `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_health_dashboard` |
| `weekly_funnel_brief_generation` | 03:00 Sundays | invoke `weekly-funnel-brief` EF |
| `crm_message_queue_cleanup` | 04:00 daily | DELETE sent queue rows > 90 days (W2.3) |

## 7. Where to look next

| Question | Authoritative file |
|---|---|
| "What does template X do exactly?" | DB: `crm_message_templates.body` for slug X — re-fetched at send time |
| "Which rule fires when status X → Y?" | DB: `crm_automation_rules` filtered by `trigger_entity + trigger_event + trigger_condition` |
| "What's the post-action chain mechanism?" | `docs/CRM_RULE_CHAINING.md` |
| "What is the CAPI dedupe contract?" | `docs/FB_CAPI.md` |
| "What's the SPEC for X feature?" | `modules/Module 4 - CRM/docs/specs/<SPEC_SLUG>/SPEC.md` |
| "What's the current M4 module status?" | `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` |

---

*KB_MODULE_4 v1, 2026-05-21. Refresh trigger: every M4 SPEC close (Integration Ceremony per `CLAUDE.md` §10).*
