# RUNG 2 ACTIVATION PROMPT — Edge Function additive + Make scenario update

> **Paste this entire prompt to opticup-executor. It is self-contained.**
> **Authorisation:** Foreman (opticup-strategic) approved 2026-05-02 in `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/FOREMAN_REVIEW.md`.
> **Order:** This is Rung 2 of 3. Rung 1 (DB) MUST close successfully before this prompt fires. Rung 3 (UI) is dispatched separately.

---

## 0. Activate skills

Load `opticup-guardian` first, then `opticup-executor`. ERP repo (`opticalis/opticup`).

## 1. Context

You are executing Rung 2 of `M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE`. Goal: get `start_time`, `impressions`, `clicks` flowing from Facebook → Make → EF → DB so the columns added in Rung 1 stop being all-zero.

Two edits:
- **A) Edge Function** `supabase/functions/facebook-campaigns-sync/index.ts` — additive: accept 3 new optional fields, write them to the right tables.
- **B) Make scenario `9126542`** "Facebook Campaigns → Optic Up CRM (PRIZMA)" — module 2 fields list expanded; module 3 HTTP body gains 3 new mapped fields.

Order matters: deploy EF FIRST (accepts new fields if present, ignores if absent — backward compatible), THEN update Make blueprint. This way there is no window where Make sends fields the EF doesn't know about.

### Why pre-cutover (Foreman recommendation)

Facebook Insights returns lifetime aggregate, not daily history. Every Make scenario run that lacks `impressions`/`clicks` writes a `crm_ad_spend` row with 0s that can never be backfilled. Closing this Rung before the cutover weekend captures impressions/clicks from cutover-day-one.

## 2. Pre-flight (run in order, STOP on any failure)

```bash
# 2.1 Branch
git branch --show-current   # 'develop'

# 2.2 Repo state — must be clean except for SPEC folder + Rung 1's pushed migration
git status --porcelain

# 2.3 Integrity gate
npm run verify:integrity

# 2.4 Confirm Rung 1 closed
# Run via Supabase MCP execute_sql:
#   SELECT proname FROM pg_proc WHERE proname='get_campaign_performance';   -- 1 row required
#   SELECT column_name FROM information_schema.columns
#     WHERE table_name='crm_ad_spend' AND column_name IN ('impressions','clicks');  -- 2 rows required
# If either fails — STOP. Rung 2 cannot run before Rung 1.

# 2.5 Confirm EF current state
wc -l "supabase/functions/facebook-campaigns-sync/index.ts"   # expect 219 lines
# Read it. Look for the InboundCampaign interface (~line 51) and metaRow/spendRow (~lines 134, 179).

# 2.6 Confirm Make scenario reachable
# Use mcp__claude_ai_Make__scenarios_get with scenarioId 9126542.
# Expect blueprint with 3 modules: facebook-ads-cm:listCampaigns (id 1),
# facebook-insights:GetAdAccountInsights (id 2), http:ActionSendData (id 3).
# Confirm scenario.isActive === true.
```

---

## 3. PART A — Edge Function changes (additive)

The current EF source is in this repo at `supabase/functions/facebook-campaigns-sync/index.ts` (219 lines, last touched 2026-04-26 at the M4_CAMPAIGNS_SCREEN close). Three changes:

### 3.1 — Extend the `InboundCampaign` interface (~line 51)

Find:
```ts
interface InboundCampaign {
  campaign_id: string;
  name?: string;
  status?: string;
  event_type?: string | null;
  daily_budget?: number | string | null;
  master?: string | null;
  interests?: string | null;
  total_spend?: number | string | null;
  raw_data?: Record<string, unknown> | null;
}
```

Replace with:
```ts
interface InboundCampaign {
  campaign_id: string;
  name?: string;
  status?: string;
  event_type?: string | null;
  daily_budget?: number | string | null;
  master?: string | null;
  interests?: string | null;
  total_spend?: number | string | null;
  raw_data?: Record<string, unknown> | null;
  // v2 additions (M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE Rung 2)
  start_time?: string | null;            // ISO timestamptz from Facebook listCampaigns
  impressions?: number | string | null;  // daily impressions from Insights API
  clicks?: number | string | null;       // daily clicks from Insights API
}
```

### 3.2 — Add `start_time` to `metaRow` (~line 134)

Find the `metaRow` object literal (immediately before the `if (existingMeta)` block). After the `interests:` line, add:
```ts
      start_time: c.start_time ? new Date(c.start_time).toISOString() : null,
```

So the literal becomes:
```ts
    const metaRow = {
      tenant_id: tenantId,
      campaign_id: campaignId,
      name: trimOrNull(c.name) || campaignId,
      status: trimOrNull(c.status) || "unknown",
      event_type: trimOrNull(c.event_type as unknown),
      daily_budget: numOrZero(c.daily_budget),
      master: trimOrNull(c.master as unknown),
      interests: trimOrNull(c.interests as unknown),
      start_time: c.start_time ? new Date(c.start_time).toISOString() : null,
      raw_data: c.raw_data ?? null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
```

**Note on UPDATE behaviour:** when Make stops sending `start_time` (it shouldn't, but defensively) the EF writes `null` — which would clobber a previously-saved value. To prevent this, do NOT include `start_time` in the UPDATE path if the inbound value is null. Implement this by splitting the metaRow:

Replace the `metaRow` block above with:
```ts
    const metaRow: Record<string, unknown> = {
      tenant_id: tenantId,
      campaign_id: campaignId,
      name: trimOrNull(c.name) || campaignId,
      status: trimOrNull(c.status) || "unknown",
      event_type: trimOrNull(c.event_type as unknown),
      daily_budget: numOrZero(c.daily_budget),
      master: trimOrNull(c.master as unknown),
      interests: trimOrNull(c.interests as unknown),
      raw_data: c.raw_data ?? null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (c.start_time) {
      metaRow.start_time = new Date(c.start_time).toISOString();
    }
```

This way absent `start_time` leaves the existing column value untouched on UPDATE; on INSERT it stays NULL (column default).

### 3.3 — Add `impressions` + `clicks` to `spendRow` (~line 179)

Find:
```ts
    const spendRow = {
      tenant_id: tenantId,
      campaign_id: campaignId,
      spend_date: today,
      total_spend: numOrZero(c.total_spend),
      updated_at: new Date().toISOString(),
    };
```

Replace with:
```ts
    const spendRow = {
      tenant_id: tenantId,
      campaign_id: campaignId,
      spend_date: today,
      total_spend: numOrZero(c.total_spend),
      impressions: Math.round(numOrZero(c.impressions)),
      clicks: Math.round(numOrZero(c.clicks)),
      updated_at: new Date().toISOString(),
    };
```

`numOrZero` returns 0 for absent/garbage values — backward-compat with old payloads. `Math.round` ensures BIGINT-safe integers (Facebook sometimes returns "1234.0" as a string).

### 3.4 — Verify file size

`wc -l supabase/functions/facebook-campaigns-sync/index.ts` — expect ~228 lines (219 + ~9). MUST stay ≤ 350 (Iron Rule 12).

### 3.5 — Deploy the EF

Use Supabase MCP `deploy_edge_function` (preferred):
```
mcp__claude_ai_Supabase__deploy_edge_function:
  project_id: tsxrrxzmdxaenlvocyit
  name: facebook-campaigns-sync
  files: [{ name: 'index.ts', content: '<entire updated file>' }]
  entrypoint_path: index.ts
```

If MCP fails 2× — fall back to:
```bash
supabase functions deploy facebook-campaigns-sync --project-ref tsxrrxzmdxaenlvocyit
```

Do NOT touch `verify_jwt`. Current value is whatever it was at last deploy (the EF authenticates via `body.shared_secret` against `MAKE_SECRET` env var, not via JWT).

### 3.6 — Backward-compat curl test (run BEFORE updating Make)

```bash
# Get MAKE_SECRET from Supabase secrets first; do NOT hardcode it in the prompt
MAKE_SECRET=$(supabase secrets list --project-ref tsxrrxzmdxaenlvocyit | grep -i MAKE_SECRET | awk '{print $2}')

curl -s -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync' \
  -H 'Content-Type: application/json' \
  -d "{
    \"tenant_slug\": \"demo\",
    \"shared_secret\": \"${MAKE_SECRET}\",
    \"campaigns\": [{
      \"campaign_id\": \"V2_RUNG2_TEST_OLD_PAYLOAD\",
      \"name\": \"v2 backward-compat test\",
      \"status\": \"Active\",
      \"event_type\": \"SuperSale\",
      \"daily_budget\": 100,
      \"total_spend\": 50.00
    }]
  }"
```
**Expected:** `{"ok":true,"processed":1,...}`. If status 401/500 — STOP.

### 3.7 — Forward-compat curl test (new payload)

```bash
curl -s -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync' \
  -H 'Content-Type: application/json' \
  -d "{
    \"tenant_slug\": \"demo\",
    \"shared_secret\": \"${MAKE_SECRET}\",
    \"campaigns\": [{
      \"campaign_id\": \"V2_RUNG2_TEST_NEW_PAYLOAD\",
      \"name\": \"v2 new-fields test\",
      \"status\": \"Active\",
      \"event_type\": \"SuperSale\",
      \"daily_budget\": 100,
      \"total_spend\": 75.50,
      \"start_time\": \"2026-04-15T10:00:00+0000\",
      \"impressions\": 12345,
      \"clicks\": 678
    }]
  }"
```
**Expected:** `{"ok":true,"processed":1,...}`.

### 3.8 — Verify writes

```sql
-- run via Supabase MCP execute_sql
SELECT campaign_id, name, start_time
FROM crm_facebook_campaigns
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='demo')
  AND campaign_id LIKE 'V2_RUNG2_TEST_%';

SELECT campaign_id, spend_date, total_spend, impressions, clicks
FROM crm_ad_spend
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='demo')
  AND campaign_id LIKE 'V2_RUNG2_TEST_%';
```
**Expected:**
- 2 metadata rows. The OLD payload row has `start_time = NULL`. The NEW payload row has `start_time = 2026-04-15 10:00:00+00`.
- 2 spend rows for today. OLD row has `impressions=0, clicks=0`. NEW row has `impressions=12345, clicks=678`.

### 3.9 — Cleanup test data

```sql
DELETE FROM crm_ad_spend WHERE campaign_id LIKE 'V2_RUNG2_TEST_%';
DELETE FROM crm_facebook_campaigns WHERE campaign_id LIKE 'V2_RUNG2_TEST_%';
```

### 3.10 — Commit (PART A)

```bash
git add "supabase/functions/facebook-campaigns-sync/index.ts"
git commit -m "feat(crm): campaigns v2 Rung 2A — EF accepts start_time, impressions, clicks

Additive: 3 new optional fields on InboundCampaign. start_time written to
crm_facebook_campaigns metadata (UPDATE preserves existing value when
absent). impressions+clicks written to crm_ad_spend daily snapshot
(default 0 for old payloads).

Verified backward-compat (old payload still returns ok:true) and
forward-compat (new payload writes new columns correctly).

Authorised by FOREMAN_REVIEW.md 2026-05-02 (M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE)."

git push origin develop
```

---

## 4. PART B — Make scenario blueprint update

**Execute PART B only after PART A is deployed and curl tests pass.**

The current Make scenario `9126542` blueprint as of 2026-05-02 (verified by `mcp__claude_ai_Make__scenarios_get`):

### 4.1 — Current blueprint snapshot (do not deviate from this baseline)

Module 1 — `facebook-ads-cm:listCampaigns`:
```json
{
  "id": 1,
  "module": "facebook-ads-cm:listCampaigns",
  "mapper": {
    "limit": "100",
    "businessId": "106457754847532",
    "adAccountId": "act_270898661673629"
  }
}
```
Module 1 already returns `start_time` per campaign in its output bundle. No change to module 1.

Module 2 — `facebook-insights:GetAdAccountInsights`:
```json
{
  "id": 2,
  "module": "facebook-insights:GetAdAccountInsights",
  "filter": {
    "name": "Active only",
    "conditions": [[{"a":"{{1.effective_status}}","b":"ACTIVE","o":"text:equal"}]]
  },
  "mapper": {
    "type": "campaign",
    "limit": "500",
    "fields": ["campaign_id", "spend"],
    "business": "106457754847532",
    "campaign": "{{1.id}}",
    "adAccount": "act_270898661673629",
    "date_preset": "lifetime",
    "specify_date": "date_preset"
  }
}
```
**Change required:** `mapper.fields` becomes `["campaign_id", "spend", "impressions", "clicks"]`.

Module 3 — `http:ActionSendData`, `mapper.data` (the HTTP body, escaped string):
```
{
  "tenant_slug": "prizma",
  "shared_secret": "fbsync_f7acdea0442d619eb700e3667c8fb72989d5085666ad6e77a249bedcf34133fc",
  "campaigns": [
    {
      "campaign_id": "{{1.id}}",
      "name": "{{1.name}}",
      "status": "{{1.effective_status}}",
      "event_type": "{{if(contains(1.name; \"SuperSale\"); \"SuperSale\"; if(contains(1.name; \"MultiSale\"); \"MultiSale\"; \"\"))}}",
      "daily_budget": {{ifempty(parseNumber(1.daily_budget; "."); 0) / 100}},
      "total_spend": {{ifempty(parseNumber(2.spend; "."); 0)}}
    }
  ]
}
```

### 4.2 — Target HTTP body (module 3 `mapper.data`)

```
{
  "tenant_slug": "prizma",
  "shared_secret": "fbsync_f7acdea0442d619eb700e3667c8fb72989d5085666ad6e77a249bedcf34133fc",
  "campaigns": [
    {
      "campaign_id": "{{1.id}}",
      "name": "{{1.name}}",
      "status": "{{1.effective_status}}",
      "event_type": "{{if(contains(1.name; \"SuperSale\"); \"SuperSale\"; if(contains(1.name; \"MultiSale\"); \"MultiSale\"; \"\"))}}",
      "daily_budget": {{ifempty(parseNumber(1.daily_budget; "."); 0) / 100}},
      "total_spend": {{ifempty(parseNumber(2.spend; "."); 0)}},
      "start_time": "{{1.start_time}}",
      "impressions": {{ifempty(parseNumber(2.impressions; "."); 0)}},
      "clicks": {{ifempty(parseNumber(2.clicks; "."); 0)}}
    }
  ]
}
```

Three new lines added at the bottom of the per-campaign object, before the closing `}`:
- `"start_time": "{{1.start_time}}"` — quoted string; Make passes Facebook's ISO timestamp through.
- `"impressions": {{...}}` — unquoted number; `ifempty + parseNumber` defaults missing values to 0 (matches the existing `total_spend` pattern).
- `"clicks": {{...}}` — same pattern as impressions.

### 4.3 — Apply via MCP

Use `mcp__claude_ai_Make__scenarios_update`. Pass the entire updated blueprint (not a diff). Pull the current blueprint via `scenarios_get`, modify `flow[1].mapper.fields` and `flow[2].mapper.data`, send back via `scenarios_update`.

```
mcp__claude_ai_Make__scenarios_update:
  scenarioId: 9126542
  blueprint: <full blueprint object with the two changes above>
```

If MCP fails — STOP and report. Do NOT edit via the Make web UI manually unless explicitly instructed by Daniel. The point of doing this via MCP is reproducibility and a recoverable diff.

### 4.4 — Trigger a manual run

Use `mcp__claude_ai_Make__scenarios_run` with `scenarioId: 9126542`. Wait for completion (poll executions list).

### 4.5 — Verify the run wrote new data

```sql
-- via Supabase MCP execute_sql
SELECT campaign_id, name, start_time
FROM crm_facebook_campaigns
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND start_time IS NOT NULL;
-- Expected: ≥ 1 row. Likely all 7 prizma campaigns now have start_time.

SELECT campaign_id, spend_date, total_spend, impressions, clicks
FROM crm_ad_spend
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='prizma')
  AND spend_date = CURRENT_DATE
ORDER BY total_spend DESC;
-- Expected: at least one row with non-zero impressions AND non-zero clicks
-- on a campaign that had non-zero spend before today's run.
```

If `impressions = 0` for ALL rows on actively-spending campaigns — STOP. Likely a Facebook permissions issue on the connection (the Insights API can silently return 0 when a new field is requested with insufficient permissions). Report to Daniel before proceeding.

### 4.6 — Restore-point note

Before applying §4.3, save the current blueprint to a local file for emergency rollback:
```
modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_2_blueprint_pre_change.json
```

Add this file to git and commit it as part of PART B:

```bash
git add "modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE/RUNG_2_blueprint_pre_change.json"
git commit -m "chore(crm): save Make scenario 9126542 blueprint pre-Rung-2 change

Snapshot of the live blueprint before adding start_time, impressions,
clicks to the HTTP body. Used as the rollback target if Rung 2 PART B
needs to revert."

git push origin develop
```

This is the rollback target if §4.5 fails.

---

## 5. Stop-on-deviation triggers (Rung 2 specific)

Beyond CLAUDE.md §9 globals, STOP and report if:

1. PART A backward-compat curl (§3.6) returns anything other than 200 with `ok:true`. The EF must accept old payloads — this is the cutover safety net.
2. PART A forward-compat curl (§3.7) shows `start_time` as NULL or `impressions/clicks` as 0 in DB after the test write.
3. PART A's UPDATE path clobbers an existing `start_time` when called twice in a row (the second curl with the same `campaign_id` should preserve `start_time` from the first).
4. PART B's MCP update fails 2× — do NOT switch to the web UI without explicit Daniel approval.
5. PART B's first scenario run shows zero impressions on prizma campaigns that had non-zero spend in the previous 24h — likely a Facebook API permissions issue.
6. The scenario shows `dlqCount > 0` after the first run.
7. Any unrelated Make scenario (`Optic Up — Send Message` or any other) starts erroring after the blueprint update — would mean the change rippled unexpectedly.

## 6. Out of scope for Rung 2

- Any frontend changes (Rung 3).
- Backfilling historical `start_time` / `impressions` / `clicks` on past `crm_ad_spend` rows. Facebook returns lifetime aggregate; per-day historical breakdown requires a different Insights call (out of scope, may be a future SPEC).
- Adding adset / city / audience extraction (Path X3 deferred).
- Touching the `crm-campaigns.js` call to `v_crm_campaign_performance`. The wrapper view from Rung 1 keeps the screen working unchanged.

## 7. Retrospective deliverables (mandatory at Rung 2 close)

- `RUNG_2_EXECUTION_REPORT.md` in the SPEC folder.
- `RUNG_2_FINDINGS.md` if any (else "no findings" in the execution report).

The Foreman writes `RUNG_2_FOREMAN_REVIEW.md` after reading these.

---

*End of RUNG 2 prompt. Self-contained — no other context required to execute.*
