# SuperSale SMS Shortening Proposals

**Status:** DRAFT — awaiting Daniel's per-template verdicts (offline review with Cowork).

**Trigger:** Global SMS vendor returns 404 IIS error on Hebrew/UCS-2 SMS bodies above ~5–6 parts (~340–400 chars after substitution). Confirmed via QA Flow 3 on 2026-04-29: T5 (864 bytes / ~7 parts) → 404; verification SMS (336 bytes / 1 part) → DELIVERED.

**Strategy (Daniel-approved):**
1. Target ≤5 parts max after substitution (NOT 3–4 — preserve as much original content as possible).
2. Only touch templates currently >5 parts. Templates already ≤5 parts (T1, T2, T9, T6, payment_received, event_waiting_list_confirmation, event_coupon_delivery, event_attendee_moved_paid) are NOT modified.
3. Backend guard (P5_5 backlog or new SPEC): `send-message` EF will reject body >5 parts BEFORE dispatching to Make. Configurable per-tenant.

**Process:** This document is committed to develop. Daniel + Cowork review offline. Daniel returns per-template verdict (✅ approve / 🔄 edit / ❌ reject). Foreman applies approved versions to V2 files + DB tenants in a single commit.

**Char counting note:** Postgres `length()` counts Unicode code points; SMS UCS-2 segmentation counts code units (emojis with surrogate pairs and variation selectors count as 2). Targets below have safety margin to absorb the difference. Cowork can verify exact part counts during review.

**SMS UCS-2 part boundaries (Hebrew):**
| Parts | Max chars |
|---|---|
| 1 | 70 |
| 2 | 134 |
| 3 | 201 |
| 4 | 268 |
| **5** | **335** |
| 6 | 402 |
| 7 | 469 |

**Substitution growth estimates** (used to compute target template length from target substituted length):

| Variable | Template chars | Avg subst chars | Net |
|---|---|---|---|
| `%name%` | 6 | ~10 | +4 |
| `%event_name%` | 12 | ~25 | +13 |
| `%event_date%` | 12 | ~10 | -2 |
| `%event_time%` | 12 | ~10 | -2 |
| `%event_max_attendees%` | 21 | ~3 | -18 |
| `%event_deposit_amount%` | 22 | ~3 | -19 |
| `%registration_url%` | 18 | ~50 | +32 |
| `%unsubscribe_url%` | 16 | ~50 | +34 |
| `%payment_url_50%` | 16 | ~50 | +34 |
| `%phone%` | 7 | ~13 | +6 |

---

## Side findings

### Finding A — V2-vs-DB drift on the 5 V2-backed SMS templates: NONE

| Template | V2 file chars | DB chars | Match? |
|---|---|---|---|
| `event_invite_new_sms_he` | 444 | 444 | ✅ identical |
| `event_registration_open_sms_he` | 400 | 400 | ✅ identical |
| `event_2_3d_before_sms_he` | 391 | 391 | ✅ identical |
| `event_invite_waiting_list_sms_he` | 378 | 378 | ✅ identical |
| `event_attendee_moved_unpaid_sms_he` | 346 | 346 | ✅ identical |

V2 files committed once at `b605c62` and never edited since. No drift.

### Finding B — `event_registration_confirmation_sms_he` MISSING from V2 folder

DB has the template (374 chars, Prizma + demo). V2 folder has no backing file. **Source of truth for this template is currently DB-only.** The proposal below uses the DB body as CURRENT.

Recommended action regardless of shortening verdict: create `event_registration_confirmation_sms_he.txt` in V2 folder so all SuperSale SMS templates have file backing.

### Finding C — `event_registration_confirmation_sms_he` contains hardcoded tenant-specific values (separate concern from shortening)

The DB body hardcodes:
- `https://prizmaoptic.short.gy/gmapy` (should be `%payment_url_50%`)
- `50 ₪` (should be `%event_deposit_amount%`)
- `053-364-5404` (Prizma phone — fine for Prizma row, but blocks SaaS multi-tenancy)
- `הרצל 32, אשקלון` (should be `%event_location%` — already configurable in event row)

This is a **Rule 9 violation** (no hardcoded business values). NOT in scope for this shortening pass — flag for separate post-cutover SPEC. Shortened proposal below preserves the hardcoded values verbatim so the diff is purely length-driven.

---

## Template 1 — `event_invite_new_sms_he` (T5)

**CURRENT (V2 file = DB):**

```
ברוכים הבאים לאופטיקה פריזמה ✔️

%name%, בדיוק הצטרפתם למערכת אירועי המותגים שלנו - ויש כבר אירוע פתוח לרישום: %event_name% ב-%event_date% 📅

שימו לב: פתיחת ההרשמה אינה מבטיחה מקום. לאחר הרישום בקישור, נעדכן אם שוריין לכם מקום בקרב %event_max_attendees% הראשונים או שעברתם לרשימת המתנה.

כ-3 ימים לפני האירוע ניצור קשר לווידוא הגעה ולשליחת קופון ההטבות.

להרשמה ובדיקת סטטוס: %registration_url%

צוות אופטיקה פריזמה 💛

להסרה: %unsubscribe_url%
```

**chars: 444 (template) / ~507 (substituted) / ~7 parts**

**PROPOSED (target 5 parts max):**

```
ברוכים הבאים לאופטיקה פריזמה ✔️

%name%, הצטרפתם למערכת אירועי המותגים - יש אירוע פתוח לרישום: %event_name% ב-%event_date% 📅

שימו לב: ההרשמה אינה מבטיחה מקום. לאחר הרישום נעדכן אם שוריין לכם מקום בקרב %event_max_attendees% הראשונים או שעברתם לרשימת המתנה.

להרשמה: %registration_url%

להסרה: %unsubscribe_url%
```

**chars: ~285 (template) / ~348 (substituted) / ~5 parts**

**What was cut:**
- "כ-3 ימים לפני האירוע ניצור קשר לווידוא הגעה ולשליחת קופון ההטבות." — Daniel's earlier directive: removed; the pre-event-call flow is communicated by T8 (`event_2_3d_before`) when it actually fires (~64 chars).
- "בדיוק" before "הצטרפתם" — filler word (~6 chars).
- "ויש כבר" — implicit from "יש אירוע פתוח" (~8 chars).
- "פתיחת ההרשמה" → "ההרשמה" — same meaning, shorter (~14 chars).
- "לאחר הרישום בקישור" → "לאחר הרישום" — קישור implicit (~9 chars).
- "ובדיקת סטטוס" — status check is part of registration page UX, not template copy (~12 chars).
- "צוות אופטיקה פריזמה 💛" sign-off — sender already identified in line 1 (~25 chars).

**What was kept (verify checklist):**
- ☑ Brand greeting ("ברוכים הבאים לאופטיקה פריזמה ✔️")
- ☑ Personalization (`%name%`)
- ☑ Welcome-to-system context ("הצטרפתם למערכת אירועי המותגים")
- ☑ Core info (`%event_name%`, `%event_date%`)
- ☑ Key warning ("ההרשמה אינה מבטיחה מקום" + capacity rule with `%event_max_attendees%`)
- ☑ Waiting-list possibility
- ☑ CTA (`%registration_url%`)
- ☑ Compliance footer (`%unsubscribe_url%`)

---

## Template 2 — `event_registration_open_sms_he` (T4)

**CURRENT (V2 file = DB):**

```
%name%, נפתחה ההרשמה לאירוע המותגים %event_name% שיתקיים ב-%event_date% 📅

הטבות האירוע מוגבלות ל-%event_max_attendees% נרשמים בלבד - מומלץ לשריין מקום כעת לפני המעבר לרשימת המתנה.

שימו לב: שריון המקום כרוך בדמי רישום של %event_deposit_amount% ₪, שמקוזזים מהקנייה ביום האירוע (או מוחזרים במלואם בביטול עד 48 שעות לפני) ✔️

להרשמה: %registration_url%

צוות אופטיקה פריזמה 💛

להסרה: %unsubscribe_url%
```

**chars: 400 (template) / ~444 (substituted) / ~7 parts**

**PROPOSED (target 5 parts max):**

```
%name%, נפתחה ההרשמה לאירוע המותגים %event_name% ב-%event_date% 📅

המכסה מוגבלת ל-%event_max_attendees% נרשמים - מומלץ לשריין מקום לפני המעבר לרשימת המתנה.

דמי רישום: %event_deposit_amount% ₪ - מקוזזים מהקנייה ביום האירוע (או מוחזרים במלואם בביטול עד 48 שעות לפני) ✔️

להרשמה: %registration_url%

להסרה: %unsubscribe_url%
```

**chars: ~290 (template) / ~334 (substituted) / ~5 parts**

**What was cut:**
- "שיתקיים" before date → "ב-" sufficient (~7 chars).
- "הטבות האירוע מוגבלות" → "המכסה מוגבלת" (~10 chars).
- "בלבד" — filler (~5 chars).
- "כעת" — filler (~4 chars).
- "שימו לב: שריון המקום כרוך בדמי רישום של" → "דמי רישום:" — same meaning, much tighter (~30 chars).
- "צוות אופטיקה פריזמה 💛" sign-off (~25 chars).

**What was kept (verify checklist):**
- ☑ Personalization (`%name%`)
- ☑ "ההרשמה נפתחה" announcement
- ☑ Core info (`%event_name%`, `%event_date%`)
- ☑ Capacity warning (`%event_max_attendees%`)
- ☑ Waiting-list mention
- ☑ Deposit explanation (`%event_deposit_amount%`, refund policy, 48-hour rule)
- ☑ CTA (`%registration_url%`)
- ☑ Compliance footer (`%unsubscribe_url%`)

---

## Template 3 — `event_2_3d_before_sms_he` (T8)

**CURRENT (V2 file = DB):**

```
היי %name%,

אירוע המותגים שלנו ב-%event_date% מתקרב - מחכים לראות אתכם 📅

המקום שלכם שמור והקופון האישי כבר אצלכם במייל 📧 כל מה שצריך זה להגיע עם הקופון לסניף בהרצל 32, אשקלון 📍

חלו שינויים בתכניות? אפשר לבטל עד 48 שעות לפני האירוע (טלפון או וואטסאפ) ולקבל החזר מלא של דמי הרישום. כך נוכל להעניק את המקום למישהו מרשימת ההמתנה.

נתראה בקרוב,
צוות אופטיקה פריזמה 💛

להסרה: %unsubscribe_url%
```

**chars: 391 (template) / ~427 (substituted) / ~7 parts**

**PROPOSED (target 5 parts max):**

```
היי %name%,

אירוע המותגים שלנו ב-%event_date% מתקרב - מחכים לראות אתכם 📅

המקום שמור והקופון האישי כבר אצלכם במייל 📧 כל מה שצריך הוא להגיע עם הקופון לסניף הרצל 32, אשקלון 📍

חלו שינויים? ביטול עד 48 שעות לפני האירוע (טלפון/וואטסאפ) ← החזר מלא של דמי הרישום, ונעניק את המקום למישהו מרשימת ההמתנה.

להסרה: %unsubscribe_url%
```

**chars: ~298 (template) / ~334 (substituted) / ~5 parts**

**What was cut:**
- "המקום שלכם שמור" → "המקום שמור" (~5 chars).
- "כל מה שצריך זה" → "כל מה שצריך הוא" (~1 char, grammar).
- "בהרצל 32" → "הרצל 32" (~1 char).
- "חלו שינויים בתכניות? אפשר לבטל" → "חלו שינויים? ביטול" (~14 chars).
- "טלפון או וואטסאפ" → "טלפון/וואטסאפ" (~3 chars).
- "ולקבל החזר מלא של דמי הרישום. כך נוכל להעניק" → "← החזר מלא של דמי הרישום, ונעניק" (~14 chars).
- "נתראה בקרוב,\nצוות אופטיקה פריזמה 💛" sign-off (~37 chars).

**What was kept (verify checklist):**
- ☑ Personalization (`%name%`)
- ☑ Event date proximity message (`%event_date%`)
- ☑ Reservation status ("המקום שמור")
- ☑ Coupon delivery confirmation ("הקופון כבר אצלכם במייל")
- ☑ Location ("הרצל 32, אשקלון")
- ☑ Cancellation policy (48-hour rule, contact methods, refund)
- ☑ Waiting-list reciprocity (we give your spot to someone else if you cancel)
- ☑ Compliance footer (`%unsubscribe_url%`)

---

## Template 4 — `event_invite_waiting_list_sms_he` (T7)

**CURRENT (V2 file = DB):**

```
%name%, לאור הביקוש נפתח מועד נוסף לאירוע המותגים.

פרטי המועד החדש:
📅 תאריך: %event_date% | ⏰ שעות הפעילות: %event_time%

המכסה מוגבלת ל-%event_max_attendees% המאשרים הראשונים. אם המועד אינו מתאים לכם, אין צורך לבצע פעולה - מקומכם ברשימת ההמתנה יישמר לעדכונים עתידיים במידה ויתפנה מקום בתאריך אליו נרשמתם.

לאישור הגעה ושריון מקום: %registration_url%

להסרה: %unsubscribe_url%
```

**chars: 378 (template) / ~426 (substituted) / ~7 parts**

**PROPOSED (target 5 parts max):**

```
%name%, לאור הביקוש נפתח מועד נוסף לאירוע המותגים.

📅 %event_date% | ⏰ %event_time%

המכסה: %event_max_attendees% המאשרים הראשונים. אם המועד לא מתאים - אין צורך לפעול, מקומכם ברשימת ההמתנה לתאריך המקורי יישמר.

לאישור: %registration_url%

להסרה: %unsubscribe_url%
```

**chars: ~243 (template) / ~291 (substituted) / ~5 parts**

**What was cut:**
- "פרטי המועד החדש:\n" header line — redundant given the next line shows the details (~17 chars).
- "תאריך: " and "שעות הפעילות: " labels — emoji conveys meaning (~22 chars).
- "המכסה מוגבלת ל-" → "המכסה: " (~9 chars).
- "אם המועד אינו מתאים לכם, אין צורך לבצע פעולה" → "אם המועד לא מתאים - אין צורך לפעול" (~14 chars).
- "מקומכם ברשימת ההמתנה יישמר לעדכונים עתידיים במידה ויתפנה מקום בתאריך אליו נרשמתם" → "מקומכם ברשימת ההמתנה לתאריך המקורי יישמר" — same meaning, much shorter (~40 chars).
- "לאישור הגעה ושריון מקום" → "לאישור" (~17 chars).

**What was kept (verify checklist):**
- ☑ Personalization (`%name%`)
- ☑ "Additional date opened due to demand" framing
- ☑ New date + time (`%event_date%`, `%event_time%`)
- ☑ Capacity rule (`%event_max_attendees%`)
- ☑ Opt-out behavior (no action needed → original waiting-list status preserved)
- ☑ CTA (`%registration_url%`)
- ☑ Compliance footer (`%unsubscribe_url%`)

---

## Template 5 — `event_registration_confirmation_sms_he`

**⚠️ NO V2 FILE — source of truth is DB body. See Finding B above.**
**⚠️ Hardcoded tenant-specific values preserved as-is. See Finding C above.**

**CURRENT (DB only, Prizma):**

```
%name%, שריינת מקום באירוע המותגים של פריזמה ✔️
📅 %event_date%
📍 הרצל 32, אשקלון

🔒 להשלמת השריון וקבלת הקופון האישי – דמי שריון מקום בסך 50 ₪ (מקוזזים מהקנייה / מוחזרים בביטול 48 שעות לפני):
https://prizmaoptic.short.gy/gmapy

⏱️ המקום שמור ל-24 שעות.

חשוב: יש להזין את אותו מספר טלפון איתו נרשמת (%phone%), או לשלוח אסמכתא לוואטסאפ 053-364-5404.

להסרה: %unsubscribe_url%
```

**chars: 374 (template) / ~416 (substituted) / ~7 parts**

**PROPOSED (target 5 parts max):**

```
%name%, שריינת מקום באירוע המותגים של פריזמה ✔️
📅 %event_date% | 📍 הרצל 32, אשקלון

🔒 להשלמת השריון וקבלת הקופון - דמי שריון 50 ₪ (מקוזזים מהקנייה / מוחזרים בביטול 48 שעות לפני):
https://prizmaoptic.short.gy/gmapy

⏱️ המקום שמור ל-24 שעות.

חשוב: השתמשו באותו מספר (%phone%) או שלחו אסמכתא לוואטסאפ 053-364-5404.

להסרה: %unsubscribe_url%
```

**chars: ~290 (template) / ~332 (substituted) / ~5 parts**

**What was cut:**
- Date + location collapsed onto one line with `|` separator — saves a blank line (~3 chars).
- "מקום בסך" — redundant given context (~9 chars).
- "האישי" after "הקופון" (~7 chars).
- "יש להזין את אותו מספר טלפון איתו נרשמת" → "השתמשו באותו מספר" (~25 chars).

**What was kept (verify checklist):**
- ☑ Personalization (`%name%`)
- ☑ Reservation confirmation ("שריינת מקום ✔️")
- ☑ Date (`%event_date%`)
- ☑ Location ("הרצל 32, אשקלון")
- ☑ Payment requirement + fee + refund policy
- ☑ Payment link (hardcoded URL preserved)
- ☑ 24-hour reservation hold ("⏱️ המקום שמור ל-24 שעות")
- ☑ Phone-match instruction (`%phone%` + WhatsApp fallback)
- ☑ Compliance footer (`%unsubscribe_url%`)

**Decisions Daniel needs to make for this template:**
1. ✅/❌ shortened wording.
2. ✅/❌ create `event_registration_confirmation_sms_he.txt` in V2 folder using approved version (closes Finding B).
3. Defer Finding C (hardcoded values → variables) to separate post-cutover SPEC? (Recommended: yes.)

---

## Template 6 — `event_attendee_moved_unpaid_sms_he`

**CURRENT (V2 file = DB):**

```
%name%, עדכון ממערכת אירועי המותגים של אופטיקה פריזמה ✔️

מקומכם הועבר לאירוע %event_name% שיתקיים ב-%event_date% 📅

🔒 להשלמת השריון וקבלת הקופון האישי - דמי שריון מקום בסך %event_deposit_amount% ₪ (מקוזזים מהקנייה / מוחזרים בביטול 48 שעות לפני): %payment_url_50%

פרטים מלאים נשלחו אליכם במייל 📧

צוות אופטיקה פריזמה 💛

להסרה: %unsubscribe_url%
```

**chars: 346 (template) / ~410 (substituted) / ~7 parts**

**PROPOSED (target 5 parts max):**

```
%name%, עדכון מאופטיקה פריזמה ✔️

מקומכם הועבר לאירוע %event_name% ב-%event_date% 📅

🔒 להשלמת השריון וקבלת הקופון - דמי שריון %event_deposit_amount% ₪ (מקוזזים מהקנייה / מוחזרים בביטול 48 שעות לפני):
%payment_url_50%

פרטים מלאים נשלחו במייל 📧

להסרה: %unsubscribe_url%
```

**chars: ~268 (template) / ~332 (substituted) / ~5 parts**

**What was cut:**
- "ממערכת אירועי המותגים של אופטיקה פריזמה" → "מאופטיקה פריזמה" (~25 chars).
- "שיתקיים" — implicit (~7 chars).
- "האישי" after "הקופון" (~7 chars).
- "מקום בסך" — redundant (~9 chars).
- "אליכם" filler (~6 chars).
- "צוות אופטיקה פריזמה 💛" sign-off (~25 chars).
- Payment link onto its own line for visibility on small screens.

**What was kept (verify checklist):**
- ☑ Personalization (`%name%`)
- ☑ "Update from Prizma" framing with ✔️
- ☑ "Your spot was moved" message
- ☑ Core info (`%event_name%`, `%event_date%`)
- ☑ Payment requirement + fee + refund policy (`%event_deposit_amount%`, 48-hour rule)
- ☑ Payment link (`%payment_url_50%`)
- ☑ "Full details by email" pointer
- ☑ Compliance footer (`%unsubscribe_url%`)

---

## Summary

| Template | Current parts | Proposed parts | Status |
|---|---|---|---|
| T5 — `event_invite_new_sms_he` | ~7 | ~5 | awaiting verdict |
| T4 — `event_registration_open_sms_he` | ~7 | ~5 | awaiting verdict |
| T8 — `event_2_3d_before_sms_he` | ~7 | ~5 | awaiting verdict |
| T7 — `event_invite_waiting_list_sms_he` | ~7 | ~5 | awaiting verdict |
| `event_registration_confirmation_sms_he` | ~7 | ~5 | awaiting verdict + V2 file creation decision |
| `event_attendee_moved_unpaid_sms_he` | ~7 | ~5 | awaiting verdict |

## Open questions for Daniel + Cowork offline review

1. **Per-template verdicts** — for each of the 6, return ✅ approve / 🔄 edit (with specific edits) / ❌ reject.
2. **T5 line "כ-3 ימים לפני האירוע..."** — proposal cuts it per Daniel's earlier directive. Confirm; if Daniel wants it kept, the proposal needs to recover ~64 template chars elsewhere.
3. **`event_registration_confirmation_sms_he` V2 file** — create in V2 folder with approved body? (Recommended: yes, closes Finding B.)
4. **Finding C (hardcoded values in `event_registration_confirmation`)** — defer to post-cutover SPEC? (Recommended: yes; not in scope for length fix.)
5. **Backend length guard** — add to existing `P5_5_PHONE_EMAIL_HARDENING` SPEC, or create a new `P5_6_BACKEND_SMS_LENGTH_GUARD` SPEC? (Recommendation: new SPEC — different concern, different module owner — but Daniel's call.)

## After verdicts arrive

Single Foreman commit on develop:
- Update `campaigns/supersale/MESSAGES_V2/*.txt` for the 5 V2-backed templates that pass review.
- Create `event_registration_confirmation_sms_he.txt` with approved body (if Question 3 = yes).
- `UPDATE crm_message_templates` for both Prizma + demo tenants matching the V2 file content byte-for-byte.
- Re-run Flow 3 QA on Daniel's phone for T5 (canary test); if T5 delivers, expand QA to remaining flows.

No template changes ship to DB until Daniel's per-template verdicts arrive.
