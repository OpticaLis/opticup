# SPEC — CRM_PHASE_B2_DATA_IMPORT

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B2_DATA_IMPORT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-20
> **Module:** 4 — CRM
> **Phase:** B2 (Data Import)
> **Author signature:** Cowork strategic session, Daniel present
> **Execution target:** Claude Code on Windows desktop (NOT Cowork)

---

## 1. Goal

Import all Monday.com data into the CRM Supabase tables — leads, events,
attendees, notes, ad spend, CX surveys — using the column mappings and
transformation rules from the Phase B1 Data Discovery Report. At the end
of this SPEC, the CRM database contains all historical campaign data and
the Monday boards can be considered the secondary copy.

---

## 2. Background & Motivation

Phase A created the schema (23 tables, 7 Views, 8 RPCs, 46 RLS policies).
Phase B1 analyzed all 9 Monday exports and produced a 558-line mapping report
(`campaigns/supersale/DATA_DISCOVERY_REPORT.md`). All tables are currently
empty (except Phase A seed data: 2 campaigns, 31 statuses, 8 field_visibility
rows, 1 unit_economics row).

This SPEC executes the actual import. The authoritative source for column
mappings is `DATA_DISCOVERY_REPORT.md`. The schema source is
`CRM_SCHEMA_DESIGN.md` (v3). Both files must be open during execution.

**Key references:**
- Schema: `campaigns/supersale/CRM_SCHEMA_DESIGN.md`
- Mappings: `campaigns/supersale/DATA_DISCOVERY_REPORT.md`
- Exports: `campaigns/supersale/exports/*.xlsx`
- Prizma tenant UUID: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- SuperSale campaign UUID: `32423133-5f25-4ce4-8bf2-66207c29a50f`
- MultiSale campaign UUID: `f5aebad0-c050-4919-8956-aaaa9b96cdd0`

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | `develop`, clean after final commit | `git status` |
| 2 | `crm_events` rows for Prizma | 11 | `SELECT count(*) FROM crm_events WHERE tenant_id = '6ad0781b-...'` → 11 |
| 3 | `crm_leads` rows for Prizma | 880–900 (exact count depends on phone validation) | `SELECT count(*) FROM crm_leads WHERE tenant_id = '6ad0781b-...'` → report actual |
| 4 | `crm_leads` — zero duplicate phones | 0 | `SELECT phone, count(*) FROM crm_leads WHERE tenant_id = '6ad0781b-...' GROUP BY phone HAVING count(*) > 1` → 0 rows |
| 5 | `crm_lead_notes` rows | ≥650 (leads with non-empty Notes) | `SELECT count(*) FROM crm_lead_notes WHERE tenant_id = '6ad0781b-...'` |
| 6 | `crm_event_attendees` rows | 200–215 (Events Record minus invalid) | `SELECT count(*) FROM crm_event_attendees WHERE tenant_id = '6ad0781b-...'` |
| 7 | `crm_event_attendees` — zero orphan lead_ids | 0 | `SELECT count(*) FROM crm_event_attendees a WHERE NOT EXISTS (SELECT 1 FROM crm_leads l WHERE l.id = a.lead_id)` → 0 |
| 8 | `crm_event_attendees` — zero orphan event_ids | 0 | `SELECT count(*) FROM crm_event_attendees a WHERE NOT EXISTS (SELECT 1 FROM crm_events e WHERE e.id = a.event_id)` → 0 |
| 9 | `crm_ad_spend` rows | 85–95 (real FB ADS rows, minus junk) | `SELECT count(*) FROM crm_ad_spend WHERE tenant_id = '6ad0781b-...'` |
| 10 | `crm_cx_surveys` rows | 11 | `SELECT count(*) FROM crm_cx_surveys WHERE tenant_id = '6ad0781b-...'` → 11 |
| 11 | `crm_unit_economics` rows | 2 (SuperSale + MultiSale) | `SELECT count(*) FROM crm_unit_economics WHERE tenant_id = '6ad0781b-...'` → 2 |
| 12 | `v_crm_event_stats` returns data | 11 rows with computed counters | `SELECT count(*) FROM v_crm_event_stats WHERE tenant_id = '6ad0781b-...'` → 11 |
| 13 | `v_crm_lead_event_history` returns data | ≥1 row with `total_events_attended > 0` | `SELECT count(*) FROM v_crm_lead_event_history WHERE total_events_attended > 0` → >0 |
| 14 | Import script committed | `campaigns/supersale/scripts/import-monday-data.mjs` | `ls` → exists |
| 15 | Skipped rows log committed | `campaigns/supersale/scripts/import-skipped.json` | `ls` → exists |
| 16 | Commits produced | 2–3 commits | `git log --oneline` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read all files in the repo
- Read `DATA_DISCOVERY_REPORT.md` and `CRM_SCHEMA_DESIGN.md` as authoritative sources
- Install npm packages (`xlsx`, `@supabase/supabase-js`) in a working directory
- Write and run Node.js import scripts
- Run INSERT/UPSERT SQL against Supabase via the MCP `execute_sql` tool —
  **this SPEC explicitly authorizes Level 2 (DML writes)** scoped to `crm_*`
  tables only, for the Prizma tenant UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- Run read-only SQL for verification queries
- Commit and push to `develop`
- Skip rows that fail validation (log them to `import-skipped.json`)
- Make autonomous decisions on data quality edge cases documented in
  `DATA_DISCOVERY_REPORT.md` (e.g., "הגיע ולא קנה" → `attended`)

### What REQUIRES stopping and reporting

- ANY modification to non-`crm_*` tables
- ANY DML for a tenant_id other than `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
- ANY DDL (CREATE/ALTER/DROP) — schema is frozen from Phase A
- Orphan FK violations that persist after retry (lead_id or event_id not found)
- Import count deviating more than 15% from expected values in §3
- Any error from Supabase that isn't a constraint violation on a single row

---

## 5. Stop-on-Deviation Triggers

- If `crm_leads` INSERT produces more than 20 constraint violations → STOP
  (suggests phone normalization is broken)
- If `crm_event_attendees` has more than 10 orphan lead_ids after import →
  STOP (suggests phone matching between Events Record and Tier 2 is broken)
- If any View query returns an error after import → STOP
- If `crm_events` count is not exactly 11 → STOP
- If the import script crashes with an unhandled exception → STOP

---

## 6. Rollback Plan

All imported data is new rows in existing tables. Rollback = delete by tenant:

```sql
-- Reverse dependency order
DELETE FROM crm_cx_surveys WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_audit_log WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_ad_spend WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_lead_notes WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_event_attendees WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_leads WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
DELETE FROM crm_events WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
-- Keep seed data: crm_campaigns, crm_statuses, crm_field_visibility, crm_tags
-- Update unit_economics back to 1 row (delete MultiSale if added):
DELETE FROM crm_unit_economics WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND campaign_id = 'f5aebad0-c050-4919-8956-aaaa9b96cdd0';
```

Schema remains intact. Seed data remains intact.

---

## 7. Out of Scope

- **UI** — no HTML, JS, or CSS for the ERP
- **Make integration** — no webhook changes
- **Monday API calls** — import from Excel exports only
- **DDL** — no schema changes, no new tables/views/RPCs
- **Demo tenant** — import Prizma only. Demo tenant import comes with QA.
- **Message templates** — extracting Make scenario message content is a
  separate task (not needed for data import)
- **Storefront** — no changes to `opticup-storefront`
- **GLOBAL_SCHEMA / GLOBAL_MAP** — Integration Ceremony only

---

## 8. Import Steps (in order)

The executor builds a single Node.js script (`import-monday-data.mjs`) that
runs the following steps sequentially. Each step logs its count and any skipped
rows. The script uses Supabase MCP `execute_sql` for all DB operations (NOT
the Supabase JS client — stay within the MCP tools).

### Step 1 — Verify pre-conditions

```
- Branch = develop
- crm_campaigns has 2 rows (supersale + multisale)
- crm_statuses has 31 rows
- crm_events has 0 rows (empty — ready for import)
- crm_leads has 0 rows
- All 9 Excel files exist in campaigns/supersale/exports/
```

If any check fails → STOP.

### Step 2 — Add MultiSale unit_economics row

Phase A seeded only SuperSale. Add MultiSale:
```sql
INSERT INTO crm_unit_economics (tenant_id, campaign_id, gross_margin_pct, kill_multiplier, scaling_multiplier)
VALUES ('6ad0781b-37f0-47a9-92e3-be9ed1477e1c',
        'f5aebad0-c050-4919-8956-aaaa9b96cdd0',
        0.50, 5, 7)
ON CONFLICT (tenant_id, campaign_id) DO NOTHING;
```

Verify: `crm_unit_economics` count = 2.

### Step 3 — Import Events (Events Management → `crm_events`)

**Source:** `Events_Management_1776697208.xlsx`
**Mapping:** `DATA_DISCOVERY_REPORT.md` §2.3
**Expected:** 11 rows (skip the Monday totals row — no Event ID)

For each row:
1. Skip if `Event ID` is empty (totals row)
2. Map `Interests` → campaign_id lookup: `SuperSale` → `32423133-...`, `MultiSale` → `f5aebad0-...`
3. Parse `Available Time` → split on ` - ` → `start_time`, `end_time`
4. Map `Event Status` → slug: `Completed` → `completed`, `Closed` → `closed`, `Registration Open` → `registration_open`
5. Trim trailing `.` from `Address`
6. INSERT into `crm_events` with `tenant_id = '6ad0781b-...'`

**Verify:** count = 11, all event_numbers 13–23 present.

### Step 4 — Import Leads (Tier 2 → `crm_leads`)

**Source:** `Tier_2_Master_Board_1776697136.xlsx`
**Mapping:** `DATA_DISCOVERY_REPORT.md` §2.1
**Expected:** ~890 rows

For each row:
1. **Filter junk rows:** skip if `שם מלא` = header text (`"שם מלא"`, `"Status"`, etc.) or row has only 1 non-null cell (group break)
2. **Phone normalization** (per `DATA_DISCOVERY_REPORT.md` §4):
   - 12 digits starting with `972` → prepend `+`
   - 9 digits starting with `5` → prepend `+972`
   - Empty/invalid → skip row, log to `import-skipped.json`
3. **Status mapping** (per §3.1):
   - `ממתין לאירוע` → `waiting`
   - `ביטל Unsubscribe` → `unsubscribed`
   - `הוזמן לאירוע` → `invited`
   - `לא מעוניין` → `not_interested`
   - empty → `new`
4. **Language:** `COALESCE(lg, mapHebrew(Language), 'he')` where `mapHebrew('עברית')='he'`, `mapHebrew('רוסית')='ru'`
5. **Terms:** `Terms&Conditions` = `כן` → `terms_approved=true`, `terms_approved_at` from `Approval time` column (or `created_at` if empty)
6. **Marketing consent:** `Marketing` = `on` → `true`, else `false`
7. **UTM fields:** take from Tier 2 columns 22–26, 28. Leave NULL if empty.
8. **monday_item_id:** from `Item ID` column (col 31), cast to text
9. INSERT with `ON CONFLICT (tenant_id, phone) DO NOTHING` — log any skipped

**After lead import, UTM enrichment from Affiliates:**
1. Parse `Affiliates_1776697312.xlsx`
2. For each Affiliates row with a phone that exists in `crm_leads`:
   - If the lead's `utm_source` is NULL → UPDATE with Affiliates' values
   - Fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_campaign_id`
   - Only fill NULLs — never overwrite existing values

**Verify:** count ≥ 880, zero duplicate phones, spot-check 3 leads by phone.

### Step 5 — Import Lead Notes (Tier 2 Notes → `crm_lead_notes`)

**Source:** Tier 2 column 8 (`Notes`)
**Mapping:** `DATA_DISCOVERY_REPORT.md` §2.1 (row for Notes)
**Expected:** ~650–700 rows

For each lead with a non-empty Notes field:
1. Look up `lead_id` by phone in `crm_leads`
2. INSERT into `crm_lead_notes`:
   - `content` = `"--- היסטוריה ממאנדיי (ייבוא 2026-04-20) ---\n" + original_notes`
   - `employee_id` = NULL (system import)
   - `event_id` = NULL

**Verify:** count ≥ 650.

### Step 6 — Import Attendees (Events Record → `crm_event_attendees`)

**Source:** `Events_Record_Attendees_1776697299.xlsx`
**Mapping:** `DATA_DISCOVERY_REPORT.md` §2.4
**Expected:** ~210 rows

For each row:
1. **Resolve lead_id:** normalize phone from `טלפון` (col 1), look up in `crm_leads`
   - If lead not found → skip row, log to `import-skipped.json`
2. **Resolve event_id:** parse `Event ID` (col 11) as int, look up `crm_events` by `event_number`
   - If event not found → skip row, log
3. **Status mapping** (per §3.2):
   - `הגיע` → `attended`
   - `אישר` → `confirmed`
   - `ביטל` → `cancelled`
   - `כבר נרשם` → `duplicate`
   - `חדש` → `registered`
   - `רשימת המתנה` → `waiting_list`
   - `לא הגיע` → `no_show`
   - `אירוע נסגר` → `event_closed`
   - `הגיע ולא קנה` → `attended` (with `purchase_amount = NULL`)
   - empty → `registered`
4. **Purchase amount:** from col 9, numeric. NULL if empty or 0.
5. **Timestamps:**
   - `registered_at` = `Created` (col 2)
   - `checked_in_at` = set if status = `attended` (use `registered_at` as proxy)
   - `purchased_at` = set if `purchase_amount > 0` (use `registered_at` as proxy)
   - `confirmed_at` = set if status in (`confirmed`, `attended`) (use `registered_at`)
6. **Eye exam:** from col 18, normalize: `כן`→`כן`, `לא`→`לא`, empty→NULL
7. **monday_item_id:** from `Item ID` (col 16)
8. INSERT with `ON CONFLICT (tenant_id, lead_id, event_id) DO NOTHING`

**Verify:** count ≥ 200, zero orphan lead_ids, zero orphan event_ids.

### Step 7 — Import Ad Spend (Facebook ADS → `crm_ad_spend`)

**Source:** `Facebook_ADS_1776697328.xlsx`
**Mapping:** `DATA_DISCOVERY_REPORT.md` §2.6
**Expected:** ~85–91 rows

For each row:
1. **Filter:** skip group-break rows and header re-emissions
2. **campaign_id lookup:** `Event Type` → `SuperSale` → `32423133-...`, `MultiSale` → `f5aebad0-...`. If empty, default to SuperSale (majority).
3. **Status:** lowercase (`Active`→`active`, `Paused`→`paused`, `Stopped`→`stopped`)
4. **UTM linkage** (M4-INFO-05 resolution):
   - `ad_campaign_id` from col 5 (Facebook Campaign ID)
   - Cross-reference with Affiliates: find Affiliates rows where `Campaign ID` (col 14) matches this `ad_campaign_id`
   - If match found: populate `utm_campaign` from Affiliates' `Campaign` (col 11), `utm_content` from col 12, `utm_term` from col 13
   - If no match: leave `utm_campaign`/`utm_content`/`utm_term` as NULL. Log the gap.
5. INSERT into `crm_ad_spend`

**Verify:** count ≥ 85.

### Step 8 — Import CX Surveys (CX Ambassadors → `crm_cx_surveys`)

**Source:** `CX_Ambassadors_Events_Management_1776697276.xlsx`
**Mapping:** `DATA_DISCOVERY_REPORT.md` §2.8
**Expected:** 11 rows

For each row:
1. **Filter:** skip group-break headers (rows with only col 1)
2. **Resolve attendee_id:** normalize phone (col 3), find event_number from `Event ID` (col 12), look up `crm_event_attendees` by (lead_id, event_id)
   - If not found → skip, log
3. **Rating:** parse star emoji count or number from col 7 (`ציון כללי`)
4. **Comment:** from col 9
5. INSERT into `crm_cx_surveys`

**Verify:** count = 11.

### Step 9 — Import Audit Log entries

For each import step (3–8), insert one summary audit record:
```sql
INSERT INTO crm_audit_log (tenant_id, entity_type, entity_id, action, metadata)
VALUES ('6ad0781b-...', '{entity_type}', '00000000-0000-0000-0000-000000000000',
        'import', '{"source":"monday_export","file":"{filename}","rows_imported":{N},"rows_skipped":{M}}');
```

### Step 10 — Verify all Views work

Run each View query and confirm it returns data:
```sql
SELECT count(*) FROM v_crm_event_stats WHERE tenant_id = '6ad0781b-...';
SELECT count(*) FROM v_crm_lead_event_history WHERE total_events_attended > 0;
SELECT count(*) FROM v_crm_event_dashboard WHERE tenant_id = '6ad0781b-...';
SELECT count(*) FROM v_crm_event_attendees_full WHERE tenant_id = '6ad0781b-...';
SELECT count(*) FROM v_crm_leads_with_tags WHERE tenant_id = '6ad0781b-...';
```

### Step 11 — Spot-check data integrity

Pick 3 specific verifications:
1. **Event #22 (SuperSale March 2026):** check `v_crm_event_stats` — should show
   total_registered, total_attended, total_revenue matching Monday board values
   (87 registered, 32 attended, ₪39,460)
2. **A known lead by phone:** pick one from Tier 2 with Notes + Events Attended,
   verify `crm_leads` has correct status + language, `crm_lead_notes` has content,
   `crm_event_attendees` has the right events
3. **v_crm_campaign_performance:** check if any ad spend rows link to leads
   (may be 0 if UTM cross-reference didn't match — document the result)

---

## 9. Commit Plan

- **Commit 1:** `feat(crm): add Monday data import script`
  Files: `campaigns/supersale/scripts/import-monday-data.mjs`

- **Commit 2:** `feat(crm): import Monday data to CRM (leads, events, attendees, ads, CX)`
  Files: `campaigns/supersale/scripts/import-skipped.json`,
  `campaigns/supersale/TODO.md` (mark Steps 2+3 complete)

- **Commit 3:** `chore(spec): close CRM_PHASE_B2_DATA_IMPORT with retrospective`
  Files: EXECUTION_REPORT.md, FINDINGS.md

---

## 10. Dependencies / Preconditions

- **Node.js** available on the machine (verified in B1 — v24.14.0)
- **npm packages:** `xlsx` (for Excel parsing). Install in working dir.
- **Supabase MCP** connected (project: `tsxrrxzmdxaenlvocyit`)
- All 9 Excel files in `campaigns/supersale/exports/`
- `DATA_DISCOVERY_REPORT.md` present (mapping reference)
- `CRM_SCHEMA_DESIGN.md` present (schema reference)
- Branch: `develop`
- Machine: Windows desktop
- **Pre-verified UUIDs:**
  - Prizma tenant: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`
  - SuperSale campaign: `32423133-5f25-4ce4-8bf2-66207c29a50f`
  - MultiSale campaign: `f5aebad0-c050-4919-8956-aaaa9b96cdd0`

---

## 11. Lessons Already Incorporated

- FROM `CRM_PHASE_A/FOREMAN_REVIEW.md` Proposal 1 → "Verify tenant UUIDs
  against live DB" — APPLIED: all 3 UUIDs verified via `execute_sql` before
  writing this SPEC.
- FROM `CRM_PHASE_A/FOREMAN_REVIEW.md` Proposal 2 → "FOR UPDATE + aggregate
  limitation" — NOT APPLICABLE (no RPCs written in this SPEC).
- FROM `CRM_PHASE_B1/FOREMAN_REVIEW.md` Proposal 1 → "Verify execution-
  environment preconditions" — APPLIED: Node.js confirmed available (B1
  executor verified v24.14.0). Python NOT listed as dependency.
- FROM `CRM_PHASE_B1/FOREMAN_REVIEW.md` Proposal 2 → "Monday export group-
  break format" — APPLIED: §8 Steps 3–8 all include group-break filtering
  instructions, including both single-cell rows AND header re-emissions.
- FROM `CRM_PHASE_B1/FINDINGS` M4-INFO-05 → "FB ADS UTM empty" — APPLIED:
  §8 Step 7 includes explicit Affiliates cross-reference for UTM enrichment.
- Cross-Reference Check: no new DB objects in this SPEC. Import only.

---

## 12. Execution Notes

### Monday Export Parsing (recap from B1)

Monday exports have:
- Row 1: board name
- Row 2: group name
- Row 3: column headers
- Row 4+: data

**Group breaks** appear mid-file as:
1. A single-cell row with the group name (e.g., "Purchased - No more messages")
2. Immediately after: a full re-emission of the header row as data

Filter both by: (a) rows with ≤1 non-null cell, (b) rows where column values
literally match header text.

### Phone Normalization Rules

| Input format | Transform | Example |
|---|---|---|
| 12 digits starting with `972` | prepend `+` | `972507775675` → `+972507775675` |
| 9 digits starting with `5` | prepend `+972` | `542210500` → `+972542210500` |
| 10 digits starting with `05` | replace `0` with `+972` | `0507775675` → `+972507775675` |
| Empty / non-numeric / garbled | SKIP row | Log to import-skipped.json |

### Status Mapping Quick Reference

**Leads (Tier 2):**
`ממתין לאירוע`→`waiting`, `ביטל Unsubscribe`→`unsubscribed`,
`הוזמן לאירוע`→`invited`, `לא מעוניין`→`not_interested`, empty→`new`

**Attendees (Events Record):**
`הגיע`→`attended`, `אישר`→`confirmed`, `ביטל`→`cancelled`,
`כבר נרשם`→`duplicate`, `חדש`→`registered`, `רשימת המתנה`→`waiting_list`,
`לא הגיע`→`no_show`, `אירוע נסגר`→`event_closed`,
`הגיע ולא קנה`→`attended` (purchase_amount=NULL), empty→`registered`

**Events:**
`Completed`→`completed`, `Closed`→`closed`, `Registration Open`→`registration_open`

### INSERT Strategy

Use Supabase MCP `execute_sql` with batch INSERTs (50–100 rows per call)
to avoid hitting request limits. Each batch uses `ON CONFLICT DO NOTHING`
to handle duplicates gracefully. Log skipped rows to `import-skipped.json`
with reason.

Do NOT use the Supabase JS client or REST API. All writes go through
`execute_sql` via the MCP, which uses the `service_role` key and bypasses
RLS. The `tenant_id` is explicitly set in every INSERT — defense in depth
(Iron Rule 22).

### Handling the Affiliates UTM Cross-Reference (M4-INFO-05)

The Facebook ADS board has empty UTM columns. To populate `crm_ad_spend.utm_campaign`:
1. Parse Affiliates export
2. Build a map: `Campaign ID` (col 14) → { campaign: col 11, content: col 12, term: col 13 }
3. For each FB ADS row: look up `ad_campaign_id` in the Affiliates map
4. If found: set utm_campaign, utm_content, utm_term
5. If not found: leave NULL, log the gap
6. Report the match rate in EXECUTION_REPORT
