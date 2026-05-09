# Claude Code — Atomic Task: Resume Fix from Step 3 — Edit, Deploy, Update Make, Commit

> **Purpose:** Continue the rotation/fix sequence from Step 3 of the original plan. `MAKE_SECRET` is now set on Supabase Edge Function secrets (confirmed by Daniel via dashboard). The new value lives in `~/.optic-up/make-secret.txt`. This prompt edits the EF source to read from env, re-deploys, updates Make scenario `9126542` with the new value, and commits the cleaned source.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why:** Part 1 generated the secret to file. Daniel set it on Supabase. Now finish the work.

---

## Current Repo State (must match)

- `supabase/functions/facebook-campaigns-sync/index.ts` — modified (not staged), still has the literal `SHARED_SECRET` constant.
- `docs/guardian/*` (3 files) — modified (Sentinel-authored, leave alone).
- Various `outputs/PROMPT_*.md`, `outputs/HANDOFF_*.md`, `outputs/campaign-*` — untracked, leave alone.
- `event-open-email.html`, `.git-test-write`, `.test-write-from-bash` — untracked, leave alone.
- `~/.optic-up/make-secret.txt` exists, 71 chars, contains the new secret.
- No file is staged. No commit has been made by prior prompts in this session.

If `git status` shows anything different — STOP and report.

---

## Pre-flight — Confirm secret available locally

```bash
test -f ~/.optic-up/make-secret.txt && wc -c < ~/.optic-up/make-secret.txt
```

Expected: `71`. If not — STOP. The file should still be there from Part 1.

Also confirm the value is what the deployed Supabase secret expects. We don't have a way to query the Supabase secret value directly (it's hashed/digested in the dashboard), so trust Daniel's confirmation that he set it correctly. The curl probe at Step 4 below will verify.

---

## First Action — Continuation

This is a continuation. Skip the full First Action protocol. Confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git status` matches the expected state above.
- Secret file exists, 71 bytes.

Confirm to Daniel: "Resuming from Step 3. Secret file present. Beginning EF source edit."

---

## Scope

DO:
- Edit `supabase/functions/facebook-campaigns-sync/index.ts` — replace literal with env reference + add safety check.
- Re-deploy the EF via `mcp__supabase__deploy_edge_function` (or CLI fallback).
- Curl-verify the deployed EF accepts the new secret and rejects the old one.
- Update Make scenario `9126542`'s HTTP module body with the new secret value.
- Commit + push the EF source change.

DO NOT:
- Touch any file other than `supabase/functions/facebook-campaigns-sync/index.ts`.
- Activate Make scenario `9126542` — it stays DEACTIVATED.
- Run any database SQL.
- Modify any other Make scenario.
- Stage or commit Sentinel guardian files or untracked files.
- Use `git add -A` or `git add .`.
- Paste either the new or the old secret value in chat output. Mask both with prefix-only.
- Push to `main`.

---

## Detailed Steps

### Step 3 — Edit the on-disk EF source

Open `supabase/functions/facebook-campaigns-sync/index.ts`. Make the following changes:

**Change A — Replace the literal constant** (around lines 21–22):

Before:
```typescript
const SHARED_SECRET = "fbsync_<old-literal>";
```

After:
```typescript
const SHARED_SECRET = Deno.env.get("MAKE_SECRET");
```

**Change B — Add an early-return safety check.** Inside the request handler, BEFORE the body-field comparison on line ~80, add:

```typescript
if (!SHARED_SECRET) {
  return new Response(
    JSON.stringify({ ok: false, error: "Server configuration error: MAKE_SECRET not set" }),
    { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
```

Place it right after `req.json()` parsing succeeds and before `if (body.shared_secret !== SHARED_SECRET)`. This ensures missing-env-var fails loudly with a 500, distinguishing it from wrong-secret (401).

**No other behavior changes.** The body-field comparison on line ~80 (`body.shared_secret === SHARED_SECRET`) stays exactly as it is.

After the edits, verify:
- File still parses (no syntax errors). Run `deno check supabase/functions/facebook-campaigns-sync/index.ts` if available.
- No literal secret remains anywhere in the file:
  ```bash
  grep -i "fbsync_" supabase/functions/facebook-campaigns-sync/index.ts
  ```
  Expected output: empty (zero matches).
- File length within Rule 12 cap (≤350 lines). The change adds ~6 lines.

If grep finds any match — STOP. The cleanup is incomplete.

### Step 4 — Re-deploy the EF

Use `mcp__supabase__deploy_edge_function` for `facebook-campaigns-sync` from the on-disk source.

If MCP fails (known issue per project memory): fall back to CLI:
```bash
supabase functions deploy facebook-campaigns-sync --project-ref tsxrrxzmdxaenlvocyit
```

After deploy, run TWO curl probes:

**Probe 1 — New secret (expected: 200):**
```bash
NEW_SECRET=$(cat ~/.optic-up/make-secret.txt)
curl -sS -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync' \
  -H 'Content-Type: application/json' \
  -d "$(cat <<EOF
{
  "shared_secret": "$NEW_SECRET",
  "tenant_slug": "demo",
  "campaigns": []
}
EOF
)"
```

Expected: HTTP 200, body `{"ok":true,"processed":0,...}` (empty array, nothing to process — but secret check passed).

**Probe 2 — Old secret (expected: 401 or 403):**
The OLD literal value can be retrieved from `git show HEAD:supabase/functions/facebook-campaigns-sync/index.ts | grep -i fbsync_` (it's still in the last committed version of the file). Run:

```bash
OLD_SECRET=$(git show HEAD:supabase/functions/facebook-campaigns-sync/index.ts | grep -oE 'fbsync_[a-f0-9]+' | head -1)
curl -sS -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync' \
  -H 'Content-Type: application/json' \
  -d "$(cat <<EOF
{
  "shared_secret": "$OLD_SECRET",
  "tenant_slug": "demo",
  "campaigns": []
}
EOF
)"
```

Expected: HTTP 401 or 403 with an error response (rotation succeeded; old secret no longer valid).

In your output:
- Report Probe 1 result: HTTP status + body summary.
- Report Probe 2 result: HTTP status + body summary.
- **Mask both secret values** in any echoed shell command — show only `fbsync_<first-4-chars>...`.

If Probe 1 returns anything other than 200 — STOP. Roll back: redeploy from `git show HEAD:supabase/functions/facebook-campaigns-sync/index.ts` content. Report failure.

If Probe 2 returns 200 — STOP. Rotation didn't take effect. The deployed EF is still reading the old literal somehow. Investigate before continuing.

### Step 5 — Update Make scenario `9126542`

Use `mcp__make__scenarios_get` to fetch `9126542`'s current blueprint. Locate the HTTP module — it should be the last module (`http:ActionSendData`) and its `body` field contains the JSON template with `shared_secret` (or `secret`) field referencing the OLD value as a literal.

Construct the updated body. Read the new value:
```bash
NEW_SECRET=$(cat ~/.optic-up/make-secret.txt)
```

Use `mcp__make__scenarios_update` to apply the change. The exact tool input depends on Make's API — likely you'll patch the blueprint's modules array, replacing the OLD secret literal with the NEW one wherever it appears in the body field of the HTTP module.

Constraints:
- Do NOT activate the scenario. It stays `isActive: false`.
- Do NOT modify any other module in the scenario (listCampaigns, aggregators, etc. all stay as-is).
- Do NOT modify any other scenario.

After the update, fetch the scenario again with `scenarios_get` to verify:
- The HTTP module body contains `fbsync_<new-first-4-chars>...` (the new secret prefix).
- The HTTP module body does NOT contain the old secret prefix.
- `isActive: false`.

In your output, report:
- Scenario fetched successfully.
- HTTP module location confirmed (module ID + position).
- Body updated successfully.
- Verification: new prefix present, old prefix absent, isActive false.
- Mask all secret values.

If `mcp__make__scenarios_update` fails or the verification shows the old prefix still present — STOP and report. The rotation is incomplete (Make still has the old value, but Supabase has the new one — calls would fail if scenario were activated). Daniel can update Make manually via dashboard if needed.

### Step 6 — Commit + push

Stage only the EF source file:

```bash
git add supabase/functions/facebook-campaigns-sync/index.ts
git status
```

Confirm:
- Staged: 1 file (the EF source).
- Modified (NOT staged): the 3 guardian files (left alone).
- Untracked: the prior outputs/strays (left alone).

If anything else is staged — STOP and report.

**Critical: verify the staged diff contains NO secret literal.** Run:
```bash
git diff --staged | grep -iE 'fbsync_[a-f0-9]+'
```

Expected: zero matches. The diff should show only:
- The literal constant LINE being removed (which had the old secret).
- The `Deno.env.get("MAKE_SECRET")` line being added.
- The 6 lines of safety check.

The removed line WILL contain the old literal, but that's a deletion. After commit, the literal lives only in git HISTORY (the parent commit `2607d1a` — the original v2 deploy commit landed it there if it was committed at all... but checking history: prior commit `2607d1a` was the v1 deploy, and v2 was never committed to git, only to disk + production. So the old literal NEVER entered git history.) The `git diff --staged` may show the removed line with the old literal — that's fine for the diff itself, but means the removed line was on disk but never committed. Confirm by inspecting:
```bash
git log --all --oneline --source -- supabase/functions/facebook-campaigns-sync/index.ts | head -5
```

If any historical commit has the old literal `fbsync_<chars>` — flag it. (Likely none do — the v2 with literal was never committed. v1 had a different structure entirely. But verify.)

Run integrity gate:
```bash
npm run verify:integrity
```

Must exit 0 (or exit 2 advisory).

Commit:
```bash
git commit -m "feat(crm): facebook-campaigns-sync v3 — env-based MAKE_SECRET (rotated)"
```

If pre-commit hook fails — STOP. Do NOT use `--no-verify`.

Push:
```bash
git push origin develop
```

### Step 7 — Final verification

```bash
git log --oneline -3
git status
git show --stat HEAD
```

Confirm:
- Newest commit is the v3 commit.
- `git status` shows the same dirty state as session start MINUS the EF source. Guardian files + untracked still there.
- `git show --stat HEAD` shows ONLY `supabase/functions/facebook-campaigns-sync/index.ts` modified.
- `git show HEAD | grep -iE 'fbsync_[a-f0-9]+'` — checks if the commit body contains a literal. Diff context lines might show the removed literal, but the new committed source must NOT have any. Inspect the output carefully:
  - Lines starting with `-` (deletions) showing `fbsync_...` are FINE — they show what was removed.
  - Lines starting with `+` (additions) showing `fbsync_...` are A BUG — STOP and revert.

Run final smoke curl with the new secret one more time, confirm 200.

---

## Output Format

Return one consolidated message containing:

1. **Pre-flight:** secret file present, 71 bytes confirmed.
2. **Step 3 result:** source edits applied (constant replaced, safety check added, `grep fbsync_` returns empty).
3. **Step 4 result:**
   - EF re-deployed via [MCP / CLI]. Deploy succeeded.
   - Probe 1 (new secret): HTTP 200, processed: 0. ✅
   - Probe 2 (old secret): HTTP 401/403. ✅
4. **Step 5 result:** Make scenario `9126542` updated. New prefix in body, old prefix absent, isActive=false.
5. **Step 6 result:** commit hash + push success. Diff sanity check passed (additions don't contain literal).
6. **Step 7 result:** final `git log` + `git status` + `git show --stat HEAD`.
7. **End-of-task confirmation:** "Drift closed. Secret rotated. EF v3 deployed and curl-verified. Make 9126542 updated (still DEACTIVATED). Source committed to develop. Ready for next prompt (Make body serialization investigation)."
8. **Next-step note for Daniel:** "Recommend deleting `~/.optic-up/make-secret.txt` after this task closes — secret now lives only in Supabase env + Make scenario, both authoritative. The local file is no longer needed."

---

## Stop-on-Deviation Triggers

Stop and ask Daniel before continuing if:

- Pre-flight secret file is missing or wrong size.
- On-disk EF source has changed since Part 1 (someone or something else edited it).
- TypeScript/Deno parse error after edit.
- `grep fbsync_` after edit finds matches.
- Probe 1 (new secret) returns anything other than 200.
- Probe 2 (old secret) returns 200 — rotation didn't take.
- `mcp__make__scenarios_update` fails or verification shows old prefix still present.
- `git diff --staged | grep` finds added literal (not removed).
- Pre-commit hook fails or `verify:integrity` returns exit 1.
- `git push` is rejected.
- Anything modifies state in a file outside the EF source.

---

## Rollback Plan

If anything breaks after Step 4 (EF re-deployed but downstream fails):

1. Restore on-disk source: `git checkout HEAD -- supabase/functions/facebook-campaigns-sync/index.ts`.
   This brings back the v1 (committed) source — note: this is NOT v2, since v2 was never committed.
2. The repo will then be CLEAN on this file (matching v1 state).
3. **Now there's a problem:** the deployed EF would be the new env-based version, but the source on disk is v1 (older, with `verify_jwt: true` and no env). The EF v3 deploy would still be running.
4. **Solution:** edit on-disk to match v3 (env-based, verify_jwt:false), THEN commit. Do NOT re-deploy v1 — v1 won't read the env var.
5. Alternatively: leave EF v3 running on Supabase (it's stable) and commit v3 source in a follow-up prompt.

If rollback is needed at Step 6 (commit failed pre-commit):
- The deployed EF is fine. The source on disk has the v3 edits.
- Fix the pre-commit issue, retry commit. No deploy rollback needed.

---

## Time Estimate

10–15 minutes.

---

## Iron Rule Compliance

- **Rule 9 (no hardcoded business values):** ✅ secret reads from env.
- **Rule 12 (file size ≤350):** ✅ EF source stays under cap (was ~195, +6 lines for safety check).
- **Rule 21 (No Orphans):** ✅ old literal fully replaced, not left as fallback or comment.
- **Rule 23 (no secrets in code/docs):** ✅ entire purpose. After commit, zero literal secrets in the codebase. Mask in all output.
- **Rule 31 (integrity gate):** runs in Step 6 + pre-commit hook.
- **CLAUDE.md §9 working rules:** ✅ no wildcard git, no `-am`, no main push.

---

*End of prompt. After successful completion, the strategic chat will write Prompt 4 — the Make body serialization investigation — starting from a clean(er) repo.*
