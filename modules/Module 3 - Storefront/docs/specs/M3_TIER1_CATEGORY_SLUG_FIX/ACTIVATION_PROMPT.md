# Activation Prompt — M3_TIER1_CATEGORY_SLUG_FIX

Copy the block below into Claude Code on the Windows desktop:

---

טען את skill `opticup-executor` והרץ את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_TIER1_CATEGORY_SLUG_FIX/SPEC.md`

תיקון קטן: ה-Lighthouse cron מציג היום SKIP_404 עבור 6 שורות (`/categories/sunglasses/` + `/categories/eyeglasses/` × 3 שפות). Daniel בדק חי 2026-05-10 שה-URLs האמיתיים הם `/category/sunglasses` ו-`/category/eyeglasses` (יחיד, בלי trailing slash). תיקון של 4 שורות בקובץ אחד:

`roles/site-overseer/tools/lighthouse/config/tier1-pages.json`

זה סוגר את REC-SITE-019 דרך Option B (replace, not build).

אופציונלי: אחרי השינוי, הרץ `node roles/site-overseer/tools/lighthouse/scripts/run-tier1.mjs` ידנית כדי לוודא 30 OK + 0 SKIP. אם הרצת — commit גם את ה-reports החדשים.

ERP repo בלבד, אפס שינויים ב-storefront, אפס PR ל-main (זה monitoring config, לא production code).

עדכן HANDOFF (REC-SITE-019 → closed) + DECISIONS_LOG. כתוב EXECUTION_REPORT.md + FINDINGS.md (אם יש).

קומיט יחיד לפי §9.
