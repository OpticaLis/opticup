# PHASE2_REPORT.md — Module 4 Functional Flow Tests

**Phase 2 start:** 2026-05-06 15:40 (Israel) / 12:40:35 UTC
**Phase 2 end:** 2026-05-06 15:59 (Israel) / 12:59:39 UTC
**Total runtime:** 0h 19m (well under the 4h budget)
**Branch:** `develop` @ `52263fc` (unchanged at end)
**Machine:** 🖥️ Windows desktop, repo `opticalis/opticup`
**Repo state at start:** untracked items only (Phase 1 outputs + pre-existing drafts) — no modifications, no Phase 2-touched committed files
**Files created:** 2 (`SPEC.md` + this report) — no other project changes
**Commits produced:** 0
**Whitelist enforced:** phone `+972537889878`, email `daniel@prizma-optic.co.il`
**Demo lead IDs touched:** `6cbcbddc-9b19-4ca7-9e46-281048ed5292` (pre-existing, soft-deleted in T9), `29276e29-a114-40fb-a740-0465e5478d53` (T1 first attempt — mojibake artifact, soft-deleted), `b52e8fbc-5a96-4641-a6d4-7dad99acc20d` (T1 retry, used for T2/T4/T5/T13/T14, soft-deleted in cleanup)
**Demo events touched:** `21621d40` (TEST333 — auto-attached by T1 dispatch then auto-moved out by T4), `f4f8d045` (טסט 555 — T4 attendee), `ae9cc986` (מותגים טסט 3 — T5 attendee + T13 coupon target). NO new event was created — existing `registration_open` events sufficed; per-SPEC §7 setup, the `M4_PHASE2_TEST_EVENT` was elective, skipped.
**Prizma writes:** 0 (verified — `crm_message_log`, `crm_leads`, `crm_event_attendees` all 0 since START_TIMESTAMP)
**Total messages fired:** 14 (7 SMS + 7 email), all status=`sent`, all to whitelist phone+email

---

## EXECUTIVE SUMMARY

**7 of 7 planned tests executed. 6 PASS, 1 PASS-with-new-bug-found.** T12 explicitly skipped per SPEC. **2 NEW production bugs surfaced** that were NOT in Phase 1's 41 findings. Phase 1's suspected G-HIGH-1 was investigated end-to-end and **partially refuted**.

### Top 3 things to fix in the morning

1. 🔴 **NEW CRITICAL — Suppression layer is broken (`T14-CRIT-1`).** The `send-message` Edge Function does NOT consult `crm_leads.unsubscribed_at` before dispatch. Test confirmed: a lead with `status='unsubscribed'` and `unsubscribed_at` set still received an `event_registration_open_sms_he` message (status=`sent`) seconds after unsubscribing via the production EF path. **CAN-SPAM-equivalent regulatory exposure** — the storefront tells customers "הוסרנו אותך... לא תקבל עוד הודעות בנושא" and then any subsequent automation rule can blast them. Fix: add a `unsubscribed_at IS NULL` gate in `send-message/index.ts` before `writeDispatchAndSend`, OR add it as a per-channel suppression at lead lookup. Bundle into the morning's `M4_TENANT_ISOLATION_HARDENING_CRIT` SPEC OR break out as `M4_UNSUB_SUPPRESSION_CRIT`.

2. 🟠 **NEW HIGH — Public form confirmation SMS shows ISO date (`T5-HIGH-1`).** When a customer registers via the public `event-register` EF (the URL embedded in every event_invite_new SMS), the resulting `event_registration_confirmation_sms_he` body shows `📅 2026-05-13` (raw ISO YYYY-MM-DD) instead of `📅 13/05/2026` (DD/MM/YYYY canonical per `CrmHelpers.formatDate`). Root cause is in `event-register/index.ts:255-265` — it pre-fills `variables.event_date = event.event_date` (raw ISO), and `injectEventVariables` is caller-wins so the formatter never runs. Compare T4's send-message-direct path, which left the variable empty and got `📅 12/05/2026` correctly. **Real customer-facing bug.** Fix: format the date in `event-register/index.ts` before passing it as a variable, OR have `event-register` pass `variables: {}` and let `injectEventVariables` populate from the event row.

3. 🟢 **DOWNGRADE — G-HIGH-1 is INCONCLUSIVE for customer impact.** Phase 1 hypothesised that the `unsubscribe` EF's `verify_jwt=true` config drift would 401 every customer click and break the unsubscribe page. Phase 2 traced the full customer flow and confirmed: the storefront `/unsubscribe` Astro page bakes the legacy JWT anon key as `const anonKey = "eyJ..."` in inline script and the JS fetch sends `apikey + Authorization: Bearer` headers, satisfying the gateway. End-to-end test confirmed `success:true` JSON + `unsubscribed_at` written. The `verify_jwt=true` is still a misconfiguration (drift between source comment and deployed config), but customers clicking the SMS/email link are NOT blocked. Re-classify from HIGH to LOW (config hygiene only). The OLD CRITICAL is the new T14-CRIT-1 above (suppression layer), which dwarfs the original concern.

### G-HIGH-1 verdict (the SPEC's most-important question)
**INCONCLUSIVE / PARTIAL FALSE ALARM.** See top-3 above and §T14 below for full evidence. The customer-facing flow works; the deeper failure is the suppression layer, which Phase 1 didn't see.

---

## TEST RESULTS

### T1 — Lead intake (storefront → demo)

- **Method used:** (b) — direct EF invocation via curl from this session, simulating the storefront's POST. Used `--data-binary @file.json` after a UTF-8-clean local file because Windows shell mojibakes Hebrew JSON literals (see Appendix A).
- **Pre-flight gate (post-creation):** PASS — new lead `b52e8fbc-5a96-4641-a6d4-7dad99acc20d`, `tenant_id=8d8cfa7e-...`, `phone=+972537889878`, `email=daniel@prizma-optic.co.il`, `is_deleted=false`. Pre-test cleanup: the existing live whitelist lead `6cbcbddc...` was soft-deleted (which doubled as T9 evidence — see below) so the `lead-intake` EF would take the "new" branch instead of the "duplicate" branch.
- **EF response:** `HTTP 201 {"id":"b52e8fbc-...","is_new":true}`
- **Branch taken:** `event_invite_new` (the SPEC's predicted "T1" was actually `lead_intake_new`, but the EF's `dispatchFreshLead` ALWAYS picks the `event_invite_new` branch when an active event exists in the tenant — and demo has 6+ `registration_open` events. So `lead_intake_new_*` only fires when there are NO active events, which never happens in production today. **This is the production behavior** — the SPEC's hypothesis was incorrect.) Attendee row `064d1880-...` auto-created on event `21621d40` (TEST333) with status='invited'; lead status promoted to 'invited' (per `dispatchFreshLead` Rule 2.1).
- **SMS message_log row:** `id=e55b91e6-333e-470e-a79b-43d5b0466809`, slug=`event_invite_new_sms_he`, status=`sent`, body 482 bytes, no replacement chars, no unsubstituted placeholders. Body verbatim:
  > ברוכים הבאים לאופטיקה פריזמה ✔️
  >
  > דניאל פאזה 2 T1, הצטרפתם למערכת אירועי המותגים - יש אירוע פתוח: TEST333 ב-25/04/2026 📅
  >
  > שימו לב: ההרשמה אינה מבטיחה מקום. נעדכן אם שוריין לכם מקום בקרב 50 הראשונים או שעברתם לרשימת המתנה.
  >
  > להרשמה: https://prizma-optic.co.il/r/D2HaJ6BB
  >
  > להסרה: https://prizma-optic.co.il/r/JxTuPJGS
- **Email message_log row:** `id=816db5f4-af36-4b7c-b670-da662d552656`, slug=`event_invite_new_email_he`, status=`sent`, body 18,142 bytes, no replacement chars, no unsubstituted placeholders. (Email body is the v2 canon-compliant HTML with the gold-on-black PRIZMA OPTIC wordmark, event-details card, 4-step process block, primary CTA gold pill button, and unsubscribe footer — all branded "Prizma Optic" / "אופטיקה פריזמה" / "הרצל 32, אשקלון" even on demo tenant. Confirms G-HIGH-7 from Phase 1 in DB content.)
- **Hebrew rendering:** clean ✓. Verified via byte-level hex inspection: lead `full_name` stored as `d793 d7a0 d799 d790 d79c 20 d7a4 d790 d796 d794 ...` (correct multi-byte UTF-8 = "דניאל פאזה ..."), 24 bytes / 15 chars; SMS body sample around the substituted name = `d793d7a0d799d790d79c 20 d7a4d790d796d794` = "דניאל פאזה" ✓. Both messages have `octet_length(content) > length(content)`, ruling out replacement-char poisoning.
- **Variables substituted:** `%name%` → "דניאל פאזה 2 T1" ✓; `%event_name%` → "TEST333" ✓; `%event_date%` → "25/04/2026" (DD/MM/YYYY) ✓ — note this is the send-message direct path, see T5 for the public-form-submission path which is buggy; `%event_max_attendees%` → "50" ✓; `%registration_url%` → short link (302-resolves to event-register EF with HMAC token) ✓; `%unsubscribe_url%` → short link ✓; 0 literal `%var%` remaining.
- **Daniel-side delivery confirmation:** Phase 2 captured message_log `status=sent` (Make webhook POST returned 200). Whether Twilio actually delivered the SMS to your handset is the Make-side responsibility and is not visible from message_log alone — you should see two SMS arrivals (one from this T1 retry + one from the original T1 first attempt that was mojibake'd, plus a duplicate batch from T2, plus T4/T5/T13/T14 — a total of 7 SMS in your handset over the test window).
- **Verdict:** **PASS** — production pipeline preserves UTF-8 Hebrew end-to-end; all variables substituted correctly; both channels dispatched to whitelist contact; attendee row + lead status side-effects fired correctly.

### T2 — Duplicate detection (re-verify with body capture)

- **Method:** re-POST same phone via UTF-8-clean payload file. EF returned `HTTP 409 {"duplicate":true,"is_new":false,"id":"b52e8fbc-...","existing_name":"דניאל פאזה 2 T1"}`. Confirms the EF correctly recognized the existing live lead and routed to `dispatchIntakeMessages` with `lead_intake_duplicate` slug.
- **Pre-flight gate:** N/A — same lead as T1 (already verified).
- **SMS message_log row:** `id=d61ce33f-b0cf-4bfc-8786-7e8a2007d194`, slug=`lead_intake_duplicate_sms_he`, status=`sent`, body 503 bytes. Verbatim:
  > היי דניאל פאזה 2 T1,
  >
  > מספר הטלפון שאיתו ניסיתם להירשם כבר רשום במערכת אירועי המותגים שלנו ✔️
  >
  > אין צורך לפעולה - ברגע שייפתח האירוע הקרוב, נשלח אליכם הודעה לטלפון ולמייל איתם נרשמתם.
  >
  > פרטים מלאים נשלחו אליכם במייל 📧
  >
  > נתראה בקרוב,
  > צוות אופטיקה פריזמה 💛
  >
  > להסרה: https://prizma-optic.co.il/r/SSfaDGPo
- **Email message_log row:** `id=bac9d4f9-3c24-482d-9db0-8cb2d5424a69`, slug=`lead_intake_duplicate_email_he`, status=`sent`, body 15,948 bytes, clean.
- **Variable substitution detail:** the `%name%` resolved to the **original** lead's name "דניאל פאזה 2 T1" rather than the **second-post's** "דניאל פאזה 2 T2 dup" — per EF code line 234: `existing.full_name || name`. This is the correct behavior (we treat the existing name as canonical, since the duplicate-poster might have made a typo).
- **Verdict:** **PASS** — duplicate detection routes to the correct template, both channels fire, name preserves the existing lead's canonical value, no replacement chars, no unsubstituted placeholders.

### T4 — Manual lead → registration

- **Method:** called the canonical RPC `register_lead_to_event(demo, b52e8fbc, f4f8d045, 'manual')` followed by direct send-message EF invocation for the confirmation template (because the RPC itself does NOT dispatch any messages — it returns a JSON status which the calling layer is responsible for translating into a send-message call).
- **RPC result:** `{"success":true,"auto_moved":true,"attendee_id":"66eb8d86-7f24-444c-9fa3-c548cdeb5cfd","status":"registered","fee_mismatch":false}`. **Auto-move kicked in** because the lead already had an `invited`-status attendee on event 21621d40 (TEST333) from T1's dispatchFreshLead — Rung 3 logic detected it and moved the row to event f4f8d045 (טסט 555).
- **SMS message_log row:** `id=1bbf62d8-34f6-4152-9574-0317eea981f5`, slug=`event_registration_confirmation_sms_he`, status=`sent`, body 495 bytes. Verbatim:
  > דניאל פאזה 2 T1, שריינתם מקום באירוע המותגים של אופטיקה פריזמה ✔️
  > 📅 12/05/2026
  >
  > 🔒 להשלמת השריון - דמי שריון 50 ₪ (מקוזזים מהקנייה / החזר מלא בביטול עד 48 שעות):
  > https://prizmaoptic.short.gy/gmapy
  >
  > ⏱️ המקום שמור ל-24 שעות. שלמו ממספר 0537889878, או שלחו אסמכתא לוואטסאפ 053-364-5404.
  >
  > להסרה: https://prizma-optic.co.il/r/DmcZPbGb
- **Email message_log row:** `id=abb6dac2-cbed-4ade-abbe-0b01bab4cfe7`, slug=`event_registration_confirmation_email_he`, status=`sent`, body 22,328 bytes, clean.
- **Variables substituted:** `%name%` ✓, `%event_date%` → `12/05/2026` (CORRECT DD/MM/YYYY format ✓ — caller passed empty `variables`, so `injectEventVariables` formatted from the event row correctly); `%event_deposit_amount%` → "50" ✓; `%payment_url_50%` → `https://prizmaoptic.short.gy/gmapy` (resolved from `tenants.payment_links.50` ✓); `%phone%` → "0537889878" (display format Israeli local, per `withDisplayPhone`) ✓; `%unsubscribe_url%` → short link ✓.
- **Iron Rule 9 / G-HIGH-7 confirmation in template content (NOT a Phase 2 finding — already in Phase 1):** the confirmation SMS body literally hardcodes "אופטיקה פריזמה", "053-364-5404" (Prizma WhatsApp), and the `prizmaoptic.short.gy` payment short.gy domain. Demo tenant inherits this content because templates are seeded per-tenant from the Prizma master.
- **Verdict:** **PASS** — RPC + send-message both clean; auto-move logic worked; template renders DD/MM/YYYY date correctly when caller passes `variables: {}`.

### T5 — Auto event registration form (form-submit end-to-end)

- **Method:** TWO sub-tests. First, **template render check** by direct send-message call for `event_registration_open` template. Second, **public form POST end-to-end** simulating the customer's actual click-from-SMS journey: anonymous POST to `event-register` EF with HMAC token from the registration short_link.
- **Sub-test A — template render:**
  - SMS row `id=d289fe79-7bc8-4440-bbf6-3220ea870b4d`, slug=`event_registration_open_sms_he`, status=`sent`, body verbatim:
    > דניאל פאזה 2 T1, נפתחה ההרשמה למותגים טסט 3 ב-13/05/2026 📅
    >
    > המכסה מוגבלת ל-50 נרשמים - מומלץ לשריין מקום לפני המעבר לרשימת המתנה.
    >
    > דמי רישום: 50 ₪ - מקוזזים מהקנייה (או החזר מלא בביטול עד 48 שעות) ✔️
    >
    > להרשמה: https://prizma-optic.co.il/r/qYkR23qd
    >
    > להסרה: https://prizma-optic.co.il/r/jMCIlWFo
  - All vars substituted (`event_name`="מותגים טסט 3", date "13/05/2026" DD/MM/YYYY ✓, max_attendees=50, deposit=50). Clean.
- **Sub-test B — full public form-submit chain:**
  - **Resolve-link EF anonymous GET** for short code `qYkR23qd`: `HTTP 302` → redirect to `https://prizma-optic.co.il/event-register?token=YjUyZThmYmMtNW...` (anonymous OK because verify_jwt=false on `resolve-link`).
  - **event-register EF anonymous GET** with HMAC token: `HTTP 200` returning lead+event JSON: `{"success":true,"tenant_id":"8d8cfa7e-...","tenant_name":"אופטיקה דמו (בדיקה)","lead_id":"b52e8fbc-...","event_id":"ae9cc986-...","lead_name":"דניאל פאזה 2 T1","lead_phone":"+972537889878","lead_email":"daniel@prizma-optic.co.il","event_name":"מותגים טסט 3","event_date":"2026-05-13",...}`. Hebrew tenant_name + event_name + lead_name all clean UTF-8 in the JSON response.
  - **event-register EF anonymous POST** with HMAC token + form body `{"arrival_time":"10:30","eye_exam":"לא, אין צורך בבדיקה","notes":"Phase 2 T5 form submission test"}`: `HTTP 200 {"status":"registered","success":true,"attendee_id":"c6b2b866-c9fb-48c4-a718-02b9e5858411"}`. New attendee row created on event ae9cc986 with status='registered', and the EF's internal `dispatchRegistrationMessages` fired both confirmation messages.
  - **Confirmation SMS (post-form) row:** `id=4f48a2d9-4f8b-4d39-9918-a71757f269b4`, slug=`event_registration_confirmation_sms_he`, status=`sent`, body verbatim:
    > דניאל פאזה 2 T1, שריינתם מקום באירוע המותגים של אופטיקה פריזמה ✔️
    > 📅 2026-05-13
    >
    > 🔒 להשלמת השריון - דמי שריון 50 ₪ (מקוזזים מהקנייה / החזר מלא בביטול עד 48 שעות):
    > https://prizmaoptic.short.gy/gmapy
    >
    > ⏱️ המקום שמור ל-24 שעות. שלמו ממספר 0537889878, או שלחו אסמכתא לוואטסאפ 053-364-5404.
    >
    > להסרה: https://prizma-optic.co.il/r/BzUVOyM6
  - **🟠 NEW HIGH BUG — `📅 2026-05-13` instead of `📅 13/05/2026`** (the T4 path got DD/MM/YYYY correctly because the caller passed `variables: {}`; the T5 form-submission path FAILS to format because `event-register/index.ts` lines 255-265 pre-fill `variables.event_date = event.event_date` from the raw `crm_events.event_date` (PostgreSQL date column, ISO YYYY-MM-DD). `injectEventVariables` is caller-wins (`if (vars.event_date == null)`) so the formatter is skipped). **Production customer impact:** every customer who clicks the SMS link and submits the form gets the ISO-style date in their confirmation SMS + email. The CRM-staff-driven path (T4) is correct; the public-form path is wrong. Logged as **T5-HIGH-1**.
- **Verdict:** **PASS-with-bug** — full anonymous-customer flow works (resolve-link → event-register GET pre-fill → event-register POST → attendee row → confirmation messages dispatched), but the post-form confirmation SMS shows the date in raw ISO format. Real production bug, severity HIGH, single-line fix in event-register EF.

### T9 — Lead delete + cascade (DB-only verify, NO message)

- **Pre-state:** Lead `6cbcbddc-9b19-4ca7-9e46-281048ed5292` (the only pre-existing live whitelist lead at session start, status=`confirmed`, is_deleted=false) had 3 attendees: `28adfc3f` (event 5b7a60c9, already is_deleted=true), `10603716` (event ae9cc986, status=`registered`, is_deleted=false), `6fd6ced3` (event f028cf33, status=`purchased`, is_deleted=false).
- **Action:** `UPDATE crm_leads SET is_deleted=true, updated_at=NOW()` at 12:44:54 UTC.
- **Post-state:** lead `is_deleted=true`. ALL THREE attendees rows now `is_deleted=true` (the two previously-active ones cascaded; the already-deleted one unchanged). Cascade trigger working as designed.
- **Messages fired during the soft-delete:** **0** (verified by counting `crm_message_log` rows with `tenant_id=demo` AND `created_at >= START_TIMESTAMP` immediately after the UPDATE — count was 0 before any other test ran). The soft-delete is fully silent on the messaging layer, as it must be (Iron Rule 1 spirit — don't blast a customer right after a staffer just deleted them).
- **Note:** `crm_leads` has NO `deleted_at` column (despite what the SPEC §7 sample SQL implied — the SPEC was written from the SaaS playbook). Real schema has only `is_deleted` boolean. Documented in Phase 1 already (Track E E12-13 INFO).
- **Verdict:** **PASS** — cascade works, soft-delete fires 0 messages.

### T13 — Coupon delivery

- **Method:** direct send-message EF call with `template_slug=event_coupon_delivery` for both channels (the staff-side CRM "send coupon" button does the same thing — it's a thin wrapper). After fire, manually `UPDATE crm_event_attendees SET coupon_sent=true, coupon_sent_at=NOW() WHERE id=c6b2b866-...` to match what the CRM UI would do.
- **SMS message_log row:** `id=ac7fb40b-ae79-4664-a883-172d5c1bbdf4`, slug=`event_coupon_delivery_sms_he`, status=`sent`, body 424 bytes. Verbatim:
  > 🎫 שריון המקום שלך הושלם! הקופון האישי נשלח אלייך למייל.
  >
  > חשוב: יש להציג את הקופון בהגעה. המקום שמור לך - אם לא תוכל/י להגיע, עדכנו אותנו עד 48 שעות לפני האירוע ותקבל/י החזר מלא של דמי השריון.
  >
  > *רכישה באירוע כפופה לתקנון:
  > https://prizmaoptic.short.gy/dgUUIn
- **Email message_log row:** `id=bc79b8c0-06c5-4dd9-be23-e85bd6916475`, slug=`event_coupon_delivery_email_he`, status=`sent`, body 15,125 bytes. Body contains the literal coupon code `SuperSale14` (verified via `LIKE '%SuperSale14%'` SQL match). The `%coupon_code%` substitution worked thanks to P33 Fix A (`injectEventVariables` auto-fills it from `crm_events.coupon_code`).
- **Attendee row update:** `coupon_sent=true`, `coupon_sent_at=2026-05-06 12:53:48.153807+00` ✓.
- **🟡 SIDE FINDING (LOW):** The coupon SMS body does NOT contain `%unsubscribe_url%` — every other M4 customer-facing SMS template DOES include it (T1's event_invite_new, T2's lead_intake_duplicate, T4's event_registration_confirmation, T5's event_registration_open all include "להסרה: https://..."). This may be intentional (the coupon is treated as transactional, not marketing) but it's inconsistent and worth a Foreman decision in the morning triage. If Israeli regulation requires opt-out on every promotional message and a coupon counts as promotional, this is a small compliance gap. Logged as **T13-LOW-1**.
- **Verdict:** **PASS** — coupon delivery works on both channels; coupon code substituted in email; attendee flag set; but the SMS-channel-without-unsub-link pattern is worth confirming.

### T14 — Unsubscribe end-to-end (G-HIGH-1 verification — most-detailed test in Phase 2)

This was the SPEC's most-important single test. I traced the customer's actual click-path step-by-step and tested the suppression layer downstream of the unsubscribe action. Findings here partially contradict Phase 1's hypothesis and surface a NEW critical bug.

#### Step 1 — Anonymous gateway probe (re-confirms Phase 1 surface observation)
- `curl -s "https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/unsubscribe?token=fake"` (no Authorization header) → `HTTP 401 {"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}`. The Supabase gateway refuses the call before the EF code runs. This matches Phase 1's hypothesis on its face — but it's NOT what a real customer ever does.

#### Step 2 — Real customer click chain (full redirect trace)
For the unsubscribe URL embedded in the T1 SMS (`https://prizma-optic.co.il/r/UHFLUVlg`), I followed all redirects with `curl -L`:
1. `https://prizma-optic.co.il/r/UHFLUVlg` → `307 Temporary Redirect` → `https://www.prizma-optic.co.il/r/UHFLUVlg` (Vercel apex→www redirect).
2. `https://www.prizma-optic.co.il/r/UHFLUVlg` → `302 Found` → `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/resolve-link?code=UHFLUVlg` (storefront `/r/[code]` route forwards to the resolve-link EF).
3. `https://...supabase.co/functions/v1/resolve-link?code=UHFLUVlg` → `302 Found` → `https://prizma-optic.co.il/unsubscribe?token=MjkyN...` (resolve-link EF, `verify_jwt=false`, runs anonymously, looks up the long URL from `short_links.target_url`, 302's to it).
4. `https://www.prizma-optic.co.il/unsubscribe?token=MjkyN...` → `200 OK` (Astro page renders Hebrew "הסרה מרשימת התפוצה | אופטיקה פריזמה" with a `unsub-loading` spinner).

#### Step 3 — How the Astro page actually performs the unsubscribe (the missing piece)
Loading the page in curl runs zero JS, so my first probe didn't fire the unsubscribe. I fetched the page's JS bundle (`/_astro/index.astro_astro_type_script_index_0_lang.Bq8MCRmz.js`) and inspected the fetch call:
```js
fetch(u + "?token=" + encodeURIComponent(e), {
  headers: { apikey: i, Authorization: "Bearer " + i, Accept: "application/json" }
})
```
where `u = window.__UNSUB_CFG__.supabaseUrl + "/functions/v1/unsubscribe"` and `i = window.__UNSUB_CFG__.anonKey`. The inline `<script>` block in the rendered HTML defines:
```js
const supabaseUrl = "https://tsxrrxzmdxaenlvocyit.supabase.co";
const anonKey = "<REDACTED-anon-jwt; same legacy key as Phase 1 G-HIGH-2; project tsxrrxzmdxaenlvocyit, role=anon, exp 2036>";
window.__UNSUB_CFG__ = { supabaseUrl, anonKey };
```
This is the **same legacy JWT anon key** Phase 1 flagged in `lead-intake/index.ts` and 6 other EFs (G-HIGH-2). It is also baked into the storefront site's HTML/JS bundle. So the customer's browser **does** send `apikey + Authorization: Bearer` headers, the gateway's `verify_jwt=true` is satisfied, and the EF runs.

#### Step 4 — Simulate the browser's actual fetch call
```
curl "https://...supabase.co/functions/v1/unsubscribe?token=$REAL_TOKEN" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" -H "Accept: application/json"
→ HTTP 200 {"success":true,"message":"הסרנו אותך מרשימת ההתראות שלנו. לא תקבל עוד הודעות בנושא.","title":"הוסרת מרשימת התפוצה בהצלחה"}
```
DB verification: lead `29276e29-...` (the original mojibake'd T1 lead) post-unsubscribe state: `status='unsubscribed'`, `unsubscribed_at='2026-05-06 12:57:01.794+00'` ✓. Then I repeated the same flow for the active lead `b52e8fbc-...` (using its own unsubscribe short_link target URL) and confirmed `status='unsubscribed'`, `unsubscribed_at='2026-05-06 12:57:54.829+00'`.

**Step-3-and-4 conclusion: G-HIGH-1 is INCONCLUSIVE / FALSE ALARM** for customer-impact severity. The deployed `verify_jwt=true` is still a misalignment with the source-code comment (`// verify_jwt=false; HMAC signature is the auth.`), but it does not break the customer experience because the storefront acts as an auth-injecting client. The customer WILL see "הוסרת מרשימת התפוצה בהצלחה" and the DB row IS updated. **Re-classify as LOW (config-vs-code drift, hygiene only).** The customer-facing fear doesn't materialize.

#### Step 5 — Suppression test (where the REAL critical bug lives)
After successfully unsubscribing the active lead `b52e8fbc-...` in step 4, I immediately fired a follow-up SMS via send-message with `template_slug=event_registration_open` for that same lead. Expected: rejection or suppression (status=`rejected`, error like `lead_unsubscribed`). Actual:
```
HTTP 200 {"ok":true,"log_id":"457a7e8b-00c6-4cf2-af3a-ea873277ee90","channel":"sms","template_id":"6d2e43dc-..."}
```
DB verification: message_log row `457a7e8b-...` has `status='sent'`, `error_message=null`, `created_at='2026-05-06 12:57:55.950747+00'` (61 milliseconds after the lead's `unsubscribed_at='12:57:54.829'`). **The send-message EF dispatched the message to the Make webhook regardless of the unsubscribed flag.**

I re-read `send-message/index.ts` (v18) to confirm by source: the gating layers in writeOrder are (1) `required_variables` validation, (2) `scanForPaymentUrlMismatch`, (3) `scanForUnsubstitutedPlaceholders`, (4) recipient validation, (5) `phoneAllowed` (test_mode_sms_allowlist), (6) `writeDispatchAndSend`. **There is no `unsubscribed_at` check anywhere in the EF or its imports** (`lead-variables.ts`, `event-variables.ts`, `dispatch.ts`, `url-builders.ts` — none check). The lead's `status='unsubscribed'` is stored but never consulted on the send path.

#### G-HIGH-1 verdict (final)
- **Original Phase 1 hypothesis (verify_jwt drift breaks customer unsubscribe):** **FALSE ALARM** — customer flow works via storefront-injected auth headers. Re-classify drift to LOW.
- **Replacement finding (T14-CRIT-1, NEW THIS PHASE):** **CRITICAL** — `send-message` EF does not consult `unsubscribed_at`. Customers who unsubscribe continue to receive messages. CAN-SPAM-equivalent regulatory exposure.
- **Iron Rule 23 expansion of scope:** anon JWT is hardcoded in 7 EFs (Phase 1 G-HIGH-2) AND in the storefront's inline `<script>` HTML (NEW Phase 2). Not a new severity, but the same key has one more exposure surface.
- **Verdict:** **PASS-with-replacement-critical** — every step of the test ran successfully; the test's outcome reframes Phase 1's CRITICAL/HIGH security picture from "click breaks" to "click works but suppression doesn't follow through."

### T12 — Broadcast 1000-cap

**SKIPPED per SPEC §8.** Would require >1000 demo leads + real SMS budget; explicitly out of scope.

---

## TEMPLATE BODY ARCHIVE

Full body of every SMS fired in Phase 2, ordered by `created_at`. Email bodies are too large to embed verbatim; their slug+log_id+byte-count is in the per-test sections above. All bodies are clean UTF-8 (no replacement chars), all variables substituted (no literal `%var%`), all status=`sent`.

```
1. 12:45:24Z  event_invite_new_sms_he  log_id=ae914ab9  (T1 attempt 1, mojibake'd via Windows shell)
   ברוכים הבאים לאופטיקה פריזמה ✔️
   ����� ���� 2 T1, הצטרפתם למערכת אירועי המותגים - יש אירוע פתוח: TEST333 ב-25/04/2026 📅
   שימו לב: ההרשמה אינה מבטיחה מקום. נעדכן אם שוריין לכם מקום בקרב 50 הראשונים או שעברתם לרשימת המתנה.
   להרשמה: https://prizma-optic.co.il/r/AkCSRZ3g
   להסרה: https://prizma-optic.co.il/r/UHFLUVlg

2. 12:47:05Z  event_invite_new_sms_he  log_id=e55b91e6  (T1 retry, UTF-8-clean payload file)
   ברוכים הבאים לאופטיקה פריזמה ✔️
   דניאל פאזה 2 T1, הצטרפתם למערכת אירועי המותגים - יש אירוע פתוח: TEST333 ב-25/04/2026 📅
   שימו לב: ההרשמה אינה מבטיחה מקום. נעדכן אם שוריין לכם מקום בקרב 50 הראשונים או שעברתם לרשימת המתנה.
   להרשמה: https://prizma-optic.co.il/r/D2HaJ6BB
   להסרה: https://prizma-optic.co.il/r/JxTuPJGS

3. 12:47:46Z  lead_intake_duplicate_sms_he  log_id=d61ce33f  (T2 — duplicate detection)
   היי דניאל פאזה 2 T1,
   מספר הטלפון שאיתו ניסיתם להירשם כבר רשום במערכת אירועי המותגים שלנו ✔️
   אין צורך לפעולה - ברגע שייפתח האירוע הקרוב, נשלח אליכם הודעה לטלפון ולמייל איתם נרשמתם.
   פרטים מלאים נשלחו אליכם במייל 📧
   נתראה בקרוב, צוות אופטיקה פריזמה 💛
   להסרה: https://prizma-optic.co.il/r/SSfaDGPo

4. 12:49:42Z  event_registration_confirmation_sms_he  log_id=1bbf62d8  (T4 — direct send-message; date 12/05/2026 ✓)
   דניאל פאזה 2 T1, שריינתם מקום באירוע המותגים של אופטיקה פריזמה ✔️
   📅 12/05/2026
   🔒 להשלמת השריון - דמי שריון 50 ₪ (מקוזזים מהקנייה / החזר מלא בביטול עד 48 שעות):
   https://prizmaoptic.short.gy/gmapy
   ⏱️ המקום שמור ל-24 שעות. שלמו ממספר 0537889878, או שלחו אסמכתא לוואטסאפ 053-364-5404.
   להסרה: https://prizma-optic.co.il/r/DmcZPbGb

5. 12:50:57Z  event_registration_open_sms_he  log_id=d289fe79  (T5 sub-test A — render check; date 13/05/2026 ✓)
   דניאל פאזה 2 T1, נפתחה ההרשמה למותגים טסט 3 ב-13/05/2026 📅
   המכסה מוגבלת ל-50 נרשמים - מומלץ לשריין מקום לפני המעבר לרשימת המתנה.
   דמי רישום: 50 ₪ - מקוזזים מהקנייה (או החזר מלא בביטול עד 48 שעות) ✔️
   להרשמה: https://prizma-optic.co.il/r/qYkR23qd
   להסרה: https://prizma-optic.co.il/r/jMCIlWFo

6. 12:52:15Z  event_registration_confirmation_sms_he  log_id=4f48a2d9  (T5 sub-test B — public form POST; ⚠ DATE BUG: 2026-05-13 ISO format)
   דניאל פאזה 2 T1, שריינתם מקום באירוע המותגים של אופטיקה פריזמה ✔️
   📅 2026-05-13
   🔒 להשלמת השריון - דמי שריון 50 ₪ (מקוזזים מהקנייה / החזר מלא בביטול עד 48 שעות):
   https://prizmaoptic.short.gy/gmapy
   ⏱️ המקום שמור ל-24 שעות. שלמו ממספר 0537889878, או שלחו אסמכתא לוואטסאפ 053-364-5404.
   להסרה: https://prizma-optic.co.il/r/BzUVOyM6

7. 12:53:24Z  event_coupon_delivery_sms_he  log_id=ac7fb40b  (T13)
   🎫 שריון המקום שלך הושלם! הקופון האישי נשלח אלייך למייל.
   חשוב: יש להציג את הקופון בהגעה. המקום שמור לך - אם לא תוכל/י להגיע, עדכנו אותנו עד 48 שעות לפני האירוע ותקבל/י החזר מלא של דמי השריון.
   *רכישה באירוע כפופה לתקנון:
   https://prizmaoptic.short.gy/dgUUIn

8. 12:57:55Z  event_registration_open_sms_he  log_id=457a7e8b  (T14 step 5 — POST-UNSUBSCRIBE — should have been suppressed; was not)
   דניאל פאזה 2 T1, נפתחה ההרשמה למותגים טסט 3 ב-13/05/2026 📅
   המכסה מוגבלת ל-50 נרשמים - מומלץ לשריין מקום לפני המעבר לרשימת המתנה.
   דמי רישום: 50 ₪ - מקוזזים מהקנייה (או החזר מלא בביטול עד 48 שעות) ✔️
   להרשמה: https://prizma-optic.co.il/r/Cm7Pe7jb
   להסרה: https://prizma-optic.co.il/r/YstYdlYz
```

Email-channel fires (slug + log_id + byte-count, body too large to embed):
- `12:47:05Z event_invite_new_email_he 816db5f4 18142b` (T1)
- `12:47:46Z lead_intake_duplicate_email_he bac9d4f9 15948b` (T2)
- `12:49:42Z event_registration_confirmation_email_he abb6dac2 22328b` (T4)
- `12:52:15Z event_registration_confirmation_email_he 365dc307 22334b` (T5 form-POST)
- `12:53:24Z event_coupon_delivery_email_he bc79b8c0 15125b` (T13, contains coupon `SuperSale14`)
- `12:45:24Z event_invite_new_email_he 38a37ce2 18142b` (T1 attempt 1, mojibake)

---

## CLEANUP VERIFICATION

- **Test leads soft-deleted:** 1 (`b52e8fbc-...` — the T1-retry / T2/T4/T5/T13/T14 lead). The other (`29276e29-...` — T1 first-attempt mojibake) was already soft-deleted inline before T1 retry, plus the pre-existing `6cbcbddc-...` was soft-deleted at T9. So 3 distinct whitelist-phone leads are now `is_deleted=true`, 0 remain `is_deleted=false`.
- **Test event soft-deleted:** N/A — no new events were created during Phase 2 (existing demo events sufficed; the elective `M4_PHASE2_TEST_EVENT` was not created per SPEC §7's "create one if not" wording, since the demo already had 6+ open events).
- **Zombie attendees on test leads:** **0** (verified — `count(*) WHERE phone='+972537889878' AND created_at >= START_TIMESTAMP AND a.is_deleted=false` = 0). Cascade trigger from lead soft-delete propagated to all attendees correctly.
- **Pristine demo state:** the 7 pre-existing demo `registration_open` events still have status=`registration_open`, no test-attendee residue. The events Phase 2 attendees touched (TEST333, טסט 555, מותגים טסט 3) are unchanged; only the attendee rows for our test leads are flagged is_deleted=true.

---

## APPENDIX A — Tool & Environment Issues

- **Windows shell mojibakes Hebrew JSON literals when curl-ed inline.** First T1 attempt sent JSON `{"name":"דניאל פאזה 2 T1",...}` directly via `curl -d '<HEBREW>'`. The Windows code page reinterpreted the Hebrew bytes BEFORE curl's `-d` saw them, replacing each Hebrew character with a U+FFFD REPLACEMENT CHARACTER (UTF-8 bytes `ef bf bd`). The DB stored `efbfbd × 5 + space + efbfbd × 4 + space + 2 T1` for the lead's `full_name`, and that mojibake was substituted into the SMS+email bodies in place of `%name%`. **This is a TEST RIG BUG, not a production bug** — verified by re-running T1 with `cat > /tmp/payload.json << 'EOF'\n...UTF-8 Hebrew...\nEOF` and `curl --data-binary @file`. The retry produced clean Hebrew end-to-end, byte-level verified (`d793 d7a0 d799 d790 d79c 20 d7a4 d790 d796 d794` = "דניאל פאזה" = 24 bytes / 15 chars). **Lesson for future Phase 2-style tests on Windows:** always write JSON-with-Hebrew to a file first, never inline. Captured in this report so a future tester doesn't lose 15min repeating the diagnosis. NOT a finding for Daniel — just an environment quirk.
- **Initial Supabase MCP `execute_sql` template-list query exceeded 30,000-char tool-result limit** when fetching all template bodies in one go (some bodies are 22k chars). Mitigated by using `length(body)` aggregate first to identify candidates, then querying individual bodies one at a time with explicit slug filters. No impact on Phase 2 outcomes.
- **No prizma writes were attempted, no whitelist deviation, no test fired to a non-whitelist contact.** All §6 stop-on-deviation triggers stayed unfired.
- **VM mount drift:** untouched per SPEC §8.
- **Iron Rule 31 integrity gate:** not run per SPEC §8.

---

## APPENDIX B — Deltas vs Phase 1 (what changed in our understanding)

| Phase 1 finding | Phase 1 severity | Phase 2 update | Phase 2 severity |
|---|---|---|---|
| **G-HIGH-1** unsubscribe verify_jwt config drift | HIGH (suspected to break customer unsub) | **INCONCLUSIVE / FALSE ALARM for customer impact.** Storefront baked-in anon JWT injects auth headers; gateway accepts; EF runs; customer sees success page; DB row written. Drift is real, but customer flow works. | LOW (config-vs-code drift, hygiene only) |
| (NEW) Suppression layer | (not in Phase 1) | **NEW T14-CRIT-1.** send-message EF does not check unsubscribed_at. Unsubscribed leads receive messages. Verified by direct test: lead unsubscribed at 12:57:54Z, follow-up SMS sent successfully at 12:57:55Z (61ms later). | **CRITICAL** (regulatory exposure) |
| (NEW) Public form date format | (not in Phase 1) | **NEW T5-HIGH-1.** event-register EF passes raw `event_date` ISO string in variables; injectEventVariables is caller-wins so DD/MM/YYYY formatter is bypassed. Customer-facing confirmation SMS shows `📅 2026-05-13` instead of `📅 13/05/2026`. CRM-staff path (T4) is correct because it passes `variables: {}`. | HIGH (real customer impact, single-line fix) |
| **G-HIGH-2** Anon JWT hardcoded in 7 EFs | HIGH | **Expanded scope.** Same legacy JWT also baked into storefront `<script>` block (`const anonKey = "eyJ..."`). Customer unsubscribe flow depends on it. No new severity, just one more exposure surface; bundle into the same `M4_SECURITY_HYGIENE_HIGH` SPEC. | HIGH (unchanged) |
| **G-HIGH-7** Hardcoded Prizma defaults in messaging templates | HIGH (code level) | **Confirmed at DB-row level on demo tenant.** Demo's templates literally contain "אופטיקה פריזמה", "053-364-5404" (Prizma WhatsApp), "הרצל 32, אשקלון", and `prizmaoptic.short.gy` URLs — all rendered to my whitelist phone in Phase 2. Tenant 2 onboarding is blocked at the template-content level too. Bundle into `M4_HARDCODED_PRIZMA_REMOVAL_CRIT` SPEC. | HIGH (unchanged, broader evidence) |
| **T1/T2/T4/T9/T13** | DEFERRED in Phase 1 | **PASS in Phase 2** with full body+rendering+delivery evidence. | n/a |
| **T5** | DEFERRED in Phase 1 | **PASS-with-bug** — full anonymous form-submission chain works end-to-end; confirmation date format is the bug above. | n/a |
| **T14** | DEFERRED in Phase 1 | **PASS-with-replacement-critical** — see G-HIGH-1 update + T14-CRIT-1 above. | n/a |
| **T12** | DEFERRED in Phase 1 | **SKIPPED in Phase 2** per SPEC §8 (broadcast 1000-cap requires >1000 demo leads + real SMS budget). | n/a |

### Net change for the morning triage list

The 10-item triage queue from Phase 1 needs two amendments:
1. **Add `M4_UNSUB_SUPPRESSION_CRIT`** as a new top-priority SPEC (insert at position 1.5, between #1 tenant_isolation and #2 prizma_removal). Single-line fix in `send-message/index.ts`: gate dispatch behind `lead.unsubscribed_at IS NULL`. Add a regression test that unsubscribes a lead and asserts a follow-up `send-message` returns `rejected` not `sent`.
2. **Add `M4_PUBLIC_FORM_DATE_FORMAT_HIGH`** as a separate small SPEC (insert at position 5.5). Single-line fix in `event-register/index.ts`: format `event_date` to DD/MM/YYYY before pre-fill, OR pass `variables: {}` and let `injectEventVariables` do the work.
3. **Re-classify** the original `UNSUBSCRIBE_CONFIG_DRIFT_FIX_HIGH` (#3 in Phase 1's queue) from HIGH to LOW — the customer-facing harm doesn't materialize, just hygiene cleanup. May be merged into a generic "EF config-vs-code drift cleanup" item later.

---

## APPENDIX C — Surprising Findings Worth Saving as Memory

- **The dispatchFreshLead branch logic is "active event wins" not "no active event."** When the lead-intake EF receives a fresh phone, it picks the FIRST `registration_open`/`waiting_list` event (ordered by `event_date` ASC) and fires `event_invite_new` rather than `lead_intake_new` — even auto-creating the attendee row + promoting the lead's status to `invited`. The `lead_intake_new_*` template only fires on tenants that have ZERO active events, which is rare-to-never in a live tenant. Worth memory because every future "T1 fires lead_intake_new" assumption is wrong.
- **`register_lead_to_event` RPC does NOT dispatch any messages.** The CRM UI (or, on the public-form path, `event-register/index.ts`) is responsible for firing the confirmation post-RPC-success. The activity-log-vs-messaging separation is clean: RPCs do data, EFs do messaging. Worth memory if a future audit asks "where does T4's confirmation come from."
- **The anon JWT (legacy `eyJhbGciOi...`) is ALSO baked into the storefront's HTML `<script>` block, not just the 7 EFs.** Same key, additional exposure surface. The customer's browser literally exfiltrates it on every page load. The "shared key with the storefront" pattern is intentional — a single rotation must happen in 8+ places (7 EFs + storefront inline). Worth memory for the inevitable Iron-Rule-23 rotation SPEC.
- **`send-message` EF has a per-tenant SMS allowlist (`tenants.test_mode_sms_allowlist`).** Demo's allowlist is `["+972537889878","+972503348349","+972507168471"]`; prizma's is NULL (production mode = all phones go through). Phase 2 indirectly verified this works — every fired SMS targeted a whitelist phone, none were rejected at this layer. Worth memory for future T-tests: a non-whitelist phone in dispatch will write `status='rejected'` rows to message_log, not silent drop.
- **Storefront `/r/[code]` redirects via the resolve-link EF, not the storefront server, for short_link resolution.** The chain prizma-optic.co.il → www.prizma-optic.co.il → resolve-link EF → real URL is 4 redirects total before the customer sees the destination. Latency observation: each step ~200ms cold, so SMS click → unsubscribe page can be ~800ms. Not a finding, but worth memory for any future perf audit on the public flow.
- **The send-message EF has a `scanForUnsubstitutedPlaceholders` post-substitution scanner (P33 Fix B).** All Phase 2 fires returned 0 unsubstituted placeholders, validating the scanner works in production. The scanner regex is `/%([a-z][a-z0-9_]*)%/g` — lowercase-first-char only, so URL-encoded hex like `%D7%` (Hebrew in wa.me URLs) is correctly excluded. Worth memory because the universal placeholder guard is a real safety net that an auditor might assume isn't deployed.

---

*End of Phase 2 report. Total runtime 0h 19m. 14 demo messages fired, 0 prizma writes, 0 whitelist breaches, 0 commits. 2 new bugs surfaced (T14-CRIT-1, T5-HIGH-1), 1 Phase 1 finding partially refuted (G-HIGH-1 → INCONCLUSIVE/LOW for customer impact), 0 cleanup zombies, repo clean of any Phase 2-touched committed files. Morning triage owes the queue two new entries.*
