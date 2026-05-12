# M7 Orders — Center Column Redesign Brief (v2)

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 7 — Orders

---

## 1. Purpose

The center column of the M7 Orders screen (v6 mockup) has too much data competing for attention. Daniel reviewed v6 and `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` (which already had 3 variants — Tabs / Scan-first / Staged checklist) and remains unsatisfied. The core issue: 9 sub-regions stacked vertically, all at similar visual weight, all important to Daniel — but the eye has no way to distinguish primary work surface from supporting tools.

Daniel's directive: "I can't drop any of it. Rearrange it." This brief produces 3 NEW layout variants for the center column ONLY, all retaining 100% of the data and capabilities from v6, but with different spatial organization, hierarchy, and color grouping.

After Daniel picks one — it becomes the v7 of the M7 mockup.

## 2. What's NOT Changing

- The right column (sub-order rail) stays as in v6.
- The left column (WhatsApp + tasks + audit) stays as in v6.
- The header (customer info) and tabs stay as in v6.
- ALL 9 data regions remain present and functional. Nothing is removed.
- The 4 sub-order types (frames / lenses / contact-lenses / accessories) remain.
- The Hybrid design tokens (Navy `#1e3a8a`, off-white bg, sans-serif) apply if and only if they don't disrupt the dense information layout. v6 used a richer palette (purple-deep/amber/teal/blue) because it needed many semantic groups; the new variants are free to keep that richer palette OR adopt Navy — both are valid. Daniel will judge by the result, not by token purity.

## 3. What IS Changing

The center column layout. Three new variants. Each variant must honor these Daniel-locked rules:

### Daniel-locked layout rules (apply to ALL 3 variants)

1. **The 4 type-picker buttons** (מסגרת / עדשות / עדשות-מגע / אביזרים) become a **2×2 grid on the RIGHT side** of an action-bar, not 4 across the top.

2. **The scan zone + "פתח קטלוג" button** sit on the **LEFT side** of the same action-bar, separated from the 2×2 by a vertical divider line.

3. **One "פתח קטלוג" button only** — its label and target are determined by whichever of the 4 type buttons is currently active. Active type = active catalog.

4. **The 7 remaining regions** (prescription strip, sub-order title, item-cards, lens-pickers, so-print, so-msg, so-pricing) need a NEW organization. Each variant proposes a different organization. NO variant may stack them vertically as v6 did — that's the pattern Daniel rejected.

### The 3 variants — distinct organizational principles

**Variant A — "Two-pane work surface."**
Two horizontal panes side-by-side below the action-bar.
- Pane 1 (wider): the active work surface — item-cards + lens-pickers + the add-cards CTA. This is what the worker touches while building the order.
- Pane 2 (narrower): supporting metadata — prescription strip + so-pricing.
- so-print and so-msg become a thin tools-strip at the bottom of the entire center column (always visible, never scrolls away).
- Rationale: separates "what's in the order" from "actions on the order" by physical position.

**Variant B — "Accordion stack with one open at a time."**
Below the action-bar, six collapsible sections in a fixed vertical order:
1. מרשם (prescription)
2. פריטים בהזמנה (items list — open by default)
3. עדשות (lens-pickers)
4. הדפסה (so-print)
5. הודעות (so-msg)
6. תמחור (so-pricing)
Only ONE section is open at any given time. Clicking another collapses the previous. Each closed section shows a 1-line summary on its header (e.g., "תמחור — סה״כ ₪2,340").
- Rationale: same vertical flow as v6, but only one region competes for attention at a time. Eye is never overwhelmed.

**Variant C — "T-layout — items on top, everything else in tabs below."**
- The full width of the center, above the fold: prescription strip + item-cards (the always-visible work surface).
- Below the item-cards: a tab bar with 5 tabs — עדשות / הדפסה / הודעות / תמחור / מרשם-מורחב.
- Click a tab → its content appears below the tab bar.
- The active type from the 2×2 picker visually highlights the relevant tab (e.g., active = "עדשות" → both the lens-pickers in the items area AND the עדשות tab pulse together).
- Rationale: items always visible (they're the heart of the order), supporting actions one click away. Tabs reduce the visible-at-once data without hiding it.

## 4. Deliverable

ONE HTML file: `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html`

Structure:
- Top of page: a tab bar with 3 tabs (Variant A / Variant B / Variant C).
- Each tab shows the full M7 mockup (header + tabs + 3-column layout) with ONLY the center column varied per the variant rules above. Right column and left column are identical across all 3 tabs.
- A recommendation banner at the very top of the file naming the recommended variant + 1-sentence reason. (Per Pattern P35 in the architect skill.)
- Self-contained HTML, RTL, light bg, Google Fonts only.
- One sticky nav at top so tabs stay visible while scrolling.

## 5. Anti-patterns

- **Do NOT drop or merge any of the 9 regions** Daniel listed. All present in all 3 variants.
- **Do NOT change right-column or left-column.** Center column only.
- **Do NOT change the visual identity** so much that it stops looking like Optic Up. Same general palette range.
- **Do NOT show only the center column** — Daniel needs to see it in context. The full 3-column layout is the deliverable.
- **Do NOT add a 4th variant** "because it might be better." 3 only.
- **Do NOT stop the Pipeline** to ask Daniel which scheme or organization to use. Variant rules in §3 are fully specified. Execute.

## 6. Success Criteria (Pipeline self-verifies)

1. File `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` exists.
2. The file has 3 tabs (Variant A / Variant B / Variant C) with sticky tab nav.
3. Each variant renders the FULL 3-column M7 layout (header + cmdbar + right rail + center + left audit).
4. In ALL 3 variants: the 2×2 type-picker is on the RIGHT side of an action-bar in the center column.
5. In ALL 3 variants: the scan zone + ONE "פתח קטלוג" button sit on the LEFT side of the same action-bar, with a vertical divider between scan area and 2×2.
6. In ALL 3 variants: all 9 v6 data regions are present (prescription / sub-order title / items / lens-pickers / so-print / so-msg / so-pricing / 2×2 picker / scan-zone).
7. Variant A uses two-pane horizontal split for items + metadata, plus a sticky tools strip.
8. Variant B uses 6 collapsible accordion sections with only one open at a time + summary headers when closed.
9. Variant C uses items-on-top + 5-tab bar below + content-pane that responds to tab choice.
10. The file opens directly in browser. RTL Hebrew. Real placeholder data (Cazal 1280, Optimize Multifocal, etc.) preserved from v6.
11. A recommendation banner at the top names the Architect's recommended variant + reason.
12. `npm run verify:integrity` exit 0.

## 7. Destructive Operations

**None.** This is a file-creation-only change. No deletes, no renames, no schema changes. The Pipeline writes ONE new HTML file; the existing v6 and the existing CENTER_COLUMN_VARIANTS file remain untouched.

## 8. Continuous-Run Mandate

Run end-to-end through the skill chain in one Claude Code chat. No mid-pipeline questions. Stop only on:
- Iron Rule 31 (integrity) violation.
- A success criterion in §6 cannot be met.
- File-write permission failure.

## 9. References

- `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html` — the v6 mockup to base the layout on. Right and left columns copy verbatim. Center column rebuilt per §3.
- `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_CENTER_COLUMN_VARIANTS.html` — the previous attempt at center variants (Tabs / Scan / Staged) — DO NOT reuse those three. The Daniel-locked rules in §3 are different.
- `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_BRIEF.md` — original M7 brief for context on data shape.
- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/` — Hybrid design tokens, optional reference.

---

*End of brief.*
