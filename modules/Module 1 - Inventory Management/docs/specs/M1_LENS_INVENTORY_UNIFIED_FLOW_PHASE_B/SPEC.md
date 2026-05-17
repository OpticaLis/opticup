# SPEC — M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Claude Code, 2026-05-18 evening
> **Authored on:** 2026-05-18
> **Module:** 1 — Inventory Management
> **Phase (within Pipeline):** B — Settings UI for default supplier
> **Parent Brief:** `architecture-brief/M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md` §4
> **Pipeline:** `M1_LENS_INVENTORY_UNIFIED_FLOW` (Phase A 🟢 CLOSED; Phase B starts now)

---

## 0. Pre-Authoring Reality Check

- Brief §4 read in full. Phase A schema delivered, both tenants now have a `default_supplier_id` column on `tenants` (Prizma → בדולח via Daniel-authorized backfill `966c5d2`; demo → AZMON).
- Settings architecture probed:
  - `settings.html` = 292 lines. 4 sections in tab-general (Business / Financial / Display / AI Learning) + Save Settings button at line 170-172. New section anchor will be BETWEEN AI Learning (line 168) and Save button (line 170).
  - `modules/settings/settings-page.js` = 296 lines. Uses `SETTINGS_FIELDS` array (lines 8-22) — element id → DB column → type. `loadSettings()` reads tenants row, `renderSettings()` populates fields by iterating SETTINGS_FIELDS, `saveSettings()` builds updates object from SETTINGS_FIELDS and runs single `UPDATE tenants ... WHERE id = tenantId`. Permission gate: `hasPermission('settings.edit')`.
- Brief §4.2 says "PIN-verified (consistent with other settings changes)" — BUT current `saveSettings()` does NOT PIN-verify (only `hasPermission('settings.edit')`). Iron Rule 8 specifically scopes PIN verification to quantity changes. Resolved in §0.C below.
- Brief §4.3 step 4 ("Re-open inventory screen → manual-add panel auto-fills") depends on Phase C's manual-add refactor (current `lens-inventory-partial.html` manual-add doesn't have a supplier field yet). Resolved in §0.C below.
- DB pre-flight: `settings.inventory.manage` permission key DOES NOT exist (confirmed live DB query). Genuinely new.
- Existing `settings.*` permissions: only `settings.view` and `settings.edit`. No collision risk.

### 0.B — Lessons applied from prior FOREMAN_REVIEWs (M1 module)

| Lesson | Source | How honored |
|---|---|---|
| P-AUTHOR-1 (heading-format pre-validation) | M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A | Heading `## 4. Destructive Operations` (no suffix) used here — pre-verified |
| P-AUTHOR-2 (verify arithmetic in §3 parentheticals) | M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A | All grant-matrix arithmetic hand-computed before §3 commit |
| Rule 21 extend-don't-duplicate | M1_CONTACT_LENSES_ACCESSORIES | Settings save uses existing `SETTINGS_FIELDS` array + existing `saveSettings()` flow — no new save handler |
| Brief-vs-DB reality resolution at AUTHOR time | M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A §0.C | 2 Brief drifts resolved in §0.C below |

### 0.C — Cross-Reference Check (Rule 21) + Brief-vs-DB reality

| New name | Hits | Resolution |
|---|---|---|
| `settings.inventory.manage` (perm key) | 0 (live DB) | Genuinely new |
| `loadSupplierOptions` (JS function) | 0 (grep modules/*) | Genuinely new |
| `set-default-supplier` (DOM id) | 0 (grep settings.html) | Genuinely new |
| `inventory_settings` section id | N/A | Adopted CSS class pattern `.settings-section` from existing 4 sections — no new selectors |

**Brief drift B-1: PIN verification.** Brief §4.2 claims "PIN-verified (consistent with other settings changes)". Live audit of `saveSettings()` shows NO PIN check — only `hasPermission('settings.edit')`. Iron Rule 8 scopes PIN specifically to quantity changes. **Resolution:** Honor the Brief intent via TWO permission gates (`settings.edit` page-level + `settings.inventory.manage` field-level) instead of PIN. Document this divergence in EXECUTION_REPORT §5 and FINDINGS as INFO (so Daniel can decide later if he wants PIN added to settings broadly). Rationale: adding PIN to one settings field but not others creates UX inconsistency; the right path is either project-wide settings-PIN or no PIN.

**Brief drift B-2: §4.3 Tier C step 4 cross-phase dependency.** Brief §4.3 step 4 says "Re-open inventory screen → manual-add panel auto-fills with the default". Live audit of `lens-inventory-partial.html` shows manual-add panel does NOT have a supplier field today (Phase C §5.2 adds it). **Resolution:** Phase B Tier C VFV covers steps 1-3 only; step 4 is documented as CROSS-PHASE VERIFICATION DEFERRED TO PHASE C in §3 row 11 (Phase C's Tier C will cross-verify the Phase B → Phase C handoff).

Cross-Reference Check completed 2026-05-18 evening: **0 collisions, 4 hits resolved + 2 Brief drifts resolved.**

### 0.D — Runtime semantics rehearsal (§5.3 mandate)

Phase B's data write goes through the existing `saveSettings()` — no new RPC, no new RLS, no new view. Runtime rehearsal:

1. **Adding `{ id: 'set-default-supplier', col: 'default_supplier_id', type: 'select' }` to SETTINGS_FIELDS:** existing `saveSettings()` iterates SETTINGS_FIELDS and builds `updates[f.col] = el.value || null`. For type='select', `el.value` is the selected `<option value="">` content — if user picks "(none)" with value="", `updates.default_supplier_id = null` which is valid (FK is nullable + ON DELETE SET NULL). If user picks a supplier, `el.value` is the supplier UUID string, which Postgres coerces to UUID via the column type. No NULL trap.
2. **Loading dropdown:** `loadSupplierOptions()` does `sb.from('suppliers').select('id, name').eq('tenant_id', tenantId).eq('active', true).order('name')` — RLS already filters by tenant on the suppliers table, but Rule 22 defense-in-depth keeps the explicit `.eq('tenant_id', tenantId)`. Existing tenants WITHOUT a default get an empty `<option value="">— בחר ספק —</option>` first; tenants WITH a default get the right `<option>` pre-selected via `renderSettings()`.
3. **Permission gating:** field shown only if `hasPermission('settings.inventory.manage')`. ceo + manager get it per the §10 grant matrix (mirroring Phase A's pattern). team_lead + viewer + worker see the section hidden (display:none on the parent `.settings-section`). The page-level `settings.edit` check still applies to the broader page.
4. **NULL-comparison trap check:** N/A — no SECURITY DEFINER RPCs in Phase B. Existing `saveSettings()` uses `sb.from('tenants').update(...).eq('id', tenantId)` — tenant_id implicit via RLS.

No runtime semantics issues. Rehearsed: yes — settings field add reuses Phase A's already-tested column write path.

### 0.E — Baselines (captured 2026-05-18 evening)

| Symbol | File | Metric | Value |
|---|---|---|---|
| `BASE_LINES_settings_html` | `settings.html` | `wc -l` | 292 |
| `BASE_LINES_settings_page_js` | `modules/settings/settings-page.js` | `wc -l` | 296 |
| `BASE_SETTINGS_FIELDS_count` | `modules/settings/settings-page.js` | array length | 13 |
| `BASE_PERMS_PRIZMA_post_A` | live DB | count | 85 |
| `BASE_RP_PRIZMA_post_A` | live DB | count | 278 |

Expected post-Phase-B values:
- `settings.html` ≈ 310-320 lines (BASE +18 to +28 — one new `.settings-section` block)
- `settings-page.js` ≈ 320-340 lines (BASE +24 to +44 — one new `loadSupplierOptions()` function + 1 array entry + 1 permission-gate function)
- SETTINGS_FIELDS = 14 entries (BASE +1)
- PERMS_PRIZMA = 86 (BASE +1), PERMS_DEMO = 86 (BASE +1)
- RP_PRIZMA = 283 (BASE +5 = 5 roles × 1 new perm), RP_DEMO = 283 (BASE +5)

---

## 1. Goal

Ship the Settings page UI section that lets a manager set their tenant's `default_supplier_id` from a searchable dropdown of active suppliers. Persist via the existing `saveSettings()` `UPDATE tenants` flow. Permission-gated by a new `settings.inventory.manage` key (ceo + manager only, matching the Phase A grant matrix). Verified end-to-end on demo via Tier C VFV.

## 2. Background & Motivation

Phase A added the `default_supplier_id` column + Daniel-authorized the Prizma backfill to בדולח. Demo + Prizma both now have a default supplier. Phase B exposes the per-tenant configuration UX so future onboarding tenants can pick their own default without DB intervention. The Phase C "3 add-stock flows" (next phase) will read this column to pre-fill the supplier input on every add-stock surface (Quick Scan / Manual Add / Full Receive).

The mockup files don't show this surface (per Brief §9 "The mockups don't show the new Quick Scan drawer + Undocumented checkbox — those are NEW UX patterns from this Brief"). Visual style follows existing settings-section pattern (gold accent, white surfaces, label-above-input grid).

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | `develop`, clean post-commits | `git status` → clean |
| 2 | Commits produced | 3 (Seed + Implementation + Close) | `git log <SAFETY_TAG>..HEAD --oneline | wc -l` → 3 |
| 3 | Safety tag exists | `pre-m1-inv-unified-flow-phase-b-2026-05-18` | `git tag -l 'pre-m1-inv-unified-flow-phase-b-2026-05-18'` → matches |
| 4 | `settings.html` size | 292 ≤ N ≤ 325 | `wc -l settings.html` |
| 5 | `settings.html` contains new section | exactly 1 occurrence of "ניהול מלאי" + 1 of `id="set-default-supplier"` | `grep -c "ניהול מלאי" settings.html` → 1; `grep -c 'id="set-default-supplier"' settings.html` → 1 |
| 6 | `settings-page.js` size | 296 ≤ N ≤ 345 | `wc -l modules/settings/settings-page.js` |
| 7 | SETTINGS_FIELDS contains new entry | exactly 1 entry with `col: 'default_supplier_id'` | `grep -c "default_supplier_id" modules/settings/settings-page.js` → ≥2 (1 in SETTINGS_FIELDS + 1+ in loadSupplierOptions docstrings/labels) |
| 8 | `loadSupplierOptions` function exists | function definition + call site in loadSettings | `grep -c "loadSupplierOptions" modules/settings/settings-page.js` → ≥2 |
| 9 | `settings.inventory.manage` perm key seeded × 2 tenants | 2 rows in `permissions` | `SELECT count(*) FROM permissions WHERE id = 'settings.inventory.manage'` → 2 |
| 10 | Role grants seeded correctly | 10 rows (5 roles × 1 perm × 2 tenants) with granted=true ONLY for `ceo` and `manager` | SQL probe → 10 total, 4 granted=true |
| 11 | Tier C VFV (Phase B scope, criteria 1-3 from Brief §4.3) | demo Tester: (a) field visible to manager role, (b) dropdown loads active demo suppliers, (c) save → demo `tenants.default_supplier_id` updates to selected value | Localhost-Tester report — TEST_REPORT.md ✓ all 3 PASS + screenshots |
| 11.X | Tier C VFV step 4 cross-phase | Brief §4.3 step 4 ("inventory auto-fill") = DEFERRED TO PHASE C | Documented in TEST_REPORT.md as cross-phase verification (Phase C closes this) |
| 12 | M1 db-schema.sql updated | Phase 2 section appended with `settings.inventory.manage` documentation | `grep -c "settings.inventory.manage" "modules/Module 1 - Inventory Management/docs/db-schema.sql"` → ≥1 |
| 13 | Smoke 7/7 PASS | unchanged | `npm run smoke` → 7/7 |
| 14 | Iron Rule 31 integrity gate | exit 0 every commit | `npm run verify:integrity; echo $?` → 0 |
| 15 | Iron Rule 32 declared ops only | every destructive op in this SPEC is in §4 | manual diff vs §4 list |
| 16 | Prizma row delta | exactly 0 rows changed in ANY Prizma DATA table (purchase_receipt + tenants); permissions +1, role_permissions +5 | pre/post probe |

---

## 4. Destructive Operations

Declared list:

1. INSERT × 2 into `permissions` (`settings.inventory.manage` × 2 tenants) — `ON CONFLICT (id, tenant_id) DO NOTHING`
2. INSERT × 10 into `role_permissions` (5 roles × 1 perm × 2 tenants — 4 granted=true, 6 granted=false) — `ON CONFLICT DO NOTHING`
3. File edits: `settings.html` (additive — new `.settings-section` block inserted between AI Learning and Save button)
4. File edits: `modules/settings/settings-page.js` (additive — 1 entry in SETTINGS_FIELDS array + 1 new function `loadSupplierOptions()` + 1 call from `loadSettings()` + 1 permission-gate function `gateInventorySection()`)
5. File edits: `modules/Module 1 - Inventory Management/docs/db-schema.sql` (append-only — Phase B section)
6. `git tag pre-m1-inv-unified-flow-phase-b-2026-05-18` at parent commit

**Explicitly forbidden in this SPEC:**
- ANY write to Prizma tenant DATA tables (`tenants` row, `purchase_receipt`). The +1 permission and +5 role_permissions Prizma rows are the only authorized Prizma writes.
- DROP / ALTER COLUMN / DROP COLUMN / DROP POLICY / TRUNCATE / DELETE
- main branch touches / force-push / rebase
- Modifying existing SETTINGS_FIELDS entries (only adding 1 new entry)
- Modifying `saveSettings()` flow (only consuming the new entry via the existing iteration)
- Adding PIN verification to settings (Brief drift B-1; deferred — see §0.C)

If the Executor encounters a need for any forbidden op → write an escalation file + STOP.

---

## 5. Stop-on-Deviation Triggers (beyond global)

Stop and escalate if:
1. `settings.html` post-edit lines outside [292, 325] range — investigate, may indicate inadvertent rewrite.
2. `settings-page.js` post-edit lines outside [296, 345] — same investigation.
3. Existing SETTINGS_FIELDS entries removed or modified (only additions allowed).
4. `saveSettings()` signature or body changed beyond adding the new field via existing iteration.
5. Any modification to PIN-related code anywhere in the repo.
6. Smoke 7/7 breaks post-implementation.
7. `pre-commit verify` violations.
8. Tier C VFV criteria 1, 2, or 3 fail on demo.

---

## 6. Rollback Plan

| What | How |
|---|---|
| Failed Phase B | `git reset --hard pre-m1-inv-unified-flow-phase-b-2026-05-18` |
| Revert permission seed | `DELETE FROM role_permissions WHERE permission_id = 'settings.inventory.manage';` + `DELETE FROM permissions WHERE id = 'settings.inventory.manage';` |
| Tenant data | No tenant data writes in Phase B (only schema-adjacent perm seeding) — nothing to revert |

---

## 7. Out of Scope

- Phase C work (extending `m1_create_receipt_from_box` RPC, the 3 add-stock flows, manual-add supplier field).
- PIN verification on settings save (Brief drift B-1; deferred).
- Settings tab restructuring (Brief's "new sub-section" interpreted as a 5th `.settings-section` block within the existing tab-general, not a new tab).
- Restructuring `SETTINGS_FIELDS` array shape (only adding 1 entry).
- New CSS files or selectors (reuse existing `.settings-section` + `.settings-grid` + `.settings-field` patterns).
- Touching MODULE_MAP.md, MODULE_SPEC.md, ROADMAP.md (Pipeline-wide Integration Ceremony at Pipeline close).

---

## 8. Expected Final State

After Phase B:
- 3 new commits on develop above safety tag.
- `settings.html` grows by ~25 lines (one new `.settings-section` block).
- `modules/settings/settings-page.js` grows by ~30 lines (1 SETTINGS_FIELDS entry + `loadSupplierOptions()` + `gateInventorySection()` + 2 call sites in `loadSettings()`).
- Live DB: `permissions` +2 rows; `role_permissions` +10 rows; no tenant data writes.
- M1 db-schema.sql appends a Phase B section.
- Tier C VFV 3/3 PASS on demo (steps 1-3 from Brief §4.3); step 4 deferred to Phase C.
- Smoke 7/7 PASS.

---

## 9. Commit Plan

| # | Slug | Description | Contains |
|---|------|-------------|----------|
| 1 | C-B0 | `chore(spec): seed M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_B SPEC + safety tag` | This SPEC.md + safety tag |
| 2 | C-B1 | `feat(m1-inv): Phase B — Settings UI for default supplier + perm seed` | settings.html + settings-page.js + db-schema.sql + permission migration via Supabase MCP + SPEC §13.A marker |
| 3 | C-B2 | `chore(m1-inv-phase-b): close — EXECUTION_REPORT + FINDINGS` | EXECUTION_REPORT.md + FINDINGS.md |

---

## 10. Permission Grant Matrix (Reference)

For the 1 new permission key, the grant matrix is the SAME for both tenants (mirrors Phase A pattern):

| Role         | settings.inventory.manage |
|--------------|---------------------------|
| `ceo`        | granted=true              |
| `manager`    | granted=true              |
| `team_lead`  | granted=false             |
| `worker`     | granted=false             |
| `viewer`     | granted=false             |

= 5 roles × 1 perm = 5 rows per tenant × 2 tenants = 10 `role_permissions` rows total.

---

## 11. Lessons Already Incorporated

- §0.C explicit Brief-vs-DB resolution for both PIN-verification drift (B-1) and cross-phase Tier C step (B-2) — prevents executor confusion + prevents scope creep into Phase C.
- §3 SETTINGS_FIELDS extension pattern reuses existing infrastructure per Rule 21 (no new `saveSettings()` handler).
- §3 row 16 explicitly splits Prizma data-table delta = 0 from Prizma permission-row delta = +6 — same discipline as Phase A.
- §3 row 11.X documents the cross-phase deferral so Phase C's Tier C closes the loop.

---

## 12. References

- Brief §4: `architecture-brief/M1_LENS_INVENTORY_UNIFIED_FLOW_BRIEF.md`
- Phase A predecessor SPEC + FOREMAN_REVIEW: `M1_LENS_INVENTORY_UNIFIED_FLOW_PHASE_A/`
- Settings architecture: `settings.html` + `modules/settings/settings-page.js`
- Daniel's Prizma backfill commit: `966c5d2`

---

## 13. Execution Marker (for Iron Rule 32 pre-commit hook)

> SPEC.md will be staged in the same commit as the destructive ops (C-B1). The Iron Rule 32 hook reads §4 to validate destructive ops. Executor MUST `git add` SPEC.md alongside the migration/code files in C-B1 (with §13.A Marker appended).

### 13.A — Migrations + edits applied (Executor, C-B1)

| # | Migration / File | Type | Affects |
|---|------------------|------|---------|
| 1 | `m1_unified_flow_b_settings_inventory_manage_perm` | DML | +2 permissions rows + 10 role_permissions rows |
| 2 | `settings.html` | edit | +15 lines — new `.settings-section` (id=settings-section-inventory) inserted between AI Learning section and Save button; contains `<select id="set-default-supplier">` |
| 3 | `modules/settings/settings-page.js` | edit | +42 lines — SETTINGS_FIELDS gets `set-default-supplier`/`default_supplier_id`/`select` entry; new `gateInventorySection()` + `loadSupplierOptions()` functions; both called from `loadSettings()` before render |
| 4 | `modules/Module 1 - Inventory Management/docs/db-schema.sql` | append | +37 lines — Phase B section documenting the perm seed |

Post-state verification (executor, pre-commit):
- C4: settings.html = 307 lines (BASE 292, within [292, 325]) ✓
- C5: 1 hit for "ניהול מלאי" + 1 hit for `id="set-default-supplier"` in settings.html ✓
- C6: settings-page.js = 338 lines (BASE 296, within [296, 345]) ✓
- C7: SETTINGS_FIELDS has the `default_supplier_id` entry ✓
- C8: `loadSupplierOptions` defined + called from `loadSettings` (≥2 occurrences) ✓
- C9: `settings.inventory.manage` × 2 tenants = 2 permissions rows ✓
- C10: 10 role_permissions rows / 4 granted=true (ceo+manager × 1 perm × 2 tenants) ✓
- C16: Prizma data tables unchanged (purchase_receipt=0, tenants row count=1); permissions +1, role_permissions +5 — exactly the +6 Prizma rows authorized by §4 ✓

Tier C VFV (Brief §4.3 steps 1-3) deferred to Localhost-Tester stage. Step 4 (inventory auto-fill) cross-phase deferred to Phase C per §0.C drift B-2.

*End of SPEC. Foreman-sealed 2026-05-18 evening. Executor C-B1 closed 2026-05-18 evening.*
