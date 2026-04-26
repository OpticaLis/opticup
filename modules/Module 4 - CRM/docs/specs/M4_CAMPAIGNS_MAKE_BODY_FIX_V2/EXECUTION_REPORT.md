# EXECUTION_REPORT — M4_CAMPAIGNS_MAKE_BODY_FIX_V2

> **Verdict:** 🔴 FAIL — both Rungs failed. Rolled back per SPEC §6.
> **Executor:** opticup-executor (Claude Code, 🖥️ Windows desktop, 2026-04-26 evening)
> **Run window:** 2026-04-26 ~12:35Z → ~12:55Z

---

## 1. Summary

Executed both Rungs of the SPEC's Hypothesis Ladder. Rung 1 (move template
from `mapper.body` to `mapper.data`, keep bare `{{3.array}}` interpolation):
HTTP module DID reach the EF — confirmed `mapper.data` IS the right field
name — but EF returned HTTP 400 because `{{3.array}}` interpolated using
Make's proprietary array serialization rather than strict JSON. Rung 2
(re-introduce `json:CreateJSON` upstream, body `mapper.data = {{5.json}}`):
Make sent an empty body and the EF received NOTHING — same trap the
toy-test had identified for `{{N.json}}` substitution into a raw HTTP body
field. Both rungs failed; rolled back to pre-V2 blueprint per Path 4. DB
remains 0/0 baseline. Data Structure 573694 still in place per SPEC §6.

The toy-test conclusion ("`mapper.data` is the right field") was correct —
but it didn't test `{{N.json}}` substitution into `data`. This SPEC's
Rung 2 was the first time we actually tried that combination, and it
failed exactly the way Configurations A/B in the toy did when using
`mapper.body`. The trap is broader than the toy revealed: Make's HTTP
raw body reads from `mapper.data`, but `{{N.json}}` substitution into
that field is also broken — at least in this Make instance.

## 2. What was done

- Moved SPEC from `outputs/SPEC_M4_CAMPAIGNS_MAKE_BODY_FIX_V2.md` to
  `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX_V2/SPEC.md`
  via plain `mv` (untracked file; `git mv` would error per V1 FINDING F3).
- Pre-flight: confirmed HEAD=`fe5890a`, `9126542` `isActive:false` with
  4-module pre-V2 blueprint, DS 573694 still exists, DB row count = 0/0
  baseline.
- **Rung 1 attempt:** `scenarios_update` to move the inline JSON template
  from `mapper.body` to `mapper.data`; `mapper.body` set to `""`. Activated,
  waited ~3.7 min, deactivated. Single auto-execution
  `3e745e89feb44ea6bf04d87c42294383` ran 195582ms, status=1, 12 ops,
  transfer 80920. EF logs (timestamp 12:44:47Z) recorded `POST | 400`.
  Wire body did reach EF, but rejected as "Invalid JSON body" — matches
  the long-suspected `{{3.array}}` non-JSON serialization.
- **Rung 2 attempt:** `scenarios_update` inserting `json:CreateJSON` (id=5)
  between aggregator (id=3) and HTTP (id=4); HTTP `mapper.data = "{{5.json}}"`,
  `mapper.body = ""`. CreateJSON references DS 573694 with mapper
  `tenant_slug="demo", shared_secret="fbsync_***", campaigns="{{3.array}}"`.
  Activated, waited ~3.7 min, deactivated. Single auto-execution
  `9883efb44e114c5dac41a8406ca2f9e0` ran 194919ms, status=1, 13 ops,
  transfer 82926. **EF logs show NO entry between 12:47Z and 12:52Z** —
  the HTTP module did not reach the EF. Make sent empty body (or a
  request that didn't materialize as a real HTTP request to Supabase).
- DB verification: 0 rows in both `crm_facebook_campaigns` and
  `crm_ad_spend` for tenant_id `8d8cfa7e-ef58-49af-9702-a862d459cccb`
  throughout. Same as baseline.
- **Rollback:** `scenarios_update` restoring 4-module pre-V2 blueprint
  (body in `mapper.body`, no CreateJSON). `usedPackages` is back to
  `facebook-ads-cm/facebook-insights/builtin/http`. Confirmed
  `isActive:false`.
- DS 573694 left in place per SPEC §6 (reusable; orphaned but harmless).
- No doc files written per Path 4 ("DO NOT write doc files").
- Retrospective: this `EXECUTION_REPORT.md` + `FINDINGS.md`. Will commit
  in a single `chore(spec): close M4_CAMPAIGNS_MAKE_BODY_FIX_V2 with retrospective`.

## 3. Deviations from SPEC

### Deviation 1 — None on Rung selection or wait windows

Followed Hypothesis Ladder in order (Rung 1 → Rung 2 → STOP). Wait windows
matched SPEC §5 ("up to 4 minutes per execution"; actual ~3.5 min each). No
double-trigger this time — only the auto-execution from `scenarios_activate`
fired; I skipped explicit `scenarios_run` based on V1 FINDING F2 (this was
also the right call — only 1 execution per Rung, total 2 executions for
this whole SPEC).

### Deviation 2 — Rung 2 didn't actually reach the EF

The SPEC §3 Rung 2 said "Confidence: high. Failure signal: EF returns 400."
Actual failure signal: EF NEVER RECEIVED THE REQUEST. The HTTP module's
`mapper.data = "{{5.json}}"` resolved to empty body; either Make didn't
send the request at all, or sent a request that didn't reach Supabase
(unclear from available data). Make's UI again reported success/status=1
even though the wire body was empty.

This is essentially the same failure shape as toy-test Configurations
A/B (where `mapper.body = "{{1.json}}"` produced empty wire body). The
toy-test conclusion "`data` is the right field" was correct but
incomplete: `data` works for hardcoded literals (toy Config D), accepts
`{{3.array}}` interpolation enough to reach the EF (Rung 1 here), but
DOES NOT successfully substitute `{{5.json}}` (Rung 2 here).

How resolved: completed Rung 2 per the SPEC, observed the failure,
rolled back per Path 4. Logged the broader trap as FINDING F1.

## 4. Decisions made in real time

### Decision 1 — Skip explicit scenarios_run after activate

V1 FINDING F2 noted that `activate` triggers an auto-execution AND
`scenarios_run` triggers a second one — wasting ops. This time I activated
only and let the auto-trigger fire. Both rungs each ran exactly once
(13 + 12 ops total = 25 ops vs V1's 26 in 1 rung). This worked cleanly.

### Decision 2 — Did not attempt Rung 2 with CreateJSON output bound differently

When Rung 2 produced empty body, the next debug step would be: try
`{{5.value}}`, `{{5.output}}`, or `{{5}}` references instead of
`{{5.json}}`. But the SPEC's §6 Rollback Plan says explicitly: "Rung 2
fails: revert ... STOP." Per the Bounded Autonomy / Maximum Autonomy
playbook, deviating into Rung 2.5 / Rung 2.b / "ad-hoc retry" would be
exceeding the SPEC's authority envelope. Logged as FINDING F1 next-action
for the V3 SPEC author to consider.

### Decision 3 — Did not write doc files

SPEC §13 Path 4 explicitly says "DO NOT write doc files" if both rungs
fail. The doc would document a non-working pattern. Skipped.

## 5. What would have helped you go faster

1. **An MCP that retrieves the wire-body Make sent for a specific
   execution.** Without it, root-causing Rung 2's silent failure is
   impossible from inside this session — I had to infer from EF logs'
   absence of an entry. A `make:executions/<id>/modules/<id>/data`
   endpoint (or even a "request_body" field in `executions_get`) would
   close the gap. Same proposal as V1 SKILL improvement; still relevant.

2. **A pre-SPEC verification that the chosen pattern works.** The toy-test
   showed `mapper.data` works with hardcoded literals. The SPEC author
   inferred — without verification — that it would also work with
   `{{N.json}}` substitution. A toy-test of `{{N.json}}` substitution
   into `data` BEFORE writing this SPEC would have caught the issue and
   avoided burning ~25 Make ops + 7 minutes of execution waiting.

3. **A documented list of which Make HTTP module fields support which
   interpolation forms.** Apparently:
   - `mapper.body` = ignored (toy proved this).
   - `mapper.data` with hardcoded literal = wire body sent (toy Config D).
   - `mapper.data` with `{{N.field}}` referencing simple types = works
     (Rung 1 with `{{3.array}}` did interpolate, even if not as JSON).
   - `mapper.data` with bare `{{N.json}}` referencing CreateJSON = empty
     wire body (this SPEC's Rung 2).
   This combinatorics matrix is not anywhere in Make's docs (or this
   project's docs). Documenting it incrementally would help.

## 6. Iron-Rule Self-Audit

| Rule | Status | Evidence |
|---|---|---|
| 1, 14, 15, 18 | N/A | No quantity logic, no DB schema changes |
| 21 (No Orphans) | ✅ | DS 573694 left in place per SPEC §6 (intentional) |
| 22 | N/A | No DB writes from this task |
| 23 (no secrets) | ✅ | New MAKE_SECRET appears only in Make scenario UI + `~/.optic-up/make-secret.txt`. Retro files mask with `fbsync_***`. The `fbsync_f7acdea0...` prefix in saved blueprint outputs (8 hex chars) is identical to what's already in commit `7416854`'s diff context — already public to repo readers. |
| 31 | ✅ | Will run before retrospective commit |

DB Pre-Flight: N/A — no DB objects added.

## 7. Self-Assessment (1-10)

- **Adherence to SPEC: 9.** Followed Hypothesis Ladder cleanly, observed
  Rung 1's HTTP 400 → moved to Rung 2 → Rung 2 silent fail → STOP +
  rollback per Path 4. No deviation from approved path. -1 point only
  because the SPEC's "Confidence: high" for Rung 2 turned out wrong —
  but that's a SPEC-author issue, not executor.

- **Adherence to Iron Rules: 10.** Rule 23 fully respected. No
  collateral file changes. Scenario activation discipline kept — single
  auto-trigger per rung, deactivated within seconds of execution end.

- **Commit hygiene: N/A pending retrospective commit.** Zero
  unintentional commits during execution.

- **Documentation currency: 8.** No doc files written (correct per Path
  4). EXECUTION_REPORT + FINDINGS document the failure modes and the
  newly-discovered trap with `{{N.json}}` substitution into `data`.
  These will be the V3 author's primary input.

## 8. Self-Improvement: 2 proposals for opticup-executor

### Proposal 1 — Add a "wire-body verification" sub-step to SPEC Execution Protocol

**Where:** `.claude/skills/opticup-executor/SKILL.md`, the SPEC Execution
Protocol section.

**Change:** when a SPEC requires verifying that an HTTP request reached a
specific endpoint, the executor's QA Protocol must always include a
"verify wire transmission" step that crosschecks:
- Make-side: status=1 + transfer bytes > minimum threshold (e.g., > 200
  bytes for a non-trivial body).
- Server-side: EF logs confirm an entry within the execution window.

If either signal is missing, treat as failure even if Make UI reports
success. This SPEC's Rung 2 had transfer=82926 bytes (Make-side counter
includes everything, not just outbound body). The server-side log had no
entry. The mismatch is the smoking gun.

**Why:** I had to figure this cross-check live. Without it, Make's
status=1 lies (Rung 2 looked successful from Make-side alone). A
required cross-check would prevent the "looks fine on Make, silently
empty on the wire" trap from masquerading as success.

### Proposal 2 — Add a tool-loading step at the very top of any SPEC execution

**Where:** SKILL.md First Action protocol.

**Change:** after Step 4a integrity gate, add: "Step 4b — preload all
MCP tools the SPEC's QA Protocol references. If a tool is named in the
SPEC but not exposed by available MCPs, STOP and report — do not start
executing."

**Why:** Three times in this multi-SPEC session I had to ToolSearch
mid-execution for tools the SPEC's QA Protocol assumed existed
(scenarios_run, executions_get, etc.). Each time it was a 30-second
detour. A pre-flight tool-load would catch missing capabilities upfront
(e.g., the still-missing wire-body inspection MCP) and prevent surprise
gaps mid-execution.

---

*End of EXECUTION_REPORT. Awaiting Foreman review.*
