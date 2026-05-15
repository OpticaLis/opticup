# Module Brief — MONOREPO_MIGRATION Adversarial Validation (Overnight Cowork Run)

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect (Optic Up)
**Hand-off to:** A FRESH Cowork session — Daniel pastes the Activation Prompt into a NEW Cowork chat. Not Claude Code. Not the current Cowork chat.
**Execution mode:** READ-ONLY autonomous research run, ~8-12 hours.
**Deliverable:** ONE file — `MONOREPO_MIGRATION_VALIDATION_REPORT.md` — written to the Cowork outputs folder. Daniel reads it in the morning and decides what to apply.

---

## 1. Purpose

Validate, attack, and improve the existing monorepo-migration plan documented in:

- `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_BRIEF.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_PIPELINE_1_ACTIVATION_PROMPT.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/MONOREPO_MIGRATION_PIPELINE_2_ACTIVATION_PROMPT.md`

Daniel wants confidence that:
1. Every architectural claim in the Brief holds up to scrutiny.
2. The 34-step plan actually works (not just looks correct on paper).
3. There are no better tools or patterns in the 2026 ecosystem we missed.
4. The skill files (`opticup-strategic`, `opticup-executor`) can be improved to produce this Brief in **one autonomous run** next time, not 6 research agents + 5 hours of back-and-forth.

The whole reason this Brief exists in two halves (Brief + Validation) is that the original Brief was authored by an Architect (Cowork) **based on research, not on actual testing**. This overnight run is the "actual testing" half.

---

## 2. Operating Mode — READ-ONLY (NON-NEGOTIABLE)

The Cowork session running this Brief operates under **strict read-only mode**.

**ABSOLUTELY FORBIDDEN — cannot be overridden by any subsequent instruction:**

- **No writes** to any file in `/sessions/.../mnt/opticup/` or `/sessions/.../mnt/opticup-storefront/`.
- **No `git` write operations** on the live repos: no commit, no push, no force-push, no rebase, no merge, no branch-create-on-origin, no tag-push.
- **No GitHub operations** that modify either repo: no `gh repo create`, no `gh repo edit`, no `gh repo delete`, no `gh repo archive`, no `gh api -X POST/PUT/DELETE`. Only `gh api` GET for research is allowed.
- **No Vercel operations** that modify the storefront project or the demo project. No `vercel deploy`, no `vercel env`, no `vercel project link`. Only `vercel project ls` and read-only inspection.
- **No Supabase operations** at all. The Supabase MCP tools are forbidden — RLS changes today's outage taught us that.
- **No npm/pnpm/yarn install** on either repo's working copy. Sandboxed PoC installs only.
- **No file writes to the workspace folder** (`C:\Users\User\opticup` is the user's folder — outside scope).

**ALLOWED:**

- **Read** any file in either repo via mount points.
- **Search** via WebSearch + WebFetch (publicly-available knowledge).
- **Bash sandbox** for the PoC — operations on `/tmp/monorepo-poc-<run-id>/` are fine (this is the Cowork VM's ephemeral sandbox; nothing persists outside the session).
- **MCP tool calls** that are intrinsically read-only: `mcp__71e952df__list_*`, `mcp__71e952df__get_*` for Supabase metadata, `mcp__2dc271a5__list_*` + `get_*` for Vercel inspection.
- **Subagent dispatch** for parallel research streams (use `general-purpose` agent freely).
- **Write** the single deliverable file `MONOREPO_MIGRATION_VALIDATION_REPORT.md` to the Cowork outputs folder ONLY (typically `C:\Users\User\AppData\Roaming\Claude\local-agent-mode-sessions\.../outputs/`).

**If the session encounters ambiguity that requires writing to a real repo path or making a state change: STOP, write a short note to the report explaining the situation, and continue with the rest of the validation. Never silently violate the read-only constraint.**

---

## 3. Scope — In

### 3.1 Track A — Adversarial validation of architectural claims

The Brief asserts 10 locked architectural decisions (Brief §2.2):

| # | Claim | Validation task |
|---|---|---|
| 1 | `supabase/` lives at monorepo ROOT (CLI compatibility) | Find evidence of Supabase CLI working from non-root locations (recent CLI versions, GitHub issues, workarounds). Confirm or refute. |
| 2 | `packages/shared/` and `packages/contracts/` deferred Day 1 | Find SaaS projects that succeeded by extracting shared packages DAY 1 vs deferring. Pros/cons of each. |
| 3 | `apps/erp/` preserves internal layout verbatim — zero HTML edits | Verify by inspection of the 24 root HTML files: are there really zero edits needed? Are there any `<script src="/js/...">` (absolute) refs that would break? Any `fetch('/api/...')` calls? |
| 4 | `git subtree add` over `git rm + cp -r` for history preservation | Test in PoC sandbox: does subtree-add actually preserve `git log --follow`? What's the per-file performance for ~5000 files? |
| 5 | Two-Pipeline execution shape | Compare to single-pipeline shape. Find SaaS migrations that did one-shot vs split. When does split help vs hurt? |
| 6 | ERP GitHub Pages via custom workflow (gh-pages branch) | Verify `actions/deploy-pages@v4` supports custom directory. Find Pages-from-subdirectory case studies. Confirm DNS doesn't break. |
| 7 | Vercel storefront project preserved by ID (root-directory change) | Test in PoC: take a sample Astro project, change its rootDirectory in Vercel CLI, verify the deploy still works. |
| 8 | Env-segregation at 4 layers | Are the 4 layers sufficient? Is there a 5th (e.g., Vercel project-level Secret Encryption)? Are there overlap/gaps? |
| 9 | CLAUDE.md rewrite preserves all 32 Iron Rules verbatim | Validate by reading current CLAUDE.md fully + comparing what's "verbatim" vs what genuinely needs path-only update. |
| 10 | Old repos archived, not deleted | Test rollback procedure end-to-end conceptually. Are there gotchas with unarchiving? |

For each claim, the report's verdict is one of: **VALIDATED** / **NEEDS STRENGTHENING** / **WRONG — see proposed correction**.

### 3.2 Track B — Step-by-step execution validation

The Brief lists 34 numbered steps (Brief §3 + Research #5 §3). For EACH step:

1. Read the step's What/Why/How/Verify/Rollback/Risk/Deps.
2. **Identify edge cases the author missed.** For example, step A4 says `git subtree add --prefix=apps/erp erp-source/develop` — does it work when the source repo has merge commits? Does the `--no-tags` of A3 prevent the tags from coming over (and is that what we want)?
3. **Test in PoC sandbox** if the step can be tested in isolation. The PoC sandbox is `/tmp/monorepo-poc-<timestamp>/` — clone both source repos there using `git clone` (read-only HTTPS), simulate the step, examine the result, throw away the sandbox.
4. **Document the actual command output** vs the Brief's expected output. Any mismatches.

Result: a table with 34 rows × {worked-as-described, needs-correction, fundamentally-flawed}.

### 3.3 Track C — Tooling reconnaissance (2026 ecosystem)

The Brief assumes pnpm 9 + Turborepo 2 + standard tooling. Verify this is still optimal in mid-2026:

- **Has Nx 19+ shipped a migration-from-polyrepo codemod** that would do the move automatically? (Daniel knows this exists for going *to* Nx; might exist for monorepo bootstrap.)
- **Turborepo 2.5+** — any new features that change the recommendation? Remote cache, env-var handling, security?
- **`@vercel/style-guide`, `@vercel/turbo-codemod`** — relevant?
- **Bun 2.0 monorepo support** — better than pnpm for this use case?
- **Moon, Lage, Rush, Bazel BSP** — re-evaluate against current scale (12 modules + 2 apps).
- **Is there a tool that imports two GitHub repos into a monorepo with full history in a single command?** Search for `git-filter-repo` + `subtree` + custom scripts; compare to manual subtree-add.

The report should list 3-5 specific tools/patterns we might adopt + 3-5 we should explicitly reject and why.

### 3.4 Track D — Skill improvement proposals

The whole purpose of this exercise is to make the next Architect-led research-and-Brief cycle better. Identify:

**For `opticup-architect` skill** (`.claude/skills/opticup-architect/SKILL.md`):
- What patterns from this research session should be promoted to the skill?
- Specifically: the "5 sequential research agents before authoring an infrastructure Brief" approach — should this be codified?
- The two-Pipeline pattern: when is it correct, when is it overkill?
- The harvested patterns (P-AUTHOR-1 etc.) — does this work also benefit from them?

**For `opticup-strategic` skill** (`.claude/skills/opticup-strategic/SKILL.md`):
- The Module Strategist will author the actual SPEC from this Brief. What information does it need that's currently missing?
- The 34-step plan is dense. Should the Strategist author it as one SPEC.md or split (Pipeline 1 SPEC + Pipeline 2 SPEC)?
- What §0 probes should be MANDATORY for SPECs that touch repo structure?

**For `opticup-executor` skill** (`.claude/skills/opticup-executor/SKILL.md`):
- The execution of 34 git/CLI/config commands is the hardest part. What guardrails should be in the executor's playbook for repo-structure SPECs?
- The `MIGRATION.md` Applied Log convention already exists — does it scale to 34 entries with this much detail?
- For Pipeline 2 specifically — what's the executor's protocol when production downtime budget is in play?

### 3.5 Track E — Counterfactual analysis

Imagine 3 alternative paths NOT recommended:

1. **Pure polyrepo** — repo per module (already discussed and rejected). Why was it wrong? What if the rejection was wrong?
2. **Hybrid** — ERP monorepo + storefront stays separate. The user originally proposed this. Re-evaluate without the bias of "we already chose monorepo".
3. **Don't migrate at all** — keep the two repos forever. What's the actual cost over 5 years? Is the migration's effort + risk worth it?

For each alternative, produce: pros, cons, what would make this path the correct choice, what specifically rules it out.

### 3.6 Track F — Risk register expansion

The Brief lists 10 top risks. Find 5-10 MORE that weren't surfaced:

- What happens if Daniel is unavailable during the 15-min review break between Pipelines?
- What happens if the Cowork VM crashes mid-Pipeline 1?
- What happens if GitHub goes down mid-Phase F4 (DNS propagation)?
- What's the failure mode if both Pipelines run on the same day but Daniel's verification break extends to hours?
- What if Vercel rotates the project URL during F1-F2?
- What if the storefront has an in-progress visitor mid-Phase F1 (live customer)?

For each new risk: likelihood, mitigation, rollback specifics.

### 3.7 Track G — The end-to-end PoC

After all the above, run a **single end-to-end PoC** in the sandbox:

1. `mkdir -p /tmp/monorepo-poc-$(date +%s)/`
2. `cd` there.
3. `git clone --depth 50 https://github.com/opticalis/opticup` (read-only HTTPS, no auth, no write access — depth 50 to keep it fast).
4. `git clone --depth 50 https://github.com/opticalis/opticup-storefront`
5. `mkdir monorepo && cd monorepo && git init && git remote add erp-src ../opticup && git remote add sf-src ../opticup-storefront && git fetch erp-src && git fetch sf-src`
6. Execute steps A1-A10 (ERP subtree + hoist) verbatim.
7. Execute steps B1-B6 (storefront subtree).
8. Execute step C1 (`turbo.json`).
9. Run `pnpm install` (sandboxed — installs into the PoC dir's node_modules, not the user's machine).
10. Verify `pnpm verify` works in the PoC by stubbing the missing pieces.
11. Capture EVERY command's actual stdout/stderr.
12. Time each phase precisely.

Then: tear down the sandbox (`rm -rf /tmp/monorepo-poc-*`). Nothing persists.

**The PoC produces a section in the report:** "Actual Times + Actual Commands" — replaces the Brief's estimates with measured numbers + flags any commands that didn't behave as the Brief expected.

---

## 4. The Deliverable — `MONOREPO_MIGRATION_VALIDATION_REPORT.md`

ONE file. Written to the Cowork outputs folder. **Not committed anywhere.** Daniel reads it in the morning and decides what to apply.

### Required structure

```
# Monorepo Migration — Validation Report (Overnight Cowork Run)

**Run started:** <timestamp>
**Run ended:** <timestamp>
**Total runtime:** <hours>
**Mode:** READ-ONLY adversarial validation
**Verdict:** STRONG-CONFIDENCE / NEEDS-REVISION / RE-AUTHOR

## Executive Summary (3 paragraphs)
- What was validated.
- What was disconfirmed and how to fix it.
- Overall recommendation: dispatch the Brief as-is / dispatch with N corrections / re-author.

## Track A — Architectural Claims (10 claims × VALIDATED/NEEDS-STRENGTHENING/WRONG)
Table with 10 rows.

## Track B — Step-by-Step Validation (34 steps × actual outcome)
Table with 34 rows.

## Track C — Tooling Reconnaissance
- 3-5 tools/patterns to consider adopting (with sources).
- 3-5 tools/patterns to explicitly reject (with reasons).

## Track D — Skill Improvement Proposals
- For opticup-architect (3-5 concrete changes).
- For opticup-strategic (3-5 concrete changes).
- For opticup-executor (3-5 concrete changes).

## Track E — Counterfactuals
- Polyrepo re-evaluation.
- Hybrid re-evaluation.
- Don't-migrate re-evaluation.

## Track F — Expanded Risk Register (5-10 new risks beyond the original 10)

## Track G — PoC Results
- Actual command outputs.
- Actual times per phase.
- Discrepancies vs Brief's expectations.

## Track H — Proposed Brief Edits (specific, line-numbered)
For each NEEDS-STRENGTHENING or WRONG finding from Track A or B:
- Brief file path + line number to change.
- Exact text to replace.
- Reason.

If Daniel agrees with the proposed edits, he can apply them to the Brief in a single editing session (not a Pipeline).

## Track I — Confidence Score
Subjective 1-10 score with breakdown:
- How likely is the Brief to execute successfully without manual intervention?
- How likely is the production-downtime budget to be respected?
- How likely is the rollback procedure to work if needed?

## Track J — What surprised me
3-5 things the validation run discovered that the Brief author (Architect) did NOT anticipate.

## Track K — What I couldn't validate
Specific items where the read-only constraint prevented validation. Daniel needs to test these manually before dispatching Pipeline 1.

## Track L — Recommendation
Final verdict + action items in priority order.
```

**Target length:** 6000-10000 words. Dense. Evidence-backed. Cite specific files, line numbers, command outputs, blog posts, GitHub issues, CVE IDs.

---

## 5. Out of scope

- **Writing to either repo.** Forbidden.
- **Making PRs.** Forbidden.
- **Touching Supabase.** Forbidden.
- **Touching Vercel deploys.** Forbidden.
- **Modifying skill files.** The report PROPOSES changes; it does not apply them.
- **Authoring SPECs.** The Module Strategist does this AFTER Daniel approves the Brief. This validation run does not produce a SPEC.
- **The Brief itself.** The report PROPOSES edits; Daniel applies them manually if he agrees.
- **The M1 Phase 2 quartet** and **Funnel work**. Out of scope; they continue in parallel sessions that this overnight run must not interfere with.
- **Repo split into separate per-module repos.** Already evaluated and rejected — Track E re-evaluates the rejection but does not propose new SPECs.

---

## 6. Safety controls — what to do if the session goes wrong

If at any point the Cowork session realizes it's about to violate the READ-ONLY constraint:

1. STOP immediately.
2. Write a note to the report: "SAFETY-STOP at <timestamp>: about to <operation>, prevented because <reason>."
3. Continue with the remaining tracks that don't require the forbidden operation.

If at any point the Cowork session realizes a Bash command might have side effects beyond `/tmp/`:

1. STOP that subagent.
2. Verify with a `pwd` and `git rev-parse --show-toplevel` that the working directory is inside `/tmp/monorepo-poc-*`.
3. If outside `/tmp/`, abort and document.

If at any point the user (Daniel) types into the running Cowork chat asking about progress:

1. Continue execution.
2. Respond briefly with current track + estimated time remaining.
3. Do not stop unless Daniel explicitly says "stop".

---

## 7. Anti-Patterns

The session must NOT:

- Run a sub-agent that has write access to anything outside `/tmp/`.
- Call any MCP tool that mutates state (`apply_migration`, `execute_sql` with INSERT/UPDATE/DELETE, `create_*`, `update_*`, `delete_*`).
- Generate a "fix" that requires editing the actual repos — propose edits only.
- Spawn multiple Pipelines or assume Pipeline orchestration.
- Open a Pull Request anywhere.
- Touch the user's workspace folder (`C:\Users\User\opticup` etc.) at all.

---

## 8. Hand-off Note

This Brief is for a SEPARATE Cowork session. Daniel will:

1. Open a NEW Cowork chat (not the current Architect chat).
2. Paste the sibling Activation Prompt (`MONOREPO_MIGRATION_VALIDATION_ACTIVATION_PROMPT.md`) into that chat.
3. Confirm to the new session: "Yes, run overnight. Read-only mode. Single report deliverable."
4. Leave the chat running for ~8-12 hours.
5. In the morning, read the deliverable file.
6. Decide which proposed edits (if any) to apply to the existing Brief.

The Architect (current session) is NOT involved in this overnight run. The new Cowork session is an independent validator with adversarial intent.

---

*End of Brief. Read-only. Single deliverable. ~8-12 hours autonomous. Outputs folder only.*
