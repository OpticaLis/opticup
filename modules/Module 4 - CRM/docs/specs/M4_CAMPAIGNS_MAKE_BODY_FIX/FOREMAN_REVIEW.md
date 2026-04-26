# FOREMAN_REVIEW — M4_CAMPAIGNS_MAKE_BODY_FIX

> **Verdict:** 🔴 **REOPEN** — SPEC's chosen approach didn't work; a V2 SPEC must investigate root cause before another fix attempt. Execution itself was clean and the rollback discipline was textbook; the SPEC's hypothesis was the failure point, not the executor's work.
> **Reviewer:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Reviewed commits:** `7416854` (EF v3 — predecessor) → `7a2a4ef` (this SPEC's retrospective).

---

## SPEC quality audit

This SPEC's primary failure mode was an **untested hypothesis treated as canonical**. The investigation that preceded this SPEC (`PROMPT_INVESTIGATE_MAKE_BODY_PATTERN_V2`) confirmed there was no working precedent in the project. Yet the SPEC went on to prescribe a single approach (`json:CreateJSON` + `{{N.json}}`) as if it were the canonical solution, citing only "Make's documented pattern" without verifying that this team's Make tier/version actually supports the substitution as advertised. The right SPEC would have either:
- (a) Built a small toy-scenario test FIRST (as a separate quick SPEC) to confirm the pattern works on this Make instance, before trying it on the real production scenario with its 3-minute Facebook polling tax, or
- (b) Listed two or three plausible patterns as ranked options and let the executor try them in order.

What the SPEC got right:
- Detailed §10 Pre-flight Checks. Clear baselines (DS list empty, DB row counts, HEAD commit). Executor used these correctly.
- Clear §6 Rollback Plan. Executor followed it exactly when smoke test failed — pre-SPEC blueprint restored, scenario deactivated, DB confirmed unchanged.
- §5 Stop-on-Deviation triggers were unambiguous. Trigger #1 ("STOP if smoke test produces HTTP 400") fired correctly.

What the SPEC got wrong:
- §3 criterion 2 over-specified the Data Structure schema (9 fields including `master`, `interests`, `raw_data`) without verifying that Make's DS validator accepts those exact types. The executor had to drop 3 fields to get past `data-structures_create`, which was a defensible deviation but should not have been necessary at all.
- §4 Autonomy Envelope set "stay activated for at most 90 seconds" without checking that historical executions of `9126542` take ~193s. The executor correctly overrode this guidance, but a SPEC author shouldn't put an executor in that position.
- §3 criterion 17 prescribed writing the pattern documentation on success. This is fine in principle but the SPEC didn't say what to do on failure — leaving the executor to decide independently (correctly, in this case) not to write a doc that would mislead future SPECs.
- The SPEC's §9 commit plan assumed success: 1 doc commit + 1 retrospective commit. On failure there's only the retrospective commit, which is what landed (`7a2a4ef`). Fine in the end, but the SPEC should have explicitly addressed both paths.

## Execution quality audit

Strong execution. The verdict is 🔴 because the SPEC's approach didn't work, not because the executor stumbled.

What the executor did right:
- Followed Pre-flight (§10) verbatim and recorded baselines.
- Honored Stop-trigger #1 immediately when HTTP 400 was confirmed. Rolled back via `scenarios_update` to the exact pre-SPEC blueprint. Verified the rollback by re-fetching.
- Did NOT write the pattern-docs that would have documented a non-working pattern. This is judgment that the SPEC didn't explicitly authorize but that any reasonable SPEC author would endorse on failure. Logged and reported the choice transparently.
- Wrote a thorough EXECUTION_REPORT and FINDINGS — particularly Finding #1 with 4 ranked root-cause hypotheses for the JSON failure.
- Self-Improvement proposals (§8 of EXECUTION_REPORT) are concrete and actionable.

The 3 documented deviations were all defensible:
1. **DS schema reduction** — Make rejected the original 9-field spec; dropped 3 unused fields; behavior unchanged.
2. **Smoke test failure** — the SPEC's primary criterion failed; rollback per §6.
3. **`mv` instead of `git mv`** — file was untracked; documented in Finding 3.

Two real-time decisions are worth flagging:
- **Decision 2 (activate-then-run, accepting 2 executions)** — defensible. The auto-trigger from `scenarios_activate` is a Make platform behavior, not an executor mistake. Cost was ~26 Make ops vs. ~13 expected; within budget. The fix is in Finding 2's suggested action.
- **Decision 3 (5-minute active window vs. SPEC's 90s)** — correct override. The SPEC's 90s number was wrong for this scenario type. Author should have checked `executions_list` first.

## Findings processing

| # | Finding | Severity | Action |
|---|---|---|---|
| F1 | `json:CreateJSON` + `{{N.json}}` did not produce strict JSON | HIGH | **Open V2 SPEC: `M4_CAMPAIGNS_MAKE_BODY_FIX_V2`**. Author must EITHER (a) run a toy-scenario test first to confirm the corrected pattern works on this Make instance, OR (b) list multiple ranked candidates with explicit criteria for moving from one to the next. Don't repeat this SPEC's "single hypothesis" failure mode. |
| F2 | Two executions ran instead of one | LOW | Bundle into V2 SPEC's QA protocol: explicit instruction to `executions_list` after `scenarios_activate` and skip `scenarios_run` if an auto-execution is already in flight. |
| F3 | `git mv` fails on untracked SPECs | LOW | Update opticup-strategic SKILL: SPEC dispatcher prompt should use plain `mv` (not `git mv`) when the source is in `outputs/` — that's always untracked. The clean-rename benefit isn't worth the failure mode. See author-skill Proposal 1 below. |
| F4 | Make's DS validator returns generic "Invalid collection" error | LOW | Dismiss — Make-side ergonomics, no project-side fix. Note retained in this review for future SPEC authors who hit the same error. |
| F5 | DB tables empty post-rollback | INFO | Dismiss — expected post-rollback state. Logged to prevent future "the tables are empty, is something broken?" confusion. |

V2 SPEC slug: `M4_CAMPAIGNS_MAKE_BODY_FIX_V2`. To be authored after Daniel approves the next strategic step (see "Verdict" below).

## 2 author-skill improvement proposals (opticup-strategic)

### Proposal 1 — SPEC author must verify duration estimates against `executions_list` before quoting wait windows

**Section to update:** `.claude/skills/opticup-strategic/SKILL.md` → SPEC Authoring Protocol → Step 1.5 (Cross-Reference Check) — add Step 1.5k.

**Change:** when a SPEC will instruct the executor to wait for a Make/external job to complete (e.g. "stay activated for at most 90s"), the SPEC author MUST first call `mcp__make__executions_list` (or the equivalent for the platform) on the target object, inspect the **most recent 3 successful executions**, and quote **p95 duration + 30% buffer** in the SPEC. Hardcoded short durations create false stop-on-deviation triggers and force the executor to override the SPEC text — which erodes the trust that "the SPEC means what it says."

**Rationale:** This SPEC quoted 90s. Historical p95 for `9126542` is 193s. The executor correctly overrode to ~5 minutes. The override worked but it shouldn't have been necessary. A SPEC the executor can follow verbatim is a better SPEC.

### Proposal 2 — SPECs that prescribe "the canonical pattern from external docs" must include a fallback ladder

**Section to update:** `.claude/skills/opticup-strategic/SKILL.md` → SPEC Authoring Protocol → §SPEC Required Sections (currently lists Goal, Success Criteria, Autonomy Envelope, etc.).

**Change:** add a required section "**Hypothesis Ladder**" for any SPEC that introduces a pattern not previously used in the project. Format:

```
## Hypothesis Ladder

The SPEC prescribes pattern A. If pattern A fails, the executor's stop trigger fires.
At that point the next SPEC author should consider pattern B → pattern C → … in this
order, with the criterion for moving down the ladder.

Pattern A: <name + rationale + confidence>
Pattern B: <name + rationale + confidence>
Pattern C: <name + rationale + confidence>
```

**Rationale:** This SPEC committed to `json:CreateJSON` + `{{N.json}}` as if it were the only path. When it failed, the executor was rolled back and we now need a new SPEC. A Hypothesis Ladder in the original SPEC would have given the executor permission to try pattern B in the same run (with the same Make ops budget), or — at minimum — given the V2 SPEC author a head start. Investigation cost was paid; the rollback wasted that cost.

## Master-doc update checklist

| File | Status |
|---|---|
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Pending — add Phase History row noting M4_CAMPAIGNS_MAKE_BODY_FIX failed and a V2 is needed |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | Not pending — no new files added (the doc files were intentionally not written) |
| `MASTER_ROADMAP.md` | Pending — note that the campaigns measurement infra is built but the data pipeline is still blocked at Make body serialization, V2 SPEC needed |
| `docs/GLOBAL_MAP.md` | Not pending — no new functions or contracts |
| `docs/GLOBAL_SCHEMA.sql` | Not pending — no schema changes |

The 2 SESSION_CONTEXT/MASTER_ROADMAP updates are out of scope for this review's commit; they should land in the next strategic chat session before the V2 SPEC is authored.

## Verdict

🔴 **REOPEN.**

The campaigns data pipeline is still blocked at the same point it was at session start. The SPEC's chosen approach (`json:CreateJSON` + `{{5.json}}`) didn't work in this Make instance. We don't yet know why — Finding 1 lists 4 plausible root causes and none have been ruled out.

What was gained from this SPEC:
- A reusable Make Data Structure (`optic_up_facebook_campaigns_sync_body`, id 573694) is in place, even if its current binding to CreateJSON didn't produce a working flow.
- A complete EXECUTION_REPORT + FINDINGS documenting the failure and 4 ranked root-cause hypotheses.
- 2 concrete executor-skill improvements + 2 concrete author-skill improvements.
- Confirmation that the EF (now v4 with env-based `MAKE_SECRET`) is rock-solid — receives requests, returns clear error responses, no ambiguity on Make-side vs. EF-side blame.

What's needed next:
1. **Daniel decision: V2 approach.** Three credible paths:
   - **(a)** Build a tiny toy-scenario in Make first (`tools:SetVariable` → `json:CreateJSON` → `tools:Sleep` → debug output) to isolate the CreateJSON output shape — costs ~5 minutes of Make work and zero Facebook ops. Then a V2 SPEC informed by the toy result.
   - **(b)** Skip CreateJSON entirely. Try a different pattern: e.g., `tools:SetVariable` (concatenate JSON manually) → HTTP body = `{{N.value}}`. Less elegant but pre-validated by community examples.
   - **(c)** Move the array-aggregation logic to the EF: change EF to accept multiple POSTs, one per campaign, and have Make iterate. No CreateJSON, no aggregator — Make sends 1 flat-object body per campaign in a loop. Higher ops cost (1 HTTP per campaign instead of 1 total) but uses only patterns we've already validated work.
2. The V2 SPEC must include a Hypothesis Ladder (Proposal 2 above) so a single failure doesn't burn the next round too.

The biggest lesson — both for this SPEC and for the project's authoring discipline — is that "documented canonical pattern" is not the same as "verified to work in our config." When introducing a pattern the project has never used, the SPEC should invest 10 minutes in a toy-test before committing to it as the only path.

---

*End of FOREMAN_REVIEW.md.*
