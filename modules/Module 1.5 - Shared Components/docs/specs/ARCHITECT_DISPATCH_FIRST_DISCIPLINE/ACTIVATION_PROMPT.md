# ACTIVATION_PROMPT — ARCHITECT_DISPATCH_FIRST_DISCIPLINE

**Paste into Claude Code session on Windows desktop at `C:\Users\User\opticup`.**

---

Apply 1 edit to `.claude/skills/opticup-strategic/SKILL.md` to enforce a discipline that was violated today (2026-05-17) during REPO_CLEANUP_2026_05_18 Phase 1 authoring.

**The lesson:** When Cowork-Architect detects an abnormal repo/VM state at session start (2,340 phantom modifications + ghost `.git/index.lock` + FUSE mount inconsistencies), the correct default is to **immediately dispatch a Brief to Claude Code** asking it to investigate from the source-of-truth machine. The wrong default — what happened today — is to spend an hour running investigation probes inside Cowork sandbox, classify files through FUSE mount, then author a 297-line SPEC under FUSE evidence, all of which the executor had to re-verify and partly throw away.

**The Brief-first rule** (this is what we're adding): if any of the abnormal-state triggers in the new sub-section fire at session start, the Architect skips Phase 1 self-investigation and writes a short investigation Brief for Claude Code instead.

---

## Edit — `.claude/skills/opticup-strategic/SKILL.md` — add new sub-section

**Find** the existing `## First Action — Every Session` section header (around line ~130). After the existing Step 0.5 (Cowork-VM viability check) and before the numbered list step 1, **insert** this new sub-section:

```markdown
### Step 0.7 — Abnormal-state triage gate (Cowork sessions only)

After Step 0.5 detects no ghost lock, but BEFORE reading any other files,
run this 5-second triage:

```bash
cd /sessions/*/mnt/opticup
COUNT=$(git status --porcelain | wc -l)
echo "Modified+untracked entries: $COUNT"
```

**If COUNT > 50 entries → STOP self-investigation.** Do NOT run multi-file
probes, do NOT classify buckets, do NOT author a 297-line cleanup SPEC under
Cowork-side evidence. The FUSE mount is showing snapshot lag at scale; any
classification done here will be partially invalid by definition.

**Instead, write a short investigation Brief to outputs immediately:**

```
modules/Module N/docs/specs/{REPO_TRIAGE_SLUG}/INVESTIGATION_BRIEF.md
```

Brief contents (≤ 50 lines):
1. **What Cowork sees** — the raw `git status` summary + the abnormal symptoms
   (count, ghost-lock state, FUSE permissions oddities)
2. **What I cannot verify from here** — explicit list of probes that require
   the desktop (real-file delete, write ops, process inspection, host-side
   `git` state)
3. **What I need Claude Code to determine** — bucket classification on the
   ACTUAL repo, disposition recommendation per bucket, list of any genuinely
   new work to preserve
4. **What Claude Code should NOT do** — destructive ops without coming back
   with classification first
5. **What gets reported back** — short structured summary (bucket counts +
   ambiguous items + recommended disposition)

Then write a 5-line Hebrew hand-off to Daniel:
"זיהיתי {symptom} ב-Cowork ({count} שינויים חשודים). לא חוקר מכאן — ה-FUSE
mount לא אמין למצב כזה. כתבתי INVESTIGATION_BRIEF לקלאוד קוד. תעביר אותו
ושלח לי בחזרה את הסיכום שלו, ואז אני אכתוב SPEC אמיתי מבוסס על תמונת המכונה."

**Why this discipline exists (REPO_CLEANUP_2026_05_18 lesson):** On 2026-05-17,
Cowork-Architect spent ~60 min running probes inside Cowork VM that classified
2,340 modifications + a ghost `.git/index.lock`. The desktop reality, when
finally checked: 6 modifications, no ghost lock. ~95% of the investigation
work was wasted because Cowork's FUSE mount cannot reliably mirror the
desktop's git state when the snapshot is stale. A Brief to Claude Code on the
desktop, written in the first 5 minutes, would have returned a correct
classification in 10-15 minutes and saved 45+ minutes of wasted Cowork
sandbox cycles plus a SPEC re-scoping round.

**Anti-pattern to avoid:** "But I can probe a sample of 20 files first to
confirm whether the count is real" — this is exactly what happened on
2026-05-17. The sample looked conclusive, the bulk classification looked
clean, the SPEC was authored under it. Then the desktop saw 6 entries. The
20-file sample is just as susceptible to FUSE staleness as any other Cowork
read. Don't trust Cowork file-state evidence at scale; dispatch to desktop.

**Exception:** count > 50 of files YOU JUST authored in this Cowork session
(SPECs, briefs, Hebrew drafts) is normal — those are outputs Daniel will hand
over. The trigger is for *modifications to existing tracked files*, not new
authoring output. Differentiate via `git status --porcelain | grep -c '^[ MD]'`
(modified/deleted to tracked files) vs `grep -c '^??'` (new untracked). The
threshold applies to the former only.
```

---

## Commit + push

```powershell
cd C:\Users\User\opticup
git add .claude\skills\opticup-strategic\SKILL.md
git commit -m "chore(skills): add Step 0.7 Abnormal-state triage gate — REPO_CLEANUP_2026_05_18 root-cause lesson"
git push origin develop
```

Also commit the activation prompt for provenance (per the Closing-the-loop discipline added in commit 23ce2ea):

```powershell
git add "modules\Module 1.5 - Shared Components\docs\specs\ARCHITECT_DISPATCH_FIRST_DISCIPLINE\ACTIVATION_PROMPT.md"
git commit -m "docs(spec): preserve ARCHITECT_DISPATCH_FIRST_DISCIPLINE activation prompt for provenance"
git push origin develop
```

Report both commit hashes.

**Estimated wall clock: 5-10 min.**
