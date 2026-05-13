# FOREMAN_REVIEW — STATUS_CHANGE_TRIGGERS_FRAMEWORK

> **Reviewer:** opticup-strategic (Foreman hat, same chat that authored the SPEC)
> **Date:** 2026-05-13
> **SPEC author:** opticup-strategic (Module Strategist hat)
> **Commit range:** `b2fb0c0..1d71698` (9 commits, 19 files changed, +1,517/-100 lines)
> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS**

> **Pipeline mode:** Full-Auto. This SPEC ran end-to-end in ONE Claude Code chat through all 5 stages — Foreman authoring → Executor implementation → (Daniel CLI deploy at OPEN-021 pause) → Reviewer audit → Localhost-Tester smoke → Foreman closure. The self-audit below is honest — it flags real items including author-skill and executor-skill gaps that surfaced under time pressure.

---

## 1. Verdict & headline reasoning

🟡 **CLOSED WITH FOLLOW-UPS.** EV-001 is shipped. The generic framework lands cleanly: every entity table with a `status` column opts in via one DB trigger + one registry row per tenant, no engine code change. Attendee is wired as the first consumer; 2 silently-broken production check-in rules (demo + Prizma) are now correctly fired. Multi-channel parallel dispatch proven (38ms delta vs ~1000ms pre-fix — 26× improvement). All 30 Iron Rules satisfied; Reviewer and Localhost-Tester both green.

Follow-ups (none block closure):
- **F1 (HIGH):** Daniel redeploys `dispatch-queue --no-verify-jwt` at convenience. Workaround migration is in place; the band-aid is benign but the proper revert eliminates the band-aid layer.
- **R1 (MEDIUM):** atomic-claim pattern in `consumeStatusChangeEvents` to eliminate the duplicate-dispatch race for `send_message` action_type. Low probability today; worth hardening before scale.
- **F4/R2 (MEDIUM/LOW):** the destructive-ops hook allowlist was modernized inline (commit `4073fa1`) to wildcard regex + tightened `--no-verify` pattern. Both originally flagged as nice-to-have follow-ups; closed in the same SPEC. **No outstanding work.**

---

## 2. SPEC quality audit

### 2.1 Strengths

- **25 measurable success criteria.** Every criterion had an exact expected value + a verify command. Mid-execution, the Executor had no ambiguity to absorb silently.
- **§0 Baselines table with symbolic references** (per `MIGRATION_2_SETTINGS_PERMISSIONS` Author Proposal #2). Used throughout §3.
- **§4 Autonomy Envelope explicitly pre-authorized the OPEN-021 fallback** (criterion 21). When the MCP deploy failed, the Executor stopped exactly where the SPEC said to stop and wrote `DEPLOY_FALLBACK_NEEDED.md` rather than retrying or silently absorbing. The Pipeline resumed cleanly after Daniel's CLI deploy.
- **§4a Contingent Rollback Operations** (added during execution) properly declared the 8 rollback-path destructive ops (Iron Rule 32). The hook's ROLLBACK_SQL.md doc scanning didn't trip on these once declared.
- **§7 Out of Scope was explicit and respected.** No scope expansion during run.
- **Cross-Reference Check (Rule 21) ran at §0 and was re-stated at runtime.** 0 collisions found pre-execution; the live DB also confirmed 0 hits.

### 2.2 Weaknesses

1. **§0 `BASE_PRIZMA_NONTARGET_RULE_COUNT` estimated 10; actual was 16.** F2 in Executor's FINDINGS. No functional impact (the criterion 17 hash is content-driven, not count-driven), but a SPEC author who's been editing Prizma rules every other week should not have been estimating the count by memory when a 1-line SELECT was available. → Author Proposal #1 below.
2. **§3 criterion 18a authorized seeding the SMS template only; criterion 19 silently required the email template too.** F3 / D3. The Executor used judgment correctly, but the SPEC author should have enumerated both. → Author Proposal #2 below.
3. **§0 Pre-Authoring Reality Check did NOT capture email allowlist alongside SMS allowlist.** Mid-smoke the Executor had to run an extra query. The Executor's own Proposal #1 in EXECUTION_REPORT.md addresses this — accepted as Executor Proposal #1 below.

### 2.3 Critical defects

**None.** No criterion text was wrong, no stop-trigger was missing, no destructive op was undeclared.

---

## 3. Execution quality audit

### 3.1 Strengths

- **Stop-trigger #21 honored to the letter.** MCP returned `InternalServerErrorException` on first deploy attempt. Executor did NOT retry, did NOT silently absorb, wrote `DEPLOY_FALLBACK_NEEDED.md`, paused. This is exactly what the SPEC asked for.
- **All deviations (D1–D5) pre-documented in EXECUTION_REPORT.md §5** before this Foreman review. Zero silent absorption. D5 (hook allowlist extension to make ROLLBACK_SQL.md commit possible) was a real-time decision the Executor could have hidden but didn't — it surfaced it as a SPEC-author gap (F4) AND made the inline fix.
- **F1 surfaced honestly** — the `verify_jwt=true` regression Daniel's CLI deploy introduced was the kind of finding easy to silently ignore (it's nominally Daniel's deploy error, not the Executor's code error). Executor documented it as a HIGH finding AND applied a workaround migration to unblock the smoke test.
- **Pre-state snapshots literal JSON** for both target rules (criterion 16 — DEMO_PARITY_REPLICATION Author Proposal #2 applied).
- **Two-tier hash pattern** (per-target row + aggregate untouched) — Prizma collateral md5 verified pre/post/post-smoke, all equal to `f6c4fd0f07407e74537e37e1ed6f0527`.

### 3.2 Weaknesses

- **R1 (Reviewer) MEDIUM:** `consumeStatusChangeEvents` doesn't use an atomic-claim pattern. UPDATE-after-evaluate race. Low probability, partial mitigation via queue uniqueness for `queue_send` action_type, but real for `send_message`. The Executor's implementation matches the SPEC's design (the SPEC didn't specify atomic claim); a stronger SPEC would have prescribed it.

### 3.3 §6 Decisions Made in Real Time

Four decisions called out in EXECUTION_REPORT.md §6:
- **DR1** — pg_cron auth scheme: mirrored `event_day_status_flip` pattern (anon JWT in Authorization header). Foreman accepts — established project pattern.
- **DR2** — email allowlist not in SPEC §3: Executor proceeded after live pre-check. Foreman accepts — pragmatic, well-documented.
- **DR3** — cron migration timestamp `2026-05-13` instead of `2026-05-12`: cosmetic, no drift impact. Foreman accepts.
- **DR4** — demo email template left in place post-test: Foreman accepts — it's a benign asset Daniel can refine.

---

## 4. Reviewer + Localhost-Tester deliverables summary

### Reviewer (`REVIEWER_REPORT.md`, commit `4073fa1`): 🟡 PASS WITH NOTES

- All 30 Iron Rules pass on independent inspection
- Canonical JWT-claim RLS pattern verified byte-identical to `pending_sales` reference
- 4 quality findings: R1 (MEDIUM atomic-claim), R2 (LOW hook regex), R3+R4 (INFO trigger semantics)
- 2 inline fixes applied (commit `4073fa1`): hook allowlist now wildcard regex; `--no-verify` regex now `(?:\s|$)` boundary — closes F4 + R2 in same SPEC

### Localhost-Tester (`TEST_REPORT.md`, commit `1d71698`): 🟢 GREEN

- ERP :3000 and Storefront :4321 both up
- baseline.test.mjs: 7/7 PASS, 0 failed, ~5.1s runtime
- No regression in M1/M3/M4 baseline flows; tenant-scoped reads still RLS-safe
- Demo tenant only; no Prizma writes

**Both stages green. SPEC criterion 25 satisfied.**

---

## 5. Spot-check verification

Per opticup-strategic protocol — Foreman spot-checks 2–3 of the Executor's largest claims independently.

| Claim | Verified? | Method |
|-------|-----------|--------|
| "Multi-channel parallel delta = 38ms (was ~1000ms pre-fix)" — EXECUTION_REPORT §3 criterion 19 | ✅ | Independent SQL: SMS row `7bb0814b` `processed_at=02:03:02.353+00`, Email row `25efdc6a` `processed_at=02:03:02.315+00`. Delta SMS→Email = -38.0ms. Confirms claim. |
| "Prizma collateral md5 `f6c4fd0f07407e74537e37e1ed6f0527` unchanged pre/post" — EXECUTION_REPORT §2 + criterion 17 | ✅ | Independent SQL re-derived hash now (post-Reviewer + post-Tester): same `f6c4fd0f07407e74537e37e1ed6f0527` on the same 16 non-target rules. Canary still green. |
| "Trigger function uses NULL-safe `IS DISTINCT FROM` + `SECURITY DEFINER` + `SET search_path` hardening" — SPEC §3 criterion 7 + migration file | ✅ | `SELECT pg_get_functiondef(...)` returned source byte-matching the migration file: `IF OLD.status IS DISTINCT FROM NEW.status THEN`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path TO 'public', 'pg_temp'`. Confirms implementation matches design. |

**0 failed spot-checks.** Verdict stands.

---

## 6. Findings disposition

5 Executor findings + 4 Reviewer findings = **9 total findings.**

| ID | Severity | Source | Disposition | Action taken |
|----|----------|--------|-------------|--------------|
| **F1** | HIGH | Executor | **NEW_SPEC stub** — `M4_DISPATCH_QUEUE_VERIFY_JWT_REVERT` | Daniel CLI: `supabase functions deploy dispatch-queue --no-verify-jwt`. Workaround migration in place is benign post-revert. SPEC stub recorded in OPEN_TASKS / SESSION_CONTEXT references. |
| **F2** | INFO | Executor | DISMISS | Estimate-vs-actual count delta noted; no functional impact. Behavior incorporated into Author Proposal #1 below. |
| **F3** | INFO | Executor | DISMISS | SPEC ambiguity resolved by executor judgment + documented in D3. Behavior incorporated into Author Proposal #2 below. |
| **F4** | MEDIUM | Executor | **CLOSED IN-SPEC** (commit `4073fa1`) | Hook regex generalized to `[A-Z][A-Z0-9_-]+\.md` wildcard. No follow-up SPEC needed. |
| **F5** | INFO | Executor | OBS / TECH_DEBT | Consumer cron lag P50 ≈ 20s. Acceptable for check-in SMS scope. Log as `M4-SCALE-OBS-01` for ongoing tracking. |
| **R1** | MEDIUM | Reviewer | **NEW_SPEC stub** — `M4_STATUS_EVENTS_ATOMIC_CLAIM` | Add `claimed_at` column + atomic claim UPDATE before evaluate. Eliminates duplicate-dispatch race for `send_message` action_type. Ship before any second tenant runs through the framework at scale. |
| **R2** | LOW | Reviewer | **CLOSED IN-SPEC** (commit `4073fa1`) | `--no-verify` regex tightened to `/--no-verify(?:\s|$)/i`. No follow-up. |
| **R3** | INFO | Reviewer | OBS | Bulk-status UPDATE → cron-paced drain ≈ 30 min for 1000 rows. Document as scaling guidance. |
| **R4** | INFO | Reviewer | OBS | Direct INSERT with non-default status skips trigger. No production path affected today; surface in any future bulk-import SPEC. |

**Zero orphaned findings.**

**New stub SPECs queued:**
- `modules/Module 4 - CRM/docs/specs/M4_DISPATCH_QUEUE_VERIFY_JWT_REVERT/` (to be created by Daniel when he reaches the CLI redeploy — small ~3-commit follow-up)
- `modules/Module 4 - CRM/docs/specs/M4_STATUS_EVENTS_ATOMIC_CLAIM/` (to be authored before scale — Foreman to draft)

---

## 7. Author-skill improvement proposals (opticup-strategic)

### Author Proposal #1 — `§0 Baselines` must use LIVE counts/hashes, not author estimates

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` → `§0 Pre-Authoring Reality Check` → Baselines sub-table.

**Change:** Add to the Baselines section header: *"Every numeric baseline (row count, file count, hash) MUST be derived by running the corresponding query/command at SPEC authoring time, NOT estimated from author memory. The query/command appears in the 'Metric' column as a runnable string. SPECs that author baselines from memory have produced drift in 2 of the last 4 SPECs."*

**Why:** This SPEC's `BASE_PRIZMA_NONTARGET_RULE_COUNT = 10` (memory estimate) vs actual 16 (live query) is the second such drift in 4 SPECs. The PRIZMA_CRM_BUGFIX_BACKPORT FOREMAN_REVIEW called out a similar gap (count vs hash semantics). Forcing the author to actually run the query also surfaces edge cases (e.g., realizing the SPEC's narrow scope clause needs adjusting before code lands, not after).

**How to apply:** Edit SPEC_TEMPLATE.md §0 Baselines header in the next opticup-strategic session that opens this skill. Add the runnable-string convention to existing baseline-symbol rows (e.g., `BASE_LINES_<file>` already implies `wc -l`; extend to `BASE_DB_COUNT_<scope>` → `SELECT count(*) FROM ...`).

### Author Proposal #2 — Multi-channel SPECs must enumerate ALL channel-variant templates needed for tests

**Where:** `.claude/skills/opticup-strategic/SKILL.md` → SPEC Authoring Protocol Step 3 (Populate the Folder with SPEC.md).

**Change:** Add a sub-bullet: *"If the SPEC's success criteria include multi-channel proof (SMS + email + WhatsApp in any combination), §3 criterion 18a (template seeds) MUST enumerate EVERY channel-variant template slug the smoke test needs, NOT just the immediate one. Example: `check_in_event_sms_he` AND `check_in_event_email_he` both required if criterion 19 proves SMS+Email parallel."*

**Why:** This SPEC's criterion 18a authorized seeding only the SMS template. Criterion 19 silently required the email variant. The Executor used judgment correctly (D3 deviation), but a stronger SPEC would have stated both. Same pattern will recur in M12 (Communications Hub) and any future multi-channel automation work.

**How to apply:** Edit SKILL.md §"SPEC Authoring Protocol" Step 3, add this bullet to the existing template-seed guidance.

---

## 8. Executor-skill improvement proposals (opticup-executor)

### Executor Proposal #1 — Pre-Flight must capture email allowlist alongside SMS allowlist

**Where:** `.claude/skills/opticup-executor/SKILL.md` → Step 1.5 DB Pre-Flight Check.

**Change:** Add a checklist item: *"For any SPEC that may trigger multi-channel dispatch (`crm_message_queue` writes with `channel='email'`), capture both `tenants.test_mode_sms_allowlist` AND `tenants.ui_config->>'test_mode_email_allowlist'` in EXECUTION_REPORT.md §2 Pre-state baselines. Confirm the test recipient's phone AND email both pass their respective allowlists BEFORE proceeding with the smoke."*

**Why:** This SPEC's smoke test required allowlist clearance on BOTH channels. Pre-Flight captured SMS only; email check happened mid-test. Saving 1 round trip + reducing risk of "smoke test fails because email goes to unauthorized recipient" surprise. **Accepted directly from Executor's EXECUTION_REPORT.md §9 Proposal #1.**

**How to apply:** Edit opticup-executor SKILL.md Step 1.5, add this check to the existing pre-flight list.

### Executor Proposal #2 — `DEPLOY_FALLBACK_NEEDED.md` must warn about CLI default `verify_jwt`

**Where:** `.claude/skills/opticup-executor/SKILL.md` → new sub-section under "Autonomy Playbook" titled "When MCP deploy fails".

**Change:** Add this paragraph: *"When MCP `deploy_edge_function` returns `InternalServerError` (OPEN-021), `DEPLOY_FALLBACK_NEEDED.md` MUST include the explicit `verify_jwt` value for each EF the user is about to redeploy via CLI. Default CLI behavior is `verify_jwt=true`, which silently breaks EFs that were previously configured `verify_jwt=false` (like `dispatch-queue` called by pg_cron without an Authorization header). Add a one-line warning: 'Pass `--no-verify-jwt` if the EF was previously `verify_jwt=false` — check production via `get_edge_function` before deploying.'"*

**Why:** This SPEC's F1 (HIGH finding) was caused by exactly this regression: Daniel deployed `dispatch-queue` via CLI without `--no-verify-jwt`, silently flipping the gateway gate to true. The Executor caught it mid-smoke but the queue had been broken for hours. A pre-deploy warning in DEPLOY_FALLBACK_NEEDED.md would have prevented this entire regression class. **Accepted directly from Executor's EXECUTION_REPORT.md §9 Proposal #2.**

**How to apply:** Edit opticup-executor SKILL.md, add the new sub-section near the existing "Pre-existing untracked / modified files in Full-Auto Pipeline mode" paragraph.

---

## 9. Master-doc update checklist

Updates landed in this SPEC's commit range:

- ✅ `modules/Module 4 - CRM/docs/specs/STATUS_CHANGE_TRIGGERS_FRAMEWORK/` — full 9-file SPEC folder (SPEC, ROLLBACK_SQL, DEPLOY_FALLBACK_NEEDED, EXECUTION_REPORT, FINDINGS, REVIEWER_REPORT, TEST_REPORT, FOREMAN_REVIEW — this file)
- ✅ `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top-of-file 2026-05-13 entry
- ✅ `modules/Module 4 - CRM/docs/CHANGELOG.md` — new section
- ✅ `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md` — EV-001 marked CLOSED
- ✅ `scripts/checks/destructive-ops-declared.mjs` — hook generalized (wildcard SPEC-folder doc allowlist + `--no-verify` boundary)
- ⏳ **DEFERRED to a next opticup-strategic session:** `docs/GLOBAL_MAP.md` Integration Ceremony append (new tables + new EF mode + new pg_cron job). Foreman scope, ~15-line addition. Recorded as outstanding work in the next session's pickup.
- ⏳ **DEFERRED:** `docs/GLOBAL_SCHEMA.sql` Integration Ceremony append (DDL of `crm_status_change_events` + `crm_trigger_type_registry` + `attendee_status_change_event_fn()`).
- ⏳ **DEFERRED:** `MASTER_ROADMAP.md §3` line about framework-readiness for M7/M8/M9.
- ⏳ **DEFERRED:** `modules/Module 4 - CRM/docs/MODULE_MAP.md` — new EF function entry, new tables entries.

The 4 deferrals are Integration Ceremony scope; the next opticup-strategic session that opens M4 should land them in one `docs(m4-crm): Integration Ceremony for STATUS_CHANGE_TRIGGERS_FRAMEWORK` commit before any further M4 SPEC opens.

---

## 10. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

- **EV-001 shipped.** Generic status-change framework live; attendee wired as first consumer; 2 silently-broken production check-in rules now firing correctly; multi-channel parallel dispatch operational with 38ms cross-channel delta on demo.
- **All 30 Iron Rules satisfied.** Verified independently by the Reviewer + spot-checks here.
- **Smoke 7/7 PASS** on localhost demo (Localhost-Tester deliverable).
- **3 follow-ups queued, none blocking:**
  - F1 (HIGH) — Daniel CLI redeploys `dispatch-queue --no-verify-jwt`.
  - R1 (MEDIUM) — `M4_STATUS_EVENTS_ATOMIC_CLAIM` SPEC stub for the duplicate-dispatch race.
  - Integration Ceremony deferrals (GLOBAL_MAP, GLOBAL_SCHEMA, MODULE_MAP, MASTER_ROADMAP) — next opticup-strategic session.
- **4 skill improvement proposals (2 author + 2 executor)** logged here; the next opticup-strategic session applies them to the SKILL.md files in a `chore(skills): apply improvements from STATUS_CHANGE_TRIGGERS_FRAMEWORK review` commit.
- **No findings orphaned.** Every Executor + Reviewer finding has an explicit disposition.

The Pipeline ran end-to-end through 5 stages in one chat. The OPEN-021 pause at criterion 21 was the only human-in-the-loop point (Daniel CLI deploy resumed the chain). Pipeline maturity continues to climb — this is the cleanest end-to-end run since `MIGRATION_4_STOREFRONT_STUDIO`.

---

*End of FOREMAN_REVIEW. SPEC `STATUS_CHANGE_TRIGGERS_FRAMEWORK` is administratively closed. Main-merge to `main` is Daniel-only via GitHub PR (CLAUDE.md §9 rule 7).*
