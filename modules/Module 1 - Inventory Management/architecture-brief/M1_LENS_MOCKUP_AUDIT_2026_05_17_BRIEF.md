# BRIEF — M1 Lens Mockup Audit (fresh, 2026-05-17)

**For:** Claude Code session on Daniel's Windows desktop. Open a **new session** for this work — do NOT continue an in-progress one. The fresh context is intentional.

**Type:** Investigation / audit. Read + report. NO code changes, NO commits to source files.

**Estimated wall clock:** 1.5-2 hours.

---

## Why this Brief exists

Daniel approved approved mockups (D-M1-02 through D-M1-14, ratified 2026-05-14) as the design specification for M1 lens UI. Of 7 lens screens:

- **1 of 7 (Lens Inventory)** was rebuilt to 1:1 mockup fidelity (Pipeline `M1_LENS_INVENTORY_MOCKUP_1TO1`, merged 2026-05-18).
- **6 of 7 remain non-compliant** — built to skeleton-structure prose, NOT to visual fidelity of the mockups.

Daniel discovered this 2026-05-18 morning, escalated 2026-05-17 night. Pattern P-AR-16 (Mockup Fidelity Mandate) is in force but only 1 screen actualized.

There is a prior audit in `_archive/m1-mockup-audit-2026-05-18/AUDIT_REPORT.md` (written by an Explore agent on 2026-05-18 morning). **Daniel wants a fresh audit, not a verification of the old one.** Reasons: old audit may have anchored on assumptions, and a fresh look from a clean session catches drift the old audit missed.

This audit feeds into a rebuild Pipeline dispatch that Daniel will authorize after reviewing your findings.

---

## Bootstrap protocol (mandatory)

1. **Load skill `opticup-architect`** (from `.claude/skills/opticup-architect/SKILL.md`).
2. **First Action per CLAUDE.md §1**: confirm machine = Windows desktop, repo = `opticalis/opticup`, branch = `develop`, pull latest (`git pull origin develop`), run `npm run verify:integrity`.
3. **Read context (full)**:
   - `CLAUDE.md` (31 Iron Rules)
   - `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
   - `modules/Module 1 - Inventory Management/docs/MODULE_SPEC.md`
   - `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md`
   - `modules/Module 1 - Inventory Management/MODULE_1_ROADMAP.md` (or `ROADMAP.md` — whichever exists)
   - `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_INVENTORY_MOCKUP_1TO1_BRIEF.md` — the **reference** for what mockup-fidelity rebuild looks like
   - `.claude/skills/opticup-architect/references/decisions/CROSS.md` for patterns P-AR-1..P-AR-16 + S-* + C-* decisions
4. **Read mockups (canonical design specification)**:
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_DESIGNS_SELECTION_MOCKUP.html`
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PRICING_MOCKUP.html`
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PURCHASE_ORDER_MOCKUP.html`
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_ACTIVE_POS_LIST_MOCKUP.html`
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_GOODS_RECEIPT_MOCKUP.html`
   - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
   - For reference (already shipped): `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`
5. **Locate the live screens** by grep'ing `modules/lens-*` and `inventory.html` for the 6 screen names + their script entrypoints. Confirm file paths before audit.
6. **DO NOT read the prior audit** (`_archive/m1-mockup-audit-2026-05-18/AUDIT_REPORT.md`) until after you've formed your own conclusions. After your audit is complete, you may read it to cross-check whether you missed anything — but the report you produce is your independent assessment.

---

## The 6 screens to audit

| # | Screen (Hebrew) | Mockup file (canonical) | Live file (find via grep) |
|---|-----------------|-------------------------|----------------------------|
| 1 | בחירת דגמים פעילים | `LENS_DESIGNS_SELECTION_MOCKUP.html` | `modules/lens-designs/*` or similar |
| 2 | קטלוג ומחירים | `LENS_PRICING_MOCKUP.html` | `modules/lens-pricing/*` or similar |
| 3 | הזמנת רכש | `LENS_PURCHASE_ORDER_MOCKUP.html` | `modules/lens-purchase-order/*` or similar |
| 4 | הזמנות פעילות | `LENS_ACTIVE_POS_LIST_MOCKUP.html` | `modules/lens-active-pos/*` or similar |
| 5 | קבלת סחורה (Lens) | `LENS_GOODS_RECEIPT_MOCKUP.html` | `modules/lens-goods-receipt/*` or similar |
| 6 | קטלוג מערכת + הקטלוג שלי | `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` | `modules/lens-platform-catalog/*` or similar |

Note for screen 6: the same mockup also serves the **private catalog (per-tenant)** screen visually inherited from admin mockup but with **LIGHT theme** (admin = dark theme). Audit BOTH the system catalog AND the private catalog screens against this mockup. Per Daniel's 2026-05-18 decision both need rebuild.

---

## Audit method (per screen — apply identically to all 6)

### Step A — Static comparison (10-15 min/screen)

1. Open the mockup HTML in Chrome MCP via `mcp__Claude_in_Chrome__navigate` to `file:///{absolute_path_to_mockup}` and `get_page_text` + screenshot.
2. Open the live screen in Chrome MCP. Use:
   - `mcp__Claude_in_Chrome__navigate` to `http://localhost:3000/{screen-route}` (you'll need to start localhost via `npm run dev` first if not running)
   - If localhost routing isn't obvious, find the route via inventory.html nav strip references + the partial filenames
   - Authenticate with demo tenant PIN 12345 if prompted
3. `get_page_text` + screenshot the live screen.
4. Compare element-by-element:
   - Layout regions (header, toolbar, main content, side panel, footer)
   - Component types (stat cards, chip filters, tabs, dropdowns, tables, modals, badges)
   - Color tokens (Prizma gold #c9a555, dark vs light theme, brand colors)
   - Spacing + typography (Rubik weights, paddings, gaps)
   - Interactive elements (buttons, switches, search inputs, action menus)
   - RTL layout (logical properties, Hebrew labels)

### Step B — Classify gaps per element

For every visible mismatch, assign ONE of these gap classes:

- **STRUCTURAL** — entire section missing or extra (e.g., "4 stat cards in mockup, 0 stat cards in live")
- **VISUAL** — element present but wrong styling (color, spacing, font weight, theme)
- **FUNCTIONAL** — element present + styled correctly but interaction missing (e.g., "filter chips visible but clicks do nothing")
- **INTENTIONAL** — deviation that Daniel approved or that is per a design decision (rare — flag if unsure)

Each gap gets severity:
- **CRITICAL** — screen is unusable without it (e.g., approval flow missing entirely)
- **HIGH** — visible to user every time they open the screen, fails P-AR-16 mockup mandate (e.g., wrong layout, missing stat cards)
- **MEDIUM** — present but wrong (e.g., button styled differently, color off)
- **LOW** — minor polish (e.g., padding 12px vs 16px)

### Step C — Write per-screen report section

For each of the 6 screens, in your final report write:

```markdown
## Screen N: {Hebrew name}

**Mockup:** {mockup file path}
**Live file(s):** {live file paths}
**Mockup-fidelity verdict:** {🟢 1:1 / 🟡 minor drift / 🔴 major rebuild needed}

### Structural gaps
- {one line each, with severity}

### Visual gaps
- {one line each, with severity}

### Functional gaps
- {one line each, with severity}

### Notes / open questions for Architect
- {anything that needs Daniel's design call before rebuild can scope}
```

---

## Step D — Cross-cutting findings (after all 6 screens)

After per-screen audit, write a "Cross-cutting" section that identifies:

1. **Shared components missing from `shared/`** — chip-filters, side detail panel, stat cards, wizard step indicator, etc. Any component used in 3+ mockups but not extracted to Module 1.5 → flag as **EXTRACT-FIRST** dependency.
2. **CSS tokens missing** — colors, spacing, fonts that mockups use but `css/*.css` doesn't define.
3. **Pattern violations** — places where live code violates P-AR-16 (Mockup Fidelity Mandate) systematically.

---

## Step E — Recommended Pipeline grouping

After all gaps + cross-cutting findings, propose:

1. **Phase 0 — Shared component extraction**: list of components to build/extract in Module 1.5 BEFORE any screen rebuild starts. Estimate: hours.
2. **Phase 1+** — group the 6 screens by:
   - **Sequential** (depend on Phase 0 components or on each other)
   - **Parallel** (independent, can run in worktrees concurrently)
   - Each group with estimated rebuild time per screen
3. **Total budget estimate** — wall clock to mockup-fidelity for all 6 screens.

Daniel will use this to decide hybrid execution (one screen builds components, then 2-3 parallel sessions on worktrees for the rest).

---

## Deliverable

Write your audit report to:
```
modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md
```

Commit + push to `origin/develop` with message:
```
docs(m1): fresh M1 lens mockup audit — 6 screens vs canonical mockups (M1_LENS_MOCKUP_AUDIT_2026_05_17)
```

Then post a short summary to the chat:
- 6 verdicts (🟢/🟡/🔴 per screen)
- Cross-cutting bullet count
- Recommended Phase 0 component count + estimated hours
- Recommended total budget for full M1 lens mockup compliance

Cowork-Architect (Daniel-via-Cowork) will read your report + post summary, ask Daniel any design-decision questions surfaced by the audit, then write a rebuild Pipeline Brief.

---

## Constraints

- **Read-only on all live source files.** Don't touch HTML/CSS/JS during audit.
- **No DB writes.** Audit reads only.
- **No Prizma writes.** Demo tenant only if you authenticate to localhost.
- **Stop-on-deviation triggers (per CLAUDE.md §9):**
  - If localhost won't start → stop, report, ask for instructions
  - If a mockup file is missing or malformed → stop, report
  - If you find a 7th lens screen not listed in §"The 6 screens" → stop, report (could be a phase-letter drift)
  - If a live screen has 0 mockup-fidelity attempts AND mockup-fidelity is < 30% match → flag CRITICAL but continue (you're auditing, not fixing)

## Iron Rule compliance during audit

- Rule 9 (Daniel = strategic only, no technical details to chat) — your summary to chat is short Hebrew-friendly bullet points. Detail goes in the report file.
- Rule 10 (Read before write) — re-read mockup before writing each screen section.
- Rule 12 (file size) — keep report under 1000 lines; if longer, split by screen into sub-files.
- Rule 31 (integrity gate) — run at session start + pre-commit. Already in husky hook.

---

## After report lands

Cowork-Architect will:
1. Read the report + ask Daniel the strategic questions surfaced by it (design decisions, scope choices, sequencing)
2. Possibly update mockup files if Daniel makes design tweaks during Q&A
3. Write rebuild Pipeline Brief (one per screen or one bundled, depending on Phase 0 component extraction)
4. Hand to Claude Code for autonomous Pipeline execution

Your job ends with the report + chat summary. Don't author rebuild SPECs yourself.

---

**END BRIEF**
