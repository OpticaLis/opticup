# SPEC — M6_PRESCRIPTION_EDITOR

> **Location:** `modules/Module 6 - Prescriptions/docs/specs/M6_PRESCRIPTION_EDITOR/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, night-run-2026-05-24)
> **Authored on:** 2026-05-24
> **Module:** 6 — Prescriptions
> **Phase:** E — Prescription Editor UI

---

## 0. Pre-Authoring Reality Check

- Brief: `NIGHT_RUN_2026_05_24_BRIEF.md` read in full 2026-05-24.
- Field audit: `M6_EDITOR_FIELD_AUDIT.md` PASS — 115 mockup fields, 109 schema-backed, 6 display-only/computed, 0 gaps. Zero migrations needed.
- Mockup: `M6_PRESCRIPTION_EDITOR_MOCKUP.html` v3 APPROVED + LOCKED 2026-05-23.
- Schema: M6_SCHEMA Phase A+B CLOSED (8 tables, 19 enums, 9 views, 7 RPCs). All verified live.
- M5 patterns: M5 customer-card Phase D is the first-screen template. Per-field debounced autosave, DRAFT→COMMITTED state handling, coming-soon registry — all patterns to reuse.
- Lessons from M6_SCHEMA FOREMAN_REVIEW: P-AUTHOR-1 (cross-contract matrix in §0), P-AUTHOR-2 (smoke case columns: effect vs invariant).
- Pre-existing untracked files: WIP campaign sketches + architecture briefs (not this SPEC's concern; selective git add throughout).

### Cross-Module Contract Matrix

| Surface | Type | Owner | Consumer(s) | Built in |
|---|---|---|---|---|
| `v_prescriptions_list_for_customer` | View | M6 | M6 editor sidebar | M6_SCHEMA (exists) |
| `v_prescription_full_for_editor` | View | M6 | M6 editor center | M6_SCHEMA (exists) |
| `create_prescription_draft` | RPC | M6 | M6 editor "+ מרשם" button, M5 card | M6_SCHEMA (exists) |
| `clone_prescription` | RPC | M6 | M6 editor "שכפל" button | M6_SCHEMA (exists) |
| `commit_prescription` | RPC | M6 | M6 editor "סגור מרשם" button | M6_SCHEMA (exists) |
| `cancel_draft_prescription` | RPC | M6 | M6 editor "בטל" button | M6_SCHEMA (exists) |

### Baselines (measured 2026-05-24)

| Metric | Value | How measured |
|---|---|---|
| M6 tables live | 8 | `SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'prescription%' OR tablename = 'eye_exams' OR tablename = 'lens_manufacturers'` |
| M6 RPCs live | 7 | `SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE '%prescription%' OR proname LIKE 'create_exam%' OR proname = 'compute_recall_due_dates' OR proname = 'clone_prescription'` |
| modules/prescriptions/ files | 0 | `ls modules/prescriptions/ 2>&1` (directory does not exist yet) |

---

## 1. Goal

Build the prescription editor UI — the Pattern 12 (sidebar history + center editor) screen shown in the approved mockup — as a new set of JS files under `modules/prescriptions/`. The editor covers both glasses and contacts views, with per-field debounced autosave, the per-eye ADD block with copy R→L, recall axes display, and the DRAFT→COMMITTED lifecycle.

## 2. Background & Motivation

M6 Phase A+B delivered the full schema (8 tables, 19 enums, 9 views, 7 RPCs) with zero gaps against the approved mockup (field audit PASS). This SPEC is a pure frontend build — no migrations, no RPCs, no DB changes. The UI reuses M5 patterns (debounced autosave, per-field inline save, coming-soon registry for deferred actions).

## 3. Success Criteria (Measurable)

| # | Criterion | Expected |
|---|---|---|
| SC-1 | New JS files under `modules/prescriptions/` | 8-12 files, each ≤ 350 lines |
| SC-2 | ERP HTML page `prescriptions.html` exists at root | 1 file, loads shared + module JS |
| SC-3 | Glasses view: all 17 per-eye refraction fields render as inputs | 17 inputs per eye row × 2 eyes |
| SC-4 | Glasses view: per-eye ADD block renders 4 fields per eye + copy R→L button | 4 inputs × 2 eyes + 1 button |
| SC-5 | Contacts view: all 14 per-eye CL fields render as inputs | 14 inputs per eye row × 2 eyes |
| SC-6 | Type toggle (glasses/contacts) switches view + sidebar list | 2 views, 1 active at a time |
| SC-7 | Sidebar lists prescriptions from `v_prescriptions_list_for_customer` | List loads on mount |
| SC-8 | Selecting a sidebar item loads the full prescription via `v_prescription_full_for_editor` | Center view updates |
| SC-9 | "+ מרשם" calls `create_prescription_draft` → new draft appears selected | Draft created + selected |
| SC-10 | "שכפל" calls `clone_prescription` → new draft with copied values | Clone created |
| SC-11 | "סגור מרשם" calls `commit_prescription` → status badge changes | Status → committed |
| SC-12 | "בטל" calls `cancel_draft_prescription` → item removed from active list | Status → cancelled |
| SC-13 | Per-field autosave via debounced UPDATE to prescription parent + child tables | Save on blur/change, 500ms debounce |
| SC-14 | Recall axes display from `v_recall_due` (read-only in Phase E) | Axes render as pills |
| SC-15 | Health fund info displays from customer profile (read-only) | Name + plan shown |
| SC-16 | Print strip buttons registered in coming-soon registry | All 6 buttons → coming-soon |
| SC-17 | Context bar shows correct status badge + action buttons per state | DRAFT/COMMITTED/EXPIRED states |
| SC-18 | `npm run verify:integrity` PASS | exit 0 |
| SC-19 | Chrome MCP screenshot of glasses view in working state | Attached to TEST_REPORT |
| SC-20 | Chrome MCP screenshot of contacts view in working state | Attached to TEST_REPORT |
| SC-21 | Visual-Fidelity Gate: region-by-region mockup-vs-live table in TEST_REPORT + FOREMAN_REVIEW | Per Iron Rule 34 |

## 4. Autonomy Envelope

- JS files created/modified under `modules/prescriptions/` and root `prescriptions.html`.
- Zero DB migrations.
- Read-only DB access: SELECT from M6 views, RPC calls to existing M6 RPCs.
- Write access: UPDATE to prescription parent + child tables (autosave), INSERT via create_prescription_draft/clone_prescription.
- Chrome MCP for Visual-Fidelity Gate verification.
- Demo tenant only for testing.

## 5. Stop-on-Deviation Triggers

- Any field in the mockup that does not have a backing column → STOP (field audit says 0 gaps, but re-verify at execution time)
- Any RPC returns an unexpected shape or error → STOP
- File exceeds 350 lines → split before continuing
- Unrelated file modified → STOP
- Visual-Fidelity Gate first-load styled-check fails → STOP and investigate CSS

## 6. Rollback Plan

Pure frontend — `git revert` the commit(s). No DB changes to roll back.

## 7. Destructive Operations

**None.**

## 8. Out of Scope

- Print/send actions (coming-soon; Phase G+)
- Recall axis editing (read-only display; M12 recall-rules module owns editing)
- Order creation from prescription (Phase G+, M7 dependency)
- Data migration from legacy `prescriptions` table (M6_MIGRATION SPEC)
- M5 customer card tab-3 wiring (M6_M5_CARD_WIRING SPEC)

## 9. Expected Final State

### New files

| Path | Purpose |
|---|---|
| `prescriptions.html` (root) | ERP page entry point |
| `modules/prescriptions/rx-editor.js` | Main bootstrap + state + type toggle |
| `modules/prescriptions/rx-sidebar.js` | History sidebar + search + filters |
| `modules/prescriptions/rx-center.js` | Center editor layout + context bar |
| `modules/prescriptions/rx-meta-grid.js` | Meta grid (7 fields) rendering + save |
| `modules/prescriptions/rx-param-table.js` | Per-eye parameter table (refraction + VA + PD + kerato) |
| `modules/prescriptions/rx-add-block.js` | Per-eye ADD block + copy R→L |
| `modules/prescriptions/rx-secondary.js` | Secondary row (lens type/material + BCVA + refraction method) |
| `modules/prescriptions/rx-notes.js` | Notes + recall display + health fund + print strip |
| `modules/prescriptions/rx-contacts-params.js` | Contacts-specific per-eye table (CL params + OR) |
| `modules/prescriptions/rx-contacts-secondary.js` | Contacts secondary (manufacturer + model + material) |

### Modified files

| Path | Change |
|---|---|
| `docs/FILE_STRUCTURE.md` | Add `modules/prescriptions/` entry |
| `modules/Module 6 - Prescriptions/docs/MODULE_MAP.md` | Add editor file + function registry |
| `modules/Module 6 - Prescriptions/docs/SESSION_CONTEXT.md` | Update to Phase E CLOSED |

## 10. Commit Plan

| # | Scope | Files |
|---|---|---|
| C1 | Core shell: page + bootstrap + type toggle + sidebar | prescriptions.html, rx-editor.js, rx-sidebar.js |
| C2 | Glasses editor: meta + params + ADD + secondary + notes | rx-center.js, rx-meta-grid.js, rx-param-table.js, rx-add-block.js, rx-secondary.js, rx-notes.js |
| C3 | Contacts editor: params + secondary | rx-contacts-params.js, rx-contacts-secondary.js |
| C4 | Coming-soon wiring + autosave + lifecycle buttons | All editor files (targeted edits) |
| C5 | Docs + Visual-Fidelity Gate evidence + SPEC closure | MODULE_MAP, SESSION_CONTEXT, FILE_STRUCTURE, EXECUTION_REPORT, FINDINGS, TEST_REPORT |

## 11. Dependencies / Preconditions

- M6_SCHEMA Phase A+B CLOSED (provides all tables/views/RPCs)
- M5 customer-card patterns available (shared/js/* utilities)
- prescriptions.html added to root-allowlist.json (CLAUDE.md §0.5)

## 12. Lessons Already Incorporated

- M6_SCHEMA P-AUTHOR-1: cross-contract matrix in §0 ✅
- M6_SCHEMA P-AUTHOR-2: smoke cases with effect vs invariant columns (applied in §14)
- M5 Phase D patterns: per-field debounced autosave, coming-soon registry, card state machine
- Iron Rule 34 (strengthened): Visual-Fidelity Gate mandatory at closure

## 13. Pre-Merge Checklist

- [ ] All files ≤ 350 lines (Iron Rule 12)
- [ ] No hardcoded business values (Iron Rule 9)
- [ ] No innerHTML with user input (Iron Rule 8)
- [ ] `npm run verify:integrity` exit 0 (Iron Rule 31)
- [ ] `npm run verify:staged` exit 0
- [ ] Chrome MCP screenshots attached (Iron Rule 34)
- [ ] Visual-Fidelity Gate region-by-region table in TEST_REPORT + FOREMAN_REVIEW
- [ ] MODULE_MAP updated in same commit as code
- [ ] FILE_STRUCTURE updated

## 14. Smoke Test Cases

| Case | Effect | Invariant | Type |
|---|---|---|---|
| S-1 | Load prescriptions.html on demo tenant → sidebar populates | v_prescriptions_list_for_customer returns rows | Functional |
| S-2 | Click "+ מרשם" → new draft appears in sidebar, selected | create_prescription_draft returns uuid | Functional |
| S-3 | Edit SPH field → autosave fires → page reload retains value | prescription_glasses_eyes.sphere persisted | Functional |
| S-4 | Click "סגור מרשם" → status badge changes to COMMITTED | commit_prescription succeeds | Functional |
| S-5 | Toggle to contacts → contacts sidebar shows, glasses hides | Type toggle state correct | Functional |
| S-6 | Click copy R→L in ADD block → L values match R values | UI copy, no DB op | Functional |
| S-7 | Visual-Fidelity Gate: first-load styled-check passes | CSS variables resolve, page rendered styled | Visual |
| S-8 | Visual-Fidelity Gate: region comparison table completed | Per mockup section | Visual |
