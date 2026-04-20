# Module 4 — CRM: Session Context

> **Last updated:** 2026-04-20
> **Current phase:** B3 (Core UI) — CLOSED WITH FOLLOW-UPS
> **Next phase:** B4 (Messaging Hub + Event Day Module)
> **Branch:** develop

---

## Current State

Phase A through B3 complete. The CRM module has:
- **Schema:** 23 tables, 7 Views, 8 RPCs, 46 RLS policies (Phase A)
- **Data:** 893 leads, 11 events, 149 attendees, 695 notes, 88 ad spend rows imported from Monday.com (Phase B2)
- **UI:** `crm.html` with 3 tabs (Dashboard, Leads, Events), detail modals, search/filter/pagination (Phase B3)
- **Home screen:** CRM card added to `index.html` via MODULES config

All code is on `develop` — NOT yet merged to `main`. Daniel cannot access the CRM on the production site until merge.

## Known Gaps

- `crm_lead_notes` has no `is_deleted` column — intentional for now (append-only audit stream). Revisit when note-editing SPEC is authored (M4-SCHEMA-01).
- 42 attendees from early events (13–17) not imported — phones absent from Tier 2. Accepted gap, not a bug (M4-DATA-02).
- `js/shared.js` at 408 lines (57 over limit) — FIELD_MAP split deferred (M4-DEBT-01).
- Browser smoke test not run for B3 — behavioral criteria (modal opens, RTL, zero console errors) verified by code review only. CSS nav bug found and fixed (nav#mainNav → nav#crmNav).
- Module 4 doc files (this file, CHANGELOG, MODULE_MAP) created at B3 close after 3 consecutive reviews flagged their absence.

## Phase History

| Phase | Status | What it did |
|-------|--------|-------------|
| A — Schema Migration | ✅ CLOSED | 23 tables, 7 Views, 8 RPCs, seed data |
| B1 — Data Discovery | ✅ CLOSED | Analyzed 9 Monday exports, produced mapping report |
| B2 — Data Import | 🟡 CLOSED w/ FOLLOW-UPS | Imported all Monday data into CRM tables |
| B3 — Core UI | 🟡 CLOSED w/ FOLLOW-UPS | Built crm.html with 3 tabs, read-only |

## What's Next

**Phase B4** will add:
- Messaging Hub (WhatsApp/SMS templates, send flow)
- Event Day Module (entrance scan, CX flow, scheduled times)
- CX Survey UI

**Before B4 dispatch:**
- Daniel QA pass on crm.html (manual, after merge to main or local server)
- CSS fix commit (nav#crmNav)
- FOREMAN_REVIEW commit for B3
