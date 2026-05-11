# FINDINGS — M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §3 criterion #11 regex looks for `href` but template uses `data-src`

- **Code:** `M1_5-SPEC-DRIFT-03c-01`
- **Severity:** LOW
- **Discovered during:** §3 criterion #11 verification, immediately after writing INDEX.html
- **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL/SPEC.md` §3 row 11
- **Description:** Criterion #11 reads `INDEX links 13 modules | 13 hrefs | grep -cE 'href="\./M[0-9]+-' .../INDEX.html → 13`. But the prescribed INDEX template (parent §5 + de-facto direction-1 implementation in commit `676608e`) uses `data-src="./Mx-..."` on `<button>` elements — the iframe is JS-driven, not anchor-driven. There are no `href`s to module HTMLs in the template. The criterion regex returns 0 for every direction's INDEX, including direction-1 which is presumably accepted.
- **Reproduction:**
  ```
  grep -cE 'href="\./M[0-9]+-' "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/INDEX.html"
  # → 0
  grep -cE 'href="\./M[0-9]+-' "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-3-bold-dense-pro-tool/INDEX.html"
  # → 0
  ```
- **Expected vs Actual:**
  - Expected per criterion: 13 hits.
  - Actual: 0 hits (criterion intent met via `data-src`-on-button pattern, but the regex doesn't recognize that).
- **Suggested next action:** DISMISS (criterion intent met by template, regex was wrong) OR TECH_DEBT (fix the criterion text in the 3 sibling SPECs so a Sentinel audit doesn't trip on it).
- **Rationale for action:** This is a SPEC-author-side text drift identical in class to the M1_5-SPEC-DRIFT-01 case from Phase 1. The criterion as written is unsatisfiable by the prescribed template. Either the criterion needs `grep -cE 'data-src="\./M[0-9]+-'` (which DOES return 13) or the §8 template needs to switch to anchors.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Parallel-chat race on shared docs causes working-tree drift after my commits

- **Code:** `M1_5-INFRA-3c-01`
- **Severity:** MEDIUM
- **Discovered during:** Commit 4 (docs commit) and post-Commit-4 retro write
- **Location:** Working directory `C:\Users\User\opticup` — affects `modules/Module 1.5 - Shared Components/docs/{MODULE_MAP,CHANGELOG,SESSION_CONTEXT}.md` and `MASTER_ROADMAP.md`
- **Description:** Three executor chats (3a, 3b, 3c) were dispatched in parallel and ran in the SAME working directory simultaneously. Each chat needs to edit the same 4 shared doc files at its own Commit 4. Reads and writes from the three chats interleave:
  - I `Read` CHANGELOG.md at time T1 (saw 3a's "Phase 3a" header at top)
  - At T2 (between my Read and Edit) the 3b chat committed its own version of CHANGELOG.md with "Phase 3b" at top
  - When I called `Edit`, the Edit tool rejected my `old_string` ("the file has been modified since read") — I had to re-Read and re-Edit
  - This happened multiple times across MODULE_MAP and CHANGELOG
  - After my Commit 4 (70bad83) succeeded with my correct doc content, 3b's chat later overwrote the working-tree version of MODULE_MAP and CHANGELOG with its own version that has NO Phase 3c entry. My HEAD has the correct content; only the working tree drifts.
- **Reproduction:**
  ```
  git show HEAD:"modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md" | head -5
  # shows my Phase 3c entry
  cat "modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md" | head -5
  # shows 3b's "Last updated: 2026-05-11 (Phase 3b — direction-2-modern-clean mockup tree built)"
  git status --short | grep MODULE_MAP
  # → " M modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md"
  ```
- **Expected vs Actual:**
  - Expected: each chat's Commit 4 leaves working tree clean for that file.
  - Actual: working tree at session-close is the "loser" of the most recent race — my Phase 3c entry is missing from the on-disk version of MODULE_MAP and CHANGELOG until those files are reconciled.
- **Suggested next action:** NEW_SPEC (or rolled into the eventual `M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE` reconciliation step). Phase 4's first task should be: merge the 3a + 3b + 3c doc edits into a single canonical CHANGELOG, MODULE_MAP, SESSION_CONTEXT, MASTER_ROADMAP. The git history holds all 3 versions across commits `f363951`, 3b's Commit 4 (whatever its hash ends up), and `70bad83`. A 3-way merge / cherry-pick is straightforward.
- **Rationale for action:** This is not a bug in any one SPEC — it's a multi-chat-orchestration limitation. Phase 4 owns the comparison + close ceremony anyway; folding the doc reconciliation into Phase 4's first step is natural.
- **Process improvement (suggested for Daniel):** When parallel sub-SPECs touch identical shared doc files at the same anchor, dispatch them serially (or have only ONE of them update the shared docs — designate the LAST sub-phase as the doc owner). Alternative: each sub-phase appends to a sub-phase-specific section header instead of "Section 0" so the merge is conflict-free.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Parent SPEC §4 stylesheet chain has the wrong relative-path depth (`../../../../`, missing one `../`)

- **Code:** `M1_5-SPEC-DRIFT-03c-02`
- **Severity:** LOW
- **Discovered during:** Commit 1 (scaffold) — comparing my computed path against direction-1's already-shipped INDEX
- **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md` §4 (lines 81-93)
- **Description:** Parent SPEC §4 prescribes the stylesheet chain as `<link rel="stylesheet" href="../../../../shared/css/variables.css">` (4 levels up). The actual path from `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-N-X/INDEX.html` to repo-root `shared/css/` is FIVE levels up (1: `direction-N`, 2: `design-system-mockups`, 3: `architecture-brief`, 4: `Module 1.5 - Shared Components`, 5: `modules`). Direction-1's executor caught this and shipped `../../../../../` (5 levels). I followed the corrected pattern. The SPEC text remains wrong as written.
- **Reproduction:**
  ```
  head -16 "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/INDEX.html"
  # confirms ../../../../../ (5 dots up)
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §4): `../../../../shared/css/variables.css`
  - Actual (correct): `../../../../../shared/css/variables.css`
- **Suggested next action:** TECH_DEBT — fix parent SPEC §4 stylesheet chain text. Keep direction-1, direction-2, direction-3 as-shipped (they're correct).
- **Rationale for action:** Anyone reading the parent SPEC after this work closes will encounter the wrong path. Fixing the SPEC text prevents future-Claude or future-human confusion.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Two near-duplicate transform scripts left in `scripts/` after all 3 sub-phases close

- **Code:** `M1_5-DEBT-03c-01`
- **Severity:** LOW
- **Discovered during:** Commit 2 (writing the sibling d3 transform script)
- **Location:** `scripts/transform-mockup-d1.mjs` (158 lines) + `scripts/transform-mockup-d3.mjs` (this SPEC, 158 lines). (3b's chat reportedly used a one-shot `_staticize-tmp.mjs` at repo root and removed it pre-commit per 3b's CHANGELOG entry, so 3b leaves no script behind — good pattern, but inconsistent with 3a + 3c.)
- **Description:** Both d1 and d3 transform scripts are short-lived one-offs (their own header comments say "Delete this file after SPEC closes"). With all 3 sub-phases now closed, neither has further use. Their continued presence is mild repo-hygiene drift (Rule 21 spirit: don't leave orphans). My d3 script was deliberately a sibling of d1 (rather than parameterizing d1) for 3 reasons: (a) avoid edit-racing with the in-flight 3a chat at the time, (b) different mock blocks differ enough that parameterization adds complexity, (c) both are slated for deletion anyway.
- **Reproduction:** `ls scripts/transform-mockup-*.mjs` → 2 files.
- **Expected vs Actual:**
  - Expected (per script header comments): both files deleted after SPEC closes.
  - Actual: both remain in tree.
- **Suggested next action:** TECH_DEBT — sweep both in a follow-up cleanup commit, ideally folded into the `M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE` SPEC's first commit (which already plans to archive 2 rejected directions to `_archive/`).
- **Rationale for action:** Low priority. Two 158-line one-off scripts are not a security or correctness issue. But Rule 21 says "no orphans" and these are textbook orphans once Phase 4 starts.
- **Foreman override (filled by Foreman in review):** { }

---
