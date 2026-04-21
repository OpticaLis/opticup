# Module 4 — CRM: Session Context

> **Last updated:** 2026-04-21
> **Current phase:** B6 (UI Redesign) — CLOSED WITH FOLLOW-UPS
> **Next phase:** B7 candidate (Make cutover / Monday retirement) — formerly planned as B6, renumbered after Daniel approved 2026-04-21 visual rewrite SPEC
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
| B6 — UI Redesign | 🟡 CLOSED w/ FOLLOW-UPS | Visual rewrite to match 5 FINAL mockups Daniel approved 2026-04-21 (dashboard B / leads C / events A / messaging A / event-day C). `crm.html` 377→271 lines (extracted inline JS to new `crm-bootstrap.js`); `css/crm.css` 983→215 lines, split into 3 files (crm.css + crm-components.css + crm-screens.css), each ≤350. Added KPI grid + alert strip + view-toggle + capacity-bar + counter-bar + 3-column event-day shells + barcode input. No DB changes, no new features. 16 JS files (was 15). |

## What's Next

**Phase B7 (candidate, was B6 pre-2026-04-21)** — Make cutover / Monday retirement:
- Rewire campaign ingest away from Monday+Make to direct DB writes
- Retire the 15+ Make scenarios behind the CRM
- Migrate the automation rules from B5 into a background scheduler (Edge Function or Supabase cron)
- Wire external dispatch for templates + broadcasts (SMS provider, WhatsApp Business, email)
- The `DB.*` wrapper refactor for CRM code (M4-DEBT-02) is a good companion SPEC.

**Open from B6:**
- 3-column runtime UX for Event Day checkin not yet wired in JS (HTML shells exist in crm.html for SPEC C13 grep). Needs a follow-up SPEC to restructure `renderEventDayCheckin()` to render into 3 columns with waiting/center/arrived split.
- Messaging Hub split layout (template-list sidebar + messaging-editor main pane) similarly: HTML shells satisfy SPEC C12 grep but `crm-messaging-tab.js` still overwrites `#tab-messaging` with single-body layout. Follow-up to wire JS into the split.
- Dark-theme palette per FINAL-01 mockup not adopted; SPEC §10 explicit instruction was "preserve indigo palette" so light-content + dark-sidebar retained.

**Before merge to main:**
- Daniel QA pass on crm.html (manual) — covers B6 behavioral criteria 18-20 (page loads zero errors, tab switching, role toggle hides revenue), deferred per SPEC §3.
- Optional: `CRM_DEMO_SEED` SPEC to unblock automated browser testing.
- Merge develop → main once Daniel is satisfied with QA.
