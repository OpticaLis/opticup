# Claude Code Prompt — `.gitignore` Session Hygiene Fix

> **For:** Claude Code on Daniel's Windows desktop (`C:\Users\User\opticup`)
> **Issued by:** Supervisor (Cowork) — 2026-05-02
> **Goal:** apply the one-time `.gitignore` fix that stops Sentinel auto-writes, `outputs/` artifacts, and stray test files from polluting `git status` going forward.
> **Pre-approval:** Daniel approved this fix in the Strategic Chat 2026-05-02. No further per-step approval needed; just execute and verify.

---

## Context

The repo (`opticalis/opticup`) has accumulated 120+ untracked entries + 6 modified files because three categories keep appearing in `git status` without ever being meant to live in git:

1. **Sentinel auto-writes** → `docs/guardian/*.md` (regenerated every scan)
2. **Cowork session prompt artifacts** → `outputs/PROMPT_*.md`
3. **Stray test files at repo root** → `.git-test-write`, `.test-write-from-bash`

This prompt applies a one-time fix:
- Add patterns to `.gitignore`
- `git rm --cached` the currently-tracked files in `docs/guardian/`
- Delete the stray test files from disk
- Commit + push

After this lands, future sessions start much cleaner.

---

## Pre-flight

```powershell
cd C:\Users\User\opticup
git remote -v       # must show opticalis/opticup
git branch          # must be on develop
git pull origin develop
```

If branch isn't `develop`: `git checkout develop`. If pull pulls down a lot of unexpected changes: STOP and ping Daniel.

---

## Step 1 — Append to `.gitignore`

Open `.gitignore` in your editor (or use `Add-Content`). Append this block at the END of the file (preserve all existing rules):

```gitignore

# === SESSION HYGIENE — added 2026-05-02 per Supervisor Pattern 20 ===

# Sentinel auto-writes — regenerated every scan, no archival value
docs/guardian/*.md
docs/guardian/

# Cowork session prompt artifacts — per-session, transient
outputs/

# Test scratch files at repo root — should never be created here
/.git-test-write
/.test-write-from-bash
/test-*.txt
/test-*.json

# Editor / OS scratch files
*.tmp
*.bak
~$*
.DS_Store
Thumbs.db

# Per-session QA artifacts at module root level (NOT inside SPEC folders — those are intentional)
modules/*/go-live/_qa_*.json
modules/*/go-live/qa-*.mjs
```

PowerShell one-liner (run from `C:\Users\User\opticup`):

```powershell
@"

# === SESSION HYGIENE — added 2026-05-02 per Supervisor Pattern 20 ===

# Sentinel auto-writes — regenerated every scan, no archival value
docs/guardian/*.md
docs/guardian/

# Cowork session prompt artifacts — per-session, transient
outputs/

# Test scratch files at repo root — should never be created here
/.git-test-write
/.test-write-from-bash
/test-*.txt
/test-*.json

# Editor / OS scratch files
*.tmp
*.bak
~`$*
.DS_Store
Thumbs.db

# Per-session QA artifacts at module root level (NOT inside SPEC folders — those are intentional)
modules/*/go-live/_qa_*.json
modules/*/go-live/qa-*.mjs
"@ | Add-Content -Path .gitignore -Encoding UTF8
```

Verify:
```powershell
Get-Content .gitignore | Select-Object -Last 30
```
You should see the new block at the bottom.

---

## Step 2 — Untrack Sentinel auto-writes

These files are currently tracked by git. `.gitignore` won't help unless we explicitly untrack them. Files stay on disk; git just stops watching them.

```powershell
git rm --cached docs/guardian/DAILY_SUMMARY.md
git rm --cached docs/guardian/GUARDIAN_ALERTS.md
git rm --cached docs/guardian/GUARDIAN_REPORT.md
```

If any of those files don't exist or aren't tracked (you'll get an error like `pathspec 'X' did not match any files`), that's fine — skip and continue.

If there are MORE files in `docs/guardian/` that are tracked, untrack them all:
```powershell
git ls-files docs/guardian/ | ForEach-Object { git rm --cached $_ }
```

---

## Step 3 — Delete stray test files from disk

These have no value, never should have existed:

```powershell
Remove-Item -Path .git-test-write -ErrorAction SilentlyContinue
Remove-Item -Path .test-write-from-bash -ErrorAction SilentlyContinue
```

If they don't exist, no error — `-ErrorAction SilentlyContinue` handles it.

---

## Step 4 — Verify the noise is gone

```powershell
git status
```

**Expected outcome:**
- `.gitignore` is staged (modified)
- `docs/guardian/*.md` files are staged for deletion (deleted from index, will stay on disk)
- The stray test files are GONE from `git status` (you deleted them from disk)
- Remaining untracked items: ONLY the legitimate work backlog (planning artifacts in `__LAUNCH_PLAN_DRAFT__/`, prior session SPEC folders, `outputs/` PROMPT files no longer shown because they're now ignored)

If you still see `outputs/PROMPT_*.md` in untracked — the `.gitignore` rule didn't take effect. Re-check the `.gitignore` syntax.

---

## Step 5 — Commit + push

```powershell
git status                                        # final review
git diff --cached .gitignore                      # confirm only .gitignore additions
git commit -m "chore(repo): session hygiene .gitignore — block Sentinel auto-writes + outputs/ + test scratch (Supervisor 2026-05-02)"
git push origin develop
```

---

## Step 6 — Verify on GitHub

Open https://github.com/opticalis/opticup/commits/develop in a browser. The new commit should be at the top with the expected message. The `.gitignore` file should show the new patterns.

---

## Post-flight

```powershell
git status
```

Should show: a much cleaner working tree — only the legitimate `__LAUNCH_PLAN_DRAFT__/` items + un-committed prior-session SPEC folders remain. Sentinel auto-writes, `outputs/`, test scratch files all gone from view.

Report back to Daniel:
> "תוקן. .gitignore עודכן + commit + push ל-develop. ה-Sentinel writes, ה-outputs/ וקבצי הטסט הסוררים כבר לא מופיעים ב-git status. נשארו רק המשימות הלגיטימיות שצריכות SPEC נפרד (REPO_CLEANUP_2026_05_02)."

---

## Rollback (if anything goes wrong)

```powershell
git revert HEAD
git push origin develop
```

This restores the previous `.gitignore` and re-tracks the Sentinel files. Then ping Daniel about what went wrong.

— Supervisor (Strategic Chat)
