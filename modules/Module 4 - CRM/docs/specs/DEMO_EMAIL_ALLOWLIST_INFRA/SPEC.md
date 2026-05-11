# SPEC — DEMO_EMAIL_ALLOWLIST_INFRA

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_EMAIL_ALLOWLIST_INFRA/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full-Auto Pipeline mode
> **Authored on:** 2026-05-11
> **Module:** 4 — CRM (with EF impact)
> **Phase:** post-cutover hardening (parallel to M3 demo storefront forms)
> **Author signature:** Claude Code (opus-4-7) — single-chat Full-Auto Pipeline
> **Brief:** `modules/Module 4 - CRM/architecture-brief/DEMO_EMAIL_ALLOWLIST_BRIEF.md` (v1, 2026-05-11)

---

## 0. Pre-Authoring Reality Check

Confirms the SPEC is grounded in actual repo + DB state, not Brief assumptions.

- Brief read in full on 2026-05-11.
- Predecessor `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` read; ESCALATION.md options + Architect decision (Option 2: jsonb in `ui_config`) applied here.
- `supabase/functions/send-message/index.ts` exists locally at 331 lines. Live EF is **v21** (per Supabase MCP `get_edge_function`). Local vs live content matches (CRLF differences aside).
- `phoneAllowed()` SMS-allowlist pattern verified at lines 39-60 of index.ts; gate call at lines 311-318.
- Demo tenant `8d8cfa7e-ef58-49af-9702-a862d459cccb` exists; `ui_config` has no `test_mode_email_allowlist` key (verified by `ui_config ? 'test_mode_email_allowlist'` returning `false`).
- Prizma tenant `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` exists; `ui_config` has no `test_mode_email_allowlist` key.
- Pre-execution snapshots captured in `DIAGNOSIS.md` (written before this SPEC's first commit per Author Proposal #2 from `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` — "Pre-write executor-side diagnostic findings into DIAGNOSIS.md when Foreman + Executor merge in Full-Auto").

### Baselines (referenced symbolically in §3)

| Symbol | File | Metric | Value (captured 2026-05-11) |
|---|---|---|---|
| `BASE_LINES_index_ts` | `supabase/functions/send-message/index.ts` | line count | 331 |
| `BASE_DEMO_UPDATED_AT` | `tenants` (id=demo) | `updated_at` | `2026-03-29 08:33:43.906+00` |
| `BASE_PRIZMA_UPDATED_AT` | `tenants` (id=prizma) | `updated_at` | `2026-03-19 09:54:27.256+00` |
| `BASE_EF_VERSION` | `send-message` EF | live version | 21 |

### Lessons applied from prior FOREMAN_REVIEW.md files in this module

| Source | Proposal | Applied here? |
|---|---|---|
| `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` Author #1A | "Brief envelope can be safely narrowed" | YES — §6.5 narrower than Brief: Brief authorizes one EF code change, this SPEC narrows it to declare extraction to new file `allowlists.ts` (forced by Iron Rule 12 file-size cap; see §6.5 and §7). |
| `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` Author #1B | "Use integer-only Destructive Operations heading" | YES — using `## 6. Destructive Operations` (integer) instead of `## 6.5. Destructive Operations` (decimal). Renumbered §6 to satisfy Iron-Rule-32 regex. |
| `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` Author #2 | "Pre-write diagnostic in Full-Auto Pipeline mode" | YES — `DIAGNOSIS.md` written before this SPEC's first commit, success criteria in §3 use concrete values from diagnostic. |
| `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` Executor #1 | "No-op-verify when destructive op is unneeded" | N/A — this SPEC's destructive ops are required, not optional. |
| `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` Executor #2 | "ESCALATION.md as first-class artifact when Brief authorizes planned escalation" | N/A — this SPEC has no planned escalation. |
| `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL` (the precedent that introduced the SMS allowlist) | The SMS allowlist contract (jsonb array, NULL = production mode, fail-closed on lookup error) | APPLIED — `emailAllowed()` mirrors the same contract. |

### Cross-Reference Check (Rule 21 — No Orphans, No Duplicates)

New names this SPEC introduces:
- `emailAllowed` (function name in EF)
- `normalizeEmail` (function name in EF)
- `allowlists.ts` (new file)
- `test_mode_email_allowlist` (jsonb key inside `ui_config`)

Grep results:
- `emailAllowed`: zero hits across `supabase/functions/`, `js/`, `shared/`, `modules/` — clean.
- `normalizeEmail`: zero hits across `supabase/functions/`, `js/`, `shared/` — clean.
- `allowlists.ts`: zero hits — file does not exist.
- `test_mode_email_allowlist`: only in this SPEC's Brief + predecessor SPEC + this SPEC. Not in EF code, not in DB. Confirmed via `ui_config ? 'test_mode_email_allowlist'` returning `false` for both tenants.

No collisions. Rule 21 satisfied at author time.

---

## 1. Goal

Add `ui_config.test_mode_email_allowlist` jsonb infrastructure to the `tenants` table (no schema change — uses existing jsonb column), wire the `send-message` Edge Function to respect it on the email channel mirroring the existing SMS allowlist contract, and populate demo's value with Daniel's 3 emails. Prizma's `ui_config` stays untouched so its current "send to all" email behavior is preserved.

---

## 2. Background & Motivation

The predecessor SPEC `DEMO_WHITELIST_UPDATE` (2026-05-11) discovered that demo's SMS allowlist was already correctly configured (3 phones in `tenants.test_mode_sms_allowlist`), but **no email allowlist mechanism exists** in the architecture. Email-channel outbound from any tenant currently has no recipient gating — every email goes to whatever `variables.email` contains. ESCALATION.md enumerated 3 options; Architect chose Option 2 (jsonb under existing `ui_config`) on 2026-05-11 for minimal schema disruption.

This SPEC closes the email gap before Daniel runs the full manual test cycle on demo, so test emails are guaranteed to land only on Daniel's own inboxes.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at SPEC start | On `develop`, clean of OUR files | `git branch` → `develop`; `git status` selective add only |
| 2 | New file `supabase/functions/send-message/allowlists.ts` exists | exists, contains `phoneAllowed` + `emailAllowed` + `normalizePhone` + `normalizeEmail` | `ls supabase/functions/send-message/allowlists.ts` exit 0; `grep -E "function (phoneAllowed\|emailAllowed\|normalizePhone\|normalizeEmail)"` returns ≥ 4 |
| 3 | `index.ts` updated: removes inline `phoneAllowed`/`normalizePhone`, imports from `allowlists.ts`, adds email gate | line count ≤ 320 (was `BASE_LINES_index_ts`=331); contains `import { phoneAllowed, emailAllowed }`; contains `await emailAllowed(db, tenantId, recipientEmail)` | grep + `wc -l` |
| 4 | Iron Rule 12 file-size cap | `index.ts` ≤ 350; `allowlists.ts` ≤ 350 | `wc -l` |
| 5 | EF deployment | live `send-message` EF version ≥ 22 (one bump from `BASE_EF_VERSION`=21) | Supabase MCP `get_edge_function` |
| 6 | Demo `ui_config.test_mode_email_allowlist` | exactly `["danylis92@gmail.com", "daniel@prizma-optic.co.il", "alkimovich94@gmail.com"]` (jsonb array, length 3) | `SELECT ui_config->'test_mode_email_allowlist', jsonb_array_length(ui_config->'test_mode_email_allowlist') FROM tenants WHERE id='8d8cfa7e-...'` |
| 7 | Prizma `ui_config ? 'test_mode_email_allowlist'` | `false` (key absent — preserves "send to all" current behavior) | `SELECT ui_config ? 'test_mode_email_allowlist' FROM tenants WHERE id='6ad0781b-...'` returns `false` |
| 8 | Prizma `updated_at` unchanged | equals `BASE_PRIZMA_UPDATED_AT` = `2026-03-19 09:54:27.256+00` (zero drift on production row) | `SELECT updated_at FROM tenants WHERE id='6ad0781b-...'` |
| 9 | `docs/GLOBAL_SCHEMA.sql` updated | contains a documentation block referencing `tenants.ui_config.test_mode_email_allowlist` with key shape (jsonb array of strings) | `grep -c "test_mode_email_allowlist" docs/GLOBAL_SCHEMA.sql` ≥ 1 |
| 10 | `references/DECISIONS_LOG.md` entry | new 2026-05-11 row recording the design choice (Option 2 over column add or separate column) | `grep -c "DEMO_EMAIL_ALLOWLIST" .claude/skills/opticup-architect/references/DECISIONS_LOG.md` ≥ 1 |
| 11 | `OPEN_TASKS.md` updated | the Architect-decision row from `DEMO_WHITELIST_UPDATE` (email allowlist mechanism pending) marked closed | `grep` shows entry resolved / removed |
| 12 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 13 | Smoke tests | 7/7 PASS | `npm run smoke` exit 0 |
| 14 | Working tree clean post-commit | only our files committed; pre-existing untracked from prior sessions left alone | `git log origin/develop..HEAD --oneline` then `git status` |
| 15 | Pushed to `origin/develop` | yes, NOT `main` | `git push origin develop` exit 0 |
| 16 | EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md present | 3 files in SPEC folder | `ls modules/Module\ 4\ -\ CRM/docs/specs/DEMO_EMAIL_ALLOWLIST_INFRA/` |

---

## 4. Autonomy Envelope

### What the Pipeline CAN do without asking

- Read any file in the repo
- Run read-only SQL via Supabase MCP (Level 1 autonomy)
- Create the new file `supabase/functions/send-message/allowlists.ts`
- Modify `supabase/functions/send-message/index.ts` (extract `phoneAllowed`/`normalizePhone` + add `emailAllowed` import + add email gate)
- Deploy the `send-message` EF (one redeploy; Level 2 — counts as a write but is exactly what the Brief authorizes)
- Run ONE single-row UPDATE on demo's `tenants.ui_config` via `jsonb_set` (Level 2 write, demo only)
- Update `docs/GLOBAL_SCHEMA.sql`, `OPEN_TASKS.md`, `references/DECISIONS_LOG.md`
- Commit and push to `develop` with selective `git add` (named files only)
- Run `npm run verify:integrity` + `npm run smoke`

### What REQUIRES stopping and reporting

- Any UPDATE/DELETE that touches Prizma's tenants row
- Any DDL (`ALTER TABLE`, `ADD COLUMN`, `DROP`, `CREATE COLUMN`) — none authorized
- Any merge to `main`
- Smoke tests less than 7/7 PASS
- `verify:integrity` exit 1 (null-byte ERROR) — pre or post any commit
- Live EF version not advancing after deploy attempt
- Any sign that the SMS allowlist behavior changed (must be byte-identical post-extraction)

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Any SQL UPDATE attempt against `WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` (Prizma) → STOP
- After UPDATE, demo's `ui_config` loses any pre-existing key (the `jsonb_set` should ADD, not REPLACE the whole jsonb) → STOP
- After EF deploy, the `send-message` EF live version is not at least `BASE_EF_VERSION` + 1 (≥ 22) → STOP
- `index.ts` line count > 350 post-change → STOP (Iron Rule 12 cap)
- `npm run smoke` fails (any subset) → STOP
- Concurrent writer detected on either tenants row (`updated_at` changes between two reads in pre-snapshot vs post-snapshot for Prizma) → STOP

---

## 6. Destructive Operations

Required by Iron Rule 32. List of every destructive operation this SPEC authorizes — pre-commit hook `scripts/checks/destructive-ops-declared.mjs` will reject the commit otherwise.

1. **Edge Function code change + redeploy** of `send-message` only. New file `allowlists.ts` added to the EF; `index.ts` modified (extract + add email gate). Triggers a new EF version bump (21 → 22). Rollback: redeploy v21 source from git.
2. **Single-row UPDATE on `tenants`** scoped to `WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` (demo only). Uses `jsonb_set` so existing keys are preserved. No DDL.
3. **Repo file edits** (additive only): new `allowlists.ts`; in-place edits to `index.ts`, `docs/GLOBAL_SCHEMA.sql`, `OPEN_TASKS.md`, `references/DECISIONS_LOG.md`.

Explicitly forbidden:
- ANY UPDATE/DELETE on Prizma's `tenants` row
- ANY DDL (ADD COLUMN, ALTER TABLE, DROP, CREATE TABLE, etc.)
- ANY DELETE on any table
- Force-push
- Merge to `main`
- Sending any live test email during the SPEC (verification is by SELECT + EF code read; the Brief explicitly forbids outbound email)
- Refactoring or removing the SMS allowlist logic — the extraction to `allowlists.ts` must preserve `phoneAllowed`/`normalizePhone` byte-for-byte (only the file location moves)

(Note on the SMS "modification" concern raised in Brief §3 line 121: relocating the function from `index.ts` to `allowlists.ts` is a structural move forced by Iron Rule 12 file-size cap, not a logic change. SMS behavior is byte-identical. If a future reviewer disagrees with this interpretation of Brief §3, rollback is `git revert` of the single EF commit — the demo's `ui_config` UPDATE stands on its own.)

---

## 7. Out of Scope (explicit)

- Touching Prizma's `tenants` row in any way (UPDATE/DELETE)
- Adding a column to `tenants` table (decision: jsonb in `ui_config`, not new column)
- Schema changes of any kind
- Adding email allowlist values to any tenant other than demo
- Modifying SMS allowlist contract or values
- Refactoring `dispatch.ts`, `event-variables.ts`, `lead-variables.ts`, `url-builders.ts`, `_shared/tenant-config.ts` (the other 5 EF files)
- Validation UI in tenant config — backend mechanism only
- Adding observability/telemetry beyond the existing `crm_message_log` rejection pattern
- Migrating other tenants to email allowlist (only demo gets a value in this SPEC)

---

## 8. Expected Final State

### New files
- `supabase/functions/send-message/allowlists.ts` — co-located SMS + email allowlist helpers; ~70-90 lines

### Modified files
- `supabase/functions/send-message/index.ts` — `phoneAllowed`/`normalizePhone` and their 3-line header comment block (lines 32-60 of v21) removed; replaced with import line from `./allowlists.ts`; new email gate block added after the SMS gate (parallels lines 311-318 v21); expected final line count: 305-320
- `docs/GLOBAL_SCHEMA.sql` — documentation block added describing the `tenants.ui_config.test_mode_email_allowlist` key (jsonb array of strings; empty/missing = send to all; non-empty = filter recipients)
- `OPEN_TASKS.md` — Architect-decision row from `DEMO_WHITELIST_UPDATE` marked closed / resolved
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — 2026-05-11 entry recording the Option 2 (jsonb in ui_config) choice

### Deleted files
None.

### DB state
- `tenants` row `8d8cfa7e-...` (demo): `ui_config.test_mode_email_allowlist` = `["danylis92@gmail.com", "daniel@prizma-optic.co.il", "alkimovich94@gmail.com"]` (jsonb, length 3). All other `ui_config` keys preserved.
- `tenants` row `6ad0781b-...` (prizma): ZERO change. `ui_config` does NOT have `test_mode_email_allowlist` key. `updated_at` matches `BASE_PRIZMA_UPDATED_AT`.

### EF state
- `send-message` live version ≥ 22 (one bump from 21).

### Docs updated
- `docs/GLOBAL_SCHEMA.sql` — new key documented
- `OPEN_TASKS.md` — predecessor row closed
- `DECISIONS_LOG.md` — design choice recorded
- Module 4 `SESSION_CONTEXT.md` — NOT updated (no functional change to CRM module's business state — just plumbing under existing send-message EF)
- Module 4 `CHANGELOG.md` — NOT updated (commit history lives in git; module-level changelog reserved for phase/feature closures)
- `MASTER_ROADMAP.md` — NOT updated (no module-state change)
- `GLOBAL_MAP.md` — NOT updated (`emailAllowed` is an internal EF helper, not a cross-module contract)

### Closure artifacts in SPEC folder
- `SPEC.md` (this file)
- `DIAGNOSIS.md` (already written pre-commit)
- `EXECUTION_REPORT.md`
- `FINDINGS.md`
- `FOREMAN_REVIEW.md`

---

## 9. Commit Plan

Single commit grouping everything (one concern: add email allowlist infrastructure):

- **Commit 1:** `feat(send-message): add email allowlist gate mirroring SMS pattern` — touches `supabase/functions/send-message/allowlists.ts` (new) + `supabase/functions/send-message/index.ts` (modified) + `docs/GLOBAL_SCHEMA.sql` + `OPEN_TASKS.md` + `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` + all closure artifacts in the SPEC folder (`SPEC.md`, `DIAGNOSIS.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `FOREMAN_REVIEW.md`).

The DB UPDATE and EF redeploy happen via Supabase MCP and are not in the git history. EXECUTION_REPORT.md will record the live EF version + the post-UPDATE SELECT proof.

`git add` will be by explicit filename (Rule 21 + CLAUDE.md §9 rule 6). Pre-existing untracked files from prior sessions (architecture-briefs, other SPEC folders) are NOT staged.

---

## 10. Dependencies / Preconditions

- Predecessor SPEC `DEMO_WHITELIST_UPDATE` closed 🟡 on 2026-05-11 with ESCALATION.md surfacing email gap
- Architect decision: Option 2 (jsonb in `ui_config`) — chosen 2026-05-11
- `send-message` EF v21 deployed and operational
- `npm run smoke` baseline passes today (7/7 PASS pre-SPEC)
- Demo + Prizma `tenants` rows present and stable

---

## 11. Lessons Already Incorporated

All applicable proposals from `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` and `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/FOREMAN_REVIEW.md` (where present). See §0 table for itemization.

Cross-Reference Check completed 2026-05-11 against GLOBAL_SCHEMA + GLOBAL_MAP + filesystem: 0 collisions / 4 new names confirmed unique.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2
- [ ] `git status --short` shows only our SPEC artifacts before commit, clean after
- [ ] HEAD pushed to `origin/develop` (NOT `main`)
- [ ] EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md written
- [ ] SMS allowlist behavior verified unchanged (the `phoneAllowed` body in `allowlists.ts` is byte-identical to v21's `index.ts` version)
- [ ] No Prizma row touched (pre+post snapshot equality)

---

*End of SPEC.*
