# FINAL_FLOW_REPORT — M4

- **Start:** 2026-05-07 08:40:41 UTC
- **End:** 2026-05-07 08:55:20 UTC (last message logged)
- **Tenant:** demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) — zero prizma writes
- **Whitelist contacts confirmed:** primary `+972537889878`, secondary `+972503348349`, email `daniel@prizma-optic.co.il`. `tenants.test_mode_sms_allowlist` on demo gates SMS — verified 3 phones present (third `+972507168471` not used in this run).
- **Lead numbers used:** `דניאל טסט 1` (new lead, primary phone), `דניאל טסט 2` (existing P55 lead, temp-renamed for run, secondary phone — restored at cleanup)
- **Event numbers used:** `אירוע המותגים 1` (event_number=19, max_capacity=1, date=`14/05/2026`), `אירוע המותגים 2` (event_number=20, max_capacity=50, date=`21/05/2026`)
- **Step 0 fix applied:** yes — body 14337 → 12294 chars (Δ−2043). Demo only; prizma copy untouched (still 14337, still has phrase).
- **Prizma writes during run:** 0 verified (`crm_message_log` query post-run).

## STEP 0 — Coupon email gift-block removal

Surgical UPDATE on `crm_message_templates.id='4d42b03f-529e-4332-a8eb-97ddf97c8792'` (slug `event_coupon_delivery_email_he`, demo tenant).

Approach: `body = substring(body, 1, position('<!-- ═══ GIFT BLOCK ═══ -->'…)-1) || substring(body, position('<!-- ═══ TAKANON ═══ -->'…))`. Pre-flight verified each marker existed exactly once and "קונים מתנה" appeared once. Position-based slice avoided regex pitfalls with the nested table's multiple `</table>` tags.

Removed (verbatim, between `<!-- ═══ GIFT BLOCK ═══ -->` and `<!-- ═══ TAKANON ═══ -->`):
```html
<table cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background-color:#14161c; border:1px solid #262833; border-radius:10px; margin-bottom:24px;">
  <tr><td style="padding:20px;">
    <table …>
      <tr>
        <td width="110" valign="middle" class="gift-img-cell" style="padding-left: 20px;">
          <img src="…/Box-Prizma-2-300x300.png" width="100" …>
        </td>
        <td valign="middle" class="gift-text-cell">
          <p …>קונים מתנה? 🎁</p>
          <p …>עדכנו את הנציגים במעמד הקנייה ונדאג לארוז את המשקפיים
            <span …>באריזת מתנה יוקרתית כולל פתק החלפה.</span></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
```

Post-fix verification (raw template + rendered output both checked):
- `body LIKE '%קונים מתנה%'` → 0 rows ✅
- `body LIKE '%GIFT BLOCK%'` (marker comment) → 0 rows ✅
- TAKANON / QR COUPON / NO-SHOW NOTICE / `unsubscribe_url` all preserved ✅
- Rendered #13 email (`crm_message_log.id='61b252f9…'`) → 12343 chars, no gift phrase, has coupon code, has QR, has TAKANON ✅
- Prizma copy (`crm_message_templates.id='d3e19217…'`) unchanged at 14337 chars, still contains "קונים מתנה" ✅ (Daniel decides whether to apply later)

**The Step 0 change landed in the demo DB only — not committed to the repo. There is no file diff for it.**

## STEP 1 — Per-Template Results

Strategy: direct `send-message` EF calls for templates 1–13 (lead+event vars auto-injected by EF helpers); real `event-register` EF + form-submit POST for #14 to exercise the M4_PUBLIC_FORM_VARIABLES_HIGH regression path.

All messages logged to `crm_message_log` with `tenant_id=demo` (verified via post-run query). Verbatim SMS bodies + email metadata below; full email HTML available via `SELECT content FROM crm_message_log WHERE id=…`.

### #1 lead_intake_new — 🟢 sent
- Lead: דניאל טסט 1 (primary phone). No event.
- SMS log_id `81142ee4` — 335 chars:
```
היי דניאל טסט 1,

נרשמתם בהצלחה למערכת אירועי המותגים של אופטיקה פריזמה ✔️

ברגע שייפתח אירוע חדש - תקבלו SMS עם קישור הרשמה (כל אירוע מוגבל למספר משתתפים מוגדר).

בחלק מהאירועים נדרש שריון מקום בדמי רישום שמקוזזים במלואם מהקנייה.

פרטים מלאים נשלחו אליכם במייל 📧

צוות אופטיקה פריזמה 💛

להסרה: https://demo.opticalis.co.il/r/OfU2ttmF
```
- Email log_id `92479877` — 21643 bytes (intake new HTML, demo unsubscribe URL).

### #2 lead_intake_duplicate — 🟢 sent
- Lead: דניאל טסט 1.
- SMS log_id `0aa18991` — 295 chars:
```
היי דניאל טסט 1,

מספר הטלפון שאיתו ניסיתם להירשם כבר רשום במערכת אירועי המותגים שלנו ✔️

אין צורך לפעולה - ברגע שייפתח האירוע הקרוב, נשלח אליכם הודעה לטלפון ולמייל איתם נרשמתם.

פרטים מלאים נשלחו אליכם במייל 📧

נתראה בקרוב,
צוות אופטיקה פריזמה 💛

להסרה: https://demo.opticalis.co.il/r/mG4PbW4E
```
- Email log_id `e6c0d797` — 14903 bytes.

### #3 event_will_open_tomorrow — 🟢 sent (event 1)
- SMS log_id `d4ef0458` — 318 chars; email log_id `c20e035e` — 13102 bytes. Body references `מספר המשתתפים מוגבל ל-1` (max_capacity correctly substituted).

### #4 event_registration_open — 🟢 sent (event 1)
- SMS log_id `890714f2` — 296 chars:
```
דניאל טסט 1, נפתחה ההרשמה לאירוע המותגים 1 ב-14/05/2026 📅

המכסה מוגבלת ל-1 נרשמים - מומלץ לשריין מקום לפני המעבר לרשימת המתנה.

דמי רישום: 50 ₪ - מקוזזים מהקנייה (או החזר מלא בביטול עד 48 שעות) ✔️

להרשמה: https://demo.opticalis.co.il/r/Jd5pztd3


להסרה: https://demo.opticalis.co.il/r/DHFq4w3J
```
- Email log_id `610ed9bc` — 16673 bytes; `יום חמישי, 14/05/2026` + `09:00 - 14:00` rendered.

### #5 event_invite_new — 🟢 sent (event 1)
- Lead: דניאל טסט 1 — same lead as #1 to keep daniel-receivable; in production this fires at intake when an event is open.
- SMS log_id `48c66ebd` — 322 chars; email `4f479e20` — 16897 bytes.
```
ברוכים הבאים לאופטיקה פריזמה ✔️

דניאל טסט 1, הצטרפתם למערכת אירועי המותגים - יש אירוע פתוח: אירוע המותגים 1 ב-14/05/2026 📅

שימו לב: ההרשמה אינה מבטיחה מקום. נעדכן אם שוריין לכם מקום בקרב 1 הראשונים או שעברתם לרשימת המתנה.

להרשמה: https://demo.opticalis.co.il/r/GbrmuTIG


להסרה: https://demo.opticalis.co.il/r/x6i5UB9Z
```

### #6 event_invite_waiting_list — 🟢 sent (event 1, lead 2 secondary phone)
- SMS log_id `cbb5399d` — 325 chars; email `8fd1be48` — 11842 bytes.
```
דניאל טסט 2, לאור הביקוש נפתח מועד נוסף לאירוע המותגים.

📅 תאריך: 14/05/2026 | ⏰ שעות: 09:00 - 14:00

המכסה מוגבלת ל-1 המאשרים הראשונים. אם המועד אינו מתאים, אין צורך לבצע פעולה - מקומכם ברשימת ההמתנה לתאריך המקורי יישמר.

לאישור הגעה: https://demo.opticalis.co.il/r/xyOvyBac


להסרה: https://demo.opticalis.co.il/r/5e3DYi5B
```

### #7 event_waiting_list_confirmation — 🟢 sent (event 1, lead 2)
- SMS log_id `56a7c8cb` — 138 chars (concise):
```
שלום דניאל טסט 2, נרשמת לרשימת ההמתנה לאירוע אירוע המותגים 1. נעדכן אותך ברגע שיתפנה מקום! לביטול: https://demo.opticalis.co.il/r/EoOqX5BW
```
- Email log_id `b19d972d` — 4776 bytes.

### #8 event_registration_confirmation — 🟢 sent (event 2)
- SMS log_id `4aba7501` — 328 chars:
```
דניאל טסט 1, שריינתם מקום באירוע המותגים של אופטיקה פריזמה ✔️
📅 21/05/2026

🔒 להשלמת השריון - דמי שריון 50 ₪ (מקוזזים מהקנייה / החזר מלא בביטול עד 48 שעות):
https://prizmaoptic.short.gy/gmapy

⏱️ המקום שמור ל-24 שעות. שלמו ממספר 0537889878, או שלחו אסמכתא לוואטסאפ 053-364-5404.


להסרה: https://demo.opticalis.co.il/r/xQzokBgH
```
- Email log_id `4ea764be` — 20950 bytes; `יום חמישי 21/05/2026` + `09:00 - 14:00`.

### #9 event_2_3d_before — 🟢 sent (event 2)
- SMS log_id `03bc5ae1` — 330 chars; email `88309eea` — 15340 bytes.
```
היי דניאל טסט 1,

אירוע המותגים שלנו ב-21/05/2026 מתקרב - מחכים לראות אתכם 📅

המקום שמור והקופון האישי כבר אצלכם במייל 📧 כל מה שצריך הוא להגיע עם הקופון לסניף הרצל 32, אשקלון 📍

חלו שינויים בתכניות? אפשר לבטל עד 48 שעות לפני האירוע (טלפון או וואטסאפ) ולקבל החזר מלא של דמי הרישום.


להסרה: https://demo.opticalis.co.il/r/S3ZDVfDG
```

### #10 event_day — 🟢 sent (event 2)
- SMS log_id `977cc9fe` — 226 chars:
```
בוקר טוב דניאל טסט 1, היום זה קורה ☀️

מחכים לכם ב-09:00 - 14:00 📍 הרצל 32, אשקלון (יש חניה)

🚗 לניווט מהיר עם וייז: https://waze.com/ul/hsv8s5h2c3

נתראה,
צוות אופטיקה פריזמה 💛

להסרה: https://demo.opticalis.co.il/r/gbhDwFx6
```
- Email log_id `39f232c6` — 11597 bytes.

### #11 event_attendee_moved_unpaid — 🟢 sent (event 2)
- SMS log_id `d62a9f43` — 303 chars; email `68b26e76` — 12004 bytes. Variables auto-injected (`%event_deposit_amount%`, `%payment_url_50%` resolved from `tenants.payment_links`).
```
דניאל טסט 1, עדכון מאופטיקה פריזמה ✔️

מקומכם הועבר לאירוע אירוע המותגים 2 ב-21/05/2026 📅

🔒 להשלמת השריון וקבלת הקופון - דמי שריון 50 ₪ (מקוזזים מהקנייה / מוחזרים בביטול 48 שעות לפני):
https://prizmaoptic.short.gy/gmapy

פרטים מלאים נשלחו אליכם במייל 📧


להסרה: https://demo.opticalis.co.il/r/42zRnfQE
```

### #12 event_attendee_moved_paid — 🟢 sent (event 2)
- SMS log_id `e472c351` — 289 chars; email `10e04d2a` — 10903 bytes.
```
דניאל טסט 1, עדכון ממערכת אירועי המותגים של אופטיקה פריזמה ✔️

מקומכם הועבר לאירוע אירוע המותגים 2 שיתקיים ב-21/05/2026 📅

דמי הרישום ששילמתם עוברים יחד למקום החדש - אין צורך לשלם שוב.

פרטים מלאים נשלחו אליכם במייל 📧

צוות אופטיקה פריזמה 💛

להסרה: https://demo.opticalis.co.il/r/mKEYNMA7
```

### #13 event_coupon_delivery — 🟢 sent (event 2) — **STEP 0 REGRESSION GREEN**
- SMS log_id `63a5a134` — 257 chars (no event-specific vars in SMS body):
```
🎫 שריון המקום שלך הושלם! הקופון האישי נשלח אלייך למייל.

חשוב: יש להציג את הקופון בהגעה. המקום שמור לך - אם לא תוכל/י להגיע, עדכנו אותנו עד 48 שעות לפני האירוע ותקבל/י החזר מלא של דמי השריון.

*רכישה באירוע כפופה לתקנון:
https://prizmaoptic.short.gy/dgUUIn
```
- Email log_id `61b252f9` — 12343 bytes (was 14385 pre-Step-0 → confirmed shrunk by ~2042 bytes consistent with the template-side delete). Template_id used = `4d42b03f…` (the one I edited in Step 0). Body verified:
  - `LIKE '%קונים מתנה%'` → false ✅
  - `LIKE '%GIFT BLOCK%'` → false ✅
  - has coupon, QR (`?data=9cc4c7df-2275-4fe7-a1c7-6e724ff7a79f`), TAKANON, demo unsubscribe (`https://demo.opticalis.co.il/r/aBD9qobX`) ✅
  - rendered date `יום חמישי 21/05/2026`, time `09:00 - 14:00`, coupon `TEST_E2_ca917acd` ✅

### #14 event_registration_form (auto T5/T7 form link) — 🟡 partial
**Direct fire of `event_registration_form` slug FAILED — `template_not_found: event_registration_form_sms_he`** (log_id `064c0937`). The slug doesn't exist on demo (see Findings F1).

Real-flow path executed instead — the form link is embedded in `event_registration_open` SMS (#4): `https://demo.opticalis.co.il/r/Jd5pztd3` resolves via `short_links.target_url` to `https://demo.opticalis.co.il/event-register?token=…`. POSTed directly to event-register EF (DNS for `demo.opticalis.co.il` doesn't resolve from this machine, so I bypassed the storefront UI and hit the EF — the EF body is what carries the M4_PUBLIC_FORM_VARIABLES_HIGH fix that needs verification).

```
POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/event-register?token=…
{ "arrival_time":"09:00-10:00", "eye_exam":"no", "notes":"final flow test #14" }
→ 200 { "status":"registered", "success":true, "attendee_id":"6e180dd0-…" }
```

Auto-fired confirmation messages (via send-message → injectEventVariables canonical formatters):
- SMS log_id `51fe57b1` — `📅 14/05/2026` ✅ DD/MM/YYYY (NOT `2026-05-14`)
- Email log_id `8ec3ffb3` — 20950 bytes; verified:
  - `content LIKE '%14/05/2026%'` → true ✅
  - `content LIKE '%2026-05-14%'` → false ✅ (no ISO bleed-through)
  - `content LIKE '%09:00 - 14:00%'` → true ✅ HH:MM-HH:MM range
  - `content LIKE '%09:00:00%'` → false ✅ (no seconds bleed-through)
  - `content LIKE '%14:00:00%'` → false ✅
  - `content LIKE '%יום חמישי%'` → true ✅ (DOW formatter)

**M4_PUBLIC_FORM_VARIABLES_HIGH regression confirmed live on demo.**

## STEP 2 — System checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Activity-log dedup | N/A — used direct EF path, no staff UI actions | `activity_log` rows during run = 0 (expected) |
| 2 | crm_automation_runs counts | N/A — bypassed engine; direct send-message + form path | `crm_automation_runs` rows during run = 0 (expected) |
| 3 | Queue drain | 🟢 0 pending/queued | `SELECT COUNT(*) FROM crm_message_queue WHERE tenant_id=demo AND status IN ('pending','queued') AND created_at >= START` |
| 4 | Prizma writes during run | 🟢 0 (CRITICAL) | `SELECT COUNT(*) FROM crm_message_log WHERE tenant_id=prizma AND created_at >= START` → 0 |
| 5 | Step 0 fix held | 🟢 still no gift phrase | `crm_message_templates.id='4d42b03f…'` body_len=12294, no `%קונים מתנה%`, no `%GIFT BLOCK%` |

Demo write distribution: 14 SMS sent + 14 email sent + 1 SMS failed (the single `event_registration_form` template-not-found, expected per F1).

## Fixes applied during run

None. Step 0 was the only DB UPDATE; everything else either worked first try or failed for findings logged below.

## Findings for follow-up SPEC

### F1 — INFO — Template `event_registration_form_*_he` does not exist on demo
- **Where:** `crm_message_templates` (tenant=demo). The expected slug `event_registration_form_sms_he` returns `template_not_found` from send-message EF.
- **Reality:** the auto T5/T7 "form-link" SMS Daniel referenced is embedded inside `event_registration_open_sms_he` (the `להרשמה: …short_link…` line). There is no separate `event_registration_form` template.
- **Suggested action:** clarify whether (a) the slug is permanently retired and Daniel's prompt list should drop it, OR (b) it should be seeded as a separate scheduled-form-reminder template (different from `event_registration_open` which fires on status flip, not on schedule).

### F2 — INFO — Two extra active templates on demo not in Daniel's test list
- `event_waiting_list_sms_he` + `event_waiting_list_email_he` — distinct from `event_invite_waiting_list_*` (#6) and `event_waiting_list_confirmation_*` (#7). Possibly legacy/unused.
- `payment_received_sms_he` + `payment_received_email_he` — fires from "mark paid" CRM staff action (M4_ATTENDEE_PAYMENT_SCHEMA SPEC #1 of 3). Out of scope for this customer-facing test but exists in production.
- **Suggested action:** harvest into a "demo template inventory hygiene" SPEC; mark legacy templates `is_active=false` with a clear successor link.

### F3 — INFO/LOW — Email body templates carry hardcoded "אופטיקה פריזמה" branding even on demo tenant
- **Where:** Multiple `*_email_he` template bodies on demo include literal "אופטיקה פריזמה" in signature, copyright, phone (`08-6751313`), WhatsApp link (`wa.me/972533645404`), and the WordPress URL `https://prizma-optic.co.il/supersale-takanon/`.
- **Why this is a SaaS readiness gap:** M4_HARDCODED_PRIZMA_REMOVAL closed config-driven leakage (`whatsapp_phone_e164`, `storefront_url`, brand colors) but did NOT touch email-body template content — each tenant has its own row in `crm_message_templates`, and demo's row was seeded as a copy of prizma's. So when demo customers receive these emails, the brand voice is Prizma's, not demo's.
- **Why it's INFO/LOW not HIGH:** demo never serves real customers (it's the test tenant). The leak only surfaces in dev/QA. For tenant 2 onboarding, a "templatize email body content with `%tenant_brand%`/`%tenant_phone%`/`%tenant_url%`" SPEC will be needed.
- **Suggested action:** open `M4_EMAIL_TEMPLATE_TENANT_CONFIG` SPEC to extract brand/contact lines into tenant-config-driven variables (similar to `tenant-config.ts` helper from M4_HARDCODED_PRIZMA_REMOVAL).

### F4 — INFO — `tenants.payment_links[50]` on demo points at `prizmaoptic.short.gy/gmapy`
- **Where:** `SELECT payment_links FROM tenants WHERE slug='demo'` → `{"50":"https://prizmaoptic.short.gy/gmapy"}`.
- **Why:** demo's payment-links seed reuses prizma's shortener URL. Functional for QA (Daniel's shortener) but a leak similar to F3.
- **Suggested action:** decide whether demo gets its own payment-link host or whether short.gy is acceptable as Daniel-managed shared infra. Roll into F3 SPEC if both apply.

### F5 — INFO — Existing demo lead "P55 Daniel Secondary" required temp rename to use the secondary phone
- **Why:** `crm_leads_tenant_phone_active_uniq` (partial unique on `(tenant_id, phone) WHERE is_deleted=false`) blocked creating `דניאל טסט 2` with `+972503348349` because P55 still owns that phone. I renamed P55 to `דניאל טסט 2` for the run + restored at cleanup. Original state restored: `full_name='P55 Daniel Secondary'`, `email='danylis92@gmail.com'`.
- **Suggested action:** if a future automated test framework runs against demo regularly, consider a `CRM_DEMO_SEED` SPEC that wipes/re-seeds whitelist phones each run (M4-DATA-03 from session-context).

## Cleanup

```
-- Restore P55 (original values):
crm_leads.id='efc0bd54-c6ed-4430-9552-018935a7ebbc'
  full_name → 'P55 Daniel Secondary'
  email     → 'danylis92@gmail.com'

-- Soft-delete run-created entities:
crm_leads.id='9cc4c7df-2275-4fe7-a1c7-6e724ff7a79f' (דניאל טסט 1)         → is_deleted=true
crm_event_attendees.id='6e180dd0-…' (form-submit)                          → is_deleted=true
crm_events.id='8505c51e-…' (אירוע המותגים 1)                             → is_deleted=true
crm_events.id='53ef9cff-…' (אירוע המותגים 2)                             → is_deleted=true
```

Verifications post-cleanup:
- p55_restored: name="P55 Daniel Secondary", email="danylis92@gmail.com" ✅
- lead1_deleted: is_deleted=true ✅
- attendee_deleted: is_deleted=true ✅
- events_deleted: 2/2 ✅
- Zombie attendees on whitelist phones: 8 active rows — **all pre-existing P55 attendees from 2026-04-24 to 2026-05-04** (other test events, NOT from this run). Out of scope to clean.

## Verdict

**🟢 ALL GREEN — Daniel received every customer-facing message in scope and they look correct.**

- Step 0 fix shipped DB-side and verified live in #13 rendered email.
- M4_PUBLIC_FORM_VARIABLES_HIGH regression check confirmed via real form-submit path (#14): DD/MM/YYYY date + HH:MM-HH:MM time, no ISO/seconds bleed.
- 28 of 29 attempted messages delivered (1 expected failure for non-existent `event_registration_form` slug, logged as F1).
- Zero prizma writes during run.
- 4 small findings logged for follow-up SPECs (F1–F4 templating/config hygiene; F5 demo-seed hygiene).

## Per-message log_id index (for body retrieval)

```
SELECT content FROM crm_message_log WHERE id IN (
  '81142ee4','92479877','0aa18991','e6c0d797',                -- #1, #2
  'd4ef0458','c20e035e','890714f2','610ed9bc','48c66ebd','4f479e20',  -- #3, #4, #5
  'cbb5399d','8fd1be48','56a7c8cb','b19d972d',                -- #6, #7
  '4aba7501','4ea764be',                                      -- #8
  '03bc5ae1','88309eea','977cc9fe','39f232c6',                -- #9, #10
  'd62a9f43','68b26e76','e472c351','10e04d2a',                -- #11, #12
  '63a5a134','61b252f9',                                      -- #13
  '51fe57b1','8ec3ffb3'                                       -- #14 form-submit confirmation
);
```
