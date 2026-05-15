# Settings + Permissions Consolidation

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 1.5 — Shared Components

---

## 1. Purpose

The Hybrid mockup `permissions.html` showed Settings + Permissions as a single page with internal tabs. Migration #2 kept them as 2 separate pages (`settings.html` + `employees.html`) per Daniel's decision to defer the structural change. This SPEC executes the deferred consolidation.

After this SPEC:
- `settings.html` becomes a tabbed container with internal sections (כללי / הרשאות / יומן פעולות / ...)
- `employees.html` is archived to `_archive/pre-consolidation/employees.html`
- All links across the codebase that point to `employees.html` are updated to `settings.html#permissions`
- The permissions UI lives inside Settings as a tab

## 2. Scope — In

### Code changes

1. **`settings.html`** — restructure into tabbed page:
   - Top-level tab bar at top of main content area (Hebrew labels): כללי / חנות / הרשאות / יומן פעולות / חיוב / סניפים / אבטחה / AI
   - Existing settings sections (business / financial / display / AI learning) move into "כללי" tab
   - New "הרשאות" tab contains the content currently in `employees.html` (users list + permission matrix + roles)
   - URL hash-based tab routing: `settings.html#permissions` opens directly to the permissions tab
   - Browser back/forward + page refresh remembers active tab

2. **`employees.html`** — remove from production, archive to `_archive/pre-consolidation/employees.html`. Keep the file in archive (not deleted) for git-history clarity.

3. **All in-code references to `employees.html`** — sweep + update:
   - Search every HTML file at root + `shared/` + `js/` + `css/` + `modules/`
   - Search SQL files (RPC bodies, automation rules with hardcoded URLs)
   - Replace `employees.html` → `settings.html#permissions`
   - Verify with grep that 0 references to `employees.html` remain in code (only in archive + git history)

4. **JS code that powers permissions UI** — must continue to work when loaded as a tab inside settings.html. If `employees.html` had its own `<script>` blocks, integrate them into `settings.html`. JS module loading must respect tab-active state.

5. **CSS** — the permissions UI's styles must work inside settings.html's container. Likely no breaks if both use the same Hybrid+Navy tokens, but verify.

### Permission gates

- The "הרשאות" tab visibility within settings.html follows the same permission rules that gated `employees.html` access. If today a non-owner role cannot see the permissions page, the tab must be hidden for that role.
- Permission checks on actions inside the tab (edit role, invite user, etc.) preserve their current behavior.

## 3. Scope — Out

- Visual redesign — the Hybrid+Navy mockup is already the visual target from Migration #2
- New features (no new permission types, no new user fields, no new roles)
- DB changes — pure frontend restructure
- Other settings tabs beyond what already exists in settings.html + permissions
- Mobile-responsive overhaul

## 4. Functional Preservation — The Hard Rule

For EACH preserved behavior, the Executor MUST verify:

1. **Catalog interactive behaviors BEFORE the change** — list every form, button, Supabase call from both pages. Save to `PRE_CONSOLIDATION_BEHAVIOR.md` in SPEC folder.
2. **After consolidation**, re-verify each item still works in the new tabbed location.
3. **Localhost-Tester smoke (MANDATORY)** on demo tenant:
   - Page loads, no console errors
   - Each settings tab is reachable
   - Click "הרשאות" tab → permissions matrix renders with demo data
   - Click a user → role-edit UI opens
   - URL `settings.html#permissions` opens directly to permissions tab
   - URL `settings.html#general` opens directly to general tab
   - Browser refresh on a specific tab remembers the tab
   - Permission gate enforcement still works (test by simulating non-owner role if possible)

If ANY behavior breaks → STOP, rollback via `git revert`, escalate.

## 5. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | settings.html becomes tabbed container with permissions as one tab | Daniel via Hybrid mockup approval |
| 2 | employees.html archived, not deleted | Architect 2026-05-11 |
| 3 | All in-code links updated to `settings.html#permissions` | Architect 2026-05-11 |
| 4 | URL hash-based tab routing | Architect — standard pattern |
| 5 | Permission gates preserved exactly as today | Architect — security |
| 6 | Pre-commit git tag `pre-consolidation-settings-permissions` | Architect — rollback safety |
| 7 | Continuous-Run Mandate, single chat | Daniel 2026-05-11 |
| 8 | Localhost-Tester mandatory | Architect — production code change |

## 6. Quality Bar — Acceptance Criteria

1. `settings.html` has tab bar with at minimum: כללי + הרשאות tabs
2. `employees.html` exists only in `_archive/pre-consolidation/` — no file at repo root
3. `grep -r "employees.html" --include="*.html" --include="*.js" --include="*.sql" --exclude-dir=_archive --exclude-dir=.git` returns 0 matches
4. URL `settings.html#permissions` opens directly to permissions tab
5. URL `settings.html#general` or `settings.html` (no hash) opens general tab
6. Browser refresh preserves active tab
7. All cataloged behaviors from `PRE_CONSOLIDATION_BEHAVIOR.md` verified working post-consolidation
8. Localhost render verified for both tabs on demo tenant, documented in TEST_REPORT.md
9. Pre-commit git tag `pre-consolidation-settings-permissions` exists
10. `npm run verify:integrity` exit 0
11. `npm run smoke` 7/7 PASS
12. Working tree clean
13. Pushed to `origin/develop` (NOT main)

## 7. Destructive Operations

Declared:
- **File overwrite:** `settings.html` (restructured to tabbed container)
- **File move:** `employees.html` → `_archive/pre-consolidation/employees.html` (git mv)
- **Sweep edits:** every file in the repo that contains string `employees.html` — replace with `settings.html#permissions` (estimated count via pre-flight grep)
- **JS integration:** scripts from employees.html migrated into settings.html (or extracted to a shared module — Executor decision)

NO file deletes. NO renames except the archive move. NO schema changes. NO force-push. NO merge to main.

## 8. Continuous-Run Mandate

Run end-to-end in ONE Claude Code chat. Stop only on:
- Iron Rule 31/32 violation
- Localhost smoke fails (tab routing broken OR permissions UI broken OR behavior regression)
- Pre-commit grep finds employees.html references AFTER the sweep commit (means sweep was incomplete)

## 9. Anti-Patterns

- DO NOT delete employees.html — archive it
- DO NOT change permission gate logic
- DO NOT add new tabs beyond what exists today (general + permissions). If other tabs naturally exist in settings already, keep them. Don't ADD new ones.
- DO NOT modify the visual design — it's already Hybrid+Navy per Migration #2
- DO NOT change DB or JS API contracts
- DO NOT skip the grep verification — every employees.html reference must be updated
- DO NOT merge to main

## 10. References

- LIVE files: `settings.html` + `employees.html` at repo root
- Visual targets (already in Hybrid+Navy from Migration #2):
  - `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/settings.html`
  - `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/hybrid-final/permissions.html`
- Pattern reference: Migration #2 SPEC for the visual treatment
- `OPEN_TASKS.md` — task closes after this

---

*End of brief.*
