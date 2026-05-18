# SPEC — M1_LENS_PALETTE_RETIRE_UNIFIED

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PALETTE_RETIRE_UNIFIED/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-17
> **Module:** 1 — Inventory Management
> **Phase:** Lens rebuild Phase 0 — Foundation (SPEC 1 of 4 sequential)
> **Author signature:** Claude Code Foreman session, Windows desktop, 2026-05-17
> **Source Brief:** `architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md` §SPEC 1

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-17.
- Target files verified to exist:
  - `css/lens-tabs.css` (368 lines, captured 2026-05-17)
  - `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` (359 lines)
- All hex codes the Brief references (#1e3a8a navy, #c9a555 gold) grep-verified in target files.
- Audit report (`M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md` §9.1, commit `9085c02`) is the binding evidence for the retirement decision.
- Pre-existing untracked files: this Brief file (will be staged with SPEC commit). Pre-existing modified `docs/guardian/GUARDIAN_ALERTS.md` is NOT in this SPEC's scope — leave alone.

### Lessons applied from prior SPECs

- **From `M1_INVENTORY_UNIFIED_SCREEN/REVIEW.md`:** the §1.5 audit table format is good, but mapping CSS tokens to mockup palette was missed. This SPEC binds the rewrite to the mockup files directly.
- **From `M1_LENS_INVENTORY_MOCKUP_1TO1/`:** the 1:1 rebuild precedent shows that `lens-inventory-page.css` (the per-screen CSS) and `lens-tabs.css` (the cross-tab CSS) are independent. This SPEC touches ONLY `lens-tabs.css`. The lens-inventory screen's `lens-inventory-page.css` already aligns with the mockup palette and must not be regressed.
- **From `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 (Baselines as Symbols):** pinning baseline metrics in §0 prevents drift.

### Color-form completeness check

Captured 2026-05-17 from `css/lens-tabs.css`:

Color literals present (full set, deduped):
- `#1e3a8a` (navy — needs swap to gold for chip + button per Brief)
- `#1e40af` (navy-dark — needs swap to gold-dark for hover state)
- `#cbd5e1` (neutral border — keep, used in inactive chip border per mockup)
- `#fff` (white — keep)
- `#475569` (slate text — keep, used in table header text per mockup data-table convention)
- `#f8fafc` (light slate — keep, used in table header bg per mockup data-table convention)
- `#e2e8f0` (light slate border — keep)
- `#d1fae5 / #065f46` (green status — keep, mockup-aligned)
- `#dbeafe / #1e3a8a` (blue chip — re-examine: chip-sent uses navy text; mockup-aligned)
- `#fef3c7 / #92400e` (amber chip — keep, mockup-aligned)
- `#fee2e2 / #991b1b` (red chip — needs ADD: chip-overdue token currently missing)
- `#f1f5f9 / #94a3b8` (cancelled chip — keep)
- `#94a3b8` (muted text — keep)
- `#64748b` (label text — keep)
- `#059669` (green button — keep)
- `#3b82f6` (sent-stat — keep)
- `#d97706` (partial-stat — keep)
- `#eff6ff` (active-stat bg — keep)

No `rgba(...)` decimal forms present in lens-tabs.css. ✓

**Mockup palette pins** (from `LENS_INVENTORY_MOCKUP.html` + `LENS_PRICING_MOCKUP.html` + `LENS_DESIGNS_SELECTION_MOCKUP.html`):
- Active chip: `#c9a555` (gold) bg + white text + `#c9a555` border
- Inactive chip: white bg + `#c9a555` border + `#5d6d7e` text
- Chip hover: `#faf3e0` (gold-tint) bg
- Primary button: `#c9a555` bg + white text
- Primary button hover: `#b8954a` (gold-dark) bg
- Table headers in data-tables: `#f8f9fb` (light slate) bg + `#5d6d7e` text — MATCHES current lens-tabs.css ✓
- SPH×CYL grid headers: `#34495e` (dark navy) — per `lens-inventory-page.css` (out of scope for this SPEC)
- Status chips already mockup-aligned in current CSS — keep.

**Conclusion:** the Brief's instruction "Replace light-slate table headers with dark navy table headers (per mockups)" is INCORRECT for data tables — mockups use light slate. Dark navy is used only for the specialized SPH×CYL grid coordinate headers, which live in `lens-inventory-page.css` (per-screen CSS), not `lens-tabs.css`. This SPEC keeps data-table headers as light slate (mockup-faithful) and does NOT modify the grid-coordinate header rule. Pattern P-AR-16 ("Mockup IS the spec; if Brief conflicts with mockup, mockup wins.") applied.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File | Metric | Value (captured 2026-05-17) |
|---|---|---|---|
| `BASE_LINES_LENS_TABS` | `css/lens-tabs.css` | `wc -l` | 368 |
| `BASE_NAVY_ACTIVE_CHIP` | `css/lens-tabs.css` | `grep -c "#1e3a8a"` chip-active context | 1 |
| `BASE_NAVY_BTN_PRIMARY` | `css/lens-tabs.css` | `grep -c "#1e3a8a"` btn-primary context | 1 |
| `BASE_GOLD_TOKEN` | `css/lens-tabs.css` | `grep -c "#c9a555"` | 0 (not present pre-rewrite) |

---

## 1. Goal

Retire the lens-CSS retargeting defined in `M1_INVENTORY_UNIFIED_SCREEN §1.5 R-1..R-13` (sealed 2026-05-16) by rewriting `css/lens-tabs.css` from the frames-aligned palette to the mockup-ratified palette (per `D-M1-02..D-M1-14`, 2026-05-14). This unblocks all 6 subsequent screen-rebuild Pipelines by aligning the cross-tab CSS contract with the canonical mockup design.

---

## 2. Background & Motivation

The fresh audit report (`M1_LENS_MOCKUP_AUDIT_2026_05_17_REPORT.md` §9.1, commit `9085c02`) identified the unified-screen retargeting as the ROOT CAUSE of 6/6 lens-screen non-compliance with the approved mockups. The unification SPEC was sealed 2 days AFTER Daniel ratified the mockups; it should never have overridden the mockups (Pattern P-AR-16, CRITICAL non-overridable).

Daniel-Architect sealed retirement via Cowork-Architect on 2026-05-17 evening (Brief decision #1). The Brief authorizes this SPEC's narrow scope: palette rewrite of `lens-tabs.css` + deprecation note on the source SPEC. The 6 screen-rebuilds (Pipelines after this one) depend on the corrected palette being in place.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, push to `origin/develop` succeeds | `git status` → "nothing to commit" + push exit 0 |
| 2 | Commits produced | 3 commits (author / execute / close) | `git log {SPEC_START}..HEAD --oneline \| wc -l` → 3 |
| 3 | `css/lens-tabs.css` line count | ≥ `BASE_LINES_LENS_TABS` and ≤ `BASE_LINES_LENS_TABS + 60` | `wc -l css/lens-tabs.css` |
| 4 | Navy chip-active removed | 0 occurrences of `#1e3a8a` inside `.lens-tab-section .chip.active` rule | `grep -A1 "\.chip\.active" css/lens-tabs.css \| grep -c "#1e3a8a"` → 0 |
| 5 | Gold chip-active added | ≥ 1 occurrence of `#c9a555` inside `.lens-tab-section .chip.active` rule | `grep -A1 "\.chip\.active" css/lens-tabs.css \| grep -c "#c9a555"` → ≥ 1 |
| 6 | Header comment rewritten | `lens-tabs.css` no longer says "frames-aligned"; says "mockup-aligned" | `grep -c "frames-aligned" css/lens-tabs.css` → 0 AND `grep -c "mockup-aligned" css/lens-tabs.css` → ≥ 1 |
| 7 | DEPRECATED marker on source SPEC | The §1.5 block in `M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` carries a DEPRECATED note pointing here | `grep -c "DEPRECATED.*M1_LENS_PALETTE_RETIRE_UNIFIED" "modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md"` → ≥ 1 |
| 8 | Chip-overdue token added | `chip-overdue` class defined in lens-tabs.css with red palette | `grep -c "chip-overdue" css/lens-tabs.css` → ≥ 1 |
| 9 | Lens-inventory screen still loads | Tier C: open `inventory.html?cat=lenses&tab=inventory` in Chrome MCP, no console errors, SPH×CYL grid still renders | Chrome MCP screenshot + console clean |
| 10 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 11 | Pre-commit hooks clean per commit | 0 violations, 0 warnings | committed commits' pre-commit output |
| 12 | EXECUTION_REPORT.md + FOREMAN_REVIEW.md written | Files exist in SPEC folder | `ls modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PALETTE_RETIRE_UNIFIED/` → SPEC.md, EXECUTION_REPORT.md, FOREMAN_REVIEW.md present |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Edit `css/lens-tabs.css` per the success criteria
- Edit `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` to add the DEPRECATED note (single insertion, no removals)
- Create and commit SPEC folder artifacts
- Run `npm run verify:integrity`
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- Any change outside `css/lens-tabs.css` + the source SPEC's deprecation note + this SPEC folder
- Any regression in the lens-inventory screen rendering (Tier C check fails)
- Any attempt to delete content from `M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` (only ADDITIVE deprecation note authorized)
- DB writes (this SPEC has none)
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- If `css/lens-tabs.css` post-rewrite line count exceeds `BASE_LINES_LENS_TABS + 60` (i.e., > 428 lines), the rewrite has expanded beyond palette swap → STOP and re-scope
- If Tier C check finds ANY console error on `inventory.html?cat=lenses&tab=inventory` that wasn't present pre-rewrite → STOP, escalate (lens-inventory must remain green)
- If grep finds `#1e3a8a` still present in any chip-active OR btn-primary rule context post-rewrite → STOP, the rewrite is incomplete
- If the destructive-ops gate fires on the lens-tabs.css rewrite (it shouldn't — this is replace-in-place, not delete) → STOP and investigate

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- `git reset --hard {SPEC_START}` where SPEC_START = the commit hash captured at start of execution (record in EXECUTION_REPORT)
- No DB changes in this SPEC — no DB rollback needed
- Notify Foreman; SPEC is marked REOPEN, not CLOSED

---

## 7. Destructive Operations

`None.`

This SPEC performs:
- File modification in place (`css/lens-tabs.css`) — additive + replace-in-place, no file deletes, no mass renames, no DDL
- Documentation edit (`M1_INVENTORY_UNIFIED_SCREEN/SPEC.md`) — additive insertion of DEPRECATED note, no content removal
- New file creation (SPEC folder artifacts) — additive only

No `DROP`, `DELETE`, `TRUNCATE`, `REVOKE`, `git rebase`, `git reset --hard`, `git push --force`, or governance-file content removal authorized.

---

## 8. Out of Scope (explicit)

- Modifying `lens-inventory-page.css`, `lens-inventory-modals.css`, or any other per-screen CSS (those handle SPH×CYL grid coords + per-screen chrome)
- Rebuilding any of the 6 lens partial HTMLs — that's SPECs 4-9
- Building shared components in Module 1.5 — that's SPEC 2
- DB schema changes — that's SPEC 3
- Touching the source SPEC's content beyond the DEPRECATED note (no rule removal, no logic change)
- The lens-tabs.css `chip-stock` / `chip-custom` / `chip-customer` / `chip-manual` / `chip-discrepancy` tokens flagged by the audit as missing — SPEC 2 will add these via `shared/css/tokens.css` (the proper home). Only `chip-overdue` is added here because it's needed by `lens-pos-list` which uses lens-tabs.css directly.

---

## 9. Expected Final State

### Modified files

1. **`css/lens-tabs.css`** (368 → ~390 lines expected):
   - Lines 1-9 (header comment): rewritten to remove "frames-aligned" goal; replace with "mockup-aligned per `D-M1-02..D-M1-14` ratification 2026-05-14"
   - `.lens-tab-section .chip:hover` (line ~53): swap border to `#b8954a` (gold-dark)
   - `.lens-tab-section .chip.active` (lines ~57-61): swap bg + border from `#1e3a8a` to `#c9a555` (gold)
   - `.lens-tab-section .btn-primary` (lines ~112-117): swap bg + border from `#1e3a8a` to `#c9a555`
   - `.lens-tab-section .btn-primary:hover` (line ~119): swap bg from `#1e40af` to `#b8954a`
   - Append new `chip-overdue` token (red palette per mockup `lens-pos-list` overdue stat-card)
   - Optional: add `nav#lensNav button.active` swap from navy to gold for nav-strip consistency

2. **`modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md`**:
   - Insert single block at the top of §1.5 (before the existing table) marking R-1..R-13 visual-palette rules as DEPRECATED, pointing to this SPEC + the rebuild Brief
   - Format: `> ⚠️ **DEPRECATED 2026-05-17** — R-1..R-13 visual palette rules superseded by M1_LENS_PALETTE_RETIRE_UNIFIED per mockup ratification D-M1-02..D-M1-14. Structural rules (R-7 chrome, R-10 access-gate, R-11/R-12 spacing) remain in force.`

### New files (this SPEC folder)

- `SPEC.md` (this file)
- `EXECUTION_REPORT.md` (by executor, at close)
- `FOREMAN_REVIEW.md` (by Foreman, at close)
- `FINDINGS.md` (only if findings surface)

### DB state

No changes.

### Docs updated (Integration Ceremony)

- `docs/GLOBAL_MAP.md` — NOT updated (no new functions/contracts)
- `docs/GLOBAL_SCHEMA.sql` — NOT updated (no DB changes)
- Module's `SESSION_CONTEXT.md` — single line entry noting SPEC 1 closure
- Module's `CHANGELOG.md` — entry under "Lens UI Rebuild Phase 0"

---

## 10. Commit Plan

| # | Subject | Files | Notes |
|---|---------|-------|-------|
| 1 | `chore(spec): author M1_LENS_PALETTE_RETIRE_UNIFIED SPEC` | `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PALETTE_RETIRE_UNIFIED/SPEC.md` + Brief file (`architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`) | The Brief gets staged here because it's been untracked since dispatch |
| 2 | `refactor(css): retire unified-screen R-1..R-13 — rewrite lens-tabs.css to mockup palette (M1_LENS_PALETTE_RETIRE_UNIFIED)` | `css/lens-tabs.css` + `modules/Module 1 - Inventory Management/docs/specs/M1_INVENTORY_UNIFIED_SCREEN/SPEC.md` (deprecation note) | Single execution commit — palette swap + deprecation note |
| 3 | `chore(spec): close M1_LENS_PALETTE_RETIRE_UNIFIED with retrospective` | `EXECUTION_REPORT.md` + `FOREMAN_REVIEW.md` + (if any) `FINDINGS.md` + `SESSION_CONTEXT.md` + `CHANGELOG.md` updates | Closure commit |

---

## 11. Dependencies / Preconditions

- Previous SPEC: none (this is SPEC 1 of the rebuild — foundation)
- Tools: standard Bash + Edit. Chrome MCP for Tier C verification (use `mcp__chrome-devtools__navigate_page` + `take_screenshot`)
- No credentials needed (no DB writes)
- Repo on `develop`, integrity gate clean (confirmed at SPEC authoring time)

---

## 12. Lessons Already Incorporated

- **FROM** `M1_INVENTORY_UNIFIED_SCREEN/REVIEW.md` → "the §1.5 audit table format is good" → APPLIED: this SPEC preserves the source SPEC's structural rules (R-7 chrome, R-10 access-gate, R-11/R-12 spacing) and deprecates ONLY the visual-palette rules
- **FROM** `M1_LENS_INVENTORY_MOCKUP_1TO1/` precedent → "1:1 mockup fidelity > time efficiency" → APPLIED in §0 by binding the rewrite to mockup palette values, not Brief paraphrase
- **FROM** `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 (Baselines-as-Symbols) → APPLIED in §0 Baselines sub-table
- **FROM** `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #1 (Color-form completeness) → APPLIED in §0 Color-form completeness check — confirmed no rgba decimal forms in lens-tabs.css
- **FROM** opticup-architect Pattern P-AR-16 (Mockup Fidelity Mandate) → APPLIED in §0 Conclusion: Brief's "dark navy headers" instruction overridden by mockup reality (data-tables use light slate)

---

## 13. Pre-Merge Checklist

Every SPEC must pass these items before the executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2
- [ ] `git status --short` returns empty after closure commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT.md + FOREMAN_REVIEW.md written in the SPEC folder
- [ ] Module SESSION_CONTEXT.md + CHANGELOG.md updated

---

## 14. Tier C VFV — Mockup Fidelity Check (per P-AR-16)

After the lens-tabs.css rewrite:

1. Start localhost (if not running): `npm run dev` (port 3000)
2. Open Chrome MCP → navigate to `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=inventory`
3. Authenticate with demo PIN 12345 if prompted
4. Verify visually:
   - Filter chips render with gold accent when active (not navy)
   - SPH×CYL grid still renders correctly (regression check — this is the 1:1 reference)
   - Lots-table headers remain light slate (mockup-faithful)
   - No console errors
5. Take screenshot, attach to EXECUTION_REPORT §Tier C
6. If ANY drift on previously-correct lens-inventory screen → STOP, the rewrite has regressed the 1:1 reference

---

*End of SPEC. Authored 2026-05-17 by opticup-strategic (Foreman).*
