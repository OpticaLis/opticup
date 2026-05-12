# FINDINGS — M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-11
> **Companion to:** `EXECUTION_REPORT.md`

5 findings logged. None absorbed silently.

---

## F1 — Parent SPEC §4 stylesheet-chain depth is off by one [HIGH]

**Severity:** HIGH (blocks 3b + 3c if not corrected — same bug; INDEX renders empty if executor uses literal value)
**Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md` §4
**Description:** Parent SPEC §4 prescribes `../../../../shared/css/variables.css` (4 levels of `..`). The actual depth from `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-N/file.html` to repo root is **5 directories**, not 4. Counting: `direction-N/` → `..` = `design-system-mockups/`; `..` again = `architecture-brief/`; `..` again = `Module 1.5 - Shared Components/`; `..` again = `modules/`; `..` again = repo root. Total: 5 `..` levels.
**Evidence:** Used `../../../../../shared/css/...` (5 levels) in INDEX.html and all 13 module HTMLs and verified via direct file inspection — `realpath` would confirm. SPEC §3 criterion #15 ("INDEX opens cleanly in Chrome — 0 console errors") would deterministically fail with the literal 4-level value because every shared CSS would resolve to `modules/shared/css/...` (non-existent).
**Suggested next action:** **EDIT parent SPEC §4 NOW** before 3b + 3c execute. Single character fix: `../../../../` → `../../../../../` in the code block. If 3b/3c already ran with the wrong value, every module HTML in those directions has 8 broken stylesheet links — a follow-up fixup SPEC is then needed.

---

## F2 — SPEC §3 criterion #3 commit count is brittle when other sub-phases sit unpushed [MEDIUM]

**Severity:** MEDIUM (false-flags when concurrent sub-phases share `develop` without push)
**Location:** This SPEC's §3 criterion #3
**Description:** Criterion measures `git log origin/develop..HEAD --oneline | wc -l == 5`. This compares the entire delta between local develop and origin/develop, not the delta authored by this SPEC. When sub-phases 3a + 3b + 3c run in three parallel chats — which the parent SPEC §13 explicitly authorizes — each chat's executor will see the OTHER chats' unpushed commits as part of their own delta. In this run, the count was 10 (6 pre-existing or concurrent from 3b/3c + 4 from 3a + 1 retro = 11).
**Evidence:** `git log origin/develop..HEAD --oneline` at session end showed 10 commits, only 5 of which (4 + this retro) belong to this SPEC.
**Suggested next action:** Subject-filter the criterion. Replace with:
`git log origin/develop..HEAD --oneline --grep="direction-1\|M1_5_DESIGN_SYSTEM_MOCKUPS_3A" | wc -l == 5`
Or: count only commits whose subject matches the SPEC §9 commit plan.

---

## F3 — Parallel session(s) running 3b + 3c concurrently on the same `develop` branch [HIGH]

**Severity:** HIGH (CLAUDE.md §9 Multi-Machine rule: "never work on two machines simultaneously on the same branch")
**Location:** Local repo state across multiple chats
**Description:** At session start and throughout execution, the `develop` branch carried 6 unpushed commits with subjects like `feat(design-system): direction-2-modern-clean scaffold`, `feat(design-system): direction-3-bold scaffold`, `feat(design-system): direction-2 module HTMLs — M1..M5`, etc. During this session, the M1.5 docs files (`MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md`) were modified externally between my Read and Edit operations to include Phase 3b and Phase 3c content — confirming that other sessions are committing in real time. Untracked files appeared and disappeared (e.g. `_staticize-tmp.mjs`).
**Evidence:**
- Pre-existing commits: `f436ac5` (D3 scaffold), `0d19300` (D2 scaffold), `e0b1e8f` / `cebb7df` (D2/D3 batch 1), `17cd086` / `a128065` (D2/D3 batch 2).
- System reminders during this session: 3 docs files modified by another agent between my Edit and the next read.
- Untracked artefacts in repo at SPEC close: 6 partial HTMLs (M13/M14/M15) in `direction-2-modern-clean/` and `direction-3-bold-dense-pro-tool/`, plus `_staticize-tmp.mjs` at repo root.
**Suggested next action:** The Foreman should reconcile the 3 sub-phases together. Possible: a single "Phase 3 trio close" SPEC that pulls all three EXECUTION_REPORTs into one review. The parallel-execution pattern is workable, but the executors need to coordinate doc edits — perhaps Phase 4 SPEC should explicitly assert "only one chat updates M1.5 docs; the other two report changes for that chat to merge". If this isn't formalized, future overlapping work will keep producing edit conflicts surfaced after-the-fact via linter/system reminders.

---

## F4 — Parent §3 staticization rule conflicts with sketch preservation when mockups use custom CSS [LOW]

**Severity:** LOW (workable interpretation exists; will recur in 3b + 3c)
**Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md` §3 (mockup-sourced section)
**Description:** Parent §3 #2 for mockup-sourced HTMLs says: "Remove inline `<style>` blocks that hardcode hex colors — extract into the direction's `_tokens.css` if unique need, OR delete (let shared component CSS handle)." But M5–M15 mockups use custom class names like `.top-nav`, `.app`, `.header` that are NOT covered by shared CSS. Deleting their `<style>` blocks would render naked unstyled HTML, destroying sketch-preservation fidelity (§3 #14).
**Evidence:** Read of M5_CUSTOMERS_LIST_MOCKUPS.html showed an inline `<style>` block defining `.top-nav`, `.app`, `.header`, etc. — none of these exist in `shared/css/components.css` or sibling files. Deleting would have failed criterion #14 (sketch preservation).
**Suggested next action:** Parent §3 needs a precedence clarification — "sketch preservation supersedes `<style>` deletion" or "keep `<style>` blocks; only strip hex from inline `style=""` attributes which is what criterion §3 #11 measures anyway." I took the latter interpretation. Foreman should codify this for 3b + 3c so they don't re-litigate.

---

## F5 — `docs/FILE_STRUCTURE.md` not updated for new transform script [LOW]

**Severity:** LOW (single missed doc entry; not a blocker)
**Location:** `docs/FILE_STRUCTURE.md` — not touched by this SPEC
**Description:** This SPEC added `scripts/transform-mockup-d1.mjs` (a new file under `scripts/`). The executor SKILL.md says "When you add ... a file → update `docs/FILE_STRUCTURE.md`". SPEC §8 "Modified files" did NOT list `docs/FILE_STRUCTURE.md`, so the executor followed the SPEC's expected-modifications list over the skill's generic rule. Skill-rule vs SPEC-list precedence is unclear.
**Evidence:** `git diff` shows no `docs/FILE_STRUCTURE.md` change. The file remains stale w.r.t. the new script.
**Suggested next action:** Add a one-line entry under `scripts/` in `docs/FILE_STRUCTURE.md` when 3b/3c reuse / retire the transformer, OR retire the script at Phase 4 close. Foreman to decide.
