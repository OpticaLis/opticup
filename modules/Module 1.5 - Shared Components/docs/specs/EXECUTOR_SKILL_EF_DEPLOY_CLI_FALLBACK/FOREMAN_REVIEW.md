# FOREMAN_REVIEW — EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, M1.5)
> **Written on:** 2026-05-14
> **Reviews:** `SPEC.md` (author: Foreman, same chat, 2026-05-14) + `EXECUTION_REPORT.md` (executor: same chat) + `FINDINGS.md` (present, `None.`)
> **Commit range reviewed:** `a890e19..7b1ec48` — 2 commits (`fde0137` SKILL edit + SPEC; `7b1ec48` retrospective). Independent Reviewer verdict 🟢 PASS.

---

## 1. Verdict

🟢 **CLOSED**

The OPEN-021 3-strikes pattern is now structurally encoded in `opticup-executor/SKILL.md`: future SPECs that call `mcp__claude_ai_Supabase__deploy_edge_function` and receive 5xx will auto-fallback to the Supabase CLI without pausing for Daniel. All 9 SPEC §3 success criteria PASS (independently re-verified by the Reviewer); the additive-only invariant holds (+72/-0 on SKILL.md, `diff --strip-trailing-cr` = 0); smoke 7/7 PASS as a control; integrity gate exit 0. Brief hard constraints — additive only, §5h preserved, scope narrow to `deploy_edge_function`, no commit to main, no other skill files touched — all satisfied byte-for-byte.

**Hard-fail check:** §8 Master-Doc Update Checklist has zero "should have / wasn't" rows (skill-only edit; no master docs were due an update). §5 Spot-Check has 3 PASS rows. §4 Findings has full disposition (executor reported `None.`; both process observations are tracked as Executor Proposals in EXECUTION_REPORT §8, which are skill-improvement signals, not gated findings). §3 Execution Quality scored 5/5 on every applicable dimension. No hard-fail trips.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Goal clarity | 5 | §1 stated the goal in 2 sentences naming the precise artifact (encode auto-fallback in `opticup-executor/SKILL.md`), the closure target (OPEN-021 3-strikes), and the downstream beneficiaries (P1.2, P1.3). No ambiguity. |
| Measurability of success criteria | 5 | 9 criteria, each with copy-paste-runnable verify command + exact expected value. Baseline anchors captured in §0 (`BASE_LINES_executor_skill=1029`, `BASE_HITS_open021=0`, `BASE_HITS_mcp_first=0`). Additive-only invariant pinned as a hard structural check with both `diff` and `git diff --numstat` recipes. |
| Completeness of autonomy envelope | 5 | §4 enumerated 7 things the Executor could do without asking AND 6 stop-and-report triggers, each narrow + observable. §5 added 5 SPEC-specific stop-triggers (additive-only deletion, get_edge_function count drift, missed criteria, smoke regression, integrity exit 1). |
| Stop-trigger specificity | 5 | Every trigger is narrow + observable + actionable. "If post-edit diff returns ≥ 1 deletion line → STOP" maps directly to the Brief's no-deletion hard rail. |
| Rollback plan realism | 5 | §6 is trivial-but-realistic: governance-file backup on disk + `git checkout --` for mid-flight + `git revert <sha>` for post-commit. No DB / EF / schema entanglement to roll back. |
| Expected final state accuracy | 4 | §8 listed the backup file as a "New file." The Executor caught (correctly) that `modules/*/backups/` is gitignored project-wide, so the backup exists on disk but is NOT committed. The file produced count matches the SPEC intent but the SPEC wording could have been clearer about "on-disk required, git-tracked not required." Codified in Author Proposal #2 below. −1 here. |
| Commit plan usefulness | 5 | §9 said 2 (or optionally 1) commits; actual run produced 2 commits exactly per plan. Selective `git add` by filename throughout per the Full-Auto Pipeline pre-existing-WIP discipline. |

**Average score:** 4.86/5.

**Weakest dimension + why:** Expected final state accuracy — §8 named the backup path as a New File without clarifying that gitignored paths are on-disk-only deliverables. The Executor inferred correctly (the right call was selective `git add` excluding the backup) but the inference cost a few seconds. Codified as Author Proposal #2.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Adherence to SPEC scope | 5 | No files modified outside the SPEC's declared scope. Both insertions placed at the exact anchor points named in §8 (line 688 for Insertion 1; immediately after the "Tool fails unexpectedly" row for Insertion 2). Original §5h preserved byte-identical. Original "Tool fails unexpectedly" row preserved byte-identical. No silent drift. |
| Adherence to Iron Rules | 5 | All applicable rules PASS. Rule 9 (`tsxrrxzmdxaenlvocyit` is public project ref, already in CLAUDE.md §2). Rule 21 (no duplicate section — §5h and §5i are explicitly cross-referenced; the new section does NOT supersede §5h, it supplements it). Rule 23 (no secrets). Rule 31 (integrity gate exit 0 pre + post). Rule 32 (Destructive Operations = None; hook PASS on both commits). Selective `git add` by filename throughout. |
| Commit hygiene | 5 | 2 single-concern commits with descriptive English `type(scope): description` messages + co-author trailers + HEREDOC for multi-paragraph bodies. Pre-commit hook PASS on both. No `--amend`, no `--no-verify`. Atomic — SKILL.md edit ships with the SPEC.md that authorized it. |
| Handling of deviations | 5 | One real deviation surfaced (Windows CRLF false-positive on `diff <(git show…) <file>`), documented in EXECUTION_REPORT §3, resolved in-line with `--strip-trailing-cr` and cross-confirmed via `git diff --numstat`. No scope drift. No escalation needed. Three decision points documented in §4 with clean rationale. |
| Documentation currency | 5 | SPEC.md sealed. EXECUTION_REPORT.md written. FINDINGS.md written (`None.`). The SPEC explicitly stated that no master docs needed updating (skill-only edit, no module-phase status change, no new functions/contracts/tables) — the Executor honored this exactly. |
| FINDINGS.md discipline | 5 | `None.` reported with explicit rationale. The two process observations (CRLF on diff, gitignored backup semantics) were classified correctly as skill-improvement signals (Executor Proposals #1 + #2) rather than project findings. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment scores (10/10/9/10/10/10) match my independent assessment after spot-checks. Iron-Rule self-audit is granular (every applicable rule has its evidence row). Decisions section captures 3 real-time judgment calls with rationale. Raw-command log captures the unusual CRLF-diff cycle for post-mortem. Skill-improvement proposals are concrete + sourced. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES. Zero questions to Daniel; zero questions to the Foreman in-chat. The CRLF false-positive was resolved within Executor authority (single re-run with the corrected flag). The gitignored-backup decision was made within Executor authority (selective `git add` excluding the backup path).

**Did executor ask unnecessary questions?** **Zero.** The Brief explicitly authorized Full-Auto pipeline; the Executor honored it.

**Did executor silently absorb any scope changes?** No. Both decision points (CRLF diff and gitignored backup) are documented in EXECUTION_REPORT §4. The SPEC.md §8 mention of the backup as a "New file" is acknowledged in EXECUTION_REPORT §4 Decision #1 as a SPEC-wording precision gap (NOT a scope change) — the on-disk file IS produced, just not committed.

---

## 4. Findings Processing

| # | Finding summary | Severity | Disposition | Action taken |
|---|---|---|---|---|
| FINDINGS.md | `None.` reported by Executor | — | n/a | Executor's classification correct — no project findings to disposition. |
| Process Obs #1 | Windows CRLF false-positive on `diff <(git show HEAD:…)` | INFO | Skill update via Executor Proposal #1 (see §7) | Author + Executor proposals queued for next skill-improvement cycle. |
| Process Obs #2 | Gitignored backup path semantics inferred at run-time, not documented | INFO | Skill update via Executor Proposal #2 + Author Proposal #2 (see §6 + §7) | Author + Executor proposals queued for next skill-improvement cycle. |

**Zero findings left orphaned.** Both process observations have explicit dispositions; neither gates this SPEC's closure.

---

## 5. Spot-Check Verification

Picked 3 of the largest claims from EXECUTION_REPORT.md and verified against repo.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "§5i exists at line 690 with title 'MCP-first with automatic CLI fallback (OPEN-021 closure, added 2026-05-14)'" | ✅ | `grep -n "MCP-first with automatic CLI fallback" .claude/skills/opticup-executor/SKILL.md` returned `690:5i. **Edge Function deploy — MCP-first with automatic CLI fallback (OPEN-021 closure, added 2026-05-14).**` |
| "Carve-out row at line 927; original 'Tool fails unexpectedly' row preserved at line 926" | ✅ | Read SKILL.md lines 920–929 directly — line 926 is the original unchanged row; line 927 is the new carve-out row referencing §5i and "do NOT escalate (OPEN-021 closure, added 2026-05-14)". |
| "+72/-0 on SKILL.md; additive-only diff (CRLF-aware) = 0" | ✅ | `git diff --numstat` between `a890e19` and `HEAD` confirms `72 0 .claude/skills/opticup-executor/SKILL.md`. Independent `diff --strip-trailing-cr` returns 0 deletions. |

Plus bonus check: `get_edge_function` count post-edit = 6 (baseline 1 in §5h, +5 in new §5i). Criterion 5 satisfied.

**Zero failed spot-checks.** Verdict eligibility preserved at 🟢.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add CRLF-aware diff recipe to `SPEC_TEMPLATE.md` §3 success-criteria boilerplate (Windows-aware additive-only check)

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 Success Criteria — extend the existing example table.
- **Change:** Add a row to the canonical success-criteria example: `| N | Additive-only diff (Windows-aware) | 0 deletions | `diff --strip-trailing-cr <(git show HEAD:<path>) <path> \| grep -c '^<'` returns 0 |`. Add a short Note below the table: "On Windows, plain `diff` against `git show` output produces false-positive deletion counts because the working tree has CRLF and `git show` emits LF. ALWAYS pass `--strip-trailing-cr` when verifying additive-only edits. Cross-confirm with `git diff --numstat <path>` (deletion-count column = 0). Harvested from `EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/FOREMAN_REVIEW.md` Author Proposal #1, 2026-05-14."
- **Rationale:** This SPEC's §3 named a `diff <(git show…)` check WITHOUT `--strip-trailing-cr`, which produced an alarming 990-deletion false-positive when the Executor first ran the check. The Executor re-ran with the flag and confirmed 0 deletions — but the panic-cycle was avoidable. The Template should carry the CRLF-aware form by default so the next additive-only SPEC doesn't repeat this cycle.
- **Source:** EXECUTION_REPORT §3 Deviation #1 + §5 first bullet.

### Proposal 2 — Codify "gitignored deliverable paths" in `SPEC_TEMPLATE.md` §8 Expected Final State guidance

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §8 Expected Final State — add a sub-section just before the "New files" bullet list.
- **Change:** Add: *"**Gitignored deliverable paths** (added 2026-05-14 from `EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/FOREMAN_REVIEW.md` Author Proposal #2). When a §8 'New file' or 'Modified file' lives at a path covered by repo `.gitignore` (most commonly `modules/*/backups/`, `*.local.env`, generated artifacts), the SPEC author MUST mark the path explicitly as `(on disk only — gitignored; do not `git add`)` immediately after the path. Backups under `modules/*/backups/` are gitignored project-wide by design — they are local rollback safety belts, not tracked artifacts. The Executor must still produce the file on disk, but selective `git add` MUST exclude the gitignored path. The clean-repo close obligation applies only to files that are or could be staged."*
- **Rationale:** This SPEC's §8 listed the backup file under "New files" without distinguishing it from the SPEC.md / EXECUTION_REPORT.md / FINDINGS.md which DO get committed. The Executor inferred correctly (the right call is selective `git add` excluding the backup) but the inference cost a few seconds and produced one Real-Time Decision entry in EXECUTION_REPORT §4. The Template should carry the marker by default so the next governance-file SPEC doesn't repeat this micro-inference cycle.
- **Source:** EXECUTION_REPORT §4 Decision #1 + §5 second bullet.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

These mirror the Executor's own EXECUTION_REPORT §8 proposals — accepted verbatim with one foreman amplification noted on Proposal 1.

### Proposal 1 — Add `--strip-trailing-cr` to all `diff <(git show …)` recipes in the executor skill (accepted from EXECUTION_REPORT §8 Proposal #1)

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Code Patterns — How We Write Code Here" → "Git discipline" sub-section. (Amplification beyond the Executor's proposal: place the line in the general "Git discipline" sub-section, not just the visual-re-skin patterns block, because additive-only edits arise on every governance-file SPEC, not just visual re-skins.)
- **Change:** *(Reproduced from EXECUTION_REPORT §8 Proposal 1 — accepted with the foreman amplification above)* "**Windows CRLF-aware diff (added 2026-05-14 from `EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/EXECUTION_REPORT.md` Executor Proposal #1).** When verifying additive-only edits on Windows, always pass `--strip-trailing-cr` to `diff` when one side comes from `git show HEAD:<path>` (LF terminators) and the other comes from the working tree (CRLF terminators per `core.autocrlf=true`). Without the flag, every line will appear as a deletion and the additive-only invariant check will falsely fail. Canonical recipe: `diff --strip-trailing-cr <(git show HEAD:<path>) <path> | grep -c '^<'` should return 0 for a strictly additive edit. Cross-confirm with `git diff --numstat <path>` (deletion-count column = 0)."
- **Rationale:** Accepted in spirit by this Foreman review — see Author Proposal #1 above for the matching SPEC-template-side change. The two proposals are paired: the SPEC template carries the CRLF-aware form in success criteria; the Executor skill carries it as a general Windows-aware verification habit.
- **Source:** EXECUTION_REPORT §8 Proposal 1.

### Proposal 2 — Codify "gitignored backup path is still a required deliverable" in `opticup-executor/SKILL.md` §"Backup Protocol — Before Major Changes" (accepted from EXECUTION_REPORT §8 Proposal #2)

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Backup Protocol — Before Major Changes" sub-section.
- **Change:** *(Reproduced from EXECUTION_REPORT §8 Proposal 2 — accepted verbatim)* "**Gitignored backup paths are still mandatory on disk (added 2026-05-14 from `EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/EXECUTION_REPORT.md` Executor Proposal #2).** All `modules/*/backups/` folders are gitignored project-wide by design — backups are local safety belts, not tracked artifacts. When CLAUDE.md §9 rule 9 or a SPEC's §8 names a backup path, the Executor MUST create the file on disk even though `git add` will refuse it. Do NOT commit with `git add -f` to force-add a backup; do NOT skip the backup because it won't appear in `git status`. The on-disk file is the rollback artifact; git tracking is irrelevant. Log a one-liner in `EXECUTION_REPORT.md` §2 confirming the backup exists if the SPEC's §8 named the path."
- **Rationale:** Accepted in spirit by this Foreman review — see Author Proposal #2 above for the matching SPEC-template-side change. The two proposals are paired: the SPEC template marks gitignored paths explicitly; the Executor skill carries the "still required on disk" rule as default behavior.
- **Source:** EXECUTION_REPORT §8 Proposal 2.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO (skill-only meta-tooling edit, no module-phase status change) | n/a | n/a |
| `docs/GLOBAL_MAP.md` | NO (no new functions / contracts) | n/a | n/a |
| `docs/GLOBAL_SCHEMA.sql` | NO (no schema change) | n/a | n/a |
| Module 1.5 `SESSION_CONTEXT.md` | NO (meta-tooling, not a Module 1.5 substantive deliverable; SPEC §8 explicitly excluded) | n/a | n/a |
| Module 1.5 `CHANGELOG.md` | NO (skill-only; CHANGELOG batches at module-phase close) | n/a | n/a |
| Module 1.5 `MODULE_MAP.md` | NO (no new JS files / functions) | n/a | n/a |
| Module 1.5 `MODULE_SPEC.md` | NO (no business-logic change) | n/a | n/a |
| `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` (OPEN-021 closure) | OPTIONAL — the architect-skill DECISIONS_LOG is owned by the Architect (T2) layer, not the Module Strategist (T3). The next Architect session should append a one-line entry for "OPEN-021 structurally closed via skill update 2026-05-14." | n/a (T2 ownership) | T2 session will pick up at next opticup-architect load. Not a hard-fail because the FOREMAN_REVIEW itself carries the closure note and the SKILL.md edit is the operational closure. |

**No hard-fail violations.** All "should have been updated" rows are NO; the one OPTIONAL row is correctly deferred to the appropriate ownership layer.

---

## 9. Daniel-Facing Summary (Hebrew, ≤ 3 sentences)

> סגרנו דפוס שחזר 5 פעמים בחודש האחרון — מעכשיו כשמערכת ה-MCP של Supabase נכשלת בפריסת פונקציות קצה, האקזקיוטר עובר אוטומטית לפקודת ה-CLI מהמחשב המקומי וממשיך לעבוד ללא צורך בהתערבותך. השינוי עצמו זעיר (תוספת בלבד, ללא מחיקות) ועבר את כל בדיקות הביקורת + הסמוק 7/7 + שער השלמות בירוק. הדרך פתוחה ל-P1.2 ו-P1.3 בלי לעצור עוד פעם על אותו דבר.

---

## 10. Follow-ups Opened

- **None as new SPECs.** This SPEC IS itself the closure of OPEN-021.
- **2 accumulated Author proposals + 2 accumulated Executor proposals** added to the skill-improvement queue (see §6 + §7). They will be applied at the next `chore(skills):` cycle per the Self-Improvement Mandate, anchored to this review's filename.
- **Architect (T2) follow-up — next opticup-architect session:** append a one-line entry to `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` recording "OPEN-021 (MCP `deploy_edge_function` 5xx → CLI fallback) structurally closed via skill update; commit `fde0137`, SPEC `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/`". This is NOT a hard-fail (the FOREMAN_REVIEW itself records the closure); it is documentation alignment at the appropriate ownership layer.

---

## 11. Self-Improvement Mandate Compliance

Per skill mandate: every FOREMAN_REVIEW must carry 2+2 concrete proposals. ✅ Delivered: §6 (Author × 2) + §7 (Executor × 2). All four are file+section+exact-change format; all four are anchored in real pain points from this SPEC's execution (CRLF false-positive + gitignored-backup-path inference). Neither pair is cosmetic. Both pairs will accumulate into the skill files at the next skill-improvement cycle.

**Recurrence check (the 3-strikes rule):** the CRLF-on-diff observation is new (1st occurrence — this SPEC). The gitignored-backup observation is new (1st occurrence — this SPEC). Neither triggers the "3 consecutive reviews → MUST apply before next SPEC" mandate yet. They are queued for normal skill-improvement cadence.

**OPEN-021 itself:** this review formally retires OPEN-021. Pattern was active for 5+ SPECs (DECISIONS_LOG entries citing the pattern: M3_UTM_TRIPLE_LAYER_PERSISTENCE 2026-05-14, STATUS_CHANGE_TRIGGERS_FRAMEWORK 2026-05-13, plus 3 earlier occurrences). The skill change in commit `fde0137` is the structural closure. Future occurrences should be impossible-by-design — if the next P1.2 / P1.3 SPEC hits `deploy_edge_function` 5xx, the Executor auto-falls-back to CLI without escalation. If a 6th occurrence does manifest with escalation, that's a NEW finding (skill edit didn't take) and triggers a fresh investigation, not a re-instatement of OPEN-021.

---

*End of FOREMAN_REVIEW.md.*
