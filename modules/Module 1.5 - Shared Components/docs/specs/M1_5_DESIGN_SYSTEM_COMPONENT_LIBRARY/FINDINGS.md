# FINDINGS — M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY

Findings discovered during execution that were OUT of this SPEC's scope.
Roll up to the combined FOREMAN_REVIEW at end of Phase 4.

---

## M2-SPEC-DRIFT-01 — `MEDIUM`

**Location:** SPEC §3 criterion #4 regex
**Description:** Grep pattern `var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,8}\b` — char-class `[a-z-]` excludes digits. Variable names like `--color-gray-400`, `--color-primary-light`, `--font-size-2xl` (digits anywhere in identifier) are NOT matched. Initial baseline showed "0 hits" in modal.css when 12 hex fallbacks were actually present (e.g., `var(--color-gray-200, #e5e7eb)`).
**Impact:** Without re-running with corrected regex, commit 2 would have closed Phase 2 with 15 latent hex fallbacks still on disk — defeating the SPEC's Rule-9 intent.
**Suggested action:** Author-skill — update SPEC_TEMPLATE.md so any future regex criterion uses `[a-z0-9-]+` for CSS custom-property names (CSS supports digits in identifiers AFTER the first hyphen). Or generalize: regex criteria templates should be tested against known matches at SPEC-author time.

## M2-SPEC-DRIFT-02 — `LOW`

**Location:** SPEC §3 criterion #8 + §8 prescribed `--color-focus-ring` value
**Description:** SPEC §3 row 8 said `--color-focus-ring: #0f172a` (a literal hex). Implemented as `--color-focus-ring: var(--color-primary)` (token reference) for SaaS correctness — focus ring follows tenant brand color automatically. The criterion's grep `grep "^\s*--color-focus-ring:"` still passes (token exists), so no literal-grep failure.
**Impact:** Better SaaS correctness; tenant override works for focus ring without separate config.
**Suggested action:** Author-skill — when writing focus/accent tokens, prefer `var(--token)` references over hex literals so tenant overrides cascade automatically.

## M2-DEBT-01 — `LOW`

**Location:** `shared/css/components.css` lines 107 / 140 / 168 (now superseded by Phase 2 commit `e9c555c`, but the pre-Phase-2 pattern remains in `js/` page CSS files)
**Description:** Pre-Phase-2 `:focus` rules used hardcoded `rgba(59, 130, 246, 0.1)` ring colors. This is technically a raw color literal (not hex but RGB-decimal) — outside the SPEC criterion #5 grep scope (which looks for `#` only). Phase 2 replaced these in components.css with `--shadow-focus` token. Page-level CSS (`css/inventory.css`, `css/employees.css`, `css/settings.css`, `css/shipments.css`) likely contains similar `rgba(...)` literals — out of Phase 2 scope but pre-existing Rule 9 violations.
**Impact:** Component CSS now clean; page CSS may have similar pattern leftover.
**Suggested action:** A future hygiene pass — `grep -rE "rgba\([0-9]" css/` to enumerate, then a separate SPEC per Daniel-priority. NOT in Phase 3 scope.

## M2-DEBT-02 — `LOW`

**Location:** `shared/css/` non-hex fallback literals (`var(--space-md, 12px)`, `var(--z-modal, 1000)`, etc.)
**Description:** modal.css alone has 55 such non-hex fallbacks. table.css has 3, toast.css has 2. These were intentional "graceful degradation" patterns from Phase 6 but are now redundant — variables.css is loaded universally, the fallbacks are never used. They add visual noise to the source files.
**Impact:** Zero functional impact; code-readability cost only.
**Suggested action:** A future cleanup SPEC could batch-remove these. NOT a Phase 3 scope addition. Note that the SPEC criterion #4 only targeted HEX fallbacks; removing non-hex would have been scope creep.

## M2-DEBT-03 — `LOW`

**Location:** `shared/css/forms.css` line 7 (comment block)
**Description:** A comment block contains a reference to the obsolete short-form variable `--g500`. Cosmetic only — comment, not active code. Other stale `--gN` references in active code were fixed in commit 2b.
**Suggested action:** Sweep up in a future cleanup; not blocking.

---

## Summary

5 findings, none blocking. 2 SPEC-author drifts (regex bug + focus-ring value), 3 pre-existing tech-debt observations. All roll up to combined FOREMAN_REVIEW at end of Phase 4.
