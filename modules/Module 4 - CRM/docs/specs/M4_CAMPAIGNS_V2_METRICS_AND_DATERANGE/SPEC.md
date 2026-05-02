# SPEC — M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE

> **Module:** Module 4 - CRM
> **Author:** Campaign Overseer (Cowork 2026-05-02), recommendation for Foreman review
> **Drives:** Add 5 missing data points + date-range selector to the existing Campaigns screen
> **Builds on:** `M4_CAMPAIGNS_SCREEN` (closed 2026-04-26) — this is a v2 enrichment, not a rewrite
> **Status:** DRAFT — awaiting Foreman split into Rungs

---

## 1. Why this SPEC exists

The campaigns screen ships today with 6 KPI cards (Spend, Revenue, CAC, Leads, Buyers, Gross Profit) + an 8-column table. Daniel reviewed the live screen on 2026-05-02 (after we re-pointed the FB→CRM sync to Prizma and saw 7 active campaigns with ₪34,298 lifetime spend) and identified that the screen is missing data needed to make actual ad-buying decisions.

Specifically:
- **No campaign age** — "₪8,846 lifetime spend" is meaningless without "ran 412 days vs 14 days".
- **No top-of-funnel metrics** — without impressions/clicks/CTR, can't distinguish "bad ad" from "bad landing page" — both look identical in current numbers.
- **No ROAS** — have spend + revenue separately, no ratio.
- **No date-range selector** — view is hardcoded to lifetime; can't see "spend last 7 days" / "spend this month" / "spend today" like Meta's Ads Manager.
- **City/audience hidden in campaign name string** — Prizma encodes "אשקלון" / "תל אביב" inline; tenant 2 won't follow the same convention.

---

## 2. Goal (binary)

Ship the 6 changes below to the existing Campaigns screen so an ad-buying decision (continue / pause / stop / scale) can be made entirely from this screen.

1. **Days running** column (derived from `start_time`) on every campaign row.
2. **ROAS** column (revenue / spend) on every campaign row + as a 7th KPI card at the top.
3. **Impressions, Clicks, CTR** — 3 new columns; CTR computed as `clicks / impressions`.
4. **City + audience** as proper structured fields, separate from `name`.
5. **Date-range selector** at the top of the screen — pick range, every metric on the page (KPI cards + table) recomputes for that range. Options: **All time / Last year / Last 6 months / Last month / Last 7 days / Today**. Default: **Last 30 days**.
6. **HANDOFF/CHANGELOG** entry — updates `MODULE_MAP.md` + module CHANGELOG (Integration Ceremony rule).

---

## 3. What exists today (verified 2026-05-02)

Evidence: queried `information_schema.columns` on the live DB + read the closed M4_CAMPAIGNS_SCREEN SPEC + read the active Make scenario blueprint (id `9126542`).

### Tables
- `crm_facebook_campaigns`: id, tenant_id, campaign_id, name, status, event_type, total_spend, daily_budget, master, interests, raw_data (JSONB), first_seen_at, last_synced_at, created_at, updated_at. **No `start_time`, no `city`, no `audience`, no impressions/clicks columns.** Verified via `SELECT column_name FROM information_schema.columns WHERE table_name='crm_facebook_campaigns'` (15 columns).
- `crm_ad_spend`: id, tenant_id, campaign_id, spend_date, total_spend, created_at, updated_at. **One row per campaign per day** — already supports date-range queries. **No impressions/clicks per day.** Verified — 7 spend rows landed today during the prizma sync, totaling ₪34,298.
- `v_crm_campaign_performance`: 21 columns, all metrics aggregated **lifetime** (no range parameter). Verified.

### Make scenario (id `9126542`, "Facebook Campaigns → Optic Up CRM (PRIZMA)")
The HTTP body sent by the scenario has only these fields per campaign: `campaign_id, name, status, event_type, daily_budget, total_spend`. **No `start_time`, no `impressions`, no `clicks`, no targeting fields.** Verified by reading scenario blueprint.

### Edge Function `facebook-campaigns-sync`
Accepts `{tenant_slug, shared_secret, campaigns: [...]}`. Each campaign object is the 5 fields above. Verified via M4_CAMPAIGNS_SCREEN SPEC §3 #8 + live behavior (today's run upserted 7 campaigns + 7 ad_spend rows successfully).

### Frontend
- `modules/crm/crm-campaigns.js` (~280 lines target) — KPIs + table.
- `modules/crm/crm-campaigns-detail.js` (~150 lines) — drill-down modal.
- `modules/crm/crm-unit-economics-modal.js` (~120 lines) — settings.
- `crm.html` has the "קמפיינים" sidebar tab (verified live).

---

## 4. Iron Rule compliance check (pre-write)

| Rule | How this SPEC complies |
|---|---|
| 14 — `tenant_id` on every new table | No new tables proposed; columns added to existing tenant-scoped tables. |
| 15 — RLS on every table | Existing tables already have canonical 2-policy RLS; no changes needed for column adds. |
| 18 — UNIQUE includes `tenant_id` | No new UNIQUE constraints; existing remain. |
| 21 — No Orphans/Duplicates | Reuse `crm_ad_spend` for impressions/clicks (don't create a new table). Reuse `crm_facebook_campaigns` for `start_time` + city + audience. Verified via grep — no existing column with these names. |
| 22 — Defense-in-depth on writes | View changes only — no new INSERTs in this SPEC. |
| 12 — File-size cap (350 lines) | New columns + view rebuild + UI changes. JS file `crm-campaigns.js` may grow — must stay ≤350. If date-range selector adds >70 lines, split into `crm-campaigns-daterange.js`. |

---

## 5. Detailed design

### 5.1 — Schema additions

Add columns to `crm_facebook_campaigns`:
- `start_time TIMESTAMPTZ NULL` — Facebook campaign start time (from `listCampaigns.start_time`).
- `city TEXT NULL` — primary geo target (parsed from name OR from adset targeting; see §5.6 design tradeoff).
- `audience_label TEXT NULL` — short audience descriptor (e.g., "רוסית", "20-55 אשקלון").

Add columns to `crm_ad_spend` (per-day snapshot):
- `impressions BIGINT NOT NULL DEFAULT 0` — daily impressions.
- `clicks BIGINT NOT NULL DEFAULT 0` — daily clicks.
- (CTR is **derived**, not stored — computed in the view as `clicks / NULLIF(impressions, 0)`.)

**Why store impressions/clicks in `crm_ad_spend` and not in `crm_facebook_campaigns`:**
The same reason `total_spend` lives in `ad_spend`: we want to query "impressions in the last 7 days" — that's only possible if data is partitioned by date. Storing on the campaigns table would lose the time dimension.

### 5.2 — Date-range selector design

The selector is at the top of the campaigns screen, before the KPI cards. UI: 6 button group, single-select. Selection persists in `localStorage` per Iron-Rule-compatible practice (already used elsewhere).

**Range options + their semantics:**
| Label (HE) | Range start | Range end |
|---|---|---|
| הכל | (no lower bound) | today |
| שנה אחרונה | today − 365 days | today |
| חצי שנה | today − 180 days | today |
| חודש | today − 30 days (DEFAULT) | today |
| שבוע | today − 7 days | today |
| היום | today | today |

**How metrics aggregate within range:**
- `total_spend` = `SUM(crm_ad_spend.total_spend) WHERE spend_date BETWEEN range_start AND range_end`
- `impressions` = `SUM(crm_ad_spend.impressions)` in range
- `clicks` = `SUM(crm_ad_spend.clicks)` in range
- `CTR` = `clicks / NULLIF(impressions, 0)`
- `leads_num` = `COUNT(DISTINCT crm_leads WHERE created_at::date BETWEEN range_start AND range_end)`
- `buyers_num` = `COUNT(DISTINCT attendees WHERE registered_at::date BETWEEN range_start AND range_end AND payment_status IN ('paid','credit_used'))`
- `total_revenue` = `SUM(purchase_amount)` for those buyers
- `CAC` = `total_spend (in range) / buyers_num (in range)`
- `CPL` = `total_spend (in range) / leads_num (in range)`
- `ROAS` = `total_revenue (in range) / total_spend (in range)`
- `gross_profit` = `(total_revenue × gross_margin_pct/100) − total_spend` (in range)
- `days_running` = `LEAST(today, range_end) − GREATEST(start_time, range_start)` (clamped to range)

### 5.3 — View rebuild

Replace `v_crm_campaign_performance` with **a function** instead of a static view, because views can't take parameters. Two paths — Foreman to choose:

**Path A (recommended):** SQL function `get_campaign_performance(p_tenant_id UUID, p_range_start DATE, p_range_end DATE)` returning the same column shape as the current view, but with all aggregations filtered by the range. Frontend calls it via `sb.rpc('get_campaign_performance', {...})`.

**Path B:** Materialized view per common range (today, 7d, 30d, lifetime) refreshed on sync. Faster reads but stale.

**Why A is recommended:** Path B requires 4-6 materialized views and a refresh hook on every sync. Path A computes on demand (acceptable for ≤100 campaigns per tenant per the M4_CAMPAIGNS_SCREEN SPEC §5 stop-trigger of "view runs slower than 500ms").

### 5.4 — Make scenario changes

The scenario (`9126542`) currently calls `facebook-insights:GetAdAccountInsights` (module 2) with fields `["campaign_id", "spend"]`. Expand to:

```
fields: ["campaign_id", "spend", "impressions", "clicks"]
```

`listCampaigns` (module 1) already returns `start_time` per-campaign — no change needed there, just pass it through.

The HTTP body (module 3) gets 4 new mapped fields:
```json
{
  "campaign_id": "{{1.id}}",
  "name": "{{1.name}}",
  "status": "{{1.effective_status}}",
  "event_type": "{{...existing...}}",
  "daily_budget": {{...existing...}},
  "total_spend": {{...existing...}},
  "start_time": "{{1.start_time}}",
  "impressions": {{ifempty(parseNumber(2.impressions; "."); 0)}},
  "clicks": {{ifempty(parseNumber(2.clicks; "."); 0)}}
}
```

City/audience extraction is **deferred** in this SPEC — see §5.6 Open Decision.

### 5.5 — Edge Function `facebook-campaigns-sync` changes

Accept the 3 new fields. Per campaign:
- UPSERT to `crm_facebook_campaigns` — includes `start_time`.
- UPSERT to `crm_ad_spend` for today — includes `impressions`, `clicks`.

`verify_jwt` stays `true`. Response shape unchanged (counts only).

### 5.6 — UI changes

`modules/crm/crm-campaigns.js`:
- Add date-range button group at top.
- Read selected range from `localStorage` on load (default `last 30 days`).
- On change, re-fetch via `sb.rpc('get_campaign_performance', {p_tenant_id, p_range_start, p_range_end})`.
- KPI cards: 6 → 7 (add ROAS).
- Table: 8 columns → 11 (add Days Running, Impressions, Clicks/CTR combined, ROAS).
- New `crm-campaigns-detail.js` modal: also show start_time, days_running, impressions, clicks, CTR.

If `crm-campaigns.js` exceeds 350 lines after these changes, split out:
- `crm-campaigns-daterange.js` — selector logic + range computation helpers.
- `crm-campaigns-table.js` — table renderer.

### 5.7 — Open Decision (Foreman to resolve before execution)

**City + audience field extraction:**

Facebook's `listCampaigns` does NOT return targeting (city, age, etc.) on the campaign object — targeting lives at the **adset** level, and a single campaign can have multiple adsets with different geos.

Three viable paths:

**Path X1 — Parse from campaign name (lowest cost).**
Pros: zero new API calls, ships fast.
Cons: brittle, breaks for tenant 2 if naming convention differs.
Effort: ~1 hour (regex helper).

**Path X2 — Pull adsets via separate Make module.**
Pros: real targeting data, per-tenant correct.
Cons: 1 extra API call per campaign + multi-adset aggregation logic; impacts cost/performance.
Effort: ~4-6 hours (new Make module, new EF endpoint, schema for adsets).

**Path X3 — Defer city/audience to a separate post-cutover SPEC.**
Pros: ship the other 4 enrichments now without blocking on this.
Cons: city/audience missing from v2.

**Overseer recommendation:** Path X3 — ship items 1, 2, 3, 5, 6 now (clean win), defer city/audience to a separate post-cutover SPEC. Daniel's words on 2026-05-02 were "עיר וקהל יעד … חשוב למחר" — i.e., post-cutover. This aligns with X3.

Foreman to confirm the path before execution begins.

---

## 6. Success Criteria (binary, ordered)

### Schema (Rung 1)
1. ✅ `crm_facebook_campaigns` has new columns `start_time TIMESTAMPTZ NULL`, `city TEXT NULL`, `audience_label TEXT NULL` (the latter two will be populated only if Foreman chooses Path X1; otherwise stay NULL until the deferred SPEC).
2. ✅ `crm_ad_spend` has new columns `impressions BIGINT NOT NULL DEFAULT 0`, `clicks BIGINT NOT NULL DEFAULT 0`.
3. ✅ `v_crm_campaign_performance` is replaced (DROP + CREATE FUNCTION) by `get_campaign_performance(p_tenant_id UUID, p_range_start DATE, p_range_end DATE)` returning the same column shape + new columns: `start_time`, `days_running INT`, `impressions BIGINT`, `clicks BIGINT`, `ctr NUMERIC`, `roas NUMERIC`. Plus the existing 21 columns.
4. ✅ Function returns ≤500ms on demo with 50 seed campaigns × 30 days × tenant_id filter.
5. ✅ Migration in `campaigns/supersale/migrations/00X_campaigns_v2_metrics.sql` (next sequential number).

### Edge Function (Rung 2)
6. ✅ `facebook-campaigns-sync` accepts the 3 new fields without breaking the existing payload (additive only).
7. ✅ Curl test with old payload (no new fields) still returns `ok:true`.
8. ✅ Curl test with new payload upserts `start_time` + `impressions` + `clicks` correctly.

### Make scenario (Rung 3 — Daniel-side or via MCP)
9. ✅ Scenario `9126542` blueprint updated: insights call adds `impressions`, `clicks` fields; HTTP body includes `start_time`, `impressions`, `clicks`.
10. ✅ Manual run completes successfully.
11. ✅ Verify on prizma: all 7 campaigns now have `start_time` populated + non-zero `impressions`/`clicks` for at least one row in `crm_ad_spend` for today.

### Frontend (Rung 4)
12. ✅ Date-range selector renders at top of `קמפיינים` tab. 6 buttons. Default: "חודש" (last 30 days). Persist to `localStorage`.
13. ✅ Selecting a range fires `sb.rpc('get_campaign_performance', ...)` with the right range_start/range_end.
14. ✅ 7th KPI card: ROAS = `total_revenue / NULLIF(total_spend, 0)`. Shows "—" when spend=0.
15. ✅ 3 new table columns: Days Running, Impressions / Clicks (combined cell with CTR badge), ROAS.
16. ✅ Drill-down modal shows the same new fields + start_time as a date.
17. ✅ All numbers update reactively when range changes.
18. ✅ `crm-campaigns.js` ≤ 350 lines (split if needed).

### Verification
19. ✅ `npm run verify:integrity` exit 0.
20. ✅ All pre-commit hooks pass.
21. ✅ Browser smoke on demo: each of the 6 ranges renders correctly + numbers diff between ranges (smoke test data: insert 30 days of varied spend).
22. ✅ Repo clean at session end.

---

## 7. Autonomy envelope

**CAN do without asking:**
- ALTER TABLE adding NULL columns to `crm_facebook_campaigns` (additive, safe).
- ALTER TABLE adding NOT NULL DEFAULT 0 columns to `crm_ad_spend` (defaults backfill existing rows).
- DROP VIEW + CREATE FUNCTION for `get_campaign_performance` (no data loss; view is computed).
- Update Edge Function (additive payload).
- Update Make scenario blueprint (low-risk; rollback by reverting to current state).
- Refactor `crm-campaigns.js` if it exceeds 350 lines.

**MUST stop and ask if:**
- Path X1/X2/X3 for city/audience hasn't been decided by Foreman.
- The function exceeds 500ms on demo (perf regression).
- Pre-commit fails after 2 attempts.
- Any code outside CRM module is modified to make this work.
- The Make scenario blueprint update breaks the existing `Optic Up — Send Message` scenario or any other unrelated scenario.

---

## 8. Stop-on-Deviation Triggers

1. **STOP** if grep finds active code referencing the OLD `v_crm_campaign_performance` view in a way that won't migrate to the function (likely `modules/crm/crm-campaigns.js` calls `.from('v_crm_campaign_performance')`). Either migrate the call OR keep view as a thin wrapper that calls the function with `(tenant_id, '1900-01-01', current_date)`.
2. **STOP** if Facebook Insights API returns 0 for `impressions` or `clicks` on actively-running campaigns (likely permissions issue on the FB connection — can happen when adding new fields).
3. **STOP** if `crm_ad_spend.impressions BIGINT NOT NULL DEFAULT 0` cannot be added because existing rows would conflict (shouldn't — DEFAULT handles backfill).
4. **STOP** if the function definition exceeds 100 lines of SQL — Foreman to review.
5. **STOP** if browser smoke shows numbers diverging from the SQL function output.

---

## 9. Rollback plan

- DB function: `DROP FUNCTION get_campaign_performance(uuid,date,date);` then re-`CREATE OR REPLACE VIEW v_crm_campaign_performance AS …` (the old view definition lives in `M4_CAMPAIGNS_SCREEN/SPEC.md §8.1 lines 217-264`).
- Schema: `ALTER TABLE crm_facebook_campaigns DROP COLUMN start_time, DROP COLUMN city, DROP COLUMN audience_label;` and similarly for `crm_ad_spend.impressions, clicks`.
- EF: redeploy previous version (revert commit).
- Make scenario: revert blueprint via `scenarios_update` to the current snapshot (saved 2026-05-02).
- UI: `git revert` per commit.

---

## 10. Out of scope

- City/audience extraction (Path X1/X2 — see §5.7 Open Decision; default-deferred to a separate SPEC per Overseer recommendation X3).
- Comparing 2+ campaigns side-by-side.
- Per-adset / per-ad breakdown (this SPEC stays at campaign level).
- Auto-pause / auto-stop based on "X days no spend" — that's a separate SPEC; this SPEC just adds the data needed to compute it.
- Email/push alerts when CTR drops below threshold.
- Historical backfill of impressions/clicks for past spend dates (Facebook returns lifetime — backfill is a separate concern).

---

## 11. Pre-flight checks (executor runs before any edit)

1. Repo clean: `git status --porcelain` empty (or contains only this SPEC file).
2. `npm run verify:integrity` exits 0.
3. Verify `crm_facebook_campaigns.start_time` does NOT exist (will be added).
4. Verify `crm_ad_spend.impressions` does NOT exist.
5. Verify `get_campaign_performance` function does NOT exist (`SELECT proname FROM pg_proc WHERE proname='get_campaign_performance'`).
6. Verify Make scenario `9126542` is reachable via MCP (`scenarios_get` returns the blueprint).
7. Read `modules/crm/crm-campaigns.js` line count: must be ≤ 350 BEFORE additions to leave headroom.

---

## 12. Foreman handoff notes

This SPEC is a **Campaign Overseer recommendation**, not an executor-ready plan. The Foreman should:

1. **Resolve §5.7 Open Decision** — pick X1, X2, or X3 (default X3 per Overseer rec).
2. **Split into Rungs.** Suggested split:
   - Rung 1: Schema additions + function (no UI)
   - Rung 2: EF + Make scenario
   - Rung 3: Frontend (date-range selector + 3 new columns + ROAS card)
3. **Validate the function performance assumption** (§5.3) on a representative dataset before commit.
4. **Add executor-side pre-flight items** specific to the team's verify-script setup.

---

## 13. Lessons incorporated

- M4_CAMPAIGNS_SCREEN's pattern of "DROP+CREATE since data isn't precious" doesn't apply here — `crm_ad_spend` is now live with real Prizma campaign data (verified 2026-05-02 18:07: 7 rows, ₪34K). New columns must be additive, not destructive.
- Per Iron Rule 21, reusing `crm_ad_spend` for impressions/clicks (instead of creating a parallel `crm_ad_metrics` table) prevents orphan duplication.
- Per Iron Rule 18, no new UNIQUE constraints, so no tenant_id concerns.
- Per Iron Rule 12, file-size check is critical because `crm-campaigns.js` is already at ~280 lines target; date-range selector + new columns will push it close to 350.

---

*End of SPEC. Author: Campaign Overseer. Drafted 2026-05-02.*
*Awaiting Foreman review before execution.*
