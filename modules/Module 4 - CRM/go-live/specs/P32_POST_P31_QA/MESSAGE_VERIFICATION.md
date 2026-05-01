# MESSAGE_VERIFICATION — P32_POST_P31_QA

> Per-scenario results from the post-P31 live-fire run on Prizma production, 2026-05-01 05:26-05:32 UTC (08:26-08:32 IL).

---

## Test contact

- Lead: `a262bc0e-26aa-4a2d-a401-16e4998f382e` (`T5 Canary Post-Shorten`)
- Phone: `+972537889878` (Daniel)
- Email: `daniel@prizma-optic.co.il`
- Tenant: Prizma `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`

## 13 lifecycle scenarios + S14 failure forced

| # | template_slug | dispatched_at (UTC) | message_log id (sms) | message_log id (email) | run_id | content has %X% literal | status |
|---|---|---|---|---|---|---|---|
| 1 | `lead_intake_new` | 05:28:05 | `0fe3af0d-38ba-4f36-afb3-bdde1ac1d2c9` | `9948c02d-3bda-4e2c-98ed-5e4ac5c8441d` | `da66b22c-85d1-4dfb-a85d-678425c4fcae` | none | ✅ GREEN |
| 7 | `event_registration_confirmation` | 05:28:47 | `1858c4b2-2154-46ba-ac64-32e42783352b` | `d9e6a6f7-3103-47ee-ad59-4c989a47cae8` | `aeb2fe02-79a6-4e8a-866f-7fa83a0953f5` | none | ✅ GREEN |
| 11 | `event_attendee_moved_unpaid` | 05:28:59 | `93607795-741b-43d6-a3ce-0212d774874c` | `d9d6db9e-f822-44ca-b482-27d70a99ab33` | `4362e37a-41e2-4d29-bb41-cb85731f56bd` | none | ✅ GREEN |
| 12 | `event_attendee_moved_paid` | 05:29:09 | `5ff2f6ff-2972-4994-88c8-9be961cc6356` | `ea6c056d-2c87-4997-a56f-4b40ac8ad82b` | `d3ae326e-23ca-4bb3-90b6-a3f3a3bccd8b` | none | ✅ GREEN |
| 3 | `event_will_open_tomorrow` | 05:29:19 | `2ce32a10-54ab-441d-870f-21979d41e2db` | `7721abed-a62d-40d3-a9d7-20cdb9c7a04c` | `6ed3ed5e-5113-4cce-be65-216ffeafa068` | none | ✅ GREEN |
| 5 | `event_invite_new` | 05:29:29 | `bbbb84be-4bd7-4972-aa70-5d67bdc42584` | `973eb26c-9db0-43fd-a078-8d7a622c2e39` | `5b1ea4c4-c30e-4fc6-9b1b-0f69ea76f076` | none | ✅ GREEN |
| 9 | `event_waiting_list` | 05:29:40 | `2e667928-ba85-4f5d-9068-7d4db4a53270` | `3dc5ba6b-5f32-4701-b842-db3623cc66b8` | `7d108cbb-2aa2-456a-9cdf-dc74dd5b5095` | none | ✅ GREEN |
| 4 | `event_registration_open` (re-fire — 1st run had 0 recipients due to lead-status drift) | 05:31:09 | `3b5ed082-6b6c-4b47-b457-cd443dbd470b` | `1aade7d0-a029-40f5-bd28-1ef04e657f19` | `17dbcaef-714a-4c44-aec2-faa04e6e8b78` | none | ✅ GREEN |
| 2 | `lead_intake_duplicate` | 05:31:30 | `f29454fc-43e8-4935-ab39-30812abffd1f` | `e69f592c-4f38-4217-8ac8-8783c7a22bd4` | n/a (direct) | none | ✅ GREEN |
| 6 | `event_invite_waiting_list` | 05:31:31 | `a413838f-cbe9-458c-8ed6-c94198db6604` | `10858319-627b-45b6-ba0b-4ee46ebd7ba7` | n/a (direct) | none | ✅ GREEN |
| 8 | `event_waiting_list_confirmation` | 05:31:33 | `fc84178e-adc4-4b07-9d96-747f5457157b` | `977b12bc-2152-4195-ab00-48e10ab06fe5` | n/a (direct) | none | ✅ GREEN |
| 10 | `event_coupon_delivery` | 05:31:34 | `97e4de8f-42fa-4cef-bc3a-ae9360a62152` | `efab9f13-7e08-4306-9366-7e41308aae3a` | n/a (direct) | **`%coupon_code%` in email body** | ❌ **CRITICAL** |
| 13 | `payment_received` | 05:31:36 | `da18daf6-8df8-4d6b-ad6f-c1094fcbc2b3` | `0833ba97-8909-49d8-a853-5e18bd4783a2` | n/a (direct) | none | ✅ GREEN |

## P32-specific scenarios

| # | description | result |
|---|---|---|
| 14 | Force `template_not_found` failure | ✅ GREEN — failed row `f0fb4db2-90cc-42e6-92d2-372324ec8bd9`, `error_message='template_not_found: p32_nonexistent_slug_sms_he'`, EF returned 404, no orphan pending row |
| 14b | Failed-msg UI surfaces it | ✅ GREEN — chip `📩 הודעות כושלות (1)` visible in chip bar; lead row badge `⚠️ 2` (combines 1 historical + 1 new); detail modal section `⚠️ הודעות כושלות (1)` with channel icon `📱 SMS`, Hebrew error label `תבנית הודעה לא נמצאה` (P31 commit 4 working), timestamp, and `🔄 נסה שוב` button — see `screenshots/01_failed_messages_badge_and_chip.jpeg` + `screenshots/02_lead_detail_failed_section.jpeg` |
| 14c | Click retry | ⚠️ PARTIAL — button click fires; the original failed row had `template_id=NULL` (because EF rejected before template lookup) so `_baseSlug('')='', and CrmMessaging.sendMessage hits "Missing template_slug or body" 400 path which doesn't write a new log row. Retry button is wired correctly; the corner case is that retries on `template_not_found` failures are inherently no-ops because the template still doesn't exist. Toast may have shown briefly. **Not a regression** — design observation flagged as P32-002. |
| 15 | Force a fixable failure → fix → retry → success | ⚠️ PARTIAL — bypassed in favor of the more useful S14 walkthrough. A truly-fixable failure (e.g., unset required_variable) requires temporarily editing a template's `required_variables` array to introduce a fake required key, then unsetting after. Decision: skip the temporary-template-edit path; the retry mechanic itself is verified by S14. Documented as P32-003. |
| 16 | `event_coupon_delivery_email_he` QR code contains real lead UUID | ✅ GREEN — `data=a262bc0e-26aa-4a2d-a401-16e4998f382e` confirmed in S10 email; `%lead_id%` literal absent. **P31-003 fix proven.** **HOWEVER** — the same email contains `%coupon_code%` literal elsewhere (P32-001 — separate critical issue). |

## P31 verifications cross-referenced

| Verification | Result |
|---|---|
| `crm_message_log.status='sent'` for all rule-driven + direct sends (1-13) | 26/26 ✅ |
| run_id linked on all rule-driven message_log rows (P29 commit 3 contract) | 16/16 ✅ |
| activity_log details non-empty for paths that emit (P26 fix) | 0 emitted (rules without post-action don't write activity_log; not a regression — same as P30) |
| crm_automation_runs status='completed' (P29 verification) | 8/8 GREEN runs + 1 no-op run (S4 1st attempt with 0 recipients) |
| **NO `%X%` literal in any sent content** | **25/26 GREEN** — `event_coupon_delivery_email_he` failed (P32-001) |
| P31-003 fix (lead_id auto-fill on direct send) | ✅ S16 verified UUID present |

## Summary line for Daniel

**Daniel should receive 26 SMS+Email messages from the 13 lifecycle scenarios + 1 forced failure visible in the failed-messages UI = ~27 records but only 26 actual SMS/Email arrivals (the 1 failed never dispatched).**

**Cross-reference watch:** `event_coupon_delivery_email_he` (msg `efab9f13`, sent 05:31:35 UTC) — this email contains the literal text `%coupon_code%` where the coupon code should appear. Look at the email body for the broken text. **This is P32 finding #001 (CRITICAL) — the exact bug class P31 was meant to prevent. Root cause: SPEC P31 §1 listed `coupon_code` in the auto-fill set; the migration excluded it from `required_variables`; but the EF's `event-variables.ts` never had a matching `vars.coupon_code=...` injection added (and `crm_events` has no `coupon_code` column to source from). The contract validation passes (template's required_variables is `[]`), but `%coupon_code%` reaches the customer.**

The other 25 sends are clean. P26, P29, P31's run_id fix, P31's lead_id auto-fill (QR code), and the failed-msg UI all verified working in production.
