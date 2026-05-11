# SPEC — M7_CENTER_REDESIGN_V7_VARIANTS

> **Location:** `modules/Module 7 - Orders/docs/specs/M7_CENTER_REDESIGN_V7_VARIANTS/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-11
> **Module:** 7 — Orders (in-design)
> **Phase:** Architecture-Brief artifact (pre-build)
> **Author signature:** Full-Auto Pipeline single-chat run, Opus 4.7

---

## 1. Goal

Produce ONE self-contained HTML file with 3 layout variants (A / B / C) of the M7 Orders screen center column — each preserving 100% of the v6 data and capabilities, each honoring Daniel's locked rules (2×2 type-picker on RIGHT of action-bar, scan + ONE "פתח קטלוג" on LEFT, vertical divider between them) — so Daniel can pick a winner that becomes v7 of the full mockup.

---

## 2. Background & Motivation

The v6 mockup (`M7_ORDERS_FULL_MOCKUP_V6.html`, 984 lines) stacks 9 center-column regions vertically at near-equal visual weight; Daniel reviewed and rejected the verticality. A prior attempt (`M7_ORDERS_CENTER_COLUMN_VARIANTS.html`, 861 lines, 3 variants — Tabs / Scan-first / Staged) was also rejected.

The Architect briefed (`M7_CENTER_REDESIGN_BRIEF.md` v1, 2026-05-11) 3 NEW variants with locked rules + a Continuous-Run Mandate (no mid-pipeline questions). This SPEC formalizes the brief for the Pipeline. Source-of-truth for design rules = §3 of the brief; this SPEC binds the brief to executable success criteria.

No prior FOREMAN_REVIEWs exist for Module 7 (in-design, first SPEC).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean at SPEC close | `git status` → "nothing to commit" |
| 2 | Deliverable file exists | `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` present, non-empty | `ls`, size > 30KB |
| 3 | 3 tabs (A / B / C) with sticky tab nav | 3 distinct tab buttons + sticky positioning | grep for tab labels + `position:sticky` |
| 4 | Each tab renders FULL 3-column M7 layout | header + cmdbar + right rail + center + left audit visible in every variant | grep for `.right-col`, `.center`, `.panel`, occurrence count = 3 each |
| 5 | 2×2 type-picker on RIGHT side of action-bar in ALL 3 variants | `grid-template-columns:1fr 1fr` (2 col) × 2 row layout, RIGHT-side positioning | grep `type-picker-2x2`, count = 3 |
| 6 | Scan zone + ONE "פתח קטלוג" on LEFT side of same action-bar in ALL 3 variants | one button labeled "פתח קטלוג" per variant (label adapts to active type) + scan input | grep for `פתח קטלוג`, count = 3 |
| 7 | Vertical divider between scan area and 2×2 | CSS `border-left` or `border-right` divider element inside action-bar in all 3 variants | grep for divider class |
| 8 | All 9 v6 data regions present in each variant | prescription / sub-order title / items / lens-pickers / so-print / so-msg / so-pricing / 2×2 picker / scan-zone | manual region-checklist in EXECUTION_REPORT |
| 9 | Variant A = two-pane work surface + sticky tools-strip | items+lens-pickers in wide pane, rx+pricing in narrow pane, so-print+so-msg as sticky bottom strip | structural inspection in REPORT |
| 10 | Variant B = 6 accordion sections, one open at a time | 6 `<details>` or accordion elements, JS toggle limits open=1, closed sections show 1-line summary | inspect HTML+JS |
| 11 | Variant C = items-on-top + 5-tab bar below | full-width items on top, tab-bar of 5 (עדשות / הדפסה / הודעות / תמחור / מרשם-מורחב), content responds to tab | inspect HTML+JS |
| 12 | Real v6 placeholder data preserved | "Cazal 1280", "Optimize Multifocal", "ליסקר דניאל", "9362", "₪1,800" all appear | grep checks |
| 13 | RTL + Hebrew | `<html lang="he" dir="rtl">` present | head -2 of file |
| 14 | Recommendation banner at file top | Banner naming the recommended variant + 1-sentence reason, visible before tab nav | grep for banner class/marker |
| 15 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` → 0 or 2 |
| 16 | Commits | 2 commits (deliverable + close/docs) | `git log` from start SHA |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read v6 mockup verbatim and copy/inline its CSS palette + header/cmdbar/right-rail/left-panel HTML structures into all 3 variants
- Within §3 brief rules: pick exact spacing, exact hex shades, exact JS interaction tone, fonts, micro-copy — all visual choices inside the rules are Executor's call
- Add minimal vanilla JS for: tab switching (A/B/C), accordion one-open-at-a-time (Variant B), tab-content switching (Variant C). No frameworks.
- Create `docs/MODULE_MAP.md`, `docs/SESSION_CONTEXT.md`, `docs/CHANGELOG.md` for Module 7 if they don't exist (Module 7 is still in-design — these stubs are appropriate at this stage)
- Commit + push to `develop` at the end

### What REQUIRES stopping and reporting
- Any deletion of `M7_ORDERS_FULL_MOCKUP_V6.html` or `M7_ORDERS_CENTER_COLUMN_VARIANTS.html` — Destructive Operations envelope is **None**
- Any rename anywhere
- Any change to a file outside Module 7 except `OPEN_TASKS.md` / `TECH_DEBT.md` if explicitly cited
- Integrity Gate exit 1 (null bytes) — STOP, escalate, do not commit
- Any of the 9 v6 regions cannot be embedded faithfully in one of the variants

---

## 5. Stop-on-Deviation Triggers

- If `npm run verify:integrity` exits 1 → STOP, write escalation
- If any of the 9 v6 regions is silently dropped from any variant → STOP
- If Variant rules in brief §3 cannot be honored (e.g. the 2×2 grid won't fit on the left of the divider in some browser viewport) → reduce visual size, do NOT change the layout intent; if still impossible, STOP and escalate
- If file ends up > 4000 lines → STOP and split would be a destructive op, not allowed (single-file deliverable is mandated)

---

## 6. Rollback Plan

Single-file additive change. Rollback = `git reset --hard a9f6db7` (start SHA) + `git push --force-with-lease origin develop` (only by Daniel; executor never force-pushes).

No DB changes. No schema changes. No deletes.

---

## 7. Out of Scope (explicit)

- The right column (sub-order rail + totals/payment panel) — copy verbatim from v6
- The left column (WhatsApp + history + tasks + audit log) — copy verbatim from v6
- The header + tabs + cmdbar — copy verbatim from v6
- All other M7 brief files — untouched
- `opticup-storefront` repo — untouched
- Any DB / Edge Function / migration — N/A

---

## 8. Expected Final State

### New files
- `modules/Module 7 - Orders/architecture-brief/M7_CENTER_REDESIGN_V7_VARIANTS.html` — the deliverable
- `modules/Module 7 - Orders/docs/specs/M7_CENTER_REDESIGN_V7_VARIANTS/EXECUTION_REPORT.md`
- `modules/Module 7 - Orders/docs/specs/M7_CENTER_REDESIGN_V7_VARIANTS/FINDINGS.md`
- `modules/Module 7 - Orders/docs/specs/M7_CENTER_REDESIGN_V7_VARIANTS/FOREMAN_REVIEW.md` (Foreman writes at end)

### New stub files (Module 7 first-ever docs/ population)
- `modules/Module 7 - Orders/docs/SESSION_CONTEXT.md` — one-line current status pointing at this deliverable
- `modules/Module 7 - Orders/docs/MODULE_MAP.md` — single artifact entry (the new HTML file)
- `modules/Module 7 - Orders/docs/CHANGELOG.md` — first entry: this SPEC

### Modified files (none beyond the new ones — Module 7 has no other docs)

### Deleted files
None.

### Build side-effects
None expected (no `npm run build` step in this SPEC).

### Docs updated
- N/A for `MASTER_ROADMAP.md` (M7 still in-design, no phase status change)
- N/A for `docs/GLOBAL_MAP.md` (no new shared functions/contracts)
- N/A for `docs/GLOBAL_SCHEMA.sql` (no DB)

---

## 9. Commit Plan

- Commit 1: `feat(m7): add M7_CENTER_REDESIGN_V7_VARIANTS with 3 layouts + recommendation banner` — adds the HTML + initial M7 docs/ stubs
- Commit 2: `chore(spec): close M7_CENTER_REDESIGN_V7_VARIANTS with retrospective` — adds EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW

---

## 10. Dependencies / Preconditions

- `M7_ORDERS_FULL_MOCKUP_V6.html` exists (verified: 984 lines)
- `M7_CENTER_REDESIGN_BRIEF.md` exists (verified: 125 lines)
- Integrity Gate baseline clean (verified during First Action / verified before commit)

### Browser readiness pre-flight
SPEC's QA is HTML inspection + integrity-gate + grep — **no browser required**. Localhost-Tester phase is INFORMATIONAL only for this deliverable (a static HTML mockup, no server interaction). The Localhost-Tester will record "N/A — static HTML mockup, no localhost surface to test" in TEST_REPORT.md.

---

## 11. Lessons Already Incorporated

- FROM SPEC_TEMPLATE §3 → "every criterion has an exact expected value" → APPLIED (16 criteria, all measurable).
- FROM SPEC_TEMPLATE §7 → "Out of scope must be explicit" → APPLIED.
- FROM Iron Rule 32 (Destructive Operations Gate, CLAUDE.md §6) → "every SPEC declares destructive ops" → APPLIED (§Destructive Operations below = None).
- FROM Pattern P35 (Architect skill) → "recommendation banner at the top of multi-variant mockups" → APPLIED (criterion §3 #14).
- Cross-Reference Check completed 2026-05-11 against `M7_ORDERS_FULL_MOCKUP_V6.html` + `M7_ORDERS_CENTER_COLUMN_VARIANTS.html`: 0 file-name collisions (target file `M7_CENTER_REDESIGN_V7_VARIANTS.html` is new and unique).

---

## 12. Destructive Operations

**None.** This SPEC is file-creation only. No deletes, renames, schema changes, mass operations, DROPs, TRUNCATEs, or governance-file truncations.

If the executor encounters a need for ANY destructive operation mid-run → STOP, write `modules/Module 7 - Orders/escalations/{ISO_TS}_M7_CENTER_REDESIGN_V7_VARIANTS.md`, emit ONE Hebrew line, halt.

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty.
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written.
- [ ] Module 7 SESSION_CONTEXT.md / MODULE_MAP.md / CHANGELOG.md stub created.
- [ ] FOREMAN_REVIEW.md written by Foreman after Executor closes.
