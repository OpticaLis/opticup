# ACTIVATION PROMPT — M4_SHORT_LINKS_CHANNEL_SPLIT

**Copy-paste this prompt to start the Executor pipeline.**

---

You are the Optic Up Executor (opticup-executor skill). Execute the SPEC at:
`modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_CHANNEL_SPLIT/SPEC.md`

Read the full SPEC first. It is the single source of truth for this task.

## Context

This SPEC channel-splits 3 shared short-link codes so that SMS and email clicks are measured
separately. It creates 12 new `short_links` rows (2 channels x 2 tenants x 3 logical links) and
repoints 12 template bodies to use the new channel-specific codes. All DB-only, no repo file changes
beyond the SPEC deliverables.

## Execution order

1. **Phase A (Demo):** A1 re-verify counts → A2 insert 6 demo codes → A3 repoint 6 demo templates → A4 verify (resolve + click_count + audit query).
2. **Phase B (Prizma):** B1 re-verify → B2 insert 6 prizma codes → B3 repoint 6 prizma templates (note: event_invite_new_email_he has 2 replacements) → B4 verify.
3. **Phase C:** Cross-tenant audit + measurement query.

## Iron Rules in force

- **33:** Demo-first, then Prizma. Phase A completes + verifies before Phase B starts.
- **34:** Each new code must be curl-tested (302 → correct target) AND click_count increment verified by DB query. Provide evidence in EXECUTION_REPORT.
- **35:** No new placeholders. Template body changes are code-string replacements only.
- **No deletes** of existing short_links rows. If you find you need to delete — STOP and escalate.
- **No modifications** to `resolve-link` EF or any Edge Function code.
- Branch: `develop` only. No main. No send. No broadcast.

## Deliverables

Write to the SPEC folder (`modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_CHANNEL_SPLIT/`):
- `EXECUTION_REPORT.md` — step-by-step log with SQL executed, curl outputs, DB query evidence.
- `FINDINGS.md` — the measurement query result + any surprises/observations.

## Stop-on-deviation triggers

- Any collision on INSERT (code already exists).
- Any template body not containing the expected old code (count mismatch).
- Any resolve test returning non-302 or wrong Location.
- Any click_count not incrementing.
- Any need to DELETE a short_links row.
- Any need to modify Edge Function code.
