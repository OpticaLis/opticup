# Activation Prompt — Visual-Fidelity Gate + M5 Fix

> Paste into a Claude Code session (Chrome MCP + localhost required).
> Brief: `modules/Module 1.5 - Shared Components/architecture-brief/VISUAL_FIDELITY_GATE_BRIEF.md`

---

```
Two parts: (A) make visual fidelity vs the mockup a BLOCKING gate owned by the Localhost-Tester, wired into closure; (B) apply it to M5 card + list — fix them to match their mockups 1:1 and prove it with embedded screenshots. Context: the M5 card shipped 🟢 but rendered as bare unstyled text — customers.html never linked css/customers.css. "Chrome MCP fidelity PASS" was paperwork, not real. 2nd strike (1st = M1 lens). No screen closes again until someone actually compares it 1:1 to the mockup and blocks on mismatch.

Brief: modules/Module 1.5 - Shared Components/architecture-brief/VISUAL_FIDELITY_GATE_BRIEF.md

Activate `opticup-strategic` to author a SPEC at modules/Module 1.5 - Shared Components/docs/specs/VISUAL_FIDELITY_GATE/SPEC.md, then execute. Read the Brief end-to-end FIRST.

=== PART A — strengthen the Localhost-Tester (durable fix) ===
Edit .claude/skills/opticup-localhost-tester/SKILL.md — add a MANDATORY BLOCKING Visual-Fidelity Gate. For any SPEC touching a browser-consumed .html/.js/.css, before Localhost-Tester returns GREEN it MUST:
  1. Stylesheet/asset-linked first-load check — confirm the page <link>s every CSS + loads every JS it needs; a page rendering as unstyled raw text = automatic FAIL (this alone would have caught M5). Grep the HTML <head> for the module's own CSS; load fresh; confirm styled not raw.
  2. Mockup-vs-live 1:1 comparison — if a mockup exists: open the live screen on localhost in Chrome, screenshot it, open the mockup, compare REGION BY REGION (header / each block / each field row / badges / buttons / colors+tokens / spacing / RTL). Produce a feature-by-feature table: mockup-element → live-state → match/mismatch. ANY material mismatch = BLOCK, write the gaps, do NOT return GREEN.
  3. Embed the evidence — report MUST embed/link the live screenshot AND name the mockup file + the comparison table. "Fidelity PASS" with no image + no table is invalid.
  4. No mockup → compare vs SPEC layout + design system (Hybrid+Navy tokens, framed blocks, RTL), same blocking discipline.
Then wire it into closure (surgical, append-style — Iron Rule 32, don't delete sections):
  - CLAUDE.md Iron Rule 34: closure requires the Localhost-Tester Visual-Fidelity Gate PASS with embedded screenshot + mockup-vs-live table; a bare screenshot without the comparison verdict is NOT sufficient.
  - opticup-strategic (Foreman closure checklist) + opticup-reviewer: a UI SPEC's FOREMAN_REVIEW must carry the fidelity verdict + embedded comparison; without it the Foreman cannot write 🟢.
  - Note for next architect-skill sweep: the Architect never relays a UI 🟢 from a text claim — only after seeing the screenshot vs mockup (add to opticup-architect decisions/CROSS.md or pending-entries).

=== PART B — apply the gate to M5 card + list (fix + verify 1:1) ===
Run the upgraded gate against BOTH:
  - Card: modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html
  - List+create: modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html
For each: open live on localhost vs the mockup, find EVERY gap, FIX it, re-verify 1:1.
KNOWN FIRST GAP (Architect-confirmed): customers.html does NOT <link> css/customers.css (266 lines, all the card/block/border/Navy styling) → renders unstyled. Link it. THEN re-compare — there are likely MORE gaps the styling reveals (header layout + badges + framed blocks + "X orders/Y₪" summary + dated notes + queue strip on the card; the rich header on the list). Match region-by-region. Do NOT stop at "CSS loads" — stop at "looks like the mockup." Ship real code (memory feedback_no_polish_by_validation: prove match with the comparison, or ship the code that makes it match).

=== CLOSE ===
- Part A: skill edits in place; Iron Rule 34 + Foreman/Reviewer checklists reference the gate.
- Part B: M5 card + list each have an EMBEDDED live screenshot + mockup-vs-live comparison table showing 1:1 (or remaining mismatches listed + fixed), in TEST_REPORT + FOREMAN_REVIEW.
- opticup-reviewer → REVIEW.md; Foreman → FOREMAN_REVIEW.md. Update M5 SESSION_CONTEXT/CHANGELOG/ROADMAP.
Demo only. No Prizma writes. No merge to main. SELECTIVE git add by explicit filename — NOT git add . / commit -a (last session's commit -a swept unintended files). Integrity gate clean. Stop on deviation.

Return ONE Hebrew status line:
  "שער-נאמנות-ויזואלית הופעל [🟢]: בודק-Localhost חוסם כעת על חוסר-התאמה למוקאפ (Iron Rule 34 + Foreman). M5 כרטיס+רשימה תוקנו ואומתו 1:1 מול המוקאפים — צילומים מצורפים בדו\"ח. תעבור על הצילומים."
And report the localhost URLs + the screenshot file paths so the Architect + Daniel can review the 1:1 comparison.
```

---

## Pre-flight checklist for Daniel

- [ ] Claude Code on a machine with Chrome MCP + localhost runnable
- [ ] Branch = develop
- [ ] After it finishes: the report embeds card + list screenshots beside the mockups — Architect reviews, then you do

---

*End of activation prompt. Visual-fidelity gate becomes a blocking team rule + M5 fixed 1:1.*
