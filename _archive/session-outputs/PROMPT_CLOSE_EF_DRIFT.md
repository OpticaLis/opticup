# Claude Code — Atomic Task: Close EF Drift on `facebook-campaigns-sync`

> **Purpose:** Single-file commit to align repo with deployed production code. Atomic. No investigation, no other work.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why this exists:** The deployed v2 of `facebook-campaigns-sync` Edge Function (verify_jwt:false + shared_secret in body) is running in production and curl-verified, but the v2 source code on disk is uncommitted — a drift between repo and live state. This task closes that drift. After this, the repo will reflect production reality.

---

## First Action — Session Start (CLAUDE.md §1, mandatory)

Run these in order. No exceptions.

1. **Identify machine & repo.** Tell Daniel which machine you're on (🖥️ Windows desktop / 🖥️ Windows laptop / 🍎 Mac). Run `git remote -v` — must be `opticalis/opticup` (this is the ERP repo, not storefront). If remote does NOT match — STOP and tell Daniel.
2. **Verify branch:** `git branch` — must be on `develop`. If not: `git checkout develop`.
3. **Pull latest:** `git pull origin develop`.
4. **Phase 1 of sync gate (always):** survey untracked paths.
   ```
   git status --porcelain | grep '^??' > /tmp/untracked-before-sync.txt
   cat /tmp/untracked-before-sync.txt
   ```
   If any untracked files exist — note them but do NOT discard. Untracked files are not part of this commit and must remain untouched.
5. **Repo state inspection:** run `git status`. Expected dirty state per Cowork strategic chat:
   - **Modified (tracked):** `supabase/functions/facebook-campaigns-sync/index.ts` (this is what we're committing) + possibly `docs/guardian/DAILY_SUMMARY.md`, `GUARDIAN_ALERTS.md`, `GUARDIAN_REPORT.md` (Sentinel-authored — leave alone).
   - **Untracked:** `outputs/PROMPT_*.md`, `outputs/HANDOFF_*.md`, `outputs/campaign-mockups/`, `outputs/campaign-screen-screenshots/`, `event-open-email.html` (root stray), `.git-test-write`, `.test-write-from-bash` — leave alone.
   If anything else appears as modified that is NOT in the expected list above — STOP and report to Daniel before continuing.
6. **Integrity gate (Rule 31):** `npm run verify:integrity` — exit 0 = continue. Exit 1 = STOP and investigate. Exit 2 = continue, log warnings.

After this confirmation, proceed.

---

## Context

This morning, EF v1 was deployed in commit `2607d1a` (`feat(crm): facebook-campaigns-sync EF for Make → Supabase pipeline`). v1 used `verify_jwt: true` with an `Authorization: Bearer <anon_key>` header. Curl-tested, returned 200, persisted snapshots correctly.

This afternoon, the team hit 401 errors when Make scenario `9126542` tried to call the EF. The fix was to deploy v2: `verify_jwt: false` + an internal `shared_secret` (from `MAKE_SECRET` env) validated in the request body or header. v2 was deployed (curl-verified 200), but the source file on disk was edited in place and **not committed**.

That edited source file is what `git status` now shows as Modified. The deployed EF in production matches the on-disk code — the only thing missing is the git commit. This task closes that gap.

---

## Scope (atomic — one file, one commit)

DO:
- Commit `supabase/functions/facebook-campaigns-sync/index.ts` to `develop` with the message specified below.
- Push to `origin develop`.

DO NOT:
- Touch any other file. No staging of guardian files, no staging of `outputs/`, no staging of root-level strays.
- Re-deploy the EF. v2 is already running in production. This is git-only.
- Run any tests, MCP calls, or investigation steps.
- Modify the file content. Commit it as-is.
- Use `git add -A`, `git add .`, or `git commit -am`. Use `git add <explicit path>` only.
- Create branches, tags, or worktrees.

---

## Steps

### Step 1 — Confirm only the expected file is staged

```
git add supabase/functions/facebook-campaigns-sync/index.ts
git status
```

Expected `git status` after the add:
- Staged: `supabase/functions/facebook-campaigns-sync/index.ts` (1 file).
- Modified (NOT staged): the guardian files (3) — left alone.
- Untracked: same list as before — left alone.

If the staged set has more or fewer than 1 file → STOP and report to Daniel.

### Step 2 — Verify the diff is sane

Run `git diff --staged supabase/functions/facebook-campaigns-sync/index.ts`. Expected: changes consistent with v1→v2 migration:
- Some form of `verify_jwt: false` configuration (or absence of JWT-required check).
- Validation of a shared secret from request body or header (against `Deno.env.get('MAKE_SECRET')` or similar).
- No removal of the core UPSERT logic to `crm_facebook_campaigns` and `crm_ad_spend`.
- No new secrets hardcoded in the source (Rule 23).

If any of the above looks off — STOP and report the diff to Daniel before committing.

### Step 3 — Run pre-commit hooks via the integrity gate one more time

```
npm run verify:integrity
```

Must return exit 0 (or exit 2 with only advisory warnings). The pre-commit hooks will run automatically on the commit; this is a belt-and-suspenders check.

### Step 4 — Commit

```
git commit -m "feat(crm): facebook-campaigns-sync v2 — verify_jwt:false + shared_secret in body"
```

If the pre-commit hook fires and blocks → STOP. Do NOT use `--no-verify`. Report the failure to Daniel verbatim.

### Step 5 — Push

```
git push origin develop
```

Expected: clean push to `origin/develop`. No conflicts (you pulled at session start).

### Step 6 — Verify post-commit state

```
git log --oneline -3
git status
```

Expected:
- Newest commit is the one we just made.
- `git status` shows the same dirty state as session start MINUS `supabase/functions/facebook-campaigns-sync/index.ts` (which is now committed). Guardian files + untracked files are still there — that's correct.

---

## Output Format

Return one consolidated message containing:

1. **First Action confirmation block** (per CLAUDE.md §1).
2. **Step 1 result:** the `git status` output after staging — confirming only the 1 expected file is staged.
3. **Step 2 result:** one-line summary of the diff (e.g. "v1→v2 migration confirmed: verify_jwt removed, shared_secret check added, UPSERT logic intact, no hardcoded secrets").
4. **Step 4 result:** the new commit hash.
5. **Step 5 result:** the `git push` output (success / failure).
6. **Step 6 result:** the new `git log --oneline -3` and the cleaned-up `git status`.
7. **End-of-task confirmation:** "Drift closed. Repo and production now aligned on EF v2."

---

## Stop-on-Deviation Triggers

Stop and ask Daniel before continuing if:

- Any First Action step fails.
- Anything other than the 1 expected file is staged after `git add`.
- `git diff --staged` shows changes inconsistent with the v1→v2 migration described in §Context.
- Pre-commit hook fails or `verify:integrity` returns exit 1.
- `git push` is rejected (conflicts, non-fast-forward).
- Any operation accidentally modifies state in another file. Stop immediately, report.

---

## Time Estimate

2–4 minutes. One file, one commit, one push.

---

## Iron Rule Compliance

- **Rule 23 (no secrets in code/docs):** verify in Step 2 that the diff does NOT introduce any hardcoded secret values. The shared secret should be read from `Deno.env.get('MAKE_SECRET')` (or equivalent), never literal in source.
- **Rule 31 (integrity gate):** ran at session start AND before commit (Step 3). Plus pre-commit hook on commit itself. Triple coverage.
- **CLAUDE.md §9 working rules:**
  - "Never wildcard git" — using `git add <explicit path>` ✅.
  - "Never `git commit -am`" — using `-m` only with explicit `git add` first ✅.
  - "Never push to main" — pushing to `develop` ✅.
  - "One concern per task" — single file, single commit ✅.
- **Rule 21 (No Orphans, No Duplicates):** N/A — committing existing edited code, not adding new code.

---

*End of prompt. After commit + push completes, report back to the strategic chat. Strategic chat will then issue Prompt 2 (Make scenario investigation) starting from a cleaner repo state.*
