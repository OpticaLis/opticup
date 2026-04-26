# SPEC — M4_CAMPAIGNS_MAKE_BODY_FIX_V2

> **Module:** Module 4 - CRM
> **SPEC folder (final location for executor):** `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2/SPEC.md`
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Supersedes:** `M4_CAMPAIGNS_MAKE_BODY_FIX` (V1, verdict 🔴 REOPEN). The V1 hypothesis (`json:CreateJSON` substitution) was disproved by the toy-test investigation 2026-04-26. Root cause is field-name, not serialization.
> **Drives:** Fix Make scenario `9126542` so its HTTP POST to `facebook-campaigns-sync` EF actually transmits a body. Document the field-name pattern so future Make scenarios don't re-discover this trap.

---

## 1. Goal

Make scenario `9126542`'s HTTP module (id=4) currently has its body content in `mapper.body` — which Make's `http:ActionSendData` v3 silently ignores, transmitting an empty wire body. EF receives `""`, fails `req.json()`, returns HTTP 400. This SPEC moves the body content to `mapper.data` (the field Make actually reads) and verifies the fix with a real smoke test that lands rows in `crm_facebook_campaigns` + `crm_ad_spend`. It also writes a 1-page documentation file capturing the trap so future Make → Optic Up POST scenarios skip it.

## 2. Background

### Toy-test findings (2026-04-26)

A disposable Make scenario (`TOY_createjson_test`, id 9127250, since deleted) tested 4 configurations against `webhook.site` to observe what Make actually sends on the wire:

| Config | Body content location | Wire body received |
|---|---|---|
| A | `mapper.body = "{{1.json}}"` (template with substitution) | **empty (0 bytes)** |
| B | `mapper.body = "{wrap: {{1.json}}}"` (wrapped template) | **empty (0 bytes)** |
| C | `mapper.body = "{...hardcoded JSON...}"` (no substitution) | **empty (0 bytes)** |
| D | `mapper.body` populated AND `mapper.data = "{...hardcoded JSON...}"` | 48 bytes — `mapper.data` content delivered, `mapper.body` ignored |

**Conclusion:** `http:ActionSendData` v3 reads its wire body from `mapper.data`, not `mapper.body`. Substitution, Data Structures, aggregator binding — all of those work. The bug was a single field-name mistake.

### Why this trap is silent

Make's UI labels both fields suggestively. The `body` field appears as the obvious place to put a body. Make's run status reports `success` (status=1) regardless. Only by inspecting the actual wire transmission did we find the empty-body fact.

### What's still in place

- Data Structure `optic_up_facebook_campaigns_sync_body` (id 573694) — preserved per Daniel's decision. May or may not be used in V2 (see Hypothesis Ladder below).
- Scenario `9126542` is at the rolled-back pre-V1 blueprint: 4 modules, bare `{{3.array}}` template in `mapper.body`. `isActive: false`. The rotated `MAKE_SECRET` value is in `mapper.body` (and will move to `mapper.data` in V2).
- EF `facebook-campaigns-sync` v4: env-based `MAKE_SECRET`, curl-verified 200 with new value, 401 with old. No EF changes needed.

## 3. Hypothesis Ladder

In order — the executor tries each rung; if it fails, drops to the next.

### Rung 1 — Minimum change: `body` → `data`, keep current template (cheapest)

Change scenario `9126542`'s HTTP module so the existing inline template moves from `mapper.body` to `mapper.data`. No CreateJSON, no Data Structure, no aggregator changes:

```
mapper.data = {
  "tenant_slug": "demo",
  "shared_secret": "fbsync_***",
  "campaigns": {{3.array}}
}
```

**Confidence: medium-high.** Make's `data` field is documented as accepting raw text with substitutions. The toy-test's Config D used a hardcoded literal in `data`; it's unconfirmed whether `data` interpolates Make-array references like `{{3.array}}` cleanly into JSON.

**Success signal:** smoke test → HTTP 200 from EF + 1+ rows in `crm_facebook_campaigns` + 1+ rows in `crm_ad_spend`.

**Failure signal:** EF returns 400 again. Likely cause: `data` interpolates `{{3.array}}` using Make's bracket-keyed pseudo-syntax (the original V1 fear). Drop to Rung 2.

### Rung 2 — Re-introduce `json:CreateJSON` upstream, body via `data`

If Rung 1 fails:

1. Re-insert `json:CreateJSON` (id=5) between aggregator (id=3) and HTTP (id=4), referencing Data Structure 573694.
2. Mapper:
   - `tenant_slug = "demo"`
   - `shared_secret = "fbsync_***"`
   - `campaigns = {{3.array}}`
3. HTTP module: `mapper.data = "{{5.json}}"` (NOT `mapper.body`).

**Confidence: high.** This is the V1 plan, with the field-name corrected.

**Success signal:** same as Rung 1.

**Failure signal:** EF returns 400. At that point STOP and escalate — we'd be back to the 4 hypotheses already ruled out by the toy test (which confirmed CreateJSON works correctly). Something genuinely new is at play.

### Rung 3 — Stop, escalate

If both rungs fail, stop and report. Open a Foreman discussion before any further attempt.

## 4. Success Criteria

All measurable, all binary pass/fail.

### Make scenario `9126542` blueprint changes
1. ✅ Scenario `9126542`'s HTTP module (id=4) has its body content in `mapper.data`, not `mapper.body`. (Either field can exist for compatibility; only `data` matters for transmission. SPEC requires `body` to be empty/null after the change.)
2. ✅ The body content (whether plain template or `{{<createjson>.json}}` reference) produces strict JSON when interpolated by Make.
3. ✅ Headers remain `Content-Type: application/json`. `bodyType` remains `raw`.
4. ✅ Modules id=1, id=2, id=3 are not modified by this SPEC. Their mappers, filters, and aggregator settings are unchanged.
5. ✅ If Rung 2 was triggered: a `json:CreateJSON` module (likely id=5) sits between id=3 and id=4 referencing DS 573694.
6. ✅ Scenario `isActive: false` at SPEC end (deactivated after smoke test).

### End-to-end smoke test
7. ✅ One Make execution completes with status=`success` AND HTTP module response code 200 AND response body contains `"ok":true` and `"processed":>=1`.
8. ✅ DB verification:
   - At least 1 row in `crm_facebook_campaigns` for tenant_id `8d8cfa7e-ef58-49af-9702-a862d459cccb` with `last_synced_at >= now() - interval '5 minutes'`.
   - At least 1 row in `crm_ad_spend` for the same tenant_id with `spend_date = today`.
9. ✅ Test repeatability: a SECOND execution produces UPSERT behavior — `metadata_updated >= 1` (not `metadata_inserted`), `spend_updated >= 1` (not `spend_inserted`). Confirms the EF's UNIQUE constraint paths work.

### Documentation (regardless of which Rung succeeded)
10. ✅ New file `modules/Module 4 - CRM/docs/make-patterns/README.md` (~80 lines) explaining:
    - **The trap:** `http:ActionSendData` v3 reads body from `mapper.data`, not `mapper.body`. Make's UI does not warn. Run status reports success regardless.
    - **Verification recipe:** any new Make → Optic Up POST scenario should test against httpbin or webhook.site once before targeting a real EF, to confirm wire body content.
    - **When to use `json:CreateJSON`:** if upstream produces a Make collection/array and the EF needs strict JSON, CreateJSON normalizes it. Otherwise, plain `mapper.data` with template substitution suffices.
    - **The Data Structure pattern:** when CreateJSON is used, define a reusable team-level Data Structure matching the EF body schema. Reference: `optic_up_facebook_campaigns_sync_body` (id 573694).
11. ✅ If Rung 2 was triggered: also write `modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json` (the DS schema as JSON export) for reusability. If Rung 1 succeeded — skip this file (DS isn't load-bearing for Rung 1).

### Repo hygiene
12. ✅ `git status` clean except for the new doc file(s) (criteria 10 and possibly 11). All other dirty/untracked state preserved as session start.
13. ✅ `git diff --staged | grep -iE 'fbsync_'` finds zero matches — no secrets in any committed file.
14. ✅ `npm run verify:integrity` exits 0.
15. ✅ All pre-commit hooks pass.

## 5. Autonomy Envelope

**CAN do without asking:**
- Try Rung 1. If it succeeds, skip Rung 2 entirely.
- If Rung 1 fails: roll back the change to `9126542` blueprint, then try Rung 2.
- Use `mcp__make__scenarios_update` to modify scenario `9126542`.
- Use `scenarios_run` (or activate-watch-deactivate fallback) for smoke tests. Allow up to 4 minutes per execution per scenario history p95 of ~193s.
- Use `mcp__supabase__execute_sql` for read-only verification queries.
- Write the doc file(s).
- Commit and push.

**MUST stop and ask if:**
- Both Rung 1 and Rung 2 fail.
- Any module other than id=4 (and id=5 for Rung 2) is modified.
- Smoke test produces HTTP 401 — would mean the secret in scenario doesn't match Supabase env. That's outside this SPEC's scope; out-of-band fix needed.
- Smoke test produces HTTP 200 but DB shows zero rows. Flag the EF as a finding.
- `mcp__make__scenarios_update` rejects the change.
- Any text resembling a secret literal (`fbsync_*` patterns ≥20 chars) appears in the diff being staged.

## 6. Stop-on-Deviation Triggers (beyond CLAUDE.md §9 globals)

1. **STOP** if both Rung 1 and Rung 2 fail. Roll back to pre-SPEC blueprint, deactivate, write FINDINGS.
2. **STOP** if any DDL or non-CRM-table write happens.
3. **STOP** if `git status` shows changes to unexpected files.
4. **STOP** if scenario `9126542` accidentally activates and runs more than once per Rung. Deactivate immediately.
5. **STOP** if doc commit's diff contains any secret literal.

## 7. Rollback Plan

### Per-rung rollback
- **Rung 1 fails:** revert `9126542`'s HTTP module to pre-SPEC blueprint (`mapper.body` template, `mapper.data` empty). Then proceed to Rung 2.
- **Rung 2 fails:** revert `9126542`'s blueprint to pre-SPEC state (4 modules, no CreateJSON, body in `mapper.body`). Deactivate. STOP.

### SPEC-level rollback
- If the SPEC fails entirely after both rungs: scenario stays in pre-SPEC blueprint state, deactivated. The Data Structure 573694 stays in place (harmless). Doc files NOT written if no rung succeeded — failure pattern doesn't deserve a doc.

### Doc commit rollback
- If the commit fails pre-commit hook: fix the issue, retry. No production rollback needed.

## 8. Out of Scope

- Modifying the EF (it's correct).
- Modifying Make modules id=1, id=2, id=3.
- Triggering historical backfill.
- Schedule wiring (cron). Daniel sets schedule manually after smoke test passes.
- P7 cutover to prizma — separate SPEC.
- Deleting Data Structure 573694 — left in place per Daniel's decision; cleanup deferred.

## 9. Expected Final State (success scenario)

### If Rung 1 succeeded:
```
Make scenario 9126542:
  Module 4 (HTTP):
    mapper.data = {
      "tenant_slug": "demo",
      "shared_secret": "fbsync_***",
      "campaigns": {{3.array}}
    }
    mapper.body = (empty)
  isActive: false (deactivated after smoke)

Make team 402680:
  Data Structure 573694: still in place (unused by this rung; reusable)
  No new scenarios

Repo:
  + modules/Module 4 - CRM/docs/make-patterns/README.md
  No other changes
```

### If Rung 2 succeeded:
```
Make scenario 9126542:
  Module 5 (json:CreateJSON, NEW):
    references Data Structure 573694
    mapper:
      tenant_slug = "demo"
      shared_secret = "fbsync_***"
      campaigns = {{3.array}}
  Module 4 (HTTP):
    mapper.data = {{5.json}}
    mapper.body = (empty)
  Module flow: 1 → 2 → 3 → 5 → 4
  isActive: false

Repo:
  + modules/Module 4 - CRM/docs/make-patterns/README.md
  + modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json
  No other changes
```

### Database (success scenario, either rung)
For tenant_id `8d8cfa7e-ef58-49af-9702-a862d459cccb`:
- `crm_facebook_campaigns`: 1+ rows with recent `last_synced_at`.
- `crm_ad_spend`: 1+ rows with `spend_date = today`.
After a second smoke run: rows updated, no new inserts (UPSERT path verified).

## 10. Commit Plan

**Commit 1 — Documentation:**
```
docs(crm): document Make HTTP body field-name trap (mapper.data vs mapper.body)

Establishes the trap-and-verification pattern for Make scenarios that POST
to Optic Up Edge Functions. Discovered during M4_CAMPAIGNS_MAKE_BODY_FIX
(V1 failed) and confirmed via toy-test 2026-04-26: http:ActionSendData v3
silently ignores mapper.body and reads the wire body from mapper.data.

Future Make → EF scenarios should verify with httpbin or webhook.site
once before targeting a real EF.

[1 or 2 files added per the rung that succeeded]
```

The Make scenario changes themselves are NOT in git — they're in Make's cloud. The doc commit captures the pattern.

The retrospective files (`EXECUTION_REPORT.md`, `FINDINGS.md` if any) land in a second commit at SPEC close.

## 11. Pre-flight Checks

1. `git status` is clean except for prior session's expected dirty state (3 guardian files modified; outputs/strays untracked).
2. `git log -1` shows `fe5890a docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX (verdict: 🔴 REOPEN)`.
3. Branch is `develop`. Repo remote is `opticalis/opticup`.
4. `mcp__make__scenarios_get` for `9126542` confirms:
   - `isActive: false`
   - 4 modules, current order: List Campaigns → Insights → BasicAggregator → HTTP.
   - HTTP module has `mapper.body` with the inline template containing the rotated secret prefix `fbsync_f7acdea0...`.
   - HTTP module's `mapper.data` is empty or absent.
5. `mcp__make__data-structures_get` for id 573694 confirms it still exists.
6. DB baseline: 0 rows in `crm_facebook_campaigns` and `crm_ad_spend` for the demo tenant.

If any pre-flight check fails — STOP and report.

## 12. Lessons Already Incorporated

- **V1 lesson (don't commit to single hypothesis):** this SPEC's §3 is a Hypothesis Ladder with 2 rungs and explicit failure transitions, per the FOREMAN_REVIEW V1 author-skill Proposal 2.
- **V1 lesson (verify wait windows before quoting):** §5 quotes "up to 4 minutes per execution" based on the documented p95 of 193s + buffer (per FOREMAN_REVIEW V1 author-skill Proposal 1).
- **Toy-test as evidence:** the prior toy-test gave hard evidence that `mapper.data` is the right field. This SPEC is built on that evidence, not on documentation alone.
- **Iron Rule 23 (no secrets):** the rotated secret stays in Make scenario UI + Supabase env + `~/.optic-up/make-secret.txt`. Doc files use the masked prefix `fbsync_***` only.
- **Iron Rule 21 (No Orphans):** the doc file path `docs/make-patterns/` is new (no collision). The Data Structure 573694 stays in place per Daniel's decision; if Rung 1 succeeds it becomes unused but documented.
- **Cross-Reference Check (opticup-strategic Step 1.5j):** `data-structures_get(573694)` confirmed it still exists in pre-flight. No new objects in this SPEC except the doc files; no DB / code / function name collisions.

## 13. QA Protocol

### Path 0 — Pre-flight
1. All §11 checks pass.
2. Capture the current `9126542` blueprint as a snapshot for rollback (save to a variable or temp file in `/tmp/`).

### Path 1 — Try Rung 1
1. Update `9126542` HTTP module: move the inline JSON template from `mapper.body` to `mapper.data`. Set `mapper.body` to empty/null.
2. Verify with `scenarios_get`: HTTP module `mapper.body` empty, `mapper.data` has the template.
3. Smoke test:
   - Call `scenarios_run`. If "scenario not activated" error → activate, wait 60s for auto-trigger to complete OR manually run, then deactivate.
   - Use `executions_list` to find the run, `executions_get-detail` to inspect.
4. Check HTTP module response: code, body. Expect 200 + `"ok":true,"processed":N>=1`.
5. If 200 → DB verification. Run the queries from §4 criterion 8. If both queries return ≥1 row → Rung 1 SUCCESS. Skip Rung 2.
6. Run a SECOND smoke test for criterion 9 (UPSERT path). Same procedure.
7. Deactivate scenario.
8. Proceed to Path 3 (docs).

### Path 2 — Try Rung 2 (only if Rung 1 failed)
1. Roll back `9126542` to the pre-SPEC blueprint (snapshot from Path 0 step 2).
2. Insert `json:CreateJSON` module (probably id=5) referencing DS 573694, mapper as per §3 Rung 2.
3. Update HTTP module: `mapper.data = "{{5.json}}"`, `mapper.body` empty.
4. Verify with `scenarios_get`: 5 modules, flow 1→2→3→5→4, HTTP `mapper.data` has the `{{5.json}}` reference.
5. Smoke test (same procedure as Path 1).
6. If 200 + DB rows → Rung 2 SUCCESS. Else → Path 4 (rollback + STOP).
7. Run second smoke for UPSERT path.
8. Deactivate scenario.
9. Proceed to Path 3 (docs).

### Path 3 — Documentation commit
1. Write `modules/Module 4 - CRM/docs/make-patterns/README.md` (~80 lines).
2. If Rung 2 succeeded: also export DS 573694 as `data-structure-fb-campaigns-sync.json` via `mcp__make__data-structures_get` and save to `modules/Module 4 - CRM/docs/make-patterns/data-structure-fb-campaigns-sync.json`.
3. `git add` only the new file(s).
4. Verify diff: `git diff --staged | grep -iE 'fbsync_'` returns empty.
5. Run integrity gate.
6. Commit with the message from §10.
7. Push to develop.

### Path 4 — Both rungs failed (rollback + stop)
1. Confirm `9126542` blueprint is back to pre-SPEC state (4 modules, body in `mapper.body`).
2. Confirm `isActive: false`.
3. DO NOT write doc files.
4. Write FINDINGS.md describing what was tried and what didn't work.
5. Commit retrospective only.

### Path 5 — Final state verification
1. `git log -1` shows the new doc commit (or retrospective commit if Path 4).
2. `git status` matches §9.
3. Scenario `9126542` `isActive: false`.
4. Smoke test artifacts (run IDs, response bodies, row counts) recorded in EXECUTION_REPORT.

---

## 14. Doc Content — README.md (executor uses this as the basis)

The README at `modules/Module 4 - CRM/docs/make-patterns/README.md` should contain (in English):

1. **Title:** "Make → Optic Up Edge Function POST Pattern"
2. **The trap (top of file, can't miss):** `http:ActionSendData` v3 reads wire body from `mapper.data`, not `mapper.body`. Make UI doesn't warn. Run status reports success even when wire body is empty.
3. **How we discovered it:** brief reference to V1 SPEC failure + toy-test (link by SPEC slug name).
4. **The minimum recipe** for Make scenario POSTing to an Optic Up EF:
   - HTTP module: `bodyType=raw`, header `Content-Type: application/json`, body in `mapper.data` (NEVER `mapper.body`).
   - For flat-object bodies: inline template with substitutions works directly in `mapper.data`.
   - For arrays-of-objects bodies: insert `json:CreateJSON` upstream + bind aggregator output to a Data Structure + reference `{{<createjson_id>.json}}` in `mapper.data`.
5. **The verification recipe:** before targeting a real EF, build a 2-module toy (any source → HTTP) targeting `https://webhook.site/<token>`. Read the received request via webhook.site to confirm the wire body looks right.
6. **Reusable Data Structure:** mention `optic_up_facebook_campaigns_sync_body` (id 573694) and link to `data-structure-fb-campaigns-sync.json` if Rung 2 is what landed.
7. **Common gotchas:**
   - Make's status=1 (success) does NOT mean the EF received the request correctly. Always check the EF response code in the HTTP module's output.
   - `parseResponse: true` parses the EF response into Make's data tree but doesn't validate it.
   - Setting `mapper.body` AND `mapper.data` doesn't cause a conflict; Make uses `data` and ignores `body`. The redundancy is silent.

Tone: practical and brief. Future SPEC authors will read this as a reference, not as a tutorial.

---

*End of SPEC. Author: opticup-strategic in Cowork session 2026-04-26 evening.*
