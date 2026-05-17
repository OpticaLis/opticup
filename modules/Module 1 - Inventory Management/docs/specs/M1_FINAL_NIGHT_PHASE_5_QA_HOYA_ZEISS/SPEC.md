# SPEC — M1 Final Night Phase 5: Comprehensive QA + Hoya+Zeiss Seeding

**Slug:** `M1_FINAL_NIGHT_PHASE_5_QA_HOYA_ZEISS`
**Phase of:** M1 Final Completion Continuation (Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_FINAL_COMPLETION_CONTINUATION_BRIEF.md`)
**Author + Executor:** opticup-executor (Claude Code, Cowork)
**Date:** 2026-05-17 (continuation session)
**Estimated:** 2-3h
**Predecessor:** Phase 1 + Phase 1-FIX + Phase 4 (4/5 entries) all ✅ on develop

---

## 1. Goal

Per Continuation Brief §3. Seed Hoya + Zeiss global catalog (8 NEW designs + 40 NEW variants) + demo activations + pricing + stock + 3 POs. Then run 12 functional flows via Chrome MCP with USE-style VFV (click + verify DB+UI + screenshot success). Preserve all seeded data for Daniel's morning manual verification.

## 2. Scope (IN)

- 8 new lens designs (4 Hoya + 4 Zeiss) on global with `owner_tenant_id=NULL`, `product_type='glasses'`, `is_published=true`
- 40 new lens variants (5 per design) with display_ids LV-000033..LV-000072
- 40 demo supplier_catalog_offering rows (Hoya → SHALDAG, Zeiss → Steuer suppliers)
- 40 demo tenant_active_offerings rows (all activated at Smoke Loc A)
- 40 demo pricing_overlay rows (per-variant override, ~1.7x wholesale)
- 40 demo tenant_lens_stock rows (random qty 0-15, threshold 5)
- 3 demo POs: 1 Hoya 'sent' + 1 Zeiss 'partial' + 1 Hoya 'fully_received' (with purchase_receipt + 3 stock_lots)
- 12 functional flows via Chrome MCP at 1920×1080 (real user click path, not programmatic)
- DEMO_DATA_MAP_UPDATED.md

## 4. Destructive Operations

Iron Rule 32 — REQUIRED DECLARATION. This SPEC declares:

1. **INSERTs into Global catalog** — 8 lens_design rows + 40 lens_variant rows (`owner_tenant_id=NULL`) per Continuation Brief §8 op #1
2. **INSERTs into demo tenant** — 40 supplier_catalog_offering + 40 tenant_active_offerings + 40 pricing_overlay + 40 tenant_lens_stock + 3 purchase_order + 10 purchase_order_line + 1 purchase_receipt + 3 purchase_receipt_line + 3 stock_lot rows per Continuation Brief §8 op #2
3. **Demo CRUD during 12 flows** — additional INSERTs/UPDATEs via UI clicks: 1 activation, 1 pricing entry, 1 PO creation, 2 receipts, 1 stock adjustment, 1 "QA Test Brand", 1 clone-to-private (Brief §3.2)
4. **`git tag pre-m1-continuation-2026-05-18`** already placed at last-night HEAD `2b0694f`

**Explicitly NOT authorized:**
- Any write to Prizma tenant (delta=0 verified after each commit)
- DROP of any table/column/policy/RPC/view/index
- Touching main branch
- Force-push / rebase / reset --hard
- Modification of core RPCs

## 7. Acceptance Criteria

- 12/12 flows PASS with USE-style verification (click + DB confirms + UI feedback + screenshot)
- Demo seeded data intact at session end
- DEMO_DATA_MAP_UPDATED.md exists
- Prizma row-count delta = 0 across all touched tables, verified 4 times
- Iron Rule 31 + 32 gates exit 0 on every commit
- Smoke 7/7 PASS at Phase boundary

## 12. Execution Markers (audit trail)

- **C-1 ✅** — 2026-05-17 — Migration `m1_phase5_hoya_zeiss_global_seed_v2` applied. 8 designs + 40 variants seeded (LV-000033..LV-000072). Initial attempt failed: `next_lens_variant_display_id()` RPC is role-gated against MCP service_role; switched to explicit `'LV-' || lpad(seq, 6, '0')` generation. Prizma delta = 0.
- **C-2 ✅** — 2026-05-17 — Migration `m1_phase5_demo_offerings_activations_pricing_stock_v3` applied. 40 offerings + 40 activations + 40 pricing_overlay rows + 40 tenant_lens_stock rows. Tier-1 fix loop: 2 prior failed attempts taught constraint values (`pricing_overlay_exactly_one_scope` requires `scope_variant_id` not `offering_id`; `overlay_type` must be `negotiated`/`promo`/`volume`; `stacking_rule` must be `additive`/`multiplicative`/`exclusive_max`; `status` must be `proposed`/`active`/`rejected`/`superseded`/`expired`). All transactional aborts left zero leakage (verified). Prizma delta = 0.
- **C-3 ✅** — 2026-05-17 — Migration `m1_phase5_demo_3_pos_with_receipt_v2` applied. 3 POs (PO-300003 sent / PO-300004 partial / PO-300005 fully_received) + 10 lines + 1 receipt (RCP-300003) + 3 stock_lots. Tier-1 fix: `purchase_order_line_source_variant_chk` requires `source='stock'` when `variant_id` set (not 'manual'). Prizma delta = 0.
