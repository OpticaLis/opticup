# ACTIVATION_PROMPT — COWORK_FOREMAN_PUSH_DISCIPLINE

**Paste this into a Claude Code session running on Daniel's Windows desktop at `C:\Users\User\opticup`.**

---

You are opticup-executor. Apply 3 small edits to the opticup-strategic SKILL.md to enforce a discipline that was violated in the REPO_CLEANUP_2026_05_18 Pipeline closeout: the Cowork-side Architect wrote a closing summary to Daniel as if FOREMAN_REVIEW.md was already pushed, when in fact only the on-disk file existed; the user (Daniel) had to manually identify the missing commit + push step.

**No SPEC folder needed** (this is a single small SKILL.md edit). Skip Brief Contract. Just execute these edits + commit + push.

---

## Edit 1 — `.claude/skills/opticup-strategic/SKILL.md` Step 9 (hand-off message)

**Find** the line (around current line ~119):

```
**Step 9 — Hand-off message to Daniel:** "🟢 SPEC X closed. תעביר לקלאוד
קוד: [git add + commit message]. מה הכיוון הבא?"
```

**Replace with:**

```
**Step 9 — Hand-off message to Daniel (STRICT format):** Two-part message,
in this exact order:

1. **First part — Push instruction** (this BLOCKS until Daniel confirms push
   landed): "✋ ה-FOREMAN_REVIEW.md נכתב ל-Cowork outputs ו-FUSE-rendered ל-disk
   ב-`{path}`. הוא **עדיין לא ב-origin**. תעביר לקלאוד קוד:
   `git add {path} && git commit -m '{message}' && git push origin develop`.
   חכה לאישור push לפני שאני סוגר."

2. **Second part — ONLY after Daniel reports push landed** (e.g., "נדחף"
   / "pushed" / commit hash visible in chat): "🟢 SPEC X closed at {hash}.
   מה הכיוון הבא?"

**NEVER emit Part 2 before Daniel confirms Part 1.** Cowork has no way to
verify the push (FUSE mount is read+write but git writes fail per ghost-lock).
Until Daniel says "pushed" or you can see the new commit in
`git log origin/develop` via Cowork bash, the Pipeline is NOT closed. Writing
"🟢 SPEC closed" while the FOREMAN_REVIEW commit is missing is a discipline
violation Daniel had to catch manually in REPO_CLEANUP_2026_05_18.
```

## Edit 2 — `.claude/skills/opticup-strategic/SKILL.md` "NEVER" block

**Find** the existing NEVER list around line ~125:

```
**NEVER:**
- Skip the plain-Hebrew translation before approval.
- Wait for Daniel to ask for the activation prompt — write it proactively
  after his "כן".
- Try to commit/push from Cowork (see "Cowork Environment Constraints").
- Send Daniel a wall of text with file paths instead of conducting the
  dance.
```

**Replace with:**

```
**NEVER:**
- Skip the plain-Hebrew translation before approval.
- Wait for Daniel to ask for the activation prompt — write it proactively
  after his "כן".
- Try to commit/push from Cowork (see "Cowork Environment Constraints").
- Send Daniel a wall of text with file paths instead of conducting the
  dance.
- **Emit "🟢 SPEC closed" / closing summary BEFORE Daniel confirms the
  FOREMAN_REVIEW commit + push landed.** Writing to Cowork outputs is
  authoring, not closing. The Pipeline closes only when origin/develop
  contains the FOREMAN_REVIEW commit. Verify via Cowork bash
  `git log origin/develop -3 --oneline` if Daniel's confirmation is
  ambiguous. (REPO_CLEANUP_2026_05_18 lesson, 2026-05-17 — Daniel had
  to manually identify the missing push.)
```

## Edit 3 — Add to `## Cowork Environment Constraints` section (around line ~155)

**Append** as a new sub-section at the end of that section:

```
### Closing-the-loop discipline

When this skill is acting as Foreman closing a Pipeline (Step 8 + 9 of the
"Strategic-to-Executor Dance"), the closeout has two phases:

**Phase A — Author the artifact (Cowork can do this):**
- Write FOREMAN_REVIEW.md to Cowork outputs path
- FUSE mount auto-syncs to the desktop disk
- Verify the file is on-disk via Cowork bash `ls -la <path>`

**Phase B — Land the artifact in origin (only Claude Code can do this):**
- Daniel hand-carries `git add + commit + push` commands to Claude Code
- Claude Code on desktop pushes to origin/develop
- Daniel reports back "pushed" + (ideally) the commit hash
- Cowork verifies via `git fetch origin && git log origin/develop -3 --oneline`
  to confirm the new commit landed

Phase A WITHOUT Phase B is a half-closed Pipeline. The FOREMAN_REVIEW exists
on disk but not in git history. Future sessions reading the SPEC folder
through git will not see it. **Treat Phase A completion as "ready for
closeout" — not as "closed".** Closed = origin contains the commit.

Same discipline applies to ARCHITECT_DECISION_*.md, RESOLVED_ escalation
renames, and any other Cowork-authored artifact that needs to survive in
git history.
```

---

## Commit + push

```powershell
cd C:\Users\User\opticup
git add .claude\skills\opticup-strategic\SKILL.md
git commit -m "chore(skills): enforce Cowork-Foreman push discipline — REPO_CLEANUP_2026_05_18 follow-up lesson"
git push origin develop
```

Report the resulting commit hash. After that, the Pipeline (and the lesson it codified) is permanently in the skill.

**Estimated wall clock: 5-10 min.**
