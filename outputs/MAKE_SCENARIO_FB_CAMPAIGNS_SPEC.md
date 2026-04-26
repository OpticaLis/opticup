# Make Scenario Spec — Facebook Campaigns → Optic Up CRM

> **Purpose:** Build a Make scenario that polls Facebook Ads every 4 hours and pushes campaign metadata + spend snapshots to the new `facebook-campaigns-sync` Edge Function in Optic Up.
> **Author:** opticup-executor (handoff for Daniel to build manually in Make UI).
> **Created:** 2026-04-26 as part of M4_CAMPAIGNS_SCREEN SPEC.
> **Where to build:** Make organization 1405609, team 402680, zone eu2.make.com.

---

## 1. Scenario shape — 3 modules

```
┌──────────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│ 1. Facebook Insights     │───▶│ 2. JSON Aggregator  │───▶│ 3. HTTP POST request │
│    (per-campaign poll)   │    │    (build payload)  │    │    to lead-intake EF │
└──────────────────────────┘    └─────────────────────┘    └──────────────────────┘
```

### Module 1 — Facebook Insights (Facebook Ads → Get Insights)

- **App:** Facebook Ads.
- **Module:** "Get Insights" or "Search Insights" (returns one bundle per campaign).
- **Account:** Daniel's connected Facebook Ads account (Prizma Optics).
- **Level:** `Campaign` (NOT ad-set, NOT ad).
- **Date preset:** `Lifetime` (for `total_spend` cumulative; the EF will overwrite the daily snapshot for today).
- **Fields to fetch:**
  - `campaign_id`
  - `campaign_name`
  - `effective_status` (mapped to our `status`)
  - `daily_budget`
  - `spend` (mapped to our `total_spend`)
- **Filters:** none (return all campaigns; Optic Up will figure out what's new vs. updated).
- **Output:** array of campaign objects.

### Module 2 — JSON Aggregator (Tools → Array Aggregator)

- **Source:** Module 1's output array.
- **Goal:** build the body JSON the Edge Function expects.
- **For each item:**
  - `campaign_id` ← Module 1.`campaign_id` (must be string).
  - `name` ← Module 1.`campaign_name`.
  - `status` ← Module 1.`effective_status` (Make values come back as `ACTIVE`/`PAUSED`/`STOPPED` etc — leave as-is, the EF lowercases for the decision logic).
  - `event_type` ← derived from `campaign_name` parsing OR set manually for now (e.g., `SuperSale` if name contains "SuperSale", `MultiSale` if contains "MultiSale", else `null`). A simple regex/contains in Make's text functions handles this.
  - `daily_budget` ← Module 1.`daily_budget` divided by 100 (Facebook returns budgets in cents).
  - `master` ← null for now (Daniel may add a custom-audience name later).
  - `interests` ← null for now.
  - `total_spend` ← Module 1.`spend` (already in shekels, no conversion).
  - `raw_data` ← the entire Module 1 record (passes through as JSONB; future-proofs against EF needing fields we didn't anticipate).

The aggregator's final output should be a single JSON object:

```json
{
  "tenant_slug": "prizma",
  "campaigns": [
    { "campaign_id": "...", "name": "...", "status": "...", "event_type": "...", "daily_budget": 0, "master": null, "interests": null, "total_spend": 0, "raw_data": {...} },
    ...
  ]
}
```

### Module 3 — HTTP POST (HTTP → Make a request)

- **URL:** `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <ANON_KEY>` — use the same legacy JWT-format anon key from the project (it's the one already in `js/shared.js` and other EFs in this project).
- **Body type:** Raw → JSON.
- **Body:** the JSON object built by Module 2.
- **Parse response:** Yes (so Make can show the EF's response in the run logs).

---

## 2. Expected EF response

On success:
```json
{
  "ok": true,
  "processed": 12,
  "metadata_inserted": 3,
  "metadata_updated": 9,
  "spend_inserted": 12,
  "spend_updated": 0
}
```

If `ok: false`, the response also has `errors: [{ campaign_id, error }]` so you can debug per-campaign issues without the whole batch failing.

---

## 3. Schedule

- **Frequency:** every 4 hours.
- **Make scheduling:** `Every: 4 hours`, no day-of-week or time-of-day restriction.
- **Why 4 hours:** balance between fresh data and Facebook API rate limits. Facebook's spend numbers update with a ~1-hour lag anyway.

---

## 4. Multi-tenant note

The `tenant_slug` field in the payload tells the EF which tenant the campaigns belong to. For now: hardcoded `"prizma"`. If a second tenant gets onboarded with their own Facebook ads account, you'll create a second Make scenario with `tenant_slug: "<their-slug>"` and their account in Module 1. **Never mix campaigns from different tenants in one payload** — the EF expects one slug per request.

---

## 5. Testing the scenario before activating

1. Build the 3 modules.
2. Run a single execution manually (Run once, NOT scheduled).
3. Check Make's execution log — Module 3's response should be `{"ok":true,"processed":N,...}`.
4. Open the Optic Up CRM → "קמפיינים" tab. The KPI cards + table should now show the campaigns.
5. If everything looks right, activate the scenario (turn on the schedule).

If Module 3 fails:
- HTTP 401 → wrong/missing Authorization header.
- HTTP 400 → missing tenant_slug or campaigns array — check Module 2's aggregator output.
- HTTP 207 → some campaigns succeeded, some failed — check the `errors` array in the response.

---

## 6. Future improvements (not for the first version)

- Add UTM data per ad-set (Module 1 fetches at campaign level only). Will need a second Insights module at ad-set level if Daniel wants per-creative breakdown.
- Auto-pause: when the EF returns `decision: STOP`, Make could trigger Facebook's "Pause Campaign" API. Only do this once Daniel trusts the auto-decision logic for ~2 weeks.
- Push notification: send a Telegram/WhatsApp message when a new STOP decision is issued. Currently Daniel sees these as badges only on the CRM screen.

---

*End of Make scenario spec. After Daniel builds and tests, the campaigns screen becomes self-updating every 4 hours.*
