# SPEC: MIGRATION_4_STRANDED_RGBA_SWEEP

**Module:** Module 1.5 — Shared Components
**Type:** Mechanical visual-drift fix (Tier B.1 of OVERNIGHT_BUNDLE_2026_05_14)
**Severity:** LOW
**Author:** opticup-strategic (Foreman) — overnight bundle 2026-05-14
**Date opened:** 2026-05-14
**Predecessor:** `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` F1 + `FINDINGS.md` F1 (closed 2026-05-12)

## 1. Why

The 2026-05-12 visual migration `MIGRATION_4_STOREFRONT_STUDIO` swapped indigo `#6366f1` to navy `#1e3a8a` across the storefront pages but missed a single decimal-channel rgba occurrence at `storefront-blog.html:101` — the input-focus halo. Per FINDINGS F1 the 8%-alpha halo is barely perceptible but is real visual drift.

## 2. Scope

- 1 file (`storefront-blog.html`)
- 1 line (line 101 — `.edit-field input:focus, .edit-field select:focus` rule)
- 1 token swap (`rgba(99,102,241,.08)` → `rgba(30,58,138,.08)`)

## 3. Exact change

Before:
```
.edit-field input:focus, .edit-field select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
```

After:
```
.edit-field input:focus, .edit-field select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(30,58,138,.08); }
```

## 4. Destructive Operations

**None.** Single in-place token swap; commit revert is one line.

## 5. Acceptance criteria

- [x] After edit, `grep -n "rgba(99,102,241" storefront-blog.html` returns 0 matches.
- [x] `npm run verify:integrity` exits 0.
- [x] No other file in the repo changes (selective `git add` by filename).

## 6. Out of scope

- The other `rgba(99,102,241,0.25)` match in `_archive/session-outputs/campaign-mockups/index.html` is archived and intentionally untouched (Rule 21 archival policy).

## 7. Caller impact

None — `.edit-field input:focus` is a decorative halo, applied at runtime only when blog-editor inputs receive focus. No template, no DB column, no EF.

## 8. Pre-flight audit pattern (informational)

This SPEC also validates the audit-pattern fix in `opticup-strategic/SPEC_TEMPLATE.md` (added 2026-05-13 per MIGRATION_4 Author Proposal #1): future visual SPECs must grep both `#hex` and `rgba\(\d+,\s*\d+,\s*\d+` forms before drafting a swap plan.
