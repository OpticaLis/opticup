# ACTIVATION_PROMPT — M1_LENS_CATALOG_ADMIN_REBUILD

**For:** opticup-executor, Path X sequential. **Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_ADMIN_REBUILD/SPEC.md`

## Pre-flight (in SPEC §0)

- 671-line dark-themed mockup
- Phase 0 shared components available; per-component MOCKUP CITATION + GLOBAL NAME probes required at Executor §0 (P-STRAT-A + P-EXEC-B)
- Platform-admin Google OAuth flow preserved (out-of-scope to refactor)
- Zero JS-side cross-module callers

## Bounded Autonomy

- §3: 17 measurable criteria
- §4 declares None (Iron Rule 9 backup mandatory)
- §5 broad: end-to-end execution

## Execution sequence

1. Claim pipeline lock per SPEC §11
2. Iron Rule 9 backup (> 5 files affected)
3. Read 671-line mockup + 7 current JS files
4. Verify per-component global names + mockup citations (P-EXEC-B)
5. Rewrite each JS file with dark theme + 4-column layout
6. NEW `css/lens-catalog-admin-page.css` scoped to `[data-tab="catalog-admin"]`
7. Update manifest + inventory.html if file count changes
8. Tier C per §8 — 11 steps including platform-admin gate handling
9. Write EXECUTION_REPORT + FINDINGS
10. 3-4 commits per §10, push to develop

## Stop-on-deviation

- New shared component not in Phase 0 → STOP
- DB write expected from this screen → STOP (catalog mutations belong elsewhere)
- `catalog-auth.js` requires substantive change → STOP
- File size > 350 → STOP
- Iron Rule 32 fires (this SPEC declares None.) → STOP

## Constraints

- All Iron Rules enforced.
- Tier C VFV mandatory (≥ 3 screenshots).
- No Prizma writes — demo only.
- After SPEC 9 closes 🟢, the session moves to SPEC 10 (Private Catalog).

---

**END ACTIVATION_PROMPT**
