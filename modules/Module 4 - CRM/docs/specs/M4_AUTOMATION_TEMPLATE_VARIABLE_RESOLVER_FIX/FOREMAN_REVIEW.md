# FOREMAN_REVIEW — M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX

**Foreman closing:** 2026-05-19 (continuation chain).
**Commits:** `1281b71` (implementation) + retros (next commit).
**Status:** 🟢 SPEC CLOSED. Verification 10/10. Demo end-to-end confirmed.

## 1. What this SPEC accomplished

The CRITICAL customer-facing fix from the QA report (Finding 1.2). Every event-status-change message that was being silently dropped on demo (and likely Prizma) now dispatches correctly. Three placeholders (`event_day_of_week`, `event_deposit_amount`, `event_max_attendees`) now resolved both at AE's pre-enqueue gate and at SM's dispatch path.

**Architectural improvement:** instead of inline duplication, helpers live in `_shared/event-variables.ts` — same pattern as `_shared/template-validation.ts`. Future event-context vars added to the shared module benefit both EFs automatically. Closes the gap permanently.

## 2. Lineage

| Source | Influence |
|--------|-----------|
| QA report Finding 1.2 (2026-05-18) | Identified the bug + named the 3 vars |
| M4_RESOLVER_GAP_VERIFICATION_2026_05_19 investigation | Confirmed `hebrewDayOfWeek` lives in send-message, not AE; recommended shared-extraction approach + confirmed 0 other AE-gap vars |
| Daniel's amendment instructions in continuation prompt | Authorized the shared-extraction direction over inline-paste |
| Brief §2.1-§2.5 | Acceptance criteria |

## 3. Verification matrix

10/10 ✅ — see EXECUTION_REPORT.md §"Verification matrix". The end-to-end demo trace is the definitive proof.

## 4. Skill-harvest proposals

### Author tier (opticup-strategic)

**A-1 — Investigation-before-Brief-execution pattern.** This SPEC benefited HUGELY from the read-only investigation that ran between Brief authoring and SPEC authoring. The investigation found the `₪50 ₪` double-symbol risk that would have shipped if I'd followed the Brief literally. **Improvement:** opticup-strategic skill should add a step "before executing any Brief that involves customer-visible string output, run a 5-min DB sample query on actual template bodies to verify format assumptions." This is cheap (1-3 SQL queries) and prevents customer-visible regressions.

**A-2 — Shared-module-first when modifying any helper used by multiple EFs.** The original send-message-only location of `hebrewDayOfWeek` was the root architectural cause. **Improvement:** opticup-strategic should add to Brief-authoring guidance a rule "if a function will be useful to ≥ 2 EFs, place it in `_shared/` from the start, not in one EF's local module." This prevents Iron-Rule-21 surfacing late (as in SPEC 1 of this overnight chain).

### Executor tier (opticup-executor)

**E-1 — Local regression test BEFORE EF deploy.** The regression test caught the `payment_url_50` false positive before any deploy. Saved a wasted deploy cycle. **Improvement:** opticup-executor should add to its EF-deploy checklist "if SPEC adds a regression test, run it locally + iterate on test logic until 100% PASS BEFORE deploying the EF. Otherwise the test becomes flaky-on-first-run."

**E-2 — Re-export-for-backcompat pattern.** When extracting helpers from EF-local to `_shared/`, the executor should re-export from the original location to keep any in-process callers working. This SPEC did so (`send-message/event-variables.ts` re-exports the 3 helpers). **Improvement:** opticup-executor should add a reference pattern "when extracting helpers to _shared/, ALWAYS re-export from the original module unless explicitly cleaning up callers. Removes coordination need with downstream importers."

## 5. Open follow-ups

- F-2 (`crm_automation_runs.sent_count` undercount) — Priority 5 from QA. Defer.
- F-4 (template currency redundancy `%var% ₪`) — UX polish. Defer.
- F-5 (format divergence on event_date / event_time) — recommend follow-up SPEC `M4_EVENT_FORMAT_HELPER_CONSOLIDATION`.

## 6. Rollback path

`git revert 1281b71` + redeploy old EFs from `_archive/m4-overnight-2026-05-18/ef-snapshots/automation-engine-*.ts` (automation-engine v16) + fetch + redeploy send-message v26 (snapshot not captured at pre-overnight; would need fresh re-fetch of the OLD version which Supabase keeps in EF history).

Realistic rollback time: ~10 min. Low risk because change is additive at the variable level.

## 7. Outcome statement

🟢 SPEC sealed. Resolver gap closed permanently via shared-module pattern. Demo verified. Prizma benefits automatically.
