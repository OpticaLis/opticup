# SPEC — M5_POLISH_PHONE2_LIST_COLUMNS — Secondary Phone + Configurable List Columns

> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-23
> **Brief:** `modules/Module 5 - Customers/architecture-brief/M5_POLISH_PHONE2_LIST_COLUMNS_BRIEF.md`
> **Closure:** Visual-Fidelity Gate (the blocking gate just installed — `modules/Module 1.5 - Shared Components/docs/specs/VISUAL_FIDELITY_GATE/`).
> **No Prizma writes. No merge to main. Demo only.**

---

## 0. Pre-Authoring Reality Check

### Probes pinned

**Probe 1 — Phone columns on `customers`:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='customers' AND column_name LIKE '%phone%';
```
→ only `phone`. **No `phone_secondary` exists.** Safe to ADD COLUMN.

**Probe 2 — Per-tenant config table (Iron Rule 21 — reuse, don't invent):**
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='tenant_settings' ORDER BY ordinal_position;
```
→ `id uuid` / `tenant_id uuid` / **`customer_list_preferences jsonb`** / `created_at` / `updated_at`. The existing M5_SCHEMA table already has a jsonb column purpose-built for this. **Reuse: yes. Invent new table: no.**

**Probe 3 — Canonical writer RPC:**
- `update_customer_display_preferences(p_tenant_id uuid, p_prefs jsonb) → void` already deployed.
- Body: Block A JWT validation + INSERT … ON CONFLICT (tenant_id) DO UPDATE on `tenant_settings.customer_list_preferences`. Atomic. Tenant-scoped.

**Probe 4 — Card view choice for the new column:**
- `v_customer_for_exam` (15 cols) is the header view (composite display + first/last/birth/gender). The card body fetches `v_customer_full` (34 cols). Tab 1 Contact block reads phone+email from the merged customer state. Adding `phone_secondary` to **v_customer_full only** is sufficient — the card already merges v_customer_for_exam + v_customer_full.

**Probe 5 — List view supplies:** the list reads `v_customer_for_exam` + `v_customer_full`. Already supplies name/phone/email/city/id_number/source/lifecycle_stage/customer_number/created_at. For the column picker's "available now" group, no extra fetch needed beyond adding phone_secondary to v_customer_full.

### Decisions

| # | Decision | Rationale |
|---|---|---|
| D-A1 | New column name = `phone_secondary text` (NULLable, default NULL) | Symmetric with `phone`; "secondary" reads cleaner than "work" because the field is used for work/home/other (label-only convention). |
| D-A2 | Add to `v_customer_full` only. Do NOT add to `v_customer_for_exam`. | Card body reads `v_customer_full`; header doesn't need secondary phone. Minimal view changes. |
| D-A3 | Label on the card: "טלפון-עבודה" (per mockup line). | Matches the mockup's "טלפון-עבודה" row position. The DB column name (`phone_secondary`) is policy-neutral; the UI label is user-facing convention. |
| D-A4 | PIN-gating same as `phone` (pinGated: true in FIELDS_CONTACT). | Phone changes are PIN-gated per Phase D D-EDIT. Consistent. |
| D-B1 | Per-tenant storage = `tenant_settings.customer_list_preferences` jsonb (existing M5_SCHEMA table). | Iron Rule 21 — reuse. The RPC already exists. Zero schema churn. |
| D-B2 | jsonb shape: `{ "list_columns": [<col_id>, …] }` where order = display order; presence = visibility. | One key under customer_list_preferences keeps the column open for future related settings (sort order, density, etc.). Simple array preserves user-chosen order. |
| D-B3 | Default columns for a new/unset tenant = `["name", "phone", "city", "health_fund"]`. | Minimal sensible default matching what the list shows today. Tenant customizes from there. |
| D-B4 | Available-NOW columns (10): `name` / `phone` / `phone_secondary` (Item A) / `email` / `city` / `id_number` / `source` / `lifecycle_stage` / `customer_number` / `health_fund` / `created_at` (11 actually). | All sourced from `v_customer_for_exam` + `v_customer_full`; no extra fetch. |
| D-B5 | Future columns (4) shown disabled + clicking → `showComingSoon` toast: `last_exam_date` (M6) / `last_order_date` (M7) / `club_tier` (M13) / `age` (needs birth_date math + DOB column not populated). | Foundation-first pattern — picker designed for the full future column set; rows light up automatically when their data lands. |
| D-B6 | New file: `modules/customers/customer-list-columns.js` (column registry + picker modal + load/save via RPC). | Iron Rule 12 — Phase E's customer-list.js is at 290+ lines; column logic gets its own file. |
| D-B7 | Picker button: "עמודות" added to the list toolbar (next to existing buttons). | Mockup-aware label. |

### Cross-Reference Check (Step 1.5)

| New name | Grep result | Resolution |
|---|---|---|
| `customers.phone_secondary` | 0 hits | NEW — proceed |
| `customer_list_preferences.list_columns` (jsonb sub-key) | 0 hits | NEW — proceed |
| `CUSTOMER_LIST_COLUMNS` (registry constant) | 0 hits | NEW — proceed |
| `renderColumnPicker` / `applyTenantListColumns` / `loadTenantListColumns` / `saveTenantListColumns` (new fns) | 0 hits | NEW — proceed |
| `modules/customers/customer-list-columns.js` | 0 hits | NEW — proceed |
| coming-soon registry keys (`list_col_last_exam`, `list_col_last_order`, `list_col_club_tier`, `list_col_age`) | 0 hits | NEW — additive to existing COMING_SOON_REGISTRY |

0 collisions. All names unique.

### Lessons applied

- **VISUAL_FIDELITY_GATE F-VFG-1** (CSS variables empty) — N/A here; this SPEC adds rows + a modal, the page-scope override block is already in place from VFG fix.
- **VISUAL_FIDELITY_GATE Step 0** — required at closure: confirm computed styles after the new row + modal render.
- **P-EXEC-6** (var(--*) existence check) — N/A here (no new CSS file; minor additions to existing `css/customers.css`).
- **P-AUTHOR-7** (Pre-Merge Checklist gate line) — APPLIED in §12 below.
- **Memory `feedback_no_polish_by_validation`** — every future column shown with a coming-soon classification, not a fake render.

---

## 1. Goal

Two small SaaS-clean improvements to the M5 screens:
1. **Item A:** add a secondary phone field to the customer card (restores mockup parity — "טלפון-עבודה" row now exists in DB + UI + edit-mode).
2. **Item B:** make the customer list columns configurable per tenant (each tenant picks/orders their columns; future columns pre-wired as "coming soon" until their module ships).

Both close via the Visual-Fidelity Gate.

---

## 2. Background

Daniel walked through the M5 screens (post-VISUAL_FIDELITY_GATE styled fix) and asked for these two improvements as part of finishing M5 before M6 begins. Both are SaaS-clean: Item A is a universal field every optical store wants; Item B passes the litmus test (tenant #2 picks their columns, zero code changes).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | SPEC folder | 6 files (SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW + FOREMAN_REVIEW) | `ls` |
| 2 | New column `customers.phone_secondary` | `text NULL`, default NULL | `information_schema` |
| 3 | `v_customer_full` exposes `phone_secondary` | new column appears | `information_schema.columns WHERE table_name='v_customer_full'` |
| 4 | FIELD_MAP entry for `phone_secondary` | `'טלפון-עבודה':'phone_secondary'` added to customers map | `grep -n "phone_secondary" js/shared-field-map.js` |
| 5 | Card contact block renders "טלפון-עבודה" row | 3 rows now: נייד / טלפון-עבודה / אימייל | a11y snapshot |
| 6 | Edit-mode wires phone_secondary save | input type=text, data-edit-key=phone_secondary, data-pin=1 (PIN-gated) | DOM probe |
| 7 | DB persistence | Editing phone_secondary on demo customer → SELECT shows new value → revert | smoke S7 |
| 8 | New file `modules/customers/customer-list-columns.js` | ≤180 lines | `wc -l` |
| 9 | "עמודות" button in list toolbar | visible next to "+ לקוח חדש" | a11y snapshot |
| 10 | Column picker modal | opens with 11 available-now + 4 coming-soon columns; coming-soon disabled + tooltip | a11y snapshot + click test |
| 11 | Column choice persists | toggle a column → close modal → reload page → choice retained (read from tenant_settings) | smoke S10 |
| 12 | Default columns (new tenant / no row) | name + phone + city + health_fund | code |
| 13 | Future column click | shows coming-soon toast via existing `showComingSoon` | smoke S11 |
| 14 | tenant_settings persistence | `SELECT customer_list_preferences FROM tenant_settings WHERE tenant_id='demo'` returns `{"list_columns":[…]}` after save | SQL |
| 15 | Visual-Fidelity Gate — card | Step 0 styled-check pass + region-by-region table embedded in TEST_REPORT.md + FOREMAN_REVIEW.md (per the gate just installed) | grep |
| 16 | Visual-Fidelity Gate — list | Same | grep |
| 17 | Integrity gate | exit 0 or 2 | `npm run verify:integrity` |
| 18 | Destructive Operations gate | declared additive-only + governance/state file edits | pre-commit hook |
| 19 | Selective `git add` | NO `-a` / `add .` / `commit -am` | git log |
| 20 | No Prizma writes | `customers.phone_secondary` updated only on demo customers; Prizma rows untouched | SQL probe |
| 21 | No merge to main | `main` HEAD unchanged | `git rev-parse main` |

### 3a. Functional smokes (Chrome MCP — mandatory)

| # | Case | Setup | Action | Assertion |
|---|---|---|---|---|
| S1 | Card boots with new row | Open card | inspect contact block | 3 rows visible: נייד / טלפון-עבודה / אימייל. טלפון-עבודה shows "—" (no demo data yet). |
| S2 | Edit phone_secondary | (S1) → click ✎ ערוך → click טלפון-עבודה row | type "0521234567" → blur | DB.update fires; trace shows `update_sent field:phone_secondary` then `update_resolved error:null`. SELECT phone_secondary on the customer returns "0521234567". |
| S3 | Revert phone_secondary | (S2) | type "" → blur | DB shows NULL again. |
| S4 | List boots with default columns | Open list | inspect column header | default cols visible: name + phone + city + health_fund (or whatever default we ship). |
| S5 | Open column picker | Click "עמודות" | modal opens | 11 enabled + 4 coming-soon (disabled) options visible. |
| S6 | Toggle a column | (S5) → toggle id_number ON | submit | id_number column appears in the list rows. |
| S7 | Future column → coming-soon | (S5) → click "תאריך-בדיקה-אחרונה" | should NOT toggle; toast appears | trace shows `showComingSoon(list_col_last_exam)` + toast text matches `COMING_SOON_LABEL`. |
| S8 | Persistence on reload | (S6) → reload page | id_number column still visible | tenant_settings probe confirms `list_columns` array contains "id_number". |
| S9 | Architect-relay rule honored | Screenshots delivered via SendUserFile before Foreman closes 🟢 | screenshots visible in chat | Daniel sees them. |

### 3b. Visual-Fidelity Gate closure evidence (mandatory per CLAUDE.md §34 strengthened)

Embedded in BOTH TEST_REPORT.md AND FOREMAN_REVIEW.md:

**Card (contact block):**
- Live screenshot (post-fix, with phone_secondary row).
- Mockup screenshot (or referenced mockup file).
- Region-by-region table — focus on the contact block: mockup 4 rows (mobile/work_phone/email/other) → live 3 rows (mobile/work-phone/email; "other" still SCHEMA-BLOCKED per F-CARD-CONTACT-SCHEMA).

**List (toolbar + column picker + new column):**
- Live screenshot showing toolbar with "עמודות" button.
- Live screenshot of the picker modal.
- Live screenshot showing post-toggle column added.
- Region-by-region table — focus on toolbar + row structure.

---

## 4. Autonomy Envelope

### Executor CAN
- Apply 1 additive migration via Supabase MCP `apply_migration`: `ALTER TABLE customers ADD COLUMN phone_secondary text` + `CREATE OR REPLACE VIEW v_customer_full` with new column.
- Edit `js/shared-field-map.js` to add the entry for `phone_secondary`.
- Edit `modules/customers/customer-card-tab-details.js` to add the FIELDS_CONTACT row.
- Edit `modules/customers/customer-list.js` to wire up column rendering against the live tenant setting.
- Create `modules/customers/customer-list-columns.js` (column registry + picker UI).
- Edit `modules/customers/customer-list-filters.js` to add the "עמודות" button to the toolbar (if it owns the toolbar; OR edit customer-list.js's renderToolbar function — pick wherever the toolbar lives).
- Edit `modules/customers/customer-card-coming-soon.js` to add 4 new keys for future columns (additive).
- Edit `customers.html` if new `<script>` is needed for the new JS file.
- Edit `css/customers.css` additively for picker modal styling.
- Edit module docs (SESSION_CONTEXT, CHANGELOG, MODULE_MAP) + GLOBAL_MAP/GLOBAL_SCHEMA/DB_TABLES_REFERENCE additive merges.
- Selective `git add` by explicit filename.

### Executor MUST STOP
- Any `DROP` / `TRUNCATE` / `DELETE` outside the single S2/S3 cleanup on the smoke test customer.
- Any change to a Phase D/E file outside the precise scope (the card body just gets a new row in FIELDS_CONTACT; nothing else changes).
- Any new permission key (use existing PIN-gating on phone — symmetric).
- Use of `git add -A` / `.` / `commit -am`.
- A different per-tenant config table invented (Iron Rule 21 violation — reuse tenant_settings).
- The new column added to v_customer_for_exam (kept minimal).

---

## 5. Stop-on-Deviation

- If the column-picker doesn't actually persist (page reload loses the choice) → STOP and debug; the SaaS contract is broken.
- If the future-column "coming-soon" path doesn't fire `showComingSoon` (i.e. somehow accidentally toggles the column) → STOP.
- If `phone_secondary` save attempt errors on the Block A check → STOP (RPC wasn't supposed to be involved; DB.update direct call).
- If any Prizma row gets a phone_secondary write → STOP critical.

---

## 6. Rollback

- Schema migration is additive (ADD COLUMN nullable). Rollback = `ALTER TABLE customers DROP COLUMN phone_secondary` (would need a separate destructive SPEC if needed).
- View update is `CREATE OR REPLACE VIEW` — idempotent.
- Code rollback = `git revert` the build commits.
- tenant_settings row inserted at smoke S6+ can be removed via service_role if needed (not needed — it's a legit per-tenant setting).

---

## Destructive Operations

This SPEC declares the following destructive-class operations per Iron Rule 32:

1. **DDL via Supabase MCP `apply_migration`**: `ALTER TABLE customers ADD COLUMN phone_secondary text` (additive; no DROP). `CREATE OR REPLACE VIEW v_customer_full` to expose the new column (in-place replace of view definition; underlying table unchanged).
2. **In-place edits** to `js/shared-field-map.js` (additive entry) + `customers.html` (new `<script>` tag if needed) + `css/customers.css` (additive selectors) + Phase D/E JS files (small additive changes: 1 FIELDS_CONTACT row + toolbar button + column-render wiring).
3. **NEW file**: `modules/customers/customer-list-columns.js`.
4. **In-place edits** to M5 docs + global docs (additive merges).
5. **DML smoke**: 1 UPDATE on the demo customer's phone_secondary (S2) reverted (S3); 1 tenant_settings UPSERT on demo (S6) — these are legitimate per-tenant settings, not test pollution.

**NO DROP** of any table/column/view/RPC. **NO TRUNCATE.** **NO DELETE.** **NO `-a` / `add .` / `--amend`.**

---

## 7. Out of Scope

- M6/M7/M13 implementation (future columns light up automatically when those modules ship).
- OpticPlus historical import (cutover-time).
- F-CARD-ADDRESS-SCHEMA / F-CARD-CONTACT-SCHEMA's other gaps (only the secondary phone is fixed; address breakdown / "other" contact field remain TECH_DEBT).
- Column drag-reorder UX (the picker only adds/removes; reorder via array order is structurally supported but UX-wise the picker just shows checkboxes for v1).
- Column-width / row-density preferences.
- Per-USER preferences (this is per-TENANT — every staff member at a tenant sees the tenant's chosen columns).
- Prizma writes.
- Merge to main.

---

## 8. Expected Final State

### New files
- `modules/customers/customer-list-columns.js` (~170 lines target) — column registry + picker modal + load/save via RPC.
- SPEC folder retros (6 files).

### Modified files (additive only)
- `modules/customers/customer-card-tab-details.js` — add 1 FIELDS_CONTACT row.
- `modules/customers/customer-list.js` — wire up column rendering against current tenant choice.
- `modules/customers/customer-list-filters.js` — toolbar "עמודות" button.
- `modules/customers/customer-card-coming-soon.js` — +4 registry keys.
- `customers.html` — +1 `<script>` for the new file.
- `css/customers.css` — additive picker modal selectors.
- `js/shared-field-map.js` — `'טלפון-עבודה':'phone_secondary'` added to customers map.
- M5 docs (SESSION_CONTEXT + CHANGELOG + MODULE_MAP + db-schema.sql) + global (GLOBAL_MAP + GLOBAL_SCHEMA + DB_TABLES_REFERENCE).

### DB state
- `customers.phone_secondary text` column added; all rows NULL (no backfill).
- `v_customer_full` recreated to expose the new column.
- Demo tenant `tenant_settings` row may exist after smoke S6 with `{"list_columns":[…]}` (legitimate; persists).

### Commits (planned, selective git add)
1. `feat(m5): add customers.phone_secondary column + expose in v_customer_full + render in card contact` — migration + view + card + FIELD_MAP.
2. `feat(m5): per-tenant configurable list columns (picker + tenant_settings persistence)` — customer-list-columns.js + customer-list.js wiring + customer-list-filters.js toolbar + customer-card-coming-soon.js registry + css/customers.css + customers.html script load.
3. `docs(m5): close M5_POLISH_PHONE2_LIST_COLUMNS — retros + M5 docs + GLOBAL_MAP/SCHEMA/DB_TABLES_REFERENCE additive` — retros + state files.

---

## 9. Dependencies / Preconditions

- VISUAL_FIDELITY_GATE applied (M5 surfaces post-fix). Confirmed.
- `tenant_settings` table + `update_customer_display_preferences` RPC deployed. Confirmed.
- localhost:3000 running with demo PIN session.
- `loadSession()` page-boot pattern still in place (Phase D fix).

---

## 10. Pre-Merge Checklist

- [ ] All 21 §3 success criteria pass.
- [ ] All 9 §3a smokes PASS.
- [ ] **Visual-Fidelity Gate (UI SPEC):** TEST_REPORT contains `## Localhost-Tester Visual-Fidelity Gate` section with Step 0 styled-check + stylesheet-link audit + region-by-region tables (card + list); same tables embedded in FOREMAN_REVIEW.md.
- [ ] Integrity Gate exit 0/2.
- [ ] HEAD pushed to develop.
- [ ] NO `-a` flag in any commit.
- [ ] FOREMAN_REVIEW carries 1+1 improvement proposals (small SPEC; relaxed from 2+2).

---

*End of M5_POLISH_PHONE2_LIST_COLUMNS SPEC. Two SaaS-clean improvements. Closes via the Visual-Fidelity Gate. Demo only.*
