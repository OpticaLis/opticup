# Phase 1 — Removal Map for ATTENDEE-Level `invited`

> **Date:** 2026-05-22. **DIAGNOSE-ONLY pass. No changes made.**
> Brief: `M4_REMOVE_ATTENDEE_INVITED_STATUS_BRIEF_2026_05_22.md`.

## Executive summary
**The removal is clean.** No DB constraint blocks the cleanup (the `status` column on `crm_event_attendees` has NO CHECK constraint — it's a convention-only enum). Lead-level `invited` is fully independent and stays intact. The single behavioral change driver is **one rule per tenant** (`"שינוי סטטוס: הזמנה חדשה"`) that writes attendee.status='invited' via the post-action. Stop that, and the rest is dead-code cleanup.

## Existing data: 177 attendee rows with status='invited'

| Tenant | is_deleted=false | by event |
|---|---|---|
| demo | 174 rows | 167 on V100K_EVENT_034 (my Sprint-3 100K-verify seed; sentinel-disposable), 7 on earlier events |
| prizma | 3 rows | spread across older events |

Cross-tenant total = 177 (Daniel's "~174 demo + 3 prizma" matches when excluding/including soft-deletes).

## 1. Schema — what changes (and what doesn't)

| Object | Today | Action |
|---|---|---|
| `crm_event_attendees.status` CHECK constraint | **none** (no DB enum) | none needed |
| `crm_event_attendees.status` column type | `text` | unchanged |
| `crm_leads.status` CHECK constraint | none | unchanged |
| `crm_leads.status` 'invited' usage | LEAD-level "awaiting click" | **KEEP — Daniel's directive** |

## 2. WRITES of `crm_event_attendees.status='invited'`

| # | Where | Trigger | Action |
|---|---|---|---|
| **W1** | `supabase/functions/automation-engine/post-actions.ts` → `attendeeUpsert(...)` | `rule.action_config.post_action_attendee_upsert.status` (whatever the rule's config says) | **Change source = rule config, not code.** Remove `post_action_attendee_upsert` from the 2 named rules below. See W3. |
| **W2** | `modules/crm/crm-automation-post-actions.js` (browser-side clone of W1) | same path | same — rule config change covers it |
| **W3** | rule `שינוי סטטוס: הזמנה חדשה` (demo id `82aac348-2c92-4479-8821-73a2842cfb07`; prizma id `b95a46a1-b153-4e11-becb-43cfc169005a`) currently configured with `action_config.post_action_attendee_upsert: {status:'invited'}` | event status_change → registration_open | **DELETE** the `post_action_attendee_upsert` key from `action_config`. **`template_slug='event_invite_new'` stays** (the SMS/email message itself still sends). Both rules currently `is_active=false` (frozen since 100K verify pass). |
| **W4** | `register_lead_to_event` RPC (migration `20260515094000_hotfix3_s1_5...sql` line 179) — `IF v_existing.status='invited' THEN ... promote to registered` | a lead with an existing 'invited' attendee row clicks the registration link | **Dead code after W3 removed.** Safe to leave (path becomes unreachable). Optional cleanup. |

## 3. READS / displays of `crm_event_attendees.status='invited'`

| # | Where | Today | Action after removal |
|---|---|---|---|
| R1 | `v_crm_event_stats` view (`total_registered` + `spots_remaining`) | excludes 'invited' since `M4_INVITED_GHOST_ATTENDEE_FIX` | dead-code after W3 stops writes; optional cleanup of view to drop the exclusion |
| R2 | `crm-event-register.js:35` `neq('status','invited')` (capacity count) | same exclusion | dead-code; optional cleanup |
| R3 | `crm-event-day-coupon.js:23-26` `COUPON_ALLOWED_ATTENDEE_STATUSES` includes 'invited' | currently allows manual coupon dispatch to invited-attendees | **REMOVE 'invited' from the array.** Once W3 stops writing, no row matches anyway. |
| R4 | `crm-leads-tab.js:319` query `.in('status', ['waiting_list','invited','registered'])` searches attendee rows for "moveable to another event" | uses attendee.status to find rows to move | **REMOVE 'invited' from the array.** |
| R5 | `supabase/functions/automation-engine/recipients.ts:154` cross_event_active_waitlist resolver `.in('status', ['waiting_list','invited'])` | finds attendees on OTHER events to invite to a parallel event | **REMOVE 'invited'.** Same idea in browser clone `modules/crm/crm-automation-recipient-resolvers.js:130`. |
| R6 | `event_status_close_recycle_leads_fn` trigger (migration `20260513122446...sql`) — recycles leads whose attendee row is `IN ('invited','attended')` when the event closes | recycles invited leads back to `waiting` when event closes | **REMOVE 'invited' from the IN list.** Becomes `IN ('attended')` only. |
| R7 | `sync_lead_status_from_attendee` RPC (migration `20260514193000...sql:57`) maps attendee `'invited'` → lead `'invited'` | reads attendee.status, writes lead.status | **Leave as dead-code.** Maps a value that won't exist after cleanup. Safe to leave or clean. |

## 4. References that are LEAD-level `invited` — KEEP intact

These mention `'invited'` but reference `crm_leads.status`, NOT `crm_event_attendees.status`:
- `modules/crm/crm-helpers.js:92` — `TIER2_STATUSES` LEAD label `הוזמן לאירוע`.
- `modules/crm/crm-rule-editor.js:46/50/294` — LEAD-level filter options in rule editor UI.
- `modules/crm/crm-leads-tab.js:279` — `(r.status === 'waitlist' || r.status === 'invited')` checks `crm_leads.status`.
- `modules/crm/crm-automation-post-actions.js:24-53` — `promoteWaitingLeadsToInvited` updates `crm_leads`.
- `modules/crm/crm-attendee-move.js:4` — comment references lead-side.
- `modules/crm/crm-event-register.js:55` — `ATTENDEE_ADD_STATUSES = ['waiting','waitlist','invited']` filters `crm_leads.status` (eligibility to be added as attendee).
- `supabase/functions/automation-engine/recipients.ts:23` — `TIER2_STATUSES = ["waiting","invited","confirmed","confirmed_verified"]` (LEAD statuses for tier2 audiences).
- `supabase/functions/automation-engine/dispatch.ts:7-8,110` — comments documenting lead-side promotion.
- `supabase/functions/lead-intake/dispatch.ts:156,161,167` — sets `crm_leads.status='invited'` after intake message.
- `crm-automation-engine.js:225` — comment on lead-side override behavior.

All KEEP. Lead-level `invited` is fully independent of the attendee-level cleanup.

## 5. Behavioral change — what `registration_open` does now vs after

**Today:**
1. Event status → `registration_open`.
2. Rule `"שינוי סטטוס: הזמנה חדשה"` fires.
3. Recipients = `tier2_excl_registered` (tier2 LEADS not already attendees).
4. Send `event_invite_new` template (SMS+email).
5. **`attendeeUpsert` writes attendee row `status='invited'` on the event** ← the row we're removing.
6. `trg_promote_lead_on_message_sent` trigger promotes lead.status `waiting → invited` (lead-side).

**After removal:**
1. Event status → `registration_open`. *(unchanged)*
2. Rule fires. *(unchanged)*
3. Recipients = `tier2_excl_registered`. *(unchanged)*
4. Send `event_invite_new` template. *(unchanged)*
5. **No attendee row created.** *(W3 removed from config)*
6. Lead promoted `waiting → invited`. *(unchanged — lead-level)*
7. Lead clicks registration link → `register_lead_to_event` RPC → attendee row created with status `registered` (normal flow).

Net result:
- Lead-level "invited" still tracks "we sent the invite, awaiting click".
- Attendee rows exist only for actual registrations.
- Events-list "נרשמו" column shows actual registered count, no "501/167" confusion.

## 6. Data-migration plan for the 177 existing `invited` attendee rows — Daniel decides

| Option | Effect | Pros | Cons |
|---|---|---|---|
| **A. Soft-delete** (`is_deleted=true`) | rows hidden from active queries; lead-side untouched | preserves audit trail; reversible; cleanest for active screens | rows still in table |
| **B. Hard-delete** | rows gone permanently | smallest table | no audit trail; FK ON DELETE behavior to verify |
| **C. Convert to `cancelled`** | rows visible as "cancelled attendees" on the event | shows operator the historical record on the event | may inflate "cancelled" count unhelpfully |

**Recommended: A (soft-delete).** Preserves audit trail; lead-side untouched; matches IR3 (soft delete only). The 167 on `V100K_EVENT_034` are sentinel test data (Daniel may want them hard-deleted as part of the larger 90K teardown — separate decision).

## 7. Phase 2 commit plan (after signoff)

| Commit | Contents | Tenant |
|---|---|---|
| 1 | Rule config update — drop `post_action_attendee_upsert` from the 2 rules (1 demo + 1 prizma) | demo+prizma (Daniel-authorized) |
| 2 | JS removal: R3 (coupon), R4 (move query), R5 (cross-event resolver in both EF + browser clone) | code only |
| 3 | EF redeploy: automation-engine new version with R5 cleanup | code only |
| 4 | Migration: `event_status_close_recycle_leads_fn` trigger body update (R6) | demo + prizma share schema |
| 5 | Data migration: soft-delete the 177 existing attendee rows (or per Daniel's choice in §6) | demo + prizma |
| 6 | Optional: view + RPC dead-code cleanup (R1, R2, R4-RPC, R7) | defer to Sprint 4 if not blocking |

## 8. Risks

1. **R2.2 + R2.4 rule descriptions** in `crm-automation-post-actions.js:99-103` say "Rule 2.2 (T5 sent → set attendee status to 'invited') and Rule 2.4 (parallel events)". The only active configuration today matching this pattern is the 2 `"שינוי סטטוס: הזמנה חדשה"` rules — both already disabled. If `parallel events` workflow (a rule with `recipient_type='cross_event_active_waitlist'`) is intended for future use, the post_action_attendee_upsert path itself is fine — we just won't configure 'invited' as the target status. Could use a new attendee status like `'invited_parallel'` or simply NOT create the attendee row.
2. **`trg_promote_lead_on_message_sent` migration** wasn't grepped; the trigger promotes LEAD-level waiting→invited. We don't touch it. Confirm via a Phase 2 pre-check.
3. **3 Prizma rows** with status='invited' may belong to closed/historical events; soft-delete is the lowest-risk choice.

## 9. STOP gate for Daniel signoff

Phase 1 deliverable complete. Awaiting Daniel's decision on:
1. **Data-migration option** (A soft-delete / B hard-delete / C cancelled).
2. **Approval to proceed to Phase 2.**
3. **Specific scope confirmation:** include optional dead-code cleanup (R1, R2 view+capacity, R4 RPC, R7) in Phase 2 OR defer to a separate Sprint-4 cleanup SPEC?

---
*End of Phase 1 findings.*
