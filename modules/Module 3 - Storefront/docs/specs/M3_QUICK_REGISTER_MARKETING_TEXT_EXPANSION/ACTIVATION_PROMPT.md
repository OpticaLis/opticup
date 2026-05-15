# Activation Prompt — M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION

> Paste the block below into a fresh Claude Code session.

---

טען את הסקיל `opticup-executor` ובצע את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_TEXT_EXPANSION/SPEC.md`

הקשר קצר:

- ה-SPEC הוא תיקון של שורה אחת ב-repo `opticup-storefront` — החלפת הטקסט של צ'קבוקס "שיווקיים" בטופס `/quick-register/` לנוסח מזמין יותר שגם מכסה הסכמה לקוקיז שיווקיים ומפנה למדיניות הפרטיות.
- אחרי הקומיט בסטורפרונט, יש קומיט שני ב-repo `opticup` (ERP) שמעדכן את `SITE_OVERSEER_HANDOFF.md` + `DECISIONS_LOG.md` + סוגר את REC-SITE-021 סעיף (B).
- שני קומיטים נפרדים, שני repos.

אנא בצע תחת Bounded Autonomy:

1. עקוב אחר First Action Protocol בשני ה-repos: ודא remote, branch=develop, pull, sync gate.
2. בצע Step 0 + Step 1.5 (Cross-Reference + Pre-Flight).
3. ודא קריטריונים §3 #2 (REC-SITE-020 עדיין במקום) ו-#3 (הטקסט הישן עדיין בשורה 165) לפני העריכה.
4. בצע את העריכה לפי §9 (החלפת הטקסט בשורה 165 בלבד).
5. הרץ `npm run build` (קריטריון #10).
6. קומיט + push ל-`origin develop` (קומיט 1 לפי §10). אם `gh` מאומת, פתח PR; אחרת — surface את ה-compare URL. אל תמזג ל-main.
7. עבור ל-repo opticup, עדכן את HANDOFF + DECISIONS_LOG (REC-SITE-021 סעיף B → סגור; סעיף C נשאר DEFERRED), וכתוב EXECUTION_REPORT.md + FINDINGS.md.
8. קומיט 2 (ERP) + push.
9. בסיום: דווח hashes + קישור PR + git status נקי.

עצור על סטייה. בצע מקצה לקצה.