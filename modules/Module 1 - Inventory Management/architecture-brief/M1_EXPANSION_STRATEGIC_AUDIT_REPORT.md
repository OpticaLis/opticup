# M1 Expansion — Strategic Audit & Path-Forward Recommendation

**Author:** opticup-architect (single-pass read-only audit, Claude Code Windows desktop)
**Date:** 2026-05-15 (evening)
**Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_EXPANSION_STRATEGIC_AUDIT_BRIEF.md`
**Mode:** Read-only. Single deliverable — this report. No code, schema, mockup, or SPEC modifications.
**Sources read:** 23 files per Brief §3 (Tiers 1-7) + 3 expanded reads (M1B Procurement FINDINGS, ROADMAP.md current state, OPEN_TASKS.md current Active).
**Iron Rule 32:** Destructive operations declared `None.` Honored.

---

## 0. Headline

> **The Brief is stale by ~12 hours.** It treats Phase 1B Foundation and Procurement as upcoming SPECs and the customer-screens folder as the next domino. Reality (verified against `git log` 2026-05-15 evening): **both Foundation and Procurement closed today** (Foundation 🟢, Procurement 🟡), the legacy customer-screens SPEC folder is a superseded stub, and the procurement run surfaced **3 HIGH foundational gaps** that now hold the next-step decision. The audit therefore reframes Daniel's strategic question from "is 1B ready?" to "what's the right move on top of a 75%-functional Phase 1B?"
>
> **Bottom line:** the M1 Lens phase is materially complete as a foundation. The highest-value next move is **a single bundled Phase 2 hotfix SPEC that closes F-1 / F-2 / F-3** (K2 completion + variant-less receipts + stock-adjustment infrastructure) before any new build (contact-lenses, accessories, M7, M9). All three are MUST-haves for production correctness, all three were caught by the procurement smoke matrix, and all three can ship in one Pipeline.

---

## 1. What's locked (decision inventory)

All 16 logged decisions plus 7 implicit-but-locked decisions embedded in briefs. Implementation status verified by file + DB inspection.

| # | Decision | Source | Implemented? | Risk if changed later |
|---|---|---|---|---|
| D-M1-01 | `production_type ENUM('stock','custom')` on `supplier_catalog_offering` (commercial), NOT on `lens_variant` | `decisions/M1.md` | ✅ Live in schema + UI filter on Inventory / Designs / Pricing / PO screens | MEDIUM — flag is filter-of-record across M1/M7/M9; moving it would require migrating every existing offering row + every filter |
| D-M1-02 | Lens Inventory mockup approved + stock/custom filter primary | `decisions/M1.md` | ✅ Mockup + shipped Foundation screen | LOW |
| D-M1-03 | Active Designs Selection mockup approved + stock/custom filter primary | `decisions/M1.md` | ✅ Mockup + shipped Foundation screen | LOW |
| D-M1-04 | Pricing: 3 cols (catalog / discount% / final), inline edit, bulk required Phase 1, no separate edit screen | `decisions/M1.md` | ✅ Mockup + shipped Foundation screen + `bulk_apply_pricing_overlay` RPC | LOW |
| D-M1-05 | `pricing_overlay` tiered: default layer (`scope_design_id`, `scope_supplier_id`) + variant-level exceptions. Exactly-one-scope CHECK | `decisions/M1.md` | ✅ Live in schema with exactly-one CHECK constraint verified by Phase 1A Reviewer | LOW |
| D-M1-06 | NEW screen Platform Catalog Admin (Optic Up only) | `decisions/M1.md` | ✅ Mockup + shipped `lens-catalog-admin.html` + EF `lens-catalog-import` | LOW |
| D-M1-07 | PO: manual send (PDF/Excel) Phase 1, source-split (stock / custom-per-customer / manual), tenant flag for future auto-send default OFF | `decisions/M1.md` | ✅ Mockup + shipped procurement screen + place_purchase_order RPC; tenant auto-send flag NOT shipped (deferred — flag never added to tenants config) | MEDIUM — auto-send flag absence is a missing P19/P33 instance (see §3 F-08) |
| D-M1-08 | NEW screen Active POs List with status pipeline (Draft → Sent → Partial → Fully Received → Cancelled) | `decisions/M1.md` | ✅ Mockup + shipped procurement screen. **But:** PO never transitions from sent → partial → fully_received because K2 doesn't update PO state (F-1) | HIGH — display promise broken Day-1 |
| D-M1-09 | NEW screen Goods Receipt — **anchor on existing frames pattern, generic component in Module 1.5** | `decisions/M1.md` | 🟡 Mockup + shipped procurement screen, BUT **built as parallel `modules/lens-goods-receipt/`, not by extending `modules/goods-receipts/`** | HIGH — Iron Rule 21 (No Duplicates) and the D-M1-09 explicit "generic component in 1.5" both violated; see §3 F-04 |
| D-M1-10 | Reconciliation-Agent schema readiness: 7 mandatory fields (delivery_note_number, FK back-pointers, discrepancy cols, 5 timestamps, transfer.actual_received_qty) | `decisions/M1.md` | 🟡 6 of 7 present; **`discrepancy_qty` not populated by K2** (F-1 sub-finding) and `purchase_receipt_line.ordered_qty` left NULL despite JSON input | HIGH — future Reconciliation Agent will see zero discrepancies because the column is always NULL |
| D-M1-11 | Supplier_debt created from delivery note / invoice **at goods-receipt time**, NEVER at PO creation | `decisions/M1.md` | ✅ K2 wires `m1_create_supplier_debt_from_receipt` at receipt close; verified by M1B0 smoke (₪234.82 fixture) | LOW |
| D-M1-12 | Two additive FK columns: `purchase_receipt.shipping_box_id` (M1 side), `lab_jobs.purchase_receipt_id` (M9 side) | `decisions/M1.md` | 🟡 M1 side shipped + FK clause present; M9 side **deferred to M9 SPEC** (table doesn't exist yet) | LOW — additive only, no risk |
| D-M1-13 | Five M1↔M9 contracts K1-K5 declared in respective SPECs | `decisions/M1.md` | 🟡 K2 + K3 + K5 shipped by Phase 1A; K1 + K4 deferred to M9 SPEC | LOW |
| D-M1-14 | Mockup #7 refinements (M9 box linkage field + "M9 lab_job יתקדם" wording) | `decisions/M1.md` | ✅ Applied in `LENS_GOODS_RECEIPT_MOCKUP.html` v3 | LOW |
| D-M1-15 | Legacy `shipments` deprecation absorbed by M9 SPEC | `decisions/M1.md` | ⬜ Tables + code still live; cleanup is M9 SPEC scope (correct deferral) | LOW |
| D-M1-16 | `currencies` table promoted to GLOBAL reference (Iron Rule 14 exception #2 alongside `lens_variant_display_seq`) | `decisions/M1.md` | ✅ Shipped 2026-05-14 via `M1A_CURRENCIES_GLOBAL_HOTFIX` | LOW |
| **(implicit-locked decisions embedded in briefs / handoff, not in `decisions/M1.md`)** | | | | |
| ID-L-01 | FIFO cost basis (over weighted-avg / specific-identification) | `M1_EXPANSION_SESSION_HANDOFF.md` | ✅ Live in `record_stock_movement` (verified by Phase 1A Code Review C-5) | HIGH — single most expensive decision to reverse; would invalidate cost basis on every historical stock_lot row |
| ID-L-02 | 3 separate inventory tables (lenses, contact-lenses, accessories) — NOT one unified table with category enum | `M1_EXPANSION_SESSION_HANDOFF.md` | 🟡 Lens schema shipped; contact-lenses + accessories never built. Decision is still load-bearing because future schemas must mirror this pattern | MEDIUM — drift between the three would break cross-category dashboards |
| ID-L-03 | Build order: lenses first, then contact-lenses, then accessories | `M1_EXPANSION_SESSION_HANDOFF.md` | 🟡 Phase 1B Procurement closed today; contact-lenses + accessories not started | LOW |
| ID-L-04 | 1:1 brand-supplier today via partial `UNIQUE(brand_id) WHERE status='active'`, 1:N future-ready | `M1_EXPANSION_SESSION_HANDOFF.md` | ✅ Partial unique index live; tenant_supplier_preference table NOT yet built (future-ready as declared) | LOW |
| ID-L-05 | AXIS belongs in customer prescription (M6), NOT in lens inventory | `M1_EXPANSION_SESSION_HANDOFF.md` | ✅ Honored across schema + all 7 mockups | LOW |
| ID-L-06 | Phase 1B split: Foundation (3 read screens) first, Procurement (3 write screens) second — Daniel decision 2026-05-15 | `M1_LENS_PHASE_1B_FOUNDATION_BRIEF.md` Locked Decision #1 | ✅ Both sub-phases closed today | LOW |
| ID-L-07 | All new SECURITY DEFINER RPCs inherit `REVOKE EXECUTE FROM PUBLIC/anon` discipline from `SECURITY_HOTFIX_2026_05_13` + `M1A_OPERATIONS_RPCS_FIX` | inherited project policy | ✅ Verified across Foundation (3 RPCs) + M1B0 (5 RPCs) + Procurement (0 new RPCs) | HIGH — slipping once silently exposes a service-role mutator to anon |
| ID-L-08 | Smoke-touched schema audit + Inner-call arity audit mandatory at SPEC §0 (per `M1_SKILL_IMPROVEMENT_HARVEST`) | `opticup-strategic` SKILL.md harvest | ✅ Applied in every M1 SPEC since (caught D1/D2/D3 in M1B0 + 2 amendments in M1A_OPERATIONS_RPCS_FIX) | LOW |

---

## 2. What's built

Inventory of every artifact across the M1 Lens phase. Verified against `git log`, live Supabase (via Phase 1A Code Review evidence), and file inspection.

| Artifact | Type | Status | Source SPEC |
|---|---|---|---|
| **Schema — 17 tables (Phase 1A)** | DDL | ✅ Built | `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN` |
| `lens_brand`, `lens_design`, `lens_variant` | catalog (platform-owned) | ✅ | 1A |
| `supplier_catalog_offering`, `pricing_overlay` | commercial | ✅ | 1A |
| `supplier_brand_distribution`, `supplier_permissions`, `change_approval_log` | governance | ✅ | 1A |
| `tenant_active_offerings`, `tenant_lens_stock`, `tenant_location` | retailer-tier | ✅ | 1A |
| `stock_lot`, `stock_movement`, `stock_transfer` | operations (FIFO) | ✅ | 1A |
| `purchase_receipt`, `purchase_receipt_line` | receipts | ✅ | 1A |
| `vat_rates` | global reference | ✅ | 1A |
| `pending_lens_advancement_queue` | K3 trigger queue | ✅ | 1A |
| **Schema — 3 tables (M1B0 PO schema)** | DDL | ✅ Built | `M1B0_PURCHASE_ORDER_SCHEMA` |
| `purchase_order`, `purchase_order_line`, `supplier_debt` | procurement | ✅ | M1B0 |
| **Schema — 1 global table promoted** | DDL | ✅ Built | `M1A_CURRENCIES_GLOBAL_HOTFIX` |
| `currencies` (per-tenant → global) | ISO-4217 reference | ✅ | M1A_CURRENCIES_GLOBAL_HOTFIX |
| **RPCs — 9 (Phase 1A)** | SECDEF RPCs | ✅ Built | 1A |
| `record_stock_movement`, `record_transfer`, `record_adjustment_found`, `next_lot_number`, `next_transfer_number`, `next_receipt_number`, `next_lens_variant_display_id`, `effective_price`, `m1_create_receipt_from_box` | operations + sequence | ✅ + hardened by M1A_OPERATIONS_RPCS_FIX | 1A + M1A_OPERATIONS_RPCS_FIX |
| **RPCs — 5 (M1B0)** | SECDEF RPCs | ✅ Built | M1B0 |
| `next_purchase_order_number`, `place_purchase_order`, `mark_po_sent`, `cancel_purchase_order`, `m1_create_supplier_debt_from_receipt` | procurement | ✅ | M1B0 |
| **RPCs — 3 (Foundation)** | SECDEF RPCs | ✅ Built | `M1_LENS_PHASE_1B_FOUNDATION` |
| `toggle_active_offering`, `upsert_pricing_overlay`, `bulk_apply_pricing_overlay` | metadata UI writers | ✅ | Foundation |
| **Triggers / Views** | DDL | ✅ Built | 1A |
| K3 trigger `m9_lens_received_for_sale_order_trg` on `stock_movement` | M1→M9 contract | ✅ + idempotency UNIQUE added by M1A_OPERATIONS_RPCS_FIX | 1A + M1A_OPERATIONS_RPCS_FIX |
| K5 view `v_suppliers_for_m9` | M1 read-only for M9 | ✅ + anon REVOKE applied by M1A_OPERATIONS_RPCS_FIX | 1A + M1A_OPERATIONS_RPCS_FIX |
| **Edge Function** | EF | ✅ Built | 1A |
| `lens-catalog-import` (xlsx → catalog) | platform-admin only | ✅ v2 + fail-closed gate + `config.toml verify_jwt=true` after M1A_OPERATIONS_RPCS_FIX | 1A + M1A_OPERATIONS_RPCS_FIX |
| **UI — 4 HTML pages at root** | UI | ✅ Built | various |
| `lens-catalog-admin.html` | Platform Admin (Optic Up only) | ✅ | 1A |
| `lens-inventory.html` | Inventory Management screen (read-only Day-1, ➕➖ wired in Procurement) | ✅ | Foundation + Procurement |
| `lens-active-designs.html` | Active Designs Selection screen | ✅ | Foundation |
| `lens-pricing.html` | Catalog & Pricing screen (inline edit + bulk) | ✅ | Foundation |
| `lens-purchase-order.html` | PO creation screen | ✅ | Procurement |
| `lens-pos-list.html` | Active POs List screen | ✅ | Procurement |
| `lens-goods-receipt.html` | Goods Receipt screen | ✅ | Procurement |
| **JS modules — under `modules/lens-*/`** | UI logic | ✅ Built | various |
| `modules/lens-catalog-admin/` (7 files) | platform-admin UI | ✅ | 1A |
| `modules/lens-inventory/`, `modules/lens-active-designs/`, `modules/lens-pricing/` | foundation read screens | ✅ | Foundation |
| `modules/lens-purchase-order/`, `modules/lens-pos-list/`, `modules/lens-goods-receipt/` | procurement screens | ✅ — but built as parallel folder, not as extension of `modules/goods-receipts/` (see §3 F-04) | Procurement |
| **Permissions** | seed | ✅ Built | various |
| 9 keys × 2 tenants = 18 perm rows + 52 role_permission rows | `lens.inventory.view`, `lens.designs.manage`, `lens.pricing.manage`, `lens.po.create`, `lens.po.view`, `lens.po.cancel`, `lens.gr.create`, `lens.gr.add_manual_line`, `lens.inventory.adjust` | ✅ | Foundation + M1B_FOUNDATION_PERMISSIONS_HOTFIX + Procurement |
| **Mockups — 7 HTML sketches** | reference | ✅ Built | various Cowork sessions 2026-05-12 → 2026-05-14 |
| All 7 in `architecture-brief/mockups/` | retrofitted post-D-M1-01..11 + D-M1-14 | ✅ | architect sessions |
| **Decisions log** | doc | ✅ 16 decisions logged | `decisions/M1.md` |
| **Cross-module overlap report** | doc | ✅ M1↔M9 verdict: PROCEED-WITH-M1-AS-IS | `M1_M9_OVERLAP_REPORT.md` |
| **Prior reviews** | doc | ✅ Both shipped 2026-05-15 morning | `CODE_REVIEW_REPORT.md` + `STRATEGIC_REVIEW_REPORT.md` |
| **What's planned but NOT built** | | | |
| Contact-lenses schema + screens | future M1 phase | ⬜ Not started | ID-L-03 build order |
| Accessories schema + screens | future M1 phase | ⬜ Not started | ID-L-03 build order |
| Tenant settings panel for M1 (currencies / vat_rates / reorder defaults / auto-send PO flag / pricing overlay defaults) | P33 trigger from D-M1-07 + P19 tables | ⬜ Not started — no sketch, no SPEC | implicit gap; see §3 F-08 |
| `M1_K2_RECEIPT_COMPLETION` SPEC | Phase 2 follow-up | ⬜ Queued by Procurement FOREMAN_REVIEW | F-1 |
| `M1_RECEIPT_VARIANT_LESS_LINES` SPEC | Phase 2 follow-up | ⬜ Queued | F-2 |
| `M1_STOCK_ADJUSTMENT_INFRA` SPEC | Phase 2 follow-up | ⬜ Queued (HIGHEST priority of the three) | F-3 |
| Reconciliation Agent itself | Phase 2+ — schema readiness only Day-1 (D-M1-10) | ⬜ Not started | by design |
| `tenant_supplier_preference` table (for 1:N supplier→brand future) | additive Phase 2+ | ⬜ Not started | ID-L-04 (additive promise) |
| Bundle pricing, supplier rebates, consignment stock, drop-ship | v2 forward-compatibility | ⬜ All additive promises | handoff §"v2 features" |
| Module 1 close ceremony per `opticup-architect` SKILL.md | governance | ⬜ Not performed since Phase 1A → Procurement closure same day | architect bootstrap step 4.5 trigger |

---

## 3. Weaknesses, gaps, risks

Each finding follows the Brief §4 format: **What / Why it matters / Severity / Recommended action**. Severity per the opticup-guardian rubric (CRITICAL = live-customer-harm imminent; HIGH = correctness broken or schema-load-bearing; MEDIUM = process gap or rule-21-class; LOW = cosmetic / docs / latent).

### F-01 — HIGH — Audit-Brief drift: Foundation + Procurement are not "what's next", they shipped today

**What.** The audit Brief §2 says "Phase 1B is currently planned as TWO sub-phases: Foundation (permissions + auth) + Procurement (purchase orders + goods receipt). Briefs exist for both." Reality (verified via `git log -- modules/Module 1 - Inventory Management/docs/specs/`): both Foundation and Procurement closed today (Foundation 🟢 at commit `cc52dc4`, Procurement 🟡 at commit `b808d00`).

**Why it matters.** Daniel's strategic-next question must be answered against current state, not yesterday's state. The right Phase-2 conversation is no longer "is Foundation ready?" but "do we ship the 3 HIGH-priority follow-up SPECs as one bundle, or in sequence?"

**Severity.** HIGH — process gap that would mislead any future audit run from the same Brief.

**Recommended action.** **Accept and document** — this audit report itself supersedes the Brief's framing. No SPEC needed. Architect note: when a parallel session closes work during the audit window, the audit deliverable is the freshness re-baseline.

---

### F-02 — HIGH — Orphan SPEC stub `M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md`

**What.** A `SPEC.md` exists at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md` marked "STUB ONLY — DO NOT EXECUTE." It was superseded 2026-05-15 by the split into `M1_LENS_PHASE_1B_FOUNDATION` + `M1_LENS_PHASE_1B_PROCUREMENT` but never archived or marked retired.

**Why it matters.** Cross-references from M7 + M9 + future sessions may resolve to a dead path. Iron Rule 21 (No Orphans) — this is exactly the rule's target: two SPEC folders, one alive one dead, both claiming Phase 1B customer screens. Future sessions land in the dead one and waste cycles.

**Severity.** HIGH — Iron Rule 21 violation; also confuses the "what's open?" question every M1 session must answer.

**Recommended action.** **Fix at next M1 close ceremony** — add a one-line "STATUS: SUPERSEDED by M1_LENS_PHASE_1B_FOUNDATION + M1_LENS_PHASE_1B_PROCUREMENT (2026-05-15)" header to the stub and link forward. Cheap; can be batched with the close ceremony itself. Do not delete the folder — it carries the historical pre-split intent. Per `opticup-strategic` P30 pattern: rename to `[retired-2026-05-15:M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS]` or add the retired-marker inside the file.

---

### F-03 — CRITICAL — 3 HIGH foundational gaps from Procurement (F-1/F-2/F-3) block production correctness

**What.** Procurement FOREMAN_REVIEW + FINDINGS surface 3 HIGH findings, all foundational:
- **F-1**: `m1_create_receipt_from_box` does NOT update `purchase_order_line.qty_received`, does NOT transition `purchase_order.status`, does NOT populate `purchase_receipt_line.discrepancy_qty` / `ordered_qty`. PO stays in `sent` forever after any receipt. Active POs List can never show partial/fully-received state. Reconciliation Agent (D-M1-10) will see zero discrepancies because the column is always NULL.
- **F-2**: K2 cannot accept variant-less manual receipt lines. `stock_lot.variant_id` is NOT NULL; any `is_manual_addition=true` line with NULL variant fires `23502`. Mockup #7 manual-add banner promises this works; JS now filters them out client-side. Bonus / sample / out-of-catalog supplier shipments cannot enter the system Day-1.
- **F-3**: ➖ inventory-adjust flow has no functioning RPC path. `record_stock_movement(adjustment_lost)` requires `adjustment_id NOT NULL` per `stock_movement_exactly_one_source` CHECK; no `stock_adjustment` table exists; no `record_adjustment_lost` RPC exists. JS blocks the call with a Phase 2 message + writeLog audit. ➖ button visually present but inert.

**Why it matters.** Together these are the difference between "Phase 1B shipped" and "Phase 1B is production-correct." Specifically:
- F-1 means a manager who opens the Active POs List the day after a receipt sees the PO still in `sent` status — Daniel will hear about this within hours of real use.
- F-2 means the manual-add affordance Daniel explicitly insisted on (D-M1-09 + Mockup #7 manual-add banner) does not actually work for the case that justified its existence (out-of-catalog bonus items from supplier).
- F-3 means Iron Rule 1 (atomic quantity changes only via RPC) leaves the staff with no path to remove stock that was lost / broken / mis-counted. Today they would have to wait for Phase 2.

**Severity.** **CRITICAL.** The procurement smoke caught all three (good — the 14-step smoke matrix worked exactly as designed), but the gaps are real, blocking, and visible to real users the moment Daniel runs a logout/login on prizma.

**Recommended action.** **Bundle into ONE Phase 2 hotfix SPEC** named `M1_LENS_PHASE_1B_GAP_CLOSURE`. Scope: extend K2 RPC body (F-1) + decide architect path for variant-less lines and apply (F-2) + create `stock_adjustment` table + `record_adjustment_lost` RPC + re-enable ➖ flow (F-3). Estimated effort 4-6 hours via Full-Auto Pipeline. Smoke: re-run the 3 failing Procurement smoke steps + cross-check `purchase_order.status` lifecycle end-to-end on demo. This is the recommended **single next SPEC** for M1 — see §4.2.

---

### F-04 — HIGH — D-M1-09 violation: lens-goods-receipt built as parallel folder, NOT as extension of frames goods-receipts

**What.** D-M1-09 (locked 2026-05-14): "Goods Receipt **anchors on existing frames pattern** (`modules/Module 1 - Inventory Management/docs/goods-receipts/`), **generic component in Module 1.5** — reused by frames/lenses/contact-lenses/accessories." The Phase 1 Brief §10 anti-pattern list specifically calls this out: "extend `modules/goods-receipts/*` rather than build a parallel `modules/lens-receipts/*`."

Reality (verified via filesystem): `modules/lens-goods-receipt/` (6-9 files per Procurement Brief) was built **alongside** the existing `modules/goods-receipts/` (frames-era, 18 files). No `product_category` dispatcher. No Module 1.5 promotion. Two parallel receipt UIs for two product types.

**Why it matters.**
- **Iron Rule 21 (No Orphans, No Duplicates):** the project's most-violated rule per Phase 1 Brief §9 prediction is now violated in the most predictable place. Contact-lenses + accessories will need a 3rd and 4th parallel folder unless this is corrected.
- **Code duplication tax compounds:** every bugfix to receipt flow (e.g., the 2026-05-06 invoice-vs-system total compare from the Prizma branch manager) now needs to be applied twice — once to frames, once to lenses. Three months in, the two will silently diverge.
- **D-M1-09 explicit "generic component in Module 1.5" promise is unfulfilled** — Module 1.5 has no lens-receipt code.

**Severity.** HIGH — the longer it persists, the more expensive the unification SPEC becomes. Today: ~6 lens-goods-receipt files mostly mirroring frames-side; reasonable rewrite cost. After contact-lenses + accessories: 4 parallel UIs.

**Recommended action.** **Open a follow-up SPEC `M1_5_GOODS_RECEIPT_GENERIC_COMPONENT`** (estimated MEDIUM, 1-2 days) BEFORE contact-lenses Phase begins. Scope: move shared receipt UX into Module 1.5 + introduce `product_category` dispatcher. Defer the lens-side rewrite if necessary — but document the divergence in TECH_DEBT.md immediately so contact-lenses planning sees it. Alternative: accept the divergence and update D-M1-09 to acknowledge the parallel-folder pattern. The first option preserves SaaS-litmus; the second is faster but compounds debt.

---

### F-05 — HIGH — D-M1-10 sub-finding: `discrepancy_qty` + `ordered_qty` never populated by K2

**What.** D-M1-10 declares 7 mandatory schema fields for Reconciliation-Agent readiness, including `purchase_receipt.discrepancy_qty/reason/status` + `purchase_receipt_line.ordered_qty`. Schema verified present (Phase 1A). But K2 (`m1_create_receipt_from_box`) does not populate `ordered_qty` nor compute `discrepancy_qty` even when the JSON input carries `ordered_qty` (Procurement Phase A smoke step 4 verified: `discrepancy_qty=NULL` after partial receipt of 2 of 3).

**Why it matters.** The Reconciliation Agent (Phase 2+) is the consumer of these fields. If they are NULL across every receipt for months, the future agent will report "zero discrepancies" forever — a silent surveillance failure. The schema-readiness promise was kept but the writer is silent.

**Severity.** HIGH — same root cause as F-03's F-1 sub-finding. Bundled fix.

**Recommended action.** Fold into `M1_LENS_PHASE_1B_GAP_CLOSURE` (per F-03 above). K2 body extension to populate both fields. No new schema work.

---

### F-06 — MEDIUM — Mockup #5 (Platform Catalog Admin) hierarchy contradicts schema authority

**What.** Mockup `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` v2 (2026-05-14) uses a 4-column **supplier-first** hierarchy: Supplier → Brand → Series → Variants. The schema is **brand-first**: `lens_brand` owns the catalog hierarchy (with `owner_tenant_id NULL` for platform-owned brands), and `supplier_brand_distribution` is a separate many-to-many mapping (1:1 today via partial UNIQUE per ID-L-04). A supplier in the schema has no direct ownership of a brand — they merely distribute it.

**Why it matters.**
- The mockup's "12 brands of לפידות" framing is a **distribution** relationship, not an ownership relationship. The shipped `lens-catalog-admin.html` resolves this by joining through `supplier_brand_distribution` — which works today because of 1:1 enforcement.
- The day ID-L-04's promised 1:N future arrives (drop the partial UNIQUE), Hoya can be imported by both Lapidot and Bdolach. The mockup's left-column "Supplier" hierarchy will need to either show Hoya twice (once per supplier) or restructure entirely. The UX paradigm doesn't carry forward.
- This is a **soft contradiction**: the schema is correct; the mockup is convenient-for-today only. Future planners reading the mockup will assume supplier-owned-brand semantics that the schema does not support.

**Severity.** MEDIUM — not a Day-1 blocker (current code works via the JOIN); will become a UX redesign when ID-L-04's 1:N flips.

**Recommended action.** **Document and defer.** Add a one-line note inside `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` v3 (next mockup revision) clarifying "supplier-first navigation is a 1:1-era convenience; 1:N migration will require restructure to brand-first or filter-by-supplier." Open a TECH_DEBT entry `M1-DEBT-PLATFORM-ADMIN-1N-MIGRATION-UX` for the future planner. Do NOT redesign Day-1.

---

### F-07 — MEDIUM — No settings panel for M1 tenant-configurable values (P33 violation candidate)

**What.** `opticup-architect` SKILL.md P33: "Any Brief that uses Pattern P19 (config-driven tables) MUST include a settings-panel sketch." M1 Lens uses P19 in multiple places:
- `vat_rates` (per-country, tenant-configurable VAT rates)
- `currencies` (now global per D-M1-16, so this one is out)
- `tenant_lens_stock.reorder_threshold` (per-row, but the tenant-wide *default* is unconfigurable today)
- `tenants` auto-send-PO flag (D-M1-07: "tenant setting: 'auto-send custom orders to supplier' — default OFF") — flag never added to `tenants` config
- `pricing_overlay` default discount stacking/order rules at the tenant level
- `tenant_location.is_default` (per-tenant default branch — UI surface absent)
- `lab_supplier_thresholds`-equivalent (deferred to M9 but the M1-side `expected_delivery_at` default per supplier has no settings UI either)

There is no `LENS_SETTINGS_MOCKUP.html` and no tenant settings tab specified. The Platform Catalog Admin handles platform-level catalog data, not tenant-level lens settings.

**Why it matters.**
- **P33 was explicitly promoted to a SKILL pattern.** M1 was authored before P33 existed (M13 Module Close, 2026-05-10) — so this is genuinely retroactive — but the gap is real.
- D-M1-07's "tenant auto-send PO flag, default OFF" is a Day-1 commitment with no UI. Today a tenant cannot opt INTO auto-send because there's no toggle.
- Tenant 2 onboarding (a different optical chain in a different country) will need to configure VAT rates + reorder defaults + auto-send + currency-of-record. None of this is exposed today.

**Severity.** MEDIUM — Day-1 single-tenant (Prizma) can ship without it because all the defaults happen to be right. Tenant-2 onboarding blocker.

**Recommended action.** **Open a follow-up SPEC `M1_LENS_TENANT_SETTINGS` after the F-03 gap-closure bundle ships.** Scope: enumerate every tenant-configurable value introduced by M1 + author a single Settings tab under the existing tenant Settings page (`settings.html`). Effort: MEDIUM (1-2 days). Pair with the architect-side P33 retroactive sketch at `architecture-brief/MOCKUPS/LENS_TENANT_SETTINGS_MOCKUP.html`. Can run in parallel with contact-lenses planning.

---

### F-08 — MEDIUM — No Module 1 Close Ceremony performed despite 9 SPECs closing in one day

**What.** `opticup-architect` SKILL.md §"Module Close Ceremony": when a module's Architecture Brief is sealed (M1 Lens Brief sealed 2026-05-14), the Architect must perform a close ceremony — read all SPECs' FOREMAN_REVIEWs, harvest 1-2 lessons, update SKILL.md + DECISIONS_LOG, update MASTER_ROADMAP. Bootstrap step 4.5 surfaces backlog at every session start.

Reality: 9 M1-Lens SPECs closed today (M1B0, Foundation, Foundation Permissions Hotfix, Operations RPCs Fix, Currencies Hotfix, Debt Sweep, Skill Improvement Harvest, Foundation Permissions Hotfix, Procurement). No close ceremony recorded in DECISIONS_LOG; no module-close entry in `references/DECISIONS_LOG.md`.

**Why it matters.**
- The skill is **self-improving by design** — close ceremonies are how patterns propagate. 9 SPECs of harvest material is the richest single-day batch since the 2026-05-14 backlog batch close. Skipping it loses the lessons.
- Procurement FOREMAN_REVIEW alone proposes 4 new author patterns (P-AUTHOR-3 RPC body probe, P-AUTHOR-4 Brief-vs-DB-reality gap detection) + 2 execution patterns. These need to land in SKILL.md before the next M1 SPEC opens, or they'll be re-discovered.

**Severity.** MEDIUM — process gap; not a code/data risk.

**Recommended action.** **Perform Module 1 Lens Close Ceremony at the next strategic touch (before F-03 gap-closure SPEC opens).** Scope: read 9 FOREMAN_REVIEWs in `modules/Module 1 - Inventory Management/docs/specs/M1*` + `M1B*`, harvest 2-3 highest-ROI patterns into `opticup-architect` and `opticup-strategic` SKILL.md, update DECISIONS_LOG with module-close summary line, update MASTER_ROADMAP §2.5. 60-90 minutes Cowork session.

---

### F-09 — LOW — Sentinel-Mission-10 backlog signal: `_archive/architect-pending-entries/` discipline

**What.** `opticup-architect` SKILL.md §"Cowork File-Write Capability Map" was added 2026-05-15 by `PENDING_ENTRIES_AUTO_RESOLUTION` SPEC (visible in recent commit `13971fe`). The map describes a pending-file workflow for Cowork sessions that can't write to `.claude/skills/`. The audit found one stray test marker `.cowork-write-test` in `.claude/skills/opticup-architect/references/` (visible in git status). Not load-bearing but worth a sweep.

**Why it matters.** Hygiene; potential noise on the next session start audit. The pending-entries flow assumes a clean `_archive/architect-pending-entries/` folder.

**Severity.** LOW.

**Recommended action.** Dismiss for now. Spot-check at next Module 1 Close Ceremony.

---

### F-10 — LOW — `effective_price` has no FX conversion (Strategic Review E-01)

**What.** Strategic Review surfaced E-01: `effective_price` skips the `_convert_currency` step promised in handoff §"Critical RPCs". Returns the offering's native currency; never converts to tenant base. Israeli-only Day-1 means every offering is ILS; no observable bug.

**Why it matters.** Tenant-2 onboarding (Germany EUR, UK GBP, etc.) will hit this immediately. Pricing screen will mix ILS + EUR rows without conversion. PO totals across multi-currency lines will compute wrong.

**Severity.** LOW for Day-1 (Israel-only); HIGH for Tenant-2.

**Recommended action.** **Defer per Strategic Review Q3 recommendation** — tie closure to the tenant-2 onboarding readiness checklist. Add TECH_DEBT entry `M1-DEBT-FX-CONVERSION-FOR-TENANT-2` if not already present. Do NOT block any M1 Lens follow-up SPEC on this.

---

### F-11 — LOW — Phase 1A's H-1 (21 unindexed FK columns) still open

**What.** Code Review H-1: 21 FK columns across 11 Phase 1A tables flagged by advisor `0001_unindexed_foreign_keys`. M1B0 + Foundation + Procurement did not add the indexes. The separately-scoped `M1A_FK_INDEXES_PREP_FOR_1B` SPEC mentioned in Phase 1A Code Review §6 Q4 was never written or executed (no folder under `docs/specs/`).

**Why it matters.** Under Phase 1B's projected 60-100 stock_movements/minute, ON-DELETE-RESTRICT checks on these FKs will sequential-scan the child tables. Fine while tables are small; expensive within months.

**Severity.** LOW today (tables empty/small), MEDIUM at first production-scale use.

**Recommended action.** **Open `M1A_FK_INDEXES_PREP_FOR_1B` as a small additive SPEC** — 21 partial indexes, single migration, low risk. Can run anytime after F-03's gap-closure SPEC closes, or in parallel. Estimated SMALL (1-2 hours via Full-Auto Pipeline).

---

### Findings tally

- **CRITICAL: 1** (F-03 — bundled 3 HIGH gaps)
- **HIGH: 4** (F-01 Brief drift, F-02 orphan stub, F-04 D-M1-09 violation, F-05 D-M1-10 sub-finding)
- **MEDIUM: 3** (F-06 mockup hierarchy, F-07 no settings panel, F-08 no close ceremony)
- **LOW: 3** (F-09 pending-entries hygiene, F-10 FX deferral, F-11 FK indexes)

11 findings total. 5 of them (F-03, F-04, F-05, F-07, F-08) feed directly into §4.2 next-SPEC recommendations.

---

## 4. Strategic Path-Forward Recommendation

### 4.1 — What's the simplest viable next step?

**Apply P24 (don't add complexity — restate the goal and find the simplest model).** Daniel's actual goal at this point is **production-correct M1 Lens for Prizma**, not "more features." Phase 1B Procurement shipped 75% of that goal; the missing 25% is concentrated in three foundational gaps that all stem from RPC layer omissions, not architectural disagreement.

The simplest next move is one SPEC that closes those three gaps and nothing else. Every other candidate (contact-lenses, M7 build start, accessories, lens settings panel, M9 unblock SPEC, FX work, Module 1.5 generic receipt component) layers on top of broken procurement. Fix the foundation first.

**The smallest, lowest-risk next move:** ship `M1_LENS_PHASE_1B_GAP_CLOSURE` (F-1 + F-2 + F-3 bundled), then perform Module 1 Close Ceremony, then choose between two divergent paths (contact-lenses vs Module 1.5 generic-receipt SPEC vs M7 build start).

### 4.2 — Recommended sequence (next 2-4 SPECs)

| # | SPEC name | Purpose | What it unblocks | Estimated effort | Dependencies |
|---|---|---|---|---|---|
| 1 | **`M1_LENS_PHASE_1B_GAP_CLOSURE`** | Extend K2 to update PO state + decide & apply variant-less path + create `stock_adjustment` infrastructure + re-enable ➖ flow | Production-correctness of M1 Lens. Active POs List shows real status. Bonus/sample receipt works. ➖ button is functional. Reconciliation-Agent readiness completed. | **MEDIUM** (4-6 hrs via Full-Auto Pipeline; single chat, single Pipeline) | None — directly executable today |
| 2 | **Module 1 Lens Close Ceremony** (NOT a SPEC, an architect session) | Harvest patterns from 9 SPECs closed today; update SKILL.md + DECISIONS_LOG + MASTER_ROADMAP §2.5; mark M1 Lens Brief sealed | Next M1 phase opens with current skill state, not pre-2026-05-15 state. Closes F-08. | **SMALL** (60-90 min Cowork) | SPEC #1 closes 🟢 |
| 3 | **`M1_5_GOODS_RECEIPT_GENERIC_COMPONENT`** | Move shared receipt UX into Module 1.5; introduce `product_category` dispatcher; close D-M1-09 violation (F-04) BEFORE contact-lenses arrive and compound the divergence | Iron Rule 21 alignment + contact-lenses can extend the generic component rather than build a 3rd parallel UI | **MEDIUM** (1-2 days) | SPEC #2 close ceremony complete |
| 4 | **`M1A_FK_INDEXES_PREP_FOR_1B`** (parallel-launchable with #3) | Add 21 partial FK indexes flagged by Phase 1A Code Review H-1; pure additive | Reduces sequential-scan risk at first production-scale use | **SMALL** (1-2 hrs) | Independent — can launch immediately after #1 |

After these 4 land, the next strategic choice is:

| Choice A | Choice B | Choice C |
|---|---|---|
| **Start M1 contact-lenses phase** — natural continuation of ID-L-03 build order. Reuses every Foundation+Procurement pattern. Schema sealed at 11-table size (smaller than lens). | **Open `M1_LENS_TENANT_SETTINGS` for P33 closure** (F-07) — preempt tenant-2 onboarding blocker. | **Start M7 build** — Phase 1B Procurement explicitly unblocks M7. If Daniel's #1 strategic pain is "no orders module yet," go here. |

Recommendation: **Choice C (M7 build).** Reasoning: M1 Lens is the foundation, not the customer-visible product. Every day M7 is missing is a day staff have no way to capture custom-per-customer orders that flow through the M1 lens schema we just built. The schema is ready; the customer-facing product depends on M7 being live. Contact-lenses can wait (Prizma's frame business is the live revenue driver); accessories can wait (low-value SKUs); tenant-settings is tenant-2-onboarding scope which is months away.

### 4.3 — What NOT to do next

| Candidate next move | Why deferring is better |
|---|---|
| Start contact-lenses Phase right now | Compounds F-04's Iron Rule 21 violation (3rd parallel goods-receipt folder); also leaves 3 HIGH gaps unfixed during a parallel build. Land #1 + #3 first. |
| Refactor the 3 MAX-based sequence generators (Code Review A-4) | Working today; brittle for non-RPC callers only. No real-world bug. Phase 2 hardening. |
| Rewrite Platform Catalog Admin to brand-first hierarchy (F-06) | Day-1 supplier-first UX works under 1:1 enforcement. Restructure is owed only when ID-L-04 flips to 1:N — months away. Document and defer. |
| Build the Reconciliation Agent itself | D-M1-10 deliberately ships *schema readiness only* Day-1. The agent is Phase 2+ per Phase 1 Brief §3. F-1 must close first or the agent will see NULL fields. |
| Open SECURITY_AUDIT_PRE_2026_03_RPCS (OPEN_TASKS task 0a) on M1 RPCs | Not an M1 task — defensive sweep across pre-2026-03 RPCs. M1A_OPERATIONS_RPCS_FIX already hardened the M1 SECDEF surface. Leave OPEN_TASKS 0a for its declared scope. |
| Build a Module 1.5 generic settings panel system | Premature abstraction. Ship the lens-specific one (F-07) first; harvest the pattern *after* contact-lenses + accessories give a third data point. |
| Promote `pending_lens_advancement_queue` to a real M9 consumer | M9 not built. K3 trigger correctly enqueues; queue stays dormant by design. Phase 2+. |

---

## 5. Skill-update proposals

Three proposals harvested from this audit. Each ROI-quantified (minutes saved per future SPEC). Format mirrors existing P-AR-01..06 in `opticup-architect` SKILL.md.

### P-AR-07 (HIGH) — Audit Briefs must capture state ≤ 4 hours before the audit runs

**Pattern.** When the Architect commissions a read-only strategic audit Brief, the Brief's §2 "Context — What Daniel Already Knows" snapshot must be **dated AND re-validated against `git log` immediately before the audit executes**. If `git log` shows commits touching the audited area within the past 24 hours, the Brief must either be re-issued or the audit deliverable must explicitly call out the staleness and re-baseline.

**Evidence.** This audit's Brief (2026-05-15 morning) framed Foundation + Procurement as upcoming SPECs. Both closed before the audit ran (Procurement closed at `b808d00` only hours before). The audit had to spend cycles detecting the drift in §3 F-01 instead of doing pure synthesis. The Brief said "verify it hasn't drifted from the original sketches" for a SPEC folder that was already a superseded stub.

**Mitigation cost.** ~30 seconds: add a "Brief frozen at commit `<hash>`" line + an executor pre-check "if HEAD has advanced past `<hash>` within the audit scope, surface the delta as Finding #1." Future audits skip the F-01-class noise.

**ROI.** 15-20 minutes per stale-Brief audit. Across 2026 H2, audits run weekly → 8-10 hours/year saved + audit deliverable freshness improves.

---

### P-AR-08 (HIGH) — SPEC-folder retirement protocol: mark superseded stubs in-place, never leave dead

**Pattern.** When a SPEC folder is superseded by a split or merge (e.g., one SPEC becomes two; two SPECs collapse into one), the original SPEC folder must be marked retired in its own SPEC.md header within the same Pipeline that ships the replacement. The retired SPEC stays on disk for historical reference (per P30) but carries an explicit "STATUS: SUPERSEDED by <new-paths> (<date>)" line at the top.

**Evidence.** `M1_LENS_INVENTORY_PHASE_1B_CUSTOMER_SCREENS/SPEC.md` was authored as a STUB on 2026-05-14, then superseded same-day-next-revision by the Foundation + Procurement split. The stub remains live-looking; future cross-references can resolve to a dead path. Iron Rule 21 violation hiding in plain sight.

**Mitigation cost.** ~1 minute per supersession: add the retirement header + link forward. Belongs in the new SPEC's Pre-Authoring §0 step ("checked stale SPEC folders this work supersedes — applied retirement marker").

**ROI.** Saves the future Cowork session that lands in a dead SPEC folder + tries to understand it. Conservatively: 20-30 minutes per orphaned-stub resolution + the avoided Rule 21 audit finding cost.

---

### P-AR-09 (MEDIUM) — When ≥3 SPECs close in one day on the same Brief, schedule the Module Close Ceremony BEFORE the next SPEC opens

**Pattern.** The Module Close Ceremony has a session-start reminder (bootstrap step 4.5 in `opticup-architect` SKILL.md) but no anti-drift gate. If the Architect (or any future role) opens a new SPEC on a module where 3+ prior SPECs have closed without a ceremony, the new SPEC's §0 Pre-Flight must include a "ceremony backlog check" — if backlog detected → STOP and run ceremony first.

**Evidence.** 9 M1-Lens SPECs closed today (M1B0, Currencies, Operations RPCs Fix, Debt Sweep, Skill Improvement Harvest, Foundation, Foundation Permissions Hotfix, Procurement, and the implicit Phase 1A close on 2026-05-14). No ceremony was performed between them. Procurement FOREMAN_REVIEW alone proposes 4 new author patterns (P-AUTHOR-3, P-AUTHOR-4, and 2 execution patterns) that would have informed the next SPEC's Pre-Flight had they been promoted in real time. Skipping the ceremony lost the harvest.

**Mitigation cost.** ~30 seconds per SPEC start (Pre-Flight check); 60-90 minutes per actual ceremony when triggered. Both are bounded.

**ROI.** Each missed ceremony = ~2 patterns not promoted = ~30 minutes per future SPEC of re-discovery. Across 4-6 SPECs/month, ~2-3 hours/month recovered.

---

## 6. Open questions for Daniel

Max 5 questions in P22 format (one line of choice, one line of recommendation + one-line reason, one line of confirmation). No technical detail.

1. **האם לרכז את שלוש החולשות הקריטיות שעלו מהפרוקיורמנט לתוך SPEC אחד מאוחד, או להפריד לשלוש פעמים נפרדות?**
   ההמלצה שלי: SPEC אחד מאוחד. הסיבה: שלושת הפערים מקור אחד (RPC layer), חיבור חד-פעמי חוסך שלושה פייפליינים נפרדים ושומר על קונטקסט אחד.
   מאשר?

2. **אחרי שה-SPEC המאוחד נסגר, האם להעדיף M7 (הזמנות) או להתחיל את עדשות המגע?**
   ההמלצה שלי: M7. הסיבה: סכמת העדשות מוכנה — הצוות בחנות עדיין לא יכול לפתוח הזמנת לקוח שמשתמשת בה. עדשות מגע יכולות לחכות.
   מסכים?

3. **האם להריץ את טקס סגירת מודול 1-עדשות לפני שמתחילים SPEC חדש כלשהו?**
   ההמלצה שלי: כן. הסיבה: היום נסגרו 9 SPECs באותו מודול — בלי הטקס מאבדים את ההזדמנות לעדכן את כלי-העבודה לפני ה-SPEC הבא.
   מאשר?

4. **האם להכניס את חוסר הפאנל-הגדרות של מודול-העדשות לרשימת חסמי-Tenant-2, או לטפל בו לפני זה?**
   ההמלצה שלי: לדחות לחסמי-Tenant-2. הסיבה: פריזמה עובדת היום עם ברירות-מחדל; פתיחת חנות שנייה במדינה אחרת היא המקום שזה באמת יחסום.
   מסכים?

5. **האם להעביר את מסך קבלת-הסחורה של העדשות למודול 1.5 לפני שמתחילים עדשות-מגע, או לקבל את המסך הכפול הקיים?**
   ההמלצה שלי: להעביר. הסיבה: אם נחכה — עדשות-מגע יבנו מסך שלישי מקביל, ואז עלות האיחוד משולשת. עכשיו זה איחוד אחד; אז זה שלושה.
   מאשר?

---

*End of M1 Expansion Strategic Audit Report. Read-only audit complete; 11 findings logged, 4-SPEC sequence recommended, 5 strategic questions queued for Daniel, 3 skill-improvement proposals harvested. One commit lands on develop with this report and nothing else, per the Brief's single-commit constraint. Iron Rule 32 §Destructive Operations declared `None.` — honored across the single commit.*
