# Enum Mapping Table — Monday → OpticUp

> Companion to `MONDAY_MIGRATION_MAP.md` §4.1.
> Every Monday enum source value is paired with its OpticUp `crm_statuses.slug`.
> All mappings have been validated against the live `crm_statuses` table on
> tenant prizma (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) on 2026-05-02.

---

## 1. Lead Status — `Tier_2_Master_Board` col 2 → `crm_leads.status`

| Monday value (Hebrew) | Count | OpticUp `crm_leads.status` (slug) | Notes |
|---|---:|---|---|
| `ממתין לאירוע` | 841 | `waiting` | Default state — lead awaiting next event |
| `ביטל Unsubscribe` | 50 | `unsubscribed` + set `crm_leads.unsubscribed_at = COALESCE(approval_time, created_at)` | **Daniel directive: preserve unsubscribed status** |
| `הוזמן לאירוע` | 2 | `invited` | Lead in active event flow |
| `לא מעוניין` | 2 | `not_interested` | Lead opted out without unsubscribing |
| (blank) | 3 | SKIP — group banner / no-name row | Logged to skipped-rows.csv |
| `Status` (header re-emission) | 2 | SKIP — Monday duplicates the header on group breaks | Filter out at parse time |

**Coverage:** 4/4 real status values mapped. 0 unknown values. **No DANIEL_DECISION needed for lead status.**

**Open question (LOW priority):** OpticUp has 11 `lead` statuses (`new`, `invalid_phone`, `too_far`, `no_answer`, `callback`, `pending_terms`, `waiting`, `invited`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`, `waitlist`). Monday only uses 4. The other 7 will be unused on import (they exist for new leads created post-cutover by the lead-intake EF).

---

## 2. Attendee Status — `Events_Record_Attendees` col 5 → `crm_event_attendees.status`

| Monday value (Hebrew) | Count | OpticUp `crm_event_attendees.status` (slug) | Notes |
|---|---:|---|---|
| `הגיע` | 74 | `attended` | Set `checked_in_at = registered_at` + `purchased_at = registered_at` if purchase_amount > 0 |
| `אישר` | 62 | `confirmed` | Set `confirmed_at = registered_at` |
| `ביטל` | 23 | `cancelled` | Set `cancelled_at = registered_at` |
| `כבר נרשם` | 16 | `duplicate` | Lead is already on a different event; do not set timestamp markers |
| `חדש` | 15 | `registered` | Default state — newly registered, no action yet |
| `רשימת המתנה` | 10 | `waiting_list` | Set `waiting_list_position` if known (Monday does not export it; default sequential by `registered_at`) |
| `לא הגיע` | 9 | `no_show` | Final state — registered but did not appear |
| `אירוע נסגר` | 2 | `event_closed` | Late registration that arrived after event closure |
| `הגיע ולא קנה` | 1 | `attended` + `purchase_amount = NULL` | Single edge case — present at event but no purchase |
| (blank) | 1 | DANIEL_DECISION → recommend `registered` | One row missing status; data cleanup needed |

**Coverage:** 9/9 mapped. 1 DANIEL_DECISION (1 row).

**Critical:** the `הגיע ולא קנה` value is collapsed into `attended` because OpticUp tracks
purchases as a `purchase_amount` column on the attendee row, not as a status. The
distinction "attended but did not buy" is therefore expressed by `status='attended' AND purchase_amount IS NULL`.

---

## 3. Event Status — `Events_Management` col 4 → `crm_events.status`

| Monday value | Count | OpticUp `crm_events.status` (slug) | Notes |
|---|---:|---|---|
| `Completed` | 9 | `completed` | Event ran and closed |
| `Closed` | 1 | `closed` | Event 19 — registration was closed before it ran |
| `Registration Open` | 1 | `registration_open` | Event 23 — currently active |
| (blank) | 1 | SKIP — totals/banner row | Filter out at parse time |

**Coverage:** 3/3 real values mapped. **No DANIEL_DECISION needed for event status.**

**Note:** OpticUp has 10 `event` statuses (`planning`, `will_open_tomorrow`, `registration_open`, `invite_new`, `closed`, `waiting_list`, `2_3d_before`, `event_day`, `invite_waiting_list`, `completed`). Historical Monday data only populates 3 (`completed`, `closed`, `registration_open`). The others are unused for migrated rows.

---

## 4. Eye Exam — `Events_Record_Attendees` col 17 → `crm_event_attendees.eye_exam_needed`

| Monday value | Count | OpticUp `eye_exam_needed` (text — keeps Hebrew literal per parity SPEC §12.1) |
|---|---:|---|
| `לא - אין צורך בבדיקה` | 69 | `לא - אין צורך בבדיקה` (passthrough) |
| `כן` | 49 | `כן` |
| `לא` | 43 | `לא` |
| `כן - בדיקה רגילה` | 11 | `כן - בדיקה רגילה` (passthrough) |
| (blank) | 41 | NULL |

**Status:** 🟡 mapped-with-loss (Hebrew literal stored; future SPEC normalizes to enum).

**Drift from existing parity report:** The existing `MONDAY_TO_OPTIC_UP_PARITY.md` documents only `כן`/`לא` for this column. **Real data has 4 distinct values + blank.** The import script's `direct passthrough` rule still works (text column accepts any value) but the schema commitment to "two-value boolean" is fictional.

---

## 5. Lead Eye Exam — `Tier_2_Master_Board` col 11

Tier_2 has its own Eye Exam column (separate from per-event needs). Values:

| Monday value | Count | Disposition |
|---|---:|---|
| `לא` | 581 | DROP — this is the lead's *historical* answer; not stored in `crm_leads` |
| `כן` | 306 | DROP — same |
| (blank) | 11 | DROP |
| `Eye Exam` (header re-emission) | 2 | SKIP |

**Recommendation:** drop this Tier_2 column entirely. The per-event answer (Events_Record col 17) is what matters operationally. Daniel-decision: confirm OR add `crm_leads.eye_exam_default boolean` column.

---

## 6. Eye Exam — `Tier_3_Event_Attendees` (NOT IMPORTED)

Tier_3 board is the per-event slice of Tier_2 + Events_Record. Already represented by sources #2 + #4. NOT imported separately.

---

## 7. Language — `Tier_2_Master_Board` col 17 (lg) + col 31 (Language) → `crm_leads.language`

| Source col | Value | Count | OpticUp `crm_leads.language` |
|---|---|---:|---|
| col 17 (lg) | `he` | 744 | `he` |
| col 17 (lg) | (blank) | 154 | fallback to col 31 |
| col 31 (Language) | `עברית` | 765 | `he` |
| col 31 (Language) | (blank) | 133 | default `he` |

**Outcome:** all 893 valid leads land as `language='he'`. **Zero Russian-speaking leads in current data** — even though OpticUp supports `he`/`ru`. Daniel-decision (LOW): leave the schema as-is (Russian support is for future) OR enforce default `he` at migration time (already happens via column default).

---

## 8. Marketing Consent — `Tier_2_Master_Board` col 18 → `crm_leads.marketing_consent`

| Monday value | Count | OpticUp `marketing_consent` (boolean) |
|---|---:|---|
| `on` | 20 | `true` |
| (blank) | 878 | `false` |

**No DANIEL_DECISION.** Note: only 20/893 leads (2.2%) have explicit marketing consent. The other 878 default to `false`.

---

## 9. Terms Approval — `Tier_2_Master_Board` col 15 → `crm_leads.terms_approved`

| Monday value | Count | OpticUp `terms_approved` (boolean) |
|---|---:|---|
| `כן` | 880 | `true` |
| (blank) | 18 | `false` |

98.5% of leads approved terms. No DANIEL_DECISION.

---

## 10. Category Tag — `Tier_2_Master_Board` col 16 + `Events_Record_Attendees` col 21

Both columns share the same Hebrew vocabulary:

| Monday value | Tier_2 count | Events_Record count | Disposition |
|---|---:|---:|---|
| `לא ידוע` | 858 | — | DROP — "unknown" is meaningless tag |
| `ממומן` | 22 | — | OPTION → `crm_lead_tags` with auto-tag `paid_lead` |
| `לא נמצא במאסטר` | 15 | 15 | OPTION → `crm_lead_tags` with auto-tag `not_in_master` |
| `רישום ידני` | — | 43 | OPTION → `crm_lead_tags` with auto-tag `manual_registration` |
| (blank) | 3+155 | — | SKIP |
| `Category` (header) | 2 | — | SKIP |

**DANIEL_DECISION:** import these as `crm_lead_tags` rows? OR drop the column entirely as Monday-internal workflow noise? Currently the existing import script DROPs them. **Recommendation: drop now, revisit if Daniel wants to filter the lead board by these markers post-cutover.**

---

## 11. FB Ad Status — `Facebook_ADS` col 2 → `crm_facebook_campaigns.status`

| Monday value | Count | OpticUp `crm_facebook_campaigns.status` (text — no CHECK constraint) |
|---|---:|---|
| `Stopped` | 76 | `stopped` (lowercase) |
| `Paused` | 7 | `paused` |
| `Active` | 5 | `active` |
| (blank) | 3 | `inactive` (default) |
| `Status` (header) | 2 | SKIP |

**No DANIEL_DECISION.**

---

## 12. FB Event Type — `Facebook_ADS` col 3 → `crm_facebook_campaigns.event_type`

| Monday value | Count | OpticUp `event_type` |
|---|---:|---|
| (blank) | 61 | NULL |
| `SuperSale` | 19 | `supersale` (lowercase) |
| `MultiSale` | 11 | `multisale` |
| `Event Type` (header) | 2 | SKIP |

**Note:** 61/93 ad campaigns have no event_type — they're either retargeting / brand / non-event ads. Acceptable to land as NULL.

---

## 13. Send Messages flag — `Events_Record_Attendees` col 12

| Monday value | Count | Meaning | Migration disposition |
|---|---:|---|---|
| `קוד קופון` | 152 | "Coupon code sent" | Could backfill `crm_event_attendees.coupon_sent = true` + synthesize `crm_message_log` row with `template_id` matching `coupon_code` template |
| (blank) | 34 | Not sent | Leave `coupon_sent = false` |
| `הרשמה אושרה אוט'` | 25 | "Auto-approved registration" | No-op (it's a workflow marker, not a message) |
| `*אין זמן בדיקה!*` | 1 | "No exam time!" | No-op (operational comment, edge case) |
| `יום לפני האירוע` | 1 | "Day before event" | Could synthesize `crm_message_log` row with `event_reminder_day_before` template |

**DANIEL_DECISION (HIGH-VALUE):** synthesize `crm_message_log` rows for these 152+1 entries to preserve message history? Or treat as workflow noise and drop? See §7 of MAP for full discussion.

---

## 14. Sent flag — `Events_Record_Attendees` col 20

| Monday value | Count | Meaning |
|---|---:|---|
| `Approved` | 186 | Workflow approval marker — not a message-sent indicator |
| (blank) | 27 | Not approved (rejected/dup/old) |

DROP this column — it's Monday workflow-internal, no OpticUp equivalent.

---

## 15. Coverage Summary

| Field type | Total enum slots in source | Mapped | Skipped | DANIEL_DECISION |
|---|---:|---:|---:|---:|
| Lead status | 4 + 2 noise | 4 | 2 | 0 |
| Attendee status | 9 + 1 blank | 9 | 0 | 1 (1 blank row) |
| Event status | 3 + 1 banner | 3 | 1 | 0 |
| Eye exam (Events_Record) | 4 + blank | 4 (passthrough) | 1 | 0 |
| Eye exam (Tier_2) | 2 + 1 noise | 0 (drop) | 1 | 1 (drop vs. add column) |
| Language (Tier_2 col 17/31) | 2 sources, 1 effective value `he` | 1 | 1 | 0 |
| Marketing consent | 1 + blank | 2 | 0 | 0 |
| Terms approval | 1 + blank | 2 | 0 | 0 |
| Category tag | 4 + noise | 0 (currently drops) | 1 | 1 (drop vs. tag table) |
| FB ad status | 3 + blank | 4 | 1 | 0 |
| FB event type | 2 + blank | 3 | 1 | 0 |
| Send Messages flag | 5 unique | 0 (currently drops) | 1 | **1 HIGH (msg-log synth)** |
| Sent flag | 2 | 0 (drop) | 1 | 0 |

**Open DANIEL_DECISION items:** 4 — see MAP §5 for decision rationale per item.

---

*End of enum-mapping-table.md.*
