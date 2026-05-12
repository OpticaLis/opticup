# Sketch Revision Batch 3 — M5/M6/M8/M11/M12/M14/M15 Re-Skin to Hybrid+Navy

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 1.5 — Shared Components (cross-module sketches revision)

---

## 1. Purpose

The architecture-brief sketches for M5/M6/M8/M11/M12/M14/M15 were authored 2026-05-06 through 2026-05-10 — BEFORE the Hybrid+Navy design system was sealed. All 7 use the legacy palette (`#26215C` purple-deep header + multi-color accents: purple/teal/amber/blue/coral/pink/green). This is the same palette that M7 v6 used and that Daniel rejected in favor of Hybrid+Navy.

This brief authorizes a batch re-skin of all 7 sketches to align with the canonical design system. Layout, information architecture, components, and content stay 100% intact — only visual tokens change.

This is NOT a re-design. It is a re-skin. Structure preservation is the central rule.

## 2. Scope — In

### Modules covered (7 — exactly these, no more, no less)

| Module | Files to re-skin |
|---|---|
| M5 Customers | `M5_CUSTOMER_CARD_MOCKUP.html`, `M5_CUSTOMERS_LIST_MOCKUPS.html` |
| M6 Prescriptions | `M6_PRESCRIPTION_EDITOR_MOCKUP.html` |
| M8 Payments | `M8_CHECKOUT_MOCKUP_V3.html`, `M8_CHECKS_PIPELINE_MOCKUP_V1.html`, `M8_DAILY_CLOSE_MOCKUP_V2.html`, `M8_PROVIDER_CONFIG_MOCKUP_V2.html` |
| M11 Reports | `M11_REPORTS_LIST_MOCKUP.html`, `M11_REPORT_EDITOR_MOCKUP.html`, `M11_REPORT_VIEW_MOCKUP.html` |
| M12 Communications | `M12_CHANNEL_CONFIGS_MOCKUP.html`, `M12_CUSTOMER_HISTORY_MOCKUP.html`, `M12_TEMPLATES_MOCKUP.html`, `M12_WHATSAPP_INBOX_MOCKUP.html` |
| M14 Appointments | `M14_APPOINTMENTS_MOCKUP.html`, `M14_APPOINTMENTS_SCREENS.html` |
| M15 Queue | `M15_QUEUE_MOCKUP.html` |

Total: **17 mockup files** across 7 modules.

### What changes (re-skin scope)

For each file, the Pipeline performs these transformations only:

1. **Replace the legacy CSS token block** (the `:root { --purple:#534AB7; ... }` style declarations near top of each file) with the Hybrid+Navy token set:
   - Backgrounds: `--bg-page: #fafaf7` (warm off-white), `--bg-surface: #ffffff`, `--bg-surface-alt: #f4f4f5`
   - Accent: `--accent: #1e3a8a` (Navy), `--accent-hover: #1e40af`, `--accent-soft: #e6f1fb`
   - Text: `--text-primary: #0f172a`, `--text-secondary: #475569`, `--text-tertiary: #94a3b8`
   - Borders: `--border-subtle: #e2e8f0`, `--border-default: #cbd5e1`
   - Typography: sans-serif Heebo + Inter only (no serif anywhere)
   - Semantic colors (success/warning/danger/info) kept as in Hybrid spec
   - Reference: `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/_tokens.css`

2. **Replace the dark `--purple-deep` header** with a light Navy header treatment, OR replace with sidebar pattern (per Hybrid):
   - Where the legacy mockup uses `--purple-deep` as header bg → swap to white surface header with Navy accent stripe + Navy text on the brand mark.
   - DO NOT convert top-bar layouts to sidebar layouts in this batch — that would be a re-design. Keep the layout pattern of each file. Only swap the dark header bg for a light one with Navy treatment.

3. **Sweep ALL `--purple-deep` / `--purple` / `--purple-soft` references** in each file's CSS and inline styles → map to the closest Hybrid equivalent:
   - `--purple` (primary accent) → `--accent` (#1e3a8a Navy)
   - `--purple-soft` (badge bg / selected row bg) → `--accent-soft` (#e6f1fb)
   - `--purple-deep` (dark text on light bg) → `--text-primary` (#0f172a)
   - `--purple-deep` (dark bg with light text) → `--accent` (#1e3a8a) with `#ffffff` text

4. **Sweep decorative multi-color accents** (`--coral`, `--pink`, `--amber-deep`, `--green-deep` used decoratively, NOT semantically) → unify to neutral grays or to `--accent-soft`. Keep colors only where they encode semantic state (success/warning/danger/info badges).

5. **Replace serif font references** (if any) with `var(--font-sans)`.

6. **Preserve everything else verbatim:**
   - All HTML structure (DOM tree)
   - All text content
   - All placeholder data (customer names, brand names, prices, etc.)
   - All JS behavior
   - All grid/flex layout
   - All padding/margin/border-radius values
   - All component patterns (cards, pills, tabs, accordions, etc.)

### What does NOT change (structure preservation)

- **No layout changes.** If a file uses topbar → keep topbar. If sidebar → keep sidebar. Only the color treatment of those patterns changes.
- **No section additions or removals.** All sections from the original remain.
- **No new components.** Re-skin uses Hybrid tokens applied to existing components.
- **No file moves or renames.** Files stay in their current paths with their current names.

## 3. Scope — Out

- **M7 Orders.** Already done (V7 = Variant A).
- **M9 Lab/KDS.** Has no sketches at all. Separate Batch (sketches-from-scratch, requires Daniel involvement).
- **M13 Loyalty.** Uses the special Prizma-gold palette with gradients. Separate Batch (full revision, not just re-skin, because gradients + gold contradict the SaaS-clean design system).
- **M1 Inventory.** Out per Daniel directive.
- **M2/M3/M4 production HTML.** Out — those are production code migrations, not sketch revisions. Separate Briefs.
- **Information architecture revisions.** This batch is re-skin only. If a sketch has a layout flaw, it stays unchanged in this batch; flagged in FINDINGS for a later targeted Brief.
- **Adding new screens.** Each module gets exactly the same screen count as before.

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | 7 modules × 17 files re-skinned in ONE batch SPEC | Architect 2026-05-11 |
| 2 | Re-skin only — no layout changes, no IA changes, no new screens | Architect 2026-05-11 |
| 3 | Target palette = Hybrid+Navy tokens from `hybrid-final/_tokens.css` | Inherited from M1_5_DESIGN_SYSTEM_HYBRID_FINAL |
| 4 | M9 sketches-from-scratch + M13 full revision = separate Batches, NOT in this brief | Architect 2026-05-11 |
| 5 | Each original file stays at its current path with current name (no archiving in this batch — overwrite in place + rely on git history for rollback) | Architect 2026-05-11 |
| 6 | Pre-flight: every file gets a git tag before its re-skin commit, so any single file can be reverted independently | Architect 2026-05-11 |
| 7 | Continuous-Run Mandate — single chat, no human gates between modules | Daniel 2026-05-11 |

## 5. Folder Structure (unchanged — files stay in place)

```
modules/Module 5 - Customers/architecture-brief/
  M5_CUSTOMER_CARD_MOCKUP.html        ← re-skinned in place
  M5_CUSTOMERS_LIST_MOCKUPS.html      ← re-skinned in place

modules/Module 6 - Prescriptions/architecture-brief/
  M6_PRESCRIPTION_EDITOR_MOCKUP.html  ← re-skinned in place

modules/Module 8 - Payments/architecture-brief/
  M8_CHECKOUT_MOCKUP_V3.html
  M8_CHECKS_PIPELINE_MOCKUP_V1.html
  M8_DAILY_CLOSE_MOCKUP_V2.html
  M8_PROVIDER_CONFIG_MOCKUP_V2.html

modules/Module 11 - Reports/architecture-brief/
  M11_REPORTS_LIST_MOCKUP.html
  M11_REPORT_EDITOR_MOCKUP.html
  M11_REPORT_VIEW_MOCKUP.html

modules/Module 12 - Communications/architecture-brief/
  M12_CHANNEL_CONFIGS_MOCKUP.html
  M12_CUSTOMER_HISTORY_MOCKUP.html
  M12_TEMPLATES_MOCKUP.html
  M12_WHATSAPP_INBOX_MOCKUP.html

modules/Module 14 - Appointments/architecture-brief/
  M14_APPOINTMENTS_MOCKUP.html
  M14_APPOINTMENTS_SCREENS.html

modules/Module 15 - Queue/architecture-brief/
  M15_QUEUE_MOCKUP.html
```

## 6. Quality Bar — Acceptance Criteria

1. **All 17 files re-skinned.** Each file's `:root` block contains the Hybrid+Navy tokens (Navy `#1e3a8a` as `--accent`, `#fafaf7` as `--bg-page`, etc).
2. **No legacy `#26215C` / `#534AB7` purple-deep references anywhere.** Grep: `grep -i "26215c\|534ab7" modules/Module [567]*/architecture-brief/*.html modules/Module 1[12345]*/architecture-brief/*.html` returns 0 matches.
3. **No serif font references in body content.** `grep -i "Source Serif\|font-serif" *.html` returns 0 matches (except where `--font-sans` declares system serif fallback — acceptable).
4. **DOM tree preserved per file.** Each re-skinned file has the same tag count (±2 for token block edits) as its original counterpart. (Pipeline self-verifies via `wc -l` + node count diff.)
5. **Hebrew RTL throughout.** All files retain `<html lang="he" dir="rtl">`.
6. **No content drift.** Customer names, brand names, prices, placeholder data — all preserved verbatim.
7. **Self-contained.** Each file opens directly in browser, no missing CSS, no broken assets.
8. **Each file gets a git tag** before its commit (format: `pre-reskin-M{N}-{filename-stem}`). Allows independent revert.
9. **`npm run verify:integrity` exit 0.**
10. **Working tree clean at end.**
11. **All changes pushed to `origin/develop`.**

## 7. Destructive Operations

Declared:
- **File overwrites:** 17 files re-written in place (technically not destructive — git history preserves prior versions, and pre-reskin git tags provide explicit rollback points).
- **No file deletes.**
- **No table drops, no schema changes, no force-pushes.**

Per Iron Rule 32: this is `## Destructive Operations: file overwrites (17 files, with pre-commit git tags for rollback)`.

## 8. Continuous-Run Mandate

Run end-to-end through the skill chain in ONE Claude Code chat. No mid-pipeline questions.

Stop only on:
- Iron Rule 31/32 violation
- A success criterion cannot be met
- A re-skin produces a file that no longer renders (token-substitution broke something)
- Unexpected references to legacy palette in places NOT in the swap map (would require Architect input on disposition)

## 9. Anti-Patterns

- **DO NOT change layouts.** Re-skin only.
- **DO NOT change information architecture.** Same sections, same order.
- **DO NOT add new sections "while you're at it."** No.
- **DO NOT convert topbar layouts to sidebar layouts.** That's a re-design, not a re-skin.
- **DO NOT modify placeholder data.** Customer names, prices — preserved.
- **DO NOT touch M7, M9, M13, M1.** Out of scope per §3.
- **DO NOT batch all 17 files into one git commit.** Per-module commits (7 commits + retrospective = ~8 commits). Allows targeted revert.
- **DO NOT ask Daniel mid-pipeline about visual decisions.** Token map is normative.

## 10. Iron Rules in Sharp Focus

- **Rule 9 (no hardcoded values):** all colors via `_tokens.css` references (in this case, inline in each file's `:root` block — acceptable for self-contained mockups).
- **Rule 12 (350-line max):** mockup files may exceed since they're standalone visual deliverables, not production code. Exception accepted (same as Hybrid mockups).
- **Rule 21 (no orphans):** original sketches overwritten in place; legacy palette no longer exists in repo after this batch. Clean state.
- **Rule 32 (destructive ops gate):** declared in §7.

## 11. References

- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/_tokens.css` — token source of truth
- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/suppliers-debt.html` — example of Hybrid-styled file
- `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V7.html` — example of Hybrid-styled mockup that retained complex 3-column layout

---

*End of brief.*
