# SPEC — M1_5_DESIGN_TOKENS_FOUNDATION

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-10
> **Module:** 1.5 — Shared Components
> **Phase (in Design System initiative):** 1 of 4
> **Parent brief:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_BRIEF.md`
> **Author signature:** opticup-strategic / 2026-05-10 design-system kickoff

---

## 1. Goal

Replace `shared/css/variables.css`'s Indigo platform defaults with a tenant-neutral **slate-gray** palette, and move the existing Indigo into Prizma's `tenants.ui_config` JSONB so Prizma's production visuals stay identical after the swap. After this SPEC, the platform default is brand-free (any future tenant inherits neutral, then customizes), Prizma renders unchanged via tenant override, and the existing `--color-*` token namespace is documented as the canonical cross-module contract.

---

## 2. Background & Motivation

`shared/css/variables.css` was set to Indigo `#4f46e5` defaults in Module 1.5 Phase 6 (commit `6767a2c`, 2026-03-19) as a project-wide UI facelift. The Architect's `DESIGN_SYSTEM_BRIEF.md` (2026-05-10, locked decisions #2–#3) reverses that choice: the platform default must be brand-free so future tenants don't inherit Prizma residue, and Prizma itself becomes a tenant override like any other tenant. This is Phase 1 of the 4-phase Design System initiative; nothing in Phase 2/3/4 can begin while the platform defaults still encode an opinionated color.

The existing `tenants.ui_config JSONB` column (Module 1.5 Phase 1, db-schema.sql lines 8–14) and `shared/js/theme-loader.js` already provide the override mechanism. This SPEC consumes that mechanism — no new infrastructure.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Total commits produced | 4 commits (token swap, Prizma override migration, doc update, retro) | `git log origin/develop..HEAD --oneline \| wc -l` → 4 |
| 3 | `variables.css` `--color-primary` value | `#0f172a` (Slate 900 — near-black, Daniel 2026-05-10: "ניטרלי לגמרי") | `grep -E "^\s*--color-primary:\s+#" shared/css/variables.css` → exactly `#0f172a` |
| 4 | `variables.css` `--color-primary-hover` value | `#1e293b` (Slate 800 — lighter-on-hover pattern for near-black primary) | `grep -E "^\s*--color-primary-hover:" shared/css/variables.css` → `#1e293b` |
| 5 | `variables.css` `--color-primary-light` value | `#f1f5f9` (Slate 100 — light backgrounds/badges) | `grep -E "^\s*--color-primary-light:" shared/css/variables.css` → `#f1f5f9` |
| 6 | `variables.css` `--color-primary-dark` value | `#000000` (pure black — text-on-light extreme) | `grep -E "^\s*--color-primary-dark:" shared/css/variables.css` → `#000000` |
| 7 | `variables.css` `--font-family` value | `'Heebo', sans-serif` (UNCHANGED) | `grep "^\s*--font-family:" shared/css/variables.css` → `'Heebo', sans-serif` |
| 8 | No literal Indigo hex values left in `shared/css/` (case-insensitive) | 0 hits | `grep -ri -E "#4f46e5\|#4338ca\|#eef2ff\|#3730a3" shared/css/ \| wc -l` → `0` |
| 9 | Prizma tenant `ui_config` JSONB contains the 4 Indigo overrides | exact 4 keys present | Supabase MCP: `SELECT ui_config FROM tenants WHERE slug='prizma'` returns JSON with `--color-primary=#4f46e5`, `--color-primary-hover=#4338ca`, `--color-primary-light=#eef2ff`, `--color-primary-dark=#3730a3` |
| 10 | Demo tenant `ui_config` unchanged | `ui_config` has its existing green theme overrides intact | Supabase MCP: `SELECT ui_config FROM tenants WHERE slug='demo'` — diff vs pre-SPEC snapshot shows no change |
| 11 | Migration file present | `migrations/2026-05-11_design_tokens_neutral_defaults.sql` exists | `ls migrations/2026-05-11_design_tokens_neutral_defaults.sql` → exit 0 |
| 12 | M1.5 `db-schema.sql` ui_config comment updated | comment block at lines ~16–20 says "neutral slate defaults" not "current Prizma design" | `grep -n "neutral slate" "modules/Module 1.5 - Shared Components/docs/db-schema.sql"` → at least 1 hit |
| 13 | M1.5 `MODULE_MAP.md` updated | §4 CSS Variables Registry mentions "Slate 700 — neutral platform default" | `grep -n "Slate 700.*neutral platform default" "modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md"` → at least 1 hit |
| 14 | M1.5 `CHANGELOG.md` entry | new section dated 2026-05-10 referencing this SPEC slug | `grep -n "M1_5_DESIGN_TOKENS_FOUNDATION" "modules/Module 1.5 - Shared Components/docs/CHANGELOG.md"` → at least 1 hit |
| 15 | M1.5 `SESSION_CONTEXT.md` updated | "Last updated: 2026-05-11" line + Phase 1 of Design System note | `grep -n "Design System Phase 1" "modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md"` → 1 hit |
| 16 | EXECUTION_REPORT.md present | file exists in SPEC folder | `ls "modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/EXECUTION_REPORT.md"` → exit 0 |
| 17 | FINDINGS.md present | file exists (may be "no findings") | `ls "modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/FINDINGS.md"` → exit 0 |
| 18 | Smoke test pass — demo tenant | `npm run smoke` exits 0 with all 7 baseline tests PASS | `npm run smoke` → exit 0 |
| 19 | Smoke test pass — Prizma tenant visual continuity | Prizma's primary color rendered === `#4f46e5` after the swap (verifies tenant override worked) | Localhost-Tester executes: open `https://localhost:3000?t=prizma`, after auth-service boots, `getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()` === `#4f46e5` |
| 20 | Smoke test pass — demo tenant visual difference | Demo's primary color rendered = whatever demo's `ui_config` already contained (NOT slate, NOT Indigo) | Same as #19 but on `?t=demo` — value matches demo's existing override (see Step 1.5 baseline below) |
| 21 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 22 | HEAD pushed to `origin/develop` | yes | `git rev-parse HEAD` === `git rev-parse origin/develop` |
| 23 | Clean tree at SPEC close | empty | `git status --short` → empty |

**Live-DB baseline to capture in EXECUTION_REPORT §2 BEFORE making any change** (per BLOG_PRE_MERGE_FIXES FOREMAN_REVIEW Proposal 1 — re-enumerate, don't trust prior values):

```sql
SELECT slug, ui_config FROM tenants WHERE slug IN ('prizma','demo') ORDER BY slug;
```

The executor must capture the exact current `ui_config` JSONB for both tenants in EXECUTION_REPORT §2 row 0, BEFORE the migration runs. This is the rollback reference for criterion #10 and the baseline for the smoke verification in #19/#20.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Edit `shared/css/variables.css` exactly as specified in §8 below.
- Author and run the migration file `migrations/2026-05-10_design_tokens_neutral_defaults.sql` against the live Supabase via MCP `apply_migration` (Level 2 autonomy — schema/data write with explicit SPEC authorization for THIS migration only).
- Update `modules/Module 1.5 - Shared Components/docs/db-schema.sql`, `MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md` exactly as listed in §8.
- Run `npm run smoke`, `npm run verify:integrity`, `npm run verify --staged`.
- Commit and push to `develop` per §9.
- Apply executor-improvement proposals from BLOG_PRE_MERGE_FIXES (criterion vs §5 literal scan, post-commit grep verification) and M4_HARDCODED_DEMO_PHONE_CLEANUP (MUST-EDIT/MAY-EDIT/VERIFY-ONLY classification at Step 1).

### What REQUIRES stopping and reporting
- Any other file in `shared/css/` modified beyond `variables.css`.
- Any change to `theme-loader.js`, component CSS, or any page CSS — those are Phase 2 scope, not this SPEC.
- Demo tenant's `ui_config` mutated (criterion #10 forbids it).
- Smoke test FAIL on Prizma `--color-primary` ≠ `#4f46e5` (criterion #19) — that means the override did not stick; investigate before retrying.
- Any DDL beyond an `UPDATE tenants SET ui_config = jsonb_set(...)` — schema CREATE/ALTER is out of scope for this SPEC.
- Integrity Gate exit 1.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- If `SELECT ui_config FROM tenants WHERE slug='prizma'` at baseline already contains keys other than empty `{}` → STOP and report: this SPEC assumes Prizma is currently rendering off variables.css defaults (per the comment "Empty {} = use variables.css defaults (current Prizma design)" in `db-schema.sql`). If Prizma already has overrides, the migration must MERGE not REPLACE — escalate to Foreman to re-author this SPEC's §8 migration step.
- If demo tenant's `ui_config` is empty `{}` at baseline → STOP and report: this SPEC assumes demo has its own override (green theme per SESSION_CONTEXT.md). If demo is also using variables.css defaults, swapping defaults silently breaks demo.
- If `npm run smoke` was failing BEFORE this SPEC began → STOP — this SPEC is not the place to debug pre-existing failures.
- If after the variables.css swap the M1 inventory page shows visual breakage on demo (any element invisible, any color where contrast drops below WCAG AA against background) → STOP. Visual breakage on demo is a deviation, not "expected styling drift."

---

## 6. Rollback Plan

If the SPEC fails partway through:

1. `git reset --hard {START_COMMIT}` — START_COMMIT captured in EXECUTION_REPORT §1 as `git rev-parse HEAD` before the first edit.
2. Restore Prizma's `ui_config` from baseline:
   ```sql
   UPDATE tenants SET ui_config = '{baseline JSON from EXECUTION_REPORT §2 row 0}'::jsonb WHERE slug='prizma';
   ```
3. Notify Foreman; SPEC marked REOPEN.

The migration file `2026-05-10_design_tokens_neutral_defaults.sql` MUST include both the forward `UPDATE` AND a commented-out backward `UPDATE` that uses the baseline JSON, so rollback is copy-paste from the migration file itself.

---

## 7. Out of Scope (explicit)

The following look related but MUST NOT be touched in this SPEC:

- **Component CSS files** (`shared/css/components.css`, `components-extra.css`, `modal.css`, `toast.css`, `table.css`, `forms.css`, `layout.css`) — these read from variables.css; restyle is Phase 2.
- **Page CSS files** (`css/inventory.css`, `css/employees.css`, `css/settings.css`, `css/shipments.css`) — same; Phase 2.
- **theme-loader.js** — already does the right thing; no changes.
- **`tenants` table schema** — no DDL. Only the JSONB content of one Prizma row changes. The column already exists.
- **`tenant_themes` / `tenant_color_presets` tables** — preset-bundle UI is Phase 4 work; the tables (if needed) are introduced there.
- **Demo tenant ui_config** — touched only by criterion #10 verification (read-only).
- **Storefront repo** (`opticup-storefront`) — out of scope per brief §3 (storefront is not in this initiative).
- **Token namespace rename to `--ou-*`** — see §11 Lessons Already Incorporated.
- **CSS file size violations** — current variables.css is 161 lines, well under the 350-line cap; no split needed.
- **Renaming the `--primary` legacy alias** — kept as-is; Phase 6 added it for backward compat.

---

## 8. Expected Final State

### Modified files

#### `shared/css/variables.css` (lines 19–22)

CHANGE these 4 token values; everything else in the file is UNCHANGED:

```css
  --color-primary:        #0f172a;  /* Slate 900 — neutral platform default (near-black, Daniel decision 2026-05-10) */
  --color-primary-hover:  #1e293b;  /* Slate 800 — hover lightens (near-black primary can't go darker) */
  --color-primary-light:  #f1f5f9;  /* Slate 100 — light backgrounds, badges, selected rows */
  --color-primary-dark:   #000000;  /* pure black — text-on-light extreme */
```

The header block comment (lines 1–11) gets one line appended at the end of the rule list:
```
   - The defaults below are tenant-neutral (near-black + slate scale). Per-tenant brand color lives in tenants.ui_config.
```

The legacy `--primary: var(--color-primary);` alias on line 26 is UNCHANGED.

#### `modules/Module 1.5 - Shared Components/docs/db-schema.sql` (lines 16–20 area, "ui_config structure" comment block)

REPLACE the example block:
```sql
-- ui_config structure:
-- {
--   "--color-primary": "#1a56db",
--   "--color-primary-hover": "#1e429f",
--   "--font-family": "Rubik, sans-serif"
-- }
-- Keys must start with "--" (enforced by theme-loader.js, not DB constraint).
-- Empty {} = use variables.css defaults (current Prizma design).
```

WITH:
```sql
-- ui_config structure:
-- {
--   "--color-primary": "#4f46e5",
--   "--color-primary-hover": "#4338ca",
--   "--color-primary-light": "#eef2ff",
--   "--color-primary-dark": "#3730a3"
-- }
-- (Above is Prizma's current override — Indigo, set 2026-05-11 by M1_5_DESIGN_TOKENS_FOUNDATION.)
-- Keys must start with "--" (enforced by theme-loader.js, not DB constraint).
-- Empty {} = use variables.css defaults (near-black + slate scale — brand-free neutral baseline).
```

#### `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` (§4 CSS Variables Registry → "Colors — Primary" line)

REPLACE:
```
`--color-primary` (#4f46e5 Indigo), `--color-primary-hover` (#4338ca), `--color-primary-light` (#eef2ff), `--color-primary-dark` (#3730a3)
```

WITH:
```
`--color-primary` (#0f172a Slate 900 — neutral platform default, near-black per Daniel 2026-05-10), `--color-primary-hover` (#1e293b Slate 800), `--color-primary-light` (#f1f5f9 Slate 100), `--color-primary-dark` (#000000 pure black). Prizma overrides these via `tenants.ui_config` to Indigo (#4f46e5/#4338ca/#eef2ff/#3730a3) — see M1_5_DESIGN_TOKENS_FOUNDATION SPEC.
```

#### `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md`

APPEND a new section at the top (before existing 2026-03-19 Phase 6 entry):

```markdown
## 2026-05-11 — Design System Phase 1: Neutral platform defaults

SPEC: `M1_5_DESIGN_TOKENS_FOUNDATION` ([folder](specs/M1_5_DESIGN_TOKENS_FOUNDATION/))

- `shared/css/variables.css`: 4 primary color tokens swapped from Indigo to neutral (Slate-900 / Slate-800 / Slate-100 / pure black). `--font-family` unchanged (Heebo). Daniel decision 2026-05-10: "ניטרלי לגמרי — שחור-לבן בלבד".
- DB migration `2026-05-11_design_tokens_neutral_defaults.sql`: Prizma `ui_config` JSONB populated with Indigo overrides; Prizma renders unchanged after swap. Demo tenant untouched.
- M1.5 `db-schema.sql` ui_config example refreshed; `MODULE_MAP.md` §4 updated.

Rationale: Design System brief (2026-05-10) — platform default must be brand-free so future tenants don't inherit Prizma residue.
```

#### `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md`

REPLACE the `**Last updated:**` line with `**Last updated:** 2026-05-11 (Design System Phase 1: neutral defaults shipped, Prizma override migrated).`

PREPEND a new section before the existing "2026-05-09 — Status refresh":

```markdown
## 2026-05-11 — Design System Phase 1 (neutral defaults)

`M1_5_DESIGN_TOKENS_FOUNDATION` SPEC closed. `shared/css/variables.css` defaults are now tenant-neutral (Slate-900 near-black primary, no brand color). Prizma's Indigo identity moved to `tenants.ui_config` — same render, different source. This unblocks Design System Phase 2 (component restyle), Phase 3 (3-direction mockups for 13 modules), and Phase 4 (a11y + tenant theming UI).

```

### New files

- `migrations/2026-05-11_design_tokens_neutral_defaults.sql` — content:

```sql
-- 2026-05-11_design_tokens_neutral_defaults.sql
-- Phase 1 of Design System initiative.
-- SPEC: modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/SPEC.md
--
-- Forward: write Prizma's current Indigo identity into tenants.ui_config so the
-- platform-default swap to neutral slate (in shared/css/variables.css, same commit
-- range) leaves Prizma rendering unchanged.
--
-- Demo tenant is intentionally untouched.
-- Empty ui_config = use variables.css defaults (which are now neutral slate).

UPDATE tenants
SET ui_config = COALESCE(ui_config, '{}'::jsonb)
              || jsonb_build_object(
                   '--color-primary',       '#4f46e5',
                   '--color-primary-hover', '#4338ca',
                   '--color-primary-light', '#eef2ff',
                   '--color-primary-dark',  '#3730a3'
                 )
WHERE slug = 'prizma';

-- Verification (executor pastes result into EXECUTION_REPORT §2):
-- SELECT slug, ui_config FROM tenants WHERE slug IN ('prizma','demo') ORDER BY slug;

-- ROLLBACK (commented — pasted from EXECUTION_REPORT §2 baseline if SPEC reopens):
-- UPDATE tenants SET ui_config = '<baseline JSONB from EXECUTION_REPORT §2 row 0>'::jsonb
--   WHERE slug = 'prizma';
```

- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/EXECUTION_REPORT.md` — written by executor at close.
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_TOKENS_FOUNDATION/FINDINGS.md` — written by executor at close.

### Deleted files
None.

### DB state
- `tenants` row WHERE `slug='prizma'`: `ui_config` JSONB now contains 4 `--color-primary*` keys with Indigo hex values. No other rows changed. No schema change.

### Docs updated (MUST include — per M4_CLOSURE FOREMAN_REVIEW Proposal 2)
- `MASTER_ROADMAP.md` — APPEND one line under §3 noting Design System Phase 1 closed (this is a cross-module milestone — touching the platform default).
- `MODULE_MAP.md` (M1.5) — see above
- `db-schema.sql` (M1.5) — see above
- `CHANGELOG.md` (M1.5) — see above
- `SESSION_CONTEXT.md` (M1.5) — see above
- `docs/GLOBAL_SCHEMA.sql` — NO change needed (no DDL; only one row's JSONB content changed).
- `docs/GLOBAL_MAP.md` — NO change needed (no new functions/contracts).
- `OPEN_TASKS.md` — NO change in this SPEC; Phase 4 closes task #1, not Phase 1.

### File classification (per M4_HARDCODED_DEMO_PHONE_CLEANUP Executor Proposal 2 — MUST/MAY/VERIFY)
- **MUST-EDIT:** `shared/css/variables.css`, `modules/Module 1.5 - Shared Components/docs/db-schema.sql`, `MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md`, `MASTER_ROADMAP.md`, the new migration file, EXECUTION_REPORT.md, FINDINGS.md.
- **MAY-EDIT:** none (this SPEC is fully prescriptive).
- **VERIFY-ONLY:** `shared/css/components.css`, `shared/css/components-extra.css`, `shared/css/modal.css`, `shared/css/toast.css`, `shared/css/table.css`, `shared/css/forms.css`, `shared/css/layout.css`, `shared/js/theme-loader.js`, `css/inventory.css`, `css/employees.css`, `css/settings.css`, `css/shipments.css`, demo tenant's `ui_config`. (Touching any of these = stop-trigger.)

---

## 9. Commit Plan

- **Commit 1** — `feat(m1.5): swap variables.css primary tokens to neutral slate defaults`
  Files: `shared/css/variables.css` only.

- **Commit 2** — `feat(m1.5): migrate Prizma identity to tenants.ui_config (neutral default rollout)`
  Files: `migrations/2026-05-10_design_tokens_neutral_defaults.sql` + the live MCP `apply_migration` call's resulting DB state. (No git-tracked DB output; the migration file itself is the only repo artifact.)

- **Commit 3** — `docs(m1.5): document neutral platform defaults — db-schema, MODULE_MAP, CHANGELOG, SESSION_CONTEXT, MASTER_ROADMAP`
  Files: `modules/Module 1.5 - Shared Components/docs/db-schema.sql`, `MODULE_MAP.md`, `CHANGELOG.md`, `SESSION_CONTEXT.md`, `MASTER_ROADMAP.md`.

- **Commit 4** — `chore(spec): close M1_5_DESIGN_TOKENS_FOUNDATION with retrospective`
  Files: `EXECUTION_REPORT.md` + `FINDINGS.md` in this SPEC folder.

Commit order is **strict**: Commit 1 (CSS swap) and Commit 2 (Prizma override migration) MUST land within seconds of each other on `develop`, ideally in the same `git push` call, to minimize the window where Prizma renders as slate-gray. Push after Commit 2 — DO NOT push between Commits 1 and 2.

---

## 10. Dependencies / Preconditions

- Module 1.5 Phase 1 already shipped `tenants.ui_config JSONB` column — confirmed in `db-schema.sql` lines 8–14. ✅
- `shared/js/theme-loader.js` already injects `ui_config` keys to `:root` — confirmed in MODULE_MAP.md §2 row 1. ✅
- Demo tenant has its own `ui_config` overrides (green theme per SESSION_CONTEXT.md Phase 6) — verify in baseline (criterion #10). ⚠️ STOP-trigger if false.
- Localhost-Tester can drive Chrome to read `getComputedStyle(...).getPropertyValue(...)` — confirmed; baseline.test.mjs already does similar.
- Supabase MCP `apply_migration` available — confirmed by Module 4 closure SPEC patterns.

---

## 11. Lessons Already Incorporated

- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 1 (re-enumerate prior counts before authoring) → APPLIED in §3 row 0 baseline + criterion #10 (capture demo's actual ui_config from live DB before any change; do not trust SESSION_CONTEXT.md's "green theme" narrative as the verified value).
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 2 (name ONE canonical form) → APPLIED in §8: existing `--color-*` namespace is THE canonical form, not the brief's illustrative `--ou-*`. Rationale: switching prefixes would force grep-replace across 8 shared/css files + 4 page CSS + every inline-style consumer — not Phase 1 scope, and Rule 21 (extend, don't replace, when extension works) applies. The brief's Contract A says "single namespace prefix (e.g. `--ou-color-primary`)" — "e.g." is illustrative; the principle (one project-wide namespace) is satisfied by the established `--color-*`/`--font-*`/`--space-*`/`--radius-*`/`--shadow-*`/`--z-*`/`--transition-*` family.
- FROM `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` Proposal 1 (closure-SPEC self-review handoff) → N/A — this is not a closure SPEC.
- FROM `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` Proposal 2 (closure SPEC must touch MASTER_ROADMAP) → APPLIED in §8 "Docs updated" — even though this is a Phase-1 SPEC, the platform-default swap IS a cross-module milestone and `MASTER_ROADMAP.md` gets one line.
- FROM `M4_CLOSURE_AND_INTEGRATION_CEREMONY/FOREMAN_REVIEW.md` Executor Proposal 1 (re-run grep AFTER commit) → APPLIED in §3 — every grep-style criterion (#3–#8, #12–#15) names the exact `grep` command; executor MUST paste post-commit grep output into EXECUTION_REPORT §2.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 1 (criterion vs §5 literal cross-check) → APPLIED — every literal hex in §8 (`#4f46e5`, `#334155`, etc.) was scanned against §3 grep criteria; only criterion #8 forbids Indigo-in-`shared/css/`, and §8 has no Indigo hex inside `shared/css/`. Author-side scan: ✅ no contradictions.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 2 (CHANGELOG always in scope) → APPLIED in §8 "Modified files" + criterion #14.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Executor Proposal 2 (MUST-EDIT/MAY-EDIT/VERIFY-ONLY classification) → APPLIED in §8 "File classification" subsection.

**Cross-Reference Check (Iron Rule 21 — Step 1.5):** completed 2026-05-10 against GLOBAL_SCHEMA.sql + GLOBAL_MAP.md + DB_TABLES_REFERENCE.md + FILE_STRUCTURE.md + all `modules/*/docs/db-schema.sql` and `MODULE_MAP.md`. New names introduced by this SPEC: `migrations/2026-05-10_design_tokens_neutral_defaults.sql` (zero collisions); SPEC slug `M1_5_DESIGN_TOKENS_FOUNDATION` (zero collisions in `modules/Module 1.5 - Shared Components/docs/specs/`). Modified existing names: `tenants.ui_config` JSONB content for one row only (no schema/contract change). **0 collisions / 1 hit on `tenants.ui_config` resolved by EXTENDING the existing column.**

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in the SPEC folder.
- [ ] `MODULE_MAP.md`, `db-schema.sql`, `CHANGELOG.md`, `SESSION_CONTEXT.md` (M1.5) updated.
- [ ] `MASTER_ROADMAP.md` updated with Phase 1 close line.
- [ ] Smoke test (`npm run smoke`) passes on demo tenant.
- [ ] Localhost-Tester verifies Prizma renders Indigo (`--color-primary` === `#4f46e5`) and demo renders its existing override.

---

## 13. Hand-off to next phase

After this SPEC closes 🟢:
- Phase 2 SPEC (`M1_5_DESIGN_SYSTEM_PHASE_2_COMPONENT_RESTYLE`) becomes unblocked.
- Daniel's neutral-default + Prizma-override decision is now load-bearing in `variables.css` and `tenants.ui_config` — any rollback requires both.
- The `--color-*` namespace is officially the canonical contract; documented in MODULE_MAP.md §4.
