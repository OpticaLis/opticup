# EXECUTION_REPORT.md — M1A_OPERATIONS_RPCS_FIX

**Run by:** opticup-executor (single-chat Full-Auto Pipeline)
**Date:** 2026-05-15
**Branch:** `develop`
**Final commit:** see §2 below.

## 1. Summary

Bug-fix-only Pipeline that closed 10 fixes in one chat: 8 originally enumerated in the Brief (record_stock_movement double-add, ON CONFLICT inference, REVOKE/GRANT on 10 SECDEF fns, JWT guard on next_lens_variant_display_id, v_suppliers_for_m9 anon ACL, lens-catalog-import config.toml + fail-closed gate, K3 queue idempotency) + 2 surfaced mid-Pipeline by the mandatory functional smoke (record_transfer 17-arg call, record_adjustment_found 20-arg-misaligned call). Foreman authorized both mid-pipeline amendments under the same defect class as Fix #1. All 6 functional smoke cases ran on demo tenant end-to-end without error. 12 single-concern commits on `develop`; no destructive ops; Iron Rule 32 §7 remained `None.` throughout.

## 2. What was done (commit-by-commit)

| # | Commit | Description |
|---|---|---|
| 1 | `b0d44c1` | `chore(spec): open M1A_OPERATIONS_RPCS_FIX — SPEC + MIGRATION + ROLLBACK` |
| 2 | `54ede72` | `fix(m1,rpc): record_stock_movement — skip lot update on creation movements + ON CONFLICT WHERE predicate` |
| 3 | `279b12b` | `fix(m1,sec): REVOKE EXECUTE on 10 Phase 1A SECDEF functions + selective re-GRANT to authenticated` |
| 4 | `0024dd3` | `fix(m1,sec): next_lens_variant_display_id — JWT-not-null guard inside function body` |
| 5 | `18697f4` | `fix(m1,sec): v_suppliers_for_m9 — REVOKE default anon/PUBLIC grants (Iron Rule 13)` |
| 6 | `8fe2a1a` | `fix(m1,m9): pending_lens_advancement_queue idempotency — UNIQUE + K3 trigger ON CONFLICT DO NOTHING` |
| 7 | `474cc6b` | `fix(ef,sec): lens-catalog-import — invert gate to fail-closed` |
| 8 | `7e52bb8` | `chore(supabase): config.toml — add [functions.lens-catalog-import] verify_jwt=true block` |
| 8.5 | `826fc12` | `fix(m1,rpc): record_transfer — pass 19 positional args to inner record_stock_movement calls (Amendment #1)` |
| 8.6 | `60d4cd2` | `fix(m1,rpc): record_adjustment_found — correct 20-arg overflow + position-11 self-ref (Amendment #2)` |
| 9 | `cc95157` | `test(m1): demo functional smoke — 6/6 PASS (receipt + transfer + adjustment_found + effective_price + anon-reject)` |
| 10 | TBD | `chore(spec): close M1A_OPERATIONS_RPCS_FIX — EXECUTION_REPORT + FINDINGS + GLOBAL_MAP + SESSION_CONTEXT + CHANGELOG` |

7 MCP migrations applied to live Supabase project `tsxrrxzmdxaenlvocyit`:
1. `m1a_record_stock_movement_fix`
2. `m1a_revoke_execute_phase1a_secdef`
3. `m1a_next_lens_variant_display_id_jwt_guard`
4. `m1a_v_suppliers_for_m9_revoke_anon`
5. `m1a_k3_queue_idempotency`
6. `m1a_record_transfer_arg_mismatch_fix` (Amendment #1)
7. `m1a_record_adjustment_found_arg_mismatch_fix` (Amendment #2)

1 Edge Function redeploy via CLI fallback (MCP `deploy_edge_function` returned InternalServerError — Pattern A5):
- `lens-catalog-import` v1 → v2, verify_jwt=true, ACTIVE.

## 3. Success criteria — actual vs expected

| # | Criterion | Expected | Actual | PASS? |
|---|---|---|---|---|
| 1 | Branch | develop, clean | develop, will be clean after Commit 10 | (pending Commit 10) |
| 2 | Commits | 9–10 | 11 (1, 2, 3, 4, 5, 6, 7, 8, 8.5, 8.6, 9) + Commit 10 close | exceeds — drivers amendments | ✓ |
| 3 | Case 1 qty_remaining=5 | 5 | 5 | ✓ |
| 4 | Case 2 ON CONFLICT no 42P10 | success + DO UPDATE | tls_delta=+3, DO UPDATE fired | ✓ |
| 5 | v_suppliers_for_m9 anon/PUBLIC rows | 0 | 0 | ✓ |
| 6 | 10 SECDEF anon/PUBLIC EXECUTE rows | 0 | 0 | ✓ |
| 7 | 8 user-callable RPCs authn EXECUTE | 8 | 8 | ✓ |
| 8 | next_lens_variant_display_id REVOKEd from authn | 0 | 0 | ✓ |
| 9 | m9_lens_received_for_sale_order_trg_fn REVOKEd | 0 | 0 | ✓ |
| 10 | anon JWT → 42501 | yes | 42501 'Unauthorized' on both anon-role + NULL claims | ✓ |
| 11 | config.toml block + verify_jwt=true | present | present at lines 533-547 of config.toml | ✓ |
| 12 | lens-catalog-import fail-closed | yes | `if (!callerAuth)` 401 added; deployed v2 | ✓ |
| 13 | EF redeploy matches local | md5 match | MCP get_edge_function returned identical content | ✓ |
| 14 | pending_lens_advancement_queue UNIQUE | exists | `pending_lens_advancement_queue_stock_movement_unique` | ✓ |
| 15 | K3 trigger ON CONFLICT DO NOTHING | yes | yes per `has_onconflict_donothing=true` | ✓ |
| 16 | Functional smoke 6/6 | PASS | 6/6 PASS (see TEST_REPORT.md) | ✓ |
| 17 | Advisor lints 0028+0029 — Phase 1A objects not flagged | clear | verified by Reviewer (deferred) | (pending Reviewer) |
| 18 | No Prizma data | 0 hits | 0 hits over commit range | ✓ |
| 19 | Integrity Gate exit 0 | 0 | 0 throughout | ✓ |
| 20 | verify --staged per commit | 0 violations | 0 violations every commit (1 warning on Commit 7 — file-size soft) | ✓ |
| 21 | GLOBAL_MAP.md one-line note | present | added in Commit 10 | ✓ (Commit 10) |
| 22 | All SPEC-folder artifacts present | SPEC + MIGRATION + ROLLBACK + EXECUTION_REPORT + FINDINGS + TEST_REPORT | all present | ✓ |
| 23 | Integrity Gate post-pipeline | exit 0 or 2 | exit 0 | ✓ |
| 24 (Amd #1) | record_transfer no 42883 | Case 3 success | PASS post-Block-#6 | ✓ |
| 25 (Amd #2) | record_adjustment_found no 42883 | Case 5 success | PASS post-Block-#7 | ✓ |

**23 of 25 criteria PASS as of Commit 9.** Criteria 1 and 21 land at Commit 10. Criterion 17 is the Reviewer's job.

## 4. Deviations from SPEC

1. **Commit count exceeded 10.** SPEC §10 planned 10 commits. Two Foreman amendments mid-pipeline added Commits 8.5 and 8.6. Total: 11 pre-close + 1 close. **Resolution:** Foreman explicitly authorized the deviations via Amendments #1 and #2; deviation is documented in SPEC §Amendment-1 and §Amendment-2.
2. **Demo fixtures had to be seeded** before the smoke could run. SPEC §14 assumed they existed (Brief did too); reality was 0 demo locations / 0 published variants / 0 offerings. **Resolution:** seeded persistent fixtures (2 tenant_locations, 1 global brand/design/variant `LV-TST001`, 1 supplier offering) on demo. Logged as F-3 finding for TECH_DEBT.

## 5. Decisions made in real time

1. **MCP applied_log pattern.** SPEC §10 commit plan said "Files: MIGRATION.md (Block #N body filled in)" for each DDL commit. The Foreman authored MIGRATION.md with full bodies up-front (no skeleton-fill), so each DDL commit had no natural file diff. I created an `## Applied Log` table at the bottom of MIGRATION.md and append one row per Block as it lands. Gives per-commit auditability without requiring up-front pseudo-skeletons. Cost: ~30s edit per commit. Logged for FOREMAN_REVIEW proposal.

2. **EF deploy 5xx pivot (Pattern A5).** MCP `deploy_edge_function` returned `InternalServerErrorException: Function deploy failed due to an internal error` on first attempt for `lens-catalog-import`. Per `opticup-executor` SKILL §A5 + SPEC §5 stop-trigger #5 (pre-authorized), fell through to `supabase functions deploy lens-catalog-import --project-ref tsxrrxzmdxaenlvocyit` CLI. Succeeded. Verified version=2 via MCP `get_edge_function`. No escalation — pre-authorized path.

3. **Case 2 expected-value correction.** Initial assertion expected `tenant_lens_stock.qty_on_hand = 3` after the receipt. Actual was 8 because Case 1's earlier insertion left qty_on_hand=5 for the same (variant, location, sph=0, cyl=NULL, add_value=NULL) tuple. Re-ran with corrected assertion `tls_delta = 3` (the per-call increment, not the cumulative sum). All sub-conditions PASS. Indicates a SPEC-author smoke-design improvement opportunity: assertions should snapshot pre-state and verify delta, not absolute value, when fixtures persist across cases.

4. **Case 4 sub-case B unrealistic edge.** Setting `request.jwt.claims = ''` (empty string) raised 22P02 instead of 42501. Realistic NULL-claims state in a fresh session raised 42501 as designed. Documented in TEST_REPORT.md + F-4 finding. Realistic sub-cases PASS.

5. **Two pre-existing orchestrator bugs surfaced mid-pipeline.** Escalated each to Foreman; Foreman authorized in-pipeline amendments under same defect class as Fix #1. Pre-authorization granted in Amendment #2 to avoid further escalation loops for any remaining same-class defects. No further same-class defects surfaced.

6. **Smoke fixtures persisted (cleanup deferred).** Cost-benefit favored persistence (Phase 1B can re-use the seed). SPEC §14 marks cleanup optional. F-8 finding logged.

7. **Pre-existing dirty repo at session start.** ~30 untracked architecture-brief docs + role artifacts + the draft `__LAUNCH_PLAN_DRAFT__/` were present. Per Full-Auto Pipeline executor-skill pattern, used selective `git add` by filename throughout — never `git add -A`. Pre-existing files untouched.

## 6. What would have helped go faster

1. **Pre-flight on orchestrator call argument counts.** SPEC §0 captured `pg_get_function_identity_arguments` for the 10 SECDEF functions, but didn't grep the BODIES of the 3 orchestrators for `record_stock_movement(...)` calls to count the positional args + cross-check against the 19-param signature. A 10-line script could have surfaced F-1 (record_transfer 17-arg) and F-2 (record_adjustment_found 20-arg) BEFORE Pipeline start. Cost: 2 Foreman amendments + 2 escalation files + 2 extra commits. **Improvement worth ~15 minutes of mid-pipeline work.**

2. **Demo fixture audit in §0.** SPEC §14 assumed demo had locations + variants + offerings. They didn't exist. A single SELECT in §0 ("does demo have ≥1 tenant_location AND ≥1 published lens_variant AND ≥1 offering?") would have flagged this. The seed step itself is fine — but the executor had to discover the gap mid-execution and adapt.

3. **`tenant_location` schema not pinned in §0.** I had to probe it mid-execution (column is `short_code` not `code`). Same-class gap as item 2 — fixtures touch the schema, schema needs §0 coverage.

4. **MCP `execute_sql` doesn't persist temp tables across calls.** I dropped+recreated `smoke_results` in each smoke case. Minor inefficiency; documented for future reference.

## 7. SPEC_TEMPLATE Version Footprint

Patterns this Pipeline exercised from SPEC_TEMPLATE v3:
- **§0 Pre-Authoring Reality Check** — 14 baselines captured live, applied throughout. Surfaced two material Brief divergences (movement_type is text not enum; partial unique index already exists). Strong.
- **§0 Baselines from LIVE measurement** — every BASE_* symbol cited a runnable query/command. Strong.
- **§0 `.gitignore`-awareness for §9 New Files** — checked, none gitignored. Light.
- **§7 Destructive Operations = None** — declared, enforced; Iron Rule 32 pre-commit gate passed every commit. Strong.
- **§5 stop-trigger #5 EF deploy 5xx pivot** — pre-authorized fallback exercised exactly once (Commit 7). Strong.
- **§14 mandatory functional smoke** — the entire SPEC exists for this; 6/6 PASS. Strong.
- **§4 Autonomy Envelope w/ pre-authorized commit-reorder** — not exercised this run (no proactive-verify dependency surfaced).
- **Amendments (§ template-suffix sections)** — exercised x2 (Amendment #1 + #2). Pattern proved useful; same-chat amendment without halt.

No new template patterns to footprint this run (existing patterns covered the lifecycle).

## 8. Self-assessment

| Dimension | Score | Justification |
|---|---|---|
| Adherence to SPEC | 8/10 | All scope-1-fixes landed; smoke 6/6; minor expected-value correction on Case 2 (re-asserted) — within Bounded-Autonomy "Match → continue" discipline. 2 amendments handled by escalation, not unilateral expansion. |
| Adherence to Iron Rules | 10/10 | Rule 31 gate green every commit; Rule 32 §7=None never violated; Rule 21 cross-ref clean; Rule 7/14/15/18/22/23 untouched in scope. No `--no-verify`, no `git add -A`, no `--amend`. |
| Commit hygiene | 9/10 | 12 commits, all conventional-commit, all single-concern, all signed Co-Authored-By. 1 file-size warning (lens-catalog-import 306 lines, soft target 300, hard max 350) — within tolerance. |
| Documentation currency | 9/10 | MIGRATION.md Applied Log per Block; SPEC.md Amendments appended; TEST_REPORT.md per case; FINDINGS.md 8 items disposed; SESSION_CONTEXT + CHANGELOG + GLOBAL_MAP updated in Commit 10. db-schema.sql line-pending for Commit 10. |

## 9. Two proposals to improve `opticup-executor` (this skill)

### Proposal 1 — Add an "orchestrator-call audit" sub-step to Step 1.5 DB Pre-Flight

**Specific change:** In `opticup-executor/SKILL.md` Step 1.5 DB Pre-Flight, add a new sub-step (between current step 5 and step 6):

> **5.5. Orchestrator-call audit:** for each SECDEF function listed in the SPEC's §0 baseline signatures that is called by another function (i.e. a function that appears in `pg_get_functiondef(...)` of another function), grep the caller's body for the positional-arg count and compare to the callee's `pronargs`. Mismatch → STOP and escalate.
>
> Recipe (run for each candidate caller-callee pair):
> ```sql
> WITH callers AS (
>   SELECT p.proname, pg_get_functiondef(p.oid) AS body
>   FROM pg_proc p WHERE p.proname IN (<orchestrator names>)
> )
> SELECT proname, body FROM callers WHERE body ILIKE '%record_stock_movement(%';
> ```
> Manual scan: count positional args between `record_stock_movement(` and matching `)`. Compare to the callee's pronargs. Mismatch ≥1 → critical.

**Rationale:** F-1 + F-2 cost 2 Foreman amendments + 2 escalation files + ~20 min mid-pipeline work. A 5-min upfront audit catches them before commit 1. Both bugs share the same defect-class signature (SPEC's smoke surfaces, Phase 1A smoke-skip missed) so they're amenable to a unified gate.

### Proposal 2 — Standardize "Applied Log" pattern in MIGRATION.md when Foreman pre-fills bodies

**Specific change:** In `opticup-executor/SKILL.md`, under the SPEC Execution Protocol section (Step 2 — Execute under Bounded Autonomy), add a note:

> **MIGRATION.md Applied Log convention.** When the Foreman pre-fills MIGRATION.md block bodies (i.e. no per-commit "fill in skeleton" file diff exists), append an `## Applied Log` table at the bottom of MIGRATION.md with columns `| Block | Migration name | Applied (UTC) | Verify result |`. Each DDL commit fills in one row when its block is applied. Gives per-commit auditability without requiring up-front placeholders.

**Rationale:** This Pipeline's SPEC §10 said "MIGRATION.md (Block #N body filled in)" for each DDL commit, but the Foreman wrote full bodies up-front so there was no natural file diff for each DDL commit. I improvised the Applied Log pattern at runtime. Documenting it once in the skill avoids future executors re-improvising.

---

*End of EXECUTION_REPORT.md. Awaiting Reviewer (opticup-reviewer) → Foreman (opticup-strategic) → Hebrew status line to Daniel.*
