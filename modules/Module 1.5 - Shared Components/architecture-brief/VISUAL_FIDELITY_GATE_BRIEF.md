# Brief — Visual-Fidelity Gate (strengthen Localhost-Tester) + fix M5 fidelity

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `VISUAL_FIDELITY_GATE_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Type:** team/process upgrade (skill edit) + immediate application to M5 (card + list).
> **Trigger:** the M5 customer card shipped 🟢 but rendered as bare unstyled text — `customers.html` never linked `css/customers.css`. The "Chrome MCP fidelity PASS" was a paperwork pass, not a real one. Second strike (first was M1 lens). Daniel directive: no screen closes until someone has actually compared it 1:1 to the mockup and blocked if it doesn't match.

---

## 0. One-paragraph summary

The team has a Localhost-Tester role that already boots localhost + runs runtime smoke. The gap: **visual fidelity vs the mockup is not a blocking requirement anywhere** — so a screen that looks nothing like its mockup can still close 🟢. This Brief (1) upgrades `opticup-localhost-tester` to OWN visual fidelity as a hard, blocking gate (open the screen on localhost, screenshot it, open the mockup beside it, compare region-by-region, BLOCK closure if not 1:1), and (2) applies the upgraded gate immediately to M5 card + list — find every fidelity gap (starting with the unlinked stylesheet), fix it, and re-verify 1:1 with screenshots embedded in the report that the Architect + Daniel review before anything is called done.

## 1. Part A — strengthen the Localhost-Tester skill (the durable fix)

Edit `.claude/skills/opticup-localhost-tester/SKILL.md` (Claude Code only — Cowork can't write `.claude/skills/`). Add a **mandatory, blocking Visual-Fidelity Gate** to its role:

For ANY SPEC that touches a `.html`/`.js`/`.css` file consumed by a browser, before the Localhost-Tester may return GREEN:

1. **Stylesheet/asset-linked first-load check.** Confirm the page actually `<link>`s every stylesheet (and loads every JS) it depends on. A page that renders as unstyled raw text = automatic FAIL. (This single check would have caught the M5 card.) Practical: grep the HTML `<head>` for the module's own CSS file; load the page fresh and confirm it's styled, not raw text.
2. **Mockup-vs-live 1:1 comparison (the core gate).** If a mockup exists for the screen: open the live screen on localhost in Chrome, capture a screenshot; open the mockup; compare **region by region** (header, each block/card, each field row, badges, buttons, colors/tokens, spacing, RTL). Produce a feature-by-feature table: mockup-element → live-state → match/mismatch. ANY material mismatch (unstyled, missing block, wrong layout, wrong palette) = **BLOCK**, write the gaps, do NOT return GREEN.
3. **Embed the evidence.** The Localhost-Tester's report MUST embed (or link by path) the live screenshot AND name the mockup file, with the comparison table. "Fidelity PASS" with no attached image + no comparison table is not a valid PASS.
4. **No mockup? ** Then verify against the SPEC's described layout + the project design system (Hybrid+Navy tokens, framed blocks, RTL) — same blocking discipline, comparison is vs the design system instead of a pixel mockup.

Then wire the gate into the closure chain so it can't be skipped:
- **Iron Rule 34 (CLAUDE.md):** tighten the wording — closure requires the Localhost-Tester's Visual-Fidelity Gate PASS with embedded screenshot + mockup-vs-live comparison table; "Chrome MCP screenshot" alone (without the comparison verdict) is NOT sufficient.
- **Foreman closure checklist (opticup-strategic) + Reviewer (opticup-reviewer):** a UI SPEC's FOREMAN_REVIEW must contain the Localhost-Tester's fidelity verdict + the embedded comparison; without it, the Foreman cannot write 🟢.
- Keep edits surgical + append-style on governance files (Iron Rule 32 — don't delete sections).

**Architect's own rule (document it too):** the Architect never relays a UI 🟢 to Daniel from a text claim — only after seeing the embedded screenshot vs mockup. (This belongs in the architect skill / decisions; note it for the next architect-skill sweep.)

## 2. Part B — apply the gate to M5 (card + list) — fix + verify 1:1

Run the now-upgraded Localhost-Tester gate against BOTH M5 screens:

- **Customer card** — mockup: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html`
- **Customer list + create-mode** — mockup: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html`

For each: open live on localhost vs the mockup, find every gap, FIX it, re-verify 1:1.

**Known first gap (confirmed by the Architect):** `customers.html` does NOT `<link>` `css/customers.css` (the 266-line file with all the card/block/border/Navy styling). The JS renders correct classes (`cust-field-block`, `cust-field-row`, etc.) but unstyled. Fix: link the stylesheet. THEN re-compare — there may be more gaps the stylesheet-link reveals (missing header layout, badges, framed blocks, the "X orders / Y₪" summary, notes-with-dates, the queue strip on the card; the rich header on the list). Match the mockup region-by-region; do not stop at "CSS now loads" — stop at "looks like the mockup."

**This is a real fix, not paperwork.** Per memory `feedback_no_polish_by_validation`: if a screen already matches, prove it with the comparison; if it doesn't, ship the code that makes it match.

## 3. Closure gate (for THIS SPEC)

- Part A: the skill edits are in place; Iron Rule 34 + Foreman/Reviewer checklists reference the gate.
- Part B: M5 card + list each have an embedded live screenshot + mockup-vs-live comparison table showing 1:1 (or the remaining mismatches explicitly listed + fixed). The Architect reviews the screenshots before reporting to Daniel; Daniel sees them too.
- Demo only. No Prizma writes. No merge to main. Selective git add by explicit filename (NOT `-a`/`.`). Integrity gate clean.

## 4. Out of scope

- M6/M7/M8/M9 screens (don't exist yet — the gate applies to them when they're built).
- Re-opening M5 schema/logic (only the visual layer + the stylesheet link).
- The historical-customer import (cutover-time).

## 5. What Daniel has at the end

A team that **cannot close a UI screen without a real 1:1 mockup comparison** — the visual check is now a blocking gate owned by the Localhost-Tester, wired into Iron Rule 34 + the Foreman closure. And M5 card + list actually looking like their mockups, proven with screenshots Daniel can see.

---

*End of Brief. Durable visual-fidelity gate + M5 fix. The screen must match the mockup 1:1 before any UI closes.*
