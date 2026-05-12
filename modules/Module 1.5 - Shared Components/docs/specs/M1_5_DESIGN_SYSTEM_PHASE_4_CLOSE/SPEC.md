# SPEC — M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-10
> **Module:** 1.5 — Shared Components
> **Phase (in Design System initiative):** 4 of 4 — closure
> **Parent brief:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_BRIEF.md`
> **Depends on:** All 3 sub-phases of Phase 3 — `M1_5_DESIGN_SYSTEM_MOCKUPS_3A_CONSERVATIVE`, `M1_5_DESIGN_SYSTEM_MOCKUPS_3B_MODERN_CLEAN`, `M1_5_DESIGN_SYSTEM_MOCKUPS_3C_BOLD_DENSE_PRO_TOOL` — all must be 🟢 CLOSED first. (Phase 3 was originally a single SPEC; split into 3 sub-SPECs on 2026-05-11 per Daniel directive to fit context budget.)
> **Author signature:** opticup-strategic / 2026-05-10 design-system phase-4 draft (closure)

---

## 1. Goal

Close the Design System initiative: (a) STOP and ask Daniel which of the 3 directions wins; (b) promote that direction's non-color tokens (font scale, spacing, radii, shadows) into `shared/css/variables.css` as the new platform default; (c) archive the 2 losing direction folders to `_archive/design-system-rejected-directions/`; (d) ship 4–5 curated color-preset bundles via a new `tenant_color_presets` table (Iron Rule 19 — configurable = tables, not enums); (e) add a Theme section to `settings.html` where a tenant admin picks a preset bundle and the choice writes to `tenants.ui_config`; (f) wire `axe-core` into Localhost-Tester's smoke as a WCAG-AA gate; (g) write ONE combined FOREMAN_REVIEW.md covering Phases 1–4; (h) close OPEN_TASKS task #1.

---

## 2. Background & Motivation

Phases 1 + 2 + 3 produced: neutral platform defaults, a token-only component library with focus-visible, and 3 substantively-different design directions × 13 modules. Daniel must now PICK one. Phase 4 closes the loop: the chosen direction becomes the platform default for all future modules, accessibility is enforced going forward, and tenants get a minimum-viable theming UI (Iron Rule 9 — no hardcoded business values, plus brief Contract C — theme set via CSS custom properties from `auth-service` boot).

This SPEC contains the ONE intentional stop-trigger of the entire 4-phase initiative: Step 2 STOPS and asks Daniel "which direction?" Without that answer, the rest of Phase 4 cannot execute. Until then the executor sits idle by design.

Per Daniel directive 2026-05-10 (Design System SPEC dispatch session): one combined FOREMAN_REVIEW.md is written at the end of THIS SPEC, covering Phases 1 + 2 + 3a + 3b + 3c + 4 (six SPECs total after the 2026-05-11 Phase 3 split). Per-SPEC EXECUTION_REPORT + FINDINGS still exist in each SPEC folder.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at start | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | All 3 Phase-3 sub-SPECs closed | each of 3a / 3b / 3c folder has EXECUTION_REPORT.md + FINDINGS.md | `for d in M1_5_DESIGN_SYSTEM_MOCKUPS_3{A_CONSERVATIVE,B_MODERN_CLEAN,C_BOLD_DENSE_PRO_TOOL}; do ls "modules/Module 1.5 - Shared Components/docs/specs/$d/" \| grep -cE "EXECUTION_REPORT\|FINDINGS"; done` → each ≥ 2 |
| 3 | Daniel picked a direction | Direction recorded in EXECUTION_REPORT §3.0 as one of `direction-1-conservative`, `direction-2-modern-clean`, `direction-3-bold-dense-pro-tool` | executor stop-and-ask outcome logged |
| 4 | Total commits produced | 7 commits | `git log origin/develop..HEAD --oneline \| wc -l` → 7 |
| 5 | Chosen direction's `_tokens.css` promoted | `shared/css/variables.css` non-color tokens (font-size scale, spacing scale, radius scale, shadow scale) match the chosen direction's `_tokens.css` values | `diff -u <(grep -E "^\s*--font-size\|^\s*--space\|^\s*--radius\|^\s*--shadow" shared/css/variables.css) <(grep -E "^\s*--font-size\|^\s*--space\|^\s*--radius\|^\s*--shadow" .../design-system-mockups/{CHOSEN}/_tokens.css)` → minimal/expected diff (executor records actual diff in EXECUTION_REPORT §2) |
| 6 | Two losing directions archived | both losing direction folders moved (NOT deleted) to `_archive/design-system-rejected-directions/{slug}/` | `ls _archive/design-system-rejected-directions/` → exactly 2 folders, each containing INDEX.html + 13 module HTMLs + _tokens.css |
| 7 | Winning direction folder kept in place | the chosen direction folder remains at `architecture-brief/design-system-mockups/` (for reference) | `ls architecture-brief/design-system-mockups/` → 1 direction folder (the winner) |
| 8 | New table `tenant_color_presets` created | Iron-Rule-14+15-compliant: `tenant_id UUID NOT NULL`, RLS enabled with JWT-claim canonical pattern | Supabase MCP: `SELECT * FROM pg_policies WHERE tablename='tenant_color_presets'` shows 2 policies (service_bypass + tenant_isolation with JWT-claim USING clause) |
| 9 | Seeded color presets for Prizma + demo | each tenant has ≥ 4 preset rows (executor picks 4 curated palettes) | `SELECT tenant_id, COUNT(*) FROM tenant_color_presets GROUP BY tenant_id` returns ≥ 4 per tenant |
| 10 | `settings.html` gains a Theme section | DOM contains a `<section id="settings-theme">` with ≥ 4 preset cards, each click → writes `tenants.ui_config` and reloads CSS variables via `loadTenantTheme()` | `grep -c "id=\"settings-theme\"" settings.html` → 1 |
| 11 | Theme preset UI uses TableBuilder / Modal / Toast — does NOT introduce new JS components | `git diff origin/develop..HEAD -- "js/" "shared/js/"` includes new code BUT no new global object (no `window.NewComponent`) | manual review of `git diff` |
| 12 | axe-core wired into Localhost-Tester smoke | `tests/smoke/a11y.test.mjs` exists; `npm run smoke` runs it; new test fails CI if any WCAG-AA violation is found | `ls tests/smoke/a11y.test.mjs && npm run smoke` → exit 0, axe-core findings count 0 on all baseline pages |
| 13 | axe-core baseline scope | tests at minimum: `index.html` (PIN login), `inventory.html`, `crm.html`, `settings.html` — on demo tenant after PIN auth | a11y.test.mjs source contains all 4 page URLs |
| 14 | Accessibility violations at baseline | 0 critical or serious WCAG-AA violations across the 4 baseline pages on demo tenant | a11y.test.mjs output `violations.length === 0` for severity ≥ serious |
| 15 | OPEN_TASKS.md task #1 marked complete | task #1 moved from Active to Completed section with closing-line summary | `grep -A 2 "🎨 Unified design system" OPEN_TASKS.md` → in "Completed recently" section |
| 16 | MASTER_ROADMAP updated | new line under §3 noting Design System initiative closed | grep MASTER_ROADMAP |
| 17 | `docs/GLOBAL_SCHEMA.sql` updated with `tenant_color_presets` table | DDL appended | `grep -n "CREATE TABLE tenant_color_presets" docs/GLOBAL_SCHEMA.sql` → ≥ 1 |
| 18 | `docs/GLOBAL_MAP.md` updated | new functions (the settings-page handler for picking a preset) added under Module 1.5 / Settings | grep |
| 19 | Module 1.5 db-schema.sql, MODULE_MAP.md, CHANGELOG.md, SESSION_CONTEXT.md updated | all four files reference Phase 4 close | grep each |
| 20 | Combined `FOREMAN_REVIEW.md` written | file present at `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE/FOREMAN_REVIEW.md` AND symlink/notes in the 3 prior SPEC folders pointing here | `ls` each; combined review covers all 4 phases |
| 21 | EXECUTION_REPORT + FINDINGS present | both files exist in THIS SPEC folder | `ls` |
| 22 | Smoke test pass — demo tenant | `npm run smoke` exit 0 INCLUDING the new a11y test | `npm run smoke` → exit 0 |
| 23 | Smoke test pass — Prizma tenant | Prizma still renders Indigo via ui_config override; Theme section in settings.html allows picking a preset and re-applying | Localhost-Tester opens settings on Prizma, picks a preset, verifies `--color-primary` changes |
| 24 | Integrity Gate | exit 0 or 2 | `npm run verify:integrity; echo $?` → `0` or `2` |
| 25 | HEAD pushed to `origin/develop` | yes | `git rev-parse HEAD` === `git rev-parse origin/develop` |
| 26 | Clean tree at SPEC close | empty | `git status --short` → empty |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Run Phase 4 Step 1 (verify prior phases closed, baseline grep).
- Implement Steps 3–10 below WITHOUT confirmation IF Daniel's direction choice is already recorded in EXECUTION_REPORT §3.0 from Step 2.
- Author the migration creating `tenant_color_presets` per the canonical RLS pattern (Iron Rule 15).
- Seed 4 curated color presets per tenant (executor picks tasteful palette combos that pass WCAG AA contrast on primary/text). Document the picked palettes in EXECUTION_REPORT §2.
- Wire axe-core via `npm install axe-core @axe-core/playwright` (executor pre-flight: Phase 4 may install new dev-dependencies — Level 2 autonomy, with the dependency name documented in EXECUTION_REPORT and pinned in `package.json`).
- Apply executor-improvement proposals from prior FOREMAN_REVIEWs that still apply.

### What REQUIRES stopping
- **Step 2** ALWAYS stops and asks Daniel — this is the ONE intentional pause-and-confirm of the entire initiative.
- Daniel rejects all 3 directions → STOP, mark SPEC REOPEN, escalate to Architect (`opticup-architect` skill) per the activation prompt §6 (strategic blocker = fresh axis needed).
- Any preset palette fails WCAG AA contrast against `--color-bg-page` for `--color-primary` → STOP, redesign palette.
- New JS introduces a global side-effect that breaks any other shared/js/ contract → STOP.
- axe-core finds > 0 critical violations on any baseline page → STOP, fix BEFORE closing SPEC. (Serious-or-below — log to FINDINGS, do not block.)
- Adding `tenant_color_presets` requires a DDL change beyond CREATE TABLE + RLS policies → STOP.

---

## 5. Execution Steps (numbered for stop-trigger clarity)

**Step 1 — Verify preconditions.** All 3 Phase-3 sub-SPECs (3a + 3b + 3c) closed. All 3 direction folders exist in `architecture-brief/design-system-mockups/`. `npm run smoke` green. Baseline: capture current `variables.css` font/space/radius/shadow values to EXECUTION_REPORT §2.

**Step 2 — ASK DANIEL: which direction wins?**

This is the one mandatory stop. Executor pauses, emits ONE prompt to Daniel (Hebrew), strictly P22 format:

> "פיתחתי את 3 הכיוונים תחת `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/`. אנא פתח את 3 קבצי `INDEX.html` (Conservative / Modern-clean / Bold dense-pro-tool) והחלט. ההמלצה שלי: [executor proposes based on which direction the demo tenant's seeded presets harmonize best with]. סיבה: [reason]. אילו מהשלושה?"

Daniel answers ONE of the 3 slugs. Record in EXECUTION_REPORT §3.0. If Daniel asks for a 4th option or rejects all three → escalate per §4.

**Step 3 — Promote chosen direction tokens.** Copy `--font-size-*`, `--space-*`, `--radius-*`, `--shadow-*` values from the chosen direction's `_tokens.css` into `shared/css/variables.css` (replace the existing values). Colors stay neutral (Phase 1's Slate scale). Commit 1.

**Step 4 — Archive losing directions.** `git mv` the 2 losing direction folders from `architecture-brief/design-system-mockups/` to `_archive/design-system-rejected-directions/`. Commit 2.

**Step 5 — Create `tenant_color_presets` table + policies.** Migration file: `migrations/2026-05-1X_tenant_color_presets.sql`. Schema:
```sql
CREATE TABLE tenant_color_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  display_label TEXT NOT NULL,  -- Hebrew label for UI
  ui_config JSONB NOT NULL,      -- the same shape as tenants.ui_config — keys must start with --
  preview_color TEXT,            -- the dominant hex shown as the preset card thumbnail
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 100,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE tenant_color_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON tenant_color_presets
  TO service_role USING (true);

CREATE POLICY tenant_isolation ON tenant_color_presets
  TO public USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE INDEX idx_tenant_color_presets_tenant ON tenant_color_presets(tenant_id) WHERE is_deleted = false;
```
Commit 3.

**Step 6 — Seed 4 curated presets per tenant.** Executor picks 4 WCAG-AA-compliant palettes (examples to consider, executor refines):
- `neutral-slate` (the platform default — Slate-900 primary)
- `prizma-indigo` (Indigo — what Prizma uses today)
- `forest-green` (deep green primary — for demo tenant or as a sample)
- `wine-burgundy` (warm dark red — alternate brand option)

Per-preset JSON contains the 4–6 CSS custom property overrides (the brief's recommended 6-8 themable tokens). Set `is_default=true` on the row matching the tenant's CURRENT ui_config. Commit 4 (the migration's seed UPDATE; or a separate SQL run via MCP).

**Step 7 — Add Theme section to `settings.html`.** New `<section id="settings-theme">` with a TableBuilder-rendered grid (or simpler card-grid) of preset rows. Click → write `tenants.ui_config = preset.ui_config` via existing `DB.update` API → call `loadTenantTheme(tenantRow)` → page re-renders with new colors. NO new global JS component invented; uses existing Modal for confirm, Toast for "Theme applied". Commit 5.

**Step 8 — Wire axe-core into Localhost-Tester smoke.**
- `npm install --save-dev axe-core @axe-core/playwright`.
- Create `tests/smoke/a11y.test.mjs` that:
  - opens demo tenant, PIN-authenticates
  - opens `index.html`, `inventory.html`, `crm.html`, `settings.html` (after auth)
  - runs `await injectAxe(page); const results = await checkA11y(page, null, { detailedReport: true });`
  - fails if any violations of severity `critical` are present
  - logs `serious`/`moderate`/`minor` as FINDINGS but does not fail
- Update `npm run smoke` to include this new test.
- Update `package.json` if needed.
- Commit 6.

**Step 9 — Update docs.**
- `OPEN_TASKS.md` — move task #1 to Completed section, add 2-line close summary.
- `MASTER_ROADMAP.md` — Design System initiative line under §3.
- `modules/Module 1.5 - Shared Components/docs/MODULE_MAP.md` — Theme section, `tenant_color_presets`.
- `modules/Module 1.5 - Shared Components/docs/db-schema.sql` — append `tenant_color_presets` DDL.
- `modules/Module 1.5 - Shared Components/docs/CHANGELOG.md` — Phase 4 entry.
- `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` — Phase 4 final entry + Module 1.5 returns to MAINTENANCE.
- `docs/GLOBAL_SCHEMA.sql` — append `tenant_color_presets` (Integration Ceremony merge).
- `docs/GLOBAL_MAP.md` — settings-theme handler under Settings module section.
- Commit 7 (combined docs).

**Step 10 — Verify + close.** Run `npm run smoke` (includes axe-core now), `npm run verify:integrity`, capture all §3 criteria outcomes in EXECUTION_REPORT.md. Write `FINDINGS.md`. Foreman writes combined `FOREMAN_REVIEW.md`. Final push.

---

## 6. Rollback Plan

If Step 2 fails (Daniel rejects all 3) — STOP, escalate to Architect, leave the Design System tree intact for re-direction. No rollback needed.

If Steps 3–9 fail partway:
1. `git reset --hard {START_COMMIT}` — captured in EXECUTION_REPORT §1.
2. DB rollback: `DROP TABLE IF EXISTS tenant_color_presets CASCADE;` (it's a brand-new table; no dependent data).
3. Notify Foreman; SPEC marked REOPEN.

Per-step granularity: each Step commits before moving on, so reverting Step 8 (axe-core) doesn't lose the chosen-direction promotion (Step 3).

---

## 7. Out of Scope

- **Migrating any production module to the chosen direction's denser/looser layout** — explicitly NOT in scope. Per Brief §3, that's per-module migration SPECs after Phase 4 closes.
- **Free color picker for tenants** — preset bundles only (Brief §7 Q4 recommendation: deferred).
- **Dark mode for non-Prizma tenants** — out per Brief §3.
- **Mobile-first responsive overhaul** — out per Brief §3.
- **Animation/motion library beyond the motion tokens** — out per Brief §8.
- **Storefront repo theming** — out per Brief §3.
- **Removing Indigo defaults from `tenants.ui_config` for Prizma** — those overrides stay; Prizma's brand is Indigo.
- **Granular per-employee theming** — themes are tenant-level, not employee-level.

---

## 8. Expected Final State

### New files
- `migrations/2026-05-1X_tenant_color_presets.sql` — DDL + seed UPDATEs.
- `tests/smoke/a11y.test.mjs` — axe-core baseline.
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE/EXECUTION_REPORT.md`
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE/FINDINGS.md`
- `modules/Module 1.5 - Shared Components/docs/specs/M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE/FOREMAN_REVIEW.md` — the ONE combined review covering Phases 1–4.

### Modified files
- `shared/css/variables.css` — non-color tokens replaced by chosen direction's values.
- `settings.html` — new `<section id="settings-theme">` + handler script (the script lives inline in settings.html or in a new dedicated `js/settings-theme.js` IF the existing settings inline handler crosses 350 lines — Iron Rule 12).
- `package.json` + `package-lock.json` — axe-core dev-deps added.
- `OPEN_TASKS.md`, `MASTER_ROADMAP.md`, `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`.
- M1.5 docs: MODULE_MAP, db-schema.sql, CHANGELOG, SESSION_CONTEXT.
- The 3 prior SPEC folders get a one-line note at the top: `Combined FOREMAN_REVIEW: see ../M1_5_DESIGN_SYSTEM_PHASE_4_CLOSE/FOREMAN_REVIEW.md`.

### Moved files (NOT deleted)
- 2 losing direction folders from `architecture-brief/design-system-mockups/` → `_archive/design-system-rejected-directions/`.

### New DB objects
- Table `tenant_color_presets` (multi-tenant, RLS-isolated, JWT-claim canonical).
- 4 preset rows × 2 tenants = 8 seed rows (Prizma + demo).

### Docs updated (MUST include — per M4_CLOSURE Proposal 2)
- `MASTER_ROADMAP.md` ✅
- `OPEN_TASKS.md` ✅ (close task #1)
- `docs/GLOBAL_MAP.md` ✅ (settings-theme handler)
- `docs/GLOBAL_SCHEMA.sql` ✅ (tenant_color_presets DDL)
- M1.5 MODULE_MAP, db-schema, CHANGELOG, SESSION_CONTEXT ✅

### File classification (MUST / MAY / VERIFY-ONLY)
- **MUST-EDIT:** files listed in "Modified files" + "New files" above.
- **MAY-EDIT (conditional):** `js/settings-theme.js` — created ONLY if `settings.html`'s inline handler would push the file past 350 lines (Iron Rule 12). Executor measures before deciding.
- **VERIFY-ONLY:** every file under `shared/css/` (Phase 2 closed it), every file under `shared/js/` except the new tests/smoke/a11y.test.mjs, every other module's docs, the winning direction folder's contents (stays in place, untouched).

---

## 9. Commit Plan

- **Commit 1** — `feat(design-system): promote direction-X tokens to platform default (variables.css)`
- **Commit 2** — `chore(_archive): archive 2 rejected design directions`
- **Commit 3** — `feat(m1.5): create tenant_color_presets table + RLS policies (Iron Rule 19)`
- **Commit 4** — `data(m1.5): seed 4 curated color presets per tenant (Prizma + demo)`
- **Commit 5** — `feat(settings): Theme section — preset picker writes tenants.ui_config`
- **Commit 6** — `test(smoke): axe-core a11y baseline (WCAG-AA gate for ERP)`
- **Commit 7** — `docs(close): Design System initiative — OPEN_TASKS, MASTER_ROADMAP, GLOBAL_*, M1.5 + combined FOREMAN_REVIEW for Phases 1-4`

(7 commits, single push after Commit 7.)

---

## 10. Dependencies / Preconditions

- Phase 3 sub-SPECs 3a + 3b + 3c ALL 🟢 CLOSED, each with their direction folder fully built in `architecture-brief/design-system-mockups/`.
- Daniel available to answer the Step-2 prompt within the executor session.
- `npm` install permissions (for axe-core dev-deps).
- Supabase MCP `apply_migration` for the new table.
- `localhost:3000` reachable for axe-core to drive Chrome through Localhost-Tester.

---

## 11. Lessons Already Incorporated

- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 1 (re-enumerate counts) → APPLIED — §3 Step 1 baseline grep of current variables.css values; criterion #5 diffs against the chosen `_tokens.css`.
- FROM `BLOG_PRE_MERGE_FIXES/FOREMAN_REVIEW.md` Proposal 2 (one canonical form) → APPLIED — §5 Step 5 RLS policy literally embeds the canonical JWT-claim USING clause from Iron Rule 15. No "use auth.uid() or jwt claim" ambiguity.
- FROM `M4_CLOSURE/FOREMAN_REVIEW.md` Proposal 1 (closure-SPEC self-review handoff) → APPLIED — §3 row 20 requires the combined FOREMAN_REVIEW.md to be authored in Commit 7 itself, baked into the Step 10 / commit plan. No backfilling.
- FROM `M4_CLOSURE/FOREMAN_REVIEW.md` Proposal 2 (MASTER_ROADMAP must be touched on closure) → APPLIED.
- FROM `M4_CLOSURE/FOREMAN_REVIEW.md` Executor Proposal 1 (re-run grep AFTER commit) → APPLIED — criterion #5 diff is RUN after Commit 1 and pasted to EXECUTION_REPORT.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 1 (criterion vs §5 literal scan) → APPLIED — §5 step 5 contains the canonical RLS literal, criterion #8 verifies it via `pg_policies`; no §3 grep forbids the literal anywhere, so no contradiction.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Author Proposal 2 (CHANGELOG in scope) → APPLIED.
- FROM `M4_HARDCODED_DEMO_PHONE_CLEANUP/FOREMAN_REVIEW.md` Executor Proposal 2 (MUST/MAY/VERIFY) → APPLIED.

**Brief §7 open questions resolved by Foreman per Daniel's "autonomy mandate" 2026-05-10:**
- Q1 (neutral default font + color) — RESOLVED in Phase 1 with Daniel directly: Slate-900 near-black + Heebo font.
- Q2 (Bold direction sub-axis) — RESOLVED in this session by Daniel: **dense-pro-tool (Linear/Bloomberg)**.
- Q3 (number of tenant-overridable tokens) — RESOLVED: 6 themable tokens (`--color-primary`, `--color-primary-hover`, `--color-primary-light`, `--color-primary-dark`, `--font-family`, plus optional `logo_url` as a sibling tenant field). Free additions deferred.
- Q4 (preset bundles day-1 vs free picker) — RESOLVED: preset bundles day-1; free picker deferred. Implemented via `tenant_color_presets` table (Phase 4 Step 5).
- Q5 (dormant vs migrate-on-pick) — RESOLVED: dormant. The chosen direction's tokens land in `variables.css`; no module is auto-migrated. Per-module migration SPECs follow this initiative.

**Cross-Reference Check (Iron Rule 21):** completed 2026-05-10 against GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE + FILE_STRUCTURE + module maps. New names introduced: `tenant_color_presets` table (0 collisions, verified at SPEC-author time), `settings-theme` HTML section id (0 collisions in `settings.html` — grep confirmed empty), `js/settings-theme.js` (0 collisions — only created if Iron Rule 12 forces it), `tests/smoke/a11y.test.mjs` (0 collisions). **0 collisions / 0 hits resolved.**

---

## 12. Pre-Merge Checklist

- [ ] All §3 success criteria pass with values in EXECUTION_REPORT.md §2.
- [ ] Integrity Gate exit 0 or 2.
- [ ] `git status --short` empty.
- [ ] HEAD pushed.
- [ ] EXECUTION_REPORT + FINDINGS + **combined FOREMAN_REVIEW.md** present.
- [ ] Symlink notes added to the 3 prior SPEC folders pointing to the combined review.
- [ ] OPEN_TASKS task #1 marked complete.
- [ ] MASTER_ROADMAP touched.
- [ ] GLOBAL_MAP + GLOBAL_SCHEMA merged (Integration Ceremony for the new table + theme handler).
- [ ] axe-core smoke gate green on demo tenant.

---

## 13. Hand-off — End of Design System Initiative

After this SPEC closes 🟢, the Design System initiative is complete:
- Platform default = chosen direction's typography/spacing/radii/shadows + neutral slate color.
- Prizma + demo each have a default ui_config preset (4 to choose from per tenant).
- Settings page lets tenant admins pick a preset.
- WCAG-AA gated by axe-core in `npm run smoke`.
- 2 rejected directions are archived for historical reference.
- OPEN_TASKS task #1 closed. Task #2 (Module Repo Split) becomes the next Architect priority.

The Module Strategist hands the platform back to the Architect for cross-module roadmap continuation (per task #2 → #3 → #4 → #5 in `OPEN_TASKS.md`).
