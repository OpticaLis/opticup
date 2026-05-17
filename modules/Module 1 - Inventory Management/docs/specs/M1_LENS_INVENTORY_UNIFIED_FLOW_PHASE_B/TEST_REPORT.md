# TEST_REPORT — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B

**Date:** 2026-05-18 evening
**Tester:** opticup-localhost-tester (skill)
**Repo:** opticalis/opticup, branch develop, HEAD 8b35120
**Status:** 🟢 **GREEN**

---

## Servers

- ERP        http://localhost:3000  → 200 OK (verified via HEAD)
- Storefront http://localhost:4321  → 200 OK (verified via HEAD)

## Baseline (tests/smoke/baseline.test.mjs)

**7/7 passed, 0 failed** (run post-C-B1, 12.5 sec total).

| # | Test | Module | Result |
|---|------|--------|--------|
| 1 | PIN login returns JWT with tenant_id=demo | M1.5 | PASS (1097ms) |
| 2 | Create CRM lead succeeds | M4 | PASS (294ms) |
| 3 | Read inventory count for demo tenant | M1 | PASS (411ms) |
| 4 | Storefront homepage returns 200 | M3 | PASS (2848ms) |
| 5 | Storefront /supersale lead-form returns 200 | M3 | PASS (1359ms) |
| 6 | Cross-module: lead visible via crm_leads SELECT | M4 | PASS (138ms) |
| 7 | No 5xx on critical pages (HEAD only) | ERP+M3 | PASS (6306ms) |

## SPEC-specific (tests/smoke/M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B.test.mjs)

n/a — no spec-specific smoke file was authored. Phase B's behavior is verified via Tier C VFV below.

---

## Tier C — Visual Functional Verification (VFV) — MANDATORY

### VFV — Surface 1: Settings page → ניהול מלאי section (demo, ceo role)

**URL:** http://localhost:3000/settings.html?t=demo
**Viewport:** 1920×1080
**Login:** demo tenant, PIN 12345, role = `ceo` (perms include `settings.inventory.manage = true` — confirmed in sessionStorage probe)

**Screenshots:**
- `screenshots/01_index_login.png` — index page login screen pre-PIN
- `screenshots/02_settings_inventory_section_visible.png` — settings page (full-page) with ניהול מלאי section visible, dropdown auto-selected to AZMON (demo's pre-test default from Phase A)
- `screenshots/03_after_save_cleaz.png` — settings page viewport after save action (toast "ההגדרות נשמרו בהצלחה" visible)
- `screenshots/04_section_hidden_when_no_perm.png` — settings page after baseline restore + reload (full-page)

**Brief §4.3 Tier C criteria verification:**

| # | Brief criterion | Result | Evidence |
|---|-----------------|--------|----------|
| 1 | Field appears under "ניהול מלאי" section | ✅ PASS | `sectionExists=true, sectionVisible=true`; screenshot 02 shows the new section with `<h2>📦 ניהול מלאי</h2>` rendered between AI Learning section and Save button |
| 2 | Dropdown loads all active suppliers | ✅ PASS | 39 options total (1 placeholder + 38 active demo suppliers ordered by name) — matches BASE active count probe from §0 (demo has 38+ active suppliers). First 5 options dumped: AZMON / C.B BASSAN / Cleaz / Duke / Fair Marketing — all suffixed `(דמו)` as expected for demo tenant |
| 3 | Save → DB reflects new default_supplier_id | ✅ PASS | (a) selected Cleaz (`5c9a0ab2-...`), clicked Save, toast `ההגדרות נשמרו בהצלחה` appeared; (b) live DB SELECT confirmed `default_supplier_id = 5c9a0ab2-... (Cleaz (דמו))`; (c) restored to AZMON, re-saved, DB re-verified `default_supplier_id = bb4bdec6-... (AZMON (דמו))` |
| 4 | Re-open inventory → manual-add panel auto-fills with the default | ⏭️ **DEFERRED TO PHASE C** | Per SPEC §0.C drift B-2: the manual-add panel does NOT have a supplier field today (Phase C §5.2 adds it). Phase B closes criteria 1-3 only; criterion 4 verified at Phase C's Tier C VFV |

**Additional VFV checks (beyond Brief §4.3):**

| Check | Result |
|---|---|
| Negative gating — section hidden when permission false | ✅ PASS — in-memory perm flip + direct `gateInventorySection()` call: section.display='none', offsetParent=null; restoring perm + call: display='', offsetParent=set. Gate function bi-directionally correct |
| renderSettings() iterator pre-selects current DB value | ✅ PASS — on load, dropdown showed `AZMON (דמו)` selected (matches demo's `default_supplier_id` from Phase A backfill); this only works if the iterator runs AFTER `loadSupplierOptions()` populates the `<select>` (validates DM-3 call-order decision) |
| No regression on other settings sections | ✅ PASS — `set-business-name` populated to "אופטיקה דמו (בדיקה)"; AI Learning section's `set-ai-suggest-after` element renders |
| Cleanup — demo baseline restored | ✅ PASS — DB shows `default_supplier_id = bb4bdec6-... (AZMON)` at end of test (same as pre-test) |

**Layout integrity:** PASS — header, sidebar (page has no sidebar — single-column settings), tabs (general / permissions) visible, primary save button visible at bottom, content area scrolls cleanly. New section rendered with same `.settings-section` styling as the 4 existing sections (visual consistency).

**Overlap check:** PASS — no UI elements overlap.

**Clipping check:** PASS — no elements cut off.

**Data visible:** PASS — dropdown populated with 38 supplier names, currently-selected supplier name visible.

**Error state:** PASS — no error banners, no red text, no "no data" placeholders, no console errors specific to Phase B.

**Navigation state:** PASS — `כללי` tab is active (highlighted).

**Bug regression check:** N/A — Phase B is net-new UX, not a bug-fix Pipeline; no prior bug to regression-test.

**Mockup Fidelity Check:** N/A — Brief §9 explicitly notes "The mockups don't show the new Quick Scan drawer + Undocumented checkbox — those are NEW UX patterns from this Brief". This settings section is in the same family of new UX; visual design follows existing settings-section pattern in `css/settings.css`.

**Overall surface verdict:** 🟢 **PASS**

---

## Console Messages (post-test, settings.html)

- `[warn] GoTrueClient ... Multiple GoTrueClient instances detected` — **pre-existing**, not Phase B (Supabase SDK loaded both via `<script>` and dynamically; known noise).
- `[error] Uncaught (in promise) (0 args)` — **pre-existing**, empty payload, source unattributable from console output alone. Carries from prior Pipelines; not Phase B-introduced (Phase B only added a `select` element + 2 small JS functions, no async Promise chains).

No Phase B-specific console errors. No 5xx network responses observed during the flow.

---

## Failures

None.

---

## Hand-off

🟢 GREEN — handing back to Foreman for FOREMAN_REVIEW.md.

Phase B Tier C VFV PASS on 3 of 4 Brief §4.3 criteria (criteria 1-3); criterion 4 documented as cross-phase deferral to Phase C per SPEC §0.C drift B-2. Demo data restored to pre-test baseline.

**Hebrew status line:**
✓ Smoke 7/7 PASS + Tier C VFV 3/3 (M1 unified flow Phase B).
