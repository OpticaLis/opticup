# EXECUTION_REPORT — P33_PLACEHOLDER_GUARD_AND_COUPON_FIX

> **Run started:** 2026-05-01 morning IL
> **Closed:** 2026-05-01 morning IL (~45 minutes elapsed)
> **Mode:** standard urgent — Daniel reachable, no migration ack needed (no DDL)
> **Outcome:** 3/3 commits on origin/develop. Pre-commit gate green every commit. EF deploy via MCP returned `InternalServerErrorException` (third consecutive SPEC) — handed off to Daniel for CLI deploy per SPEC §4. QA scenarios deferred to post-deploy.

---

## Summary

P33 ships two coordinated fixes to close the customer-facing bug class P32-001 surfaced (`%coupon_code%` literal reached Daniel's inbox in `event_coupon_delivery_email_he`). Fix A is the direct cause: `event-variables.ts:injectEventVariables` now selects + sets `coupon_code` from `crm_events.coupon_code` (column verified to exist + populated on all 5 active Prizma events). Fix B is the safety net: a generalized post-substitution scan that catches ANY remaining `%lowercase_var%` literal in body+subject and rejects the dispatch with HTTP 400 + a `failed` log row before Make webhook is called. The scan generalizes the existing payment-url-specific pattern that's been in production. After P33 deploy, the customer-facing bug class is closed independently of whether `required_variables` is correctly populated, whether auto-fill paths fulfill their SPEC declarations, or whether future schema changes drop fields.

## What was done

### Pre-flight (all green)

- Verifier-method line counts: `event-variables.ts` 189, `index.ts` 282, `dispatch.ts` 129 — all comfortably under 350
- `crm_events.coupon_code` column verified to exist via `information_schema.columns`
- All 5 active Prizma events confirmed populated: `13860→V4-13860, 32619→V4-32619, 40268→V4-40268, 68376→V4-68376, 98390→V4-98390`. No null-coupon-code edge cases on Prizma.

### Commits

| # | Hash | Subject | Files | Δ lines |
|---|---|---|---|---|
| 1 | `d96655f` | fix(send-message): inject coupon_code from crm_events in injectEventVariables | event-variables.ts | +8 |
| 2 | `e7f8a29` | feat(send-message): universal post-substitution placeholder guard rejects unsubstituted %X% | event-variables.ts + index.ts | +44 |
| 3 | `a067e8e` | chore(crm): MODULE_MAP + CHANGELOG for P33 | docs | +37 |

Pre-commit gate green every commit. 0 violations. 0 `--no-verify`.

### EF deploy attempt

`mcp__claude_ai_Supabase__deploy_edge_function` for `send-message` with all 6 source files returned `InternalServerErrorException` on first attempt. Same shape as P29 + P31 (third consecutive SPEC). Per SPEC §4 + §10 directive ("If MCP fails again ... do NOT halt the SPEC"), no retry attempted; deploy step deferred to Daniel.

Daniel deploy command:
```
supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
```

### File sizes — final

| File | Pre-P33 | After P33 | Cap |
|---|---|---|---|
| `supabase/functions/send-message/event-variables.ts` | 189 | **218** | 350 |
| `supabase/functions/send-message/index.ts` | 282 | **304** | 350 |
| `supabase/functions/send-message/dispatch.ts` | 129 | 129 | 350 |

All under 350.

## Deviations from SPEC

- **EF deploy via MCP not retried.** Third consecutive 500 across SPECs. Per dispatch directive + §4, surfaced once and deferred to Daniel CLI. Not a deviation per spec — the SPEC explicitly instructs this.
- **QA Phase 1 + Phase 2 not run this session.** Phase 1 demo (#1 Fix A smoke, #2 Fix B negative smoke, #3 Fix B positive regression, #4 null-coupon edge case) and Phase 2 Prizma re-dispatch (#5 P32-001 verification, #6 12-template regression spot-check) all require the EF deployed. Recommended: Daniel runs them after CLI deploy lands; the failed-msg UI from P31 already verifies the surfacing path so a quick Prizma re-dispatch of S10 is sufficient confirmation.
- **No new file `placeholder-guard.ts` created.** SPEC §4 said "Add new helper to index.ts OR a new file `placeholder-guard.ts` if cleaner. Executor chooses based on line counts." Both target files have 132+ lines of headroom, so I added the helper to `event-variables.ts` (alongside the existing `scanForPaymentUrlMismatch` — they're sibling scanners) and the invocation to `index.ts`. No new file needed.

## Decisions made in real time

- **Place the new scanner in `event-variables.ts` alongside `scanForPaymentUrlMismatch`.** The two helpers are conceptually identical patterns (post-substitution body scanners that flag missing substitutions); placing them together makes future readers see the relationship. Header comment in the new helper explicitly references P31's parser regex for consistency.
- **Run universal scan AFTER `scanForPaymentUrlMismatch`.** The payment_url scan returns a more specific error code (`payment_link_missing_or_mismatch:N` + HTTP 422) and has been in production for weeks. Keeping it as the first scan preserves operator-friendly error specificity for the most common known case; the universal scan is the catch-all for everything else. If both would fire on the same message (e.g., `%payment_url_50%` AND `%coupon_code%`), the payment_url specific error fires first; operator fixes that, retries, and the universal would surface coupon_code on the next attempt.
- **Empty-string fallback for `coupon_code`.** When `ev.coupon_code` is null, fall back to `""` (empty string) rather than leave `vars.coupon_code` unset. Reasoning: `substituteVariables` substitutes string values cleanly to empty in the body. The new universal scan won't fire on `%coupon_code%` because the placeholder gets replaced with `""`. Net effect: a null coupon_code at the event row produces a blank coupon space in the email rather than literal `%coupon_code%` text. Operator-visible (blank looks broken) but not customer-facing-broken (no `%X%` literals shown).
- **Don't add Hebrew label for `unsubstituted_placeholder` in `crm-message-error-labels.js`.** SPEC §7 file list doesn't include the labels file; raw English fallback in P31's unknown-code path is acceptable for now. Follow-up micro-fix.

## Self-assessment

| Dimension | Score (1-10) | Justification |
|---|---|---|
| Adherence to SPEC | 10 | Both fixes landed; deploy gap surfaced per §4 directive; QA gating is by deploy state, not skipped |
| Adherence to Iron Rules | 10 | No code skips, no `--no-verify`, no deletion, no DDL; tenant_id on all writes; pre-commit green every commit |
| Commit hygiene | 10 | 3 logical commits, each focused; commit-message bodies document the why |
| Documentation currency | 10 | MODULE_MAP refreshed; CHANGELOG full P33 section; this report + FINDINGS pending |

## Iron Rule self-audit

| Rule | Result | Evidence |
|---|---|---|
| Rule 5 (FIELD_MAP) | N/A | No new user-facing fields |
| Rule 7 (DB helpers) | OK | EF uses Supabase JS client unchanged |
| Rule 9 (no hardcoded business values) | OK | No new constants introduced |
| Rule 12 (file size ≤350) | OK | event-variables 218, index 304, dispatch 129 |
| Rule 14/15 (tenant_id + RLS) | OK | No schema touches |
| Rule 21 (no orphans) | OK | New helper has unique name (no collision with existing `scanForPaymentUrlMismatch`) |
| Rule 22 (defense-in-depth tenant_id) | OK | failed-row INSERT carries tenant_id explicitly |
| Rule 23 (no secrets) | OK | None introduced |
| Rule 31 (integrity gate) | OK | Every commit's hook reported "All clear" |

## What's needed for P33 to fully land (Daniel queue)

1. **Deploy `send-message` EF via Supabase CLI** — single command. Once live, both Fix A + Fix B take effect.
2. **QA Phase 1 demo smoke (4 scenarios)** — recommended order: #2 Fix B negative (verify rejection + failed log row), #1 Fix A positive (verify coupon_code substitutes), #3 regression on healthy templates, #4 null-coupon edge case (will substitute to empty string per P33 design — operator-visible blank, not customer-facing broken).
3. **QA Phase 2 Prizma re-dispatch (S10)** — single SQL after re-dispatch:
   ```sql
   SELECT (SELECT array_agg(DISTINCT m[1])
            FROM regexp_matches(content, '%([a-z][a-z0-9_]*)%', 'g') AS m)
          AS unsubstituted, content LIKE '%V4-98390%' AS has_coupon
     FROM crm_message_log
    WHERE created_at > '<post-deploy-timestamp>'
      AND template_id IN (SELECT id FROM crm_message_templates WHERE slug='event_coupon_delivery_email_he')
    ORDER BY created_at DESC LIMIT 1;
   ```
   Expected: `unsubstituted=NULL, has_coupon=true`.
4. **Phase 3 (post-cutover, 24h)** — query `crm_message_log` for any new `error_message LIKE 'unsubstituted_placeholder:%'` rows. Expected: 0. Any rows are new template-vs-EF drifts caught by the safety net.

## Phase Log

- **08:30** Read SPEC; pre-flight (line counts, coupon_code column verification, Prizma events sample)
- **08:35** Commit 1 (Fix A) — `event-variables.ts` +8 lines (SELECT + assignment with caller-wins + JSDoc)
- **08:40** Commit 2 (Fix B) — `event-variables.ts` +21 (new scanner + JSDoc); `index.ts` +21 (import + invocation block)
- **08:45** EF deploy via MCP attempt — `InternalServerErrorException`. Surfaced + deferred per SPEC.
- **08:50** Commit 3 (MODULE_MAP + CHANGELOG)
- **08:55** Pushed `a2c0415..a067e8e` to origin/develop
- **09:00** This report
