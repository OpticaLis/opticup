# FINDINGS — HERO_VIDEO_SELF_HOSTED

> **Location:** `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Misplaced hero video assets at storefront repo root (pre-existing dirty state from prior attempt)

- **Code:** `M3-DEBT-11`
- **Severity:** LOW
- **Discovered during:** First Action step 4 (clean-repo check) — before any SPEC work began.
- **Location:** `opticup-storefront/hero-mobile.mp4`, `opticup-storefront/hero-desktop.mp4`, `opticup-storefront/hero-poster.webp`
- **Description:** Three untracked files with identical names and byte counts to the Foreman-built SPEC assets sat at the **storefront repo root** instead of `public/videos/`. They appear to be leftovers from an earlier incomplete attempt at this same work (likely a mis-targeted `cp` or drag-and-drop that dumped the files into the wrong directory). They were never committed. The storefront repo itself has no feature gate or `.gitignore` entry that would have caused this — it was operator-level misplacement on a prior session.
- **Reproduction (before resolution):**
  ```
  cd C:/Users/User/opticup-storefront
  git status --short
  # ?? hero-desktop.mp4
  # ?? hero-mobile.mp4
  # ?? hero-poster.webp
  ls public/videos 2>&1  # No such file or directory
  ```
- **Expected vs Actual:**
  - Expected: Clean storefront repo at First Action.
  - Actual: 3 untracked video files at repo root in the wrong directory.
- **Resolution during this SPEC:** Daniel selected option (a) in the First Action dialog — delete the misplaced copies, then copy the authoritative versions from the ERP SPEC folder into `public/videos/`. Executed before any SPEC work began. The repo is clean as of commit `6145ef9`.
- **Suggested next action:** DISMISS (already resolved inside this SPEC's First Action).
- **Rationale for action:** The files were never committed, had no load-bearing purpose, and were replaced by the SPEC-authoritative versions in the correct location. No follow-up SPEC or TECH_DEBT entry needed — but the resolution is documented here and in the EXECUTION_REPORT so a future executor can recognise the pattern (pre-existing misplaced assets from a prior incomplete attempt) and handle it the same way.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §2 / §10 assert file truncation that had already been fixed

- **Code:** `M3-DOC-03`
- **Severity:** INFO
- **Discovered during:** Step before file Edit (`wc -l` + `git diff HEAD`)
- **Location:** `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/SPEC.md:32` (§2 paragraph about truncation) and `SPEC.md:180` (§10 note "The file `HeroLuxuryBlock.astro` on disk is truncated at line 114")
- **Description:** The SPEC references a prior truncation bug documented in `POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md`. At SPEC authoring time (2026-04-18) the file was apparently expected to still be truncated, but `git diff HEAD -- src/components/blocks/HeroLuxuryBlock.astro` returned empty and the on-disk file was 120 lines matching HEAD exactly. Someone (likely a prior session) already fixed the truncation without updating this SPEC's preconditions. Not harmful — just a minor docs staleness — but it caused me a ~1-minute detour to confirm whether a `git checkout HEAD -- ...` was still needed.
- **Reproduction:**
  ```
  cd C:/Users/User/opticup-storefront
  wc -l src/components/blocks/HeroLuxuryBlock.astro         # → 120
  git show HEAD:src/components/blocks/HeroLuxuryBlock.astro | wc -l  # → 120
  git diff HEAD -- src/components/blocks/HeroLuxuryBlock.astro        # → empty
  ```
- **Expected vs Actual:**
  - Expected (per SPEC): file truncated at 114 lines, recovery step needed.
  - Actual: file complete at 120 lines, identical to HEAD.
- **Suggested next action:** DISMISS (documentation staleness in a closed SPEC's upstream reference; no recurring risk).
- **Rationale for action:** The SPEC has now executed successfully; this observation is a one-time stale precondition, not a systemic issue. Worth logging so the Foreman can improve SPEC authoring (proposal already filed in EXECUTION_REPORT §8 proposal 1, implicitly — see also §3 Deviation 2 and §5 bullet 2), but no new SPEC or TECH_DEBT entry is warranted.
- **Foreman override (filled by Foreman in review):** { }

---
