# SPEC — M4_CAMPAIGNS_SCREEN

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/SPEC.md`
> **Author:** opticup-strategic (drafted in Cowork 2026-04-26)
> **Drives:** New campaigns measurement screen for CRM, replacing the Monday "Facebook ADS" board with a custom-built integrated solution.

---

## 1. Goal

Build a complete campaign performance measurement system inside the CRM:
1. New `crm_facebook_campaigns` table — synced from Facebook Ads via Make every 4 hours.
2. New `crm_unit_economics` table — manually-entered profit margins + Kill/Scale CAC thresholds per event_type.
3. New `facebook-campaigns-sync` Edge Function — receives data from Make scenario.
4. New CRM screen "קמפיינים" (sidebar nav) — Mockup C layout (6 KPI cards + compact 8-column table + drill-down modal).
5. Settings modal for Unit Economics (gear icon in screen corner).
6. Auto-decision logic per campaign (STOP/SCALE/TEST) based on Unit Economics.

## 2. Background

Daniel currently manages campaigns through 3 Monday boards: "Facebook ADS" (campaigns + Make sync from Facebook), "Affiliates" (leads with UTMs), and "Unit Economics" (manual margin/threshold settings). The Optic Up CRM already has the leads side (with `utm_campaign_id` link, fixed in commit 7d59544 earlier today). What's missing is the campaigns side and the screen that ties them together.

Daniel chose Mockup C (Dashboard + Drill-Down) over A (Table-First) and B (Card-First) because it answers "how was the week?" in 2 seconds and provides drill-down only when needed. He also chose:
- Sidebar nav placement (option A in screen-location question).
- Gear icon for settings (option B in settings UX question).
- 6 KPI cards exactly as mockup proposed (Spend, Revenue, CAC, Leads, Buyers, Gross Profit).
- 8-column table (added Revenue + Buyers to mockup's 6).
- Auto-decision rules: TEST < 30 leads, no decision for Facebook-Stopped campaigns, badge-only alerts (no flashing/notifications).

## 3. Success Criteria

All measurable, all binary pass/fail.

### Database
1. ✅ Table `crm_facebook_campaigns` exists with `tenant_id` UUID NOT NULL + RLS canonical pattern.
2. ✅ Table `crm_unit_economics` exists with `tenant_id` UUID NOT NULL + RLS canonical pattern.
3. ✅ Index on `crm_facebook_campaigns(tenant_id, campaign_id)` — UNIQUE.
4. ✅ Index on `crm_facebook_campaigns(tenant_id, status)` — for status grouping.
5. ✅ Index on `crm_leads(tenant_id, utm_campaign_id)` (carry-over from earlier audit, missing today).
6. ✅ View `v_crm_campaign_performance` returns aggregated metrics per campaign (joins `crm_facebook_campaigns` + `crm_leads` + `crm_event_attendees` + payments).
7. ✅ Seed `crm_unit_economics` with 2 rows on demo + 2 on prizma: `SuperSale` (gross_margin=0.20, kill_cac=800, scale_cac=400) + `MultiSale` (gross_margin=0.50, kill_cac=1200, scale_cac=600). Numbers from mockup; can be adjusted via UI later.

### Edge Function
8. ✅ Edge Function `facebook-campaigns-sync` deployed and active.
9. ✅ EF accepts POST with array of campaigns from Make: `{ tenant_id, campaigns: [{campaign_id, name, status, event_type, total_spend, daily_budget, master, interests, ...}] }`.
10. ✅ EF performs UPSERT on `(tenant_id, campaign_id)` — new campaigns inserted, existing ones updated.
11. ✅ EF returns `{ok: true, processed: N, inserted: M, updated: K}` on success.
12. ✅ `verify_jwt: true` — only authenticated calls accepted.

### Frontend — Screen
13. ✅ New file `modules/crm/crm-campaigns.js` (≤350 lines, Iron Rule 12).
14. ✅ Sidebar nav in `crm.html` has new entry "📈 קמפיינים" between "Events" and "Messaging Hub".
15. ✅ Loading the tab fetches data from `v_crm_campaign_performance` and renders.
16. ✅ Top section: 6 KPI cards (Spend, Revenue, CAC, Leads, Buyers, Gross Profit) — gradient backgrounds matching existing CRM palette.
17. ✅ Bottom section: 8-column table grouped by status (Live & Scaling / Paused / Stopped) with sum rows per group.
18. ✅ Decision column shows colored badge: SCALE (emerald), TEST (slate), STOP (rose), or "—" if Facebook-stopped.
19. ✅ Click on table row opens modal with full details (all Facebook fields + computed metrics).
20. ✅ Gear icon (top-right) opens Unit Economics settings modal.

### Frontend — Settings
21. ✅ Settings modal lists all `crm_unit_economics` rows with editable fields.
22. ✅ "Add new event_type" button at bottom of modal.
23. ✅ Save button persists changes via direct UPDATE/INSERT (with `tenant_id: getTenantId()` on every write — Rule 22).

### Decision Logic
24. ✅ For each campaign: if `leads_num < 30` → "TEST" (regardless of CAC).
25. ✅ For each campaign: if `facebook_status === 'Stopped'` → no decision (show "—").
26. ✅ Otherwise: if CAC > `kill_cac` for that event_type → "STOP"; if CAC < `scale_cac` → "SCALE"; else → "TEST".

### Verification
27. ✅ `npm run verify:integrity` exits 0.
28. ✅ All pre-commit hooks pass.
29. ✅ Browser smoke: open the screen on demo (with seed data), all 3 status groups render, KPI cards show correct sums, drill-down modal opens, settings modal opens and saves.
30. ✅ Repo clean at end.

## 4. Autonomy Envelope

**CAN do without asking:**
- All migrations on demo + prizma (per existing pattern for Module 4 schema work).
- Deploy Edge Function via CLI or MCP (use CLI if MCP fails — known issue from earlier session).
- Add the new sidebar nav entry to `crm.html`.
- Seed the `crm_unit_economics` rows.
- Apply Mockup C layout exactly as preview shows in `outputs/campaign-mockups/C-dashboard-drill.html` — adapt to live data.

**MUST stop and ask if:**
- The View definition becomes too complex (>50 lines of SQL) — flag for review.
- A new column needs to be added to `crm_leads` or `crm_event_attendees` (these are owned by other Module 4 specs).
- The sidebar nav entry placement causes layout issues with existing 5 tabs.
- Browser smoke fails on any of the 3 status groups.
- Pre-commit hooks fail.

## 5. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

1. **STOP** if any of the 23 `crm_*` tables already in the schema has a column conflict with proposed new columns. Run cross-reference check.
2. **STOP** if `js/shared.js` would need new FIELD_MAP entries for the new tables — it's at 408 lines (over 350 cap). New tables need FIELD_MAP per Rule 5; this needs to be deferred or handled carefully.
3. **STOP** if the View `v_crm_campaign_performance` runs slower than 500ms on demo — investigate before commit.
4. **STOP** if the Edge Function deploy fails 2 consecutive times via both MCP and CLI — escalate.
5. **STOP** if any pre-commit hook fails. Do not retry with `--no-verify`.

## 6. Rollback Plan

3-commit plan (per §9). Rollback options:
- DB rollback: `DROP TABLE crm_facebook_campaigns; DROP TABLE crm_unit_economics; DROP VIEW v_crm_campaign_performance;` — clean (these tables have no FKs from existing data).
- EF rollback: redeploy previous version (none exists for this slug yet — first deploy).
- Code rollback: `git revert <hash>` for each of the 3 commits.

## 7. Out of Scope

- The Make scenario itself (Daniel builds manually after EF is deployed; provide him with the EF URL + payload schema).
- Email/push notifications for STOP-decisions (badge-only alerts per Daniel's choice).
- ROI % as a 7th KPI card (computable from existing — add later if needed).
- Historical data migration from Monday boards (separate SPEC during P7 cutover).
- Comparing 2+ campaigns side-by-side (drill-down modal only handles 1 at a time).

## 8. Expected Final State

### 8.1 — DB schema additions (SQL migration)

```sql
-- File: campaigns/supersale/migrations/00X_crm_campaigns.sql

CREATE TABLE crm_facebook_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id TEXT NOT NULL,                    -- Facebook Campaign ID (15-digit)
  name TEXT NOT NULL,                           -- Campaign name from Facebook
  status TEXT NOT NULL DEFAULT 'unknown',       -- 'Active' | 'Paused' | 'Stopped' | 'unknown'
  event_type TEXT,                              -- 'SuperSale' | 'MultiSale' | etc — links to crm_unit_economics
  total_spend NUMERIC(10,2) DEFAULT 0,
  daily_budget NUMERIC(10,2) DEFAULT 0,
  master TEXT,                                  -- Master targeting data
  interests TEXT,                               -- Interests targeting
  raw_data JSONB,                               -- Full raw payload from Facebook for future fields
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, campaign_id)
);

CREATE INDEX idx_fb_campaigns_status ON crm_facebook_campaigns(tenant_id, status);

ALTER TABLE crm_facebook_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON crm_facebook_campaigns
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON crm_facebook_campaigns
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

---

CREATE TABLE crm_unit_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type TEXT NOT NULL,                     -- 'SuperSale' | 'MultiSale' | etc
  gross_margin NUMERIC(5,4) NOT NULL,           -- 0.20 = 20%
  kill_cac NUMERIC(10,2) NOT NULL,              -- if CAC > this, decision = STOP
  scale_cac NUMERIC(10,2) NOT NULL,             -- if CAC < this, decision = SCALE
  kill_multiplier INTEGER DEFAULT 4,            -- For future logic
  scale_multiplier INTEGER DEFAULT 6,           -- For future logic
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

-- Add the missing index from earlier audit:
CREATE INDEX IF NOT EXISTS idx_crm_leads_utm_campaign_id
  ON crm_leads(tenant_id, utm_campaign_id)
  WHERE utm_campaign_id IS NOT NULL;

---

-- View aggregating campaign performance:
CREATE OR REPLACE VIEW v_crm_campaign_performance AS
SELECT
  c.id AS campaign_uuid,
  c.tenant_id,
  c.campaign_id,
  c.name,
  c.status,
  c.event_type,
  c.total_spend,
  c.daily_budget,
  c.master,
  c.interests,
  c.last_synced_at,
  COUNT(DISTINCT l.id) AS leads_num,
  COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) AS buyers_num,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0) AS total_revenue,
  CASE WHEN COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) > 0
       THEN c.total_spend / COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used'))
       ELSE NULL END AS cac,
  CASE WHEN COUNT(DISTINCT l.id) > 0
       THEN c.total_spend / COUNT(DISTINCT l.id)
       ELSE NULL END AS cpl,
  ue.gross_margin,
  ue.kill_cac,
  ue.scale_cac,
  COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0) * COALESCE(ue.gross_margin, 0) - c.total_spend AS gross_profit
FROM crm_facebook_campaigns c
LEFT JOIN crm_leads l ON l.utm_campaign_id = c.campaign_id AND l.tenant_id = c.tenant_id
LEFT JOIN crm_event_attendees a ON a.lead_id = l.id AND a.tenant_id = c.tenant_id
LEFT JOIN crm_unit_economics ue ON ue.event_type = c.event_type AND ue.tenant_id = c.tenant_id
GROUP BY c.id, c.tenant_id, c.campaign_id, c.name, c.status, c.event_type, c.total_spend, c.daily_budget, c.master, c.interests, c.last_synced_at, ue.gross_margin, ue.kill_cac, ue.scale_cac;

GRANT SELECT ON v_crm_campaign_performance TO authenticated;

---

-- Seed Unit Economics for both tenants:
INSERT INTO crm_unit_economics (tenant_id, event_type, gross_margin, kill_cac, scale_cac)
SELECT id, 'SuperSale', 0.20, 800, 400 FROM tenants WHERE slug IN ('demo', 'prizma')
ON CONFLICT (tenant_id, event_type) DO NOTHING;

INSERT INTO crm_unit_economics (tenant_id, event_type, gross_margin, kill_cac, scale_cac)
SELECT id, 'MultiSale', 0.50, 1200, 600 FROM tenants WHERE slug IN ('demo', 'prizma')
ON CONFLICT (tenant_id, event_type) DO NOTHING;
```

### 8.2 — Edge Function

New file `supabase/functions/facebook-campaigns-sync/index.ts` (~150 lines):
- POST endpoint, `verify_jwt: true`.
- Accepts `{ tenant_id: UUID, campaigns: Campaign[] }` (or `{ tenant_slug }` resolved server-side).
- Loops campaigns, performs UPSERT on `(tenant_id, campaign_id)`.
- Returns counts.

### 8.3 — Frontend files

- New `modules/crm/crm-campaigns.js` (~280 lines target, max 350).
- New `modules/crm/crm-campaigns-detail.js` (~150 lines) — drill-down modal.
- New `modules/crm/crm-unit-economics-modal.js` (~120 lines) — settings modal.
- Modify `crm.html` (~5 lines added):
  - Sidebar nav entry: `<button data-tab="campaigns">📈 קמפיינים</button>`
  - New panel container: `<section id="campaigns-tab" class="tab-panel hidden">...</section>`
  - 3 new `<script>` tags for the new JS files.
- Modify `crm-init.js` (1-2 lines): add `case 'campaigns'` to tab switcher.

## 9. Commit Plan

**Commit 1 — DB foundation:**
```
feat(crm): add facebook_campaigns + unit_economics tables + performance view

- New crm_facebook_campaigns table (synced from Facebook via Make)
- New crm_unit_economics table (manual margin + thresholds)
- New v_crm_campaign_performance view (aggregates leads + attendees + revenue)
- Seed unit_economics for SuperSale + MultiSale on demo + prizma
- Add missing idx_crm_leads_utm_campaign_id index
```

**Commit 2 — Edge Function:**
```
feat(crm): facebook-campaigns-sync EF for Make → Supabase pipeline

POST endpoint receives Facebook campaign data from Make every 4 hours,
performs UPSERT on (tenant_id, campaign_id). Daniel will build the
Make scenario manually after this is deployed.
```

**Commit 3 — Frontend screen:**
```
feat(crm): campaigns measurement screen (Mockup C: dashboard + drill-down)

New "קמפיינים" sidebar tab in CRM. Shows 6 KPI cards (Spend, Revenue,
CAC, Leads, Buyers, Gross Profit) + 8-column table grouped by status
with auto-decision (STOP/SCALE/TEST). Click row for drill-down modal.
Gear icon opens Unit Economics settings.

Decision logic: TEST if <30 leads; no decision if Facebook-stopped;
otherwise STOP/SCALE/TEST based on per-event_type thresholds.
```

## 10. Pre-flight Checks (executor runs before any edit)

1. `git status --porcelain` is clean (or contains only this SPEC file).
2. `outputs/M4_CAMPAIGNS_SCREEN_SPEC_DRAFT.md` exists (this file).
3. `outputs/campaign-mockups/C-dashboard-drill.html` exists (reference for layout).
4. Cross-reference check: grep for `facebook_campaigns`, `unit_economics`, `v_crm_campaign_performance` against `docs/GLOBAL_SCHEMA.sql`, `modules/Module 4 - CRM/docs/db-schema.sql`, and `MODULE_MAP.md`. Expect 0 collisions.
5. Verify `crm_leads.utm_campaign_id` column exists (added 2026-04-26 via commit 7d59544).
6. Verify `crm_event_attendees.payment_status` + `purchase_amount` columns exist (Payment Lifecycle SPECs).
7. `wc -l modules/crm/crm-campaigns.js` should fail (file doesn't exist yet — confirm).
8. Verify `crm.html` line count + identify safe insertion point for new sidebar entry + script tags.

## 11. Lessons Already Incorporated

- **Step 1.5e (file-size pre-flight + hook-counter):** all 3 new JS files target ≤280 lines with the 350 hard cap as the stop trigger; `crm.html` modifications are minimal (~5 lines added).
- **Step 1.5g (co-staged file pre-flight):** Commit 3 modifies `crm.html` + `crm-init.js` + creates 3 new files. Run rule-21-orphans simulation on the staged set before commit. If it flags anything — split into sub-commits.
- **Step 1.5i (console probe):** N/A — this SPEC builds new screens, no observable-format helpers introduced.
- **Cross-Reference Check completed 2026-04-26 against GLOBAL_SCHEMA + GLOBAL_MAP:** 0 collisions expected (verify in §10.4). New table names + view name + EF slug are all greenfield.
- **Bounded Autonomy:** all migrations on demo + prizma per Module 4 pattern (no need to ask per migration).
- **Iron Rule 14 (tenant_id):** all 2 new tables have `tenant_id UUID NOT NULL`.
- **Iron Rule 15 (RLS):** both new tables get the canonical 2-policy pattern (service_bypass + tenant_isolation with JWT-claim).
- **Iron Rule 18 (UNIQUE with tenant_id):** all UNIQUEs include `tenant_id`.
- **Iron Rule 22 (defense-in-depth):** every UPDATE/INSERT in the new JS files includes `tenant_id: getTenantId()`.
- **MCP Edge Function deploy bug (from morning session):** if `mcp__supabase__deploy_edge_function` fails twice — fall back to `supabase functions deploy facebook-campaigns-sync` CLI. Don't retry MCP a 3rd time.
- **Make scenario delivery:** at end of SPEC, write `outputs/MAKE_SCENARIO_FB_CAMPAIGNS_SPEC.md` for Daniel — explains what to build in Make (3 modules: Facebook Insights → JSON → POST to EF) and the EF URL + payload schema. This is the only manual handoff piece.

## 12. QA Protocol

### Path 0 — Baseline reset
1. Verify on `develop`, repo clean.
2. Verify Make scenario for current Facebook ADS sync IS NOT touched (we're building parallel infra).

### Path 1 — DB migration
1. Apply migration to demo. Run:
   ```sql
   SELECT count(*) FROM crm_facebook_campaigns; -- expect 0
   SELECT count(*) FROM crm_unit_economics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo'); -- expect 2
   SELECT * FROM v_crm_campaign_performance LIMIT 1; -- expect 0 rows but no error
   ```
2. Apply migration to prizma. Verify same.

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
         "total_spend": 1234.56,
         "daily_budget": 100,
         "master": "test_master",
         "interests": "test_interests"
       }]
     }'
   ```
3. Expect `{ok: true, processed: 1, inserted: 1, updated: 0}`.
4. Re-run same curl — expect `{ok: true, processed: 1, inserted: 0, updated: 1}`.
5. Cleanup: `DELETE FROM crm_facebook_campaigns WHERE name = 'TEST קמפיין' AND tenant_id = (SELECT id FROM tenants WHERE slug = 'demo');`

### Path 3 — Frontend smoke (manual, on localhost:3000)
1. Open ERP, log into demo tenant.
2. Navigate to CRM → "קמפיינים" tab.
3. Empty state: should show "אין קמפיינים עדיין — הסנכרון מ-Facebook יתחיל בקרוב".
4. Manually insert 5 test campaigns via SQL (mix of Active/Paused/Stopped + SuperSale/MultiSale).
5. Refresh — verify 6 KPI cards show correct sums.
6. Verify table groups are present (Live & Scaling / Paused / Stopped).
7. Click a row — drill-down modal opens with full details.
8. Click gear icon → settings modal opens with 2 rows (SuperSale, MultiSale).
9. Edit a row, save — verify DB updated.
10. Cleanup test campaigns.

### Path 4 — Decision logic verification
For each campaign in test set, verify the decision badge matches:
- Campaign with leads_num=10 → "TEST" (regardless of CAC).
- Campaign with status='Stopped' → "—".
- Campaign with leads_num=50, CAC=300, event_type=SuperSale → "SCALE" (300 < 400).
- Campaign with leads_num=50, CAC=600, event_type=SuperSale → "TEST" (between 400 and 800).
- Campaign with leads_num=50, CAC=1000, event_type=SuperSale → "STOP" (1000 > 800).

### Path 5 — Commit & push
3 commits per §9. All push to develop. Pre-commit hooks pass each time.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26.*
