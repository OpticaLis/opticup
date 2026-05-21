אתה ה-Foreman של מודול 4 (CRM). תקרא ותפעיל את ה-Brief הבא:

`modules/Module 4 - CRM/architecture-brief/M4_DEMO_STATIC_LINKS_BACKFILL_BRIEF.md`

זה Brief קטן, סיכון LOW — backfill של 2 רשומות `template_static` ב-short_links על demo בלבד (stock + pricing-catalog), שיפתחו לדניאל בדיקת demo-first של שינוי בתבנית `event_registration_open` תחת חוק 33.

כל ההחלטות סגורות ב-Brief, כולל P-AR-02 baselines וכל קריטריוני ה-success S1–S12. שאלות פתוחות למודול-סטרטג: אין.

הפעל את הפייפליין המלא:
1. opticup-strategic — קרא את ה-Brief, כתוב SPEC.md ב-`modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/SPEC.md`.
2. opticup-executor — הרץ את ה-SPEC (migration אחד, 2 INSERTs אידמפוטנטיים).
3. opticup-reviewer — סקירה.
4. opticup-localhost-tester — VFV (S7–S9): screenshot של 4 שורות במסך `crm.html → קישורים קצרים` על demo + 2 בדיקות resolver `/r/<code>`.
5. opticup-strategic — FOREMAN_REVIEW.md.

כללי משטר רגילים: develop בלבד, אין מגעים ב-prizma, אין שינויי קוד JS/HTML/CSS, אין DDL מעבר ל-migration אחד.

הערה לגבי IR18-finding (`short_links_code_unique` הוא global ולא tenant-scoped) — Brief §6 קובע: לא לתקן ב-SPEC הזה. רק לתעד ב-FINDINGS כפריט נפרד לתור.

When done, surface a short English status line.
