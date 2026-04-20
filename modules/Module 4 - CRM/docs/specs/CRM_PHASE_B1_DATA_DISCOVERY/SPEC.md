# SPEC — CRM_PHASE_B1_DATA_DISCOVERY

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B1_DATA_DISCOVERY/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-20
> **Module:** 4 — CRM
> **Phase:** B1 (Data Discovery — read-only analysis)
> **Author signature:** Cowork strategic session, Daniel present
> **Execution target:** Claude Code on Windows desktop (NOT Cowork)

---

## 1. Goal

Analyze all 9 Monday.com board exports, produce a structured mapping report
that maps every column to the CRM schema, identifies data quality issues
(duplicates, missing phones, format mismatches), and outputs the verified
column-to-field mapping that Phase B2 (Import) will use. **No DB writes.**

---

## 2. Background & Motivation

Phase A (SPEC `CRM_PHASE_A_SCHEMA_MIGRATION`, closed 2026-04-20) created
23 `crm_*` tables, 7 Views, 8 RPCs, and 46 RLS policies in Supabase.
The schema is empty — ready to receive data.

Daniel exported all 9 Monday.com boards to Excel files in
`campaigns/supersale/exports/`. Before importing, we need Claude Code to
prove it understands the data: which columns map where, what needs
transformation, what's junk, and what's duplicated.

This is a **read-only** SPEC. No DB writes, no imports. The output is a
report file that the Foreman reviews before writing Phase B2 (Import).

**Prizma tenant UUID:** `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`

---

## 3. Input Files

All files are in `campaigns/supersale/exports/`:

| # | File | Monday Board | Rows | Maps to CRM table(s) |
|---|------|-------------|------|----------------------|
| 1 | `Tier_2_Master_Board_1776697136.xlsx` | Tier 2: Master Board | 902 | `crm_leads` (primary source) |
| 2 | `Events_Record_Attendees_1776697299.xlsx` | Events Record (Attendees) | 213 | `crm_event_attendees` (historical) |
| 3 | `Events_Management_1776697208.xlsx` | Events Management | 12 | `crm_events` |
| 4 | `Affiliates_1776697312.xlsx` | Affiliates | 867 | `crm_leads` (overlap with Tier 2 — needs dedup) |
| 5 | `Facebook_ADS_1776697328.xlsx` | Facebook ADS | 95 | `crm_ad_spend` |
| 6 | `Unit_Economics_1776697339.xlsx` | Unit Economics | 5 | `crm_unit_economics` (already seeded in Phase A) |
| 7 | `CX_Ambassadors_Events_Management_1776697276.xlsx` | CX & Ambassadors | 18 | `crm_cx_surveys` |
| 8 | `Tier_3_Event_Attendees_1776697179.xlsx` | Tier 3: Event Attendees | 8 | `crm_event_attendees` (current event, transient) |
| 9 | `Entrance_Scan_QR_1776697228.xlsx` | Entrance - Scan QR | 71 | Check-in log (informational — may not import) |

---

## 4. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify |
|---|-----------|---------------|--------|
| 1 | Report file exists | `campaigns/supersale/DATA_DISCOVERY_REPORT.md` | `ls` → exists |
| 2 | Report contains column mapping for all 9 files | 9 sections, one per file | Visual check |
| 3 | Report contains dedup analysis: Affiliates vs Tier 2 | Count of overlapping phones | In report |
| 4 | Report contains phone format analysis | How many phones need `+972` prefix, how many are invalid | In report |
| 5 | Report contains status mapping table | Monday status → CRM slug for leads + attendees | In report |
| 6 | Report contains language mapping | Monday `lg`/`Language` values → CRM `language` field | In report |
| 7 | Report contains import order recommendation | Which files first, dependencies | In report |
| 8 | Report contains data quality summary | Missing phones, missing names, empty rows | In report |
| 9 | No DB writes | 0 INSERT/UPDATE/DELETE executed | Executor confirms |
| 10 | No files modified except the report | `git status` shows only new report file | `git status` |
| 11 | Commit: 1 commit with the report | `docs(crm): add Data Discovery Report for Monday exports` | `git log` |

---

## 5. Autonomy Envelope

### What the executor CAN do without asking
- Read all Excel files in `campaigns/supersale/exports/`
- Read `campaigns/supersale/CRM_SCHEMA_DESIGN.md` for schema reference
- Read `campaigns/supersale/monday/*.md` for board documentation
- Run `pip install openpyxl` if needed
- Write Python scripts to analyze the data (in working directory, not committed)
- Run read-only SQL against Supabase to check existing seed data
- Create the report file
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- Any DB write (INSERT, UPDATE, DELETE, DDL)
- Any modification to existing files
- Any data that doesn't fit the schema (columns with no mapping)
- Discovery of PII beyond what's expected (phone, email, name)

---

## 6. Stop-on-Deviation Triggers

- If Tier 2 row count is significantly different from 902 (±10%) → report
- If more than 50% of phones are in an unexpected format → report
- If Affiliates overlap with Tier 2 is > 90% (may mean they're the same data) → report
- If Events Management has events with no Event ID → report

---

## 7. Out of Scope

- **Actual import** — no data goes into Supabase
- **Import scripts** — no Python/SQL import scripts
- **Monday column map seed** — that's Phase B2
- **Message template extraction from Make** — separate task
- **Any DB modification**

---

## 8. Expected Final State

### New files
- `campaigns/supersale/DATA_DISCOVERY_REPORT.md` — the analysis report

### Modified files
- None

### DB state
- Unchanged from Phase A

---

## 9. Report Structure (template for the executor)

The `DATA_DISCOVERY_REPORT.md` MUST follow this structure:

```markdown
# CRM Data Discovery Report

> Generated: {date}
> Source: campaigns/supersale/exports/ (9 Monday.com board exports)
> Target schema: campaigns/supersale/CRM_SCHEMA_DESIGN.md (v3)

## 1. Executive Summary
- Total leads in Tier 2: {N}
- Total unique leads (after Affiliates dedup): {N}
- Total historical attendee records: {N}
- Total events: {N}
- Data quality score: {GOOD/FAIR/POOR} with {N} issues found

## 2. File-by-File Column Mapping

### 2.1 Tier 2: Master Board → crm_leads

| Monday Column | Col # | CRM Field | Type | Transform | Notes |
|---|---|---|---|---|---|
| שם מלא | 1 | full_name | text | none | |
| Phone Number | 5 | phone | text | format to +972... | |
| ... | | | | | |

### 2.2 Events Record → crm_event_attendees
(same format)

### 2.3 Events Management → crm_events
(same format)

... (all 9 files)

## 3. Status Mapping

### 3.1 Lead Statuses (Tier 2 Status → crm_statuses slug)

| Monday Status (Hebrew) | Count | CRM Slug | Notes |
|---|---|---|---|
| ממתין לאירוע | {N} | waiting | |
| ... | | | |

### 3.2 Attendee Statuses (Events Record Status → crm_statuses slug)
(same format)

## 4. Phone Number Analysis

| Format | Count | Example | Transform needed |
|---|---|---|---|
| 972XXXXXXXXX (12 digits) | {N} | 972507775675 | prepend + |
| 05XXXXXXXX (10 digits) | {N} | 0507775675 | replace 0 with +972 |
| +972XXXXXXXXX (correct) | {N} | +972507775675 | none |
| Invalid/empty | {N} | | flag for review |

## 5. Deduplication Analysis

### 5.1 Affiliates vs Tier 2
- Affiliates total: 867
- Tier 2 total: 902
- Matching by phone: {N}
- In Affiliates only: {N}
- In Tier 2 only: {N}
- Recommendation: {import Tier 2 only / merge / etc.}

### 5.2 Internal Duplicates (within Tier 2)
- Duplicate phones found: {N}
- Details: {list if small}

## 6. Language Mapping

| Monday value | Count | CRM value |
|---|---|---|
| עברית | {N} | he |
| רוסית | {N} | ru |
| (empty) | {N} | he (default) |

## 7. Data Quality Issues

| # | Issue | File | Count | Severity | Action |
|---|---|---|---|---|---|
| 1 | Missing phone number | Tier 2 | {N} | HIGH | Cannot import without phone |
| 2 | ... | | | | |

## 8. Import Order Recommendation

Based on FK dependencies and data quality:
1. `crm_events` ← Events Management (12 rows, no FK deps)
2. `crm_leads` ← Tier 2 (902 rows, needs phone normalization)
3. `crm_event_attendees` ← Events Record (213 rows, FK → leads + events)
4. `crm_ad_spend` ← Facebook ADS (95 rows, FK → campaigns)
5. ... etc.

## 9. Notes & Monday Column IDs

Monday item IDs found in exports:
- Tier 2: column `Item ID` (col 31) — maps to `crm_leads.monday_item_id`
- Events Record: column `Item ID` (col 16) — maps to `crm_event_attendees.monday_item_id`
- Events Management: no Item ID column visible — needs investigation

## 10. Fields NOT Imported (with reason)

| Monday Column | File | Reason |
|---|---|---|
| WhatsApp Name | Tier 2 col 21 | Redundant with full_name |
| ... | | |
```

---

## 10. Commit Plan

- **Commit 1:** `docs(crm): add Data Discovery Report for Monday exports`
  File: `campaigns/supersale/DATA_DISCOVERY_REPORT.md`

---

## 11. Dependencies / Preconditions

- Python 3 + openpyxl available on the machine
- All 9 Excel files present in `campaigns/supersale/exports/`
- `campaigns/supersale/CRM_SCHEMA_DESIGN.md` present (schema reference)
- Branch: `develop`
- Machine: Windows desktop (`C:\Users\User\opticup`)

---

## 12. Lessons Already Incorporated

- FROM `CRM_PHASE_A_SCHEMA_MIGRATION/FOREMAN_REVIEW.md` Proposal 1 →
  "Verify tenant UUIDs against live DB" — NOT APPLICABLE (no DB writes
  in this SPEC), but UUID is noted for reference: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`.
- FROM `CRM_PHASE_A_SCHEMA_MIGRATION/FOREMAN_REVIEW.md` Proposal 2 →
  "Note FOR UPDATE + aggregate limitation" — NOT APPLICABLE (no RPCs in this SPEC).
- Cross-Reference Check: no new DB objects created in this SPEC. Report file
  only. No collision risk.

---

## 13. Execution Notes

### Monday Export Format
Monday.com Excel exports have a specific structure:
- Row 1: Board name
- Row 2: Group name (e.g., "All Leads", "New", "Processed")
- Row 3: Column headers
- Row 4+: Data

Groups appear as section breaks — a row with only column 1 filled (the group
name) followed by more data rows. The executor MUST handle this: when parsing,
skip rows where only column 1 has a value and it matches a known group name.

### Phone Number Normalization
Monday stores phones as numbers (e.g., `972507775675`) or strings. The CRM
expects `+972XXXXXXXXX` format. The executor should analyze all phone formats
found and document the transformation rules.

### Hebrew Status Values
Monday uses Hebrew status labels. The CRM uses English slugs. The mapping
must be 1:1 and complete — every Hebrew status found in the data must map
to exactly one slug from `crm_statuses` seed data (Phase A).

### Notes Field
Tier 2 column 8 (`Notes`) contains multi-line text with timestamps from Make
scenario updates. Per `CRM_SCHEMA_DESIGN.md` §5.6, these should be imported
as a single note per lead: "--- היסטוריה ממאנדיי (ייבוא {date}) ---\n{content}".
The report should show a sample and note the average length.

### Events Attended Field
Tier 2 column 15 (`Events Attended`) appears to contain comma-separated event
numbers (e.g., ", 20" meaning event #20). The report should parse these and
cross-reference against Events Management event IDs.
