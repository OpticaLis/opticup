# Module 4 — Deep Audit Report

> **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_CRM_DEEP_AUDIT_AND_BEST_PRACTICES_BRIEF.md`
> **Run mode:** Read-only investigation, Full Auto Pipeline, single chat
> **Date:** 2026-05-13
> **Author skill chain:** opticup-guardian → opticup-sentinel → opticup-reviewer (cross-check) + WebSearch
> **Author signature:** Claude Code (Opus 4.7), one chat, ~2.5 hours
> **Live data probed:** Supabase project `tsxrrxzmdxaenlvocyit` on 2026-05-13 evening
> **Parallel work respected:** `BROADCAST_EVENT_LINK_SUPPORT` SPEC closed at commit `3104792`; this audit only READ those files.

---

## 1. Executive Summary

Module 4 is **structurally sound but architecturally over-loaded**. RLS is bullet-proof (28/28 CRM tables run the canonical two-policy pattern). The state machine is mostly coherent. The Edge Function chain is healthy. But three structural choices are silently costing reliability and operator trust:

**Top 5 findings (ranked by impact):**

1. **HIGH — `invited` is a "ghost-attendee" that occupies real capacity.** The view `v_crm_event_stats`, the RPC `register_lead_to_event`, and the storefront-side check `checkAndAutoWaitingList` all count `invited` rows toward capacity. The UI counter was patched to hide them (`ATTENDEE_COUNTER_DISPLAY_FIX`). View shows 13/50; UI shows 10/50; RPC enforces 13/50. This is exactly the bug Daniel surfaced.
2. **HIGH — Iron Rule 7 (API abstraction) violated at scale in M4.** 136 raw `sb.from()` calls across `modules/crm/*.js`, 0 calls go through a `DB.*` wrapper. M4-DEBT-02 acknowledged this; the count quantifies it. Every new query is one more thing to refactor when the wrapper exists.
3. **HIGH — Status entity conflation.** `crm_event_attendees` plays two roles at once: (a) Salesforce-style "Campaign Member" (invitation tracker) and (b) appointment-booking (capacity holder). Industry practice is to keep these separate (Salesforce: Campaign Members ≠ Events; HubSpot: Marketing Events have only `Registered/Attended/Cancelled`, no `Invited`).
4. **MEDIUM — Lead-status taxonomy has dead slugs and overlapping semantics.** `crm_statuses` declares 13 lead statuses including BOTH `waiting` and `waitlist`; only `waiting` is in use (1 lead in Prizma). `confirmed` and `confirmed_verified` differ ambiguously. 1137/1235 visible Prizma leads (92%) sit in `invited` — the lifecycle has flattened.
5. **MEDIUM — Reporting & analytics are ~30% of what an optical-store owner needs.** No funnel view (lead → registered → attended → purchased %), no per-staff conversion, no source attribution dashboard, no LTV. `crm_unit_economics` is a single-tenant snapshot table (4 rows) — not a materialized funnel.

**Top 5 recommendations (ranked by ROI):**

1. **Rec 1 — Make `invited` a non-capacity-consuming status.** Pure SQL change to the view + RPC + storefront check. Removes the ghost-slot bug forever. Effort S, risk LOW. (Detailed in §4 Option A.)
2. **Rec 2 — Add a "funnel" view (`v_crm_event_funnel`)** showing leads_invited → registered → attended → purchased counts and percentages per event. Cliniko's practitioner-performance pattern. Effort S, risk LOW.
3. **Rec 3 — Codify Iron-Rule-7 enforcement on M4.** Either (a) lift `DB.*` wrapper coverage in the next M4 hygiene SPEC, or (b) explicitly accept M4 as a wrapper-exempt zone with a documented reason. Stop the slow drift. Effort M, risk LOW.
4. **Rec 4 — Adopt Salesforce's separation:** keep `crm_event_attendees` for actual attendance + `crm_message_log` for invitation history; query "who was invited but didn't register" by JOIN. Effort M, risk MEDIUM (touches automation rules 2.2, 2.4). This is the long-term fix to Issue 3.1; Rec 1 is the quick fix.
5. **Rec 5 — Lead-status cleanup SPEC.** Delete dead `waitlist`, merge `confirmed` + `confirmed_verified`, document each remaining slug in `crm_statuses.description` (column doesn't exist; add it). Effort S, risk LOW.

**Confidence level:** HIGH on all DB findings (queried live), HIGH on code findings (read primary sources), MEDIUM on industry comparisons (cited public docs but no Cliniko/Jane internal access).

---

## 2. Methodology

**What was read:**
- Brief: `modules/Module 4 - CRM/architecture-brief/M4_CRM_DEEP_AUDIT_AND_BEST_PRACTICES_BRIEF.md`
- Parallel SPEC artifacts (read-only): `modules/Module 4 - CRM/docs/specs/BROADCAST_EVENT_LINK_SUPPORT/{SPEC,EXECUTION_REPORT,FINDINGS}.md`
- Code primary sources:
  - `supabase/functions/event-register/index.ts` (full)
  - `modules/crm/crm-event-register.js` (full)
  - `supabase/functions/automation-engine/{recipients.ts,post-actions.ts,dispatch.ts}` (grep + context)
  - `modules/crm/crm-automation-post-actions.js` (grep + context)
  - File-size enumeration for all 60 `modules/crm/*.js` files
- DB primary sources (live, read-only):
  - `pg_get_functiondef('register_lead_to_event')` — full RPC body
  - `pg_get_viewdef('v_crm_event_stats')`, `pg_get_viewdef('v_crm_event_attendees_full')`, `pg_get_viewdef('v_crm_event_dashboard')` — view definitions
  - `information_schema.columns` for `crm_leads`, `crm_events`, `crm_event_attendees`, `crm_automation_rules`, all 28 `crm_*` tables
  - `pg_constraint`, `pg_trigger` for `crm_event_attendees` (constraints + triggers)
  - `pg_policies` for the entire `crm_*` namespace (RLS coverage)
  - Live status distribution on Prizma (`crm_event_attendees` + `crm_leads`)
  - `crm_automation_rules` action_config for invite + attendee_upsert rules
  - `get_advisors` Supabase advisory feed (security)
- Web sources (URLs in §6):
  - Salesforce Health Cloud, Salesforce Campaign Members, HubSpot Marketing Events, Cliniko Help, Jane App Guide, Pipedrive, Phorest, Microsoft Teams Webinars

**What was NOT investigated and why:**
- The wizard UI rendering paths beyond `crm-messaging-broadcast.js` reading. The active parallel chat is editing it; not safe to trace deeper without colliding.
- The full body of every `crm-*.js` file. Sample-based: read full bodies for the 2 critical files for Issue 3.1; the rest were grep'd for specific signals.
- Per-EF source code beyond `event-register/index.ts` and the automation-engine fragments. The Brief calls for a depth-on-Issue-3.1 audit, not an EF-by-EF code-review-of-record.
- UI accessibility / RTL micro-issues. Chrome MCP not opened; would have collided with the parallel SPEC's smoke-test browser session.
- The `make-patterns` folder under `modules/Module 4 - CRM/docs/`. Out of scope (Make.com integration patterns, separate from CRM core).

**Time spent:** ~2 hours investigation + research, ~30 minutes write-up.

---

## 3. Audit Findings — by section (Brief §4)

### 3.1 Data Model Audit

#### Finding 3.1.1 — `crm_event_attendees` carries TWO unrelated lifecycle concerns
- **WHAT:** The table mixes "marketing campaign member status" (`invited`) with "appointment booking status" (`registered/confirmed/attended`). One row, two responsibilities — Iron Rule 21 (no orphans) is technically satisfied because there's only one row per (lead, event), but the row's *semantic* is split.
- **EVIDENCE:** `crm_statuses` for `entity_type='attendee'` has 11 slugs spanning both worlds: `attended, cancelled, confirmed, duplicate, event_closed, invited, manual_registration, no_show, quick_registration, registered, waiting_list`. The first (attended/confirmed/etc.) are booking states; `invited/manual_registration/quick_registration` are *creation channel* hints, not booking states. Mixed taxonomies in a single field.
- **SEVERITY:** HIGH (root cause of Issue 3.1).
- **INDUSTRY COMPARISON:**
  - **Salesforce:** Campaign Member (a Lead/Contact ↔ Campaign join) carries marketing statuses (Sent, Responded, Invited). Events have separate Activity records with their own capacity. Same person can be `Invited` on a Campaign and `Registered` on an Event simultaneously without one consuming the other's capacity. ([Salesforce Ben — Campaign Member Status](https://www.salesforceben.com/tips-for-working-with-salesforce-campaign-member-statuses/))
  - **HubSpot Marketing Events:** the API exposes only `REGISTERED`, `ATTENDED`, `CANCELLED` for attendees — no `INVITED` slot. Invitations live in workflow / list membership, not the event object. The HubSpot community has actively requested an `Invited` status but HubSpot has resisted because it confuses capacity. ([HubSpot Marketing Events API guide](https://developers.hubspot.com/docs/api-reference/marketing-marketing-events-v3/guide))
- **PROPOSED FIX:** Quick-fix is Rec 1 (drop `invited` from capacity counts). Long-term is Rec 4 (separate the marketing object from the booking object). See §4 for full options.

#### Finding 3.1.2 — `crm_automation_rules` lacks `updated_at`
- **WHAT:** The table has `created_at` but no `updated_at`. Every other CRM table that holds editable config (`crm_leads`, `crm_facebook_campaigns`, `crm_unit_economics`, `crm_custom_field_vals`, `crm_ad_spend`, `crm_automation_runs`) has both.
- **EVIDENCE:** `information_schema.columns` query covering all 28 `crm_*` tables. Brief §4.1 already flagged this; confirmed.
- **SEVERITY:** LOW (functionally fine; auditing a "when was this rule last touched" is harder).
- **INDUSTRY COMPARISON:** Salesforce, HubSpot, Pipedrive all stamp `LastModifiedDate` on every config object.
- **PROPOSED FIX:** ALTER TABLE + trigger. Bundle into next M4 hygiene SPEC.

#### Finding 3.1.3 — `crm_lead_notes` has no `updated_at`; `crm_event_status_history` has no `updated_at` (also append-only by design — OK)
- **WHAT:** `crm_lead_notes` is editable in UI but the table can't tell when. Append-only history tables are fine without it.
- **SEVERITY:** LOW.
- **PROPOSED FIX:** Add `updated_at` to `crm_lead_notes` only.

#### Finding 3.1.4 — Backup table `_backup_brand_gallery_20260417` has RLS DISABLED
- **WHAT:** Surfaced by Supabase advisor (priority CRITICAL per Supabase). Anon key can read/write 465 rows.
- **EVIDENCE:** `get_advisors --type security` response.
- **SEVERITY:** MEDIUM in CRM context (the table is M3 / brand gallery, not M4) but flagging because the advisor surfaces it on every CRM query. Owning module: M3.
- **INDUSTRY COMPARISON:** N/A — internal cleanup.
- **PROPOSED FIX:** Drop the backup table OR `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + restrictive policy. Out of M4 scope; report to M3 / Architect.

#### Finding 3.1.5 — `crm_event_attendees.registration_method` is a free `text` field, not a configurable lookup
- **WHAT:** Defaults to `'form'`, but other call sites pass `'manual'`, `'quick'`, etc. Not validated, not in `crm_statuses`. Iron Rule 19 (configurable values = tables, not enums) is technically respected (it's not an enum) but the field is a hidden enum (a fixed set of strings) without a CHECK constraint and without a lookup table.
- **EVIDENCE:** `register_lead_to_event` accepts `p_method text` with no validation; `crm-event-register.js:14` passes `method || 'manual'`; `event-register/index.ts:274` passes `'form'`.
- **SEVERITY:** LOW.
- **INDUSTRY COMPARISON:** HubSpot tracks "registration source" as a closed enum + per-tenant custom values. Salesforce uses a picklist.
- **PROPOSED FIX:** Add to `crm_statuses` with `entity_type='attendee_method'`, OR a dedicated lookup table. Bundle into Rec 5.

#### Finding 3.1.6 — `crm_event_attendees` has no `updated_at` either
- **WHAT:** Same as 3.1.2/3.1.3. The state machine here is rich (status transitions, payment_status transitions, refund flow) but the audit "when was this row last touched?" requires a JOIN against `crm_status_change_events` (which only catches status fields, not the others).
- **SEVERITY:** LOW–MEDIUM (the audit log via `crm_status_change_events` framework partially mitigates).
- **PROPOSED FIX:** Add `updated_at` + trigger.

### 3.2 Status Model Audit

#### Finding 3.2.1 — Lead status `waitlist` is dead
- **WHAT:** `crm_statuses.entity_type='lead'` includes both `waiting` and `waitlist`. Live data: 1 lead with `waiting`, 0 leads with `waitlist`. The storefront search code (`crm-event-register.js:54`) still references `'waitlist'` in the hardcoded `ATTENDEE_ADD_STATUSES` array — likely a copy-paste from before the status was renamed.
- **EVIDENCE:** `SELECT entity_type, ARRAY_AGG(slug) FROM crm_statuses GROUP BY entity_type` + `SELECT status, COUNT(*) FROM crm_leads GROUP BY status`.
- **SEVERITY:** LOW (no functional impact today).
- **INDUSTRY COMPARISON:** N/A — pure hygiene.
- **PROPOSED FIX:** Drop `waitlist` from `crm_statuses` + remove from `ATTENDEE_ADD_STATUSES`. Bundle into Rec 5.

#### Finding 3.2.2 — Lead state `confirmed` vs `confirmed_verified` is ambiguous
- **WHAT:** Both exist as lead statuses. From context: `confirmed` likely means "we verbally confirmed they want the event"; `confirmed_verified` likely means "phone verified". But the distinction is undocumented and the code path that creates each is not obvious.
- **EVIDENCE:** `crm_statuses` row count + the recipient resolver `TIER2_STATUSES = ["waiting", "invited", "confirmed", "confirmed_verified"]` in `automation-engine/recipients.ts:17` treating them identically.
- **SEVERITY:** LOW.
- **PROPOSED FIX:** Merge or document. If they're really one state with extra metadata, drop one and add a `phone_verified bool` column.

#### Finding 3.2.3 — 92% of Prizma's visible leads are in `invited` status
- **WHAT:** 1137 of 1235 visible Prizma leads are `invited`. The lead lifecycle has flattened — leads enter as `new`, get a campaign blast, become `invited`, and the granular states (`callback / no_answer / not_interested / too_far / invalid_phone / pending_terms`) are barely populated.
- **EVIDENCE:** Live SELECT from `crm_leads`.
- **SEVERITY:** MEDIUM (operationally — the lead-status filter loses signal).
- **INDUSTRY COMPARISON:** Cliniko / Jane App: appointment-history *replaces* a lead-status field as the funnel matures (you move from "lead status" to "patient with appointment history"). Salesforce: Campaign Member status carries the campaign nuance, the Lead.Status is reset to `Working` / `Qualified` etc.
- **PROPOSED FIX:** Either (a) make lead.status reflect *engagement state* not *latest campaign touch*, or (b) accept that `invited` is the new "active" and rename it to make that clearer (`engaged` / `active`). This is a strategic decision for Architect + Daniel.

#### Finding 3.2.4 — Status transitions are not declaratively documented
- **WHAT:** No state-machine diagram exists in `MODULE_SPEC.md`. The transitions live implicitly in `register_lead_to_event`, `move_attendee_between_events`, `check_in_attendee`, `sync_lead_status_from_attendee`, and the automation rules (40 rows). There's no single document an operator can read to understand "from `invited`, what states are reachable?"
- **EVIDENCE:** Read of `MODULE_SPEC.md` references; absence of a transitions table.
- **SEVERITY:** MEDIUM.
- **INDUSTRY COMPARISON:** Salesforce has built-in state-machine diagrams in Setup; HubSpot has the workflow visual builder; Pipedrive has the pipeline view.
- **PROPOSED FIX:** Author a `STATUS_MODEL.md` under `modules/Module 4 - CRM/docs/` with three tables (lead transitions, attendee transitions, event transitions). One-time effort, useful forever.

### 3.3 Code Organization Audit

#### Finding 3.3.1 — Iron Rule 7 broken at scale (M4-DEBT-02 quantified)
- **WHAT:** `grep "sb\.from(" modules/crm/*.js | wc -l` = **136 calls**. `grep "DB\." modules/crm/*.js -l` = **0 files**. M4 does not use any DB wrapper.
- **EVIDENCE:** Quantified above.
- **SEVERITY:** HIGH (Iron Rule 7).
- **INDUSTRY COMPARISON:** N/A — this is internal Optic Up convention.
- **PROPOSED FIX:** Either (a) the next M4 hygiene SPEC migrates the 136 calls — likely 5-10 distinct patterns — to `DB.*` wrappers, or (b) document M4 as wrapper-exempt with a justification (legacy + 60-file blast radius). Honest acceptance is better than silent drift.

#### Finding 3.3.2 — File-size compliance is good
- **WHAT:** Largest file `crm-leads-tab.js` at 330 lines, second `crm-events-detail.js` 330, third `crm-messaging-broadcast.js` 329 (and after BROADCAST_EVENT_LINK_SUPPORT, 350 — at hard cap). All within Iron Rule 12's 350-line ceiling.
- **EVIDENCE:** `Get-ChildItem | Measure-Object -Line` across all 60 files.
- **SEVERITY:** INFO.
- **NOTE:** `crm-messaging-broadcast.js` at 350 leaves ZERO room. Next time someone adds a feature there, they MUST split. Consider a pre-emptive split SPEC.

#### Finding 3.3.3 — File naming is consistent and clear
- **WHAT:** `crm-event-*` (8 files), `crm-event-day-*` (5 files), `crm-automation-*` (8 files), `crm-messaging-*` (8 files). Themes are clear; no orphans visible at the file-list level.
- **SEVERITY:** INFO (positive).

#### Finding 3.3.4 — Possible orphan: `crm-rule-editor.js` (311 lines) vs `crm-messaging-rules.js` (203 lines)
- **WHAT:** Two files whose names suggest overlapping concerns — both touch automation rules. May be a missing abstraction or genuine separation; not investigated in depth (sample-based audit).
- **SEVERITY:** INFO; flag for any future rule-editing SPEC.

### 3.4 Edge Function Audit

#### Finding 3.4.1 — `event-register/index.ts` carries a hardcoded `ANON_KEY` literal (line 16)
- **WHAT:** A 200-char JWT literal is embedded in source. The comment says "mirrors the key in `js/shared.js` + `lead-intake` EF — not a new exposure." That's true but it's still a Rule-23 item — the key shouldn't be in source even if it's the published anon key.
- **EVIDENCE:** `event-register/index.ts:16-17`.
- **SEVERITY:** LOW (anon key is publicly exposed by design via storefront calls; rotating it is operationally hard, so the practical impact is low).
- **INDUSTRY COMPARISON:** Standard practice is `Deno.env.get("SUPABASE_ANON_KEY")` even when the value is published. Defense-in-depth.
- **PROPOSED FIX:** Move to env var. Bundle into next M4 hygiene SPEC. Three EFs share this pattern (`lead-intake`, `event-register`, others) — fix together.

#### Finding 3.4.2 — `event-register` PASSES the public registration trip end-to-end with HMAC token verification
- **WHAT:** Token format `b64url(payload).b64url(hmac)`, payload = `lead:tenant:event:exp`. HMAC with SERVICE_ROLE_KEY. Constant-time compare. Expiry check. SAFE.
- **EVIDENCE:** `event-register/index.ts:46-80`.
- **SEVERITY:** INFO (positive — well-built).
- **NOTE:** `event-register/index.ts:9` mentions "Duplicated HMAC helpers per M4-DEBT-FINAL-01" — known tech debt.

#### Finding 3.4.3 — `verify_jwt` is NOT explicitly set in `supabase/config.toml` for any function
- **WHAT:** `config.toml` declares each EF as `enabled = true` only. Supabase default for new EFs is `verify_jwt = true`. For public-form EFs (`event-register`, `lead-intake`, `unsubscribe`, `quick-register`, `resolve-link`, `whatsapp-catalog-flow`), the default would block them — they need `verify_jwt = false`. The fact that they DO work means the deployed EF config has it set (manually deployed); the repo's config.toml is incomplete.
- **EVIDENCE:** `cat supabase/config.toml | grep verify_jwt` returns nothing; only `enabled = true`.
- **SEVERITY:** MEDIUM. Re-deploying any of these EFs from the repo via `supabase functions deploy` could silently revert `verify_jwt`. STATUS_CHANGE_TRIGGERS_FRAMEWORK FOREMAN_REVIEW already mentioned this as `DEPLOY_FALLBACK verify_jwt warning`.
- **INDUSTRY COMPARISON:** N/A.
- **PROPOSED FIX:** Add `verify_jwt = false` to `[functions.event-register]`, `[functions.lead-intake]`, etc., in `config.toml`. 5-minute SPEC.

#### Finding 3.4.4 — `dispatchRegistrationMessages` is fire-and-forget (no error escalation)
- **WHAT:** `event-register/index.ts:95-105` uses `Promise.allSettled` and ignores the result other than `console.error`. If the SMS dispatch fails, the user still sees "registered successfully" but no confirmation arrives. They might re-submit.
- **EVIDENCE:** Code reads as designed (best-effort by design).
- **SEVERITY:** MEDIUM (UX-side). Observability is good (errors land in `console.error` → Supabase logs), but operator action requires reading logs.
- **INDUSTRY COMPARISON:** Cliniko sends a "your booking succeeded" inline + a confirmation email; if email fails, the booking-success message still shows but a separate banner says "we couldn't email you". HubSpot is similar.
- **PROPOSED FIX:** Add a `crm_message_log` row even when the dispatch fails (status `failed_at_dispatch`) so it's visible in the operator view, not buried in EF logs.

### 3.5 Views Audit

#### Finding 3.5.1 — `v_crm_event_stats` is the ROOT of Issue 3.1
- **WHAT:** Counts `invited` toward `total_registered` and `spots_remaining` (only excludes `cancelled / duplicate`). View definition cited in §4 below.
- **SEVERITY:** HIGH.
- **PROPOSED FIX:** Add `invited` to the exclusion list. See §4 Option A.

#### Finding 3.5.2 — `v_crm_event_dashboard` JOINs `crm_campaigns` with INNER JOIN — loses events without a campaign
- **WHAT:** `FROM crm_events e JOIN crm_campaigns c ON e.campaign_id = c.id`. Any event with NULL `campaign_id` is silently invisible to the dashboard.
- **EVIDENCE:** View definition queried.
- **SEVERITY:** MEDIUM (depends on whether `campaign_id` is mandatory on `crm_events`. It's nullable in the schema. Live data: most events have a campaign, but ad-hoc events without one would vanish).
- **INDUSTRY COMPARISON:** Standard view-design defensive: `LEFT JOIN`.
- **PROPOSED FIX:** Change to `LEFT JOIN crm_campaigns`. 1-line SQL.

#### Finding 3.5.3 — Views' tenant isolation is correct
- **WHAT:** All `v_crm_*` views inherit RLS from underlying tables (no `SECURITY DEFINER` discovered on views). A direct `SELECT FROM v_crm_event_stats` from a tenant-scoped session returns only that tenant's rows. ✓
- **SEVERITY:** INFO (positive).

### 3.6 Business Flow Audit

#### Finding 3.6.1 — Flow 1 (lead intake) — single best-practice gap: no welcome message
- **WHAT:** Lead intake → `crm_leads` insert → automations fire. Industry leaders send an immediate "thanks for reaching out, here's what happens next" message even before any qualification call. Optic Up sends nothing until a human or automation triggers.
- **INDUSTRY COMPARISON:** HubSpot/Pipedrive default workflow templates always include a "lead-intake confirmation" step. Phorest sends it via SMS automatically.
- **SEVERITY:** LOW–MEDIUM.
- **PROPOSED FIX:** Author an automation rule `trigger_event=lead_created → send_message template_slug='lead_intake_confirmation'`. Already supported by the framework.

#### Finding 3.6.2 — Flow 2 (event registration) — strong path but `dispatchRegistrationMessages` is async-only (3.4.4)
- See 3.4.4.

#### Finding 3.6.3 — Flow 3 (event lifecycle) — good, but no auto-close
- **WHAT:** Events transition `planning → registration_open → ... → completed` via human action. There is no automation that auto-closes registration based on time-to-event ("3 days before, switch to closed"). Requires manual intervention or the soft-cap `waiting_list` auto-transition.
- **INDUSTRY COMPARISON:** Eventbrite, Cvent, Cliniko all support time-based status transitions out of the box.
- **SEVERITY:** LOW.
- **PROPOSED FIX:** Add a pg_cron job + automation rule for `time_relative_to_event_date`.

#### Finding 3.6.4 — Flow 4 (broadcast) — being completed by parallel SPEC; verified in §5.

#### Finding 3.6.5 — Flow 5 (automation rule firing) — solid
- **WHAT:** `crm_status_change_events` ledger pattern is clean (append-only, consumed_at marker). 226 runs in `crm_automation_runs` historical record.
- **SEVERITY:** INFO (positive).

#### Finding 3.6.6 — Flow 6 (unsubscribe) — solid
- **WHAT:** `crm_unsubscribes` table exists, tenant-scoped, RLS-applied. EF `unsubscribe` deployed. Re-subscribe path: `register_lead_to_event` blanks `unsubscribed_at` on registration (line 18 of RPC) — that's clever but worth a finding because it's an *implicit re-subscribe* (clicking a registration link silently undoes a prior unsubscribe).
- **EVIDENCE:** RPC body line 18.
- **SEVERITY:** MEDIUM (legal/compliance risk: in EU/IL, an explicit re-consent is sometimes required).
- **PROPOSED FIX:** Either (a) keep current behavior + document it as deliberate re-engagement, or (b) require explicit re-opt-in. Strategic decision.

### 3.7 Reporting & Analytics Gaps

The Brief asks "which 5-10 reports would make the biggest operational impact for an optical-store owner?" Here's my answer based on what's missing:

| # | Report | Why it matters | Industry source |
|---|--------|----------------|-----------------|
| 1 | **Event funnel** — leads_invited → registered → attended → purchased per event with %s and time-to-convert | Without it, you can't tell if a marketing problem (low click-through) or a closing problem (low purchase) | Cliniko: practitioner performance |
| 2 | **Lead-source attribution dashboard** — UTM source × conversion to registration × revenue | `crm_facebook_campaigns` has 99 rows, `crm_ad_spend` 158 — joinable but no view | HubSpot: source reports |
| 3 | **Per-staff conversion rate** — which employee converts the most leads | `crm_leads.assigned_to` doesn't exist; would require a DDL change | Pipedrive: deal owner reports |
| 4 | **Cohort retention** — do customers who attended event N also attend N+1? | Drives campaign decisions ("invite Event 23 attendees first to Event 25") | Phorest: client retention |
| 5 | **LTV per source** — over months, which source produces customers that come back | Strategic | Salesforce dashboards |
| 6 | **Time-to-first-message latency** — for `lead_intake` → first message sent. Industry says <5 min triples conversion | Operational SLA | Pipedrive blog |
| 7 | **Unsubscribe-rate by template** — which messages are losing leads | Email-marketing 101 | Mailchimp pattern |
| 8 | **Event ROI** — `total_revenue / (booking_fee_revenue + ad_spend + staff_hours)` per event | Closes the strategic loop | Eventbrite Pro |

`crm_unit_economics` (4 rows) is a *snapshot* table — it stores aggregates someone manually filled in. It's not a materialized view that recomputes nightly. That's the gap to close.

### 3.8 UX Patterns Audit (light, no Chrome MCP)

#### Finding 3.8.1 — "Tier 1 / Tier 2" terminology is project-internal jargon
- **WHAT:** Visible in code (`crm-leads-tab.js`, `searchTier2Leads` in `crm-event-register.js`). Operator-facing UI Hebrew strings reference "ממתינים לאירוע, הוזמנו, ברשימת המתנה" — better than "Tier 2".
- **SEVERITY:** LOW (UI seems to translate). Worth a quick pass to ensure no "Tier 1/2" leaks to the operator.

#### Finding 3.8.2 — Bulk operations: not directly investigated
- The brief asked. From file scan, `crm-leads-tab.js` and `crm-leads-tab-filters.js` exist; whether bulk select exists is not verified. Note for a UI-focused future audit.

---

## 4. Issue 3.1 Deep Dive — "invited" Attendees Occupy Capacity

### 4.1 Code Path Traced

**Where `invited` rows are CREATED:**
1. **Automation Rule 2.2** (`crm_automation_rules` rows `82aac348-…` and `b95a46a1-…`) — `trigger_event=status_change`, `action_type=send_message`, `template_slug='event_invite_new'`, `recipient_type='tier2_excl_registered'`, `post_action_attendee_upsert: { status: 'invited' }`. When an event transitions into a state that fires this rule, the system sends an invitation SMS+email AND inserts a `crm_event_attendees` row with `status='invited'` per resolved recipient.
2. **Automation Rule 2.4** (similar) — for parallel events ("invite the active waitlist of OTHER open events to a newly-opened parallel event"). Same pattern.
3. The actual upsert is performed by `automation-engine/post-actions.ts:51` (`attendeeUpsert` function — JS mirror in `modules/crm/crm-automation-post-actions.js:107`).

**Where `invited` is COUNTED in capacity:**
1. **`v_crm_event_stats`** (the view) — `count(a.id) FILTER (WHERE (a.status <> ALL (ARRAY['cancelled','duplicate'])) AND a.is_deleted = false) AS total_registered`. `invited` is in the count.
2. **`register_lead_to_event` RPC** (the write-time enforcer) — fresh-INSERT path: `WHERE event_id = p_event_id AND status NOT IN ('cancelled','duplicate') AND is_deleted = false` → again, `invited` is counted. If the count >= max_capacity, the new registration is downgraded to `waiting_list`.
3. **`checkAndAutoWaitingList` in `crm-event-register.js:32-37`** (storefront-side check) — `.neq('status','waiting_list').neq('status','cancelled').neq('status','duplicate')` — so `invited` IS counted here too. Triggers event-status flip when cap is hit.

**Where `invited` is HIDDEN from the UI:**
1. **`ATTENDEE_COUNTER_DISPLAY_FIX` (2026-05-04)** — patched the events-tab counter to show only `registered + confirmed + attended`. So UI shows "10/50" while the view says "13/50".

**The "invited promotion" in `register_lead_to_event`:**
- If a lead with an existing `invited` row clicks the registration link, the RPC promotes their row in-place (lines marked "P5_8 Fix A" in the function body). The capacity check in this branch correctly EXCLUDES the row being promoted (`AND id <> v_existing.id`) — so the same lead's promotion doesn't double-count themselves.
- BUT — and this is the bug — that exclusion is row-specific. Lead A's invited row still consumes a slot that prevents Lead B's fresh registration.

**Concrete bug scenario (Daniel's example):**
- Event #24, max_capacity=50. Currently 10 registered + 3 invited.
- Lead Z (new, no prior row) clicks the registration form.
- RPC: `v_current_count = 10 registered + 3 invited = 13`. `13 < 50`, so insert fresh-INSERT path returns `'registered'`. ✓ Lead Z gets in.
- BUT: If 37 more leads click in the next hour, the cap fills at lead 50 (not lead 47), and the 3 invited rows that never click are now blocking 3 actual registrations from happening because they preemptively held those slots.
- Equivalent: "invited" is a *soft reservation* that never times out and never converts unless the lead clicks. Practical effect on Event #24: 6% of capacity is permanently held by ghosts.

### 4.2 Capacity Enforcement Mechanism — Summary

There are **THREE** capacity enforcement points, and all three count `invited`:
1. The view `v_crm_event_stats` (read by UI, by reporting, by some automation rules).
2. The RPC `register_lead_to_event` fresh-INSERT branch (the write-time enforcer).
3. The storefront-side `checkAndAutoWaitingList` (event auto-transition trigger).

Plus the UI counter that DOESN'T count `invited` (the patched display).

**This is exactly the bug Daniel surfaced.** Three layers say "invited counts"; one layer says "invited doesn't count." The data is real; the operator-perceived data is a fiction.

### 4.3 Three Options — Pros, Cons, SaaS Implications, Migration Cost, Industry Match

| | **Option A — Pure exclusion fix** | **Option B — Separate `crm_event_invitations` table** | **Option C — No row on invite (track via `crm_message_log`)** |
|---|---|---|---|
| **Change** | Add `'invited'` to the exclusion list in: (i) `v_crm_event_stats`, (ii) `register_lead_to_event` RPC capacity counts, (iii) `checkAndAutoWaitingList` storefront helper. | Create `crm_event_invitations(tenant_id, event_id, lead_id, sent_at, opened_at, clicked_at, …)`. Move `attendeeUpsert` Rule 2.2 + 2.4 to write here instead of `crm_event_attendees`. `register_lead_to_event` check this table on entry to detect prior invitation. | Drop the `attendeeUpsert` post-action entirely. The `crm_message_log` row already records "we sent them an SMS for this event" via `event_id`. Add a view `v_crm_event_invitations` synthesizing from the log. |
| **Effort** | **S** — 3 SQL/code changes, 1 SPEC, ~30 min | **L** — new table + RLS + DDL + migration + automation-engine refactor + UI changes (events-detail page shows "invited" tab) | **M** — drop 2 rule rows + 1 view + UI changes + delete `attendeeUpsert` code |
| **Risk** | **LOW** — pure semantic shift; no data migration. Existing 7 invited rows in DB still exist; they just stop counting. | **MEDIUM** — touches automation rules (live in production), needs careful migration, SaaS-2nd-tenant test surface widens | **MEDIUM** — loses the at-a-glance "who got invited?" UI tab; needs JOIN to message_log. Operator workflow may need retraining. |
| **SaaS implication** | None new. | New table = new tenant_id discipline (Rule 14, 15, 18). | None new. |
| **Reversibility** | Pure SQL revert. Trivial. | Hard — requires deciding whether to merge invitation rows back or drop. | Lose the historical "invited" tab; can rebuild from log. |
| **Industry match** | "Half-aligned" — keeps the conflated entity but stops the ghost-slot. Pragmatic. | "Salesforce model" — Campaign Member ≠ Event Attendee. The textbook answer. | "HubSpot model" — Marketing Events have only Registered/Attended/Cancelled; invitations live in workflows / lists. Also industry-aligned but loses some operator visibility. |
| **Loses what?** | Loses the *implicit* reservation semantics. Tradeoff: future Lead Z can grab a slot that Lead A (who got an invite SMS yesterday) might still click. First-click-wins. | Some workflow refactoring; event-detail UI must add an "invited" sub-tab that JOINs the new table. | Loses the structured `invited` status entirely; operators see "who was sent the SMS" via message log. |
| **Captures what?** | Operator's mental model ("invited = SMS sent, not a booking") matches the data. UI counter no longer needs the patch. | Both worlds explicit: marketing reach vs booking. Easier reports. | Single source of truth (message_log) for marketing reach; capacity counts only real bookings. |

### 4.4 Recommendation

**Adopt Option A as a hotfix this week (Rec 1). Plan Option C as a Q3 architectural cleanup (Rec 4).**

Rationale:
- Option A is reversible, ~30 min of work, exactly matches Daniel's mental model and what the UI counter already shows. It removes the visible bug now without touching automation or data.
- Option B is too much migration cost for too little additional clarity over Option C. Salesforce's separation makes sense for an enterprise that already has Campaigns as a top-level concept; Optic Up does not — every invite IS already a `crm_message_log` row.
- Option C is the long-term right answer, but the message_log → "who was invited" view JOIN needs UX validation with operators before commitment.

The hot-fix doesn't preclude the architectural fix later; it just stops the bleeding immediately.

**One subtle thing to test in Option A:** the RPC's "invited promotion" branch (the path that recognizes "this lead already has an invited row, promote it") MUST still work after the capacity-count change. Test case: 50 invited rows (no real registrations); lead 51 clicks an invitation link → should promote to `registered` (capacity at 0/50 if invited stops counting). This is a test scenario the SPEC must validate.

---

## 5. Issue 3.2 Cross-Check — `BROADCAST_EVENT_LINK_SUPPORT` vs Industry

### What the parallel SPEC did (verified by reading SPEC.md, EXECUTION_REPORT.md, FINDINGS.md):

- Broadcast Wizard now has an "optional linked event" dropdown (placed at Step 3 — template).
- `_wizard.eventId` flows through `enqueueBroadcast` → `crm_message_queue.event_id` (column already existed) → `dispatch-queue` (passes through) → `send-message` EF (`injectAutoUrls` resolves `%registration_url%` only when `eventId` truthy).
- 3 demo E2E smokes pass; zero Prizma writes during the run.
- 1 LOW finding (M4-DEBT-QUEUE-ERROR-MESSAGE-WIDTH) about queue.error_message truncation — non-blocking.

### Industry pattern for "broadcast linked to an entity":

- **Salesforce:** Campaign + Campaign Member + Event/Activity. The broadcast (Email Send) carries a `Campaign__c` foreign key + dynamic merge fields. The merge field `{!Campaign.RegistrationURL__c}` is computed per-recipient via formula fields. ([Salesforce — Use Salesforce Campaigns for Events](https://www.salesforceben.com/how-to-use-salesforce-campaigns-for-events-2/))
- **HubSpot:** Marketing Email + Workflow + Smart Content. The email "knows" about the Workflow's enrollment criteria; merge fields for event URLs are computed from associated Marketing Event objects via `{{contact.event_link}}` style.
- **Pipedrive:** Email templates + Custom Fields + Automations. A "send_event_link" template uses `{{deal.event.url}}` interpolation.

### Verdict: ALIGNED

The SPEC's architecture (`wizard.eventId` → `queue.event_id` → EF resolves `%registration_url%`) is structurally identical to all three industry patterns:
- **Salesforce Campaign Member ⟷ Optic Up's `crm_message_queue.event_id` row.** Both attach the recipient to the event-context for per-recipient resolution.
- **Salesforce formula merge field ⟷ Optic Up's `injectAutoUrls(db, leadId, tenantId, eventId, …)` server-side resolution.** Both compute the URL per-recipient at send time, not at template-author time.
- **The "no link" option (default null) maps to the absence of a Campaign association.** Industry-aligned.

The SPEC's *placement* decision (Step 3 next to the variable panel) is cleaner than Salesforce's UI (where Campaign linkage is on a separate tab). That's a UX win.

### One subtle concern (NOT a flag, just an observation):

Industry pattern would store `event_id` as a top-level column on `crm_broadcasts`, not nested in `filter_criteria` jsonb. Optic Up chose jsonb to avoid DDL — fine for now, but reporting later (e.g. "show me all broadcasts that linked to event #24") will require `WHERE filter_criteria->>'event_id' = '...'` instead of `WHERE event_id = '...'`. Acceptable trade-off for the hotfix; potential debt for the future.

**No competing fix needed.** The SPEC's approach is industry-best-practice. ✓

---

## 6. Industry Benchmark Table

| Feature / Concept | Optic Up today | Salesforce Health Cloud | HubSpot | Pipedrive | Cliniko / Jane App |
|-------------------|----------------|--------------------------|---------|-----------|---------------------|
| Lead entity | `crm_leads` text-status (13 slugs) | `Lead` standard object + custom fields for patient | Contact + Lead Status | Person + Deal + Lead | Patient (single object across lifecycle) |
| Lead status taxonomy | 13 statuses, flat | Configurable picklist | Lifecycle Stage (subscriber → marketing qualified → sales qualified → opportunity → customer) | Pipeline stages (configurable) | None — patient HAS appointment history, not a status |
| Lead → Patient transition | None — same row, status change | Convert Lead → Patient (button) | Lifecycle stage transition | Person promoted to Deal | Implicit — first appointment turns Lead into Patient |
| Event entity | `crm_events` (text status, 10 slugs) | Event / Activity object + Schedule | `MarketingEvent` + Workflow | Activity + Custom field | Appointment + Class (group-based) |
| Event capacity | `max_capacity` int + view-side count | Booking limits via Activity Type config | Built into MarketingEvent | Custom field | Per-class capacity |
| "Invited" status | YES — `crm_event_attendees.status='invited'` consumes capacity (BUG) | Campaign Member status — does NOT consume Event capacity | NOT supported on MarketingEvent — community-requested for years | Custom workflow stage | Not a concept — invitations are marketing campaigns, separate from bookings |
| "Registered" semantic | `crm_event_attendees.status='registered'` | Campaign Member status='Registered' OR Activity attendee | MarketingEvent attendee status='REGISTERED' | Custom workflow stage | Appointment booked |
| Capacity enforcement | RPC + view + storefront helper (3 places) | Activity Type validation rules | API-enforced + workflow guard | Manual + automation guard | Real-time scheduler engine |
| Waitlist | YES — `status='waiting_list'`, auto-promotion via `move_attendee_between_events` | Standard | Native | Custom | Native (Jane App's "Wait List") with auto-fill |
| Broadcast linked to event | Wizard dropdown → `crm_message_queue.event_id` (just shipped) | Email Send → Campaign → Event | Workflow + Smart Content | Email template + Deal | Campaign on patient cohort |
| Per-recipient URL resolution | `injectAutoUrls()` server-side | Formula field per-recipient | Smart token | Custom merge field | Booking link generator |
| Lead source attribution | `utm_*` columns + `crm_facebook_campaigns` | Standard Lead.LeadSource + Campaign Influence | Source + Original Source | Lead Source | Referral Source |
| Conversion funnel report | None (no `v_crm_event_funnel`) | Campaign ROI report | Funnel Reports | Conversion Reports | Practitioner Performance |
| Per-staff performance | None — no `assigned_to` on lead | Owner + Owner Reports | Owner + Reports | Deal Owner | Practitioner |
| Cohort retention | None | Standard cohort dashboard | Native | Cohort report | Patient retention report |
| LTV per source | None (4-row snapshot table) | Standard | Native | Calculated field | Patient lifetime value |
| Unsubscribe table | YES (`crm_unsubscribes`) | Email Opt-Out per channel | Native + GDPR | Native | Native |
| Re-subscribe on action | YES — implicit (RPC blanks `unsubscribed_at`) | Requires explicit re-opt-in (compliance) | Requires explicit re-opt-in | Manual | Requires explicit re-opt-in |
| Status change audit log | `crm_status_change_events` + `crm_audit_log` | Field History Tracking + Salesforce Shield | Activity log | Activity log | Booking history per appointment |
| Custom field framework | `crm_custom_field_defs` + `crm_custom_field_vals` (0 rows live) | Standard Custom Fields | Custom Properties | Custom Fields | Custom Fields per practice |
| Multi-language templates | `crm_message_templates.language` column | Translation Workbench | Native multi-language | Localized templates | Native |
| RTL Hebrew support | Native (Optic Up's market) | RTL plugin required | Limited | Limited | Limited |
| RLS / multi-tenant | 28/28 CRM tables canonical pattern | Per-Org isolation built-in | Native | Native | Per-clinic isolation |
| State-machine documentation | Implicit only | Setup → Object visualizer | Workflow visual builder | Pipeline builder | Implicit |
| Unit-economics dashboard | `crm_unit_economics` (4-row snapshot, manual fill) | Standard | Native | Calculated | Manual |
| Time-to-first-message latency | Not measured | Native SLA tracking | Service hub SLA | Manual | Native |

---

## 7. Top 10 Recommendations — Prioritized

### Rec 1 — Make `invited` a non-capacity-consuming status (HOTFIX)
- **Problem:** §4 — three places count `invited` toward capacity; UI hides it. Daniel's bug.
- **Solution:** Add `'invited'` to exclusion list in (i) `v_crm_event_stats` view, (ii) `register_lead_to_event` capacity-count, (iii) `checkAndAutoWaitingList` query. SPEC declares this in `## Destructive Operations` because view replacement = `CREATE OR REPLACE VIEW` (not destructive in the sense of data loss, but destructive enough to declare).
- **Effort:** S (~30 min). **Risk:** LOW. **Tenant-2 readiness:** No new tenant-scoping concerns.

### Rec 2 — Add `v_crm_event_funnel` view
- **Problem:** §3.7 — no operator-facing funnel; can't tell where leads drop off.
- **Solution:** New view aggregating `leads_invited` (count of invited message_log rows per event), `total_registered`, `total_attended`, `total_purchased`, plus % conversions and time-to-convert deltas.
- **Effort:** S. **Risk:** LOW. **Tenant-2 readiness:** Standard tenant_id GROUP BY.

### Rec 3 — Codify Iron-Rule-7 enforcement on M4
- **Problem:** §3.3.1 — 136 raw `sb.from()` calls; M4-DEBT-02 noted but not actioned.
- **Solution:** Either (a) migrate to `DB.*` wrappers in a phased SPEC, or (b) document M4 as wrapper-exempt in CLAUDE.md / MODULE_SPEC.md with reasoning.
- **Effort:** M (option a) or S (option b). **Risk:** LOW.

### Rec 4 — (Q3) Adopt Salesforce-style separation: marketing object ≠ booking object
- **Problem:** §3.1.1 — `crm_event_attendees` conflates two responsibilities.
- **Solution:** Migrate Rule 2.2 / 2.4 to write `crm_event_invitations` (new) instead of `crm_event_attendees`. The attendee table records only actual booking states.
- **Effort:** L. **Risk:** MEDIUM. **Tenant-2 readiness:** New table requires tenant_id + RLS + UNIQUE-with-tenant_id discipline. Worth the investment ONLY after Optic Up has 3+ tenants and operator workflows are validated.

### Rec 5 — Lead-status hygiene SPEC
- **Problem:** §3.2.1, §3.2.2 — dead `waitlist`, ambiguous `confirmed/confirmed_verified`.
- **Solution:** Drop `waitlist` from `crm_statuses` + remove from `ATTENDEE_ADD_STATUSES` array. Decide on confirmed merge (likely "drop confirmed_verified, add `phone_verified bool` to `crm_leads`"). Add `description` column to `crm_statuses` for self-documentation.
- **Effort:** S. **Risk:** LOW.

### Rec 6 — Fix `v_crm_event_dashboard` LEFT JOIN
- **Problem:** §3.5.2 — INNER JOIN to `crm_campaigns` hides events without a campaign.
- **Solution:** Change to LEFT JOIN.
- **Effort:** XS. **Risk:** LOW.

### Rec 7 — Set `verify_jwt = false` explicitly in `config.toml` for public EFs
- **Problem:** §3.4.3 — re-deploying a public EF could silently flip its auth requirement.
- **Solution:** Add `verify_jwt = false` to 6 EF blocks in `supabase/config.toml`.
- **Effort:** XS. **Risk:** LOW (declarative, matches deployed state).

### Rec 8 — `crm_lead_notes` + `crm_event_attendees` + `crm_automation_rules` get `updated_at`
- **Problem:** §3.1.2, §3.1.3, §3.1.6.
- **Solution:** ALTER TABLE + trigger.
- **Effort:** S. **Risk:** LOW.

### Rec 9 — Author `STATUS_MODEL.md` documenting all transitions
- **Problem:** §3.2.4 — implicit state machine.
- **Solution:** Three Mermaid state diagrams in `modules/Module 4 - CRM/docs/STATUS_MODEL.md`. Generate from code analysis once; maintain manually.
- **Effort:** M. **Risk:** LOW.

### Rec 10 — Add immediate `lead_intake_confirmation` automation
- **Problem:** §3.6.1 — no welcome message.
- **Solution:** New rule + new template.
- **Effort:** S. **Risk:** LOW (existing framework).

---

## 8. Anti-recommendations

Things from industry CRMs that look attractive but should NOT be adopted by Optic Up:

### Anti-Rec 1 — Salesforce Campaign Influence Multi-Touch Attribution
**Why not:** Designed for B2B with weeks-long deal cycles and 5+ touchpoints. Optic Up's optical event funnel is days-long with 1-3 touchpoints. The "first-touch / last-touch / linear / time-decay" attribution model is overkill. UTM source + simple "first-message-clicked" attribution captures 95% of the value.

### Anti-Rec 2 — HubSpot Lifecycle Stages with full marketing-qualified-lead/sales-qualified-lead/opportunity ladder
**Why not:** HubSpot's MQL/SQL distinction makes sense for B2B SaaS with marketing+sales teams. Optic Up's tenants are 1-5 staff stores; one person handles "is this a real lead → talk to them → register them." The ladder adds bureaucratic transitions without adding signal.

### Anti-Rec 3 — Pipedrive's Activity-typed pipeline view
**Why not:** Pipedrive's pipeline kanban requires every lead to be in exactly one stage. Optic Up's lead semantics are richer (a lead can be `confirmed` for one event AND `invited` to another — that's why `crm_event_attendees` exists). Forcing a single pipeline column would lose information.

### Anti-Rec 4 — Cliniko's per-practitioner column on every appointment
**Why not:** Optical events are group bookings, not 1:1 appointments. The "practitioner" concept doesn't map. The closest concept (`crm_events.staff_assigned`) doesn't exist and shouldn't.

### Anti-Rec 5 — Salesforce Process Builder / Flow visual workflow editor
**Why not:** Beautiful for enterprise admins; overkill for Optic Up's 40 automation rules. The current `crm_automation_rules` table + small UI is good enough for 1-5-staff tenants. Building a visual editor = 6 months of dev time for marginal operator value.

### Anti-Rec 6 — Salesforce/HubSpot Custom Object framework
**Why not:** Optic Up has `crm_custom_field_defs` + `crm_custom_field_vals` (currently 0 rows). DON'T expand into a full custom-object framework. SaaS tenants want a fixed schema with a few config knobs, not a low-code platform. Saying "no" here is a feature.

### Anti-Rec 7 — Phorest's machine-learning client-rebooking predictor
**Why not:** Phorest needs ML because their use case is recurring monthly haircuts where the ML adds 30%+ rebooking. Optic eyewear cycles are 18-36 months — the dataset Optic Up will have for years to come is too sparse for ML to add measurable value. Simple time-since-last-purchase rules will get 90% of the benefit.

---

## 9. Open Questions for Architect + Daniel

1. **Option A vs Option C for `invited`:** is the operator workflow today reliant on the "invited" tab in events-detail UI? If yes, Option A (keep the row, fix capacity) is the right hotfix. If no, jump straight to Option C (kill the row, derive from message_log).

2. **Lead-status flatness:** is it strategically OK that 92% of Prizma's leads are `invited`? If the answer is "no, that's a sign the lifecycle isn't capturing engagement signal", then a deeper status redesign is needed beyond Rec 5.

3. **`crm_event_attendees` semantic split:** when do we commit to Rec 4 (separate marketing-object from booking-object)? Triggers: 3rd tenant onboarded, OR operator confusion crosses a threshold, OR the SaaS API needs a clean "events" endpoint.

4. **Re-subscribe on registration (Finding 3.6.6):** Israeli law (תקנה 30א + Spam Law 2008) requires explicit consent. Is the implicit re-subscribe in `register_lead_to_event` line 18 a legal exposure? Worth a 15-min legal check.

5. **Iron Rule 7 in M4:** are we paying down the 136-call debt or formally accepting M4 as wrapper-exempt? Either decision is fine; drift is not.

6. **Reporting investment:** of the 8 missing reports in §3.7, which 3 unlock the most operator value for Daniel's stores? Likely Funnel + Source-Attribution + Per-Event-ROI.

7. **`crm_unit_economics` strategy:** keep it as a manual snapshot table, or replace with materialized view that recomputes nightly?

8. **Backup table cleanup (`_backup_brand_gallery_20260417`):** owns by M3 — escalate to M3 strategist? It's a security advisory item that surfaces on every CRM advisor scan.

9. **State-machine documentation:** is `STATUS_MODEL.md` a "we'll do it next phase" item or a Q3 commitment? Without it, Issue 3.1 will recur in a different form (next time someone wonders why Rule 2.4 invites consume capacity).

10. **Status of the active `BROADCAST_EVENT_LINK_SUPPORT` SPEC:** the parallel chat has shipped commits 1+2+3 (executor side) and is awaiting a `FOREMAN_REVIEW.md` from the Foreman/Architect. Once that lands, Daniel can send the Event #24 rescue dispatch. This audit confirms the SPEC's architecture is industry-aligned (see §5) — if Architect's review is the only thing blocking, this audit can serve as one of the inputs.

---

## Sources

- [Salesforce Health Cloud Data Model](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects.htm)
- [Salesforce Health Cloud Appointment Management](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/hc_appointment_management_data_model.htm)
- [8 Tips for Working with Salesforce Campaign Member Status (Salesforce Ben)](https://www.salesforceben.com/tips-for-working-with-salesforce-campaign-member-statuses/)
- [How to Use Salesforce Campaigns for Events (Salesforce Ben)](https://www.salesforceben.com/how-to-use-salesforce-campaigns-for-events-2/)
- [HubSpot Marketing Events API Guide](https://developers.hubspot.com/docs/api-reference/marketing-marketing-events-v3/guide)
- [HubSpot — Use Marketing Events](https://knowledge.hubspot.com/integrations/use-marketing-events)
- [HubSpot Community — Adding Contacts to Marketing Events (Invited status request)](https://community.hubspot.com/t5/HubSpot-Ideas/Adding-contacts-to-marketing-events/idi-p/1081282)
- [Cliniko — Booking Appointments](https://help.cliniko.com/en/collections/107572-booking-appointments)
- [Cliniko — Cancelled and Missed Appointments](https://help.cliniko.com/en/articles/1782604-see-cancelled-and-missed-appointments)
- [Cliniko — Practitioner Performance Report](https://help.cliniko.com/en/articles/4260984-understanding-the-practitioner-performance-report)
- [Jane App — Online Booking](https://jane.app/features/online-booking)
- [Jane App — Using the Wait List](https://jane.app/guide/using-the-wait-list)
- [Jane App — Appointments Reports](https://jane.app/guide/appointments-reports)
- [Pipedrive — Sales and Marketing Automation 2026](https://www.pipedrive.com/en/blog/sales-and-marketing-automation)
- [Pipedrive — CRM Processes](https://www.pipedrive.com/en/products/sales/processes-pipeline-activities)
- [Phorest — Salon CRM Software](https://www.phorest.com/features/salon-crm-software/)
- [Phorest — Automated SMS & Email](https://www.phorest.com/features/automated-sms-email/)
- [Phorest — Salon Client Retention](https://www.phorest.com/blog/fully-booked-salon-client-retention/)
- [Microsoft Teams — Manage Webinar Registration (capacity)](https://support.microsoft.com/en-us/office/manage-webinar-registration-in-microsoft-teams-923f382a-0cca-433a-b38d-7461971192d1)
- [Cvent — 26 Webinar Best Practices](https://www.cvent.com/en/blog/events/webinar-best-practices)

---

*End of report. Ready for Architect + Daniel review. No commits made by this audit (per Brief constraint). Daniel commits this file manually.*
