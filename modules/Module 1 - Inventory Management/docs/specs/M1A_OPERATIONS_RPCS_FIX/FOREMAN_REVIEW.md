# FOREMAN_REVIEW.md — M1A_OPERATIONS_RPCS_FIX

**Reviewer:** opticup-strategic (Foreman hat)
**Reviewed:** 2026-05-15
**Inputs read:** SPEC.md (incl. Amendments #1 + #2), MIGRATION.md, ROLLBACK.md, EXECUTION_REPORT.md, FINDINGS.md (8 items), TEST_REPORT.md (6 cases), REVIEW.md (opticup-reviewer 🟢 PASS), all 13 commits `b0d44c1..5deb8fa`, both escalation files.

## SPEC quality audit

| Aspect | Verdict | Notes |
|---|---|---|
| Measurable success criteria | ✓ Excellent | 23 original + 2 amendment = 25, every one with exact expected value + verify command. |
| Stop-on-deviation triggers | ✓ Good | 10 triggers; the EF-deploy 5xx pivot fired exactly once and was handled correctly via the pre-authorized CLI fallback. |
| Autonomy envelope clarity | ✓ Good | Initial 5 fix domains pre-authorized; Amendment #2 broadened envelope to "any same-class orchestrator runtime defect surfaced by smoke" — this widening was justified by the 3rd-of-a-kind defect appearing mid-pipeline. |
| Pre-Authoring Reality Check (§0) | ✓ Excellent — with one omission | 14 baselines pinned from live measurements, surfaced 2 Brief divergences (movement_type kind, partial unique index already exists). **Omission:** §0 didn't pin `tenant_location` schema, which the smoke needed; executor had to probe mid-run (`short_code` vs `code`). Also §0 didn't grep the bodies of the 3 orchestrator RPCs for `record_stock_movement(` call counts — would have surfaced F-1 and F-2 BEFORE the SPEC dispatched. See Author-Proposal #1 below. |
| Iron Rule 32 §7 = None enforcement | ✓ Held | All 13 commits in scope passed `destructive-ops-declared.mjs`. No DROPs, no TRUNCATEs, no rebases, no main-branch ops, no destructive ops authorized or executed. CREATE OR REPLACE FUNCTION patterns are explicitly non-destructive. |
| §14 smoke design | ✓ Mostly good — one self-aware design flaw | 6 cases authored, all measurable, types tagged. The Case 4 sub-case-B "NULL claims" specification didn't pre-warn that `set_config('','true')` produces empty-string not NULL (different from production GUC-unset state). Executor handled it correctly (2-call approach). Also Case 2 expected `qty_on_hand = 3` rather than `tls_delta = +3` — assertion shape didn't account for fixture persistence across cases. |
| Amendment process | ✓ Excellent | Both amendments were authored cleanly: sibling escalation file + amendment section appended to SPEC.md + new Block in MIGRATION.md + paired DOWN block in ROLLBACK.md. Lifecycle stayed co-located inside the SPEC folder. |

**Overall SPEC quality: 8/10.** Strong baselines + structure + amendment hygiene. Two omissions in §0 cost ~30 minutes of mid-run discovery + 2 Foreman amendments; both omissions are codified as Author-Proposal #1 below.

## Execution quality audit

| Aspect | Verdict | Notes |
|---|---|---|
| Adherence to SPEC | ✓ Excellent | Followed Bounded Autonomy correctly. 2 genuine deviations (F-1 + F-2 orchestrator defects) → STOPPED, wrote escalation files, awaited Foreman. Did NOT silently absorb scope. Re-asserted Case 2 with corrected delta semantic — within "match → continue" loop discipline. |
| Iron Rule discipline | ✓ Excellent | Pre-commit `verify --staged` run before every commit; integrity gate run before every commit; no `--no-verify`, no `git add -A`, no `--amend`; selective filename `git add` throughout; CRLF warnings treated as informational. Rule 31 + 32 held perfectly. |
| Commit hygiene | ✓ Strong | 13 commits, all conventional-commit format, all single-concern, all signed `Co-Authored-By`. 1 file-size WARN (lens-catalog-import 306 lines vs soft 300, hard 350) — acceptable. 1 false-positive Rule 18 surfaced on a SQL doc-comment in the close commit; executor reworded the comment to dodge the regex (correct response per "Pre-commit hook fails → fix root cause, re-stage" playbook). |
| Escalation discipline | ✓ Excellent | Both F-1 and F-2 escalations were correctly written to `modules/Module 1 - Inventory Management/escalations/` with timestamps + severity + recommendation. Both correctly held the pipeline at HEAD-clean state pending Foreman decision. Did NOT escalate to Daniel directly. |
| MCP / EF discipline | ✓ Excellent | 7 MCP migrations applied with explicit names. EF deploy 5xx → executed the pre-authorized CLI fallback per Pattern A5 — no escalation, no Daniel question, exactly the documented path. |
| Smoke design adaptation | ✓ Good | Reasoned correctly through "expected qty_on_hand=3" → "tls_delta=+3 because Case 1 persisted +5"; corrected the assertion semantic without scope creep. F-4 documents the empty-string-vs-NULL edge thoroughly. |
| Documentation propagation | ✓ Strong | SESSION_CONTEXT, CHANGELOG, db-schema.sql (comment), GLOBAL_MAP.md (discipline note) all updated in the close commit. EXECUTION_REPORT + FINDINGS + TEST_REPORT all complete. **Note:** the SPEC §10 said "10 commits"; actual is 13 (1 base + 8 original fixes + 2 amendments + smoke + close + REVIEW). The deviation is fully accounted for in Amendments + EXECUTION_REPORT §4. |

**Overall execution quality: 9/10.** Textbook execution within Bounded Autonomy. The 1-point deduction is for two minor moments where additional self-verification would have caught issues earlier — the initial Case 2 assertion semantic + the empty-string-vs-NULL test sub-case design — both of which the executor self-corrected without external prompting.

## Spot-checks (Foreman's discretionary verification)

| # | Claim | Spot-check method | Result |
|---|---|---|---|
| 1 | `record_stock_movement` COMMENT references M1A SPEC slug | `obj_description(...)` ILIKE | TRUE ✓ |
| 2 | No overloads of `record_stock_movement` (single oid) | `count(*) FROM pg_proc` | 1 ✓ (no overloads — Fix #4 REVOKE/GRANT signatures unambiguous) |
| 3 | Demo smoke artifacts persist as Reviewer claimed (4 stock_movement rows) | tagged-notes count on demo | 4 ✓ (1 receipt + 1 xfer_out + 1 xfer_in + 1 adj_found) |
| 4 | `pending_lens_advancement_queue_stock_movement_unique` is a real UNIQUE INDEX | `pg_indexes` count by name | 1 ✓ |
| 5 | Amended functions have correct post-CREATE-OR-REPLACE ACL (anon/PUBLIC = 0) | `aclexplode` over 2 amended fns | 0 ✓ (both Block #6 + Block #7 correctly re-REVOKEd) |

All 5 spot-checks pass. Reviewer + Executor reports are trustworthy.

## Findings processing

| ID | Severity | Disposition (Foreman) |
|---|---|---|
| F-1 (record_transfer 17→19 arg fix) | CRITICAL | RESOLVED IN-PIPELINE via Amendment #1. No follow-up SPEC needed. |
| F-2 (record_adjustment_found 20→19 arg + slot-11 self-ref) | CRITICAL | RESOLVED IN-PIPELINE via Amendment #2. No follow-up SPEC needed. |
| F-3 (Demo lens-catalog seed fixtures gap) | HIGH | **Promote to MASTER_ROADMAP M1A-DEBT-04 + TECH_DEBT.md entry.** Phase 1B opening SPEC's §0 must either reuse the persistent fixtures (LV-TST001 + 2 demo locations + 1 offering) or create `modules/Module 1 - Inventory Management/scripts/seed-demo-lens-fixtures.sql`. Either path acceptable. |
| F-4 (`request.jwt.claims=''` empty-string raises 22P02 instead of 42501) | INFO | DISMISS. Unrealistic production scenario; function fails-safe regardless. Optional belt-and-suspenders for a future security-hardening pass. |
| F-5 (Foreman §0 didn't pin `tenant_location` schema) | MEDIUM | FOLD INTO Author-Proposal #1 below. |
| F-6 (lens-catalog-import 306 lines, soft 300, hard 350) | LOW | DISMISS. Within tolerance. No urgency. |
| F-7 (`is_platform_super_admin()` missing `SET search_path`, pre-existing) | INFO | DISMISS for this SPEC. Already scoped to future project-wide SECDEF search_path hardening (Reviewer I-7 / Sentinel M-5 known-debt). |
| F-8 (Demo cleanup deferred) | INFO | BUNDLED with F-3 under M1A-DEBT-04. Cleanup is optional; fixtures useful as Phase 1B seed. |

No finding is left orphaned.

## Author-skill (opticup-strategic) improvement proposals

### Author Proposal #1 — Add an "orchestrator call-arity audit" sub-step to §0 Pre-Authoring Reality Check

**Specific change:** In `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §0 Pre-Authoring Reality Check, add a new bullet under "Baselines from LIVE measurement":

> **Inner-call arity audit (for SPECs that modify or invoke SECDEF orchestrator RPCs):** for every callee function the SPEC names in §0 baselines (e.g. `record_stock_movement`), grep the bodies of all known caller orchestrators (`pg_get_functiondef` of each) for the call site and count positional arguments. Compare to the callee's `pronargs`. Mismatch → record in §5 Stop-Triggers as CRITICAL and pre-author a Fix block in §10. Recipe:
> ```sql
> WITH callers AS (
>   SELECT proname, pg_get_functiondef(oid) AS body
>   FROM pg_proc
>   WHERE proname IN (<orchestrator names>)
> )
> SELECT proname, body FROM callers WHERE body ~ E'\\b<callee_name>\\s*\\(';
> ```
> Manual scan: count positional args between `(` and matching `)`. Compare to `pronargs`. Any divergence ≥1 = SPEC defect, not executor problem.

**Rationale (from this SPEC):** F-1 and F-2 cost 2 mid-pipeline Foreman amendments + 2 escalation files + ~25 minutes of runtime adaptation. A 5-minute upfront audit would have surfaced both BEFORE the SPEC dispatched, allowing them to be authored as Fix #9 + Fix #10 in the original SPEC body rather than as amendments. Both bugs share the same defect-class signature ("Phase 1A smoke-skip → DOA orchestrator runtime defect"), so a single arity-audit recipe catches the entire class.

### Author Proposal #2 — Expand §0 baseline coverage to include ALL tables the §14 smoke will touch

**Specific change:** In `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §0 Pre-Authoring Reality Check, add a bullet under "Baselines from LIVE measurement":

> **Smoke-touched schema audit:** for every table named in §14 smoke case `Inputs` or `Expected` columns, pin its `information_schema.columns` shape AND its existing-row count for the test tenant in the §0 Baselines table. Avoids mid-execution "I assumed column X existed" surprises (F-3 + F-5 of this SPEC). Pattern: each smoke table gets a `BASE_<TABLE>_COLS` symbol and a `BASE_<TABLE>_DEMO_ROWS` symbol.

**Rationale (from this SPEC):** §0 captured stock_lot, stock_movement, tenant_lens_stock, pending_lens_advancement_queue. It did NOT capture tenant_location (column name `short_code` vs assumed `code`) or supplier_catalog_offering (not strictly needed for smoke but referenced). Executor had to probe both mid-run. F-3 + F-5 are the same problem from two angles — fixture absence on demo + schema mismatch on the table holding the fixtures.

## Executor-skill (opticup-executor) improvement proposals

### Executor Proposal #1 — Adopt "MIGRATION.md Applied Log" pattern as canonical when Foreman pre-fills bodies

**Specific change:** In `.claude/skills/opticup-executor/SKILL.md`, under the SPEC Execution Protocol section (Step 2), add:

> **MIGRATION.md Applied Log convention.** When the Foreman pre-fills MIGRATION.md block bodies up-front (no per-commit "fill in skeleton" file diff exists), append an `## Applied Log` table at the bottom of MIGRATION.md with columns `| Block | Migration name | Applied (UTC) | Verify result |`. Each DDL commit fills in one row when its block is applied. Gives per-commit auditability without requiring the Foreman to pre-author placeholders.

**Rationale (from this SPEC):** SPEC §10 commit plan said "MIGRATION.md (Block #N body filled in)" for each DDL commit, but the Foreman wrote full bodies up-front. The executor improvised the Applied Log pattern at runtime; documenting it once in the skill saves future executors from re-improvising. Pattern proved useful across all 7 blocks (5 original + 2 amendments).

### Executor Proposal #2 — Pre-flight fixture-existence check before running §14 smoke

**Specific change:** In `.claude/skills/opticup-executor/SKILL.md` Step 1.5 DB Pre-Flight, add a new sub-step after the existing T-constant plan:

> **8. Smoke-fixture audit (run only if SPEC §14 has any `db` or `api` cases):** for every demo-tenant-targeted smoke case, run a `SELECT count(*)` against the tables it expects to read from (`tenant_location`, `lens_variant`, `supplier_catalog_offering`, etc. — derived from the SPEC's smoke inputs). If any count is zero AND the SPEC §14 input depends on a non-zero count, STOP and escalate "fixtures missing on test tenant" before doing the DDL passes. The escalation lets the Foreman decide: (a) seed fixtures inline (in-pipeline), (b) defer smoke to a follow-up SPEC, (c) bundle fixture seed with the next phase's open SPEC.

**Rationale (from this SPEC):** F-3 surfaced mid-pipeline (zero demo locations / variants / offerings). The executor adapted by seeding fixtures inline — which worked but was a real-time decision, not a SPEC-authorized one. A pre-flight smoke-fixture audit would convert this from "discover mid-run, decide on the fly" to "discover at Step 1.5, escalate cleanly before any DDL lands." Time savings: ~10 min mid-run + cleaner audit trail.

## Master-doc update checklist

| File | Pending? | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` §3 (Current State) | **YES** — Foreman writes in next commit | Add `M1A_OPERATIONS_RPCS_FIX 🟢 closed 2026-05-15` row; note M1A-DEBT-04 as new low-priority. M1 phase status unchanged (Phase 1A stays ✅, Phase 1B stays ⬜ unblocked). |
| `MASTER_ROADMAP.md` §5 (Tech Debt) | **YES** | Add M1A-DEBT-04 entry. |
| `TECH_DEBT.md` | **YES** | M1A-DEBT-04 entry: "Demo lens-catalog seed fixtures persist from M1A_OPERATIONS_RPCS_FIX smoke. Phase 1B SPEC §0 must either reuse or replace with seed script." |
| `docs/GLOBAL_MAP.md` | ✓ done | Discipline note added in commit `a528cf2` under §7. |
| `docs/GLOBAL_SCHEMA.sql` | ✓ N/A | No new tables/views; M1 db-schema.sql carries the M1A_OPERATIONS_RPCS_FIX summary comment. |
| `modules/Module 1/docs/SESSION_CONTEXT.md` | ✓ done | 2026-05-15 section added in commit `a528cf2`. |
| `modules/Module 1/docs/CHANGELOG.md` | ✓ done | 12-commit list added in commit `a528cf2`. |
| `modules/Module 1/docs/db-schema.sql` | ✓ done | M1A_OPERATIONS_RPCS_FIX summary comment added in commit `a528cf2`. |
| `modules/Module 1/docs/MODULE_MAP.md` | ✓ N/A | No new files/functions/T-constants added by SPEC. The 5 function bodies modified were already mapped. |
| Skill files (opticup-strategic + opticup-executor) | DEFER to next session | The 4 proposals above accumulate; a future session applies them as real edits per the Self-Improvement Mandate. Not blocking this SPEC's close. |

## Verdict

🟢 **CLOSED.**

All 10 fixes shipped (8 SPEC-original + 2 mid-pipeline Foreman amendments for pre-existing orchestrator defects). All 6 functional smoke cases PASS on demo. Reviewer 🟢 PASS. All 25 success criteria pass strict or pass-with-by-design-note. Iron Rule 32 §7=None held across 13 commits. Zero Prizma data touched. Phase 1B is unblocked.

The Pipeline accomplished its core purpose — eliminating the exact failure mode that motivated it ("Phase 1A skipped functional smoke; orchestrators were DOA"). It also surfaced 2 additional same-class defects beyond the Brief's enumerated 8 — exactly the kind of insurance the mandatory-smoke discipline exists to provide. Adding the 9th and 10th fixes mid-pipeline (rather than as follow-ups) honored the Brief's stated intent ("all three orchestrator RPCs chain through it") and preserved Phase 1B's start-on-runnable-foundation guarantee.

This is the model run for "no 🟢 verdict without functional smoke" — every original fix proven by smoke + 2 secondary defects caught + fixed + smoke re-passed. The smoke discipline paid for itself within the same Pipeline.

---

## Final master-doc updates this commit

(Performed by Foreman in the same commit as this FOREMAN_REVIEW.md):
- `MASTER_ROADMAP.md` §3 — add M1A_OPERATIONS_RPCS_FIX closed row.
- `MASTER_ROADMAP.md` §5 — add M1A-DEBT-04 row (low priority).
- `TECH_DEBT.md` — add M1A-DEBT-04 entry.

---

## Hebrew status line to Daniel

> **M1A_OPERATIONS_RPCS_FIX 🟢 — 10 תיקונים נחתו, 6/6 smoke עבר על demo, Phase 1B פתוח להתחיל.**

(One line. No technical details. State + status + next-strategic-direction.)

---

*End of FOREMAN_REVIEW.md. opticup-strategic, Full-Auto Pipeline single chat, 2026-05-15.*
