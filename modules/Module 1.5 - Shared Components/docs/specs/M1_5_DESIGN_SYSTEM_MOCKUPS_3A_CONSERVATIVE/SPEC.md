# SPEC — M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-11 (Phase 3 split into 3a/3b/3c per Daniel directive)
> **Module:** 1.5 — Shared Components
> **Phase:** 3a of 4 (Design System initiative)
> **Parent overview:** `../M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md` — shared canonical-source table, staticization rules, stylesheet chain, direction definitions, INDEX template
> **Depends on:** Phase 2 (`M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY`) ✅ CLOSED 2026-05-11 @ `c4f681c`
> **Sibling sub-phases:** 3b (Modern-clean), 3c (Bold dense-pro-tool) — INDEPENDENT, can run in any order or in parallel chats

---

## 1. Goal

Build the **Direction 1 — Conservative** branch of the Phase 3 comparison tree: 13 module HTMLs + `INDEX.html` + `_tokens.css` (= 15 files) under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/`. Conservative is "just like today, but cleaner" — production-like density, current Heebo font, current radii/shadows. INDEX.html includes a **Prizma override sample toggle** (`?tenant=prizma` → injects Indigo `--color-*` on `:root`) demonstrating tenant override in-line.

---

## 2. Background & Motivation

Phase 3 was originally one SPEC requiring 45 deliverables (all 3 directions in one executor run). Mid-execution Daniel split it into 3 sub-phases so each runs in a fresh chat with clean context budget. This is sub-phase 3a. Sub-phases 3b + 3c can run in any order — each direction is self-contained under its own folder. Phase 4 ('which direction wins?') only unblocks when ALL THREE are 🟢 CLOSED.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at start | `develop`, clean (modulo pre-existing dirt) | `git status` |
| 2 | Phase 2 SPEC closed | retros present | `ls "modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/" \| grep -E "EXECUTION_REPORT\|FINDINGS"` ≥ 2 |
| 3 | Total commits produced | 5 (tokens+INDEX, M1-M5 batch, M6-M11 batch, M12-M15 + docs, retro) | `git log origin/develop..HEAD --oneline \| wc -l` → 5 |
| 4 | Direction folder created | exists | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/"` → 15 files |
| 5 | `_tokens.css` exists ≤ 200 lines | ≤ 200 | `wc -l ".../direction-1-conservative/_tokens.css"` ≤ 200 |
| 6 | `_tokens.css` is essentially comments + minimal overrides | Direction 1 inherits platform defaults — `_tokens.css` body has 0 active token overrides (only header comment + reserved-for-future-overrides block) | grep |
| 7 | All 13 module HTMLs present | 13 files | `ls .../direction-1-conservative/M*.html \| wc -l` → 13 |
| 8 | INDEX.html present | exists | `ls .../direction-1-conservative/INDEX.html` |
| 9 | INDEX.html links to all 13 modules | 13 hrefs to ./M*.html | `grep -cE 'href="\./M[0-9]+-' .../INDEX.html` → 13 |
| 10 | INDEX.html includes Prizma override toggle | "Prizma sample" string present + `?tenant=prizma` parameter logic | `grep -c "Prizma sample" .../INDEX.html` ≥ 1 |
| 11 | No hardcoded hex outside `_tokens.css` (inline style attr) | 0 | `grep -rE 'style="[^"]*#[0-9a-fA-F]{3,8}' .../direction-1-conservative/ \| grep -v '_tokens.css' \| wc -l` → 0 |
| 12 | Each HTML has `<html lang="he" dir="rtl">` | all 14 HTMLs (13 + INDEX) | `for f in .../direction-1-conservative/*.html; do grep -c 'lang="he" dir="rtl"' "$f"; done` all ≥ 1 |
| 13 | No runtime JS in production-sourced HTMLs | M1/M3/M4 have 0 references to `shared.js` / `supabase` / `window.sb` | `grep -rE 'shared\.js\|supabase-js\|window\.sb' .../direction-1-conservative/M{1-inventory,3-storefront-studio,4-crm}.html` empty |
| 14 | Sketch preservation (M5-M15) | DOM tree structure matches source mockup (element-tag sequence ignoring class names and inline styles) | Localhost-Tester or manual spot-check; SPEC author CANNOT enforce this from grep alone — DEFERRED to verification |
| 15 | INDEX opens cleanly in Chrome | 0 console errors, iframe loads first module | DEFERRED to Localhost-Tester |
| 16 | M1.5 SESSION_CONTEXT + CHANGELOG + MASTER_ROADMAP updated | Phase 3a entries present | grep each |
| 17 | EXECUTION_REPORT + FINDINGS present | yes | `ls` |
| 18 | Integrity Gate | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 19 | Smoke test pass | exit 0, 7/7 | `npm run smoke` |
| 20 | HEAD pushed | yes | `git rev-parse HEAD` === `git rev-parse origin/develop` |
| 21 | Clean tree at SPEC close | empty modulo pre-existing | `git status --short` |
| 22 | Direction 1 anti-blandness check | inventory HTML row density similar to current production (~14 rows per 1080 viewport) | DEFERRED to Localhost-Tester visual check |

---

## 4. Autonomy Envelope

### Executor CAN
- Read every file under parent SPEC §2 canonical-source list.
- Create all 15 new files under `direction-1-conservative/` per parent §3 (staticization rules) + §4 (stylesheet chain) + §5 (INDEX template).
- Run `npm run smoke`, `npm run verify:integrity`.
- Commit + push per §9.
- Apply executor-skill proposals from Phase 1 + Phase 2 FINDINGS (regex sanity-test, scope-creep classification).
- **Adjacent-bug fix policy (Phase 2 Executor Proposal 2):** when copying a source mockup that contains a stale variable reference (e.g. `var(--g100)` like table.css had), promote to canonical name in the new direction-1 file. ONE such fix per HTML allowed; multi-fix → STOP and report.

### REQUIRES stopping
- Any source-of-truth file in parent §2 doesn't exist at execution start → STOP, report rename.
- Any file under `shared/css/` or `shared/js/` modified → STOP (those are Phase 1 + Phase 2 territory).
- A direction-1 module HTML modifies the source mockup's element-tag sequence (sketch-preservation violated) → STOP.
- INDEX.html broken (missing tab, dead link, console error on load) → STOP.
- Any HTML retains `<script src="...">` references to Supabase / shared.js / auth-service (for production-sourced M1/M3-Studio/M4) → STOP.
- Combined output of the direction folder exceeds 30,000 lines (sanity guard against runaway copy) → STOP.

---

## 5. Stop-on-deviation triggers (in addition to parent + CLAUDE.md §9)

- If parent SPEC's §2 source-file table doesn't match disk reality → STOP.
- If any direction-1 HTML loads a stylesheet from a path other than the parent §4 chain → STOP.
- If a Hebrew text element from the source mockup appears mangled (encoding issue) → STOP.

---

## 6. Rollback Plan

If SPEC fails partway:
1. `git reset --hard {START_COMMIT}` — START_COMMIT in EXECUTION_REPORT §1.
2. No DB / no shared file changes → no other rollback needed.
3. Notify Foreman; SPEC marked REOPEN.

---

## 7. Out of Scope

Per parent SPEC §7. Plus:
- Direction 2 / Direction 3 — those are sub-phases 3b / 3c.
- Any modification of source-of-truth files (verify-only).

---

## 8. Expected Final State

### New folder

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/
└── direction-1-conservative/
    ├── _tokens.css          (header comment + intentionally-empty overrides block — Conservative uses platform defaults)
    ├── INDEX.html           (top bar with 3-direction switch + Prizma override toggle, left nav with 13 modules, iframe preview)
    ├── M1-inventory.html
    ├── M3-storefront-studio.html
    ├── M4-crm.html
    ├── M5-customers.html
    ├── M6-prescriptions.html
    ├── M7-orders.html
    ├── M8-payments.html
    ├── M9-lab-kds.html
    ├── M11-reports.html
    ├── M12-communications.html
    ├── M13-loyalty.html
    ├── M14-appointments.html
    └── M15-queue.html
```

### `_tokens.css` content (for Direction 1)

```css
/* =============================================================================
   _tokens.css — Direction 1: Conservative
   ============================================================================= 
   "Just like today, but cleaner." Production-like density. Familiar to existing
   Prizma users. Uses platform defaults from shared/css/variables.css unchanged
   — this file is intentionally minimal. The Prizma override sample lives in
   INDEX.html (toggle via ?tenant=prizma).
   ============================================================================= */

:root {
  /* No active overrides — Conservative inherits everything from variables.css. */
  /* If user toggles Prizma sample, INDEX.html injects --color-* Indigo values. */
}
```

### INDEX.html template (Direction 1 specific — includes Prizma toggle script)

See parent SPEC §5 for the structural template. Direction 1's INDEX additionally contains:

```html
<script>
  // Prizma override sample — Direction 1 only
  const params = new URLSearchParams(window.location.search);
  if (params.get('tenant') === 'prizma') {
    const root = document.documentElement;
    root.style.setProperty('--color-primary',       '#4f46e5');
    root.style.setProperty('--color-primary-hover', '#4338ca');
    root.style.setProperty('--color-primary-light', '#eef2ff');
    root.style.setProperty('--color-primary-dark',  '#3730a3');
  }
</script>
```

### Modified files
- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` — append "Phase 3a: direction-1-conservative built (13 modules + INDEX + _tokens)."
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — Phase 3a section.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — Last-updated + Phase 3a section.
- `MASTER_ROADMAP.md` — Phase 3a close line.

### DB state
No DB changes.

### File classification
- **MUST-EDIT:** 15 new files in direction-1 folder, 4 docs files, EXECUTION_REPORT, FINDINGS.
- **MAY-EDIT:** none.
- **VERIFY-ONLY:** every source-of-truth file (13 listed in parent §2), every file under `shared/`, every file in `css/`, every `*.html` at repo root, every other module's `architecture-brief/`, the storefront repo, sub-SPEC folders 3b + 3c.

---

## 9. Commit Plan

- **Commit 1** — `feat(design-system): direction-1-conservative scaffold — _tokens.css + INDEX.html`
- **Commit 2** — `feat(design-system): direction-1 module HTMLs — M1, M3-studio, M4, M5, M6 (5 modules)`
- **Commit 3** — `feat(design-system): direction-1 module HTMLs — M7, M8, M9, M11, M12 (5 modules)`
- **Commit 4** — `feat(design-system): direction-1 module HTMLs — M13, M14, M15 (3 modules) + docs (MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP)`
- **Commit 5** — `chore(spec): close M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE with retrospective`

(Single push after Commit 5.)

---

## 10. Dependencies / Preconditions

- Phase 2 SPEC CLOSED ✅.
- All 13 source-of-truth files (parent §2) exist on disk — executor MUST `ls` each at Step 1.5 and STOP if missing.
- `npm run smoke` was green at Phase 2 close.
- No dependency on 3b / 3c — INDEPENDENT sub-phase.

---

## 11. Lessons Already Incorporated

- FROM Phase 1 + 2 author-drift findings → APPLIED throughout §3 criteria (regex char-class includes digits; literal substrings in §3 cross-checked against §8).
- FROM `M4_HARDCODED Executor Proposal 2` → APPLIED in §8 MUST/MAY/VERIFY classification.
- FROM Phase 2 Executor Proposal 2 (scope-creep boundary) → APPLIED in §4 autonomy envelope ("one adjacent fix per file").
- FROM Phase 2 Executor Proposal 1 (regex sanity-test) → APPLIED — every grep criterion in §3 was tested at SPEC-author time against the expected outcome.

**Cross-Reference Check (Iron Rule 21):** New names introduced: 15 file names under a brand-new folder `design-system-mockups/direction-1-conservative/`. Grep against repo for each name → 0 collisions (folder is brand-new). **0 collisions / 0 hits resolved.**

---

## 12. Pre-Merge Checklist

- [ ] All §3 criteria pass; values in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate exit 0 or 2.
- [ ] `git status --short` empty modulo pre-existing.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS present.
- [ ] M1.5 docs + MASTER_ROADMAP updated.
- [ ] INDEX opens in Chrome cleanly with first module iframed.

---

## 13. Hand-off

After 🟢 closure:
- Direction 1 is browsable at `architecture-brief/design-system-mockups/direction-1-conservative/INDEX.html`.
- Daniel can preview, but should NOT pick a winner until 3b + 3c are also closed (Phase 4 owns the comparison).
- 3b + 3c can run in any order, in fresh chats.
