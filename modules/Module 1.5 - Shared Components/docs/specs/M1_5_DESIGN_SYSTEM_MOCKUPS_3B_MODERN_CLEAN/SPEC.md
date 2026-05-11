# SPEC — M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components
> **Phase:** 3b of 4 (Design System initiative)
> **Parent overview:** `../M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md`
> **Depends on:** Phase 2 ✅ CLOSED 2026-05-11 @ `c4f681c`
> **Sibling sub-phases:** 3a (Conservative), 3c (Bold) — INDEPENDENT, any order

---

## 1. Goal

Build the **Direction 2 — Modern-clean** branch: 13 module HTMLs + `INDEX.html` + `_tokens.css` (15 files) under `architecture-brief/design-system-mockups/direction-2-modern-clean/`. Modern-clean is the **airy SaaS-default** aesthetic — Notion / Linear default / modern fintech dashboards. Generous whitespace, soft shadows, rounded cards, larger fonts, low row density.

---

## 2. Background & Motivation

Sub-phase of Phase 3 (split for context budget). See parent SPEC for the why. Modern-clean is a substantive departure from Conservative — bigger base font (1.0rem vs 0.92rem), 4x larger shadows, rounder radii (12px vs 8px), looser spacing. The point is to give Daniel a CLEAR alternative to "today, but cleaner".

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at start | `develop`, clean modulo pre-existing dirt | `git status` |
| 2 | Phase 2 closed | retros present | `ls "modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/"` shows EXECUTION_REPORT + FINDINGS |
| 3 | Total commits produced | 5 | `git log origin/develop..HEAD --oneline \| wc -l` → 5 |
| 4 | Direction folder created | exists with 15 files | `ls .../direction-2-modern-clean/ \| wc -l` → 15 |
| 5 | `_tokens.css` ≤ 200 lines | ≤ 200 | `wc -l` |
| 6 | `_tokens.css` overrides body font-size to 1.0rem | matches | `grep -E "^\s*--font-size-md:\s*1\.0rem" .../direction-2-modern-clean/_tokens.css` exit 0 |
| 7 | `_tokens.css` overrides radius-md to 12px | matches | `grep -E "^\s*--radius-md:\s*12px" .../direction-2-modern-clean/_tokens.css` exit 0 |
| 8 | `_tokens.css` overrides space-md to 16px | matches | `grep -E "^\s*--space-md:\s*16px" .../direction-2-modern-clean/_tokens.css` exit 0 |
| 9 | All 13 module HTMLs present | 13 files | `ls .../direction-2-modern-clean/M*.html \| wc -l` → 13 |
| 10 | INDEX.html present, links 13 modules | 13 hrefs | `grep -cE 'href="\./M[0-9]+-' .../INDEX.html` → 13 |
| 11 | INDEX has NO Prizma override toggle | direction 2 omits it (only Direction 1 has the sample) | `grep -c "Prizma sample" .../direction-2-modern-clean/INDEX.html` → 0 |
| 12 | No hardcoded hex inline style | 0 | `grep -rE 'style="[^"]*#[0-9a-fA-F]{3,8}' .../direction-2-modern-clean/ \| grep -v _tokens.css \| wc -l` → 0 |
| 13 | RTL + UTF-8 on every HTML | all 14 | grep `lang="he" dir="rtl"` |
| 14 | No runtime JS in production-sourced HTMLs | 0 references | `grep -rE 'shared\.js\|supabase-js\|window\.sb' .../direction-2-modern-clean/M{1-inventory,3-storefront-studio,4-crm}.html` empty |
| 15 | Sketch preservation (M5-M15) | DOM tree matches source | DEFERRED to Localhost-Tester |
| 16 | INDEX opens without errors | 0 console errors | DEFERRED to Localhost-Tester |
| 17 | Anti-blandness: Modern-clean visibly LOWER density than Conservative | ~10 rows per 1080 viewport on table-heavy modules vs ~14 in D1 | DEFERRED to Localhost-Tester comparison snapshot |
| 18 | Docs updated | Phase 3b entries | grep |
| 19 | EXECUTION_REPORT + FINDINGS present | yes | `ls` |
| 20 | Integrity Gate | exit 0 or 2 | `npm run verify:integrity` |
| 21 | Smoke pass | 7/7, exit 0 | `npm run smoke` |
| 22 | HEAD pushed | yes | `git rev-parse` |
| 23 | Clean tree at close | empty modulo pre-existing | `git status --short` |

---

## 4. Autonomy Envelope

Per parent SPEC + sub-phase 3a §4. Same envelope: CAN create the 15 new files under the direction-2 folder; CANNOT touch `shared/`, parent SPEC, or sibling sub-phases.

---

## 5. Stop-on-deviation triggers

Per parent + sub-phase 3a §5. Plus:
- If `_tokens.css` doesn't differ visibly from Direction 1 — STOP. Modern-clean MUST visually feel different.

---

## 6. Rollback Plan

`git reset --hard {START_COMMIT}` — no DB or shared-file changes.

---

## 7. Out of Scope

Per parent. Plus: Direction 1, Direction 3, their _tokens.css.

---

## 8. Expected Final State

### New folder
```
architecture-brief/design-system-mockups/
└── direction-2-modern-clean/
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
   _tokens.css — Direction 2: Modern-clean
   ============================================================================= 
   Notion / Linear default / modern fintech. Generous whitespace, soft shadows,
   rounded cards, larger base font, low information density.
   ============================================================================= */

:root {
  /* Typography — larger base */
  --font-size-md:  1.0rem;
  --font-size-sm:  0.92rem;
  --font-size-lg:  1.18rem;
  --font-size-xl:  1.5rem;
  --font-size-2xl: 1.9rem;

  /* Spacing — looser */
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;

  /* Radii — rounder */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Shadows — softer + bigger */
  --shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 24px 64px rgba(15, 23, 42, 0.10);

  /* Subtle off-white page bg — softens contrast */
  --color-bg-page: #fafafa;
}
```

### INDEX.html structure
Per parent SPEC §5 template. Direction 2 OMITS the Prizma-toggle script (only Direction 1 has the sample, per parent §5).

### Staticization rules per HTML
Per parent §3 (production-sourced M1/M3/M4) + §3 (mockup-sourced M5-M15). Same stylesheet chain per parent §4.

### Modified files (docs)
- M1.5 MODULE_MAP, CHANGELOG, SESSION_CONTEXT — Phase 3b entries.
- MASTER_ROADMAP — Phase 3b close line.

### File classification
- **MUST-EDIT:** 15 new files under direction-2 folder + 4 docs + EXECUTION_REPORT + FINDINGS.
- **MAY-EDIT:** none.
- **VERIFY-ONLY:** parent SPEC, sibling sub-phases 3a + 3c, all source-of-truth files, `shared/`, `css/`, root `*.html`.

---

## 9. Commit Plan

- **Commit 1** — `feat(design-system): direction-2-modern-clean scaffold — _tokens.css + INDEX.html`
- **Commit 2** — `feat(design-system): direction-2 module HTMLs — M1, M3-studio, M4, M5, M6`
- **Commit 3** — `feat(design-system): direction-2 module HTMLs — M7, M8, M9, M11, M12`
- **Commit 4** — `feat(design-system): direction-2 module HTMLs — M13, M14, M15 + docs`
- **Commit 5** — `chore(spec): close M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN with retrospective`

(Single push after Commit 5.)

---

## 10. Dependencies / Preconditions

- Phase 2 CLOSED ✅.
- All 13 source files in parent §2 exist.
- No dependency on 3a or 3c.

---

## 11. Lessons Already Incorporated

Same set as 3a §11. Plus:
- **Direction-distinctness rule:** if Modern-clean visually equals Conservative when rendered, the sub-SPEC fails by the brief's "3 substantively different" rule (brief §8). The `_tokens.css` deltas in §8 above are deliberately chosen to create visible difference at-a-glance.

**Cross-Reference Check:** 0 collisions on new file names under brand-new direction-2 folder.

---

## 12. Pre-Merge Checklist

- [ ] §3 criteria pass.
- [ ] Integrity Gate exit 0/2.
- [ ] Clean tree.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS.
- [ ] M1.5 docs + MASTER_ROADMAP touched.
- [ ] INDEX opens cleanly in Chrome.
- [ ] Direction visibly differs from Direction 1 (airy vs production-density).

---

## 13. Hand-off

After 🟢: Direction 2 browsable. 3a / 3c still needed before Phase 4 can run.
