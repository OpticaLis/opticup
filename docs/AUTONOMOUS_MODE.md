# Autonomous Mode — Execution Protocol

> **Status:** Active as of Phase 0 completion (April 2026).
> **Model:** Bounded Autonomy with automated rails.
> **This file:** the full protocol. Shorter summary lives in CLAUDE.md Section 11.

---

## 1. What Bounded Autonomy Means

An approved plan with explicit success criteria is a green light for end-to-end execution. Claude Code stops on deviation, not on success. Checkpoints are reports, not requests for approval.

**This mode is trusted because of the rails, not despite the absence of them.** Without Phase 0 infrastructure, autonomous execution would rely on Claude Code self-reporting correctness. With Phase 0, independent verification runs at multiple layers and catches failures regardless of what the executor believes about its own work.

## 2. The Rails (What Phase 0 Built)

### Layer 1 — Pre-commit hook
Location: `.husky/pre-commit` runs `node scripts/verify.mjs --staged`.
What it catches: rule violations in files being committed RIGHT NOW. Fast (<5 seconds for typical commits). Blocks commits with violations. Warnings produce exit 2 (surfaces information but does not block the commit).
Rules enforced:
- file-size (350-line hard max, 300-line soft target)
- rule-14 (tenant_id on every new table in SQL files)
- rule-15 (RLS policy for every CREATE TABLE)
- rule-18 (UNIQUE constraints include tenant_id)
- rule-21 (no duplicate function names across JS files)
- rule-23 (no secrets in committed files)

### Layer 2 — Local --full verification
Location: `node scripts/verify.mjs --full`.
What it catches: same rules as Layer 1, but across the entire repo instead of just staged files. Run manually before phase boundaries or when investigating drift.
Opt-in extensions (local only, not CI):
- `--with-db` — runs smoke-test.mjs / schema-diff.mjs (requires credentials)
- `--with-server` — runs full-test.mjs (requires dev server on localhost:4321)

### Layer 3 — GitHub Actions CI
Location: `.github/workflows/verify.yml`.
Triggers: push to develop, PR targeting main or develop.
Runs: `verify.mjs --full` + `schema-diff.mjs`.
Clean environment: no dependency on the developer's local machine state.
Current status: `continue-on-error: true` on baseline-affected steps per Phase 0 Plan Decision 5. Enforcement (removal of continue-on-error + required-status-check in branch protection) happens after baseline cleanup.

### Layer 4 — Schema drift detection
Location: `scripts/schema-diff.mjs`.
Compares: `docs/GLOBAL_SCHEMA.sql` against live Supabase via information_schema fallback probing.
Limits: one-directional (declared→live), cannot detect live-only tables or views. Tracked in TECH_DEBT #5, #6.

## 3. The Execution Loop

For each step in an approved plan:

1. Execute the step.
2. Compare actual result to expected criterion.
3. **Match** → continue to next step without asking.
4. **Mismatch** → STOP immediately, report the deviation, wait for instructions.
5. At natural boundaries (3–5 steps or between logical phases), emit a concise progress report. This is a report, not a question.
6. At the end of the full task, emit a final report: commits made, commit hashes, final `git status`, any warnings seen during execution.

## 4. Stop-on-Deviation Triggers (non-negotiable)

Stop and wait for instructions if ANY of these happen:

- Unexpected files modified, untracked, or deleted (beyond what was already handled in First Action step 4)
- Line counts, file counts, or command outputs that do not match the stated expectation
- Any error, warning, or non-zero exit code from any command (except documented continue-on-error cases in CI workflows)
- Ambiguity in how to proceed that isn't resolved by the plan
- A new decision not covered by the original plan
- Branch mismatch, repo mismatch, path mismatch
- Any iron/SaaS/hygiene rule would be violated by the next step
- Pre-commit hook blocks a commit and the resolution is not obvious from the violation message
- CI fails on a newly-introduced check (not continue-on-error cases)

## 5. Do NOT Stop When

- A deterministic step in an approved plan completed exactly as expected
- The next step is "obvious" — if it's in the plan and the previous step matched expectations, execute it
- You feel uncertain in a "should I double-check with the user?" way — the answer is no. Safety comes from stopping on deviation, not from stopping on success.

## 6. Rails-Informed Decisions During Execution

When making small in-flight decisions (e.g., choosing variable names, refactoring helpers, adjusting file layout), optimize for the rails catching mistakes:

- **Unique function names across files** → rule-21 won't block you
- **File size under 300 → soft target, under 350 hard** → file-size won't warn or block
- **Every new SQL table has tenant_id + RLS + UNIQUE(..., tenant_id)** → rule-14/15/18 won't block
- **No secrets in code, comments, or docs** → rule-23 won't block

If you find yourself wanting to disable a check or add an escape hatch, STOP. That's a signal the rails are working and catching a real problem. Report and wait.

## 7. Commit Discipline (aligned with CLAUDE.md Section 9)

- Selective `git add` by filename only. Never `git add -A` or `git add .`.
- Commit messages: present-tense English, scoped (`feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`).
- Multi-file commits are fine; multi-concern commits are not. One logical change per commit.
- Never push to main. Never merge to main. Only the user does that, manually, after QA.

## 8. Reporting Format

Final report after each autonomous run must include, at minimum:
- Commit hashes for every commit made
- `git status --short` output (to prove nothing unintended was touched)
- Any test results with expected vs actual
- Any warnings or notable findings encountered
- "Stopped. Awaiting instructions." as the closing line

## 9. What's NOT Yet Automated

These are tracked in TECH_DEBT.md and intentionally deferred:

- Full-accuracy schema diff (current MVP uses regex + probing)
- View drift detection (requires GLOBAL_SCHEMA.sql to declare views first — ERP TECH_DEBT #6)
- Pixel-level visual regression (Storefront has DOM-hash only, TECH_DEBT item for Phase 0.5)
- Multi-phase overnight runs (Cowork orchestration — Phase 1)
- Phone-based deviation approvals (Dispatch integration — Phase 2)

## 10. References

- Phase 0 plan: see PHASE_0_PROGRESS.md for completion summary
- Rules: CLAUDE.md Sections 4–6 (Iron Rules 1–23)
- Reference files index: CLAUDE.md Section 12
- TECH_DEBT.md: known deferred items per repo

---

*This file is the authoritative protocol for Bounded Autonomy execution. When CLAUDE.md Section 11 and this file disagree, this file wins.*
