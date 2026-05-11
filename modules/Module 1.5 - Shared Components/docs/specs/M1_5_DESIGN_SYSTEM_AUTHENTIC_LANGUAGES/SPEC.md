# SPEC — M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-11
> **Module:** 1.5 — Shared Components
> **Phase (if applicable):** Design System Phase 3 v2 (supersedes Phase 3 v1 — `MOCKUPS_3A/3B/3C/CONSOLIDATION`)
> **Author signature:** main strategic chat — 2026-05-11
> **Source brief:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_PHASE_3_V2_BRIEF.md`

---

## 1. Goal

Produce **three visually-distinct design languages** (Language A — Linear/Vercel, Language B — Stripe Dashboard, Language C — Notion/Airy) for **five operational screens** (Storefront Studio, Permissions, Shipments+Boxes, Settings, Suppliers Debt), so that Daniel can pick a winning visual identity by glance-comparison rather than by spec reading. Every language uses a light background; no dark mode. **21 HTML/CSS files total**, all self-contained, all Hebrew-RTL, all designed from scratch (NOT staticized from production HTML).

---

## 2. Background & Motivation

Phase 3 v1 (`M1_5_DESIGN_SYSTEM_MOCKUPS_3A/3B/3C` + `CONSOLIDATION`, all closed 2026-05-11, PUSH PENDING) failed its real goal. The executor authored 45 HTML files but each "direction" was a **staticized production HTML** with a **near-empty `_tokens.css`** (3A inherited everything with zero active overrides; 3B and 3C added 6–7 tokens covering only spacing / radius / one font-size). Result: all three directions share the same color palette, the same DOM, the same components — only spacing/typography micro-differ. Daniel cannot make a real choice between three near-identical variations.

This SPEC replaces Phase 3 v1 in full. **Old work is archived (not deleted)** for record-keeping. **New work uses Claude Designs** (or equivalent authentic visual authoring) to design each screen per language, not to derive it from production HTML.

### v1 retrospective evidence (do NOT repeat)

| v1 mistake | Why it happened | v2 counter-measure (this SPEC) |
|---|---|---|
| Staticization of `inventory.html`, `crm.html`, etc. as the design vehicle | Executor read "show the modules" as "copy the production HTML and strip JS" | §4 explicit ban: **NO staticization**; every file authored from blank against §3 of the brief |
| `_tokens.css` files with 0–7 active overrides | Executor inherited platform defaults rather than defining a palette | §3 SC #6 + §9 Anti-Pattern #2: every language's `_tokens.css` must redefine palette + typography + density at minimum |
| Three near-identical outputs | All three directions copied the same production HTML + same default palette | §3 SC #7 — the **glance-test acceptance criterion**: 2-second visual distinguishability |
| 13 modules × 3 directions = 39 module HTMLs to maintain | Scope creep — every module included even if not yet built | §6 — scope reduced to 5 representative screens |

### Already-done discovery contingency

- If the v1 folders `direction-1-conservative/`, `direction-2-modern-clean/`, `direction-3-bold-dense-pro-tool/` are NOT present (someone manually moved them) → Step 1 archival becomes a no-op; report and continue to Step 2.
- If `_archive/design-system-mockups-v1-staticized/` already exists from a prior failed attempt → STOP and report (this SPEC has never run before; existence implies state corruption that must be diagnosed).
- If the new target folder `architecture-brief/design-system-mockups/language-{a,b,c}-*/` already contains files → STOP and report (collision; resolve before proceeding).

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. SC #7 (the glance test) is the only qualitative one — it is intentional and explicit.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean at end | `git status` → "nothing to commit, working tree clean" |
| 2 | Commits produced | Exactly 11 commits in this SPEC's range | `git log <START_COMMIT>..HEAD --oneline \| wc -l` → `11` |
| 3 | New folder — Language A | Exists with 7 files | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-a-linear/" \| wc -l` → `7` |
| 4 | New folder — Language B | Exists with 7 files | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-b-stripe/" \| wc -l` → `7` |
| 5 | New folder — Language C | Exists with 7 files | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-c-notion/" \| wc -l` → `7` |
| 6 | Each `_tokens.css` defines real palette | ≥ 20 active CSS custom properties redefined per language, covering at minimum: 4 background tiers, 4 text tiers, 2 accent tiers, 3 typography sizes, 3 spacing tiers, 2 radii, 2 shadows | `grep -cE "^\s*--" "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-*/. _tokens.css"` → each file ≥ 20 |
| 7 | **Glance-test (qualitative, explicit criterion)** | Opening `language-a-linear/INDEX.html`, `language-b-stripe/INDEX.html`, `language-c-notion/INDEX.html` side-by-side in a browser — within 2 seconds the three are obviously different in: (a) page background tone, (b) accent color hue, (c) typography family/weight, (d) corner-radius style, (e) information density (whitespace + padding). All five axes differ visibly per pair. | Manual screenshot evidence in EXECUTION_REPORT.md §2 — 3 INDEX.html screenshots inlined, glance-distinct verifiable to a reviewer in 2 seconds. **This SC is the whole point — failing it = SPEC failed.** |
| 8 | All light backgrounds | No CSS color value in any of the 21 files has hex form `#0?` or `#1?` (range `#00`–`#1F`) on the `body`, `html`, or top-level page-container element. Page background lightness ≥ `#f0f0f0`. | `grep -rnE "background[-a-z]*:\s*#[0-1]" "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-*/."` → 0 hits |
| 9 | Hebrew RTL on every HTML file | All 18 module HTMLs + 3 INDEX HTMLs declare `<html lang="he" dir="rtl">` | `grep -rl 'lang="he" dir="rtl"' "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-*/."*.html \| wc -l` → `21` |
| 10 | Self-contained — no broken assets | Each HTML opens via `file://` with zero 404s in console. Only Google Fonts CDN allowed as external dep. | Manual — INDEX of each language smoke-opened in browser, console screenshot in EXECUTION_REPORT.md §2 if any 404 seen |
| 11 | v1 archived (not deleted) | `_archive/design-system-mockups-v1-staticized/` exists and contains `direction-1-conservative/`, `direction-2-modern-clean/`, `direction-3-bold-dense-pro-tool/`, each with their full 15 files preserved | `ls "_archive/design-system-mockups-v1-staticized/" \| wc -l` → `3` AND `find "_archive/design-system-mockups-v1-staticized/" -type f \| wc -l` → `45` |
| 12 | v1 folders gone from origin location | `architecture-brief/design-system-mockups/direction-*/` no longer exists | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/" \| grep "^direction-"` → 0 hits |
| 13 | File-size discipline (Iron Rule 12) | Every HTML file ≤ 350 lines OR its CSS is split into a co-located file. INDEX.html exempt (hub). | `wc -l "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-*/."*.html` → no non-INDEX file exceeds 350 |
| 14 | Iron Rule 9 — no hardcoded colors in HTML | Module HTMLs (non-INDEX, non-`_tokens.css`) contain zero raw hex colors in `style=` attributes or inline `<style>` blocks. All colors via `var(--token)`. | `grep -rnE "style=\"[^\"]*#[0-9a-fA-F]{3,6}" "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-*/."*.html` → 0 hits (INDEX files exempt for nav chrome) |
| 15 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 16 | Smoke tests | 7/7 PASS | `npm run smoke` → exit 0 with "7 passed, 0 failed" |
| 17 | Final push | All 11 commits pushed to `origin/develop` | `git log origin/develop..HEAD --oneline` → empty |
| 18 | Module docs updated | `MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md` all reflect Phase 3 v2 closure in their final commit (Commit 11) | `grep -l "DESIGN_SYSTEM_AUTHENTIC_LANGUAGES" "modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md" "modules/Module 1.5 - Shared Components/docs/CHANGELOG.md" "modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md"` → 3 files match |

---

## 4. Autonomy Envelope (CRITICAL — different from default Bounded Autonomy)

This SPEC inverts the default. **Continuous-run is mandatory, not opt-in.** The default stop-on-deviation pattern still applies for the triggers listed in §5 — but design decisions inside a language's defined palette/typography/density are NEVER a stop trigger.

### What the executor CAN do without asking (everything in the design space)

- **Author all 21 HTML files from scratch** using Claude Designs or equivalent authentic authoring. Read the production HTMLs (`storefront-studio.html`, `settings.html`, `shipments.html`, `suppliers-debt.html`) and any module sketches in `modules/Module N - Name/architecture-brief/MN_SKETCHES.html` ONLY for **information architecture reference** (what data fields exist, what controls are needed) — **NEVER for visual treatment**.
- **Pick every visual detail within a language's definition** (button shape, card padding, icon style, illustration vibe, gradient direction, micro-interactions, empty-state copy). The brief §2 locks palette base + typography family + density tier + corner radius range + shadow vibe. Everything else is yours.
- **Vary the DOM structure across languages.** Linear-style sidebar nav, Stripe-style top bar with card-grid, Notion-style minimalist left rail — these are different DOMs by design, not deviations.
- **Decide commit messages** within the §9 plan (you may add a small clarifying suffix; you may not change the count of 11).
- Read any file in the repo. Run any read-only command. Run `npm run verify:integrity` and `npm run smoke` as needed.
- Move files with `git mv` for the v1 archival step. `git mv` not `cp`+`rm` — preserves history.
- Apply executor-improvement proposals from recent FOREMAN_REVIEWs **if and only if** they directly apply to this kind of work (design-mockup authoring, archival, multi-folder generation).

### What REQUIRES stopping and reporting (narrow list — see §5 for full triggers)

- Integrity gate emits an ERROR (exit 1) — null-byte corruption detected.
- An Iron Rule violation would be necessary to continue (especially Rules 9, 12, 21, 31).
- A success criterion in §3 is provably unachievable as authored (e.g., the brief is internally contradictory).
- Asset-path or browser-render failure for an INDEX.html that you cannot fix by adjusting your own author choices.

### What the executor MUST NOT stop for (explicit non-triggers)

- "Should I use rounded or pill-shaped buttons in Language A?" — your call, decide and move on.
- "Should the Stripe language use Source Serif or Merriweather for headings?" — your call. Brief says "serif heading"; pick one.
- "Context window concern — should I split into sub-SPECs?" — **NO.** Daniel has confirmed 1M token window is available. Run all 21 files in one continuous session.
- "Should I use Linear's exact indigo or a slightly different one?" — your call within the brief's accent guidance.
- "Are 3 spacing tiers enough?" — your call within Rule 9 and SC #6.
- "Permissions matrix table vs card grid?" — your call.

**Foreman authorization to executor:** "All design-language definitions in the brief §2 are normative. Within those definitions, every visual choice is yours to make. Don't ask. Decide and build. Daniel reviews the final 21 files, not each decision."

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

The list is narrow on purpose. **Anything not listed here is not a stop trigger** — execute and move on.

1. `npm run verify:integrity` returns exit 1 (null-byte ERROR) at any commit boundary → STOP, do not commit, investigate.
2. `git status` shows files modified outside the SPEC's declared scope (anything outside the language folders, the `_archive/` archival target, and the three module docs in Commit 11) → STOP and report. Note: pre-existing untracked test DBs (`tests/optic.accdr`, `tests/optic_dt.accdb`, `tests/optic_dt_all.accdb`) and three pre-existing untracked `FOREMAN_REVIEW.md` / `SKILL_IMPROVEMENTS_TO_APPLY.md` files in unrelated SPEC folders are KNOWN — they pre-date this SPEC and are NOT a deviation. Leave them alone.
3. The v1 archival source folder is NOT where this SPEC expects (e.g., a prior session already moved it). Reconcile per §2 "Already-done discovery contingency" — do NOT improvise a new archival path.
4. SC #7 (glance test) — if while building Language B the executor recognizes that it is converging visually on Language A or C (e.g., the same accent hue, the same density), STOP and report. The point of this SPEC is distinctness; near-identical output is failure, not progress.
5. SC #8 violation — if any background color resolves below `#f0` lightness. No dark mode anywhere.
6. Iron Rule 9 violation — any hex literal in module HTML `style=` attributes or `<style>` blocks (INDEX.html exempt for hub chrome).
7. Iron Rule 21 violation — adding a third copy of the same helper script across language folders (one bulk-transform helper is fine if needed; do not replicate per language).
8. `npm run smoke` reports any test failure — STOP, do not commit further.

**Non-triggers (re-stating for clarity):** No design decision is a stop trigger. Asking Daniel "which font is right for Language B" is a violation of this SPEC.

---

## 6. Out of Scope (explicit)

These look related but MUST NOT be touched in this SPEC:

- **M1 Inventory** — `inventory.html`, `js/inventory.js`, `css/inventory.css`, anything under `modules/Module 1 - Inventory/`. Daniel directive in brief §3. Do not include an inventory screen in any language.
- **M3 main storefront** — only the **Studio admin side** is in scope (Storefront Studio is the admin CMS for the storefront, not the public site). Anything under `modules/Module 3 - Storefront/code/` or the sibling `opticup-storefront` repo is out.
- **M4 CRM** — out for this iteration per brief §3. No `crm.html` mockup, no leads screen.
- **M5–M15** — every other module not in the 5-screen list is out. No `M5-customers.html`, no `M11-reports.html`, etc.
- **Production code** — no JS logic, no DB queries, no RPC, no migrations, no edits to the live `storefront-studio.html` / `settings.html` / `shipments.html` / `suppliers-debt.html` at repo root. This SPEC is **mockup-only**.
- **Promotion of any winning language to production** — out. Separate SPECs per module will handle that after Daniel picks.
- **Existing v1 SPEC folders** — `M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE/`, `M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN/`, `M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL/`, `M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION/`. They remain in `modules/Module 1.5 - Shared Components/docs/specs/` as historical record. Do NOT edit, do NOT move, do NOT delete. v1 SPEC folders ≠ v1 mockup folders; only the latter (under `architecture-brief/design-system-mockups/direction-*/`) get archived.
- **The pre-existing untracked working files** at session start (`tests/optic*.acc{dr,db}` and three `FOREMAN_REVIEW.md` / `SKILL_IMPROVEMENTS_TO_APPLY.md` files in unrelated SPEC folders). Touch nothing. They are not a deviation; they pre-date this SPEC.

### Subset relationship — information vs visual scope

The brief and this SPEC scope **5 screens, not 13**. This is deliberate scope reduction. A reviewer comparing this output to v1 (which had 13 modules) will see fewer files per language and may flag it as incomplete — they would be wrong. The 5 chosen screens are representative of the visual problems (CMS authoring, permission matrix, item-list density, settings density, financial table density). Daniel chose this scope on 2026-05-11. Other modules will be brought into the chosen language post-pick, in separate SPECs.

---

## 7. Rollback Plan

If the SPEC fails partway through and must be reverted:

- `git reset --hard <START_COMMIT>` — where `START_COMMIT` = the HEAD hash captured by the executor in EXECUTION_REPORT.md §1 before any change. This drops all 11 commits in one move; no DB or external-system state to restore (this is a pure-file SPEC).
- v1 archival is reversible via `git mv` of the archive folder back to its origin path, but since `git reset --hard` already undoes the move, this is a no-op in practice.
- No DB changes in this SPEC — nothing to restore on Supabase.
- Notify Foreman; SPEC marked REOPEN.

---

## 8. Expected Final State

### New files (21 new HTMLs + 3 new tokens.css = 24 files across 3 language folders)

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/
├── language-a-linear/
│   ├── INDEX.html
│   ├── _tokens.css
│   ├── storefront-studio.html
│   ├── permissions.html
│   ├── shipments.html
│   ├── settings.html
│   └── suppliers-debt.html
├── language-b-stripe/
│   ├── INDEX.html
│   ├── _tokens.css
│   ├── storefront-studio.html
│   ├── permissions.html
│   ├── shipments.html
│   ├── settings.html
│   └── suppliers-debt.html
└── language-c-notion/
    ├── INDEX.html
    ├── _tokens.css
    ├── storefront-studio.html
    ├── permissions.html
    ├── shipments.html
    ├── settings.html
    └── suppliers-debt.html
```

INDEX.html per language: top-bar with **3-language switch links** (cross-folder hrefs: `../language-a-linear/INDEX.html`, etc.), left-rail with 5 anchor links to the 5 module HTMLs, iframe preview pane. Minimal JS (vanilla tab-nav). Inline `<style>` allowed for hub chrome since INDEX is hub-exempt from Rule 12 line-cap.

### Moved files (archival — `git mv`, history preserved)

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/
→ _archive/design-system-mockups-v1-staticized/direction-1-conservative/

modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-2-modern-clean/
→ _archive/design-system-mockups-v1-staticized/direction-2-modern-clean/

modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-3-bold-dense-pro-tool/
→ _archive/design-system-mockups-v1-staticized/direction-3-bold-dense-pro-tool/
```

Each archived folder retains all 15 files internally (3 × 15 = 45 files preserved). Use `git mv` per directory or per file — preserves blame, allows future archaeology.

### Modified files (Commit 11 only — docs sync)

- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` — append a new section "Design System Phase 3 v2 — Authentic Languages" listing the 3 new language folders, their 21 files, and the v1 archival pointer. Do NOT remove the v1 entries — mark them as "ARCHIVED — see `_archive/design-system-mockups-v1-staticized/`".
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — new top section "## 2026-05-11 — Design System Phase 3 v2 (Authentic Languages — supersedes v1)" with the 11 commit hashes and one-line each.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — replace the current "Phase 3a/3b/3c PUSH PENDING" status with the new Phase 3 v2 status. Move the v1 entries down to "Historical (v1 — superseded 2026-05-11)" section.
- `MASTER_ROADMAP.md` — single-line update in §3 reflecting Phase 3 v2 status (replace "Phase 3 PUSH PENDING" line; add "v1 archived 2026-05-11").

### Deleted files

None directly deleted by `rm`. The v1 folders are MOVED (via `git mv`), not deleted. The only "removal" visible in `git status` will be on the origin paths, paired with adds on the destination paths.

### DB state

No change. This is a pure HTML+CSS mockup SPEC.

### Build-side-effect file expectations

This SPEC runs no build/codegen step. `npm run smoke` and `npm run verify:integrity` are read-only / test-only. They do not regenerate any committed file. If `git status` shows unexpected modifications to non-SPEC files after either command, treat as deviation per §5 trigger #2 and STOP.

### Docs updated (MUST include in Commit 11)

- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md`
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`
- `MASTER_ROADMAP.md`
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/EXECUTION_REPORT.md` (mandatory)
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES/FINDINGS.md` (mandatory — write the file even if no findings; with the header "No findings — clean run")
- `GLOBAL_MAP.md` / `GLOBAL_SCHEMA.sql` — **NO updates needed**. This SPEC adds no functions, no DB objects. Mockups don't enter the contract layer.

---

## 9. Commit Plan

Exactly **11 commits**. Match the count exactly — SC #2 verifies this.

| # | Commit | Files touched | Message |
|---|---|---|---|
| 1 | Archive v1 mockups | `git mv` of 3 direction folders → `_archive/design-system-mockups-v1-staticized/...` (45 files moved) | `chore(design): archive Phase 3 v1 mockups (staticized) to _archive/` |
| 2 | Language A — tokens + folder skeleton | `language-a-linear/_tokens.css` + empty INDEX shell | `feat(design): scaffold language-a-linear tokens + INDEX skeleton` |
| 3 | Language A — 5 module HTMLs | 5 files: `storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html` under `language-a-linear/` | `feat(design): language-a-linear — 5 module screens (Linear/Vercel)` |
| 4 | Language A — finalize INDEX with cross-links | `language-a-linear/INDEX.html` completed (nav, iframe, cross-language switch) | `feat(design): language-a-linear INDEX with cross-language switch + nav` |
| 5 | Language B — tokens + folder skeleton | `language-b-stripe/_tokens.css` + empty INDEX shell | `feat(design): scaffold language-b-stripe tokens + INDEX skeleton` |
| 6 | Language B — 5 module HTMLs | 5 files under `language-b-stripe/` | `feat(design): language-b-stripe — 5 module screens (Stripe Dashboard)` |
| 7 | Language B — finalize INDEX with cross-links | `language-b-stripe/INDEX.html` completed | `feat(design): language-b-stripe INDEX with cross-language switch + nav` |
| 8 | Language C — tokens + folder skeleton | `language-c-notion/_tokens.css` + empty INDEX shell | `feat(design): scaffold language-c-notion tokens + INDEX skeleton` |
| 9 | Language C — 5 module HTMLs | 5 files under `language-c-notion/` | `feat(design): language-c-notion — 5 module screens (Notion/Airy)` |
| 10 | Language C — finalize INDEX with cross-links | `language-c-notion/INDEX.html` completed | `feat(design): language-c-notion INDEX with cross-language switch + nav` |
| 11 | Docs + close | `MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md`, `MASTER_ROADMAP.md`, plus `EXECUTION_REPORT.md` + `FINDINGS.md` in this SPEC folder | `chore(spec): close M1_5_DESIGN_SYSTEM_AUTHENTIC_LANGUAGES with retrospective` |

**Push:** after Commit 11, `git push origin develop` once. Verify SC #17.

**Commit grouping rationale:** 3 commits per language × 3 languages = 9 build commits, bookended by Commit 1 (archive) and Commit 11 (docs). Each language's 3 commits give Daniel a natural review boundary if he wants to inspect mid-flight — but the executor does NOT pause between them.

---

## 10. Dependencies / Preconditions

- The brief at `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_PHASE_3_V2_BRIEF.md` is read in full before any file is authored.
- v1 folders `direction-1-conservative/`, `direction-2-modern-clean/`, `direction-3-bold-dense-pro-tool/` are present at the expected origin path (or §2 contingency applies).
- `_archive/` exists at repo root (verified — `ls _archive/` returned 7 entries at SPEC author time).
- `npm install` is current; `npm run verify:integrity` and `npm run smoke` are runnable.
- 1M token context window confirmed available for this session (Daniel directive).

### Browser readiness pre-flight

This SPEC's verification is partially browser-based (SC #7 glance test, SC #10 file:// smoke-open). The executor must verify that a browser is available for screenshot evidence in EXECUTION_REPORT.md §2. Headless or local browser is fine — no Chrome remote-debug-port is required because this SPEC takes manual screenshots, not Chrome MCP automation. State explicitly in the readiness sentence: "Browser available for INDEX screenshots; no remote-debug-port needed."

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-05-11 against `docs/GLOBAL_SCHEMA.sql` + `docs/GLOBAL_MAP.md` + `docs/FILE_STRUCTURE.md`: **0 collisions, 0 hits resolved.** This SPEC introduces no new DB objects, no new shared functions, no new repo-root files. The new HTML files (`storefront-studio.html`, `permissions.html`, `shipments.html`, `settings.html`, `suppliers-debt.html`) share their basenames with files at repo root, but they sit under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/language-*/` — a routing-isolated folder. GitHub Pages does not serve from there. No collision risk.

Lessons applied from prior FOREMAN_REVIEWs:

- **FROM `M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION/FINDINGS.md` Finding 1 (race on shared docs across parallel sessions)** → APPLIED. This SPEC mandates **single-session, single-executor, continuous run** (§4 + §9 Commit 11). No parallel executor sessions; shared docs are updated once, at the end, in one commit by one writer. No race possible.
- **FROM `M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION/FINDINGS.md` Finding 2 (orphan transform scripts across direction folders)** → APPLIED. This SPEC explicitly bans staticization (§9 anti-pattern). There is therefore no need for per-language transform scripts. Rule 21 protected by construction.
- **FROM `M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION/FINDINGS.md` Finding 3 (asset-path depth off-by-one across HTMLs)** → APPLIED. SC #6 + SC #10 require explicit verification that `_tokens.css` and any sibling assets are referenced consistently. The folder layout is flat (all 7 files at the same depth inside each language folder), so `./_tokens.css` is the only valid form. Anti-pattern: any `../_tokens.css` in a module HTML is a §5 trigger #2 deviation.
- **FROM `M3_TIER1_CATEGORY_SLUG_FIX/FOREMAN_REVIEW.md`** → measurable-SC discipline (8/8 met with copy-paste-runnable verify commands) → APPLIED. Every SC in §3 has an exact expected value and a verify command.
- **FROM SPEC_TEMPLATE recent improvements** → Build-side-effect declaration (§8) → APPLIED explicitly (no build steps in this SPEC). Browser readiness pre-flight (§10) → APPLIED explicitly. Subset relationship (§6) → APPLIED for the "5 not 13 modules" scope reduction.

---

## 12. Anti-Patterns (CRITICAL — from v1 failure + general)

The Executor MUST NOT do any of these. Each is a §5 stop trigger or a §3 SC violation.

1. **Do NOT staticize production HTML.** That was the v1 failure root cause. Production HTML (`storefront-studio.html`, `shipments.html`, etc. at repo root) carries the current Slate-900 + Indigo visual baseline. Copying it and layering tokens cannot produce a *different* language — the structural CSS and embedded class names lock the visual identity. Read production HTML only for **information architecture** (what fields, what controls, what tables). Then **author the new file from scratch** per language.
2. **Do NOT create empty or near-empty `_tokens.css` files.** v1 had 0–7 active overrides. v2 requires ≥ 20 active CSS custom properties per language (SC #6). The token file IS the visual identity; an empty token file IS the v1 failure.
3. **Do NOT use a similar palette across languages.** Every language must pick its own palette per brief §2. Linear = pure white + indigo accent. Stripe = warm off-white + deep purple. Notion = cool off-white + pastel accents. If two languages share an accent hue → §5 trigger #4 (visually-converging) → STOP and report.
4. **Do NOT use the same DOM structure across languages.** Linear sidebar nav ≠ Stripe top-bar cards ≠ Notion minimalist rail. The DOM reflects the language. If you find yourself copy-pasting a `<nav>` block from Language A's storefront-studio.html into Language B's storefront-studio.html — STOP. That is the v1 failure pattern.
5. **Do NOT ask Daniel mid-execution about design decisions.** §4 explicitly authorizes you to decide every visual detail within the brief's language definitions. An AskUserQuestion call during this SPEC is a violation. The only valid mid-execution communication is: (a) §5 stop trigger fired, or (b) end-of-SPEC report.
6. **Do NOT split this into sub-SPECs.** Brief §7 + §4 of this SPEC both require continuous run in one session. 1M token window handles 21 files easily — Daniel confirmed.
7. **Do NOT promote any winning language to production in this SPEC.** Production migration is out of scope (§6). Mockups only.
8. **Do NOT touch the M1 Inventory production code or any v1 SPEC folder.** Even if you notice something fixable. Log as a finding, do not fix. The v1 SPEC folders stay where they are.
9. **Do NOT use `cp` + `rm` for the v1 archival.** Use `git mv` so commit-history is preserved. SC #11 verifies file count post-archive but blame-preservation is an unstated but expected hygiene win.
10. **Do NOT inline any non-Google-Fonts external dep.** No CDN icons, no CDN reset stylesheets. Inline SVG icons are fine. Google Fonts is the only allowed external dep per brief §6.

---

## 13. Reference Files

For the executor's use during authoring. Read for information architecture only — NOT for visual treatment.

| Purpose | File |
|---|---|
| Primary brief | `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_PHASE_3_V2_BRIEF.md` |
| v1 retrospective (what NOT to do) | `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_CONSOLIDATION/FINDINGS.md` |
| Storefront Studio info architecture | `storefront-studio.html` (root) — read for CMS sections / blocks / media library / translations structure; ignore visual styling |
| Settings info architecture | `settings.html` (root) — read for tabs / sections / form fields; ignore visual styling |
| Shipments info architecture | `shipments.html` (root) — read for box list / shipment table / status flow; ignore visual styling |
| Suppliers Debt info architecture | `suppliers-debt.html` (root) — read for debt table columns / payment history / supplier list; ignore visual styling |
| Permissions info architecture | `admin.html` (root) + `settings.html` permissions area — read for roles + permission matrix; ignore visual styling |
| Module sketches (info architecture only) | `modules/Module N - Name/architecture-brief/MN_SKETCHES.html` for modules that have them — read for what the module's screens conceptually contain |
| Iron Rules | `CLAUDE.md` §4-§6 — Rules 9, 12, 21, 31 are the ones most likely to be tested in this SPEC |
| File structure | `docs/FILE_STRUCTURE.md` — confirm `_archive/` location at repo root |
| Project conventions | `docs/CONVENTIONS.md` — RTL patterns, Hebrew text conventions |
| SPEC template | `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` (already incorporated — this SPEC follows current template revision) |

---

## 14. Pre-Merge Checklist

Every item must be checked before the executor closes the SPEC. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2 (including screenshots for SC #7 glance test).
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Smoke tests (SC #16):** `npm run smoke` exits 0 with "7 passed, 0 failed".
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop` (SC #17).
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in this SPEC folder (the latter mandatory even if "no findings — clean run").
- [ ] Module `MODULE_MAP.md` / `CHANGELOG.md` / `SESSION_CONTEXT.md` + `MASTER_ROADMAP.md` updated in Commit 11.
- [ ] 11 commits exactly in this SPEC's range — no more, no fewer.
- [ ] v1 mockup folders archived (SC #11) AND removed from origin location (SC #12) — both must be true.
- [ ] No production code modified. No DB changes. No new dependencies installed. No new repo-root files created.

**Foreman review trigger:** after the executor commits Commit 11 and pushes, Daniel reviews the 3 INDEX.html files side-by-side and picks a winning language. The FOREMAN_REVIEW.md for this SPEC is written by `opticup-strategic` *after* Daniel makes that pick — i.e., the review captures both execution quality and the winner. This is an intentional defer: the SC #7 glance test acceptance is Daniel's, not the Foreman's, so the review can't be written before that signal exists.
