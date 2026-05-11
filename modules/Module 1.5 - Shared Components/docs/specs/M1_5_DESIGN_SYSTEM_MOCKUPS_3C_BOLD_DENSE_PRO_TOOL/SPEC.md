# SPEC — M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components
> **Phase:** 3c of 4 (Design System initiative)
> **Parent overview:** `../M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md`
> **Depends on:** Phase 2 ✅ CLOSED 2026-05-11 @ `c4f681c`
> **Sibling sub-phases:** 3a (Conservative), 3b (Modern-clean) — INDEPENDENT, any order

---

## 1. Goal

Build the **Direction 3 — Bold (dense-pro-tool)** branch: 13 module HTMLs + `INDEX.html` + `_tokens.css` (15 files) under `architecture-brief/design-system-mockups/direction-3-bold-dense-pro-tool/`. Bold is the **Linear / Bloomberg / terminal-for-power-users** aesthetic — maximum information density, small fonts (~12.5px body), tight padding, sharp 1px borders instead of soft shadows, monospace numerals where they read better. Daniel-locked direction axis 2026-05-10.

---

## 2. Background & Motivation

Sub-phase of Phase 3 (split for context budget). Bold is the **biggest visual departure** from Conservative — substantively different per brief §8 ("don't show Daniel 3 variations of the same idea"). The whole point is keyboard-first, info-dense aesthetic for ERP power users who scan tables fast.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at start | develop, clean modulo pre-existing | `git status` |
| 2 | Phase 2 closed | retros present | `ls .../M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/` |
| 3 | Total commits | 5 | `git log --oneline \| wc -l` → 5 |
| 4 | Direction folder with 15 files | exists | `ls .../direction-3-bold-dense-pro-tool/ \| wc -l` → 15 |
| 5 | `_tokens.css` ≤ 200 lines | ≤ 200 | `wc -l` |
| 6 | `_tokens.css` overrides body font to 0.78rem | matches | `grep -E "^\s*--font-size-md:\s*0\.78rem" .../direction-3-bold-dense-pro-tool/_tokens.css` exit 0 |
| 7 | `_tokens.css` overrides radius-md to 2px (sharp) | matches | `grep -E "^\s*--radius-md:\s*2px" .../direction-3-bold-dense-pro-tool/_tokens.css` exit 0 |
| 8 | `_tokens.css` overrides space-md to 6px (tight) | matches | `grep -E "^\s*--space-md:\s*6px" .../direction-3-bold-dense-pro-tool/_tokens.css` exit 0 |
| 9 | `_tokens.css` defines monospace-numerals helper | exists | `grep -c "tabular-nums" .../direction-3-bold-dense-pro-tool/_tokens.css` ≥ 1 |
| 10 | All 13 module HTMLs present | 13 | `ls .../direction-3-bold-dense-pro-tool/M*.html \| wc -l` → 13 |
| 11 | INDEX links 13 modules | 13 hrefs | `grep -cE 'href="\./M[0-9]+-' .../INDEX.html` → 13 |
| 12 | INDEX has NO Prizma toggle | 0 | `grep -c "Prizma sample" .../direction-3-bold-dense-pro-tool/INDEX.html` → 0 |
| 13 | No hardcoded hex inline style | 0 | `grep -rE 'style="[^"]*#[0-9a-fA-F]{3,8}' .../direction-3-bold-dense-pro-tool/ \| grep -v _tokens.css \| wc -l` → 0 |
| 14 | RTL + UTF-8 on every HTML | all 14 | grep |
| 15 | No runtime JS in production-sourced HTMLs | 0 | grep `shared\.js\|supabase-js\|window\.sb` |
| 16 | Sketch preservation (M5-M15) | DOM tree matches source | DEFERRED to Localhost-Tester |
| 17 | INDEX opens without errors | 0 console errors | DEFERRED |
| 18 | **Anti-blandness Bold check:** density on inventory module ≥ 22 rows / 1080 viewport | density visibly highest of all 3 directions | DEFERRED to Localhost-Tester snapshot comparison |
| 19 | Docs updated | Phase 3c entries | grep |
| 20 | EXECUTION_REPORT + FINDINGS present | yes | `ls` |
| 21 | Integrity Gate | exit 0 or 2 | `npm run verify:integrity` |
| 22 | Smoke pass | 7/7, exit 0 | `npm run smoke` |
| 23 | HEAD pushed | yes | `git rev-parse` |
| 24 | Clean tree at close | empty modulo pre-existing | `git status --short` |

---

## 4. Autonomy Envelope

Per parent + 3a §4. Same envelope.

**Special note for Direction 3:** the 0.78rem base font + 6px space-md + 2px radius will visibly cramp content vs Conservative. The executor MUST resist temptation to "loosen up Direction 3 because it looks too tight" — that's the design intent. Linear's actual production app uses ~13px body and tighter spacing. If the rendered output looks dense, that's success, not failure.

---

## 5. Stop-on-deviation triggers

Per parent + 3a §5. Plus:
- If Direction 3 ends up visually similar to Direction 2 — STOP. The directions must be substantively distinct.
- If a Hebrew text in Bold direction's tighter spacing collides visually with adjacent elements at 1080 viewport — STOP, escalate to Foreman for token tuning.

---

## 6. Rollback Plan

`git reset --hard {START_COMMIT}` — no DB / no shared file changes.

---

## 7. Out of Scope

Per parent. Plus: Direction 1, Direction 2, their _tokens.css.

---

## 8. Expected Final State

### New folder
```
architecture-brief/design-system-mockups/
└── direction-3-bold-dense-pro-tool/
    ├── _tokens.css
    ├── INDEX.html
    └── M1-inventory.html, M3-storefront-studio.html, M4-crm.html, M5-customers.html,
        M6-prescriptions.html, M7-orders.html, M8-payments.html, M9-lab-kds.html,
        M11-reports.html, M12-communications.html, M13-loyalty.html,
        M14-appointments.html, M15-queue.html
```

### `_tokens.css` content

```css
/* =============================================================================
   _tokens.css — Direction 3: Bold (dense-pro-tool)
   ============================================================================= 
   "Terminal for power users." Linear / Bloomberg aesthetic. Maximum information
   density, small fonts, tight padding, sharp 1px borders instead of soft shadows.
   Daniel-locked direction axis 2026-05-10.
   ============================================================================= */

:root {
  /* Typography — pro-tool small, restrained weight scale */
  --font-size-md:  0.78rem;   /* ~12.5px body */
  --font-size-sm:  0.72rem;
  --font-size-lg:  0.92rem;
  --font-size-xl:  1.15rem;
  --font-size-2xl: 1.4rem;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;

  /* Spacing — tight */
  --space-xs:  2px;
  --space-sm:  4px;
  --space-md:  6px;
  --space-lg:  10px;
  --space-xl:  14px;
  --space-2xl: 20px;

  /* Radii — sharp */
  --radius-sm:   2px;
  --radius-md:   2px;
  --radius-lg:   4px;
  --radius-full: 9999px;

  /* Shadows — minimal, border-like (1px lines instead of soft glow) */
  --shadow-sm: 0 0 0 1px rgba(15, 23, 42, 0.08);
  --shadow-md: 0 1px 2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 4px 8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.12);

  /* Subtle off-white page bg — terminal-ish */
  --color-bg-page: #fafafa;
}

/* Monospace numerals helper — apply [data-numeric] to currency cells, counts, dates */
[data-numeric],
.tb-td-currency,
.tb-td-number,
.tb-td-date {
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}
</syntaxhighlight>
```

(Note: the closing tag above is intentional markdown-fence-close-syntax-of-the-SPEC; the actual `_tokens.css` content runs from `/* ===` through the end of the `[data-numeric]` block.)

### INDEX.html structure
Per parent §5 template. Direction 3 OMITS the Prizma-toggle (only Direction 1 has it).

### Staticization rules per HTML
Per parent §3 + §4. Same chain.

### Modified files (docs)
- M1.5 MODULE_MAP, CHANGELOG, SESSION_CONTEXT — Phase 3c entries.
- MASTER_ROADMAP — Phase 3c close line.

### File classification
- **MUST-EDIT:** 15 new direction-3 files + 4 docs + EXECUTION_REPORT + FINDINGS.
- **MAY-EDIT:** none.
- **VERIFY-ONLY:** parent SPEC, sibling sub-phases 3a + 3b, all source-of-truth files, `shared/`, `css/`, root `*.html`.

---

## 9. Commit Plan

- **Commit 1** — `feat(design-system): direction-3-bold scaffold — _tokens.css + INDEX.html`
- **Commit 2** — `feat(design-system): direction-3 module HTMLs — M1, M3-studio, M4, M5, M6`
- **Commit 3** — `feat(design-system): direction-3 module HTMLs — M7, M8, M9, M11, M12`
- **Commit 4** — `feat(design-system): direction-3 module HTMLs — M13, M14, M15 + docs`
- **Commit 5** — `chore(spec): close M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL with retrospective`

(Single push after Commit 5.)

---

## 10. Dependencies / Preconditions

- Phase 2 CLOSED ✅.
- All 13 source files exist.
- No dependency on 3a or 3b.

---

## 11. Lessons Already Incorporated

Same as 3a + 3b. Plus:
- **Daniel's locked direction axis (2026-05-10):** Bold = dense-pro-tool. NOT brutalist, NOT high-contrast, NOT something else. The Bold sub-axis question from brief §7 was resolved.
- **Resist looseness:** if rendered Direction 3 feels uncomfortably dense, that's the SPEC intent. Linear-default uses similar density. Don't widen `_tokens.css` spacing values.

**Cross-Reference Check:** 0 collisions on new file names.

---

## 12. Pre-Merge Checklist

- [ ] §3 criteria pass.
- [ ] Integrity Gate exit 0/2.
- [ ] Clean tree.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS.
- [ ] Docs updated.
- [ ] INDEX opens cleanly in Chrome.
- [ ] Direction visibly DENSEST of all 3 — table-heavy modules show ≥ 22 rows / 1080 viewport.

---

## 13. Hand-off

After 🟢: Direction 3 browsable. Once all of 3a + 3b + 3c are 🟢, Phase 4 unblocks. Phase 4 STOPS to ask Daniel which direction wins.
