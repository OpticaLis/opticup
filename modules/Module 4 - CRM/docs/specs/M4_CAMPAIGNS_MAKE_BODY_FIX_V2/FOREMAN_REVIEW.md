# FOREMAN_REVIEW — M4_CAMPAIGNS_MAKE_BODY_FIX_V2

> **Verdict:** 🔴 **REOPEN** — both Rungs failed, but the executor's behavior was textbook. SPEC's hypothesis ladder was the right shape (V1 lesson incorporated) but the rungs themselves were too narrow. V3 will pivot architecture (HTTP per campaign instead of array-based POST), informed by the new findings.
> **Reviewer:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Reviewed commits:** `fe5890a` (V1 FOREMAN_REVIEW) → `82fad99` (V2 retrospective).

---

## SPEC quality audit

V2 incorporated V1's lessons cleanly: it had a Hypothesis Ladder (Proposal 2 from V1 review), a defensible wait-window estimate (Proposal 1), and a clear path-4 rollback. Pre-flight was tight, success criteria were measurable, and the doc plan handled both success and failure cases explicitly.

Where V2 fell short — the ladder's rungs were too narrow given what we knew. Both rungs assumed `mapper.data` would behave one way:
- Rung 1 assumed `{{3.array}}` direct interpolation might work (low-confidence, basically a longshot).
- Rung 2 assumed `{{5.json}}` from CreateJSON would substitute correctly.

Neither was supported by hard evidence — the toy-test had only verified `mapper.data` with hardcoded literals. The SPEC author (me) extrapolated from "works for literals" to "works for substitutions" without verifying. That extrapolation cost us the second cycle. The V1 author-skill Proposal 2 (Hypothesis Ladder) caught the right problem (single-hypothesis bet) but was applied at the wrong granularity — both rungs were variations on the same bet.

What V2 got right:
- Clear path-4 ("both rungs failed → rollback + STOP") so the executor didn't extemporize.
- Explicit "DO NOT write doc files" on failure path — prevented misleading future SPEC authors.
- Pre-flight DS check + DB baseline capture — gave clean before/after comparison.

What V2 should have done:
- Included a **third rung** that pivoted off the "make this work via Make's serialization" axis entirely — e.g. "if both fail, propose architectural change in FOREMAN_REVIEW." The SPEC implicitly assumed that V3 would still try Make-side fixes.
- Authored a tiny additional toy step BEFORE Rung 2 to verify `{{N.json}}` substitution (~3 ops cost). That would have invalidated Rung 2 in advance and saved 13 ops + 3 minutes of execution waiting.

## Execution quality audit

Strong execution. The verdict is 🔴 because the SPEC's bets didn't pay off, not because the executor stumbled.

What the executor did well:
- Followed Hypothesis Ladder verbatim. Didn't extemporize into "Rung 2.5" when Rung 2 silently failed (correct per Bounded Autonomy — that would have exceeded SPEC authority).
- Skipped explicit `scenarios_run` after `scenarios_activate` per V1 FINDING F2's lesson — only auto-trigger fired, ops budget was tight.
- Caught the wire-body / Make-status mismatch correctly: status=1 + transfer=82926 bytes vs. EF logs showing zero entries = Rung 2's wire body was empty. Diagnosed without an MCP that exposes per-execution wire body.
- Self-improvement proposals (§8 of EXECUTION_REPORT) are concrete and actionable — especially Proposal 1 (wire-body cross-check via Make-side bytes vs. EF logs).

The 2 documented deviations were both the SPEC's fault, not the executor's:
1. Rung 2 silent failure was unexpected per the SPEC's "Confidence: high" rating.
2. The completed picture of the trap (toy + V2 combined) is broader than V2's SPEC predicted.

## Findings processing

| # | Finding | Severity | Action |
|---|---|---|---|
| F1 | `{{N.json}}` substitution into `mapper.data` produces empty wire body | HIGH | **Pivot architecture, don't keep iterating on Make serialization.** V3 SPEC will use **HTTP per campaign** (iteration pattern) — flat-object body per call, no aggregator, no CreateJSON. Already proven to work in Rung 1's wire transmission (only failed because of array serialization, not field-name). |
| F2 | `{{3.array}}` interpolates as Make's pseudo-JSON | MEDIUM | Resolved by F1's pivot — V3 won't send arrays at all. |
| F3 | 3 SPECs hit diminishing returns without per-execution wire-body inspection | MEDIUM | Defer the tooling improvement (debug logging in EF, permanent webhook.site endpoint) until after V3. If V3 succeeds without it, the urgency drops. If V3 fails, this becomes a hard dependency for V4. |
| F4 | DS 573694 used in 2 failed attempts | LOW | Mark for deletion after V3 succeeds. The HTTP-per-campaign pattern doesn't need it. |
| F5 | DB tables empty | INFO | Will resolve in V3. |

V3 SPEC slug: `M4_CAMPAIGNS_MAKE_BODY_FIX_V3`. Architecture: HTTP per campaign (iteration), not array.

## 2 author-skill improvement proposals (opticup-strategic)

### Proposal 1 — Hypothesis Ladder rungs must vary on different axes, not refinements of the same bet

**Section to update:** `.claude/skills/opticup-strategic/SKILL.md` → SPEC Authoring Protocol → §SPEC Required Sections — extend the "Hypothesis Ladder" requirement.

**Change:** when authoring a Hypothesis Ladder, the SPEC author MUST ensure each rung varies on a different axis from the previous. A ladder where Rung 1 = "approach A simple" and Rung 2 = "approach A elaborate" is NOT a real ladder — it's two variations of one bet. Real rungs differ on architecture, tool, or fundamental approach. Format:

```
Rung 1: <approach A>
Rung 2: <approach B — different in <axis>: e.g. different module type, different protocol, different decomposition>
Rung 3: <pivot — different architecture entirely OR escalate>
```

If the SPEC author cannot articulate two rungs that differ on a real axis, that's a sign the SPEC isn't ready — the underlying problem hasn't been understood deeply enough. Stop and investigate further.

**Rationale:** V2's Rungs 1 and 2 were both "make Make send strict JSON via mapper.data" — the only difference was whether CreateJSON sat upstream. They differed in mechanism, not in approach. A real Rung 2 would have been "switch to HTTP per campaign" (different decomposition) or "wire to Supabase modules" (different architecture). The "real Rung 2" is what V3 will actually be.

### Proposal 2 — Cross-validate hypotheses against existing toy/curl evidence before authoring

**Section to update:** `.claude/skills/opticup-strategic/SKILL.md` → SPEC Authoring Protocol → Step 1.5 (Cross-Reference Check) — add Step 1.5l.

**Change:** for any SPEC that prescribes a behavior based on prior toy-test or investigation findings, the author MUST explicitly map each rung's hypothesis to one of:
- (a) **Verified by toy/curl evidence** (cite the exact configuration that proved it).
- (b) **Plausible extension of verified behavior** (state the extension clearly and label it as "extrapolation, unverified").
- (c) **New hypothesis, no prior evidence** (acknowledge upfront).

V2 mistakenly treated `{{N.json}}` substitution into `mapper.data` as type (a) — "the toy proved data works." Actually it was type (b) — the toy verified `mapper.data` with literals only. A 30-second classification step at SPEC authoring time would have flagged the gap and either authorized a tiny additional toy step or chosen a different rung.

**Rationale:** the executor's wire-body cross-check (V2 EXECUTION_REPORT §8 Proposal 1) catches the gap at execution time. This proposal moves the catch upstream to SPEC authoring time, where the cost of changing course is lowest.

## Master-doc update checklist

| File | Status |
|---|---|
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Pending — append phase history note: V2 failed, V3 pivoting to HTTP-per-campaign architecture |
| `MASTER_ROADMAP.md` | Pending — note that campaigns measurement infra blocked at Make pipeline; V3 architecture pivot in progress |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | Not pending — no new files added |
| `docs/GLOBAL_MAP.md` | Not pending |
| `docs/GLOBAL_SCHEMA.sql` | Not pending |

The 2 SESSION_CONTEXT/MASTER_ROADMAP updates are out of scope for this review's commit; they should land at V3 close.

## Verdict

🔴 **REOPEN.**

The campaigns data pipeline is still blocked. Three fix attempts have not resolved it. **Continuing to iterate on Make-side serialization is hitting diminishing returns.** Time to pivot.

What was gained from this SPEC + V1 + the toy-test:
- Definitive evidence that `mapper.body` is a silent black hole.
- Definitive evidence that `mapper.data` works for hardcoded literals AND for simple `{{N.field}}` substitutions (Rung 1 reached the EF, the EF rejected because of array serialization, not because the body was empty).
- Definitive evidence that `{{N.json}}` substitution into `mapper.data` produces empty wire body — at least in this Make instance / version.
- Three SPECs of process discipline, two FOREMAN_REVIEW author-skill proposals, three executor-skill proposals.

What's needed next:
1. **V3 SPEC pivots architecture: HTTP per campaign, no array.** Daniel approved this approach explicitly after I presented options A/B/C/D. The pattern is: List Campaigns → for-each loop → flat-object HTTP POST → done. EF already accepts arrays (and a single-item array is a trivial subset); we'll send `{tenant_slug, shared_secret, campaigns: [single_campaign]}` per HTTP call. The EF needs no changes.
2. **Cost estimate for the pivot:** ~30-45 minutes to update Make scenario (remove aggregator, change HTTP to per-campaign), zero EF changes, zero DB changes. Smoke test with the DEACTIVATED scenario, verify rows land, write minimal doc, commit.
3. **Doc captures the pivot rationale** — `modules/Module 4 - CRM/docs/make-patterns/README.md` will explain: "When Make's array→JSON serialization is unreliable, prefer iteration-pattern HTTP per item over batched POST. Trade extra ops cost for predictable behavior."

The biggest lesson — both for this SPEC and for the project's authoring discipline — is that **clean architecture does not always survive contact with vendor implementation quirks.** When Make repeatedly fails to deliver the JSON shape we expect, the right move is not "another SPEC tweaking the same approach" but "a different architectural decomposition." Iteration pattern is a well-known Make idiom for exactly this case.

---

*End of FOREMAN_REVIEW.md.*
