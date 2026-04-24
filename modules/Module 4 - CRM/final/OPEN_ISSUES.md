# CRM — Open Issues (Post E2E Testing)

> **Created:** 2026-04-24
> **Source:** End-to-end testing of STOREFRONT_FORMS feature
> **Status:** 7/7 resolved as of 2026-04-24. #1, #2, #4, #5 → CRM_HOTFIXES. #3, #6, #7 → EVENT_CONFIRMATION_EMAIL.

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

## 3. שינוי סטטוס מרובה (Bulk Status Change) — ✅ RESOLVED 2026-04-24 (already shipped in P2a)

**Priority:** MEDIUM
**Description:** צריך אפשרות לסמן מספר לידים בבורד (צ'קבוקסים או דרך סינון)
ולשנות לכולם את הסטטוס בפעם אחת.
**Where:** UI חדש ב-crm.html — כפתור "שנה סטטוס" שמופיע כשיש סימון מרובה.
**Resolution:** EVENT_CONFIRMATION_EMAIL SPEC pre-flight discovered the
feature was already fully implemented in P2a (2026-04-21) and instrumented
with ActivityLog in P12 (2026-04-22). Registered leads tab renders row
checkboxes (`crm-leads-tab.js:169-183` via `_selectedIds` Set); bulk bar
exposes "שנה סטטוס" which calls `CrmLeadActions.openBulkStatusPicker`
(`crm-lead-modals.js:73-333`); batch writes emit
`crm.lead.bulk_status_change` audit entries. Issue marker was stale —
OPEN_ISSUES.md was authored after E2E testing that focused on event
flows, not the leads board. Closed without code changes. Duplicate new
implementation was avoided per Rule 21.

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

## 6. QR Code חסר באישור הרשמה — ✅ RESOLVED 2026-04-24

**Priority:** CRITICAL
**Description:** בעבר ליד שנרשם לאירוע קיבל מייל עם QR Code שנסרק
בכניסה לאירוע. עכשיו המייל מגיע בלי QR Code. צריך:
- לייצר QR Code עבור כל attendee (מקודד את ה-attendee_id או barcode)
- לכלול אותו במייל אישור ההרשמה
- קישור לתשלום 50 ש"ח דמי שריון
**Where:** תבנית `event_registration_confirmation_email_he` + לוגיקת יצירת
QR ב-send-message EF או בתבנית HTML.
**Resolution:** EVENT_CONFIRMATION_EMAIL SPEC. QR embedded as
`<img src="https://api.qrserver.com/v1/create-qr-code/?data=%lead_id%...">`
directly in the email template body — substituted by send-message EF's
variable engine at send time. New `%lead_id%` variable injected by
`event-register/index.ts` (one-line §4 exception) so the public-form
registration path resolves it correctly. QR encodes lead_id UUID
(same semantics as the old Monday system's attendee_id). Payment
placeholder link `prizma-optic.co.il/payment?attendee_id=%lead_id%`
included per SPEC (actual Bit integration out of scope).
**Pending:** Manual redeploy of `event-register` EF from Daniel's
Supabase CLI — MCP deploy path failed (see FINDINGS).

---

## 7. עיצוב מייל אישור הרשמה — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Description:** המייל שמגיע אחרי הרשמה לאירוע לא מעוצב — טקסט פשוט.
צריך מייל HTML מעוצב ובראנד של פריזמה, עם:
- לוגו פריזמה
- פרטי האירוע (שם, תאריך, שעה, מיקום)
- QR Code (ראה #6)
- קישור תשלום דמי שריון
- כפתור WhatsApp ליצירת קשר
**Where:** תבנית email ב-`crm_message_templates` — צריך תבנית HTML חדשה.
**Resolution:** EVENT_CONFIRMATION_EMAIL SPEC — UPDATE (not INSERT, to
respect Rule 21) of existing `event_registration_confirmation_email_he`
row on demo tenant. New body 3039 chars, table-based layout, inline
styles, RTL, max-width 600px. Prizma gold-on-black header with
"PRIZMA OPTIC" wordmark, event details box (gold-tinted background),
QR code section, payment CTA button, dark footer with unsubscribe link.
Subject updated to `אישור הרשמה: %event_name% — אופטיקה פריזמה`. SMS
variant also refreshed to mention that QR + payment details were sent
to email (124 chars, 2 UCS-2 segments).
