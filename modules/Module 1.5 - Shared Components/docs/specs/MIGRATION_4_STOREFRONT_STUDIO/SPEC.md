# SPEC — MIGRATION_4_STOREFRONT_STUDIO

**Author:** opticup-strategic (Foreman, Full-Auto Pipeline)
**Date:** 2026-05-12
**Owning module:** Module 1.5 — Shared Components
**Brief:** `modules/Module 1.5 - Shared Components/architecture-brief/MIGRATION_4_STOREFRONT_STUDIO_BRIEF.md` (v1, 2026-05-11)
**Predecessors:** MIGRATION_1_SUPPLIERS_DEBT 🟢, MIGRATION_2_SETTINGS_PERMISSIONS 🟢, MIGRATION_3_CRM 🟢
**Baseline commit:** `eace1b5` (HEAD at SPEC author time)
**Hand-off to:** opticup-executor → opticup-reviewer → opticup-localhost-tester → opticup-strategic (Foreman review)

---

## 0. Pre-Authoring Reality Check (Iron Rule 21 / cross-reference / baselines)

**Date checked:** 2026-05-12. **Tool used:** grep + wc against current `develop` (HEAD `eace1b5`).

### Brief-vs-Repo Divergences Caught

| # | Divergence | Resolution in this SPEC |
|---|---|---|
| D1 | Brief §2 lists 7 candidate files. Pre-flight grep found **zero legacy purple hex** (`#534AB7`, `#26215C`, `#EEEDFE`, `#7F77DD`) anywhere across all 7 files. The Brief's primary swap map (purple→Navy) is **vacuous for this migration set**. | §3 Token Swap Plan drops the purple-row entries from the actionable swap and keeps only the rows that matter for these files: indigo/violet decorative gradients + studio gold gradient + (idempotent) Navy tokens already in variables.css. |
| D2 | Brief §2 implies all 7 HTML files need re-skinning. Reality: 3 of 7 files have **only semantic colors** (success/warning/danger/info from Tailwind palette) and **only neutral grays** in their inline `<style>` — no decorative non-semantic hex to migrate. | §2 Scope-In is reduced from 7 to **4 in-scope HTML files**. The 3 "scope-clean" files are explicitly documented in §7 Out of Scope as already-conformant and require no edits. |
| D3 | Brief §2 lists `css/storefront-*.css` "if they exist as separate files". Pre-flight: `ls css/storefront-*.css` returns "No such file or directory". **There are no separate CSS files for storefront-* pages.** All styling is inline `<style>` blocks. | §2 Scope-In is HTML-only. Brief's §2 CSS-file bullet is dropped. Success criterion #3 (Navy hits per CSS file) is replaced by "Navy hits per HTML file" because there are no CSS files. |
| D4 | Brief §3 token swap row "Slate-already-modern files (CRM-style) → Add Navy accent only — preserve Slate primary" implies these files have Slate primary. Reality: all 7 files use `var(--primary)` which resolves to `#0f172a` (Slate 900) via `shared/css/variables.css` line 20. The files are **token-driven Slate-modern** — even more conservative than CRM (which had inline `slate-*` Tailwind utilities). | The migration target per file is **only the decorative non-semantic hex** within inline `<style>` blocks. `var(--primary)` references are NOT touched; they pick up Slate 900 automatically via the shared token. |
| D5 | Brief §1 says "all 4 production pages will be on Hybrid+Navy after this SPEC". Pre-flight: `shared/css/variables.css` already has `--accent-navy: #1e3a8a` (line 176) added in MIGRATION_1. **No variables.css edit is needed in this SPEC.** | §3 Token Swap Plan removes the "add Navy tokens to variables.css" bullet — it was idempotent in MIGRATION_2/#3 and remains idempotent here. variables.css is OUT of scope. |

### Pre-existing repo dirt at session start (Full-Auto mode, MIGRATION_3 Author Proposal #2)

`git status --porcelain` at session start shows:
- 1 modified tracked file (`docs/guardian/GUARDIAN_ALERTS.md`) — pre-existing Sentinel work, leave alone.
- ~30 untracked architecture-brief and SPEC-folder paths (Brief + activation-prompt set for the migration series, plus SPECs not yet committed elsewhere) — pre-existing scaffolding, leave alone.
- 0 staged files.

**Scope-clean rule (Full-Auto Pipeline):** every `git add` in this SPEC's commits uses explicit filenames only. The pre-existing dirt is OUT of scope and will remain dirty in `git status` after this SPEC closes; only **this SPEC's own files** will reach a clean state.

### Pre-flight palette detection per HTML file

Performed via `grep -ic "#hex"` per file:

| File | Legacy purple | Indigo Tailwind decorative (#6366f1, #8b5cf6) | Gold decorative (#c9a555, #e8da94, #fefdf8) | Only semantic + neutral? | Verdict |
|---|---|---|---|---|---|
| storefront-blog.html | 0 | **yes — 3 gradient sites** (`.btn-ai`, `.btn-ai-mode.active`, `.btn-ai-generate`) | 0 | partial | **MIGRATE** |
| storefront-content.html | 0 | **yes — 2 gradient sites** (`.btn-ai`, `.progress-bar-fill`) | 0 | partial | **MIGRATE** |
| storefront-glossary.html | 0 | 0 | 0 | yes (only `#059669` success / `#1e40af` info-text / `#991b1b` danger / `#fee2e2` danger-bg) | **SCOPE-CLEAN — no edit** |
| storefront-landing-content.html | 0 | **yes — 1 gradient site** (`.btn-ai`) | 0 | partial | **MIGRATE** |
| storefront-products.html | 0 | 0 | 0 | yes (only semantic + neutral) | **SCOPE-CLEAN — no edit** |
| storefront-settings.html | 0 | 0 | 0 | yes (only `#d1d5db`/`#e5e5e5`/`#f3f4f6` neutral grays) | **SCOPE-CLEAN — no edit** |
| storefront-studio.html | 0 | 0 | **yes — 5 sites** (`.lp-wizard-section` focus, `.lp-wizard-drop` hover, `.lp-wizard-footer .btn-create` gradient, inline `onmouseover` border, inline `style` gradient on "🎯 דף נחיתה" button) | partial | **MIGRATE** |

**Authoritative scope: 4 in-scope files, 3 scope-clean files.**

### Out-of-scope visual elements deliberately left alone (decisions logged)

| Element | File | Decision | Reason |
|---|---|---|---|
| `.lang-pill` family (`.lang-he: #3b82f6`, `.lang-en: #22c55e`, `.lang-ru: #8b5cf6`) | storefront-blog.html | **KEEP** | Coherent badge family — one color per language; functions as category-semantic, not decorative. Migrating only `.lang-ru` would break the family. Full family redesign is out of scope for a re-skin SPEC. |
| Google SERP preview colors (`#1a0dab` blue link / `#006621` green URL) | storefront-blog.html | **KEEP** | Literal Google brand reference — this preview shows the user what Google will display. Changing these breaks the preview's purpose. |
| Semantic hex (`#dc2626` danger, `#059669` success, `#991b1b` danger-text, `#fee2e2` danger-bg, `#d1fae5` success-bg, `#fef3c7` warning-bg, `#1e40af` info-text, `#dbeafe` info-bg, `#b45309` amber, `#92400e` amber-deep, `#065f46` success-deep, `#991b1b` danger-deep, `#fef2f2` danger-soft) | all in-scope files | **KEEP** | Brief §3 explicit: "Semantic (success/warning/danger/info) → KEEP". |
| Neutral grays (`#1a1a1a`, `#374151`, `#6b7280`, `#9ca3af`, `#545454`, `#d1d5db`, `#e5e5e5`, `#f3f4f6`, `#f9fafb`, `#fafafa`, `#f0f0f0`) | all in-scope files | **KEEP** | Brief §3 implicit: neutral grayscale is not in the swap map. Migration is for branded color tokens only. |

### Cross-Reference Check (Iron Rule 21 — author-time sweep)

Names this SPEC introduces:
- File names: none new (all 4 in-scope HTML files pre-exist)
- New CSS rules: none (only token-body swaps within existing rules)
- New global functions: none
- New tables / RPCs / migrations: none
- Tag names: `pre-migration-storefront-blog`, `pre-migration-storefront-content`, `pre-migration-storefront-landing-content`, `pre-migration-storefront-studio` — verified absent: `git tag --list "pre-migration-storefront-*"` returns empty.

Sweep against authoritative sources:
- `docs/GLOBAL_SCHEMA.sql` — N/A (no DB)
- `docs/GLOBAL_MAP.md` — N/A (no new globals)
- `docs/FILE_STRUCTURE.md` — already lists the 4 files
- `git tag --list "pre-migration-*"` — `pre-migration-suppliers-debt`, `pre-migration-settings`, `pre-migration-employees`, `pre-migration-crm` exist (prior SPECs); the 4 new tag names from this SPEC are unique.

**Cross-Reference Check completed 2026-05-12 against `develop@eace1b5`: 0 collisions / 0 hits resolved.**

### Baselines (referenced by §5 Success Criteria as `BASE_*` symbols)

| Symbol | File | Metric | Value (captured 2026-05-12) |
|---|---|---|---|
| `BASE_LINES_blog` | storefront-blog.html | `wc -l` | 377 |
| `BASE_SCRIPTS_blog` | storefront-blog.html | `grep -c "<script"` | 21 |
| `BASE_LINKS_blog` | storefront-blog.html | `grep -c '<link rel="stylesheet"'` | 9 |
| `BASE_DOM_blog` | storefront-blog.html | `grep -oE '<[a-zA-Z][a-zA-Z0-9]*' \| wc -l` | 159 |
| `BASE_LINES_content` | storefront-content.html | `wc -l` | 357 |
| `BASE_SCRIPTS_content` | storefront-content.html | `grep -c "<script"` | 21 |
| `BASE_LINKS_content` | storefront-content.html | `grep -c '<link rel="stylesheet"'` | 9 |
| `BASE_DOM_content` | storefront-content.html | `grep -oE '<[a-zA-Z][a-zA-Z0-9]*' \| wc -l` | 188 |
| `BASE_LINES_landing-content` | storefront-landing-content.html | `wc -l` | 150 |
| `BASE_SCRIPTS_landing-content` | storefront-landing-content.html | `grep -c "<script"` | 20 |
| `BASE_LINKS_landing-content` | storefront-landing-content.html | `grep -c '<link rel="stylesheet"'` | 9 |
| `BASE_DOM_landing-content` | storefront-landing-content.html | `grep -oE '<[a-zA-Z][a-zA-Z0-9]*' \| wc -l` | 83 |
| `BASE_LINES_studio` | storefront-studio.html | `wc -l` | 297 |
| `BASE_SCRIPTS_studio` | storefront-studio.html | `grep -c "<script"` | 44 |
| `BASE_LINKS_studio` | storefront-studio.html | `grep -c '<link rel="stylesheet"'` | 11 |
| `BASE_DOM_studio` | storefront-studio.html | `grep -oE '<[a-zA-Z][a-zA-Z0-9]*' \| wc -l` | 131 |

±2% tolerance on `BASE_DOM_*` per Brief §7 #5: blog ±3 (156–162), content ±4 (184–192), landing-content ±2 (81–85), studio ±3 (128–134). DOM tag count must stay within those windows.

---

## 1. Goal

Re-skin the **decorative non-semantic** color usages on 4 of 7 Storefront-Studio production HTML pages from indigo/violet/gold to Hybrid+Navy (`#1e3a8a`). Zero functional change. Zero DOM change. Zero JS change. No CSS file edits (no `css/storefront-*.css` files exist). After this SPEC closes, all 4 production page migrations (Suppliers Debt, Settings+Permissions, CRM, Storefront Studio) are on Hybrid+Navy on `develop` and the batch is ready for Daniel's main-merge approval.

## 2. Scope — In

**In-scope HTML files (4):**
1. `storefront-blog.html`
2. `storefront-content.html`
3. `storefront-landing-content.html`
4. `storefront-studio.html`

**In-scope edits per file:** inline `<style>` block token-body swaps + (for storefront-studio.html only) two inline `style="…"` attribute token-body swaps on the toolbar buttons.

**No file outside this list is modified.** No CSS file. No JS file. No DOM structure. No shared assets.

## 3. Token Swap Plan

### 3a. Shared Edit Block A — Indigo→Navy `.btn-ai` gradient

**Applies to:** storefront-blog.html, storefront-content.html, storefront-landing-content.html.

**Sameness contract:** the `.btn-ai` CSS rule's `background` declaration is byte-identical-pattern across the three files at SPEC-author time (`background: linear-gradient(135deg, #6366f1, #8b5cf6);`). The migration replaces this declaration with `background: #1e3a8a;` (solid Navy, white text — text color stays unchanged because `color: #fff` is the same on all 3). The Reviewer verifies the swap text ONCE here, then checks per-commit conformance via grep.

**Before (verbatim):**
```css
background: linear-gradient(135deg, #6366f1, #8b5cf6);
```

**After (verbatim):**
```css
background: #1e3a8a;
```

Files this block applies to: `storefront-blog.html`, `storefront-content.html`, `storefront-landing-content.html`.

### 3b. Per-file additional swaps beyond Block A

Block A's `replace_all` mechanism (applied per-file via Edit tool with `replace_all: true`) covers EVERY byte-identical occurrence of the pattern inside its target file:
- `storefront-blog.html` — Block A matches 3 sites: `.btn-ai` (line 39), `.btn-ai-mode.active` (line 116), `.btn-ai-generate` (line 118).
- `storefront-content.html` — Block A matches 1 site: `.btn-ai` (line 41).
- `storefront-landing-content.html` — Block A matches 1 site: `.btn-ai` (line 38).

The table below lists swaps that are NOT byte-identical to Block A:

| File | Site | Before | After | Notes |
|---|---|---|---|---|
| storefront-content.html | `.progress-bar-fill` background | `linear-gradient(90deg, #6366f1, #8b5cf6)` | `#1e3a8a` | NOT Block A — gradient angle is `90deg` not `135deg`; separate Edit call |
| storefront-studio.html | `.lp-wizard-section input/select/textarea:focus` `border-color` | `#c9a555` | `#1e3a8a` | wizard form-control focus ring color |
| storefront-studio.html | `.lp-wizard-section input/select/textarea:focus` `box-shadow` rgba | `rgba(201,165,85,.12)` | `rgba(30,58,138,.12)` | wizard form-control focus halo |
| storefront-studio.html | `.lp-wizard-drop:hover, .lp-wizard-drop.dragover` `border-color` | `#c9a555` | `#1e3a8a` | wizard drop-zone hover/dragover state |
| storefront-studio.html | `.lp-wizard-drop:hover, .lp-wizard-drop.dragover` `background` | `#fefdf8` | `#e6f1fb` | wizard drop-zone hover tint → Navy-soft (already in variables.css as `--accent-navy-soft`) |
| storefront-studio.html | `.lp-wizard-footer .btn-create` `background` | `linear-gradient(135deg,#c9a555,#e8da94)` | `#1e3a8a` | wizard primary CTA |
| storefront-studio.html | `.lp-wizard-footer .btn-create` `color` | `#1a1a1a` | `#ffffff` | per Brief §3 row "purple-deep (bg) | `#1e3a8a` + white text" — Navy bg requires WCAG-AA-compliant light text |
| storefront-studio.html | inline `onmouseover` border color (line 79) | `'#c9a555'` | `'#1e3a8a'` | toolbar refresh-button hover border (event-handler text otherwise verbatim) |
| storefront-studio.html | inline `style` gradient on toolbar "🎯 דף נחיתה" (line 112) | `linear-gradient(135deg,#c9a555,#e8da94)` | `#1e3a8a` | toolbar primary-action gradient |
| storefront-studio.html | inline `style` color on toolbar "🎯 דף נחיתה" (line 112) | `color:#000` | `color:#fff` | text-on-Navy contrast |

**Total swap sites:** 3 (blog from Block A) + 1 (content from Block A) + 1 (content additional `.progress-bar-fill`) + 1 (landing-content from Block A) + 7 (studio additional) = **13 swap sites across 4 files**.

### 3c. variables.css — NO CHANGE

`shared/css/variables.css` already declares `--accent-navy: #1e3a8a` (line 176), `--accent-navy-hover: #1e40af` (line 177), `--accent-navy-soft: #e6f1fb` (line 178) — added in MIGRATION_1. **This SPEC does not touch `shared/css/variables.css`.** Verified by Iron-Rule-21 cross-reference.

## 4. Functional Preservation

Per file, the Executor MUST (per Brief §4):
1. Catalog every interactive behavior visible in the inline `<style>` block + body markup into `PRE_MIGRATION_BEHAVIOR.md` BEFORE the first commit.
2. Verify after each commit that the behavior set is byte-equivalent (HTML body content unchanged, `<script>` tags untouched, `data-*` attributes intact).
3. Localhost-Tester runs smoke on `storefront-studio.html` (main page) + 2 randomly-picked sub-pages from the 4-file in-scope list — using the demo tenant.

Specific behaviors that MUST survive:
- All `<script>` and `<link rel="stylesheet">` tags preserved byte-identical (counts in §5 success criteria).
- `var(--primary)` references unchanged (token-driven theming intact).
- `.lang-pill` family unchanged (out-of-scope, see §0).
- Google SERP preview colors unchanged (out-of-scope, see §0).
- All semantic colors unchanged (success/warning/danger/info).
- All neutral grays unchanged.
- DOM structure unchanged (DOM tag count within ±2% of `BASE_DOM_*`).
- Inline event handlers (`onclick`, `onmouseover`, `onmouseout`) preserved verbatim except for the 2 storefront-studio.html lines 79 + 112 where the COLOR LITERAL inside the handler is swapped (the handler text itself stays).

## 5. Success Criteria

| # | Criterion | Verification command | Expected value |
|---|---|---|---|
| C1 | All 4 in-scope HTML files migrated per §3 | `git diff --name-only pre-migration-storefront-blog..HEAD -- storefront-*.html` | exactly `storefront-blog.html storefront-content.html storefront-landing-content.html storefront-studio.html` |
| C2 | Legacy purple absent | `grep -ic "26215c\|534ab7" storefront-*.html` | `0` per file (was 0 → still 0; vacuously true but witnessed) |
| C3 | Indigo/violet decorative gradients absent in migrated files | `grep -ic "6366f1\|c9a555\|e8da94\|fefdf8" storefront-blog.html storefront-content.html storefront-landing-content.html storefront-studio.html` (note: `#8b5cf6` stays in blog via `.lang-ru` — see C3a) | blog `#6366f1`=0, content `#6366f1`=0, landing-content `#6366f1`=0, studio `#c9a555`=0, studio `#e8da94`=0, studio `#fefdf8`=0 |
| C3a | `.lang-pill` family preserved in blog (out-of-scope decision D-OOS-1) | `grep -c "#8b5cf6" storefront-blog.html` | `1` (only `.lang-ru` background) |
| C4 | Navy `#1e3a8a` hits per migrated file ≥ expected | `grep -c "1e3a8a" storefront-blog.html storefront-content.html storefront-landing-content.html storefront-studio.html` | blog ≥3, content ≥2, landing-content ≥1, studio ≥6 |
| C5 | `<script>` count preserved per file | `grep -c "<script" <file>` | blog=`BASE_SCRIPTS_blog`=21, content=`BASE_SCRIPTS_content`=21, landing-content=`BASE_SCRIPTS_landing-content`=20, studio=`BASE_SCRIPTS_studio`=44 |
| C6 | `<link rel="stylesheet">` count preserved per file | `grep -c '<link rel="stylesheet"' <file>` | blog=`BASE_LINKS_blog`=9, content=`BASE_LINKS_content`=9, landing-content=`BASE_LINKS_landing-content`=9, studio=`BASE_LINKS_studio`=11 |
| C7 | DOM opening-tag count within ±2% of `BASE_DOM_*` per file | `grep -oE '<[a-zA-Z][a-zA-Z0-9]*' <file> \| wc -l` | blog ∈ [156,162], content ∈ [184,192], landing-content ∈ [81,85], studio ∈ [128,134] |
| C8 | Pre-commit git tags exist for each migrated file | `git tag --list "pre-migration-storefront-*"` | exactly 4 tags: `pre-migration-storefront-blog`, `pre-migration-storefront-content`, `pre-migration-storefront-landing-content`, `pre-migration-storefront-studio` |
| C9 | Per-file commits (4) + 1 retrospective commit (5 commits in SPEC range) | `git log --oneline pre-migration-storefront-blog..HEAD` | 5 commits, one of which has scope `feat(storefront-blog)`, one `feat(storefront-content)`, one `feat(storefront-landing-content)`, one `feat(storefront-studio)`, one `chore(spec)` retrospective |
| C10 | 3 scope-clean files (glossary, products, settings) BYTE-IDENTICAL after SPEC | `git diff pre-migration-storefront-blog..HEAD -- storefront-glossary.html storefront-products.html storefront-settings.html` | empty diff |
| C11 | `shared/css/variables.css` byte-identical | `git diff pre-migration-storefront-blog..HEAD -- shared/css/variables.css` | empty diff |
| C12 | No JS file modified | `git diff --name-only pre-migration-storefront-blog..HEAD -- "*.js" js/ shared/js/` | empty |
| C13 | No CSS file modified (no `css/storefront-*.css` exists; no other CSS file touched) | `git diff --name-only pre-migration-storefront-blog..HEAD -- "css/*"` | empty |
| C14 | `npm run verify:integrity` exit 0 | `npm run verify:integrity; echo $?` | `0` |
| C15 | `npm run smoke` 7/7 PASS | `npm run smoke` | 7/7 PASS |
| C16 | Localhost-Tester report exists with GREEN verdict on main + 2 sub-pages | `cat modules/Module 1.5 - Shared Components/docs/specs/MIGRATION_4_STOREFRONT_STUDIO/TEST_REPORT.md \| grep "VERDICT.*GREEN"` | 1+ match |
| C17 | Working tree clean for this SPEC's files (pre-existing dirt allowed per §0) | `git status --porcelain -- storefront-*.html shared/css/variables.css` + SPEC folder | empty (only SPEC folder files staged or untracked-then-committed; HTML files clean) |
| C18 | Pushed to `origin/develop` (NOT main) | `git rev-parse HEAD = git rev-parse origin/develop` | match |

C1, C16, C17, C18 are PENDING at C1 commit and trivially GREEN at C5 (retrospective). C2–C15 GREEN immediately after C1–C4 commits.

## 6. Rollback Plan

Per-file rollback via per-file pre-commit tag:
- Single-file revert: `git revert <commit-hash-for-that-file>` (preferred — preserves history).
- Hard rollback of one file: `git checkout pre-migration-storefront-<stem> -- storefront-<stem>.html`.
- Full-batch rollback: `git reset --hard pre-migration-storefront-blog` (FIRST pre-migration tag, before any of the 4 commits).

Rollback is mandatory if ANY of the in-flight stop-triggers fire (§7).

## 7. Stop-Triggers (beyond CLAUDE.md §9)

Stop and emit ONE Hebrew line + escalation file (`modules/Module 1.5 - Shared Components/escalations/{ISO_TS}_MIGRATION_4_STOREFRONT_STUDIO.md`) if:
- A migrated page no longer parses (DOCTYPE / `<html>` / `</html>` damaged).
- DOM tag count deviates by >2% from `BASE_DOM_*` after edit.
- `<script>` count or `<link>` count changes for any file.
- A scope-clean file (glossary / products / settings) shows ANY diff.
- `shared/css/variables.css` is modified.
- Any `.js` or `.css` file modified.
- Iron Rule 31 gate or Iron Rule 32 hook rejects a commit (NOT for cosmetic heading reasons — fix in-flight; rather, for substantive violations).
- Localhost-Tester smoke fails on `storefront-studio.html` or either of the 2 sub-pages.
- The preview iframe to `opticup-storefront-demo.vercel.app` fails to load after migration.
- A behavior catalogued in `PRE_MIGRATION_BEHAVIOR.md` is observably broken on demo tenant.

## 8. Out of Scope (explicit)

- `storefront-glossary.html`, `storefront-products.html`, `storefront-settings.html` — already-conformant per §0 pre-flight; must NOT be edited. (Iron success-criterion C10.)
- `shared/css/variables.css` — Navy tokens already added in MIGRATION_1; idempotent skip.
- All `js/` and `shared/js/` — Brief §5 explicit zero-JS-edit envelope.
- All `css/*.css` — Brief §5 explicit; no `css/storefront-*.css` files exist anyway.
- Module 1 (Inventory) pages — Daniel directive (final production-migration set is post-batch).
- CRM, Settings, Permissions, Suppliers Debt pages — already migrated in MIGRATION_1/#2/#3.
- The public storefront (`opticup-storefront/` repo + Vercel project) — separate repo, separate constitution.
- `.lang-pill` family in blog — coherent badge family, out-of-scope decoration (§0 D-OOS-1).
- Google SERP preview colors in blog — literal Google brand references (§0 D-OOS-2).
- All semantic hex codes (success/warning/danger/info) — Brief §3 KEEP.
- All neutral grays — implicit KEEP.

## 9. Destructive Operations

Declared (per Iron Rule 32):
1. In-place file overwrites of 4 HTML files via Edit tool (with per-file pre-commit git tags for rollback): `storefront-blog.html`, `storefront-content.html`, `storefront-landing-content.html`, `storefront-studio.html`. Each file gets exactly one commit + one tag. No mass-delete, no rename, no copy-then-delete.
2. NO file deletes.
3. NO file renames.
4. NO SQL `DROP` / `ALTER DROP` / `TRUNCATE` / `DELETE`.
5. NO `git rebase`, NO `git reset --hard` (rollback path exists but is opt-in on stop-trigger).
6. NO `git push --force`.
7. NO `main` branch modification (push to `origin/develop` only).
8. NO governance-file section deletions (this SPEC.md is append-only after C1 commit lands).

Any operation outside this envelope mid-execution → STOP and escalate per §7.

## 10. Commit Plan

| # | Commit type | Files staged (explicit) | Commit message |
|---|---|---|---|
| C0 | Pre-commit tags (BEFORE any edits) | none — only `git tag pre-migration-storefront-<stem> eace1b5` per file × 4 | (no commit; 4 lightweight tags at baseline) |
| C1 | Migration: blog | `storefront-blog.html` + SPEC folder files (SPEC.md, PRE_MIGRATION_BEHAVIOR.md) | `feat(storefront-blog): migrate decorative AI-button gradients to Hybrid+Navy (migration #4)` |
| C2 | Migration: content | `storefront-content.html` only (SPEC folder already committed in C1) | `feat(storefront-content): migrate decorative AI/progress gradients to Hybrid+Navy (migration #4)` |
| C3 | Migration: landing-content | `storefront-landing-content.html` only | `feat(storefront-landing-content): migrate decorative AI-button gradient to Hybrid+Navy (migration #4)` |
| C4 | Migration: studio | `storefront-studio.html` only | `feat(storefront-studio): migrate wizard gold accent to Hybrid+Navy (migration #4)` |
| C5 | Retrospective | EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, FOREMAN_REVIEW.md, OPEN_TASKS.md, CHANGELOG.md, DECISIONS_LOG.md, MASTER_ROADMAP.md (if applicable), TECH_DEBT.md (if F-entries), SKILL.md edits (only if review proposes them) | `chore(spec): close MIGRATION_4_STOREFRONT_STUDIO 🟢 — retrospective + foreman review + batch-ready-for-main` |

Push policy: push after C5 lands. Tag push (`git push origin --tags`) at the same time as the branch push.

**Mid-tag note:** the C0 tags are placed at the SAME commit (`eace1b5`) since no SPEC commits have happened yet; that's intentional and matches MIGRATION_2's pattern.

## 11. Lessons Already Incorporated

From `MIGRATION_3_CRM/FOREMAN_REVIEW.md`:
- **Author Proposal #1 — No fractional section numbers / `## Destructive Operations` plain.** Applied in §9 heading (plain `## 9. Destructive Operations` — integer numbered).
- **Author Proposal #2 — §0 Pre-existing repo dirt at session start.** Applied in §0 "Pre-existing repo dirt at session start" sub-section.

From `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md`:
- **Author Proposal #1 — Shared Edit Block §3a.** Applied as §3a for the `.btn-ai` indigo→Navy swap across 3 files.
- **Author Proposal #2 — Baselines as `BASE_*` symbols in §0.** Applied in §0 Baselines table with 16 `BASE_*` symbols.

From `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md`:
- **Author Proposal #1 — Plain integer headings (no `§N`).** Applied throughout this SPEC.
- **Author Proposal #2 — Promote `§0 Pre-Authoring Reality Check`.** Applied as §0 with Divergences, Cross-Reference Check, Baselines.

Additional lesson application from MIGRATION_3 spot-check on commit messages: per-file `feat(<scope>):` commits remain the canonical form (Migration #2 + #3 pattern).

---

*End of SPEC. Hand off to opticup-executor for C0 tag placement + C1–C4 migrations + PRE_MIGRATION_BEHAVIOR.md authoring + EXECUTION_REPORT.md + FINDINGS.md.*
