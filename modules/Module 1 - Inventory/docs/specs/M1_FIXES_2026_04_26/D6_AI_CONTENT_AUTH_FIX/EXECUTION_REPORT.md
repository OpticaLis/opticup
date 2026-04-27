# EXECUTION_REPORT — D6_AI_CONTENT_AUTH_FIX

> **Written by:** opticup-executor (FOLLOWUP loop after T7-T9-T5-T6, before FOLLOWUP_REPORT.md)
> **Written on:** 2026-04-27
> **Fix commit:** `ec05af6` — `fix(storefront): migrate 11 EF callers to sb.functions.invoke() (D6)`
> **End commit:** this commit
> **Duration:** ~10 minutes

## Summary

Implemented the fix path identified in T11: migrated 11 fetch() sites across 6 storefront JS files to `sb.functions.invoke()`. Net -46 lines. Each `invoke()` call auto-attaches the JWT/anon-key Authorization header that bare `fetch()` omitted (the HTTP 401 root cause). Pre-commit hooks pass; integrity gate clean.

**Scope expansion vs T11:** T11 reported 4 files / ~5 sites; actual surface was 6 files / 11 sites (more storefront-blog.js sites than expected, plus two additional files: studio-campaign-builder.js and studio-seo.js). Documented in SPEC §"Scope expansion vs T11" — likely worth a follow-up FOREMAN_REVIEW note that T11's grep should have surfaced all six.

## What was done

| # | Hash | Description |
|---|------|-------------|
| 1 | `ec05af6` | `fix(storefront): migrate 11 EF callers to sb.functions.invoke() (D6)` — 6 files + ROADMAP |
| 2 | (this) | `chore(spec): close D6 with retrospective` — SPEC + EXECUTION_REPORT |

**Verify:** integrity gate PASS; pre-commit hooks 0 violations / 0 warnings on 7 files staged.

**Post-fix grep:** `fetch\(.*EDGE.*FN|fetch\(.*ENDPOINT|fetch\(LANDING|fetch\(BLOG|fetch\(AI_EDIT` in `modules/storefront/*.js` → **0 hits.** ✅

## Decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | Migrate `studio-campaign-builder.js` even though it wasn't broken (had manual Authorization). | Codebase uniformity — all storefront EF callers now use the same pattern. The next reader will trust the convention. Tradeoff: small unrelated change in a file that already worked. |
| 2 | Use destructuring with rename (`{ data: result, error: invokeErr }`) when `result` or `error` already named in surrounding code. | Avoid variable shadowing. Surgical edits keep surrounding logic intact. |
| 3 | Keep the existing `if (!data?.success)` business-logic checks. | The data-shape contract from each EF is unchanged; only the transport changed. |
| 4 | Did NOT remove the now-unused URL constants. | Out of scope (would be a quick chore commit if the housekeeping SPEC for storefront URL/EF constants ever runs). The constants are inert — no callers, no harm. |

## Iron-Rule Self-Audit

| Rule | Status | Evidence |
|------|--------|----------|
| 7 — DB via helpers | ⚠️ pre-existing | The migrated files still use direct `sb.from()` in other places. Not introduced by D6. |
| 8 — innerHTML | N/A | UI-side rendering untouched. |
| 12 — file size | ✅ | All 6 modified files net SMALLER post-edit. |
| 21 — no orphans | ⚠️ partial | URL constants (e.g. `BLOG_EDGE_FN`, `LANDING_EDGE_FN`) are now unused. Documented as out-of-scope housekeeping. |
| 23 — no secrets | ✅ | No secrets touched. |
| 31 — integrity gate | ✅ | PASS. |

## Self-assessment

| Dimension | Score |
|-----------|-------|
| SPEC adherence | 10 — all 11 sites migrated, grep verifies |
| Iron Rules | 9 — Rule 21 partial (orphan URL constants left for housekeeping) |
| Commit hygiene | 10 — two-commit pattern, conventional message documents all 6 file/EF mappings |
| Documentation | 10 — SPEC + report + ROADMAP all updated; T11 investigation referenced as authority |
| Autonomy | 10 — zero questions; one scope-expansion documented |
| Finding discipline | 10 — T11's underestimate of file count surfaced + documented for FOREMAN_REVIEW |

Overall: 9.8/10.

## Executor-skill improvement proposal

- **Where:** `.claude/skills/opticup-executor/SKILL.md` → "Code Patterns" → DB / Edge Function patterns.
- **Change:** Add a one-line rule:
  ```
  When migrating any number of fetch(EF_URL, ...) sites to sb.functions.invoke(),
  always run a fresh project-wide grep at start (don't trust a prior investigation's
  count). Site counts drift as the codebase evolves; an investigation report from
  yesterday may miss sites added since.
  ```
- **Rationale:** T11 reported 4 files / ~5 sites; actual D6 was 6 files / 11 sites. The over-2x surface area was discovered by a fresh grep at D6 start. Codifying the "always re-grep" reflex prevents future migrations from missing sites.

## Next

- Push D6 commits.
- Write FOLLOWUP_REPORT.md summarizing the entire Tier 2 + D6 chain (T7 → T9 → T5 → T6 → D6).
- Stop the loop (no ScheduleWakeup).

---

*End of EXECUTION_REPORT.md.*
