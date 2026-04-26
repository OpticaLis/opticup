# FINDINGS — M4_CAMPAIGNS_MAKE_BODY_FIX

> One entry per finding. Severity: INFO / LOW / MEDIUM / HIGH / CRITICAL.
> Findings are NOT fixed in this SPEC. Each entry suggests a next action
> (new SPEC / TECH_DEBT entry / dismiss).

---

## Finding 1 — `json:CreateJSON` + `{{N.json}}` did NOT produce strict JSON in this Make config (HIGH)

**Severity:** HIGH (blocks the next attempt at fixing the Make scenario; no
known workaround in this team's Make instance yet).

**Location:** Make scenario `9126542`, HTTP module (id=4) body field after
the SPEC-prescribed CreateJSON insertion.

**What happened:** With the new flow `Aggregator → CreateJSON → HTTP`,
where CreateJSON references Data Structure `optic_up_facebook_campaigns_sync_body`
(id 573694) and the HTTP body field is `{{5.json}}`, the EF received the
request but rejected it with HTTP 400 "Invalid JSON body" — the `req.json()`
parse failed. Make's UI reports the entire scenario succeeded (status=1, 13
ops). The 400 logs are timestamp `2026-04-26T11:46:28.933Z` (deployment v4
of the EF).

**Possible root causes** (none confirmed yet, listed in order of likelihood):
1. The HTTP module body literally received the unsubstituted string
   `{{5.json}}` (Make didn't interpolate). `bodyType=raw` may require the
   content to start with a literal `{` for substitution to engage —
   meaning a body of just `{{5.json}}` (no surrounding template) is
   treated as a non-templated literal. Test: re-attempt with body =
   `{"data": {{5.json}}}` and see if EF gets a different (likely 400 still,
   but different shape).
2. CreateJSON's output property is named differently — maybe `value`,
   `output`, or the structure-name. Make's docs are inconsistent here.
   Test: `executions_get` with module-level data dump (not exposed by
   current MCP) or trial different `{{5.X}}` references.
3. The Data Structure's `array → spec → collection → spec` syntax is
   accepted by `data-structures_create` but not actually wire-compatible
   with `json:CreateJSON`'s mapper. The mapper might need a different
   shape for the campaigns binding (e.g. array iteration vs. direct
   reference).
4. Make does not allow a Data Structure with `strict:false` to bind from
   `BasicAggregator`-output without a `targetStructureType` set on the
   aggregator. Untested.

**Suggested next action:** New SPEC — `M4_CAMPAIGNS_MAKE_BODY_FIX_V2`. The
Foreman should consider authoring it after gathering one of:
- Make documentation / community examples of `json:CreateJSON` paired with
  `bodyType=raw` HTTP, specifically the body field syntax.
- A direct DM/Slack to Make support to clarify the `{{N.json}}` reference.
- A toy-scenario test in this team (a 2-module flow: `tools:SetVariable` →
  `json:CreateJSON` → debug output) to isolate the CreateJSON output
  shape without the Facebook 3-minute polling tax.

The SPEC's chosen pattern was Make's documented canonical for "array of
objects → strict JSON in HTTP body" — yet it failed in our instance. So
either the docs are misleading or our config is missing a non-obvious
flag. Worth ~1 hour of investigation before the next fix attempt.

---

## Finding 2 — Two executions ran instead of one (LOW)

**Severity:** LOW (cost: ~26 Make ops vs. ~13 expected; not over budget).

**Location:** Make scenario `9126542`, executions
`187439bf6de54a63b24422dc45c38241` (auto-trigger from activate at
11:43:14Z) and `4865f7e684404d2fbe37f1d1edc52f6d` (manual via `scenarios_run`
at 11:43:21Z).

**What happened:** The `scenarios_activate` MCP call apparently triggers
an immediate auto-execution if the scenario's scheduling is `indefinitely`
+ next-due. Then `scenarios_run` started a second execution. Both ran in
parallel, both completed status=1. Both produced HTTP 400 against the EF.

**Suggested next action:** Add to the executor SKILL: when the SPEC's QA
protocol says "activate then `_run` if `_run` fails", check
`executions_list` for an in-flight auto-execution before issuing
`scenarios_run`. If one is already running, skip the manual run. Also,
SPEC authors should consider: is `scenarios_activate` alone enough to
trigger a smoke test? In this case, it would have been.

---

## Finding 3 — `git mv` fails on untracked files (LOW, executor-skill improvement)

**Severity:** LOW (cosmetic; results in plain `mv` + commit-as-add rather
than commit-as-rename).

**Location:** Step 0 of dispatcher prompt + opticup-executor SKILL §SPEC
Execution Protocol.

**What happened:** Dispatcher prompt instructed `git mv "outputs/SPEC_X.md"
"modules/.../SPEC.md"`. Returned `fatal: not under version control` because
`outputs/SPEC_X.md` was a new untracked file in this session. Fell back to
plain `mv`. Final result is correct (file at canonical path), but git
history will show the SPEC.md as a new file rather than a rename.

**Suggested next action:** Update opticup-strategic SKILL's SPEC
hand-off pattern: when authoring a SPEC in `outputs/` first and then
moving it, use `mv`, not `git mv`, OR commit the SPEC at `outputs/` first
(`docs(spec): land SPEC for X`), then have the executor `git mv` it later.
The latter creates a clean rename in history but adds a commit. Pick one
and make it the convention.

---

## Finding 4 — Make Data Structure validator's "Invalid collection in parameter 'spec'" error has no actionable detail (LOW)

**Severity:** LOW (Make-side ergonomics; no fix on our side).

**Location:** `mcp__make__data-structures_create` validation responses.

**What happened:** Three iterations on the spec for an `array` of
collections returned the same generic "Invalid collection in parameter
'spec'" error with no breadcrumb pointing at which subfield was wrong.
The fix turned out to be wrapping the array's inner item spec in
`{type: "collection", spec: [...]}` — but I had to deduce that.

**Suggested next action:** None on our side. If we ever bake a Make
helper into the project, document this exact pattern in the helper's
docstring.

---

## Finding 5 — DB tables `crm_facebook_campaigns` + `crm_ad_spend` are still empty for demo tenant (INFO)

**Severity:** INFO (this is the expected post-rollback state; logging here
so the next executor doesn't think it's a new bug).

**Location:** Supabase `tsxrrxzmdxaenlvocyit`, tables
`crm_facebook_campaigns` and `crm_ad_spend`, tenant_id
`8d8cfa7e-ef58-49af-9702-a862d459cccb`.

**What:** Both tables have 0 rows for the demo tenant. They were 0 at
session start, 0 after the failed smoke test (because EF returned 400 for
both executions), and 0 after rollback. The next successful end-to-end
run will populate them.

**Suggested next action:** None until Finding 1 is resolved.

---

*End of FINDINGS.*
