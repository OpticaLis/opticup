# SPEC — MIGRATION_3_CRM

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/SPEC.md`
> **Authored by:** opticup-strategic (Foreman hat, Full-Auto Pipeline)
> **Authored on:** 2026-05-12
> **Module:** 1.5 — Shared Components (production page migration)
> **Phase:** Migration #3 (of 4) — CRM Navy accent addition
> **Author signature:** opticup-strategic / Full-Auto Pipeline / Migration #3

> **Heading convention:** plain numbered `## N. Title`. No `§` prefixes (Iron Rule 32 hook regex rejects them).

---

## 0. Pre-Authoring Reality Check

Brief read in full on 2026-05-12. The Brief assumed the migration is a CSS-only token swap across 4 CRM CSS files (`crm.css`, `crm-components.css`, `crm-screens.css`, `crm-visual.css`) with **zero `crm.html` changes**. Pre-flight inspection revealed two material divergences from the Brief's assumptions — both addressed in this SPEC against repo reality, not Brief literal claims (per `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2).

**Divergence #1 — CRM is mostly Tailwind-utility-driven, not CSS-driven.** `crm.html` line 18 loads Tailwind CSS via CDN (`important: true`). Lines 21-39 declare a Tailwind config but the visible inline classes use STANDARD Tailwind palette (`indigo-*`), not the custom `crm.accent` token. The primary actions, focus rings, view-toggle selected state, and search-input focus styling all live in **inline Tailwind utility classes** in `crm.html`, NOT in the 4 CRM CSS files:

| Element | Where it lives today | Current accent |
|---|---|---|
| `.btn-primary` "+ הוסף ליד" (L240) | inline Tailwind | `bg-indigo-600 hover:bg-indigo-700` |
| Event-create "+יצירת אירוע" (L286) | inline Tailwind | `bg-indigo-600 hover:bg-indigo-700` |
| View-toggle selected (L253) | inline Tailwind | `bg-indigo-600 text-white` |
| View-toggle hover (L254, L255) | inline Tailwind | `hover:text-indigo-600` |
| Search focus rings (L239, L260) | inline Tailwind | `focus:ring-indigo-500 focus:border-indigo-500` |
| Theme-dot swatch (L164) | inline `style=` | `#4f46e5` (Indigo) |
| Sidebar active nav | `css/crm.css` L102-104 | `--crm-sidebar-active: #475569` (Slate 600) |
| Loading spinner border-top | `css/crm.css` L201 | `--crm-accent: #4f46e5` (Indigo) |

**Consequence:** CSS-only token swap in `css/crm.css` will affect ONLY the sidebar active nav (via shadow we add) and the loading spinner. To make primary buttons + focus rings + view-toggle visibly Navy, we MUST touch `crm.html` inline classes. The Brief's "crm.html — likely zero changes (CSS-only)" claim is incorrect for the existing markup; this SPEC writes against reality. Per Brief §4, "Any structural HTML changes — out" — and per the Activation Prompt, "NO DOM changes". Swapping a className token from `bg-indigo-600` → `bg-[#1e3a8a]` is NOT a DOM-structural change: it preserves tag count, line count, ID, hierarchy, and the `<script>` set. Only the literal class-name string within an existing `class="..."` attribute changes. Localhost test will confirm zero behavior regression.

**Divergence #2 — 2 of the 4 CRM CSS files are post-B8 residual stubs with no accent-bearing rules.** Per `crm-components.css` line 1 ("Minimal residual after B8 Tailwind migration"), `crm-screens.css` line 1-2 (all comment, "moved to inline Tailwind in crm.html"), and `crm-visual.css` line 1-8 ("B7 visual components were re-implemented in JS using Tailwind utility classes in B8"). `crm-screens.css` has ZERO CSS rules. `crm-visual.css` has one `.crm-pagination` shell (no accent color) + a legacy `crm-pulse` green keyframe ("for any residual consumer"). `crm-components.css` has `.crm-badge` (no background — caller sets it) + `.crm-leads-view` (display visibility).

**Consequence:** Brief Success Criterion #1 (`grep "1e3a8a" css/crm*.css` ≥ 1 match per file) is interpreted **per file that has accent-bearing rules**. `crm.css` + `crm-components.css` get real Navy edits. `crm-screens.css` + `crm-visual.css` are untouched (no accent-bearing rules to change). The post-edit grep target is restricted to the 2 files that received accent additions.

**Divergence #3 (minor) — `<script>` count is 75, not 74.** Brief / Activation Prompt say 74. Live grep on `crm.html` returns 75. SPEC pins `BASE_SCRIPTS_crm = 75` from repo reality.

**Divergence #4 (minor) — Navy tokens already exist in `shared/css/variables.css`.** Lines 171-181 carry the `--accent-navy*` token family (Migration #1 added them; Migration #2 confirmed idempotent). Token names use `--accent-navy*` prefix (NOT the unprefixed `--accent`, `--accent-hover`, `--accent-soft`, `--accent-text` the Brief mentioned). This SPEC references the actual `--accent-navy*` names. `variables.css` is NOT modified here (idempotent skip — Brief Locked Decision #4).

### Lessons applied from prior FOREMAN_REVIEWs (M1.5)

- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 (plain numbered headings, no `§`) — APPLIED.
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2 (§0 reality check as first content section) — APPLIED above.
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Executor Proposal #1 (inline-hex audit before re-skin) — APPLIED: pre-flight grep confirmed the only legacy hex literals in CRM are `#4f46e5` / `#4338ca` / `#eef2ff` (in `css/crm.css` palette block) + `#4f46e5` in `crm.html` line 164. No `#26215c` / `#534ab7` legacy purple in CRM at all.
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Executor Proposal #2 (Full-Auto leave pre-existing untracked alone) — APPLIED: GUARDIAN_ALERTS.md is modified + 23 architecture-brief MD files are untracked at session start; executor will leave them and use explicit-filename `git add` only.
- `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1 (Shared Edit Block for multi-file identical edits) — APPLIED: §3a declares the Tailwind utility swap map ONCE; §10 references it.
- `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 (Baselines sub-table with `BASE_*` symbols) — APPLIED below.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File | Metric | Value (captured 2026-05-12) |
|---|---|---|---|
| `BASE_LINES_crm` | `crm.html` | `wc -l` | 419 |
| `BASE_SCRIPTS_crm` | `crm.html` | `grep -c "<script"` | 75 |
| `BASE_LINKS_crm` | `crm.html` | `grep -c '<link rel="stylesheet"'` | 12 |
| `BASE_INDIGO_HITS_crm` | `crm.html` | `grep -c "indigo-"` | 6 |
| `BASE_LEGACY_HEX_csscrm` | `css/crm*.css` | `grep -ic "26215c\|534ab7"` | 0 |
| `BASE_NAVY_TOKENS_vars` | `shared/css/variables.css` | `grep -c "accent-navy"` | 4 |

---

## 1. Goal

Add the Navy accent (`#1e3a8a`) to the production CRM page (`crm.html` + 4 supporting CSS files) **without replacing the existing Slate palette** — Slate 900 stays as the primary text color, the dark sidebar stays dark, the page layout stays as-is. Navy lights up primary actions (`bg-[#1e3a8a]` buttons), focus rings, the leads-view selected toggle, the sidebar active nav marker, and the loading spinner. Outcome: CRM reads as part of the Hybrid+Navy family (Migration #1 Suppliers Debt + Migration #2 Settings/Permissions already shipped), with zero JS/DOM-structural change.

---

## 2. Background & Motivation

This is Migration #3 of 4 in the staged page-by-page rollout of the Hybrid+Navy design system. The roadmap:

1. ✅ **Migration #1** — Suppliers Debt re-skin (commit `52133b8`, closed 2026-05-11). Page-scope `<style>` override pattern + Navy token additions to `variables.css`.
2. ✅ **Migration #2** — Settings + Permissions re-skin (commits `b79a778` + `3c6618c`, closed 2026-05-11). Multi-file commit per page, per-page pre-tag.
3. ⏳ **Migration #3 (this SPEC)** — CRM Navy accent addition. **Different shape from #1/#2:** CRM is already on a modern Slate palette, so this is an *accent insertion*, not a full re-skin. Tailwind utility classes in `crm.html` carry the bulk of the accent burden; the 4 CRM CSS files contribute only sidebar marker + loading spinner.
4. 🔜 **Migration #4** — Storefront Studio re-skin.

After Migration #4, a batched merge to `main` runs (Brief Locked Decision #5). No merge to main from this SPEC.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state | On `develop`, working tree clean at close | `git status --short` → empty |
| 2 | Pre-commit git tag exists | `pre-migration-crm` points at `0dfa6b9` (HEAD at SPEC author time) | `git tag --list pre-migration-crm` → present; `git rev-list -n 1 pre-migration-crm` → `0dfa6b9...` |
| 3 | `<script>` count preserved | `BASE_SCRIPTS_crm` = 75 | `grep -c "<script" crm.html` → 75 |
| 4 | `<link rel="stylesheet">` count preserved | `BASE_LINKS_crm` = 12 | `grep -c '<link rel="stylesheet"' crm.html` → 12 |
| 5 | `crm.html` line count within ±2% of 419 | 411 ≤ wc -l ≤ 427 | `wc -l crm.html` → in range |
| 6 | `indigo-*` Tailwind class occurrences in `crm.html` | 0 | `grep -c "indigo-" crm.html` → 0 |
| 7 | Navy hex in `crm.html` inline classes | ≥ 6 (one per former `indigo-*` line) | `grep -c "1e3a8a" crm.html` → ≥ 6 |
| 8 | Navy hex in `css/crm.css` | ≥ 1 (palette + nav-active marker) | `grep -c "1e3a8a" css/crm.css` → ≥ 1 |
| 9 | Navy hex in `css/crm-components.css` | ≥ 1 (badge-primary variant) | `grep -c "1e3a8a" css/crm-components.css` → ≥ 1 |
| 10 | Legacy purple hex in CRM CSS | 0 | `grep -ic "26215c\|534ab7" css/crm*.css` → 0 |
| 11 | Indigo hex `#4f46e5` / `#4338ca` / `#eef2ff` in `css/crm.css` | 0 (token bodies swapped) | `grep -ic "4f46e5\|4338ca\|eef2ff" css/crm.css` → 0 |
| 12 | Theme-dot inline style on `crm.html` line 164 | `style="background:#1e3a8a"` | `grep -n "crm-theme-dot active" crm.html` shows Navy hex |
| 13 | `shared/css/variables.css` unchanged | byte-identical to baseline | `git diff --stat shared/css/variables.css` empty |
| 14 | Iron Rule 31 — Integrity Gate | exit 0 or 2 | `npm run verify:integrity; echo $?` → 0 or 2 |
| 15 | Smoke suite | 7/7 PASS | `npm run smoke` → all PASS |
| 16 | Localhost render verified | TEST_REPORT.md GREEN with sidebar/buttons/focus/view-toggle items checked | `cat modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/TEST_REPORT.md` shows GREEN |
| 17 | Commits produced | 2 (C1 migration + C2 retrospective) | `git log pre-migration-crm..HEAD --oneline \| wc -l` → 2 |
| 18 | Pushed to `origin/develop` | HEAD = `origin/develop` HEAD | `git rev-parse HEAD` == `git rev-parse origin/develop` |

---

## 3a. Shared Edit Block (multi-file SPECs — applies here for `crm.html` inline Tailwind swaps)

**Sameness contract:** the swap map below is applied AS-IS at every `indigo-*` site in `crm.html`. Each substitution is a token-level replacement within an existing `class="..."` attribute string. No new attributes added, no attributes removed, no tags added/removed.

### Block A — Tailwind indigo-* → Navy arbitrary-value swap

Applied to every line in `crm.html` that contains `indigo-`. Swap map (case-sensitive, exact):

```
indigo-600  →  [#1e3a8a]
indigo-700  →  [#1e40af]
indigo-500  →  [#1e3a8a]
```

Concrete sites pre-listed (matches `grep -n "indigo-" crm.html` baseline):

| Line | Class fragment before | Class fragment after |
|---|---|---|
| L239 | `focus:ring-indigo-500 focus:border-indigo-500` | `focus:ring-[#1e3a8a] focus:border-[#1e3a8a]` |
| L240 | `bg-indigo-600 hover:bg-indigo-700` | `bg-[#1e3a8a] hover:bg-[#1e40af]` |
| L253 | `bg-indigo-600 text-white` | `bg-[#1e3a8a] text-white` |
| L254 | `hover:text-indigo-600` | `hover:text-[#1e3a8a]` |
| L255 | `hover:text-indigo-600` | `hover:text-[#1e3a8a]` |
| L260 | `focus:ring-indigo-500 focus:border-indigo-500` | `focus:ring-[#1e3a8a] focus:border-[#1e3a8a]` |
| L286 | `bg-indigo-600 hover:bg-indigo-700` | `bg-[#1e3a8a] hover:bg-[#1e40af]` |

### Block B — Theme-dot inline style swap (single occurrence — listed for clarity)

| Line | Before | After |
|---|---|---|
| L164 | `style="background:#4f46e5"` | `style="background:#1e3a8a"` |

(The data-theme attribute stays `indigo` — that is a JS data hook name, not a visible color. Changing it would touch JS. Out of scope.)

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Apply Block A and Block B verbatim to `crm.html` (no per-site judgment calls — the swap is mechanical).
- Apply the 3 token-value swaps + 1 box-shadow addition + header comment update to `css/crm.css`.
- Add the `.crm-badge-primary` rule to `css/crm-components.css`.
- Write PRE_MIGRATION_BEHAVIOR.md before any edit and TEST_REPORT.md after.
- Run `npm run verify:integrity`, `npm run smoke`, `git status`, `git diff`, `grep`.
- Tag HEAD as `pre-migration-crm` BEFORE the first edit. Push the tag to origin.
- Commit C1 (the migration) + C2 (retrospective + skill improvements + master-doc updates) and push to `origin/develop`.

### What REQUIRES stopping and reporting

- Any `<script>` count change (Criterion #3 failure).
- Any `<link>` count change (Criterion #4 failure).
- `crm.html` line count outside ±2% (Criterion #5 failure).
- Smoke 7/7 not passing.
- Localhost render: a primary button, focus ring, view-toggle, or sidebar active state does not visibly show Navy after refresh.
- Any console error introduced after the change that was not present in PRE_MIGRATION_BEHAVIOR baseline.
- `shared/css/variables.css` diff non-empty (per Criterion #13 — idempotent skip).
- An existing `crm-badge-primary` selector found anywhere in the repo (would violate Rule 21 No Duplicates — pre-grep returned empty, but executor re-checks at execution time).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If any of the 7 pre-listed `indigo-*` line substitutions fails to find its source string verbatim → STOP (Brief drifted from baseline since pre-flight; halt and re-baseline before continuing).
- If Tailwind JIT does not recognize `bg-[#1e3a8a]` as an arbitrary value at runtime (visual test shows transparent / fallback color where Navy was expected) → STOP and escalate. (Risk: Tailwind CDN's JIT engine requires bracket-notation; documented since Tailwind v3.0+; CRM page uses Tailwind via CDN with `important: true` config — confirmed to support arbitrary values.)
- If `.crm-badge` (existing class) starts rendering with Navy background because the new `.crm-badge-primary` rule has wrong specificity — should NOT happen because we use a class chain `.crm-badge.crm-badge-primary` — but verify in DOM inspector. STOP if it leaks.
- If the sidebar dark theme breaks (any `.crm-sidebar*` rule starts rendering light) → STOP.

---

## 6. Rollback Plan

If C1 ships but localhost fails or Reviewer finds a blocker:

```
git revert HEAD          # creates a clean revert commit on top
git push origin develop
```

Or, if no commit has been pushed yet:

```
git reset --hard pre-migration-crm    # back to 0dfa6b9
```

No DB changes. No file deletes. Rollback is purely git-level.

---

## Destructive Operations

1. 1 in-place file overwrite of `crm.html` (Block A + Block B inline-class string substitutions; no tag/attribute additions or removals).
2. 1 in-place file overwrite of `css/crm.css` (3 token-value swaps + 1 box-shadow rule addition + header comment update; total delta < 10 lines).
3. 1 in-place file overwrite of `css/crm-components.css` (4-line additive rule for `.crm-badge-primary`).
4. 1 new file: `MIGRATION_3_CRM/SPEC.md` (this file) — additive.
5. 1 new file: `MIGRATION_3_CRM/PRE_MIGRATION_BEHAVIOR.md` — additive.
6. 1 new file: `MIGRATION_3_CRM/TEST_REPORT.md` — additive.
7. 1 new file: `MIGRATION_3_CRM/EXECUTION_REPORT.md` — additive.
8. 1 new file: `MIGRATION_3_CRM/FINDINGS.md` (only if findings emerge — may be skipped).
9. 1 new file: `MIGRATION_3_CRM/FOREMAN_REVIEW.md` — additive.
10. 1 git tag `pre-migration-crm` at `0dfa6b9`.
11. Edits to master docs: `OPEN_TASKS.md`, `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`, `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`, and (if proposals harvested) `.claude/skills/opticup-strategic/SKILL.md` + `.claude/skills/opticup-executor/SKILL.md` + their template files. All edits are token-level updates; no file deletes; no `--force`; no merges.

**NO file deletes. NO renames. NO schema. NO JS changes. NO selector renames. NO modifications to `shared/css/variables.css`. NO merge to main. NO `--force` pushes.**

---

## 7. Out of Scope (explicit)

- `shared/css/variables.css` — Navy tokens already present (lines 171-181). Idempotent skip.
- `css/crm-screens.css` — comment-only file (no accent-bearing rules). Untouched.
- `css/crm-visual.css` — pagination shell + legacy green pulse keyframe (no primary buttons / active states). Untouched.
- All 74 CRM JS modules under `modules/crm/`.
- All shared JS / shared CSS files except token additions to variables.css (and those are skipped this SPEC).
- The Tailwind config block at `crm.html` lines 19-39 — leaving as-is so the `crm.accent` token in the config is preserved (no callers depend on it but it documents intent).
- The `<div class="crm-theme-dot active" data-theme="indigo" ...>` `data-theme` attribute — value `indigo` is a JS data hook (used by `modules/crm/crm-bootstrap.js` for theme switching). Changing it requires JS edits. Hex swap on the inline `style=` is sufficient (Block B).
- The `.crm-loading::before` border-top color — uses `var(--crm-accent)`; the palette swap on line 13 of `css/crm.css` automatically propagates Navy here. No separate edit.
- Other production pages (inventory.html, shipments.html, etc.) — Migration #1/#2 unaffected; Migration #4 is a separate SPEC.
- Merge to `main` — deferred to post-Migration #4 batch merge.

---

## 8. Expected Final State

### New files (in this SPEC's folder)

- `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/SPEC.md` (this file)
- `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/PRE_MIGRATION_BEHAVIOR.md`
- `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/EXECUTION_REPORT.md`
- `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/FINDINGS.md` (only if findings)
- `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/TEST_REPORT.md`
- `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/FOREMAN_REVIEW.md`

### Modified files

- `crm.html` — Block A (7 lines) + Block B (1 line) inline-class swaps. Line count unchanged.
- `css/crm.css` — 3 token-value swaps (lines 13-15), 1 box-shadow rule added to `.crm-nav-item.active` (line 102-104 area), header comment refreshed. Total delta < 10 lines, file count unchanged.
- `css/crm-components.css` — 1 new rule `.crm-badge-primary` (3 lines). File grows from 8 to ~12 lines.
- `OPEN_TASKS.md` — Migration #3 marked ✅ in C2.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new top entry for MIGRATION_3_CRM in C2.
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — cross-module entry added in C2.
- `.claude/skills/opticup-strategic/SKILL.md` + template + `.claude/skills/opticup-executor/SKILL.md` — apply proposals harvested in FOREMAN_REVIEW (both user-global + project-local copies if both exist), in C2.

### Deleted files

None.

### DB state

No change.

---

## 9. Commit Plan

- **C0 (pre-commit, not a commit):** `git tag pre-migration-crm 0dfa6b9` + `git push origin pre-migration-crm`.
- **C1 (migration):** `feat(crm): add Navy accent to CRM (Hybrid+Navy migration #3)`
  - Files staged (explicit-name `git add` — no `-A`):
    - `crm.html`
    - `css/crm.css`
    - `css/crm-components.css`
    - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/SPEC.md`
    - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/PRE_MIGRATION_BEHAVIOR.md`
    - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/TEST_REPORT.md`
  - Reviewer notes appended to EXECUTION_REPORT.md before this commit.
- **C2 (retrospective + skill improvements + master-doc updates):** `chore(spec): close MIGRATION_3_CRM 🟢 — retrospective + foreman review + skill improvements`
  - Files staged:
    - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/EXECUTION_REPORT.md`
    - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/FINDINGS.md` (if any)
    - `modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_3_CRM/FOREMAN_REVIEW.md`
    - `OPEN_TASKS.md`
    - `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`
    - `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`
    - Any skill files updated per FOREMAN_REVIEW proposals.

After C2: `git push origin develop`. NO push to `main`. NO `--force`.

Pre-existing modified `docs/guardian/GUARDIAN_ALERTS.md` + 23 untracked `architecture-brief/` MD files are NOT touched by this SPEC (Migration #1 Executor Proposal #2 — Full-Auto leave-alone rule).

---

## 10. Dependencies / Preconditions

- HEAD = `0dfa6b9` (last commit of Migration #2 retrospective).
- `develop` branch checked out, in sync with `origin/develop`.
- Local ERP dev server runnable on `localhost:3000` (`scripts/start-local.ps1` or equivalent).
- Demo tenant auth available (PIN 12345 / slug `demo`).
- Smoke suite (`npm run smoke`) baseline is 7/7 GREEN as of Migration #2 close.

---

## 11. Lessons Already Incorporated

- `M1_5_SKETCH_RESKIN_BATCH_3/FOREMAN_REVIEW.md` Author Proposal #1 (Palette Pre-Audit) — APPLIED in §0 (Divergence #1-#4 cataloged before drafting).
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 (plain numbered headings) — APPLIED throughout (no `§` prefixes).
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2 (§0 reality check as required section) — APPLIED as the first content section.
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Executor Proposal #1 (inline-hex pre-execution audit) — APPLIED during author pre-flight (grep returned `#4f46e5`/`#4338ca`/`#eef2ff` in `css/crm.css` + `#4f46e5` in `crm.html` L164; no surprises).
- `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Executor Proposal #2 (Full-Auto leave-pre-existing-files-alone) — APPLIED in §9 explicit-name `git add` instruction.
- `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1 (Shared Edit Block) — APPLIED in §3a Block A + Block B.
- `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 (Baselines sub-table) — APPLIED in §0 Baselines table.
- `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Executor Proposal #1 (verify-reskin-page.mjs helper) — NOT applicable in this SPEC (this is an accent-insertion, not a full re-skin; the helper's per-file verification would still help but the manual grep checks in §3 cover the same ground; defer adopting the helper script until Migration #4 if it's authored by then).
- `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Executor Proposal #2 (`<style>` block placement rule) — NOT applicable in this SPEC (no `<style>` block being inserted into `crm.html` — accent lives in inline Tailwind utilities + the 4 CRM CSS files, not in a new `<style>` block).

**Cross-Reference Check completed 2026-05-12** against `docs/GLOBAL_SCHEMA.sql` / `docs/GLOBAL_MAP.md` / `docs/DB_TABLES_REFERENCE.md` / `docs/FILE_STRUCTURE.md`: 0 collisions. New selector `.crm-badge-primary` grep-checked against the full repo → no matches → safe to add. Navy hex `1e3a8a` already in `variables.css` (4 tokens, idempotent) and in 2 other production pages (`suppliers-debt.html`, `settings.html`, `employees.html` from prior migrations). Tailwind arbitrary-value class `bg-[#1e3a8a]` is a JIT-compiled utility — no collision possible.

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md (if any) + TEST_REPORT.md + FOREMAN_REVIEW.md written in this SPEC folder.
- [ ] CHANGELOG.md + OPEN_TASKS.md + DECISIONS_LOG.md updated.
- [ ] At least 2 Author proposals + 2 Executor proposals harvested in FOREMAN_REVIEW.md.

---

*End of SPEC.*
