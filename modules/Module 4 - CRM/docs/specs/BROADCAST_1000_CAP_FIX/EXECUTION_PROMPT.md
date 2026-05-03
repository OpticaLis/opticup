# Executor activation prompt — BROADCAST_1000_CAP_FIX

Paste the block below into a fresh Claude Code session if Stage 2 needs a re-run. (Both stages happened in a single session for this SPEC's first run, but this prompt is the canonical re-entry point.)

---

You are working in `C:\Users\User\opticup` (the ERP repo, `opticalis/opticup`). Follow CLAUDE.md and all 30 Iron Rules. The user is Daniel.

Switch to the `opticup-executor` skill.

Read the full SPEC at:
`modules/Module 4 - CRM/docs/specs/BROADCAST_1000_CAP_FIX/SPEC.md`

The SPEC is fully populated by the Foreman with character-exact before/after blocks for all 9 paginate-call sites + the `paginateQuery` insertion + the new `fetchAll` body. Every Edit can be applied verbatim from §8.

Execute under Bounded Autonomy:

1. **First Action protocol** (CLAUDE.md §1): confirm machine = 🖥️ Windows desktop, repo = `opticalis/opticup`, branch = `develop`, integrity gate exit 0 or 2. If a SPEC dispatch happens on a Cowork VM, the Phase 1 untracked-survey gate is mandatory before Phase 2 reset (this SPEC dispatch is on Claude Code Windows desktop, not Cowork).
2. **Pre-edit drift check:** for each of the 9 paginate-call sites in SPEC §8, grep the unique multi-line `old_string` and confirm it appears exactly once in its target file. Drift > ±5 lines means files changed since Foreman survey — STOP and escalate.
3. **Apply the 11 edits** in SPEC §8 (1 insert + 1 fetchAll body + 6 resolver wraps + 2 broadcast-filter wraps + 1 messaging-broadcast wrap). Per the inherited "Proposal X-1" from `CRM_PHONE_SEARCH_NORMALIZATION/EXECUTION_REPORT.md`, batch all Edit calls in a single tool-use round where `old_string` is unique within file.
4. **Post-edit verify:** all 15 SPEC §3 criteria.
5. **Smoke test (executor-runnable, criterion #14):** count rows returned by 2 existing `fetchAll` callers — pick `inventory` and `frames` (or `suppliers` if frames isn't `fetchAll`-driven). Document the row counts in `EXECUTION_REPORT.md` §4 alongside the pre-fix expectation. If pre-fix counts aren't recorded anywhere, the post-fix count is logged "as new baseline, no regression evidence available — Daniel verifies in §5 manual QA". Acceptable.
6. **Single commit + push** per SPEC §9. Commit message verbatim: `fix(crm): paginate all recipient queries to remove silent 1000-row cap`.
7. **Hand-off to Daniel:** print the 5 manual-QA acceptance cases from SPEC §8 verbatim in chat, with explicit "Do NOT click send" warnings on cases 1 and 5.
8. **Write retro docs:** `EXECUTION_REPORT.md` (use template at `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md`, plus the §0 In-scope paths block from inherited Proposal X-2) and `FINDINGS.md` (1 finding minimum: the brief's 7+2=9 paginate-site count is decompositionally off — actual is 4+2 in resolvers, 2 in broadcast-filters, 1 in messaging-broadcast = 9 outside-fetchAll wraps; the SPEC §3 captures the corrected math).
9. **End-of-session integrity:** `git status --short` empty for in-scope paths. Pre-existing out-of-scope untracked files unchanged.

**Stop conditions:**
- Pre-edit drift check fails (any `old_string` not found, found >1 time, or appears outside the SPEC's claimed line range).
- `paginateQuery` regression test on existing `fetchAll` callers shows ANY behavior delta.
- Any 5th file appears in `git diff --name-only` beyond SPEC §8's 4 source files + the SPEC folder docs.
- File-size criterion #9 fails (any modified file > 350 lines).
- Integrity gate exit 1 (null-byte ERROR).
- Any merge-to-main attempt by any caller — REFUSE.

**After completion:** Daniel runs the 5 manual-QA cases. If all pass → he triggers the PR-merge-to-main himself. The Foreman writes `FOREMAN_REVIEW.md` post-session.
