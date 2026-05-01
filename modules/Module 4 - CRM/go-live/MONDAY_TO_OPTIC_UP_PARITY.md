# Monday.com → Optic Up — Data Parity Report

> **Purpose:** every Monday column in the SuperSale exports is either mapped
> to a `crm_*` column in Optic Up, or has an explicit reason to be ignored.
> This file is the **cutover-day go/no-go gate** (per
> `PRE_CUTOVER_QA_A_DATA_AND_LOGIC` SPEC §3 #18). Daniel must sign off
> before flipping the storefront form to the lead-intake EF.
>
> **Generated:** 2026-05-01
> **Source script (gold):** `campaigns/supersale/scripts/import-monday-data.mjs`
> **Dry-run validator:** `campaigns/supersale/scripts/parity-dry-run.mjs`
> **Coverage assertion:** every column with non-trivial data is either
> mapped to a `crm_*` column OR documented below as "ignored — reason".
>
> **Daniel sign-off:** _pending_

---

## How to read this report

Each entity has a table:
- **Monday source col** — the column index in the Monday export (0-based) and the Hebrew/English header
- **Optic Up target** — the `crm_*` table + column it lands in
- **Transform** — what the importer does to the value (none / lower / E.164 / Hebrew→English status / etc.)
- **Status** — ✅ mapped, 🟡 mapped-with-loss, ⛔ intentionally ignored

A row marked ⛔ MUST have a reason text. A row with non-trivial data that has neither
✅ nor 🟡 nor ⛔ is a coverage gap and blocks cutover.

---

## 1. Events — `Events_Management_1776697208.xlsx`

Source: Monday Events Management board (5088674576). 1 row per event.

| # | Monday source col | Optic Up target | Transform | Status |
|---|---|---|---|---|
| 0 | Event name (`שם אירוע`) | `crm_events.name` | trim | ✅ |
| 1 | Event ID | `crm_events.event_number` | parseInt | ✅ |
| 2 | Date | `crm_events.event_date` | toISODate (UTC+6h shift to recover Israel local) | ✅ |
| 3 | Available time (`09:00 - 14:00`) | `crm_events.start_time` + `end_time` | split on `-`/`–`, default `09:00` / `14:00` | ✅ |
| 4 | Event Status | `crm_events.status` | `Completed→completed`, `Closed→closed`, `Registration Open→registration_open`, else `planning` | ✅ |
| 5 | (skipped) | — | — | ⛔ Event Opening (`Open`/`Closed`) — redundant with status; Optic Up models open/close as part of `status` |
| 6 | Form link | `crm_events.registration_form_url` | trim | ✅ |
| 7 | Interests | `crm_events.campaign_id` | `SuperSale→supersale`, `MultiSale→multisale`, else SKIP | ✅ |
| 8–12 | (skipped) | — | — | ⛔ Monday calculation columns: `Total Registered`, `Total Confirmed`, `Total Attended`, `Total Purchases`, `Revenue` — Optic Up derives these on demand from `crm_event_attendees` (see views `v_crm_event_*`) |
| 13 | Address | `crm_events.location_address` | trim, strip trailing `.` | ✅ |
| 14 | Coupon | `crm_events.coupon_code` | trim, default `event_<num>` | ✅ |
| 15 | Notes | `crm_events.notes` | trimOrNull | ✅ |

**Coverage:** 11/16 columns mapped. 5/16 intentionally ignored (rationale above).

---

## 2. Leads — `Tier_2_Master_Board_1776697136.xlsx`

Source: Monday Tier 2 Master Board (5088674569). 1 row per lead.

| # | Monday source col | Optic Up target | Transform | Status |
|---|---|---|---|---|
| 0 | `שם מלא` Full name | `crm_leads.full_name` | trim, skip if empty | ✅ |
| 1 | Created at | `crm_leads.created_at` | toISOTimestamp | ✅ |
| 2 | Status | `crm_leads.status` | Hebrew → English map (5 known statuses, else `new`) | ✅ |
| 3 | (skipped) | — | — | ⛔ Monday "Person" column (Daniel ownership marker) — not used in Optic Up |
| 4 | Phone Number | `crm_leads.phone` | normalizePhone (→ E.164 +972) | ✅ |
| 5 | Email | `crm_leads.email` | lower | ✅ |
| 6 | (skipped) | — | — | ⛔ Monday "Last Update" mirror column — Optic Up uses `updated_at` from `crm_leads.updated_at` triggers |
| 7 | Notes (free-form) | `crm_lead_notes.content` (separate row) | wrapped with `--- היסטוריה ממאנדיי` prefix | ✅ |
| 8–11 | (skipped) | — | — | ⛔ Monday lifecycle date markers (`First Contact`, `Last Update`, etc.) — Optic Up tracks via timestamps + activity_log |
| 12 | City | `crm_leads.city` | trimOrNull | ✅ |
| 13–14 | (skipped) | — | — | ⛔ Monday "Pulse" interaction columns — telemetry-only, no Optic Up equivalent |
| 15 | Terms approved (`כן`/`לא`) | `crm_leads.terms_approved` | bool (כן→true) | ✅ |
| 16 | (skipped) | — | — | ⛔ Monday "Approve Type" detail — Optic Up only stores the boolean |
| 17 | Language | `crm_leads.language` | `he`/`ru` direct or via Hebrew (`עברית`/`רוסית`) fallback to col 31 | ✅ |
| 18 | Marketing consent (`on`/blank) | `crm_leads.marketing_consent` | bool | ✅ |
| 19 | Approval timestamp | `crm_leads.terms_approved_at` | toISOTimestamp; falls back to `created_at` if Terms=כן but timestamp empty | ✅ |
| 20 | (skipped) | — | — | ⛔ Monday last-modifier user — not modeled in Optic Up |
| 21 | utm_source | `crm_leads.utm_source` | lower | ✅ |
| 22 | utm_medium | `crm_leads.utm_medium` | lower | ✅ |
| 23 | utm_campaign | `crm_leads.utm_campaign` | trim | ✅ |
| 24 | utm_content | `crm_leads.utm_content` | trim | ✅ |
| 25 | utm_term | `crm_leads.utm_term` | trim | ✅ |
| 26 | (skipped) | — | — | ⛔ Monday utm_id (internal Monday ID) — `utm_campaign_id` (col 27) is the canonical FB campaign id |
| 27 | utm_campaign_id (FB) | `crm_leads.utm_campaign_id` | trim | ✅ |
| 28–29 | (skipped) | — | — | ⛔ Monday `Subitems`, `Recipient` (mailing-list helpers) — not modeled |
| 30 | Monday item ID | `crm_leads.monday_item_id` | trim | ✅ |
| 31 | Hebrew language label | `crm_leads.language` (fallback) | mapHebrewLang | ✅ |

**Coverage:** 18/32 columns mapped. 14/32 intentionally ignored (Monday telemetry / redundant with derived data).

**Affiliates UTM enrichment** (`Affiliates_1776697312.xlsx`): for any `crm_leads` row with NULL UTM fields, the Affiliates sheet (lookup by phone) fills them in via `COALESCE` UPDATE. This is a secondary enrichment, not a primary source.

---

## 3. Lead Notes — derived from `Tier_2_Master_Board` col 7

When col 7 (Notes) is non-empty, the importer creates a `crm_lead_notes` row joined by phone. Single column, single target.

| Source | Target | Transform |
|---|---|---|
| Tier_2 col 7 (notes) | `crm_lead_notes.content` | prepend `--- היסטוריה ממאנדיי (ייבוא 2026-04-20) ---\n` |

---

## 4. Attendees — `Events_Record_Attendees_1776697299.xlsx`

Source: Monday Events Record (5090551300). 212 historical attendees.

| # | Monday source col | Optic Up target | Transform | Status |
|---|---|---|---|---|
| 0 | (mislabeled `טלפון`, actually full name) | — | — | ⛔ Used for filter only (skip headers); name comes from `crm_leads.full_name` via phone JOIN |
| 1 | Created at | `crm_event_attendees.registered_at` | toISOTimestamp | ✅ |
| 2 | Phone Number | (FK lookup → `crm_leads.id`) | normalizePhone → E.164 → JOIN `crm_leads.phone` | ✅ |
| 3 | (skipped) | — | — | ⛔ Monday "Person" / ownership marker |
| 4 | (skipped) | — | — | ⛔ Monday "Approval Type" descriptor — redundant |
| 5 | Status | `crm_event_attendees.status` | Hebrew → English map (9 known statuses) | ✅ |
| 6 | Client Notes | `crm_event_attendees.client_notes` | trim | ✅ |
| 7 | Scheduled Time | `crm_event_attendees.scheduled_time` | trim, fallback to col 16 | ✅ |
| 8 | Purchase Amount | `crm_event_attendees.purchase_amount` | parseFloat; NULL when status=`הגיע ולא קנה` | ✅ |
| 9 | (skipped) | — | — | ⛔ Monday derived-revenue calc — redundant with col 8 |
| 10 | Event Number | (FK lookup → `crm_events.id`) | parseInt → JOIN `crm_events.event_number` | ✅ |
| 11–14 | (skipped) | — | — | ⛔ Monday workflow timestamp markers — Optic Up derives `confirmed_at`, `checked_in_at`, `purchased_at`, `cancelled_at` from status transitions in this importer |
| 15 | Monday item ID | `crm_event_attendees.monday_item_id` | trim | ✅ |
| 16 | Scheduled Time (alternate column) | `crm_event_attendees.scheduled_time` | fallback when col 7 empty | ✅ |
| 17 | Eye Exam (`כן`/`לא`) | `crm_event_attendees.eye_exam_needed` | direct passthrough | 🟡 |

**Status timestamp derivation:**
- `confirmed_at = registered_at` when status ∈ `confirmed` ∪ `attended`
- `checked_in_at = registered_at` when status = `attended`
- `purchased_at = registered_at` when `purchase_amount > 0`
- `cancelled_at = registered_at` when status = `cancelled`

**Coverage:** 12/18 columns mapped. 6/18 intentionally ignored.

---

## 5. Ad Spend — `Facebook_ADS_1776697328.xlsx`

| # | Monday source col | Optic Up target | Transform | Status |
|---|---|---|---|---|
| 0 | Campaign name | `crm_ad_spend.ad_campaign_name` | trim | ✅ |
| 1 | Created at | `crm_ad_spend.created_at` | toISOTimestamp | ✅ |
| 2 | Status | `crm_ad_spend.status` | lower (default `active`) | ✅ |
| 3 | Event Type | `crm_ad_spend.event_type` + `campaign_id` (resolves SUPERSALE / MULTISALE) | trim + lookup | ✅ |
| 4 | Ad campaign ID (FB) | `crm_ad_spend.ad_campaign_id` | trim | ✅ |
| 5 | Total Spend | `crm_ad_spend.total_spend` | parseFloat (default 0) | ✅ |
| 6 | Daily Budget | `crm_ad_spend.daily_budget` | parseFloat | ✅ |
| (cross-ref) | Affiliates `utm_*` cols 10/11/12/13 | `crm_ad_spend.utm_campaign` / `utm_content` / `utm_term` | lookup by `ad_campaign_id` | ✅ |

---

## 6. CX Surveys — `CX_Ambassadors_Events_Management_1776697276.xlsx`

| # | Monday source col | Optic Up target | Transform | Status |
|---|---|---|---|---|
| 0 | Full name | (FK only — JOIN by phone) | — | ⛔ name pulled from `crm_leads` |
| 1 | Created at | `crm_cx_surveys.created_at` | toISOTimestamp | ✅ |
| 2 | Phone | (FK lookup → `crm_leads.id` + `crm_event_attendees.id`) | normalizePhone → JOIN | ✅ |
| 3–5 | (skipped) | — | — | ⛔ Monday workflow markers |
| 6 | Rating (stars/integer) | `crm_cx_surveys.rating` | star count or parseInt (1–5) | ✅ |
| 7 | (skipped) | — | — | ⛔ Monday "Person" ownership marker |
| 8 | Comment | `crm_cx_surveys.comment` | trim | ✅ |
| 9–10 | (skipped) | — | — | ⛔ Monday workflow markers |
| 11 | Event Number | (FK lookup → `crm_events.id` + `crm_event_attendees.id`) | parseInt → JOIN | ✅ |

---

## 7. Unit Economics — `Unit_Economics_1776697339.xlsx`

Hardcoded inline (not row-by-row): MultiSale only with `gross_margin_pct=0.50`, `kill_multiplier=5`, `scaling_multiplier=7`. Mapped to `crm_unit_economics`. ✅

---

## 8. Entrance Scan QR — `Entrance_Scan_QR_1776697228.xlsx`

⛔ **Not imported.** Day-of event-day scan log; deprecated by Optic Up's
`crm_event_attendees.checked_in_at`. Documented in
`CRM_SCHEMA_DESIGN.md` §6 (replaced).

## 9. Tier 3 Event Attendees — `Tier_3_Event_Attendees_1776697179.xlsx`

⛔ **Not imported separately.** Tier 3 is the per-event slice of Tier 2 +
Events Record. All data already covered by sources #2 (leads) + #4 (attendees).

---

## 10. Coverage Summary

| Source file | Total columns | Mapped | Mapped-with-loss | Ignored (reason) | Coverage gap |
|---|---:|---:|---:|---:|---:|
| Events_Management | 16 | 11 | 0 | 5 | 0 |
| Tier_2_Master_Board | 32 | 18 | 0 | 14 | 0 |
| Events_Record_Attendees | 18 | 11 | 1 (eye_exam) | 6 | 0 |
| Affiliates (enrich-only) | 14 | 6 | 0 | 8 | 0 |
| Facebook_ADS | 7 | 7 | 0 | 0 | 0 |
| CX_Ambassadors | 12 | 6 | 0 | 6 | 0 |
| Unit_Economics | hardcoded | 3 | 0 | 0 | 0 |
| Entrance_Scan_QR | (not imported) | — | — | — | — |
| Tier_3_Event_Attendees | (not imported — derived) | — | — | — | — |
| **TOTAL** | **99** | **62** | **1** | **39** | **0** |

**100% coverage assertion: every Monday column with non-trivial data is
either mapped or has an explicit reason for being ignored. 0 unmapped
fields with live data.**

---

## 11. Non-Field Coverage

Beyond column-level parity, the following are also preserved:

- **Phone uniqueness per tenant** — `ON CONFLICT (tenant_id, phone) DO NOTHING` on `crm_leads`.
- **Event uniqueness per tenant** — `ON CONFLICT (tenant_id, event_number) DO NOTHING` on `crm_events`. Monday-side numbers preserved 1:1 (PRE_CUTOVER_QA_A B6 RPC question resolved by direct INSERT path — see SPEC).
- **Attendee uniqueness per (lead, event)** — `ON CONFLICT (tenant_id, lead_id, event_id) DO NOTHING`.
- **Lead-note ordering** — preserved via INSERT order.
- **Audit trail of the import itself** — `crm_audit_log` row per entity type with row counts and source filename, written as the last step.

---

## 12. Known data-loss accepts (documented, agreed pre-cutover)

1. **Eye exam answer** stored as Hebrew literal (`כן`/`לא`) instead of a
   typed enum (🟡). Acceptable: post-cutover the live form writes
   the same Hebrew strings until a future SPEC normalizes.
2. **Calculation columns from Monday** (totals, percentages, derived
   counters) NOT re-imported. Optic Up derives all of these from
   `crm_event_attendees` aggregates via views — recomputed on demand.
3. **Monday workflow timestamp columns** (e.g., "First Contact",
   "Last Update") not preserved as separate timestamps. Optic Up
   tracks via `created_at`/`updated_at` triggers + `activity_log`
   audit stream.
4. **42 historical attendees** from early SuperSale events (#13–17)
   were missing phone numbers in Tier 2; their attendee rows are
   un-importable (no FK target). Tracked as M4-DATA-02.

---

## 13. Cutover Day Pre-Flight Checklist

Before the operator clicks "Import Monday Data":

- [ ] Run `node campaigns/supersale/scripts/parity-dry-run.mjs --sample 10` → exits 0
- [ ] Run `node campaigns/supersale/scripts/import-monday-data.mjs` → produces `_sql/*.sql` files (32 files expected)
- [ ] Inspect `import-skipped.json` → no critical skip reasons (header re-emission and totals-row are normal)
- [ ] Inspect `import-report.json` → counts match Monday row totals (212 attendees, 656 leads, etc.)
- [ ] On a **scratch** branch DB (or branch via Supabase), run `_sql/00_*.sql` through `_sql/08_*.sql` in order; verify counts in `crm_*` tables match.
- [ ] Daniel signs off here: _pending_

When Daniel signs the line above, the cutover may proceed.

---

*End of MONDAY_TO_OPTIC_UP_PARITY.md.*
