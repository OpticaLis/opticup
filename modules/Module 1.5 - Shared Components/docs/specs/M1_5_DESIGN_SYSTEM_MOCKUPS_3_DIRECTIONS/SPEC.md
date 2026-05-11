# SPEC — M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-10
> **Module:** 1.5 — Shared Components
> **Phase (in Design System initiative):** 3 of 4
> **Parent brief:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_BRIEF.md`
> **Depends on:** `M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY` (Phase 2) — must be 🟢 CLOSED first
> **Author signature:** opticup-strategic / 2026-05-10 design-system phase-3 draft

---

## 1. Goal

Build the comparison tree at `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/` containing **3 design directions × 13 modules × 1 HTML mockup each + 3 INDEX.html navigators + 3 `_tokens.css` direction overrides** — total 45 deliverables. Each direction is driven by exactly ONE `_tokens.css` file that overrides the shared design tokens. Per-module HTMLs preserve the approved layouts verbatim (sketch-preservation rule, brief §2 #5a) — only colors, typography, spacing, radii, shadows, and density change per direction. Daniel opens 3 `INDEX.html` files and chooses ONE direction in Phase 4.

---

## 2. Background & Motivation

Phases 1 + 2 produced a token system + a token-only component library. Phase 3 puts the system to work: 3 substantively-different design directions, each rendered against every module that has either approved sketches (M5–M15) or a production HTML (M1, M3 Storefront Studio, M4 CRM). Daniel sees them apples-to-apples and picks the platform default for Module 1.5 onward.

The brief is explicit: **the 3 directions must be substantively different** (brief §8 — "don't show Daniel 3 variations of the same idea"). Daniel locked the Bold sub-axis to **dense-pro-tool** (Linear/Bloomberg style — high density, small fonts, info-rich) in this session 2026-05-10 — resolving the brief's §7 question on Bold's axis. The other two directions are Conservative (production-close, low risk) and Modern-clean (light/airy, generous whitespace, soft shadows, SaaS-default feel à la Notion/Linear-light).

This SPEC's executor work is heavy on file count (45) but light on per-file complexity — the canonical-source extraction is mostly mechanical (copy markup, remove runtime scripts where production-sourced, link to the direction's `_tokens.css`).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Phase 2 SPEC closed | EXECUTION_REPORT + FINDINGS exist in Phase 2 folder | `ls "modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_COMPONENT_LIBRARY/"` |
| 3 | Total commits produced | 6 commits (one per direction = 3, +1 INDEX/tooling, +1 docs, +1 retro) | `git log origin/develop..HEAD --oneline \| wc -l` → 6 |
| 4 | Top-level mockup folder created | `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/` exists | `ls` → exit 0 |
| 5 | Direction folders | exactly 3 subfolders: `direction-1-conservative/`, `direction-2-modern-clean/`, `direction-3-bold-dense-pro-tool/` | `ls "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/" \| sort` → exactly those 3 names |
| 6 | Per-direction `_tokens.css` | each direction has a `_tokens.css` file ≤ 200 lines | `for d in direction-{1-conservative,2-modern-clean,3-bold-dense-pro-tool}; do wc -l ".../design-system-mockups/$d/_tokens.css"; done` → all ≤ 200 |
| 7 | Per-direction module HTMLs | each direction contains exactly 13 module HTMLs with names from the canonical list (§8) | `for d in direction-1*/direction-2*/direction-3*; do ls "$d"/M*.html \| wc -l; done` → each `13` |
| 8 | Per-direction INDEX.html | each direction has an `INDEX.html` with tabs/links to all 13 module HTMLs IN THE SAME DIRECTION + a clearly-labeled link to switch direction | `for d in direction-*; do grep -c "M1-inventory.html" "$d/INDEX.html"; done` → all `1` |
| 9 | Total HTML deliverables | 3 × 13 + 3 = 42 HTMLs + 3 _tokens.css = 45 files under `design-system-mockups/` | `find "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/" -type f \| wc -l` → 45 |
| 10 | No hardcoded hex outside `_tokens.css` files | every direction's HTMLs use tokens only (inline `style=` with literal hex is forbidden except in `_tokens.css`) | `grep -rE "style=\"[^\"]*#[0-9a-fA-F]{3,8}" "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/" \| grep -v "_tokens.css" \| wc -l` → `0` |
| 11 | Conservative direction Prizma override sample | `direction-1-conservative/INDEX.html` includes a visible "Prizma sample" toggle that swaps in Prizma's Indigo via inline `<script>` setting `:root` properties — proves tenant-override works mid-direction | `grep -c "Prizma sample" "modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/direction-1-conservative/INDEX.html"` → ≥ 1 |
| 12 | Modern-clean direction body font-size | `_tokens.css` for direction-2 sets `--font-size-md: 1.0rem` (larger base) | `grep -E "^\s*--font-size-md:\s*1\.0rem" ".../direction-2-modern-clean/_tokens.css"` → exit 0 |
| 13 | Bold (dense) direction body font-size | `_tokens.css` for direction-3 sets `--font-size-md: 0.78rem` (smaller, pro-tool density) | `grep -E "^\s*--font-size-md:\s*0\.78rem" ".../direction-3-bold-dense-pro-tool/_tokens.css"` → exit 0 |
| 14 | Bold (dense) direction radius | direction-3 sets `--radius-md: 2px` (sharp, terminal-feel) | `grep -E "^\s*--radius-md:\s*2px" ".../direction-3-bold-dense-pro-tool/_tokens.css"` → exit 0 |
| 15 | Modern-clean radius | direction-2 sets `--radius-md: 12px` (rounder) | `grep -E "^\s*--radius-md:\s*12px" ".../direction-2-modern-clean/_tokens.css"` → exit 0 |
| 16 | All HTMLs use UTF-8 + RTL | each module HTML has `<html lang="he" dir="rtl">` and `<meta charset="UTF-8">` | `for f in ...mockups/direction-*/M*.html; do grep -c "lang=\"he\" dir=\"rtl\"" "$f"; done` → all `1` |
| 17 | No runtime JS calls in production-sourced HTMLs | M1 / M3-storefront-studio / M4 mockups have ZERO `<script src="...shared.js">`, ZERO `<script src=".*supabase.*">`, ZERO `window.sb` references | `grep -rE "shared\.js\|supabase-js\|window\.sb" .../mockups/direction-*/M{1-inventory,3-storefront-studio,4-crm}.html` → empty |
| 18 | Sketch-preservation: M5–M15 layouts match source mockups | for each M5–M15, the DOM tree structure (element-tag sequence, ignoring whitespace + class names + style attrs) of the direction-1 HTML matches the source-of-truth mockup's tree | Localhost-Tester compares via headless DOM walker; expected 0 structural diffs (only style/class diffs allowed) |
| 19 | Each direction opens in browser without console errors | open `direction-N/INDEX.html` directly via `file://` AND via `http://localhost:3000/...` → 0 console errors | Localhost-Tester opens each INDEX.html + samples 3 random module HTMLs per direction; expected 0 errors per page |
| 20 | M1.5 SESSION_CONTEXT, CHANGELOG, MASTER_ROADMAP updated | Phase 3 entries present | grep each |
| 21 | EXECUTION_REPORT + FINDINGS in SPEC folder | both files exist | `ls` |
| 22 | Integrity Gate | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 23 | HEAD pushed to `origin/develop` | yes | `git rev-parse HEAD` === `git rev-parse origin/develop` |
| 24 | Clean tree at close | empty | `git status --short` → empty |
| 25 | Total new artifact lines | reasonable; 13 module HTMLs × ~150 lines × 3 directions + 3 × 200 token sheet + 3 × ~250 INDEX ≈ 7500 lines | `find .../design-system-mockups/ -type f -exec wc -l {} + \| tail -1` |

---

## 4. The 3 Directions — Locked Specifications

These are NOT suggestions; they are the contract Daniel signed off on (this session, 2026-05-10).

### Direction 1 — **Conservative** (production-close, minimal disruption)
**Vibe:** "Just like today, but cleaner." Production-like density. Familiar to Prizma users.

`_tokens.css` overrides (relative to platform defaults from Phase 1):
- **No overrides on color tokens** — uses platform neutral (Slate-900 primary).
- `--font-size-md: 0.92rem` (current default, unchanged).
- `--space-md: 12px`, `--space-lg: 16px` (current defaults).
- `--radius-md: 8px` (current).
- `--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08)` (current).
- Density: regular (matches today's ERP).

INDEX.html includes a "Prizma sample" toggle that injects `--color-primary: #4f46e5; --color-primary-hover: #4338ca; --color-primary-light: #eef2ff; --color-primary-dark: #3730a3;` on `:root` — demonstrates how a tenant override changes ONE direction's brand surface.

### Direction 2 — **Modern-clean** (light, airy, SaaS-default)
**Vibe:** "Notion / Linear default / modern fintech dashboards." Generous whitespace, soft shadows, rounded cards, big touch targets, low information density (fewer rows visible per scroll).

`_tokens.css` overrides:
- `--font-size-md: 1.0rem` (slightly larger base).
- `--font-size-sm: 0.92rem`, `--font-size-lg: 1.18rem`, `--font-size-xl: 1.5rem`.
- `--space-md: 16px`, `--space-lg: 24px`, `--space-xl: 32px`, `--space-2xl: 48px` (looser).
- `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-sm: 8px`.
- `--shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.04)`.
- `--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.06)`.
- `--shadow-lg: 0 24px 64px rgba(15, 23, 42, 0.10)`.
- Background subtle tint: `--color-bg-page: #fafafa`.
- Density: low. Table row min-height effectively 56px via padding.

### Direction 3 — **Bold (dense-pro-tool)** — Linear/Bloomberg pro-tool aesthetic
**Vibe:** "Terminal for power users." Maximum information density, small fonts (~12.5px body), tight padding, sharp 1px borders instead of soft shadows, monospace numerals where they read better. Keyboard-first feel. Status conveyed via accent colors against near-black/white.

`_tokens.css` overrides:
- `--font-size-md: 0.78rem` (~12.5px — pro-tool small).
- `--font-size-sm: 0.72rem`, `--font-size-lg: 0.92rem`, `--font-size-xl: 1.15rem`, `--font-size-2xl: 1.4rem`.
- `--font-weight-medium: 500`, `--font-weight-semibold: 600` — restrained weight scale.
- `--space-md: 6px`, `--space-lg: 10px`, `--space-xl: 14px`, `--space-2xl: 20px` (tight).
- `--space-sm: 4px`, `--space-xs: 2px`.
- `--radius-md: 2px`, `--radius-lg: 4px`, `--radius-sm: 2px`, `--radius-full: 9999px` (kept).
- `--shadow-sm: 0 0 0 1px rgba(15, 23, 42, 0.08)` (border-like, no blur).
- `--shadow-md: 0 1px 2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.08)`.
- `--shadow-lg: 0 4px 8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.12)`.
- `--color-bg-page: #fafafa` (subtle off-white — terminal-ish).
- `--color-gray-200: #e2e8f0` used heavily as 1px borders (every card, every table, every input).
- ADD a monospace-numerals helper: `[data-numeric] { font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }` applied to currency cells, counts, dates.
- Density: HIGH. Table row min-height ≤ 28px. Form rows tight. Cards have no inner padding above 10px.

**Anti-blandness check:** if at INDEX-render time Direction 3 looks visually similar to Direction 1, the executor MUST stop. The differentiator is density — if a Bold direction screen shows the same number of table rows visible as Conservative, it's failing the spec. Concretely: on a 1080-tall viewport, Direction 1 = ~14 rows visible, Direction 2 = ~10, Direction 3 = ~22+.

---

## 5. Stop-on-Deviation Triggers

- Phase 2 SPEC not 🟢 CLOSED → STOP.
- Any source-of-truth file in §8 doesn't exist on disk at execution start → STOP and report which one (likely a rename — Foreman re-authors §8).
- A direction-3 module HTML, after rendering, fails the density check (≥22 rows visible at 1080 viewport for table-heavy modules) → STOP.
- Any direction's INDEX.html mixes module HTMLs across directions (e.g., direction-1 INDEX links to a direction-2 HTML) → STOP.
- A production-sourced module HTML (M1/M3 Studio/M4) retains any `<script>` tag referencing `sb`, Supabase JS, or auth-service → STOP (criterion #17).
- Any module HTML modifies the source mockup's element-tag sequence (sketch-preservation rule violated) → STOP.
- INDEX.html broken (missing tab, dead link, console error on load) → STOP.

---

## 6. Rollback Plan

If the SPEC fails mid-way:
1. `git reset --hard {START_COMMIT}` — START_COMMIT in EXECUTION_REPORT §1.
2. No DB changes → no DB rollback.
3. Notify Foreman; SPEC marked REOPEN.

Per-direction granularity: each direction is its own commit (§9), so a single bad direction can be reverted without losing the other two.

---

## 7. Out of Scope

- **Component CSS** (`shared/css/*.css`) — frozen by Phase 2.
- **JS** (`shared/js/*.js`) — frozen.
- **Variables.css** — no token-value changes here. Tokens are overridden at the DIRECTION level via `_tokens.css`, not in the global variables.css. Variables.css holds defaults; direction overrides at `:root` from the direction folder.
- **Selecting the winning direction** — Phase 4's job, not this SPEC's. This SPEC produces; Phase 4 decides + closes.
- **Migrating any production module to the chosen direction** — explicitly NOT in any Design System SPEC; per Brief §3, migration is a separate per-module SPEC after Daniel picks.
- **Storefront repo** — out of scope.
- **Mobile-first responsive overhaul** — out of scope per Brief §3.
- **Dark mode for non-Prizma tenants** — out of scope per Brief §3.
- **Animation library** — motion tokens are the boundary; out-of-scope to ship a Lottie/Framer Motion equivalent.
- **Adding M2 (Platform Admin), M10 (TBD) or any other module not in §8's list of 13** — scope-frozen.

---

## 8. Expected Final State

### New folder structure

```
modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/
├── direction-1-conservative/
│   ├── _tokens.css
│   ├── INDEX.html
│   ├── M1-inventory.html
│   ├── M3-storefront-studio.html
│   ├── M4-crm.html
│   ├── M5-customers.html
│   ├── M6-prescriptions.html
│   ├── M7-orders.html
│   ├── M8-payments.html
│   ├── M9-lab-kds.html
│   ├── M11-reports.html
│   ├── M12-communications.html
│   ├── M13-loyalty.html
│   ├── M14-appointments.html
│   └── M15-queue.html
├── direction-2-modern-clean/   (same 15 files)
└── direction-3-bold-dense-pro-tool/  (same 15 files)
```

### Canonical source-of-truth per module (executor MUST verify file existence at SPEC start; missing = STOP)

| Module slug | Source-of-truth file | Type |
|---|---|---|
| `M1-inventory.html` | `inventory.html` (repo root, production) | Production layout (staticize) |
| `M3-storefront-studio.html` | `storefront-studio.html` (repo root, production) | Production layout (staticize) |
| `M4-crm.html` | `crm.html` (repo root, production) | Production layout (staticize) |
| `M5-customers.html` | `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMERS_LIST_MOCKUPS.html` | Approved mockup (preserve) |
| `M6-prescriptions.html` | `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html` | Approved mockup |
| `M7-orders.html` | `modules/Module 7 - Orders/architecture-brief/M7_ORDERS_FULL_MOCKUP_V6.html` | Approved mockup (canonical V6) |
| `M8-payments.html` | `modules/Module 8 - Payments/architecture-brief/M8_CHECKOUT_MOCKUP_V3.html` | Approved mockup (canonical V3) |
| `M9-lab-kds.html` | `modules/Module 9 - Lab/architecture-brief/M9_DASHBOARD_SKETCHES.html` | Approved sketch |
| `M11-reports.html` | `modules/Module 11 - Reports/architecture-brief/M11_REPORTS_LIST_MOCKUP.html` | Approved mockup |
| `M12-communications.html` | `modules/Module 12 - Communications/architecture-brief/M12_WHATSAPP_INBOX_MOCKUP.html` | Approved mockup |
| `M13-loyalty.html` | `modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html` | Approved sketch |
| `M14-appointments.html` | `modules/Module 14 - Appointments/architecture-brief/M14_APPOINTMENTS_MOCKUP.html` | Approved mockup |
| `M15-queue.html` | `modules/Module 15 - Queue/architecture-brief/M15_QUEUE_MOCKUP.html` | Approved mockup |

(Module 9's folder is `Module 9 - Lab`, NOT `Module 9 - Lab KDS` — the brief had a minor name drift. Verified 2026-05-10 by Foreman.)

### Staticization rules for production-sourced HTMLs (M1, M3-Studio, M4)

For each of these 3 production HTMLs:
1. Copy `<head>` and `<body>` structure verbatim.
2. Remove all `<script>` tags (Supabase loader, shared.js, auth-service, header, page-specific scripts).
3. Remove any `<link rel="stylesheet">` to `js/`-controlled files (auth modal, login UI).
4. Replace dynamic data placeholders with realistic-looking inline mock content (a few representative rows of Hebrew inventory, customer names, etc.). DO NOT redesign the table — copy table structure, fill with mock data.
5. Add `<link rel="stylesheet" href="../../../../shared/css/variables.css">` + `<link rel="stylesheet" href="../../../../shared/css/components.css">` + every other shared component CSS the page uses + `<link rel="stylesheet" href="./_tokens.css">` (the direction-specific override — load LAST to win cascade).
6. Optional: add a top-banner `<div>` with text like "DESIGN MOCKUP — Conservative direction · M1 Inventory" so visitors know they're looking at a mockup, not the live app.

### Staticization rules for mockup-sourced HTMLs (M5–M15)

For each:
1. Copy the source mockup verbatim into the direction folder under the canonical filename.
2. Remove any inline `<style>` blocks that hardcode hex colors — extract into the direction's `_tokens.css` if it's a unique need, OR delete (let the shared component CSS handle it).
3. Add the same `<link rel="stylesheet">` chain as production-sourced HTMLs (variables.css → component CSS → _tokens.css).
4. PRESERVE every element-tag sequence (the layout). PRESERVE class names where they map to shared component CSS classes. CHANGE: inline `style=` colors, font sizes, padding values → tokens.

### INDEX.html structure (one per direction)

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Design Direction [N]: [name] — Optic Up Design System</title>
  <link rel="stylesheet" href="../../../../shared/css/variables.css">
  <link rel="stylesheet" href="../../../../shared/css/layout.css">
  <link rel="stylesheet" href="../../../../shared/css/components.css">
  <link rel="stylesheet" href="./_tokens.css">
  <style>
    /* INDEX-only nav styles — uses tokens */
    .ds-nav { display: flex; gap: var(--space-sm); flex-wrap: wrap; padding: var(--space-lg); border-bottom: 1px solid var(--color-gray-200); }
    .ds-nav a { padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); text-decoration: none; color: var(--color-gray-700); background: var(--color-gray-100); }
    .ds-nav a:hover { background: var(--color-primary); color: var(--color-white); }
    .ds-frame { width: 100%; height: calc(100vh - 120px); border: 0; }
    .ds-direction-switch { padding: var(--space-md) var(--space-lg); background: var(--color-primary-light); color: var(--color-primary-dark); }
  </style>
</head>
<body>
  <div class="ds-direction-switch">
    <strong>כיוון [N]: [name]</strong>
    <span> · </span>
    <a href="../direction-1-conservative/INDEX.html">Conservative</a> |
    <a href="../direction-2-modern-clean/INDEX.html">Modern-clean</a> |
    <a href="../direction-3-bold-dense-pro-tool/INDEX.html">Bold (dense-pro-tool)</a>
  </div>
  <nav class="ds-nav">
    <a href="./M1-inventory.html" target="ds-preview">M1 Inventory</a>
    <a href="./M3-storefront-studio.html" target="ds-preview">M3 Storefront Studio</a>
    <a href="./M4-crm.html" target="ds-preview">M4 CRM</a>
    <a href="./M5-customers.html" target="ds-preview">M5 Customers</a>
    <a href="./M6-prescriptions.html" target="ds-preview">M6 Prescriptions</a>
    <a href="./M7-orders.html" target="ds-preview">M7 Orders</a>
    <a href="./M8-payments.html" target="ds-preview">M8 Payments</a>
    <a href="./M9-lab-kds.html" target="ds-preview">M9 Lab/KDS</a>
    <a href="./M11-reports.html" target="ds-preview">M11 Reports</a>
    <a href="./M12-communications.html" target="ds-preview">M12 Communications</a>
    <a href="./M13-loyalty.html" target="ds-preview">M13 Loyalty</a>
    <a href="./M14-appointments.html" target="ds-preview">M14 Appointments</a>
    <a href="./M15-queue.html" target="ds-preview">M15 Queue</a>
  </nav>
  <iframe class="ds-frame" name="ds-preview" src="./M1-inventory.html"></iframe>

  <!-- Direction 1 ONLY: Prizma override sample toggle -->
  <!-- (omit in directions 2 + 3) -->
  <script>
    const params = new URLSearchParams(window.location.search);
    if (params.get('tenant') === 'prizma') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary',       '#4f46e5');
      root.style.setProperty('--color-primary-hover', '#4338ca');
      root.style.setProperty('--color-primary-light', '#eef2ff');
      root.style.setProperty('--color-primary-dark',  '#3730a3');
    }
  </script>
</body>
</html>
```

Tab navigation: click a module-name link → loads in the iframe (`target="ds-preview"`). Daniel can rapid-switch between modules within a direction. Top bar switches direction.

Prizma sample (Direction 1 ONLY): append `?tenant=prizma` to the INDEX URL → :root gets Indigo overrides → all 13 module iframes inherit the override. Demonstrates the tenant-override mechanism without leaving the comparison page.

### Modified files
- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` — append "Phase 3 mockups present at architecture-brief/design-system-mockups/."
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — append Phase 3 section.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — update Last-updated + add Phase 3 section.
- `MASTER_ROADMAP.md` — append Phase 3 line.

### Deleted files
None.

### DB state
No DB changes.

### File classification (MUST / MAY / VERIFY-ONLY)
- **MUST-EDIT:** 45 new files under `design-system-mockups/`, 3 M1.5 docs (MAP/CHANGELOG/SESSION_CONTEXT), MASTER_ROADMAP, EXECUTION_REPORT, FINDINGS.
- **MAY-EDIT:** none.
- **VERIFY-ONLY (read-only — touching = stop-trigger):** every source-of-truth file (13 files listed in §8 table), every file under `shared/css/`, every file under `shared/js/`, every file in `css/`, every `*.html` at repo root, every other module's `architecture-brief/`, the storefront repo.

---

## 9. Commit Plan

- **Commit 1** — `feat(design-system): build direction-1 Conservative — 13 modules + INDEX + tokens`
- **Commit 2** — `feat(design-system): build direction-2 Modern-clean — 13 modules + INDEX + tokens`
- **Commit 3** — `feat(design-system): build direction-3 Bold (dense-pro-tool) — 13 modules + INDEX + tokens`
- **Commit 4** — `docs(m1.5): Phase 3 mockups — MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP`
- **Commit 5** — `chore(spec): close M1_5_DESIGN_SYSTEM_MOCKUPS_3_DIRECTIONS with retrospective`

(5 commits, not 6 — one combined retro at the end. Pushed once after Commit 5.)

NOTE — earlier §3 row 3 said "6 commits". Re-counting: 3 direction commits + 1 docs + 1 retro = 5. §3 row 3 should read **5 commits**. The executor should treat 5 as the contract; this minor count fix is logged in §11.

---

## 10. Dependencies / Preconditions

- Phase 1 + Phase 2 SPECs CLOSED.
- All 13 source-of-truth files in §8 exist at execution start. Executor MUST `ls` each one in Step 1.5 and STOP if any is missing — likely a rename has happened since SPEC authoring.
- `shared/css/variables.css` + the 7 component CSS files load without 404 from a `file://` open OR from `localhost:3000`. (Relative paths in the mockup HTMLs use `../../../../shared/css/...` — four levels up from `design-system-mockups/direction-N/`.)
- Localhost-Tester can open `file://` URLs OR has a static server serving the architecture-brief folder.

---

## 11. Lessons Already Incorporated

- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 1 (re-enumerate prior counts) → APPLIED — §8 table re-verified each source-of-truth filename from `ls` 2026-05-10 (Brief's M9 folder name was "Lab KDS"; ACTUAL is "Lab" — corrected in §8). §3 row 25 keeps the line-count expectation as an estimate, not a hard criterion — line counts depend on mockup source.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 2 (name ONE canonical form) → APPLIED — §8 canonical-source table picks ONE file per module (e.g., M7 has 5 mockups; we name V6 as canonical). The Foreman picks, not the executor.
- FROM `M4_CLOSURE/FOREMAN_REVIEW.md` Proposal 1 (closure-SPEC self-review) → N/A — Phase 4 is the closure-SPEC for this initiative.
- FROM `M4_CLOSURE/FOREMAN_REVIEW.md` Proposal 2 (MASTER_ROADMAP) → APPLIED.
- FROM `M4_CLOSURE/FOREMAN_REVIEW.md` Executor Proposal 1 (post-commit grep) → APPLIED — criterion #10 grep run AFTER Commit 3.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 1 (criterion vs §5 literal scan) → APPLIED — §3 row #10 forbids hex outside `_tokens.css`; §8 has hex literals ONLY in the Prizma-sample `<script>` block which is INSIDE INDEX.html (not a `style=` attribute, criterion #10 specifically targets `style="..."`).
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 2 (CHANGELOG always in scope) → APPLIED.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Executor Proposal 2 (MUST/MAY/VERIFY classification) → APPLIED in §8.

**Internal §3-vs-§9 consistency fix:** §3 row 3 originally said "6 commits"; §9's actual plan is 5 commits. Documented in §9 NOTE and §3 row 3 should be treated as 5. This is the first SPEC where I caught an internal inconsistency at author time — adding to the §6 author-improvement-proposals for the FOREMAN_REVIEW at the end.

**Cross-Reference Check (Iron Rule 21):** completed 2026-05-10 against GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE + FILE_STRUCTURE + all module maps. New names introduced: `design-system-mockups/` folder (0 collisions), `_tokens.css` direction files (0 collisions — leading underscore prevents Astro/build-tool collision), all 13 module-HTML filenames (e.g. `M1-inventory.html`) — 0 collisions across the repo since the folder is brand-new. **0 collisions / 0 hits resolved.**

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with values in EXECUTION_REPORT.md §2 (note: row 3 = 5, not 6, per §9 NOTE).
- [ ] Integrity Gate exit 0 or 2.
- [ ] `git status --short` empty.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS present.
- [ ] M1.5 docs updated.
- [ ] MASTER_ROADMAP touched.
- [ ] Every direction's INDEX.html opens cleanly in Chrome and renders all 13 module iframes without console errors.
- [ ] Density differential check: Direction 3 visibly denser than Direction 1, which is visibly denser than Direction 2 (criterion #4 §4 anti-blandness check).

---

## 13. Hand-off to next phase

After this SPEC closes 🟢:
- Phase 4 (`M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE`) becomes unblocked.
- Daniel opens the 3 INDEX.html files, compares, picks ONE direction.
- Phase 4 implements the chosen direction as platform default, archives the other two, runs axe-core, wires preset bundles, closes OPEN_TASKS #1.
- Per Daniel directive 2026-05-10 (this session): the combined FOREMAN_REVIEW for Phases 1–4 will be written at the END of Phase 4, covering all four.
