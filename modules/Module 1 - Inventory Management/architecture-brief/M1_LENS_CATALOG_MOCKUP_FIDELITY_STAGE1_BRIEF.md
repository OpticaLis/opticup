---
brief_id: M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1
title: Make lens-catalog admin + private-catalog screens mockup-faithful — Stage 1 of 5-stage plan
authored_by: opticup-architect (Cowork session, 2026-05-18)
authored: 2026-05-18 evening
status: SEALED — ready for Module Strategist (opticup-strategic)
module: Module 1 - Inventory Management
plan_position: Stage 1 of 5 (mockup screens → load UI → real Excel load → "my catalog" pull → demo close)
---

# Brief — Stage 1: Mockup-Faithful Lens-Catalog Screens

## 1. Background

Daniel reviewed the live lens-catalog screen on demo (localhost:3000/inventory.html?t=demo) after SPEC `M1_LENS_CATALOG_TRUE_REBUILD` shipped Commits 1+2 and aborted SPEC `M1_LENS_CATALOG_SEED_FROM_EXCEL` (Excel data-quality issues — 4 TECH_DEBT items opened). His verdict: **"the screens still don't match the approved mockups."**

The two screens at issue are the two catalog views, toggled by the `📖 הקטלוג שלי` ↔ `🌐 מותגים גלובליים` button currently in `shared/js/catalog-private-admin.js:41`:

- **Admin view** (`🌐 מותגים גלובליים`): the platform-wide global catalog editor. Dark theme, slate-900 background, used by Optic Up platform staff to maintain the master brand/design/variant tree. Mockup: `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`.

- **My-catalog view** (`📖 הקטלוג שלי`): the tenant-scoped subset — what this specific optical store has selected to carry. Light theme, `#f5f6fa` background. Mockup: `modules/Module 1 - Inventory Management/architecture-brief/mockups/LENS_INVENTORY_MOCKUP.html`.

The previous rebuild attempt closed 🟢 with the executor reporting "existing code already meets criteria — no code changes shipped" — a textbook polish-by-validation anti-pattern caught by Daniel's live review. This Brief restarts the work under the no-polish-by-validation discipline: **real code changes must ship; verification is side-by-side mockup-vs-live Chrome MCP rendering, not self-certification.**

## 2. Goal

Bring the two catalog screens (admin global + tenant private) into mockup fidelity with the two sealed mockup files. Daniel reviews the final state in browser and confirms before the SPEC closes. No data work. No Excel work. No new tables. No new RPCs. Just CSS + DOM structure + the toggle interaction matching the mockups.

## 3. Scope IN (Stage 1 work)

The Module Strategist owns picking exact files; the architectural envelope is:

1. **Admin view background + chrome** matches `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`: dark slate-900 page background (`#0f172a`), light-text contrast, the platform-banner element styling, headers in `#1e293b` cards with `#334155` borders.

2. **My-catalog view background + chrome** matches `LENS_INVENTORY_MOCKUP.html`: light background (`#f5f6fa`), card-based panels, the existing Hybrid+Navy palette already used across other production pages.

3. **Toggle button** (`📖 הקטלוג שלי` ↔ `🌐 מותגים גלובליים`) wires both views correctly: clicking switches the background theme + the column data source + the row decorations. The toggle's visual style adapts to the active theme (light pill on dark bg, dark pill on light bg).

4. **Column layout** (Suppliers / Brands / Designs / Variants) preserved from current code (Commit 1+2 of the aborted SPEC shipped this — keep working). Only the visual chrome around the columns changes per theme.

5. **Existing functional code intact**: data loading, search, brand/design/variant CRUD, supplier picker, dev-mode bypass — all unchanged. This is a re-skin SPEC, not a logic-change SPEC.

## 4. Scope OUT (NOT Stage 1)

These are deferred to later stages of the 5-stage plan or to separate SPECs:

- **No Excel parsing, no seed scripts, no DB writes.** The 4 TECH_DEBT items opened today (`#M1_LENS_CATALOG_GLASSES_VS_CONTACTS_SPLIT`, `#M1_HEALTH_FUNDS_AS_PRICING_AGREEMENTS`, `#M1_EXCEL_CATALOG_NORMALIZATION_OWNERSHIP`, `#M1_CONTACT_LENSES_PHASE_DECISION`) are NOT this SPEC's concern.
- **No admin-load UI.** Stage 2 builds that.
- **No "my catalog" data filtering.** Stage 4 verifies that.
- **No data curation of the existing 3 misclassified "brands"** (`יומיות`/`חודשיות`/`שנתיות`). Daniel will decide whether to soft-delete them via separate SPEC after Excel cleanup.
- **No new tables, no new RPCs, no schema changes.** Pure UI work.
- **No global file refactors.** Touch only catalog-admin-related files.

## 5. Locked decisions

| # | Decision | Why |
|---|---|---|
| D1 | Two themes, not one. Admin = dark, my-catalog = light. | Daniel's directive 2026-05-18 evening. Matches the two sealed mockups. |
| D2 | The toggle button stays at `shared/js/catalog-private-admin.js:41` — don't relocate. | Existing code path works; relocation would expand scope unnecessarily. |
| D3 | Use page-scope CSS override pattern (Migrations #1-#4 vehicle). No `:root` mutation. | This is the proven safe pattern for re-skin SPECs in this project. |
| D4 | No side-effect logic changes during the re-skin. If the executor finds a bug in catalog data-loading mid-re-skin, log to FINDINGS and STOP — do not silently fix. | Pattern P-AR-13 — reframe rather than absorb. |
| D5 | Tier C VFV mandatory. Side-by-side Chrome MCP rendering of mockup HTML vs live screen, on both themes, on demo tenant. No self-certified "looks right." | Memory `feedback_no_polish_by_validation.md` — binding rule. |

## 6. Dependencies

- **Upstream:** SPEC `M1_LENS_CATALOG_TRUE_REBUILD` Commits 1+2 (Suppliers col + dev-mode bypass) are already on develop. This Brief continues on top of them.
- **Downstream:** Stages 2-5 of the 5-stage plan depend on Stage 1 closing 🟢 with mockup-faithful screens. Stage 2 will build the admin load UI on top.

## 7. Cross-module contracts to honor

- **Pattern P-AR-16 (mockup floor):** the mockup is the bar. Existing functional code is the floor. "Functional" ≠ "matches mockup."
- **Iron Rule 12 (file size):** target 300 max 350 lines per file. If the Module Strategist's SPEC requires file splits to honor this, that's part of Stage 1.
- **Iron Rule 21 (no orphans, no duplicates):** if any orphan CSS file or stale partial is found in the catalog-admin area, log to FINDINGS but don't delete in this SPEC.
- **No raw `sb.from()` calls added** — Iron Rule 7. (Likely irrelevant; this is CSS work.)

## 8. Open questions for the Module Strategist

None at the strategic level. The Module Strategist owns:
- Exact file list to touch (`shared/css/catalog-private-admin.css` new file, page-scope override blocks, etc.)
- Per-element CSS rules (font, padding, border-radius — read from mockup CSS verbatim)
- Tier C VFV protocol (Chrome MCP screenshot capture of mockup vs live, side-by-side classification)

## 9. Anti-patterns to avoid

1. **Polish-by-validation closure** — closing 🟢 with zero code changes claiming "existing meets criteria." **STOP and escalate to Architect instead.**
2. **Self-certified visual match** — "I looked at it, looks fine." Tier C VFV is mandatory.
3. **Scope creep into data work** — if the executor wants to fix Excel data or seed something mid-re-skin, that's out of scope. Log to FINDINGS, continue.
4. **Refactoring during re-skin** — don't restructure JS while changing CSS. One concern per SPEC.
5. **Mutating `:root` in styles.css** — page-scope `body { --primary }` override only. Don't touch global tokens.

## 10. Deliverables

1. SPEC.md authored by Module Strategist
2. ACTIVATION_PROMPT.md (sibling file)
3. Code changes (likely: new `shared/css/catalog-private-admin.css` + DOM structure adjustments in `shared/js/catalog-private-admin.js` + inventory.html `<link>` add)
4. Pre-commit safety tag before any edit
5. EXECUTION_REPORT.md with 1-10 self-scores on (a) SPEC adherence (b) Iron Rule adherence (c) commit hygiene (d) doc currency
6. FINDINGS.md (if anything surfaces)
7. Tier C VFV evidence: Chrome MCP screenshots of mockup vs live, both themes, with classification (match / minor-deviation / fail)
8. FOREMAN_REVIEW.md within 24h of close — mandatory per `feedback_no_polish_by_validation.md`

## 11. Position in the 5-stage plan

| Stage | Description | Status |
|---|---|---|
| **1** | **Mockup-faithful screens (admin dark + my-catalog light)** — this Brief | **next** |
| 2 | Admin-side manual load UI (file picker, preview, error correction UI) | queued |
| 3 | Daniel loads the actual Excel through Stage 2's UI (with Architect answering data-model questions during the load) | queued |
| 4 | "My catalog" pull verification — Daniel marks brands as "I carry these" on demo, my-catalog view filters correctly | queued |
| 5 | Demo-tenant tests + module close (Prizma seed is separate, post-close) | queued |

## 12. Stop triggers

- Module Strategist starts drafting Excel parsing logic → STOP, that's Stage 2.
- Module Strategist proposes schema changes → STOP, out of scope.
- Executor reports "no code changes needed" → STOP, escalate to Architect (this is polish-by-validation).
- Tier C VFV reveals deviation that requires Architect-level decision → STOP, write escalation file.

---

**End of Brief.** Module Strategist (`opticup-strategic`) authors the SPEC from here.
