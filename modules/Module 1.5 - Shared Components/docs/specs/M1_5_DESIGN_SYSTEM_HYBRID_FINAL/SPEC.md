# SPEC — M1_5_DESIGN_SYSTEM_HYBRID_FINAL

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components
> **Phase:** Design System Hybrid Final (post-v2 consolidation)
> **Source brief:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_HYBRID_BRIEF.md` (v3, 2026-05-11)

---

## 1. Goal

Produce the **final design language for Optic Up** — codenamed **"Hybrid"** — as a self-contained mockup set under `architecture-brief/design-system-mockups/hybrid-final/`. Hybrid keeps the **page structure of Language B (Stripe)** — hero + metrics row + content cards + pills + role tiles — and replaces B's topbar with the **left sidebar navigation pattern of Language A (Linear)**. The whole accent palette is **Navy Blue (`#1e3a8a`)** instead of v2-B's violet, and **all serif typography is removed**. After Daniel approves Hybrid, this becomes the platform default and per-module migration SPECs port production HTML to it.

---

## 2. Background & Motivation

Two prior design-system rounds shaped this SPEC:

- **v1 — staticization of production HTML (early 2026, archived).** Failed. The output captured what the project looked like, not what it *should* look like. Archived to `_archive/design-system-v1/`.
- **v2 — three authentic languages from scratch via Claude Designs (`M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES`, closed 2026-05-11, commits `af06c56` → `23349de`).** Succeeded as an exploration: 3 distinct languages (A=Linear, B=Stripe, C=Notion) shipped end-to-end with INDEX cross-language switching. Daniel reviewed all three and picked Stripe (B) as the structural foundation, harvested two specific improvements from Linear (A) — the sidebar nav and the tight table density — and rejected B's violet accent + serif supplier names.

This SPEC is **ONE consolidating SPEC, not three**, because the design exploration phase is over. The architect's brief (`DESIGN_SYSTEM_HYBRID_BRIEF.md` v3) already locks the 12 design decisions; the Foreman's job here is to translate those decisions into measurable executor instructions for a single continuous-run delivery. Splitting into sub-SPECs would re-introduce the per-language overhead that the consolidation is meant to eliminate.

The 3 existing language folders (`language-a-linear/`, `language-b-stripe/`, `language-c-notion/`) **stay in place untouched** as historical reference — they are not the deliverable, they are the source material the executor consults while building the new hybrid folder from scratch.

---

## 3. Success Criteria (Measurable)

Total HTML files in the new folder: **6** (`INDEX.html` + 5 module HTMLs). Total files in the new folder: **7** (6 HTML + 1 CSS token file). All grep commands run from repo root unless noted.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at finish | On `develop`, only the files this SPEC authorizes are changed/added | `git status --short` shows only the SPEC's authorized paths |
| 2 | Commits produced | Exactly **3** commits (scaffold, modules, docs) | `git log 23349de..HEAD --oneline \| wc -l` → `3` |
| 3 | New folder created | `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/` exists with **7** files inside | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/" \| wc -l` → `7` |
| 4 | The 7 files are exactly these | `_tokens.css`, `INDEX.html`, `permissions.html`, `settings.html`, `shipments.html`, `storefront-studio.html`, `suppliers-debt.html` | `ls .../hybrid-final/` → that exact set, no more, no less |
| 5 | Sidebar present on every screen | Every HTML in `hybrid-final/` contains `class="sidebar"` (or an equivalent class declared in `_tokens.css` and used consistently across all 6 HTMLs) | `grep -l 'class="sidebar"' "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/"*.html \| wc -l` → `6` |
| 6 | Hero block present on every module screen | Every module HTML (5 files, NOT INDEX) contains `class="hero"` (or an equivalent class) | `grep -l 'class="hero"' "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/"{storefront-studio,permissions,shipments,settings,suppliers-debt}.html \| wc -l` → `5` |
| 7 | Metrics row of 4 cards on every module screen | Every module HTML contains a metrics row with exactly 4 metric cards (label + value, optional trend); each metric card uses an accent bar on top | `grep -c 'class="metric-card"' .../hybrid-final/{storefront-studio,permissions,shipments,settings,suppliers-debt}.html` → each line ≥ `4` |
| 8 | No violet anywhere | Zero matches | `grep -irE "635bff\|a78bfa\|violet\|purple" "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/"` → 0 matches (exit code 1 from grep) |
| 9 | No serif used as a typography choice | Zero matches in HTML files; in `_tokens.css`, `serif` may appear ONLY inside a `--font-sans` fallback chain (e.g. `system-ui, …, serif` as the absolute last fallback is acceptable; a dedicated `--font-serif` token or a `Source Serif` reference is forbidden) | `grep -irE "Source Serif\|font-serif\|--font-serif" .../hybrid-final/` → 0 matches; `grep -iE "serif" .../hybrid-final/_tokens.css` only inside `--font-sans` declaration |
| 10 | Real supplier names appear in suppliers-debt | All 6 names present at least once: `Luxottica`, `Safilo`, `Marcolin`, `Hoya`, `Carl Zeiss Vision`, `Optical Frame Israel` | `for n in Luxottica Safilo Marcolin Hoya "Carl Zeiss Vision" "Optical Frame Israel"; do grep -q "$n" .../hybrid-final/suppliers-debt.html \|\| echo MISSING "$n"; done` → no MISSING lines |
| 11 | RTL Hebrew across all 6 HTMLs | Every HTML in `hybrid-final/` declares `<html lang="he" dir="rtl">` | `grep -lE 'lang="he"\s+dir="rtl"' .../hybrid-final/*.html \| wc -l` → `6` |
| 12 | Navy palette in tokens — required values | `_tokens.css` defines `--accent: #1e3a8a` and `--accent-soft: #e6f1fb` (case-insensitive, exact hex) | `grep -iE -- "--accent:\s*#1e3a8a" .../hybrid-final/_tokens.css` → 1 match; `grep -iE -- "--accent-soft:\s*#e6f1fb" .../hybrid-final/_tokens.css` → 1 match |
| 13 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 14 | Smoke baseline | 7 of 7 PASS (no regression from production code, since this SPEC does NOT touch production HTML) | `npm run smoke` → "7/7 PASS" |
| 15 | Table density at 1080p | At a 1920×1080 viewport with the file opened in a browser, every table on a screen that has a table renders **≥ 6 data rows visible above the fold** without page scroll | Manual visual check during Localhost-Tester pass; executor self-reports observed row count in EXECUTION_REPORT §3 |
| 16 | 1080p hero + metrics + 6-row table fit | At 1920×1080, hero + metrics-row + first 6 rows of the primary table all fit in one viewport on at least 3 of the 5 module screens | Manual visual check; executor self-reports in EXECUTION_REPORT §3 |

**Total = 16 measurable criteria.** Criterion #2 anchors the commit count to a starting hash (`23349de`) so the executor cannot inflate it. Criteria #15-#16 are manual because viewport rendering is not grep-able — they're explicitly self-reported in the EXECUTION_REPORT, and the Foreman validates by opening the files in a browser before writing FOREMAN_REVIEW.md.

---

## 4. Autonomy Envelope — Continuous-Run Mandate

This SPEC is **executed in one continuous Claude Code session, end-to-end**, with no Foreman pings, no mid-stream design questions, and no sub-phase splits. The 5-agent chain (Foreman → Executor → Reviewer → Localhost-Tester → Foreman) runs once over the full deliverable.

### What the executor CAN do without asking
- Read any file in the repo, including the 3 existing language folders for structural reference.
- Decide ALL per-element design details inside the Hybrid envelope: exact spacings, exact pixel sizes for padding/margins/gaps, button shapes (within the radius rules: 12px cards / 8px buttons / 999px pills), shadow elevations, hover states, focus rings, icon choices, micro-copy wording, exact metric values, exact table column counts, exact sidebar section ordering.
- Decide the exact contents of the hero one-liner sentence on each screen, as long as it surfaces real actionable context derived from the data on that screen (per brief §6 #2).
- Decide the exact 4 metric labels/values for each screen, as long as they are realistic for that module's domain.
- Copy structural skeleton from `language-b-stripe/*.html` as a starting point (per brief §8 anti-pattern #6 caveat: "informed by v2-B as the structural reference"), then **rewrite the markup with the new tokens, sidebar, and absence of violet/serif**. Note: this is "informed by" not "copied wholesale" — direct duplication of B's files with token swaps is allowed because B is the locked structural foundation per brief Decision #2.
- Consult `language-a-linear/*.html` for sidebar implementation patterns (section labels, active-item highlighting, brand-mark placement).
- Commit and push to `develop` per the Commit Plan in §9.
- Run the standard verify scripts (`npm run verify:integrity`, `npm run smoke`).
- Bundle a §3 SC hotfix into Commit 3 if a criterion is found to fail at verification time (per the lesson from `M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/FINDINGS.md` Finding 5 — explicit authorization granted here).

### What REQUIRES stopping and reporting
- Integrity Gate (Iron Rule 31) reports a null-byte ERROR (exit 1) at any point.
- Any criterion in §3 cannot be achieved as authored, AND the deviation is not a SPEC-arithmetic-error the executor can self-correct (see §5 trigger #4).
- An Iron Rule (any of 1-23, 31) would be violated by the next planned step.
- Production HTML at repo root (`*.html`) gets modified — production is explicitly OUT OF SCOPE (see §7).
- Any of the 3 existing language folders (`language-a-linear/`, `language-b-stripe/`, `language-c-notion/`) gets modified — they are reference-only.

### What the executor MUST NOT stop for
- "Should I split this into sub-phases?" — answer is NO. One continuous run.
- "Which exact shade of grey for the table zebra stripe?" — Executor's call.
- "Should I add a secondary accent color?" — answer is NO. Navy + neutrals + semantic only (per brief §8 anti-pattern #1).
- "Should I staticize a production page to save time?" — answer is NO. Claude Designs from scratch (per brief §8 anti-pattern #6).
- "The user typed the wrong commit count" — if §3 says 3 commits and the work fits in 3 commits, do 3 commits. If a SPEC-arithmetic discrepancy is discovered (per FINDINGS lesson from prior SPEC), self-correct and log in EXECUTION_REPORT.md.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. **Production-HTML modification.** If any file at repo root matching `*.html` (the 18 production HTML pages listed in CLAUDE.md §0.5 Category 3) appears in `git diff` at commit time → STOP. This SPEC does not touch production.
2. **Reference-folder modification.** If any file under `architecture-brief/design-system-mockups/language-{a,b,c}-*/` appears in `git diff` → STOP. The 3 prior folders are immutable references.
3. **Pre-existing untracked / modified items (KNOWN BASELINE, NOT a deviation):** the following exist at session start per session-start `git status` and MUST be left untouched by this SPEC. Their presence is NOT a stop trigger; commits MUST use explicit-filename `git add` to avoid sweeping them in:
   - `OPEN_TASKS.md` (modified, unstaged)
   - `TECH_DEBT.md` (modified, unstaged)
   - `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_HYBRID_ACTIVATION_PROMPT.md` (untracked)
   - `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_HYBRID_BRIEF.md` (untracked — the source brief for this SPEC)
   - `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_PHASE_3_V2_ACTIVATION_PROMPT.md` (untracked)
   - `modules/Module 3 - Storefront/docs/specs/M3_BRAND_CATALOG_MOBILE_2COL/` (untracked folder)
   - `modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` (untracked)
   - `modules/Module 3 - Storefront/docs/specs/M3_LIGHTHOUSE_NIGHTLY_CRON/SKILL_IMPROVEMENTS_TO_APPLY.md` (untracked)
   - `modules/Module 3 - Storefront/docs/specs/M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` (untracked)
   - `modules/Module 3 - Storefront/docs/specs/M3_REC014_ORPHAN_CLEANUP/SKILL_IMPROVEMENTS_TO_APPLY.md` (untracked)
   - `modules/Module 3 - Storefront/docs/specs/M3_TIER1_CATEGORY_SLUG_FIX/FOREMAN_REVIEW.md` (untracked)
   - `tests/optic.accdr`, `tests/optic_dt.accdb`, `tests/optic_dt_all.accdb` (untracked binary test artifacts)
4. **SPEC-arithmetic self-correction is allowed, not a stop trigger.** If a §3 expected value is internally inconsistent with §1/§8 (e.g. file count math is off by one), the executor MAY self-correct using the §1/§8 narrative as ground truth and log it in EXECUTION_REPORT.md §4. This lesson is applied directly from `M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/FINDINGS.md` Finding 1.
5. **Violet leak.** If `grep -irE "635bff|a78bfa|violet|purple"` returns ANY match anywhere under `hybrid-final/` after Commit 2 → STOP and either fix in-place or revert. Bundling a fix into Commit 3 is authorized.
6. **Serif leak.** Same shape as #5, for any reference to `Source Serif`, `--font-serif`, or `font-family:.*serif` outside the `--font-sans` system fallback chain.

---

## 6. Rollback Plan

This SPEC adds files only (no DB changes, no production HTML changes, no shared/JS changes). Rollback is trivial:
- `git reset --hard 23349de` — start commit before this SPEC.
- Optionally `git push --force-with-lease origin develop` (Daniel-authorized only — executor MUST NOT do this without explicit instruction from Daniel).
- No DB state to restore.
- Foreman marks the SPEC REOPEN with the gap captured for re-author.

---

## 7. Out of Scope (explicit)

**Hard "do not touch" list:**

- **Production HTML pages at repo root** (`index.html`, `admin.html`, `crm.html`, `inventory.html`, `settings.html`, `shipments.html`, `employees.html`, `landing.html`, `r.html`, `storefront-*.html`, `suppliers-debt.html`, etc — the 18 Category-3 files from CLAUDE.md §0.5). The Hybrid language ONLY lives as mockups; per-module migration is a future SPEC chain.
- **The 3 prior language folders** (`language-a-linear/`, `language-b-stripe/`, `language-c-notion/`). They stay as reference. No tokens to "harmonize," no cross-links to add, no cleanup, no archival in this SPEC. v1 stays archived where it is; v2 is closed and frozen.
- **Other modules** (M1 Inventory, M2 Platform Admin, M3 Storefront, M4 CRM, M5–M15). Their styling stays as-is. Hybrid does not propagate yet.
- **Storefront repo** (`opticalis/opticup-storefront`). Hybrid lives in the ERP repo's architecture-brief area only.
- **Dark mode.** Light only.
- **JS behavior.** Mockups are visual-only. No interactivity beyond the INDEX tab nav (CSS `:target` or minimal vanilla JS is acceptable, same pattern as v2).
- **DB schema.** No migrations, no Supabase calls.
- **`shared/`, `js/`, `css/`, `supabase/` directories.** Not touched.
- **`docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`, `MASTER_ROADMAP.md` global narrative.** Only Module 1.5's local docs change (SESSION_CONTEXT, MODULE_MAP, CHANGELOG). Cross-module roadmap reconciliation is deferred to a future MASTER_ROADMAP_RECONCILIATION SPEC (per FINDINGS Finding 3 from prior SPEC).
- **Real production styling tokens** (anything outside `architecture-brief/design-system-mockups/hybrid-final/_tokens.css`). The new tokens file is self-contained inside the mockup folder; it does NOT live in `css/` or `shared/`.

---

## 8. Expected Final State

After the executor finishes:

### New files (exactly 7, no more, no less)

All under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/`:

1. `_tokens.css` — single CSS file with the Navy palette, typography (Inter + Heebo, sans-only), radii, shadows, semantic colors, sidebar / hero / metrics / card / pill / table component tokens.
2. `INDEX.html` — landing page with tab navigation across the 5 module screens. Reuses A's section pattern in the sidebar, B's hero+metrics on the main panel. Header brand mark = "Optic Up" in the sidebar header.
3. `storefront-studio.html` — Storefront Studio mockup. Hero: H1 + context sentence + primary action (e.g. "פרסום קמפיין"). Metrics row: 4 cards. Content cards: campaign tiles, recent edits, status pills.
4. `permissions.html` — Permissions mockup. Hero: H1 + context. Metrics row: 4 cards. **Role tiles row** (B's pattern) above the matrix: 4 cards showing role name + user count + permission count, with `--accent-soft` highlights. Matrix table with dense rows, mono font for permission codes.
5. `shipments.html` — Shipments + Boxes mockup. Hero: H1 + context (the brief's example sentence is a guide — "3 משלוחים בדרך, 7 ארגזים פתוחים, נעילה אוטומטית מתוזמנת ל-BX-0140-02 בעוד שעה ו-42 דקות"). Metrics row: 4 cards. Shipment list table with status pills, mono shipment/box IDs.
6. `settings.html` — Settings mockup. Hero: H1 + context. Metrics row: 4 cards (e.g. active users, configured branches, integrations, alerts). Settings sections as content cards.
7. `suppliers-debt.html` — Suppliers Debt mockup. Hero: H1 + context. Metrics row: 4 cards. Age-bar chart (semantic colors, NOT accent). Supplier list table with the 6 real names listed in §3 SC #10 + numeric debt columns using `font-variant-numeric: tabular-nums`.

### Modified files (Module 1.5 local docs only)

- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — add a new entry summarizing the Hybrid Final delivery (one short paragraph), pointing at the new folder.
- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` — add the 7 new files under the architecture-brief mockups section. Add-only — do not delete v1/v2 entries.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — add a phase section with the 3 commit hashes.
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/EXECUTION_REPORT.md` — written at close per executor protocol.
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/FINDINGS.md` — written at close per executor protocol.

### Deleted files

None. The 3 prior language folders are NOT deleted.

### Docs explicitly NOT updated in this SPEC (deferred)

- `MASTER_ROADMAP.md` — deferred to module close ceremony (per Out-of-Scope).
- `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql` — no global API/schema impact.
- `OPEN_TASKS.md`, `TECH_DEBT.md` — not part of this SPEC's scope; their pre-existing unstaged state is preserved per §5 trigger #3.

---

## 9. Commit Plan

Exactly **3** commits, anchored at start hash `23349de` (current HEAD on `develop`).

| # | Commit message | Authorized files |
|---|---|---|
| 1 | `feat(design): scaffold hybrid-final tokens + INDEX skeleton` | `architecture-brief/design-system-mockups/hybrid-final/_tokens.css`, `architecture-brief/design-system-mockups/hybrid-final/INDEX.html` (sidebar shell + tab nav, can be content-light at this point) |
| 2 | `feat(design): hybrid-final — 5 module screens (Stripe structure + Linear nav + Navy palette)` | The 5 module HTMLs: `storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html`. INDEX.html final content may also land here if it depends on the modules being present. |
| 3 | `chore(spec): close M1_5_DESIGN_SYSTEM_HYBRID_FINAL with retrospective` | `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`, `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md`, `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`, `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/EXECUTION_REPORT.md`, `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_HYBRID_FINAL/FINDINGS.md`. **A bundled SC hotfix to any of the Commit-1 or Commit-2 files MAY also land here**, explicitly authorized per FINDINGS Finding 5 from the prior SPEC. |

**Strict rules:**
- Every `git add` uses **explicit filenames**. Never `git add -A`, never `git add .` — the repo has the pre-existing untracked items from §5 trigger #3 that MUST NOT be swept in.
- Push to `origin develop` after each commit (no batched pushing).
- No `--amend`. If Commit 1 or 2 is wrong, fix in Commit 3 (or a follow-up if absolutely necessary, but the goal is to stay at exactly 3).

---

## 10. Dependencies / Preconditions

- `M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES` SPEC must be CLOSED (it is — closed in commit `23349de`).
- The 3 reference folders `language-a-linear/`, `language-b-stripe/`, `language-c-notion/` must exist in `architecture-brief/design-system-mockups/` (verified at SPEC authoring time — they do).
- `npm run verify:integrity` and `npm run smoke` must be runnable on the executor's machine.
- The brief `DESIGN_SYSTEM_HYBRID_BRIEF.md` must be present in `architecture-brief/` (verified — it is, although it is currently untracked which is fine because the brief itself is not in this SPEC's authorized-file list).
- Branch = `develop`, repo = `opticalis/opticup`. Verified by First Action protocol at executor session start.

---

## 11. Lessons Already Incorporated

Direct application of `M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/FINDINGS.md` (the prior round's retrospective):

- **FROM Finding 1 (SPEC arithmetic):** Applied in §3. The criterion arithmetic is double-checked — 7 files = 5 modules + 1 INDEX + 1 tokens. Criterion #4 enumerates the 7 file names explicitly. Criterion #2 anchors commit count to the exact start hash. **Also applied in §5 trigger #4 by explicitly authorizing the executor to self-correct §3 arithmetic discrepancies as long as they are logged.**
- **FROM Finding 2 (verify-command scope vs. criterion-text scope):** Applied in §3 by scoping every grep to a specific folder (`.../hybrid-final/`) rather than the broader `architecture-brief/`. SC #5/#6/#7 also scope to specific files via shell brace-expansion to avoid sweeping INDEX into a module-only check.
- **FROM Finding 3 (MASTER_ROADMAP staleness):** Applied in §7 by explicitly removing `MASTER_ROADMAP.md` reconciliation from this SPEC's scope. A future dedicated SPEC will handle cross-module reconciliation.
- **FROM Finding 4 (pre-existing untracked items not listed):** Applied in §5 trigger #3 — every single modified/untracked path observed at session-start `git status` is enumerated. The executor will not waste cycles deciding whether each is part of the SPEC.
- **FROM Finding 5 (Commit Plan didn't anticipate SC-hotfix bundling):** Applied in §9 Commit 3 by explicitly authorizing a bundled SC hotfix into the final commit, with the requirement to log it in EXECUTION_REPORT.md §4.

Earlier-round proposals (older SPECs in the module's `specs/` directory) were scanned; none beyond the above apply to this design-only SPEC.

---

## 12. Pre-Merge Checklist

The executor MUST verify all of the following before closing the SPEC and handing back to the Foreman:

- [ ] All 16 §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. Null-byte ERROR (exit 1) blocks closure.
- [ ] `npm run smoke` returns 7/7 PASS.
- [ ] `git status --short` returns only the §5 trigger #3 known-baseline lines (`OPEN_TASKS.md`, `TECH_DEBT.md`, the listed untracked items) — none of THIS SPEC's authored files remain uncommitted.
- [ ] HEAD pushed to `origin/develop` after each of the 3 commits.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in this SPEC folder.
- [ ] Module 1.5's `SESSION_CONTEXT.md` + `MODULE_MAP.md` + `CHANGELOG.md` updated.
- [ ] Localhost-Tester pass: visual sanity at 1920×1080 viewport confirms SC #15-#16 (≥6 visible table rows; hero+metrics+6-rows fit on at least 3 of 5 screens).
- [ ] No matches in production HTML (`git diff 23349de..HEAD --name-only | grep -E '^[a-z\-]+\.html$'` → empty).
- [ ] No matches in the 3 reference folders (`git diff 23349de..HEAD --name-only | grep -E 'design-system-mockups/language-' ` → empty).

---

## 13. Anti-Patterns (Re-Emphasis from Brief §8)

These are the hard "do not do this" items, re-encoded here so the executor doesn't have to switch files mid-run:

1. **NO violet.** Not as primary, not as secondary, not in shadows, not anywhere. Navy + neutrals + semantic only.
2. **NO serif.** Not for headings, not for "premium feel", not for supplier names. Inter (Latin) + Heebo (Hebrew), sans-only.
3. **NO topbar.** Sidebar is the only navigation. B's topbar from v2 does not survive this round.
4. **NO gradients on metric card backgrounds.** Solid background + accent bar on top, period. Gradients (if any) are restricted to the hero block area, and only with Navy/neutrals.
5. **NO staticization of production HTML.** Claude Designs from scratch, informed by v2-B as structural reference. Direct file-copy with token swap from v2-B is acceptable as a starting point because B is the locked foundation, but the result must not contain any v2-B token names (e.g. no `--accent: #635bff` lingering anywhere).
6. **NO mid-run stops for design questions.** The envelope (§4) is wide on purpose. Stop only on real corruption / SPEC-impossible criterion / Iron Rule violation.
7. **NO sub-SPECs, no phases.** One SPEC, one run, 3 commits, done.

---

## 14. Reference Files

These are the files the executor should consult during the run. None of them are modified by this SPEC.

- `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_HYBRID_BRIEF.md` — the source brief (v3, 2026-05-11). Sections 2, 4, 6, 8 are the design authorities.
- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-b-stripe/*.html` — structural reference. Use the hero+metrics+cards+pills+role-tiles skeleton from here, then rewrite with Navy tokens and add a sidebar.
- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-b-stripe/_tokens.css` — token-file structural reference. Use as a template for which token categories to declare (palette, typography, radii, shadows, semantic, component). Replace all violet hex codes with Navy hex codes; remove any serif declaration.
- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-a-linear/*.html` — sidebar pattern reference. Use for sidebar markup structure, section labels, active-item highlighting, brand-mark placement.
- `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-a-linear/_tokens.css` — Linear's token approach to sidebar component tokens. Do NOT copy Linear's color palette or typography choices — only its structural sidebar tokens are relevant.
- `CLAUDE.md` §4–§6 — Iron Rules. Rules 9 (no hardcoded values), 12 (350-line max per file), 21 (no orphans / no duplicates), 31 (integrity gate) are most directly relevant.
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/FINDINGS.md` — read for context on the lessons applied in §11.

---

*End of SPEC. Authored 2026-05-11 by opticup-strategic (Foreman). The next agent in the chain is opticup-executor, dispatched by Daniel in a fresh Claude Code session.*
