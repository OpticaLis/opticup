# SPEC — M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — at request of Daniel + Campaign Overseer post-merge audit
> **Authored on:** 2026-05-06 (late evening)
> **Module:** 4 — CRM
> **Phase:** Post-closure cleanup + final sweep
> **Severity:** LOW (doc gaps + audit pass — no production blocker)

## 1. Goal

Close 2 small gaps left from M4_CLOSURE_AND_INTEGRATION_CEREMONY today AND run a final-sweep audit looking for any remaining discrepancies, security gaps, broken references, or stale files specific to Module 4. Output is 1-3 commits + an APPENDIX in the EXECUTION_REPORT documenting the sweep results.

## 2. Background & Motivation

Daniel's post-merge audit (2026-05-06 late evening) revealed:
- **Gap A:** `M4_CLOSURE_AND_INTEGRATION_CEREMONY` declared in §3 #10 + Commit 7 that M4 schema would be merged into `docs/GLOBAL_SCHEMA.sql`. The commit `d1f8c0d` exists, but live grep against the file shows the 9 core M4 tables (`crm_leads`, `crm_events`, `crm_event_attendees`, `crm_message_log`, `crm_message_queue`, `crm_message_templates`, `crm_automation_rules`, `crm_automation_runs`, `cms_leads`) are NOT present. Either the merge was partial or the executor mis-recorded success. Confirmed via `git grep -c "crm_leads\|crm_events\|crm_event_attendees\|crm_message_log" docs/GLOBAL_SCHEMA.sql` → 0 hits.
- **Gap B:** `M4_CLOSURE_AND_INTEGRATION_CEREMONY` itself has SPEC.md + EXECUTION_REPORT.md + FINDINGS.md but NO `FOREMAN_REVIEW.md`. Standard closure protocol requires it.
- Plus: a final sweep is requested by Daniel — look for OTHER discrepancies, missing FOREMAN_REVIEWs, stale docs, or security loose ends specific to M4.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at end | `develop`, clean | `git status` |
| 2 | Commits produced | 2 (backfill + retrospective) OR 3 if sweep finds something fixable in scope | `git log` |
| 3 | `docs/GLOBAL_SCHEMA.sql` contains all 9 M4 tables | each appears at least once (CREATE TABLE or banner mention) | `git grep -c "<tablename>" docs/GLOBAL_SCHEMA.sql` ≥ 1 each |
| 4 | `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` exists | file present with standard 7 sections | `ls` + content check |
| 5 | Sweep results documented in this SPEC's `EXECUTION_REPORT.md` §Appendix-Sweep | sweep section enumerated with disposition per finding | inspect |
| 6 | Integrity gate | exit 0 or 2 | `npm run verify:integrity` |
| 7 | No prizma writes | 0 | sanity (no DB writes at all in this SPEC) |
| 8 | Iron Rule 12 | none of touched docs >350 lines after edit | spot-check |

## 4. Autonomy Envelope

### CAN do without asking
- Read `modules/Module 4 - CRM/docs/db-schema.sql` to know what M4 declares
- Append M4 schema content to `docs/GLOBAL_SCHEMA.sql` under a clear `-- ===== Module 4 — CRM =====` banner; never overwrite other modules' content
- Write `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` based on the standard 7-section template (executor reads SPEC + EXECUTION_REPORT + FINDINGS to write it)
- Run the FINAL SWEEP (§9 below) — read-only audits across the M4 surface
- For any sweep finding that is small + safe + in scope (e.g., a typo in an M4 doc, a missing line in CHANGELOG, a stale reference) — fix it in this SPEC
- For any sweep finding that is non-trivial — log to FINDINGS.md as a future-SPEC stub; do NOT fix here
- Commit + push per §10 commit plan

### REQUIRES stopping
- Any source code change (`.js`, `.ts`, `.css`, `.html`)
- Any migration file
- Any EF deploy
- Any DB DDL or write
- Modifying other modules' MODULE_MAPs / db-schemas — only ADD M4 to global files
- Sweep finding that needs a hotfix — STOP, escalate, do not bundle into this SPEC
- Merge to main (we just merged today; develop ↔ main are in sync; this SPEC's commits stay on develop until next merge)
- Total runtime exceeding 60 minutes

## 5. Stop-on-Deviation Triggers

- `docs/GLOBAL_SCHEMA.sql` already contains the M4 tables when you go to write them → STOP, the audit was wrong; document and revisit gap analysis
- Any in-scope sweep fix takes more than 5 minutes → log as finding, don't fix
- A sweep reveals a CRITICAL or HIGH security finding → STOP, escalate, separate hotfix SPEC

## 6. Rollback Plan

Doc-only commits. `git revert <commit>` for any individual reversal.

## 7. Out of Scope (DO NOT touch)

- Source code
- Migrations
- EF deploys
- The 5 SPECs that closed today (M4_PUBLIC_FORM_VARIABLES_HIGH, M4_UNSUB_SUPPRESSION_CRIT, M4_TENANT_ISOLATION_HARDENING_PART1/PART2, M4_HARDCODED_PRIZMA_REMOVAL) — they are CLOSED with FOREMAN_REVIEWs done
- The 4 backfill FOREMAN_REVIEWs from M4_CLOSURE_AND_INTEGRATION_CEREMONY — they are DONE today
- Tech-debt items already logged: M4-DEBT-01 (shared.js 408), event_type field, multi-tenant URL, demo seed data, M4_TEMPLATE_BODY_PRIZMA_REMOVAL (the F1 from PRE_MERGE_QA), incoming-tab phone search parity
- M4_PRE_MERGE_QA's report file — the QA report is the artifact; FOREMAN_REVIEW for an audit-only SPEC is OPTIONAL (the report itself is the review). If you choose to write one for completeness, max 200 lines; do NOT block on it.

## 8. Expected Final State

### Modified file (1)

- `docs/GLOBAL_SCHEMA.sql` — append a Module 4 banner section followed by the 9 core M4 tables' DDL (or banner + reference if the full DDL is too long; minimum: each table named in a comment so future audits can grep). Source of truth: `modules/Module 4 - CRM/docs/db-schema.sql`. Last-reconciled stamp at top bumped to 2026-05-06 (Module 4 added).

### New file (1, possibly 2)

- `modules/Module 4 - CRM/docs/specs/M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` — standard 7-section retrospective for the closure ceremony. Note: the sweep findings in THIS SPEC may include the §3 #10 partial-execution issue (the global-schema merge that didn't actually complete). The FOREMAN_REVIEW for M4_CLOSURE should mention the gap was caught by post-merge sweep.
- `modules/Module 4 - CRM/docs/specs/M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP/EXECUTION_REPORT.md` — this SPEC's retrospective with the §9 sweep results in an APPENDIX.
- `modules/Module 4 - CRM/docs/specs/M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP/FINDINGS.md` — sweep findings table.

### NOT modified

- ROADMAP.md, MASTER_ROADMAP.md (no phase boundary)
- MODULE_MAP.md (no new code names)
- SESSION_CONTEXT.md (closed today; touch only if sweep reveals an inconsistency)
- CHANGELOG.md (touch only if a single line is needed for the schema-backfill commit)
- Any source file
- Other modules' files

## 9. Final Sweep Plan (read-only audit + small in-scope fixes)

For each item below, the executor reads + verifies, documents disposition in EXECUTION_REPORT §Appendix-Sweep:

### 9.A — Stale references in M4 docs
- Grep all M4 docs (`modules/Module 4 - CRM/**/*.md`) for paths/files that no longer exist:
  - `cms_leads_anon_insert` policy references (the policy was dropped today; references in older SPECs are historical OK)
  - `submit_storefront_lead writes to cms_leads` (false — writes to storefront_leads; M4-DOC-05)
  - `event_registration_open` template slug (doesn't exist — M4-DOC-04)
  - `recipient_phone` / `recipient_email` columns (don't exist — M4-DOC-02)
  - `modules/crm/event-register.js` without `/public/` (M4-DOC-06)
- For each found: if it's in a CLOSED SPEC's already-shipped report → INFO only (historical); if it's in an OPEN doc (MODULE_MAP, SESSION_CONTEXT, CLAUDE.md) → fix.

### 9.B — Missing FOREMAN_REVIEWs scan
- List every folder under `modules/Module 4 - CRM/docs/specs/` (post-2026-04-14 SPECs) and check each for `FOREMAN_REVIEW.md`. Report any missing — most are expected, but flag any that should have it.

### 9.C — GLOBAL_MAP M4 entries spot-check
- Confirm `docs/GLOBAL_MAP.md` Module 4 section lists: `loadTenantConfig`, `soft_delete_event_if_empty`, `restore_event_from_log`, `register_lead_to_event`, `move_attendee_between_events`, `send-message` EF, `event-register` EF, `quick-register` EF, `unsubscribe` EF, `automation-engine` EF, `dispatch-queue` EF.
- Anything missing → add (single-commit fix).

### 9.D — Stale `_shared/` helpers
- `supabase/functions/_shared/` should contain `tenant-config.ts` (created today). Verify file exists + is referenced from at least 4 EFs (quick-register, send-message, resolve-link, event-register).
- If any EF should reference it but doesn't → log finding (NOT fix here — code change).

### 9.E — Inconsistent migration history
- `git log --since=2026-05-01 -- 'modules/Module 4 - CRM/migrations/'` — list every migration file shipped this cycle. For each, confirm pair `_up.sql` + `_down.sql` exist (or single file if pre-2026-04-29 convention).
- Specifically look at: `2026_05_06_tenant_config_seed`, `2026_05_06_tenant_isolation_part1`, `2026_05_06_revoke_anon_rpc_execute_v2`. If `_down.sql` missing for any → log finding.

### 9.F — Storefront cross-repo references
- Read-only check: any reference in M4 to storefront-repo paths/files (`opticup-storefront/...`). Confirm the references are accurate (storefront repo's CLAUDE.md still owns rules 24-30).
- If storefront repo is not mounted in this session, skip with note.

### 9.G — Sentinel alerts for M4
- Read `docs/guardian/GUARDIAN_ALERTS.md` if it exists. List any M4-related CRITICAL or HIGH alerts that haven't been resolved by today's SPECs.

### 9.H — Security gaps not yet logged
- Quick re-grep for unsafe patterns in M4 source: `dangerouslySetInnerHTML`, `eval(`, raw secrets, hardcoded passwords, `verify_jwt=false` on internal-only EFs.
- Should find zero (Phase 1 audit was thorough). Anything new → log + escalate.

### 9.I — Stale or orphan files in M4 tree
- Files under `modules/Module 4 - CRM/` whose last-modified date is older than 2026-04-01 AND not referenced from any other doc/code. Likely none, but worth a sweep.

### 9.J — CHANGELOG entries vs commit log
- For each commit on develop with `(M4_*)` or `(crm)` since 2026-05-01, confirm CHANGELOG.md has a corresponding line. Spot-check 5 random commits.

### 9.K — Tech-debt parity check
- Confirm every tech-debt item declared in §7 Out of Scope is logged somewhere durable (TECH_DEBT.md if exists, MEMORY.md, SESSION_CONTEXT.md). Flag any that's only logged in volatile places (a single SPEC's FINDINGS).

### 9.L — Final security litmus
- Re-run the 4 critical-finding verifications:
  - cms_leads policy: SELECT polname FROM pg_policy WHERE polrelid='public.cms_leads'::regclass → expects exactly 2 (service_bypass + tenant_isolation)
  - 7 v_crm_* views security_invoker: SELECT relname FROM pg_class WHERE relkind='v' AND relname LIKE 'v_crm%' AND 'security_invoker=on' = ANY(reloptions) → expects 7
  - cascade_attendee_soft_delete + import_leads_from_monday anon EXECUTE: has_function_privilege('anon', oid, 'EXECUTE') → false on both
  - send-message EF v20 has the suppression gate (read source for `unsubscribed_at`)
- All 4 should still PASS. If any regressed, STOP — escalate as CRITICAL.

## 10. Commit Plan

Up to 3 commits:
- **Commit 1:** `docs(global): backfill M4 schema into GLOBAL_SCHEMA.sql (M4_GLOBAL_SCHEMA_BACKFILL)`
- **Commit 2:** `docs(spec): backfill M4_CLOSURE_AND_INTEGRATION_CEREMONY FOREMAN_REVIEW`
- **Commit 3 (if any in-scope sweep fixes):** `docs(m4): sweep cleanup — small fixes from post-closure audit`
- **Commit 4 (final):** `chore(spec): close M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP with retrospective`

Push after each commit. Do NOT merge to main.

## 11. Lessons Already Incorporated

- **From M4_CLOSURE_AND_INTEGRATION_CEREMONY itself:** the closure SPEC declared §3 #10 GLOBAL_SCHEMA merge but the actual file content didn't get the M4 tables. Lesson: success criteria should be VERIFIED post-commit by the executor (not just "committed = done"). This SPEC's §3 criteria explicitly verify file content via `git grep -c`.
- **From the just-codified Step 1.5 §6/§7/§8/§9:** path verification done up-front in §11; PUBLIC inheritance not relevant (no GRANT/REVOKE here); preview-vs-customer-facing not relevant (no hardcoded values). pg_proc source-search not relevant (no RPCs).
- **From feedback_overseer_decision_patterns.md:** SPEC scope = "bounded + safe". This is bounded (doc-only) + safe (zero production touch).

**Cross-Reference Check:** ZERO new code names. Only documentation. 0 collisions.

**Filesystem path verification:**
- `docs/GLOBAL_SCHEMA.sql` exists ✓
- `modules/Module 4 - CRM/docs/db-schema.sql` exists ✓
- `modules/Module 4 - CRM/docs/specs/M4_CLOSURE_AND_INTEGRATION_CEREMONY/` exists ✓ (3 files: SPEC, EXECUTION_REPORT, FINDINGS)
- `modules/Module 4 - CRM/docs/specs/M4_GLOBAL_SCHEMA_BACKFILL_AND_SWEEP/` will be created

## 12. QA Plan

After each commit:
1. `git status` clean (after the relevant commit closes the editing window)
2. `npm run verify:integrity` exit 0 or 2
3. After Commit 1: `git grep -c "crm_leads\|crm_events\|crm_event_attendees\|crm_message_log\|crm_message_queue\|crm_message_templates\|crm_automation_rules\|crm_automation_runs\|cms_leads" docs/GLOBAL_SCHEMA.sql` → all ≥ 1
4. After Commit 2: `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` → exists; verify contains the standard 7 sections
5. After all commits: §3 success criteria #1-#8 all met
6. Sweep results in EXECUTION_REPORT §Appendix-Sweep are complete (all 12 sub-points 9.A-9.L addressed, even if "no findings — clean")

If §9.L re-verification of the 4 CRITICALs shows ANY regression, STOP and escalate. Don't proceed.

*End of SPEC.*
