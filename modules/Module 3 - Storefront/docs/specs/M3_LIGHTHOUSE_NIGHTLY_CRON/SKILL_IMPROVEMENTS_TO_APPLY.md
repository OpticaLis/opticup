# Skill Improvements To Apply — batch 3 (post M3_LIGHTHOUSE_NIGHTLY_CRON)

> **Created:** 2026-05-10 by opticup-strategic (Cowork session)
> **Purpose:** Cowork can't write to `.claude/skills/` (read-only protected). 4 edits from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW.
> **Activation:** Hand to opticup-executor with the prompt at the bottom.

---

## Source FOREMAN_REVIEW

`M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` (2026-05-10) — 4 proposals (A1, A2, Executor 1, Executor 2). All OPEN.

**Note on Executor 1 priority:** the gh-CLI readiness check has now hit the 3-occurrence threshold across M3_SITEMAP_BRAND_404_CLEANUP + M3_REC014_ORPHAN_CLEANUP + M3_LIGHTHOUSE_NIGHTLY_CRON. Per opticup-strategic SKILL §"Self-Improvement Mandate", this MUST land before next SPEC starts.

---

## Edit 1 — opticup-strategic SKILL.md — make Step 0 URL probe MANDATORY

**File:** `.claude/skills/opticup-strategic/SKILL.md`

**Locate:** The "Step 0 — Reproduce-The-Bug-First" section (under "SPEC Authoring Protocol").

**At the END of that section's existing content, ADD:**

```
### URL existence verification (MANDATORY for URL-naming SPECs)

When the SPEC will name specific URLs — Tier 1 page lists, sitemap entries,
redirect destinations, API endpoints, OG meta tag URLs, anything that ends
up as a literal URL string in §8 or §10 — the SPEC author MUST probe each
URL at author time and document the live HTTP status alongside the URL.

**Do NOT delegate URL probing to the executor's Step 0.** By the time the
executor runs, the SPEC has already named slugs that may not exist. The
executor then either logs-don't-block (drift accumulates as SKIP_404
forever) or stops (wasted authoring time). Probe at author time; document
status; treat 404/5xx as a SPEC-defining signal, not an executor-side
discovery.

**Concrete example:** If the SPEC names 30 URLs (10 routes × 3 langs),
run `for path; for lang; curl -sI -o /dev/null -w "%{http_code}\n"` once
during authoring (~15 seconds). For any 404, decide BEFORE writing §8:
(a) replace the URL with an existing equivalent, (b) explicitly authorize
building the route as a SPEC prerequisite, OR (c) clarify with Daniel
before naming the URL.

(Source: improvement A1 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW,
2026-05-10. The cost-of-skip example: Lighthouse cron now SKIP_404s 6
URLs every daily run forever until REC-SITE-019 is built — a follow-up
SPEC that could have been avoided with 30 seconds of author-time probing.)
```

---

## Edit 2 — opticup-strategic SKILL.md — numeric thresholds need baseline measurement

**File:** `.claude/skills/opticup-strategic/SKILL.md`

**Locate:** The "Step 0.1 Pre-Authoring Sweep Checklist" section. Find the table row for the "**Live-state baseline probe**" check.

**Append to that row's "What to do" cell (or add a new bullet under it):**

```
**When the SPEC's autonomy envelope (§4) or stop triggers (§5) cite
a numeric threshold** (file size MB, package count, line count, runtime
budget, row count, score delta), the threshold value MUST come from the
Step-0 baseline measurement, not an estimate.

Format:
> "Baseline measured 2026-05-10: current = X. Threshold: X * 1.2 = Y."

A threshold without a measured baseline forces the executor into a
real-time judgment call when reality lands within ±20% of the guess.
With a measured baseline + explicit margin, the executor either passes
the threshold cleanly or fails on a clearly-significant deviation.

(Source: improvement A2 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW,
2026-05-10. Cost example: SPEC set 200 MB npm install threshold without
measuring; actual was 222 MB (11% over) — forced AskUserQuestion to
choose cache vs install-each-run. Baseline-driven threshold would have
pre-decided.)
```

---

## Edit 3 — opticup-executor SKILL.md — gh CLI readiness check (4c)

**File:** `.claude/skills/opticup-executor/SKILL.md`

**Locate:** "First Action — Every Execution Session" section. Find sub-step 4b ("Browser-QA readiness check") that was added in commit `74922cd`.

**INSERT a new sub-step IMMEDIATELY AFTER 4b and BEFORE step 5:**

```
### 4c. gh CLI readiness check

Scan the SPEC's §10 QA Steps and §3 Success Criteria for `gh ` commands
(workflow run, pr create, run watch, secret set, etc.). If found, run
`gh auth status`. If not authenticated, surface the gap in the readiness
sentence at session start:

> "SPEC §X.Y cites `gh` commands but gh CLI not authenticated — please
> `gh auth login` before I reach that step, or I'll fall back to manual
> UI instructions for that SC."

Continue execution; just front-load the gap. Don't discover it
mid-execution at the QA step.

If absent, no readiness sentence needed — the gap doesn't apply.

(Source: improvement #1 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW,
2026-05-10. **3-occurrence threshold reached:** gh-auth fallback hit in
M3_SITEMAP_BRAND_404_CLEANUP + M3_REC014_ORPHAN_CLEANUP +
M3_LIGHTHOUSE_NIGHTLY_CRON. Per opticup-strategic SKILL
§"Self-Improvement Mandate", rule promotion is mandatory.)
```

---

## Edit 4 — opticup-executor SKILL.md — generalize CRM commit-split rule

**File:** `.claude/skills/opticup-executor/SKILL.md`

**Locate:** "Code Patterns" → "Git discipline" section → existing `#### CRM-module commit-split anticipation` sub-section.

**At the END of that sub-section's content, ADD:**

```
**Generalization (added 2026-05-10):**

This pattern applies to **ANY directory with multiple sibling scripts that
share helper-function names** — not just `modules/crm/`. Examples now in
the wild:

- `modules/crm/` — original case (CRM secondary-chat scripts).
- `roles/site-overseer/tools/lighthouse/scripts/` — `run-tier1.mjs` +
  `run-full.mjs` shared `main()`, `round`, `totalElapsed`, `elapsedSec`.
  Hook flagged 4 violations on commit-2 attempt; fixed via `_lib.mjs`
  extraction + entry-point renames (`runTier1Main` / `runFullMain`).

**Standing rule for new tool clusters:** When creating a NEW directory
with multiple sibling scripts, BEFORE the first commit:

1. Identify functions that would otherwise be duplicated across scripts
   (helper utilities, shared constants, common error handlers, common
   logging).
2. Pre-emptively extract them into a `_lib.mjs` (underscore prefix marks
   the file as internal — not part of the public script API).
3. Use UNIQUE entry-point names per script (`runFooMain` / `runBarMain`,
   not `main()` in both).

This avoids the fix-and-retry cycle on the first commit. Saves ~10 minutes
per affected SPEC.

(Source: improvement #2 from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW,
2026-05-10.)
```

---

## Activation Prompt for Claude Code

Paste into Claude Code on Windows desktop:

```
טען את skill opticup-executor.

המשימה: החל 4 עדכוני סקיל מ-FOREMAN_REVIEW של M3_LIGHTHOUSE_NIGHTLY_CRON. הקובץ:
modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/SKILL_IMPROVEMENTS_TO_APPLY.md

מכיל 4 edits:
- 2 לקובץ .claude/skills/opticup-strategic/SKILL.md (Step 0 URL probe MANDATORY, threshold baseline)
- 2 לקובץ .claude/skills/opticup-executor/SKILL.md (4c gh CLI check, CRM rule generalization)

חשוב: Edit 3 (gh CLI) הגיע ל-3-occurrence threshold — חובה להחיל לפני כל SPEC הבא.

לכל edit יש Locate + Add מדויק. החל את כל ה-4, אמת שהקבצים שמורים, ואז commit אחד:
chore(skills): apply 4 improvements from M3_LIGHTHOUSE_NIGHTLY_CRON FOREMAN_REVIEW (3-occurrence threshold reached for gh CLI rule)

push לdevelop. אין צורך לפתוח PR ל-main.

בסוף תאר אילו 4 השינויים בוצעו בפועל + שורת hash של ה-commit.
```
