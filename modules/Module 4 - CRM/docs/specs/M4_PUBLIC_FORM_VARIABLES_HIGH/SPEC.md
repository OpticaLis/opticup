# SPEC — M4_PUBLIC_FORM_VARIABLES_HIGH

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_PUBLIC_FORM_VARIABLES_HIGH/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — at the request of Daniel + Campaign Overseer
> **Authored on:** 2026-05-06
> **Module:** 4 — CRM
> **Phase:** post-cutover hotfix
> **Severity:** HIGH (customer-facing — every public form registration today renders broken date + time)

## 1. Goal

Fix two formatter bypasses in `supabase/functions/event-register/index.ts` that cause public-form registration confirmation messages to display raw ISO date (`2026-05-13`) and start_time-only (`09:00:00`) instead of the canonical DD/MM/YYYY date and `HH:MM - HH:MM` time range. Single Edge Function deploy; no schema changes; no client-side changes.

## 2. Background & Motivation

Phase 2 audit (PHASE2_REPORT T5-HIGH-1) confirmed:
- Customer A registers via CRM staff path (`register_lead_to_event` RPC) → confirmation SMS shows `📅 12/05/2026` ✅
- Customer B registers via public form (clicks SMS link → form → submit) → confirmation SMS shows `📅 2026-05-13` ❌
- Same template, same event, different ingress path.

Daniel-spotted (2026-05-06): the same broken event-register path also corrupts `%event_time%`. Customer A (CRM path) saw `09:00 - 13:00`; Customer B (form path) saw `09:00:00`.

**Root cause** (verified at code level):
1. `event-register/index.ts:251` — the SELECT for the event row fetches `start_time` but NOT `end_time`.
2. `event-register/index.ts:326-329` — the dispatched `variables` object pre-fills `event_date` and `event_time` from raw column values (`event.event_date` is PG `date` → ISO YYYY-MM-DD; `event.start_time` is PG `time` → `HH:MM:SS`).
3. `send-message/event-variables.ts` `injectEventVariables` is **caller-wins** (`if (vars.event_date == null)` and `if (vars.event_time == null)`) — when the caller already set the variable, the formatter is skipped.

The CRM staff path passes `variables: {}` (empty), so `injectEventVariables` runs the canonical formatters from the event row and produces the right strings. The public form path defeats it.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Branch state at end | `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | 1 | `git log origin/develop..HEAD --oneline \| wc -l` → 1 |
| 3 | EF deployed | `event-register` v14 (current is v13) | Supabase MCP `get_edge_function('event-register')` reports `version >= 14` |
| 4 | Source change scope | exactly 2 logical edits in `index.ts` (1 SELECT widen + 1 variables-object slim) | `git diff develop~1 develop -- supabase/functions/event-register/index.ts` shows ≤15 lines changed |
| 5 | E2E test on demo — date renders DD/MM/YYYY | confirmation SMS body matches `\d{2}/\d{2}/\d{4}` | `SELECT content FROM crm_message_log WHERE id={post-test-row-id}` |
| 6 | E2E test on demo — time renders HH:MM - HH:MM | confirmation SMS body matches `\d{2}:\d{2} - \d{2}:\d{2}` for events that have end_time set | same as #5 |
| 7 | E2E test on demo — time renders HH:MM only | when end_time is NULL, body matches `\d{2}:\d{2}` (no seconds, no dash, no double) | same |
| 8 | Whitelist enforcement during E2E | every fired message → phone `+972537889878`, email `daniel@prizma-optic.co.il` | `SELECT recipient_phone, recipient_email FROM crm_message_log WHERE id IN (...)` |
| 9 | Prizma writes during run | 0 | `SELECT COUNT(*) FROM crm_message_log WHERE tenant_id='{prizma}' AND created_at >= START_TIMESTAMP` → 0 |
| 10 | Integrity gate | `npm run verify:integrity` exit 0 or 2 | shell |
| 11 | No unsubstituted placeholder | E2E SMS bodies have 0 `%[a-z][a-z0-9_]*%` matches | grep |

## 4. Autonomy Envelope

### CAN do without asking
- Edit `supabase/functions/event-register/index.ts` per §8 (the 2 logical edits)
- Deploy the EF via Supabase MCP `deploy_edge_function` after edits
- Run E2E tests on demo tenant — create test lead with whitelist phone+email, click through the public form via Claude in Chrome OR direct EF POST simulating browser, capture confirmation message_log rows
- SELECT-only on prizma for sanity verification
- Soft-delete demo test data at end of run
- Commit + push to `develop`
- Update Module's CHANGELOG.md (single line) — and SESSION_CONTEXT.md if appropriate

### REQUIRES stopping
- Any prizma-tenant write
- Test-message firing to non-whitelist contact (whitelist: phone `0537889878` + email `daniel@prizma-optic.co.il`)
- Any second source-file edit beyond `event-register/index.ts` (if you find a related bug, log in FINDINGS, do not fix it here)
- DDL on either tenant
- Iron Rule 12 (file size) violation after edit — `event-register/index.ts` is currently 348 lines; this SPEC's edit nets out to ≈ -3 lines (removing 4 lines from variables object, adding 1 line to SELECT). Confirm post-edit length stays under 350.
- Merge to main
- Total runtime exceeding 90 minutes

## 5. Stop-on-Deviation Triggers

- E2E confirmation SMS still shows ISO date or `:SS` seconds in time → STOP, the fix is incomplete; do NOT redeploy speculatively
- `injectEventVariables` regression on CRM-staff path (T4-style flow) — if `event_date` or `event_time` still renders correctly there → continue; if it BREAKS → revert immediately
- Prizma write attempt → STOP, log CRITICAL incident, revert if needed
- EF deploy fails — retry once; second failure → STOP and log F-finding (Phase 1 OPEN-021 documents Supabase deploy flakiness; do not loop)

## 6. Rollback Plan

- Single commit; `git revert {hash}` reverts the source change
- EF rollback: redeploy previous version (the last v13 source) via Supabase MCP — current code is in git at HEAD~1 after the fix commit lands
- Demo cleanup: soft-delete test leads via `UPDATE crm_leads SET is_deleted=true WHERE tenant_id={demo} AND phone='+972537889878' AND created_at >= START_TIMESTAMP`

## 7. Out of Scope (DO NOT touch)

- T14-CRIT-1 (unsubscribe suppression) — separate SPEC will own
- G-CRIT-1/2/3 (tenant isolation) — separate SPEC will own
- G-CRIT-4 / hardcoded Prizma — separate SPEC will own
- Any change to `send-message/event-variables.ts` — the formatter is correct; the caller is the bug
- Any change to `register_lead_to_event` RPC — the RPC path works correctly
- Any storefront repo change
- Any other Edge Function

## 8. Expected Final State

### Modified file: `supabase/functions/event-register/index.ts`

**Edit A** — line 251 (the event SELECT inside `Promise.all`):
- BEFORE: `.select("id, status, name, event_date, start_time, location_address")`
- AFTER:  `.select("id, status, name, event_date, start_time, end_time, location_address")`
- (Even though we're going to STOP using these fields directly, fetching `end_time` is harmless and may be useful elsewhere in the function for future logic. Cheapest, safest delta.)

**Edit B** — lines 320-329 (the `variables` object passed to `dispatchRegistrationMessages`):
- BEFORE:
```ts
const variables: Record<string, string> = {
  name: lead.full_name || "",
  phone: lead.phone || "",
  email: lead.email || "",
  lead_id: body.lead_id!,
  event_name: event.name || "",
  event_date: event.event_date || "",
  event_time: event.start_time || "",
  event_location: event.location_address || "",
};
```
- AFTER (REMOVE the 4 event_* prefills — let `injectEventVariables` populate them with proper formatters from the event row):
```ts
const variables: Record<string, string> = {
  name: lead.full_name || "",
  phone: lead.phone || "",
  email: lead.email || "",
  lead_id: body.lead_id!,
};
```

That's it. After Edit B, `dispatchRegistrationMessages → send-message → injectEventVariables` will:
- Format `event_date` from `event.event_date` (ISO) → DD/MM/YYYY (line 79-81 of event-variables.ts)
- Format `event_time` from `event.start_time` + `event.end_time` → `HH:MM - HH:MM` or `HH:MM` (lines 83-92 of event-variables.ts)
- Substitute `event_name` and `event_location` from event row

### EF deploy: `event-register` v14 deployed.

### Modified docs (1 single-line append each)
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — append a hotfix line under today's date
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — single-line update if active

### NOT modified
- `MODULE_MAP.md` (no new functions or files)
- `GLOBAL_MAP.md` / `GLOBAL_SCHEMA.sql` (no schema change)
- `MASTER_ROADMAP.md` (no phase status change)

## 9. Commit Plan

ONE commit:
- `fix(crm): event-register passes empty event_* vars so formatter renders DD/MM/YYYY + HH:MM-HH:MM (M4_PUBLIC_FORM_VARIABLES_HIGH)`
  - `supabase/functions/event-register/index.ts` (Edit A + Edit B)
  - `modules/Module 4 - CRM/docs/CHANGELOG.md` (append line)
  - `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` (if updated)

Push to `origin/develop`. Do NOT merge to main — Daniel handles main merges (Iron Rule 9.7).

## 10. Dependencies / Preconditions

- Branch `develop`, clean
- Supabase MCP available (`deploy_edge_function`, `execute_sql`)
- Claude in Chrome MCP available (for E2E browser test)
- Demo tenant accessible — login PIN `12345`
- Whitelist contacts available: phone `0537889878`, email `daniel@prizma-optic.co.il`
- An `event-register` test event must exist on demo with status `registration_open` AND `end_time IS NOT NULL` (preferred) AND another test event with `end_time IS NULL` (so we can verify both branches of the formatter)
  - If neither exists: create them as part of E2E setup (don't trigger any messaging during create), use any name pattern starting with `M4_FMTFIX_`. Soft-delete at end.

## 11. Lessons Already Incorporated

- **From `M4_OVERNIGHT_AUDIT/PHASE2_REPORT.md` T5-HIGH-1:** the bug + root cause were already diagnosed at code level by the Overseer. This SPEC implements the recommended fix verbatim.
- **From Daniel directive 2026-05-06:** the same caller-wins bypass also breaks `%event_time%`. Edits A+B together fix both variables in one commit.
- **From `feedback_test_phone_numbers.md`:** real SMS fires on demo. Whitelist enforcement in §3 #8.
- **From `feedback_production_discipline_post_cutover.md`:** prizma is live. §3 #9 hard-gates prizma writes.
- **From `feedback_clean_repo_in_specs.md`:** §3 #1 enforces clean tree at end.
- **From CLAUDE.md Iron Rule 12:** §4 stop-trigger guards the file-size cap (post-edit length must stay <350).
- **Pattern P12 (loud failure on missing payment_url) is preserved** — this SPEC does not touch payment-url logic.

**Cross-Reference Check (Step 1.5):** This SPEC introduces ZERO new code names. It widens an existing SELECT and removes 4 keys from an existing object. No new tables, columns, RPCs, functions, files, T-constants, FIELD_MAP entries, or config keys. Cross-reference sweep: 0 collisions, 0 hits.

## 12. QA Plan

After EF deploy, before marking SPEC closed:

1. Pre-flight: confirm whitelist demo lead exists with phone `+972537889878`, email `daniel@prizma-optic.co.il`. Soft-delete + recreate if needed.
2. Pre-flight: confirm 2 test events exist on demo:
   - Event A: status=`registration_open`, end_time IS NOT NULL (e.g., `start_time=09:00:00`, `end_time=13:00:00`)
   - Event B: status=`registration_open`, end_time IS NULL (just `start_time=10:00:00`)
3. **Test 1 — Event A (with end_time):**
   - From the demo CRM "incoming/waiting" tab, find the test lead and trigger an `event_invite_new` SMS for Event A (or use the existing automation — whichever is fastest)
   - Click the registration link in the received SMS (Claude in Chrome) → form loads → submit
   - Capture the resulting `event_registration_confirmation_sms_he` message_log row
   - Assert: body contains `\d{2}/\d{2}/\d{4}` (DD/MM/YYYY) AND `\d{2}:\d{2} - \d{2}:\d{2}` (HH:MM - HH:MM with end_time)
4. **Test 2 — Event B (no end_time):**
   - Same flow targeting Event B
   - Assert: body contains DD/MM/YYYY AND `\d{2}:\d{2}` only (no dash, no `:SS`)
5. **Regression check — CRM-staff path:**
   - From CRM staff UI on demo, register the same lead to Event A via `register_lead_to_event`
   - Capture confirmation message
   - Assert: body still renders DD/MM/YYYY + HH:MM - HH:MM (formatter still works for the path that already worked)
6. Cleanup: soft-delete test leads + test events created during this run.
7. Verify §3 success criteria #1-#11.

If any test fails → revert the commit (rollback plan), do NOT redeploy speculatively.

*End of SPEC.*
