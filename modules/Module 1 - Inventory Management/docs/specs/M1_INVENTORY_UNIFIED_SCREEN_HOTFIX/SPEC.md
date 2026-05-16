# SPEC — M1_INVENTORY_UNIFIED_SCREEN_HOTFIX

> **Author:** opticup-strategic (Foreman, hotfix authoring), 2026-05-16 afternoon
> **Predecessor:** `M1_INVENTORY_UNIFIED_SCREEN` 🟢 (closed `7e84aed`)
> **Trigger:** Daniel post-merge visual regression report — sidebar overlaps tabs strip (lens category) + low-stock banner (both categories).

---

## 1. Goal

Restore correct horizontal layout under the unified screen's right-side sidebar:
- `#lensNav` (lens tabs strip) must not underlap `#inv-sidebar`.
- `#low-stock-banner` must not underlap `#inv-sidebar`.

Pure CSS/HTML cascade fix. No DB, no JS logic, no permissions, no contract changes.

---

## 2. Root-Cause Analysis (Chrome MCP, post-merge demo tenant, viewport=929px)

| Element | Position | Should be | Cause |
|---|---|---|---|
| `#inv-sidebar` | left=689, right=929, width=240 | ✓ correct | n/a |
| `#mainNav` (frames) | left=0, right=689, margin-inline-start=240px | ✓ correct | CSS rule applies |
| `#lensNav` (lenses) | left=16, right=913, margin-inline-start=16px | left=0, right=689 | **inventory-shell.css selector list missing `#lensNav`**. lens-tabs.css `#lensNav { margin: 8px 16px }` provides the 16px inline margin; no sidebar-aware override exists. |
| `#low-stock-banner` | left=16, right=913, margin-inline-start=16px | left=0, right=689 | **Inline style `margin:8px 16px` on the HTML element** overrides the CSS rule `body.has-inv-sidebar > #low-stock-banner { margin-inline-start: 240px }` because inline style specificity beats stylesheet specificity. |

Two distinct cascade bugs. Symptom is the same (element overlaps sidebar) but mechanism differs.

---

## 3. Success Criteria

| # | Criterion | Verify |
|---|---|---|
| H1 | `#lensNav` right edge ≤ `bodyWidth - 240` when sidebar present (lens category) | Chrome MCP measure |
| H2 | `#lensNav` `margin-inline-start` computes to `240px` (sidebar visible at ≥800px) | Chrome MCP `getComputedStyle` |
| H3 | `#low-stock-banner` right edge ≤ `bodyWidth - 240` when sidebar present (both categories) | Chrome MCP measure (force banner visible via script) |
| H4 | `#low-stock-banner` `margin-inline-start` computes to `240px` | Chrome MCP `getComputedStyle` |
| H5 | At <800px viewport (mobile), `#lensNav` and `#low-stock-banner` margin-inline-start = 0 (sidebar becomes top strip) | Chrome MCP devtools emulation OR static CSS rule audit |
| H6 | Smoke 7/7 PASS | `npm run smoke` |
| H7 | Iron Rule 31 + 32 exit 0 | pre-commit hook |
| H8 | No console errors after fix | Chrome MCP console probe |

---

## 4. Destructive Operations

**None.** This is a pure CSS/HTML additive edit:
- Add `#lensNav` to existing selector lists in `css/inventory-shell.css` (additive).
- Add base `#low-stock-banner` margin rules in `css/inventory-shell.css` (additive).
- Edit inline `style="..."` of the banner element in `inventory.html` to remove the `margin:8px 16px;` declaration only (other inline rules retained — background, border-radius, padding, cursor, align-items, gap, display).

No `git rm`, no DROP, no DELETE, no force-push.

---

## 5. Out of Scope

- Refactoring the sidebar width from 240px constant to a CSS variable (deferred to future style-system SPEC).
- Reorganizing inline `style="..."` on `#low-stock-banner` beyond removing the margin declaration.
- Any other inline-style overrides scattered across `inventory.html` (~50+ inline styles total; out of scope).
- The 4 TECH_DEBT items already logged from the parent Pipeline (bootstrap promise rejection, toast consolidation, lens PO print, URL history sync) — those remain queued for next M1 maintenance SPEC.

---

## 6. Expected Final State

After 1 commit:
- `css/inventory-shell.css`:
  - Existing rule `body.has-inv-sidebar > main, > #mainNav, > #low-stock-banner { margin-inline-start: 240px }` gains `#lensNav`.
  - New rule for base `#low-stock-banner` margin-block + margin-inline-end (replacing what the inline style provided).
  - Existing mobile `@media (max-width: 800px)` rule gains `#lensNav` in its selector list.
- `inventory.html`:
  - `<div id="low-stock-banner" style="...margin:8px 16px; ...">` becomes `<div id="low-stock-banner" style="..."` (margin declaration removed; rest preserved).

Smoke 7/7 PASS. Chrome MCP visual confirms both elements clear the sidebar.

---

## 7. Commit Plan

**Single commit:** `fix(m1): lensNav + low-stock-banner respect sidebar margin`.

This is a hotfix — no SPEC seal commit needed (this SPEC.md lives in its folder; it commits alongside the fix).

---

## 8. Autonomy Envelope

Executor authorized for:
- Add `#lensNav` to the 2 existing selector lists in inventory-shell.css.
- Add base `#low-stock-banner` margin rules to inventory-shell.css.
- Remove `margin:8px 16px;` from the inline style of the banner element in inventory.html.

Escalate ONLY for:
- Smoke degrades from 7/7 to <7/7.
- Iron Rule 31 / 32 gate fails.
- The fix introduces NEW console errors.
- Chrome MCP post-fix still shows overlap (root-cause hypothesis wrong → re-investigate).

---

## 9. Rollback

Single-commit revert: `git revert <hotfix-commit>`. No DB rollback needed (no DB changes).

---

*End of hotfix SPEC. Pure CSS/HTML cascade fix. Iron Rule 32 destructive ops: None. Single commit expected.*
