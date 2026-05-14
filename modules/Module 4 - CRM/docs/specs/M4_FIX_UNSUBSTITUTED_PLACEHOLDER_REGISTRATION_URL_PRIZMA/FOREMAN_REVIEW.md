# FOREMAN_REVIEW — M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA

**Verdict:** 🟡 CLOSED-DEFERRED — diagnostic clean, repair escalated to Daniel, 0 writes
**Foreman:** opticup-strategic (overnight Bundle 2 T1.1)
**Review date:** 2026-05-14

---

## 1. Execution quality

Executor performed the diagnostic phase correctly and completely. Root-cause hypothesis space (H1/H2/H3) was tested in the order the SPEC specified. H1 was confirmed with a smoking-gun sample row (substituted name + substituted brand short.gy URL, but literal `%registration_url%` in the registration line). H2 and H3 were both disproven via cross-checks — H2 ruled out by Event #24 having a working `registration_form_url` AND the post-fix broadcast `702d34f0` registering successfully; H3 ruled out by the safety-scan working as designed (the input was broken upstream, not the EF).

The STOP-on-Daniel-decision trigger fired correctly. The Brief and the activation prompt both pre-authorized this exact halt point ("should we re-send to 758 customers" is verbatim cited in the activation prompt). Executor did not silently re-send, did not silently modify any of the 758 rows, did not silently flip event status. All four "DO NOT" actions enumerated in the activation prompt were respected.

The backup snapshot was created proactively even though no UPDATE was performed. This is correct discipline — if Daniel chooses Option A or D in the morning, the follow-up SPEC needs the 758 row IDs + lead_ids deterministically. The aggregate md5 digest `7b66b5789a3c61658d01c3a6366daee9` gives a future replay an integrity check.

Pivot from "find 758 rows" to "find the broadcast that emitted them + the event that template links to" was inferential and not in the SPEC verbatim, but obviously necessary. Executor did the right thing.

## 2. Findings reviewed

7 findings logged. Severity calibration is right (F-1 HIGH for the data loss event, F-2..F-6 INFO or contextual, F-7 INFO after spot-check cleared the adjacent-cohort worry). The F-5 decision matrix gives Daniel clean Options A/B/C/D with explicit trade-offs. F-3+F-4 numbers (event status closed, 9/50 capacity, 3/758 cohort overlap) are exactly the data Daniel needs to choose. The recommended-path-for-record (D fallback to C) does not pre-empt Daniel's decision — it's framed as "for record only".

## 3. Iron-rule compliance

✅ Rule 14 / 15 / 21 / 22 / 32 all clean per EXECUTION_REPORT §"Iron-rule compliance". No deviations.

## 4. Skill-improvement proposals (mandatory, 2 minimum)

### P-T1.1-1 (HIGH) — opticup-strategic: encode a "Daniel-decision freeze" checklist into the SPEC author's preflight

**Source evidence:** This SPEC, F-5, and the way 4 reasonable repair options surfaced AFTER diagnostic showed event=closed + 9/50 capacity + 3/758 cohort overlap. The SPEC pre-wrote H1's repair plan as "rebuild + re-enqueue", but the actual repair decision tree has 4 branches once event status is in play.

**Proposal:** When a SPEC's repair phase touches a broadcast/campaign whose target event is `status='closed'` OR `status='completed'`, the SPEC author MUST surface this in §6 (or new "Daniel-decision freeze conditions" section) BEFORE the SPEC is dispatched. Then the Executor knows to halt at diagnostic-end and surface the decision matrix, NOT to "interpret" the SPEC's repair plan as authorization. This SPEC handled it correctly by activation-prompt explicit override, but the principle should be encoded in the skill.

**ROI estimate:** Saves ~15 min per future SPEC that touches event-coupled broadcasts (the Foreman pre-bakes the decision tree instead of the Executor halting mid-flight to write an escalation). Bundle 2 alone hits this once; Phase 2 / 2.5 will hit it more.

### P-T1.1-2 (MEDIUM) — opticup-executor: when diagnostic confirms a hypothesis, ALSO compute the cohort overlap with the target's current state before deciding repair vs escalate

**Source evidence:** The 3/758 overlap with event #24 attendees was the actual lever for Option D ("partial re-send to waitlist intersect"). Without that overlap query, the Executor would have surfaced only A/B/C and the decision matrix would be poorer.

**Proposal:** Encode in `opticup-executor` SKILL.md as a pattern: "post-diagnostic, before authoring escalation/repair, run a cohort-overlap query against the target object's current state (event attendees, lead statuses, campaign membership). The overlap data is the lever for surgical-vs-broad repair options."

**ROI estimate:** Per "data fix in production" SPEC, the overlap query is ~5 min and consistently improves the decision-matrix quality by adding the surgical option.

### P-T1.1-3 (MEDIUM) — opticup-strategic: SPEC §"Outputs Daniel needs to choose" structured-question template

**Source evidence:** This SPEC's FINDINGS F-5 enumerated 3 explicit "inputs Daniel needs to choose" sub-questions. That's good. But the SPEC_TEMPLATE doesn't formally require this section; it surfaced from common sense + Brief direction.

**Proposal:** Add to SPEC_TEMPLATE v3 (which T4.1 of this bundle is writing) a required "Outputs Daniel needs to choose" section IF AND ONLY IF the SPEC declares any Daniel-decision STOP triggers. Forces the SPEC author to enumerate the actual decision sub-questions up-front. Pairs with P-T1.1-1.

## 5. Bundle-2-specific notes

- T1.1 is the first SPEC of Bundle 2 and it closed 🟡 (deferred), not 🟢. This is fine per the Brief's skip-not-stop model and per the activation prompt's explicit STOP authorization. Bundle 2 continues with T2.1.
- The 758-row backup file `BACKUP_758_ROWS.json` is large (191 KB) and is the foundation of any morning re-send SPEC. Do not delete it.

End of FOREMAN_REVIEW.
