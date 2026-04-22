# Module 4 — CRM: Session Context

> **Last updated:** 2026-04-22
> **Current phase:** Go-Live P2b (CRM Event Management) — ✅ CLOSED
> **Next phase:** P3 (Make Message Dispatcher)
> **Branch:** develop

---

## Current State

**Build phases (A–B9) complete.** CRM merged to `main`.

- **Schema:** 23 tables, 7 Views, 8 RPCs, 46 RLS policies
- **Data:** 893 leads, 11 events, 149 attendees, 695 notes, 88 ad spend rows (Monday import) on Prizma. 31 crm_statuses now also seeded on demo (11 lead + 10 event + 10 attendee — cloned from Prizma on 2026-04-21 as P2a Commit 0).
- **UI:** `crm.html` with **6 visible tabs** (Dashboard, לידים נכנסים, רשומים, Events, Messaging Hub) + 1 hidden (Event Day)
- **Lead management (P2a):** working end-to-end — individual + bulk status change, add note from detail modal, Tier 1→2 transfer button, row click → detail modal (both tabs). See Phase History row below for details.

### Architecture Decision (2026-04-21): Internal-First

Go-Live roadmap rewritten from C1–C9 (Make-centric) to P1–P7 (internal-first).

**Old approach (abandoned):** clone every Make scenario, replace Monday modules with HTTP calls to Supabase. Resulted in brittle Make scenarios (broken routers, `{{}}` conflicts, no error handling, missing business logic).

**New approach:**
- **All business logic is internal** — Edge Functions, RPCs, CRM UI → Supabase directly. No Make involved in decisions.
- **Make is a message dispatcher only** — receives webhook with template_slug + recipient + variables, sends SMS/Email/WhatsApp, logs result. Generic scenarios, not per-flow.
- **Native Supabase modules in Make** — not generic HTTP. One connection, proper modules (Search Rows, Create a Row, etc.)
- **Message content last** — templates written and seeded in P5, not during pipeline build.

See `modules/Module 4 - CRM/go-live/ROADMAP.md` for full P1–P7 plan.

### What survived from old C1
- Tier 1 "לידים נכנסים" tab (`crm-incoming-tab.js`, 157 lines) — **keep, code is good**
- "לידים" renamed to "רשומים" (Tier 2 filter) — **keep**
- `TIER1_STATUSES` / `TIER2_STATUSES` in `crm-helpers.js` — **keep**
- 4 message templates in `crm_message_templates` (demo tenant) — **keep, will update format in P5**
- Make scenario ID 9101245 (Demo folder) — **abandon, will rebuild with native Supabase modules in P3**

## Known Gaps

- `crm_lead_notes` has no `is_deleted` column — intentional for now (append-only audit stream). Revisit when note-editing SPEC is authored (M4-SCHEMA-01).
- 42 attendees from early events (13–17) not imported — phones absent from Tier 2. Accepted gap, not a bug (M4-DATA-02).
- `js/shared.js` at 408 lines (57 over limit) — FIELD_MAP split deferred (M4-DEBT-01).
- CRM module uses raw `sb.from()` instead of `DB.*` wrapper — deferred to post-B6 refactor SPEC (M4-DEBT-02).
- Demo tenant has zero CRM **data** (leads/events/attendees) — still blocks fully automated browser testing of flows that require existing rows. `crm_statuses` (31 rows) IS now seeded on demo (P2a Commit 0, 2026-04-21) so dropdowns render; a full `CRM_DEMO_SEED` SPEC is still needed for the rest (M4-DATA-03 partially addressed).
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
| B7 — Visual Components | 🟡 CLOSED w/ FOLLOW-UPS | JS rewrite that populates the B6 shells with the rich visual components from the 5 FINAL mockups. 8 JS files rewritten + 2 new (`crm-leads-views.js`, `crm-events-detail-charts.js`). 1 new CSS file (`css/crm-visual.css`, 347 lines). All 35 §2 structural criteria pass; 5 behavioral criteria deferred to Daniel QA. Adds: KPI sparklines, stacked bar chart, conversion gauges (conic-gradient), activity feed with pulse-dot, horizontal events timeline, kanban+cards views for leads, filter chips, bulk selection bar, summary row, lead detail 5-sub-tab modal with footer actions, gradient event-header, SVG funnel, analytics chart cards, category-tabbed template sidebar, dark code editor with line-numbers + variable menu, 3-panel WhatsApp/SMS/Email preview, 5-step broadcast wizard, status-chip message log, 5 gradient event-day counter cards, live clock, 3-column checkin layout with barcode scanner and selected-detail, arrived-column with waiting-to-purchase + purchased sections, purchase-amount modal, admin-only running-total, flash notifications. No DB changes, no new queries. 18 JS files. |
| B8 — Tailwind Visual Fidelity | ✅ CLOSED | Daniel rejected B7 visual output ("לא נראה כמו המוקאפים"). Root cause: the 5 FINAL mockups use Tailwind CDN (gradients, shadows, rounded corners, spacing) while B6+B7 used only CSS custom properties. Fix: Tailwind CDN loaded on `crm.html` only (with RTL + Heebo + custom `crm.*` colors in `tailwind.config`). All 16 CRM render functions across the 5 screens rewritten to emit Tailwind utility classes matching the mockup patterns — KPI gradient cards + sparklines, colored alert strip, gradient stacked bar chart, conic-gradient gauges, animate-pulse activity feed, horizontal timeline cards, table/kanban/cards leads views, filter chips, indigo bulk bar, pagination, lead-detail with gradient-avatar header and 5 tabs + 4 gradient action buttons, events list with emerald revenue column, gradient event header (indigo→violet) with glass-morphism controls and capacity bar, 6 gradient KPI cards with trend arrows, SVG funnel, gradient bar analytics, sub-tab bar, messaging orchestrator with rounded tab bar, templates split-layout with category tabs + dark code editor + 3-panel preview (WhatsApp emerald / SMS sky / Email amber), broadcast wizard with 5-step progress + green✓ completed dots, rules table with colored channel badges + pill toggles, event-day 5 gradient counter cards with clock, 3-column check-in grid (amber/indigo/emerald cols) with barcode scanner and gradient selected-attendee detail, arrived column with running-total badge, purchase modal. CSS massively reduced: `crm-visual.css` 347→20, `crm-components.css` 276→76, `crm-screens.css` 325→98. No DB changes, no new features, no business logic changes. 18 JS files unchanged (no splits needed). |
| Go-Live P1 — Internal Lead Intake Pipeline | ✅ CLOSED | `lead-intake` Edge Function (241 lines, `verify_jwt: false`) deployed to Supabase. Accepts public form POSTs, validates payload (tenant_slug + name + phone required), resolves tenant by slug, normalizes Israeli phones to E.164 (`0XXXXXXXXX → +972XXXXXXXXX`), duplicate-checks by (tenant_id, phone), inserts `crm_leads` with `status='new'` and `source='supersale_form'`. Stores `eye_exam` inside `client_notes` (no schema change). 17/17 §3 criteria passed via curl test protocol on demo tenant. No messages sent here — dispatch deferred to P3+P4. |
| Go-Live P2a — Lead Management | ✅ CLOSED | New file `modules/crm/crm-lead-actions.js` (230 lines). Five features wired: (1) individual status change via clickable badge in lead-detail header opens tier-filtered dropdown → `crm_leads.status` UPDATE + `crm_lead_notes` INSERT "סטטוס שונה מ-X ל-Y"; (2) bulk status change from registered-tab bulk bar opens modal grid of Tier 2 statuses, loops per-lead writes; (3) add-note textarea + "הוסף" button at top of notes tab, prepends to list without reload, Ctrl+Enter submits; (4) Tier 1→2 transfer via green "אשר ✓" button in new "פעולה" column on incoming table — updates status to `waiting`, inserts note "הועבר ל-Tier 2 (אושר)", refreshes both tabs; (5) row click → `openCrmLeadDetail` wired on incoming tab (registered already had it); detail modal falls back to `getCrmIncomingLeadById` when `getCrmLeadById` returns null. Two pre-flight fixes: demo `crm_statuses` cloned from Prizma (31 rows), and `.husky/pre-commit` `set +e` fix so warnings don't block commits. No schema changes. |
| Go-Live P2b — Event Management | ✅ CLOSED | Two new files: `modules/crm/crm-event-actions.js` (266 lines) + `modules/crm/crm-event-register.js` (122 lines). Three features wired: (1) **Event creation** — "יצירת אירוע +" button in events tab opens modal with campaign dropdown, name/date/time/location/waze/capacity/fee/coupon, auto-numbering via `next_crm_event_number` RPC, campaign-based defaults that re-seed when campaign changes; (2) **Event status change** — "שנה סטטוס" button in detail modal gradient header opens anchored dropdown with all 10 event statuses from `CRM_STATUSES._all`, updates `crm_events.status` + live-updates badge via `data-role="event-status-badge"`; (3) **Register lead to event** — "רשום משתתף +" button in attendees sub-tab opens search modal filtered to Tier 2 leads, debounced (200ms) name/phone/email search via `ilike`, click-to-register calls `register_lead_to_event` RPC with 4 Toast branches (registered/waiting_list/already_registered/event_not_found). Pre-flight: demo campaign cloned from Prizma's `supersale` (1 row seed). Mid-execution hotfix: `register_lead_to_event` RPC had a pre-existing Postgres bug — `SELECT COUNT(*) ... FOR UPDATE` is invalid on aggregates — fixed per Daniel authorization, canonical SQL at `go-live/hotfix-register-lead-to-event.sql`. No schema changes beyond the RPC body fix. All 15 §3 success criteria passed; all 6 §13 tests passed with DB verification. |
| B9 — Visual QA & Functional Verification | ✅ CLOSED (attempt 2) | Attempt 1 re-opened by Foreman: Cowork sandbox lacked localhost access so the core visual+functional QA was never executed; only 4 peripheral commits were made. Attempt 2 ran under Claude Code on Daniel's Windows desktop via chrome-devtools MCP so the browser was actually driven. All 5 CRM screens opened on `?t=prizma` (893 leads, 11 events), screenshotted, and structurally matched against FINAL-01..FINAL-05 mockups (dark theme out of scope per B6). Two visual gaps fixed: (1) `crm-leads-tab.js` — added `odd:bg-white even:bg-slate-50/60` zebra striping to CLS_ROW per FINAL-02; (2) `crm-event-day.js` — swapped CLS_HEADER from white card to dark `bg-slate-800` top bar with sky-300 back link + white title + emerald-500/20 clock + slate-700 role toggle per FINAL-05. Functional QA on `?t=demo` (page loads, 0 console errors, empty state renders correctly — no seed data per M4-DATA-03) + `?t=prizma` read-only (all 5 tabs navigable, lead detail modal with 5 sub-tabs and 4 gradient action buttons, event detail modal with gradient header + capacity bar + 6 KPI cards + SVG funnel, event day entry with 5 counter cards and 3-column check-in layout, messaging hub with all 4 sub-tabs). 0 console errors throughout. No DB changes. |

## What's Next

**Go-Live P3:** Make Message Dispatcher — build the generic Make scenario that receives webhook with `template_slug + recipient + variables`, dispatches SMS/Email/WhatsApp, logs result. This is the pipe; P4 wires the CRM triggers into it and P5 fills in the message content.

**Full roadmap:** ~~P1~~ ✅ → ~~P2a~~ ✅ → ~~P2b~~ ✅ → P3 (Make message dispatcher) → P4 (connect CRM→Make triggers) → P5 (message content) → P6 (full demo test) → P7 (Prizma cutover). See `modules/Module 4 - CRM/go-live/ROADMAP.md`.

**P1 follow-ups (not blockers):**
- Storefront form still POSTs to Make webhook; repointing to `/functions/v1/lead-intake` will land as a separate storefront-repo SPEC (or as part of P4 cutover).
- `verify_jwt: false` + `Access-Control-Allow-Origin: *` are permissive on purpose (public form). Tighten origin + add rate limiting in P7 when production domain set is known.
- Race-condition safety implemented (23505 unique_violation caught + converted to 409), but not exercised under load — stress test in P6.

**Open from B8:**
- Tailwind CDN runs a JIT compiler in-browser (~15KB gzipped). Fine for an internal tool but could be switched to a static extracted CSS file in a future SPEC if startup latency ever matters.
- Some `rule-21-orphans` false positives were flagged during B8 (IIFE-local helpers with shared names: `toast`, `logWrite`, `formatTime`, `initials`, `doCheckIn`, `updateLocal`, `logActivity`). Pre-existing; the hook is informational, not blocking (same M4-TOOL-01 / B3 TOOL-DEBT-01 detector issue).
- CRM-wide font switched from the ERP default to Heebo via Tailwind `fontFamily.heebo`; the shell still pulls Heebo from Google Fonts.

**Open from B7:**
- Messaging Hub split-layout runtime wiring: B7 delivers the sidebar+editor split inside `renderMessagingTemplates` but the orchestrator `crm-messaging-tab.js` still overwrites `#tab-messaging` with a single body before delegating. Visually works because templates render the split internally — but a follow-up should lift the split into the orchestrator so Rules + Broadcast + Log sub-tabs can also use it.
- Wizard "later" scheduling is UI-only (no backing storage); live schedule will land with B8's scheduler.
- Activity feed items on the dashboard are derived from `eventStats` rather than a real activity log — follow-up is to read from `activity_log` when that pipeline exists.
- Sparkline trailing values in the KPI cards are synthesized from current counts (0.6 → 0.75 → 0.85 → 0.95 → 1.0 of total). Real time-series will require historical snapshots.
- Dark-theme palette per FINAL-01 mockup still not adopted — preserved per original B6 SPEC §10 instruction.

**Open from B6 (still valid):**
- Full 3-column event-day layout is now wired in JS (B7 closed this follow-up). ✅

**Before merge to main:**
- Daniel QA pass on crm.html (manual) — covers B6 behavioral criteria 18-20 (page loads zero errors, tab switching, role toggle hides revenue), deferred per SPEC §3.
- Optional: `CRM_DEMO_SEED` SPEC to unblock automated browser testing.
- Merge develop → main once Daniel is satisfied with QA.
