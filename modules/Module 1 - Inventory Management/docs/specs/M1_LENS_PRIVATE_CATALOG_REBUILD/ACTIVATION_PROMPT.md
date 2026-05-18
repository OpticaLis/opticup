# ACTIVATION_PROMPT — M1_LENS_PRIVATE_CATALOG_REBUILD

**For:** opticup-executor, Path X sequential. Runs AFTER SPEC 9 closes 🟢.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PRIVATE_CATALOG_REBUILD/SPEC.md`

## Pre-flight (in SPEC §0)

- 339-line shared component `shared/js/catalog-private-admin.js` already cross-category (3 product types)
- API contract: `window.CatalogPrivateAdmin.init({ mountEl, productType, sb, getTenantId, hasPermission })`
- No dedicated mockup; derive LIGHT theme variant of SPEC 9's mockup
- 3 cross-category consumers (lens / contact_lens / accessory inventory shells)

## Bounded Autonomy

- §3: 18 measurable criteria
- §4 declares None
- §5 broad: end-to-end, polish-not-rebuild

## Execution sequence

1. Claim pipeline lock per SPEC §11
2. Read 339-line shared component + 671-line SPEC 9 mockup (for visual DNA)
3. Iron Rule 9 backup if > 100 lines refactored
4. Polish JS in place (preserve `.init()` API)
5. (Optional) Add `shared/css/catalog-private-admin.css` + CSS link in inventory.html
6. Tier C per §8 — 12 steps including cross-category regression on contact_lens + accessory
7. Write EXECUTION_REPORT + FINDINGS
8. 3 commits per §10, push

## Stop-on-deviation

- API signature change required → STOP (3 sibling consumers would break)
- Iron Rule 12 hard cap (350) approached → split into helper file
- Cross-category Tier C regression → STOP

## Constraints

- Tier C VFV mandatory (≥ 3 screenshots — one per product type)
- No Prizma writes
- Path X sequential — after this SPEC closes 🟢, the session moves to SPEC 12 (Toggle Semantics)

---

**END ACTIVATION_PROMPT**
