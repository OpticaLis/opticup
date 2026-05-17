---
spec_id: M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17
title: Foundation-close cleanup before Groups A/B/C dispatch
author: opticup-architect (acting as Foreman)
authored: 2026-05-17 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md
---

# SPEC — M1 Foundation Close Cleanup (2026-05-17)

## 1. Goal

Resolve 2 MEDIUM findings + 1 LOW finding from Foundation Phase 4 (SPEC 4a `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION`) BEFORE dispatching parallel Groups A/B/C. Eliminates tech debt that 6 downstream Pipelines would otherwise inherit and replicate.

## 2. Background

After Foundation Phase 4 closed cleanly with VFV-live on demo tenant, 3 follow-ups remain:

- **F-2 MEDIUM** — `m1_create_receipt_from_box` RPC pre-dates the `has_no_invoice` column. Current workaround: 2-step persistence (RPC + tenant-scoped UPDATE) inside one try/catch. Needs 9-arg overload.
- **F-4 LOW** — `lens-inventory-quick-scan.js` is a 38-line redirect stub. Old direct-to-stock entry retired but stub-file + loader-manifest reference left for graceful migration. Now safe to remove fully.
- **F-5 MEDIUM** — `מחיר מכירה` column in lots-table + movements-table shows `—` placeholder. Resolver wiring deferred to SPEC 5 (Pricing rebuild). DECISION: stays deferred (Pricing screen owns the canonical price-resolution path).

This SPEC handles F-2 + F-4. F-5 is acknowledged as deferred-by-design, not blocking.

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | `m1_create_receipt_from_box` exists with 9-arg signature including `p_has_no_invoice BOOLEAN` | `pg_get_function_arguments((SELECT oid FROM pg_proc WHERE proname='m1_create_receipt_from_box'))` | argument list includes `p_has_no_invoice` |
| S2 | Old 8-arg signature dropped OR retained as deprecated wrapper | Foreman call — see §5 below | per Foreman decision |
| S3 | RPC call in `lens-inventory-quick-receipt-bridge.js` (or wherever the 2-step lives) passes `has_no_invoice` in the RPC call | `grep -rn "has_no_invoice" js/ modules/` shows direct param, no 2-step UPDATE | direct param |
| S4 | 2-step UPDATE workaround removed | `grep -rn "has_no_invoice" js/ modules/ \| grep -i "update"` returns 0 hits | 0 |
| S5 | `lens-inventory-quick-scan.js` deleted | `ls modules/inventory/lens-inventory-quick-scan.js 2>&1` | file not found |
| S6 | Loader manifest no longer references the stub | `grep -rn "lens-inventory-quick-scan" js/ modules/ inventory.html` | 0 hits |
| S7 | Tier C VFV (smoke) — receipt with `has_no_invoice=TRUE` still persists | Chrome MCP run + DB query of latest `purchase_receipt` | row exists with flag=true |
| S8 | Iron Rule 31 + 32 gates green at each commit | `npm run verify:integrity` | exit 0 |
| S9 | Pushed to origin/develop | `git rev-parse HEAD == origin/develop` | true |

## 4. Destructive Operations

1. **`CREATE OR REPLACE FUNCTION m1_create_receipt_from_box(... 9 args ...)`** — adds `p_has_no_invoice` parameter. Reversible by re-running prior CREATE.
2. **(Foreman decision §5)** Either: (a) `DROP FUNCTION m1_create_receipt_from_box(<8-arg signature>)` after consumer migration, OR (b) keep 8-arg as `WRAPPER` that calls 9-arg with `p_has_no_invoice => FALSE`. Both reversible.
3. **`rm modules/inventory/lens-inventory-quick-scan.js`** — delete stub. Reversible from git history.
4. **Edit loader-manifest** to remove the stub reference.

**Forbidden:**
- Any change to `purchase_receipt` schema (already correct from SPEC 3)
- Any change to `lens_variant_notes` (untouched)
- Any RPC change beyond `m1_create_receipt_from_box`
- Any change outside `js/`, `modules/inventory/`, `modules/Module 1 - Inventory Management/`, `inventory.html`, supabase migrations

## 5. Foreman decision on §4 op #2

**Decision: Option (a) — DROP the 8-arg signature** after migrating the single consumer. Rationale:
- Only one consumer exists (`lens-inventory-quick-receipt-bridge.js` from SPEC 4a)
- Wrapper option leaves dead-arity in DB long-term (Iron Rule 21 No Orphans tension)
- Single-consumer migration is cheap

If executor pre-flight finds a 2nd consumer hidden somewhere (Foreman didn't grep exhaustively) → STOP, escalate, propose wrapper option in FINDINGS.md.

## 6. Autonomy Envelope

**Can do:**
- Apply SQL migration via Supabase MCP `apply_migration`
- Edit JS consumer to pass new arg
- Remove stub file + manifest reference
- Tier C VFV via Chrome MCP + Supabase MCP query
- 4 commits per §7

**Must stop and escalate if:**
- 2nd consumer found for old 8-arg signature
- Tier C VFV regression (drawer breaks)
- Advisor returns HIGH after migration
- `tenants.slug` ≠ assumed value (verify before migration)

## 7. Commit Plan

| # | Commit subject | Files |
|---|---|---|
| 1 | `feat(db): m1 lens — overload m1_create_receipt_from_box with 9-arg has_no_invoice variant` | new migration |
| 2 | `refactor(lens-inventory): pass has_no_invoice through RPC, drop 2-step UPDATE workaround` | `lens-inventory-quick-receipt-bridge.js` (or equivalent) |
| 3 | `chore(repo): remove lens-inventory-quick-scan.js stub + loader-manifest reference` | stub file + manifest |
| 4 | `chore(spec): close M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17 with retrospective` | SPEC closeout artifacts |

## 8. QA / Verification Plan

1. After Commit 1: read-only query of `pg_proc` confirms 9-arg variant exists
2. After Commit 2: Chrome MCP smoke — open drawer, stage 1 item, check "אין תעודה", submit, verify `purchase_receipt` row has `has_no_invoice=TRUE` (no 2-step UPDATE needed)
3. After Commit 3: page loads without console errors; `grep -c "lens-inventory-quick-scan"` returns 0
4. Iron Rule 31 + 32 at every commit
5. Soft-delete the smoke row post-test per Iron Rule 3

## 9. Out of Scope

- Wiring sell-price resolver (F-5) — owned by SPEC 5 Pricing rebuild
- Any further shared-component changes
- Any change to lens_variant_notes (SPEC 5 owns)
- Doc-currency sweep (per recommendation in SPEC 2 FOREMAN_REVIEW — separate mini-SPEC if Foreman authorizes)

## 10. Expected Final State

- 4 commits added to develop
- 9-arg RPC live; 8-arg dropped
- Stub file deleted
- 2-step UPDATE workaround gone
- F-2 + F-4 marked RESOLVED in tracking
- F-5 remains DEFERRED to SPEC 5 (documented)

## 11. Pipeline Coordination

This SPEC runs **sequentially on develop**. No worktrees. Pipeline-coordination lock claimed against:
- `supabase/migrations/**`
- `modules/inventory/**`
- `modules/Module 1 - Inventory Management/**`
- `js/lens-inventory-*` (if applicable)
- `inventory.html` (if loader-manifest is there)

## 12. Rollback Plan

If any step fails:
- Commit 1 (RPC overload): drop 9-arg via `DROP FUNCTION ... CASCADE`; 8-arg remains (since not yet dropped at commit 1 time)
- Commit 2 (JS refactor): `git revert`
- Commit 3 (stub delete): `git revert` restores stub + manifest
- DB UPDATE 2-step workaround code path can be restored from `git log` of SPEC 4a if needed

## 13. Lessons Already Incorporated

- ARCHITECT_DECISION_001 + SPEC 3 demonstrated that pre-flight schema verification is mandatory — this SPEC's §6 stop-trigger enforces 2nd-consumer grep before DROP
- Foundation Phase 4 demonstrated that VFV with screenshot + DB query is the gold standard — this SPEC's §8 mandates the same

---

**END SPEC**

Foreman seal: 2026-05-17 IDT. Authorized by Daniel-Architect for execution before Groups A/B/C dispatch.
