# RUNG 1 ACTIVATION PROMPT — DB schema additions + get_campaign_performance function

> **Paste this entire prompt to opticup-executor. It is self-contained.**
> **Authorisation:** Foreman (opticup-strategic) approved 2026-05-02 in `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md`.
> **Order:** This is Rung 1 of 3. Rung 2 (EF + Make) and Rung 3 (UI) are dispatched separately.

---

## 0. Activate skills

Load `opticup-guardian` first, then `opticup-executor`. This is ERP repo (`opticalis/opticup`), not storefront.

## 1. Context

You are executing Rung 1 of `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE`. The full SPEC lives at:
`modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/SPEC.md`

The Foreman review at `.../FOREMAN_REVIEW.md` resolves the open decisions and captures 7 deltas to the SPEC. **You execute against this prompt + the FOREMAN_REVIEW, not against the raw SPEC.** The SPEC is reference; this prompt is the contract.

### Decisions already made by Foreman (do not re-litigate)

- **§5.7 = Path X3** (defer city/audience extraction). BUT: ship the columns `city TEXT NULL` + `audience_label TEXT NULL` in this Rung anyway — additive, NULL-safe, gives the deferred SPEC a landing zone.
- **§5.3 = Path A** (function, not materialised view).
- **`v_crm_campaign_performance` stays as a wrapper view** that calls the new function. Do NOT drop the view name. Replace its definition only. This keeps `modules/crm/crm-campaigns.js:64` working between Rungs.
- **Migration file path = `modules/Module 4 - CRM/migrations/2026_05_02_campaigns_v2_01_schema_and_function.sql`** (Module 4's date-based convention; the SPEC's `campaigns/supersale/migrations/00X_…` path is wrong).

## 2. Pre-flight (run in order, STOP on any failure)

```bash
# 2.1 Branch check
git branch --show-current   # must be 'develop'

# 2.2 Repo state
git status --porcelain
# Acceptable: empty, OR contains only files inside modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/
# If anything else is dirty — STOP and report to user.

# 2.3 Integrity gate
npm run verify:integrity   # exit 0 required

# 2.4 Confirm function does NOT exist
# Run via Supabase MCP execute_sql:
#   SELECT proname FROM pg_proc WHERE proname='get_campaign_performance';
# Expected: 0 rows.

# 2.5 Confirm new columns do NOT exist
# Run via Supabase MCP execute_sql:
#   SELECT column_name FROM information_schema.columns
#   WHERE table_schema='public'
#     AND table_name IN ('crm_facebook_campaigns','crm_ad_spend')
#     AND column_name IN ('start_time','city','audience_label','impressions','clicks');
# Expected: 0 rows.

# 2.6 Cross-table column-name collision check (per executor improvement proposal SE-1)
# Run via Supabase MCP execute_sql:
#   SELECT table_name, column_name FROM information_schema.columns
#   WHERE table_schema='public' AND column_name IN ('start_time','city','audience_label','impressions','clicks')
#   ORDER BY column_name, table_name;
# If hits exist on OTHER tables — review semantics with Foreman before proceeding.

# 2.7 Old view exists and is referenced
# Confirm:
grep -rn "v_crm_campaign_performance" --include="*.js" --include="*.html" .
# Expected: at minimum, modules/crm/crm-campaigns.js:64 + a comment in crm-campaigns-detail.js.
# These will continue to work because the view stays as a wrapper.
```

## 3. Migration file — exact content

Create `modules/Module 4 - CRM/migrations/2026_05_02_campaigns_v2_01_schema_and_function.sql` with the following content:

```sql
-- =========================================================================
-- M4 CAMPAIGNS v2 — Rung 1: schema additions + range-aware function
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/
-- Authorised: opticup-strategic Foreman review 2026-05-02
-- =========================================================================

-- Step 1: additive columns on crm_facebook_campaigns
ALTER TABLE crm_facebook_campaigns
  ADD COLUMN IF NOT EXISTS start_time     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS city           TEXT        NULL,
  ADD COLUMN IF NOT EXISTS audience_label TEXT        NULL;

-- Step 2: additive columns on crm_ad_spend
ALTER TABLE crm_ad_spend
  ADD COLUMN IF NOT EXISTS impressions BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks      BIGINT NOT NULL DEFAULT 0;

-- Step 3: drop the old view (will be recreated as wrapper at Step 5)
DROP VIEW IF EXISTS v_crm_campaign_performance;

-- Step 4: create range-aware function
-- Returns the same column shape as the old view, plus 6 new columns:
--   start_time, days_running, impressions, clicks, ctr, roas
-- All metrics are filtered by [p_range_start, p_range_end] inclusive.
CREATE OR REPLACE FUNCTION get_campaign_performance(
  p_tenant_id    UUID,
  p_range_start  DATE,
  p_range_end    DATE
)
RETURNS TABLE (
  campaign_uuid       UUID,
  tenant_id           UUID,
  campaign_id         TEXT,
  name                TEXT,
  status              TEXT,
  event_type          TEXT,
  daily_budget        NUMERIC,
  master              TEXT,
  interests           TEXT,
  last_synced_at      TIMESTAMPTZ,
  start_time          TIMESTAMPTZ,
  city                TEXT,
  audience_label      TEXT,
  total_spend         NUMERIC,
  last_spend_date     DATE,
  impressions         BIGINT,
  clicks              BIGINT,
  ctr                 NUMERIC,
  days_running        INT,
  leads_num           BIGINT,
  buyers_num          BIGINT,
  total_revenue       NUMERIC,
  cac                 NUMERIC,
  cpl                 NUMERIC,
  roas                NUMERIC,
  gross_margin_pct    NUMERIC,
  kill_multiplier     NUMERIC,
  scaling_multiplier  NUMERIC,
  gross_profit        NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH range_spend AS (
    SELECT
      s.tenant_id,
      s.campaign_id,
      SUM(s.total_spend)  AS total_spend,
      SUM(s.impressions)  AS impressions,
      SUM(s.clicks)       AS clicks,
      MAX(s.spend_date)   AS last_spend_date
    FROM crm_ad_spend s
    WHERE s.tenant_id = p_tenant_id
      AND s.spend_date BETWEEN p_range_start AND p_range_end
    GROUP BY s.tenant_id, s.campaign_id
  ),
  range_leads AS (
    SELECT
      l.tenant_id,
      l.utm_campaign_id AS campaign_id,
      COUNT(DISTINCT l.id) AS leads_num
    FROM crm_leads l
    WHERE l.tenant_id = p_tenant_id
      AND l.created_at::date BETWEEN p_range_start AND p_range_end
      AND l.utm_campaign_id IS NOT NULL
    GROUP BY l.tenant_id, l.utm_campaign_id
  ),
  range_attendees AS (
    SELECT
      a.tenant_id,
      l.utm_campaign_id AS campaign_id,
      COUNT(DISTINCT a.id) FILTER (WHERE a.payment_status IN ('paid','credit_used')) AS buyers_num,
      COALESCE(SUM(a.purchase_amount) FILTER (WHERE a.payment_status IN ('paid','credit_used')), 0) AS total_revenue
    FROM crm_event_attendees a
    JOIN crm_leads l ON l.id = a.lead_id AND l.tenant_id = a.tenant_id
    WHERE a.tenant_id = p_tenant_id
      AND a.registered_at::date BETWEEN p_range_start AND p_range_end
      AND l.utm_campaign_id IS NOT NULL
    GROUP BY a.tenant_id, l.utm_campaign_id
  )
  SELECT
    c.id            AS campaign_uuid,
    c.tenant_id,
    c.campaign_id,
    c.name,
    c.status,
    c.event_type,
    c.daily_budget,
    c.master,
    c.interests,
    c.last_synced_at,
    c.start_time,
    c.city,
    c.audience_label,
    COALESCE(rs.total_spend, 0)                                  AS total_spend,
    rs.last_spend_date                                           AS last_spend_date,
    COALESCE(rs.impressions, 0)                                  AS impressions,
    COALESCE(rs.clicks, 0)                                       AS clicks,
    CASE WHEN COALESCE(rs.impressions, 0) > 0
         THEN ROUND((rs.clicks::numeric / rs.impressions::numeric) * 100, 2)
         ELSE NULL
    END                                                          AS ctr,
    CASE
      WHEN c.start_time IS NULL THEN NULL
      WHEN c.start_time::date > p_range_end THEN 0
      ELSE (LEAST(p_range_end, CURRENT_DATE)
            - GREATEST(c.start_time::date, p_range_start))::int + 1
    END                                                          AS days_running,
    COALESCE(rl.leads_num, 0)                                    AS leads_num,
    COALESCE(ra.buyers_num, 0)                                   AS buyers_num,
    COALESCE(ra.total_revenue, 0)                                AS total_revenue,
    CASE WHEN COALESCE(ra.buyers_num, 0) > 0
         THEN COALESCE(rs.total_spend, 0) / ra.buyers_num
         ELSE NULL END                                           AS cac,
    CASE WHEN COALESCE(rl.leads_num, 0) > 0
         THEN COALESCE(rs.total_spend, 0) / rl.leads_num
         ELSE NULL END                                           AS cpl,
    CASE WHEN COALESCE(rs.total_spend, 0) > 0
         THEN ROUND(COALESCE(ra.total_revenue, 0) / rs.total_spend, 2)
         ELSE NULL END                                           AS roas,
    ue.gross_margin_pct,
    ue.kill_multiplier,
    ue.scaling_multiplier,
    COALESCE(ra.total_revenue, 0) * COALESCE(ue.gross_margin_pct, 0) / 100
      - COALESCE(rs.total_spend, 0)                              AS gross_profit
  FROM crm_facebook_campaigns c
  LEFT JOIN range_spend     rs ON rs.tenant_id = c.tenant_id AND rs.campaign_id = c.campaign_id
  LEFT JOIN range_leads     rl ON rl.tenant_id = c.tenant_id AND rl.campaign_id = c.campaign_id
  LEFT JOIN range_attendees ra ON ra.tenant_id = c.tenant_id AND ra.campaign_id = c.campaign_id
  LEFT JOIN crm_unit_economics ue ON ue.tenant_id = c.tenant_id AND ue.event_type = c.event_type
  WHERE c.tenant_id = p_tenant_id;
$$;

GRANT EXECUTE ON FUNCTION get_campaign_performance(UUID, DATE, DATE) TO authenticated;

-- Step 5: recreate v_crm_campaign_performance as a thin wrapper around the function
-- This preserves the live screen (modules/crm/crm-campaigns.js:64) until Rung 3
-- migrates the call site to a direct RPC call.
CREATE OR REPLACE VIEW v_crm_campaign_performance AS
SELECT *
FROM get_campaign_performance(
  (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid,
  '1900-01-01'::date,
  CURRENT_DATE
);

GRANT SELECT ON v_crm_campaign_performance TO authenticated;
```

### Why each piece

- **Step 1** is purely additive; columns are NULL by default, no backfill needed.
- **Step 2** uses `NOT NULL DEFAULT 0` — Postgres backfills existing rows with 0 atomically. 56 rows live, trivial.
- **Step 3 + 5** is the view-as-wrapper pattern (per executor proposal SE-2 in FOREMAN_REVIEW). The wrapper view reads tenant_id from JWT claims so the existing `crm-campaigns.js` selector continues to work without code changes; it returns lifetime numbers (1900-01-01 → today), matching the old behaviour. RLS on `crm_facebook_campaigns` and `crm_ad_spend` already enforces tenant isolation.
- **Step 4** function uses the canonical RLS pattern indirectly (filters on `tenant_id = p_tenant_id`). The function is `SECURITY INVOKER` so the caller's RLS still applies on the underlying tables — defense in depth.

## 4. Apply migration

Use Supabase MCP `apply_migration` (preferred):
```
mcp__claude_ai_Supabase__apply_migration:
  project_id: tsxrrxzmdxaenlvocyit
  name: 2026_05_02_campaigns_v2_01_schema_and_function
  query: <paste the entire SQL content above>
```

If MCP fails 2× — fall back to `execute_sql` with the same SQL split into chunks. Do NOT bypass with `--no-verify` style escapes.

## 5. Verification (run after migration applies)

Execute each as a separate query via MCP `execute_sql`:

### 5.1 — New columns present
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public'
  AND ((table_name='crm_facebook_campaigns' AND column_name IN ('start_time','city','audience_label'))
    OR (table_name='crm_ad_spend' AND column_name IN ('impressions','clicks')))
ORDER BY table_name, column_name;
```
**Expected:** 5 rows.

### 5.2 — Function exists
```sql
SELECT proname, pronargs FROM pg_proc WHERE proname='get_campaign_performance';
```
**Expected:** 1 row, `pronargs=3`.

### 5.3 — Wrapper view exists and runs
```sql
SELECT COUNT(*) FROM v_crm_campaign_performance;
```
**Expected:** Some number ≥ 0 (no error). For prizma JWT context this should return ~7; for unauth context it returns 0 (no JWT claim).

### 5.4 — Function performance
```sql
EXPLAIN ANALYZE
SELECT * FROM get_campaign_performance(
  (SELECT id FROM tenants WHERE slug='prizma'),
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);
```
**Expected:** Total Time < 500ms. If ≥ 500ms — STOP and report.

### 5.5 — Sanity-check returned shape
```sql
SELECT campaign_id, name, total_spend, impressions, clicks, ctr, days_running, roas
FROM get_campaign_performance(
  (SELECT id FROM tenants WHERE slug='prizma'),
  '1900-01-01'::date,
  CURRENT_DATE
)
LIMIT 3;
```
**Expected:** 3 rows (or fewer if prizma has < 3 campaigns). `impressions`/`clicks` should be 0 (data not yet flowing — Rung 2 fixes that). `ctr`/`roas` may be NULL when divisor is 0 (correct).

### 5.6 — Repo verify
```bash
npm run verify:integrity   # exit 0
git status --porcelain     # only the new migration file
```

## 6. Commit plan

Single commit:

```bash
git add "modules/Module 4 - CRM/migrations/2026_05_02_campaigns_v2_01_schema_and_function.sql"
git commit -m "feat(crm): campaigns v2 Rung 1 — schema additions + range-aware function

Adds start_time/city/audience_label to crm_facebook_campaigns and
impressions/clicks to crm_ad_spend (additive, NULL/zero safe).

Replaces v_crm_campaign_performance with get_campaign_performance(tenant_id,
range_start, range_end) returning the same column shape + 6 new fields
(start_time, days_running, impressions, clicks, ctr, roas).

The view name v_crm_campaign_performance is preserved as a thin wrapper
around the function (lifetime range), so modules/crm/crm-campaigns.js
continues to work between Rungs. Rung 3 will migrate that call site to
a direct RPC call.

Authorised by FOREMAN_REVIEW.md 2026-05-02 (SPEC: M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE)."

git push origin develop
```

## 7. Stop-on-deviation triggers (Rung 1 specific)

Beyond CLAUDE.md §9 globals, STOP and report if:

1. Any of the 5 new columns already exists on the target table (means a prior partial run — investigate before proceeding).
2. The function returns ≥ 500ms on `EXPLAIN ANALYZE` with prizma + 30-day range.
3. The wrapper view returns an error when SELECTed (likely a column-shape mismatch between function RETURNS TABLE and view consumers — the function definition above is the source of truth).
4. `crm-campaigns.js` shows new console errors after the migration applies (open the screen, watch DevTools — wrapper should be transparent).
5. Pre-commit hook fails. Don't retry with `--no-verify`.
6. The migration's section 5.3 query (count from wrapper view) errors on "permission denied" — would mean RLS or GRANT misconfigured.

## 8. Out of scope for Rung 1

- Edge Function changes (Rung 2)
- Make scenario blueprint update (Rung 2)
- Any frontend file (Rung 3)
- Populating `city` / `audience_label` (deferred SPEC, post-cutover)
- Dropping `crm_facebook_campaigns.total_spend` (tech debt, post-Rung-3)
- Updating `MODULE_MAP.md`, `CHANGELOG.md`, `db-schema.sql` — defer to Integration Ceremony after Rung 3 closes (the executor handles those there, not here)

## 9. Retrospective deliverables (mandatory at Rung 1 close)

Write both files in the SPEC folder:

- `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_1_EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_1_FINDINGS.md` (only if findings exist; otherwise note "no findings" inline in the execution report)

Use the templates at `.claude/skills/opticup-executor/references/`. The Foreman writes `RUNG_1_FOREMAN_REVIEW.md` after reading these.

---

*End of RUNG 1 prompt. Self-contained — no other context required to execute.*
