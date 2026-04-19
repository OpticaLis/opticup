# Dispatch Prompt — STOREFRONT_DEVELOP_RESET

> **Paste this entire text into a new Claude Code session on the Windows desktop.**
> **Machine:** 🖥️ Windows desktop
> **Repos needed:** `C:\Users\User\opticup` (ERP) + `C:\Users\User\opticup-storefront`
> **Estimated time:** 5–10 minutes
> **Changes produced:** Storefront develop branch reset to match main. Tag preserves old state.

---

## Context — What Happened and Why You're Here

The `opticup-storefront` repo's `develop` branch is out of sync with `main` (production). Here's the situation:

### Timeline (2026-04-18):
1. **DNS switch executed** — `prizma-optic.co.il` moved from WordPress to Vercel. Production is live.
2. **18 perf/SEO changes** were applied to develop in one session, merged to main → **PageSpeed dropped 89→47**.
3. **Main was reverted** — commit `8c362c1` restored the pre-changes tree. Favicon added as `b1a7312`. Production is stable at PageSpeed ~89.
4. **Develop was NOT reverted** — it still contains the perf commits that caused the regression.
5. **A diagnostic SPEC ran** (STOREFRONT_REPO_STATE_SNAPSHOT, commit `c36a8b3` in ERP repo) and confirmed:
   - develop is clean (1 uncommitted file: `SESSION_CONTEXT.md` with real docs)
   - develop's tree differs from main's by 48 files — the reverted perf work
   - Build passes on develop
   - All critical files intact

### What you're doing now:
Resetting develop to match main so we have a clean base. The perf work is preserved as a git tag for future cherry-picking.

**This is a destructive operation (force-push to develop)** — it is explicitly authorized by Daniel via the strategic architect. The tag ensures nothing is lost.

---

## Your Mission

**Read the SPEC and execute it.** The SPEC is at:
```
C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\STOREFRONT_DEVELOP_RESET\SPEC.md
```

It contains 6 steps. Execute them in order. The core operations are:

1. **Commit** the one uncommitted file (`SESSION_CONTEXT.md`) on develop
2. **Tag** develop as `perf-post-dns-reverted` (preserves the perf work)
3. **Reset** develop to `origin/main` (`git reset --hard origin/main`)
4. **Force-push** develop (`git push --force-with-lease origin develop`)
5. **Verify** build + critical files
6. **Write retrospective** to ERP repo SPEC folder

### Key Safety Rules

- **The tag MUST be created and pushed BEFORE the reset.** This is the rollback path.
- **Use `--force-with-lease`, NOT `--force`.** If it's rejected, STOP — another machine pushed.
- **Do NOT touch main.** No checkout, no push, no merge.
- **`origin/main` must be at `b1a7312`** — verify before starting. If it's different, STOP.
- **`origin/develop` must be at `0a04ccf`** — verify before starting. If it's different, STOP.
- **If `git status` shows MORE than just `SESSION_CONTEXT.md` modified** → STOP. The state changed since the snapshot.

### Key Paths

- **Storefront repo:** `C:\Users\User\opticup-storefront`
- **ERP repo:** `C:\Users\User\opticup`
- **SPEC location:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\STOREFRONT_DEVELOP_RESET\SPEC.md`

### Reference Hashes

| Hash | What | Branch |
|------|------|--------|
| `b1a7312` | Eye favicon (main tip) | main |
| `8c362c1` | Revert commit | main |
| `62ebe0e` | Last known-good merge | main |
| `0a04ccf` | Last perf commit (develop tip before this SPEC) | develop |
| `3f9c567` | First perf commit | develop |

### After You Finish

Daniel and the strategic architect will:
1. Read your report
2. Author a separate SPEC to cherry-pick individual perf changes with PageSpeed measurement
3. Each perf change gets its own commit + measurement — never batched again

**Your job is the reset. Clean, tagged, verified.**
