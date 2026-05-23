# SPEC — REPO_CLEANUP_MERGE_ENFORCEMENT

> **Authored by:** opticup-strategic (Foreman) · 2026-05-23
> **Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/REPO_CLEANUP_MERGE_ENFORCEMENT_BRIEF.md`
> **Type:** repo hygiene + recurring-failure root-cause fix + develop→main PR deliverable.
> **Trigger:** dirty-tree recurrence (Brief premise: 2,627 files; current actual: 46 untracked + 1006 commits ahead of main — the gap absorbed by this session's earlier `git commit -a` discipline breach).
> **No merge to main by Claude — Daniel-only via PR.** Demo only for tests. No Prizma writes.

---

## 0. Pre-Authoring Reality Check

### Current state probes (pinned this seal)

| Probe | Expected | Actual |
|---|---|---|
| `git status --porcelain \| wc -l` | small | **46** (down from Brief premise of 2,627 — earlier `commit -a` swept ~2,000+ tracked-modified `.claude/skills/**` into VISUAL_FIDELITY_GATE close) |
| `git rev-list --count main..develop` | small | **1006** (Brief premise 79 — many M5 commits since the Brief was authored) |
| Untracked categories | mixed | 30 architecture-brief files / 9 roles+campaigns / 2 paired previews / 7 `tmp-*` junk / 1 `.pr-body.md` / 1 log file |
| `.claude/skills/**` orphans | 0 | **0** (the earlier `-a` sweep absorbed them — but that breach is the very pattern we're now blocking) |
| `scripts/checks/clean-repo-gate.mjs` exists? | no | **no** — creating it (Part B Layer 1) |
| Sentinel mission for clean-repo? | no | **no** — creating mission-15 doc (Part B Layer 2) |

Full categorization + root-cause analysis in `CLEAN_REPO_ROOT_CAUSE.md` (this folder).

### Lessons applied

- **Brief premise vs reality:** the Brief was authored at a point-in-time; numbers drift. SPEC §0 always pins CURRENT state. The Brief's 2,627 has already been partially absorbed; the SPEC reconciles against the live count.
- **Memory `feedback_clean_repo_in_specs`:** the rule existed; enforcement was missing — that's the gap this SPEC closes.
- **The previous session's `commit -a` breach** (VISUAL_FIDELITY_GATE close, `eb12a0d`) is itself an instance of the same class. Layer 1's hook would have surfaced it.

### Cross-Reference Check (Step 1.5)

| New name | Grep result | Resolution |
|---|---|---|
| `scripts/checks/clean-repo-gate.mjs` | 0 hits | NEW — proceed |
| `docs/guardian/sentinel/mission-15-clean-repo-discipline.md` | 0 hits | NEW — proceed (mission numbers 1–14 already taken) |
| SOFT_THRESHOLD / HARD_THRESHOLD (gate constants) | 0 hits | NEW — local consts |

No collisions.

---

## 1. Goal

Three deliverables in one SPEC:
1. **Part A — diagnose** WHY the existing §9 #6 clean-repo rule keeps being violated. Write `CLEAN_REPO_ROOT_CAUSE.md`.
2. **Part B — enforce** through 3 layers (Pattern P31): pre-commit/full-verify hook + Sentinel mission + bootstrap reminders + ownership rule.
3. **Part C — resolve** the current 46-untracked pile via selective-filename commits (NO `-a`), with `.gitignore` patterns for true junk.
4. **Part D — safety checks + PR for Daniel** — confirm GREEN, produce the develop→main compare URL + concise PR title. NO merge by Claude.

---

## 2. Background

Two recurring failures converged: (a) dirty trees keep accumulating despite §9 #6; (b) develop→main merge is overdue (1006 commits behind). The Brief diagnoses (a) as text-only enforcement on an orphan-by-design artifact class (Cowork briefs land untracked; no SPEC owns them) — this SPEC fixes that structurally. (b) is just a consequence — once the tree is clean and CI-green, Daniel can merge via PR.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | SPEC folder | 7 files: SPEC.md + CLEAN_REPO_ROOT_CAUSE.md + EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + REVIEW.md + FOREMAN_REVIEW.md | `ls` |
| 2 | New hook | `scripts/checks/clean-repo-gate.mjs` exists, auto-discovered by `verify.mjs`, with self-test `--test` exit 0 (6/6 cases) | `node scripts/checks/clean-repo-gate.mjs --test` |
| 3 | Hook fires on dirty tree | Manual probe `node scripts/verify.mjs --only=clean-repo-gate --full` against the current 46-pile reports 1 violation (HARD threshold breached pre-cleanup) | (executed pre-cleanup as evidence; post-cleanup returns 0 violations) |
| 4 | Hook no-ops in `--staged` mode | the gate doesn't block commits that are themselves resolving the pile | by-design + unit test |
| 5 | Sentinel mission 15 doc | `docs/guardian/sentinel/mission-15-clean-repo-discipline.md` exists with the protocol | `ls` |
| 6 | Layer 3 — opticup-strategic SKILL appended | "Clean-Repo discipline — Foreman bootstrap + closure" section appended | grep |
| 7 | Layer 3 — opticup-reviewer SKILL appended | "Reviewer audit — Clean-Repo discipline" section appended | grep |
| 8 | Layer 3 — opticup-executor SKILL appended | "Clean-Repo discipline — Executor session-end" section appended | grep |
| 9 | CLAUDE.md First Action §4 updated | references `scripts/checks/clean-repo-gate.mjs` as the enforcement hook | grep |
| 10 | .gitignore additions | `*.log`, `scripts/tmp-*`, `.pr-body.md`, `regopen_email_preview.html` (specific patterns) appended | grep |
| 11 | Pile resolved | `git status --porcelain | wc -l` = 0 after cleanup commits | shell |
| 12 | NO wildcard adds | git log --raw for this SPEC's commits shows only explicit-filename adds (no `-a`/`-A`/`.`) | grep |
| 13 | Integrity gate at every commit | exit 0 or 2 | `npm run verify:integrity` |
| 14 | Smoke: clean-repo-gate post-cleanup | `node scripts/verify.mjs --only=clean-repo-gate --full` returns 0 violations | shell |
| 15 | develop→main PR title | ≤ 90 chars, summarizes M5 + night-run + UI + visual-fidelity gate + cleanup/enforcement | manual |
| 16 | Compare URL produced | `https://github.com/OpticaLis/opticup/compare/main...develop` | text |
| 17 | NO merge by Claude | `main` HEAD unchanged from session start | `git rev-parse main` |
| 18 | NO Prizma writes | confirmed | n/a (no DB writes this SPEC) |

---

## 4. Autonomy Envelope

### Executor CAN
- Create `scripts/checks/clean-repo-gate.mjs` + run its `--test`.
- Create `docs/guardian/sentinel/mission-15-clean-repo-discipline.md`.
- Edit `CLAUDE.md` First Action §4 (append-style — reference the new gate).
- Edit `opticup-strategic` / `opticup-reviewer` / `opticup-executor` SKILL.md (append-style — Iron Rule 32 spirit).
- Edit `.gitignore` (additive only).
- Delete from disk (NOT from git history): `scripts/tmp-*` files + `dev-server.log` + `.pr-body.md` + `regopen_email_preview.html` IF they are clearly junk.
- Commit the real-work pile in selectively-grouped commits (M5 briefs / M1.5 briefs / M4 briefs / roles+campaigns) — explicit filenames ONLY.
- Run `npm run verify:integrity` + `node scripts/verify.mjs --only=clean-repo-gate --full` for safety checks.
- Generate the compare URL + PR title text.

### Executor MUST STOP
- Any `git add -A` / `git add .` / `git commit -a` / `git commit -am` / `--no-verify` usage.
- Any deletion of a file whose category is ambiguous — escalate to Daniel.
- Any `git push` to main / any `git checkout main` / any `git merge` to main.
- Any Prizma DB write.

---

## 5. Stop-on-Deviation

- Clean-repo-gate `--test` fails → STOP (the hook itself is broken).
- After cleanup, gate still fires HARD → STOP (something not resolved correctly).
- Any pre-commit hook returns exit 1 → STOP (NEVER bypass).

---

## 6. Rollback

All edits additive (governance + new files). Rollback = `git revert` the SPEC's commits. Junk-file deletions are unrecoverable from disk but the same names will be regenerated by future Cowork sessions if needed (they're tmp).

---

## Destructive Operations

This SPEC declares the following destructive-class operations per Iron Rule 32:

1. **Delete from disk** (untracked files only — never `git rm`): `dev-server.log` + `.pr-body.md` + `regopen_email_preview.html` (still committed as part of regopen briefs paired) + `scripts/tmp-build-launch-v2-json.mjs` / v3 / v4 + `scripts/tmp-extract-launch-json.mjs` + `scripts/tmp-fashion-reading.json` + `scripts/tmp-luxury-reading.json` + `scripts/tmp-mint-prizma-jwt.mjs` — 9 paths total. **None tracked in git.** Deletion happens with `rm` on disk. (`regopen_email_preview.html` is REMOVED from this list — actually committed as paired work; see clarification below.)

   **Clarification:** `regopen_email_preview.html` IS committed in Group D (paired with the regopen_email_pricing_block_copy_draft.md brief). Not deleted. Net deletions: 8 files (1 log + 1 PR draft + 6 tmp scripts + 1 tmp json — wait, let me recount: tmp-build-launch-v2-json.mjs / v3 / v4 / extract-launch-json (4 .mjs) + tmp-fashion-reading.json / tmp-luxury-reading.json (2 .json) + tmp-mint-prizma-jwt.mjs (1 .mjs) = 7 tmp + dev-server.log + .pr-body.md = 9 files deleted from disk).

2. **Append edits** to 4 governance files: CLAUDE.md §1 #4 + 3 SKILL.md files (opticup-strategic, opticup-reviewer, opticup-executor). NO removals.

3. **New files:** SPEC folder retros (6 files) + `clean-repo-gate.mjs` + `mission-15-*.md` + updated `.gitignore`.

**NO DROP. NO TRUNCATE. NO DELETE from DB. NO `git rm` (untracked deletions only). NO Prizma writes. NO main merge.**

---

## 7. Out of Scope

- The actual Sentinel run of Mission 15 (mission DOCUMENTED here; running scheduled scans is separate infrastructure).
- M6 / future modules (this SPEC happens BEFORE M6 per Brief).
- DB-level changes.
- Any cleanup of `.claude/skills/**` modifications (current tree has 0).
- Merging develop to main (Daniel-only via PR — Claude stops at the URL).

---

## 8. Expected Final State

### New files
- `scripts/checks/clean-repo-gate.mjs` (~165 lines incl. self-test).
- `docs/guardian/sentinel/mission-15-clean-repo-discipline.md`.
- SPEC folder retros (6 files).

### Modified files (additive only)
- `.claude/skills/opticup-strategic/SKILL.md` — Foreman bootstrap + closure section.
- `.claude/skills/opticup-reviewer/SKILL.md` — Reviewer audit section.
- `.claude/skills/opticup-executor/SKILL.md` — Executor session-end section.
- `CLAUDE.md` — First Action §4 references the gate.
- `.gitignore` — patterns for `*.log`, `scripts/tmp-*`, `.pr-body.md`, `regopen_email_preview.html`.

### DB / Storage state
- Unchanged. No DDL. No DML.

### Commits (planned, selective `git add` by explicit filename)
1. `docs(m1.5): seal REPO_CLEANUP_MERGE_ENFORCEMENT SPEC + root-cause analysis`
2. `feat(infra): clean-repo-gate.mjs hook + Sentinel mission 15 protocol (Layer 1 + 2)`
3. `feat(skills): clean-repo discipline appended to Foreman + Reviewer + Executor + CLAUDE.md §1 #4 (Layer 3)`
4. `chore(repo): .gitignore patterns for tmp/log/preview files`
5. `chore(repo): M5 architecture-briefs (this session — 12 files)`
6. `chore(repo): M1.5 architecture-briefs (4 files — VFG + REPO_CLEANUP_MERGE_ENFORCEMENT briefs + M5_M8 review)`
7. `chore(repo): M4 architecture-briefs (6 audit + investigation files)`
8. `chore(repo): roles + campaigns work artifacts (9 paths)`
9. `docs(m1.5): close REPO_CLEANUP_MERGE_ENFORCEMENT — retros + verify GREEN`

### Junk deletions (untracked → disk-rm)
- `dev-server.log` + `.pr-body.md` + `scripts/tmp-build-launch-v2-json.mjs` / `v3` / `v4` + `scripts/tmp-extract-launch-json.mjs` + `scripts/tmp-fashion-reading.json` + `scripts/tmp-luxury-reading.json` + `scripts/tmp-mint-prizma-jwt.mjs` = 9 files.

---

## 9. Dependencies / Preconditions

- VISUAL_FIDELITY_GATE in place (uses Iron Rule 32 append-style spirit).
- Existing verify.mjs auto-discovery works for `scripts/checks/*.mjs`.
- Pre-commit hook calls `verify.mjs --staged` (the gate no-ops in --staged so commits proceed).

---

## 10. Pre-Merge Checklist

- [ ] All 18 §3 success criteria pass.
- [ ] `node scripts/checks/clean-repo-gate.mjs --test` exit 0 (6/6).
- [ ] `git status --porcelain | wc -l` = 0 post-cleanup.
- [ ] `npm run verify:integrity` exit 0/2.
- [ ] `node scripts/verify.mjs --full` exit 0/2 (clean-repo-gate now passes since pile resolved).
- [ ] NO `-a` / `add .` / `commit -am` / `--no-verify` in any commit.
- [ ] develop→main PR title + compare URL produced for Daniel.
- [ ] Claude did NOT merge / push to main.

---

*End of REPO_CLEANUP_MERGE_ENFORCEMENT SPEC. Diagnose → enforce → clean → PR. Daniel merges.*
