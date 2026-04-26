# SPEC — M4_CAMPAIGNS_MAKE_BODY_FIX

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Drives:** Fix Make scenario `9126542` so its HTTP POST to `facebook-campaigns-sync` EF produces strict JSON. Establishes the canonical Make → Supabase POST pattern for the project.

---

## 1. Goal

Make scenario `9126542` ("Facebook Campaigns → Optic Up CRM (DEMO)") currently sends a POST body containing `{{3.array}}` directly inline in a `bodyType=raw` JSON template. Make serializes the array using its proprietary syntax (bracket-keyed pseudo-JSON), and the EF rejects it with HTTP 400 "Invalid JSON body". This SPEC inserts a `json:CreateJSON` module between the final BasicAggregator (id=3) and the HTTP module (id=4), defines a Data Structure matching the EF body schema, and binds the aggregator output to it. The HTTP body becomes `{{<newId>.json}}` — strict JSON. After this, the scenario produces 200 responses and rows land in `crm_facebook_campaigns` + `crm_ad_spend`.

This is the project's first Make → Supabase POST. The Data Structure pattern documented here becomes the reusable template for all future Make scenarios that POST to Optic Up Edge Functions.

## 2. Background

### Investigation findings (2026-04-26)

A read-only investigation across all Make scenarios in team 402680 (the only team in the project's Make organization) confirmed:
- Zero existing Make scenarios POST to a Supabase Edge Function. `9126542` is the project's first.
- The project-memory hint that scenario `8479284` ("רישום משתתפים לאירוע") might POST to `lead-intake` was wrong — that scenario writes to Monday boards + Facebook Custom Audiences only, no HTTP modules.
- The other scenario with HTTP modules (`8263970`) targets `api.qrserver.com`, not Supabase.
- No working pattern exists in the project to copy.

### Failure mode (confirmed in prior session)

`9126542`'s HTTP module config:
- `bodyType: raw`
- Body template:
  ```
  {
    "tenant_slug": "demo",
    "shared_secret": "fbsync_***",
    "campaigns": {{3.array}}
  }
  ```
- Upstream: `builtin:BasicAggregator` (id=3) with feeder=1 (List Campaigns), no `targetStructureType`, no `groupBy`. Mapper builds per-campaign objects from `{{1.*}}` and `{{2.spend}}`.

When the body interpolates `{{3.array}}`, Make emits its proprietary array serialization (objects with bracket-keyed syntax like `[{"name":[1]: "TEST", "spend":[2]: 100}]`), not strict JSON. The EF's `req.json()` fails to parse this and returns 400.

### Why json:CreateJSON is the right fix

Per Make's documentation, the canonical pattern for "I have an aggregated array of objects → strict JSON in HTTP body" is:

1. Define a **Data Structure** describing the target JSON schema.
2. Insert a `json:CreateJSON` module that takes the upstream data + the Data Structure → emits a single string property named `json` with strict JSON.
3. The HTTP module body becomes `{{<CreateJSON_id>.json}}` — guaranteed strict JSON.

Alternatives ruled out:
- Setting `targetStructureType` on the BasicAggregator alone — version-dependent, low confidence.
- Switching to `bodyType=multipart` or form-urlencoded — would require EF changes; violates "EF stays correct, fix Make".
- Pre-stringifying with `tools:SetVariable + toString()` — ugly, double-parse on EF side.

### Constraints from prior work

- The EF `facebook-campaigns-sync` v4 is deployed and reads `MAKE_SECRET` from env. Curl-verified 200 with new secret, 401 with old. Do NOT modify the EF.
- The new `MAKE_SECRET` value is in Make scenario `9126542`'s body (post-rotation, committed in 7416854). Do NOT change it.
- Scenario `9126542` is currently DEACTIVATED. Stays DEACTIVATED until smoke test passes.

## 3. Success Criteria

All measurable, all binary pass/fail.

### Make Data Structure
1. ✅ A Make Data Structure named `optic_up_facebook_campaigns_sync_body` exists in team 402680.
2. ✅ Schema matches EF expectation:
   ```
   tenant_slug: text (required)
   shared_secret: text (required)
   campaigns: array of:
     campaign_id: text
     name: text
     status: text
     event_type: text (optional)
     daily_budget: number (optional)
     master: text (optional)
     interests: text (optional)
     total_spend: number
     raw_data: collection (optional)
   ```
3. ✅ The Data Structure is reusable (not scenario-scoped — exists at team level for future use).

### Make scenario `9126542` blueprint changes
4. ✅ A new module of type `json:CreateJSON` is inserted between module id=3 (final BasicAggregator) and module id=4 (HTTP). Module ID will be assigned by Make on insertion.
5. ✅ The new CreateJSON module references the Data Structure from criterion 1.
6. ✅ The CreateJSON module's mapper sets:
   - `tenant_slug = "demo"` (literal, since scenario is demo-folder)
   - `shared_secret = <current value from HTTP body>` (carry-over, masked in this SPEC)
   - `campaigns = {{3.array}}` (the aggregator output)
7. ✅ The HTTP module (id=4) body field is updated to `{{<newId>.json}}` — single bracket-substitution, no template wrapper.
8. ✅ HTTP module `bodyType` remains `raw`. Headers remain `Content-Type: application/json`.
9. ✅ All other modules (id=1, 2, 3) untouched. No changes to their mappers, filters, or aggregator settings.
10. ✅ Scenario `isActive: false` at end of execution.

### End-to-end smoke test
11. ✅ Manual one-shot run via `mcp__make__scenarios_run` (or activate-watch-deactivate pattern if `_run` doesn't work for this scenario type).
12. ✅ The run completes with status `success` (no error, all 4 modules execute).
13. ✅ HTTP module response: HTTP 200, body matching `{ok: true, processed: N, ...}` where N >= 1.
14. ✅ Database verification: at least 1 row in `crm_facebook_campaigns` for `tenant_id = 8d8cfa7e-ef58-49af-9702-a862d459cccb` (demo) with `last_synced_at` within the last 5 minutes.
15. ✅ Database verification: at least 1 row in `crm_ad_spend` for the same tenant_id with `spend_date = today`.

### Documentation
16. ✅ The Data Structure schema definition is exported and saved to `modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json` for future reference.
17. ✅ A short `README.md` at `modules/Module 4 - CRM/docs/make-patterns/README.md` explains the pattern: when to use `json:CreateJSON`, how to define the Data Structure, how to bind it to upstream aggregators. Audience: future strategic chats authoring SPECs for new Make scenarios that POST to EFs.

### Cleanup & repo hygiene
18. ✅ Scenario activation status is `false` at end of execution (re-deactivated after smoke test if it was activated to enable run-once).
19. ✅ `git status` clean except for the 2 new doc files (criteria 16 and 17). All other dirty/untracked state preserved as session start.
20. ✅ `git diff --staged | grep -iE 'fbsync_'` finds zero matches — no secrets in any committed file.

### Verification
21. ✅ `npm run verify:integrity` exits 0.
22. ✅ All pre-commit hooks pass.
23. ✅ Final repo state clean after the doc commit.

## 4. Autonomy Envelope

**CAN do without asking:**
- Create the Data Structure via `mcp__make__data-structures_create`.
- Generate the Data Structure JSON via `mcp__make__data-structures_generate` if helpful (though manual definition matching criterion 2 is fine).
- Insert the new CreateJSON module via `mcp__make__scenarios_update` with the modified blueprint.
- Update the HTTP module's body field via the same `scenarios_update` call.
- Run the smoke test via `scenarios_run`. If `_run` doesn't work for the listCampaigns trigger type, fall back to: `scenarios_activate` → wait for one execution → `scenarios_deactivate`. Stay in this state for at most 90 seconds.
- Query the database for verification (criteria 14 and 15) via `mcp__supabase__execute_sql` — read-only SELECT queries.
- Write the 2 doc files (criteria 16 and 17) and commit them.

**MUST stop and ask if:**
- The Data Structure creation fails or is rejected by Make.
- `scenarios_update` returns an error.
- The smoke test run produces HTTP 400 again — that means the fix didn't work; investigate further.
- The smoke test run produces HTTP 401 — that means the secret in Make scenario doesn't match Supabase env. Out of scope of this SPEC; flag for separate investigation.
- The DB verification returns zero rows after a successful HTTP 200 — that means the EF processed the request but didn't persist; flag the EF as the bug, not Make.
- Any module other than id=3, id=4, or the new CreateJSON module gets modified.
- The Data Structure name conflicts with an existing one in team 402680 (use a different unique name and document).

## 5. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

1. **STOP** if the smoke test produces HTTP 400 — the fix didn't take. Roll back: revert scenario `9126542` to its pre-SPEC blueprint, deactivate, report.
2. **STOP** if MCP tool calls don't have the necessary endpoints (e.g. `data-structures_create` not exposed) — fall back to documenting the manual steps Daniel would need to take in the Make UI, and write a follow-up prompt.
3. **STOP** if scenario `9126542` accidentally gets activated and runs more than once. Deactivate immediately. The scenario hits a real Facebook API and consumes API ops.
4. **STOP** if any DDL or write to non-CRM tables happens — none should.
5. **STOP** if `git status` shows changes to files outside this SPEC's scope.

## 6. Rollback Plan

If anything breaks:

1. **Pre-smoke-test failure** (e.g. Data Structure creation fails or scenarios_update fails): nothing has changed in production state; just report.
2. **Smoke test fails (HTTP 400 again):**
   - Use `mcp__make__scenarios_update` to revert `9126542`'s blueprint to the pre-SPEC version (which was: aggregator id=3 → HTTP id=4 with bare `{{3.array}}`).
   - Delete the new `json:CreateJSON` module from the blueprint.
   - The Data Structure can stay (it's reusable; orphaned but harmless).
   - Deactivate scenario.
3. **Smoke test passes but DB verification fails:**
   - Don't roll back Make. The Make-side fix worked.
   - Flag the EF/DB issue as a separate finding — out of scope of this SPEC.
4. **Doc commit fails pre-commit hook:**
   - Fix the issue (probably file size or formatting), retry commit. No production rollback needed.

## 7. Out of Scope

- Modifying the EF `facebook-campaigns-sync` (it's correct).
- Changing the Make scenario's other modules (1=List Campaigns, 2=Insights, 3=BasicAggregator). Their behavior is correct.
- Refactoring the `crm_facebook_campaigns` / `crm_ad_spend` schema.
- Triggering historical backfill — only today's snapshot is created.
- Deactivating + re-activating on a schedule (cron). Daniel will set the schedule manually after smoke test passes.
- The P7 cutover to prizma tenant — that's a separate SPEC.

## 8. Expected Final State

### 8.1 — Make Data Structure

A new structure exists in team 402680:
- Name: `optic_up_facebook_campaigns_sync_body`
- Specification: as per criterion 2 (above).

Exported JSON saved to `modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json`.

### 8.2 — Make scenario `9126542` blueprint

Module flow (after change):
```
1. facebook:listCampaigns
2. facebook:GetAdAccountInsights (per campaign)
3. builtin:BasicAggregator (final array)
4. json:CreateJSON (NEW) — references Data Structure, mapper:
     tenant_slug = "demo"
     shared_secret = "fbsync_***" (carry-over)
     campaigns = {{3.array}}
5. http:ActionSendData — body = {{4.json}}, bodyType=raw
```

(The numbering may differ in Make — what matters is the order: aggregator → CreateJSON → HTTP.)

### 8.3 — New documentation files

```
modules/Module 4 - CRM/docs/make-patterns/
  README.md                                   (~80 lines, pattern explanation)
  data-structure-fb-campaigns-sync.json       (Data Structure JSON export)
```

### 8.4 — Database state (post-smoke-test)

For tenant_id `8d8cfa7e-ef58-49af-9702-a862d459cccb`:
- `crm_facebook_campaigns`: 1+ rows with recent `last_synced_at`.
- `crm_ad_spend`: 1+ rows with `spend_date = today`.

(Note: the EF is wired to demo tenant. Even though Daniel's Facebook ad account is for prizma, the rows land in demo because that's what `tenant_slug` says in the body. This is intentional for demo testing.)

### 8.5 — Repo state

```
On branch develop
Your branch is ahead of origin/develop by 1 commit.   (after push: in sync)
Changes not staged for commit:
  modified:   docs/guardian/DAILY_SUMMARY.md
  modified:   docs/guardian/GUARDIAN_ALERTS.md
  modified:   docs/guardian/GUARDIAN_REPORT.md
Untracked files:
  [the same prior outputs/strays as session start]
```

## 9. Commit Plan

**Commit 1 — Documentation:**
```
docs(crm): document Make → Supabase POST pattern (json:CreateJSON + Data Structure)

Establishes the reusable pattern for Make scenarios that POST to Optic Up
Edge Functions. M4_CAMPAIGNS_MAKE_BODY_FIX SPEC was the first to use it
(Facebook campaigns sync). Future Make → EF scenarios should follow the
README at modules/Module 4 - CRM/docs/make-patterns/README.md.

Two files added:
- README.md — when/why/how to use json:CreateJSON for HTTP bodies
- data-structure-fb-campaigns-sync.json — the EF body schema as a
  reusable Make Data Structure export
```

That's the only commit. The Make scenario changes themselves are NOT in git — they're in Make's cloud. The doc commit captures the pattern so it's reproducible.

The SPEC retrospective files (`EXECUTION_REPORT.md`, `FINDINGS.md`) are added as a second commit at SPEC close (per folder-per-SPEC protocol).

## 10. Pre-flight Checks (executor runs before any change)

1. `git status` is clean except for the expected dirty state from prior session (3 guardian files modified; outputs/strays untracked).
2. `git log -1` shows `7416854` (the EF v3 commit). HEAD is on this commit.
3. Branch is `develop`. Repo remote is `opticalis/opticup`.
4. `mcp__make__scenarios_get` for `9126542` confirms:
   - `isActive: false`
   - 4 modules in current order (List, Insights, BasicAggregator, HTTP)
   - HTTP body still contains `{{3.array}}` (the broken interpolation)
   - `shared_secret` value matches what's in `~/.optic-up/make-secret.txt` (or starts with the new prefix `fbsync_f7acdea0...`)
5. `mcp__supabase__execute_sql` for read-only:
   ```sql
   SELECT COUNT(*) FROM crm_facebook_campaigns WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
   Record the baseline count (likely 0 or 1 from prior seed test).
   Same for `crm_ad_spend`.
6. `mcp__make__data-structures_list` to confirm no existing structure named `optic_up_facebook_campaigns_sync_body`.

## 11. Lessons Already Incorporated

- **Investigation cost:** prior read-only investigation (PROMPT_INVESTIGATE_MAKE_BODY_PATTERN_V2) confirmed no working precedent exists, saving the executor from chasing a phantom pattern.
- **Iron Rule 23:** the new MAKE_SECRET is masked throughout this SPEC. Real values stay in Make UI + Supabase env + `~/.optic-up/make-secret.txt`.
- **Iron Rule 21:** Data Structure name and doc paths checked at SPEC author time — no collisions in `docs/`, no existing `data-structures_list` results matching the name.
- **Cross-reference check (Step 1.5 of opticup-strategic protocol):** completed at SPEC author time. New objects: 1 Make Data Structure (cloud-only, not in git), 2 doc files (no path collision in `docs/make-patterns/` — directory doesn't exist yet, will be created). Zero collisions.
- **Investigation hypothesis was wrong:** the project-memory hint about `8479284` calling `lead-intake` was incorrect. Lesson: project memory references to Make scenarios should specify the exact module type — saying "scenario 8479284 sends to lead-intake" without verifying the HTTP module's existence is a confabulation risk. This SPEC's executor must NOT trust similar hints — verify with `scenarios_get` if in doubt.

## 12. QA Protocol

### Path 0 — Pre-flight
1. All §10 checks pass.

### Path 1 — Data Structure creation
1. Create Data Structure via MCP.
2. Verify with `data-structures_get` — schema matches §3 criterion 2.
3. If MCP doesn't expose `data-structures_create` — STOP and report (fallback path: write a doc telling Daniel to create it manually in Make UI).

### Path 2 — Scenario blueprint update
1. Fetch `9126542` blueprint via `scenarios_get`. Save the original blueprint to a variable for rollback.
2. Construct the new blueprint with:
   - The new `json:CreateJSON` module inserted between id=3 and id=4.
   - HTTP body changed to `{{<newId>.json}}`.
3. Apply via `scenarios_update`.
4. Re-fetch and verify:
   - Module count is 5 (was 4).
   - New CreateJSON module references the Data Structure.
   - HTTP body is `{{<newId>.json}}`.
   - Other modules unchanged.

### Path 3 — Smoke test
1. Try `mcp__make__scenarios_run` for `9126542`. If supported for this scenario type — proceed.
2. If `_run` not supported (some triggers can't be run on demand): activate via `scenarios_activate`, wait 60-90 seconds, deactivate via `scenarios_deactivate`. Use `executions_list` filtered to scenario `9126542` to find the run.
3. Use `executions_get-detail` on the run ID to inspect each module's input/output.
4. Confirm:
   - Run status = `success`.
   - HTTP module response code = 200.
   - HTTP module response body contains `"ok":true` and `"processed":>=1`.

### Path 4 — DB verification
```sql
SELECT campaign_id, name, status, last_synced_at
FROM crm_facebook_campaigns
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND last_synced_at >= now() - interval '5 minutes';

SELECT campaign_id, spend_date, total_spend, created_at
FROM crm_ad_spend
WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
  AND created_at >= now() - interval '5 minutes';
```

Both should return 1+ rows. If 0 rows after HTTP 200 — that's a finding, not a fix failure. EF processed but didn't persist.

### Path 5 — Documentation commit
1. Write `modules/Module 4 - CRM/docs/make-patterns/README.md` (~80 lines, in English: pattern explanation + when to use + 4-step recipe).
2. Write `modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json` (the Data Structure schema as JSON).
3. `git add` both files (explicit paths).
4. Verify the staged diff: `git diff --staged | grep -iE 'fbsync_'` returns empty (no secrets in docs).
5. Run integrity gate.
6. Commit with the message from §9.
7. Push to develop.

### Path 6 — Final state verification
1. `git log -1` shows the new doc commit on top of `7416854`.
2. `git status` matches §8.5.
3. Scenario `9126542` `isActive: false`.
4. Smoke test artifacts (run ID, response body) recorded in EXECUTION_REPORT.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
