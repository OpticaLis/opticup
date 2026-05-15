# Activation Prompt — M4_LEAD_INTAKE_ASYNC_DISPATCH

> Paste the block below into a fresh Claude Code session.

---

טען את הסקיל `opticup-executor` ובצע את ה-SPEC הבא:

`modules/Module 4 - CRM/docs/specs/M4_LEAD_INTAKE_ASYNC_DISPATCH/SPEC.md`

הקשר קצר:

- ה-Edge Function `lead-intake` היום מחכה ל-Make לסיים שליחת SMS + אימייל (10-15 שניות) לפני שמחזיר תשובה למשתמש. המטרה: להחזיר מיד אחרי INSERT ל-`crm_leads` (1-2 שניות), ולתת ל-dispatch לרוץ ברקע דרך `EdgeRuntime.waitUntil()`.
- שינוי של שורה אחת ב-`supabase/functions/lead-intake/index.ts:301`.
- כולל deploy של ה-EF דרך `supabase functions deploy lead-intake`.
- smoke test על demo tenant + לאחר deploy — תיעוד תוצאות ב-EXECUTION_REPORT.

בצע מקצה לקצה. עצור על סטייה. דווח hash + הוראות לדניאל לבדיקה ידנית בפרודקשן (קריטריון 9).