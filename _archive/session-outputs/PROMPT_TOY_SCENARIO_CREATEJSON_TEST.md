# Claude Code — Investigation Prompt: Toy Make Scenario for `json:CreateJSON` Output

> **Purpose:** Build a minimal disposable Make scenario to observe exactly what `json:CreateJSON` outputs and how it interacts with `bodyType=raw` HTTP. Returns hard evidence to inform the V2 fix SPEC. Once findings are captured, the toy is deleted.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why this exists:** The first attempt at fixing Make scenario `9126542` (M4_CAMPAIGNS_MAKE_BODY_FIX) used `json:CreateJSON` + `{{N.json}}` per Make's documented pattern. EF received HTTP 400 anyway. We have 4 hypotheses (FINDINGS.md F1) but no evidence. Before writing V2 SPEC, run a tiny scenario that isolates the question: **what does `{{N.json}}` actually substitute into a `bodyType=raw` HTTP body?**

---

## First Action — Session Start (CLAUDE.md §1, mandatory)

Continuation. Confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git log -1` shows `fe5890a docs(spec): FOREMAN_REVIEW for M4_CAMPAIGNS_MAKE_BODY_FIX (verdict: 🔴 REOPEN)`. If different — STOP.
- `git status`: 3 guardian files modified, untracked outputs/strays — same as session start. No staged files.

If state diverges — STOP and report.

---

## Context

### What we know

- Make scenario `9126542` (real) sends HTTP POST to EF `facebook-campaigns-sync` with body containing `{{5.json}}` after a `json:CreateJSON` module references Data Structure `optic_up_facebook_campaigns_sync_body` (id 573694).
- EF returns HTTP 400 "Invalid JSON body" — `req.json()` fails to parse.
- Both Make executions ended with status=1 (success), so Make itself has no idea anything is wrong on its side.
- The `executions_get` MCP returns metadata only — no per-module input/output data dump. Without seeing the actual bytes Make sent, root cause is hidden.

### The 4 hypotheses (from prior FINDINGS.md F1)

1. **`{{5.json}}` not interpolated** — `bodyType=raw` may need the body to start with `{` literally for substitution to engage. A body of just `{{5.json}}` (no surrounding template) might be treated as a non-templated literal string.
2. **Wrong output property name** — CreateJSON's output may not be on `.json` but on `.value`, `.output`, or the structure-name.
3. **Data Structure validates but isn't wire-compatible** — the array → spec → collection wrapping accepted by `data-structures_create` may not be how CreateJSON's mapper expects to receive an array.
4. **Aggregator binding gap** — Make may require `targetStructureType` on the aggregator (id=3) for a downstream CreateJSON to receive a typed array.

### The toy-test plan

Build a minimal scenario that **doesn't touch Facebook** and **lets us observe exactly what CreateJSON outputs into an HTTP body**. The cheapest source of truth is to POST the body to a public HTTP echo endpoint and read what arrives.

---

## Scope (read-mostly investigation — minimal write)

DO:
- Create a new disposable Make scenario in folder 499779 (Demo) named `TOY_createjson_test`.
- Configure 3 modules: hardcoded data → `json:CreateJSON` → HTTP POST to a public echo service.
- Run it once.
- Inspect what the echo service received — that's the bytes Make actually sent.
- Test 2-3 body-template variations to isolate hypotheses 1 and 2.
- After capturing findings — DELETE the toy scenario. (Data Structure stays — already in place from prior SPEC, reusable.)

DO NOT:
- Touch scenario `9126542`.
- Touch the `facebook-campaigns-sync` EF.
- Run any DB writes.
- Make any git commits during this prompt — findings are reported inline. (A follow-up prompt will commit a short observation doc only if needed.)
- Touch any file in the repo (this prompt is fully Make-side except for the report you return).

---

## Investigation Steps

### Step 1 — Pre-flight

1. Confirm Data Structure `optic_up_facebook_campaigns_sync_body` (id 573694) still exists via `mcp__make__data-structures_list` or `data-structures_get`. (It should — left in place per prior SPEC.) If not — proceed without it; toy can use a fresh DS or none at all.
2. List existing scenarios in folder 499779 to confirm no name collision on `TOY_createjson_test`.

### Step 2 — Pick an HTTP echo endpoint

Use one of:
- `https://httpbin.org/post` — returns the request body in `data` field of the response.
- `https://postman-echo.com/post` — same idea.
- `https://webhook.site/<unique-uuid>` — if you create one, requests are logged and viewable via API.

Recommendation: **httpbin.org/post**. It's been stable for years, requires no setup, returns JSON with the parsed body, headers, and the raw `data` field showing what was actually received.

### Step 3 — Build the toy scenario (Configuration A)

Create scenario `TOY_createjson_test` with 3 modules:

**Module 1: `tools:SetVariable`**
- Variable name: `seed_data`
- Variable value: a hardcoded array of 2 collection items matching the campaigns DS shape:
  ```
  [
    { campaign_id: "TEST_001", name: "Test A", status: "ACTIVE", total_spend: 100 },
    { campaign_id: "TEST_002", name: "Test B", status: "PAUSED", total_spend: 200 }
  ]
  ```

(If `SetVariable` can't hold an array literal in this Make version, use 2× SetVariable for individual fields, or use an `iterator` → `aggregator` to produce an array.)

**Module 2: `json:CreateJSON`**
- Reference Data Structure `optic_up_facebook_campaigns_sync_body` (id 573694).
- Mapper:
  - `tenant_slug` = `"demo"`
  - `shared_secret` = `"test_only_not_real_secret"` (a fake value — we're not POSTing to the real EF)
  - `campaigns` = `{{1.seed_data}}` (the array from Module 1)

**Module 3: `http:ActionSendData`** — **Configuration A**
- URL: `https://httpbin.org/post`
- Method: POST
- Headers: `Content-Type: application/json`
- bodyType: `raw`
- Body: `{{2.json}}` — exactly this, no surrounding template

Save and activate the scenario, run it once via `scenarios_run` (or activate → wait → deactivate). Look up the execution via `executions_list` and grab the HTTP module's response.

The httpbin response will be JSON with a `data` field containing the raw bytes Make sent. Capture:
- The response body.
- Specifically the `data` field — this is the literal HTTP body Make produced.
- Whether `data` parses as JSON or contains the literal string `{{2.json}}` (testing hypothesis 1).
- If `data` is JSON-parseable, what shape — does it have `tenant_slug`, `shared_secret`, `campaigns: [...]` correctly? Or does the array look weird?

### Step 4 — Configuration B (only if Configuration A failed in expected way)

If Configuration A's `data` field shows the literal `{{2.json}}` string (hypothesis 1 confirmed), try Configuration B:

**Module 3 body:** `{ "wrap": {{2.json}} }`

Run again. Inspect httpbin's response. Now hypothesis 1 is testable: does Make substitute when surrounded by other template content?

### Step 5 — Configuration C (only if Configuration A's `data` is JSON but wrong shape)

If Configuration A's `data` field is JSON-parseable but shows weird structure (e.g. `campaigns` as `[Object]` or as Make's bracket-keyed pseudo-syntax), try Configuration C:

**Module 3 body:** `{{2.json}}` but inspect the EXACT output of Module 2 in `executions_get-detail` first. Look for whether Module 2 produced its output on `.json`, `.value`, `.output`, or the DS name. Try alternative reference (e.g. `{{2.value}}`) and re-run.

### Step 6 — Capture findings and delete the toy

For each Configuration tested, report:

| Configuration | HTTP body sent (per httpbin's `data` field) | Status code | Diagnosis |
|---|---|---|---|
| A: bare `{{2.json}}` | <observed> | 200 from httpbin? | Did Make substitute? Did the JSON parse on httpbin's side? |
| B: wrapped `{wrap: {{2.json}}}` | <observed> | <observed> | Same questions |
| C: alternative reference | <observed> | <observed> | Same questions |

After capturing — delete the toy scenario:
```
mcp__make__scenarios_delete with scenarioId = <new toy id>
```

Verify deletion via `scenarios_list`.

The Data Structure (id 573694) stays in place.

### Step 7 — Recommendation

Based on findings, recommend the V2 SPEC's approach:

- **If Hypothesis 1 confirmed (no substitution):** V2 SPEC body = `{ "data": {{N.json}} }` and EF reads `body.data.campaigns` etc. Or wrap differently. Or use `tools:SetVariable` to build the body string then HTTP body = `{{var.value}}`.
- **If Hypothesis 2 confirmed (wrong property):** V2 SPEC uses the correct reference — provide the exact module-output reference path observed.
- **If Hypothesis 3 confirmed (DS schema wrong):** V2 SPEC provides the corrected DS schema based on what actually maps cleanly through CreateJSON.
- **If Hypothesis 4 confirmed (aggregator binding gap):** V2 SPEC sets `targetStructureType` on the aggregator first.
- **If something else:** describe what was observed and propose the next investigation step.

---

## Output Format

Return one consolidated message:

1. **Pre-flight result:** DS exists, no scenario name collision.
2. **Echo endpoint chosen:** httpbin or alternative + reasoning.
3. **Toy scenario created:** scenario ID + module list.
4. **Configuration A run:** httpbin response (focus on `data` field), diagnosis.
5. **Configuration B run** (if needed): same.
6. **Configuration C run** (if needed): same.
7. **Toy deleted:** confirmation.
8. **Recommendation:** which hypothesis confirmed, what the V2 SPEC should specify.

Mask any real secrets if they appear (shouldn't — toy uses `"test_only_not_real_secret"`). Don't paste the rotated `MAKE_SECRET` from `~/.optic-up/make-secret.txt` anywhere.

---

## Stop-on-Deviation Triggers

Stop and ask Daniel before continuing if:

- DS 573694 has been deleted (some other process deleted it).
- `scenarios_create` MCP not available — fall back to documenting manual steps.
- httpbin or chosen echo endpoint returns errors — pick a different endpoint.
- Make rejects the `SetVariable` array literal — use a different data-source pattern (e.g. iterator + aggregator with hardcoded values) and document.
- The toy somehow modifies anything outside its own boundaries — STOP, investigate.
- `scenarios_delete` fails at the end — leave the toy in place but rename it to `TOY_createjson_test_TO_DELETE` and report; Daniel can clean up via dashboard.

---

## Time Estimate

10–20 minutes. Mostly Make UI/MCP work + observation.

Cost: ~3-9 Make ops total (3 ops × up to 3 configurations). Zero Facebook ops. Zero EF calls.

---

## Iron Rule Compliance

- **Rule 23 (no secrets):** the fake `"test_only_not_real_secret"` is hardcoded in the toy. The real `MAKE_SECRET` value is NEVER touched in this test — the toy doesn't POST to `facebook-campaigns-sync`, so it doesn't need a real secret. Zero secret exposure risk.
- **Rule 31 (integrity gate):** no source modifications in this task = no run needed. Confirmed `git status` clean at start.
- **CLAUDE.md §9:** no commits, no pushes, no branch changes, no production data touched.

---

*End of prompt. After findings come back, the strategic chat will author V2 SPEC `M4_CAMPAIGNS_MAKE_BODY_FIX_V2` with a hypothesis ladder informed by hard evidence.*
