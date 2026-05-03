# Campaign Overseer — LEARNINGS

> **Purpose:** self-improvement log. Each entry captures an observed mistake plus the rule extracted to prevent recurrence.
> **Authority:** rules logged here are binding on every future Overseer session.
> **Update discipline:** append-only. Newest at top. Do NOT delete past entries — even superseded ones are evidence of pattern evolution.

---

## L-002 — Load `opticup-strategic` skill IN-SESSION when authoring a SPEC, instead of escalating to a separate Supervisor chat

**Date:** 2026-05-02 night (Israel)
**Mode at the time:** RECOMMEND-ONLY (v1)

**Trigger incident.** During Phase 2, two follow-up scope items emerged that needed SPECs (D-5 post-cutover event_type architecture; D-6 pre-cutover schema add + form rewire). My instinct was: "SPECs aren't my job — escalate to the Supervisor (Strategic Chat) so they can author." I drafted a recommendation to do exactly that.

Daniel pushed back: I don't need to escalate to a separate Strategic chat to get SPECs written. The `opticup-strategic` skill is available to my session as a loadable skill. When SPEC authoring is needed, I should **load that skill in-session** — its discipline (architecture knowledge, Iron Rule fluency, risk analysis, deliverable structure) becomes available to me, and I produce the SPEC under that mode.

**Rule (binding):** when SPEC authoring is needed inside a Campaign Overseer session:

1. **DO NOT escalate to a separate Strategic chat by default.** Escalation is reserved for cases that genuinely need a Tier-1 architect's perspective (cross-module decisions, new Iron Rules, repository architecture changes).
2. **DO load the `opticup-strategic` skill in-session** via the Skill tool, then author the SPEC under that skill's discipline (folder-per-SPEC at `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/`, with SPEC.md + ACTIVATION_PROMPT.md per the protocol).
3. **Restore Campaign Overseer mode** after the SPEC ships by simply continuing the conversation in this skill's normal pattern. Loading a skill doesn't replace identity — it adds capability.

**Why this matters.** Escalating to a separate Strategic chat introduces: latency (Daniel must paste the request, wait for response, paste back), context loss (the Strategic chat doesn't have the live conversation context that motivated the SPEC), and higher overhead than the situation warrants for small-scope SPECs (e.g., one column add + one EF wire). Loading the skill in-session keeps the work tight and the context intact.

**When to still escalate to a separate Strategic chat:**
- SPECs that touch multiple modules simultaneously and need a holistic architectural view.
- Decisions that propose Iron Rule changes.
- Repository structure / branch strategy changes.
- When the Foreman's review is needed AFTER the SPEC executes (closing the lifecycle).

**Cost of mis-escalating (this incident):** would have added a context-paste round-trip + delayed the D-6 SPEC by an unknown amount, on a weekend before a Sunday cutover. Avoidable.

---

## L-001 — Verify infrastructure + test-data preconditions BEFORE pushing a QA prompt to Claude Code

**Date:** 2026-05-02 evening (Israel)
**Mode at the time:** RECOMMEND-ONLY (v1)

**Trigger incident.** Authored a comprehensive 12-scenario E2E QA activation prompt for Claude Code, targeting the LIVE Prizma tenant pre-cutover. Claude Code executed the prompt, ran 3 scenarios (S1, S2, S3), surfaced two findings flagged as cutover-blocking:

- **F1 (CRITICAL):** the storefront SuperSale form posts to the legacy `/api/leads/submit` (Make/WordPress webhook) instead of the new `lead-intake` Edge Function. Conclusion: zero leads, zero SMS, customers invisible to the CRM.
- **F2 (HIGH):** event #7 flip to `event_day` produced 1 `crm_automation_runs` row with `status=completed` and `total_recipients=0`. Conclusion: V10 fix didn't work, recipient resolver still returns empty.

The Supervisor reviewed both and determined they were **false alarms**:
- **F1 was expected behavior.** P5_7_STOREFRONT_FORM_REWIRE is an authored-but-not-yet-executed SPEC, scheduled for cutover day. The form is INTENTIONALLY still on the legacy pipeline until P5_7 runs. Testing the form against the new pipeline before P5_7 ships will always "fail" — that's the design.
- **F2 was correct behavior.** None of the 3 QA attendees on event #7 actually meet the resolver criteria (`coupon_sent=true AND status!='cancelled'`):
  - QA-A: `coupon_sent=true` but the coupon delivery had failed (the truth-value of the flag was misleading, see TD-001 in `POST_CUTOVER_TECH_DEBT.md`).
  - QA-B: status=`cancelled`.
  - QA-C: `coupon_sent=false`.
  Resolver returning 0 was the **right** answer for that data set.

**Cost of the incident.** ~30 minutes of Claude Code execution + 4 real SMS to Daniel's test phone + Daniel's confusion + one round of Supervisor escalation. All avoidable.

---

### Rule (binding on every future QA prompt the Overseer drafts)

Before pushing a QA-style activation prompt to Claude Code, verify TWO preconditions explicitly:

**(1) Is the infrastructure each scenario depends on already deployed in the environment under test?**

For each scenario in the prompt, list the SPECs / EFs / migrations / form rewires it depends on. For each dependency, confirm it has shipped to the target environment (production main vs develop vs localhost). If a dependency is still pending — DO NOT include the scenario in the prompt. A scenario that depends on un-shipped infrastructure produces false alarms, not findings.

Concrete check: read HANDOFF §13 (pre-cutover SPECs) + recent FOREMAN_REVIEW files + `git log origin/main --oneline` for the relevant commits. If unsure, ASK the Supervisor before drafting.

**(2) Can the test data actually satisfy the code's criteria for the expected positive case?**

For every scenario whose expected outcome is "X recipients receive a message" or "Y rows appear in the queue", write the SQL that proves at least one row in the test setup matches the code's filter. If the SQL returns 0 — the test is broken, not the code. Fix the seed data BEFORE the prompt goes out.

A "0 recipients" outcome is a blocker only when at least one row was supposed to be included by the current code. Otherwise 0 is correct behavior.

---

### Why this matters (the meta-pattern)

This is **Pattern 14 (verify before acting) applied to QA design itself.** The Overseer normally treats Pattern 14 as a rule for write actions. But QA prompts are also write actions — they spend Claude Code cycles, send real SMS, mutate live tenant data, and consume Supervisor escalation bandwidth. A QA prompt that can't produce its own positive case is itself a broken artifact, not a useful test.

A test that always reports "blocker" regardless of whether the code is correct is worse than no test — it consumes attention and erodes trust in subsequent findings.

---

### How to apply (Overseer checklist before every Claude Code QA prompt)

1. **Inventory dependencies.** For each scenario, list every SPEC / EF / migration / form / rule it relies on.
2. **Check shipped status.** For each dependency, confirm it's live in the target environment. Use HANDOFF, git log, EF version dump, browser version-check.
3. **Validate test data.** For each "expected positive" outcome, write the SQL that matches the code's filter and confirm the seed data produces ≥1 row.
4. **Mark scenarios that can't be verified yet.** Move them to a "deferred" section of the prompt with explicit "DO NOT execute until [dependency] ships" — don't silently include them.
5. **Run the prompt past the Supervisor when in doubt.** A 2-minute Supervisor sanity check is cheaper than a 30-minute Claude Code false-alarm session.

---

*End of L-001.*
