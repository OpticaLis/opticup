# Activation Prompt — M3_QUICK_REGISTER_ROLLBACK

> Paste the block below into a fresh Claude Code session. **Run this BEFORE the supersale SPEC.**

---

טען את הסקיל `opticup-executor` ובצע את ה-SPEC הבא:

`modules/Module 3 - Storefront/docs/specs/M3_QUICK_REGISTER_ROLLBACK/SPEC.md`

הקשר:

- שני שינויים בוצעו בטעות בעמוד `/quick-register/` (קומיטים `ac6eef6` ו-`84e7e88` ב-repo `opticup-storefront`).
- צריך להחזיר את העמוד למצב המקורי לחלוטין, ולסגור את ה-PR הפתוח בלי למזג.
- אחרי הקומיטים בסטורפרונט, יש קומיט שני ב-repo `opticup` שמעדכן את HANDOFF + DECISIONS_LOG (לציין שה-RECs בוטלו).

בצע מקצה לקצה, עצור על סטייה. בסיום: דווח hashes של ה-reverts + סטטוס ה-PR (closed/open) + git status נקי בשני ה-repos.