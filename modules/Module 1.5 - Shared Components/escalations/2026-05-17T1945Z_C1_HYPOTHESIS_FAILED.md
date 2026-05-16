# Escalation — M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2 C1 hypothesis FAILED

**Date:** 2026-05-17 19:45 local
**Source:** opticup-localhost-tester (STEP 4 VFV re-run)
**Severity:** STOP-on-deviation per SPEC §5 trigger #2 ("the fix is applied but VFV STILL shows overlap on ≥1 surface → escalate to Foreman; this would invalidate the root-cause hypothesis; investigate further")

## What happened

C1 (commit `04094ff`) swapped `grid-template-columns` from `1fr var(--cat-sidebar-width, 240px)` to `var(--cat-sidebar-width, 240px) 1fr` per the SPEC's hypothesis. Tester re-ran Tier C VFV across all 8 sidebar surfaces post-fix. **The fix made the bug WORSE — not better.**

## DOM probe evidence (post-fix, all 8 surfaces)

| # | Surface | sidebarLeft | mainContent rect | Active element rect | Outcome |
|---|---|---|---|---|---|
| 1 | frames | 1680 | left=1680 right=1920 width=**240** | mainNav: left=1680 right=1920 | 🔴 mainContent is 240px wide, ENTIRELY under sidebar (was 1680px wide pre-fix; overlapped 240px) |
| 2 | lenses | 1665 | left=1665 right=1905 width=**240** | (probed via setActive) | 🔴 same |
| 3 | contact-lenses | 1665 | left=1665 right=1905 width=**240** | contactNav: left=1665 right=1905 | 🔴 same |
| 4 | accessories | 1665 | width=**240** (visual screenshot confirms) | accessoryNav | 🔴 same |
| 5 | suppliers | 1665 | left=1665 right=1905 width=**240** | section: left=1685 right=1885 | 🔴 same |
| 6 | incoming-invoices | 1680 | left=1680 right=1920 width=**240** | section | 🔴 same |
| 7 | unified-log | 1665 | left=1665 right=1905 width=**240** | section | 🔴 same |
| 8 | access-sync | 1680 | left=1680 right=1920 width=**240** | section | 🔴 same |

Pre-fix: `.main-content` was 1680px wide, occupying the RIGHT side from x=240 to x=1920 (rightmost ~240px hidden under sidebar). Post-fix: `.main-content` is 240px wide, ENTIRELY at the RIGHT side from x=1665-1680 to x=1905-1920 (ENTIRELY under sidebar). **The fix narrowed main-content to 240px instead of moving it to the left.**

Screenshots: `_archive/cat-sidebar-overlap-hotfix-2-2026-05-17/screenshots/post-fix-01-frames.png`, `post-fix-03-contact-lenses.png`, `post-fix-04-accessories.png`.

## Why the hypothesis was wrong

The SPEC's hypothesis: swap `grid-template-columns` so the sidebar slot matches the side of the fixed sidebar in RTL. Theoretically correct — but missed that grid children are placed in DOM order, not config order.

Actual DOM structure of `.cat-sidebar-host`:
```html
<div class="cat-sidebar-host">
  <div class="main-content">         <!-- 1st child → grid column 1 -->
    ...banner, navs, main...
  </div>
  <div id="cat-sidebar-mount">       <!-- 2nd child → grid column 2 -->
    ...sidebar rendered here...
  </div>
</div>
```

With `grid-template-columns: var(--cat-sidebar-width, 240px) 1fr` (sidebar-slot-width-first):
- Grid column 1 = 240px wide → in RTL = RIGHT edge
- Grid column 2 = 1fr (remaining) → in RTL = LEFT
- `.main-content` (1st DOM child) → column 1 (240px) → **gets squeezed into the 240px slot on the RIGHT**
- `#cat-sidebar-mount` (2nd DOM child) → column 2 (1fr) → gets the wide cell on the LEFT (sidebar mount slot, but the sidebar itself is fixed-positioned so it doesn't actually use this cell)

Net result: main-content is 240px wide jammed into the sidebar's visual area; the rest of the viewport is empty (where the sidebar slot allocates 1fr but the fixed sidebar isn't there).

## Real root cause (revised)

**The grid approach is fundamentally wrong for a `position: fixed` sidebar.** A fixed-positioned element takes itself out of layout flow — the grid can never "constrain" main content from a fixed overlay. Three viable correct fixes:

### Option A (recommended) — drop grid; use `padding-inline-end` on .main-content

```css
.cat-sidebar-host {
  /* No grid needed — sidebar is position:fixed, doesn't participate in flow */
  display: block;
}
.cat-sidebar-host > .main-content {
  padding-inline-end: var(--cat-sidebar-width, 240px);
  /* In RTL: padding-inline-end = padding-LEFT — wrong direction! */
}
```

Wait — `padding-inline-end` in RTL = padding-LEFT. That's wrong direction.

Actually we want to push main content AWAY from the RIGHT in RTL (where the sidebar is). `padding-inline-start` in RTL = padding-right = reserves 240px on the right. Then main content fits in the LEFT (1920-240) = 1680px.

So:
```css
.cat-sidebar-host > .main-content {
  padding-inline-start: var(--cat-sidebar-width, 240px);
}
```
Or equivalently, push content using margin:
```css
.cat-sidebar-host > .main-content {
  margin-inline-start: var(--cat-sidebar-width, 240px);
}
```

`margin-inline-start: 240px` in RTL = margin-right: 240px → pushes main-content 240px from the right edge → main-content occupies x=0 to x=(viewport-240). This is what the OLD brittle selector list did per-element; just apply it to .main-content once and it cascades to all descendants automatically.

### Option B — keep grid but reorder HTML children

Put `#cat-sidebar-mount` BEFORE `.main-content` in inventory.html:
```html
<div class="cat-sidebar-host">
  <div id="cat-sidebar-mount"></div>  <!-- 1st child → column 1 (240px in RTL = RIGHT) -->
  <div class="main-content">...</div> <!-- 2nd child → column 2 (1fr = LEFT) -->
</div>
```
Keep current `grid-template-columns: var(--cat-sidebar-width, 240px) 1fr`. Now main-content goes into the 1fr column on the LEFT. Sidebar-slot is on the RIGHT matching the fixed sidebar.

Requires inventory.html edit (1 element move).

### Option C — keep grid + HTML order; use explicit grid-column

```css
.cat-sidebar-host { grid-template-columns: var(--cat-sidebar-width, 240px) 1fr; }
.cat-sidebar-host > .main-content { grid-column: 2; }
.cat-sidebar-host > #cat-sidebar-mount { grid-column: 1; }
```
CSS-only; no HTML restructure. Explicit column placement overrides DOM-order auto-placement.

## Recommendation

**Option A (margin-inline-start on .main-content)** is the cleanest:
- No grid (the grid was always wrong-tool for a fixed sidebar)
- Single CSS rule, scoped to one selector
- Self-explanatory; future maintainers don't need RTL gymnastics
- Restores the OLD intent (margin-inline-start: 240px) but applied to ONE wrapper instead of an enumerated list

Foreman to decide A/B/C and dispatch Executor for another revision.

## Smoke status

Smoke 7/7 PASS both pre-Tester AND post-Tester runs. The bug is purely layout (CSS-only) — non-UI surfaces (smoke tests on demo backend) unaffected.

## Hand-off

Hand back to Foreman (opticup-strategic). Recommend:
1. Revert C1 (the failed swap) OR amend with Option A/B/C
2. Re-dispatch Executor with the new fix
3. Re-dispatch Tester for another VFV cycle

**Per pending entry + SPEC §5 + this Pipeline's mandate: NO 🟢 without all 8 surfaces verifiably 🟢.** Cannot pass to close stage.
