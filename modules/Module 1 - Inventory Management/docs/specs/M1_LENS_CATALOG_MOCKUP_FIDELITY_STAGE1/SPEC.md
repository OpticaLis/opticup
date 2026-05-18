# SPEC — M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/SPEC.md`
> **Authored by:** opticup-strategic (Module Strategist + Foreman)
> **Authored on:** 2026-05-18
> **Module:** 1 — Inventory Management
> **Stage in 5-stage plan:** **1 of 5** (mockup-faithful screens)
> **Brief:** `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1_BRIEF.md` (sealed 2026-05-18 by opticup-architect)
> **Author signature:** Claude Code (Opus 4.7, Foreman session 2026-05-18 evening)

---

## 0. Pre-Authoring Reality Check

### Brief grounding
- Brief read in full on 2026-05-18.
- Two sealed mockups read:
  - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (dark, slate-900)
  - `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html` (light, #f5f6fa, Hybrid-Navy palette)

### Target file confirmation (line counts at SPEC-authoring time)
- `shared/js/catalog-private-admin.js` — **339 LOC** confirmed (limit 350 per Iron Rule 12; budget after additions ≤ 11 LOC)
- `inventory.html` — **1234 LOC**, 28 `<link rel="stylesheet">`, 107 `<script>`
- `css/lens-catalog-admin-page.css` — **479 LOC** (governs the separate "קטלוג מערכת" platform-admin tab, which is OUT OF SCOPE per §7)
- `shared/css/catalog-private-admin*` — **does not exist yet** (will be created)

### Architectural interpretation of the Brief (locked, do not relitigate during execution)

The Brief's "two views toggled by the button at `shared/js/catalog-private-admin.js:41`" maps as follows in actual repo state:

- The **toggle** is the global/private SUB-TAB toggle WITHIN the shared `catalog-private-admin.js` component (sub-tabs `data-subtab="global"` line 40 and `data-subtab="private"` line 41).
- The shared component is mounted by `LensPrivateCatalog.bootstrap` in `modules/inventory/inventory-shell-lens.js:136-148` into the inventory-page tab `section.lens-tab-section[data-tab="private-catalog"]`.
- The Brief §3 §3 wants this ONE component to render TWO chromes based on which sub-tab is active:
  - `data-subtab="global"` → **DARK** chrome per `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (#0f172a / #1e293b / #334155)
  - `data-subtab="private"` → **LIGHT** chrome per `LENS_INVENTORY_MOCKUP.html` palette (#f5f6fa background, white cards, Hybrid-Navy #c9a555 + #34495e accents)
- The **separate** platform-admin "קטלוג מערכת" tab (rendered by `modules/lens-catalog-admin/lens-catalog-admin.js`) is OUT OF SCOPE — that tab already shipped its dark rebuild in `M1_LENS_CATALOG_TRUE_REBUILD` commits 1+2 (hashes `434f254`, `454491b`). Tier C VFV will glance at it for sanity but no modifications are authorized.

### Color-form completeness check (visual re-skin — mandatory per SKILL §5.1)

For both mockups, the source CSS uses ONLY `#hex` literals — no `rgba(...)` or `rgb(...)` calls except one `rgba(0,0,0,*)` shadow that maps to no swappable identity, and one `rgba(30,58,138,0.3)` (focus ring) which decodes to `#1e3a8a` and IS in the swap map.

Decimal-channel verification (grep on both mockup files):
- `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`: `rgba(0,0,0,0.3)` (header shadow), `rgba(255,255,255,0.1)` (banner overlay), `rgba(30,58,138,0.3)` (input focus). Only `rgba(30,58,138,*)` aliases a palette token; carried into the swap map.
- `LENS_INVENTORY_MOCKUP.html`: `rgba(0,0,0,0.08)` / `rgba(0,0,0,0.15)` / `rgba(0,0,0,0.2)` / `rgba(0,0,0,0.3)` / `rgba(0,0,0,0.5)` (shadows + overlays only). All are opacity layers on black; no palette identity to swap.

→ The new CSS file MUST emit both `#1e3a8a` AND `rgba(30,58,138,0.3)` in the dark-theme block to honor the focus-ring shadow. Documented in §3 Success Criteria S-DARK-COLOR-FORMS.

### DOM-state mental rehearsal (CSS-layout-touching — mandatory per SKILL §5.4)

The component's existing grid layout (line 43):
```
grid-template-columns: 220px 220px 240px 1fr; height: calc(100vh - 320px); min-height: 480px;
```

Post-fix expectation: this SPEC does NOT alter the grid layout. Both themes retain `220px 220px 240px 1fr`. Only chrome (background, borders, text colors, button styles, badges) changes.

- Pre-fix layout (private sub-tab): grid renders 4 cols at viewport ≥920px wide. ✓
- Post-fix layout (private sub-tab, light theme): grid identical. ✓
- Post-fix layout (global sub-tab, dark theme): grid identical, BUT background flips to #0f172a + panel cards to #1e293b. ✓

No grid auto-placement traps. No `position:fixed` overlays. No flex/grid child-order swaps. The risk this SKILL §5.4 trap targets is not present.

### Lessons applied from prior FOREMAN_REVIEWs
- **`M1_LENS_PRIVATE_CATALOG_REBUILD/FOREMAN_REVIEW.md` (2026-05-18) — P-AUTHOR-2026-05-18-F (polish-by-validation pattern)**: that SPEC closed 🟢 with 0 code changes; Daniel reverted it as anti-pattern. This SPEC explicitly forbids 0-change closure (§5 Stop Triggers + §3 S-COMMITS) — the Executor MUST ship a new CSS file and JS edits, or STOP and escalate.
- **`M1_LENS_CATALOG_TRUE_REBUILD/FINDINGS.md` F-1 (class-name mismatch)**: when CSS is authored separately from renderer JS, grep-audit class-name consistency at SPEC author time. This SPEC's selectors operate on existing classes (`.list-item`, `.lens-panel`, `.lens-panel-header`, `.badge`, `.btn`, `.btn-g`, `.empty-state`, `.item-meta`) that catalog-private-admin.js already emits (grep-verified at SPEC-authoring time).
- **`M1_LENS_CATALOG_TRUE_REBUILD/FINDINGS.md` F-3 (MODULE_MAP not updated)**: every new file must be added to `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` in the SAME commit. This SPEC's §8 + §9 list MODULE_MAP.md as a touched file in Commit 1.
- **MIGRATION_2 Author Proposal #1 (Shared Edit Block)**: not applicable — this SPEC modifies 3 distinct files with non-identical edits.
- **MIGRATION_2 Author Proposal #2 (Baselines as symbols)**: applied — see Baselines table below.

### Pre-existing untracked files surveyed
At SPEC-authoring time (`git status --porcelain | grep '^??' | wc -l` → 8):
- M1 architecture-brief files (this SPEC's Brief + ACTIVATION_PROMPT)
- M1 SPEC folders (M1_5_SHARED_COMPONENTS_PHASE_0, this SPEC's folder once created)
- M1.5 architecture-brief (SEQUENTIAL_NUMBERING_INVESTIGATION)
- M3 FOREMAN_REVIEW files (M3_DEMO_TENANT_SEED_FROM_PRIZMA, M3_DEMO_WEBHOOK_SCRUB)
- M3 SPEC folder (M3_DEMO_TENANT_SLUG_FIX — closed in prior session)
- `tests/קטלוג-עדשות-18.5.26.xls` (Excel raw data, archive-bound)
- Modified (M): `.claude/skills/opticup-architect/SKILL.md`, `OPEN_TASKS.md`, `TECH_DEBT.md`

**Executor MUST use selective `git add` by filename throughout. NEVER `git add -A` / `git add .`** — would sweep the untracked Excel + unrelated skill edits into this SPEC's commits.

### Baselines

| Symbol | File | Metric | Value (2026-05-18) |
|---|---|---|---|
| `BASE_LINES_JS` | `shared/js/catalog-private-admin.js` | `wc -l` | **339** |
| `BASE_LINES_INVENTORY_HTML` | `inventory.html` | `wc -l` | **1234** |
| `BASE_LINKS_INVENTORY_HTML` | `inventory.html` | `grep -c '<link rel="stylesheet"'` | **28** |
| `BASE_FILES_CATALOG_CSS` | `shared/css/catalog-private-admin*` | `ls 2>&1 \| wc -l` | **0 (no files exist)** |

---

## 1. Goal

Re-skin the shared `catalog-private-admin.js` component so its two sub-tabs render in two distinct, mockup-faithful themes: DARK (slate-900) when `data-subtab="global"` matches `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`, and LIGHT (#f5f6fa Hybrid-Navy) when `data-subtab="private"` matches `LENS_INVENTORY_MOCKUP.html`. Add a new page-scope CSS file linked from `inventory.html`. No data, schema, or RPC work.

---

## 2. Background & Motivation

`M1_LENS_PRIVATE_CATALOG_REBUILD` (commit `96306a0`, 2026-05-18 earlier today) closed 🟢 with polish-by-validation — zero code changes — claiming the existing 339-line component already met all measurable criteria. Daniel's live-screen review on demo (localhost:3000/inventory.html?t=demo) rejected that closure: the screen did not match the sealed mockups. opticup-architect responded with the Stage-1 Brief that this SPEC implements.

This SPEC restarts the work under the no-polish-by-validation discipline. Real CSS + JS edits MUST ship. Tier C VFV is mandatory side-by-side mockup-vs-live in Chrome MCP, not self-certification. Closing 🟢 with zero changes is a stop-and-escalate event.

Upstream: M1_LENS_CATALOG_TRUE_REBUILD commits `434f254` + `454491b` (Suppliers col + dev-mode bypass on the SEPARATE platform-admin tab) — already on develop.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command / artifact |
|---|---|---|---|
| S-BRANCH | Branch state | On `develop`, clean post-push | `git status` → "nothing to commit, working tree clean" |
| S-COMMITS | Commits produced | **≥ 2 and ≤ 4** in this run (range `origin/develop..HEAD` measured **before** push) | `git log origin/develop..HEAD --oneline \| wc -l` ∈ {2,3,4} |
| S-NEW-CSS | New CSS file present | `shared/css/catalog-private-admin.css` exists, between 200 and 350 LOC | `wc -l shared/css/catalog-private-admin.css` ∈ [200, 350] |
| S-LINKED | New CSS linked in inventory.html | `inventory.html` contains `<link rel="stylesheet" href="shared/css/catalog-private-admin.css">` exactly once; total `<link>` count = `BASE_LINKS_INVENTORY_HTML` + 1 = **29** | `grep -c "shared/css/catalog-private-admin.css" inventory.html` → 1; `grep -c '<link rel="stylesheet"' inventory.html` → 29 |
| S-JS-DATA-ATTR | JS sets `data-catalog-theme` on the mount on every subtab switch | `switchSubtab` in `shared/js/catalog-private-admin.js` writes `opts.mountEl.dataset.catalogTheme = 'dark'` (global) / `'light'` (private). `buildShell` initialises the attribute. | `grep -n "data-catalog-theme\|dataset.catalogTheme" shared/js/catalog-private-admin.js` → ≥ 2 hits |
| S-JS-LOC | JS file size | `shared/js/catalog-private-admin.js` ≤ **350** LOC (Iron Rule 12 hard cap); growth from `BASE_LINES_JS=339` ≤ **+11 LOC** | `wc -l shared/js/catalog-private-admin.js` ≤ 350 |
| S-DARK-PALETTE | New CSS contains the dark-theme palette tokens | `[data-catalog-theme="dark"]` selector block contains ALL of: `#0f172a`, `#1e293b`, `#334155`, `#e2e8f0`, `#f1f5f9`, `#1e3a8a`, `#94a3b8` (≥7 distinct hex literals) | `grep -E "data-catalog-theme=\"dark\"" -A 200 shared/css/catalog-private-admin.css \| grep -oE '#[0-9a-fA-F]{6}' \| sort -u \| wc -l` ≥ 7 |
| S-DARK-COLOR-FORMS | Dark-theme block includes BOTH `#1e3a8a` literal AND `rgba(30,58,138,*)` (focus-ring form) | `grep -E "data-catalog-theme=\"dark\"" -A 300 shared/css/catalog-private-admin.css` contains both `#1e3a8a` (≥1) and `rgba(30,58,138` (≥1) | inline grep |
| S-LIGHT-PALETTE | New CSS contains the light-theme palette tokens | `[data-catalog-theme="light"]` selector block contains ALL of: `#f5f6fa`, `#c9a555`, `#b8954a`, `#34495e`, `#2c3e50`, `#5d6d7e`, `#d0d4d9`, `#ecf0f1` (≥8 distinct hex literals) | `grep -E "data-catalog-theme=\"light\"" -A 200 shared/css/catalog-private-admin.css \| grep -oE '#[0-9a-fA-F]{6}' \| sort -u \| wc -l` ≥ 8 |
| S-TOGGLE-PILL | New CSS adapts the toggle pill style to active theme per Brief §3 #3 ("light pill on dark bg, dark pill on light bg") | Dark block styles `[data-subtab="private"]` button with light-text-on-dark; light block styles `[data-subtab="global"]` button with dark-text-on-light. Active-state `.active` selector present in both blocks. | visual confirmation in EXECUTION_REPORT §3 + Tier C VFV |
| S-NO-ROOT | Iron Rule D3 — no `:root` mutation in `shared/css/styles.css` | `git diff origin/develop..HEAD -- shared/css/styles.css` returns no output | `git diff --stat origin/develop..HEAD -- shared/css/styles.css` → empty |
| S-MODULE-MAP | MODULE_MAP.md updated for new CSS file | `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` contains a one-line entry naming `shared/css/catalog-private-admin.css` and its purpose | `grep -c "catalog-private-admin.css" "modules/Module 1 - Inventory Management/docs/MODULE_MAP.md"` ≥ 1 |
| S-INTEGRITY | Iron Rule 31 Integrity Gate | exit 0 (clean) or 2 (warnings only); never 1 | `npm run verify:integrity; echo $?` → 0 or 2 |
| S-VERIFY-STAGED | Iron Rule 32 + general pre-commit gate | passes on every commit | `node scripts/verify.mjs --staged` exits 0 on each commit |
| S-LOCALHOST-VFV | Tier C VFV on demo tenant | 4 screenshots minimum: (a) global sub-tab live; (b) global mockup rendered; (c) private sub-tab live; (d) private mockup rendered. Saved under `<SPEC>/screenshots/`. TEST_REPORT.md classifies each element as `match` / `minor-deviation` / `fail`. | `ls modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/screenshots/*.png \| wc -l` ≥ 4 + TEST_REPORT.md present |
| S-NO-CONSOLE | Zero console errors on demo tenant after re-skin | 0 errors on `?t=demo&cat=lenses&tab=private-catalog` in both sub-tabs | Tester captures `list_console_messages` → empty |

**Hard rule — no polish-by-validation closure:**

If during execution the Executor finds that S-NEW-CSS or S-JS-DATA-ATTR cannot be satisfied because "existing code already does this" → **STOP**. Write an escalation file under `modules/Module 1 - Inventory Management/escalations/{ISO_TS}_M1_LENS_STAGE1_NO_CHANGES_NEEDED.md` describing what was already there and why no edits were possible. Do NOT close 🟢. Architect (opticup-architect) decides whether to re-scope or invalidate the Brief.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking
- Read any file in the repo
- Run read-only SQL on demo tenant (Level 1 autonomy) — though no DB reads should be needed
- Create new file `shared/css/catalog-private-admin.css`
- Edit `shared/js/catalog-private-admin.js` (≤+11 LOC of additions)
- Edit `inventory.html` (one `<link>` addition)
- Edit `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` (one-line entry)
- Edit `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` + `CHANGELOG.md` (closure entry)
- Selective `git add` + `git commit` + `git push origin develop`
- Run `node scripts/verify.mjs --staged`, `npm run verify:integrity`, `node scripts/pipeline-coordination.mjs heartbeat ...`

### What REQUIRES stopping and reporting
- Any DDL (CREATE/ALTER/DROP) — no schema work in this SPEC
- Any `git add -A` / `git add .` — strictly forbidden (see §0 untracked-files survey)
- Touching `shared/css/styles.css` — would violate D3 (no `:root` mutation)
- Touching `modules/lens-catalog-admin/**` — that's the separate platform-admin tab; out of scope per §7
- File size growth pushing `shared/js/catalog-private-admin.js` past 350 LOC
- Any merge to `main`
- Tier C VFV (Localhost-Tester) cannot reach localhost:3000/inventory.html?t=demo
- Tester reports a `fail` classification in TEST_REPORT.md → Foreman decides reopen vs close-with-followups
- Executor concludes "no changes are needed" → write escalation file (§3 hard rule), do NOT close 🟢

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- `shared/js/catalog-private-admin.js` exceeds 350 LOC after any edit → revert + STOP
- New CSS file exceeds 350 LOC → split into `*-dark.css` + `*-light.css` and add a second `<link>` to inventory.html (file count S-NEW-CSS adjusts accordingly — Executor logs a deviation note in EXECUTION_REPORT)
- Any catalog-private-admin runtime regression: brand drill stops working, sub-tab switch silently fails, "+ הוסף" buttons disappear on the private sub-tab → STOP, revert the offending commit
- Tester finds the toggle pill style doesn't visually adapt across themes → STOP, fix before closure
- A bug in catalog data-loading is observed mid-re-skin → log to FINDINGS, **do NOT** fix in this SPEC (Brief D4 — one concern per SPEC)
- An orphan CSS file or stale partial discovered in the catalog-admin area → log to FINDINGS, **do NOT** delete in this SPEC (Brief §7)

---

## 6. Rollback Plan

If the SPEC fails partway through:
- Pre-execution git tag: `pre-M1-stage1-mockup-fidelity-{YYYYMMDD-HHMM}` (Executor creates this BEFORE the first commit per Iron Rule 9 + opticup-executor SKILL.md).
- Roll back: `git reset --hard pre-M1-stage1-mockup-fidelity-{tag}` then `git push --force-with-lease origin develop` (force allowed ONLY if no other developer has pushed since the tag — verify with `git fetch && git log origin/develop`).
- No DB changes in this SPEC → no DB rollback needed.
- Backup folder (Iron Rule 9): `modules/Module 1 - Inventory Management/backups/2026-05-18_M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/` containing pre-edit copies of `shared/js/catalog-private-admin.js`, `inventory.html`, `MODULE_MAP.md`, `SESSION_CONTEXT.md`, `CHANGELOG.md`. Folder is gitignored; recovery path is the git tag. Trigger fires because this SPEC modifies a shared component used by 3 product types (glasses/contact_lens/accessory) — see §10 Notes.

Foreman notified; SPEC is marked REOPEN, not CLOSED, until a follow-up commit clears the deviation.

---

## Destructive Operations

1. One in-place file overwrite of `shared/js/catalog-private-admin.js` (≤+11 LOC additions; no removals beyond replacing the single `mountEl.innerHTML = `…``` template-literal opener and the `<button data-subtab>` lines to add `data-catalog-theme` plumbing).
2. One in-place file edit of `inventory.html` (one `<link>` line added; no removals).
3. One in-place file edit of `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` (one line added).
4. Pre-commit git tag `pre-M1-stage1-mockup-fidelity-{YYYYMMDD-HHMM}` created via `git tag` (additive; no force, no destructive flag).

No file deletes. No mass renames. No `git rebase` / `git reset --hard` / `git push --force` (except in §6 rollback path, which is contingent on failure and requires Foreman approval to execute).  No SQL DROP / TRUNCATE / DELETE. No edits to `main`. No edits that delete sections of any governance file (CLAUDE.md, SKILL.md).

---

## 7. Out of Scope (explicit — do NOT touch)

- `modules/lens-catalog-admin/**` — the separate "קטלוג מערכת" platform-admin tab. Its dark theme was shipped by M1_LENS_CATALOG_TRUE_REBUILD commits 1+2. Tier C VFV will glance at it for sanity but **no edits**. If VFV reveals deviations from `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` for THAT tab specifically, the Tester logs to TEST_REPORT.md and the Foreman files a follow-up SPEC stub — not this one.
- `css/lens-catalog-admin-page.css` — same reason as above. 479 LOC, owned by the platform-admin tab.
- `shared/css/styles.css` — Brief D3: no `:root` mutation.
- All Excel parsing / seed scripts / data work — that's Stage 2-5.
- The 4 TECH_DEBT items opened today (glasses-vs-contacts split, health-fund pricing, Excel normalization ownership, contact-lens phase decision) — Brief §4.
- Curation of the misclassified "brands" (יומיות/חודשיות/שנתיות) — Brief §4.
- `modules/contact-lens-catalog-admin/**` and the accessory-side catalog admin — these are sibling modules; reading shared/js/catalog-private-admin.js shouldn't affect them since the data-attribute approach is additive, but **no edits** to those sibling modules in this SPEC.
- Any refactor / split / rename of `shared/js/catalog-private-admin.js` — Brief §7 + §9 anti-pattern #4 (refactoring during re-skin).
- The toggle button's RELOCATION — Brief D2 locks the button at line 41.
- Adding a Suppliers column to the my-catalog view — the shared component is 3-col by design; adding a 4th col is a structural change, not a re-skin. Brief §3 #4 refers to the SEPARATE platform-admin tab's existing 4-col code (commits 1+2), not this component.

---

## 8. Expected Final State

### New files
- `shared/css/catalog-private-admin.css` — 200–350 LOC. Structure:
  - L1–~20: file-header comment + base shell rules (mount selector, grid, panel base)
  - L~21–~180: `[data-catalog-theme="dark"]` block — full chrome per `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`
  - L~181–~340: `[data-catalog-theme="light"]` block — full chrome per `LENS_INVENTORY_MOCKUP.html` palette
  - Selectors target classes the JS already emits: `.lens-page-title`, `.catalog-subtabs`, `.btn.btn-g`, `.lens-panel`, `.lens-panel-header`, `.list-item`, `.list-item.selected`, `.empty-state`, `.item-meta`, `.badge`, `.badge-private`.
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/SPEC.md` (this file)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/ACTIVATION_PROMPT.md` (Executor handoff prompt — Foreman drafts)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/EXECUTION_REPORT.md` (Executor closes)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/FINDINGS.md` (Executor closes; may have 0 findings)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/TEST_REPORT.md` (Localhost-Tester writes)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/REVIEWER_REPORT.md` (Reviewer writes) — optional if Reviewer prefers inline
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/FOREMAN_REVIEW.md` (Foreman writes — MANDATORY per Brief §5 #3)
- `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/screenshots/*.png` (Tier C VFV captures — ≥4 files)
- `modules/Module 1 - Inventory Management/backups/2026-05-18_M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1/*` (Iron Rule 9 backup, gitignored)

### Modified files
- `shared/js/catalog-private-admin.js` (339 → ≤350 LOC):
  - `buildShell(opts, state)` — write `opts.mountEl.dataset.catalogTheme = 'dark'` immediately after `opts.mountEl.innerHTML = …` template (line ~33). The initial subtab is `'global'` per `init()` (line 336), so dark is the correct initial value.
  - `switchSubtab(opts, state, sub)` — write `opts.mountEl.dataset.catalogTheme = (sub === 'private') ? 'light' : 'dark'` near the top, before the data-loading kicks in (line ~98).
- `inventory.html` — one `<link rel="stylesheet" href="shared/css/catalog-private-admin.css">` line added, placed inside the existing `<head>` near the other `shared/css/*.css` `<link>` tags (Executor picks an anchor that keeps file's reading order coherent).
- `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` — one line: ``shared/css/catalog-private-admin.css` — page-scope re-skin for catalog-private-admin component; toggles dark (global) ↔ light (private) chrome via `[data-catalog-theme]`. Added 2026-05-18 by M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1.`
- `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` — top-of-file closure entry (replaces or supersedes the partial-close entry from M1_LENS_CATALOG_TRUE_REBUILD).
- `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` — one-section entry for this SPEC.

### Deleted files
None.

### DB state
Unchanged.

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` — no edit unless M1 phase status changes (this SPEC is Stage 1 of 5; M1 lens-catalog remains "in rebuild", no roadmap-row update). Skipped.
- `docs/GLOBAL_MAP.md` — no edit (no new shared functions/contracts; CSS files aren't tracked in GLOBAL_MAP).
- `docs/GLOBAL_SCHEMA.sql` — no edit.
- Module's `SESSION_CONTEXT.md` — closure entry. **MUST**
- Module's `CHANGELOG.md` — Stage 1 section. **MUST**
- Module's `MODULE_MAP.md` — one-line new-file entry. **MUST**

---

## 9. Commit Plan

The Executor groups changes into 2–3 commits. **Selective `git add` by filename only — never `-A` / `.`**

- **Commit 1 — `feat(catalog-private-admin): mockup-faithful dark/light re-skin via [data-catalog-theme]`**
  - NEW `shared/css/catalog-private-admin.css`
  - MODIFY `shared/js/catalog-private-admin.js` (data-catalog-theme plumbing)
  - MODIFY `inventory.html` (one `<link>`)
  - MODIFY `modules/Module 1 - Inventory Management/docs/MODULE_MAP.md` (one line)

- **(Optional) Commit 2 — `fix(catalog-private-admin): <follow-up>`**
  - Reserved for a single follow-up if Tier C VFV reveals a minor deviation that can be patched in <30 LOC of CSS. If used, the commit message MUST cite the TEST_REPORT.md element that failed classification.

- **Commit 2 (or 3) — `chore(spec): close M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 with retrospective`**
  - SPEC folder: `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md`, `FOREMAN_REVIEW.md`, `screenshots/*.png`
  - MODIFY `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md`
  - MODIFY `modules/Module 1 - Inventory Management/docs/CHANGELOG.md`

Final commit count window: 2 minimum (Commit 1 + closure) ≤ 4 maximum (Commit 1 + 1 follow-up + Reviewer-amend + closure). §3 S-COMMITS enforces this.

---

## 10. Dependencies / Preconditions

- M1_LENS_CATALOG_TRUE_REBUILD commits `434f254` + `454491b` present on `origin/develop` (verified: `git log` shows them in the recent-10).
- demo tenant reachable at localhost:3000/inventory.html?t=demo with PIN 12345; `scripts/start-local.ps1` brings up the local ERP for Tier C.
- Pipeline coordination lock claimed by Foreman session `M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1` (already done — lock file `_archive/pipeline-sessions/2026-05-18T14-25-58-212Z_M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1_pid-37696-295a10eb.lock`).
- Executor MUST re-claim the lock as `role=executor` after the Foreman releases — or the Executor inherits the Foreman's lock by `--session-id` reuse. (Executor SKILL.md defines the exact handoff; Foreman does NOT release until pipeline closes.)

### Iron Rule 9 backup trigger (Notes)

Per CLAUDE.md §9 #9: backup is automatic when an operation touches >5 files OR refactors >100 LOC in a single file OR renames any file. This SPEC touches 4 files (CSS new, JS modify, HTML modify, MODULE_MAP modify) — under the 5-file trigger. JS modification ≤11 LOC — under the 100-LOC trigger. **Backup is NOT strictly required by the trigger.** HOWEVER: per Brief §10 #4 ("Pre-commit safety tag before any edit") + executor-skill convention for shared-component edits, the Executor SHOULD still tag pre-execution via `git tag pre-M1-stage1-mockup-fidelity-{YYYYMMDD-HHMM}` so §6 rollback is one command. Skip the backup folder (gitignored anyway, recovery via git tag is sufficient).

---

## 11. Lessons Already Incorporated

- FROM `M1_LENS_PRIVATE_CATALOG_REBUILD/FOREMAN_REVIEW.md` (2026-05-18) → "polish-by-validation P-AUTHOR-F" → **APPLIED INVERSELY** in §3 hard rule + §5 stop trigger: 0-change closure is explicitly forbidden here. Executor MUST ship the new CSS file and the JS edits, or escalate.
- FROM `M1_LENS_CATALOG_TRUE_REBUILD/FINDINGS.md` F-1 (class-name mismatch) → **APPLIED** in §0 (grep-audited selectors against emitted classes) and §3 S-DARK-PALETTE / S-LIGHT-PALETTE (palette tokens verified in mockup before SPEC sealed).
- FROM `M1_LENS_CATALOG_TRUE_REBUILD/FINDINGS.md` F-3 (MODULE_MAP not updated) → **APPLIED** in §3 S-MODULE-MAP + §9 Commit 1.
- FROM `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` (2026-05-12) Author Proposal #1 (color-form completeness) → **APPLIED** in §0 (rgba-vs-hex sweep done at SPEC author time) and §3 S-DARK-COLOR-FORMS.
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` (2026-05-11) Author Proposal #2 (Baselines as symbols) → **APPLIED** — see §0 Baselines table; §3 references `BASE_LINKS_INVENTORY_HTML` + `BASE_LINES_JS`.
- FROM `M1_5_CAT_SIDEBAR_OVERLAP_HOTFIX_2/FOREMAN_REVIEW.md` (2026-05-17) Author Proposal P-AUTHOR-1 (DOM-state mental rehearsal) → **APPLIED** in §0 DOM-state rehearsal. No grid layout changes; risk class not present.
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` (2026-05-11) Author Proposal #1 (heading-convention — no `§` prefix; use `## N. Title`) → **APPLIED** — this SPEC's headings use plain `## N. Title` form, Iron Rule 32 pre-commit hook will accept the `## Destructive Operations` section.

---

## 12. Pre-Merge Checklist (Executor signs off in EXECUTION_REPORT)

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate (Iron Rule 31): `npm run verify:integrity` returns exit 0 or 2. Null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] Destructive-ops gate (Iron Rule 32): `node scripts/verify.mjs --staged` passes on every commit; the `## Destructive Operations` section in this SPEC matches actual operations performed.
- [ ] `git status --short` returns empty (clean tree at session end — CLAUDE.md §9 mandatory).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in the SPEC folder.
- [ ] Module SESSION_CONTEXT.md / CHANGELOG.md / MODULE_MAP.md updated per §8.
- [ ] Tier C VFV: ≥4 screenshots in `screenshots/`, TEST_REPORT.md written by Localhost-Tester with `match` / `minor-deviation` / `fail` classification per element.
- [ ] FOREMAN_REVIEW.md authored in the SAME session as EXECUTION_REPORT.md (Brief §5 hard rule #3 — within 24h, ideally within minutes).

---

## 13. Pipeline Path

**Path X — sequential.** Foreman (this SPEC) → Executor → Reviewer → Localhost-Tester → Foreman closure.

- Foreman: this SPEC + ACTIVATION_PROMPT.md (handoff).
- Executor: claim lock, tag pre-execution, ship Commit 1, run staged verify, push.
- Reviewer: read commits, audit Iron Rule adherence (esp. #12 file size, #21 no duplicates, #23 no secrets — though re-skin SPEC is low-risk on all three), audit selector → class match (per F-1 lesson), audit color-form completeness against §3 sub-counts. Reviewer writes a short REVIEWER_REPORT.md or attaches findings to FINDINGS.md.
- Localhost-Tester: bring up localhost:3000 via `scripts/start-local.ps1`; load `/inventory.html?t=demo` with PIN 12345; switch to "📚 קטלוג עדשות" → "private-catalog" tab; toggle global ↔ private and capture 4 screenshots minimum (live global + live private + corresponding mockup renderings). Side-by-side classification per element in TEST_REPORT.md.
- Foreman: spot-check 2-3 of the largest claims, write FOREMAN_REVIEW.md with 2 author-skill + 2 executor-skill improvement proposals harvested from this SPEC's execution.

**Stop-on-deviation: standard.** Escalation file under `modules/Module 1 - Inventory Management/escalations/` if any stop trigger fires.

---

_End SPEC.md. Total length pre-publication: ~470 lines (this SPEC is documentation, not code — Iron Rule 12's 350-line cap does not apply to SPEC.md per established convention)._
