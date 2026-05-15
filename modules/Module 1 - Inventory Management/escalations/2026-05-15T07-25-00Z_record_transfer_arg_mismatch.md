# Escalation — record_transfer pre-existing 17-vs-19 arg signature mismatch

**Filed by:** opticup-executor inside Full-Auto Pipeline M1A_OPERATIONS_RPCS_FIX
**Filed at:** 2026-05-15 ~07:25 UTC
**Severity:** CRITICAL — blocks SPEC closure (functional smoke Case 3 cannot pass)
**Halt point:** after Commit 8 (config.toml block landed); smoke Case 1 + Case 2 PASS; smoke Case 3 FAILS with 42883 inside `record_transfer` body.

## What was discovered

`record_transfer`'s body calls `record_stock_movement` with **17 positional arguments**, ending in `(p_initiated_by, p_notes)`. The current `record_stock_movement` signature is **19 parameters** with the last 3 (`p_sph numeric DEFAULT NULL`, `p_cyl numeric DEFAULT NULL`, `p_add_value numeric DEFAULT NULL`) carrying DEFAULTs.

Postgres maps the 17 positional args to positions 1..17 of the function. Position 17 is `p_sph numeric` — but `record_transfer` passes `p_notes` (text) there. Type mismatch ⇒ `ERROR 42883: function record_stock_movement(uuid, uuid, uuid, uuid, unknown, integer, unknown, unknown, unknown, unknown, uuid, unknown, numeric, unknown, unknown, uuid, unknown) does not exist`.

Source of `record_transfer` body (verbatim from §0 Probe Extra A):

```sql
PERFORM record_stock_movement(
    p_tenant_id, p_source_lot_id, p_variant_id, p_from_location_id,
    'transfer_out', -p_qty_sent,
    NULL, NULL, NULL, NULL, v_transfer_id, NULL, v_source_unit_cost, NULL, NULL,
    p_initiated_by, p_notes
);
```

The pre-existing function HAS been at 19 params since Phase 1A schema-platform-admin closed (per Probe 1 baseline + Phase 1A SPEC). Phase 1A's smoke (single `INSERT lens_brand`) never invoked `record_transfer`, so this bug was undetected — which is the very class of defect the M1A_OPERATIONS_RPCS_FIX Pipeline was created to surface.

This bug was NOT in the Brief's enumerated 8 fixes; it's a 9th pre-existing defect surfaced **by** running the SPEC's mandatory smoke (exactly as designed). Without it being fixed, SPEC §3 criterion 16 (functional smoke on demo end-to-end — `record_transfer between locations`) cannot pass, and the Pipeline cannot close 🟢.

## Why it's not in the existing SPEC scope

`record_transfer` body modification is NOT among the 5 fix domains pre-authorized in §4 Autonomy Envelope:
1. `record_stock_movement` body ✓ (Block #1 — landed)
2. REVOKE/GRANT on 10 SECDEF fns ✓ (Block #2 — landed)
3. `next_lens_variant_display_id` JWT guard ✓ (Block #3 — landed)
4. `v_suppliers_for_m9` ACL ✓ (Block #4 — landed)
5. K3 idempotency (UNIQUE + trigger fn body) ✓ (Block #5 — landed)

A 6th DDL — `record_transfer` body fix — is genuine SPEC-scope expansion. The executor SKILL §"Autonomy Playbook" says: "Scope expansion tempting | No. One concern per task. Log to FINDINGS.md." Hence this escalation rather than a unilateral fix.

## What the Pipeline state is right now

- Branch `develop` is clean (no uncommitted state).
- 8 commits landed (`b0d44c1`, `54ede72`, `279b12b`, `0024dd3`, `18697f4`, `8fe2a1a`, `474cc6b`, `7e52bb8`) — all 8 SPEC-scope fixes applied + verified live.
- Smoke fixtures (2 demo locations, 1 global lens_brand + design + variant, 1 demo offering) seeded persistently on demo tenant.
- Smoke Case 1 PASS — `record_stock_movement('receipt', +5)` no longer double-adds (`qty_remaining=5`, not 10).
- Smoke Case 2 PASS — `m1_create_receipt_from_box` end-to-end completes; no 42P10; tenant_lens_stock DO UPDATE branch fires correctly (Fix #2 verified).
- Smoke Case 3 FAIL — `record_transfer` raises 42883 from inside its own body (PG cannot resolve the 17-arg `record_stock_movement` call due to the `p_notes` (text) → position-17 `p_sph` (numeric) type collision).
- Smoke Cases 4, 5, 6 not yet run.

## Recommendation to Foreman

**Author Amendment #1 to the SPEC: add Fix #9 — `record_transfer` body re-paths the inner `record_stock_movement` call to 19 positional args (NULL, NULL, NULL appended for sph/cyl/add_value), OR use named-arg syntax.** This is a 1-line body change inside `CREATE OR REPLACE FUNCTION public.record_transfer(...)`. No signature change. Iron Rule 32 destructive ops still None (CREATE OR REPLACE in-place). Block #6 of MIGRATION.md.

Rationale for in-SPEC fix vs separate follow-up:
- **Brief Locked Decision #3:** "Mandatory functional smoke test on demo end-to-end before SPEC close." Without Fix #9, this decision cannot be honored.
- **Brief §1 Purpose:** "All three orchestrator RPCs chain through it." record_transfer IS one of the 3 orchestrators. The Brief's whole purpose is to make the 3 orchestrators runnable; closing the SPEC without proving record_transfer works contradicts the purpose.
- **Defect class:** identical to Brief §2 Fix #1 (record_stock_movement double-add) — a runtime defect in an orchestrator that Phase 1A's smoke would have caught but didn't. The same logic that justifies fixing Fix #1 justifies fixing this.
- **Cost of separate SPEC:** a follow-up SPEC would need its own Pipeline run, smoke, review, foreman — ~30 minutes vs ~5 minutes here. And Phase 1B is still blocked.

Alternative: separate follow-up SPEC `M1A_RECORD_TRANSFER_ARG_FIX` runs immediately after this SPEC closes 🟡 (closed-with-follow-ups). This Pipeline closes at 🟡 — fix-domains 1-8 verified live, smoke Case 3 deferred to the follow-up SPEC.

Daniel's call.

## Halt status

Pipeline halted. One Hebrew status line emitted by the Foreman after their decision.

## Author

opticup-executor, single-chat Full-Auto Pipeline.
