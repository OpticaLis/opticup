# SPEC — DEMO_WHITELIST_UPDATE

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full-Auto Pipeline mode
> **Authored on:** 2026-05-11
> **Module:** 4 — CRM
> **Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_WHITELIST_UPDATE_BRIEF.md`

---

## 0. Pre-Authoring Reality Check

Brief read in full on 2026-05-11. Diagnostic phase executed live against Supabase project `tsxrrxzmdxaenlvocyit` BEFORE drafting this SPEC's success criteria — findings drove the SPEC shape, not Brief assumptions. See `DIAGNOSIS.md` for raw query output.

**Three reality checks performed:**

1. **Schema check** — `information_schema.columns` for `tenants`: only `test_mode_sms_allowlist` (jsonb) exists; NO `test_mode_email_allowlist`. Confirmed against Brief §3.
2. **Live values check** — demo's row already contains `["+972537889878", "+972503348349", "+972507168471"]`, EXACTLY the 3 phones the Brief lists, in E.164 (the format `send-message` EF v21 normalizes to). Brief §2 SMS goal already satisfied without UPDATE.
3. **EF behavior check** — `send-message` v21 source read: SMS path goes through `phoneAllowed()` reading from `test_mode_sms_allowlist`; email path has NO allowlist gate. Email mechanism does not exist anywhere in the dispatch chain.

**Lessons from prior Module 4 SPECs applied:**
- FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/SPEC.md §10` → "Email allowlist out of scope, post-cutover SPEC" → confirms this SPEC is the planned post-cutover follow-up; email half ESCALATES per Brief §6 Decision #5.
- FROM `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md` (referenced in Brief §11) → diagnostic-first pattern → followed: 4 read-only SELECTs before any write decision.

**No Baselines table needed** — this SPEC measures DB row state, not file metrics; expected values are inline in §3.

---

## 1. Goal

Verify demo tenant's outbound-message whitelisting state matches Daniel's intended test-cycle envelope (SMS to 3 numbers, email to 3 addresses), apply UPDATEs only where state diverges, and surface the missing email-allowlist mechanism as an Architect decision rather than auto-creating schema.

---

## 2. Background & Motivation

Daniel is about to run his manual test cycle on the newly-provisioned demo storefront (`opticup-storefront-demo.vercel.app`, deployed earlier today via `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT`). Before the test cycle, all outbound dispatches from demo MUST be restricted to Daniel's own contact channels — preventing accidental messages to real people during testing.

The SMS allowlist infrastructure was built at C-001 (2026-05-03) for Prizma's pre-cutover protection and applied to demo's row at the same time (per C-001 §6 success criterion #2). The email allowlist was explicitly deferred by C-001 §10 to a separate post-cutover SPEC.

This SPEC is that follow-up: confirm SMS state, surface email gap, return decision to Architect.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" after final commit |
| 2 | DIAGNOSIS.md exists | File present in SPEC folder | `ls "modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/DIAGNOSIS.md"` → exit 0 |
| 3 | Demo `test_mode_sms_allowlist` value | `["+972537889878", "+972503348349", "+972507168471"]` (jsonb array, length 3) | `SELECT test_mode_sms_allowlist FROM tenants WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` |
| 4 | Each Daniel-listed phone is normalized to a value present in demo's allowlist | All 3 of `0537889878`, `0503348349`, `0507168471` normalize to entries present in (3) | `phoneAllowed()` test logic per `send-message/index.ts:33-58` |
| 5 | Prizma `test_mode_sms_allowlist` value | `null` (production-mode, untouched since cutover) | `SELECT test_mode_sms_allowlist FROM tenants WHERE slug = 'prizma'` |
| 6 | Prizma `updated_at` post-pipeline | Identical to pre-pipeline snapshot `2026-03-19 09:54:27.256+00` | `SELECT updated_at FROM tenants WHERE slug = 'prizma'` |
| 7 | Demo `updated_at` post-pipeline | If no UPDATE performed: identical to pre-pipeline snapshot `2026-03-29 08:33:43.906+00`. If UPDATE performed: a new value > pre-snapshot (would only happen if §3.3 mismatched, which it does not). | `SELECT updated_at FROM tenants WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` |
| 8 | Email allowlist column existence | Does NOT exist as column on `tenants`; does NOT exist as key in `ui_config` jsonb for either demo or Prizma | `information_schema.columns` query + `SELECT ui_config FROM tenants` for both rows |
| 9 | ESCALATION.md exists | File present in SPEC folder documenting email gap + 3 options + recommendation | `ls .../ESCALATION.md` → exit 0 |
| 10 | EXECUTION_REPORT.md + FINDINGS.md exist | Both present in SPEC folder | `ls .../EXECUTION_REPORT.md .../FINDINGS.md` → exit 0 |
| 11 | FOREMAN_REVIEW.md exists | Present in SPEC folder with 4 skill-improvement proposals | `ls .../FOREMAN_REVIEW.md` → exit 0 |
| 12 | DECISIONS_LOG entry | Cross-module entry recording: SMS state verified correct (no-op), email gap escalated, recommended option | `grep DEMO_WHITELIST_UPDATE references/DECISIONS_LOG.md` → 1+ matches |
| 13 | OPEN_TASKS update | Architect-decision row added for email-allowlist mechanism | `grep "email allowlist" OPEN_TASKS.md` → 1+ matches |
| 14 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity` → exit code 0 or 2 |
| 15 | HEAD pushed | `develop` is up-to-date with `origin/develop` | `git status` reports "Your branch is up to date" |
| 16 | No code changes | 0 changes outside SPEC folder + OPEN_TASKS.md + DECISIONS_LOG.md | `git diff --stat origin/develop..HEAD` shows only `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/*`, `OPEN_TASKS.md`, `references/DECISIONS_LOG.md` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo (Level 1)
- Run read-only SQL via Supabase MCP (Level 1)
- Create files inside `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/`
- Edit `OPEN_TASKS.md` and `references/DECISIONS_LOG.md` (additive only — no deletions)
- Commit and push to `develop`
- Run `verify:integrity`

### What REQUIRES stopping and reporting
- ANY UPDATE on Prizma's tenants row → STOP (Iron Rule 32 envelope violation)
- ANY ALTER TABLE / DDL → STOP, escalate per Brief §6 Decision #5
- ANY change to `send-message` Edge Function or other code → STOP
- Any test message dispatch → STOP (Brief §10 Anti-Pattern)
- Merge to main → STOP (CLAUDE.md §9 rule 7, only Daniel authorizes)

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- If demo's `test_mode_sms_allowlist` SELECT returns anything OTHER than `["+972537889878", "+972503348349", "+972507168471"]` (3-element array, exact values, exact format) → **STOP**, do NOT auto-correct, escalate (this would mean state changed since the diagnostic phase 5 minutes earlier and someone else is editing the row concurrently).
- If Prizma's `updated_at` changes between pre- and post-snapshot → **STOP**, regression risk — investigate before proceeding.
- If `ALTER TABLE tenants ADD COLUMN ...` is suggested anywhere in the pipeline → **STOP**, this is the planned escalation, not autonomous.
- If `npm run verify:integrity` reports null-byte ERROR (exit 1) → **STOP**, repair before commit.

---

## 6. Rollback Plan

No DB writes are planned. SMS allowlist is verified-only (no-op); email is escalated (no DB action).

If the file commits need to be reverted:
- `git revert HEAD` — single revert for the docs commit. No DB rollback needed.

If concurrent diagnosis discovers an unauthorized UPDATE happened (Stop-Trigger §5 #1 fires) — the rollback is a single-row UPDATE on demo to restore `["+972537889878", "+972503348349", "+972507168471"]`. Capture the divergent value in EXECUTION_REPORT.md before any write.

---

## Destructive Operations

**None.**

Per Iron Rule 32: this SPEC explicitly forbids ALL destructive operations for its run. The Brief's §8 Destructive Operations envelope authorizes 1-2 single-row UPDATEs on demo's row IF state divergence is found — but the diagnostic phase confirmed NO divergence (SMS already correct; email mechanism doesn't exist so no UPDATE possible). Therefore the actual SPEC run authorizes ZERO destructive ops, narrower than the Brief allowed. A SPEC may always be MORE conservative than its Brief; never less.

If the Executor encounters a need for a single-row demo UPDATE mid-run (e.g., the SELECT in §3.3 returns divergent data), STOP and escalate — do NOT silently amend this section.

---

## 7. Out of Scope (explicit)

- Prizma's `tenants` row — read-only inspection ONLY
- `send-message` Edge Function or any other code path
- Schema additions (ADD COLUMN) — this is the explicit escalation per Brief §6 Decision #5
- Adding a contact beyond the 3 phones / 3 emails listed in Brief §2
- Removing contacts already present (this SPEC is verify-only for SMS; email has no field to modify)
- Sending a test message to verify (Brief §10)
- Touching `dispatch-queue` EF or any layer-2/3 allowlist
- Modifying `crm_message_log`, `crm_messaging_config.js`, or any messaging-adjacent file

---

## 8. Expected Final State

### New files (5)
- `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/SPEC.md` (this file)
- `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/DIAGNOSIS.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/ESCALATION.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/FINDINGS.md`
- `modules/Module 4 - CRM/docs/specs/DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md`

(Six total new files including FOREMAN_REVIEW.)

### Modified files (2)
- `OPEN_TASKS.md` — add Architect-decision row for email allowlist mechanism (additive)
- `references/DECISIONS_LOG.md` — cross-module entry recording state verification + escalation (additive)

### Deleted files
None.

### DB state
**Unchanged.** Both demo and Prizma `tenants` rows must remain bit-identical to pre-pipeline snapshot. Verified via `updated_at` comparison.

### Docs updated
- `OPEN_TASKS.md` (Active section): new row "Email allowlist mechanism — Architect decision needed (3 options in `DEMO_WHITELIST_UPDATE/ESCALATION.md`)"
- `references/DECISIONS_LOG.md`: cross-module entry stamped 2026-05-11

NOT updated (would be inappropriate): `MASTER_ROADMAP.md`, `GLOBAL_MAP.md`, `GLOBAL_SCHEMA.sql`, Module 4 `SESSION_CONTEXT.md` (no module-state change), `CHANGELOG.md` (no code change).

---

## 9. Commit Plan

**Single commit** — this is a docs-only SPEC with no code changes:

- **Commit 1:** `chore(spec): close DEMO_WHITELIST_UPDATE — SMS state verified, email mechanism escalated`
  - Files: SPEC.md, DIAGNOSIS.md, ESCALATION.md, EXECUTION_REPORT.md, FINDINGS.md, FOREMAN_REVIEW.md, OPEN_TASKS.md, references/DECISIONS_LOG.md

Single commit because the SPEC + execution + retro + review all happen in one Full-Auto Pipeline chat with no functional ordering dependency between the artifacts.

---

## 10. Dependencies / Preconditions

- C-001 (`C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL`) closed — confirmed (column + EF refactor live in v21).
- M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT closed — confirmed (per OPEN_TASKS.md latest update line).
- Supabase MCP access available — confirmed.
- Working directory clean of uncommitted file changes (architecture-brief untracked drafts present but not in scope) — confirmed.

---

## 11. Lessons Already Incorporated

- FROM `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` Author Proposal A2 (`forbid updated_at-as-proof`) → APPLIED in §3 criterion #6: `updated_at` is used HERE strictly to prove a row was NOT touched (regression check), not to prove a positive write happened. Brief §7 acceptance criterion #4 explicitly uses this comparison correctly. The proposal forbids using `updated_at` as proof a write succeeded — it does not forbid using it as proof a write did NOT happen, which is the use here.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 (heading convention) → APPLIED: this SPEC uses `## N. Title` plain numbered headings throughout, no `§` prefixes. Iron-Rule-32 hook accepts the unnumbered `## Destructive Operations` heading. (Note: the hook also accepts `## N. Destructive Operations` for INTEGER N, but NOT decimal section numbers like `## 6.5.` — discovered first-hand by this SPEC's first commit attempt; lesson harvested in FOREMAN_REVIEW Author Proposal section.)
- FROM `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/SPEC.md §10` (email allowlist out-of-scope, deferred to post-cutover) → APPLIED: this SPEC IS the deferred follow-up. Email half is escalated per the original deferral plan, not solved unilaterally.
- FROM `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/DIAGNOSIS.md` (diagnostic-first pattern) → APPLIED: 4 read-only SELECTs + EF source read PRECEDED any write decision; result drove the SPEC into Path C (escalation).

**Cross-Reference Check (Rule 21 enforcement at author time):**
- `test_mode_sms_allowlist` already exists in `docs/GLOBAL_SCHEMA.sql` (added by C-001 migration). No new column proposed.
- `test_mode_email_allowlist` does NOT exist anywhere — grep against `docs/GLOBAL_SCHEMA.sql` + `modules/*/docs/db-schema.sql` returns 0 hits. Genuinely new IF added — but this SPEC explicitly does NOT add it; ESCALATION.md leaves the decision to Architect.
- No new functions, no new T-constants, no new files outside the SPEC folder + 2 doc updates. 0 collisions / 0 hits resolved.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md written in this folder.
- [ ] OPEN_TASKS.md + references/DECISIONS_LOG.md updated.
- [ ] Hebrew one-line summary emitted to Daniel at end.

---

*End of SPEC.*
