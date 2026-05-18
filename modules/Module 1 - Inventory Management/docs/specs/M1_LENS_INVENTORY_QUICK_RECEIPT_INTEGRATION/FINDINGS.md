# FINDINGS — M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-17

7 findings logged during execution; none absorbed into SPEC 4a scope.

---

## F-1 — SPEC §3 criterion #3 line-count estimate wrong by design (INFO)

**Severity:** INFO
**Location:** SPEC.md §3 criterion #3 + §0 baseline expectations
**Description:** §3 #3 expects the partial to grow from 652 → 800-950 lines (delta ~150-300). Actual delta is -4 (post-integration: 658 lines including the 6-line drawer mount + entry-helper-strip + receive-goods button, minus 35 lines of retired `#drawer-quick-scan`). The shared `QuickReceiptDrawer` component builds its own DOM at `init()` time via `mount.appendChild` — the partial only carries the mount point `<div id="quickReceiptDrawer"></div>`. The SPEC author's estimate assumed inline drawer DOM.

**Suggested next action:** Future drawer-integration SPECs (M9 Goods Receipt likely consumes the same drawer) should estimate "partial grows by ~10-50 lines, the shared component supplies its own DOM". Update the opticup-strategic SKILL.md SPEC-author template (or add a one-liner to the "shared component consumer" pattern) so SPEC authors don't repeat this estimate error.

---

## F-2 — `m1_create_receipt_from_box` RPC pre-dates `has_no_invoice` column (MEDIUM)

**Severity:** MEDIUM (no functional impact today; visible tech debt)
**Location:** Live DB function `m1_create_receipt_from_box(8-arg)` + the consumer at `modules/lens-inventory/lens-inventory-main.js handleQuickReceiptSubmit`
**Description:** SPEC 3 (commit `0e7d524`) added `purchase_receipt.has_no_invoice BOOLEAN NOT NULL DEFAULT FALSE`. The atomic RPC for receipt creation, `m1_create_receipt_from_box`, was last touched on 2026-05-17 (`m1_debt_decoupling_restore_8arg_rpc_physical_only`) and has 8 params — no `p_has_no_invoice`. SPEC 4a's consumer is the first to need to set this flag.

SPEC 4a's workaround: call the 8-arg RPC, then a defense-in-depth-scoped UPDATE on `purchase_receipt` to set `has_no_invoice` when the user checked "אין תעודה". Both calls in the same `try/catch`. Failure of the UPDATE is logged as a Toast warning but doesn't roll back the receipt (best-effort). Tenant_id filter on UPDATE provides RLS-equivalent isolation.

**Suggested next action:** Author a small SPEC `M1_RPC_HAS_NO_INVOICE_OVERLOAD` (~30 min): add a 9-arg overload `m1_create_receipt_from_box(p_tenant_id, p_supplier_id, p_delivery_note_number, p_lines, p_box_id, p_box_supplier_barcode, p_supplier_number, p_confirmed_by, p_has_no_invoice DEFAULT FALSE)`. Inline INSERT to write `has_no_invoice = p_has_no_invoice`. Switch consumer to the 9-arg overload. Remove the 2-step UPDATE workaround in handleQuickReceiptSubmit. Drop the old 8-arg overload only after grep confirms no other consumer (likely safe — frames flow uses different RPCs).

Alternative: file as `M1-DEBT-XX` in TECH_DEBT.md if not prioritizing pre-SaaS-launch.

---

## F-3 — `_submitAddStock` deletion removes the 8-arg RPC's only call site (INFO)

**Severity:** INFO
**Location:** `modules/lens-inventory/lens-inventory-modal-shows.js` (deletion of `_submitAddStock` + `_loadSuppliersForManualAdd`) post-SPEC-4a
**Description:** Before SPEC 4a, `_submitAddStock` was the only function in the lens-inventory module that called `m1_create_receipt_from_box`. SPEC 4a's `handleQuickReceiptSubmit` in lens-inventory-main.js is now the only consumer. Project-wide grep confirms no other JS file invokes this RPC:

```
$ grep -rn "m1_create_receipt_from_box" js/ modules/ shared/
modules/lens-inventory/lens-inventory-main.js:{the new consumer}
```

So the 8-arg RPC has exactly one client today. The lens-inventory-modals.js file's qty-adjustment flow (Modal.* + ➕➖ buttons) calls `record_stock_movement` directly (different RPC). No regression risk from `_submitAddStock` deletion.

**Suggested next action:** None — informational only. Documenting that the post-SPEC-4a state has clean ownership of the RPC.

---

## F-4 — `lens-inventory-quick-scan.js` is a 38-line stub awaiting full removal (LOW)

**Severity:** LOW (clean-up debt)
**Location:** `modules/lens-inventory/lens-inventory-quick-scan.js` + `modules/inventory/inventory-shell-lens.js:41` (loader manifest)
**Description:** SPEC 4a retired the Phase C `LensInvQuickScan` drawer (direct-to-stock path). The file is reduced to a 38-line redirect stub (`open() → QuickReceiptDrawer.open()`) so the shell-loader's hard-coded script list at `modules/inventory/inventory-shell-lens.js:41` doesn't break. The file is dead code modulo the redirect.

**Suggested next action:** In the next M1 maintenance SPEC, delete `modules/lens-inventory/lens-inventory-quick-scan.js` AND remove its entry from `modules/inventory/inventory-shell-lens.js:41`. The redirect stub's `open()` is unused (the active scan-in flow now uses `data-lens-inv-action="scan-in"` → openScanModal('in') → drawer-open). 5-min change. Bundle into next M1 cleanup SPEC.

---

## F-5 — Sell-price column shows "—" placeholder in lots-table (MEDIUM)

**Severity:** MEDIUM (mockup-fidelity gap; user-visible)
**Location:** `modules/lens-inventory/lens-inventory-lot-pane.js:140` `renderLots` function — `sellPrice = '—'` placeholder
**Description:** SPEC 4a §3 criterion #10 requires `מחיר מכירה` column on the lots-table. The column is present (passes the criterion) but the value is a placeholder `—` because the effective sell-price is derived from `supplier_catalog_offering.price_amount` + `pricing_overlay` adjustments via the `effective_price(p_offering_id, p_tenant_id, p_as_of_ts)` RPC — that integration is SPEC 5's territory (Pricing screen rebuild).

In the live DB, lots have a `supplier_offering_id` FK that resolves to the offering; the RPC can run per-lot at render time. But layering that into lot-pane.js without the Pricing screen's resolver wiring would duplicate logic.

**Suggested next action:** SPEC 5 (Pricing rebuild) should expose a `LensPricing.resolveSellPrice(offeringId, asOfTs)` helper that lens-inventory-lot-pane.js's renderLots can call. Until then, the placeholder is acceptable per Pattern P-AR-16 (mockup shows real prices because mockup is hard-coded HTML; live shows "—" until resolver is wired). Documented in SPEC 4a §3 #10 acceptance language. Daniel may want to defer the sell-price wiring until after Pricing screen lands.

---

## F-6 — Pre-existing dev-server (PID 12672) running from 2026-05-10 (INFO)

**Severity:** INFO
**Location:** Windows desktop runtime — http-server on :3000 launched by `scripts/start-local.ps1` a week ago
**Description:** When SPEC 4a tried to launch its own http-server for Tier C VFV, it got `EADDRINUSE` on port 3000. Investigation showed PID 12672 was an http-server launched 2026-05-10 (a week prior). The pre-existing server served files correctly (it reads from disk per-request with `-c-1`), but the discovery cost ~2 min.

**Suggested next action:** Add a one-line port-listener probe to the opticup-localhost-tester SKILL or to a pre-flight check in `scripts/start-local.ps1`: if PID is running > 7 days, suggest a restart (not mandatory, just informational). Long-lived dev servers are mostly fine but accumulate Node-process memory drift.

---

## F-7 — Browser Chrome MCP page cache served pre-edit snapshot on first navigate (INFO)

**Severity:** INFO
**Location:** Chrome MCP `new_page` behavior + browser bfcache
**Description:** The first Chrome MCP `new_page` to the inventory URL returned a snapshot showing OLD partial markup (the retired `#drawer-quick-scan` content), even though disk had my edits and http-server's `-c-1` should have prevented client cache. Hard-reload via `navigate_page type=reload ignoreCache=true` resolved the issue — second navigate showed fresh content.

This is a known Chrome behavior (bfcache) when navigating within the same domain quickly after a previous page load. Not a project bug.

**Suggested next action:** Add a note to the opticup-localhost-tester SKILL (or the executor SKILL's Chrome MCP section): "After every code edit that affects a localhost-served file, the FIRST Chrome MCP navigation should use `ignoreCache=true` or `reload` to bypass bfcache." Saves the next executor from this 5-min discovery loop.

---

*End of FINDINGS. 7 findings logged: 0 CRITICAL, 0 HIGH, 2 MEDIUM (F-2 RPC overload, F-5 sell-price placeholder), 1 LOW (F-4 stub removal), 4 INFO. No findings absorbed into SPEC 4a scope.*
