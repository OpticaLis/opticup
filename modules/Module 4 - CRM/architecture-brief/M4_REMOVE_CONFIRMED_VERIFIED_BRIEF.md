# M4 Remove confirmed_verified Status — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~30-45 min)
**Model preference:** Sonnet (small, well-scoped status cleanup)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

`confirmed_verified` is a dead lead status — a vestige from the era when the team manually verified arrivals by phone after initial confirmation. Daniel confirmed (chat 2026-05-14) that the workflow was replaced by booking-fee deposits (`booking_fee`), making the second-stage verification unnecessary. Live count: 7 leads in `confirmed`, 0 leads in `confirmed_verified`.

Status Model documentation Finding F1 also surfaced: the `sync_lead_status_from_attendee` RPC maps `attendee.status='purchased'` → `lead.status='confirmed_verified'`, but no code actually writes `purchased` to attendee.status today. This mapping is dead.

This Brief authorizes:
1. Removing the `confirmed_verified` lead-status row from `crm_statuses` (soft-deactivate to preserve history, not hard DROP).
2. Removing the `purchased → confirmed_verified` mapping branch from `sync_lead_status_from_attendee`.
3. Daniel's future intent — a dedicated "purchaser" status — is NOT in scope here. Architect+Daniel will design that separately.

---

## 2. Daniel's Locked Decisions (chat 2026-05-14)

| # | Topic | Decision |
|---|---|---|
| 1 | confirmed_verified | Remove (set is_active=false). Was second-stage verification; replaced by booking-fee deposits. |
| 2 | The `purchased → confirmed_verified` mapping in sync RPC | Drop the mapping branch (Option A). A dedicated "purchaser" status is future work. |
| 3 | Hard DROP from crm_statuses? | NO. Set is_active=false. Preserves history; allows the row to remain for any historical analytics. |
| 4 | Backfill any leads currently at confirmed_verified? | N/A — count is 0 on Prizma and Demo. No backfill needed. |

---

## 3. Scope

### 3.1 Soft-deactivate confirmed_verified
- `UPDATE crm_statuses SET is_active=false WHERE slug='confirmed_verified' AND entity_type='lead'` on BOTH Prizma and Demo.
- Pre-flight: confirm 0 leads carry `status='confirmed_verified'` on both tenants. If any → STOP, that's the pre-condition that doesn't hold.

### 3.2 Drop the dead mapping in sync_lead_status_from_attendee RPC
- Inspect current RPC body via `pg_get_functiondef`.
- Remove the branch that maps `attendee.status='purchased'` → `lead.status='confirmed_verified'`.
- Decision per Brief §2 #2: when this branch is removed, the RPC's default fallback (likely "no change" or "lowest-precedence active") will apply. Pipeline confirms the post-change RPC behavior is sensible.
- Test the RPC logic in demo BEFORE applying to Prizma: simulate `purchased` attendee → confirm lead.status no longer flips to dead slug.

### 3.3 Update TIER2_STATUSES in crm-helpers.js
- Remove 'confirmed_verified' from the JS array.
- This is the source of the dropdown content. After removal, the UI dropdown will no longer show "אישר ווידוא" as an option.

### 3.4 Cross-asset grep
- After removing from the 3 locations above, grep the project for any remaining `'confirmed_verified'` string references. Flag in FINDINGS if found. Pipeline judges whether to fix in-SPEC or defer.

---

## 4. Safety Envelope

### 4.1 Safety tag
First action:
```
git tag -a pre-m4-remove-confirmed-verified-2026-05-14 -m "Pre-remove-confirmed-verified baseline"
git push origin pre-m4-remove-confirmed-verified-2026-05-14
```

### 4.2 DDL — pre-approved
- ONE RPC body rewrite: `CREATE OR REPLACE FUNCTION sync_lead_status_from_attendee ...` with the mapping branch removed. Same signature, same return type, same RLS posture.
- NO other DDL.

### 4.3 Data writes — pre-approved
- 2 row UPDATEs on `crm_statuses` (one per tenant: Prizma + Demo). Both set `is_active=false` on the single `confirmed_verified` row of `entity_type='lead'`.
- NO writes to `crm_leads` (0 affected leads — confirmed pre-flight).

### 4.4 Rollback
- The master safety tag is the repo rollback.
- DB rollback for §3.1: `UPDATE crm_statuses SET is_active=true WHERE slug='confirmed_verified' AND entity_type='lead'`.
- DB rollback for §3.2: re-apply the original RPC body (captured in EXECUTION_REPORT.md §2).

### 4.5 No merges to main
- Daniel handles PR.

### 4.6 Commit budget
- 2-3 commits expected. Cap at 4.

### 4.7 Stop triggers
- Pre-flight: any lead carries `status='confirmed_verified'` → STOP, the assumption that the slug is unused is wrong; needs Daniel review.
- Demo smoke: sync RPC behavior on `purchased` attendee produces an unexpected lead.status outcome → STOP, surface to Foreman.
- Cross-asset grep §3.4: more than 5 string-reference hits → STOP, scope grew beyond hygiene.

---

## 5. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model.

---

## 6. Smoke

On Demo:
1. Pre-state: 0 leads at confirmed_verified, status row is_active=true.
2. Apply §3.1 → confirm is_active=false. UI dropdown (if testable via Chrome MCP or grep alone) no longer shows the option.
3. Apply §3.2 → simulate calling sync_lead_status_from_attendee on a test scenario. Confirm no error and no `confirmed_verified` output.
4. Apply §3.3 → grep confirms removal from helper, no other JS references remain.

On Prizma after Demo green:
1. Pre-state: 0 leads at confirmed_verified (already verified).
2. Apply §3.1 → confirm is_active=false. No lead.status changes.
3. RPC was already updated via apply_migration; no second apply needed.

---

## 7. Communication

English status updates between phases. ONE concise English summary at end:
- Confirmed_verified row state on both tenants (active=false).
- RPC body diff: which branch was removed.
- TIER2_STATUSES array post-state.
- Cross-asset grep results.
- Demo smoke results.
- Ready for develop→main PR.

---

*End of Brief. Activation prompt at `M4_REMOVE_CONFIRMED_VERIFIED_ACTIVATION_PROMPT.md`.*
