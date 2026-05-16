# M1 — Inventory Unified Screen (single-page consolidation)

**Author:** opticup-architect (Cowork, 2026-05-16 afternoon)
**Owning module:** Module 1 — Inventory Management
**Type:** Structural consolidation + RTL fix + visual unification
**Mode:** Full Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman)
**Predecessor:** `M1_INVENTORY_REDESIGN` 🟢 (merged to main earlier today)
**Source:** Daniel's hands-on verification of the live merged result revealed 3 issues:
1. Lens screens have a completely different visual design from frames
2. The sidebar appears only on `inventory.html` (frames), positioned on the LEFT — and not at all on `lens-inventory.html`
3. The sidebar should be on the RIGHT (RTL — Hebrew default) on every category

Root cause: the prior Pipeline kept two separate top-level pages (`inventory.html` + `lens-inventory.html`) and put the sidebar only on one. The sidebar became "jump-link to a different page" instead of "category switcher within one page."

This Brief consolidates them. **One inventory page. Sidebar on the right. Category click swaps the in-page content. All 7 lens screens become tab-content inside `inventory.html`. The standalone lens-*.html files are deleted.**

---

## 1. Purpose

Make the inventory module behave as a single unified hub, regardless of which product category is active. Eliminate the visual-design fragmentation between frames and lenses. Place the sidebar correctly on the right side for RTL. Reduce the surface area: instead of 8 inventory-related HTML files at repo root, there is one (`inventory.html`).

This Brief is **strictly UI/structural**. Same DB. Same RPCs. Same business logic. Same `v_inventory_unified_log` view. Same permissions. The change is purely: where does the code live, and how does the user navigate it.

---

## 2. Scope — What This Pipeline Ships

### 2.1 Part A — Sidebar repositioning + RTL fix

The sidebar currently rendered inside `inventory.html` moves from the left edge to the right edge (RTL-correct for Hebrew). Same 8 entries (4 product categories + 4 cross-category items), same icons, same styles — only the positioning changes.

CSS: replace `float: left` / `left: 0` patterns with `float: right` / `right: 0`, OR replace flex `flex-direction: row` with `flex-direction: row-reverse`, OR use `dir="rtl"` semantic ordering. Executor decides which approach minimizes diff.

### 2.2 Part B — Migrate 7 lens screens into `inventory.html` as tab-content sections

The 7 standalone HTMLs each become a `<section class="cat-tab" data-cat="lenses" data-tab="...">` inside `inventory.html`'s main area:

| Old standalone file | New in-page identifier |
|---|---|
| `lens-inventory.html` | `data-cat="lenses" data-tab="inventory"` |
| `lens-active-designs.html` | `data-cat="lenses" data-tab="active-designs"` |
| `lens-pricing.html` | `data-cat="lenses" data-tab="pricing"` |
| `lens-purchase-order.html` | `data-cat="lenses" data-tab="purchase-order"` |
| `lens-pos-list.html` | `data-cat="lenses" data-tab="pos-list"` |
| `lens-goods-receipt.html` | `data-cat="lenses" data-tab="goods-receipt"` |
| `lens-catalog-admin.html` | `data-cat="lenses" data-tab="catalog-admin"` (platform-admin-permission-gated) |

The 7 lens HTMLs are DELETED via `git rm`. Their JS modules under `modules/lens-*/` STAY — they're imported by the unified `inventory.html` to render the lens tabs' content. The split between HTML and JS is preserved; only the HTML shells collapse.

**Behavior:**
- Clicking sidebar "👓 מסגרות" → main area shows frames tabs (same as today)
- Clicking sidebar "🔬 עדשות" → main area shows lens tabs (mlai / active-designs / pricing / purchase-order / pos-list / goods-receipt / catalog-admin)
- Clicking sidebar "👁 עדשות מגע" → main area shows "בקרוב" placeholder (disabled state)
- Clicking sidebar "🎒 אביזרים" → main area shows "בקרוב" placeholder (disabled state)
- Clicking sidebar "🚚 ספקים" → main area shows suppliers (cross-category)
- Etc. for the other 3 cross-category items

URL pattern: `inventory.html?t=prizma&cat=lenses&tab=inventory` (extend the existing `?t=tenant` pattern with `&cat=` + `&tab=`). Default category = `frames`. Default tab depends on category.

### 2.3 Part C — Visual design unification

All tabs within `inventory.html`, regardless of category, share:

- Same top filter bar styling (same fonts, same spacing, same input heights)
- Same table/grid styling (same border-radius, same row spacing, same hover states)
- Same button styles (same colors, same sizes, same icons)
- Same toast/modal styles
- Same loading-spinner style
- Hebrew RTL throughout (no LTR-leaks)

The lens screens currently use a more "modern card-based" design while frames use a more compact table-row design. **The frames pattern is the canonical one** — it's been validated by daily staff use for over a year. Lens tabs are rewritten to match it.

Specifically:
- Color palette: same neutrals, same accents (the existing Hybrid+Navy `#1e3a8a` primary already used in frames)
- Typography: same font weights, same sizes
- Spacing: same vertical rhythm

The JS logic inside `modules/lens-*/` modules is preserved — only their HTML output and CSS rules change to match the frames design system.

### 2.4 Part D — Lens nav widget retirement

`shared/js/lens-nav-strip.js` (created in the Phase 2 Completion Pipeline yesterday) was designed for a world where each lens screen was a separate page. In the unified screen, the sidebar IS the nav — `lens-nav-strip` is no longer needed.

Action: delete `shared/js/lens-nav-strip.js`. Verify no lingering references via grep. The 7 lens HTMLs that used it are also deleted (Part B), so cleanup is mechanical.

### 2.5 Part E — Permission gating preserved

Each lens tab keeps its permission key:
- `lens.inventory.view` — gates the "🔬 עדשות" sidebar entry visibility
- `lens.designs.manage` — gates the "active-designs" tab
- `lens.pricing.manage` — gates the "pricing" tab
- `lens.po.view` / `lens.po.create` / `lens.po.cancel` — gate the PO tabs
- `lens.gr.create` / `lens.gr.add_manual_line` — gate the goods-receipt tab
- `lens.catalog.manage` (or whatever the existing key is) — gates "catalog-admin" tab

If a user lacks all `lens.*` keys, the sidebar entry "🔬 עדשות" is hidden entirely (already implemented in the lens-nav-strip widget — that logic moves to the sidebar). Mirror the existing frames permission pattern: tab-level gating via `data-tab-permission="..."` attributes on each `<section>`.

### 2.6 Part F — Index.html cleanup

`index.html` already had the "מחלקת עדשות" card removed in the prior Pipeline. Verify it stays removed. The home screen has 8 cards (no separate lens card). Lens reachable only through `inventory.html` sidebar.

---

## 3. Out of Scope

- **No DB changes.** The view `v_inventory_unified_log` and all underlying tables stay as-is.
- **No new RPCs.**
- **No new permission keys.**
- **No business logic changes.** The lens JS modules under `modules/lens-*/` keep their current behavior — only their HTML containers change.
- **No mobile/tablet rework.** Desktop-only.
- **No contact-lenses or accessories implementation.** Placeholders only.
- **No log unification rework.** The `v_inventory_unified_log` shipped yesterday stays.

---

## 4. Iron Rule Compliance

- **Rule 12** (file size ≤350 lines per file) — `inventory.html` may grow significantly. If it crosses 350 lines, split via partials/templates or external JS modules. Do NOT keep a single 1000-line HTML.
- **Rule 21** (No Orphans, No Duplicates) — the 7 lens HTMLs being deleted IS the rule-21 compliance for this Brief. Currently we have duplication (each lens page has its own header/footer/auth/nav setup, all duplicating `inventory.html`).
- **Rule 31** (integrity gate) — runs every commit.
- **Rule 32** (destructive ops) — see §6.

---

## 5. Cross-Module Impact

- **M2 Platform Admin** — none. Platform-admin permission for lens catalog still works (gates the catalog-admin tab inside inventory.html).
- **M4 CRM, M3 Storefront** — none.
- **Future M7 Orders** — orders will navigate to `inventory.html?cat=frames` or `inventory.html?cat=lenses` to pick products. The unified screen makes this cleaner: M7's "add product to order" can deep-link to a specific category.

---

## 6. Destructive Operations (Iron Rule 32)

Declared:

1. **`git rm` of 7 lens HTMLs:**
   - `lens-inventory.html`
   - `lens-active-designs.html`
   - `lens-pricing.html`
   - `lens-purchase-order.html`
   - `lens-pos-list.html`
   - `lens-goods-receipt.html`
   - `lens-catalog-admin.html`
2. **`git rm` of `shared/js/lens-nav-strip.js`** (no longer needed).
3. **Structural HTML rewrite of `inventory.html`** — sidebar moves to right, lens tab-content sections added, visual design unified.
4. **CSS modifications** — sidebar position, lens-tab styling alignment to frames pattern. Additive + selective replacement, no wholesale deletion.
5. **`git tag pre-inventory-unified-screen-2026-05-16`** — anchor for rollback.

**NOT authorized:**
- DROP of any table, column, policy, RPC, or view.
- Modification of `modules/lens-*/` JS module behavior (only their HTML containers reshaped).
- Changes to permissions table.
- Removal of any v_inventory_unified_log infrastructure.
- Force-push, rebase of main, main-branch modifications.
- Touching Prizma tenant data (verification on demo only).

---

## 7. Success Criteria

The SPEC is 🟢 when:

1. **One inventory page.** `inventory.html` is the only inventory-related top-level HTML. The 7 lens-*.html files no longer exist.
2. **Sidebar on the right.** Visually positioned on the right edge of the inventory main area (RTL-correct).
3. **Sidebar identical on every category.** Click "מסגרות" or "עדשות" or "ספקים" — sidebar stays put on the right.
4. **Lens tabs identical-looking to frames tabs.** Same fonts, same colors, same spacing, same button styles, same table styles. Side-by-side screenshot comparison shows them as one design system.
5. **URL pattern works.** `inventory.html?cat=lenses&tab=pricing` deep-links to the lens-pricing content. Bookmark-friendly.
6. **Permission gating preserved.** A user without `lens.*` permissions sees the sidebar without the "עדשות" entry. A user without `lens.catalog.manage` sees lens tabs without "catalog-admin."
7. **No broken links.** Grep for `lens-*.html` returns zero results in `js/`, `shared/`, `modules/`, other HTML files. Any old reference is updated to the new query-param form.
8. **Frames flow unchanged.** Existing frames staff workflow (add inventory, view stock, etc.) behaves exactly as before. No regressions in frames-side smokes.
9. **Lens flow preserved.** All 7 lens functional behaviors still work end-to-end on demo (inventory list, designs selection, pricing edit, PO create, PO list, goods receipt, catalog admin).
10. **Smoke 7/7 baseline PASS.**
11. **Iron Rule 31 integrity gate exit 0 every commit.**
12. **Prizma untouched** (row-count delta = 0).
13. **Chrome visual smoke:** screenshots of (a) frames category active, (b) lens category active, (c) suppliers category active, (d) unified log active. All four must look like the same screen with different content — same chrome, same sidebar, same fonts, same spacing.
14. **File count:** before this Pipeline = 8 inventory HTMLs (inventory + 7 lens-*). After = 1 (inventory.html). Verify via `ls *.html | grep -c -E '^(lens-|inventory\.html)'`.

---

## 8. Pre-Flight (mandatory before Commit 1)

Executor MUST run these probes before any edit:

1. **Read `inventory.html`** end-to-end (current state after yesterday's redesign Pipeline) to understand current sidebar structure + how frames tabs render in the main area.
2. **Read each of the 7 lens-*.html files** end-to-end to identify:
   - Which JS modules they import (`<script src="modules/lens-*/...">`)
   - Which CSS files they include
   - Which permission keys they check
   - Any unique markup that needs preservation in the migrated tab-section
3. **Grep all references to lens-*.html** across the entire codebase:
   ```
   grep -rn "lens-[a-z-]*\.html" --include="*.html" --include="*.js" --include="*.ts" --include="*.astro" .
   ```
   List every match. Each must be either updated to the new `inventory.html?cat=lenses&tab=...` form OR confirmed as safe to leave (e.g., in an archived spec doc).
4. **Read `shared/js/lens-nav-strip.js`** to confirm what it does — verify its functionality is fully absorbed by the sidebar before deletion.
5. **Inspect the current visual gap between frames and lens screens** by loading each screen on demo locally and noting concrete differences (button styles, spacing, fonts, colors). Document these in SPEC §1.5 as "Visual Reconciliation Audit" — the executor uses this list as a checklist when implementing Part C.

If any probe reveals a divergence from this Brief's assumptions → STOP, write a finding, propose amendment.

---

## 9. Execution Flow

Full Auto Pipeline, single chat. 5-skill chain:

1. **opticup-strategic (Foreman)** — author SPEC at `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` after §8 pre-flight probes.
2. **opticup-executor** — execute commit-by-commit on develop. Expected ~6-9 commits: sidebar reposition, lens tab migration (Parts B+C combined per logical grouping), nav-strip retirement, link grep + updates, retro.
3. **opticup-reviewer** — full review against §7 success criteria.
4. **opticup-localhost-tester** — runtime smoke on demo + Chrome visual on the 4 categories. Comparison screenshots to verify design unification.
5. **opticup-strategic (Foreman)** — FOREMAN_REVIEW + Hebrew summary.

Estimated Pipeline duration: 4-6 hours.

### §9.1 — Autonomous Decision Authority

The Pipeline may take the following decisions internally without escalating to Daniel:

- Implementation choice for sidebar RTL fix (flex-direction vs float vs dir attribute — pick the smallest diff).
- Whether to merge Parts B+C+D into combined commits or split them.
- Concrete CSS values for design unification — copy from the frames-side rules verbatim where possible; introduce new values only when frames doesn't have a precedent.
- Whether to keep `shared/js/lens-nav-strip.js` (if it has functionality not yet absorbed) OR delete (if absorbed) — make the call based on Part B's grep findings.
- URL parameter naming (`cat` vs `category`, `tab` vs `screen`) — pick the shortest readable form, document in SPEC §3.
- Whether to preserve old lens-*.html URLs as thin redirects (NO — per Brief §2.2 Daniel decision A: delete cleanly).

Escalate to Daniel ONLY for:
- A destructive op outside Brief §6.
- Cross-module unintended impact (e.g., M4 CRM uses one of these HTMLs in a way not caught by pre-flight grep).
- Iron Rule 31 integrity gate fails repeatedly.
- Demo tenant becomes unusable mid-Pipeline.
- Pre-flight reveals fundamental scope mismatch.

### §9.2 — Background processes that are LEGITIMATE and should NOT trigger halt

- **Sentinel cron** writes to `docs/guardian/GUARDIAN_ALERTS.md` hourly. Not a race risk. Ignore.
- **Watcher service** (`opticupsyncwatcher`) syncs Access exports to Supabase. Does NOT touch git. Ignore.
- **Cowork (Architect) chat** may write to `_archive/architect-pending-entries/` between commits. Not a race risk — pending entries are consumed by next Architect session, not this Pipeline.
- **Existing untracked files at chat start** (e.g., `.claude/skills/opticup-architect/SKILL.md`, P42 pending entry) are NOT this Pipeline's responsibility. Leave them. Do not include in commits.

### §9.3 — Pre-flight Safety Gates

1. `git status --porcelain` — note current untracked/modified items. Distinguish "expected leftovers" (see §9.2) from "unexpected new state."
2. `npm run verify:integrity` exit 0.
3. `npm run smoke` baseline 7/7 PASS BEFORE any edit.
4. `git tag pre-inventory-unified-screen-2026-05-16` and push tag.
5. Concurrency check: `Get-Process claude -ErrorAction SilentlyContinue | Select-Object Id, StartTime` — confirm count of concurrent CLI sessions. If 2+ active CLI sessions outside of Desktop spawns, write escalation + halt.

---

## 10. Hebrew status template

```
M1_INVENTORY_UNIFIED_SCREEN נסגר [🟢/🟡/🔴].
מסך מלאי מאוחד: עמוד אחד, סייד-בר מימין, 4 קטגוריות + 4 חוצה-קטגוריות.
7 דפי lens-*.html נמחקו והפכו לטאבים בתוך inventory.html.
עיצוב אחיד: עדשות זהה למסגרות.
smoke 7/7 PASS, פריזמה ללא נגיעה.
```

---

*End of Brief. Structural consolidation + RTL fix + visual unification. Iron Rule 32 §Destructive Operations declared. Autonomous Decision Authority defined per §9.1. Legitimate background processes documented per §9.2 — Pipeline should NOT halt on these.*
