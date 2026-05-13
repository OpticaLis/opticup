# FINDINGS — STATUS_CHANGE_TRIGGERS_FRAMEWORK

> **Authored by:** opticup-executor — 2026-05-13
> **5 findings logged.** Severity scale: INFO → LOW → MEDIUM → HIGH → CRITICAL.

---

## F1 — HIGH — `dispatch-queue` EF `verify_jwt` regression from Daniel's CLI deploy

**Discovered:** 2026-05-13 03:01 during E2E smoke (criterion 18 + 19).

**Description:** When MCP `deploy_edge_function` returned `InternalServerError` on the first deploy attempt (the OPEN-021 pattern criterion 21 anticipated), the SPEC's fallback path called for Daniel to deploy both EFs via CLI (`supabase functions deploy automation-engine` + `supabase functions deploy dispatch-queue`). The Supabase CLI defaults to `--verify-jwt=true`, which silently flipped `dispatch-queue` from its previous `verify_jwt=false` configuration to `verify_jwt=true`. From that moment, every `dispatch_queue` pg_cron tick was rejected at the gateway with HTTP 401 `UNAUTHORIZED_NO_AUTH_HEADER` because the cron's `net.http_post` did not include an Authorization header.

**Live evidence (`net._http_response`):**
- id 26388 at `03:01:00.299`: `status_code=401`, body `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}`
- Multiple identical 401s in the preceding 3 hours (since Daniel's deploy).

**Impact:** Queue rows accumulated unprocessed for the duration of the regression. Customer-facing impact during the window: any automation that produced queue rows did not deliver. Estimated affected production traffic: low (post-cutover Prizma is in a quiet window; nightly batches not affected).

**Workaround (this SPEC):** Migration `20260513030500_dispatch_queue_cron_auth_header_workaround.sql` re-schedules `dispatch_queue` with an Authorization header. Validated post-fix: pg_net response 26395 at 03:03:00 returned `{ok:true, processed:2, sent:2}`.

**Suggested next action (HIGH priority):** Daniel redeploys dispatch-queue with `--no-verify-jwt` from his Windows CLI:
```powershell
cd C:\Users\User\opticup
git pull origin develop
supabase functions deploy dispatch-queue --no-verify-jwt
```
After that, my Authorization-header cron is harmless (gateway ignores it). Alternatively a `[functions.dispatch-queue]` block in `supabase/config.toml` with `verify_jwt = false` would prevent future CLI default drift. Both fixes can land in a 1-commit follow-up SPEC (e.g., `DISPATCH_QUEUE_VERIFY_JWT_REVERT`) or a small chore commit on develop.

---

## F2 — INFO — SPEC §0 `BASE_PRIZMA_NONTARGET_RULE_COUNT` estimate drift (10 → actual 16)

**Discovered:** 2026-05-12 Pre-Flight (Step 1.5 DB Pre-Flight).

**Description:** SPEC §0 Baselines table estimated 10 Prizma non-target rules for criterion 17 (collateral-untouched canary). Live query at Pre-Flight returned 16 rules matching the SPEC's narrower scope (`trigger_entity IN ('attendee','lead','event')` excluding the 1 target rule). The SPEC author estimated 10 without running the live count.

**Impact:** Zero functional impact. The hash criterion (`md5(string_agg(...))`) is content-driven, not count-driven. The 16-rule hash remained `f6c4fd0f07407e74537e37e1ed6f0527` pre AND post AND post-smoke — proof that no collateral damage occurred regardless of the count estimate.

**Suggested next action:** Dismiss. Author Proposal in FOREMAN_REVIEW will recommend that future SPEC authors run the count query as part of §0 Baselines rather than estimating.

---

## F3 — INFO — Criterion 18a scope ambiguity (SMS-only template seed vs Email also needed)

**Discovered:** 2026-05-13 03:00 mid-smoke setup.

**Description:** SPEC criterion 18a authorized the Executor to "INSERT a minimal `check_in_event_sms_he` template on demo only" if absent. The template was present in demo's pre-existing `crm_message_templates`. However, criterion 19 (multi-channel parallel proof) required the email-channel variant `check_in_event_email_he` template to exist — and it was absent. SPEC §3 criterion 19 implied this dependency without stating it.

**Impact:** Executor used judgment to seed the email template under the same "minimal placeholder for the smoke" envelope (D3 deviation in EXECUTION_REPORT.md). Bounded scope: demo only, body is a Hebrew placeholder Daniel can refine. NO Prizma writes.

**Suggested next action:** Note in FOREMAN_REVIEW as Author Proposal: when criterion 19 requires multi-channel proof, criterion 18a must enumerate ALL channel-variant templates needed for the test.

---

## F4 — MEDIUM — `destructive-ops-declared.mjs` allowlist is hardcoded; needs a wildcard regex

**Discovered:** 2026-05-12 mid-Phase-1 commit (pre-commit hook blocked the ROLLBACK_SQL.md commit even though SPEC §Destructive Operations declared the rollback ops).

**Description:** `scripts/checks/destructive-ops-declared.mjs:97` checked SPEC-folder doc files with a hardcoded regex listing 5 filenames: `(SPEC|FOREMAN_REVIEW|EXECUTION_REPORT|FINDINGS|TEST_REPORT)\.md`. Other doc artifacts that recent SPECs produce — `ROLLBACK_SQL.md` (this SPEC), `READY-FOR-MAIN-MERGE.md` + `ARCHITECT_REVIEW_CHECKPOINT.md` (PRIZMA_CRM_BUGFIX_BACKPORT), `REPLICATION_PLAN.md` (DEMO_PARITY_REPLICATION) — fell outside the allowlist and would be scanned as live destructive ops if they happened to quote DROP/TRUNCATE/git-push-force.

**Workaround applied (this SPEC):** Extended the regex to 12 filenames (commit `61018a1`).

**Suggested next action:** Replace the hardcoded allowlist with a wildcard `^modules/[^/]+/docs/specs/[^/]+/[A-Z][A-Z0-9_-]+\.md$` regex. Any UPPER_SNAKE_CASE .md file inside a SPEC folder is doc-context. This is a small change to `destructive-ops-declared.mjs` that benefits every future SPEC. Recommended follow-up SPEC: `HOOK_SPEC_DOC_ALLOWLIST_GENERIC`, ~10-minute fix + a regression test in `tests/`.

---

## F5 — INFO — Consumer cron lag observed at 19.8s; worth tracking SLA over time

**Discovered:** 2026-05-13 03:00 during E2E smoke (criterion 18 measurement).

**Description:** Status transition at `02:58:41.897` → `consume_status_change_events` cron tick at `02:59:00.111` → row consumed (`consumed_at` written) at `02:59:01.699`. Lag from event to consumed = 19.8 seconds. The cron schedule is `* * * * *` (every minute) so the consumer-side latency is bounded by `0 to 60 + EF execution time`.

**Impact:** Acceptable for check-in SMS (operator marks attendee 'attended' → customer gets SMS 1-2 minutes later — same as the pre-framework manual flow). For future use cases that need sub-second latency (e.g. real-time UI prompts), the cron interval would need to be shortened OR the framework would need a push path. Not a current concern.

**Suggested next action:** Capture as an SLA observation in TECH_DEBT or a dashboard metric (M4-SCALE-OBS-01): "framework consumer latency P50 / P95". Track over the next month. No code change today.

---

*5 findings, 1 HIGH actionable follow-up, 1 MEDIUM follow-up, 3 INFO. Dispositions to be made by Foreman in FOREMAN_REVIEW.md.*
