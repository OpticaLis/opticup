# ACTIVATION_PROMPT — REPO_CLEANUP_2026_05_18

**Paste this into a Claude Code session running on Daniel's Windows desktop at `C:\Users\User\opticup`.**

---

You are opticup-executor. Execute the SPEC at:

```
modules/Module 1.5 - Shared Components/docs/specs/REPO_CLEANUP_2026_05_18/SPEC.md
```

**Bootstrap protocol:**

1. Load skill `opticup-executor` (from `.claude/skills/opticup-executor/SKILL.md`).
2. Verify environment per CLAUDE.md §1 First Action: confirm machine = Windows desktop, repo = `opticalis/opticup`, branch = `develop`.
3. Read the full SPEC.md — Phases 1-3 are all there, with measurable success criteria.

**Critical context — what the Cowork-side Architect already did:**

The Cowork-side Architect (Daniel-via-Cowork) ran Phase 1 investigation from inside the Cowork VM and found:
- HEAD = `c2528b0` = origin/develop (zero local commits ahead)
- 2,340 modified files classified as: **2,233 pure CRLF rot + 104 stale-disk + 2 mixed/special**
- All 2,340 files have **zero real content not already in HEAD** — they are FUSE mount snapshot lag + CRLF translation artifacts
- No active parallel CLI session detected
- `.git/index.lock` is a ghost file in the Cowork FUSE mount (3-day-old, blocks git writes there). It may or may not be a ghost on your desktop — verify directly.

**However**, the Cowork-side classification was done through the FUSE mount, which itself may be presenting stale state. **You MUST re-verify Phase 1 from the desktop** before destructive action. The desktop is the source of truth.

**Re-verification steps before any destructive action:**

```powershell
cd C:\Users\User\opticup
git fetch origin
git status --porcelain | Measure-Object -Line   # expect ~2340, may differ on desktop
git rev-parse HEAD
git rev-parse origin/develop                     # should equal HEAD
git log -10 --oneline                            # confirm c2528b0 is current
```

If desktop sees `git status` as **clean** → Cowork-VM-only artifact. SPEC is unnecessary. Report this to Daniel + close SPEC as no-op.

If desktop sees 2,340 modified files as well → real drift. Proceed with SPEC.

If desktop sees DIFFERENT counts → unknown 3rd state. Stop and escalate to Daniel.

**The 4 destructive operations the SPEC authorizes (per §4):**

1. `git checkout HEAD -- .` (atomic restore of all 2,340 files) — requires `.git/index.lock` not to be blocking. If it blocks: `Remove-Item -Force .git\index.lock`, retry.
2. `Remove-Item -Recurse -Force _archive\pr-drafts\`
3. Move 8 M4 QA files into `_archive\m4-crm-cutover-qa-harness-2026-04-29\` + write README.md explaining historical purpose
4. Commit 3 M1 lens Briefs (untracked, in `modules\Module 1 - Inventory Management\architecture-brief\`)

**5 commits expected (per SPEC §9):**

1. `chore(repo): restore working tree from HEAD — VM-mount rot cleanup (REPO_CLEANUP_2026_05_18)`
2. `docs(m1): preserve 3 architecture Briefs from M1 lens Pipelines`
3. `chore(archive): preserve M4 CRM cutover QA harness 2026-04-29 as historical template`
4. `chore(skills): apply VM-rot detection protocol — REPO_CLEANUP_2026_05_18 lessons` (Phase 5 — edits to opticup-strategic SKILL.md + CLAUDE.md §1 step 3a)
5. `chore(spec): close REPO_CLEANUP_2026_05_18 with FOREMAN_REVIEW + EXECUTION_REPORT + FINDINGS`

**Phase 5 (lessons applied) — what to add to skills/docs:**

This is the most important deliverable beyond cleanup. The lesson is: **Cowork VM cannot safely operate on stale-FUSE-mount git state for destructive ops**. The detection protocol:

- **Add to CLAUDE.md §1 step 3a** (Cowork-VM sync gate): a new sub-step that detects ghost `.git/*.lock` files by inode anomalies (stat succeeds but `find` and `rm` fail). If detected → STOP, escalate to a Claude Code session on the desktop. The Cowork VM cannot self-recover from ghost-lock state.

- **Add to `.claude/skills/opticup-strategic/SKILL.md` `## First Action` section**: a new "Pre-Action Cowork-VM viability check" — if any git write is required AND `.git/index.lock` exists as ghost → dispatch to Claude Code instead of attempting in-VM. Pattern: "Cowork = read + plan + author SPECs. Desktop = execute. Never blur the line."

- **Add to `.claude/skills/opticup-executor/SKILL.md`**: counterpart — when receiving a SPEC from Cowork that references Cowork-side investigation, RE-VERIFY classification on the desktop before destructive action (desktop = source of truth, FUSE mount = snapshot).

Write the exact edits as Phase 5 commit. Reference this SPEC slug in commit message.

**Closeout artifacts (Phase 4):**

After Phase 3 commits land:
- `EXECUTION_REPORT.md` — what was done, commit hashes, file counts per bucket
- `FINDINGS.md` — anything unexpected during execution (e.g., desktop classification differed from Cowork)
- These commits go in commit 5 alongside the FOREMAN_REVIEW that Daniel-via-Cowork will write afterwards

**Stop-on-deviation triggers (from SPEC §5/§6):**

- `git push origin develop` rejected → origin advanced mid-Pipeline → STOP + escalate
- Any file shows `wt_b > head_b` AND `delta > line_count` AND is NOT in the already-known Bucket X list → unknown content, STOP
- `npm run verify:integrity` exits 1 → null-byte corruption → STOP
- `.git/MERGE_HEAD` / `REBASE_HEAD` appears mid-Pipeline → another session is active → STOP

**Push when done:**

```powershell
git push origin develop
```

Daniel watches the push from the Cowork side. After successful push + clean tree, Cowork-Architect (Daniel-via-Cowork) takes over to write FOREMAN_REVIEW.md and the final Hebrew summary.

**Estimated wall clock: 30-60 min on desktop** (the bulk-restore is the slow step; backups + commits are fast).

Execute under Bounded Autonomy. Stop on deviation, not on success.
