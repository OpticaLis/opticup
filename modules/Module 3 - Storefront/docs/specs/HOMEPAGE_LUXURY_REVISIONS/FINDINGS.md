# FINDINGS — HOMEPAGE_LUXURY_REVISIONS

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FINDINGS.md`
> **Written by:** opticup-executor (Windows desktop, 2026-04-16)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `STOREFRONT_CMS_ARCHITECTURE.md` referenced in SPEC but does not exist on disk

- **Code:** `M3-EXEC-DEBT-01`
- **Severity:** LOW
- **Discovered during:** Pre-flight read of executor reference files (per SKILL.md Step 1).
- **Location:** `.claude/skills/opticup-executor/references/` directory (file expected, missing).
- **Description:** SPEC §11 line 34 (and the prior `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` Proposal E1 + Proposal E2) both name `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md` as the canonical executor reference for storefront CMS work — proposals E1 and E2 explicitly direct the Foreman to add §3.5 + §4 sub-sections to this file. The file does not exist on this machine. Either it was never created by the Foreman (proposal applied to SPEC text only, not to the underlying skill artifact) or it exists in a different location not on the executor's `references/` folder.
- **Reproduction:**
  ```
  ls C:/Users/User/.claude/skills/opticup-executor/references/
  # → EXECUTION_REPORT_TEMPLATE.md
  # → FINDINGS_TEMPLATE.md
  # No STOREFRONT_CMS_ARCHITECTURE.md
  ```
- **Expected vs Actual:**
  - Expected: file exists with §3.5 (Verification Source-of-Truth Rules) and §4 (Pre-migration snapshot template) per Proposal E2 + E1 in prior FOREMAN_REVIEW.
  - Actual: file does not exist; proposals were applied to SPEC body only.
- **Suggested next action:** TECH_DEBT (Foreman task — author the reference file).
- **Rationale for action:** Proposal E1 + E2's substantive content lived in the SPEC body for this run, so executor was not blocked. But future executors reading thinner SPECs that just say "see STOREFRONT_CMS_ARCHITECTURE.md for the snapshot template" would lose the architectural priming silently. The fix is for the Foreman to author the file once.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Pre-existing repo drift: 5 untracked SPEC artifacts in ERP

- **Code:** `M3-REPO-DRIFT-01`
- **Severity:** LOW
- **Discovered during:** First Action step 4 — clean-repo check before starting this SPEC.
- **Location:** ERP repo (`opticalis/opticup`):
  - `modules/Module 3 - Storefront/docs/mar30-phase-specs/` (untracked directory)
  - `modules/Module 3 - Storefront/docs/specs/BLOG_INSTAGRAM_TEMPLATIZE/` (untracked directory)
  - `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` (untracked file)
  - `modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/SPEC.md` (untracked file)
  - `modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/SPEC.md` (untracked file)
- **Description:** Per Daniel's pre-execution instructions: these are SPEC files that were authored in earlier sessions but never committed to `origin/develop`. They sit in the working tree as untracked files that successive sessions also leave alone. Risk: a future executor or Sentinel may include them in a wildcard `git add` (despite Iron Rule 9 / Working Rule 6) or may treat them as authoritative when they could be stale drafts.
- **Reproduction:**
  ```
  cd C:/Users/User/opticup && git status --short
  # → ?? modules/Module 3 - Storefront/docs/mar30-phase-specs/
  # → ?? modules/Module 3 - Storefront/docs/specs/BLOG_INSTAGRAM_TEMPLATIZE/
  # → ?? modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md
  # → ?? modules/Module 3 - Storefront/docs/specs/MODULE_3_CLOSEOUT/SPEC.md
  # → ?? modules/Module 3 - Storefront/docs/specs/TENANT_FEATURE_GATING_AND_CLEANUP/SPEC.md
  ```
- **Expected vs Actual:**
  - Expected: a clean `develop` working tree with no orphan SPEC drafts.
  - Actual: 5 SPEC artifacts (4 docs + 1 directory `mar30-phase-specs/` from a much older phase) sitting untracked.
- **Suggested next action:** NEW_SPEC (a small "Module 3 SPEC Folder Sweep" SPEC, scoped: triage each of the 5 — commit-as-is / commit-with-rewrite / `git rm` / move to archive — then commit a clean state).
- **Rationale for action:** Several files (e.g., `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md`) likely SHOULD be committed but never were. Others (`mar30-phase-specs/`) are probably archive material. The triage decision is per-file and needs Foreman judgment, not a single sweep rule. Logged here so this SPEC's close-out commit doesn't accidentally absorb them, and so the Foreman can schedule the cleanup.
- **Foreman override (filled by Foreman in review):** { }

---

## Notes (no separate findings, just observations)

**`studio-block-schemas.js` line count went 627 → 630.** Continuation of pre-existing tech debt M3-R12-STUDIO-01 (Rule 12 ceiling 350 lines, file is now 80% over). SPEC §11 explicitly authorized the addition and asked for the new line count to be logged. Not re-filed as a finding because the Foreman already triaged it as TECH_DEBT in `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` §4 — that decision still stands. The 3-way split (core / marketing / luxury) recommended there is the right pattern; not the scope of this SPEC.
