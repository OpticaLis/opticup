# Activation Prompt — M1A_OPERATIONS_RPCS_FIX

> Paste the block below into a fresh Claude Code chat to dispatch the consolidated bug-fix SPEC.
> Sibling Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1A_OPERATIONS_RPCS_FIX_BRIEF.md`
> Mode: Full Auto Pipeline (Strategic authors → Executor ships → Reviewer verifies → Strategic Foreman-reviews — all in one chat).

---

```
Full Auto Pipeline — M1A_OPERATIONS_RPCS_FIX (consolidated bug-fix from Phase 1A reviews).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1A_OPERATIONS_RPCS_FIX_BRIEF.md

Activate `opticup-strategic` skill first. Read the Brief end-to-end. Then run the §6
pre-flight probes (10 live Supabase SELECT queries — exact function signatures, enum
values, current grants, current trigger body) and pin every result as a baseline in §0
"Pre-Authoring Reality Check" of the SPEC. NO Brief pseudocode goes into the SPEC body
unverified.

Author the SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1A_OPERATIONS_RPCS_FIX/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (10 probe results baselined)
- §1 Purpose (1 paragraph from Brief §1)
- §2 Scope (8 fixes from Brief §2)
- §3 Success Criteria (17+ from Brief §5, all measurable)
- §4 Autonomy envelope (Level-3 DDL authorized for migrations + EF redeploy)
- §5 Stop triggers (explicit, narrow)
- §6 Rollback plan (per-fix DOWN steps in ROLLBACK.md)
- §7 Destructive Operations: None (Iron Rule 32 — declare explicitly)
- §10 Commit plan (6-10 commits, single concern each)

Then hand off to `opticup-executor` in the same chat. Executor:
1. Step 0 — repo/branch/integrity-gate per CLAUDE.md §1 First Action.
2. Step 1 — load SPEC + run executor pre-flight (verify all 10 probes still match live).
3. Steps 2–N — execute the 8 fixes in commit order. Stop on deviation, not on success.
4. **MANDATORY FUNCTIONAL SMOKE** before SPEC close (Brief §5 criterion 10): demo tenant,
   1 receipt with 2 lines (stock + custom-per-customer), 1 transfer, 1 adjustment_found,
   1 effective_price call. Capture results in TEST_REPORT.md inside the SPEC folder.
   If ANY smoke step fails — STOP and escalate. Do NOT close 🟢 without functional smoke.
5. Write EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + ROLLBACK.md.

Then hand off to `opticup-reviewer`. Reviewer re-runs the §5 success criteria checks
against live state (aclexplode, pg_indexes, pg_get_functiondef, config.toml grep). Writes
REVIEW.md (read-only verification report).

Then `opticup-strategic` Foreman-reviews. Writes FOREMAN_REVIEW.md. Pipeline returns ONE
Hebrew status line:
  "M1A_OPERATIONS_RPCS_FIX [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN."

Iron Rules in sharp focus: 11, 13, 14, 15, 18, 22, 23, 31, 32.

Out of scope (do NOT touch):
- purchase_order / purchase_order_line / supplier_debt schema (separate decision)
- 21 FK indexes (separate SPEC M1A_FK_INDEXES_PREP_FOR_1B)
- FX conversion in effective_price (tenant-2 readiness)
- 3 MAX-based sequence generators refactor (defer)
- Project-wide RLS FOR ALL TO public split (separate SPEC)
- is_platform_super_admin() search_path (pre-existing)
- v_suppliers_for_m9 default_courier_company_id column (M9 SPEC)
- Phase 1B stub, the Phase 1 Brief, decisions/M1.md, mockups (no architectural movement)
- CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT (docs-only effect on GLOBAL_MAP.md)
- Prizma tenant (functional smoke on demo only)
- Merge to main (Daniel-only after Pipeline closes 🟢)

On escalation: write `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md`
and emit one short Hebrew line. Halt the Pipeline. Daniel will return with a decision.

Stop on deviation, not on success. The whole point of this SPEC is that Phase 1A skipped
functional smoke — DO NOT REPEAT THAT MISTAKE. No 🟢 verdict without functional smoke
passing on demo.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] Brief sealed at `modules/Module 1 - Inventory Management/architecture-brief/M1A_OPERATIONS_RPCS_FIX_BRIEF.md`
- [ ] STRATEGIC_REVIEW_REPORT.md committed on develop (`c81e0bc`)
- [ ] CODE_REVIEW_REPORT.md committed on develop (`0e6f5b7`)
- [ ] No other M1 SPEC in flight
- [ ] Demo tenant accessible (slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- [ ] Supabase MCP connected
- [ ] Working directory: `C:\Users\User\opticup` (Windows desktop OR laptop OR Mac — confirm at session start)

---

## Expected execution timeline

- §6 pre-flight probes (10 queries) + §0 baselines: ~10 min
- SPEC authoring (single SPEC, 6-10 commits planned): ~30 min
- Migration authoring + apply (single migration, 8 fixes): ~45 min
- EF source edit (Fix #6 + #7) + redeploy: ~15 min
- Functional smoke test on demo: ~20 min
- EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW: ~30 min

**Total estimate: 2-2.5 hours of Pipeline time.** Single uninterrupted Claude Code session.

---

## What happens after this SPEC closes

1. Pipeline returns Hebrew status line to Daniel.
2. Daniel reads (or doesn't read) the reports.
3. Daniel decides: merge to main now, OR wait for the next decision (purchase_order schema scope).
4. Next Architect session opens the `Phase 1B split` decision (is the PO schema in Phase 1B, or its own micro-SPEC `M1B0_PURCHASE_ORDER_SCHEMA`?).
5. Phase 1B SPEC authoring begins once that decision is made.

---

*End of activation prompt.*
