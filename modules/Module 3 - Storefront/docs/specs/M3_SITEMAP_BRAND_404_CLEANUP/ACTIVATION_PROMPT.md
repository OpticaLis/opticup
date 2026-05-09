# Activation Prompt — M3_SITEMAP_BRAND_404_CLEANUP

Copy the block below into Claude Code on the Windows desktop:

---

טען את skill `opticup-executor` והרץ את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_BRAND_404_CLEANUP/SPEC.md`

הקוד נמצא ב-repo הסטורפרונט (`opticup-storefront`), לא ב-ERP. ה-SPEC document נשאר ב-ERP repo. שני קבצים לשינוי: `src/pages/sitemap-dynamic.xml.ts` (סינון מותגים) + `scripts/verify-sitemap.mjs` (הוספת brand404Probe). אפס שינויים ב-DB. ההישג: ירידה מ-155 ל-45 URLs של מותגים ב-sitemap, כל ה-45 מחזירים 200. אחרי commit + push לdevelop של opticup-storefront, פתח PR ל-main של opticup-storefront. אחרי merge, וודא ב-production שהמספרים תואמים את §3 ב-SPEC. כתוב EXECUTION_REPORT.md + FINDINGS.md (אם יש) באותה תיקייה ב-ERP repo.
