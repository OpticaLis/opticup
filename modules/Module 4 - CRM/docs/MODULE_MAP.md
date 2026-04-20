# Module 4 — CRM: Module Map

> **Last updated:** 2026-04-20 (Phase B3 close)

---

## Files

### HTML & CSS
| File | Lines | Purpose |
|------|-------|---------|
| `crm.html` | 106 | Main CRM page — 3 tabs (Dashboard, Leads, Events), nav, filter bars |
| `css/crm.css` | 102 | CRM-specific styles: stat cards, tables, badges, bars, pagination, detail modal |

### JavaScript — `modules/crm/`
| File | Lines | Purpose |
|------|-------|---------|
| `crm-init.js` | 73 | Page bootstrap, tab orchestration (`showCrmTab`), status cache gate, error banner |
| `crm-helpers.js` | 118 | Shared utilities: phone format, currency, date, language, status cache/badges |
| `crm-dashboard.js` | 163 | Dashboard tab: stat cards, event performance table, lead status distribution bars |
| `crm-leads-tab.js` | 222 | Leads tab: load all leads, filter/sort/search, client-side pagination (50/page) |
| `crm-leads-detail.js` | 163 | Lead detail modal: info grid, notes list, event history table, tags |
| `crm-events-tab.js` | 115 | Events tab: load events from `v_crm_event_stats`, filter by status |
| `crm-events-detail.js` | 170 | Event detail modal: event info, stats summary, attendees table with search |

### Modified shared files
| File | Change | Phase |
|------|--------|-------|
| `index.html` | Added CRM card to MODULES config array (line 152) | B3 |
| `js/shared.js` | Added FIELD_MAP entries for `crm_leads`, `crm_events`, `crm_lead_notes`, `crm_event_attendees` (+29 lines) | B3 |

### Migration & import scripts (campaign-scoped)
| File | Purpose | Phase |
|------|---------|-------|
| `campaigns/supersale/migrations/001_crm_schema.sql` | Full schema: 23 tables, RLS, Views, RPCs, seeds | A |
| `campaigns/supersale/scripts/import-monday-data.mjs` | Monday xlsx parser | B2 |
| `campaigns/supersale/scripts/rest-import.mjs` | PostgREST bulk import runner | B2 |
| `campaigns/supersale/DATA_DISCOVERY_REPORT.md` | Analysis of 9 Monday export boards | B1 |

---

## Global Functions (exposed on `window`)

| Function | File | Purpose |
|----------|------|---------|
| `showCrmTab(name)` | crm-init.js | Switch between dashboard/leads/events tabs |
| `ensureCrmStatusCache()` | crm-init.js | Load `crm_statuses` table once, cache in `CRM_STATUSES` |
| `showCrmError(panelId, msg)` | crm-init.js | Display error banner in a tab panel |
| `loadCrmDashboard()` | crm-dashboard.js | Fetch + render dashboard (stat cards, event table, status bars) |
| `loadCrmLeadsTab()` | crm-leads-tab.js | Fetch all leads, populate filters, render paginated table |
| `getCrmLeadById(id)` | crm-leads-tab.js | Return cached lead row by ID (for detail modal) |
| `openCrmLeadDetail(leadId)` | crm-leads-detail.js | Open lead detail modal (info + notes + events) |
| `loadCrmEventsTab()` | crm-events-tab.js | Fetch events from `v_crm_event_stats`, render table |
| `getCrmEventStatsById(id)` | crm-events-tab.js | Return cached event stats row by ID |
| `openCrmEventDetail(eventId)` | crm-events-detail.js | Open event detail modal (info + stats + attendees) |

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
| `v_crm_event_stats` | crm-events-tab.js, crm-dashboard.js | Event-level aggregates (11 rows) |
| `v_crm_lead_event_history` | crm-leads-detail.js, crm-dashboard.js | Lead-level event history + returning flag |
| `v_crm_event_attendees_full` | crm-events-detail.js | Event attendees with lead info |
| `crm_leads` | crm-dashboard.js | Direct count queries for dashboard stats |
| `crm_lead_notes` | crm-leads-detail.js | Notes for lead detail modal |
| `crm_events` | crm-events-detail.js | Single event row for detail modal |
| `crm_statuses` | crm-helpers.js | Status labels + colors (31 seed rows) |

---

## Dependencies

- `shared.js` — `sb`, `getTenantId()`, `escapeHtml()`, `FIELD_MAP`, `TENANT_SLUG`
- `shared-ui.js` — not directly used (CRM has own tab system)
- `auth-service.js` — `resolveTenant()`, `loadSession()`, `applyUIPermissions()`
- `shared/js/modal-builder.js` — `Modal.show()` for detail modals
- `shared/js/activity-logger.js` — `ActivityLog.write()` (fire-and-forget on page open)
