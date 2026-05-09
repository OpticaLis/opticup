# Activation Prompt — M3_REC014_ORPHAN_CLEANUP

Copy the block below into Claude Code on the Windows desktop:

---

טען את skill `opticup-executor` והרץ את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_REC014_ORPHAN_CLEANUP/SPEC.md`

3 פריטי ניקוי קוסמטיים, סיכון אפס:
- **A** (DB): מחיקת 3 שורות `/test-shortcodes/` ארכיון מ-`storefront_pages` (ב-ERP repo).
- **B** (storefront): מחיקת תיקיית `_deprecated/` אם עדיין קיימת.
- **C** (storefront): מחיקת 3 מפתחות i18n של `poweredBy` אם אין referencing פעיל.

חשוב: בצע Step 0 + Step 0b לפני כל שינוי. אם grep ב-Item C מוצא reference פעיל — STOP. אם תיקיית `_deprecated/` לא קיימת — דלג + דווח. שמור backup JSON של 3 שורות ה-DB לפני DELETE.

עד 3 commits — 1 ב-ERP repo (A + backup), 2 ב-storefront repo (B, C). דניאל יפתח PR(s) ל-main של opticup-storefront. אין צורך ב-PR ל-main של ERP (הקוד ב-ERP נוגע רק ל-DB + SPEC docs).

אחרי closure: עדכן HANDOFF + DECISIONS_LOG; כתוב EXECUTION_REPORT.md + FINDINGS.md.
