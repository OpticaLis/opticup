# M4_FB_CAPI_PURCHASE_EVENTS — Architecture Brief

> **Status:** Brief sealed 2026-05-19 · Owner: Architect · Pipeline: Full-Auto
>
> **One-line:** Extend FB CAPI from Lead-only (P2.1) to the full conversion funnel: `CompleteRegistration` (lead registered to event) + `EventAttended` (attendee arrived) + `Purchase` (attendee paid, with amount). This is the SPEC that turns Meta's optimization engine from "find leads" to "find buyers."
>
> **Risk class:** MEDIUM. Touches EF code + adds DB triggers. Additive only. No table-schema changes (all source columns already exist).

---

## 1. Goal

Send 3 additional event types to Meta CAPI as customers progress through the funnel:

| Meta event | Triggered by | Why it matters |
|---|---|---|
| `CompleteRegistration` | Attendee row created with status='registered' (lead → event registration) | Meta knows which leads actually committed, not just expressed interest |
| `EventAttended` | Attendee status flips to 'attended' (custom Meta event) | Meta learns which leads physically showed up — high-quality signal |
| `Purchase` | Attendee status flips to 'purchased' with `purchase_amount > 0` | **The strategic event.** Meta's algorithm optimizes on revenue, finds customers like high-spenders |

After this Brief, Meta's algorithm has the full funnel: Lead → CompleteRegistration → EventAttended → Purchase. Cost-per-lead drops; cost-per-purchase becomes the optimization target.

## 2. Background

**P2.1 (Lead events) live since 2026-05-19:** verified 27/30 leads `status='sent'` on Prizma production. Meta receiving server-side `Lead` events with shared `event_id` for dedup against browser pixel.

**Why purchase events were deferred to a follow-up:** the Brief author (me, 2026-05-15) wanted 7 days of Lead stability before adding more event types. We have 4 days of stability + 27/30 success rate. **Daniel approved fast-tracking** — purchase events are the high-value half of the FUNNEL.

**Customer journey today:**

1. Lead fills SuperSale form → `crm_leads` row created. **→ `Lead` event sent (P2.1 ✅)**
2. Lead registers to specific event → `crm_event_attendees` row created with `status='registered'`. **→ no event sent (this SPEC adds it)**
3. Attendee arrives at event → status flipped to `'attended'` (or `'attended_purchased'`/`'arrived'` — verify in pre-flight). **→ no event sent (this SPEC adds it)**
4. Attendee pays for product → status flipped to `'purchased'` + `purchase_amount` populated. **→ no event sent (this SPEC adds it)**

## 3. Scope

**In scope:**

- **DB triggers** on `crm_event_attendees` for INSERT (CompleteRegistration) + UPDATE OF status (EventAttended + Purchase). Triggers enqueue rows in `crm_capi_dispatch_queue` with a new `event_type` column.
- **Schema change to `crm_capi_dispatch_queue`** — add `event_type text NOT NULL DEFAULT 'Lead'` column. Existing rows backfilled to `'Lead'`. New triggers write `'CompleteRegistration'` / `'EventAttended'` / `'Purchase'`.
- **EF `fb-capi-dispatch` update** — read the `event_type` column, map to Meta event name, include `custom_data.value` + `custom_data.currency='ILS'` for Purchase events (Meta requires these fields).
- **Idempotency** — each (attendee_id, event_type) pair dispatched at most once. New unique constraint on `crm_capi_dispatch_queue (tenant_id, lead_id, event_type)` (today is `(tenant_id, lead_id)`).
- **Documentation** — `docs/FB_CAPI.md` extended with new event types + amounts.
- **Verification queries** — extend the existing pixel-gap dashboard query in `crm-pixel-gap-tile.js` to optionally show purchase event counts.

**Out of scope (explicitly):**

- Storefront pixel for purchase events. Browser-side `Purchase` event firing on /thank-you/ after checkout is a separate concern; v1 ships server-side CAPI only. Future SPEC adds browser pixel + dedup.
- Refund/cancellation events. If `status` flips from `purchased` back to `cancelled`, we do NOT send Meta a refund event. Future SPEC.
- Custom event parameters beyond `value` + `currency`. No `content_ids`, no `content_type`, no `num_items`.
- Per-attendee de-dup beyond (lead_id, event_type) pair. If the same attendee somehow gets re-registered (cancel + re-register), v1 will send a second CompleteRegistration. Future SPEC if this becomes noisy.
- Reports/dashboards beyond the existing pixel-gap tile extension.

## 4. Cross-Module Safety Audit

This section explicitly enumerates every surface this SPEC touches. Executor MUST stop if anything beyond this list is needed.

### 4.1 Database tables — what this SPEC touches

| Table | Access | Reason |
|---|---|---|
| `crm_event_attendees` | **READ-ONLY** (DB triggers read NEW.status, NEW.purchase_amount, NEW.lead_id, NEW.event_id) | Source of truth for registration/attendance/purchase |
| `crm_capi_dispatch_queue` | **WRITE** (INSERT new rows + schema change: new `event_type` column + new unique constraint) | The bus the EF already consumes |
| `crm_leads` | **READ-ONLY** (DB trigger reads NEW.lead_id to backfill event_id lookup) | For matching attendees back to leads with fb_event_id |
| `tenants` | **READ-ONLY** (RLS) | Tenant binding |
| `storefront_config` | **READ-ONLY** (EF reads fb_capi_token + fb_pixel_id) | Token lookup |

### 4.2 Database tables — EXPLICITLY NOT TOUCHED

| Table | M4-relevant | Confirmed unchanged |
|---|---|---|
| `crm_message_log` | yes | not touched |
| `crm_message_queue` | yes | not touched |
| `crm_message_templates` | yes | not touched |
| `crm_automation_rules` | yes | not touched |
| `crm_automation_runs` | yes | not touched |
| `crm_status_change_events` | yes | not touched (different bus, different consumer) |
| `crm_events` | yes | not touched |
| `crm_broadcasts` | yes | not touched |
| `crm_statuses` | yes | not touched |
| `crm_lead_touchpoints` | yes | not touched |
| All M1 / M2 / M3 / M5+ tables | n/a | not touched |

### 4.3 Edge Functions — what this SPEC touches

| EF | Access | Reason |
|---|---|---|
| `fb-capi-dispatch` | **MODIFY** | Read `event_type` column, branch on Meta event_name, include `value` + `currency` for Purchase |

### 4.4 Edge Functions — EXPLICITLY NOT TOUCHED

| EF | Confirmed unchanged |
|---|---|
| `pixel-fired` | not touched |
| `automation-engine` | not touched (DB triggers go through a different bus) |
| `dispatch-queue` | not touched |
| `send-message` | not touched |
| `lead-intake` | not touched |
| `submit-lead` | not touched |
| `pin-auth` | not touched |

### 4.5 DB triggers — what this SPEC touches

| Trigger | Operation | Reason |
|---|---|---|
| `trg_capi_attendee_registered` (NEW) | AFTER INSERT on `crm_event_attendees` | Enqueue CompleteRegistration |
| `trg_capi_attendee_status_change` (NEW) | AFTER UPDATE OF status on `crm_event_attendees` | Enqueue EventAttended (when new status='attended') and Purchase (when new status='purchased' AND purchase_amount > 0) |

### 4.6 DB triggers — EXPLICITLY NOT TOUCHED

| Trigger | Confirmed unchanged |
|---|---|
| `trg_event_status_change_event` | not touched |
| `trg_lead_status_change_event` | not touched |
| `trg_attendee_status_change_event` (existing M4 status-events trigger) | not touched (different bus — that one writes to `crm_status_change_events`, ours writes to `crm_capi_dispatch_queue`) |
| `trg_promote_lead_on_message_sent` | not touched |
| All `sync_*_public_trg` (P_DL triggers) | not touched |

### 4.7 RLS policies, GRANTs

| Surface | Access |
|---|---|
| New columns + constraint inherit existing RLS on `crm_capi_dispatch_queue` | No new RLS policy |
| GRANTs | No new role, no new privilege |

### 4.8 Files modified (estimated)

| File | New / Modified | Purpose |
|---|---|---|
| New migration | NEW | Add `event_type` column + new unique constraint + 2 DB triggers + functions |
| `supabase/functions/fb-capi-dispatch/index.ts` | MODIFIED | Branch on event_type, add value/currency for Purchase |
| `docs/FB_CAPI.md` | MODIFIED | Document new event types + body shape |
| `modules/crm/crm-pixel-gap-tile.js` | MODIFIED (small) | Optional: show purchase event counts alongside Lead |
| `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` | MODIFIED | Reflect multi-event-type queries |
| Memory `project_fb_capi_p21_state.md` | MODIFIED | Note Purchase events live |

### 4.9 Stop-trigger — Iron Rule cross-module enforcement

If executor pre-flight discovers a need to:
- Touch any item in §4.2, §4.4, §4.6 → STOP, escalate.
- Add a placeholder variable to any template → STOP (Iron Rule 35).
- Modify any M4 automation logic → STOP.

The Brief authorizes ONLY what's in §4.1 + §4.3 + §4.5 + §4.7 + §4.8.

---

## 5. Locked Decisions

**D1. DB triggers, not application code.** Same pattern as P2.1 status-change framework: trigger fires on row change, writes to queue, consumer picks up. Reasons: (a) zero risk of application-code skipping; (b) atomic with the status change; (c) idempotent via DB unique constraint.

**D2. Same queue (`crm_capi_dispatch_queue`), not new table.** Add `event_type` column. Reuse the same EF (`fb-capi-dispatch`) with a branch. Reasons: Iron Rule 21 (no duplicates), reuses existing pg_cron schedule, single point of monitoring for all CAPI events.

**D3. `event_type` enum — Lead, CompleteRegistration, EventAttended, Purchase.** Hardcoded list per Iron Rule 19 (configurable values = tables, not enums) — BUT this is a 4-value system that mirrors a Meta-defined external vocabulary. Exception justified. If a future SPEC adds more events, this becomes a `crm_capi_event_types` reference table.

**D4. Currency hardcoded to ILS.** Per Iron Rule 9 (no hardcoded business values), in v1 we use the tenant's configured currency (read from `tenants.ui_config.currency` if present, default 'ILS'). Future multi-currency tenants override via tenant config. ILS is the right v1 default since Prizma is the only tenant.

**D5. Purchase amount: `purchase_amount` from `crm_event_attendees`.** Verified in M4 schema (db-schema.sql line 11 + MODULE_MAP.md line 65/236). If purchase_amount is 0 or NULL → DO NOT send Purchase event (no business value to Meta).

**D6. Dedup against Meta — separate `event_id` per Meta-event-type.** P2.1 used `crm_leads.fb_event_id` as the dedup key for Lead. For new events, we derive a stable event_id per (lead_id, event_type) — e.g., concatenation hashed. This guarantees idempotency at Meta's side too.

**D7. Backfill no historical events.** Existing 158 attendees who already arrived + purchased — we do NOT send Purchase events for them retroactively. Reasons: (a) Meta's 7-day attribution window has expired for most; (b) backfill complicates idempotency. v1 ships forward-only.

**D8. Browser pixel — out of scope.** Storefront `/thank-you/` page does not need a `Purchase` pixel call in v1. Server-side CAPI alone provides the signal. Future SPEC may add browser pixel + dedup for redundancy.

## 6. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` at `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/SPEC.md`.
2. **Executor (opticup-executor)** — DB migration first, then EF update, then JS+docs. Default model: **Sonnet** (mechanical SQL + TS, no security-vocab heavy work; same lesson from P2.1 holds).
3. **Reviewer (opticup-reviewer)** — Iron Rules 14, 15, 18, 21, 22, 23, 31, 32, 35. Especially: (a) new triggers don't fire on M4 status-events bus; (b) unique constraint includes tenant_id (Rule 18); (c) RLS inherited correctly.
4. **Localhost-Tester** — runs smoke 7/7 + creates 3 test attendees on demo (one per event type), verifies Meta Test Events receives them.
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill improvement proposals.

## 7. Success Criteria

1. New column `crm_capi_dispatch_queue.event_type text NOT NULL DEFAULT 'Lead'` exists; existing rows backfilled.
2. New unique constraint `(tenant_id, lead_id, event_type)` enforced.
3. 2 new DB triggers exist: registration + status-change.
4. EF `fb-capi-dispatch` reads event_type and sends correct Meta event_name + payload.
5. Purchase events include `custom_data.value` (integer) + `custom_data.currency='ILS'`.
6. Demo E2E test (3 attendees, one per event type):
   - Test 1: Register attendee → `crm_capi_dispatch_queue` shows row with `event_type='CompleteRegistration'`, `status='sent'`.
   - Test 2: Flip to 'attended' → row with `event_type='EventAttended'`, `status='sent'`.
   - Test 3: Flip to 'purchased' with `purchase_amount=500` → row with `event_type='Purchase'`, value=500, status='sent'.
7. Idempotency test: re-flip status to same value → second row NOT inserted (unique constraint hits).
8. Iron Rule 31 integrity gate passes.
9. Smoke 7/7 PASS.
10. Cross-Module Safety Audit §4 holds — Reviewer confirms no touch on items in §4.2/§4.4/§4.6.
11. `docs/FB_CAPI.md` updated.
12. Working tree clean at SPEC close.

## 8. Stop-Triggers

Executor MUST stop on any of:

- `purchase_amount` column not found on `crm_event_attendees` (pre-flight check; Brief assumes exists per MODULE_MAP line 65/236).
- Status `'attended'` or `'purchased'` not in current `crm_statuses` vocabulary (verify in pre-flight).
- More than one existing trigger on `crm_event_attendees` interferes with the new ones (Rule 21).
- Iron Rule 31 gate fails.
- Smoke regresses.
- Any §4.9 violation.
- Demo E2E test Meta Test Events shows wrong event_name or missing value.

## 9. Rollback Plan

Per-commit annotated tags. Worst-case rollback:
- Drop new triggers + drop unique constraint + drop column (safe; no data destruction since column is additive).
- Revert EF deploy.
- Revert JS + docs.

Rollback atomic via tag `pre-capi-purchase-events-start`. P2.1 Lead events keep working through entire rollback.

## 10. Expected Final State

- Working tree clean on develop.
- DB: 1 new column + 1 new unique constraint + 2 new triggers + 2 functions.
- 1 EF modified (`fb-capi-dispatch`).
- 1 JS modified (`crm-pixel-gap-tile.js` — small).
- 2 docs modified.
- Demo E2E green for 4 event types.
- Smoke + integrity GREEN.

## 11. Commit Plan

Indicative.

- C1: DB migration — column + unique constraint + 2 triggers + functions.
- C2: EF update + deploy.
- C3: Doc + JS update.
- C4: Demo E2E test artifacts + smoke verification.
- C5: Retrospective (EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW).

## 12. Out-of-Scope (explicit)

- Storefront browser-pixel `Purchase` event.
- Refund / cancellation events.
- Custom event parameters beyond `value` + `currency`.
- Multi-currency support beyond ILS default.
- Backfill of historical events.

## 13. Cross-References

- `M4_FB_CAPI_HYBRID_DEDUPLICATION` (P2.1 Lead substrate, closed 2026-05-15).
- `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` (storefront half, closed 2026-05-15).
- `M3_FUNNEL_PIXEL_BACKWIRE` (pixel-fired EF, closed 2026-05-19).
- `M4_PIXEL_VALIDATION_GAP_DASHBOARD` (P2.2b, closed 2026-05-19).
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — confirmed no placeholder/template/rule changes needed.
- `docs/FB_CAPI.md` — current canonical reference.
- Meta CAPI docs — Purchase events: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data

## 14. Author Notes

This is the highest-value Brief remaining in FUNNEL Phase 2. Daniel said it in his own words on 2026-05-13: *"Sending purchases is important."* Today (2026-05-19) the substrate is verified working for Leads, the Pixel back-wire is closed, the dashboard exists. The natural next step is to give Meta the second half of the data so its optimization engine can do its job.

After this Brief: cost-per-lead drops + Meta optimizes on revenue, not clicks. ROAS measurement becomes trustworthy because the full funnel is observed.

The Cross-Module Safety Audit §4 is binding — same pattern as P2.2b. Zero touches on the M4 messaging path that broke last week.

---

*End of Brief. Activation Prompt in sibling file `M4_FB_CAPI_PURCHASE_EVENTS_ACTIVATION_PROMPT.md`.*
