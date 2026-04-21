-- =============================================================================
-- C1_LEAD_INTAKE_PIPELINE — Message Template Seeds
-- SPEC: modules/Module 4 - CRM/go-live/specs/C1_LEAD_INTAKE_PIPELINE/SPEC.md
-- Date: 2026-04-21
-- Tenant: demo (8d8cfa7e-ef58-49af-9702-a862d459cccb)
-- Source: campaigns/supersale/FLOW.md §"הודעות שלב 1"
-- =============================================================================

-- Demo tenant UUID
SET LOCAL app.tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid;

-- =============================================================================
-- Tier 1: New Lead Registration (lead_intake_new)
-- =============================================================================

-- SMS Template: New Lead Welcome
INSERT INTO crm_message_templates (
  tenant_id,
  slug,
  name,
  channel,
  language,
  subject,
  body,
  is_active,
  created_at
) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_new_sms_he',
  'Lead Registration — SMS (He)',
  'sms',
  'he',
  NULL,
  'היי {{name}},
נרשמת בהצלחה למערכת האירועים של אופטיקה פריזמה ✔️
מה עכשיו? ברגע שייפתח אירוע מכירות - תקבל/י הודעה עם קישור הרשמה (כל אירוע מוגבל ל-50 משתתפים).
שימו לב: בחלק מהאירועים, שריון המקום כרוך בדמי שריון המקוזזים מהקנייה.
פרטים מלאים נשלחו במייל.
צוות אופטיקה פריזמה 💛',
  true,
  now()
) ON CONFLICT (tenant_id, slug, channel, language) DO NOTHING;

-- Email Template: New Lead Welcome (stub with primary info)
INSERT INTO crm_message_templates (
  tenant_id,
  slug,
  name,
  channel,
  language,
  subject,
  body,
  is_active,
  created_at
) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_new_email_he',
  'Lead Registration — Email (He)',
  'email',
  'he',
  '{{name}}, ההרשמה למערכת אירועי המכירות נקלטה בהצלחה,הנה מה שקורה הלאה ✔️',
  'שלום {{name}} 👋

ההרשמה שלך למערכת אירועי המכירות של אופטיקה פריזמה נקלטה בהצלחה!

## איך זה עובד?
1. ✅ ביצעת הרשמה — אנחנו מאומתים
2. 📩 כשאירוע יתפתח — תקבל הודעה עם קישור רישום
3. 💳 שריון מקום — 50₪ דמי שריון (מקוזזים מהקנייה)
4. 🎉 מגיעים ונהנים — ביום האירוע

## הפרטים שנקלטו במערכת
שם: {{name}}
טלפון: {{phone}}
אימייל: {{email}}

> **עדכון פרטים?** [שלחו הודעה ל-WhatsApp](https://wa.me/972533645404)

## חשוב לדעת
- קישור ההרשמה נשלח במייל ו-SMS
- בדקו את תיקיית הספאם אם לא ראיתם
- סטטוס הרישום תמיד זמין בחשבון שלכם

## המיקום
**אופטיקה פריזמה** — הרצל 32, אשקלון
[ניווט עם Waze](https://waze.com/ul/hsv8s5h2c3)

---

צוות אופטיקה פריזמה 💛
[בקרו באתר](https://www.prizma-optic.co.il)
[@optic_prizma](https://instagram.com/optic_prizma)
[08-6751313](tel:08-6751313)',
  true,
  now()
) ON CONFLICT (tenant_id, slug, channel, language) DO NOTHING;

-- =============================================================================
-- Tier 1: Duplicate Registration (lead_intake_duplicate)
-- =============================================================================

-- SMS Template: Already Registered
INSERT INTO crm_message_templates (
  tenant_id,
  slug,
  name,
  channel,
  language,
  subject,
  body,
  is_active,
  created_at
) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_duplicate_sms_he',
  'Lead Already Registered — SMS (He)',
  'sms',
  'he',
  NULL,
  '*היי {{name}}* 👋
מספר הטלפון שהנך מנסה להרשם איתו, כבר רשום במערכת האירועים. ברגע שיפתח האירוע הקרוב, נשלח הודעה לטלפון ולמייל איתו נרשמת
נתראה בקרוב, צוות אופטיקה פריזמה 💛',
  true,
  now()
) ON CONFLICT (tenant_id, slug, channel, language) DO NOTHING;

-- Email Template: Already Registered
INSERT INTO crm_message_templates (
  tenant_id,
  slug,
  name,
  channel,
  language,
  subject,
  body,
  is_active,
  created_at
) VALUES (
  '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid,
  'lead_intake_duplicate_email_he',
  'Lead Already Registered — Email (He)',
  'email',
  'he',
  'היי {{name}}, נרשמת למערכת האירועים בעבר!',
  'היי {{name}}, 👋

מספר הטלפון שהנך מנסה להרשם איתו, **כבר רשום במערכת** ✅

## הכל תקין!
הפרטים המקוריים שלך בתוקף. ברגע שנפתח אירוע מכירות, נשלח לך:
- 📩 הודעה במייל עם קישור הרשמה
- 📱 SMS עם פרטי האירוע + קישור קצר
- 📞 טלפון: [08-6751313](tel:08-6751313)

## מה קורה כשאירוע נפתח?
1. תקבל הודעה במייל + SMS
2. תוכל להרשם לאירוע המכירות
3. שריון 50₪ דמי שריון (מקוזזים מהקנייה)
4. מגיע וניהנה! 🎉

---

צוות אופטיקה פריזמה 💛
[בקרו באתר](https://www.prizma-optic.co.il)
[@optic_prizma](https://instagram.com/optic_prizma)',
  true,
  now()
) ON CONFLICT (tenant_id, slug, channel, language) DO NOTHING;

-- =============================================================================
-- Verification Query
-- =============================================================================
-- Run after insert to verify:
-- SELECT count(*) FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid AND slug LIKE 'lead_intake%';
-- Expected: 4 rows (2 SMS + 2 Email)
