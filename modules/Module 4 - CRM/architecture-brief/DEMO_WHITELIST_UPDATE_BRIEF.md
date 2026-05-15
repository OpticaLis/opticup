# Demo Tenant — Whitelist Update for Manual Test Cycle

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

Daniel is about to run his manual test cycle on the newly-provisioned demo storefront. Outbound SMS/Email from demo tenant must be restricted to Daniel's own contact channels — preventing any accidental message to real people during testing.

The infrastructure for this already exists (`tenants.test_mode_sms_allowlist`, added 2026-05-03 in SPEC C-001 before Prizma cutover). This SPEC populates the demo row with Daniel's whitelist.

## 2. Scope — In

ONE row UPDATE on demo's tenant config, populating:

**Phone whitelist (3 numbers):**
- `0537889878`
- `0503348349`
- `0507168471`

**Email whitelist (3 addresses):**
- `danylis92@gmail.com`
- `daniel@prizma-optic.co.il`
- `alkimovich94@gmail.com`

Target tenant: demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`).

## 3. Diagnostic First — Find the Exact Field Names

The exact column/JSON-path for the SMS whitelist + Email whitelist must be confirmed before the UPDATE. Likely locations:
- `tenants.test_mode_sms_allowlist` (added by C-001)
- `tenants.test_mode_email_allowlist` (if exists — may not; check)
- `tenants.ui_config -> 'whitelist'` (alternate structure)
- A dedicated table like `tenant_test_allowlists` (less likely)

The Pipeline runs read-only diagnosis FIRST to confirm:
1. What field holds the SMS whitelist for demo's row today
2. Whether an equivalent email whitelist field exists, OR whether email whitelisting is done differently (e.g., via a separate config key, OR via send-message EF conditional logic, OR not at all)
3. Current values in both fields for demo
4. Current values in both fields for Prizma (read-only — to understand the shape; will NOT be modified)

Diagnosis written to `DIAGNOSIS.md`. **If email whitelist mechanism doesn't exist, escalate to Architect** with options (add column / add JSON key / out-of-scope-for-now).

## 4. Fix Strategy

After diagnosis, apply ONE UPDATE per whitelist type:

```sql
UPDATE tenants
SET test_mode_sms_allowlist = ARRAY['0537889878', '0503348349', '0507168471']
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Email update similar, in whatever field/path the diagnosis identified.

If both whitelist types use a JSONB structure, may be a single UPDATE using `jsonb_set` twice.

Capture pre-values BEFORE the UPDATE — write to DIAGNOSIS.md for rollback reference.

## 5. Scope — Out

- ANY change to Prizma's tenants row — read-only inspection only
- Changes to send-message Edge Function or any other code path
- Schema changes (ADD COLUMN) — if email whitelist field doesn't exist, ESCALATE, don't auto-add
- Adding contacts beyond the 3 phones + 3 emails listed in §2
- Removing contacts already present (if Daniel's email is already there for some reason, leave it; this UPDATE is additive-effect via list replacement)

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Phones: 3 numbers exactly as Daniel listed | Daniel 2026-05-11 |
| 2 | Emails: 3 addresses exactly as Daniel listed | Daniel 2026-05-11 |
| 3 | Only demo tenant is updated; Prizma untouched | Daniel 2026-05-11 (Prizma hands-off policy) |
| 4 | Diagnose first to confirm field shapes; UPDATE second | Architect 2026-05-11 |
| 5 | If email whitelist mechanism doesn't exist → escalate, don't auto-create schema | Architect 2026-05-11 |
| 6 | Continuous-Run Mandate, single chat | Daniel 2026-05-11 |

## 7. Quality Bar — Acceptance Criteria

1. `DIAGNOSIS.md` documents the exact field paths for SMS + Email whitelist, and demo's pre-UPDATE values.
2. Demo's SMS whitelist now contains exactly the 3 numbers Daniel listed (verify via SELECT).
3. Demo's Email whitelist now contains exactly the 3 emails Daniel listed (verify via SELECT) — IF the mechanism exists. If escalated, decision logged.
4. Prizma's row is untouched (compare updated_at before/after).
5. No code changes (no EF changes, no RPC changes).
6. `npm run verify:integrity` exit 0.
7. Working tree clean. Pushed to `origin/develop` (NOT main).
8. DECISIONS_LOG entry with the values applied.

## 8. Destructive Operations

Declared:
- **One single-row UPDATE on `tenants`** for demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) modifying the SMS whitelist field
- **POSSIBLY one more single-row UPDATE** on the same row for the Email whitelist field (if mechanism exists)

Forbidden:
- ANY UPDATE on Prizma's tenants row
- ANY schema change (ALTER TABLE, ADD COLUMN, DROP COLUMN)
- ANY DELETE
- ANY code changes
- Force-push
- Merge to main
- Sending any live message to verify

## 9. Continuous-Run Mandate

Run in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- Email whitelist mechanism doesn't exist (planned escalation)
- Discovery that Prizma row would need to be modified for any reason (would be a stop trigger)

## 10. Anti-Patterns

- DO NOT update Prizma's row under any circumstance
- DO NOT add new schema (columns / tables) without escalation
- DO NOT modify send-message Edge Function or any other code
- DO NOT send a test message to verify — the verification is via SELECT, not via outbound traffic
- DO NOT merge to main

## 11. References

- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Auto-memory `feedback_test_phone_numbers.md` — the test-phone discipline (the 3 numbers here include the original 2 + a new one Daniel approved)
- Auto-memory `project_cutover_complete_2026_05_03.md` — context on C-001 SMS allowlist removal from Prizma
- Pattern reference: `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md` (similar diagnostic-first pattern just used)

---

*End of brief.*
