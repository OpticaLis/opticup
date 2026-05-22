# SPEC — M4_REMOVE_ATTENDEE_INVITED_STATUS

> **Authored:** 2026-05-22 — Phase 2 (post-signoff).
> **Phase 1 findings:** `modules/Module 4 - CRM/architecture-brief/M4_REMOVE_ATTENDEE_INVITED_PHASE_1_FINDINGS_2026_05_22.md`.

## 0. Goal
Stop creating `crm_event_attendees.status='invited'` rows and remove all read-side references to the now-defunct value. Cleanly resolves the "501 נרשמו / 167 הוזמן" confusion Daniel saw on V100K_EVENT_034. Lead-level `invited` (`crm_leads.status='invited'`) stays fully intact.

## 1. Acceptance bar
- Rule `שינוי סטטוס: הזמנה חדשה` (1 demo + 1 prizma) no longer has `action_config.post_action_attendee_upsert`. Rule remains; `event_invite_new` template still fires.
- 177 existing `crm_event_attendees` rows with `status='invited'` soft-deleted (`is_deleted=true`). Lead-side untouched.
- Code dead-code references removed at 5 JS sites + 3 DB objects (view, trigger, RPC).
- New status_change → registration_open on demo creates ZERO new attendee 'invited' rows.
- Lead-level invited references untouched (verified via grep diff before commit).
- Iron Rule 31 gate exit 0.

## 2. Files modified

### JS (5 files)
| File | Site | Change |
|---|---|---|
| `modules/crm/crm-event-day-coupon.js` | line ~25 `COUPON_ALLOWED_ATTENDEE_STATUSES` | drop `'invited'` |
| `modules/crm/crm-leads-tab.js` | line ~319 attendee-move query | drop `'invited'` from `.in('status', [...])` |
| `modules/crm/crm-event-register.js` | line ~35 capacity-count `neq('status','invited')` | drop the now-redundant `.neq()` chain |
| `supabase/functions/automation-engine/recipients.ts` | line ~154 cross_event_active_waitlist | drop `'invited'` from `.in('status', [...])` |
| `modules/crm/crm-automation-recipient-resolvers.js` | line ~130 (browser clone of above) | drop `'invited'` |

### DB (3 objects via 1 migration)
| Object | Change |
|---|---|
| `v_crm_event_stats` view | drop `'invited'` from the `total_registered` + `spots_remaining` exclusion lists |
| `event_status_close_recycle_leads_fn` trigger function | drop `'invited'` from `IN ('invited','attended')` |
| `register_lead_to_event` RPC | drop the dead `IF v_existing.status='invited' THEN ... promote` branch |
| `sync_lead_status_from_attendee` RPC | drop the `WHEN 'invited' THEN 'invited'` mapping (dead code) |

### Rule config (Daniel-authorized Prizma write)
- demo rule id `82aac348-2c92-4479-8821-73a2842cfb07` → strip `post_action_attendee_upsert`.
- prizma rule id `b95a46a1-b153-4e11-becb-43cfc169005a` → same.

### Data migration
- Single SQL: `UPDATE crm_event_attendees SET is_deleted=true WHERE status='invited' AND is_deleted=false`. Affects 177 rows (174 demo + 3 prizma).

## 3. Destructive Operations
1. UPDATE on `crm_automation_rules.action_config` → 2 rows (1 demo + 1 prizma). Daniel-authorized Prizma write (Phase 1 brief §2 + Phase 2 dispatch confirmation).
2. UPDATE on `crm_event_attendees.is_deleted` → 177 rows (174 demo + 3 prizma). Soft-delete only (IR3-compliant). Lead-side untouched.
3. DDL: `CREATE OR REPLACE` on view + trigger function + 2 RPCs — all pure-replacement, no schema change, no constraint change.
4. EF redeploy (automation-engine).
5. NO Prizma destructive ops beyond items 1+2 above.
6. NO touch on Daniel's `M4_DANIEL_MANUAL_TEST_2026_05_21` 10K leads (different table — `crm_leads`).

## 4. Verification
- SQL truth: 0 active `crm_event_attendees` rows with `status='invited'` post-soft-delete.
- Rule config post-update: `action_config->'post_action_attendee_upsert'` IS NULL on both rules.
- Lead-side invariant: `SELECT count(*) FROM crm_leads WHERE status='invited' AND tenant_id=demo` unchanged vs pre-Phase-2 baseline.
- Smoke test: status_change demo event planning → registration_open with rule re-enabled briefly → check ZERO new attendee 'invited' rows + messages enqueued + capacity math correct + IR34 Chrome screenshot.
- Iron Rule 31 gate exit 0.

## 5. Commit plan
| # | Files | Purpose |
|---|---|---|
| 1 | 5 JS files + EF + migration .sql + SPEC.md | Phase 2 unified commit (atomic) |
| 2 | 4 closing docs (EXECUTION_REPORT, FINDINGS, TEST_REPORT, FOREMAN_REVIEW) | post-execution audit trail |

Single commit preferred to keep the schema-shape + code-shape change atomic.

---
*End of SPEC.*
