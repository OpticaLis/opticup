# Claude Code Prompt — Campaign Overseer Phase 1 Surgical Commit

> **For:** Claude Code on Daniel's Windows desktop (`C:\Users\User\opticup`)
> **Issued by:** Supervisor (Strategic Chat) — 2026-05-02, after `.gitignore` fix landed (commit 5c65ada)
> **Goal:** commit the Campaign Overseer's 3 Phase 1 files surgically — leave all other untracked items alone.

---

## Context

The Campaign Overseer escalated 2026-05-02 because the repo was too messy to commit through. The Supervisor approved a surgical commit (these 3 files only) + a parallel cleanup SPEC for the rest. The `.gitignore` fix has now landed, so Sentinel writes / `outputs/` / test scratch files no longer appear in `git status`. This prompt commits the 3 Phase 1 files surgically.

**Files in scope (commit only these — do NOT add anything else):**
1. `modules/crm/crm-automation-recipient-resolvers.js` — Campaign Overseer added `attendees_with_active_coupon` recipient type
2. `supabase/functions/send-message/event-variables.ts` — Campaign Overseer fixed `%event_time%` to include end_time
3. `__LAUNCH_PLAN_DRAFT__/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` — captures Phase 1 progress, the next session needs this

The other untracked items in the repo (planning artifacts, prior-session SPEC folders, `OVERNIGHT_*.md` at root, etc.) are intentional backlog — out of scope for this commit, will be handled by the upcoming `REPO_CLEANUP_2026_05_02` SPEC.

---

## Pre-flight

```powershell
cd C:\Users\User\opticup
git remote -v       # must show opticalis/opticup
git branch          # must be on develop
git pull origin develop
```

If anything pulls down — STOP and ping Daniel. The `.gitignore` fix should already be on develop (commit 5c65ada).

Verify the 3 files exist on disk:
```powershell
Test-Path modules\crm\crm-automation-recipient-resolvers.js
Test-Path supabase\functions\send-message\event-variables.ts
Test-Path __LAUNCH_PLAN_DRAFT__\campaign-overseer\CAMPAIGN_OVERSEER_HANDOFF.md
```
All three should return `True`. If any returns `False` — STOP and tell Daniel.

---

## Step 1 — Stage by exact name

**Selective `git add` only — do NOT use `git add .` or `git add -A`.**

```powershell
git add modules/crm/crm-automation-recipient-resolvers.js
git add supabase/functions/send-message/event-variables.ts
git add "__LAUNCH_PLAN_DRAFT__/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md"
```

---

## Step 2 — Verify the staged set is exactly 3 files

```powershell
git diff --cached --name-only
```

**Expected output (exactly these 3 lines, in any order):**
```
__LAUNCH_PLAN_DRAFT__/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md
modules/crm/crm-automation-recipient-resolvers.js
supabase/functions/send-message/event-variables.ts
```

If you see MORE than 3 files staged — STOP, run `git reset HEAD <extra-file>` to unstage, and verify again. The whole point of this surgical commit is to NOT touch anything else.

If you see FEWER than 3 — re-run Step 1 for the missing one.

---

## Step 3 — Commit

```powershell
git commit -m "chore(campaign-overseer): Phase 1 verify — recipient resolver + event-time fix + handoff progress"
```

The 3-line commit captures:
- Recipient resolver: new `attendees_with_active_coupon` type
- Event-variables: `%event_time%` includes end_time
- HANDOFF: captures Phase 1 progress so the next Campaign Overseer session starts with context

---

## Step 4 — Push to develop

```powershell
git push origin develop
```

Capture the new commit hash from the push output (e.g., `5c65ada..XXXXXXX develop -> develop`). Report it to Daniel.

---

## Step 5 — Verify the working tree

```powershell
git status
```

**Expected:**
- Working tree shows the same untracked items as before (planning artifacts, prior SPECs, OVERNIGHT_*.md, etc.)
- The 3 committed files are GONE from `git status` (they're now in develop)
- No extras got pulled in

If the working tree shows anything unexpected (your 3 files still listed as modified, or extra files now appearing) — flag immediately to Daniel.

---

## Post-flight — report back

Once the push succeeds, paste this back to Daniel:

> "ה־commit הכירורגי של הקמפיין־אובוסיר נדחף ל־develop (commit הoperator hash). 3 הקבצים המתוכננים ועוד אפס. שאר הbacklog (הdrafts, ה־SPECs מסשנים קודמים) לא נגעתי בהם — מחכים ל־REPO_CLEANUP_2026_05_02. הקמפיין־אובוסיר חופשי לחזור ל־Phase 1 verify."

---

## Rollback (only if something went catastrophically wrong)

```powershell
git revert HEAD
git push origin develop
```

Then ping Daniel about what went wrong.

— Supervisor (Strategic Chat)
