---
spec_id: M1_LENS_PURCHASE_ORDER_REBUILD
authored: 2026-05-18 IDT
total_findings: 1
status: 🟢 closed — 1 LOW finding logged (absorbed pre-existing behavior; no new defects from this SPEC)
---

# FINDINGS — M1_LENS_PURCHASE_ORDER_REBUILD

## F-1 — LOW (ABSORBED PRE-EXISTING) — `tenant_lens_stock` PostgREST relation 400 with working fallback

**Surface area:** `modules/lens-purchase-order/lens-purchase-order-shortages.js` line ~21 — the supplier-join read attempts a PostgREST `select` with embedded relations:

```js
sb.from('tenant_lens_stock')
  .select('variant_id, ..., lens_variant!inner(id, design_id), supplier_catalog_offering!inner(supplier_id)')
  .eq('tenant_id', tid)
  .eq('supplier_catalog_offering.supplier_id', supplierId)
  .lt('qty_on_hand', 999999);
```

PostgREST returns **400 Bad Request** for this shape on demo (the embedded relation chain doesn't match the configured FK metadata on the live schema). The shortages module logs a warning and **falls back to an ungrouped read** via `fallbackUngroupedRead()` which returns 200 and successfully populates the 14 shortage lines for SHALDAG.

**Status:** ABSORBED — this is **pre-existing behavior** carried over verbatim from the prior implementation. The fallback path works. No user-facing impact. The supplier-join attempt fails on every supplier pick, but the fallback delivers correct rows because the actual filter ("qty < threshold") is done client-side regardless.

**Why not fix in this SPEC:** Out of §7 scope ("no RPC modification, no view modification, no schema work"). The right fix is either:
(a) declare an explicit FK relationship in PostgREST metadata (live DB change), or
(b) replace the join with a small RPC `m1_lens_shortages_for_supplier(p_tenant_id, p_supplier_id)` returning JSON,
or (c) accept the fallback as canonical and remove the dead join attempt (the simplest).

**Recommended follow-up SPEC:** `M1_LENS_PURCHASE_ORDER_SHORTAGES_QUERY_CLEANUP` (~30 min) — drop the failing join attempt; keep only the ungrouped read; eliminate the spurious 400 from network logs. Low-priority cleanup; not blocking Group B closure.

**Tracked in:** Module SESSION_CONTEXT (next update); no TECH_DEBT entry needed (fallback works).

---

## Lessons re-confirmed (not new findings)

1. **Phase 0 shared components work as advertised.** `WizardSteps.init()` rendered cleanly, `GroupHeaderRow.toHtml()` emitted purple/blue/amber bands per the mockup, and inventory.html already loaded most dependencies — only `wizard-step-indicator.js`+`.css` needed adding.
2. **State-machine wizards beat multi-page wizards for single-tab UIs.** The 4-step indicator is purely presentational while the underlying screen is one page; this matches how `lens-pricing` was rebuilt (one page, top-tabs for navigation) and avoids any routing complexity.
3. **place_purchase_order RPC contract is rock-solid.** Returns the UUID directly; po_number lookup via subsequent `select` is the canonical pattern (already-shipped behavior preserved).
4. **Iron Rule 9 backup folder gitignored** — confirmed `modules/Module N/backups/` is in `.gitignore` and silently skipped. Backup is a local safety net only; the canonical history is the rewrite commit.

## Proposals for opticup-strategic (Foreman) skill

**P-AUTHOR-1 (NEW)** — SPEC §0 path-resolution should distinguish "shared component is REQUIRED by the mockup" vs "shared component is mentioned in the architecture brief but the mockup doesn't actually use it." This SPEC's §0 listed `side-detail-panel` as a Phase 0 dependency. The actual 387-line mockup uses inline per-row editors, not a side drawer for line edit — only a static side-card stack on the right (which doesn't need `SideDetailPanel.init()` at all). When Step 1.6 verifies paths, also verify each shared component is USED IN THE MOCKUP, not just present in `shared/js/`. ~5 minutes per SPEC; prevents §0 wording drift between "available" and "required."

**Source:** §0 Path verification table listed `side-detail-panel` as a dep; mockup audit revealed it wasn't needed. Documented as a non-deviation in EXECUTION_REPORT §5.

## Proposals for opticup-executor skill

**P-EXEC-1 (NEW)** — Sequencing trap in async create flow: when calling `await sb.rpc(...)` followed by `await sb.from(...).maybeSingle()` for a post-RPC lookup, then `setStep()` + UI update, headless Tier C tests that check state by polling on `window.LensPO.poId` will exit the wait loop AFTER `rpc` returns but BEFORE the lookup finishes. The fix is to poll on a state that includes the AFTER-LOOKUP fields (e.g., `poNumber` non-null AND `currentStep === STEP_SEND`). Headless smoke patterns should always wait on a STATE-COMPLETE condition, not just on a SINGLE TRIGGERING FIELD.

**Source:** First Tier C poll exited at `poId !== null` but `poNumber` was still null and `currentStep` still 2. Second poll on `currentStep === 3 && poNumber` succeeded immediately. Codify in SKILL "Tier C smoke patterns" section.

---

**END FINDINGS**

_1 LOW (ABSORBED), 0 MEDIUM, 0 HIGH, 0 CRITICAL. 2 SKILL proposals harvested (1 author, 1 executor). 0 deviations._
