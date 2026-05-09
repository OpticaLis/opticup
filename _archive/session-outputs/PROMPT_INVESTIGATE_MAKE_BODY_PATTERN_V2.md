# Claude Code — Investigation Prompt: Make HTTP Body Serialization Pattern (v2)

> **Purpose:** Read-only investigation. Identify how working production Make scenarios that POST to Optic Up Edge Functions serialize their HTTP body — especially when the body contains an array of objects. Use the findings to inform a fix SPEC for Make scenario `9126542`.
> **Author:** opticup-strategic (Cowork session 2026-04-26 evening)
> **Why this exists:** Make scenario `9126542` returns 400 "Invalid JSON body" from EF `facebook-campaigns-sync`. The EF itself is correct (curl 200 verified). The bug is in how Make serializes the `campaigns: [...]` array in the HTTP module body. We need to see how other production scenarios solved this.
> **Supersedes:** `PROMPT_INVESTIGATE_MAKE_BODY_PATTERN.md` (was the v1 of this prompt — replaced because the EF drift fix happened in between).

---

## First Action — Session Start (CLAUDE.md §1, mandatory)

This may be a continuation of the same session as the EF fix sequence. If so, skip the redundant steps and confirm only:
- `git remote -v` is `opticalis/opticup`, branch is `develop`. ✅
- `git status` shows: 3 guardian files modified (left alone), various untracked outputs/strays (left alone), no staged files. The EF source is NO LONGER modified (committed in 7416854).
- `git log --oneline -1` shows `7416854 feat(crm): facebook-campaigns-sync v3 — env-based MAKE_SECRET (rotated)`.

If this is a fresh session — run the full First Action protocol per CLAUDE.md §1 before continuing.

If `git status` shows anything unexpected (the EF source modified again, or a different HEAD) — STOP and report.

---

## Context

**The blocker:**
- Make scenario `9126542` ("Facebook Campaigns → Optic Up CRM (DEMO)"), folder 499779 (Demo), currently DEACTIVATED.
- 4 modules: `facebook:listCampaigns` → `BasicAggregator` (per-campaign) → `facebook:GetAdAccountInsights` (account-level) → `BasicAggregator` (final array) → `http:ActionSendData` (POST to EF).
- The HTTP module body (current shape, after the secret rotation):
  ```json
  {"tenant_slug":"demo","shared_secret":"fbsync_<new>","campaigns":{{3.array}}}
  ```
- The EF returns 400 "Invalid JSON body" because `{{3.array}}` is interpolated by Make in a way that does not produce strict JSON.
- Past attempts (`toJSON()` — doesn't exist in Make; manual `bodyType: raw` JSON construction — failed) are dead ends.

**The hypothesis:**
Existing production Make scenarios that POST to Optic Up Edge Functions (`lead-intake`, `send-message`, `event-register`) have already solved this serialization problem. The fix is to copy whatever pattern they use.

**Strong candidate per project memory:**
- Scenario `8479284` ("רישום משתתפים לאירוע") POSTs to `lead-intake` EF and is known-working in production.

**The investigation:** find the working pattern, document it, return findings. Do NOT write the fix yet.

---

## Scope (read-only investigation)

DO:
- Use `mcp__make__*` MCPs to list and inspect existing Make scenarios.
- Return the relevant subset of each scenario's blueprint as text.
- Compare the working production patterns against `9126542`.

DO NOT:
- Modify any Make scenario (no `scenarios_update`, no `scenarios_set-interface`, no `scenarios_run`).
- Activate or deactivate any scenario.
- Touch any Edge Function.
- Run any database SQL.
- Make any git commits.
- Modify any file (this is fully read-only).

---

## Investigation Steps

### Step 1 — List Make scenarios

Call `mcp__make__scenarios_list` to enumerate scenarios. Filter to:
- All folders where production scenarios live (Demo folder `499779` and any production folder).
- Exclude `9126542` from the candidate set (it's the broken one).
- Include both active and inactive scenarios.

For each scenario, capture: `id`, `name`, `folderId`, `isActive`, and any indication from list metadata that suggests it POSTs to Supabase.

### Step 2 — Identify the 2-3 best candidates

A "best candidate" is a scenario that:
- Has an HTTP POST module targeting `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/...`.
- Is currently working in production (active, or known-good per project memory).
- **Strong preference:** scenario whose body contains an **array of objects** — closer parallel to `9126542`. Scenarios with flat-object bodies are still useful but a weaker analog.

Known names to look for:
- "רישום משתתפים לאירוע" / scenario `8479284` — calls `lead-intake`. Likely flat-object body (single lead per call), but worth verifying.
- Any scenario calling `send-message` EF.
- Any scenario calling `event-register` EF.

If none of the production scenarios send arrays of objects: that's still a useful finding. Means the project hasn't faced this exact case before.

### Step 3 — Pull blueprint details for each candidate

For each of the top 2-3 candidates, call `mcp__make__scenarios_get`. From each blueprint, extract and return ONLY:

1. **Target URL** of the HTTP module — confirms which EF it calls.
2. **HTTP module config:**
   - `bodyType` (raw / multipart / form-urlencoded / etc.)
   - `parseResponse` value
   - Headers list (with values for non-secret headers; mask secret values like `fbsync_*` or `Bearer *` with `***`)
3. **Body mapper** — the exact `body` field text. If raw JSON template with `{{}}` substitutions, copy verbatim. If structured key/value, list them.
4. **Upstream modules** that produce the body data:
   - Is there a `json:CreateJSON` module before the HTTP? If yes — its config (input structure, mapped values).
   - Is there a `BasicAggregator` building an array? If yes — what's `groupBy`, `targetStructureType`, what the structure looks like.
   - Any other JSON-shaping helper (e.g., `tools:SetVariable` with stringified JSON).
5. **If the body sends an array** (matching `9126542`'s `campaigns: [...]` shape), capture the EXACT mechanism Make uses to wrap the array in the HTTP body. This is the key learning. Possibilities:
   - `{{json:CreateJSON.json}}` — pre-built JSON object with the array inside
   - `{{toString(...)}}` — manual stringify
   - A literal `{{aggregator.array}}` that just works because of an upstream `targetStructureType` setting
   - Something else

Don't paste the full blueprint — extract the 5 fields above per scenario, in plain text.

**Mask all secrets** (any `fbsync_*`, `Bearer *`, JWT-shaped strings) with `***`.

### Step 4 — Pull `9126542`'s blueprint in the same shape

Same 5 fields as Step 3, for scenario `9126542` itself. This is the comparison baseline — what we're trying to fix.

Mask the new secret (recently rotated) with `fbsync_***` in your output.

### Step 5 — Comparison summary

In your final message, write a comparison block (English or Hebrew, your choice) under ~300 words:

- **Candidates examined:** list with EFs they target.
- **Common pattern in working scenarios:** what `bodyType` they use, whether they pre-shape JSON via a module before HTTP, how arrays (if any) are serialized.
- **What's different in `9126542`:** the specific deltas vs. the working pattern.
- **Hypothesis on the minimum-fix:** if the difference is obvious (e.g. "they all use `bodyType=raw` with `{{json:CreateJSON.json}}` upstream; `9126542` uses raw with `{{aggregator.array}}` directly"), state it. If not obvious, say "fix path unclear from this data — recommend follow-up investigation on X."

If the candidates DON'T send arrays (only flat objects), say so explicitly. The strategic chat will need to decide whether to:
(a) extrapolate from the flat-object pattern (lower confidence)
(b) ask for an additional investigation step to look at non-Optic-Up Make scenarios that send arrays
(c) try a known Make pattern from documentation/community

---

## Output Format

Return one consolidated message containing:

1. **First Action confirmation block.**
2. **Step 1 result:** candidate list (table or bulleted).
3. **Step 2 result:** the 2-3 best candidates picked, with one-line reasoning each.
4. **Step 3 results:** per-candidate 5-field extract.
5. **Step 4 result:** `9126542`'s 5-field extract.
6. **Step 5:** comparison summary as specified.
7. **End-of-session check:** `git status` — must be identical to session start. No file modifications, no commits.

---

## Stop-on-Deviation Triggers

Stop and ask Daniel before continuing if:

- Any First Action step fails.
- `mcp__make__scenarios_list` returns zero results or errors out — MCP may not be connected.
- Cannot find any working scenario that POSTs to a Supabase EF — the hypothesis is wrong; investigation strategy must change.
- Any of the candidate blueprints look like they were also failing recently (not a true working analog).
- Any operation accidentally modifies state (a stray `update` call). Stop immediately, report.

---

## Time Estimate

5–15 minutes. Mostly MCP read calls.

---

## Iron Rule Compliance

- **Rule 23 (no secrets):** mask any secret values in your output. Don't paste the new MAKE_SECRET literal anywhere.
- **Rule 31 (integrity gate):** assumed already passed (recent EF fix completed without issue). No source modifications in this task = no re-run needed.
- **CLAUDE.md §9 working rules:** no commits, no pushes, no branch changes. Pure read-only.

---

*End of prompt. After Daniel reviews the investigation results, the strategic chat will author the fix SPEC at `modules/Module 4 - CRM/docs/specs/M4_CAMPAIGNS_MAKE_BODY_FIX/SPEC.md`.*
