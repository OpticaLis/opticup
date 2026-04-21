# SPEC — CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B9_VISUAL_QA_AND_FUNCTIONAL_VERIFICATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-21
> **Module:** 4 — CRM
> **Phase:** B9
> **Author signature:** Cowork strategic session (serene-fervent-keller)

---

## 1. Goal

Bring all 5 CRM screens to full visual fidelity with the FINAL mockups Daniel
approved, fix any rendering gaps the B8 Tailwind rewrite left behind, verify
every screen in the browser using Claude in Chrome, and run a full functional
QA pass on the demo tenant — creating a lead, moving it through statuses,
opening an event, checking in an attendee, and verifying the messaging hub.

---

## 2. Background & Motivation

B8 (`CRM_PHASE_B8_TAILWIND_VISUAL_FIDELITY`) rewrote all 18 CRM JS render
functions with Tailwind utility classes. The executor reported all structural
criteria passed. However, post-execution, the Cowork null-byte truncation bug
corrupted 14 of 18 JS files, making the screens appear blank/basic. The files
have been restored from git (2026-04-21, this session).

Daniel confirmed: dashboard now looks close to the mockup, but the other 4
screens (leads, events, messaging, event-day) still look "basic." Two possible
causes remain:

1. **CSS cascade conflicts** — shared ERP CSS (`layout.css`) defines `.grid`,
   `.flex`, `.hidden` etc. that override Tailwind classes. Mitigated by adding
   `important: true` to Tailwind config (done this session), but not yet
   visually verified.
2. **Incomplete visual implementation** — B8 may have added Tailwind classes
   but not replicated the full visual richness of the mockups (gradient
   headers, alternating rows, SVG icons in toggles, etc.).

This SPEC does two things: (A) close the visual gap screen-by-screen using
the FINAL mockups as source of truth, and (B) run functional QA on the demo
tenant to ensure the CRM actually works end-to-end.

**Dependencies:** B8 closed (10 commits). Files restored from git. Tailwind
`important: true` added to config. Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`.

---

## 3. Success Criteria (Measurable)

### A. Pre-flight

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean or only B9 changes | `git branch` → `develop` |
| 2 | All 18 JS files syntax-valid | 0 failures | `for f in modules/crm/*.js; do node --check "$f"; done` → all exit 0 |
| 3 | Zero null bytes in CRM files | 0 | `cat crm.html css/crm*.css modules/crm/*.js \| tr -cd '\0' \| wc -c` → 0 |
| 4 | Tailwind CDN present with important flag | 1 hit | `grep 'important: true' crm.html` → 1 |

### B. Visual fidelity (per screen, verified in browser)

| # | Screen | Criterion | Verify method |
|---|--------|-----------|---------------|
| 5 | Dashboard | KPI cards show gradient backgrounds, sparklines, correct layout | Screenshot + visual comparison to FINAL-01 |
| 6 | Leads — Table | Table has proper rounded card wrapper, header with bg-slate-50, hover states, status badges with colors, alternating row hint, checkbox column | Screenshot of leads tab |
| 7 | Leads — Kanban | 4 status columns with colored headers, white cards inside | Switch to kanban view, screenshot |
| 8 | Leads — Cards | Grid of cards with gradient avatars showing initials | Switch to cards view, screenshot |
| 9 | Leads — Filters | Filter chips appear in indigo-100, close buttons work | Apply a filter, screenshot |
| 10 | Events — List | Table rows with indigo event numbers, all columns visible including admin-only revenue | Screenshot of events tab |
| 11 | Events — Detail | Click an event → modal with gradient header, capacity bar, KPI cards, funnel | Click event row, screenshot detail |
| 12 | Messaging — Tabs | 4 sub-tabs render: templates, rules, broadcast, log | Screenshot messaging tab |
| 13 | Messaging — Templates | Split layout: sidebar list + editor area with dark code editor | Click templates sub-tab, screenshot |
| 14 | Event Day — Entry | Select an event → event day loads with counter cards, barcode input, 3-column layout | Navigate to event day, screenshot |
| 15 | Event Day — Columns | Waiting (amber), check-in (white), arrived (emerald) columns visible | Screenshot the 3 columns |

### C. Functional QA on demo tenant (`?t=demo`)

| # | Flow | Action | Expected result |
|---|------|--------|----------------|
| 16 | Page load | Navigate to `crm.html?t=demo` | Page loads, dashboard shows, 0 console errors |
| 17 | Tab navigation | Click each of the 5 sidebar tabs | Each tab activates, header updates, content loads |
| 18 | Lead creation | If "add lead" exists → create test lead "QA Test Lead" | Lead appears in table (or: verify leads load from DB) |
| 19 | Lead detail | Click a lead row | Detail modal opens with lead info, tabs work |
| 20 | Lead status change | If status change is available → change a lead's status | Status badge updates in table |
| 21 | Kanban drag/view | Switch to kanban view | Leads grouped by status in columns |
| 22 | Event list | Click events tab | Events table loads with data (or empty state if no demo events) |
| 23 | Event detail | Click an event row (if data exists) | Detail modal with gradient header, stats |
| 24 | Event Day entry | Enter event day for an event | Counter cards, barcode input, columns render |
| 25 | Messaging hub | Click messaging tab | Sub-tabs load, templates list appears |
| 26 | Console check | Open DevTools console throughout all flows | 0 uncaught errors (warnings acceptable) |

### D. Documentation

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 27 | SESSION_CONTEXT.md updated | Contains B9 status | `grep 'B9' "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` |
| 28 | CHANGELOG.md updated | Contains B9 section | `grep 'B9' "modules/Module 4 - CRM/docs/CHANGELOG.md"` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Read all 5 FINAL mockup files to compare with rendered output
- Navigate `crm.html?t=prizma` and `crm.html?t=demo` in the browser using
  Claude in Chrome tools (screenshot, read_page, navigate, computer)
- Edit any file in `modules/crm/*.js` to fix visual gaps
- Edit `crm.html` to fix shell HTML structure
- Edit `css/crm*.css` to fix CSS issues
- Add Tailwind classes, fix HTML structure, adjust render functions
- Run `node --check` on all JS files after changes
- Commit and push to `develop` (selective `git add` by filename)
- Create/edit MODULE docs (SESSION_CONTEXT, CHANGELOG, MODULE_MAP)

### What REQUIRES stopping and reporting

- Any change to files outside `crm.html`, `css/crm*.css`, `modules/crm/*.js`,
  or module docs
- Any change to `shared/css/*.css` or `shared/js/*.js`
- Any DB change (DDL or DML)
- Any merge to `main`
- Console errors that indicate broken Supabase queries or auth failures
- Any screen that cannot be made to match its mockup without architectural
  changes (new files, new DB objects, etc.)

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- If any JS file exceeds 350 lines after edits → STOP, split first
- If Tailwind CDN fails to load in browser → STOP, diagnose network/CSP
- If demo tenant returns 0 rows for leads AND events (no seed data) → STOP,
  report — functional QA requires data. Note: Prizma tenant has data (893
  leads, 11 events), demo may not. If demo has no data, run functional QA
  on Prizma tenant instead (read-only verification, no writes to production).
- If console shows RLS policy errors on demo tenant → STOP, report

---

## 6. Rollback Plan

- No DB changes in this SPEC — rollback is purely `git reset --hard {START_COMMIT}`
- START_COMMIT = the commit hash at the start of B9 execution
- If B9 fails, the restored B8 code remains intact

---

## 7. Out of Scope (explicit)

- Dark theme conversion (B8 explicitly kept light theme per B6 decision)
- External message dispatch (messaging hub stores but doesn't send — known gap)
- Automation rule execution (stored but not scheduled — known gap)
- Demo tenant data seeding (future SPEC CRM_DEMO_SEED)
- `shared.js` split (M4-DEBT-01)
- `DB.*` wrapper migration (M4-DEBT-02)
- Any changes to shared ERP CSS files (`shared/css/*.css`)
- Performance optimization of Tailwind CDN (M4-TECH-02)

---

## 8. Expected Final State

### Modified files (potential — only if visual gaps found)

- `modules/crm/*.js` — render functions adjusted to match mockups
- `crm.html` — shell HTML adjusted if needed
- `css/crm*.css` — CSS fixes if needed

### Docs updated (MUST)

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — B9 status
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — B9 section with commits

### Deliverables in SPEC folder

- `EXECUTION_REPORT.md` — standard executor retrospective
- `FINDINGS.md` — any issues found during QA
- Screenshots saved during visual verification (referenced in report)

---

## 9. Commit Plan

- **Commit 1** (if needed): `fix(crm): close visual gaps for leads screen`
- **Commit 2** (if needed): `fix(crm): close visual gaps for events screen`
- **Commit 3** (if needed): `fix(crm): close visual gaps for messaging screen`
- **Commit 4** (if needed): `fix(crm): close visual gaps for event-day screen`
- **Commit 5**: `docs(crm): update B9 session context and changelog`
- **Commit 6**: `chore(spec): close B9 with execution report and findings`

If no visual gaps are found (B8 code is already correct after restore), skip
commits 1–4 and proceed directly to documentation + QA report.

---

## 10. Execution Protocol

### Phase 1 — Visual Audit (per screen)

For each of the 5 screens:

1. Open `crm.html?t=prizma` in Chrome
2. Navigate to the screen's tab
3. Take a screenshot
4. Open the corresponding FINAL mockup file, read its HTML structure
5. Compare: does the rendered screen match the mockup's layout, colors,
   spacing, and components?
6. If gaps exist → identify the specific JS render function, edit it to
   match the mockup, verify with another screenshot
7. Move to next screen

Order: Dashboard (verify only) → Leads → Events → Messaging → Event Day

### Phase 2 — Functional QA

1. Switch to `crm.html?t=demo` (or stay on prizma if demo has no data)
2. Walk through criteria #16–#26 in order
3. For each flow: perform the action, verify the result, check console
4. Document pass/fail for each criterion

### Phase 3 — Documentation & Close

1. Update SESSION_CONTEXT.md and CHANGELOG.md
2. Write EXECUTION_REPORT.md and FINDINGS.md
3. Final commit

---

## 11. Lessons Already Incorporated

- FROM `B8/EXECUTION_REPORT.md` §5 → "shell class inventory" — This SPEC
  does NOT modify shell CSS classes. Visual fixes target only JS render
  functions and their Tailwind classes.
- FROM `B8/EXECUTION_REPORT.md` §5 → "light-vs-dark decision" — Explicitly
  stated in §7 Out of Scope: dark theme conversion is not in scope.
- FROM `B8/FINDINGS.md` M4-TOOL-02 → rule-21 false positives for IIFE-local
  helpers — Known, will not be "fixed" in B9.
- FROM this session's diagnosis → Cowork null-byte truncation — All files
  verified clean before B9 starts (criterion #3). The executor MUST re-verify
  file integrity after ANY Write operation using `node --check`.
- Cross-Reference Check completed 2026-04-21: 0 new DB objects, 0 new files
  planned. B9 modifies existing files only. No collisions possible.
