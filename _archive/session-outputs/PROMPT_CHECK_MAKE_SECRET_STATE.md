# Claude Code — Diagnostic Task: Check MAKE_SECRET State

> **Purpose:** Determine whether `MAKE_SECRET` exists as a Supabase Edge Function secret, and whether the deployed `facebook-campaigns-sync` EF reads from env or from a literal in source. Read-only diagnosis — produces a recommendation, not a fix.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why this exists:** Prompt 1 (close EF drift) was halted by Stop-on-Deviation when the executor detected a hardcoded secret in the staged diff. Before deciding the fix path (env-based commit vs. setting the secret + edit + commit), we need to know the current state. This task gathers that state.

---

## Current Repo State (do NOT modify)

The previous prompt (`PROMPT_CLOSE_EF_DRIFT.md`) was halted **before commit**. Expected current state:

- `supabase/functions/facebook-campaigns-sync/index.ts` is **staged** with the hardcoded secret (from `git add` in Prompt 1 Step 1).
- No commit was made.
- All other dirty/untracked files unchanged from session start.

**First action: unstage the file.** Run:
```
git restore --staged supabase/functions/facebook-campaigns-sync/index.ts
git status
```

Confirm:
- The file moves from "Changes to be committed" back to "Changes not staged for commit".
- The on-disk content is unchanged (still has the v2 edits with the literal secret).
- No file is staged anymore.

If `git status` shows ANY file still staged after this — STOP and report.

After unstaging, proceed with the diagnosis below.

---

## First Action — Session Start (CLAUDE.md §1)

This may be a continuation of the same session as Prompt 1. If so, skip the redundant steps:

1. Confirm `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
2. Skip pull (already done in Prompt 1).
3. Skip integrity gate (already passed).
4. **Read** `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` for context — already done if continuing.

Confirm to Daniel: "Continuing from Prompt 1 halt. Unstage complete. Starting diagnosis."

---

## Scope (read-only diagnosis)

DO:
- Use `mcp__supabase__*` MCPs to inspect the deployed EF and env secrets.
- Use file reads to inspect the on-disk EF source.
- Return findings + a recommendation.

DO NOT:
- Modify the EF source code.
- Set, change, or delete any Supabase secret.
- Re-deploy the EF.
- Commit anything.
- Modify any file (this is read-only).

---

## Diagnostic Steps

### Step 1 — Inspect the on-disk EF source

Read `supabase/functions/facebook-campaigns-sync/index.ts` in full. Identify:

1. **Where the secret check happens** — search for occurrences of `MAKE_SECRET`, `shared_secret`, `secret`, `Deno.env`, or any literal-looking string that resembles a secret value.
2. **Source of the secret value** — is it:
   - **(L) Literal:** a string constant directly in the source code, OR
   - **(E) Env-based:** `Deno.env.get('MAKE_SECRET')` (or similar), OR
   - **(M) Mixed:** env-based with a literal fallback (e.g. `Deno.env.get('MAKE_SECRET') ?? 'fallback'`).
3. **The shape of the validation** — is the EF comparing a header (`x-make-secret`) or a body field (`req.body.secret`) against the secret?

Report findings as a short structured block. Do NOT paste the literal secret value into your report — mask it as `***` (Rule 23). It's enough to say "literal string of length N" or "env reference".

### Step 2 — Check Supabase Edge Function secrets

Use the appropriate `mcp__supabase__*` tool to list the secrets configured for the Edge Functions of project `tsxrrxzmdxaenlvocyit`.

Likely candidates: `mcp__supabase__list_edge_functions` (to confirm the function exists) and a separate secrets listing tool if one is exposed.

If the available MCP tools do NOT expose secrets directly:
- Try fetching the deployed EF metadata via `mcp__supabase__get_edge_function` for `facebook-campaigns-sync` — it may include env var names (without values).
- Note in your report which tools are available and whether they revealed secret presence.

Report:
- **Does `MAKE_SECRET` exist as an env var on the deployed function?** Yes / No / Cannot determine from available MCPs.
- If "Cannot determine" — say so explicitly. We'll fall back to a different verification method.

### Step 3 — Inspect the deployed EF source (if MCP allows)

If `mcp__supabase__get_edge_function` returns the deployed source code: compare it to the on-disk source.

- Are they identical? Yes / No.
- If different — what's the delta? (Don't paste full bodies; just summarize: "deployed has env reference, on-disk has literal" or similar.)

If the MCP doesn't return source — skip this step and note the gap.

### Step 4 — Determine the scenario

Based on Steps 1–3, classify the situation as one of:

- **Scenario A** — `MAKE_SECRET` IS set as a Supabase env secret AND the deployed EF source uses `Deno.env.get('MAKE_SECRET')` (or similar). Only the on-disk source has the literal (someone edited locally and didn't redeploy from clean source). **Fix:** edit on-disk to read from env, commit, done. No re-deploy needed (deployed is already correct).

- **Scenario B** — `MAKE_SECRET` is NOT set as a Supabase env secret, and the deployed EF reads the literal from its bundled source. **Fix:** (1) set `MAKE_SECRET` as a Supabase secret with the same value, (2) edit on-disk source to use `Deno.env.get('MAKE_SECRET')`, (3) re-deploy the EF, (4) commit the cleaned source. Multi-step.

- **Scenario C** — Cannot fully determine from available MCPs (e.g. secrets aren't queryable, deployed source isn't exposed). **Recommendation:** safest fix path is to ASSUME Scenario B (set the secret + edit + redeploy + commit). Setting a secret that already exists is idempotent.

### Step 5 — Recommendation

In one short paragraph, recommend the next prompt to write:

- "Scenario A — write a simple edit-and-commit prompt." OR
- "Scenario B — write a 4-step prompt (set secret, edit source, redeploy, commit)." OR
- "Scenario C — write the Scenario B prompt (safe-by-default)."

---

## Output Format

Return one consolidated message containing:

1. **Unstage confirmation:** `git status` after `git restore --staged`.
2. **Step 1 result:** structured block — secret location in source, mode (Literal/Env/Mixed), validation shape. Mask any literal value with `***`.
3. **Step 2 result:** Supabase env secret presence (Yes/No/Cannot determine), and which MCP tool was used.
4. **Step 3 result:** deployed-vs-on-disk comparison if MCP allowed; otherwise note the gap.
5. **Step 4 result:** scenario classification (A / B / C) with one-line justification.
6. **Step 5 result:** one-paragraph recommendation for the next prompt.
7. **Final repo state:** `git status` showing the file is unstaged but still modified, no commits made, no other changes.

---

## Stop-on-Deviation Triggers

Stop and report to Daniel before continuing if:

- The unstage doesn't work (file remains staged).
- Anything in the repo gets accidentally modified.
- An MCP call returns an error you can't interpret.
- The on-disk source has changed since session start (someone or something else edited it).

---

## Time Estimate

3–5 minutes. Read-only.

---

## Iron Rule Compliance

- **Rule 23 (no secrets in code/docs):** never paste the literal secret value into your output. Use `***` or "literal of length N". The secret may already be in git history if a prior commit landed it; that's a separate problem to flag, not to expose further.
- **Rule 31 (integrity gate):** already passed in Prompt 1. No source modifications in this task = no re-run needed.
- **CLAUDE.md §9 working rules:** no commits, no pushes, no branch changes. Pure read-only.

---

*End of prompt. After diagnosis completes, the strategic chat will write Prompt 3 — the actual fix — based on which scenario (A/B/C) applies.*
