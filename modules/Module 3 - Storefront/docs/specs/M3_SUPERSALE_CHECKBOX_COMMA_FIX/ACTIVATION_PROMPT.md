# Activation Prompt — M3_SUPERSALE_CHECKBOX_COMMA_FIX

> Paste the block below into a fresh Claude Code session.

---

טען את הסקיל `opticup-executor` ובצע את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_CHECKBOX_COMMA_FIX/SPEC.md`

הקשר קצר:

- ב-`/supersale/` יש 3 צ'קבוקסים במקום 2 — הפסיק בתוך הטקסט של הצ'קבוקס השני גרם ל-shortcode parser לפצל אותו.
- פתרון: UPDATE על 3 שורות `storefront_pages` (he/en/ru) להחליף את הפסיק הפנימי ב-em-dash ` — `. ללא שינוי קוד, ללא deploy.
- backup לפני UPDATE.
- קומיט אחד ב-`opticup` (HANDOFF + DECISIONS_LOG + retrospective).

בצע מקצה לקצה. עצור על סטייה. דווח hash + git status.