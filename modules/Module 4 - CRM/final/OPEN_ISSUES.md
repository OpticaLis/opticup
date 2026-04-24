# CRM — Open Issues (Post E2E Testing)

> **Created:** 2026-04-24
> **Source:** End-to-end testing of STOREFRONT_FORMS feature
> **Status:** 4/7 resolved by CRM_HOTFIXES SPEC (2026-04-24). Remaining: #3, #6, #7 → EVENT_CONFIRMATION_EMAIL SPEC.

---

## 1. קישורים קצרים (חובה) — ✅ RESOLVED 2026-04-24

**Priority:** CRITICAL
**Description:** הטוקנים ב-URL של הרשמה והסרה ארוכים מאוד (~200 תווים).
צריך מנגנון קיצור — או טוקן קצר יותר, או שירות redirect, או lookup table.
**Current:** `prizma-optic.co.il/event-register?token=ZjQ5ZDRkOGU...G36E8pn...`
**Expected:** קישור קצר שעובד ב-SMS (160 תווים מקסימום להודעה).
**Resolution:** Closed by SHORT_LINKS SPEC (commit 33fd7215) + CRM_HOTFIXES
verification of send-message EF v5 deploy (2026-04-24 05:30 UTC). EF now
wraps HMAC URLs in `/r/XXXXXXXX` short codes via `short_links` table.

---

## 2. סטטוס ליד → "הוזמן לאירוע" בשליחת הזמנה — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Description:** כשליד מקבל הודעת הזמנה לאירוע, הסטטוס שלו בבורד "רשומים"
צריך להשתנות ל-"הוזמן לאירוע" (invited). כרגע הסטטוס לא משתנה.
**Where:** לוגיקה ב-automation engine או ב-send-message EF — אחרי שליחה
מוצלחת, לעדכן `crm_leads.status = 'invited'` (רק אם הסטטוס הנוכחי נמוך יותר).
**Resolution:** CRM_HOTFIXES Fix 2 — commit 9fe1e36. Added
`promoteWaitingLeadsToInvited` helper in `crm-automation-engine.js`, wired
into both dispatch paths (confirmation-gate approveAndSend and
dispatchPlanDirect fallback). Atomic UPDATE scoped to `.eq('status','waiting')`
so confirmed/attended/unsubscribed leads are never demoted. Logs each
transition via ActivityLog.

---

## 3. שינוי סטטוס מרובה (Bulk Status Change)

**Priority:** MEDIUM
**Description:** צריך אפשרות לסמן מספר לידים בבורד (צ'קבוקסים או דרך סינון)
ולשנות לכולם את הסטטוס בפעם אחת.
**Where:** UI חדש ב-crm.html — כפתור "שנה סטטוס" שמופיע כשיש סימון מרובה.

---

## 4. כפתור "שלח הודעה" באירוע — לא עובד — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Description:** הכפתור לא מגיב. הציפייה: פותח חלון כתיבת הודעה חופשית
(raw body, לא תבנית) עם אפשרות לבחור למי לשלוח — כל הרשומים לאירוע
או סינון לפי סטטוס ספציפי של attendee.
**Where:** `modules/crm/crm-events-detail.js` — כנראה הכפתור קיים אבל
ה-handler חסר או שבור.
**Resolution:** CRM_HOTFIXES Fix 3 — commit 99ca541. Added
`data-action="send-message"` attribute + new file `crm-event-send-message.js`
(180 lines). Modal supports channel picker (SMS/Email), attendee-status
filter checkboxes with live recipient count, raw body + email subject,
per-recipient dispatch via CrmMessaging.sendMessage with progress indicator.
Extracted to a new file per SPEC §5 — crm-events-detail.js holds at 350 lines.

---

## 5. קיבולת אירוע vs קופונים — בדיקת תקינות — ✅ RESOLVED 2026-04-24 (no code change)

**Priority:** MEDIUM
**Description:** אירוע עם 50 מקומות + 10 קופונים נוספים מראה 60 קופונים
אבל רק 50 מקומות פנויים. צריך לבדוק:
- מה קורה כש-50 נרשמים ומנסים רישום מהיר של מישהו נוסף?
- האם הקופונים הנוספים מנוצלים נכון?
**Where:** RPC `register_lead_to_event` (capacity check) + UI display logic.
**Resolution:** Verified both are correct — no code change needed.
`register_lead_to_event` RPC gates purely on `v_current_count >= v_event.max_capacity`
(not max_coupons). `extra_coupons` does not appear in the RPC at all.
UI `renderCapacityBar` in crm-events-detail.js uses `event.max_capacity`
only, while the coupon cell shows `max_coupons + extra_coupons` as an
independent ceiling. So 50 registration cap + 60 coupon ceiling coexist
correctly: 51st registrant → waiting_list; extras are walk-in overflow.
Verified on demo event "P5.5 Demo Event #1" (max_capacity=50, extras=10,
ceiling=60).

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
