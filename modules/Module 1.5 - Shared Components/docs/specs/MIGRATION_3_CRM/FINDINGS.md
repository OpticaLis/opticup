# FINDINGS — MIGRATION_3_CRM

**Captured by:** opticup-executor (Full-Auto Pipeline)
**Date:** 2026-05-12

---

## F1 — `crm-screens.css` + `crm-visual.css` are post-B8 stubs (consider deletion)

**Severity:** LOW
**Location:** `css/crm-screens.css` (2 lines, all comment) + `css/crm-visual.css` (20 lines, only `.crm-pagination` + legacy `crm-pulse` keyframe)
**Description:** Both files were left as residual stubs after the B8 Tailwind migration moved their content into inline utility classes. They serve no functional purpose today — `.crm-pagination` is a simple flex container whose 5 properties could move to `crm.css` or to a Tailwind utility chain, and `crm-pulse` keyframe has no live consumer per its own comment ("for any residual consumer"). They occupy 2 of the 12 `<link rel="stylesheet">` tags in `crm.html`. Migration #3 left them untouched because the SPEC scope was accent insertion only.
**Suggested action:** File a follow-up SPEC `M1_5_CRM_CSS_STUB_CLEANUP` to:
  1. Move `.crm-pagination` into `css/crm.css` (additive ~5 lines).
  2. Confirm `crm-pulse` keyframe has zero live consumers (grep all `.js` + `.html`) — if zero, delete it; if any, move into `crm.css` and document.
  3. Delete both files + 2 `<link>` tags from `crm.html`. Net: -2 `<link>` tags, -22 lines of dead CSS, simpler maintenance.
  Not a blocker for Migration #4. Recommended priority: low. Best run AFTER all 4 visual migrations land + before the batch merge to main (alongside the `MIGRATION_2`-filed `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS`).

## F2 — Tailwind config in `crm.html` (lines 26-37) defines orphan color tokens

**Severity:** LOW
**Location:** `crm.html` lines 26-37 (inline Tailwind config `<script>` block)
**Description:** The `crm: { sidebar: '#1e1b4b', accent: '#6366f1', surface: '#f8fafc', card: '#ffffff', text: '#1e293b', muted: '#64748b' }` color tokens defined in the inline Tailwind config are NOT referenced by any `bg-crm-*` / `text-crm-*` / `border-crm-*` class in the markup. They are orphan configuration. Grep confirms zero usages of `bg-crm-` or `text-crm-` in `crm.html`. Rule 21 (No Orphans) candidate for cleanup.
**Suggested action:** Defer to TECH_DEBT.md under "CRM cleanup" — sweep these unused Tailwind config tokens when the CRM CSS stub cleanup (F1) runs. Could also extend the cleanup to consider removing the entire inline Tailwind config block (lines 19-39) if the JIT defaults are sufficient. Not a Migration #3 / #4 blocker.

## F3 — Sidebar nav RTL marker uses physical `-3px` offset (potential LTR fallback concern)

**Severity:** LOW / INFO
**Location:** `css/crm.css` `.crm-nav-item.active` `box-shadow: inset -3px 0 0 #1e3a8a;`
**Description:** The Navy marker is implemented as a physical-pixel inset shadow on the right edge. This is correct for the current CRM context (Hebrew, `dir="rtl"` on `<html>`), where the right edge IS the start edge. If CRM ever supports LTR (Arabic-to-Hebrew bilingual or English fallback), the marker will paint on the wrong edge. CSS does not have a `box-shadow-inline-start` logical property.
**Suggested action:** Defer to TECH_DEBT.md under "CSS logical properties." Long-term fix involves either: (a) a CSS `[dir="ltr"] .crm-nav-item.active { box-shadow: inset 3px 0 0 #1e3a8a; }` override pair, or (b) a `pseudo-element` rendered marker positioned via logical `inset-inline-start`. Not in Migration #3 scope.

---

*End of FINDINGS.*
