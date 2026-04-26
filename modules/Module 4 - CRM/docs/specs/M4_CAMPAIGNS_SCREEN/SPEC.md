# SPEC — M4_CAMPAIGNS_SCREEN (v2 — adapted to existing infrastructure)

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md`
> **Author:** opticup-strategic (Cowork 2026-04-26)
> **Replaces:** v1 of this SPEC (greenfield assumption — invalidated by infrastructure investigation 2026-04-26).
> **Drives:** New campaigns measurement screen for CRM, integrated with existing `crm_ad_spend` + `crm_unit_economics` tables.

---

## 1. Goal

Build a complete campaign performance measurement screen inside the CRM, leveraging existing DB infrastructure (3 tables already in place from Phase A + B2):
1. Adapt existing `crm_ad_spend` table to receive 4-hourly snapshots from Facebook (currently holds 88 historical rows from Monday import).
2. Use existing `crm_facebook_campaigns` table (created earlier today, currently empty) for campaign metadata.
3. Adapt existing `crm_unit_economics` table (currently holds 2 rows for SuperSale/MultiSale on prizma).
4. New `facebook-campaigns-sync` Edge Function — receives data from Make scenario every 4 hours, writes snapshots to `crm_ad_spend` + upserts metadata to `crm_facebook_campaigns`.
5. New CRM screen "קמפיינים" (sidebar nav) — Mockup C layout (6 KPI cards + 8-column table + drill-down modal).
6. Settings modal for Unit Economics (gear icon).
7. Auto-decision logic per campaign using multipliers formula: `kill_threshold = kill_multiplier × gross_margin × 1000`.

## 2. Background

### Existing infrastructure (confirmed by investigation 2026-04-26)

The campaigns infrastructure was partially built in Phase A (2026-04-20) + Phase B2 (Monday data import). Key findings:

- `crm_campaigns` (DO NOT TOUCH) — this is **event-type templates** (SuperSale/MultiSale), NOT Facebook campaigns. 21 events in prizma have FK to it. Used by `loadCampaigns()` in `crm-event-actions.js`.
- `crm_ad_spend` — currently 88 rows imported from Monday "Affiliates" board (March-April 2026 history). **Will be wiped during P7 cutover** per Daniel — historical data not precious.
- `crm_unit_economics` — currently 2 active rows on prizma using `(campaign_id, gross_margin_pct, kill_multiplier, scaling_multiplier)` schema. **Schema needs adaptation** to be event-type-based instead of campaign-id-based, since the Mockup C decision logic operates per event_type.
- `crm_facebook_campaigns` — created today by accident in the v1 SPEC's failed run; empty. **Repurpose** as the metadata-of-truth table per Daniel's decision.
- `crm_campaign_pages` — created in Phase A, never used. Leave alone.
- `v_crm_campaign_performance` — created in Phase A, references the old schema. Will be **dropped and recreated** to match the new architecture.

### P7 context

Daniel confirmed: when P7 runs, all existing data in these tables will be wiped and re-imported from Monday. So this SPEC has full freedom to ALTER schemas without preserving the 88 ad_spend rows or the 2 unit_economics rows. They'll be re-seeded during P7 cutover.

### Daniel's design decisions (from strategic chat 2026-04-26)

- **Mockup C** chosen (Dashboard + Drill-Down).
- **Sidebar nav** placement.
- **Gear icon** for Unit Economics settings.
- **6 KPI cards exactly** (Spend, Revenue, CAC, Leads, Buyers, Gross Profit).
- **8 columns** in table (Mockup's 6 + Revenue + Buyers).
- **Multipliers formula** (kept from existing infrastructure — Daniel familiar from Monday).
- **Display both** — show "Kill Multiplier: 4 = ₪800 = STOP" so meaning is clear.
- **Decision rules:** TEST if leads_num<30; no decision if Facebook-stopped; otherwise STOP/SCALE/TEST per multiplier formula.
- **Sync frequency:** every 4 hours from Facebook → Make → EF.
- **Daily snapshots:** every sync inserts/updates a row in `crm_ad_spend` partitioned by date (latest sync of the day overwrites previous snapshots).

## 3. Success Criteria

All measurable, all binary pass/fail.

### Database (Commit 1)
1. ✅ `crm_facebook_campaigns` schema has columns: `id, tenant_id, campaign_id, name, status, event_type, daily_budget, master, interests, raw_data (JSONB), first_seen_at, last_synced_at, created_at, updated_at`. RLS canonical 2-policy pattern. UNIQUE on `(tenant_id, campaign_id)`.
2. ✅ `crm_ad_spend` schema is REBUILT (DROP + CREATE since data will be wiped anyway): `id, tenant_id, campaign_id (TEXT, FK to crm_facebook_campaigns.campaign_id), spend_date (DATE), total_spend (NUMERIC), created_at, updated_at`. RLS canonical pattern. UNIQUE on `(tenant_id, campaign_id, spend_date)` so each campaign+date has exactly one snapshot.
3. ✅ `crm_unit_economics` schema is REBUILT: `id, tenant_id, event_type (TEXT NOT NULL), gross_margin_pct (NUMERIC), kill_multiplier (NUMERIC), scaling_multiplier (NUMERIC), created_at, updated_at`. RLS canonical pattern. UNIQUE on `(tenant_id, event_type)`.
4. ✅ Drop `v_crm_campaign_performance` and recreate it to JOIN: `crm_facebook_campaigns` + `crm_ad_spend` (latest spend_date per campaign) + `crm_leads` (by `utm_campaign_id = campaign_id`) + `crm_event_attendees` (for buyers + revenue) + `crm_unit_economics` (by event_type).
5. ✅ Index on `crm_leads(tenant_id, utm_campaign_id)` exists.
6. ✅ Seed `crm_unit_economics`: 2 rows on demo + 2 on prizma — `SuperSale` (gross_margin_pct=20, kill_multiplier=4, scaling_multiplier=2), `MultiSale` (gross_margin_pct=50, kill_multiplier=3, scaling_multiplier=1.5). Numbers from existing prizma data adapted to new schema.

### Edge Function (Commit 2)
7. ✅ Edge Function `facebook-campaigns-sync` deployed and active.
8. ✅ EF accepts POST: `{ tenant_slug, campaigns: [{campaign_id, name, status, event_type, daily_budget, master, interests, total_spend, raw_data?}] }`.
9. ✅ Per campaign: UPSERT to `crm_facebook_campaigns` on `(tenant_id, campaign_id)` (metadata), then UPSERT to `crm_ad_spend` on `(tenant_id, campaign_id, spend_date=today)` (snapshot).
10. ✅ EF returns `{ok: true, processed: N, metadata_inserted: A, metadata_updated: B, spend_inserted: C, spend_updated: D}`.
11. ✅ `verify_jwt: true`.

### Frontend — Screen (Commit 3)
12. ✅ New file `modules/crm/crm-campaigns.js` (≤350 lines).
13. ✅ Sidebar nav in `crm.html` has new entry "📈 קמפיינים" between "Events" and "Messaging Hub".
14. ✅ Loading the tab fetches from `v_crm_campaign_performance`, renders.
15. ✅ Top: 6 KPI cards (Spend, Revenue, CAC, Leads, Buyers, Gross Profit) — gradient backgrounds matching CRM palette.
16. ✅ Bottom: 8-column table grouped by status (Live & Scaling / Paused / Stopped) with sum rows per group.
17. ✅ Decision column shows colored badge: SCALE (emerald), TEST (slate), STOP (rose), or "—" if Facebook-stopped.
18. ✅ Click on row opens drill-down modal with all metadata + computed metrics + the multiplier explanation ("Kill: 4 × 20% × 1000 = ₪800").
19. ✅ Gear icon (top-right) opens Unit Economics settings modal.

### Frontend — Settings (Commit 3)
20. ✅ New file `modules/crm/crm-unit-economics-modal.js` (≤200 lines).
21. ✅ Settings modal lists all `crm_unit_economics` rows with editable fields.
22. ✅ "Add new event_type" button at bottom.
23. ✅ Save persists changes via direct UPDATE/INSERT (with `tenant_id: getTenantId()` on every write — Rule 22).

### Decision Logic (in JS, computed from view data)
24. ✅ For each campaign: if `leads_num < 30` → "TEST".
25. ✅ For each campaign: if `status = 'Stopped'` → "—".
26. ✅ Otherwise: compute `kill_threshold = kill_multiplier × (gross_margin_pct/100) × 1000` and `scale_threshold = scaling_multiplier × (gross_margin_pct/100) × 1000`. If CAC > kill → "STOP"; if CAC < scale → "SCALE"; else → "TEST".

### Verification
27. ✅ `npm run verify:integrity` exits 0.
28. ✅ All pre-commit hooks pass.
29. ✅ Browser smoke (manual): open screen on demo with seed test data; all 3 status groups render; KPI cards correct; drill-down opens; settings modal opens + saves.
30. ✅ Repo clean at end.

## 4. Autonomy Envelope

**CAN do without asking:**
- DROP + CREATE on `crm_ad_spend`, `crm_unit_economics`, `v_crm_campaign_performance` (Daniel confirmed data not precious; will be wiped during P7 anyway).
- ALTER `crm_facebook_campaigns` (currently empty).
- Re-seed `crm_unit_economics` with new schema.
- Deploy Edge Function via CLI if MCP fails (per known issue).
- Add the new sidebar nav entry to `crm.html`.

**MUST stop and ask if:**
- ANY query reveals that `crm_ad_spend`, `crm_unit_economics`, `v_crm_campaign_performance`, or `crm_facebook_campaigns` is referenced by code we missed (do a fresh `grep` before DROP — even though investigation 2026-04-26 found 0 hits, double-check).
- `crm_campaigns` (the event-type templates table) appears anywhere in the proposed changes — that table is OFF LIMITS.
- The new view definition exceeds 60 lines of SQL — flag for review.
- `js/shared.js` would need new FIELD_MAP entries — it's at 408 lines (over 350 cap). New tables need FIELD_MAP per Rule 5; defer or handle carefully.
- Pre-commit hooks fail.

## 5. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

1. **STOP** if cross-reference grep finds ANY active code (JS / TS / HTML / Astro) that references `crm_ad_spend`, `crm_unit_economics`, or `v_crm_campaign_performance`. Investigation said 0 hits — re-verify before DROP.
2. **STOP** if `crm_campaigns` (NOT `crm_facebook_campaigns`) appears in any proposed DDL or query. That's the event-type templates table — it's a different beast and must not be touched.
3. **STOP** if the view runs slower than 500ms on demo with seed data.
4. **STOP** if Edge Function deploy fails 2× via both MCP and CLI.
5. **STOP** if any pre-commit hook fails. Don't retry with `--no-verify`.

## 6. Rollback Plan

3-commit plan. Rollback paths:
- DB: `DROP TABLE crm_facebook_campaigns; DROP TABLE crm_ad_spend; DROP TABLE crm_unit_economics; DROP VIEW v_crm_campaign_performance;` then re-run `001_crm_schema.sql` migration to restore Phase A baseline. (Note: this loses the 88 historical ad_spend rows — Daniel approved.)
- EF: redeploy previous version (none exists for this slug — first deploy; rollback = delete EF).
- Code: `git revert` per commit.

## 7. Out of Scope

- The Make scenario itself (Daniel builds manually after EF is deployed; SPEC delivers `outputs/MAKE_SCENARIO_FB_CAMPAIGNS_SPEC.md` with payload schema).
- Email/push notifications (badge-only per Daniel's choice).
- ROI % as a 7th KPI card.
- P7 historical migration from Monday (separate SPEC during cutover).
- Comparing 2+ campaigns side-by-side.
- The `crm_campaigns` table (event-type templates — DO NOT TOUCH).
- The `crm_campaign_pages` table (unused, leave alone).

## 8. Expected Final State

### 8.1 — DB schema migration

```sql
-- File: campaigns/supersale/migrations/00X_crm_campaigns_screen.sql

-- 1. Drop the broken view first (depends on old schema)
DROP VIEW IF EXISTS v_crm_campaign_performance;

-- 2. Rebuild crm_ad_spend (data not precious per Daniel — will be re-imported in P7)
DROP TABLE IF EXISTS crm_ad_spend CASCADE;

CREATE TABLE crm_ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id TEXT NOT NULL,                      -- Facebook Campaign ID
  spend_date DATE NOT NULL,                       -- One row per campaign per day
  total_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, campaign_id, spend_date)
);

CREATE INDEX idx_ad_spend_campaign ON crm_ad_spend(tenant_id, campaign_id);
CREATE INDEX idx_ad_spend_date ON crm_ad_spend(tenant_id, spend_date DESC);

ALTER TABLE crm_ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_ad_spend
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_ad_spend
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

---

-- 3. Adapt crm_facebook_campaigns (currently empty — created today by accident, repurposed)
ALTER TABLE crm_facebook_campaigns
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT now();

-- Verify final schema (should already match):
-- id UUID, tenant_id UUID, campaign_id TEXT, name TEXT, status TEXT, event_type TEXT,
-- daily_budget NUMERIC, master TEXT, interests TEXT, raw_data JSONB,
-- last_synced_at TIMESTAMPTZ, first_seen_at TIMESTAMPTZ, created_at, updated_at

---

-- 4. Rebuild crm_unit_economics (schema change — was campaign_id-based, now event_type-based)
DROP TABLE IF EXISTS crm_unit_economics CASCADE;

CREATE TABLE crm_unit_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type TEXT NOT NULL,                       -- 'SuperSale' | 'MultiSale' | etc
  gross_margin_pct NUMERIC(5,2) NOT NULL,         -- 20 = 20% (not 0.20)
  kill_multiplier NUMERIC(5,2) NOT NULL,          -- e.g. 4
  scaling_multiplier NUMERIC(5,2) NOT NULL,       -- e.g. 2
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_type)
);

ALTER TABLE crm_unit_economics ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_unit_economics
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_unit_economics
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

---

-- 5. Recreate the performance view with new architecture
CREATE OR REPLACE VIEW v_crm_campaign_performance AS
WITH latest_spend AS (
  SELECT DISTINCT ON (tenant_id, campaign_id)
    tenant_id, campaign_id, total_spend, spend_date
  FROM crm_ad_spend
  ORDER BY tenant_id, campaign_id, spend_date DESC
),
campaign_totals AS (
  SELECT tenant_id, campaign_id, SUM(total_spend) AS total_spend_all_time
  FROM crm_ad_spend
  GROUP BY tenant_id, campaign_id
)
SELECT
  c.id AS campaign_uuid,
  c.tenant_id,
  c.campaign_id,
  c.name,
  c.status,
  c.event_type,
  c.daily_budget,
  c.master,
  c.interests,
  c.last_synced_at,
  COALESCE(ct.total_spend_all_time, 0) AS total_spend,
  COALESCE(ls.spend_date, NULL) AS last_spend_date,
  COUNT(DISTINCT l.id) AS leads_num,
  COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) AS buyers_num,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0) AS total_revenue,
  CASE WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) > 0
       THEN COALESCE(ct.total_spend_all_time, 0) / COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used'))
       ELSE NULL END AS cac,
  CASE WHEN COUNT(DISTINCT l.id) > 0
       THEN COALESCE(ct.total_spend_all_time, 0) / COUNT(DISTINCT l.id)
       ELSE NULL END AS cpl,
  ue.gross_margin_pct,
  ue.kill_multiplier,
  ue.scaling_multiplier,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0)
    * COALESCE(ue.gross_margin_pct, 0) / 100 - COALESCE(ct.total_spend_all_time, 0) AS gross_profit
FROM crm_facebook_campaigns c
LEFT JOIN campaign_totals ct ON ct.tenant_id = c.tenant_id AND ct.campaign_id = c.campaign_id
LEFT JOIN latest_spend ls ON ls.tenant_id = c.tenant_id AND ls.campaign_id = c.campaign_id
LEFT JOIN crm_leads l ON l.utm_campaign_id = c.campaign_id AND l.tenant_id = c.tenant_id
LEFT JOIN crm_event_attendees a ON a.lead_id = l.id AND a.tenant_id = c.tenant_id
LEFT JOIN crm_unit_economics ue ON ue.event_type = c.event_type AND ue.tenant_id = c.tenant_id
GROUP BY c.id, c.tenant_id, c.campaign_id, c.name, c.status, c.event_type, c.daily_budget,
         c.master, c.interests, c.last_synced_at, ct.total_spend_all_time, ls.spend_date,
         ue.gross_margin_pct, ue.kill_multiplier, ue.scaling_multiplier;

GRANT SELECT ON v_crm_campaign_performance TO authenticated;

---

-- 6. Ensure index on crm_leads.utm_campaign_id exists
CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_campaign_id
  ON crm_leads(tenant_id, utm_campaign_id)
  WHERE utm_campaign_id IS NOT NULL;

---

-- 7. Seed unit_economics
INSERT INTO crm_unit_economics (tenant_id, event_type, gross_margin_pct, kill_multiplier, scaling_multiplier)
SELECT id, 'SuperSale', 20, 4, 2 FROM tenants WHERE slug IN ('demo', 'prizma')
ON CONFLICT (tenant_id, event_type) DO NOTHING;

INSERT INTO crm_unit_economics (tenant_id, event_type, gross_margin_pct, kill_multiplier, scaling_multiplier)
SELECT id, 'MultiSale', 50, 3, 1.5 FROM tenants WHERE slug IN ('demo', 'prizma')
ON CONFLICT (tenant_id, event_type) DO NOTHING;
```

### 8.2 — Edge Function

New file `supabase/functions/facebook-campaigns-sync/index.ts` (~180 lines):
- POST endpoint, `verify_jwt: true`.
- Accepts `{ tenant_slug, campaigns: [...] }`.
- Resolves tenant_id from slug.
- Per campaign: 2 UPSERTs (one to `crm_facebook_campaigns` with metadata, one to `crm_ad_spend` with today's snapshot).
- Returns counts.

### 8.3 — Frontend files

- New `modules/crm/crm-campaigns.js` (~280 lines target, max 350).
- New `modules/crm/crm-campaigns-detail.js` (~150 lines) — drill-down modal.
- New `modules/crm/crm-unit-economics-modal.js` (~120 lines) — settings modal.
- Modify `crm.html` (~5 lines): sidebar nav entry + panel container + 3 script tags.
- Modify `crm-init.js` (1-2 lines): add `case 'campaigns'` to tab switcher.

## 9. Commit Plan

**Commit 1 — DB foundation:**
```
feat(crm): rebuild campaigns DB infrastructure for measurement screen

- Rebuild crm_ad_spend with daily-snapshot schema (tenant_id, campaign_id, spend_date)
- Rebuild crm_unit_economics with event_type-based schema (was campaign_id-based)
- Adapt crm_facebook_campaigns (add first_seen_at)
- Recreate v_crm_campaign_performance to match new architecture
- Seed unit_economics for SuperSale + MultiSale on demo + prizma
- Existing 88 ad_spend rows + 2 unit_economics rows DROPPED (Daniel approved;
  P7 cutover will re-import all data from Monday anyway).
```

**Commit 2 — Edge Function:**
```
feat(crm): facebook-campaigns-sync EF for Make → Supabase pipeline

POST endpoint receives Facebook campaign data from Make every 4 hours,
performs 2 UPSERTs per campaign: metadata to crm_facebook_campaigns,
daily snapshot to crm_ad_spend. Daniel will build the Make scenario
manually after EF is deployed.
```

**Commit 3 — Frontend screen:**
```
feat(crm): campaigns measurement screen (Mockup C: dashboard + drill-down)

New "קמפיינים" sidebar tab. 6 KPI cards (Spend, Revenue, CAC, Leads,
Buyers, Gross Profit) + 8-column table grouped by status (Live/Paused/
Stopped) with auto-decision (STOP/SCALE/TEST). Click row for drill-down.
Gear icon opens Unit Economics settings.

Decision logic uses multipliers formula:
  kill_threshold = kill_multiplier × (gross_margin_pct/100) × 1000
  scale_threshold = scaling_multiplier × (gross_margin_pct/100) × 1000
TEST if leads_num < 30; no decision if Facebook-stopped.
```

## 10. Pre-flight Checks (executor runs before any edit)

1. `git status --porcelain` is clean (or contains only this SPEC file).
2. `outputs/M4_CAMPAIGNS_SCREEN_SPEC_DRAFT.md` exists.
3. `outputs/campaign-mockups/C-dashboard-drill.html` exists (reference).
4. **Re-verify investigation findings:** grep for `crm_ad_spend`, `crm_unit_economics`, `v_crm_campaign_performance`, `crm_facebook_campaigns` across `**/*.js`, `**/*.ts`, `**/*.html`, `**/*.astro`. Expect ZERO active code references (only docs/specs/migrations).
5. **Cross-reference check** for new objects: grep `crm_facebook_campaigns`, `crm_unit_economics`, `v_crm_campaign_performance` against `docs/GLOBAL_SCHEMA.sql`, `MODULE_MAP.md`. Expect 0 NEW collisions (the existing entries in db-schema.sql will need updating during Integration Ceremony).
6. Verify `crm_leads.utm_campaign_id` column exists (added 2026-04-26 via commit 7d59544).
7. Verify `crm_event_attendees.payment_status` + `purchase_amount` columns exist.
8. Verify `crm_campaigns` (event-type templates) is referenced in `crm-event-actions.js:22` (`loadCampaigns()`) — confirms the table is in active use and we must not touch it.
9. `wc -l modules/crm/crm-campaigns.js` should fail (file doesn't exist yet).

## 11. Lessons Already Incorporated

- **Step 1.5e (file-size + hook-counter):** all 3 new JS files target ≤280 lines with 350 hard cap as stop trigger.
- **Step 1.5g (co-staged file pre-flight):** Commit 3 modifies `crm.html` + `crm-init.js` + creates 3 new files. Run rule-21-orphans simulation on staged set; if collision flagged → split into sub-commits.
- **Step 1.5i (console probe):** N/A — no observable-format helpers.
- **Cross-Reference Check completed 2026-04-26 against current DB state:** documented thoroughly in §2 Background. The DROP+CREATE approach is approved by Daniel because data isn't precious (P7 will re-import). Investigation found 0 active code references to the dropped objects.
- **Iron Rule 14 (tenant_id):** all 3 modified tables have `tenant_id UUID NOT NULL`.
- **Iron Rule 15 (RLS):** all 3 modified tables get the canonical 2-policy pattern.
- **Iron Rule 18 (UNIQUE with tenant_id):** all UNIQUEs include `tenant_id`.
- **Iron Rule 21 (No Orphans/Duplicates):** the v1 SPEC's mistake was creating `crm_facebook_campaigns` as a duplicate of `crm_ad_spend`. v2 fixes this by giving each table a clear distinct purpose: `crm_facebook_campaigns` = metadata (1 row per campaign), `crm_ad_spend` = snapshots (N rows per campaign over time).
- **Iron Rule 22 (defense-in-depth):** every UPDATE/INSERT in the new JS includes `tenant_id: getTenantId()`.
- **MCP Edge Function deploy bug:** if `mcp__supabase__deploy_edge_function` fails 2× — fall back to `supabase functions deploy facebook-campaigns-sync` CLI. Don't retry MCP a 3rd time.
- **Make scenario delivery:** at end of SPEC, write `outputs/MAKE_SCENARIO_FB_CAMPAIGNS_SPEC.md` for Daniel — explains what to build (3 modules: Facebook Insights → JSON aggregator → POST to EF), the EF URL, payload schema, frequency (every 4 hours).

## 12. QA Protocol

### Path 0 — Baseline reset
1. Verify on `develop`, repo clean.
2. Verify Make scenario for current Facebook ADS sync IS NOT touched (we're building parallel infra).

### Path 1 — DB migration
1. Apply migration to demo.
2. Run:
   ```sql
   SELECT count(*) FROM crm_facebook_campaigns; -- expect 0
   SELECT count(*) FROM crm_ad_spend; -- expect 0 (rebuilt empty)
   SELECT count(*) FROM crm_unit_economics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo'); -- expect 2
   SELECT * FROM v_crm_campaign_performance LIMIT 1; -- expect 0 rows but no error
   ```
3. Apply migration to prizma. Verify same.

### Path 2 — Edge Function
1. Deploy via MCP first; if it fails, CLI.
2. Curl test:
   ```bash
   curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync' \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -d '{
       "tenant_slug": "demo",
       "campaigns": [{
         "campaign_id": "120243589267430789",
         "name": "TEST קמפיין",
         "status": "Active",
         "event_type": "SuperSale",
         "daily_budget": 100,
         "master": "test_master",
         "interests": "test_interests",
         "total_spend": 1234.56
       }]
     }'
   ```
3. Expect `{ok: true, processed: 1, metadata_inserted: 1, metadata_updated: 0, spend_inserted: 1, spend_updated: 0}`.
4. Re-run same curl — expect `{ok: true, processed: 1, metadata_inserted: 0, metadata_updated: 1, spend_inserted: 0, spend_updated: 1}`.
5. Cleanup: `DELETE FROM crm_ad_spend WHERE campaign_id = '120243589267430789'; DELETE FROM crm_facebook_campaigns WHERE campaign_id = '120243589267430789';`

### Path 3 — Frontend smoke (manual, on localhost:3000)
1. Open ERP, log into demo tenant.
2. Navigate to CRM → "קמפיינים" tab.
3. Empty state: "אין קמפיינים עדיין — הסנכרון מ-Facebook יתחיל בקרוב".
4. Manually insert 5 test campaigns + spend rows via SQL (mix of Active/Paused/Stopped + SuperSale/MultiSale).
5. Refresh — verify 6 KPI cards correct sums.
6. Verify 3 status groups present.
7. Click row — drill-down opens with full details + multiplier explanation.
8. Click gear icon → settings modal opens, 2 rows.
9. Edit row, save — verify DB updated.
10. Cleanup test data.

### Path 4 — Decision logic verification
For each test campaign, verify the badge:
- leads_num=10 → "TEST".
- status='Stopped' → "—".
- leads_num=50, CAC=300, event_type=SuperSale (gross=20, kill=4, scale=2) → kill=800, scale=400 → CAC<400 → "SCALE".
- leads_num=50, CAC=600, event_type=SuperSale → between 400 and 800 → "TEST".
- leads_num=50, CAC=1000, event_type=SuperSale → > 800 → "STOP".

### Path 5 — Commit & push
3 commits per §9. All push to develop. Pre-commit hooks pass each time.

---

*End of SPEC v2 draft. Author: opticup-strategic in Cowork session 2026-04-26.*
