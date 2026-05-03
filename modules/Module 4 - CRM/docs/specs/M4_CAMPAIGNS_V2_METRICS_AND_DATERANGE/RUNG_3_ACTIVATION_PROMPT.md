# RUNG 3 ACTIVATION PROMPT — UI: date-range selector + ROAS card + 3 new columns

> **Paste this entire prompt to opticup-executor. It is self-contained.**
> **Authorisation:** Foreman (opticup-strategic) approved 2026-05-02 in `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md`.
> **Order:** This is Rung 3 of 3. Rungs 1 + 2 MUST close successfully before this prompt fires.
> **Recommended timing:** Mid-week post-cutover (week of 2026-05-04+). Not pre-cutover. Reason in FOREMAN_REVIEW §6.

---

## 0. Activate skills

Load `opticup-guardian`, then `opticup-executor`. ERP repo (`opticalis/opticup`).

## 1. Context

You are executing Rung 3 (final) of `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE`. Goal: surface the v2 metrics in the UI.

Four UI changes:
1. **Date-range selector** — 6 buttons at top (`הכל / שנה / חצי שנה / חודש / שבוע / היום`), default "חודש" (last 30 days), persisted to `localStorage`.
2. **ROAS KPI card** — 7th card in the grid.
3. **3 new table columns** — Days Running, Impressions / Clicks (combined cell with CTR badge), ROAS.
4. **Drill-down modal updates** — show start_time as date, days_running, impressions, clicks, CTR.

Plus a code-organisation change forced by Iron Rule 12: `crm-campaigns.js` is at 250 lines today. Adding the above will breach 350 unless we extract first. **Extract `crm-campaigns-daterange.js` BEFORE adding new features.**

### Migration of the data call

Today (after Rung 1) `crm-campaigns.js:64` reads:
```js
var q = sb.from('v_crm_campaign_performance').select('*');
```
The wrapper view returns lifetime numbers regardless of the JWT range parameter. Rung 3 replaces this with a direct RPC call carrying the user-selected range:
```js
var res = await sb.rpc('get_campaign_performance', {
  p_tenant_id: tid(),
  p_range_start: range.start,   // 'YYYY-MM-DD'
  p_range_end: range.end,       // 'YYYY-MM-DD'
});
```
The wrapper view stays in place for now (post-Rung-3 cleanup may drop it once we confirm no other consumer reads it).

## 2. Pre-flight

```bash
git branch --show-current   # 'develop'
git status --porcelain      # clean
npm run verify:integrity    # exit 0

# Confirm Rung 1 + 2 closed
# Via Supabase MCP execute_sql:
#   SELECT proname FROM pg_proc WHERE proname='get_campaign_performance';   -- 1 row
#   SELECT column_name FROM information_schema.columns
#     WHERE table_name='crm_ad_spend' AND column_name IN ('impressions','clicks');  -- 2 rows
#   SELECT COUNT(*) FROM crm_facebook_campaigns
#     WHERE start_time IS NOT NULL;   -- ≥ 1 (proves Rung 2 PART B ran)

# Current file sizes (use these as baselines)
wc -l "modules/crm/crm-campaigns.js"          # expect ~250
wc -l "modules/crm/crm-campaigns-detail.js"   # expect ~152

# Confirm script tags in crm.html
grep -n "crm-campaigns" "crm.html"
# Expected:
#   modules/crm/crm-campaigns.js
#   modules/crm/crm-campaigns-detail.js
```

## 3. Plan (commits in this order)

### Commit A — Extract date-range helper module (BEFORE any feature work)

Create new file `modules/crm/crm-campaigns-daterange.js` (~60 lines, hard cap 100). Single IIFE exposing `window.CrmCampaignsDaterange` with these methods:

- `getRanges()` → array of 6 range definitions:
  ```js
  [
    { key: 'all',    labelHe: 'הכל',       days: null },
    { key: 'year',   labelHe: 'שנה',       days: 365 },
    { key: 'half',   labelHe: 'חצי שנה',   days: 180 },
    { key: 'month',  labelHe: 'חודש',      days: 30 },   // DEFAULT
    { key: 'week',   labelHe: 'שבוע',      days: 7 },
    { key: 'today',  labelHe: 'היום',      days: 0 },
  ]
  ```
- `getCurrentKey()` → reads `localStorage.getItem('crmCampaignsRangeKey') || 'month'`.
- `setCurrentKey(key)` → writes to localStorage. Validate against `getRanges()` keys.
- `computeRangeDates(key)` → returns `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`. For `key='all'`, start='1900-01-01'. End is always today (`new Date().toISOString().slice(0,10)`).
- `renderButtonGroup(currentKey)` → returns HTML string for the 6-button group. Each button has `data-range-key="<key>"` and class indicating active state.
- `wireButtonGroup(rootEl, onChange)` → attaches click listeners; calls `onChange(newKey)` after `setCurrentKey`.

Do NOT include any business logic about KPIs / table here — this module is purely the selector + range helpers.

**Add script tag to `crm.html`** immediately BEFORE `crm-campaigns.js`:
```html
<script src="modules/crm/crm-campaigns-daterange.js"></script>
```

Verify and commit:
```bash
wc -l "modules/crm/crm-campaigns-daterange.js"   # ≤ 100
npm run verify:integrity

git add "modules/crm/crm-campaigns-daterange.js" "crm.html"
git commit -m "feat(crm): campaigns v2 Rung 3A — extract date-range helper module

New CrmCampaignsDaterange exposes 6 range definitions, localStorage
persistence, and a button-group renderer. Pure helpers — no DB or KPI
logic. Created BEFORE the rest of Rung 3 to keep crm-campaigns.js
under the 350-line cap once the date-range UI lands.

Authorised by FOREMAN_REVIEW.md 2026-05-02."

git push origin develop
```

### Commit B — Migrate data call + add date-range UI + ROAS card + 3 columns

In `modules/crm/crm-campaigns.js`:

#### B1 — Replace `loadRows()` (~line 62-69)

Replace:
```js
async function loadRows() {
  var tenantId = tid();
  var q = sb.from('v_crm_campaign_performance').select('*');
  if (tenantId) q = q.eq('tenant_id', tenantId);
  var res = await q;
  if (res.error) throw new Error('campaigns view load failed: ' + res.error.message);
  return res.data || [];
}
```

With:
```js
async function loadRows(rangeKey) {
  var tenantId = tid();
  if (!tenantId) return [];
  var range = window.CrmCampaignsDaterange.computeRangeDates(rangeKey);
  var res = await sb.rpc('get_campaign_performance', {
    p_tenant_id: tenantId,
    p_range_start: range.start,
    p_range_end: range.end,
  });
  if (res.error) throw new Error('campaigns RPC load failed: ' + res.error.message);
  return res.data || [];
}
```

#### B2 — Update `aggregateKpis()` to also sum impressions/clicks and compute ROAS

Replace the function so it includes:
```js
s.impressions += Number(r.impressions || 0);
s.clicks += Number(r.clicks || 0);
```
in the per-row loop, and after the loop compute:
```js
s.ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : null;
s.roas = s.spend > 0 ? (s.revenue / s.spend) : null;
```

#### B3 — Update `renderKpiCards(k)` to render 7 cards

Append a 7th card definition AFTER "רווח גולמי":
```js
{ label: 'ROAS', val: k.roas == null ? '—' : (k.roas.toFixed(2) + 'x'), color: k.roas != null && k.roas >= 1 ? 'emerald' : 'rose', icon: '🎯' }
```

Adjust the grid class from `lg:grid-cols-6` to `lg:grid-cols-7` and consider an md breakpoint update so it doesn't look cramped (try `md:grid-cols-4 lg:grid-cols-7`).

#### B4 — Add 3 new table columns

In the `<thead>` block (~line 168-177), add 3 new `<th>` cells AFTER "ספנד" (so column order is: Name / Status / Spend / **Days Running** / **Impr/Clicks (CTR)** / Leads / Buyers / Revenue / **ROAS** / CAC / Decision). Update `colspan="8"` on the group-header row to `colspan="11"`.

In the per-row `<td>` block (~line 126-138), match the new column order. The combined Impressions/Clicks cell:
```js
'<td class="px-3 py-2 text-end" style="direction:ltr;" title="CTR">' +
  '<div>' + fmt(r.impressions) + ' / ' + fmt(r.clicks) + '</div>' +
  '<div class="text-xs text-slate-500">' +
    (Number(r.ctr) > 0 ? Number(r.ctr).toFixed(2) + '%' : '—') +
  '</div>' +
'</td>'
```

ROAS column:
```js
'<td class="px-3 py-2 text-end font-semibold" style="direction:ltr;">' +
  (Number(r.roas) > 0 ? Number(r.roas).toFixed(2) + 'x' : '—') +
'</td>'
```

Days Running column:
```js
'<td class="px-3 py-2 text-end">' +
  (r.days_running != null ? fmt(r.days_running) : '—') +
'</td>'
```

Update group-summary rows similarly with `colspan` adjustments and 3 new total cells (Days Running shows '—' in summaries, Impressions/Clicks shows summed values, ROAS shows group-level revenue/spend ratio).

#### B5 — Render the date-range selector at the top + wire the change handler

In `renderHeader()` (~line 186-194), add the button group between the title and the action buttons:
```js
'<div id="campaigns-range-group" class="flex">' +
  CrmCampaignsDaterange.renderButtonGroup(CrmCampaignsDaterange.getCurrentKey()) +
'</div>' +
```

In `loadCampaignsTab()` (~line 204-244), after the panel innerHTML write but before wiring rowEls, add:
```js
var rangeRoot = document.getElementById('campaigns-range-group');
if (rangeRoot) {
  CrmCampaignsDaterange.wireButtonGroup(rangeRoot, function (newKey) {
    loadCampaignsTab();   // re-render whole tab on range change
  });
}
```

And update the call to `loadRows()` at the top of the try block:
```js
var rows = await loadRows(CrmCampaignsDaterange.getCurrentKey());
```

#### B6 — Verify file size after changes

```bash
wc -l "modules/crm/crm-campaigns.js"   # MUST be ≤ 350
```

If > 350, you have over-grown the additions. Roll back §B-edits and re-extract more aggressively (e.g., move `renderTable`/`renderGroupRows` to `crm-campaigns-table.js`). Do NOT commit a file ≥ 351 lines.

#### B7 — Update drill-down modal

In `modules/crm/crm-campaigns-detail.js`, add a "Performance" section that shows: `start_time` (formatted as `dd/mm/yyyy`), `days_running` (e.g. "412 ימים"), `impressions`, `clicks`, `ctr` (with `%`), `roas` (with `x` suffix). Place after the existing KPI rows. Keep file ≤ 200 lines.

Verify and commit:
```bash
wc -l "modules/crm/crm-campaigns.js"          # ≤ 350
wc -l "modules/crm/crm-campaigns-detail.js"   # ≤ 200
npm run verify:integrity

git add "modules/crm/crm-campaigns.js" "modules/crm/crm-campaigns-detail.js"
git commit -m "feat(crm): campaigns v2 Rung 3B — date-range, ROAS card, 3 new columns

Migrates data call from v_crm_campaign_performance view to RPC
get_campaign_performance(tenant_id, range_start, range_end). Adds
6-option date-range selector (default 30 days) persisted to
localStorage. Adds ROAS as 7th KPI card. Adds Days Running, Impressions
/ Clicks (with CTR), ROAS columns to the table. Drill-down modal shows
start_time, days_running, impressions, clicks, CTR, ROAS.

Authorised by FOREMAN_REVIEW.md 2026-05-02."

git push origin develop
```

## 4. Browser smoke test (manual, on demo)

After Commit B is pushed:

1. Open the ERP locally (`localhost:3000` or the configured dev URL), log in to demo tenant.
2. Navigate to CRM → "קמפיינים" tab.
3. **Default range:** Verify "חודש" button is active. Numbers reflect last 30 days.
4. **Range change:** Click each of the 6 buttons. Verify:
   - Numbers change between ranges (e.g. "היום" should show smaller spend than "הכל").
   - Active-button styling applies to the clicked one only.
   - Selection persists after a hard refresh (`Ctrl+Shift+R`).
5. **ROAS card:** Visible as 7th card. Shows "—" when total spend is 0 in the range. Shows e.g. "2.45x" when spend > 0.
6. **New columns:** Days Running, Impressions / Clicks with CTR sub-text, ROAS — all rendered. Column count = 11.
7. **Drill-down:** Click any campaign row. Modal opens with start_time as date, days_running, impressions, clicks, CTR, ROAS visible.
8. **Empty state:** Switch tenant context to one with no campaigns (or use a range that yields zero rows for demo). Verify "אין קמפיינים עדיין" empty card still renders.
9. **Console:** Zero errors on each interaction. Zero warnings beyond known noise.
10. **Data sanity check:** With "הכל" range, the screen numbers should match a SQL spot-check:
    ```sql
    SELECT SUM(total_spend), SUM(impressions), SUM(clicks)
    FROM crm_ad_spend
    WHERE tenant_id = (SELECT id FROM tenants WHERE slug='demo');
    ```
    KPI cards should match within rounding.

If any of 1–10 fail — STOP and report.

## 5. Stop-on-deviation triggers (Rung 3 specific)

Beyond CLAUDE.md §9 globals, STOP if:

1. `crm-campaigns.js` exceeds 350 lines after any edit. (Iron Rule 12.)
2. `crm-campaigns-detail.js` exceeds 200 lines (project soft cap; SPEC §13 reference).
3. The RPC call returns column names that don't match what the JS reads (likely a Rung 1 schema drift). Stop, query the function signature, reconcile.
4. Switching ranges does NOT visibly change the numbers (likely localStorage write failed, or the range computation is returning the same dates).
5. Console error `CrmCampaignsDaterange is undefined` — script tag was added in the wrong order in `crm.html`.
6. Pre-commit fails. No `--no-verify`.

## 6. Out of scope

- Backfilling impressions/clicks for past `crm_ad_spend` rows.
- City / audience / adset breakdown.
- Comparing 2+ campaigns side-by-side.
- Auto-pause / auto-stop based on metrics thresholds.
- Email or push alerts.
- Dropping `v_crm_campaign_performance` wrapper view (post-Rung-3 cleanup SPEC).
- Dropping `crm_facebook_campaigns.total_spend` (post-Rung-3 cleanup SPEC).

## 7. Integration Ceremony at Rung 3 close

This Rung closes the SPEC. After Commit B passes browser smoke:

1. Update `modules/Module 4 - CRM/docs/CHANGELOG.md` — add a section for `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE` with the 3 commit hashes (Rungs 1 + 2 + 3) and a one-paragraph summary.
2. Update `modules/Module 4 - CRM/docs/MODULE_MAP.md` — add `CrmCampaignsDaterange` to the function registry; note `get_campaign_performance` RPC contract.
3. Update `modules/Module 4 - CRM/docs/db-schema.sql` — append the new columns + function definition.
4. Update `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — mark v2 as shipped.
5. Notify the Foreman that Integration-Ceremony-into-GLOBAL_MAP.md and GLOBAL_SCHEMA.sql is pending (the Foreman handles those, not the executor).

## 8. Retrospective deliverables (mandatory at Rung 3 close)

- `RUNG_3_EXECUTION_REPORT.md` in the SPEC folder.
- `RUNG_3_FINDINGS.md` if any.

The Foreman writes `RUNG_3_FOREMAN_REVIEW.md` after reading these AND a final consolidated `FOREMAN_REVIEW_FINAL.md` summarising the SPEC end-to-end.

---

*End of RUNG 3 prompt. Self-contained — no other context required to execute.*
