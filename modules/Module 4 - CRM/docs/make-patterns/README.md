# Make → Optic Up Edge Function Integration Pattern

> **Audience:** future SPEC authors writing new Make scenarios that POST to Optic Up Edge Functions.
> **Source of truth:** `M4_CAMPAIGNS_MAKE_BODY_FIX_V3` SPEC + retrospective. See `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/`.

---

## TL;DR — The three traps and how to skip them

1. **Field name:** the HTTP module's wire body is read from `mapper.data`. **Never** put body content in `mapper.body` — it is silently ignored. Both fields can be present; only `data` reaches the wire.
2. **No arrays from Make.** For lists of items, prefer the iteration pattern (1 HTTP call per item, flat-object body) over batched array POST. Make's `{{N.array}}` interpolates as bracket-keyed pseudo-JSON that strict parsers reject. `json:CreateJSON` + `{{N.json}}` reference into `mapper.data` produces empty wire body. Don't try to make Make serialize arrays into raw HTTP bodies.
3. **Verify wire transmission.** Make's UI reports `status=1` (success) even when the wire body is empty. Always cross-check against server-side logs: each expected EF call must appear in Edge Function logs within the execution window.

---

## The journey

Three SPECs got us here:

| SPEC | Hypothesis | Result |
|---|---|---|
| V1 | `json:CreateJSON` upstream + `{{N.json}}` reference | 🔴 EF received nothing (`mapper.body` was being ignored) |
| V2 | Move to `mapper.data` (correct field), retry with array substitution + CreateJSON | 🔴 Rung 1 — `{{N.array}}` produces non-strict JSON. Rung 2 — `{{N.json}}` produces empty body |
| V3 | **Iteration pattern.** Remove the aggregator. 1 HTTP per campaign with flat-object body, simple `{{N.field}}` substitutions only | ✅ 7 campaigns synced + UPSERT path verified |

---

## The recipe

For a Make scenario that POSTs N records to an Optic Up EF:

### 1. Pipeline shape

```
Source (e.g. facebook:listCampaigns)
  → optional per-item lookup (e.g. facebook-insights:GetAdAccountInsights)
  → http:ActionSendData
```

No `BasicAggregator`. No `json:CreateJSON`. No array references.

### 2. HTTP module configuration

- `bodyType: raw`
- Header: `Content-Type: application/json`
- `mapper.data`: a literal JSON template with `{{N.field}}` substitutions. Numeric fields go unquoted (`"daily_budget": {{1.daily_budget}}`); string fields go quoted (`"name": "{{1.name}}"`).
- `mapper.body`: empty. (Set to `""` defensively.)

### 3. Body template shape

For an EF that expects `{tenant_slug, shared_secret, campaigns: [{...}]}`, the per-item template is:

```json
{
  "tenant_slug": "demo",
  "shared_secret": "fbsync_***",
  "campaigns": [
    {
      "campaign_id": "{{1.id}}",
      "name": "{{1.name}}",
      "status": "{{1.effective_status}}",
      "daily_budget": {{ifempty(parseNumber(1.daily_budget; "."); 0) / 100}},
      "total_spend": {{ifempty(parseNumber(2.spend; "."); 0)}}
    }
  ]
}
```

The array wrapper `[ {...} ]` is hand-written. The EF's UPSERT logic handles 1-item arrays correctly. Do not try to feed multiple items through a Make array reference.

### 4. Verification recipe

Before targeting a real EF for the first time, smoke-test against `https://webhook.site/<your-token>` to inspect the wire body. Check:

- **Make-side:** transfer bytes per HTTP call > 200 (a flat body is at least ~300 bytes).
- **Server-side:** webhook.site received an entry with `content-length > 0` and the expected JSON shape.

If wire body is 0 bytes despite Make showing success — you've hit Trap 2. Re-check `mapper.data` (not `mapper.body`).

### 5. Smoke against the real EF

After the wire body looks correct:

- Activate the scenario; the auto-trigger fires one execution.
- Wait for the execution to complete (use `executions_list` to find it).
- Check the EF's Supabase logs: should show N entries (one per source item) with HTTP 200.
- Query the target tables for new/updated rows.
- Re-run once more; row counts should stay the same (UPSERT path), `updated_at`/`last_synced_at` should advance.

---

## Common gotchas

- **`status=1` is not "request was sent."** It's "Make ran without crashing." Always cross-check with EF logs.
- **Both `mapper.body` and `mapper.data` set:** Make uses `data` and silently ignores `body`. The redundancy is silent — a quiet trap if you're cargo-culting from old blueprints.
- **`{{N.array}}` substitution:** produces Make's bracket-keyed pseudo-JSON like `[{"name":[1]: "X"}]`. Not strict JSON. EF's `req.json()` rejects.
- **`{{N.json}}` from `json:CreateJSON`:** produces empty wire body in this Make version. Confirmed in V2 Rung 2 + toy-test. Avoid.
- **Make ops cost:** iteration multiplies HTTP ops by N. For N=10, expect ~10× the HTTP cost of a single batched POST. Within budget for normal use; monitor for high-cardinality lists.
- **Partial-failure isolation:** with iteration, if one HTTP call fails, the others still succeed. With batched array POST, one bad item can poison the whole batch. Iteration is more resilient.

---

## Reference SPECs (full evidence trail)

- `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/` — V1: `json:CreateJSON` hypothesis. Failed.
- `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2/` — V2: `mapper.data` field-name correction. Both rungs failed.
- `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/` — V3: iteration pivot. ✅ Succeeded. This pattern is what landed.

The toy-test that pinpointed the field-name bug (`mapper.body` vs `mapper.data`) is documented in V2's FINDINGS.md.

---

*Pattern landed: 2026-04-26. Reference scenario: Make `9126542` (Facebook Campaigns → Optic Up CRM, demo folder).*
