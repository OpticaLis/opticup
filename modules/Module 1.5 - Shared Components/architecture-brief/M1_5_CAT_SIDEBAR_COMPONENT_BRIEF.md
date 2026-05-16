# M1.5 — Category Sidebar Shared Component + Overlap Fix

**Author:** opticup-architect (Cowork, 2026-05-17 morning)
**Owning module:** Module 1.5 — Shared Components
**Type:** Component extraction + visual bug fix
**Mode:** Full Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman)
**Predecessors:**
- `M1_INVENTORY_UNIFIED_SCREEN` 🟢 + 2 hotfixes (2026-05-16)
- `M1_CONTACT_LENSES_ACCESSORIES` 🟢 night Pipeline (2026-05-17 night)
**Source:** Daniel verification of merged result revealed:
1. **Visual bug:** Top tabs strip overlaps the sidebar on contact-lenses + accessories categories (the fix from yesterday was applied via specific selectors that didn't cover the new categories' nav elements)
2. **Architectural decision (Daniel directive 2026-05-17):** the sidebar is a cross-module navigation primitive — it should live in Module 1.5 as a reusable component, not be hard-coded inside `inventory.html`. Future modules (M5 Customers, M7 Orders, M9 Lab, etc.) will reuse it.

---

## 1. Purpose

Two goals merged into one Pipeline because they share the same code path:

1. **Architectural goal:** extract the category sidebar from `inventory.html` into a reusable Module 1.5 component (`shared/js/cat-sidebar.js` + `shared/css/cat-sidebar.css`) following the existing ES Module pattern. This implements D-M1-09 UX-consistency mandate at the code level — one source of truth for the sidebar UX across all future modules.

2. **Visual goal:** replace the selector-specific overlap fix from 2026-05-16 hotfix with a generic CSS rule that protects the main content area from sidebar overlap regardless of which categorization tab strip is rendered. The bug surfaces specifically on contact-lenses + accessories where the new categories' tabs aren't covered by the existing selectors.

This Brief is **strictly UI/structural**. Same DB. Same RPCs. Same business logic. Same `v_inventory_unified_log` view. Same permissions. The change is purely: where does the sidebar code live, and how does main content respect its space.

The Pipeline takes ~2-3 hours of execution time. It is NOT a night Pipeline.

---

## 2. Scope — What This Pipeline Ships

### 2.1 Part A — Extract sidebar to Module 1.5 ES Module

**New files:**
1. `shared/js/cat-sidebar.js` — exports `initCatSidebar(config)` function
2. `shared/css/cat-sidebar.css` — all sidebar styles, dark-mode-aware, RTL-correct

**API design (initial):**
```javascript
import { initCatSidebar } from '/shared/js/cat-sidebar.js';

initCatSidebar({
  container: '#sidebar-container',         // CSS selector for mount point
  categories: [                            // primary categories (product types in M1's case)
    { id: 'frames', icon: '👓', label: 'מסגרות', active: true, permission: 'inventory.view' },
    { id: 'lenses', icon: '🔬', label: 'עדשות', permission: 'lens.inventory.view' },
    { id: 'contact_lenses', icon: '👁', label: 'עדשות מגע', permission: 'contact_lens.inventory.view' },
    { id: 'accessories', icon: '🎒', label: 'אביזרים', permission: 'accessory.inventory.view' }
  ],
  crossCategories: [                       // secondary entries (cross-cutting concerns)
    { id: 'suppliers', icon: '🚚', label: 'ספקים', permission: 'suppliers.view' },
    { id: 'invoices', icon: '📄', label: 'חשבוניות נכנסות', permission: 'invoices.view' },
    { id: 'log', icon: '📊', label: 'לוג מערכת מאוחד', permission: 'inventory.view' },
    { id: 'sync', icon: '🔁', label: 'סנכרון Access', permission: 'sync.view' }
  ],
  onSelect: (categoryId) => { /* navigation handler */ },
  defaultCategory: 'frames',
  urlParamName: 'cat'                      // query string param to sync category state
});
```

**Permission gating:** an entry is hidden if the current user lacks the listed permission. Reuses the existing `PermissionUI` infrastructure from M1.5.

**State management:** the component manages its own internal state (active category). It does NOT manage the tab strip below it (each consuming module handles its own tab rendering inside `onSelect`).

**URL synchronization:** the component reads `?cat=...` on init to set the default active category; updates the URL when the user clicks (using `history.pushState`, no page reload).

### 2.2 Part B — Refactor `inventory.html` to consume the component

The existing inline sidebar HTML + JS inside `inventory.html` is removed. Replaced with:
1. A `<div id="cat-sidebar"></div>` mount point in the inventory shell
2. An `<script type="module">` block that calls `initCatSidebar(...)` with the 4 product categories + 4 cross-categories
3. The `onSelect` handler routes to the appropriate tab strip (existing logic, just relocated)

**Behavior:** byte-identical to current behavior for the user. Sidebar looks the same, behaves the same. Only the code organization changes.

### 2.3 Part C — Generic CSS overlap protection

The current overlap fix uses selectors like `#lensNav { margin-inline-start: 240px; }` and `#low-stock-banner { ... }`. This breaks for new category tab strips (contact-lenses + accessories) whose nav elements have different IDs.

**Replacement:**

```css
.cat-sidebar-host {
  display: grid;
  grid-template-columns: 1fr var(--cat-sidebar-width, 240px);
  /* RTL flips this automatically: sidebar on right, main on left */
}

.cat-sidebar-host > .main-content {
  min-width: 0;  /* prevent overflow */
  overflow-x: auto;  /* if tab strip is too wide, scroll inside main */
}

.cat-sidebar-host > .cat-sidebar {
  position: sticky;
  top: var(--header-height, 0);
  align-self: start;
}
```

This is a structural fix — main content and sidebar are siblings in a grid container, the grid enforces the layout. No selector-specific overrides. Every tab strip inside `.main-content` automatically respects the boundary.

The existing per-element hotfix CSS rules are removed (cleanup).

### 2.4 Part D — Visual verification across all 8 sidebar entries

After refactor, the Localhost-Tester opens demo in Chrome MCP and visits each of the 8 sidebar entries:
- מסגרות / עדשות / עדשות מגע / אביזרים → 4 product categories
- ספקים / חשבוניות נכנסות / לוג מערכת מאוחד / סנכרון Access → 4 cross-category

For each: screenshot. Verify no overlap, sidebar visible on right, content respects sidebar boundary, tab strips fully readable. 8 screenshots total.

---

## 3. Out of Scope (Explicit Deferrals)

- **No Web Component upgrade.** Defer to a future SPEC if/when 5+ modules consume the sidebar. ES Module pattern is sufficient today.
- **No new sidebar entries.** Same 8 entries as today.
- **No DB / RPC / permission changes.** Only HTML/CSS/JS.
- **No upgrade of other modules to use the sidebar yet** (M5/M7/M9 etc.). Component is ready for them but consumed only by M1 in this Pipeline.
- **No mobile/responsive rework.** Desktop-only.

---

## 4. Iron Rule Compliance

- **Rule 12** (file size ≤350 lines) — split sidebar JS/CSS if needed. Single-responsibility per file.
- **Rule 21** (No Orphans, No Duplicates) — the per-element CSS overrides from yesterday's hotfix are REMOVED in this Pipeline. The fix is structural, not patchy.
- **Rule 31** (integrity gate) — exit 0 every commit.
- **Rule 32** (destructive ops) — see §6.

---

## 5. Cross-Module Impact

- **Future modules (M5/M7/M9/etc.)** — gain a ready-to-consume sidebar component. Each will pass its own `categories` config.
- **M1.5 GLOBAL_MAP** — adds `initCatSidebar` to the shared functions registry.
- **Design system** — the sidebar styles document themselves via CSS custom properties (`--cat-sidebar-width`, `--cat-sidebar-bg`, etc.) so future modules can theme without forking.

---

## 6. Destructive Operations (Iron Rule 32)

Declared:

1. **Removal of inline sidebar HTML from `inventory.html`** — replaced with mount point + import.
2. **Removal of inline sidebar JS from `inventory.html`** — replaced with `initCatSidebar` call.
3. **Removal of per-element CSS overlap rules** (the 2026-05-16 hotfix selectors like `#lensNav`, `#low-stock-banner` margin rules) — replaced with grid-based structural rule.
4. **`git tag pre-cat-sidebar-extraction-2026-05-17`** — anchor for rollback.

**NOT authorized:**
- DROP of any table, column, policy, RPC, view.
- Changes to permissions table.
- Touching main branch.
- Force-push, rebase, reset --hard outside Tier 5 emergency.
- Modifying lens nav widget (already retired in prior Pipeline).
- Touching contact-lenses / accessories JS modules — only their HTML container changes (or unchanged, depending on how the inventory shell is refactored).

---

## 7. Success Criteria

The Pipeline returns 🟢 when:

1. `shared/js/cat-sidebar.js` exists and exports `initCatSidebar(config)`.
2. `shared/css/cat-sidebar.css` exists with grid-based structural rules (no selector-specific overrides).
3. `inventory.html` uses `<div id="cat-sidebar"></div>` + `<script type="module">` import — no inline sidebar HTML or per-category positioning CSS.
4. All 8 sidebar entries render correctly in Chrome MCP on demo (4 product + 4 cross-category screenshots).
5. **No top-tab-strip overlap on any of the 4 product categories** — verified visually with screenshots. The current bug (visible on contact-lenses + accessories per Daniel's report) is gone.
6. Permission gating works: a user without `accessory.inventory.view` sees the sidebar with no "אביזרים" entry. Same for other permission keys.
7. URL sync: `inventory.html?cat=lenses` deep-links to the lens category correctly; clicking another category updates URL via `pushState`.
8. Frames flow unchanged (no regression on the most-used category).
9. Smoke 7/7 baseline PASS.
10. Iron Rule 31 integrity gate exit 0 every commit.
11. Prizma row-count delta = 0 (this Pipeline doesn't touch DB — trivial verification).
12. GLOBAL_MAP.md updated with `initCatSidebar` function entry.

---

## 8. Pre-Flight (mandatory before Commit 1)

Executor MUST run + report results in §1.5 of authored SPEC:

1. **Read current `inventory.html`** end-to-end. Identify exactly which lines contain sidebar HTML, sidebar JS, and per-element CSS overrides. Document the inline footprint precisely (line ranges + classes).
2. **Grep for all references to sidebar IDs/classes** across the codebase (in case other files include them):
   ```
   grep -rn "cat-sidebar\|sidebar-container\|#lensNav\|#low-stock-banner" --include="*.html" --include="*.css" --include="*.js" .
   ```
3. **Read `shared/js/permissions.js` (or wherever PermissionUI lives)** to confirm the API for "is permission X granted to current user."
4. **Read 2-3 existing M1.5 components** (e.g., `shared/js/modal.js`, `shared/js/toast.js`) to match their initialization + cleanup conventions.
5. **Probe current Chrome rendering** — open demo, navigate to each of the 4 product categories + 4 cross-category, capture which elements specifically overlap on which categories. Use this as the exact verification list for §7 success criterion 5.

If any probe reveals unexpected state → STOP, write finding, propose amendment.

---

## 9. Execution Flow

Full Auto Pipeline, single chat. 5-skill chain:

1. **opticup-strategic (Foreman)** — Pre-flight probes (§8), author SPEC at `modules/Module 1.5 - Shared Components/docs/specs/M1_5_CAT_SIDEBAR_COMPONENT/SPEC.md`.
2. **opticup-executor** — execute commit-by-commit. Expected ~4-6 commits:
   - C1: create `shared/js/cat-sidebar.js` + `shared/css/cat-sidebar.css`
   - C2: refactor `inventory.html` to use mount point + import
   - C3: replace per-element CSS overrides with grid-based structural rule
   - C4: cleanup + GLOBAL_MAP update
   - C5: retro
3. **opticup-reviewer** — full review against §7.
4. **opticup-localhost-tester** — runtime smoke on demo + Chrome MCP screenshots of all 8 sidebar entries.
5. **opticup-strategic (Foreman)** — FOREMAN_REVIEW + Hebrew summary.

Estimated total: 2-3 hours.

### §9.1 Autonomous Decision Authority

The Pipeline MAY decide internally:
- API signature variations (e.g., whether `categories` and `crossCategories` are separate arrays or one array with a `section` flag — pick the simpler shape).
- CSS variable naming (`--cat-sidebar-width` vs `--sidebar-width` — pick the more specific to avoid collisions).
- Whether to extract the cross-category list to a separate function or keep inline.
- Whether to leave a backward-compat shim in `inventory.html` for any external code that references the old IDs, or break cleanly (default: break cleanly — yesterday's IDs were internal-only).

### §9.2 Background processes that are LEGITIMATE
- Sentinel cron writes to GUARDIAN_ALERTS.md hourly — ignore.
- Watcher service syncs Access exports — doesn't touch git.
- Skill files modified by prior Pipelines via auto-pattern-apply — commit in Stage 0 cleanup if encountered.

### §9.3 Escalate to Daniel ONLY for:
- Destructive op outside Brief §6.
- Pre-flight reveals a fundamental design conflict (e.g., another component already at `shared/js/cat-sidebar.js` with different API).
- Iron Rule 31 integrity gate fails repeatedly.

---

## 10. Hebrew summary template

```
M1_5_CAT_SIDEBAR_COMPONENT נסגר [🟢/🟡/🔴].
הסיידבר חולץ ל-shared/js/cat-sidebar.js + shared/css/cat-sidebar.css כרכיב Module 1.5.
תיקון overlap מבני: עכשיו כל תוכן ב-main area מוגן מחפיפה עם הסיידבר.
8 כניסות הסיידבר נבדקו ויזואלית — אין חפיפה באף קטגוריה.
מודולים עתידיים (M5/M7/M9/...) יוכלו לצרוך את הרכיב ישירות.
smoke 7/7 PASS, פריזמה ללא נגיעה.
```

---

*End of Brief. Component extraction + structural overlap fix. Iron Rule 32 §Destructive Operations declared. Autonomous Decision Authority defined per §9.1. ES Module pattern; upgradeable to Web Component in future (~1-2 hours work) if 5+ modules consume the sidebar.*
