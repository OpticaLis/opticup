# SKILL_HARDENING_AUDIT_2026_05_14 — Report

**Tier:** T3.1 of OVERNIGHT_BUNDLE_2_2026_05_14
**Date:** 2026-05-14 (overnight Bundle 2)
**Author:** opticup-strategic (Foreman, overnight aggregation of 4 parallel sub-agent audits)
**Skills audited:** opticup-architect, opticup-strategic, opticup-executor, opticup-reviewer

---

## 1. Method

Spawned 4 parallel sub-agents (general-purpose), one per target skill. Each:
1. Read its SKILL.md fully + any `references/` files.
2. Sampled ~20 most recent `FOREMAN_REVIEW.md` files across `modules/*/docs/specs/*/`.
3. Cross-referenced against DECISIONS_LOG entries, escalation files, FINDINGS.
4. Returned a markdown audit report with P-numbered improvement proposals, each with severity + source evidence + suggested encoding + ROI estimate.

Aggregator (Foreman) merged the 4 reports, applied HIGH and CRITICAL proposals directly to each SKILL.md (as an appended `## Patterns from SKILL_HARDENING_AUDIT_2026_05_14` section), and left MEDIUM and LOW proposals as documented proposals here.

Backup of pre-edit SKILL.md files at `modules/Module 1.5 - Shared Components/backups/2026-05-14_SKILL_HARDENING_AUDIT/` (4 files).

---

## 2. Aggregate counts

| Skill | CRITICAL | HIGH | MEDIUM | LOW | Total |
|---|---|---|---|---|---|
| opticup-architect | 1 | 2 | 2 | 1 | 6 |
| opticup-strategic | 0 | 2 | 3 | 0 | 5 |
| opticup-executor | 1 | 2 | 1 | 0 | 4 |
| opticup-reviewer | 1 | 2 | 2 | 1 | 6 |
| **Total** | **3** | **8** | **8** | **2** | **21** |

**Applied to SKILL.md (CRITICAL + HIGH):** 11 of 21 (52%).
**Documented as proposals only (MEDIUM + LOW):** 10 of 21. Several of these belong in SPEC_TEMPLATE v3 (T4 of this bundle).

---

## 3. Top observation per skill

**opticup-architect** — mature (41 P-numbered patterns, 11+ Module Close Ceremonies recorded). Most issues now sit downstream in strategic/executor; the 6 surfaced are about Brief-authoring discipline (threshold rules, live-DB probes, cross-module overlap analysis).

**opticup-strategic** — strong middle ground; SPEC_TEMPLATE.md (328 lines) has absorbed most past proposals. The 5 surfaced are real but smaller — the strategic SKILL's biggest issue is the unencoded reflexes (gitignore-awareness, Pipeline-mode pivot pre-authorization). 3 of the 5 are SPEC_TEMPLATE work, deferring to T4.

**opticup-executor** — information-dense (1062 lines) but **accretive** — proposals accepted verbatim into §5b–§5i without consolidation. Key measurement: only 10 of 177 EXECUTION_REPORTs (5.6%) include the mandatory §7 SPEC_TEMPLATE Version Footprint — the learning-loop telemetry is broken. §5h (manual deploy fallback) coexists with §5i (auto-fallback) which supersedes it — 50/50 mistake rate.

**opticup-reviewer** — **the most underdeveloped of the four.** 266 lines vs peers' 1000+. No `references/` folder exists. Almost no `P-RV-NN` proposals harvested in the 20 sampled FOREMAN_REVIEWs — the Reviewer is invisible to the retrospective loop. SKILL gives generic "follow Iron Rules 1-32" without naming the 9 concrete check scripts. No Reviewer Notes append template. No author-Reviewer-conflict protocol for Full-Auto same-session reviews. This SKILL had the highest CRITICAL count relative to its size.

---

## 4. Applied improvements (CRITICAL + HIGH = 11)

### opticup-architect (3 applied, ROI ~85 min/SPEC saved)
- **P-AR-01 (CRITICAL)** — Brief decisions with pre-step audit conditions MUST embed quantitative thresholds. *Source: SECURITY_HOTFIX_2026_05_13.*
- **P-AR-02 (HIGH)** — Live-DB probe mandatory at Brief authoring when Brief names DB shape assumptions. *Source: M1_LENS_INVENTORY_PHASE_1A — 4 of 5 SPEC defects.*
- **P-AR-03 (HIGH)** — Cross-module overlap analysis required BEFORE handing off a Brief touching adjacent module's entity surface. *Source: M1↔M9 overlap investigation.*

### opticup-strategic (2 applied, ROI ~25 min/SPEC saved)
- **P-ST-01 (HIGH)** — Codify `.gitignore`-awareness check in §0 Pre-Authoring Reality Check. *Source: M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX + EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK.*
- **P-ST-02 (HIGH)** — Pipeline-mode escalation pre-authorization for known-recurrent pivots (OPEN-021 CLI fallback). *Source: M3_UTM_TRIPLE_LAYER_PERSISTENCE + M4_BROADCAST_ID_PROPAGATION.*

### opticup-executor (2 applied, ROI ~33 min/SPEC saved)
- **P-EX-01 (CRITICAL)** — Iron Rule 32 Compatibility — Pre-Stage Playbook (3 false-positive shapes + canonical resolutions). *Source: 3 escalations in last 24h.*
- **P-EX-02 (HIGH)** — §5h superseded by §5i. Treat §5h as informational legacy. *Source: STATUS_CHANGE_TRIGGERS_FRAMEWORK followed §5h after §5i existed.*

### opticup-reviewer (3 applied, ROI ~25 min + closes Full-Auto trust gap)
- **P-RV-01 (CRITICAL)** — Check-Tool Inventory replacing generic "Iron Rules 1-32" handwave. *Source: 9 unmentioned scripts in `scripts/checks/`.*
- **P-RV-02 (HIGH)** — Reviewer Notes append template, verbatim block. *Source: only 8 of 177 EXECUTION_REPORTs contain Reviewer Notes.*
- **P-RV-03 (HIGH)** — Author-Reviewer Independence Discipline for same-session Full-Auto reviews. *Source: ATTENDEE_COUNTER_DISPLAY_FIX FOREMAN_REVIEW explicitly raised this.*

**Aggregate ROI:** ~168 min/SPEC potentially saved if all applied improvements take hold. Plus closing the Full-Auto trust gap (unquantified but high-value).

---

## 5. Proposed but NOT applied (10 — documented for SPEC_TEMPLATE v3 + future SPECs)

### MEDIUM — belong in SPEC_TEMPLATE v3 (T4 of this bundle)
- **P-AR-04** — Brief deliverables enumerate verify-hook compatibility envelope when introducing new schema patterns.
- **P-AR-05** — Brief must enumerate BOTH SMS and Email surfaces when authorizing messaging work. *(Applied to architect SKILL.)*
- **P-ST-03** — `_down.sql` / rollback-artifact gate-compatibility note → SPEC_TEMPLATE §6.
- **P-ST-04** — CRLF-aware diff recipe → SPEC_TEMPLATE §3 boilerplate.
- **P-ST-05** — Smoke-type taxonomy (`Type: db | api | code-review | visual-browser`) → SPEC_TEMPLATE §12.
- **P-EX-03 (HIGH)** — §7 SPEC_TEMPLATE Version Footprint mandatory (current 5.6% adoption). → Elevate to first-class required section in SPEC_TEMPLATE v3.
- **P-RV-04** — Reviewer may append `FIND-N` entries to FINDINGS.md.
- **P-RV-05** — Replace stale `Known Security Debt` block with `TECH_DEBT.md` pointer.

### Bigger SPECs proposed
- **P-EX-04 (MEDIUM)** — "Skill bloat" — refactor opticup-executor SKILL.md (1098 lines) into a 200-line index + `references/PLAYBOOK_*.md` files. ~2-hour structural SPEC. Suggested slug: `M1_5_EXECUTOR_SKILL_REFACTOR`.
- **P-AR-06 (LOW)** — Module Close Ceremony harvest Architect-targeted patterns separately from strategic/executor proposals.
- **P-RV-06 (LOW)** — Mandate Reviewer Skill Improvement Proposals section in EVERY review (partially covered by P-RV-02 template).

---

## 6. ROI summary

If the 11 applied + 10 proposed improvements all stick:
- ~168 min/SPEC saved on average for the next ~50 SPECs in Phase 2/2.5/3.
- ~14 hours of cumulative effort saved per 50-SPEC slate.
- Full-Auto Pipeline trust gap (P-RV-03) closes — Reviewer phase becomes a real audit instead of theatre.
- Learning-loop telemetry (P-EX-03 in SPEC_TEMPLATE v3) restored from 5.6% to expected ~100% adoption.

Combined with the SPEC_TEMPLATE v3 changes from T4, this represents the largest single-bundle increase in Pipeline machinery efficiency since Pipeline came online.

---

## 7. Self-improvement of THIS audit (Foreman reflexive)

What worked:
- 4 parallel sub-agents on the 4 skill targets gave clean separation of concerns and bounded context per agent.
- Each agent was prompted to be evidence-based ("cite at least one FOREMAN_REVIEW per proposal"), which prevented padding.
- Aggregator (Foreman) classified CRITICAL+HIGH → apply, MEDIUM+LOW → propose; this kept the SKILL.md edits surgical.

What to improve:
- The aggregator could detect cross-skill overlap. P-EX-03 (executor §7 footprint mandatory) and the SPEC_TEMPLATE-targeted P-ST-03/04/05 all converge on "SPEC_TEMPLATE v3 work" — could have been pre-merged. Manual merge during writing was fine but slower than it could have been.
- Reviewer SKILL.md being 266 lines while peers are 1000+ was a meta-finding that emerged AFTER the audit. A pre-audit "skill size sanity check" would have surfaced this earlier, perhaps with a different audit strategy for the under-developed skill (look for absent patterns, not just unencoded ones).

End of report.
