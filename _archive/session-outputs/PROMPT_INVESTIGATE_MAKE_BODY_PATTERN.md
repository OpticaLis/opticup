# Claude Code — Investigation Prompt: Make HTTP Body Serialization Pattern

> **Purpose:** Read-only investigation. Returns data; produces zero changes.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why this exists:** Module 4 campaigns screen blocker — Make scenario `9126542` returns 400 from EF `facebook-campaigns-sync` due to JSON body serialization. Need to see how working production Make scenarios solve the same problem before authoring a fix SPEC.

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
   If any untracked files exist — STOP and ask Daniel before continuing.
5. **Clean repo check:** run `git status`. Per CLAUDE.md §1 step 4 — if there are uncommitted changes that are NOT part of this task, ask Daniel once: stash / leave / continue. Wait for the answer.
6. **Integrity gate (Rule 31):** `npm run verify:integrity` — exit 0 = continue. Exit 1 = STOP and investigate. Exit 2 = continue, log warnings.
7. **Read CLAUDE.md** in full.
8. **Read `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`** for Module 4 status.
9. **Read `docs/guardian/GUARDIAN_ALERTS.md`** — if any CRITICAL/HIGH alerts touch Make / Edge Functions / Module 4, report to Daniel before starting.
10. Confirm in one block:
    > "Repo: opticalis/opticup. Branch: develop. Machine: [🖥️/🍎]. Repo status: [clean/dirty-handled]. Module: 4 (CRM). Current status: [one line from SESSION_CONTEXT]. Ready."

After this confirmation, proceed.

---

## Context

Module 4 — CRM campaigns measurement screen is built and CLOSED 🟡 (ERP-side). Edge Function `facebook-campaigns-sync` is deployed at `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/facebook-campaigns-sync` with `verify_jwt: false`, validated by `MAKE_SECRET` in body or header. Curl tests against the EF return 200 on a hand-crafted JSON body (insert path + update path both verified — see `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_SCREEN/EXECUTION_REPORT.md` §10).

The blocker:

- Make scenario `9126542` ("Facebook Campaigns → Optic Up CRM (DEMO)") in folder 499779 (Demo) is currently DEACTIVATED.
- It has 4 modules: `facebook:listCampaigns` → `BasicAggregator` (per-campaign) → `facebook:GetAdAccountInsights` (account-level) → `BasicAggregator` (final array) → `http:ActionSendData` (POST to EF).
- The HTTP module sends a body shaped like: `{"tenant_slug":"demo","secret":"...","campaigns":{{3.array}}}`.
- The EF returns 400 "Invalid JSON body" because `{{3.array}}` is interpolated by Make in a way that does not produce strict JSON (Make-style serialization with quoting issues around the array of objects).
- Past attempts (`toJSON()` — doesn't exist in Make; manual `bodyType: raw` JSON construction — failed) are dead ends per the handoff.

The hypothesis: existing production Make scenarios that POST to Optic Up Edge Functions (`lead-intake`, `send-message`, `event-register`) have already solved this serialization problem. The fix is to copy whatever pattern they use.

This investigation gathers the data the Foreman (opticup-strategic) needs to author the fix SPEC.

---

## Scope (read-only investigation)

DO:
- Use `mcp__make__*` MCPs to list and inspect existing Make scenarios.
- Return the relevant subset of each scenario's blueprint as text.
- Compare the working production patterns against `9126542`.

DO NOT:
- Modify any Make scenario (no `scenarios_update`, no `scenarios_set-interface`, no `scenarios_run`).
- Activate or deactivate any scenario.
- Touch any Edge Function (no deploys, no edits to `supabase/functions/*`).
- Run any SQL against the database (read or write).
- Make any git commits. The repo state must be exactly as it was at session start when this task ends.
- Touch any file outside `outputs/` if you write a working note. (Preferred: return everything inline in your final message; no file writes needed.)

---

## Investigation Steps

### Step 1 — List candidate scenarios

Call `mcp__make__scenarios_list` to enumerate scenarios. Filter to:
- The Demo folder (`499779`) — but also check the production folder if you can identify it from the listing.
- Exclude the blocker itself (`9126542`).
- Include both active and inactive scenarios.

For each candidate, capture: `id`, `name`, `folderId`, `isActive`, and (if visible from list metadata) any indication that it POSTs to Optic Up's Supabase URL.

### Step 2 — Identify the 2-3 best candidates

A "best candidate" is a scenario that:
- Has an HTTP POST module targeting `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/...`.
- Is currently working in production (active, or known-good per `SESSION_CONTEXT.md`). Names to look for from project memory:
  - "רישום משתתפים לאירוע" (registers leads via `lead-intake` EF) — scenario `8479284` is mentioned in the handoff as a strong candidate.
  - Any scenario calling `send-message` EF.
  - Any scenario calling `event-register` EF.
- **Bonus** if it sends an **array of objects** in its body (closer parallel to `9126542`'s `campaigns: [...]` payload). Scenarios sending only a flat object are still useful but a weaker analog.

If the Demo folder doesn't have one, look in production folders. The goal is to find scenarios that have already solved the JSON-array serialization problem.

### Step 3 — Pull blueprint details for each candidate

For each of the top 2-3 candidates, call `mcp__make__scenarios_get`. From each blueprint, extract and return ONLY:

1. **Target URL** of the HTTP module — confirms which EF it calls.
2. **HTTP module config:** `bodyType` (raw / multipart / form-urlencoded / etc.), `parseResponse`, headers list (with values for non-secret headers; mask secret values like `x-make-secret` with `***`).
3. **Body mapper** — the exact `body` field text. This is what Make sends. If it's a raw JSON template with `{{}}` substitutions, copy it verbatim. If it's structured key/value pairs, list them.
4. **Upstream modules** that produce the body data:
   - Is there a `json:CreateJSON` module before the HTTP? If yes — its config (input structure, mapped values).
   - Is there a `BasicAggregator` building an array? If yes — what `groupBy` / `targetStructureType`.
   - Any other JSON-shaping helper.
5. **If the body sends an array** (matching the `9126542` shape), capture **how Make wraps the array in the HTTP body**. This is the key learning — is it `{{json:CreateJSON.json}}`? `{{toString(...)}}`? A literal `{{aggregator.array}}` that just works because of upstream module type? Identify the exact mechanism.

Don't paste the full blueprint — that's massive and noisy. Extract the 5 fields above, in plain text, per scenario.

### Step 4 — Pull `9126542`'s blueprint in the same shape

Same 5 fields as Step 3, for scenario `9126542` itself. This is the comparison baseline.

### Step 5 — Comparison summary

In your final message, write a short comparison block (English or Hebrew, your choice):

- **Candidates examined:** list with EFs they target.
- **Common pattern in working scenarios:** what `bodyType` they use, whether they pre-shape JSON via a module before HTTP, how arrays are serialized.
- **What's different in `9126542`:** the specific deltas vs. the working pattern.
- **Hypothesis on the minimum-fix:** if the difference is obvious (e.g. "they all use `bodyType=raw` with `{{json:CreateJSON.json}}` upstream; `9126542` uses raw with `{{aggregator.array}}` directly"), state it. If not obvious, say "fix path unclear from this data — recommend follow-up investigation on X."

Keep this under ~300 words.

---

## Output Format

Return one consolidated message containing:

1. **First Action confirmation block** (per CLAUDE.md §1).
2. **Step 1 result:** candidate list table.
3. **Step 2 result:** the 2-3 best candidates picked, with one-line reasoning each.
4. **Step 3 results:** per-candidate 5-field extract.
5. **Step 4 result:** `9126542`'s 5-field extract.
6. **Step 5:** comparison summary as specified above.
7. **End-of-session check:** confirm `git status` is clean (no files modified, no commits made). The repo MUST be exactly as you found it.

---

## Stop-on-Deviation Triggers

Stop and ask Daniel before continuing if:

- Any First Action step fails (branch wrong, dirty repo with no clear handling, integrity gate fails).
- `mcp__make__scenarios_list` returns zero results or errors out — the MCP may not be connected.
- You can't find any working scenario that POSTs to a Supabase EF — the hypothesis (that working analogs exist) is wrong; investigation strategy must change.
- Any of the candidate blueprints look like they were also failing recently (not a true working analog).
- Any operation accidentally modifies state (a stray `update` call). Stop immediately, report.

---

## Time Estimate

5–15 minutes. Mostly MCP read calls. No code, no commits.

---

## Iron Rule Compliance

- **Rule 1 (quantity changes):** N/A — read-only.
- **Rules 14, 15, 18, 22 (tenant_id / RLS / UNIQUE / defense in depth):** N/A — no DB writes.
- **Rule 21 (No Orphans, No Duplicates):** N/A for this read-only task; the fix SPEC that follows will check.
- **Rule 23 (no secrets in code/docs):** when extracting headers, mask `x-make-secret` and any auth tokens with `***`. Don't paste real secret values into your output. The `MAKE_SECRET` value lives in Supabase env, not in the repo or this report.
- **Rule 31 (integrity gate):** ran at session start. No file modifications in this task = no gate run needed at end, but verify `git status` is clean.
- **CLAUDE.md §9 working rules:** never wildcard git, never push, never branch off develop, never merge to main. None of these apply (read-only task).

---

*End of prompt. After Daniel reviews the investigation results, the Foreman will author the fix SPEC at `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/SPEC.md`.*
