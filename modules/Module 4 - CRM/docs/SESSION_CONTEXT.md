# Module 4 — CRM: Session Context

> **Last updated:** 2026-04-20
> **Current phase:** B5 (Messaging Hub) — CLOSED WITH FOLLOW-UPS
> **Next phase:** B6 (Make Cutover / Monday retirement) — TBD
> **Branch:** develop

---

## Current State

Phase A through B5 complete. The CRM module has:
- **Schema:** 23 tables (incl. 4 messaging tables from Phase A), 7 Views, 8 RPCs, 46 RLS policies
- **Data:** 893 leads, 11 events, 149 attendees, 695 notes, 88 ad spend rows imported from Monday.com (Phase B2)
- **UI:** `crm.html` with 4 visible tabs (Dashboard, Leads, Events, Messaging Hub) + 1 hidden tab (Event Day) entered via event modal
- **Event Day (B4):** live check-in panel (RPC: `check_in_attendee`), scheduled times board, attendee management (purchase amount, coupon toggle, booking fee), stats bar with registered/attended/purchased/revenue
- **Messaging Hub (B5):** 4 sub-tabs — templates CRUD, automation rules CRUD, manual broadcast send (recipient count preview + confirmation), message log with filters and pagination
- **Home screen:** CRM card added to `index.html` via MODULES config

All code is on `develop` — NOT yet merged to `main`. Daniel cannot access the CRM on the production site until merge.

## Known Gaps

- `crm_lead_notes` has no `is_deleted` column — intentional for now (append-only audit stream). Revisit when note-editing SPEC is authored (M4-SCHEMA-01).
- 42 attendees from early events (13–17) not imported — phones absent from Tier 2. Accepted gap, not a bug (M4-DATA-02).
- `js/shared.js` at 408 lines (57 over limit) — FIELD_MAP split deferred (M4-DEBT-01).
- CRM module uses raw `sb.from()` instead of `DB.*` wrapper — deferred to post-B6 refactor SPEC (M4-DEBT-02).
- Demo tenant has zero CRM data — blocks automated browser testing; future `CRM_DEMO_SEED` SPEC will clone subset from Prizma (M4-DATA-03).
- Messaging Hub does not actually dispatch messages yet — `crm_message_log` rows are written with `status='sent'` but nothing reaches external services. External send integration is a future SPEC (see B5 FINDINGS).
- Automation rules are stored but not executed — no scheduler yet. Same future-SPEC scope as message dispatch.
- Template variable chips (`{{name}}`, `{{event_date}}`, etc.) are UI-only; no substitution happens at write time.
- `rule-21-orphans` pre-commit hook flagged 7 false positives in B5 commit 1 (IIFE-local helper names shared across `crm-messaging-templates.js` and `crm-messaging-rules.js`). Same detector issue as M4-TOOL-01 / B3 `TOOL-DEBT-01`. Hook is informational, not blocking.

## Phase History

| Phase | Status | What it did |
|-------|--------|-------------|
| A — Schema Migration | ✅ CLOSED | 23 tables, 7 Views, 8 RPCs, seed data |
| B1 — Data Discovery | ✅ CLOSED | Analyzed 9 Monday exports, produced mapping report |
| B2 — Data Import | 🟡 CLOSED w/ FOLLOW-UPS | Imported all Monday data into CRM tables |
| B3 — Core UI | 🟡 CLOSED w/ FOLLOW-UPS | Built crm.html with 3 tabs, read-only |
| B4 — Event Day Module | 🟡 CLOSED w/ FOLLOW-UPS | 4 new files: event-day main + check-in + schedule + manage. Entry button in event modal. Stats bar + 3 sub-tabs. Writes via `check_in_attendee` RPC and direct `crm_event_attendees` updates. |
| B5 — Messaging Hub | 🟡 CLOSED w/ FOLLOW-UPS | 4 new files: messaging-tab orchestrator + templates CRUD + automation-rules CRUD + broadcast/log. Tab #4 "הודעות". 4 sub-tabs (תבניות / כללי אוטומציה / שליחה ידנית / היסטוריה). No DDL. Send is UI-only; external dispatch deferred. |

## What's Next

**Phase B6 (candidate)** — Make cutover / Monday retirement:
- Rewire campaign ingest away from Monday+Make to direct DB writes
- Retire the 15+ Make scenarios behind the CRM
- Migrate the automation rules from B5 into a background scheduler (Edge Function or Supabase cron)
- Wire external dispatch for templates + broadcasts (SMS provider, WhatsApp Business, email)
- The `DB.*` wrapper refactor for CRM code (M4-DEBT-02) is a good companion SPEC to run after B6 stabilizes.

**Before B6 dispatch:**
- Daniel QA pass on crm.html (manual) — covers B4 + B5 behavioral criteria deferred to manual QA
- Optional: `CRM_DEMO_SEED` SPEC to unblock automated browser testing
- Merge develop → main once Daniel is satisfied with QA
