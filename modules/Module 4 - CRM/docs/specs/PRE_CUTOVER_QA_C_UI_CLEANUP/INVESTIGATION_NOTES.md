# INVESTIGATION_NOTES — PRE_CUTOVER_QA_C_UI_CLEANUP

> **Investigated:** 2026-05-01 (executor commit 1 of 5 per SPEC §9).
> **Scope:** confirm B3 call sites, B9 multisale FK + scope, B10 entry-point
> + crm_statuses readiness.

---

## 1. B3 — date format

### 1.1 Existing helper (Rule 21)

`modules/crm/crm-helpers.js:54-62` — `CrmHelpers.formatDate(iso)` ALREADY EXISTS:

```js
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yy = d.getFullYear();
  return dd + '.' + mm + '.' + yy;
}
```

Plus `formatDateTime(iso)` at line 64-71 which composes date + " HH:MM".

**Conclusion:** SPEC §1.5 hint to "extract from event-register.js" is obsolete — the helper IS already in `crm-helpers.js`, exported on `window.CrmHelpers`. B3 reduces to: replace the 2 raw `toLocaleDateString` calls with `CrmHelpers.formatDate(...)`. No new helper, no extraction (Rule 21 honored — extends existing exports rather than creating parallel).

The standalone `formatDate` at `event-register.js:15-20` is for the public registration form (a separate page that does NOT load `crm-helpers.js`); leaving it as a local helper is correct. Same shape, no functional drift.

### 1.2 Call sites to migrate

`grep -rn "toLocaleDateString" modules/crm/ crm.html` returns exactly **2 hits in CRM admin code** (per §1.5 pre-flight):

| File | Line | Current | After |
|---|---|---|---|
| `modules/crm/crm-payment-helpers.js` | 114 | `_esc(exp.toLocaleDateString('he-IL'))` | `_esc(CrmHelpers.formatDate(attendeeRow.credit_expires_at))` |
| `modules/crm/crm-notifications-bell.js` | 87 | `_esc(new Date(r.expires_at).toLocaleDateString('he-IL'))` | `_esc(CrmHelpers.formatDate(r.expires_at))` |

Both are credit-pending UI surfaces. Both already pass `_esc(...)` for HTML safety; we just swap the inner formatter.

### 1.3 Convention

DD.**MM**.YYYY with **dot** separator (matches existing helper). SPEC §3 #6 originally said slash, but §1.5 explicitly overrides to dot to match existing helper output. Rule 21 wins.

---

## 2. B9 — multisale removal

### 2.1 Live DB state

```sql
SELECT t.slug AS tenant, c.id, c.slug, c.name FROM crm_campaigns c
JOIN tenants t ON t.id = c.tenant_id WHERE c.slug = 'multisale';
```

Result:

| tenant | id | slug | name |
|---|---|---|---|
| prizma | f5aebad0-c050-4919-8956-aaaa9b96cdd0 | multisale | MultiSale |

Single row, prizma only. **Demo has no multisale row** (already clean).

### 2.2 FK check

`information_schema.constraint_column_usage` says `crm_campaigns.id` is referenced by ONE FK: `crm_events.campaign_id` (`crm_events_campaign_id_fkey`).

```sql
SELECT COUNT(*) FROM crm_events WHERE campaign_id = 'f5aebad0-...';
```

Returns **0** (across both `is_deleted=true` and `is_deleted=false`). Cross-checked `crm_ad_spend.campaign_id` → 0. (`crm_unit_economics` does not have a `campaign_id` column at all — uses a separate keying scheme.)

**Conclusion:** the prizma multisale row has zero dependents. DELETE is safe. SPEC §5 stop trigger inactive.

### 2.3 Seed file

`campaigns/supersale/migrations/001_crm_schema.sql` lines 1133 + 1140:
- Line 1133: `INSERT INTO crm_campaigns (...) VALUES ('6ad0781b-...', 'multisale', 'MultiSale', ...)`
- Line 1140: `INSERT INTO crm_statuses (...) VALUES ('6ad0781b-...', 'MultiSale', '#3b82f6', 'campaign', 2)`

Both lines must go in B9. The second is a campaign-type status entry (entity_type='campaign') that exists alongside event/lead/attendee statuses.

### 2.4 Reference scope

`grep -ri "multisale"` returns 40+ files. Most are:
- This SPEC + ACTIVATION_PROMPT (doesn't count).
- Historical campaign discovery / Monday-import / data-discovery docs (preserve as historical).
- Older module SPECs (CRM_PHASE_*, M4_CAMPAIGNS_*) that are part of the project's frozen history.
- Research mockups in `outputs/campaign-mockups/` and `__LAUNCH_PLAN_DRAFT__/site-overseer/` (research artifacts, leave alone — SPEC §3 #11 confirms).

**Active code/seed files referencing multisale that need touching:**
- `campaigns/supersale/migrations/001_crm_schema.sql` (the seed — 2 lines)
- `campaigns/supersale/scripts/import-monday-data.mjs` — uses MULTISALE id constant for column transforms; LEAVE because the import script is historical / re-runnable
- `campaigns/supersale/scripts/rest-import.mjs` — same

Conservative: B9 touches the seed file + DB DELETE + SESSION_CONTEXT/CHANGELOG/HANDOFF entry. Historical specs/scripts left alone with their existing references — they describe a state the project HAD, not what it has now.

---

## 3. B10 — status colors modal

### 3.1 Schema readiness

`crm_statuses` rows by entity_type (cross-tenant):

| entity_type | rows | with non-null color |
|---|---:|---:|
| attendee | 22 | 22 |
| event | 20 | 20 |
| lead | 26 | 26 |

All 68 rows already carry a color value. No DDL needed. B10 only needs to:
1. Render the existing color in event-status badges across the UI.
2. Add a settings modal to UPDATE colors per-tenant.

### 3.2 Entry point (per §1.5 pre-resolved)

`crm.html:283-284` is the events-tab toolbar:

```html
<select id="crm-events-filter-status" ...>...</select>
<button type="button" id="crm-events-create-btn" ...>יצירת אירוע +</button>
```

Plan: insert a `<button id="crm-events-status-colors-btn" title="ניהול צבעי סטטוס">⚙️</button>` between the filter and the create button. Single-click handler in a new file `modules/crm/crm-status-color-settings.js` opens the modal.

### 3.3 Color picker library

Per SPEC §4 default expectation: `<input type="color">` (native, no external dep). Confirmed.

### 3.4 Existing event-status rendering

`CrmHelpers.statusBadgeHtml` exists in `crm-helpers.js` (per `window.CrmHelpers` export list). The badge currently renders Hebrew name + a class-based color. To make B10 effective without breaking other consumers, we'll:
- Update the events-tab table cell that renders event status to consume `crm_statuses.color` directly (inline `style="background:..."`) when color is present.
- Leave `statusBadgeHtml` callers in other entity types (lead/attendee) alone — they continue to work, just not affected by the new modal yet.

This scopes B10 strictly to event-status colors per SPEC §1 wording ("Per-event-status colors").

---

## 4. Plan summary (drives commits 2-4)

**B3 commit (#2):**
- Edit `modules/crm/crm-payment-helpers.js:114` → use `CrmHelpers.formatDate(attendeeRow.credit_expires_at)`.
- Edit `modules/crm/crm-notifications-bell.js:87` → use `CrmHelpers.formatDate(r.expires_at)`.
- No helper extraction (already exists).
- No event-register.js change (standalone form, no shared helpers).
- Verify `grep -rn "toLocaleDateString" modules/crm/ crm.html` → 0.

**B9 commit (#3):**
- DELETE the prizma `multisale` row from `crm_campaigns` via MCP (FK clean, captured pre-state).
- DELETE the prizma `multisale` row from `crm_statuses` (entity_type='campaign', slug='MultiSale') — paired with above.
- Edit `campaigns/supersale/migrations/001_crm_schema.sql` — remove lines 1133-area + 1140-area.
- Document in commit body that historical specs / import scripts are intentionally left untouched.

**B10 commit (#4):**
- New file `modules/crm/crm-status-color-settings.js` (~60-80 lines): modal + UPDATE handler.
- Edit `crm.html` — insert ⚙️ button + add `<script src="modules/crm/crm-status-color-settings.js">`.
- Edit `modules/crm/crm-events-tab.js` — wire button click; render event-status badges using `crm_statuses.color`.

---

*End of INVESTIGATION_NOTES.md.*
