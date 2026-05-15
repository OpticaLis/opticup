# Activation Prompt — M3_BRAND_CATALOG_MOBILE_2COL

Copy the block below into Claude Code on the Windows desktop:

---

טען את skill `opticup-executor` והרץ את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_BRAND_CATALOG_MOBILE_2COL/SPEC.md`

תיקון UI נקודתי: בעמודי המותג (`/brands/{slug}/`) במובייל (≤480px) — קטלוג המוצרים מציג היום טור אחד, צריך להציג 2 טורים.

שינוי שורה אחת בלבד ב-`opticup-storefront/src/components/BrandPage.astro`:
`grid-template-columns: 1fr` → `grid-template-columns: repeat(2, 1fr)`
(בתוך `@media (max-width: 480px)` בלבד — לא לגעת ב-768px / desktop).

חשוב:
- בצע Step 0 לוודא שה-rule עדיין קיים ועדיין `1fr`. אם כבר 2-col → SKIP. אם Tailwind-refactored → STOP + report.
- אחרי build, וודא שה-`dist/_astro/BrandPage.<hash>.css` חדש מכיל את ה-`repeat(2, 1fr)`.
- אם `tenant-fallback-map.json` מופיע ב-git status → restore לפני staging.

2 commits:
1. ב-storefront repo: `fix(brand-page): mobile catalog grid 1col → 2col (Daniel directive 2026-05-10)`
2. ב-ERP repo: `chore(spec): close M3_BRAND_CATALOG_MOBILE_2COL with retrospective`

Daniel יפתח PR ל-main של opticup-storefront ידנית.

אחרי merge: post-deploy curl + grep על ה-CSS לאמת SC #1-#5; visual confirmation דרך Chrome DevTools mobile emulation (375px viewport) לאמת SC #6, או fallback להמתנה ל-Daniel real-phone test.

עדכן HANDOFF + DECISIONS_LOG; כתוב EXECUTION_REPORT.md + FINDINGS.md.
