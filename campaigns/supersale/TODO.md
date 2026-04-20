# SuperSale Campaign — Open Tasks

## Project Goal

Replace Monday.com entirely with an internal CRM built on Supabase (inside Optic Up).
Document everything → design the new system → build automations from scratch in Make →
run both systems in parallel → switch when proven stable.

### Key Concepts for the New System

- **Messaging Hub** — single screen for all messages (auto triggers + manual broadcast). See `make/scenario-8-event-reminders.md`
- **T&C Gate** — mandatory terms approval at registration, not a follow-up scenario. See `make/scenario-7-terms-approval.md`
- **Event Day Module** — entrance scan screen built into Optic Up. See `make/scenario-9-10a-event-day.md`
- **CX Flow** — positive review → Google review request, negative → agent callback. See `make/scenario-9-10a-event-day.md`

## Completed

### Session 1 — April 19, 2026
- [x] Document all Monday boards (10 files)
- [x] Document all Make scenarios overview (20 scenarios mapped)
- [x] Document main entry scenario (1A-S) in detail
- [x] Build CLAUDE.md master context guide
- [x] Map complete campaign flow (5 phases)

### Session 2 — April 20, 2026
- [x] Document Scenario 6 — SuperSale + Manual (7 flows + Russian) ✅ approved
- [x] Document Scenario 7 — T&C approval (current state + new gate approach) ✅ approved
- [x] Document Scenario 8 — Event reminders (current state + Messaging Hub concept) ✅ approved
- [x] Document Scenarios 9+10A+10B — Event day (entrance scan + post-scan + CX) ✅ approved
- [x] Document Scenario 1WA — WhatsApp incoming (catalog + QR quick registration) ✅ approved

### Session 3 — April 20, 2026
- [x] Scenario 5A — פתיחת אירוע ושליחת הודעות (69 modules, 735 ops) — ⭐ CORE ✅
- [x] Scenario 1B — Send Emails/Register Master Boards (34 modules, 54 ops) ✅
- [x] Scenario 2 — רישום משתתפים לאירוע (~15 active modules, 1734 ops) ✅
- [x] Scenario 0B — Attendees Acceptance (9 modules, 663 ops) ✅
- [x] Scenario 4 — מספור האירוע (7 modules, 20 ops) ✅
- [x] Scenario UN — Unsubscribe (16 modules, 54 ops) ✅
- [x] Scenario 0A — Automations הודעות משלימות (43 modules, 0 ops — built, never triggered) ✅

### Session 4 — April 20, 2026
- [x] Design Supabase schema v1 (12 tables) ✅
- [x] Design Supabase schema v2 (20 tables — config layer, custom fields, Monday sync) ✅
- [x] Q&A with Daniel — all 12 decisions closed ✅
- [x] Design Supabase schema v3 FINAL (23 tables, 7 Views, 8 RPCs) ✅ approved
- [x] Analyze Affiliates/Facebook ADS/Unit Economics boards (3 Excel files) ✅
- [x] Design campaign performance layer (crm_ad_spend, crm_unit_economics, crm_campaign_pages) ✅
- [x] Iron Rules compliance verification ✅

## ✅ All Make Scenarios Documented
## ✅ Schema Design Complete (v3 final — `CRM_SCHEMA_DESIGN.md`)

---

## Next: Build Phase

### Step 1 — SPEC + Migration SQL ✅ COMPLETE (2026-04-20)
- [x] Write SPEC (via opticup-strategic skill) — `modules/Module 4 - CRM/docs/specs/CRM_PHASE_A_SCHEMA_MIGRATION/SPEC.md`
- [x] Create migration SQL from `CRM_SCHEMA_DESIGN.md` — 23 tables, 7 Views, 8 RPCs, 46 RLS policies — `campaigns/supersale/migrations/001_crm_schema.sql`
- [x] Seed data: statuses (31), campaigns (2), tags (2), field visibility (8), unit economics (1)
- [x] Run migration on Supabase — all 15 success criteria passed ✅

### Step 2 — Data Collection
- [ ] Extract actual message templates from Make scenarios → seed for `crm_message_templates`
- [ ] Extract Monday column IDs → seed for `crm_monday_column_map`
- [x] Import ad spend data from Excel → `crm_ad_spend` (88 rows, 12 with UTM match from Affiliates cross-ref) ✅ 2026-04-20

### Step 3 — Import Leads ✅ COMPLETE (2026-04-20, Phase B2)
- [x] Build import script: `campaigns/supersale/scripts/import-monday-data.mjs` (xlsx parser) + `rest-import.mjs` (DB runner)
- [x] Monday Tier 2 → `crm_leads` (893 rows imported, 0 duplicate phones, UPSERT on `tenant_id,phone`)
- [x] Import Notes as "History from Monday" prefix per lead → `crm_lead_notes` (695 rows)
- [x] Import Events Record → `crm_event_attendees` (149 of 191 candidates; 42 phone-orphans skipped — see Phase B2 FINDINGS)
- [x] Import Events Management → `crm_events` (11 rows, event_numbers 13–23)
- [x] Import CX Ambassadors → `crm_cx_surveys` (8 of 11; 3 reference skipped attendees)
- [x] Seed MultiSale unit_economics (margin=0.50, kill=5, scale=7)
- [x] Affiliates UTM enrichment (PATCH null utm_* columns on 893 leads)
- [x] All 5 Views return data; Event #22 revenue = ₪39,460 (exact match vs Monday)
- SPEC: `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B2_DATA_IMPORT/`

### Step 4 — UI Build (after schema + data)
- [ ] Design Messaging Hub UI and logic
- [ ] Design Event Day Module (entrance scan screen)
- [ ] Design CX Flow (satisfaction → Google review / agent callback)
- [ ] Design campaigner public performance page

### Step 5 — Make Integration
- [ ] Design Make scenarios from scratch (clean, no duplication)
- [ ] Wire Make webhooks to CRM (instead of Monday)
- [ ] Plan parallel run strategy (Monday + Optic Up side by side)

### Step 6 — Switch
- [ ] QA on demo tenant
- [ ] Plan migration / switchover
- [ ] Go live
