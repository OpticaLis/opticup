# Module 4 — CRM: Module Map

> **Last updated:** 2026-04-20 (Phase B5 close)

---

## Files

### HTML & CSS
| File | Lines | Purpose |
|------|-------|---------|
| `crm.html` | 121 | Main CRM page — 4 visible tabs (Dashboard, Leads, Events, Messaging) + 1 hidden tab (Event Day), nav, filter bars, 13 CRM script tags |
| `css/crm.css` | 173 | CRM-specific styles: stat cards, tables, badges, bars, pagination, detail modal, Event Day sub-nav/chips/manage controls, Messaging sub-nav/toggle/chips/form rows |

### JavaScript — `modules/crm/`
| File | Lines | Purpose |
|------|-------|---------|
| `crm-init.js` | 75 | Page bootstrap, tab orchestration (`showCrmTab`), status cache gate, error banner |
| `crm-helpers.js` | 118 | Shared utilities: phone format, currency, date, language, status cache/badges |
| `crm-dashboard.js` | 163 | Dashboard tab: stat cards, event performance table, lead status distribution bars |
| `crm-leads-tab.js` | 222 | Leads tab: load all leads, filter/sort/search, client-side pagination (50/page) |
| `crm-leads-detail.js` | 163 | Lead detail modal: info grid, notes list, event history table, tags |
| `crm-events-tab.js` | 115 | Events tab: load events from `v_crm_event_stats`, filter by status |
| `crm-events-detail.js` | 191 | Event detail modal: event info, stats summary, attendees table, "מצב יום אירוע" entry button |
| `crm-event-day.js` | 186 | Event Day main view — layout, stats bar, sub-tab routing, state management |
| `crm-event-day-checkin.js` | 152 | Event Day check-in sub-tab: search, כניסה button → `check_in_attendee` RPC |
| `crm-event-day-schedule.js` | 160 | Event Day scheduled-times board: grouped chips per time slot, click-to-check-in |
| `crm-event-day-manage.js` | 232 | Event Day attendee management: purchase amount input, coupon toggle, booking fee toggle |
| `crm-messaging-tab.js` | 107 | Messaging Hub orchestrator — 4 sub-tabs (templates / rules / broadcast / log) |
| `crm-messaging-templates.js` | 238 | Templates CRUD (`crm_message_templates`): list, create/edit modal with variable chips, active toggle |
| `crm-messaging-rules.js` | 218 | Automation Rules CRUD (`crm_automation_rules`): list, trigger-based modal with JSON condition, channel checkboxes, template picker |
| `crm-messaging-broadcast.js` | 297 | Manual broadcast + message log: filter bar, live recipient count, send with confirmation, log table with filters + 50/page pagination |

### Modified shared files
| File | Change | Phase |
|------|--------|-------|
| `index.html` | Added CRM card to MODULES config array (line 152) | B3 |
| `js/shared.js` | Added FIELD_MAP entries for `crm_leads`, `crm_events`, `crm_lead_notes`, `crm_event_attendees` (+29 lines) | B3 |

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
| `showCrmTab(name)` | crm-init.js | Switch between dashboard/leads/events/messaging/event-day tabs |
| `ensureCrmStatusCache()` | crm-init.js | Load `crm_statuses` table once, cache in `CRM_STATUSES` |
| `showCrmError(panelId, msg)` | crm-init.js | Display error banner in a tab panel |
| `loadCrmDashboard()` | crm-dashboard.js | Fetch + render dashboard (stat cards, event table, status bars) |
| `loadCrmLeadsTab()` | crm-leads-tab.js | Fetch all leads, populate filters, render paginated table |
| `getCrmLeadById(id)` | crm-leads-tab.js | Return cached lead row by ID (for detail modal) |
| `openCrmLeadDetail(leadId)` | crm-leads-detail.js | Open lead detail modal (info + notes + events) |
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
| `crm_leads` | crm-dashboard.js, crm-messaging-broadcast.js | Direct count queries for dashboard, lead-id filter for broadcast recipients, name lookup for log display |
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
