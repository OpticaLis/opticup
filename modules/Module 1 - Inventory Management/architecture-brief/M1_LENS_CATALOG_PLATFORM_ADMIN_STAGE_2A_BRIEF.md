---
brief_id: M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A
title: Build the Platform Catalog Admin screen in full — Optic Up admin only, single-screen, two product-type tabs
authored_by: opticup-architect (Cowork session, 2026-05-18 evening)
status: SEALED — ready for Module Strategist (opticup-strategic)
module: Module 1 - Inventory Management
plan_position: Stage 2A of 5 (mockup screens [done] → THIS = full admin screen + tenant separation [now] → Excel load mechanism → tenant my-catalog flow → demo close)
predecessor: M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 (closed 🟢, 3 commits, Tier C VFV 18/2/0)
---

# Brief — Stage 2A: Platform Catalog Admin (Full Build)

## 1. Background

Stage 1 closed clean visually — but Daniel reviewed the live screen and identified three architectural-intent errors that Stage 1's Tier C VFV could not detect because they were Brief-author defects, not Executor defects (full retrospective: `references/decisions/CROSS.md` entry "2026-05-18 — Stage 1 close-out + Stage 2A authoring"). Specifically:

1. The two tabs ("מותגים גלובליים" + "הקטלוג שלי") were placed in ONE screen served to ALL users. Real intent: a dedicated **Platform Catalog Admin screen** visible only to Optic Up team (with banner "Optic Up Team Only" in the mockup), and a SEPARATE tenant inventory screen with its own two sub-tabs (global-readonly + my-catalog-editable).
2. The mockup file (`LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html`, 671 lines) was not read in full when authoring Stage 1's Brief. Only 3 of 4 columns shipped — the 4th column (the largest one — series detail + variants table + versioning + adoption indicators + save bar) was missing entirely.
3. Lens vs contact-lens product separation: same brand/series tree (shared `lens_brand` + `lens_design` with `lens_type` discriminator), but separate variant tables (`lens_variant` for glasses with SPH/CYL/index/coating; `contact_lens_variant` for contacts with Base Curve/Diameter/Duration/Water Content). Stage 2A must reflect this with two top-level tabs that filter the brand/series tree by `lens_type` AND swap the variants pane content per tab.

Stage 2A rebuilds the screen end-to-end against the full mockup. Stage 2B (separate Brief, after 2A closes 🟢) will add Excel import mechanism.

## 2. Goal

Ship the full Platform Catalog Admin screen with all four columns of the mockup, both product-type tabs (glasses + contacts), all versioning + adoption + save behaviors, and the easy single-row creation paths. **No Excel import in this Stage** — that's Stage 2B. No tenant-side changes either — that's Stage 4. Pure admin-side, full visual + interaction fidelity to the mockup.

## 3. Scope IN

### 3.1 Screen architecture (a hard architectural constraint)

- New route or page-entry: `inventory.html?cat=lens-catalog-admin` OR a dedicated page (Module Strategist chooses based on Iron Rule 12 file-size + minimum disruption to existing inventory routing). The new screen is **visible only to users with permission `platform.catalog.admin`** (or equivalent — Module Strategist verifies the exact permission key per `permissions` table; if it doesn't exist, the SPEC creates it via permissions-template pattern with Architect approval).
- **Hidden entirely from tenant users.** A tenant manager with no `platform.catalog.admin` permission must not see this page in navigation, must not be able to reach it via URL injection, and Iron Rule 22 defense-in-depth (server + client gating).
- Banner at top: red gradient bar reading "🔐 PLATFORM ADMIN — אזור ניהול גלובלי (Optic Up Team Only)" — exactly as in the mockup.

### 3.2 Top-level tabs (NEW — not in current code)

Two tabs at the top of the page, switching the entire view:

- **"עדשות משקפיים"** — filters the brand/series tree to `lens_design.lens_type IN ('single_vision','multifocal','bifocal','photochromic','blue_cut',...)`. Variants pane shows the glasses-variant schema (SPH/CYL/index/coating/diameter).
- **"עדשות מגע"** — filters the brand/series tree to `lens_design.lens_type IN ('soft_contact','hard_contact',...)`. Variants pane shows the contact-variant schema (Base Curve/Diameter/SPH/CYL/wearing_schedule/qty_per_box).

Switching tabs preserves no selection state (clean filter swap). Each tab has its own count totals in the page header (e.g., "4 ספקים · 29 מותגים · 47 סדרות · 6,420 וריאנטים" — these counts are tab-specific).

### 3.3 Page header

Matches mockup lines ~325-337: title "🌐 ניהול קטלוגי עדשות" + tab-specific counts badge + 4 action buttons (📥 ייבוא קטלוג מותג — disabled in 2A, enabled in 2B / 📊 ייצוא Excel — disabled placeholder for future / 📝 לוג שינויים — disabled placeholder / ➕ ספק חדש — enabled).

### 3.4 Four-column body (the heart of the screen)

Matches mockup lines ~339-666. Each column has its own header, search, scrollable body, footer:

- **Column 1 — Suppliers** (`suppliers` table, global only — `owner_tenant_id IS NULL`). Item shows name + country flag + brand count. Click filters Column 2. Footer: "➕ ספק חדש" creates a new global supplier inline.
- **Column 2 — Brands for selected supplier** (`lens_brand` rows linked to supplier via `supplier_brand_distribution`). Each card shows brand name + series count badge + variant count + "📥 ייבוא קטלוג מותג" quick-action button (disabled in 2A — the button exists in DOM but is `disabled` with tooltip "זמין בשלב 2ב"). Brand cards with zero series show a "⚠ ללא סדרות" hint.
- **Column 3 — Series for selected brand** (`lens_design` rows filtered by brand + tab's `lens_type` set). Each item shows series name + "מדף"/"ייצור" chip + category subtext + variant count. Footer: "📥 ייבוא קטלוג מותג שלם" (disabled in 2A) + "➕ סדרה ידנית" (enabled — creates new series with the active tab's `lens_type` preselected).
- **Column 4 — Series detail + variants table** (the largest panel). This is the most important new work:

  - **Detail header:** series name + chip + version badge (e.g., "v3 · פעיל") + meta row (supplier, brand, variant count, last-updated info).
  - **Publish state strip:** three items — status (active/draft), adoption count ("3 / 4 אופטיקאיות אימצו"), last change description with timestamp.
  - **Series core fields section:** name (required), `lens_type` toggle (מדף/ייצור — locked to glasses when in glasses tab, swaps to "יומית/חודשית/שנתית" duration toggle when in contacts tab), category select (single_vision/multifocal/photochromic/blue_cut for glasses; daily/monthly/yearly/extended for contacts), description.
  - **Variants table:** columns differ per tab:
    - **Glasses tab:** ID, Index, Coating, Diameter, SPH range, CYL range, Base Price, Status, Edit.
    - **Contacts tab:** ID, Base Curve, Diameter, SPH, CYL, Axis, Wearing Schedule, Qty/Box, Status, Edit.
    Action buttons above the table: "➕ הוסף" (opens single-variant modal) + "📥 ייבוא וריאנטים מקובץ" (disabled in 2A, enabled in 2B).
  - **Save bar:** info text ("⚠️ אין שינויים שטרם נשמרו" / "X שינויים ממתינים — שמירה תיצור גרסה חדשה (v4) ותתריע לאופטיקאיות שאימצו"). Three buttons: 📋 שכפל, 🗑 השבת (color: amber-red), 💾 שמור גרסה.

### 3.5 Versioning behavior

- Every save creates a new version row of the series (mechanism: add a `version` integer column to `lens_design` if not present, increment on each material change; or track via a separate `lens_design_version` history table — Module Strategist picks the smaller-impact route + states it in SPEC §1.5 schema impact).
- Adoption count comes from a query: how many tenants have at least one row in `supplier_catalog_offering` (or equivalent tenant-binding table) pointing to a variant in this series.
- "Last change" comes from `updated_at` + a simple human-readable message ("עדכון מחיר בסיס" / "וריאנטים חדשים נוספו" — derived from diff if practical, or just generic "עדכון" in 2A; smarter inference in a later Stage).

### 3.6 Easy single-row creation paths (Daniel's UX request)

All of these are MUST in 2A:

- "➕ ספק חדש" (footer Column 1 or header button) → modal/inline form: name, country, contact (optional), notes. Single click + submit.
- "➕ מותג חדש" (footer Column 2 when supplier is selected) → modal: name, country (default to supplier's), notes. Supplier auto-set from selection.
- "➕ סדרה ידנית" (footer Column 3) → modal: name (required), `lens_type` preselected from active tab, category, description. After save, lands user on Column 4 with the new series selected + empty variants table.
- "➕ הוסף" variant (Column 4 above variants table) → modal with the schema for active tab.
- All four forms validate inline (no submit until required fields filled), all use `escapeHtml` (Iron Rule 8), all set `tenant_id` correctly via `getTenantId()` (but for these global rows: `owner_tenant_id=NULL`), all use existing `DB.*` wrapper (Iron Rule 7).

### 3.7 What Stage 2A explicitly DOES NOT do

- No Excel parsing, no bulk import, no file upload UI (Stage 2B owns this — the buttons exist in DOM but are `disabled`).
- No tenant-side changes (Stage 4).
- No deletion of any existing data — even the 3 misclassified "brands" from the aborted SPEC B (`יומיות`/`חודשיות`/`שנתיות`). They stay in the DB until a separate curation SPEC handles them.
- No new RPCs unless absolutely required for versioning increment (atomic via Iron Rule 11 if added).
- No changes to the existing tenant-side inventory screen — that screen continues to work exactly as it does today.

## 4. Scope OUT (deferred to later Stages)

- **Stage 2B:** Excel import flow with 3-step dialog (upload + preview-with-corrections + confirm). Per-category file (glasses-only OR contacts-only, not mixed).
- **Stage 3:** Daniel runs the actual Prizma Excel through Stage 2B's UI.
- **Stage 4:** Tenant-side inventory screen gets its proper two sub-tabs ("קטלוג גלובלי" readonly + "הקטלוג שלי" with adopt/own actions).
- **Stage 5:** Demo tests + Module 1 phase close.

The 4 TECH_DEBT items opened today (`#M1_LENS_CATALOG_GLASSES_VS_CONTACTS_SPLIT`, `#M1_HEALTH_FUNDS_AS_PRICING_AGREEMENTS`, `#M1_EXCEL_CATALOG_NORMALIZATION_OWNERSHIP`, `#M1_CONTACT_LENSES_PHASE_DECISION`) are NOT this Stage's concern — they belong to Stage 3+ and a separate health-funds Brief.

## 5. Locked decisions

| # | Decision | Why |
|---|---|---|
| D1 | TWO separate screens overall: `lens-catalog-admin` = Optic Up team only; tenant inventory = unchanged in this Stage. | Daniel directive 2026-05-18 evening. Mockup banner "Optic Up Team Only" is a hard constraint. Mistake from Stage 1 corrected. |
| D2 | Within `lens-catalog-admin`, TWO top-level tabs: glasses + contacts. They filter shared brand/series tree by `lens_type`. Variants pane swaps schema. | Reflects actual DB structure: `lens_brand`/`lens_design` shared + discriminated by `lens_type`; `lens_variant`/`contact_lens_variant` are separate tables. Allows brands (HOYA, B&L) to live in both product lines. |
| D3 | All four columns fully built per mockup. No "we'll defer the 4th column to Stage 2B." | Stage 1 already deferred the 4th column; Daniel called this out. Stage 2A is the floor. |
| D4 | Excel import buttons exist in DOM but `disabled` in 2A. Enabled in 2B. | Visual continuity — Daniel sees the full mockup-faithful screen, just with parts marked disabled. Easier to reason about than missing-button-here-add-later. |
| D5 | Versioning: every save = new version, adoption count is live. Either via `version` column on `lens_design` + history table, or simpler if Module Strategist finds a leaner pattern. SPEC §1.5 documents the choice. | Mockup shows "v3 · פעיל" and "3/4 אופטיקאיות אימצו" — these are not cosmetic, they drive adoption alerts in Stage 4. |
| D6 | All four "easy creation" paths (supplier / brand / series / variant) MUST ship in 2A. | Daniel's UX request explicit. Without these, the admin can't even seed sample data to test the screen during 2A QA. |
| D7 | NO polish-by-validation closure. If Executor finds zero changes needed, STOP and escalate. | Memory `feedback_no_polish_by_validation.md` — binding. |

## 6. Dependencies

- **Upstream (existing on develop):** Stage 1 (`M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1`) — its 3-column visual chrome is the starting point. Stage 2A extends, not rewrites.
- **Cross-module:** Iron Rule 14 (tenant_id) + 15 (RLS) for global rows uses `owner_tenant_id IS NULL` pattern already established in `lens_brand`/`lens_design`. Iron Rule 12 (file size 300/350 max) — if the new screen JS grows large, Module Strategist plans the split during SPEC authoring.
- **Permissions:** verify or create `platform.catalog.admin` permission key. If a hotfix is needed for the permissions table to support the key, that's part of 2A's pre-flight (the permissions_template TECH_DEBT note in `#M1_LENS_PERMISSIONS_TEMPLATE_AUTO_REPLICATION` is informational — don't fix it in this Stage, but ensure the key works for Optic Up admin users on both demo and Prizma).

## 7. Open questions for the Module Strategist

None at the strategic level. Module Strategist owns:
- Exact file structure (new screen file vs route within `inventory.html`; new JS module vs extension of existing `catalog-private-admin.js` — but if extension causes file-size violation, split is mandatory).
- Per-column responsive layout details + per-element CSS rules (read mockup verbatim).
- Versioning implementation (column on `lens_design` vs history table) — pick the smaller change.
- Adoption-count query (simple `count(distinct tenant_id) FROM supplier_catalog_offering` per series, or a cached view).
- Tier C VFV protocol: Chrome MCP side-by-side capture on both tabs, with empty-state + populated-state classified separately.

## 8. Cross-module contracts to honor

- **Iron Rule 7:** all DB writes via `DB.*` wrapper, never raw `sb.from()`.
- **Iron Rule 8:** all user input rendered via `escapeHtml` / `textContent`. PIN-free creation forms are fine (these are global rows by Optic Up admin, not tenant data).
- **Iron Rule 11:** if any sequential numbering is needed (e.g., version increment), atomic RPC with `FOR UPDATE`.
- **Iron Rule 21:** before creating any helper function, grep existing modules — `lens-catalog-admin/`, `shared/js/catalog-private-admin.js` — for similar functionality.
- **Iron Rule 22:** defense-in-depth on the new screen — server permission check + client navigation hiding + server RLS on every write.

## 9. Anti-patterns to avoid

1. **Polish-by-validation closure** — closing 🟢 with zero changes claiming "existing functionality meets criteria." STOP and escalate.
2. **Self-certified visual match** without Chrome MCP side-by-side mockup-vs-live. Tier C VFV mandatory.
3. **Scope creep into Excel parsing** — that's Stage 2B, period. If executor wants to build a file picker mid-Stage, STOP, log to FINDINGS.
4. **Modifying tenant-side inventory** — that's Stage 4. Leave the existing tenant inventory screen completely untouched.
5. **Deleting the 3 misclassified "brands"** (`יומיות`/`חודשיות`/`שנתיות`). They stay until a separate curation SPEC.

## 10. Deliverables

1. SPEC.md by Module Strategist (full template).
2. ACTIVATION_PROMPT.md sibling.
3. Code changes — new screen route + 2-tab navigation + 4-column layout + variants-pane swap-by-tab + versioning + adoption + 4 creation modals + permission gating.
4. Pre-commit safety tag before any edit.
5. EXECUTION_REPORT.md with 1-10 self-scores on the four dimensions.
6. FINDINGS.md.
7. Tier C VFV: Chrome MCP screenshots — glasses tab + contacts tab + empty state + populated state + all four creation modals — classified match/minor/fail per element.
8. FOREMAN_REVIEW.md within 24h of close.

## 11. Position in 5-stage plan

| Stage | Description | Status |
|---|---|---|
| 1 | Mockup-faithful screens (admin dark + my-catalog light) | ✅ closed 🟢 |
| **2A** | **Platform Catalog Admin full build (this Brief)** | **next** |
| 2B | Excel import dialog (per-category file, 3-step preview-with-corrections) | queued |
| 3 | Daniel loads actual Excel through 2B's UI | queued |
| 4 | Tenant-side inventory screen — proper two sub-tabs | queued |
| 5 | Demo tests + M1 phase close | queued |

## 12. Stop triggers

- Module Strategist drafts Excel parsing logic → STOP, that's 2B.
- Module Strategist proposes deleting existing data → STOP, out of scope.
- Module Strategist proposes touching tenant-side inventory → STOP, Stage 4.
- Executor reports "no code changes needed" → STOP, escalate.
- Tier C VFV reveals architectural deviation → STOP, escalation file.
- New permission key creation fails on either demo or Prizma → STOP, escalation.

---

**End of Brief.** Module Strategist (`opticup-strategic`) authors the SPEC from here.
