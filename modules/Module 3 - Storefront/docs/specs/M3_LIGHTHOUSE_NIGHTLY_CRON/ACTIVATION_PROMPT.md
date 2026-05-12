# Activation Prompt — M3_LIGHTHOUSE_NIGHTLY_CRON

Copy the block below into Claude Code on the Windows desktop:

---

טען את skill `opticup-executor` והרץ את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/SPEC.md`

תשתית מוניטורינג: GitHub Actions cron יומי + שבועי המריץ Lighthouse + axe-core על הסטורפרונט. דוחות ב-`docs/guardian/lighthouse-reports/`. רק regressions מציפות התראה ב-`docs/guardian/GUARDIAN_ALERTS.md`.

עד 5 commits ב-ERP repo בלבד (אפס נגיעה ב-storefront repo, אפס שינויי DB).

חשוב:
- בצע את Step 0 + Tier 1 URL probe לפני כל שינוי. אם URL ב-Tier 1 מחזיר 404 — לוג finding, אל תחסום.
- npm install רק תחת `roles/site-overseer/tools/lighthouse/` (לא project-root).
- workflows רצים על develop בלבד, לא main.
- המשך commit אוטומטי של דוחות חוזר ל-develop בכל הרצה — בעזרת `OpticaLis [bot]` committer (כמו existing pattern).
- אחרי הסקריפטים מוכנים, הרץ ידנית `gh workflow run lighthouse-daily.yml` לאמת SC #16-#19 לפני סגירה.

אחרי סגירה: עדכן HANDOFF + DECISIONS_LOG; SKILL bump ל-v0.5; כתוב EXECUTION_REPORT.md + FINDINGS.md.

הערה: זו SPEC רחבה (5 commits, 2 workflows, 5 scripts, ~2 שעות עבודה). אם נתקל במשהו לא צפוי שמרחיב את ה-scope (commit 6) — STOP + report.
