# Claude Code — Atomic Task: Fix `facebook-campaigns-sync` Secret + Rotate

> **Purpose:** Migrate the `facebook-campaigns-sync` Edge Function from a hardcoded literal secret to an environment-based one, AND rotate the secret value so the old (potentially exposed) literal is invalidated. End state: clean source code, fresh secret, deployed EF reads from env, Make scenario updated with the new value, committed to git.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why this exists:** Diagnosis (`PROMPT_CHECK_MAKE_SECRET_STATE.md`) confirmed Scenario B — the deployed EF reads a literal secret from its bundle source. The literal is currently visible to anyone with project read access on Supabase. Daniel approved rotation as part of the fix.

---

## Current Repo State (must match this before starting)

The previous prompt halted at unstage. Expected state:

- `supabase/functions/facebook-campaigns-sync/index.ts` — modified (not staged), contains literal `SHARED_SECRET` constant on lines 21–22 (`fbsync_***`, length 70).
- `docs/guardian/DAILY_SUMMARY.md`, `GUARDIAN_ALERTS.md`, `GUARDIAN_REPORT.md` — modified (Sentinel-authored, leave alone).
- Various `outputs/PROMPT_*.md`, `outputs/HANDOFF_*.md`, `outputs/campaign-*` — untracked, leave alone.
- `event-open-email.html`, `.git-test-write`, `.test-write-from-bash` — untracked strays, leave alone.
- No file is staged.
- No commit has been made by the previous prompts.

If `git status` shows anything different — STOP and report.

---

## First Action — Session Start (CLAUDE.md §1)

This is likely a continuation of the same session. If so:

1. Confirm `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅ (already confirmed.)
2. Skip pull (already done).
3. Skip integrity gate (will run again before commit anyway).
4. Confirm to Daniel: "Continuing fix sequence. About to begin Scenario B 5-step fix."

If this is a fresh session — run the full First Action protocol per CLAUDE.md §1 before continuing.

---

## Plan Overview (5 steps, each atomic)

The order is non-negotiable. Each step builds on the previous one.

1. **Generate a new secret value** — strong random string, length 64+. Don't expose it in chat output (mask after generation; show only prefix).
2. **Set the new value** as a Supabase Edge Function env secret named `MAKE_SECRET`.
3. **Edit the on-disk EF source** — replace the literal `SHARED_SECRET` constant with `Deno.env.get('MAKE_SECRET')` reading + early-return-500 if unset.
4. **Re-deploy the EF.** Critical: between Step 2 (secret set) and Step 4 (re-deploy), the OLD bundle is still live. After Step 4, the new env-reading bundle is live — but Make is still sending the OLD value. The window of "EF rejects Make" is between Step 4 and Step 5.
5. **Update Make scenario `9126542`** with the new secret value in its body field.
6. **Commit + push** the cleaned source.

We accept a brief window (between Step 4 deploy and Step 5 Make update) where the EF rejects Make's calls. Since `9126542` is currently DEACTIVATED anyway, no production traffic is affected. This is a key reason rotation is safe to do now vs. later.

---

## Scope

DO:
- Edit `supabase/functions/facebook-campaigns-sync/index.ts` — replace literal with env reference.
- Use `mcp__supabase__*` to set the env secret and re-deploy the EF.
- Use `mcp__make__*` to update scenario `9126542`'s HTTP module body.
- Commit + push the EF source change.

DO NOT:
- Touch any file other than `supabase/functions/facebook-campaigns-sync/index.ts`.
- Activate scenario `9126542` (it stays DEACTIVATED — separate investigation will fix the JSON serialization issue).
- Run any database SQL.
- Modify any other Make scenario.
- Stage or commit Sentinel guardian files or untracked files.
- Use `git add -A`, `git add .`, or `git commit -am` — explicit `git add <path>` only.
- Paste the new literal secret value into your output. Mask it (`fbsync_***` style) after generation.
- Push to `main`.

---

## Detailed Steps

### Step 1 — Generate the new secret

Generate a strong random string. Suggested approach (any of these works):

```bash
# Option A: openssl
openssl rand -hex 32   # → 64 hex chars

# Option B: node
node -e "console.log('fbsync_' + require('crypto').randomBytes(32).toString('hex'))"

# Option C: shell + /dev/urandom
echo "fbsync_$(head -c 32 /dev/urandom | xxd -p -c 64)"
```

Pick one and run it. The output should be the new secret. **Save it to a variable** in your shell session — don't paste it into chat. Reveal only the first 8 characters (e.g. `fbsync_a1b2c3d4...`) so Daniel can confirm a value was generated, then keep going.

Constraint: must start with prefix `fbsync_` (matches the existing convention) and be at least 40 characters total to maintain entropy parity with the old value.

### Step 2 — Set the secret in Supabase

Use the appropriate `mcp__supabase__*` tool to set `MAKE_SECRET` as an Edge Function env variable for project `tsxrrxzmdxaenlvocyit`.

If the available MCP tools do NOT expose secret-setting:
- Stop here, report. Daniel will set it via dashboard or CLI manually, then re-issue this prompt from Step 3.
- Do NOT proceed to Step 3 without confirming the secret is set.

If the MCP succeeds, confirm in the report: "Secret `MAKE_SECRET` set successfully via mcp__supabase__<tool_name>."

### Step 3 — Edit the on-disk EF source

Open `supabase/functions/facebook-campaigns-sync/index.ts`. Make the following changes:

**Change A — Replace the literal constant** (around lines 21–22):

Before:
```typescript
const SHARED_SECRET = "fbsync_<literal>";
```

After:
```typescript
const SHARED_SECRET = Deno.env.get("MAKE_SECRET");
```

**Change B — Add an early-return safety check.** Right after parsing the request body or at the start of the request handler (whichever is earlier), add:

```typescript
if (!SHARED_SECRET) {
  return new Response(
    JSON.stringify({ ok: false, error: "Server configuration error: MAKE_SECRET not set" }),
    { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
```

This protects the EF if the env var is ever missing. Production should never hit this — it's a fail-loud safety net.

**No other behavior changes.** The body-field comparison on line 80 (`body.shared_secret === SHARED_SECRET`) stays exactly as it is.

After the edits, verify:
- File still parses (no syntax errors).
- No literal secret remains anywhere in the file (`grep -i "fbsync_" supabase/functions/facebook-campaigns-sync/index.ts` returns empty).
- File length within Rule 12 cap (≤350 lines).

### Step 4 — Re-deploy the EF

Use `mcp__supabase__deploy_edge_function` for `facebook-campaigns-sync` from the on-disk source.

If MCP fails (known issue per FOREMAN_REVIEW.md): fall back to CLI:
```bash
supabase functions deploy facebook-campaigns-sync --project-ref tsxrrxzmdxaenlvocyit
```

After deploy, verify with a curl probe **using the new secret**:

```bash
curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync' \
  -H 'Content-Type: application/json' \
  -d '{
    "shared_secret": "<NEW_SECRET_VALUE>",
    "tenant_slug": "demo",
    "campaigns": []
  }'
```

Expected: HTTP 200 with `{ok: true, processed: 0, ...}` (empty array, nothing to process — but the secret check passed and tenant resolved).

Also verify with the OLD secret (paste from `git diff HEAD supabase/functions/facebook-campaigns-sync/index.ts` to retrieve its value temporarily) — expected: 401/403 (rotation succeeded; old secret rejected). Mask the old value in your report.

If the new-secret curl returns anything other than 200 — STOP. Roll back: redeploy from `git show HEAD:supabase/functions/facebook-campaigns-sync/index.ts` (the version with the old literal). Report failure to Daniel.

### Step 5 — Update Make scenario `9126542`

Use `mcp__make__scenarios_get` to fetch `9126542`'s current blueprint. Locate the HTTP module's body field. Replace the old `shared_secret` value with the new one.

Use the appropriate `mcp__make__scenarios_update` tool to apply the change. Do NOT activate the scenario — it stays DEACTIVATED.

After the update, fetch the scenario again with `scenarios_get` and confirm:
- The HTTP module body now contains the new secret prefix (`fbsync_<new_first_8>`).
- Old secret prefix no longer appears anywhere in the blueprint.
- `isActive: false` — still deactivated.

Mask all secret values in your report.

### Step 6 — Commit + push

Stage only the EF source file:

```bash
git add supabase/functions/facebook-campaigns-sync/index.ts
git status
```

Confirm: 1 file staged (the EF source). Guardian files + untracked files unchanged.

Run the integrity gate one more time:
```bash
npm run verify:integrity
```

Must exit 0 (or exit 2 with advisory only). Pre-commit hooks will also fire on the commit.

Critical: the **diff must NOT contain any literal secret** anywhere. Verify with:
```bash
git diff --staged | grep -iE 'fbsync_|secret.*=.*"[a-zA-Z0-9_-]{20,}"'
```

Expected output: zero matches. If anything matches — STOP, the cleanup is incomplete.

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

Run:
```bash
git log --oneline -3
git status
git show --stat HEAD
```

Confirm:
- Newest commit is the one we just made.
- `git status` shows the same dirty state as session start MINUS the EF source (now committed). Guardian files + untracked files still there — that's correct.
- `git show --stat HEAD` shows ONLY `supabase/functions/facebook-campaigns-sync/index.ts` modified.

Final smoke: one more curl with the new secret, confirm 200.

---

## Output Format

Return one consolidated message containing:

1. **First Action confirmation** (continuation block).
2. **Step 1 result:** confirmation that secret was generated, with first 8 chars only (`fbsync_a1b2c3d4...`). The full value is held in your shell session, never in the report.
3. **Step 2 result:** Supabase secret set successfully (or "MCP not available, halted — Daniel needs to set manually").
4. **Step 3 result:** confirmation of source edits (constant replaced, safety check added, no literal remains, line count within cap).
5. **Step 4 result:** EF re-deployed via [MCP / CLI fallback]. Curl with new secret → HTTP 200. Curl with old secret → HTTP 401/403 (rotation confirmed).
6. **Step 5 result:** Make scenario `9126542` updated. New prefix in body. Old prefix absent. `isActive: false`.
7. **Step 6 result:** commit hash + push success.
8. **Step 7 result:** final `git log` + `git status` + `git show --stat HEAD`.
9. **End-of-task confirmation:** "Drift closed. Secret rotated. EF v3 deployed and curl-verified. Make scenario 9126542 updated (still DEACTIVATED). Source committed to develop. Repo state clean for next investigation."

---

## Stop-on-Deviation Triggers

Stop and ask Daniel before continuing if:

- Any First Action step fails.
- Generating the new secret fails (no openssl/node/etc. available).
- `mcp__supabase__*` tools don't expose secret-setting — stop after Step 1, ask Daniel to set manually.
- The on-disk source has changed since the diagnostic prompt (someone else edited it).
- Edit doesn't pass syntax (TypeScript/Deno parse error) — `deno check` if available.
- New-secret curl returns anything other than 200 after re-deploy.
- Old-secret curl returns 200 — rotation didn't take effect; rollback and investigate.
- `mcp__make__scenarios_update` fails or the verification `scenarios_get` shows the old prefix still present.
- `git diff --staged | grep` finds any literal secret pattern.
- Pre-commit hook fails or `verify:integrity` returns exit 1.
- `git push` is rejected.
- Anything modifies state in a file outside the EF source.

---

## Rollback Plan

If anything breaks after Step 4 (EF re-deployed but Step 5 or 6 fails):

1. Restore on-disk source: `git restore supabase/functions/facebook-campaigns-sync/index.ts`.
2. Re-deploy from restored source — production goes back to old literal.
3. Old secret in Make is still valid against old code, so `9126542` would work again if activated (still DEACTIVATED, so moot).
4. The new `MAKE_SECRET` env var on Supabase becomes orphaned but harmless.
5. Report rollback to Daniel.

If anything breaks after Step 6 (commit landed but something downstream fails):
- The commit is on `develop`, not `main`. Daniel can revert the commit (`git revert <hash>`) if needed.
- Re-deploy from the reverted state.

---

## Time Estimate

10–15 minutes. Multiple steps but each is small.

---

## Iron Rule Compliance

- **Rule 9 (no hardcoded business values):** secret reads from env, fail-loud if missing. ✅
- **Rule 12 (file size ≤350):** EF source is ~195 lines pre-edit; after adding ~6 lines for safety check, still well under cap.
- **Rule 21 (No Orphans):** the old literal is fully replaced (not commented out, not kept as fallback). The new env var becomes the single source.
- **Rule 22 (defense in depth):** N/A directly — no DB writes added/changed.
- **Rule 23 (no secrets in code/docs):** the entire purpose of this fix. After Step 6, zero literal secrets in the codebase. The new value lives only in Supabase env + Make scenario body. Mask in all output.
- **Rule 31 (integrity gate):** runs at session start (assumed already passed) AND in Step 6 before commit AND on the pre-commit hook itself. Triple coverage.
- **CLAUDE.md §9 working rules:**
  - "Never wildcard git" — `git add <explicit path>` only. ✅
  - "Never `git commit -am`" — explicit `-m` after explicit `git add`. ✅
  - "One concern per task" — single file commit. ✅
  - "Never push to main" — pushing to `develop`. ✅
  - "Read before write" — re-read the EF source if your in-context view of it is older than the diagnostic prompt's read.

---

*End of prompt. After successful completion, the strategic chat will write Prompt 4 — the Make body serialization investigation — starting from a clean(er) repo.*
