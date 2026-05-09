# Claude Code — Atomic Task: Generate New MAKE_SECRET to File

> **Purpose:** Generate a fresh secret value, write it to a file outside the repo (per CLAUDE.md §11 credentials-isolation pattern), and report ONLY the prefix back. Daniel will then take the value from the file and set it on Supabase manually. After that, a second prompt resumes the fix from Step 3.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why split:** No Supabase MCP exposes Edge Function secret management. The set-on-Supabase action sits with Daniel by design (cargo stays with product, keys stay with environment). This prompt does only the part that can be done autonomously — generation + file write.

---

## Current Repo State (must match)

Same as the previous halt:
- `supabase/functions/facebook-campaigns-sync/index.ts` — modified (not staged), still has the literal.
- Sentinel guardian files modified (leave alone).
- Outputs/strays untracked (leave alone).
- No staged files, no commits made by prior prompts.

If `git status` shows anything different — STOP and report.

---

## First Action — Continuation

This is a continuation. Skip the full First Action protocol. Confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅

---

## Steps

### Step 1 — Generate the new secret

Use any of:

```bash
# Option A: openssl
echo "fbsync_$(openssl rand -hex 32)"

# Option B: node
node -e "console.log('fbsync_' + require('crypto').randomBytes(32).toString('hex'))"

# Option C: shell + /dev/urandom
echo "fbsync_$(head -c 32 /dev/urandom | xxd -p -c 64)"
```

Result: a string like `fbsync_<64-hex-chars>`, total length 71 characters.

Capture the value into a shell variable:
```bash
NEW_SECRET="fbsync_<generated_hex>"
```

Do NOT echo the full value to the chat. Mask it from here on.

### Step 2 — Ensure the credentials directory exists

```bash
mkdir -p ~/.optic-up
chmod 700 ~/.optic-up
```

If the directory already exists from prior credential-isolation usage — fine, the chmod is idempotent.

### Step 3 — Write the secret to the file

```bash
echo -n "$NEW_SECRET" > ~/.optic-up/make-secret.txt
chmod 600 ~/.optic-up/make-secret.txt
```

Use `-n` so there's no trailing newline. Daniel will copy the exact bytes.

Verify the file:
```bash
ls -la ~/.optic-up/make-secret.txt
wc -c ~/.optic-up/make-secret.txt   # should print "71 ..." (71 chars, no newline)
head -c 8 ~/.optic-up/make-secret.txt   # should print "fbsync_"
```

The file MUST be:
- Exactly 71 bytes (no trailing newline).
- Permissions `-rw-------` (600).
- In `~/.optic-up/` (NOT in the repo).

### Step 4 — Confirm the file is outside git

Run:
```bash
cd ~/optic-up   # or wherever the repo is on this machine
git status -s ~/.optic-up/make-secret.txt 2>/dev/null
```

Expected: empty output (the file is outside the repo, git knows nothing about it). If git reports the file as tracked or untracked — STOP. Something is wrong with the path.

Also check that nothing in `.gitignore` is relevant — the file shouldn't even be inside the repo to begin with. The home directory path puts it well outside.

### Step 5 — Report to Daniel

Return a short message with EXACTLY these fields:

1. **Secret generated.** Length: 71 chars. Prefix: `fbsync_<first-8-hex-chars>...` (just the first 8 hex chars, mask the rest).
2. **Written to:** `~/.optic-up/make-secret.txt` (with absolute path resolved — show what `echo $HOME` returns + the relative path).
3. **Permissions:** `-rw-------` (verified with `ls -la`).
4. **Outside git:** confirmed (`git status` reports nothing about it).
5. **What Daniel does next:** "Open the file, copy the value, set it as `MAKE_SECRET` on Supabase Edge Functions secrets. See `outputs/INSTRUCTIONS_DANIEL_SET_SECRET.md` for step-by-step."

---

## Output Format

Return ONE consolidated message with the 5 fields from Step 5. Nothing else. Especially:
- Do NOT paste the full secret value.
- Do NOT include any shell variable contents that hold the secret.
- Do NOT print the file contents (`cat`).

---

## Stop-on-Deviation Triggers

Stop and report if:
- None of the generation methods (openssl, node, /dev/urandom) work in this environment.
- The home directory is not writable.
- The file ends up tracked by git (path miscalculation).
- `wc -c` reports anything other than 71.

---

## Time Estimate

1–2 minutes.

---

## Iron Rule Compliance

- **Rule 23 (no secrets in code/docs):** secret never enters the repo. Lives only in `~/.optic-up/make-secret.txt` with 600 perms. ✅
- **CLAUDE.md §11 credentials isolation:** matches the existing pattern (`$HOME/.optic-up/credentials.env`). ✅

---

*End of prompt. After Daniel sets the secret on Supabase, the strategic chat will issue Prompt Part 2 — resume the fix from Step 3 of the original plan (edit source, deploy, update Make, commit).*
