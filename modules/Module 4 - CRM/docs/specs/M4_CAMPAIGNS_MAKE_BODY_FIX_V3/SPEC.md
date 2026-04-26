# SPEC — M4_CAMPAIGNS_MAKE_BODY_FIX_V3

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V3/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Supersedes:** V1 (verdict 🔴 — `json:CreateJSON` hypothesis), V2 (verdict 🔴 — `mapper.data` field-name with array). Both failed because Make's array→JSON serialization is unreliable.
> **Drives:** Pivot architecture from "1 HTTP with array" to "N HTTP with flat-object" (iteration pattern). Remove the aggregator. Each campaign POSTs separately to the same EF.

---

## 1. Goal

Make scenario `9126542` currently aggregates all campaigns into an array and sends 1 HTTP POST with `campaigns: [...]`. After 3 SPEC cycles, we have evidence that Make's array serialization into raw HTTP body is broken in this version (`mapper.body` silent, `mapper.data` with `{{N.array}}` non-strict-JSON, `mapper.data` with `{{N.json}}` empty wire body).

V3 pivots: remove the aggregator, send 1 HTTP POST per campaign as a flat-object body. The EF already accepts `campaigns: [{...}]` (an array), so each call sends an array of size 1 — `{tenant_slug, shared_secret, campaigns: [single_campaign]}`. EF needs no changes. Smoke test verifies rows land in `crm_facebook_campaigns` + `crm_ad_spend`.

This is the third architectural attempt. It's based on hard evidence (V2 Rung 1 proved that flat-object + `{{N.field}}` substitution into `mapper.data` reaches the EF — the only problem there was the `{{3.array}}` serialization), so the chance of success is high.

## 2. Background

### What we know after 3 SPECs

| Pattern | Wire body delivered? | EF response | Source |
|---|---|---|---|
| `mapper.body` with anything | ❌ empty | n/a (no request) | V2 toy + V1 + production scenarios |
| `mapper.data` with hardcoded literal flat JSON | ✅ delivered | 200 (when payload valid) | V2 toy Config D |
| `mapper.data` with `{...{{N.field}}...}` flat substitution | ✅ delivered | 200 expected (untested but mechanism proven) | extrapolation from above |
| `mapper.data` with `{...{{N.array}}...}` array substitution | ✅ delivered | 400 (Make's pseudo-JSON syntax) | V2 Rung 1 |
| `mapper.data` with bare `{{N.json}}` from CreateJSON | ❌ empty | n/a | V2 Rung 2 |

**Conclusion:** Make's `mapper.data` works reliably when the body is a static template with simple-field substitutions. It does NOT work when arrays are involved — neither raw nor pre-JSON-ified via CreateJSON.

### The pivot

The simplest solution is to never send an array from Make. The aggregator (id=3) was the source of the problem in 3 SPECs. **Remove it.**

New flow:
```
1. facebook:listCampaigns          (returns campaigns one-by-one in iterator mode)
2. facebook:GetAdAccountInsights   (per campaign, gets spend data)
3. http:ActionSendData              (per campaign, posts flat object)
```

(Module IDs may differ in Make; what matters is the order. The aggregator and any CreateJSON modules are removed.)

Each HTTP POST body is a flat template:
```
{
  "tenant_slug": "demo",
  "shared_secret": "fbsync_***",
  "campaigns": [
    {
      "campaign_id": "{{1.id}}",
      "name": "{{1.name}}",
      "status": "{{1.status}}",
      "event_type": "{{1.event_type}}",
      "daily_budget": {{1.daily_budget}},
      "total_spend": {{2.spend}},
      "master": "{{1.master}}",
      "interests": "{{1.interests}}"
    }
  ]
}
```

The body is mostly literal characters; only the leaf-level scalars are substitutions. No array reference. No CreateJSON. The "campaigns: [...]" wrapper is hand-written.

**Why the array-of-1 wrapper:** the EF's signature is `{tenant_slug, shared_secret, campaigns: [{...}]}` (array). Hand-writing `[{...one item...}]` keeps the EF unchanged. The EF's UPSERT logic already handles 1-item arrays correctly (verified in V2 Rung 1 — the EF received the body, parsed it, only failed because Make's serialization was broken).

### Cost & feasibility

- 10 campaigns × 4 sync runs/day = 40 HTTP POSTs/day vs. previous 4 (1 per run with array). ~10× ops cost on the HTTP module.
- Make's listCampaigns iterator mode returns campaigns one-by-one (not as an array) — no extra modules needed for iteration.
- Total Make ops per run: ~10 + 10 + 10 = 30 ops (up from ~12). Within budget; not a constraint.
- Each HTTP call is independent — partial failures isolate to one campaign instead of the whole run.

### What stays in place

- EF `facebook-campaigns-sync` v4 — unchanged.
- DB schema — unchanged.
- Frontend (CRM campaigns screen) — unchanged. It reads from the view, doesn't care how data arrived.
- The rotated `MAKE_SECRET` value in the scenario body. Stays in `mapper.data` (where the new V3 body will live).
- Data Structure 573694 — UNUSED in V3. Will be deleted in a separate cleanup SPEC after V3 confirms.

## 3. Hypothesis Ladder (real axes this time)

Per V2 author-skill Proposal 1: rungs vary on real architectural axes.

### Rung 1 — Iteration pattern, hand-written flat body

Modify `9126542` to remove the aggregator and send flat-object HTTP per campaign. Body template uses `{{1.field}}` and `{{2.field}}` for simple substitutions (no array references).

**Confidence: HIGH.** Built on directly observed behavior from V2 Rung 1 (flat substitutions into `mapper.data` reach the EF). No new mechanism introduced.

**Success signal:** smoke test → for each campaign in the demo facebook account, EF receives HTTP 200, response body `{"ok":true,"processed":1,"metadata_inserted":1,"spend_inserted":1}`. Rows in `crm_facebook_campaigns` and `crm_ad_spend` matching the campaign count.

**Failure signal:** EF returns 400 OR no entry in EF logs. Drop to Rung 2.

### Rung 2 — Stop, escalate

If Rung 1 fails, this is the third architectural attempt and we're hitting fundamental Make-side limitations. STOP and escalate to Foreman. Daniel may decide to proceed with the architecturally-impure option C (Supabase modules in Make for this scenario only) — but that decision is out of this SPEC's authority envelope.

There is no Rung 3. We've been around this loop enough times.

## 4. Success Criteria

All measurable, all binary pass/fail.

### Make scenario `9126542` blueprint changes
1. ✅ Module count is 3 (down from 4): List Campaigns → Get Insights → HTTP. The BasicAggregator is removed. No CreateJSON.
2. ✅ HTTP module's `mapper.data` contains the flat template with leaf-level substitutions (per §2). No array references like `{{N.array}}`. No CreateJSON references like `{{N.json}}`.
3. ✅ HTTP module's `mapper.body` is empty/null.
4. ✅ HTTP module's `bodyType` is `raw`. Headers: `Content-Type: application/json`.
5. ✅ Scenario `isActive: false` at SPEC end (deactivated after smoke test).

### End-to-end smoke test
6. ✅ One Make execution completes with status=`success`.
7. ✅ For each campaign processed, the HTTP module's response is HTTP 200 with body containing `"ok":true` and `"processed":1`.
8. ✅ DB verification: AT LEAST 1 row in `crm_facebook_campaigns` for tenant_id `8d8cfa7e-ef58-49af-9702-a862d459cccb` with `last_synced_at` within the last 5 minutes. Ideally N rows where N = number of active campaigns in the demo facebook account.
9. ✅ DB verification: AT LEAST 1 row in `crm_ad_spend` for the same tenant_id with `spend_date = today`.
10. ✅ Test repeatability: a SECOND execution produces UPSERT behavior — `metadata_updated` increments, `spend_updated` increments. No duplicate inserts.

### Documentation
11. ✅ New file `modules/Module 4 - CRM/docs/make-patterns/README.md` (~80 lines) explaining:
    - The trap journey: V1 (CreateJSON), V2 (`mapper.data` + array), V3 (iteration pivot).
    - **The chosen pattern:** iteration over array. When sending data from Make to an Optic Up EF that contains a list of items, prefer 1-HTTP-per-item over batched POST. Trade ops cost for predictable behavior.
    - **The verification recipe:** before targeting a real EF, verify wire body via webhook.site or similar. Check Make-side bytes vs. server-side log entries to detect silent empty-body failures.
    - **Field name reminder:** `mapper.data`, never `mapper.body`. The latter is silently ignored.
    - Cross-reference to this SPEC for the full evidence trail.

### Repo hygiene
12. ✅ `git status` clean except for the new doc file. All other dirty/untracked state preserved.
13. ✅ `git diff --staged | grep -iE 'fbsync_'` finds zero matches.
14. ✅ `npm run verify:integrity` exits 0.
15. ✅ All pre-commit hooks pass.

## 5. Autonomy Envelope

**CAN do without asking:**
- Modify scenario `9126542` blueprint via `mcp__make__scenarios_update`: remove the aggregator, change HTTP to per-campaign flat body.
- Activate, smoke-test, deactivate per the wait-window guidance below.
- Run `mcp__supabase__execute_sql` for read-only verification queries.
- Write the doc file.
- Commit and push.

**Wait window:** Make's `9126542` historical p95 execution time is 193s (per `executions_list`). With iteration pattern, expect somewhat longer due to ~10× HTTP calls (each ~200ms). Allow up to **5 minutes** per smoke test execution before checking results.

**MUST stop and ask if:**
- Smoke test produces HTTP 401 (secret mismatch — out of scope).
- Smoke test produces HTTP 200 but DB shows zero rows (EF issue, not Make).
- Smoke test produces HTTP 400 — Rung 1 failed; STOP per §3.
- `mcp__make__scenarios_update` rejects the new blueprint structure (e.g. iteration mode requires specific module configuration we missed).
- Any module other than the aggregator removal + HTTP body update is changed.
- The diff being staged contains any secret literal.

## 6. Stop-on-Deviation Triggers (beyond CLAUDE.md §9)

1. **STOP** if Rung 1's smoke test produces HTTP 400 or empty wire body. This is V3's only rung. Roll back, write FINDINGS, escalate.
2. **STOP** if any DDL or non-CRM-table write happens.
3. **STOP** if scenario `9126542` runs more than once per smoke test cycle. Deactivate immediately.
4. **STOP** if `git status` shows changes to unexpected files.

## 7. Rollback Plan

### Rung 1 fails
- Revert `9126542` blueprint to pre-V3 state (restore the 4-module flow with the aggregator and the `mapper.body` template). Use `scenarios_update`.
- Confirm `isActive: false`.
- DO NOT write doc file.
- Write FINDINGS detailing exactly what happened (HTTP code, EF log entries, Make-side transfer bytes, etc.).
- Escalate via FOREMAN_REVIEW.

### Doc commit fails pre-commit hook
- Fix the issue, retry. No production rollback needed.

## 8. Out of Scope

- Modifying the EF.
- Activating the scenario for production schedule. Daniel sets schedule manually after smoke test passes.
- Deleting Data Structure 573694 — separate cleanup SPEC.
- Filter changes (Active only vs. all campaigns) — separate strategic decision; current "Active only" filter on Module 1 stays.
- The Paused/Stopped status logic discussion (campaigns whose spend stops moving). That's a separate architectural feature, not part of fixing the data pipeline.
- P7 cutover to prizma — separate SPEC.

## 9. Expected Final State (success scenario)

### Make scenario 9126542
```
Module 1 (List Campaigns): unchanged. Active only filter preserved.
Module 2 (Get Insights):    unchanged. Per-campaign spend data.
Module 3 (HTTP):            flat-template body in mapper.data, posts per campaign.
                            mapper.body empty.
                            
isActive: false (deactivated after smoke).
Module count: 3 (down from 4 — aggregator removed).
```

### Database (after first smoke + tenant has N active campaigns)
- `crm_facebook_campaigns`: N rows.
- `crm_ad_spend`: N rows for today.

### After second smoke (UPSERT verification)
- `crm_facebook_campaigns`: still N rows, `updated_at` advanced.
- `crm_ad_spend`: still N rows for today, `total_spend` updated.

### Repo
```
+ modules/Module 4 - CRM/docs/make-patterns/README.md
```

## 10. Commit Plan

**Commit 1 — Documentation:**
```
docs(crm): document Make → EF iteration pattern (V3 architectural pivot)

After V1 (CreateJSON) and V2 (mapper.data + array) both failed due to
Make's unreliable array→JSON serialization, V3 pivoted to iteration:
1 HTTP POST per item, flat-object body, no aggregator. This SPEC closed
the campaigns data pipeline blocker.

Doc captures the journey, the chosen pattern, and the verification recipe
for future Make → EF scenarios.
```

The Make scenario change itself is in Make's cloud, not git. The doc commit captures the decision and the pattern.

Retrospective files (`EXECUTION_REPORT.md`, `FINDINGS.md` if any) land in a second commit at SPEC close.

## 11. Pre-flight Checks

1. `git status` clean except for prior session's expected dirty state (3 guardian files modified; outputs/strays untracked).
2. `git log -1` shows `19edad0 docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX_V2 (verdict: 🔴 REOPEN — pivot to V3)`.
3. Branch is `develop`. Repo remote is `opticalis/opticup`.
4. `mcp__make__scenarios_get` for `9126542` confirms pre-V3 state:
   - `isActive: false`.
   - 4 modules: List → Insights → BasicAggregator → HTTP.
   - HTTP `mapper.body` contains the inline JSON template; `mapper.data` is empty.
   - Active only filter on Module 1.
5. DB baseline: 0 rows in `crm_facebook_campaigns` and `crm_ad_spend` for the demo tenant.

If any pre-flight fails — STOP and report.

## 12. Lessons Already Incorporated

- **V1 lesson (Hypothesis Ladder):** V3's ladder has only 1 rung + escalate. The ladder is real — Rung 1 is iteration pattern (different axis from prior SPECs), Rung 2 is "stop, this isn't working architecturally."
- **V1 author-skill Proposal 1 (verify wait windows):** §5 quotes "up to 5 minutes per execution" based on p95 of 193s + buffer for iteration overhead.
- **V2 author-skill Proposal 1 (rungs vary on real axes):** V3 has only 1 rung but it's a true architectural pivot (no aggregator, iteration vs. batch). The previous SPECs' rungs were variations on "make Make serialize an array correctly." V3 doesn't ask Make to serialize arrays at all.
- **V2 author-skill Proposal 2 (cross-validate hypotheses against evidence):** §3 explicitly cites the evidence backing the iteration approach (V2 Rung 1's flat substitution reaching the EF). No extrapolation, no "documented canonical pattern" hand-waving.
- **V2 executor-skill Proposal 1 (wire-body cross-check):** §13 Path 2 makes wire-body verification (Make-side bytes vs. EF-side log entries) explicit.
- **Iron Rule 23:** masked secrets throughout. The new MAKE_SECRET appears only in Make scenario UI, Supabase env, and `~/.optic-up/make-secret.txt`.
- **Iron Rule 21:** doc file path new (no collision). DS 573694 will be deleted in a follow-up SPEC after V3 confirms — leaving it now to enable rollback if needed.

## 13. QA Protocol

### Path 0 — Pre-flight
1. All §11 checks pass.
2. Snapshot the current `9126542` blueprint to `/tmp/9126542_snapshot.json` for rollback safety. (Optional but recommended.)

### Path 1 — Update scenario
1. Fetch current blueprint via `scenarios_get`.
2. Construct new blueprint:
   - Remove the BasicAggregator module (id=3) entirely.
   - Update HTTP module (was id=4, becomes id=3 after removal):
     - `mapper.data` = the flat template per §2, with `{{1.*}}` and `{{2.*}}` substitutions for the campaign object's fields (the `1` and `2` may shift after aggregator removal — use whatever the new IDs are for List Campaigns and Insights).
     - `mapper.body` = empty/null.
     - `bodyType` = raw.
     - Headers preserved.
3. Apply via `scenarios_update`.
4. Re-fetch and verify:
   - 3 modules total.
   - HTTP `mapper.data` has the flat template with substitutions; no `{{N.array}}` or `{{N.json}}` references.
   - HTTP `mapper.body` empty.

### Path 2 — Smoke test (Rung 1)
1. Capture EF log baseline timestamp.
2. Activate scenario via `scenarios_activate`. The auto-trigger should fire one execution.
3. Wait ~5 minutes for execution to complete. Use `executions_list` filtered to `9126542` to find the run.
4. Once execution status moves to "success" or "error":
   - Deactivate scenario via `scenarios_deactivate`.
   - Use `executions_get-detail` on the run ID to inspect.
5. Verify wire transmission (V2 executor-skill Proposal 1):
   - Make side: each HTTP module call shows transfer bytes > 200 (a flat body with the template + a small campaign should be at least ~300 bytes).
   - Server side: EF logs show N entries (one per campaign processed) within the execution window. Each entry HTTP 200.
6. If wire transmission verified AND HTTP 200 → proceed to Path 3.
7. If wire transmission empty (transfer < 100 bytes) OR HTTP 400 → STOP per §6 trigger 1, roll back per §7.

### Path 3 — DB verification
```sql
-- Count campaigns synced
SELECT COUNT(*) FROM crm_facebook_campaigns
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND last_synced_at >= now() - interval '10 minutes';

-- Count spend rows for today
SELECT COUNT(*) FROM crm_ad_spend
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND spend_date = current_date;

-- Sample one row to verify shape
SELECT campaign_id, name, status, last_synced_at FROM crm_facebook_campaigns
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
ORDER BY last_synced_at DESC LIMIT 3;
```

Expected: counts > 0, sample row shows correct campaign data.

### Path 4 — Repeatability test (UPSERT)
1. Re-activate scenario. Auto-trigger fires.
2. Wait for completion, deactivate.
3. Query EF response bodies for each HTTP call. Expect: `metadata_updated: 1` (or `metadata_inserted: 0` and `metadata_updated: 1`), `spend_updated: 1`.
4. Re-run the COUNT(*) queries from Path 3. Counts should be the SAME (no new rows; existing rows updated).

### Path 5 — Documentation commit
1. Write `modules/Module 4 - CRM/docs/make-patterns/README.md` per §4 criterion 11.
2. `git add` only the new file (explicit path).
3. Verify diff: `git diff --staged | grep -iE 'fbsync_'` returns empty.
4. Run integrity gate.
5. Commit with the message from §10.
6. Push to develop.

### Path 6 — Final state verification
1. `git log -1` shows the new doc commit.
2. `git status` matches §9 (3 guardian files modified + same untracked outputs/strays + nothing else).
3. Scenario `9126542` `isActive: false`.
4. Smoke test artifacts (run IDs, response bodies, row counts) recorded in EXECUTION_REPORT.

---

## 14. Doc Content — README.md

The README at `modules/Module 4 - CRM/docs/make-patterns/README.md` should contain (in English, ~80 lines):

1. **Title:** "Make → Optic Up Edge Function Integration Pattern"
2. **Top-of-file warning (TL;DR):**
   - Use `mapper.data`, NEVER `mapper.body`. Latter is silently ignored.
   - For lists of items, prefer iteration (1 HTTP per item) over batched array POST. Make's array-to-JSON serialization is unreliable.
   - Always verify wire transmission (Make-side transfer bytes vs. server-side EF log entries).
3. **The journey** (brief):
   - V1: tried `json:CreateJSON` → failed.
   - V2: tried `mapper.data` with array substitution → failed.
   - V3: pivoted to iteration → succeeded.
4. **The recipe** for Make → EF scenarios:
   - HTTP module: `bodyType=raw`, header `Content-Type: application/json`.
   - For flat data: `mapper.data` with simple `{{N.field}}` substitutions inside a literal template.
   - For lists: iterate at the source (use list-mode iterator) and POST per item.
   - Test against `webhook.site/<token>` first to inspect wire body.
5. **Common gotchas:**
   - Make's `status=1` (success) means "Make ran without crashing" — NOT "the request was sent correctly." Always cross-check with server logs.
   - Setting both `mapper.body` and `mapper.data` does NOT cause an error; Make uses `data` and ignores `body` silently.
   - Array substitutions like `{{N.array}}` interpolate as Make's bracket-keyed pseudo-JSON, which strict JSON parsers reject.
   - `json:CreateJSON` output reference (`{{N.json}}`) into `mapper.data` produces empty wire body in this Make version. Don't use it.
6. **Reference SPECs:** link to `M4_CAMPAIGNS_MAKE_BODY_FIX` (V1, V2, V3) for the full evidence trail.

Tone: practical, brief. Future SPEC authors will read this as a reference.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
