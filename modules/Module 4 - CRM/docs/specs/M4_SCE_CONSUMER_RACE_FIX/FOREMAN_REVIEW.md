# FOREMAN_REVIEW — M4_SCE_CONSUMER_RACE_FIX

> **Date:** 2026-05-21
> **Verdict:** 🟢 **CLOSED**

## 1. SPEC quality audit

| Aspect | Score | Notes |
|---|---|---|
| Measurable success criteria | 9/10 | 13 criteria, 12 met directly; criterion 7 (race-test pass) verified via observable RPC return value. -1 for not anticipating the EF budget bottleneck (F-01) that initially blocked the 5K run. |
| Destructive-ops declaration | 10/10 | DDL + DML scope honored exactly. |
| Runtime-semantics rehearsal (§0) | 10/10 | The timeline diagram in §0 ("3 parallel ticks → 6,661 rows pre-fix → 1 run, 2,400 rows post-fix") accurately predicted what we observed at 5K scale (1 run, 10,000 rows). |
| Rollback plan | 10/10 | Pure-additive migration (column + RPC + index); rollback is `DROP FUNCTION` + `ALTER TABLE DROP COLUMN`. Tag pushed; code revert path documented. |

## 2. Execution quality audit

| Aspect | Score | Notes |
|---|---|---|
| SPEC adherence | 9/10 | All goals met. One scope extension (buildVariables event-cache) was needed to make the 5K verification possible; justified in EXECUTION_REPORT D-1 + FINDINGS F-01. |
| Iron Rule compliance | 10/10 | All rules honored. IR34 explicitly N/A (no UI surface to verify). |
| Commit hygiene | 9/10 | Single feature commit (`c725b53`) bundling the race-fix + perf-fix together. -1 for not splitting, but they're tightly coupled (race-fix not verifiable without perf-fix at 5K scale). |
| Test discipline | 10/10 | 3-parallel-curl race test + 5K exact-count test + zero-sends defense-in-depth all verified with DB-level assertions. |

## 3. Findings processing

| Finding | Action |
|---|---|
| F-01 buildVariables per-lead SELECT | Fixed in same commit. No follow-up needed. |
| F-02 pg_cron 15s tick beats manual calls | INFO only. No action. |
| F-03 RPC return shape includes extra columns | INFO only. No action. |
| F-04 Stuck `running` automation_runs | Optional follow-up SPEC `M4_AUTOMATION_RUN_STALE_REAPER`. Not blocking. |

## 4. 2 author-skill improvement proposals (opticup-strategic)

### P-AUTHOR-1 — Predict-the-budget pre-flight for load-test SPECs
**Where:** `.claude/skills/opticup-strategic/SKILL.md` §5 Runtime-Semantics Rehearsal — new sub-section "EF execution budget".
**What:** any SPEC whose acceptance bar requires the EF to complete a multi-thousand-element loop should rehearse the per-element cost × element count and verify it's < EF budget. If not, flag the perf-bottleneck as an in-scope or co-scoped fix.
**Rationale:** SPEC B's §0 rehearsal predicted the race timing correctly but didn't budget the dispatch.ts work itself. The N×SELECT-per-lead in buildVariables was a pre-existing latent issue that only surfaces under load — exactly the kind of "data, not code" failure the SPEC's load-test was supposed to reveal.

### P-AUTHOR-2 — Verification approach explicit when IR34 doesn't apply
**Where:** SPEC_TEMPLATE.md §3 Success Criteria.
**What:** every SPEC should declare in §3 whether IR34 (Chrome MCP) applies. For non-UI SPECs (cron consumers, EFs, RPCs, migrations), the alternative verification approach (DB-state assertions, RPC return-value asserts, log-pattern checks) should be stated up front. This avoids the closing-time question "did we satisfy IR34?".
**Rationale:** SPEC B is a pure backend race-fix with no UI surface. IR34 is moot, but we had to handle it explicitly at closure. Pre-declaring "IR34 N/A; verification via DB state" in §3 would have removed the friction.

## 5. 2 executor-skill improvement proposals (opticup-executor)

(Endorsed from EXECUTION_REPORT §7.)

### P-EXEC-1 — EF execution budget pre-flight (endorsed)
Smoke-then-extrapolate to predict EF timeout risk before running the load test. Would have caught F-01 in 30 seconds.

### P-EXEC-2 — Stale-claim window awareness (endorsed)
Document the 5-min default stale-claim TTL in race-test scaffolding. `UPDATE claimed_at=NULL` is the manual reset shortcut.

## 6. Verdict

🟢 **CLOSED.**
- ✅ Atomic SCE claim via `FOR UPDATE SKIP LOCKED` RPC verified at 5K scale.
- ✅ Exact-count enqueue: 10,000 = 5,000 × 2 channels.
- ✅ Single completed run (zero over-enqueue from race).
- ✅ Demo restored bit-identical to baseline.
- ✅ Zero real customer sends.
- ✅ Prizma untouched.

The defense-in-depth dispatch-pipeline now has TWO layers in place (lazy-rows operator-confirm brake from SPEC A + atomic SCE claim from SPEC B). SPEC C (queue ON CONFLICT) closes the third layer.

---

*End of FOREMAN_REVIEW.*
