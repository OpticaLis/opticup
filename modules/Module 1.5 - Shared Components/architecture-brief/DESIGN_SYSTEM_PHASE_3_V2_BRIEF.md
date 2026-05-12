# Design System — Phase 3 v2 (Authentic Design Languages)

**Brief version:** v2 (supersedes Phase 3 v1)
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Module Strategist (`opticup-strategic`) → continuous-run via 5-agent chain
**Owning module:** Module 1.5 — Shared Components

---

## 1. Why this brief exists

Phase 3 v1 produced 45 HTML files that **failed the actual goal of the design system task**. The Executor staticized production HTML and added 3 minimal `_tokens.css` files (6-7 tokens each: spacing, radius, font-size). It did NOT produce 3 different design languages. All three "directions" share the same color palette, same DOM, same components — only spacing/typography micro-differ. Daniel cannot make a real choice between three near-identical variations.

This brief replaces Phase 3 v1 entirely. Old work is archived (not deleted) for the record. New work uses **Claude Designs** (Anthropic's design generation tool — the same one used to produce M5/M6/M7 mockups originally) to author each screen authentically per design language.

## 2. Scope — In

**Modules covered (5 only, NOT 13):**
1. Storefront Studio (`storefront-studio.html` — ניהול חנות אונליין)
2. Permissions (the permissions area of `settings.html` / `admin.html` — ניהול הרשאות)
3. Shipments + Boxes (`shipments.html` — משלוחים וארגזים)
4. Settings (`settings.html` — הגדרות)
5. Suppliers Debt (`suppliers-debt.html` — חובות ספקים)

**Design languages (3 — all light-background, all easy on the eye, all different):**

### Language A — "Linear / Vercel"
- Background: pure white + very light gray (`#fafafa` / `#f4f4f5`)
- Typography: Inter (or Heebo as fallback for Hebrew), modern grotesque, 14px base, generous line-height
- Accent: subtle indigo (`#6366f1`) for primary actions, neutral for everything else
- Density: medium — lots of breathing room but not wasteful
- Shadows: very soft, minimal — borders preferred over shadows
- Corners: 8-12px radius
- Vibe: minimalist, professional-developer-tool

### Language B — "Stripe Dashboard"
- Background: warm off-white (`#fafaf7` / `#f7f6f3`)
- Typography: serif for headings (e.g. "Source Serif" or "Merriweather"), sans-serif for body
- Accent: deep purple/violet (`#635bff`) for primary, colorful infographics
- Density: medium-comfortable — premium-SaaS feel
- Shadows: soft mid-tier shadows, layered cards
- Corners: 12px
- Decorative touches: gradient accents, illustrated empty states, charts in colorful palettes
- Vibe: premium fintech, polished, trust-inspiring

### Language C — "Notion / Airy"
- Background: cool off-white (`#fcfcfa` / `#f7f6f3`)
- Typography: large readable sans-serif (16-17px base), wide spacing
- Accent: pastel hues — soft lavender, muted teal, soft coral
- Density: low — lots of whitespace, generous padding (24px+ in cards)
- Shadows: almost none — subtle dividers and borders instead
- Corners: 16-20px radius (very round)
- Vibe: airy, friendly, content-focused, like a modern documentation tool

**Critical rules:**

1. **NO dark backgrounds anywhere.** All 3 languages stay light. Daniel directive.
2. **ALL 3 languages must be visually distinguishable at a glance.** If you can't tell which language a screenshot belongs to within 2 seconds, the design is wrong.
3. **Use Claude Designs (Anthropic's design tool).** Do NOT staticize production HTML. Each screen is designed from scratch per language, informed by the existing screen's information architecture but with the chosen language's visual identity.
4. **Same information per screen across languages.** The Storefront Studio screen shows the same data/controls in all 3 languages — only the visual treatment changes. Don't redesign the information architecture; redesign the visual language.
5. **Hebrew RTL on every file.** `<html lang="he" dir="rtl">`.
6. **Self-contained HTML.** Each file is openable directly in the browser, no build step, no missing assets. Inline CSS or co-located tokens file. No external CDN dependencies beyond Google Fonts.

## 3. Scope — Out

- **M1 Inventory.** Daniel directive — do not touch.
- **M3 main storefront.** Out of scope. Only Storefront Studio (the admin side).
- **M4 CRM.** Out of scope for now (per scope-reduction in this brief).
- **M5-M15 modules.** Out of scope for this iteration — they'll be added after Daniel picks a winning language.
- **Migration of any production module to the chosen language.** Out — separate SPECs per module after the winner is picked.
- **Backend / DB / RPC.** Pure HTML+CSS mockup work. No JavaScript logic beyond minimum for tab navigation in INDEX files.

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | 5 modules covered: Storefront Studio, Permissions, Shipments, Settings, Suppliers Debt | Daniel 2026-05-11 |
| 2 | M1 Inventory out of scope | Daniel 2026-05-11 |
| 3 | 3 design languages: Linear/Vercel, Stripe, Notion/Airy | Daniel 2026-05-11 |
| 4 | All languages = light background, no dark mode | Daniel 2026-05-11 |
| 5 | Languages must be visually distinct (not micro-variations) | Daniel 2026-05-11 |
| 6 | Use Claude Designs, not staticization of production HTML | Daniel 2026-05-11 |
| 7 | Phase 3 v1 archived to `_archive/design-system-mockups-v1-staticized/` | Daniel 2026-05-11 |
| 8 | New folder names: `language-a-linear/`, `language-b-stripe/`, `language-c-notion/` | Daniel 2026-05-11 |
| 9 | Run continuously in one Claude Code chat (1M token window — no need to split) | Daniel 2026-05-11 |
| 10 | No STOP triggers except real deviations | Daniel 2026-05-11 |

## 5. Folder Structure

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/
├── language-a-linear/
│   ├── INDEX.html               (tab nav between the 5 modules)
│   ├── _tokens.css              (Language A design tokens — color palette + typography + spacing + shadows)
│   ├── storefront-studio.html
│   ├── permissions.html
│   ├── shipments.html
│   ├── settings.html
│   └── suppliers-debt.html
├── language-b-stripe/
│   └── (same 7 files)
└── language-c-notion/
    └── (same 7 files)
```

Total: **21 files** (3 × 7).

Plus archive:
```
_archive/design-system-mockups-v1-staticized/
├── direction-1-conservative/   (existing 15 files moved here)
├── direction-2-modern-clean/   (existing 15 files moved here)
└── direction-3-bold-dense-pro-tool/  (existing 15 files moved here)
```

## 6. Quality Bar — Acceptance Criteria

A reviewer should be able to verify these without opening the code:

1. **Visual distinction test:** open `language-a-linear/INDEX.html`, `language-b-stripe/INDEX.html`, `language-c-notion/INDEX.html` side by side in three browser tabs. Within 2 seconds of glancing, the three languages are obviously different in: color palette, typography, density, surface treatment, decorative details. If they look similar — redo.

2. **Per-language consistency:** all 5 module screens within Language A share the same visual identity (same nav style, same button style, same card treatment, same colors). Same for B and C.

3. **Real information:** each screen shows the actual data structure of its module — not placeholder text. Storefront Studio shows real CMS sections (pages, blocks, media library, translations). Suppliers Debt shows a real debt table with supplier names, debt amounts, payment history columns. Permissions shows real roles + permission matrix. Etc. Use existing module sketches in `architecture-brief/MN_SKETCHES.html` for information structure when available.

4. **Hebrew RTL throughout.** All text in Hebrew, layout flows right-to-left, icons mirrored where appropriate.

5. **Light backgrounds only.** No `#0f` colors, no `#1a` colors — page backgrounds stay above `#f0`.

6. **Self-contained files.** Each HTML opens directly in browser with no errors, no missing CSS, no broken assets. Google Fonts CDN allowed; nothing else.

7. **Accessibility baseline:** focus-visible on interactive elements, sufficient contrast (WCAG AA minimum on text).

## 7. Continuous-Run Mandate (NEW — different from Phase 3 v1)

This is critical and overrides the default Bounded Autonomy stop-on-deviation pattern for this SPEC only.

**The Executor MUST run continuously through all 21 files in one Claude Code session.** No stops between modules, no stops between languages, no asking Daniel which design tool to use, no asking which color to pick.

**The Executor MAY stop only for:**
1. A real corruption or git failure that blocks progress.
2. A success criterion in §6 cannot be met and the alternative is unclear.
3. An Iron Rule violation that would result from continuing.

**The Executor MUST NOT stop for:**
- Design decisions within a language's defined palette/typography (those are Executor's call).
- File counting concerns — 1M token window handles 21 files easily.
- "Should I split into sub-phases" — answer is NO, run all 21 in one session.
- Context-window worry — Daniel has confirmed 1M context is available.

**Foreman authorization to Executor:** "All design language definitions in §2 are normative. Within those definitions, every visual choice (button shape, card padding, icon style, illustration choice) is yours to make. Don't ask. Decide and build. Daniel reviews the final output, not each decision."

## 8. Anti-Patterns (from Phase 3 v1 failure)

- **DO NOT staticize production HTML.** That was the v1 failure. Production HTML carries the current visual language baked in — copying it then layering tokens cannot produce a different language.
- **DO NOT create empty token files.** v1 Conservative was 4 lines saying "inherit everything." That's not a design language, that's no design.
- **DO NOT preserve current Prizma colors as the default.** The brief locks neutral as default — every language picks its own palette per §2.
- **DO NOT use the same DOM structure across languages.** Linear-style sidebar nav differs from Stripe-style top bar differs from Notion-style minimalist nav. The DOM must reflect the language.
- **DO NOT ask Daniel design decisions mid-execution.** The languages are defined. Execute.
- **DO NOT split into sub-phases.** The whole point is one continuous session.

## 9. Iron Rules in Sharp Focus

- **Rule 9 (no hardcoded business values):** colors live in `_tokens.css` per language, not inline in HTML.
- **Rule 12 (file size 350-line max):** each HTML stays under 350 lines OR splits its CSS into a co-located file. INDEX.html exempt (it's a hub).
- **Rule 21 (no orphans):** if a language reuses a component pattern, abstract it within that language's tokens file. Don't copy-paste across languages.

## 10. Hand-off to Foreman

The Foreman (Module Strategist) takes this brief and writes ONE consolidated SPEC (not 3, not 5, not 7) that:

1. Authorizes the archival of v1 to `_archive/design-system-mockups-v1-staticized/`.
2. Authorizes the creation of `language-a-linear/`, `language-b-stripe/`, `language-c-notion/` folders.
3. Sets the 21-file deliverable with the language-distinctness acceptance criterion.
4. Instructs the Executor to run continuously in one session, no stops, using Claude Designs as the authoring tool.
5. Defers the FOREMAN_REVIEW until after Daniel picks a winning language.

The SPEC lives at:
`modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/SPEC.md`

After Foreman writes the SPEC, Daniel opens a fresh Claude Code chat with `opticup-executor` loaded and dispatches the SPEC. The Executor runs all 21 files in one session. Daniel reviews the output and picks a winner.

---

*End of brief. v2 supersedes v1 entirely. v1 archived.*
