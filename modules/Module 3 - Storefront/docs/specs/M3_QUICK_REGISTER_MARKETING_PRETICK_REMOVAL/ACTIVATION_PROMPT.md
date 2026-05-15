# Activation Prompt — M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL

> Paste the block below into a fresh Claude Code session.

---

טען את הסקיל `opticup-executor` ובצע את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/SPEC.md`

הקשר קצר:

- ה-SPEC הוא תיקון קצר של שורה אחת ב-repo `opticup-storefront` — להסיר את התכונה `checked` מצ'קבוקס "שיווקיים" בטופס `/quick-register/`. ציות לחוק הגנת הפרטיות 2024.
- אחרי הקומיט בסטורפרונט, יש קומיט שני ב-repo `opticup` (ERP) שמעדכן את `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` + `DECISIONS_LOG.md` + סוגר את REC-SITE-020.
- שני קומיטים נפרדים, שני repos — ה-SPEC מפרט בדיוק מה לעשות בכל אחד.

אנא בצע תחת Bounded Autonomy:

1. עקוב אחר First Action Protocol (CLAUDE.md §1) בשני ה-repos: ודא remote, branch=develop, pull, sync gate.
2. בצע את Step 0 + Step 1.5 (Cross-Reference + Pre-Flight) של opticup-executor.
3. ודא קריטריון §3 #2 לפני העריכה (grep מאשר שהקובץ במצב הצפוי).
4. בצע את העריכה לפי §8 (מחיקה של ` checked` משורה 164).
5. הרץ `npm run build` בסטורפרונט (קריטריון §3 #8).
6. קומיט + push ל-`origin develop` (קומיט 1 לפי §9). פתח PR ל-main דרך GitHub UI אבל אל תמזג — Daniel-only.
7. עבור ל-repo opticup, עדכן את HANDOFF + DECISIONS_LOG, וכתוב EXECUTION_REPORT.md + FINDINGS.md לתיקיית ה-SPEC.
8. קומיט 2 (ERP) + push ל-`origin develop`.
9. בסיום: דווח hash של שני הקומיטים + קישור PR + ודא ששני ה-repos נקיים (`git status` → clean).

עצור על סטייה. בצע אחרת מקצה לקצה.