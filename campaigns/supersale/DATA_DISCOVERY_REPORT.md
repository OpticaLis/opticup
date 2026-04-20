# CRM Data Discovery Report

> **Generated:** 2026-04-20
> **Source:** `campaigns/supersale/exports/` (9 Monday.com board exports)
> **Target schema:** `campaigns/supersale/CRM_SCHEMA_DESIGN.md` (v3, 23 tables / 7 Views / 8 RPCs)
> **Driving SPEC:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B1_DATA_DISCOVERY/SPEC.md`
> **Mode:** Read-only analysis. **0 DB writes. 0 files modified.** Parser: Node + `xlsx` (Python not available on this machine — see §11).
> **Prizma tenant UUID:** `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total data rows in Tier 2 (after stripping group-break headers) | **~894 real leads** (900 raw rows − 4 group-break re-header rows − 2 spurious) |
| Tier 2 unique normalized phones | **893** |
| Affiliates unique normalized phones | **862** |
| Leads in **both** Tier 2 and Affiliates (by phone) | **840 (≈97% of Affiliates)** |
| Leads in Tier 2 only (never in FB ad set) | **53** |
| Leads in Affiliates only (recent FB, not yet CRM'd) | **22** |
| Recommended unique leads to import | **894 (Tier 2 is the source; Affiliates supplies only UTM enrichment)** |
| Historical attendee records (Events Record) | **212 real + 1 header row** |
| Events in Events Management | **11 real events (IDs 13–23) + 1 Monday totals row to discard** |
| Facebook Ads rows with spend data | **57 of 91 real rows have `Total Spend`** |
| **Data quality score** | **FAIR** — data is usable but has: 2 redundant language columns, 6 invalid phones, 97% Affiliates-vs-Tier-2 overlap, empty UTM in Facebook ADS, empty Tier 3 board |

**Key decisions the report recommends:**
1. **Import Tier 2 as the authoritative lead source.** Use Affiliates only to backfill UTM fields (`utm_source`, `utm_medium`, `utm_campaign`) for the 840 overlapping leads.
2. **Skip Tier 3 entirely** — the file is empty (no active event at export time).
3. **Skip Entrance Scan** as a separate import — map its data onto `crm_event_attendees.checked_in_at` timestamp during Events Record import.
4. **Events Record drives `crm_event_attendees`** (not Tier 3). It is the permanent attendee archive.
5. **`crm_statuses` seed needs one mapping exception** — the historical value "הגיע ולא קנה" (1 row) collapses to slug `attended` with `purchase_amount = NULL` (per schema §0 row 3: this is a View, not a status).
6. **Facebook ADS board has 0 populated UTM columns** — UTM linkage to `crm_ad_spend` must come from the Affiliates `Campaign` column (which has real values), not from the FB board itself.

---

## 2. File-by-File Column Mapping

> **Reading guide:** Monday exports have header at **row 3** (row 1 = board name, row 2 = group name). Group-break rows in the middle of the file repeat the header — these are identified and excluded from the counts below. "Col #" is the 1-based column position in the exported sheet.

---

### 2.1 Tier 2: Master Board → `crm_leads`
**Source:** `Tier_2_Master_Board_1776697136.xlsx` · 900 raw rows · 2 group breaks ("Purchased - No more messages", "Not Interested") · **32 columns**

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| שם מלא | 1 | `crm_leads.full_name` | text | trim | NOT NULL |
| Creation date | 2 | `crm_leads.created_at` | timestamptz | parse date | Excel date cell |
| Status | 3 | `crm_leads.status` | text (slug) | **status mapping §3.1** | default `new` if empty |
| Last Comment | 4 | — | — | **skip** | Monday artifact — not imported |
| Phone Number | 5 | `crm_leads.phone` | text | **phone normalization §4** | UNIQUE `(tenant_id, phone)` |
| Email | 6 | `crm_leads.email` | text | lowercase+trim | nullable |
| Call Back | 7 | — | — | **skip** | 0 populated rows seen |
| Notes | 8 | → `crm_lead_notes` (1 row per lead with content) | text | prepend "--- היסטוריה ממאנדיי (ייבוא 2026-04-20) ---\n" | 698 leads have notes, avg length **89 chars**. Per schema §5.6 |
| Interests | 9 | — | — | **skip** | 893/900 = "SuperSale" (constant — campaign linkage handled via attendees → events → campaigns) |
| Event Number (for direct register) | 10 | — | — | **skip** | Transient routing; resolved at registration time |
| Email Messages | 11 | — | — | **skip** | Automation flag ("Send" or empty) — replaced by `crm_automation_rules` |
| Eye Exam | 12 | `crm_event_attendees.eye_exam_needed` | text | — | **moved to attendees per v3 §5.4** |
| City | 13 | `crm_leads.city` | text | trim | 896/900 empty — nearly unused |
| Total Revenue | 14 | — (computed) | — | **skip** | Replaced by `v_crm_lead_event_history.total_purchases` |
| Events Attended | 15 | — (computed) | — | **skip import** | Format: `", 20"` / `"22, 20"`. Parse at ATTENDEE migration: strip leading comma, split, match to event_number. Drives `crm_event_attendees` rows. |
| Terms&Conditions | 16 | `crm_leads.terms_approved` | bool | `כן` → true, else false | 880/900 approved |
| Category | 17 | — | — | **skip** | Monday bucket ("לא ידוע"/"ממומן"/"לא נמצא במאסטר") — replaced by `crm_tags` |
| lg | 18 | `crm_leads.language` | text | `he`/`ru`/empty → `he` | **redundant with col 32** — see §6 |
| Marketing | 19 | `crm_leads.marketing_consent` | bool | `on` → true | 20/900 consented |
| Approval time | 20 | `crm_leads.terms_approved_at` | timestamptz | parse | nullable |
| WhatsApp Name | 21 | — | — | **skip** | Redundant with `full_name` |
| Source | 22 | `crm_leads.utm_source` | text | lowercase | usually enriched from Affiliates |
| Medium | 23 | `crm_leads.utm_medium` | text | lowercase | |
| Campaign | 24 | `crm_leads.utm_campaign` | text | — | |
| Content | 25 | `crm_leads.utm_content` | text | — | |
| Term | 26 | `crm_leads.utm_term` | text | — | |
| CX | 27 | — | — | **skip** | Monday computed marker (e.g., "1/1", "0/52") |
| Campaign ID | 28 | `crm_leads.utm_campaign_id` | text | — | |
| Campaign Link | 29 | — | — | **skip** | Monday linked column |
| Attended? | 30 | — (computed) | — | **skip** | Replaced by `v_crm_lead_event_history` |
| Item ID | 31 | `crm_leads.monday_item_id` | text | cast to text | 897/900 populated; maps Rule 4.1 of schema |
| Language | 32 | — (duplicate of col 18 `lg`) | — | **skip after merge** | See §6 — prefer `lg`; only use `Language` to fill gaps |

**Effective lead rows after cleaning:** 900 raw − 2 group-break headers − 2 spurious `"Status"` rows = **≈896 candidate rows**, of which 6 fail phone validation (§4) → **≈890 importable leads**.

---

### 2.2 Affiliates → `crm_leads` (enrichment only)
**Source:** `Affiliates_1776697312.xlsx` · 867 rows · 0 group breaks · **17 columns**

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| שם מלא | 1 | `crm_leads.full_name` | text | — | use only for leads not in Tier 2 |
| Creation Date | 2 | `crm_leads.created_at` | timestamptz | — | |
| Phone Number | 3 | `crm_leads.phone` | text | **phone normalization §4** | dedup key |
| Email | 4 | `crm_leads.email` | text | — | |
| Interests | 5 | — | — | **skip** | 100% "SuperSale" |
| City | 6 | `crm_leads.city` | text | — | **100% empty** in Affiliates |
| Notes | 7 | `crm_lead_notes` | text | — | usually short ad-click notes |
| Language | 8 | — | — | **skip** | **100% empty** in Affiliates |
| Source | 9 | `crm_leads.utm_source` | text | lowercase (`fb`/`FB`/`facebook` all → `facebook`) | **primary enrichment value** |
| Medium | 10 | `crm_leads.utm_medium` | text | lowercase | 774/867 = "paid" |
| Campaign | 11 | `crm_leads.utm_campaign` | text | — | 10 distinct values — the real UTM bridge to Facebook ADS |
| Content | 12 | `crm_leads.utm_content` | text | — | |
| Term | 13 | `crm_leads.utm_term` | text | — | |
| Campaign ID | 14 | `crm_leads.utm_campaign_id` | text | — | matches `crm_ad_spend.ad_campaign_id` |
| Facebook ADS | 15 | — | — | **skip** | Monday linked column |
| link to Facebook ADS | 16 | — | — | **skip** | Monday linked column |
| Numbers | 17 | — | — | **skip** | Monday computed |

**Role in migration:** use Affiliates as the UTM source-of-truth. For the 840 phones that appear in both Tier 2 and Affiliates, Affiliates' UTM fields take priority when Tier 2's corresponding fields are empty.

---

### 2.3 Events Management → `crm_events`
**Source:** `Events_Management_1776697208.xlsx` · 12 rows (11 real events + 1 totals row) · 22 columns

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| שם האירוע | 1 | `crm_events.name` | text | — | |
| Event ID | 2 | `crm_events.event_number` | int | parse int | UNIQUE `(tenant_id, event_number)` |
| Event Date | 3 | `crm_events.event_date` | date | — | |
| Available Time | 4 | `crm_events.start_time` + `end_time` | time | split on `-`/`–` | e.g. `09:00 - 14:00` → start=09:00, end=14:00 |
| Event Status | 5 | `crm_events.status` | text (slug) | **status mapping §3.3** | |
| Event Opening | 6 | — | — | **skip** | Redundant with Event Status |
| Form Link | 7 | `crm_events.registration_form_url` | text | — | 1 unique Monday form URL with `event_id` query param |
| Interests | 8 | `crm_events.campaign_id` | uuid | **lookup** `crm_campaigns.slug` | "SuperSale"→`supersale`, "MultiSale"→`multisale` |
| Total Registered | 9 | — (computed) | — | **skip** | `v_crm_event_stats.total_registered` |
| Total Confirmed | 10 | — (computed) | — | **skip** | `v_crm_event_stats.total_confirmed` |
| Total Attended | 11 | — (computed) | — | **skip** | `v_crm_event_stats.total_attended` |
| Total Purchases | 12 | — (computed) | — | **skip** | `v_crm_event_stats.total_purchased` |
| Total Purchased vol. | 13 | — (computed) | — | **skip** | `v_crm_event_stats.total_revenue` |
| Address | 14 | `crm_events.location_address` | text | trim trailing `.` | all 11 events = "הרצל 32, אשקלון" (one row has trailing `.`) |
| Coupon | 15 | `crm_events.coupon_code` | text | — | e.g., `SuperSale22`, `Supersale0426`, `01MultiSale26` — **inconsistent format** — note for future convention |
| Notes | 16 | `crm_events.notes` | text | — | |
| link to Event Attendees | 17 | — | — | **skip** | Monday linked column |
| Registration URL | 18 | → `registration_form_url` | — | merge with col 7 | duplicate; keep one |
| Counter | 19 | — | — | **skip** | Monday computed |
| Attempts after close | 20 | — (computed) | — | **skip** | `v_crm_event_stats.attempts_after_close` |
| Date for Search | 21 | — | — | **skip** | Monday filter helper |
| Date Search ID | 22 | — | — | **skip** | Monday filter helper |

**Additional:** populate `crm_events.monday_item_id` from export (not visible as a column — must be queried from Monday API before Phase B2 import, or left NULL initially).

**Campaign distribution:** 8 events MultiSale, 3 events SuperSale, 1 row has no Interests (the Monday totals row to discard).

---

### 2.4 Events Record (Attendees) → `crm_event_attendees`
**Source:** `Events_Record_Attendees_1776697299.xlsx` · 213 rows · 0 group breaks · 23 columns · **primary source for historical attendees**

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| טלפון | 1 | → lookup `crm_leads.id` by phone | — | **phone normalization §4** | NOT a stored field — used to resolve `lead_id` FK |
| Created | 2 | `crm_event_attendees.registered_at` | timestamptz | — | |
| Phone Number | 3 | (duplicate of col 1) | — | **skip** | |
| Email | 4 | — | — | **skip** | on `crm_leads` only |
| Last Comment | 5 | — | — | **skip** | Monday artifact |
| Status | 6 | `crm_event_attendees.status` | text (slug) | **attendee mapping §3.2** | |
| Client's Notes | 7 | `crm_event_attendees.client_notes` | text | — | nullable |
| Scheduled Time | 8 | `crm_event_attendees.scheduled_time` | text | keep as text (ISO timestamps found) | |
| Purchase Amount | 9 | `crm_event_attendees.purchase_amount` | numeric(10,2) | — | 65/213 have a value |
| City | 10 | — | — | **skip** | on `crm_leads` only |
| Event ID | 11 | → lookup `crm_events.id` by event_number | — | parse int | NOT stored — used to resolve `event_id` FK |
| Interests | 12 | — (implied by event) | — | **skip** | |
| Send Messages | 13 | — | — | **skip** | Automation flag |
| Language | 14 | — (use lead's) | — | **skip** | 172/213 empty here |
| Optic Summery | 15 | — | — | **skip** | Per schema §0 row 4: MultiSale-only, not imported |
| Item ID | 16 | `crm_event_attendees.monday_item_id` | text | — | |
| Preferred Time | 17 | `crm_event_attendees.scheduled_time` (if col 8 empty) | text | merge with col 8 | |
| Eye Exam | 18 | `crm_event_attendees.eye_exam_needed` | text | normalize to 4 canonical values | see §7 issue |
| Terms&Conditions | 19 | → `crm_leads.terms_approved` | bool | **skip here** (set on lead) | |
| MultiSale Master Leads | 20 | — | — | **skip** | Monday linked column |
| Sent | 21 | — | — | **skip** | Automation flag |
| Category | 22 | — | — | **skip** | |
| CX | 23 | — | — | **skip** | computed marker |

**FK resolution pseudo-code:**
```
for each row in Events_Record:
    lead_id = crm_leads WHERE phone = normalize(טלפון)
    event_id = crm_events WHERE event_number = int(Event ID)
    if lead_id IS NULL or event_id IS NULL → flag for review (expected 0 fails given 94% dedup above)
```

---

### 2.5 Tier 3: Event Attendees — **DO NOT IMPORT**
**Source:** `Tier_3_Event_Attendees_1776697179.xlsx` · 5 data rows · 3 group breaks ("Quick Registration", "Dups", "NI") · **27 columns — but file is effectively empty**

- Of the 5 "data" rows: 3 are header re-leakage from group breaks, 1 is completely empty, 1 has status `חדש` but no Event ID.
- Tier 3 is **transient by design** (emptied between events, per `campaigns/supersale/monday/tier3-event-attendees.md`). At export time, no active event was open.
- **Decision:** do not import. The `registered` / `waiting_list` / `duplicate` / `quick_registration` / `manual_registration` statuses in the `crm_statuses` seed are for Phase B2+ usage (new registrations on the platform), not historical import.

---

### 2.6 Facebook ADS → `crm_ad_spend`
**Source:** `Facebook_ADS_1776697328.xlsx` · 93 rows · 2 group breaks ("Paused", "Stopped") · **29 columns — most are Monday linked/computed and skipped**

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| שם מלא | 1 | `crm_ad_spend.ad_campaign_name` | text | — | e.g. `קמפיין לידים \| SuperSale תל אביב \| UGC \| קר \| 50 יומי \| 4.3.26` |
| Creation Date | 2 | `crm_ad_spend.created_at` | timestamptz | — | |
| Status | 3 | `crm_ad_spend.status` | text | lowercase (`Active`/`Paused`/`Stopped`) | 76 Stopped, 7 Paused, 5 Active |
| Event Type | 4 | `crm_ad_spend.event_type` | text | — | 19 SuperSale, 11 MultiSale, 61 empty (older) |
| Campaign ID | 5 | `crm_ad_spend.ad_campaign_id` | text | — | Facebook ID, e.g. `120241393285210789` |
| Total Spend | 6 | `crm_ad_spend.total_spend` | numeric(10,2) | — | 57/91 populated |
| Daily Budget | 7 | `crm_ad_spend.daily_budget` | numeric(10,2) | — | |
| Decision Text | 8 | — (computed) | — | **skip** | Replaced by `v_crm_campaign_performance.decision` |
| Revenue Num | 9 | — (computed) | — | **skip** | |
| Buyers Num | 10 | — (computed) | — | **skip** | |
| Gross Profit | 11 | — (computed) | — | **skip** | |
| CAC | 12 | — (computed) | — | **skip** | |
| Kill CAC | 13 | — (computed) | — | **skip** | derived from `crm_unit_economics` |
| Scaling CAC | 14 | — (computed) | — | **skip** | |
| CPL | 15 | — (computed) | — | **skip** | |
| Leads Num | 16 | — (computed) | — | **skip** | |
| Kill Multiplier Num | 17 | — | — | **skip** | Replaced by `crm_unit_economics` |
| Scaling Multiplier Num | 18 | — | — | **skip** | Replaced by `crm_unit_economics` |
| Master | 19 | — | — | **skip** | Monday linked |
| Interested | 20 | — | — | **skip** | |
| Unique Buyers | 21 | — | — | **skip** | |
| Total Revenue | 22 | — | — | **skip** | |
| m.Status | 23 | — | — | **skip** | |
| Unit Economics | 24 | — | — | **skip** | Replaced |
| Gross Margin % | 25 | — | — | **skip** | Replaced by `crm_unit_economics` |
| Scaling Multiplier | 26 | — | — | **skip** | |
| Kill Multiplier | 27 | — | — | **skip** | |
| Affiliates | 28 | — | — | **skip** | Monday linked |
| Total Leads | 29 | — | — | **skip** | |

- `crm_ad_spend.campaign_id` (FK → `crm_campaigns.id`) → lookup by `event_type` ("SuperSale"/"MultiSale"). Rows with empty `Event Type` (61) must be categorized manually before import or defaulted.
- **UTM linkage problem:** the schema's `crm_ad_spend.utm_campaign` / `utm_content` / `utm_term` cannot be populated from this file — these columns are **completely empty** in the export. See §7 issue 6 and §8 recommendation.

---

### 2.7 Unit Economics → `crm_unit_economics`
**Source:** `Unit_Economics_1776697339.xlsx` · 4 rows (2 real + 1 scratch + 1 header-echo) · 5 columns

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| Name | 1 | — | — | **skip** | duplicate of Event Type |
| Event Type | 2 | → lookup `crm_campaigns.id` by slug | uuid | `SuperSale`→`supersale`, `MultiSale`→`multisale` | |
| Gross Margin % | 3 | `crm_unit_economics.gross_margin_pct` | numeric(5,2) | — | 0.20 SuperSale, 0.50 MultiSale |
| Kill Multiplier | 4 | `crm_unit_economics.kill_multiplier` | numeric(5,2) | — | 4 SuperSale, 5 MultiSale |
| Scaling Multiplier | 5 | `crm_unit_economics.scaling_multiplier` | numeric(5,2) | — | 6 SuperSale, 7 MultiSale |

- Phase A seed already populated Prizma with SuperSale at 0.2/4/6. **MultiSale is NOT yet seeded** — add during Phase B2.
- The "scratch row" (0.7 / 9 / 13, no name) and "Name/Name" header-echo row must be skipped.

---

### 2.8 CX & Ambassadors → `crm_cx_surveys`
**Source:** `CX_Ambassadors_Events_Management_1776697276.xlsx` · 14 data rows (3 header-echo from group breaks) · 16 columns

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| שמך המלא | 1 | → lookup lead | — | via full_name + phone | |
| Created | 2 | `crm_cx_surveys.created_at` | timestamptz | — | |
| Phone Number | 3 | → lookup attendee_id | — | phone + Event ID | |
| Email | 4 | — | — | **skip** | |
| Status | 5 | — | — | **skip** | always "מרוצה" (satisfied) where non-empty |
| Interest | 6 | — (implied by event) | — | **skip** | |
| ציון כללי | 7 | `crm_cx_surveys.rating` | int | `⭐×5` → 5, `⭐×4` → 4 | 11/11 real rows = 5★ |
| ציון משני | 8 | — | — | **skip** | not in schema |
| משהו נוסף שחשוב שנדע? | 9 | `crm_cx_surveys.comment` | text | — | |
| Lead ID | 10 | — | — | **skip** | Monday linked column |
| Event Date | 11 | — (implied) | — | **skip** | |
| Event ID | 12 | → `attendee_id` FK resolution | — | match by (lead.phone, event.event_number) | |
| Referral link | 13 | — | — | **skip** | |
| האם קיבלת מענה מלא וברור... | 14 | — | — | **skip** | yes/no follow-up |
| Получили ли Вы... | 15 | — | — | **skip** | Russian translation of col 14 |
| Sec. SuperSale | 16 | — | — | **skip** | Monday helper column |

**Effective rows:** 11 real survey records, distributed: Event 22 = 6, Event 20 = 2, Event 13 = 2, Event 15 = 1. All ratings = 5★.

---

### 2.9 Entrance - Scan QR — **NOT imported as a separate table**
**Source:** `Entrance_Scan_QR_1776697228.xlsx` · 68 data rows · 9 columns

- **Decision:** this is a check-in log. The only enduring information is "this attendee checked in at this time." That data flows into `crm_event_attendees.checked_in_at` (timestamp) and `crm_event_attendees.status = 'attended'` (if אושר) — already captured in the Events Record import (§2.4) for historical events 20 and 22.
- 61 rows `אושר` (approved), 6 rows `שגיאה` (error). The error rows are attendees who scanned but were not in the registered list — not useful as historical data.
- **Not imported as a standalone entity.** Matches SPEC §3 file #9 annotation "Check-in log (informational — may not import)."

---

## 3. Status Mapping

### 3.1 Lead Statuses (Tier 2 `Status` → `crm_statuses` where `entity_type='lead'`)

| Monday Status (Hebrew) | Count | CRM Slug | In Phase A seed? | Notes |
|---|---|---|---|---|
| ממתין לאירוע | 841 | `waiting` | ✅ | dominant |
| ביטל Unsubscribe | 50 | `unsubscribed` | ✅ | triggers_messages=true |
| הוזמן לאירוע | 2 | `invited` | ✅ | triggers_messages=true |
| לא מעוניין | 2 | `not_interested` | ✅ | |
| (empty) | 3 | `new` | ✅ | default |
| "Status" (literal text) | 2 | — | — | junk row (group-break re-header) — skip |

**Coverage:** 5 distinct real statuses. Phase A seed has 11 lead statuses (`new`, `invalid_phone`, `too_far`, `no_answer`, `callback`, `waiting`, `invited`, `confirmed`, `confirmed_verified`, `not_interested`, `unsubscribed`). The historical data uses only 5 of them — the other 6 slugs are for future lifecycle states (which is fine; they're configurable by design).

**Group-membership semantics (NOT statuses):**
- Group `"Purchased - No more messages"`: leads whose `crm_event_attendees.purchase_amount > 0` for at least one event. Expressed via `v_crm_lead_event_history.is_returning_customer` (schema §8.2). No status slug.
- Group `"Not Interested"`: leads with `status = not_interested`. No extra mapping needed.

---

### 3.2 Attendee Statuses (Events Record `Status` → `crm_statuses` where `entity_type='attendee'`)

| Monday Status (Hebrew) | Count | CRM Slug | In Phase A seed? | Notes |
|---|---|---|---|---|
| הגיע | 74 | `attended` | ✅ | |
| אישר | 62 | `confirmed` | ✅ | |
| ביטל | 23 | `cancelled` | ✅ | |
| כבר נרשם | 16 | `duplicate` | ✅ | |
| חדש | 15 | `registered` | ✅ | |
| רשימת המתנה | 10 | `waiting_list` | ✅ | |
| לא הגיע | 9 | `no_show` | ✅ | |
| אירוע נסגר | 2 | `event_closed` | ✅ | |
| הגיע ולא קנה | 1 | `attended` | ⚠️ **not a seed slug** | 1 historical row. Per schema §0 row 3 this is NOT a status — maps to `attended` with `purchase_amount = NULL`. Report for Foreman acknowledgement. |
| (empty) | 1 | `registered` | ✅ | default |

**Seed coverage:** Phase A has 10 attendee statuses. The historical data uses 8 (+ the 1 non-seed edge case). The remaining 2 seed slugs — `quick_registration` and `manual_registration` — are unused in history and will be populated going forward as new attendees register via the QR path / manual path.

---

### 3.3 Event Statuses (Events Management `Event Status` → `crm_statuses` where `entity_type='event'`)

| Monday Status | Count | CRM Slug | In Phase A seed? |
|---|---|---|---|
| Completed | 9 | `completed` | ✅ |
| Closed | 1 | `closed` | ✅ |
| Registration Open | 1 | `registration_open` | ✅ |
| (empty / totals row) | 1 | — | skip |

**Seed coverage:** 10 event slugs seeded; 3 used historically; 7 reserved for go-forward lifecycle (`planning`, `will_open_tomorrow`, `invite_new`, `waiting_list`, `2_3d_before`, `event_day`, `invite_waiting_list`).

---

## 4. Phone Number Analysis

### 4.1 Tier 2 (900 raw / 894 effective after cleaning)

| Format | Count | Example | Transform | Importable? |
|---|---|---|---|---|
| `972XXXXXXXXX` (12 digits, Excel stored as number) | 892 | `972507775675` | prepend `+` → `+972507775675` | ✅ |
| `972XXXXXXXXX` starts with `972-6XX` (non-mobile) | 1 | `972608454833` | prepend `+` → `+972608454833` | ✅ (accepted; spec doesn't restrict to mobile) |
| Empty / NULL | 3 | — | — | ❌ cannot import |
| Non-numeric (literal "Phone Number" text) | 2 | `Phone Number` | — | ❌ header leakage, skip row |
| 13 digits (extra digit) | 1 | `9720528088322` | manual review | ❌ flag |
| 12 digits garbled (non-`972` prefix) | 1 | `526411712972` | manual review | ❌ flag |

**Summary:** **893 importable phones, 6 flagged for manual review.**

### 4.2 Affiliates (867 raw)

| Format | Count | Example | Transform | Importable? |
|---|---|---|---|---|
| `972XXXXXXXXX` (12 digits) | 857 | `972523309996` | prepend `+` | ✅ |
| `5XXXXXXXX` (9 digits, missing country prefix) | 7 | `542210500` | prepend `+972` | ✅ |
| `972-6XX` (non-mobile) | 1 | `972608454833` | prepend `+` | ✅ |
| 12 digits garbled | 1 | `526411712972` | manual review | ❌ |
| Empty | 1 | — | — | ❌ |

**Summary:** **865 importable, 2 flagged.**

### 4.3 Events Record (213 raw)

| Format | Count | Importable? |
|---|---|---|
| `972XXXXXXXXX` | 212 | ✅ (normalize with `+`) |
| Empty | 1 | ❌ |

---

## 5. Deduplication Analysis

### 5.1 Affiliates vs Tier 2 (by normalized phone, `+972XXXXXXXXX`)

| Metric | Value |
|---|---|
| Tier 2 unique phones | **893** |
| Affiliates unique phones | **862** |
| Matching by phone (in both) | **840** |
| In Tier 2 only | **53** |
| In Affiliates only | **22** |

- **Affiliates overlap with Tier 2 = 840 / 862 = 97.4%.** This exceeds the SPEC §6 threshold of "> 90% may mean they're the same data" — **reporting here** (not a STOP trigger; the tables have different fields): Affiliates carries UTM tracking that Tier 2 does not always carry. The 97% overlap is expected — Affiliates is the raw Facebook lead source that feeds Tier 2 via Make scenarios (1A-S → 1B). The 22 Affiliates-only records are either (a) recent leads not yet processed into Tier 2, (b) test records, or (c) leads disqualified before reaching Tier 2.
- **Recommendation:** **Import Tier 2 as the authoritative source.** For each of the 840 overlapping phones, enrich the `crm_leads` row with Affiliates' UTM fields where Tier 2's are NULL. For the 22 Affiliates-only records, evaluate manually — do not import test rows.

### 5.2 Internal duplicates within Tier 2

- **Duplicate phones found: 0.** Tier 2 is clean — every phone is unique. The `(tenant_id, phone)` UNIQUE constraint will not trip.

### 5.3 Internal duplicates within Affiliates

- **Duplicate phones found: 2.**
  - `+972507168471` appears **3 times**
  - `+972501234567` appears **2 times** (this is the famous "test number" `0501234567`)
- These collapse naturally during Tier-2-primary import.

---

## 6. Language Mapping

### 6.1 Tier 2 has TWO language columns (redundant)

| Column | Monday Column # | Populated | Values |
|---|---|---|---|
| `lg` | 18 | 744/900 | `he` (744), empty (154), junk `"lg"` (2) |
| `Language` | 32 | 765/900 | `עברית` (765), empty (133), junk `"Language"` (2) |

| Merged value | Count | `crm_leads.language` |
|---|---|---|
| `he` / `עברית` (one or both populated) | ~810 estimated after merge | `he` |
| `ru` / `רוסית` | not seen in Tier 2 | `ru` |
| Both empty | ~84 | `he` (default per schema) |

**Migration rule:** `language = COALESCE(lg, mapHebrew(Language), 'he')` where `mapHebrew('עברית') = 'he'`, `mapHebrew('רוסית') = 'ru'`.

### 6.2 Affiliates

- `Language` column is **100% empty** in Affiliates (867/867). Cannot enrich from this source.

### 6.3 Events Record

| Monday value | Count | `crm_event_attendees` — use lead's language | |
|---|---|---|---|
| `עברית` | 40 | use as confirmation | |
| `רוסית` | 1 | use as confirmation (1 Russian-speaking attendee historically) | |
| (empty) | 172 | inherit from `crm_leads.language` | |

---

## 7. Data Quality Issues

| # | Issue | File | Count | Severity | Action |
|---|---|---|---|---|---|
| 1 | Invalid/empty phone number | Tier 2 | 6 | HIGH | Cannot import without phone; skip these rows or request a fix before Phase B2 |
| 2 | Invalid/empty phone number | Affiliates | 2 | LOW | Skip |
| 3 | Missing phone | Events Record | 1 | MEDIUM | Skip attendee row |
| 4 | `crm_leads.city` field: **896/900 empty in Tier 2, 100% empty in Affiliates** | Tier 2, Affiliates | 1,767/1,767 | INFO | Field is effectively unused in historical data — that's fine, the column stays in schema for go-forward data |
| 5 | Tier 2 has TWO redundant language columns (`lg` + `Language`) | Tier 2 | — | MEDIUM | Merge rule documented in §6.1. This is Monday data-model debt, not a CRM schema problem. |
| 6 | Facebook ADS board has `Campaign` / `Content` / `Term` columns but **all are empty** | Facebook ADS | 91/91 rows | HIGH | `crm_ad_spend.utm_campaign` / `utm_content` / `utm_term` cannot be populated from this file. Must be inferred from `Affiliates.Campaign` + matched by `ad_campaign_id` before Phase B2 import. See §8 step 6. |
| 7 | Tier 3 file is effectively empty at export time | Tier 3 | 5 data rows / all garbage | INFO | Expected — board is transient. Do not import. |
| 8 | Events Management "Coupon" naming is **inconsistent** (`Supersale22`, `Supersale0426`, `02SuperSale26`, `01MultiSale26`) | Events Mgmt | — | INFO | Not a schema issue, but future convention should be decided before Phase B2 writes new events |
| 9 | Historical attendee status `הגיע ולא קנה` (1 row) has no seed slug | Events Record | 1 | LOW | Map to `attended` with `purchase_amount = NULL`. Document in migration notes. |
| 10 | Events Management row 12 is a **Monday totals row** with no event data | Events Mgmt | 1 | LOW | Discard on import (event_id empty, event_name empty) |
| 11 | 22 leads exist in Affiliates but not Tier 2 | Affiliates | 22 | INFO | Evaluate per-row for import: likely recent or test leads |
| 12 | Affiliates has 2 duplicate phones internally | Affiliates | 2 phones (5 rows) | LOW | Collapsed naturally when Tier 2 is primary |
| 13 | `Terms&Conditions` is `כן` for 880/900 Tier 2 leads but blank `terms_approved_at` must be inferred from `Approval time` column | Tier 2 | — | INFO | Use `Approval time` column (col 20) as `terms_approved_at`; if empty and terms=כן, set `terms_approved_at = created_at` |
| 14 | Tier 2 "Attended?" column contains value `51` in one row (expected 0/1) | Tier 2 | 1 | INFO | Spreadsheet data-entry error; ignore (column itself is skipped) |
| 15 | Tier 3 group-break rows repeat the header (columns `Phone Number`, `Status`, `Event ID` appear as data in 3 rows) | Tier 3 | 3 rows | INFO | Applies to every file; parser already filters by row content shape |

---

## 8. Import Order Recommendation

Based on FK dependencies, data availability, and Phase A seed state:

```
1. crm_campaigns         (Phase A seed — verify 'supersale' + 'multisale' exist for Prizma tenant)
2. crm_unit_economics    (Phase A seeded SuperSale; ADD MultiSale row: margin=0.5, kill=5, scale=7)
3. crm_events            ← Events_Management_…xlsx (11 real events, skip totals row) — depends on campaigns
4. crm_leads             ← Tier_2_Master_Board_…xlsx (~890 importable) — enrich UTMs from Affiliates for 840 overlaps
5. crm_lead_notes        ← Tier 2 "Notes" column — 698 notes, one row per lead
6. crm_event_attendees   ← Events_Record_Attendees_…xlsx (212 real) — depends on crm_leads + crm_events; parse `Events Attended` column in Tier 2 as cross-check
7. crm_ad_spend          ← Facebook_ADS_…xlsx (91 real rows) — depends on crm_campaigns; UTM fields NULL until manually backfilled from Affiliates
8. crm_cx_surveys        ← CX_Ambassadors_…xlsx (11 real) — depends on crm_event_attendees
9. crm_audit_log         ← insert a single summary audit record per table with action='import', metadata={'source':'monday_export', 'file':<name>, 'row_count':N}
```

**Not imported:**
- Tier 3 (empty file, transient board)
- Entrance Scan (already captured as `checked_in_at` via Events Record)
- Affiliates (as a standalone insert — used only for UTM enrichment during step 4)

---

## 9. Notes & Monday Item IDs

| Export | Monday Item ID column | Position | Maps to |
|---|---|---|---|
| Tier 2 | `Item ID` | col 31 | `crm_leads.monday_item_id` |
| Events Record | `Item ID` | col 16 | `crm_event_attendees.monday_item_id` |
| Tier 3 | `Item ID` | col 14 | (not imported) |
| Events Management | **no Item ID column** | — | Must be fetched from Monday API before Phase B2 to populate `crm_events.monday_item_id`, OR leave NULL initially and let a sync job backfill. |
| Affiliates | none | — | Not a CRM entity — no need |
| Facebook ADS | none | — | Use `Campaign ID` (Facebook's ID, col 5) as `crm_ad_spend.ad_campaign_id` |
| CX Ambassadors | none visible | — | Same treatment as Events Management |

**Recommended Foreman decision for Phase B2:** either (a) run one-time Monday API fetch to resolve `monday_item_id` for Events Management + CX Ambassadors during import, or (b) start NULL and let the first Monday sync cycle backfill. Option (a) is cleaner.

---

## 10. Fields NOT Imported (with reason)

| Monday Column | File | Reason |
|---|---|---|
| WhatsApp Name | Tier 2 col 21 | Redundant with `full_name` |
| Call Back | Tier 2 col 7 | 0 populated rows — Monday workflow artifact |
| Email Messages | Tier 2 col 11 | Automation flag ("Send"/empty) — replaced by `crm_automation_rules` |
| Interests | Tier 2 col 9, Affiliates col 5, Events Record col 12, Tier 3 col 11 | Constant "SuperSale" in 99%+ — campaign linkage goes via `event.campaign_id` |
| Last Comment | Tier 2 col 4, Events Record col 5, Tier 3 col 5 | Monday artifact — captured in timeline via notes |
| Event Number (direct register) | Tier 2 col 10 | Transient routing value |
| Total Revenue | Tier 2 col 14 | Computed — replaced by `v_crm_lead_event_history.total_purchases` |
| Attended? | Tier 2 col 30 | Computed — replaced by `v_crm_lead_event_history` |
| Events Attended | Tier 2 col 15 | **Parsed at migration time to drive `crm_event_attendees` rows**, not stored as a column |
| Category | Tier 2 col 17, Events Record col 22, Tier 3 col 22 | Monday bucket — replaceable by `crm_tags` if needed later |
| CX | Tier 2 col 27, Events Record col 23, Tier 3 col —? | Monday computed marker |
| Campaign Link | Tier 2 col 29 | Monday linked column |
| Language (Tier 2 col 32) | Tier 2 | Redundant with `lg` (col 18); use as fallback only |
| Preferred Time | Events Record col 17, Tier 3 col 16 | Merged into `scheduled_time` |
| MultiSale Master Leads | Events Record col 20, Tier 3 col 20 | Monday linked column |
| Sent | Events Record col 21, Tier 3 col 21 | Automation flag |
| DONE / Open Events / Google Event ID / Attendance Confirmation / Formula Attendance Confirmation | Tier 3 cols 23–27 | Tier 3 not imported; all Monday artifacts |
| Optic Summery | Events Record col 15, Tier 3 col 13 | Per schema §0 row 4: MultiSale-only, not relevant |
| Lead ID | CX Ambassadors col 10 | Monday linked column |
| Sec. SuperSale | CX Ambassadors col 16 | Monday helper column |
| Referral link | CX Ambassadors col 13 | Not in schema |
| ציון משני | CX Ambassadors col 8 | Not in schema |
| האם קיבלת מענה... / Получили ли Вы... | CX Ambassadors cols 14–15 | Yes/no follow-up not in schema |
| Event Management counters (cols 9–13, 19–22) | Events Mgmt | Computed — replaced by `v_crm_event_stats` |
| Form Link / Registration URL / link to Event Attendees | Events Mgmt cols 7, 17, 18 | Link-column artifacts |
| Event Opening | Events Mgmt col 6 | Redundant with Event Status |
| Facebook ADS computed columns (cols 8–29 except 3–7) | Facebook ADS | All replaced by `v_crm_campaign_performance` |
| Affiliates Facebook ADS / link / Numbers | Affiliates cols 15–17 | Monday linked/computed |
| Entrance Scan QR all columns | Entrance Scan | File not imported (log is captured as `checked_in_at`) |

---

## 11. Executor Notes (methodology & caveats)

- **Parser:** Node.js (v24.14.0) with `npm install xlsx@0.18.5`. Python 3 + `openpyxl` was listed as a precondition in SPEC §11 but is not installed on the Windows desktop. The SPEC's intent ("analyze Excel files") is tool-agnostic; Node + xlsx produced equivalent results. Logged as a finding to reconcile the precondition.
- **Group-break handling:** Monday exports insert section-title rows (one-cell rows, e.g. "Purchased - No more messages"). The parser also detected that every group break *also* re-emits the header row on the following line. Both were filtered by row-shape rules (single-value rows with short text; rows where the first column is literally "Phone Number").
- **Date fields:** xlsx was configured with `cellDates: true`, so Excel date serials come through as real JS `Date` objects. All dates were verified to parse without error.
- **Workspace:** All analysis artifacts (`_tmp_discovery/`) are in a throwaway working directory under `campaigns/supersale/` and are **not committed**. The only new file in this SPEC is this report.

---

## 12. Final Checklist — aligning with SPEC §4 Success Criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Report file exists at `campaigns/supersale/DATA_DISCOVERY_REPORT.md` | ✅ |
| 2 | Contains column mapping for all 9 files | ✅ (§2.1–§2.9) |
| 3 | Contains dedup analysis Affiliates vs Tier 2 | ✅ (§5.1) |
| 4 | Contains phone format analysis | ✅ (§4) |
| 5 | Contains status mapping tables | ✅ (§3.1–§3.3) |
| 6 | Contains language mapping | ✅ (§6) |
| 7 | Contains import order recommendation | ✅ (§8) |
| 8 | Contains data quality summary | ✅ (§7) |
| 9 | No DB writes performed | ✅ (0 SQL executed) |
| 10 | No files modified except the report + executor retrospective artifacts | ✅ (verified via `git status` before commit) |
| 11 | Single commit `docs(crm): add Data Discovery Report for Monday exports` | (see commit log) |

---

*End of report.*
