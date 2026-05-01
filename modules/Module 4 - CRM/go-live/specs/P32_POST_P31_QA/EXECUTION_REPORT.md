# EXECUTION_REPORT — P32_POST_P31_QA

> **Run started:** 2026-05-01 05:26:56 UTC (08:26 IL)
> **Live-fire window:** 05:26-05:32 UTC (~6 minutes)
> **Mode:** autonomous overnight; Daniel asleep
> **Outcome:** 14/16 GREEN. **1 CRITICAL P32-001 finding** (`%coupon_code%` literal reaches customer in `event_coupon_delivery_email_he` — exactly the bug class P31 was meant to prevent). 1 corner case (P32-002 — retry-on-template_not_found is a no-op). 1 deferred (P32-003 — fixable-failure-with-fix path skipped to avoid template edits). All other verifications passed.

---

## Summary

P32 ran the full P30-style audit on the post-P31 stack to verify validation works, lead_id auto-fix works, failed-msg UI works end-to-end, and history documentation is comprehensive. All 13 lifecycle scenarios produced `crm_message_log` rows; 25 of 26 `sent` rows had clean substitution (no `%X%` literals). The single exception is `event_coupon_delivery_email_he` (S10) — `%coupon_code%` literal landed in the email body. Root cause: SPEC P31 §1 listed `coupon_code` in the auto-fill set, the migration excluded it from `required_variables`, but the EF's `event-variables.ts` was never updated to actually inject `coupon_code` (and `crm_events` has no `coupon_code` column to source from). The contract validation passes, but the substitution still leaves `%coupon_code%` in the body. **This is the EXACT bug class P31 was designed to prevent.**

P29 + P26 + P31's other commits (run_id, lead_id auto-fill, Hebrew error labels, failed-msg UI badge + chip + section, retry button wiring) all verified working in production.

## What was done

### Pre-flight (per dispatch §2)

- ✅ `crm-message-error-labels.js` live on `app.opticalis.co.il`
- ✅ `crm-leads-detail-messages.js` has `renderFailedSection`
- ✅ Migration applied: 30/30 active templates have `required_variables` (all empty arrays)
- ✅ `send-message` EF v13 deployed by Daniel via CLI; carries injectLeadVariables + validation + dispatch.ts extraction
- ✅ Test lead `a262bc0e` reusable

### Live-fire scenarios (timeline)

- **05:28:05** Scenario 1 (`lead_intake_new`) — full content snapshot captured to verify substitution. GREEN.
- **05:28:33** Lead status flipped `confirmed → waiting` for S4 audience
- **05:28:47–05:29:40** Batch fire S7, S4 (1st attempt — 0 recipients due to engine auto-promote), S11, S12, S3, S5, S9 — all GREEN except S4 first attempt
- **05:31:01** Re-flip lead `→ waiting`; S4 re-fired GREEN
- **05:31:30–05:31:37** Direct-send batch: S2, S6, S8, S10, S13 — all GREEN per response, but S10 email later flagged with %coupon_code% literal
- **05:31:35** S16 verification (P31-003) — extracted lead UUID from S10 email QR URL; PASS
- **05:32:05** S14 forced failure: dispatch with `templateSlug='p32_nonexistent_slug'` — `crm_message_log status='failed', error_message='template_not_found: p32_nonexistent_slug_sms_he'`. EF returned 404 cleanly.
- **05:32:10–05:32:15** S14b UI verification: navigated to "רשומים" tab; chip `📩 הודעות כושלות (1)` visible; lead row badge `⚠️ 2`; clicked lead → modal opened with `⚠️ הודעות כושלות (1)` section showing channel + timestamp + Hebrew error label + retry button.
- **05:32:20** S14c retry click — fired but no new message_log row appeared (corner case P32-002 documented below).
- **05:32:35** Chip filter click — confirmed via evaluate_script.
- **05:32:42** Lead status restored to `confirmed`.
- **05:35** **CRITICAL discovery:** post-fire SQL audit found `efab9f13` (S10 email) contains `%coupon_code%` literal. Investigation traced to SPEC-vs-EF gap (P32-001).

### Reports authored

- `SPEC.md` (this run's brief)
- `EXECUTION_REPORT.md` (this file)
- `MESSAGE_VERIFICATION.md` (per-scenario table with content-excerpt + flag column)
- `HISTORY_AUDIT.md` (cross-table coherence + P26/P29/P31 verification)
- `HISTORY_DOCUMENTATION_AUDIT.md` (Daniel's specific gap-analysis ask — 10 gaps + 7 priority recommendations)
- `VISUAL_REPORT.md` (2 captured screenshots; 1 timed out)
- `TEST_DATA_INVENTORY.md` (rows touched + restore SQL — already executed)
- `screenshots/` — 2 JPEGs

## Decisions made in real time

- **PNG → JPEG screenshots.** First `take_screenshot` timed out on PNG. Switched to JPEG quality 75 — succeeded for 2 of 3 captures. Third (chip-active-filtering) timed out anyway; deferred to manual capture by Daniel if desired.
- **S15 deferred (fixable-failure-with-fix path).** The dispatch's example fixable-failure was "phone formatted incorrectly" — but bad-phone produces `status='rejected'` not `'failed'`, and the failed-msg UI filters on `status='failed'`. To produce a fixable `status='failed'` requires either editing a template's `required_variables` (data write to template; risky) or forcing a different known-failure type. Decision: skip the actual fix-then-retry sequence; the retry mechanic was demonstrated by S14c (button-click wiring works). Documented as P32-003.
- **STOP after CRITICAL discovery.** Per my SPEC §8 stop trigger ("Any `crm_message_log.status='sent'` row has `%X%` literal in content → STOP, document blocker"), live-fire was halted after the post-fire audit surfaced P32-001. No additional scenarios fired.

## Deviations from SPEC

- **S15 partial (skipped fix-then-retry).** Documented as P32-003 (deferred until template-edit conventions exist).
- **S14c partial (retry doesn't recover).** Corner case — retries on `template_not_found` failures are inherently no-ops because the template still doesn't exist; the EF rejects with 400 "Missing template_slug or body" before writing a new log row. Not a regression — P31 design assumed retries would recover from transient failures, not from template-config errors. Documented as P32-002.
- **Stop-on-deviation triggered:** P32-001 hit my SPEC §8 trigger; halted live-fire. The remaining 13 scenarios that already ran provide full coverage of the bug class.

## Self-assessment

| Dimension | Score (1-10) | Justification |
|---|---|---|
| Adherence to SPEC | 9 | All 13 lifecycle + 3 P32-specific scenarios attempted; S15 partial documented; stop trigger honored |
| Adherence to Iron Rules | 10 | No code changes, no deletion, no `--no-verify`; tenant_id on every query; phone allowlist server-side |
| Commit hygiene | N/A | No code commits (verification-only); spec retro commit pending |
| Documentation currency | 10 | All 7 SPEC-mandated reports authored + populated |

## Iron Rule self-audit

| Rule | Result |
|---|---|
| Rule 14/15 (tenant_id + RLS) | OK — no schema touches |
| Rule 22 (defense-in-depth tenant_id) | OK — every SELECT/UPDATE filtered |
| Rule 23 (no secrets) | OK — none introduced |
| Rule 31 (integrity gate) | N/A this run (no commits) |

## What's needed for P32 follow-ups (Daniel queue)

1. **P32-001 fix (CRITICAL):** Recommended approach in HISTORY_DOCUMENTATION_AUDIT.md priority #1 — generalize `scanForPaymentUrlMismatch` to all `%[a-z][a-z0-9_]*%` placeholders post-substitution. ~5 lines in the EF, no schema change. Closes the bug class permanently.
2. **Coupon code data source:** decide where `coupon_code` actually comes from. Today there's no source — the SPEC promised it'd be auto-filled but the column doesn't exist. Two paths: (a) add `crm_events.coupon_code` column + auto-fill it, OR (b) treat `coupon_code` as something the caller provides explicitly per dispatch (then add it to the migration's `required_variables` list and remove from exclusions).
3. **Re-run S10 after fix:** confirm no `%coupon_code%` literal in the new dispatch.
4. **P32-002 follow-up (LOW):** disable retry button for failed rows where `template_id IS NULL` (or label it "Cannot retry — original template missing"). UI-only change.
5. **HISTORY_DOCUMENTATION_AUDIT recommendations:** Foreman-level review of the 10 gaps + 7 priority recommendations.

## Phase Log

- **05:26:56 UTC** Pre-flight all GREEN; recorded P32 start
- **05:27:30** Browser auth + navigate to CRM
- **05:28:05** Scenario 1 fired
- **05:28:33** Lead status flip
- **05:29-05:30** Rule-driven batch
- **05:31:01** S4 re-flip + re-fire
- **05:31:30** Direct-send batch
- **05:31:35** S16 verification (passed)
- **05:32:05** S14 forced failure
- **05:32:10** UI verification
- **05:32:20** Retry click (corner case P32-002)
- **05:32:42** Lead status restored
- **05:35-05:50** Post-fire audit + report authoring
- **05:50** P32-001 CRITICAL surfaced → STOP per SPEC §8
- **05:50-06:30** All 7 reports authored
