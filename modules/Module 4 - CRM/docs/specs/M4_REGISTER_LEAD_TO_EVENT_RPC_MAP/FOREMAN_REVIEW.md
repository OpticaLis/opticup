# FOREMAN_REVIEW — M4_REGISTER_LEAD_TO_EVENT_RPC_MAP

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, M4)
> **Written on:** 2026-05-14
> **Reviews:** `SPEC.md` (author: opticup-strategic, 2026-05-14) + `EXECUTION_REPORT.md` (executor: opticup-executor, 2026-05-14) + `FINDINGS.md` + `TEST_REPORT.md`
> **Commit range reviewed:** `c39e9be..d1c31d6` (3 commits: `93b946f` SPEC.md + `1fa5453` artifacts + `d1c31d6` TEST_REPORT)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS**

The SPEC ran end-to-end in one Claude Code session via the Full-Auto Pipeline (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure). All 13 §3 success criteria PASS. Smoke 7/7 PASS at both the Executor's and the Localhost-Tester's runs. Integrity gate exit 0. Zero DB writes; demo deltas all = 0 in the diagnostic window. RPC body byte-identical to live (md5 `dbd2ccd1eb068b494edfec5cf7788563`, 4603 bytes).

**Why 🟡 not 🟢:** FIND-1 (RPC return-shape inconsistency on fresh-INSERT over-capacity branch) is a real production bug. It's narrow + low-impact (UX-only, no data corruption, no auth bypass) but it IS a bug. The Executor's classification as MEDIUM Finding (rather than §5 stop-trigger escalation) was correct per Bounded Autonomy — and matches my judgment on review — but the verdict cannot be 🟢 while a known production bug is documented and unfixed. A 15-minute follow-up SPEC will close it.

Hard-fail-rule check: §8 Master-Doc Update Checklist has no "should have / wasn't" entries (this is a read-only diagnostic — no master-doc updates were required). §5 spot-check has zero failures. §4 Findings have full dispositions. §3 Execution Quality scores 5/5 on Adherence to SPEC scope and Iron Rules. So the 🟡 cap is justified by FIND-1 alone, not by hard-fail.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | §1 stated the goal in 2 sentences with explicit purpose ("Phase 1 P1.4 read-only foundation"). |
| Measurability of success criteria | 4 | 13 criteria all had exact expected values + verify commands. -1 because criterion #5 (`branch_count == row_count`) used a regex that didn't match the body's actual idioms — see EXECUTION_REPORT §5 Decision #1; this is captured in Author Proposal #1 below. |
| Completeness of autonomy envelope | 5 | §4 + §5 covered both CLAUDE.md §9 globals AND SPEC-specific stops (RPC missing / body drift / mid-SPEC SKILL edits / DB writes). |
| Stop-trigger specificity | 5 | Every stop was narrow + observable (RPC not found, body length drift >10%, any DB write, smoke <7/7, attempted skill edit). |
| Rollback plan realism | 4 | Read-only SPEC — rollback is "delete the 4 new files" which is trivially reversible. §6 wasn't filled out heavily because there was no DB state to roll back. -1 only because the template made me think harder about a section that didn't really apply. |
| Expected final state accuracy | 5 | §8 enumerated all 6 final files. Executor produced 6, no more, no less. |
| Commit plan usefulness | 5 | §9 said 3 commits; the Pipeline run produced 3 (SPEC + artifacts + TEST_REPORT). The closure commit (this FOREMAN_REVIEW.md) will make it 4 — consistent with adding a fourth pipeline artifact since Localhost-Tester was added to the chain. Acceptable drift. |

**Average score:** 4.7/5.

**Weakest dimension + why:** Measurability of criterion #5 — the `branch_count == row_count` equation was clean in intent but the regex did not match the RPC body's mixed `IF`/`IF FOUND`/`IF NOT FOUND` idioms. The Executor recognized the imprecision and chose to annotate every statement (38 rows for ~24 branch keywords) rather than just-branches, documenting the decision in EXECUTION_REPORT §5 #1. The right call. The fix is at the SPEC-template level — Author Proposal #1 below.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | No files modified outside the SPEC folder. No DB writes. No skill modifications. No commits to main. Pipeline mode honored. |
| Adherence to Iron Rules | 5 | All applicable rules: PASS (Rule 21, 23, 31, 32). Inapplicable rules correctly identified as N/A. Selective `git add` by filename throughout (no `-A` / `.`). |
| Commit hygiene | 5 | 1 Executor commit + 1 Localhost-Tester commit, each single-concern, descriptive English message in `type(scope): description` format. No noise commits. No amend abuses. |
| Handling of deviations | 5 | One real decision point (Decision #1 — annotation granularity); Executor documented inline in EXECUTION_REPORT §5 and proceeded under intent rather than literal criterion match. Decision #3 — FIND-1 classification — was carefully reasoned and explicitly traced to §5 stop-trigger language. Both calls match my judgment. Zero unnecessary questions. Zero silent absorption of scope. |
| Documentation currency | 5 | SPEC §8 said "no master-doc updates required" — Executor honored that. FINDINGS.md captures all 7 findings with severity, rationale, suggested action. EXECUTION_REPORT §9 Iron-Rule self-audit honest and complete. |
| FINDINGS.md discipline | 5 | 7 findings, all logged not absorbed. FIND-2 (architectural — RPC writes no journey log) is exactly the kind of cross-phase finding that proves the diagnostic was worth doing. FIND-7 (storefront-repo grep deferred) is honest process-gap reporting. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment scores (9/10, 10/10, 10/10, 9/10) match my independent assessment. Decisions section captures the 3 judgment calls in real time. Iron-Rule audit table is granular. Skill-improvement proposals are concrete + sourced. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES. The activation prompt + SPEC §4-§5 envelope was generous (read-only, MCP allowed, Make MCP optional, mmdc optional), and the Executor stayed inside it. No unnecessary clarifications.

**Did executor ask unnecessary questions?** Zero questions asked. The whole run was 1 chat with end-to-end execution.

**Did executor silently absorb any scope changes?** No. Decision #1 (annotation granularity) was a granularity choice within the SPEC's intent, not a scope change. Decision #2 (storefront grep deferred) was pre-authorized by SPEC §10. Decision #3 (FIND-1 not escalated as live bug) was traced to §5 trigger language and documented as a judgment call.

---

## 4. Findings Processing

| # | Finding summary | Severity | Disposition | Action taken |
|---|-----------------|----------|-------------|--------------|
| FIND-1 | Fresh-insert over-capacity RPC returns hardcoded `'waiting_list'` when row inserted as `'event_closed'` | MEDIUM | NEW SPEC | File stub for follow-up SPEC `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` (~15 min). See §10. |
| FIND-2 | RPC writes no structured touchpoint/journey log; blocks Phase 4 E1 + partial E7 | MEDIUM | ARCHITECTURAL — Phase 1 P1.1 author input | The Foreman who authors `M3_UTM_TRIPLE_LAYER_PERSISTENCE` (P1.1) MUST read this finding before sealing the P1.1 SPEC. Recorded in §10 as cross-SPEC dependency. Not a TECH_DEBT — it's a design constraint on the next Phase 1 SPEC. |
| FIND-3 | Soft-delete revival branch ignores capacity (intentional but undocumented) | LOW | TECH_DEBT | Add to `TECH_DEBT.md` as `M4-RPC-REVIVAL-CAPACITY-01`. Defer fix until Phase 3 status-column-split SPEC. |
| FIND-4 | Return shape contract is undocumented; `fee_mismatch` only on auto-move branch | LOW | DOC-PATCH FOLLOW-UP | Fold into the next M4 doc-refresh SPEC (e.g., when MODULE_SPEC.md is next touched). Use the §3 Return-Value Semantics table in this SPEC's STATE_TRANSITIONS.md as the source. |
| FIND-5 | Resubscribe-on-register clears `unsubscribed_at` but emits no audit row | INFO | TECH_DEBT | Add to `TECH_DEBT.md` as `M4-AUDIT-RESUBSCRIBE-01`. Revisit at next compliance-audit cycle. |
| FIND-6 | Auto-move branch picks "most recent" other-event row | INFO | DISMISS | Documented in STATE_TRANSITIONS.md §2 L22–L26. No production incident; likely intentional recency-bias behavior. No follow-up unless business logic preferences shift. |
| FIND-7 | Storefront-repo grep deferred (no local checkout on this Windows desktop) | INFO | NEXT-SESSION VERIFICATION | Next Foreman session on a machine with both repos (Mac or Windows laptop) must run `grep -rn register_lead_to_event ../opticup-storefront/src/` (expected: 0 hits per Iron Rule 13). If non-zero → open Rule 13 violation SPEC. |

**Zero findings left orphaned.** All 7 have explicit dispositions.

---

## 5. Spot-Check Verification

Picked 3 of the largest claims from EXECUTION_REPORT.md and verified against repo/DB.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "RPC_BODY.sql md5 `dbd2ccd1eb068b494edfec5cf7788563` matches live `pg_proc` body byte-for-byte (4603 bytes)" | ✅ | Reviewer re-queried live `md5(pg_get_functiondef('public.register_lead_to_event'::regproc))` after Executor commit — returned the same hash. File md5 also `dbd2ccd1eb068b494edfec5cf7788563`. |
| "Smoke 7/7 PASS on demo tenant" | ✅ | Re-run independently by Reviewer (12:30) and Localhost-Tester (12:35) — both 7/7 PASS in fresh runs. |
| "Mermaid block renders cleanly via mmdc (78676 bytes SVG)" | ✅ | Executor's `npx mmdc -i /tmp/rpc_mermaid.mmd -o /tmp/rpc_mermaid.svg` produced 78676-byte SVG, 0 errors. Block also visually inspected for syntax (52-line `stateDiagram-v2`, well-formed transition arrows). |

Zero failed spot-checks. Verdict eligibility preserved at 🟢/🟡 (not capped at 🔴).

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Tighten the "branch count" verification idiom in SPEC_TEMPLATE.md

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 (Success Criteria) — add a "Annotation-coverage criteria" sub-recipe.
- **Change:** Add a new paragraph: *"When a criterion verifies that an annotation table covers every branching keyword in a target source, do NOT use a literal `count(grep keyword) == count(table rows)` equation — PL/pgSQL bodies contain idioms (`IF FOUND` / `IF NOT FOUND` / `END IF` / `CASE WHEN` / `EXCEPTION` clause vs `RAISE EXCEPTION` keyword) that make the literal regex imprecise. Instead, define the criterion as: 'every IF / ELSIF / WHEN / CASE / EXCEPTION clause has at least one annotation row that explicitly references its line number'. The Executor counts and reports both numbers in EXECUTION_REPORT §2, and PASS = every branch is covered (table rows ≥ branch count, never <)."*
- **Rationale:** This SPEC's criterion #5 used the literal regex `'IF\|CASE\|ELSIF\|WHEN\|EXCEPTION'` which produced 16 IF hits (some inside `IF FOUND` / `IF NOT FOUND` idioms) vs the Executor's 38-row table. The PASS verdict was defensible but the criterion read imprecisely. Tightening it now means future read-only diagnostic SPECs author cleaner verification idioms.
- **Source:** EXECUTION_REPORT §5 Decision #1 + this review §2 weakest-dimension.

### Proposal 2 — Codify "pre-flight pg_proc probe" as a SPEC-authoring step for RPC-related SPECs

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1 — Pre-SPEC Preparation" — add a 9th bullet under "Before writing a single line of SPEC content, you MUST".
- **Change:** Add: *"If the SPEC reads or writes any RPC (`pg_proc` row), probe the live RPC at SPEC-authoring time and pin (a) `proname` exists, (b) `pronargs`, (c) `prorettype`, (d) `length(pg_get_functiondef(oid))` — these become baseline symbols in §0 Pre-Authoring Reality Check. Use a single SELECT not multi-statement. Probe BEFORE drafting §3 Success Criteria so the criteria are written against verified RPC shape, not assumed shape."*
- **Rationale:** This SPEC's Brief §6 explicitly said "Probe `pg_proc` BEFORE sealing the SPEC", and I followed that — caught nothing here (RPC was as expected). But the lesson is generalizable: any RPC-touching SPEC should do this. Today the discipline is per-Brief; codifying it skill-side means even Briefs that forget to mandate the probe will get it.
- **Source:** Brief §6 + SPEC §0 baseline table.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Add a "tool availability pre-flight" sub-section under First Action

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"First Action — Every Execution Session" — add a step 4b after the Integrity Gate.
- **Change:** Add: *"4b. **Tool availability quick-check (if SPEC mentions Mermaid render, browser actions, Playwright, or any optional tool):** run `npx --no -y -p @mermaid-js/mermaid-cli mmdc --version 2>&1 | head -1` for Mermaid SPECs; `chrome --version` for browser-action SPECs; `playwright --version` for Playwright SPECs. Cost: <2s each. Document availability in EXECUTION_REPORT §2 'Tool availability' row. If unavailable AND the SPEC has a non-blocking fallback (e.g., manual mermaid.live paste) — proceed with the fallback. If unavailable AND no fallback — STOP at session start, not mid-execution."*
- **Rationale:** This Executor invoked `mmdc` mid-run without knowing if it was installed. It was, and the run was fast (~12s for first invocation including npx cache resolve). But a Mac session with no global mmdc might have surfaced the install need only after partial work. A 2-second availability check at session start surfaces tool gaps before SPEC work begins.
- **Source:** EXECUTION_REPORT §6 #2.

### Proposal 2 — Codify "annotation granularity declaration" as part of the EXECUTION_REPORT §5 Decisions template

- **Where:** `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md` (if it exists, else `SKILL.md` §"Step 4 — Write EXECUTION_REPORT.md").
- **Change:** Add: *"For any SPEC that asks for an annotation table over a source body (SQL, JS, etc.), if the Executor's table contains MORE rows than the SPEC's minimum branch count requires (e.g., context-statement rows on top of branch rows), document the granularity choice in §5 Decisions Made in Real Time with: (a) the minimum the SPEC required, (b) what was produced, (c) why. This pre-empts the Foreman's spot-check question 'why is the table 38 rows when there are only 24 branches?'"*
- **Rationale:** This Executor did exactly this without being prompted (EXECUTION_REPORT §5 Decision #1 was thoughtful + complete). Codifying it as the standard saves the next Executor from inventing the disclosure pattern.
- **Source:** EXECUTION_REPORT §5 Decision #1.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO (per SPEC §8 — read-only diagnostic does not move a module phase) | n/a | n/a |
| `docs/GLOBAL_MAP.md` | NO (no new functions / contracts) | n/a | n/a |
| `docs/GLOBAL_SCHEMA.sql` | NO (no new DB objects) | n/a | n/a |
| Module 4 `SESSION_CONTEXT.md` | OPTIONAL (per SPEC §8) | Pending (Foreman closure will add a one-line entry — see §10) | Will be added in this commit |
| Module 4 `CHANGELOG.md` | NO (no code/schema commits) | n/a | n/a |
| Module 4 `MODULE_MAP.md` | NO (no new functions / files in code) | n/a | n/a |
| Module 4 `MODULE_SPEC.md` | NO (no business-logic change) | n/a | n/a |
| `roles/site-overseer/FUNNEL_ROADMAP.md` | YES — mark P1.4 status to ✅ CLOSED | Pending (Foreman closure will update — see §10) | Will be added in this commit |
| `roles/site-overseer/SITE_OVERSEER_SKILL.md` + `KNOWLEDGE_MAP.md` | NO (Brief §6 explicitly defers to a separate follow-up SPEC) | n/a — by design | The deferred SPEC `SITE_OVERSEER_RPC_MAP_LAYER4_INTEGRATION` (see §10) will own it. |

**No hard-fail violations.** Pending updates (Module 4 SC + FUNNEL_ROADMAP P1.4 status) will be applied in the closure commit alongside this FOREMAN_REVIEW.md.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> P1.4 ב-Phase 1 של מפת ההמרות סגור 🟡 — מפה מלאה של ה-RPC `register_lead_to_event` (גוף, מסלולי החזרה, קוראים, התאמה ל-E1–E7). באג קטן אותר ב-RPC (החזרת `'waiting_list'` במקום `'event_closed'` במצב קצה) — בלי השפעת לקוח, רץ ל-SPEC הבא של 15 דקות לתיקון. P1.1 ו-P1.2 יכולים עכשיו להיכתב על בסיס מפה ולא על השערות.

---

## 10. Follow-ups Opened

- **NEW SPEC stub:** `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/` — for FIND-1. To be authored when the Architect or Daniel schedules. Estimated 15 minutes (1-line migration + 1 smoke). NOT authored in this chat per activation prompt scope ("P1.4 only. P1.1/P1.2/P1.3 are separate dispatches.").
- **Cross-SPEC dependency note:** Whoever authors `M3_UTM_TRIPLE_LAYER_PERSISTENCE` (Funnel Phase 1 P1.1) MUST read FIND-2 in this SPEC's FINDINGS.md before sealing the P1.1 SPEC — the touchpoint-vs-attendee-columns architectural decision belongs in P1.1's scope, informed by this diagnostic.
- **TECH_DEBT entries (deferred to next M4 hygiene SPEC):**
  - `M4-RPC-REVIVAL-CAPACITY-01` — soft-delete revival ignores capacity (FIND-3)
  - `M4-AUDIT-RESUBSCRIBE-01` — resubscribe-on-register leaves no audit row (FIND-5)
- **DOC follow-up:** `M4 MODULE_SPEC` next-touch SPEC should add the "Return-shape contract" section (FIND-4) — fold into whichever doc-refresh SPEC ships next.
- **NEXT-SESSION verification:** First M4 session on Mac or Windows laptop runs the cross-repo storefront grep (FIND-7).
- **DEFERRED INTEGRATION SPEC:** `SITE_OVERSEER_RPC_MAP_LAYER4_INTEGRATION` — bring this SPEC's `STATE_TRANSITIONS.md` into `roles/site-overseer/SITE_OVERSEER_SKILL.md` Layer 4 + `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md`. Brief §6 explicitly defers. Owner: Site Overseer or Architect's next strategic session.

---

*End of FOREMAN_REVIEW.md.*
