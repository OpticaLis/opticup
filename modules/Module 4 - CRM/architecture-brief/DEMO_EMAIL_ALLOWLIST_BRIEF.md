# Demo Tenant — Email Allowlist Infrastructure + Population

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 4 — CRM (with Edge Function impact on M12-relevant infra)

---

## 1. Purpose

Predecessor SPEC `DEMO_WHITELIST_UPDATE` discovered that demo's SMS allowlist was already correctly configured, but **no email allowlist mechanism exists** in the architecture. Email-channel outbound from any tenant is currently uncontrolled.

Daniel approved 2026-05-11 to add the email allowlist via Option 2 (jsonb in `ui_config`) — minimal disruption, no schema change, follows existing pattern of tenant-specific config under `ui_config`.

Goal: add `ui_config.test_mode_email_allowlist` infrastructure, wire it into the email-sending codepath, populate demo's value with Daniel's 3 emails. Prizma's `ui_config` stays untouched (no email allowlist there = current behavior of "all emails go through" preserved for production).

## 2. Scope — In

### A. Edge Function modification

Find the Edge Function (or RPC, or send-message wrapper) that emits email. Likely `send-message` EF based on auto-memory `project_messaging_architecture_v2.md`. The change:

- Before sending an email, read `tenant.ui_config.test_mode_email_allowlist` (jsonb array of strings).
- If the array exists AND is non-empty: only send to recipients whose email is in the array. Drop any recipient not in the list. Log dropped recipients in `activity_log` (or wherever the existing SMS allowlist logs them — keep parity with SMS behavior).
- If the array does not exist OR is empty: send normally (no filtering — current Prizma behavior preserved).

**This matches the existing SMS allowlist contract** (`test_mode_sms_allowlist` column + send-message EF logic). The email version uses jsonb-in-ui_config instead of a top-level column — that's the only structural difference.

### B. Demo tenant row UPDATE

```sql
UPDATE tenants
SET ui_config = jsonb_set(
  COALESCE(ui_config, '{}'::jsonb),
  '{test_mode_email_allowlist}',
  '["danylis92@gmail.com", "daniel@prizma-optic.co.il", "alkimovich94@gmail.com"]'::jsonb
)
WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

Capture pre-value in DIAGNOSIS.md for rollback reference.

### C. Documentation

- Add an entry to `docs/GLOBAL_SCHEMA.sql` (or wherever the `ui_config` shape is documented) describing the new `test_mode_email_allowlist` key.
- Update `tenants.ui_config` shape docs if maintained anywhere.
- DECISIONS_LOG entry with the design choice rationale (Option 2 over 1 or 3).

## 3. Scope — Out

- Touching Prizma's `ui_config` — read-only inspection only
- Schema changes (no ADD COLUMN)
- Adding SMS allowlist for Prizma or removing for demo
- Modifying other Edge Functions (only the one that sends email)
- Refactoring the SMS allowlist logic (out of scope — leaves it as-is)
- Migrating other tenants to email allowlist (only demo gets a value; others stay default-no-filter)
- Validation UI in tenant config — out of scope

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Use `ui_config.test_mode_email_allowlist` (jsonb), NOT a new column | Architect 2026-05-11 (Option 2) |
| 2 | Match SMS allowlist contract: empty/missing = send to all; non-empty = filter to list | Architect — parity with existing pattern |
| 3 | Only demo gets a populated value in this SPEC; Prizma stays untouched (current behavior) | Daniel 2026-05-11 (Prizma hands-off) |
| 4 | Log dropped recipients to same destination as SMS allowlist drops (likely `activity_log`) | Architect — parity |
| 5 | Continuous-Run Mandate | Daniel 2026-05-11 |

## 5. Pre-Flight Diagnostic

Before any code change, the Pipeline confirms:
1. Which Edge Function (or RPC) emits email today. Search `supabase/functions/` for `sendEmail`, `email`, `smtp`, etc.
2. How the existing SMS allowlist is enforced — find that codepath as the pattern to mirror.
3. Where dropped-recipient logging goes (activity_log table? console log? telemetry?).
4. Current `ui_config` shape for demo and Prizma (read-only).

Findings → `DIAGNOSIS.md`.

## 6. Quality Bar — Acceptance Criteria

1. `DIAGNOSIS.md` documents the email-sending codepath, the SMS allowlist mirror pattern, and current `ui_config` shape for both demo and Prizma.
2. Edge Function code change: email-sending now respects `ui_config.test_mode_email_allowlist`.
3. EF redeployed successfully.
4. Demo's `ui_config.test_mode_email_allowlist` contains exactly: `["danylis92@gmail.com", "daniel@prizma-optic.co.il", "alkimovich94@gmail.com"]` (verify via SELECT).
5. Prizma's `ui_config` is unchanged — verified by comparing pre-snapshot to post-snapshot. Critically: Prizma does NOT get the new key (its absence preserves current behavior of "send to all").
6. `docs/GLOBAL_SCHEMA.sql` updated with the new key (or equivalent docs).
7. `npm run verify:integrity` exit 0.
8. `npm run smoke` 7/7 PASS.
9. Working tree clean. Pushed to `origin/develop` (NOT main).
10. DECISIONS_LOG entry written.

## 7. Destructive Operations

Declared:
- **EF code change + redeploy** for the email-sending function (one specific EF)
- **One single-row UPDATE on `tenants`** for demo only (jsonb_set on `ui_config`)
- **Documentation file edit** for `docs/GLOBAL_SCHEMA.sql` (non-destructive but flagged)

Forbidden:
- ANY UPDATE on Prizma's tenants row
- ANY schema change (ADD COLUMN, ALTER TABLE, DROP)
- ANY DELETE
- Force-push
- Merge to main
- Sending any live test email during the SPEC

## 8. Continuous-Run Mandate

Run in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- Email-sending codepath cannot be located (escalate with findings)
- SMS allowlist pattern is structurally different from what we expect (escalate to confirm mirror is correct)
- A success criterion that cannot be met

## 9. Anti-Patterns

- DO NOT add a column to `tenants` table — use ui_config jsonb path
- DO NOT touch Prizma's row
- DO NOT modify the SMS allowlist logic — leave it as-is
- DO NOT add validation UI in this SPEC — backend mechanism only
- DO NOT send a real email to verify — verification is via SELECT + reading EF code, not via outbound traffic

## 10. References

- Predecessor SPEC: `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/`
- Predecessor ESCALATION.md (which surfaced the 3 options)
- Auto-memory `project_messaging_architecture_v2.md` — Make-as-pipe + send-message EF
- Auto-memory `project_cutover_complete_2026_05_03.md` — C-001 SMS allowlist removal context
- `tenants` table — `test_mode_sms_allowlist` column (existing pattern to mirror)

---

*End of brief.*
