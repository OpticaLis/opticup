# CRM — Open Issues (Post E2E Testing)

> **Created:** 2026-04-24
> **Source:** End-to-end testing of STOREFRONT_FORMS feature
> **Status:** 8/8 original issues resolved as of 2026-04-24. #1, #2, #4, #5 → CRM_HOTFIXES. #3, #6, #7 → EVENT_CONFIRMATION_EMAIL. #8 → WORKING_TREE_RECOVERY + INTEGRITY_GATE_SETUP. #9 open — template propagation to Prizma (deferred to P7 cutover). #10 open — coupon-send button is flag-only, no dispatch (COUPON_SEND_WIRING SPEC). #11 deferred — "Add to calendar" in messages (needs ICS endpoint + %event_date_iso% variable).

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

---

## 8. קבצים מושחתים ב-working tree (Cowork VM null-byte padding) — ✅ RESOLVED 2026-04-24

**Priority:** HIGH
**Description:** סביבת ה-Cowork VM דיווחה על 1,083 רשומות ב-`git status`
(821 CRLF + 40+ truncated) ב-2026-04-24. SPEC ראשון (WORKING_TREE_RECOVERY)
נכתב לשחזור, אך כשה-Executor רץ על מחשב דניאל ראה רק 5 רשומות — המצב
הנקי הצפוי. עצר ב-step 0 ואימת שאין השחתה בקבצים שנבדקו. השאלה: האם
באמת היו קבצים מושחתים?
**Resolution:** מכוסה בשני SPECs:
- **WORKING_TREE_RECOVERY** (closed 🟡 as no-op) — CRLF-alarm היה false
  signal של סביבת ה-Cowork (אין לה autocrlf). autocrlf על מחשב דניאל
  מתמודד עם CRLF נכון. spot check של 5 קבצים ב-EXECUTION_REPORT אישר אין
  null-byte corruption בהם.
- **INTEGRITY_GATE_SETUP** (closed ✅) — התקנת Iron Rule 31 +
  `scripts/verify-tree-integrity.mjs`. ברגע שהשער רץ על כל העץ לראשונה,
  הוא מצא **2 מקרי null-byte corruption אמיתיים** שה-spot check של SPEC 1
  פספס: `CLAUDE.md` (49 NULs baked in HEAD) ו-
  `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (913 NULs).
  git ראה את שניהם כ-binary (NULs = binary classification) ולכן `git diff`
  היה ריק. זה בדיוק סוג ההשחתה ש-Rule 31 נועד למנוע — ועכשיו הוא מותקן.
  שני הקבצים תוקנו (תוכן נשמר, padding הוסר, LF נוסף) ב-commit `bf36f48`.
**Lesson:** authoring-env vs execution-env עלול להבדיל סנסורית — ה-Cowork
VM ראה CRLF שלא היה קיים מבחינת git (reporting artifact), אבל פספס
null-byte corruption שכן היה. Spot-checking של קבצים בודדים לא מספיק;
whole-tree automated gate נחוץ.
**Followup:** `final/INTEGRITY_GATE_SETUP/FINDINGS.md` כולל 6 findings
נוספים (Sentinel gap, style inconsistency, husky comment).

---

## 9. Propagate all message templates demo → prizma (P7 cutover) — 🟡 OPEN

**Priority:** HIGH (blocking Prizma production cutover)
**Created:** 2026-04-24
**Description:** The demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) holds
all 24 CRM message templates (email + SMS for every slug). The prizma tenant
(`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) has **0 rows** in
`crm_message_templates`. Every template edit today (e.g., today's update to
`event_registration_confirmation_email_he` + `_sms_he`) lands on demo only —
once prizma is cut over to the Optic Up CRM pipeline, leads on prizma will
hit missing-template errors.
**Where:** `crm_message_templates` table. Needs a one-shot INSERT SELECT
that copies every row from demo, rewriting `tenant_id` to prizma's UUID and
minting new `id` values.
**Plan (for P7 SPEC, not now):**
1. Snapshot demo templates at cutover time:
   `INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active)
    SELECT '6ad0781b-37f0-47a9-92e3-be9ed1477e1c', slug, name, channel, language, subject, body, is_active
      FROM crm_message_templates WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';`
2. Daniel reviews the prizma-branded subject lines (some may need tweaking
   from "demo" wording).
3. E2E send one message per channel on a prizma staff test lead.
**Why not now:** Prizma cutover is gated on Module 4 P7 (Production Cutover
SPEC). Propagating templates before other P7 prerequisites creates a half-
ready tenant where messages exist but other pipeline pieces (Monday bridge,
event scheduling, staff PIN accounts) are not yet in place.
**Source:** Today's SuperSale message-update task (event_registration_confirmation)
surfaced the gap — UPDATE affected only demo (1 row per slug), not the
"UPDATE affects both tenants" assumption in the original prompt.

---

## 10. כפתור "שלח" בקופון ב-Event Day לא שולח הודעה — ⚠️ OPEN

**Priority:** HIGH
**Created:** 2026-04-24
**Description:** `toggleCoupon()` in `modules/crm/crm-event-day-manage.js:250-269`
only updates `crm_event_attendees.coupon_sent=true` + `coupon_sent_at=now()`
and calls `logActivity('crm.attendee.coupon_sent', id)`. It does NOT call
`CrmMessaging.sendMessage` or hit the `send-message` Edge Function. Therefore
clicking "שלח" next to an attendee's coupon (in Event Day Mode → Manage
sub-tab) silently flips a boolean; no SMS or email is dispatched to the
attendee's phone/email.
**Where:** `modules/crm/crm-event-day-manage.js` lines 250–269 (and by
extension `couponCell` at line 110–115 which renders the button).
**Next step:** SPEC `modules/Module 4 - CRM/final/COUPON_SEND_WIRING/SPEC.md`
will wire the button to `CrmMessaging.sendMessage({ template_slug:
'event_coupon_delivery', variables: { coupon_code, lead_id, name,
event_name, event_date, event_time, phone, email } })`. Templates
`event_coupon_delivery_{email,sms}_he` already exist on demo (inserted in
commit `f621b49`, 2026-04-24) — the dispatch wiring is the remaining gap.
**Blockers for fix:**
(a) `crm_event_attendees` needs each attendee's resolved `coupon_code` accessible.
Today `crm_events.coupon_code` is a single event-wide code (e.g. "Supersale0526").
If the product intent is truly per-attendee codes (unique per recipient) a
column `crm_event_attendees.coupon_code` + minting logic is required;
otherwise the SPEC can just pass `event.coupon_code` as the variable.
(b) The button uses `coupon_sent`/`coupon_sent_at` only — it should set
those AFTER a successful dispatch, not before. Today's ordering would mark
"sent" even when Make returns an error.
(c) The `send-message` EF variable substitution engine already supports
caller-passed `%coupon_code%` and `%lead_id%` — no EF change needed for (a)
if per-attendee codes stay out of scope.

---

## 11. "הוספה ליומן" בהודעות — ⚠️ DEFERRED

**Priority:** LOW
**Created:** 2026-04-24
**Description:** ההודעות המקוריות ב-Make כללו כפתור/לינק "הוספה ליומן"
דרך `{{89.shortURL}}`. בעת ההמרה ל-Supabase (COUPON commit `f621b49`,
2026-04-24) הוסרו כי אין במערכת: (א) ICS generator, (ב) ISO date variable
(`%event_date%` הוא טקסט עברי לתצוגה בלבד, לא RFC3339).
**Where:** `event_coupon_delivery_email_he` (calendar button removed),
`event_coupon_delivery_sms_he` ("הוספה ליומן:" line removed). Registration
confirmation email did not have this feature originally — only coupon.
**Next step:** Future SPEC to build `calendar.ics` endpoint + add
`%event_date_iso%` variable (RFC 3339) to `send-message` EF. After that,
restore the calendar button:
```html
<a href="%calendar_url%" style="...">📅 הוספה ליומן</a>
```
where `%calendar_url%` is either a storefront `/event/:id/ics` short URL or
a pre-built Google Calendar template URL injected server-side.
