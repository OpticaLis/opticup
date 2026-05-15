# Activation Prompt — M1B0_PURCHASE_ORDER_SCHEMA

> Paste the block below into a fresh Claude Code chat to dispatch the schema-only micro-SPEC.
> Sibling Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1B0_PURCHASE_ORDER_SCHEMA_BRIEF.md`
> Mode: Full Auto Pipeline (Strategic authors → Executor ships → Reviewer verifies → Strategic Foreman-reviews — all in one chat).

---

```
Full Auto Pipeline — M1B0_PURCHASE_ORDER_SCHEMA (schema-only micro-SPEC; UI ships in Phase 1B next).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1B0_PURCHASE_ORDER_SCHEMA_BRIEF.md

Activate `opticup-strategic` skill first. Read the Brief end-to-end. Then run the §6
pre-flight probes (14 live Supabase SELECT queries — legacy purchase_orders shape,
stock_lot FK state, K2 body, supplier columns, vat_rates seed, demo supplier presence).
Pin every result as a baseline in §0 "Pre-Authoring Reality Check" of the SPEC. NO Brief
pseudocode goes into the SPEC body unverified.

Author the SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1B0_PURCHASE_ORDER_SCHEMA/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (14 probe results baselined)
- §1 Purpose (1 paragraph from Brief §1)
- §2 Scope (3 tables + 5 RPCs + 2 ALTER TABLE additions + K2 extension + smoke from Brief §2)
- §3 Success Criteria (21+ from Brief §5, all measurable)
- §4 Autonomy envelope (Level-3 DDL authorized for migrations + RPC deploy)
- §5 Stop triggers (explicit, narrow)
- §6 Rollback plan (per-fix DOWN steps in ROLLBACK.md)
- §7 Destructive Operations: None (Iron Rule 32 — declare explicitly)
- §10 Commit plan (4-8 commits, single concern each)

Then hand off to `opticup-executor` in the same chat. Executor:
1. Step 0 — repo/branch/integrity-gate per CLAUDE.md §1 First Action.
2. Step 1 — load SPEC + run executor pre-flight (verify all 14 probes still match live).
3. Steps 2–N — execute the 3 tables + 5 RPCs + FK additions + K2 extension in commit order.
   Stop on deviation, not on success. Apply ALL discipline from M1A_OPERATIONS_RPCS_FIX:
   - SECURITY DEFINER with `SET search_path = 'public'`
   - JWT-claim guard at function start (raises 42501 on mismatch/anon)
   - `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO authenticated;` on each RPC
   - Canonical 2-policy RLS (service_bypass + tenant_isolation with JWT-claim USING)
   - Tenant-scoped UNIQUE on every UNIQUE constraint
4. **MANDATORY FUNCTIONAL SMOKE** before SPEC close (Brief §2 + §5 criterion 9): demo tenant,
   6 steps — place_purchase_order(3 lines) → mark_po_sent → m1_create_receipt_from_box (box_id NULL
   per Brief Q5) → cancel flow (draft OK, cancelled RAISE, partial RAISE) → anon-reject on 5 RPCs →
   cross-tenant guard. Capture in TEST_REPORT.md.
   If ANY smoke step fails — STOP and escalate. Do NOT close 🟢 without functional smoke.
5. Write EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + ROLLBACK.md.

Then hand off to `opticup-reviewer`. Reviewer re-runs §5 criteria checks against live state
(pg_class.relrowsecurity, pg_policy count, pg_constraint, aclexplode, pg_get_functiondef,
get_advisors). Writes REVIEW.md.

Then `opticup-strategic` Foreman-reviews. Writes FOREMAN_REVIEW.md. Pipeline returns ONE
Hebrew status line:
  "M1B0_PURCHASE_ORDER_SCHEMA [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN."

Iron Rules in sharp focus: 1, 11, 13, 14, 15, 16, 18, 19, 21, 22, 23, 31, 32.

Out of scope (do NOT touch):
- ANY of the 6 Phase 1B customer-facing screens (HTML/JS/CSS) — schema-only SPEC
- PDF/Excel export, auto-send PO (Phase 1B UI + Phase 2+)
- Payment-allocation tables (M8 territory)
- Discrepancy resolution UI (Phase 2)
- FX conversion (tenant-2 readiness)
- Legacy purchase_orders (plural, frames-era) — declare untouched in §0
- shipments / shipment_items (M9 deprecation scope)
- 7 sealed mockups, Phase 1 Brief, decisions/M1.md (no architectural movement)
- CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT (docs-only effect on GLOBAL_MAP.md)
- 3 MAX-based sequence generators refactor (accept Phase 1A consistency)
- 21 FK indexes (separate parallel SPEC M1A_FK_INDEXES_PREP_FOR_1B)
- Prizma tenant (functional smoke on demo only)
- Merge to main (Daniel-only after Pipeline closes 🟢)

On escalation: write `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md`
and emit one short Hebrew line. Halt the Pipeline.

Stop on deviation, not on success. M1A_OPERATIONS_RPCS_FIX demonstrated that functional smoke
catches bugs no existential check finds — DO NOT REPEAT PHASE 1A'S MISTAKE. No 🟢 verdict
without 6/6 smoke passing on demo.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] Brief sealed at `modules/Module 1 - Inventory Management/architecture-brief/M1B0_PURCHASE_ORDER_SCHEMA_BRIEF.md`
- [ ] `M1A_OPERATIONS_RPCS_FIX` closed 🟢 — confirmed via FOREMAN_REVIEW commit `a29b93d`
- [ ] No other M1 SPEC in flight
- [ ] Demo tenant accessible (slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- [ ] Demo has ≥ 1 active supplier (probe #14)
- [ ] `vat_rates` has Israel row (probe #13)
- [ ] Supabase MCP connected
- [ ] Working directory: `C:\Users\User\opticup` (Windows desktop OR laptop OR Mac — confirm at session start)

---

## Expected execution timeline

- §6 pre-flight probes (14 queries) + §0 baselines: ~15 min
- SPEC authoring (4-8 commits planned): ~30 min
- Migration authoring + apply (3 tables + 5 RPCs + FKs + K2 extension): ~60 min
- T-constants + FIELD_MAP + docs merge: ~15 min
- Functional smoke (6 steps on demo): ~25 min
- EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW: ~35 min

**Total estimate: 3-3.5 hours of Pipeline time.** Single uninterrupted Claude Code session.

---

## What happens after this SPEC closes

1. Pipeline returns Hebrew status line to Daniel.
2. Daniel decides: merge `develop → main` now, OR batch with the next SPEC.
3. Phase 1B SPEC authoring begins — 6 customer-facing screens on top of the verified schema.
4. Phase 1B inherits ALL the discipline patterns now embedded (functional smoke, REVOKE/GRANT, search_path, JWT guard, live-probe baselines).

---

*End of activation prompt.*
