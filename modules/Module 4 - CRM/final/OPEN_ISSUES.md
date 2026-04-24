# CRM — Open Issues (Post E2E Testing)

> **Created:** 2026-04-24
> **Source:** End-to-end testing of STOREFRONT_FORMS feature
> **Status:** Open — to be addressed before CRM production launch

---

## 1. קישורים קצרים (חובה)

**Priority:** CRITICAL
**Description:** הטוקנים ב-URL של הרשמה והסרה ארוכים מאוד (~200 תווים).
צריך מנגנון קיצור — או טוקן קצר יותר, או שירות redirect, או lookup table.
**Current:** `prizma-optic.co.il/event-register?token=ZjQ5ZDRkOGU...G36E8pn...`
**Expected:** קישור קצר שעובד ב-SMS (160 תווים מקסימום להודעה).

---

## 2. סטטוס ליד → "הוזמן לאירוע" בשליחת הזמנה

**Priority:** HIGH
**Description:** כשליד מקבל הודעת הזמנה לאירוע, הסטטוס שלו בבורד "רשומים"
צריך להשתנות ל-"הוזמן לאירוע" (invited). כרגע הסטטוס לא משתנה.
**Where:** לוגיקה ב-automation engine או ב-send-message EF — אחרי שליחה
מוצלחת, לעדכן `crm_leads.status = 'invited'` (רק אם הסטטוס הנוכחי נמוך יותר).

---

## 3. שינוי סטטוס מרובה (Bulk Status Change)

**Priority:** MEDIUM
**Description:** צריך אפשרות לסמן מספר לידים בבורד (צ'קבוקסים או דרך סינון)
ולשנות לכולם את הסטטוס בפעם אחת.
**Where:** UI חדש ב-crm.html — כפתור "שנה סטטוס" שמופיע כשיש סימון מרובה.

---

## 4. כפתור "שלח הודעה" באירוע — לא עובד

**Priority:** HIGH
**Description:** הכפתור לא מגיב. הציפייה: פותח חלון כתיבת הודעה חופשית
(raw body, לא תבנית) עם אפשרות לבחור למי לשלוח — כל הרשומים לאירוע
או סינון לפי סטטוס ספציפי של attendee.
**Where:** `modules/crm/crm-events-detail.js` — כנראה הכפתור קיים אבל
ה-handler חסר או שבור.

---

## 5. קיבולת אירוע vs קופונים — בדיקת תקינות

**Priority:** MEDIUM
**Description:** אירוע עם 50 מקומות + 10 קופונים נוספים מראה 60 קופונים
אבל רק 50 מקומות פנויים. צריך לבדוק:
- מה קורה כש-50 נרשמים ומנסים רישום מהיר של מישהו נוסף?
- האם הקופונים הנוספים מנוצלים נכון?
**Where:** RPC `register_lead_to_event` (capacity check) + UI display logic.

---

## 6. QR Code חסר באישור הרשמה

**Priority:** CRITICAL
**Description:** בעבר ליד שנרשם לאירוע קיבל מייל עם QR Code שנסרק
בכניסה לאירוע. עכשיו המייל מגיע בלי QR Code. צריך:
- לייצר QR Code עבור כל attendee (מקודד את ה-attendee_id או barcode)
- לכלול אותו במייל אישור ההרשמה
- קישור לתשלום 50 ש"ח דמי שריון
**Where:** תבנית `event_registration_confirmation_email_he` + לוגיקת יצירת
QR ב-send-message EF או בתבנית HTML.

---

## 7. עיצוב מייל אישור הרשמה

**Priority:** HIGH
**Description:** המייל שמגיע אחרי הרשמה לאירוע לא מעוצב — טקסט פשוט.
צריך מייל HTML מעוצב ובראנד של פריזמה, עם:
- לוגו פריזמה
- פרטי האירוע (שם, תאריך, שעה, מיקום)
- QR Code (ראה #6)
- קישור תשלום דמי שריון
- כפתור WhatsApp ליצירת קשר
**Where:** תבנית email ב-`crm_message_templates` — צריך תבנית HTML חדשה.
