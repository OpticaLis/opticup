# FOREMAN_REVIEW — HERO_VIDEO_SELF_HOSTED

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/SPEC.md`
> **Reviewed by:** opticup-strategic (retro-backfill via overnight hygiene sweep, 2026-05-09)
> **Verdict:** 🟢 **CLOSED**

## Summary

Replaced YouTube iframe facade in `HeroLuxuryBlock.astro` with native HTML5 `<video>` tag backed by 3 pre-built assets (`hero-mobile.mp4` 1.61MB, `hero-desktop.mp4` 3.88MB, `hero-poster.webp` 71KB) under `public/videos/`. Removed ~800KB of YouTube JS that caused the prior PageSpeed regression. Build passed (5.27s), 18/18 tests PASS, file went 120→97 lines (well under 130 cap). ~10 minutes total. One SPEC inconsistency (SC-11 vs §7 contradiction on `video_youtube_id` prop) logged in EXECUTION_REPORT §3. Two pre-existing dirty-state files at storefront repo root cleaned up on Daniel's option (a) before work began.

## Strengths

- **Performance-by-design choice**: `preload="none"` ensures video doesn't block page load; `<img fetchpriority="high">` separately guarantees the poster.webp is the LCP element. Native browser handles streaming after interactive. Zero external JS. This is exactly the pattern the project's PageSpeed targets demanded.
- **Backward compat via DB**: `video_youtube_id` prop retained as the truthiness trigger (per SPEC §7 + Iron Rule 20). Existing pages render the new hero without a migration.
- **Tight file size**: 120→97 lines shows the YouTube facade JS was bloat, not essential logic.

## Weaknesses / Open

- **SPEC inconsistency caught at execution time**: SC-11 wanted regex stripping `video_youtube_id` from the prop interface, but §7 said keep it. Executor logged this in EXECUTION_REPORT §3 as "1 of 14 SCs strictly met". The author SKILL's pre-flight check should have caught this contradiction before issuing the SPEC.
- **Pre-existing dirty state**: 3 misplaced video files at storefront repo root from a prior incomplete attempt — cleaned up but never had a parent ticket explaining where they came from. Could indicate a past abandoned SPEC.

## Author improvement proposals (for `opticup-strategic` skill)

1. **Add to author SKILL §"SPEC consistency check": before issuing the SPEC, do a pass where each Success Criterion is cross-referenced against §7 (Out-of-Scope) and §8 (Expected Final State).** Contradictions like SC-11 vs §7 here would surface on a 5-minute author-side check, saving an executor escalation.
2. **Document the "pre-existing dirty state" handling pattern**: when First Action discovers untracked work that looks like an abandoned SPEC, the executor's options should be templated (delete with author approval / preserve in archive / escalate). Currently the executor reasons through it case-by-case.

## Executor improvement proposals (for `opticup-executor` skill)

1. **Add executor SKILL: "when SC-X conflicts with §Y in the SPEC, log the conflict to EXECUTION_REPORT §"Decisions made in real time" + apply the §Y constraint by default (Out-of-Scope wins over Success Criterion when in conflict)"** — this SPEC executed exactly this rule but ad-hoc. Codify it.
2. **Add `verify-frozen-files.mjs` documentation** to executor SKILL — the "frozen-files" pre-commit check fired for this SPEC. Future executors touching `*.astro` blocks should know which files are frozen and why.
