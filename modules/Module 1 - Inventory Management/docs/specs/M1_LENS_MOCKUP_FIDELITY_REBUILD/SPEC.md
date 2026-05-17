# SPEC — M1_LENS_MOCKUP_FIDELITY_REBUILD

**Type:** UI rebuild to match 7 user-approved mockups + apply P-AR-16 skill rule
**Module:** Module 1 — Inventory Management
**Authored:** 2026-05-18 (Executor-derived from Brief)
**Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_REBUILD_BRIEF.md`
**Pipeline mode:** Full Auto Pipeline (Foreman→Executor→Reviewer→Tester)
**Safety tag:** `pre-m1-lens-mockup-fidelity-2026-05-18` (placed pre-flight)

---

## 1. Goal

Rebuild the 7 lens screens + apply P-AR-16 (Mockup Fidelity Mandate) to skill files. The 5 ratified mockups (D-M1-02..D-M1-14) are the canonical visual spec; current live UI has ~124 gaps (9 CRITICAL + 27 HIGH + 60 MEDIUM + 28 LOW per 2026-05-18 audit).

---

## 2. Mandatory Read List (P-AR-16 inputs — completed during pre-flight)

| # | Mockup | Path | Status |
|---|--------|------|--------|
| 1 | Lens Inventory | `architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (1117 lines) | ✅ read |
| 2 | Active Designs | `architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html` (699) | ✅ read |
| 3 | Catalog & Pricing | `architecture-brief/mockups/LENS_PRICING_MOCKUP.html` (472) | ✅ read |
| 4 | Purchase Order | `architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html` (387) | ✅ read |
| 5 | Goods Receipt v3 | `architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html` (635) | ✅ read |
| 6 | Platform Catalog Admin | `architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (671) | ✅ read |
| 7 | Active POs List | `architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html` (509) | ✅ read |

Theme inventory after reading:
- **Gold primary (#c9a555):** Inventory, Pricing, Purchase Order, Designs Selection
- **Navy primary (#1e3a8a):** Goods Receipt, Active POs List
- **Dark theme (#0f172a / #1e293b):** Platform Catalog Admin
- **Light theme (private catalog):** Daniel's 2026-05-18 decision — inherits admin structure, light bg

---

## 3. Phased Structure (Brief §3 priority order)

| Phase | Surface | Priority | Session 1 plan |
|-------|---------|----------|----------------|
| A | Lens Inventory | CRITICAL | **Execute this session** — focused rebuild (header, filters, variant selector, grid+side panel structure, bottom-tabs shell). Modal full-fidelity → next session. |
| B | Catalog Admin (dark) + Private Catalog (light) | CRITICAL | Deferred to next session — 2-screen scope, 4-column drill-down rebuild |
| C | Purchase Order | CRITICAL | Deferred |
| D | Goods Receipt | HIGH | Deferred |
| E | Pricing | HIGH | Deferred |
| F | Active Designs Selection | HIGH | Deferred |
| G | Active POs List | MEDIUM | Deferred |
| H | Apply skill updates (P-AR-16 + Tier C Mockup Fidelity Check + M1 decisions log) | — | **Execute this session** — deterministic 4-file apply + delete pending entry |

**Time-budget rationale (Brief §3):** 12-18 hour estimate vs 4-hour soft cap. Honest scope: Phase A focused + Phase H + close. Phases B–G dispatched as separate sessions.

---

## 4. Destructive Operations

Per Iron Rule 32 — declared:
1. Rewrite `modules/lens-inventory/lens-inventory-partial.html` (40 lines → ~250 lines per mockup §1-5)
2. Append/modify `css/lens-tabs.css` — add `.lens-inventory` gold-theme overrides
3. Optional extend `modules/lens-inventory/lens-inventory-grid.js` (add target/status classification) — Phase A scope-permitting
4. Apply 4 skill updates from `_archive/architect-pending-entries/2026-05-18_mockup_fidelity_mandate.md` (Phase H)
5. `git rm` the consumed pending entry at Phase H end
6. `git tag` × N — pre-Phase A tag was placed in pre-flight

**NOT authorized:** any DB write, RPC change, permission key, modifying mockup files (they ARE the spec), Prizma writes, main branch touches.

---

## 5. Success Criteria

🟢 Phase A close gates:
- Side-by-side visual comparison shows ≤ 0 CRITICAL drift + ≤ 0 HIGH drift items on the rebuilt surface elements (header bar / filter rows / variant selector / grid container / side panel / bottom tab shell)
- Deferred elements (Reports modal, Scan IN/OUT modals, Bulk Wizard modal, full side-panel cell-info gradient card) classified as **INTENTIONAL DEFERRAL** → next-session SPEC, not DRIFT
- Functional VFV: page loads on http://localhost:3000/inventory.html?cat=lenses&tab=inventory&t=demo, no console errors
- Demo data preserved (Hoya + Zeiss + private brand seeded rows still visible)
- Integrity gate exit 0
- Prizma delta = 0

🟡 Acceptable if Phase A closes with material visual fidelity but Chrome MCP side-by-side screenshot capture is deferred (will be done by next session's Tester step using same procedure documented in opticup-localhost-tester SKILL.md once §3 is applied via Phase H).

🟢 Phase H close gates:
- 4 skill-file edits applied (architect, strategic, localhost-tester SKILLs + decisions/M1.md)
- Pending entry file deleted via `git rm`
- grep verification each edit landed
- Commit: `chore(skills): apply P-AR-16 Mockup Fidelity Mandate to 3 skill files + M1 decisions log`

🔴 Hard fails:
- Prizma data touched
- Iron Rule 31 integrity gate fails
- Pre-existing demo data lost
- Phase A regresses functional behavior (filter cascade, ➕➖ buttons, PIN flow, lot drill-down)

---

## 6. Out of Scope (deferred to follow-up SPECs)

- Phases B-G code rebuilds (each will be its own SPEC)
- Phase A modal full-fidelity rebuild (Reports/Scan/Bulk Wizard modals — current `lens-inventory-modals.js` PIN-gated stock-adjust modal preserved)
- Tier C Chrome MCP fidelity check on rebuilt screens — this Pipeline establishes the infra via Phase H skill update; first formal fidelity check runs in Phase A continuation session
- Full audit report regeneration via Explore agent (current SPEC inherits the 2026-05-18 morning audit findings cited in Brief §1)

---

## 7. Commit Plan

| # | Commit message | Scope |
|---|----------------|-------|
| 1 | `chore(spec): seed M1_LENS_MOCKUP_FIDELITY_REBUILD SPEC.md` | This file |
| 2 | `feat(m1-lens-inventory): Phase A — mockup-fidelity rebuild of partial structure + gold theme overrides` | Phase A code changes |
| 3 | `chore(skills): apply P-AR-16 Mockup Fidelity Mandate to 3 skill files + M1 decisions log` | Phase H |
| 4 | `chore(spec): close M1_LENS_MOCKUP_FIDELITY_REBUILD session 1 with EXECUTION_REPORT + FINDINGS` | Reports |

---

*End of SPEC.md. Authoritative plan derived from architect Brief 2026-05-18 morning.*
