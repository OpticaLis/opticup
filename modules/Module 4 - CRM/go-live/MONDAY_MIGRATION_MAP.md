# Monday → Optic Up — Migration Map (THE MAP)

> **Purpose:** the single source of truth for migrating every byte of legitimate
> customer data from Monday.com to the Optic Up CRM (`prizma` tenant). This
> document supersedes `MONDAY_TO_OPTIC_UP_PARITY.md` and extends it with: edge
> cases, customer spending history, message history, Make.com touchpoints,
> migration script blueprint, verification queries, risk register, what Daniel
> needs to do, ready-to-execute gate, and cutover-day timeline.
>
> **Authored by:** opticup-executor (autonomous discovery, MONDAY_MIGRATION_DISCOVERY SPEC)
> **Generated:** 2026-05-02
> **Source data:** `campaigns/supersale/exports/*.xlsx` (frozen 2026-04-21)
> **Live target tenant:** `prizma` (UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`)
> **Status:** discovery complete. Awaiting Daniel + Architect chat review on `develop`.
>
> **READ THIS FIRST → §1 Executive Summary, §5 DANIEL_DECISION list, §11 Risks, §12 Daniel-action checklist.**

---

## §1 Executive Summary

**Volume to move:** ~893 leads, 11 events, 212 attendees (65 paying), 11 CX surveys, 88 Facebook ad campaigns, 4 unit-economic rows. Plus message-history reconstruction (152+ coupon-send markers, see §7) and customer-spending derivation (no separate import — derived from per-event purchase rows, see §6).

**Biggest risks (top 3):**
1. **51 orphan attendees** in events 13-21 whose phones never made it into Tier_2. The existing parity report claimed 42; real count is 51. Daniel must decide: skip, stub-create, or backfill (see §5 D-1).
2. **Tier_2 `Total Revenue` column is broken** — sums to 148,990 NIS while the canonical per-event purchase data sums to 279,640 NIS (47% drift). The Tier_2 column is a stale Monday formula. **OpticUp computes per-customer spending on demand from attendees — this is correct architecture, but Daniel should not be surprised that Monday's numbers don't survive (see §6).**
3. **Message history is partially reconstructible only.** 152 attendees have `Send Messages='קוד קופון'` markers but no actual `crm_message_log` rows are exported from Monday — the message bodies live in Make scenarios + Gmail logs. Daniel must decide: synthesize ~152 coupon-send rows from the marker, or accept message-history loss for pre-cutover events (see §7 + §5 D-3).

**Estimated migration time (script execution):** 30-90 seconds for inserts (DB is fast), but **30-60 minutes total** with verification queries between stages. Plus ~10-15 minutes for Daniel's manual prep (pre-flight, demo wipe, sign-off). Total cutover-day window: **2 hours conservative** (see §14).

**Estimated migration script complexity:** **MEDIUM**. The script logic already largely exists in `campaigns/supersale/scripts/import-monday-data.mjs` (739 lines). What it does not yet do: handle the 4 DANIEL_DECISION items, write to live DB (currently writes to `_sql/*.sql` files), run verification queries automatically, support rollback, idempotency on re-run. **Estimate: ~6-12 hours** to extend it into a production migration runner with all the safety rails.

**Gating items (cutover cannot proceed without):**
- All 4 DANIEL_DECISION items resolved (§5)
- Fresh Monday re-export (current data is 11 days old — within tolerance, but a final fresh pull is cleaner)
- Demo data wipe on prizma (currently 11 leads + 2 events from QA — must go to zero before import)
- Migration script tested end-to-end on a Supabase branch / scratch DB
- Storefront form rewire (P5_7 SPEC) and bot protection (P5_6) shipped
- Daniel signs off on this MAP

---

## §2 Source Inventory (Monday)

### 2.1 Monday boards in scope

| Board | Monday ID | XLSX export | Real data rows | Imported | Purpose |
|---|---|---|---:|---:|---|
| Tier 1: Incoming Leads | `5088674481` | **NOT exported** | unknown | 0 | Pre-T&C-approval lead intake; flushes to Tier 2 on approval. **Data not migrated** — Tier 1 flow is replaced by the `lead-intake` Edge Function on cutover (P5_7). |
| Tier 2: Master Board | `5088674569` | `Tier_2_Master_Board_1776697136.xlsx` | 893 valid (900 raw – 7 noise) | 893 | Lead lifecycle (CRM core) |
| Events Management | `5088674576` | `Events_Management_1776697208.xlsx` | 11 (12 raw – 1 banner) | 11 | Master event list |
| Events Record (Attendees) | `5090551300` | `Events_Record_Attendees_1776697299.xlsx` | 212 (213 raw – 1 totals) | ~191 (51 orphans pending decision) | Permanent attendee archive |
| Affiliates | (unknown ID) | `Affiliates_1776697312.xlsx` | 866 | 0 (used as enrichment lookup only) | Referrer attribution / UTM source |
| Facebook ADS | (unknown ID) | `Facebook_ADS_1776697328.xlsx` | 88 (93 – 5 noise) | 88 | FB ad campaign metadata |
| CX & Ambassadors | (unknown ID) | `CX_Ambassadors_Events_Management_1776697276.xlsx` | 11 | 11 | Customer-experience surveys |
| Entrance Scan QR | (unknown ID) | `Entrance_Scan_QR_1776697228.xlsx` | 68 | 0 (deprecated by `crm_event_attendees.checked_in_at`) | Day-of QR scan log |
| Tier 3: Event Attendees | (unknown ID) | `Tier_3_Event_Attendees_1776697179.xlsx` | 5 | 0 (derived from Tier_2 + Events_Record) | Per-event slice |
| Unit Economics | (unknown ID) | `Unit_Economics_1776697339.xlsx` | 4 | 4 | MultiSale / SuperSale economic constants (hardcoded inline in script) |

**Total real source rows:** ~1,295 across 9 XLSX files.

### 2.2 Per-file detail

#### Tier_2 Master Board (`Tier_2_Master_Board_1776697136.xlsx`, 32 cols, 893 valid rows)

Headers (full):
```
[0] שם מלא | [1] Creation date | [2] Status | [3] Last Comment | [4] Phone Number |
[5] Email | [6] Call Back | [7] Notes | [8] Interests | [9] Event Number (for direct register) |
[10] Email Messages | [11] Eye Exam | [12] City | [13] Total Revenue | [14] Events Attended |
[15] Terms&Conditions | [16] Category | [17] lg | [18] Marketing | [19] Approval time |
[20] WhatsApp Name | [21] Source | [22] Medium | [23] Campaign | [24] Content |
[25] Term | [26] CX | [27] Campaign ID | [28] Campaign Link | [29] Attended? |
[30] Item ID | [31] Language
```

Sample row (Hebrew, decoded):
```json
["דוד לוי", "2026-03-15T08:30:00Z", "ממתין לאירוע", "", "+972537123456", "david@example.com", "", "", "SuperSale", "", "", "כן", "תל אביב", "", "", "כן", "ממומן", "he", "on", "2026-03-15T08:31:00Z", "", "facebook", "cpc", "supersale_q1", "ad_42", "", "", "120241393285210789", "", "1", "8839293223", "עברית"]
```

#### Events Management (`Events_Management_1776697208.xlsx`, 22 cols, 11 valid rows)

Headers:
```
[0] שם האירוע | [1] Event ID | [2] Event Date | [3] Available Time | [4] Event Status |
[5] Event Opening | [6] Form Link | [7] Interests | [8] Total Registered | [9] Total Confirmed |
[10] Total Attended | [11] Total Purchases | [12] Total Purchased vol. | [13] Address |
[14] Coupon | [15] Notes | [16] link to Event Attendees | [17] Registration URL |
[18] Counter | [19] Attempts after close | [20] Date for Search | [21] Date Search ID
```

Real data: events 13-23 (11 rows), 8 MultiSale + 3 SuperSale, 9 Completed + 1 Closed (event 19) + 1 Registration Open (event 23).

Calculation columns (cols 8-12: Total Registered/Confirmed/Attended/Purchases/Purchased vol.) are NOT migrated — Optic Up derives these from `crm_event_attendees` aggregates via views (`v_crm_event_dashboard`, `v_crm_event_stats`).

#### Events Record / Attendees (`Events_Record_Attendees_1776697299.xlsx`, 23 cols, 212 valid rows)

Headers:
```
[0] טלפון | [1] Created | [2] Phone Number | [3] Email | [4] Last Comment |
[5] Status | [6] Client's Notes | [7] Scheduled Time | [8] Purchase Amount | [9] City |
[10] Event ID | [11] Interests | [12] Send Messages | [13] Language | [14] Optic Summery |
[15] Item ID | [16] Preferred Time | [17] Eye Exam | [18] Terms&Conditions |
[19] MultiSale Master Leads | [20] Sent | [21] Category | [22] CX
```

**Critical column not in existing parity report:** col 14 `Optic Summery` (sic — Monday typo) — 8 attendees have a long Hebrew vision-questionnaire summary (current vision solution, primary difficulty, occupation, medical background, multifocal experience, screen time, night driving). **No current OpticUp target.** See §5 D-2.

Per-event distribution of 212 attendees:
```
Event 22: 96   Event 20: 62   Event 13: 18   Event 14: 10
Event 16:  9   Event 18:  6   Event 15:  5   Event 17:  4
Event 21:  2
```
Events 19 and 23 have **zero** attendees in the export.

#### Facebook ADS (`Facebook_ADS_1776697328.xlsx`, 29 cols, 88 valid rows)

Mostly calculated/derived columns (Revenue, Buyers, Gross Profit, CAC, CPL, etc.) that have no OpticUp target — Optic Up derives ad performance via `v_crm_campaign_performance` view, not stored columns.

Maps to `crm_facebook_campaigns` (campaign_id, name, status, event_type, total_spend, daily_budget, master, interests, raw_data jsonb). Plus `crm_ad_spend` for daily-spend rollups.

**Schema drift:** the existing parity report claims `crm_ad_spend` has columns `ad_campaign_name`, `ad_campaign_id`, `daily_budget`, `status`, `event_type`, `utm_*`. **The actual `crm_ad_spend` schema only has** `id, tenant_id, campaign_id, spend_date, total_spend, created_at, updated_at`. The other columns live in the **separate** `crm_facebook_campaigns` table. The parity report conflates the two. See FINDINGS.md F-1.

#### Affiliates, CX, Tier 3, Entrance, Unit Economics

See `migration-discovery/volume-counts.json` for full per-file row counts and `migration-discovery/enum-mapping-table.md` for enum source values.

### 2.3 Cross-source consistency

| Metric | Tier_2 says | Events_Record says | Status |
|---|---:|---:|---|
| Total revenue across all customers | 148,990 NIS (col 13 sum) | **279,640 NIS** (col 8 sum, 65 paid attendees) | Tier_2 broken — see §6 |
| Distinct paying customers | 53 (col 13 > 0) | 65 paid rows / 47 distinct phones | Both numbers exist; canonical = attendee-side |
| Events attended per customer | col 14 mostly empty (only 2 rows non-zero) | 18 phones with multi-event registrations | Tier_2 col 14 broken — derive from `crm_event_attendees` |
| Lead-to-attendee linkage | 893 leads × 212 attendees | 51 orphan attendees | DANIEL_DECISION D-1 |

---

## §3 Target Inventory (OpticUp Supabase, prizma tenant)

Live state captured 2026-05-02 (read-only via Supabase MCP). All counts measured, none estimated.

### 3.1 Row counts at baseline (pre-migration)

| Table | Prizma rows (pre-migration) | Demo rows | Notes |
|---|---:|---:|---|
| `crm_leads` | 11 | 8 | Daniel's QA test data — must wipe before migration |
| `crm_events` | 2 | 10 | Daniel's QA test events — must wipe |
| `crm_event_attendees` | 2 | 12 | Daniel's QA test attendees — must wipe (cascade) |
| `crm_lead_notes` | 19 | 30 | Test notes from QA — must wipe (cascade) |
| `crm_message_log` | 57 | 121 | Test messages from QA — wipe is OK; we'll re-import nothing here for prizma |
| `crm_message_templates` | **32** | 36 | **DO NOT WIPE** — 32 production templates |
| `crm_statuses` | **34** | 34 | **DO NOT WIPE** — 34 lead/event/attendee status enums |
| `crm_automation_rules` | **16** | 22 | **DO NOT WIPE** — 16 production automation rules |
| `crm_ad_spend` | 0 | 49 | Empty — migration target |
| `crm_facebook_campaigns` | 0 | 7 | Empty — migration target |
| `crm_unsubscribes` | 0 | 0 | Empty — migration target (50 leads from Monday land here) |
| `crm_cx_surveys` | 0 | 0 | Empty — migration target (11 surveys from Monday) |
| `crm_campaigns` | 1 | 1 | Already seeded: `supersale` campaign — **do NOT wipe** |
| `crm_unit_economics` | 2 | 2 | Already seeded — leave alone |

### 3.2 Schema confirmation (columns exist as of 2026-05-02)

Verified live via `information_schema.columns`. The following migration-target columns were grep-confirmed:

- `crm_leads.{id,tenant_id,full_name,phone,email,city,language,status,source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,utm_campaign_id,terms_approved,terms_approved_at,marketing_consent,unsubscribed_at,monday_item_id,created_at,updated_at,is_deleted,client_notes,verified_phone}` — 25 cols, all present
- `crm_events.{id,tenant_id,campaign_id,event_number,name,event_date,start_time,end_time,location_address,location_waze_url,status,max_capacity,booking_fee,coupon_code,registration_form_url,notes,monday_item_id,created_at,is_deleted,max_coupons,extra_coupons}` — 21 cols, all present
- `crm_event_attendees.{id,tenant_id,lead_id,event_id,status,registration_method,registered_at,confirmed_at,checked_in_at,purchased_at,cancelled_at,purchase_amount,coupon_sent,coupon_sent_at,scheduled_time,eye_exam_needed,client_notes,waiting_list_position,monday_item_id,created_at,is_deleted,payment_status,paid_at,refund_requested_at,refunded_at,credit_expires_at,credit_used_for_attendee_id,no_refund_due_marked,no_refund_due_marked_at,paid_via_credit}` — 30 cols, all present (note rich payment-lifecycle columns added in M4_ATTENDEE_PAYMENT_SCHEMA)
- `crm_lead_notes.{id,tenant_id,lead_id,event_id,content,employee_id,created_at}` — 7 cols, all present
- `crm_message_log.{id,tenant_id,lead_id,event_id,template_id,broadcast_id,channel,content,status,external_id,error_message,created_at,run_id}` — 13 cols, all present
- `crm_unsubscribes.{id,tenant_id,lead_id,channel,reason,method,created_at}` — 7 cols, all present
- `crm_cx_surveys.{id,tenant_id,attendee_id,rating,comment,google_review_sent,callback_requested,callback_done,created_at}` — 9 cols, all present
- `crm_facebook_campaigns.{id,tenant_id,campaign_id,name,status,event_type,total_spend,daily_budget,master,interests,raw_data,last_synced_at,created_at,updated_at,first_seen_at}` — 15 cols, all present

### 3.3 Foreign key relationships (migration-relevant)

```
crm_event_attendees.lead_id  → crm_leads.id
crm_event_attendees.event_id → crm_events.id
crm_event_attendees.credit_used_for_attendee_id → crm_event_attendees.id  (self-ref, FIFO credit transfer)
crm_lead_notes.lead_id  → crm_leads.id
crm_lead_notes.event_id → crm_events.id (nullable)
crm_message_log.lead_id  → crm_leads.id
crm_message_log.event_id → crm_events.id (nullable)
crm_message_log.template_id → crm_message_templates.id (nullable)
crm_unsubscribes.lead_id → crm_leads.id
crm_cx_surveys.attendee_id → crm_event_attendees.id
crm_events.campaign_id → crm_campaigns.id
```

**Migration ordering implication:** must insert in this order:
1. `crm_campaigns` (already seeded — skip)
2. `crm_statuses` (already seeded — skip)
3. `crm_message_templates` (already seeded — skip)
4. `crm_events` (depends on `crm_campaigns`)
5. `crm_leads` (no FK to other migration tables)
6. `crm_lead_notes` (depends on `crm_leads`, optionally `crm_events`)
7. `crm_event_attendees` (depends on `crm_leads` AND `crm_events`)
8. `crm_unsubscribes` (depends on `crm_leads`)
9. `crm_cx_surveys` (depends on `crm_event_attendees`)
10. `crm_facebook_campaigns` (independent)
11. `crm_ad_spend` (independent — daily rollups)

### 3.4 Unique constraints to respect

- `crm_leads`: partial unique on `(tenant_id, phone) WHERE is_deleted=false` → script must `ON CONFLICT DO NOTHING`
- `crm_events`: unique on `(tenant_id, event_number)` → script must preserve Monday Event IDs and `ON CONFLICT DO NOTHING`
- `crm_event_attendees`: unique on `(tenant_id, lead_id, event_id)` → script must `ON CONFLICT DO NOTHING` (catches the 21 duplicate attendee rows)
- `crm_message_templates`: unique on `(tenant_id, slug, channel, language)` → not relevant for migration (templates pre-seeded)
- `crm_facebook_campaigns`: unique on `(tenant_id, campaign_id)` → script must `ON CONFLICT DO UPDATE` to capture latest spend snapshot
- `crm_ad_spend`: unique on `(tenant_id, campaign_id, spend_date)` → idempotent re-runs

---

## §4 Field-by-Field Mapping (THE MOST IMPORTANT SECTION)

> Master enum tables in `migration-discovery/enum-mapping-table.md`. This section
> maps each Monday column to its OpticUp target with transform rule.

### 4.1 Tier_2 Master Board → `crm_leads` + `crm_lead_notes` + `crm_unsubscribes`

| # | Monday col | OpticUp target | Transform | Status |
|---|---|---|---|---|
| 0 | `שם מלא` | `crm_leads.full_name` | trim | DIRECT |
| 1 | Creation date | `crm_leads.created_at` | toISOTimestamp; if Excel serial then `serial * 86400 + 1899-12-30` | TRANSFORM |
| 2 | Status | `crm_leads.status` + `crm_leads.unsubscribed_at` | enum-map per `enum-mapping-table.md §1` | TRANSFORM |
| 3 | Last Comment | DROP | — | NEEDS_DEFAULT |
| 4 | Phone Number | `crm_leads.phone` | normalizePhone → E.164 (`+972XXXXXXXXX`); detects 12-digit cell-format anomalies (rows 222, 710 — see skipped-rows-preview.csv) | TRANSFORM |
| 5 | Email | `crm_leads.email` | lowercase, trim | TRANSFORM |
| 6 | Call Back | DROP | Monday-internal flag | DROP |
| 7 | Notes | `crm_lead_notes.content` (separate row) | prepend `--- היסטוריה ממאנדיי (ייבוא 2026-05-XX) ---\n` | TRANSFORM |
| 8 | Interests | DROP (redundant — campaign linkage at event level) | — | DROP |
| 9 | Event Number (for direct register) | DROP | Workflow trigger marker, not data | DROP |
| 10 | Email Messages | DANIEL_DECISION D-3 — synthesize message_log? Or DROP? | — | DANIEL_DECISION |
| 11 | Eye Exam (Tier_2 cumulative) | DANIEL_DECISION → currently DROP (per-event answer in Events_Record is canonical) | — | DANIEL_DECISION |
| 12 | City | `crm_leads.city` | trimOrNull | DIRECT |
| 13 | Total Revenue | DROP — broken Monday formula (see §6); OpticUp derives on demand | — | DROP |
| 14 | Events Attended | DROP — broken (only 2/893 rows have a value); OpticUp derives | — | DROP |
| 15 | Terms&Conditions | `crm_leads.terms_approved` | bool (`כן`→true, blank→false) | TRANSFORM |
| 16 | Category | DROP (currently — see §5 D-4) | — | DANIEL_DECISION |
| 17 | lg | `crm_leads.language` (primary) | direct (`he`/`ru`); fallback to col 31 | TRANSFORM |
| 18 | Marketing | `crm_leads.marketing_consent` | bool (`on`→true, blank→false) | TRANSFORM |
| 19 | Approval time | `crm_leads.terms_approved_at` | toISOTimestamp; fallback to `created_at` if Terms=כן but blank | TRANSFORM |
| 20 | WhatsApp Name | DROP — Monday display name, redundant with `full_name` | — | DROP |
| 21 | Source | `crm_leads.utm_source` | lowercase, trim | TRANSFORM |
| 22 | Medium | `crm_leads.utm_medium` | lowercase, trim | TRANSFORM |
| 23 | Campaign | `crm_leads.utm_campaign` | trim | DIRECT |
| 24 | Content | `crm_leads.utm_content` | trim | DIRECT |
| 25 | Term | `crm_leads.utm_term` | trim | DIRECT |
| 26 | CX | DROP — Monday workflow trigger, no OpticUp equivalent on `crm_leads` | — | DROP |
| 27 | Campaign ID | `crm_leads.utm_campaign_id` | trim (FB ad ID) | DIRECT |
| 28 | Campaign Link | DROP — derivable from `utm_campaign_id` | — | DROP |
| 29 | Attended? | DROP — broken (sometimes "1", "3", "51"); count derivable from attendees | — | DROP |
| 30 | Item ID | `crm_leads.monday_item_id` | trim | DIRECT |
| 31 | Language (Hebrew label) | `crm_leads.language` (fallback when col 17 blank) | `עברית`→`he`, `רוסית`→`ru` | TRANSFORM |

**Affiliates UTM enrichment** (`Affiliates_1776697312.xlsx`): for each `crm_leads` row with NULL UTM fields, look up by phone in Affiliates and `COALESCE` UPDATE. Used as secondary enrichment, not primary source. 866 affiliates × 893 leads = ~833 enrichment matches per existing `import-report.json`.

**Unsubscribed lead handling:** when `crm_leads.status = 'unsubscribed'` (50 rows), additionally INSERT a row into `crm_unsubscribes` with `channel='all'`, `method='migration_from_monday'`, `reason='legacy_unsubscribe'`. Daniel directive: preserve unsubscribed status with provenance.

### 4.2 Events Management → `crm_events`

| # | Monday col | OpticUp target | Transform | Status |
|---|---|---|---|---|
| 0 | שם האירוע | `crm_events.name` | trim | DIRECT |
| 1 | Event ID | `crm_events.event_number` | parseInt | DIRECT |
| 2 | Event Date | `crm_events.event_date` | Excel serial → ISO date; preserve Israel local (UTC+2/+3 DST) | TRANSFORM |
| 3 | Available Time | `crm_events.start_time` + `end_time` | split on `-`/`–`; default `09:00`/`14:00` if blank | TRANSFORM |
| 4 | Event Status | `crm_events.status` | enum-map per `enum-mapping-table.md §3` | TRANSFORM |
| 5 | Event Opening | DROP — redundant with status | — | DROP |
| 6 | Form Link | `crm_events.registration_form_url` | trim; **NOTE:** post-cutover this URL points at OpticUp's form, not the Monday form. Field is preserved as historical record only. | DIRECT |
| 7 | Interests | `crm_events.campaign_id` | lookup: `SuperSale`→`supersale` campaign UUID, `MultiSale`→**DANIEL_DECISION D-5** (no `multisale` campaign currently exists in prizma) | DANIEL_DECISION |
| 8-12 | Total Registered/Confirmed/Attended/Purchases/Purchased vol. | DROP — derived | — | DROP |
| 13 | Address | `crm_events.location_address` | trim, strip trailing `.` | DIRECT |
| 14 | Coupon | `crm_events.coupon_code` | trim, default `event_<num>` | TRANSFORM |
| 15 | Notes | `crm_events.notes` | trimOrNull | DIRECT |
| 16 | link to Event Attendees | DROP — Monday-internal | — | DROP |
| 17 | Registration URL | DROP — appears to be a Monday formula returning literal `Last_one` | — | DROP |
| 18 | Counter | DROP | — | DROP |
| 19 | Attempts after close | DROP | — | DROP |
| 20 | Date for Search | DROP — Monday search helper | — | DROP |
| 21 | Date Search ID | DROP — Monday search helper | — | DROP |

**`max_capacity`, `booking_fee`, `max_coupons`, `extra_coupons`:** not in Monday source. Use schema defaults (50 / 50.00 / 50 / 0). Daniel may override per-event post-import.

### 4.3 Events Record → `crm_event_attendees`

| # | Monday col | OpticUp target | Transform | Status |
|---|---|---|---|---|
| 0 | טלפון (header — actually full name in some rows) | DROP — name lookup via JOIN on `crm_leads.phone` | — | DROP |
| 1 | Created | `crm_event_attendees.registered_at` | toISOTimestamp | DIRECT |
| 2 | Phone Number | (FK) `crm_event_attendees.lead_id` | normalizePhone → JOIN `crm_leads.phone` | TRANSFORM |
| 3 | Email | DROP — already on lead | — | DROP |
| 4 | Last Comment | DROP — Monday workflow | — | DROP |
| 5 | Status | `crm_event_attendees.status` + status-derived timestamps | enum-map per `enum-mapping-table.md §2`; derive `confirmed_at`/`checked_in_at`/`purchased_at`/`cancelled_at` from status | TRANSFORM |
| 6 | Client's Notes | `crm_event_attendees.client_notes` | trim | DIRECT |
| 7 | Scheduled Time | `crm_event_attendees.scheduled_time` | trim, fallback to col 16 | DIRECT |
| 8 | Purchase Amount | `crm_event_attendees.purchase_amount` + `payment_status='paid'` + `paid_at=registered_at` (when > 0) | parseFloat; NULL when status=`הגיע ולא קנה` | TRANSFORM |
| 9 | City | DROP — already on lead | — | DROP |
| 10 | Event ID | (FK) `crm_event_attendees.event_id` | parseInt → JOIN `crm_events.event_number` | TRANSFORM |
| 11 | Interests | DROP — redundant with event's campaign | — | DROP |
| 12 | Send Messages | DANIEL_DECISION D-3 — set `coupon_sent=true` if value=`קוד קופון` AND synthesize `crm_message_log` row | — | DANIEL_DECISION |
| 13 | Language | DROP — already on lead | — | DROP |
| 14 | Optic Summery | DANIEL_DECISION D-2 — store where? Currently DROPPED | — | DANIEL_DECISION |
| 15 | Item ID | `crm_event_attendees.monday_item_id` | trim | DIRECT |
| 16 | Preferred Time | `crm_event_attendees.scheduled_time` (fallback when col 7 empty) | — | TRANSFORM |
| 17 | Eye Exam | `crm_event_attendees.eye_exam_needed` | direct passthrough (Hebrew literal — see enum-mapping-table.md §4) | TRANSFORM 🟡 |
| 18 | Terms&Conditions | DROP — captured at lead level | — | DROP |
| 19 | MultiSale Master Leads | DROP — Monday workflow trigger | — | DROP |
| 20 | Sent | DROP — Monday workflow approval flag | — | DROP |
| 21 | Category | DANIEL_DECISION D-4 — currently DROPPED | — | DANIEL_DECISION |
| 22 | CX | DROP — handled by separate `crm_cx_surveys` import | — | DROP |

**Status-derived timestamp rules:**
- `status='confirmed' or 'attended'` → `confirmed_at = registered_at`
- `status='attended'` → `checked_in_at = registered_at`
- `purchase_amount > 0` → `purchased_at = registered_at` AND `payment_status='paid'` AND `paid_at = registered_at`
- `status='cancelled'` → `cancelled_at = registered_at`

### 4.4 Affiliates → enrichment lookup (no direct rows)

Used to backfill missing UTM fields on `crm_leads`. No new rows created.

### 4.5 Facebook ADS → `crm_facebook_campaigns` + `crm_ad_spend`

| # | Monday col | OpticUp target | Transform |
|---|---|---|---|
| 0 | שם מלא (campaign name) | `crm_facebook_campaigns.name` | trim |
| 1 | Creation Date | `crm_facebook_campaigns.first_seen_at` + `created_at` | toISOTimestamp |
| 2 | Status | `crm_facebook_campaigns.status` | lowercase (`stopped`/`paused`/`active`) |
| 3 | Event Type | `crm_facebook_campaigns.event_type` | lowercase or NULL |
| 4 | Campaign ID | `crm_facebook_campaigns.campaign_id` (UNIQUE) | trim |
| 5 | Total Spend | `crm_facebook_campaigns.total_spend` AND insert one row in `crm_ad_spend` with `spend_date = creation_date::date` and `total_spend` | parseFloat |
| 6 | Daily Budget | `crm_facebook_campaigns.daily_budget` | parseFloat |
| 7-26 | Decision Text, Revenue Num, Buyers Num, Gross Profit, CAC, Kill CAC, Scaling CAC, CPL, Leads Num, Kill/Scaling Multiplier Num, Master, Interested, Unique Buyers, Total Revenue, m.Status, Unit Economics, Gross Margin %, Scaling/Kill Multiplier | DROP — derived in OpticUp via `v_crm_campaign_performance` view | — |
| 27 | Affiliates | `crm_facebook_campaigns.master` (string list) | trim |
| 28 | Total Leads | DROP — derived | — |

**Storage of derived columns:** if Daniel wants to preserve the historical Monday-side calc snapshot, all 29 columns can be stored in `crm_facebook_campaigns.raw_data` (jsonb). Recommended.

### 4.6 CX & Ambassadors → `crm_cx_surveys`

| # | Monday col | OpticUp target | Transform |
|---|---|---|---|
| 0 | שמך המלא | DROP — name from JOIN | — |
| 1 | Created | `crm_cx_surveys.created_at` | toISOTimestamp |
| 2 | Phone Number | (FK) `attendee_id` via JOIN on `(crm_leads.phone, crm_event_attendees.event_id)` | normalizePhone |
| 3 | Email | DROP | — |
| 4 | Status | DROP — Monday workflow (`מרוצה`/etc.) | — |
| 5 | Interest | DROP | — |
| 6 | ציון כללי (general rating) | `crm_cx_surveys.rating` | star count or parseInt 1-5 |
| 7 | ציון משני (secondary rating) | DROP — no target column | — |
| 8 | משהו נוסף שחשוב שנדע? | `crm_cx_surveys.comment` | trim |
| 9 | Lead ID | DROP — Monday-internal | — |
| 10 | Event Date | DROP — derivable | — |
| 11 | Event ID | (FK contributor) `attendee_id` join uses event_id | parseInt |
| 12 | Referral link | DROP | — |
| 13 | Hebrew survey question | DROP — currently no schema target | — |
| 14 | Russian survey question | DROP — currently no schema target | — |
| 15 | Sec. SuperSale | DROP — Monday-internal | — |

**FINDING F-2:** the bilingual survey-question answers (cols 13-14) and the secondary rating (col 7) are LOST in current import. Optional fix: store all 16 cols in a JSONB on `crm_cx_surveys.raw_responses` (would need a new column). Low-priority; only 11 historical surveys.

### 4.7 Unit Economics

Hardcoded inline (4 rows, MultiSale + SuperSale × {gross_margin_pct, kill_multiplier, scaling_multiplier}). Maps to `crm_unit_economics` via UPSERT on `(tenant_id, event_type)`.

### 4.8 Entrance Scan QR — NOT IMPORTED

Day-of QR scan log; deprecated by `crm_event_attendees.checked_in_at`. 68 rows discarded.

### 4.9 Tier 3 Event Attendees — NOT IMPORTED

Per-event slice of Tier_2 + Events_Record. Already covered. 5 rows discarded.

---

## §5 Edge Cases & DANIEL_DECISION Items

### D-1 [HIGH] Orphan attendees (51 rows, events 13-21)

**The problem:** 51 attendee rows in `Events_Record` have phones that do NOT exist in Tier_2. Concentrated in early events:
```
Event 13: 18  Event 14: 7   Event 15: 5   Event 16: 9
Event 17: 4   Event 18: 6   Event 21: 2
```

These are real attendees (real purchases — they bought eyewear). But no master lead row exists.

**Why it happened:** Tier_2 was created later in the campaign lifecycle. Early events (Jan 2026) recorded attendees directly to Events_Record without creating Tier_2 master leads. Phone numbers stayed in the attendee export only.

**Options:**
- **(a) SKIP** — don't import these attendees. Lose historical data (51 attendees, ~30-40K NIS in revenue, customer relationships). Existing import script does this.
- **(b) STUB-CREATE** — auto-generate Tier_2 lead rows from the attendee phones, status `'waiting'`, name from attendee row, source `'monday_legacy_orphan'`. Preserves all historical data; some leads will lack email/UTM.
- **(c) MANUAL BACKFILL** — Daniel exports a fresh Tier_2 from Monday with these 51 phones manually added (tedious; some may be ambiguous).

**Recommendation:** **(b) STUB-CREATE.** These customers paid real money and the relationship matters. Cost: 51 stub leads with `verified_phone=false`, marked with `client_notes='Imported from Monday Events_Record archive — original master record not found'`. Easy to add a tag `legacy_orphan` for filtering.

### D-2 [MEDIUM] Optic Summery — vision-questionnaire data (8 rows)

**The problem:** 8 attendees in `Events_Record` col 14 have a long Hebrew vision-questionnaire summary (current vision solution, primary difficulty, occupation, medical background, multifocal experience, screen time, night driving). These are valuable historical answers.

**Sample data:**
```
📋 סיכום שאלון התאמה:
👓 פתרון נוכחי: משקפי מולטיפוקל
⚠️ קושי עיקרי: כל מה שמוזכר לעיל
💼 עיסוק: גמלאי
💊 רקע רפואי: לא
🔄 ניסיון מולטיפוקל: מרכיב\ה כיום - מרוצה
📱 זמן מסך: 2-5 שעות
🌙 נהיגת לילה: מסתנוור\ת מאוד
```

**Options:**
- **(a) DROP** — currently planned. Lose 8 customer profile-summaries.
- **(b) Store in `crm_event_attendees.client_notes`** — append after existing client_notes. Preserves data but blends with operational notes.
- **(c) New JSONB column** `crm_event_attendees.intake_responses jsonb` — add a column, parse Hebrew emoji-prefixed lines into structured keys. Schema change. Out of scope for this SPEC.
- **(d) Use `crm_custom_field_vals`** — EAV pattern already exists in schema. Define one custom field `attendee.intake_summary` (text). No DDL required.

**Recommendation:** **(b)** for cutover speed (no schema change), with a follow-up SPEC to migrate to **(d)** post-cutover.

### D-3 [HIGH] Message history reconstruction (152+ markers)

**The problem:** Monday does not export `crm_message_log` rows. The actual message bodies live in:
- Make scenario 0A logs (Slack-archived?)
- Gmail "Sent" folder (events@prizma-optic.co.il)
- Green API WhatsApp logs (deprecated, may not be retained)

But Monday DOES export workflow markers:
- `Tier_2 col 10 'Email Messages'` — currently shows `Sent`/blank per lead (status of welcome email)
- `Events_Record col 12 'Send Messages'` — values: `קוד קופון` (152), `הרשמה אושרה אוט'` (25), `יום לפני האירוע` (1), `*אין זמן בדיקה!*` (1)

These markers tell us "an email/SMS was sent" but not the body, channel, exact timestamp, or outcome.

**Options:**
- **(a) DROP** — accept that pre-cutover message history is lost. Future cutover-day messaging starts fresh.
- **(b) SYNTHESIZE skeleton rows** — for each marker, INSERT a `crm_message_log` row with `template_id=` (the matching template by slug), `channel='sms'`, `content='[Reconstructed from Monday Send Messages marker]'`, `status='sent'`, `created_at=registered_at` (best estimate). Counts ~152 + 25 + 1 + 1 = 179 synthetic rows.
- **(c) Hybrid:** synthesize for the high-value marker (`קוד קופון`, 152 rows = coupon-sent; ALSO set `crm_event_attendees.coupon_sent=true`, `coupon_sent_at=registered_at`). Drop the rest.

**Recommendation:** **(c) Hybrid.** The coupon-sent marker maps cleanly to an existing OpticUp boolean column AND an existing template (`coupon_code_he` template). Synthesizing the message_log row is honest: timestamp is a best-effort estimate, content is `'[migrated from Monday]'`. Customer-facing reports (which currently show "send count per lead") will roughly match Monday.

### D-4 [LOW] Category tag (`לא ידוע`/`ממומן`/`לא נמצא במאסטר`/`רישום ידני`)

**The problem:** Tier_2 col 16 + Events_Record col 21 have a "Category" tag with 4 distinct values across the two boards. Per-XLSX distribution in `enum-mapping-table.md §10`.

**Options:**
- **(a) DROP** — currently planned. ~80 leads/attendees lose their tag.
- **(b) Map to `crm_lead_tags`** — create 4 entries in `crm_tags`, INSERT lead/tag pairs. Adds ~80 `crm_lead_tags` rows.

**Recommendation:** **(a) DROP for cutover.** The values are mostly Monday-internal (`לא ידוע` = "unknown" is meaningless). If Daniel later wants to filter by `ממומן` ("paid lead") he can re-tag manually post-cutover.

### D-5 [HIGH — blocker] Multisale campaign reference

**The problem:** 8 of 11 events have `Interests='MultiSale'`, but the prizma tenant currently has **only the `supersale` campaign**. Wiring 8 events to a non-existent `multisale` campaign breaks the FK.

**Options:**
- **(a) Map all events to `supersale` campaign** — wrong; conflates two product lines, breaks reporting.
- **(b) Create `multisale` campaign before migration** — clean fix. Adds 1 row to `crm_campaigns` (slug=`multisale`, name=`MultiSale`). Daniel approves.
- **(c) Skip MultiSale events entirely** — don't import 8 of 11 events. Loses 90+ attendees and ~200K revenue.

**Recommendation:** **(b) CREATE `multisale` campaign.** This is a tiny pre-migration step. The campaign metadata (default location, hours, capacity, fee, cancellation hours) can mirror `supersale`'s defaults.

### D-6 [LOW] Eye Exam at lead level

**The problem:** Tier_2 col 11 has Eye Exam answer per lead (587 yes/no). Currently DROPPED. The Events_Record col 17 has the per-event answer (more accurate for operational use).

**Options:**
- **(a) DROP** (current).
- **(b) Add `crm_leads.eye_exam_default text` column.**

**Recommendation:** **(a) DROP.** Per-event answer is what matters operationally.

### D-7 [LOW] Tier_2 invalid-phone rows (rows 222 + 710)

**The problem:** 2 leads have phones with weird format (12-13 digits) — likely Excel cell-format corruption. Both have valid names and emails.

**Options:**
- **(a) SKIP** (current import script).
- **(b) FIXUP** — strip leading `972` if 12-digit, normalize, import.

**Recommendation:** **(b) FIXUP** — these are real customers. Add to migration script's normalize-phone fallback rule.

---

## §6 Customer Spending History

### 6.1 The architecture decision

**OpticUp does NOT store per-customer spending totals.** It computes them on demand from `crm_event_attendees`:

```sql
-- Per-customer total spend (canonical query)
SELECT lead_id, SUM(purchase_amount) AS total_spent
FROM crm_event_attendees
WHERE tenant_id = 'prizma-uuid'
  AND purchase_amount IS NOT NULL
GROUP BY lead_id;
```

**Why this is correct:** purchase totals can never drift from source-of-truth attendee rows. A formula column (like Monday's `Total Revenue`) decays over time as attendee data updates.

### 6.2 What survives migration

Every `crm_event_attendees.purchase_amount` value preserved 1:1 from `Events_Record.col 8 Purchase Amount`. The 65 paid-attendee rows preserve:
- Which lead bought (via `lead_id` FK)
- Which event (via `event_id` FK)
- How much (`purchase_amount`)
- When (`registered_at` ≈ `purchased_at`)

Aggregations (`v_crm_campaign_performance`, `v_crm_lead_event_history` views) recompute on the fly.

### 6.3 What does NOT survive

Tier_2 col 13 `Total Revenue` (148,990 NIS sum across 53 leads) is **dropped**. It conflicts with the canonical sum from attendees (279,640 NIS across 65 paid attendees). The drift is 47% — Tier_2 column is a stale/broken Monday formula.

**Why the drift exists (hypothesis):** Tier_2's Total Revenue likely only counted "confirmed purchase" workflow events, missing later-imported attendee rows or rows whose status changed without re-firing the formula. Monday formulas are fragile across board structure changes.

### 6.4 Top customers (for Daniel's spot-check during cutover verification)

Top 10 paying customers by purchase_amount (from canonical Events_Record source):

```sql
-- Run after migration to verify top customers:
SELECT l.full_name, l.phone, SUM(a.purchase_amount) AS total
FROM crm_leads l
JOIN crm_event_attendees a ON a.lead_id = l.id
WHERE l.tenant_id = 'prizma-uuid' AND a.purchase_amount > 0
GROUP BY l.id, l.full_name, l.phone
ORDER BY total DESC LIMIT 10;
```

Cross-reference: total revenue post-migration = SUM(purchase_amount) ≈ 279,640 NIS across 65 paid attendees and 47 distinct paying leads.

### 6.5 Multi-event spending (the relationship asset)

18 leads attended 2+ events. These are the high-value repeat customers. Migration preserves all their attendee rows, so multi-event purchase histories are intact.

---

## §7 Message History

### 7.1 What lives in OpticUp's `crm_message_log`

Schema: `(id, tenant_id, lead_id, event_id, template_id, broadcast_id, channel, content, status, external_id, error_message, created_at, run_id)`. One row per outbound message.

### 7.2 What Monday exports

**Almost nothing.** No `crm_message_log` equivalent in any XLSX export. Monday's message history is held in:
- Make scenario logs (operational, not exported here)
- Gmail "Sent" folder
- WhatsApp Green API logs (deprecated)
- SMS provider logs (Global SMS — also operational)

### 7.3 What we can reconstruct

| Marker | Source | Count | What it tells us | Reconstruction value |
|---|---|---:|---|---|
| `Tier_2.Email Messages` | col 10 | (unknown — needs separate count) | Welcome email was sent | LOW (single welcome email per lead) |
| `Events_Record.Send Messages='קוד קופון'` | col 12 | 152 | Coupon-code SMS was sent | **HIGH — see D-3** |
| `Events_Record.Send Messages='הרשמה אושרה אוט'` | col 12 | 25 | Auto-confirmation SMS was sent | MEDIUM |
| `Events_Record.Send Messages='יום לפני האירוע'` | col 12 | 1 | Day-before reminder | LOW (one row) |
| Per-event SMS waves | not exported | unknown | Reminder waves before each event | LOST — accept gap |

### 7.4 Recommended reconstruction (per D-3 option (c))

For each `Events_Record` row with `Send Messages='קוד קופון'`:
1. Set `crm_event_attendees.coupon_sent = true`, `coupon_sent_at = registered_at`
2. INSERT `crm_message_log` row with `template_id=(SELECT id FROM crm_message_templates WHERE slug='coupon_code' AND tenant_id='prizma' LIMIT 1)`, `channel='sms'`, `content='[migrated-marker:coupon_code]'`, `status='sent'`, `created_at=registered_at`

Result: 152 synthetic message_log rows, plus the operational-truthful boolean on the attendee row.

For the 25 auto-confirmation markers and 1 day-before marker: optional, marginal value. Recommend SKIP for cutover.

### 7.5 Post-cutover message history

From cutover onwards, every send-message Edge Function call writes a real `crm_message_log` row with full content + provenance. The pre-cutover gap is fixed permanently.

---

## §8 Make.com Integration Touchpoints

19 active Make scenarios touch Monday boards. Each has a cutover decision:

| # | Name | Modules | Monday boards used | Cutover action | Why |
|---|---|---:|---|---|---|
| 0A | Automations הודעות משלימות | 43 | T2 (read+write), Events Mgmt (read) | **DISABLE** | Replaced by `crm-automation-engine.js` (P8) |
| 0B | Attendees Acceptance | 9 | Events Mgmt, Events Record | **DISABLE** | Replaced by `event-register` EF + `crm_event_attendees` |
| 1A-S | SuperSale T&C ראשוני | 23 | Tier 1 | **DISABLE** | Replaced by `lead-intake` EF (P5_7) |
| 1A-M | MultiSale T&C ראשוני | 47 | Tier 1 (MultiSale) | **DISABLE** | Same as 1A-S, MultiSale variant |
| 1B | Send Emails / Register Master | 34 | T1 (read), T2 (write) | **DISABLE** | Replaced by `lead-intake` EF + `send-message` EF |
| 1WA | WhatsApp incoming | 78 | T2 (read+write) | **LEAVE AS-IS for now** | WhatsApp 2-way still goes via Make → Green API. Switch to Meta Cloud API in ~3 months (M4 future SPEC). |
| 2 | רישום משתתפים לאירוע | 2 | T2, Tier 3, Events Record | **DISABLE** | Replaced by `event-register` EF |
| 4 | מספור האירוע | 3 | Events Mgmt | **DISABLE** | Replaced by `next_crm_event_number` RPC |
| 5A | פתיחת אירוע | 69 | T2, Events Mgmt | **DISABLE** | Replaced by event-status automation (P5.5 dispatchEventStatusMessages) |
| 6 | ניהול נרשמי האירוע (223 modules!) | 223 | T2, Tier 3, Events Mgmt, Events Record | **DISABLE** | Replaced by event-attendees engine + status automation |
| 7 | אישורי תקנון לנרשמים שלא אישרו | 20 | T2, Tier 3 | **DISABLE** | Replaced by automation rule on attendee status |
| 8 | הודעות תזכורת לאירוע | 59 | T2, Tier 3, Events Mgmt | **DISABLE** | Scheduler-based reminders (deferred to post-cutover SPEC); meanwhile manual `Toast.broadcast` |
| 9 | סריקה בכניסה | 17 | Entrance, T2 | **DISABLE** | Replaced by `crm-event-day-checkin.js` UI |
| 10A | Entrance סטטוס פעולות סיום | 16 | Entrance, T2 | **DISABLE** | Replaced by `crm-event-day-manage.js` UI |
| 10B | סיום תהליך + CX | 12 | T2, Events Mgmt, CX board | **DISABLE** | Replaced by CX survey UI + `crm_cx_surveys` table (post-cutover SPEC for survey link wiring) |
| FB1 | Facebook ADS Insights | 1 | FB ADS board | **REWIRE** | Already replaced by `facebook-campaigns-sync` EF (M4_CAMPAIGNS sequence). This Make scenario is the iteration runner — leave on. |
| FB2 | Facebook ADS יצירת מודעות | — | FB ADS board | **DISABLE** (or LEAVE — not in active use anyway) | One-shot creation flow |
| FB3 | Facebook ADS ניקוי לא פעילות | — | FB ADS board | **DISABLE** | One-shot cleanup |
| UN | Unsubscribe email | 16 | T2 | **DISABLE** | Replaced by `unsubscribed_at` column + future `/unsubscribe` endpoint SPEC |
| 9104395 | send-message webhook | 4 | none — Webhook→Router→SMS+Gmail | **LEAVE — this is the new pipe** | Final architecture (P3c+P4) |
| 9126542 | facebook-campaigns iterator | 3 | none — calls EF | **LEAVE** | M4_CAMPAIGNS_V3 |

**Cutover sequence:**
1. Day -1: confirm 9104395 (send-message) and 9126542 (FB sync) running. Don't touch.
2. Day 0 H+0 (after data migration verified): disable scenarios 1A-S, 1A-M, 1B (lead intake) FIRST so no new Monday writes during the storefront-form rewire.
3. Day 0 H+1 (after storefront rewire): disable scenarios 0A, 0B, 2, 4, 5A, 6, 7, 8, 9, 10A, 10B (event lifecycle).
4. Day 0 H+2 (after smoke test): disable 1WA optionally, or leave for WhatsApp continuity until Meta Cloud API SPEC.
5. Week +1: archive disabled scenarios (Make folder "ARCHIVE — Pre-Cutover Monday Era 2026-05") for safekeeping.

**Daniel: do not delete any Make scenario for at least 30 days post-cutover.** Rollback would require re-enabling the Monday data pipeline.

---

## §9 Migration Script Blueprint

### 9.1 Recommended location

`campaigns/supersale/scripts/migrate-monday-to-optic-up.mjs` (new file; existing
`import-monday-data.mjs` becomes the import-from-XLSX library it depends on).

### 9.2 Inputs

```js
const config = {
  tenantSlug: 'prizma',
  campaignSlugMap: { 'SuperSale': 'supersale', 'MultiSale': 'multisale' }, // requires D-5
  exportsDir: 'campaigns/supersale/exports/',
  reExportFreshnessDays: 14,
  dryRun: process.env.DRY_RUN === '1',         // outputs SQL files only, no DB writes
  applyDecisions: { D1: 'b', D2: 'b', D3: 'c', D4: 'a', D5: 'b', D6: 'a', D7: 'b' },  // populated by Daniel before run
};
```

### 9.3 Order of operations

```
1. PRE-FLIGHT
   - Verify exports dir freshness (mtime within reExportFreshnessDays)
   - Verify Supabase connectivity + role permissions
   - Snapshot current row counts per crm_* table (for rollback diff)
   - Verify Daniel-decision config is populated (no placeholders)
   - If applyDecisions.D5='b': INSERT INTO crm_campaigns (...) VALUES ('multisale', ...) ON CONFLICT DO NOTHING

2. DEMO-DATA WIPE (interactive — Daniel confirms)
   - DELETE FROM crm_event_attendees WHERE tenant_id='prizma' (cascade)
   - DELETE FROM crm_lead_notes WHERE tenant_id='prizma'
   - DELETE FROM crm_message_log WHERE tenant_id='prizma'
   - DELETE FROM crm_events WHERE tenant_id='prizma'
   - DELETE FROM crm_leads WHERE tenant_id='prizma'
   - DELETE FROM crm_unsubscribes WHERE tenant_id='prizma'
   - VERIFY all 6 tables now have 0 prizma rows
   - DO NOT touch crm_campaigns / crm_statuses / crm_message_templates / crm_automation_rules

3. LOAD AND PARSE
   - Open each XLSX, extract data rows, drop banner/header-re-emission rows
   - Build phone→lead-id map (skipped during this step; built progressively as leads are inserted)

4. IMPORT EVENTS
   - For each row in Events_Management:
     - resolve campaign_id via campaignSlugMap
     - INSERT crm_events ... ON CONFLICT (tenant_id, event_number) DO NOTHING
   - Result: 11 rows
   - Build event_number→event_id map

5. IMPORT LEADS (Tier_2)
   - For each valid Tier_2 row (filter out 7 noise rows):
     - normalize phone (E.164)
     - apply Tier_2 → crm_leads transform per §4.1
     - INSERT crm_leads ... ON CONFLICT (tenant_id, phone) WHERE is_deleted=false DO NOTHING
   - For each lead with status='unsubscribed': INSERT crm_unsubscribes
   - Affiliates UTM enrichment: UPDATE crm_leads SET utm_*=COALESCE(...) WHERE phone IN (...)
   - Result: 893 leads, 50 unsubscribes
   - Build phone→lead_id map

6. IMPORT ORPHAN-ATTENDEE STUB LEADS (per D-1 = b)
   - For each Events_Record row with phone NOT IN crm_leads:
     - INSERT crm_leads (full_name from attendee row, phone, status='waiting', source='monday_legacy_orphan',
        client_notes='Imported from Monday Events_Record archive — original master record not found',
        verified_phone=false)
   - Result: 51 stub leads

7. IMPORT ATTENDEES (Events_Record)
   - For each row in Events_Record (filter out 1 totals row + 21 dups + 1 blank-status):
     - resolve lead_id via phone-map (now includes orphan stubs)
     - resolve event_id via event_number-map
     - apply Events_Record → crm_event_attendees transform per §4.3
     - status-derived timestamps
     - if Send Messages='קוד קופון': set coupon_sent=true, coupon_sent_at=registered_at (per D-3)
     - if Optic Summery non-empty (per D-2 = b): append to client_notes
     - INSERT crm_event_attendees ... ON CONFLICT (tenant_id, lead_id, event_id) DO NOTHING
   - Result: ~191 + 51 (orphan stubs reconciled) = ~212 - dups = ~191 rows actually inserted (ON CONFLICT swallows dups)

8. IMPORT LEAD NOTES (Tier_2 col 7)
   - For each Tier_2 row with non-empty Notes:
     - prepend the migration banner
     - INSERT crm_lead_notes (lead_id, content, employee_id=NULL)
   - Result: 695 notes

9. SYNTHESIZE COUPON MESSAGE LOG (per D-3 = c)
   - For each attendee with coupon_sent=true:
     - INSERT crm_message_log (lead_id, event_id, template_id=coupon_code template,
        channel='sms', content='[migrated-marker:coupon_code]', status='sent', created_at=registered_at)
   - Result: 152 synthetic message_log rows

10. IMPORT FACEBOOK CAMPAIGNS
    - For each FB ADS row: UPSERT crm_facebook_campaigns ... ON CONFLICT (tenant_id, campaign_id) DO UPDATE
    - INSERT crm_ad_spend rows for non-zero total_spend
    - Result: 88 fb_campaigns + N ad_spend rows

11. IMPORT CX SURVEYS
    - For each CX row: resolve attendee_id via (phone, event_id) JOIN
    - INSERT crm_cx_surveys
    - Result: 11 surveys (or fewer if some phone/event combos don't resolve)

12. IMPORT UNIT ECONOMICS
    - UPSERT 4 rows per (tenant_id, event_type)

13. WRITE crm_audit_log ENTRY
    - One row per entity_type with row counts + source filename + script version
    - This is the migration's own audit trail

14. RUN VERIFICATION QUERIES (§10) — STOP IF ANY FAIL

15. WRITE migration-report.json
    - Final counts vs expected
    - List of skipped rows (with reasons)
    - List of synthesized rows (with reasons)
    - Daniel-decision values applied
    - Run timestamp + duration
```

### 9.4 Idempotency strategy

- Every INSERT uses `ON CONFLICT DO NOTHING` (or `DO UPDATE` for FB campaigns where re-snapshot is desired)
- Phone-map and event-map are rebuilt per run from the live DB (not from the XLSX)
- If re-run after partial failure: only missing rows are inserted; nothing deleted
- The wipe step (step 2) is interactive — Daniel confirms once. Re-runs after step 2 can resume safely from step 4

### 9.5 Rollback approach

**Soft rollback (preferred):** transactional batch — wrap the entire `BEGIN ... COMMIT` in a single Postgres transaction; on any verification failure, `ROLLBACK`. Live DB returns to pre-step-3 state.

**Hard rollback (if soft fails):** snapshot strategy:
- Pre-migration: take Supabase point-in-time-recovery (PITR) snapshot. Daniel triggers via dashboard.
- If post-migration rollback needed: restore PITR to pre-migration timestamp.
- Cost: 2-5 minutes downtime; loses any cutover-day inserts that happened post-migration.

**Recommendation:** soft rollback in the script + PITR snapshot before the script starts, as a safety net.

### 9.6 Outputs

- `migration-report.json` — counts, durations, decisions applied
- `migration-skipped-rows.csv` — every skipped XLSX row with reason
- `migration-synthesized.json` — every synthetic message_log + stub-lead row with provenance
- `migration-log.txt` — chronological execution log
- `_sql/*.sql` (in dry-run mode only) — the SQL the script *would* execute

---

## §10 Verification Queries

Run **before** migration (baseline) and **after** migration (parity). Every post-migration query must return the expected value or the migration is rolled back.

```sql
-- Q1: Lead count parity
-- Expected pre: 11 (Daniel QA), Expected post: 893 + 51 orphan stubs = 944 (per D-1=b)
SELECT count(*) FROM crm_leads WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_deleted=false;

-- Q2: Event count parity
-- Expected pre: 2, post: 11 (Events_Management 12 raw - 1 banner)
SELECT count(*) FROM crm_events WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_deleted=false;

-- Q3: Attendee count parity (allow 21 dups → ON CONFLICT swallowed)
-- Expected pre: 2, post: 191 (212 raw - 21 dups)
SELECT count(*) FROM crm_event_attendees WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_deleted=false;

-- Q4: FK integrity — zero orphan attendees
-- Expected: 0
SELECT count(*) FROM crm_event_attendees a
LEFT JOIN crm_leads l ON l.id = a.lead_id
LEFT JOIN crm_events e ON e.id = a.event_id
WHERE a.tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND (l.id IS NULL OR e.id IS NULL);

-- Q5: Total revenue from attendees (canonical — must match Monday Events_Record sum 279,640)
-- Tolerance: ±0 NIS
SELECT SUM(purchase_amount)::numeric AS total
FROM crm_event_attendees
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND purchase_amount > 0;

-- Q6: Paid attendee count (must = 65)
SELECT count(*) FROM crm_event_attendees
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND purchase_amount > 0;

-- Q7: Distinct paying customers (top 10 spot-check for Daniel)
SELECT l.full_name, l.phone, SUM(a.purchase_amount) AS total
FROM crm_leads l
JOIN crm_event_attendees a ON a.lead_id = l.id
WHERE l.tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND a.purchase_amount > 0
GROUP BY l.id, l.full_name, l.phone
ORDER BY total DESC LIMIT 10;

-- Q8: Lead-status distribution (must match Monday distribution 841/50/2/2)
SELECT status, count(*)
FROM crm_leads
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_deleted=false
GROUP BY status
ORDER BY 2 DESC;

-- Q9: Unsubscribed-leads have crm_unsubscribes row (must match: 50 statuses ↔ 50 rows)
SELECT
  (SELECT count(*) FROM crm_leads WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND status='unsubscribed') AS leads_unsub,
  (SELECT count(*) FROM crm_unsubscribes WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c') AS unsubs_table;

-- Q10: Multi-event leads (must = 18)
SELECT count(*) FROM (
  SELECT lead_id, count(DISTINCT event_id) ne
  FROM crm_event_attendees
  WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  GROUP BY lead_id HAVING count(DISTINCT event_id) > 1
) m;

-- Q11: Duplicate-phone check (must = 0 — UNIQUE INDEX guarantees, but assert)
SELECT phone, count(*) FROM crm_leads
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND is_deleted=false
GROUP BY phone HAVING count(*) > 1;

-- Q12: Status enum coverage — every value used must exist in crm_statuses
SELECT DISTINCT a.status, s.slug FROM crm_event_attendees a
LEFT JOIN crm_statuses s ON s.tenant_id=a.tenant_id AND s.entity_type='attendee' AND s.slug=a.status
WHERE a.tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
HAVING s.slug IS NULL;
-- Expected: 0 rows

-- Q13: Lead notes count (must = 695)
SELECT count(*) FROM crm_lead_notes WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Q14: Synthetic coupon message_log (must = 152 if D-3=c)
SELECT count(*) FROM crm_message_log
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND content = '[migrated-marker:coupon_code]';

-- Q15: FB campaigns count (must = 88)
SELECT count(*) FROM crm_facebook_campaigns
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Q16: CX surveys count (must = 11, or N if some phone joins fail)
SELECT count(*) FROM crm_cx_surveys
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

-- Q17: Audit log entry — one per migrated entity type
SELECT entity_type, count(*), MAX(created_at) FROM crm_audit_log
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND action='migration_import'
GROUP BY entity_type;
-- Expected: 7-8 entity types (lead, event, attendee, lead_note, fb_campaign, cx_survey, ad_spend, unsubscribe)
```

---

## §11 Risk Register

| # | Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | Orphan-attendee data lost (51 attendees) | HIGH | If D-1=a (skip): certain | D-1 → option (b) STUB-CREATE preserves all rows | Daniel decision |
| R-2 | Total revenue drift between Monday and OpticUp | HIGH | If Daniel relies on Monday's 149K total | Document the canonical 279,640 NIS BEFORE cutover; Daniel re-aligns mental model | This MAP §6 |
| R-3 | Pre-cutover message history loss | MEDIUM | Certain if D-3=a (drop) | D-3 → option (c) recovers 152 high-value coupon-send rows + sets `coupon_sent=true` boolean | Daniel decision |
| R-4 | MultiSale events break FK | CRITICAL | Certain if D-5≠b | D-5 → create `multisale` campaign as PRE-step (1 row INSERT) | Daniel pre-cutover |
| R-5 | Partial-failure mid-migration leaves DB in inconsistent state | HIGH | Low (script is transactional) | Soft rollback (BEGIN/ROLLBACK) + PITR snapshot pre-run as backup | Migration script |
| R-6 | Phone-normalization edge cases (rows 222, 710) drop real customers | MEDIUM | If D-7=a (skip) | D-7 → option (b) FIXUP recovers these 2 rows | Migration script |
| R-7 | Daniel's manual QA test data (11 leads on prizma) accidentally preserved or mixed with migrated data | HIGH | If wipe step skipped | Step 2 is mandatory + verification queries enforce | Daniel + script |
| R-8 | Make.com scenario 1A-S still posting to Monday post-cutover (race condition with form rewire) | HIGH | If P5_7 storefront-form rewire not deployed before disabling 1A-S | Coordinate cutover sequence: deploy form rewire FIRST (lead-intake EF), then disable Make 1A-S | P5_7 SPEC + cutover playbook |
| R-9 | XLSX exports stale (>14 days) leading to data drift | LOW | Currently exports are 11 days old | Pre-flight check rejects >14-day-old; Daniel re-exports if needed | Pre-flight script |
| R-10 | Optic Summery vision data (8 rows) lost | LOW | If D-2=a (drop) | D-2 → option (b) appends to `client_notes`; no schema change | Daniel decision |
| R-11 | Schema drift in parity-doc (claims columns that don't exist on `crm_ad_spend`) misleads operator | LOW | Doc-only; not a runtime issue | This MAP §4.5 documents real schema; FINDINGS.md F-1 logs the parity-doc drift | This MAP |
| R-12 | Russian-language leads exist in Monday but blank in current export | LOW | Current data shows 0 ru leads | Schema supports `ru` already; nothing to do | n/a |
| R-13 | Tier 1 board has unprocessed leads at cutover that never made it to Tier 2 | MEDIUM | Some pending leads on Tier 1 may exist | Daniel reviews Tier 1 manually pre-cutover; either approves them into Tier 2 or accepts loss | Daniel pre-cutover |
| R-14 | Storefront form posts to old Monday URL during cutover window | HIGH | Window between disabling Make and DNS propagation | Cutover sequence (§14) sequences DNS LAST and storefront-form-rewire FIRST | Cutover playbook |
| R-15 | Daniel runs migration on demo by mistake | CRITICAL | Always possible | Script's first action is `tenant_slug='prizma'` hard assertion + Daniel's PIN-confirm prompt | Migration script |
| R-16 | RLS policy denies migration script writes (service_role bypass missing) | MEDIUM | Should be configured | Pre-flight checks `service_role` connection writes a test row to a scratch table and rolls back | Pre-flight |

---

## §12 What Daniel Needs To Do

### Pre-cutover (anytime in next 1-3 days)

| # | Action | Estimated time | Notes |
|---|---|---|---|
| 1 | Read this MAP top-to-bottom | 30 min | Especially §1, §5, §11 |
| 2 | Resolve all 7 DANIEL_DECISION items in §5 (D-1 through D-7) | 20 min | Mark choices in `migration-decisions.json` |
| 3 | Create the `multisale` campaign on prizma if D-5=b | 2 min | Daniel runs the SQL or asks executor |
| 4 | Generate Monday API token (optional, for live re-pull) | 5 min | Only needed if D-1 = (c) manual backfill |
| 5 | Re-export all 9 Monday boards to `campaigns/supersale/exports/` | 10 min | Only if current 11-day-old data drifts; OR cutover delays past 14-day threshold |
| 6 | Review Tier 1 (Incoming Leads, board 5088674481) for any pending T&C-approval leads | 15 min | Decide: chase them on Monday before cutover or accept loss |
| 7 | Take Supabase PITR snapshot of production (`prizma`) | 2 min | Daniel triggers via Supabase dashboard |
| 8 | Schedule cutover window (Sat/Sun, 2-hour minimum) | n/a | Daniel picks timing |

### Cutover-day (Saturday or Sunday, 2-hour window)

| # | Action | Estimated time | Notes |
|---|---|---|---|
| C-1 | Verify P5_7 storefront-form rewire is deployed and active | 5 min | Test by submitting a fake lead with Daniel's whitelisted phone |
| C-2 | Verify P5_6 bot protection is deployed | 5 min | Optional but recommended |
| C-3 | Run migration script `--dry-run` on local | 5 min | Should produce `_sql/*.sql` files matching spec |
| C-4 | Confirm DANIEL_DECISIONs file populated | 1 min | `cat migration-decisions.json` |
| C-5 | Run wipe step interactively, confirm prompt | 2 min | Removes Daniel's QA test data |
| C-6 | Run migration script in live mode, monitor log | 5 min | Should complete in < 90 seconds for the inserts |
| C-7 | Run all 17 verification queries (§10) | 10 min | Every one must match expected; if any fails: ROLLBACK |
| C-8 | Spot-check top-10 customers (Q7) — name+phone+spending matches Daniel's mental model | 10 min | Daniel scrolls a sample |
| C-9 | Sign off: paste verification query results into HANDOFF doc | 5 min | Recorded in `cutover-handoff.md` |
| C-10 | Disable Make scenarios per §8 sequence | 15 min | One at a time, with screenshot of "stopped" state |
| C-11 | Smoke-test: register a real lead via storefront → see in OpticUp | 10 min | End-to-end test with whitelisted phone |
| C-12 | Smoke-test: trigger one event status change → SMS arrives | 5 min | Confirms send-message EF + Make webhook still alive |
| C-13 | Tag git: `git tag v-cutover-2026-MM-DD -m "Production cutover"` | 1 min | |
| C-14 | Optional: monitor for 60 minutes for any unexpected behavior | 60 min | Daniel watches Toast notifications + storefront submissions |

**Total cutover-day time: ~2 hours active + 1 hour passive monitoring.**

---

## §13 Ready-to-Execute Gate

The migration may NOT proceed until ALL of these are checked:

- [ ] Daniel has read this MAP §1, §5, §11, §12
- [ ] All 7 DANIEL_DECISION items resolved and recorded in `migration-decisions.json`
- [ ] Migration script (`migrate-monday-to-optic-up.mjs`) implemented per §9 blueprint
- [ ] Migration script tested end-to-end on Supabase branch / scratch DB with full XLSX data — all 17 verification queries pass
- [ ] P5_7 storefront-form rewire deployed and verified (lead-intake EF accepting submissions)
- [ ] P5_6 bot protection deployed (recommended but not required)
- [ ] Monday XLSX exports under `campaigns/supersale/exports/` are < 14 days old (currently 11 days — refresh if cutover is more than 3 days from now)
- [ ] Supabase PITR snapshot taken < 30 minutes before script run
- [ ] Daniel has scheduled 2+ hour cutover window on Sat or Sun
- [ ] Make.com scenario 1A-S, 1B verified to be **disabled** at cutover-day H+0 (or scheduled for immediate disable post-data-migration)
- [ ] Tier 1 (Incoming Leads, board 5088674481) reviewed for pending leads — Daniel made decision (chase or accept loss)
- [ ] If D-5=b: `multisale` campaign INSERT pre-staged in pre-migration step
- [ ] All FOREMAN_REVIEW.md proposals from latest 3 Module 4 SPECs harvested into the migration-script implementation SPEC

When every box is checked: cutover may begin. **The cutover is one-shot — plan accordingly.**

---

## §14 Cutover-Day Timeline (Hour-by-Hour)

This is a target schedule for a Saturday cutover starting at 09:00 Israel time:

```
T-7d (Sun before cutover Sat):
  Daniel: read MAP, resolve D-1..D-7, write migration-decisions.json
  Executor (in a separate SPEC): implement migrate-monday-to-optic-up.mjs

T-3d (Wed):
  Executor: dry-run migration on Supabase branch / scratch DB; verify Q1-Q17 pass
  Daniel: review report, sign off on script
  Executor: deploy P5_7 storefront-form rewire to develop, smoke test

T-1d (Fri evening):
  Daniel: take Supabase PITR snapshot of prizma
  Daniel: re-export Monday XLSX (if cutover > 14 days from last export)
  Daniel: review Tier 1 incoming leads; chase any pending or note them as accepted loss
  Daniel: verify P5_7 + P5_6 deployed to main (production)

T-0 (Sat morning):

09:00  Daniel: open MAP §13 checklist, verify all boxes checked
09:05  Executor (Daniel session): run migration script --dry-run, sanity-check output
09:10  Daniel: confirm migration-decisions.json contents
09:15  Executor: run migration script in live mode (--dry-run=false)
       - Phase 1 PRE-FLIGHT: 30 sec
       - Phase 2 WIPE: 30 sec (interactive confirm)
       - Phase 3 LOAD: 5 sec
       - Phase 4 EVENTS: 5 sec
       - Phase 5 LEADS: 30 sec
       - Phase 6 ORPHANS: 5 sec
       - Phase 7 ATTENDEES: 15 sec
       - Phase 8 LEAD NOTES: 20 sec
       - Phase 9 MESSAGE LOG SYNTH: 10 sec
       - Phase 10 FB CAMPAIGNS: 5 sec
       - Phase 11 CX SURVEYS: 2 sec
       - Phase 12 UNIT ECON: 1 sec
       - Phase 13 AUDIT LOG: 1 sec
       - Phase 14 VERIFICATION: 30 sec
       - Total: ~3 minutes
09:20  Verification queries — pass / fail
09:25  Daniel: spot-check top 10 customers (Q7), 5 random leads, 2 events, all 11 events present
09:35  Daniel signs off in cutover-handoff.md with paste of Q1-Q17 results
09:40  Disable Make scenarios in §8 sequence (15 min)
09:55  Executor: smoke-test storefront form submission (whitelisted phone)
10:00  Executor: smoke-test event status change → SMS dispatch
10:10  Daniel: validate Tier 2 board view, Events board view, attendees view in OpticUp UI
10:30  Cutover declared SUCCESS (or rollback initiated — see §9.5)
10:30-12:00 Passive monitoring window: Daniel watches Toasts + storefront submissions
12:00  Cutover sign-off in MODULE_4 SESSION_CONTEXT.md

T+1d (Sun): begin retrospective
T+7d: archive disabled Make scenarios into "ARCHIVE — Pre-Cutover Monday Era"
T+30d: final cleanup of disabled Make scenarios (per Daniel's call)
```

**Rollback timing budget:** if at 09:35 verification fails AND soft rollback fails, Daniel triggers PITR restore. Restore takes 5-10 min. Storefront form continues to write to lead-intake EF (but with no historical leads). Daniel decides whether to retry migration immediately or postpone.

---

## §15 Post-Cutover Follow-Ups

Items NOT in scope for the migration itself but tracked here for handoff:

1. **Optic Summery EAV migration** (D-2 follow-up) — once schema-touching work is OK post-cutover, move the 8 vision-questionnaire summaries from `client_notes` into `crm_custom_field_vals` rows. Estimated: 1 SPEC, 2 hours.
2. **Tier 1 leads workflow** — if Daniel decided to chase Tier 1 pending leads, integrate them via lead-intake EF or manual SQL bulk insert.
3. **Make scenario archival** — at T+30d, move disabled scenarios to ARCHIVE folder. Document the new architecture in `make/ARCHIVE_NOTES.md`.
4. **Schema documentation drift** — update `MONDAY_TO_OPTIC_UP_PARITY.md` to reflect actual `crm_ad_spend` schema (FINDING F-1).
5. **WhatsApp 2-way migration** — Make scenario 1WA stays active for ~3 months until Meta Cloud API integration.
6. **Reporting view alignment** — if Daniel's existing dashboard reports use Tier_2 Total Revenue numbers, update them to use `v_crm_campaign_performance` or the canonical attendees-sum query (§6.4).
7. **Russian-language flag** — when first ru lead arrives post-cutover, verify lead-intake EF correctly sets `language='ru'`.
8. **Sentinel coverage** — add a Sentinel mission to monitor `crm_message_log` row growth post-cutover (anomaly detection for send-pipeline failures).

---

## Appendix A: Source-data freshness check

```bash
ls -lt campaigns/supersale/exports/*.xlsx | head -1
# Newest: Tier_2_Master_Board_1776697136.xlsx — 2026-04-21
# Today: 2026-05-02
# Age: 11 days. Within 14-day tolerance.
```

If cutover happens after 2026-05-05, re-export Monday boards via Daniel's Monday account (Tier 2, Events Mgmt, Events Record, Affiliates, FB ADS, CX, Unit Economics, Tier_3, Entrance Scan QR — though latter 2 are not imported, export for completeness).

## Appendix B: Companion files

- `migration-discovery/volume-counts.json` — machine-readable counts for cross-reference
- `migration-discovery/enum-mapping-table.md` — every Monday enum source value paired with OpticUp slug
- `migration-discovery/skipped-rows-preview.csv` — sample edge-case rows the script will skip with reasons

## Appendix C: Glossary

- **Tier 1 (Incoming Leads):** Monday board where raw form submissions land before T&C approval. Not exported, not migrated.
- **Tier 2 (Master Board):** Monday board where all approved leads live. The CRM lifecycle home.
- **Tier 3 (Event Attendees):** Monday board for the *current* event's attendees only — flushes to Events Record after each event closes.
- **Events Management:** Monday board with one row per event.
- **Events Record:** Monday board with permanent attendee history (the archive).
- **Affiliates:** Monday board with referrer / UTM lookup data.
- **FB ADS:** Monday board with ad campaign metadata + daily spend.
- **CX & Ambassadors:** Monday board with post-event satisfaction surveys.
- **Make.com:** automation platform glueing Monday + Gmail + WhatsApp + SMS provider together. 19 active scenarios, ~830+ modules total.
- **Iron Rule:** numbered project rule from `CLAUDE.md` (e.g., Rule 14 = tenant_id on every table).

---

*End of MONDAY_MIGRATION_MAP.md.*
*Generated 2026-05-02 by opticup-executor (MONDAY_MIGRATION_DISCOVERY SPEC).*
*Next review: Daniel + Architect chat on develop, before any migration script implementation.*
