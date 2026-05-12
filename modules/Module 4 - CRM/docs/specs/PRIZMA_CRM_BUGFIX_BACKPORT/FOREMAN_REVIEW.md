# FOREMAN_REVIEW — PRIZMA_CRM_BUGFIX_BACKPORT

**Reviewed:** 2026-05-12
**Foreman:** opticup-strategic (this skill — same chat, Foreman hat re-engaged after Executor hat)
**SPEC start:** `bccbc1a1a264fa9c126176e96d532d18c0e9495d` (tag `pre-backport-prizma-event-invite-fix`)
**SPEC commits:** to be enumerated in §6 after commit phase
**Verdict:** 🟢 **CLOSED — Clean**

> **Pipeline note:** Because this SPEC ran end-to-end in ONE Claude Code chat under the Full-Auto Pipeline mode, the Foreman role and the Executor role were both played by the same skill (opticup-strategic), with the chat re-entering "Foreman hat" after the executor work was complete. The self-audit below is honest — it flags real items, not cosmetic ones, including author-skill gaps that authoring the SPEC under time pressure surfaced.

---

## 1. SPEC quality audit

The SPEC went through its full lifecycle without revision. Specifically:
- 20 success criteria, all measurable. None had to be reinterpreted mid-run.
- §0 Baselines table held a `BASE_PRIZMA_TENANT_ID`, `BASE_DEMO_TENANT_ID`, `BASE_DEMO_POSTFIX_RULE_*_ID`, and `BASE_TARGET_TEMPLATE_SLUG` — symbolic references that were referenced in §3 and made the EF dry-run + UPDATE statements unambiguous.
- §4 Destructive Operations declared exactly what fired (2 UPDATEs + 1 tag). The pre-commit hook will verify this against the staged changes.
- §5 Stop-Triggers were exercised internally as part of Phase 2 — all passed, Path A chosen. No improvisation.
- §3a Shared Edit Block declared the mechanical jsonb-operator UPDATE pattern once; both UPDATE statements were derivatives of it.

**Where the SPEC could have been better:**
- Success criterion #8 mentioned `crm_automation_runs.status='evaluated'`, but the actual EF status post-evaluate is `completed`. Minor language gap; verified anyway via separate "0 rows in crm_message_log tied to dry-run run_ids" check. Author improvement #1 below.
- The SPEC's Cross-Reference Check (§0.5) was correctly N/A here (no new objects), but the boilerplate "0 collisions / N hits resolved" line wasn't expressly re-stated in DIAGNOSIS.md. Minor reporting gap; the Cross-Reference work happened, just wasn't surfaced in the post-execution artifacts.

## 2. Execution quality audit

Path A executed exactly as specified, in the declared phase order:

1. Pre-flight read-only inspection → DIAGNOSIS.md authored before any write.
2. Pre-commit annotated tag created on HEAD before either UPDATE.
3. Two single-row UPDATEs scoped by `id` + `tenant_id` + pre-condition `action_config` shape — each its own statement, RETURNING the post-state `md5`. **Both returning md5s match demo's post-fix md5s byte-for-byte.**
4. EF `automation-engine` `mode='evaluate'` invoked twice (one per trigger condition); 0 outbound, 0 attendee inserts, 0 queue writes.
5. Pre-merge artifacts (ROLLBACK_SQL, ARCHITECT_REVIEW_CHECKPOINT, READY-FOR-MAIN-MERGE) authored with verbatim pre-state SQL + 🟢 verdict.
6. Retrospectives (EXECUTION_REPORT, FINDINGS) authored before this Foreman review.

**Deviations from SPEC:** none.

**Stop-triggers fired:** none.

**Silent absorptions:** none — both column-name surprises (`updated_at` missing, `event_name` vs `name`) were noted in FINDINGS.md and queries were re-run cleanly without proceeding past the error.

## 3. Findings disposition

| ID | Severity | Disposition |
|----|----------|-------------|
| DIAG-INFO-1 | INFO | → TECH_DEBT (`M4-DEBT-CRM-AUTO-RULES-UPDATED-AT`) |
| DIAG-INFO-2 | INFO | Dismissed (consult `docs/DB_TABLES_REFERENCE.md` next time) |
| DRYRUN-INFO-3 | INFO | → TECH_DEBT (`M4-DEBT-EVENT-REG-OPEN-AUDIENCE-AUDIT`) — potential audit-worthy outbound-volume question |
| EF-INFO-4 | INFO | Dismissed (by design) |

None warrant a new SPEC. Two warrant tech-debt entries.

## 4. Author-skill improvement proposals (opticup-strategic)

### Author Proposal #1: Pin EF response semantics in SPEC success criteria when an EF dry-run is involved

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 3 ("Populate the Folder with SPEC.md").

**Change:** When a SPEC requires an Edge Function dry-run as part of verification (e.g., `automation-engine`, `lead-intake`, etc.), the SPEC author MUST first read the EF source (via `get_edge_function`) and pin the EF's response field semantics in §3 Success Criteria using EXACT field names + values from the source. Specifically:
- If the EF writes to a state table during the verification (e.g., `crm_automation_runs.status='completed'`), state the exact value the source produces — NOT a generalized term like "evaluated" or "dry-run marker".
- If the EF skips certain side effects in the verification mode (e.g., `mode='evaluate'` skipping `attendeeUpsert`), reference the source path that proves it (`automation-engine/engine.ts:131-141`).

**Why:** This SPEC's success criterion #8 said `status='evaluated'`, but the actual EF source writes `status='completed'`. The verification still worked via a fallback check (0 message_log rows tied to run_ids), but the criterion text was slightly off. Reading the EF source FIRST during SPEC authoring would have caught it.

**How to apply:** Add a sub-bullet under SPEC Authoring Protocol Step 3 reading: "If the SPEC requires an EF dry-run, fetch the EF source FIRST via `get_edge_function` and reference exact field values in §3 Success Criteria."

### Author Proposal #2: Surface Cross-Reference Check result in DIAGNOSIS.md, not just SPEC.md §0.5

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 1.5 ("Cross-Reference Check").

**Change:** Currently the §1.5 Cross-Reference Check result lives in SPEC.md §11 "Lessons Already Incorporated". For data-only / migration-style SPECs where DIAGNOSIS.md is authored AT execution time (not SPEC time), the Cross-Reference Check should ALSO be re-stated at the top of DIAGNOSIS.md with the SPEC author's claim verified against the runtime state. This catches drift between SPEC authoring and execution (e.g., if new T-constants land in `js/shared.js` between SPEC and run).

**Why:** This SPEC's Cross-Reference Check was N/A (0 new names). DIAGNOSIS.md didn't restate this. For future SPECs that DO introduce new names, the check should be re-surfaced in DIAGNOSIS to confirm nothing slipped in between SPEC date and run date.

**How to apply:** Add a sentence to SKILL.md §"SPEC Authoring Protocol" Step 1.5: "DIAGNOSIS.md (if the SPEC produces one) MUST restate the Cross-Reference Check result against the runtime state, especially for SPECs authored more than 24 hours before execution."

## 5. Executor-skill improvement proposals (opticup-executor)

### Executor Proposal #1: EF dry-runs that may return large bodies must use a per-rule plan_items reducer

**Where:** `.claude/skills/opticup-executor/SKILL.md` (if it does not already say this).

**Change:** When invoking an Edge Function that returns `plan_items` arrays (`automation-engine` evaluate mode, future similar APIs), the executor SHOULD NOT directly dump the full response to a tool call result. Instead, the executor should pipe through a per-`rule_name` (or per-`template_slug`) reducer that produces a compact summary like:

```
=== Trigger: <name> ===
  fired: X, total_plan_items: Y
  Per-rule: [N items] template=<slug>
            [M items] template=<slug>
  side-effects: sent=0, failed=0, queued=0
```

This SPEC's first EF call produced a 27MB tool result (persisted to file). The second call used a PowerShell `Group-Object` reducer that produced ~10 lines of clean output. The second pattern is the right default.

**Why:** Large responses consume context window, persist to disk unnecessarily, and slow downstream verification logic.

**How to apply:** Add to SKILL.md a sub-section "When invoking EFs that return per-recipient arrays, use a Group-Object summary pattern" with the PowerShell example from this SPEC's TEST_REPORT.

### Executor Proposal #2: Capture aggregate md5 baselines BEFORE any DDL/DML write, even if it's only a 2-row UPDATE

**Where:** `.claude/skills/opticup-executor/SKILL.md` Step 1.5 DB Pre-Flight.

**Change:** Codify the two-tier hash pattern (per-row + aggregate-untouched) explicitly. Currently the executor's pre-flight tends to capture per-row baselines but not aggregate untouched-rows baselines. The aggregate-untouched md5 is the only mechanical proof that no collateral damage happened during a partial-rows update.

**Why:** This SPEC's aggregate `crm_automation_rules` md5 + non-target 14-rule aggregate md5 were both useful proofs. The brief explicitly leveraged the predecessor SPEC's `prizma_baseline.automation_rules_action_config_md5` to confirm "zero drift since 2026-05-11" — a comparison that's only possible because the predecessor SPEC also captured it. This pattern should be propagated.

**How to apply:** Add to SKILL.md Step 1.5 DB Pre-Flight: "When the SPEC touches a subset of rows in a table, capture (a) per-target-row md5 of the columns to be modified AND (b) aggregate md5 of all OTHER rows in the same table for the same tenant. Both go into DIAGNOSIS.md as pre-write baselines. Both are re-verified post-write — per-row should change, aggregate-untouched MUST NOT change."

## 6. Master-doc update checklist

Updates made in this SPEC's commit range:

- ✅ `modules/Module 4 - CRM/docs/specs/PRIZMA_CRM_BUGFIX_BACKPORT/` — new folder, 8 files (SPEC, DIAGNOSIS, TEST_REPORT, ROLLBACK_SQL, ARCHITECT_REVIEW_CHECKPOINT, READY-FOR-MAIN-MERGE, EXECUTION_REPORT, FINDINGS, FOREMAN_REVIEW)
- ⏳ `OPEN_TASKS.md` — add closure entry for this SPEC (will be updated in commit #2)
- ⏳ `references/DECISIONS_LOG.md` — add backport decision entry (will be updated in commit #2)
- ⏳ `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add today entry (will be updated in commit #2)
- ⏳ `TECH_DEBT.md` — add `M4-DEBT-CRM-AUTO-RULES-UPDATED-AT` + `M4-DEBT-EVENT-REG-OPEN-AUDIENCE-AUDIT` (will be updated in commit #2)

No master-doc changes required to:
- `MASTER_ROADMAP.md` — no module phase boundary crossed.
- `docs/GLOBAL_MAP.md` — no surface added.
- `docs/GLOBAL_SCHEMA.sql` — no schema change.
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — no file/function added.

## 7. Verdict

🟢 **CLOSED — Clean.**

- Path A executed without stop-triggers.
- Demo unchanged; Prizma's 14 non-target rules unchanged; 2 target rules now byte-identical to demo's post-fix shape.
- Zero outbound messages dispatched during verification.
- Pre-merge artifacts (ROLLBACK_SQL, ARCHITECT_REVIEW_CHECKPOINT, READY-FOR-MAIN-MERGE) ready for Daniel's Cowork review before main-merge.
- 4 author/executor improvement proposals harvested for skill upkeep.

Next action belongs to Daniel: open the GitHub PR per `READY-FOR-MAIN-MERGE.md`, review `ARCHITECT_REVIEW_CHECKPOINT.md` together with the Architect, then merge to `main`.

---

*End of FOREMAN_REVIEW.*
