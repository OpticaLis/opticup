# Design System — Hybrid (A+B) Final Variant

**Brief version:** v3 (supersedes v1 and v2)
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Module Strategist (`opticup-strategic`) → continuous-run via 5-agent chain
**Owning module:** Module 1.5 — Shared Components

---

## 1. Purpose

Build the **final design language** for Optic Up — a hybrid that takes the structural strengths of Language A (Linear) and the informational strengths of Language B (Stripe), with a Navy Blue accent palette instead of the violet from B.

This brief produces ONE design language (not 3). Daniel has reviewed v2's three languages, picked B (Stripe) as the foundation, and asked for specific improvements harvested from A. This brief encodes those improvements + the color change.

The output is the design language that all 13+ Optic Up modules will eventually adopt. After this variant ships, per-module migration SPECs port production HTML to the new system.

## 2. Scope — In

**Modules covered (same 5 as v2):**
1. Storefront Studio (`storefront-studio.html`)
2. Permissions (`permissions.html`)
3. Shipments + Boxes (`shipments.html`)
4. Settings (`settings.html`)
5. Suppliers Debt (`suppliers-debt.html`)

**One design language ("Hybrid"):**

### Visual identity
- **Background:** warm off-white (`#fafaf7` page, `#ffffff` cards) — kept from B
- **Accent color:** Navy Blue (`#1e3a8a`), not violet. With `--accent-hover` `#1e40af` and `--accent-soft` `#e6f1fb` for selected rows/badge backgrounds.
- **Typography:** sans-serif everywhere — Inter for Latin, Heebo for Hebrew. **NO serif for supplier names or anywhere else.** (zorek harvested)
- **Density:** between A and B. Tighter than v2-B in tables (target 6-7 visible rows in `1080p viewport`), looser than v2-A in cards (16-20px padding).
- **Shadows:** mid-tier — borders for separation in dense areas (tables), shadows for elevated cards (metrics, hero).
- **Corners:** 12px on cards, 8px on inputs/buttons, 999px on pills.

### Navigation pattern — sidebar (from A), NOT topbar
- Left sidebar with `sidebar-section-label` groupings ("ספקים" / "דוחות" / "ניהול" / etc).
- Header at top of sidebar: "Optic Up" logo + brand mark.
- Active nav item highlighted with `--accent-soft` background + `--accent` left-border.
- Sidebar holds 15+ items comfortably without scroll — must work when M5-M15 are added.
- Sidebar width: 240px.

### Page structure (from B)
- **Hero block** at top of main content: H1 + descriptive sentence with key context ("3 משלוחים בדרך, 7 ארגזים פתוחים, נעילה אוטומטית מתוזמנת ל-BX-0140-02 בעוד שעה ו-42 דקות") + primary action button(s) on the right.
- **Metrics cards row** below hero: 4 metric cards in a grid, each with label/value/trend. Cards use `--accent-bar` (navy stripe) on top.
- **Content cards** for tables, charts, role tiles, etc. Cards have soft shadow (`shadow-md`) and 12px radius.
- **Charts** like the age-bar in Suppliers Debt — use semantic colors (success/info/warning/danger) for segments, not the accent.

### Component patterns (mix of A+B)
- **Tables:** dense (A), with `font-family: var(--font-mono)` for IDs/codes, `font-variant-numeric: tabular-nums` for numeric columns. Zebra stripes optional (`--bg-surface-alt`).
- **Pills (B's pattern):** rounded-full (999px), small dot indicator, semantic color from soft + dark text. Used for status: pending/active/late/closed.
- **Role tiles (B's pattern):** for Permissions page — 4 cards above the matrix showing role name + user count + permission count. Use `--accent-soft` for highlight.
- **Hero context sentence (B's pattern):** every page has a one-liner under H1 that surfaces the most actionable insight from the data.
- **Sidebar sections (A's pattern):** group nav items under labels, not flat list.

## 3. Scope — Out

- **3 variations.** This is ONE variant, not 3.
- **Other modules (M1, M4, M5-M15, etc).** Out of scope. Migration SPECs follow.
- **Dark mode.** Light only.
- **Production module changes.** Pure mockups in `architecture-brief/design-system-mockups/hybrid-final/`.

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | One variant only — Hybrid (no A/B/C this round) | Daniel 2026-05-11 |
| 2 | Foundation = B (Stripe) — hero, metrics, role tiles, cards, pills, charts | Daniel 2026-05-11 |
| 3 | Navigation = A (left sidebar with sections, not topbar) | Daniel 2026-05-11 |
| 4 | Density = A's tables (compact, 6-7 visible rows), B's cards (16-20px padding) | Daniel 2026-05-11 |
| 5 | Typography = sans-serif everywhere, no serif | Daniel 2026-05-11 |
| 6 | Accent color = Navy Blue `#1e3a8a` (NOT violet `#635bff`) | Daniel 2026-05-11 |
| 7 | Page bg `#fafaf7`, card bg `#ffffff`, accent-soft `#e6f1fb` | Architect |
| 8 | Same 5 modules from v2 | Daniel 2026-05-11 |
| 9 | Output folder: `design-system-mockups/hybrid-final/` | Architect |
| 10 | v1 + v2 stay archived (don't re-archive) | Architect |
| 11 | Use Claude Designs, NOT staticization | Daniel 2026-05-11 (carryover from v2) |
| 12 | Continuous run in one Claude Code session, no stops | Daniel 2026-05-11 (carryover from v2) |

## 5. Folder Structure

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/
├── hybrid-final/                           ← NEW for this brief
│   ├── INDEX.html                          (tab nav between 5 modules)
│   ├── _tokens.css                         (single token file — navy palette)
│   ├── storefront-studio.html
│   ├── permissions.html
│   ├── shipments.html
│   ├── settings.html
│   └── suppliers-debt.html
├── language-a-linear/                      (kept as reference)
├── language-b-stripe/                      (kept as reference — the foundation)
└── language-c-notion/                      (kept as reference)
```

Total new files: **7** (5 modules + INDEX + tokens).

## 6. Quality Bar — Acceptance Criteria

1. **Sidebar present on every page.** Same sidebar structure across all 5 modules — only the active item changes.
2. **Hero block present on every page.** H1 + descriptive sentence (REAL context from the page data, not placeholder) + primary action(s) on the right.
3. **Metrics row present on every page.** 4 cards, each with label + value + (optional) trend.
4. **No violet anywhere.** All accent uses are `#1e3a8a` family. Verify with `grep -i "635bff\|violet\|purple" *.html _tokens.css` → should return 0 matches.
5. **No serif anywhere.** Verify with `grep -i "serif\|Source Serif" *.html _tokens.css` → should return 0 matches except in `--font-sans` declaration if it falls back to system serifs (acceptable).
6. **Table density:** at default viewport, tables show at least 6 data rows above the fold without scroll.
7. **Card structure preserved from B:** metric cards have a colored accent bar on top, role tiles are 4 across with count badges, content cards have visible (but soft) shadows.
8. **RTL Hebrew throughout.** All `<html lang="he" dir="rtl">`.
9. **Real data:** suppliers have real names (Luxottica, Safilo, Marcolin, Hoya, Carl Zeiss Vision, Optical Frame Israel). Permissions matrix shows real role names + real permission codes. Shipments show real shipment IDs and box IDs.
10. **Accessibility:** focus-visible on all interactive elements, sufficient contrast (WCAG AA).
11. **Self-contained:** opens directly in browser. Google Fonts CDN only.
12. **`npm run verify:integrity` exit 0.**
13. **`npm run smoke` 7/7 PASS.**

## 7. Continuous-Run Mandate

Same as v2 — runs end-to-end in one Claude Code session. Do not split into sub-phases. 7 files in one go.

**The Executor MAY stop only for:**
1. Real corruption or git failure.
2. A success criterion in §6 cannot be met.
3. Iron Rule violation.

**The Executor MUST NOT stop for:**
- Design decisions within Navy palette + Hybrid layout (Executor's call).
- "Should I split into sub-phases" — answer is NO.
- "Should I add a different secondary color" — answer is NO unless §6 #4 fails.

## 8. Anti-Patterns

- **DO NOT use violet.** Even as a secondary accent. The whole palette is navy + neutrals + semantic.
- **DO NOT use serif fonts.** Even for "premium feel" — sans-serif everywhere.
- **DO NOT keep B's `topbar` navigation.** Use A's sidebar.
- **DO NOT keep B's gradient backgrounds on metric cards.** Solid bg with accent bar on top, period.
- **DO NOT change information architecture.** The 5 pages already exist in v2-B with good structure — preserve the structure, change the visual language.
- **DO NOT staticize production HTML.** Use Claude Designs from scratch, informed by v2-B as the structural reference.

## 9. Iron Rules in Sharp Focus

- Rule 9 (no hardcoded values): all colors via `_tokens.css`
- Rule 12 (350-line max): each HTML stays compact; if pushing the limit, split CSS into co-located file
- Rule 21 (no orphans): reuse v2-B's HTML files as structural reference, then rewrite for the new tokens; do not leave duplicate files behind

## 10. Hand-off to Foreman

Foreman writes ONE SPEC at:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/SPEC.md`

The SPEC:
1. Authorizes creation of `design-system-mockups/hybrid-final/` folder.
2. Sets 7-file deliverable.
3. Encodes the Navy palette + Hybrid layout rules from §2.
4. Continuous-run mandate.
5. Acceptance criteria from §6 as measurable success criteria.
6. After Executor finishes — Daniel reviews → if approved, this becomes the platform default. If not approved, Foreman captures the gap and Architect refines.

Then Daniel opens a fresh Claude Code chat with `opticup-executor`, dispatches the SPEC, lets it run.

---

*End of brief. v3 finalizes the design language for Optic Up.*
