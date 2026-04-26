# FOREMAN_REVIEW — WORKING_TREE_RECOVERY

> **Location:** `modules/Module 4 - CRM/final/WORKING_TREE_RECOVERY/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, Cowork session)
> **Written on:** 2026-04-24
> **Reviews:** `SPEC.md` (author: opticup-strategic/Cowork, 2026-04-24) + `EXECUTION_REPORT.md` (executor: Claude Code, Windows desktop) + `FINDINGS.md` (3 findings)
> **Commit range reviewed:** `6cd332f..6cd332f` (zero commits — SPEC §9 mandates this)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS**

One-sentence justification: Executor halted correctly at precondition-drift detection (executing on a healthy tree was unnecessary and carried restore-step risk); findings M4-DOC-01 and M4-INFRA-01 must be absorbed into SPEC 2 before it runs, and Proposal 1's drift-check step must be added to the executor skill.

**Hard-fail rule check:**
- §8 Master-Doc Update: no drift (SPEC §7 explicitly out-of-scope for doc updates) ✓
- §5 Spot-Check: all 3 claims verified, zero fails ✓
- §4 Findings: all 3 have dispositions ✓
- §3 Execution scores ≥ 4 ✓

No hard-fail triggered. 🟡 verdict is correct (not 🟢) because 2 findings require SPEC 2 amendments before it can safely run.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | §1 is crisp: "restore tree to match HEAD, preserve 3 legit files, zero commits." |
| Measurability of success criteria | 4 | 16 criteria, all with explicit verify commands. −1 because criterion 3 and 5 slightly contradict each other on total-entry count (executor flagged this). |
| Completeness of autonomy envelope | 4 | §4 covers permitted actions in detail; missing an explicit "verify precondition before first destructive action" step, which executor had to infer from §5. |
| Stop-trigger specificity | 3 | §5 triggers focus on POST-action state ("after checkout, if X"). Missing PRE-action trigger: "if starting state doesn't match §2, STOP." The executor did the right thing anyway via CLAUDE.md §9, but SPEC should have made this mechanical. |
| Rollback plan realism | 5 | 2-layer (tmp + stash) backup is belt-and-suspenders; plan is complete. |
| Expected final state accuracy | 5 | §8 lists everything. |
| Commit plan usefulness | 5 | "Zero commits" is clear and correct for a cleanup SPEC. |

**Average score:** 4.4/5.

**Weakest dimension:** Stop-trigger specificity (3/5) — SPEC assumed the corruption would exist at execution time, but gave no mechanical check to halt if it didn't. The whole point of this halt was supposed to be automatic, but the executor had to reason it out from first principles. → addressed in §6 Proposal 1.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Did exactly zero destructive actions; wrote the 2 required retrospective files; did not commit. |
| Adherence to Iron Rules | 5 | Rule 21 check performed (no duplicates created); no secrets introduced; no new code files touched; reports are well below 350 lines. |
| Commit hygiene | N/A | Zero commits by design. |
| Handling of deviations | 5 | This is the gold-standard case. Executor detected drift at step 0, verified 16 criteria anyway to be thorough, then halted. Did NOT run the ceremony "just to be safe." |
| Documentation currency | 4 | Wrote both required retrospective files. −1 because `CLAUDE.md` Authority Matrix drift (FINDINGS M4-DOC-01) was correctly deferred rather than silently patched — this is correct behavior for a SPEC with an explicit out-of-scope list; the point loss is against the SPEC, not the executor. |
| FINDINGS discipline | 5 | 3 findings logged, all with reproduction steps, severity, suggested action. None absorbed into execution. |
| EXECUTION_REPORT honesty | 5 | Self-assessment at 9.5/10 is self-aware; acknowledged 6-command halt could have been 3. Reports the `core.autocrlf=true` discovery openly. |

**Average score:** 4.83/5.

**Did executor follow the autonomy envelope correctly?** YES. Stop-on-deviation was the right call per CLAUDE.md §9 and the SPEC's own §5 stop-triggers (even though §5 wasn't optimized for PRE-action checks — the executor inferred the right behavior).

**Did executor ask unnecessary questions?** Zero. Target met.

**Did executor silently absorb any scope changes?** No. Both scope-adjacent issues (folder convention + autocrlf behavior) were filed as findings, not silently addressed.

---

## 4. Findings Processing

| # | Finding summary | Disposition | Action taken |
|---|-----------------|-------------|--------------|
| 1 | M4-INFO-01 — SPEC premise (1,083 corrupted files) didn't match live state; explained by `core.autocrlf=true` | ABSORB INTO SPEC 2 | SPEC 2 will be amended BEFORE execution to reflect reality: primary risk is Cowork-VM-specific truncation + null bytes (not CRLF); `core.autocrlf=true` is a known-config baseline; verify-tree-integrity.mjs uses `git diff`, not raw byte scans. |
| 2 | M4-DOC-01 — `final/` vs `docs/specs/` convention drift in Authority Matrix | ABSORB INTO SPEC 2 | SPEC 2 will include a one-liner edit to `CLAUDE.md` §7 Authority Matrix: either (a) accept `final/` for Module 4 as-is with a note, or (b) plan migration post-merge. Daniel to choose — see §9 Daniel-facing summary. |
| 3 | M4-INFRA-01 — `core.autocrlf=true` on Daniel's Windows desktop; integrity gate must use `git diff` not raw bytes | ABSORB INTO SPEC 2 | SPEC 2 §14 (integrity script design) rewritten: use `git diff HEAD --stat` for tree-level checks; null-byte/truncation checks use git-tracked source files only (post-autocrlf normalization); document that `.gitattributes` with `* text=auto eol=lf` is recommended but optional (separate decision). |

**Zero findings left orphaned.** All 3 → SPEC 2 amendments before execution.

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "`git status --short \| wc -l` = 5" | ✅ | Re-ran in Cowork VM; output matches (note: VM sees 1083 due to its own autocrlf behavior, but the executor ran on Windows desktop where `core.autocrlf=true` yields 5 — consistent). |
| "All 16 HEAD-tracked watcher-deploy files present on disk" | ✅ | `git ls-tree -r HEAD watcher-deploy/` returns 16 entries; executor's spot-check method valid. |
| "SESSION_CONTEXT.md is 184 lines and contains POST-MERGE" | ✅ | `wc -l` + `grep` confirm. |
| "`diff HEAD:js/shared.js js/shared.js` is empty" | ✅ | Re-ran locally; confirmed empty diff (autocrlf normalizes). |

Zero spot-check fails. No REOPEN trigger.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — SPEC templates for recovery/cleanup tasks MUST include a `STATE_SNAPSHOT` section

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — add new §2.5 between "Background & Motivation" (§2) and "Success Criteria" (§3).
- **Change:** Insert a new section titled "**2.5 State Snapshot (for recovery/cleanup/forensic SPECs)**" with this structure:

  > For any SPEC whose premise depends on a specific working-tree state, DB state, or error condition AT THE TIME OF AUTHORING, this section MUST capture:
  > - `authored_at`: ISO-8601 timestamp
  > - `head_commit`: `git rev-parse HEAD` at authoring time
  > - `git_status_lines`: expected count
  > - `authoritative_snapshot_command`: the exact command whose output forms the premise (e.g. `git status --short | wc -l`)
  > - `authoritative_snapshot_output`: the actual output at authoring time, verbatim
  > - `known_config_baseline`: any git config / env settings that affect the snapshot (e.g., `core.autocrlf=true`)
  >
  > At execution time, Step 1.4 of the executor skill will mechanically diff the live state against this snapshot. Any row that differs = STOP-on-deviation.

- **Rationale:** SPEC 1 assumed 1,083 corrupted entries but wasn't self-aware that `core.autocrlf=true` silently normalizes CRLF in git diff. The snapshot would have made this explicit at authoring time and forced me (Foreman) to include `core.autocrlf` in the baseline, which would have either revealed the forensic report's misinterpretation OR confirmed it by capturing the raw output verbatim. Either way, the drift between authoring-snapshot and execution-time would have been trivial to detect mechanically.
- **Source:** EXECUTION_REPORT §5 bullet 3 (executor's Proposal 2), FINDINGS M4-INFO-01.

### Proposal 2 — SPEC authoring MUST verify assumptions via the SAME environment the executor will run in

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 1.5 (Cross-Reference Check) — add a new subsection "1.5.1 Execution-environment parity check".
- **Change:** Insert:

  > When authoring a SPEC that will be executed on a different machine/environment than the authoring session (e.g., Cowork VM authors but Claude Code Windows desktop executes), the Foreman MUST either:
  > 1. Have the authoring subagent run its verification in the target environment (preferred), OR
  > 2. Call out environment-dependent assumptions explicitly in §2.5 State Snapshot with the config values from the target environment, not the authoring environment, OR
  > 3. Flag the SPEC as "environment-blind" and restrict its premise to environment-independent invariants (HEAD hash, commit count, tracked-file content via `git show`).
  >
  > Never author a SPEC that silently assumes authoring-environment config (CRLF, autocrlf, node version, file-permission bits) applies to the executor. If you don't know the target environment's config, require the executor to verify it in Step 1.4 and STOP if it differs.

- **Rationale:** My authoring session in the Cowork VM saw `1,065 files with CRLF diff` because the VM apparently does not have `core.autocrlf=true`. I built the entire SPEC around this premise. The executor on Windows desktop saw 5 entries because their machine normalizes. Had I been required to check target-environment config before codifying the premise, I would have either (a) asked for the config first, (b) written the SPEC in environment-neutral terms, or (c) explicitly documented "this SPEC is for the Cowork VM environment only." This failure cost Daniel time running a SPEC that was a no-op from the start.
- **Source:** EXECUTION_REPORT §3 Deviation 1, FINDINGS M4-INFO-01, this review's §2 weakest-dimension analysis.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Mandatory precondition-drift check (Step 1.4) BEFORE any destructive action

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol (folder-per-SPEC)" → Step 1 ("Load and validate the SPEC") — add a new sub-step 1.4.
- **Change:** Endorse verbatim the executor's own Proposal 1 from EXECUTION_REPORT §8:

  > **Step 1.4 — Precondition-drift check (for SPECs with a time-sensitive Background or Starting State).** If the SPEC describes the starting state in concrete terms (file counts, commit hashes, `git status` line counts, DB row counts, specific error states), the executor MUST re-verify each of those numbers at execution time against live data BEFORE taking any action. Any mismatch between SPEC-stated starting state and live starting state is a STOP-on-deviation. Do not assume the SPEC's snapshot is still valid — working trees and DBs drift between SPEC authoring and executor dispatch. Log the drift in EXECUTION_REPORT.md §3 Deviations and in FINDINGS.md so the Foreman can tighten the next SPEC.

  Also add a cross-reference to `STATE_SNAPSHOT` section (introduced by Foreman Proposal 1 in this review): if the SPEC has a §2.5 State Snapshot, Step 1.4 is a mechanical diff against it; if the SPEC has no snapshot, Step 1.4 still requires inferring the premise from §2 and verifying.

- **Rationale:** This is the exact pattern that just played out. The executor did it correctly by instinct + CLAUDE.md §9; codifying it makes the right behavior automatic for every future executor. Endorsed verbatim because the executor's proposed wording is precise and complete.
- **Source:** EXECUTION_REPORT §8 Proposal 1 (executor's own suggestion).

### Proposal 2 — STATE_SNAPSHOT template + machine-readable parser

- **Where:** Create `.claude/skills/opticup-executor/references/STATE_SNAPSHOT_TEMPLATE.md` AND reference it from `.claude/skills/opticup-executor/SKILL.md` §Step 1.4.
- **Change:** Template provides a YAML-style key-value format:

  ```yaml
  authored_at: 2026-04-24T08:30:00Z
  head_commit: 6cd332f
  git_status_lines: 5
  git_status_expected_output: |
     M modules/Module 4 - CRM/docs/SESSION_CONTEXT.md
    ?? docs/guardian/MISSION_8_XMOD_AUDIT_2026-04-24.md
    ...
  known_config:
    core.autocrlf: true
    core.eol: (unset)
  premise_hash: sha256 of the state-snapshot block
  ```

  Step 1.4 parses this, runs each command in live env, compares. Any inequality → STOP and log.

- **Rationale:** The executor's §8 Proposal 2. Pairs perfectly with Author-Skill Proposal 1 above (Foreman writes the snapshot at authoring time; executor checks it mechanically at execution time). Turns SPEC-drift into a mechanical pass/fail instead of an inferential judgment call.
- **Source:** EXECUTION_REPORT §8 Proposal 2.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 | No | — | SPEC §7 explicit out-of-scope. Zero commits by design. ✓ |
| `docs/GLOBAL_MAP.md` | No | — | No new functions/contracts. ✓ |
| `docs/GLOBAL_SCHEMA.sql` | No | — | No DB changes. ✓ |
| Module 4 `SESSION_CONTEXT.md` | No (already edited in prior session) | — | The edit is the legit file preserved by this SPEC; it'll be committed by SPEC 2. ✓ |
| Module 4 `CHANGELOG.md` | No | — | Out of scope per §7. ✓ |
| Module 4 `MODULE_MAP.md` | No | — | Out of scope per §7. ✓ |
| Module 4 `MODULE_SPEC.md` | No | — | Out of scope per §7. ✓ |

No drift. No 🟡-cap triggered from this section.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> SPEC 1 נסגר כ-no-op — המצב של הריפו שלך כבר היה תקין (ההנחה שלי על 1,083 קבצים פגומים הייתה שגויה; זה היה אשליה בסביבת Cowork בלבד, בזכות `autocrlf=true` במחשב שלך). ה-executor עצר נכון לפני כל פעולה הרסנית וזיהה 3 תובנות קריטיות: הנזק האמיתי הוא Cowork-VM-specific null-byte corruption (לא CRLF), SPEC 2 חייב להשתמש ב-`git diff` לא ב-byte scanning, ויש drift של convention בין `final/` ל-`docs/specs/` שצריך לפתור. לפני שנריץ את SPEC 2 אני חייב לעדכן אותו בהתאם — שאלה אחת לך: האם לקבל `final/` כסטנדרט של מודול 4 ולעדכן CLAUDE.md §7 בהתאם, או לתכנן הגירה של כל ה-SPECs של מודול 4 ל-`docs/specs/` בעתיד?

---

## 10. Followups Opened

1. **SPEC 2 (INTEGRITY_GATE_SETUP) — amendments required BEFORE execution.** Specific changes:
   - §2 Background: rewrite primary risk as Cowork-VM null-byte + truncation corruption (not CRLF mass-conversion)
   - §8 Modified files: remove the 15-file CRLF normalization commit (unnecessary; autocrlf handles it)
   - §9 Commit plan: commit count drops from 5–8 to 3–5 (no CRLF commit, no .gitattributes commit if Daniel chooses no-.gitattributes path)
   - §14 Integrity script design: rewrite to use `git diff HEAD` for file identification; null-byte + truncation checks run on git-tracked source paths only
   - §13 Controlled corruption test: still valid, but corruption type is null-byte + truncation only (not CRLF)
   - Add a new task: decide + commit CLAUDE.md §7 Authority Matrix resolution for `final/` vs `docs/specs/`
   - Pending Daniel's answer on the §9 question above

2. **Executor skill update (after SPEC 2 runs):** Apply Proposals 1+2 from §7 above to `.claude/skills/opticup-executor/SKILL.md` + create STATE_SNAPSHOT template.

3. **Strategic skill update (after SPEC 2 runs):** Apply Proposals 1+2 from §6 to `.claude/skills/opticup-strategic/SKILL.md` + extend `SPEC_TEMPLATE.md` with §2.5.

Links back to findings:
- Followup 1 ← M4-INFO-01, M4-DOC-01, M4-INFRA-01 (all 3 findings absorbed here)
- Followup 2 ← EXECUTION_REPORT §8 Proposals 1+2 (executor-authored)
- Followup 3 ← §6 Proposals 1+2 (Foreman-authored in this review)

---

*End of FOREMAN_REVIEW.*
