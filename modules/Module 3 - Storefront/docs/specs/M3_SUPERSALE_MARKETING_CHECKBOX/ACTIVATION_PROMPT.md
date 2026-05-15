# Activation Prompt — M3_SUPERSALE_MARKETING_CHECKBOX

> Paste the block below into a fresh Claude Code session. **Run this AFTER M3_QUICK_REGISTER_ROLLBACK has closed.**

---

טען את הסקיל `opticup-executor` ובצע את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_MARKETING_CHECKBOX/SPEC.md`

הקשר:

- העמוד `/supersale/` ב-`opticup-storefront`: עדכון הטקסט של צ'קבוקס "שיווקיים" + חיווט שלו לכתיבת `cookie_consent` ל-localStorage כדי שהפיקסל יוכל לירות.
- שלוש שפות (he/en/ru) — אם הניסוחים באנגלית/רוסית לא תואמים את העברית, עצור ושאל.
- כולל UPDATE ל-3 שורות ב-`storefront_pages` (Level 2, מאושר ב-SPEC §7) — לפני העדכון: backup JSON.
- קוד חדש: helper `setConsent()` בקובץ חדש + חיווט מה-`lead-form.ts` shortcode renderer.

בצע מקצה לקצה. עצור על סטייה. בסיום: דווח hashes + git status נקי + הוראות לדניאל לבדיקה ידנית (קריטריונים 11 + 12).