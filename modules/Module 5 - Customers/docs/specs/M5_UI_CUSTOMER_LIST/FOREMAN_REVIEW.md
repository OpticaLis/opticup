# M5_UI_CUSTOMER_LIST — Foreman Review

> **Role:** opticup-strategic (Foreman, post-execution review)
> **Authored:** 2026-05-23 close
> **Subject:** SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW for `M5_UI_CUSTOMER_LIST` (Phase E)
> **Commit range:** `d423940` (SPEC seal) → `e7e18b0` (build) → (this close commit).

## SPEC quality audit

- **Measurable success criteria?** Yes — 32 criteria with exact expected values + verify commands. Every criterion either passed (28) or has a documented partial/finding (4, all LOW/INFO).
- **Stop triggers clear?** Yes — §5 enumerated 4 specific deviation triggers. None fired.
- **Autonomy envelope appropriate?** Yes — Daniel-in-loop pauses (C1/C2/C3) didn't trigger. The Executor stayed within envelope.
- **What the SPEC missed:**
  - **§0 Pre-Authoring Reality Check didn't enumerate `v_customer_for_exam` column list** — F-LIST-PHONE-VIEW caught at S1 smoke. Would have been an author-time catch had the SPEC pinned the col list. P-AUTHOR-4 below.
  - **§3a S9 (id_number_exists) verified by-pattern** instead of explicit smoke — defensible (id_number test would mutate live demo state beyond the smoke teardown window) but the SPEC could have called out the by-pattern verification path explicitly.

## Execution quality audit

- **Did the Executor follow the SPEC?** Yes, with maximum-autonomy discipline. 2 logically-scoped build commits + 1 closure commit. Selective `git add` throughout. No Prizma writes. No schema change. No merge to main.
- **Deviations handled correctly?** Yes — F-LIST-PHONE-VIEW caught at S1, fixed in the same build commit by extending the parallel fetch (no separate "bug-fix" commit needed). Not silently absorbed.
- **Spot-checks (3 of largest claims):**
  1. **"All 4 new JS files ≤271L"** — `wc -l`: customer-list-sidebar.js 91 / customer-list-filters.js 104 / customer-create.js 162 / customer-list.js 271. Verified.
  2. **"create_customer dedup contract works for both phone_exists + id_number_exists"** — RPC body code review (probed in pre-flight) confirms id_number branch fires FIRST, phone branch fires SECOND, returns `{created:false, reason:<which>}`. S8 smoke verified the phone_exists path live (dedup surface visible + 0 row delta). S9 verified by-pattern. Acceptable.
  3. **"+11 coming-soon registry keys ADDITIVE only"** — `git diff` shows the registry edit is `+11 lines, 0 removed`. Existing entries unchanged. Verified.
- **Chrome MCP closure evidence quality:** 4 JPEGs landed (list_default + list_filtered_leads + create_modal_open + create_dedup_hit). Runtime traces for both create paths real and captured (S7 trace race notwithstanding — F-LIST-TRACE-RACE — test-only). DB delta evidence captured pre/post for both paths.
- **Self-assessment accuracy:** Executor scored 9/9/9/9. Foreman concurs.

## Findings processing

`FINDINGS.md` lists 5 items. Foreman decisions:

| # | Severity | Decision | Action |
|---|---|---|---|
| F-LIST-PHONE-VIEW | LOW | TECH_DEBT — future `v_customer_for_list` view. | Add to `TECH_DEBT.md` (or M5-scoped). Not pursued this SPEC. |
| F-LIST-PHONE-NORMALIZE | LOW | TECH_DEBT — future `customers.phone_e164_suffix` generated column for server-side indexed search. | Same. |
| F-LIST-MOCKUP-COLUMNS | LOW | Documented out-of-scope (memory `feedback_no_polish_by_validation`). Future SPEC after M6/M7/M13 lights up the aspirational columns. | No action this SPEC. |
| F-LIST-RESIDUAL-CUSTOMER | INFO | Out of scope — not introduced by Phase E. | Optional future demo-cleanup SPEC. |
| F-LIST-TRACE-RACE | INFO | Test-only artifact (P-EXEC-4 codifies the event-driven smoke pattern). | Dismiss the finding; codify the pattern in opticup-executor SKILL. |

Plus 1 finding surfaced by the Reviewer (F-LIST-PAGINATION-UI) — TECH_DEBT for "load more" UI at Prizma scale.
Plus 1 cosmetic from Reviewer (F-LIST-STATE-NAMESPACE) — wrap `__customerList*` globals into `window.M5CardList`.

## 2 author-skill improvement proposals

### P-AUTHOR-4 — Pin view column lists in §0 Pre-Flight (already harvested from EXECUTION_REPORT)

Verbatim from EXECUTION_REPORT §8. Update SPEC_TEMPLATE.md §0 to require enumerating the FULL column list of every consumed DB view (not just the view name or col count). Would have caught F-LIST-PHONE-VIEW at author time.

### P-AUTHOR-5 — Track per-Phase scope-clean dependencies in the SPEC's §10

**Symptom:** Phase E inherited the empty-state branch from Phase D's customer-card.js. The SPEC §4 Autonomy Envelope correctly listed this as "the ONE allowed touch in the Phase D card." But a less-careful Executor could have read that as "Phase D file is fair game" and broadened the diff. The SPEC's §10 Dependencies / Preconditions should explicitly enumerate "files from prior phases that this SPEC ALLOWS to edit, with the precise allowed change" — not just the precondition. The CLOSURE_SPEC pattern (allowed touches listed precisely) is the right model.

**Proposed change:** Update `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §10 Dependencies / Preconditions with a new sub-section:

> **Files from prior phases this SPEC permits editing (per-Phase scope precision):** for each file outside the SPEC's primary scope that the SPEC is allowed to touch, list `<path>: <precise allowed change>` (e.g. `customer-card.js: replace the empty-state branch with mountCustomerList() dispatch — 1 small `if/else` block, no other edits`). Anything outside the precise change is OUT of scope. The Reviewer + Foreman audit against this list.

**Acceptance:** next multi-phase module SPEC enumerates prior-phase touch budget at author time.

## 2 executor-skill improvement proposals

### P-EXEC-4 — Event-driven smoke timing (already harvested from EXECUTION_REPORT)

Verbatim from EXECUTION_REPORT §8. Codify `awaitTraceEvent(name, timeoutMs)` poll pattern in opticup-executor SKILL.md. Would have eliminated F-LIST-TRACE-RACE.

### P-EXEC-5 — Cleanup the residual-customer state in M5 demo

**Symptom:** F-LIST-RESIDUAL-CUSTOMER — demo customers count was 20 (not the 19 the M5_SCHEMA EXECUTION_REPORT documented). One extra row from an earlier smoke that wasn't cleaned. Not Phase E's fault, but the demo state is drifting.

**Proposed change:** Add to `opticup-executor` SKILL.md "Verification After Changes" section a new sub-bullet:

> **Demo-state drift check (for UI SPECs that depend on demo row counts):** before starting smokes, run `SELECT count(*) FROM customers WHERE tenant_id=<demo>` against the M5_SCHEMA EXECUTION_REPORT documented baseline (19 customers as of 2026-05-22). If the count has drifted +1 or +2, surface in EXECUTION_REPORT §5 Decisions as "demo state drifted by N — not caused by this SPEC". If drifted +5 or more → STOP and escalate; demo state may have been corrupted by an unclean smoke.

**Acceptance:** future M5-touching SPECs detect + surface demo drift instead of silently accepting it.

## Master-doc update checklist

| File | Status | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` §3 row #5 | ✅ updated this commit | Now reflects Phase A+B + leads-migration + Phase D + Phase E ALL CLOSED. |
| `docs/GLOBAL_MAP.md` | ✅ updated this commit | New "Module 5 — Customer List + Create-Mode UI" subsection appended. |
| `docs/GLOBAL_SCHEMA.sql` | N/A | No DDL this SPEC. |
| `docs/DB_TABLES_REFERENCE.md` | N/A | No new T-constants. |
| `docs/FILE_STRUCTURE.md` | ✅ updated this commit | modules/customers/ folder description updated to 12 files (was 8, +4 Phase E). |
| `js/shared.js` | N/A | No new T-constants. |
| `js/shared-field-map.js` | N/A | No new FIELD_MAP entries needed. |
| `CLAUDE.md` §0.5 | N/A | No new root entrypoint. |
| `scripts/checks/root-allowlist.json` | N/A | No new root entrypoint. |
| `M5 MODULE_5_ROADMAP.md` | ✅ updated this commit | Phase E row → ✅ 🟢 |
| `M5 docs/SESSION_CONTEXT.md` | ✅ updated this commit | Phase E status + "what's next" → M6. |
| `M5 docs/CHANGELOG.md` | ✅ updated this commit | Phase E entry with commit hashes. |
| `M5 docs/MODULE_MAP.md` | ⏳ pending | Could add a UI Surfaces section listing list + create. Foreman defers to a small follow-up (or pick up at M6 close). |
| `PATH_TO_LIVE.md` | ✅ updated this commit | M5 Phase E checkbox ticked + "Right now" header refreshed to M6. |

## Verdict

🟢 **CLOSED.**

All 32 §3 success criteria pass or have documented findings (5 LOW/INFO). All Iron Rules satisfied. Iron Rule 34 closure complete with real evidence. The Executor caught its own bug (F-LIST-PHONE-VIEW) at the smoke loop and fixed it in-loop — that's the discipline working as designed. **M5's screen layer is complete.**

**M6 (Prescriptions UI)** is the natural next module — it lights up the customer-card's Tab 3 (already wired to `v_customer_prescriptions_summary` + `create_prescription_draft`) plus the Vision tab stub via `v_customer_vision_function_history`.

The render+action wiring pattern established by Phase D is now reused across two screens (card + list/create) — the template stands. Any future M5-M9 UI screen copies this same shape.
