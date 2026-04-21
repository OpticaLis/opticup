# Module 4 — CRM: Module Map

> **Last updated:** 2026-04-21 (Go-Live P1 — Internal Lead Intake Edge Function)

---

## Files

### HTML & CSS
| File | Lines | Purpose |
|------|-------|---------|
| `crm.html` | 305 | Main CRM page — sidebar nav (5 tabs), role toggle, page header, 5 tab panels with skeleton containers, 18 CRM script tags. **[B8]** Loads Tailwind CDN + `tailwind.config` (RTL, Heebo, custom `crm.*` palette) |
| `css/crm.css` | 215 | Foundation: palette tokens, base, sidebar, page header, tab panels, role visibility, responsive, utilities |
| `css/crm-components.css` | 76 | **[B8]** Reduced from 276 → shell only: cards, filter bar, table-wrap, view toggle, badge (legacy helper), leads-view show/hide |
| `css/crm-screens.css` | 98 | **[B8]** Reduced from 325 → shell only: KPI grid + loading shimmer, alert strip, activity feed, timeline scroll, messaging split, event-day counter-bar + 3-col grid + barcode input |
| `css/crm-visual.css` | 20 | **[B8]** Reduced from 347 → near-empty placeholder (pagination baseline + legacy pulse keyframe). All B7 visual components moved into JS as Tailwind classes |

### JavaScript — `modules/crm/` (19 files, all ≤350 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `crm-init.js` | 75 | Page bootstrap, tab orchestration stub, status cache gate, error banner |
| `crm-bootstrap.js` | 105 | **[B6]** Extracted from crm.html inline JS: page header updater, theme switcher, `toggleCrmRole()`, `switchCrmLeadsView()`, Lucide init, barcode auto-focus on event-day entry |
| `crm-helpers.js` | 140 | **[C1]** Shared utilities: phone format, currency, date, language, status cache/badges. Added `TIER1_STATUSES` + `TIER2_STATUSES` constants (exported on window) |
| `crm-lead-actions.js` | 230 | **[P2a]** Lead mutation helpers + UI flows. Exports `CrmLeadActions.{changeLeadStatus, bulkChangeStatus, addLeadNote, transferLeadToTier2, openStatusDropdown, openBulkStatusPicker, leadTier}`. Direct Supabase writes with `tenant_id: getTenantId()` on every `.update()/.insert()/.eq()` (Rule 22). Status change inserts audit note "סטטוס שונה מ-X ל-Y". |
| `crm-incoming-tab.js` | 202 | **[C1 + P2a]** Tier 1 "לידים נכנסים" tab: fetch leads from `v_crm_leads_with_tags` (full field set as of P2a), status filter dropdown, search, paginated table with new "פעולה" column (green "אשר ✓" button → `transferLeadToTier2`). Rows clickable → `openCrmLeadDetail`. Exports `reloadCrmIncomingTab` + `getCrmIncomingLeadById`. |
| `crm-dashboard.js` | 295 | **[B8]** Dashboard via Tailwind: 4 gradient KPI cards (indigo/cyan/emerald/amber) with per-variant sparkline bars, 3-column alert strip, gradient stacked bar chart, 3 conic-gradient gauges (inline style), animate-pulse activity feed, horizontal timeline cards with progress bars |
| `crm-leads-tab.js` | 313 | **[B8 + P2a]** Leads via Tailwind: white-card table, indigo filter chips, indigo bulk bar (now with working "שנה סטטוס" → `CrmLeadActions.openBulkStatusPicker`), pagination, delegates kanban + cards to `crm-leads-views.js`. Exports `reloadCrmLeadsTab`. |
| `crm-leads-views.js` | 112 | **[B8]** Kanban (4 status columns with colored headers — emerald/amber/violet/indigo) + Cards (3-col grid with gradient avatars + tag pills) |
| `crm-leads-detail.js` | 295 | **[B8 + P2a]** Lead detail modal via Tailwind: gradient-avatar header + clickable status badge → tier-filtered dropdown (P2a) + 5 underline tabs (events/messages/notes/timeline/details) — notes tab has textarea + "הוסף" button at top (P2a) + 4 gradient action buttons. Falls back to `getCrmIncomingLeadById` when `getCrmLeadById` misses. |
| `crm-events-tab.js` | 125 | **[B8]** Events list via Tailwind: white-card table, indigo event number, emerald revenue column (admin-only) |
| `crm-events-detail.js` | 206 | **[B8]** Event detail modal: gradient header (indigo→violet) with glass-morphism controls, segmented capacity bar, 3 sub-tabs, grouped attendee list with gradient avatars, delegates KPI+funnel+analytics to `crm-events-detail-charts.js` |
| `crm-events-detail-charts.js` | 201 | **[B8]** 6 gradient KPI cards with trend arrows (sky/emerald/amber/violet), SVG funnel wrapped in white chart card, gradient analytics bars |
| `crm-event-day.js` | 196 | **[B8]** Event Day main: 5 gradient counter cards (sky/violet/emerald/amber/teal) with tabular-nums, live clock with animate-pulse dot, role toggle, sub-tab routing |
| `crm-event-day-checkin.js` | 217 | **[B8]** Check-in 3-column grid: LEFT waiting (amber) with overdue/selected states + CENTER dark barcode scanner (slate-900 + emerald) with gradient selected-attendee detail card (indigo→violet) + RIGHT delegates to arrived column |
| `crm-event-day-schedule.js` | 160 | **[B8]** Scheduled times: grouped chip board (white chips + emerald checked-in) |
| `crm-event-day-manage.js` | 278 | **[B8]** Manage table (Tailwind) + arrived column widget (waiting-to-purchase + purchased sections with amount badges) + running-total bar + purchase amount modal with 3xl tabular-nums input |
| `crm-messaging-tab.js` | 101 | **[B8]** Messaging Hub orchestrator — rounded tab bar with indigo underline active state, 4 sub-tabs |
| `crm-messaging-templates.js` | 304 | **[B8]** Templates split layout: sidebar (category tabs, search, template cards) + editor (toolbar, dark slate-900 code editor with line numbers, variable dropdown, 3-panel preview WhatsApp emerald / SMS sky / Email amber) |
| `crm-messaging-rules.js` | 234 | **[B8]** Rules table via Tailwind: colored channel badges (sky/emerald/amber), pill toggle for active state, warning callout (amber border-s), modal with JSON textarea |
| `crm-messaging-broadcast.js` | 341 | **[B8]** 5-step wizard with progress connectors (green ✓ on completed, indigo ring on active), step body Tailwind forms, message log with status chip pills (sky sent / emerald delivered / indigo read / rose failed), channel + status filters, pagination |

### Modified shared files
| File | Change | Phase |
|------|--------|-------|
| `index.html` | Added CRM card to MODULES config array (line 152) | B3 |
| `js/shared.js` | Added FIELD_MAP entries for `crm_leads`, `crm_events`, `crm_lead_notes`, `crm_event_attendees` (+29 lines) | B3 |

### Edge Functions — `supabase/functions/` (owned by Module 4)
| Slug | Files | Lines | Phase | Purpose |
|------|-------|-------|-------|---------|
| `lead-intake` | `index.ts` + `deno.json` | 241 | P1 | Public form intake: validate payload, resolve tenant by slug, normalize Israeli phones to E.164, duplicate-check (tenant_id, phone), INSERT `crm_leads` with `status='new'`. Returns 201 `{id, is_new: true}` on new, 409 `{duplicate, existing_name}` on dup, 400 on validation fail, 401 on unknown tenant. `verify_jwt: false` (public endpoint). Uses `SUPABASE_SERVICE_ROLE_KEY` server-side to bypass RLS. |

### Migration & import scripts (campaign-scoped)
| File | Purpose | Phase |
|------|---------|-------|
| `campaigns/supersale/migrations/001_crm_schema.sql` | Full schema: 23 tables, RLS, Views, RPCs, seeds (incl. 4 messaging tables: `crm_message_templates`, `crm_automation_rules`, `crm_broadcasts`, `crm_message_log`) | A |
| `campaigns/supersale/scripts/import-monday-data.mjs` | Monday xlsx parser | B2 |
| `campaigns/supersale/scripts/rest-import.mjs` | PostgREST bulk import runner | B2 |
| `campaigns/supersale/DATA_DISCOVERY_REPORT.md` | Analysis of 9 Monday export boards | B1 |

---

## Global Functions (exposed on `window`)

| Function | File | Purpose |
|----------|------|---------|
| `showCrmTab(name)` | crm-init.js | Switch between dashboard/incoming/leads/events/messaging/event-day tabs |
| `ensureCrmStatusCache()` | crm-init.js | Load `crm_statuses` table once, cache in `CRM_STATUSES` |
| `showCrmError(panelId, msg)` | crm-init.js | Display error banner in a tab panel |
| `loadCrmDashboard()` | crm-dashboard.js | Fetch + render dashboard (stat cards, event table, status bars) |
| `loadCrmIncomingTab()` | crm-incoming-tab.js | **[C1]** Fetch Tier 1 leads, populate status filter, render table with search |
| `reloadCrmIncomingTab()` | crm-incoming-tab.js | **[P2a]** Force re-fetch of Tier 1 leads and re-render (bypasses load-once cache; used after status change / transfer) |
| `getCrmIncomingLeadById(id)` | crm-incoming-tab.js | **[P2a]** Return cached incoming (Tier 1) lead row by ID — used as fallback by `openCrmLeadDetail` |
| `loadCrmLeadsTab()` | crm-leads-tab.js | Fetch Tier 2 leads (was: all leads), populate filters, render paginated table |
| `reloadCrmLeadsTab()` | crm-leads-tab.js | **[P2a]** Force re-fetch of Tier 2 leads and re-render; called by bulk status change, transfer, and individual status change |
| `getCrmLeadById(id)` | crm-leads-tab.js | Return cached lead row by ID (for detail modal) |
| `openCrmLeadDetail(leadId)` | crm-leads-detail.js | Open lead detail modal (info + notes + events). **[P2a]** Now falls back to `getCrmIncomingLeadById` when primary getter misses, so rows on both incoming and registered tabs open the same modal |
| `CrmLeadActions.changeLeadStatus(id, newStatus, oldStatus, opts?)` | crm-lead-actions.js | **[P2a]** Atomic status update + audit note (Hebrew "סטטוס שונה מ-X ל-Y"). `opts.silent` skips toast (used by bulk) |
| `CrmLeadActions.bulkChangeStatus(ids, newStatus)` | crm-lead-actions.js | **[P2a]** Per-lead loop; pre-fetches current statuses in one query for accurate audit notes; returns `{ok, fail[]}` |
| `CrmLeadActions.addLeadNote(leadId, content)` | crm-lead-actions.js | **[P2a]** Insert a free-text note into `crm_lead_notes`. Returns the new row |
| `CrmLeadActions.transferLeadToTier2(leadId)` | crm-lead-actions.js | **[P2a]** Set status='waiting' + insert note "הועבר ל-Tier 2 (אושר)" |
| `CrmLeadActions.openStatusDropdown(anchor, tier, currentStatus, onPick)` | crm-lead-actions.js | **[P2a]** Tier-filtered anchored dropdown; fixed-positioned, closes on outside click |
| `CrmLeadActions.openBulkStatusPicker(ids, tier, onDone)` | crm-lead-actions.js | **[P2a]** Modal grid of statuses for bulk change |
| `CrmLeadActions.leadTier(status)` | crm-lead-actions.js | **[P2a]** Returns 1 or 2 based on TIER1_STATUSES / TIER2_STATUSES membership |
| `loadCrmEventsTab()` | crm-events-tab.js | Fetch events from `v_crm_event_stats`, render table |
| `getCrmEventStatsById(id)` | crm-events-tab.js | Return cached event stats row by ID |
| `openCrmEventDetail(eventId)` | crm-events-detail.js | Open event detail modal (info + stats + attendees + event-day entry) |
| `loadCrmEventDay()` | crm-event-day.js | Entry point for hidden Event Day tab |
| `getEventDayState()` | crm-event-day.js | Return current `{ eventId, event, attendees, stats, subTab }` |
| `refreshEventDayStats()` | crm-event-day.js | Re-fetch `v_crm_event_stats` and re-render stats bar |
| `renderEventDaySubTab()` | crm-event-day.js | Route to active sub-tab renderer |
| `renderEventDayCheckin(host)` | crm-event-day-checkin.js | Render check-in sub-tab contents |
| `renderEventDaySchedule(host)` | crm-event-day-schedule.js | Render scheduled-times board |
| `renderEventDayManage(host)` | crm-event-day-manage.js | Render attendee management sub-tab |
| `loadCrmMessagingTab()` | crm-messaging-tab.js | Entry point for Messaging Hub tab |
| `showMessagingSub(key)` | crm-messaging-tab.js | Switch active messaging sub-tab (templates/rules/broadcast/log) |
| `getMessagingSubTab()` | crm-messaging-tab.js | Current sub-tab key |
| `renderMessagingActiveSub()` | crm-messaging-tab.js | Re-render the currently active messaging sub-tab |
| `renderMessagingTemplates(host)` | crm-messaging-templates.js | Templates sub-tab: list + toolbar |
| `loadMessagingTemplates()` | crm-messaging-templates.js | Force refresh of template cache |
| `_crmMessagingTemplates()` | crm-messaging-templates.js | Internal: expose cached templates list to sibling files |
| `renderMessagingRules(host)` | crm-messaging-rules.js | Automation rules sub-tab: list + toolbar |
| `loadMessagingRules()` | crm-messaging-rules.js | Force refresh of rules cache |
| `renderMessagingBroadcast(host)` | crm-messaging-broadcast.js | Broadcast sub-tab: filter + recipient preview + send |
| `renderMessagingLog(host)` | crm-messaging-broadcast.js | Log sub-tab: history table + filters + pagination |
| `loadMessagingLog()` | crm-messaging-broadcast.js | Force refresh of log rows |

### Shared namespace: `window.CrmHelpers`
| Method | Purpose |
|--------|---------|
| `formatPhone(raw)` | `+972507175675` → `050-717-5675` |
| `formatCurrency(n)` | `39460` → `₪39,460` |
| `formatDate(iso)` | `2026-03-27` → `27.03.2026` |
| `formatDateTime(iso)` | Date + HH:MM |
| `formatLanguage(code)` | `he` → `עברית` |
| `loadStatusCache()` | Fetch `crm_statuses` → `window.CRM_STATUSES` |
| `getStatusInfo(type, slug)` | Returns `{ label, color }` from cache |
| `statusBadgeHtml(type, slug)` | Returns safe HTML badge string |
| `distinctValues(rows, key)` | Unique values from array for filter dropdowns |
| `heCompare(a, b)` | Hebrew-locale string comparison |

---

## Data Sources (Views & Tables)

| View/Table | Used by | Purpose |
|------------|---------|---------|
| `v_crm_leads_with_tags` | crm-leads-tab.js | All leads with tag arrays (893 rows) |
| `v_crm_event_stats` | crm-events-tab.js, crm-dashboard.js, crm-event-day.js | Event-level aggregates (11 rows) |
| `v_crm_lead_event_history` | crm-leads-detail.js, crm-dashboard.js | Lead-level event history + returning flag |
| `v_crm_event_attendees_full` | crm-events-detail.js, crm-event-day.js | Event attendees with lead info |
| `crm_leads` | crm-dashboard.js, crm-messaging-broadcast.js | Direct count queries for dashboard, lead-id filter for broadcast recipients, name lookup for log display. **[C1]** Also used by Make scenario for duplicate check (HTTP GET) and insert (HTTP POST) |
| `crm_lead_notes` | crm-leads-detail.js | Notes for lead detail modal |
| `crm_events` | crm-events-detail.js, crm-event-day.js, crm-messaging-broadcast.js | Single event row for detail modal, event list for broadcast filter dropdown |
| `crm_event_attendees` | crm-event-day-manage.js, crm-messaging-broadcast.js | Direct updates (purchase/coupon/fee) and lead_id lookup for event filter |
| `crm_statuses` | crm-helpers.js, crm-messaging-broadcast.js | Status labels + colors (31 seed rows), filter dropdown source |
| `crm_message_templates` | crm-messaging-templates.js, crm-messaging-rules.js, crm-messaging-broadcast.js | Templates CRUD, template picker in rules + broadcasts, name lookup for log display |
| `crm_automation_rules` | crm-messaging-rules.js | Rules CRUD |
| `crm_broadcasts` | crm-messaging-broadcast.js | Broadcast records (insert on send) |
| `crm_message_log` | crm-messaging-broadcast.js | Message history with channel/status/date filters, paginated |

### RPCs
| RPC | Caller | Purpose |
|-----|--------|---------|
| `check_in_attendee(p_tenant_id, p_attendee_id)` | crm-event-day-checkin.js | Atomic check-in: sets `checked_in_at` + `status='attended'` |

---

## Dependencies

- `shared.js` — `sb`, `getTenantId()`, `escapeHtml()`, `FIELD_MAP`, `TENANT_SLUG`, `loadSession()`
- `shared-ui.js` — not directly used (CRM has own tab system)
- `auth-service.js` — `resolveTenant()`, `loadSession()`, `applyUIPermissions()`
- `shared/js/modal-builder.js` — `Modal.show()`, `Modal.form()`, `Modal.confirm()` for detail/edit/send modals
- `shared/js/toast.js` — `Toast.success/error/warning/show()` for user feedback
- `shared/js/activity-logger.js` — `ActivityLog.write()` (fire-and-forget on every write)
