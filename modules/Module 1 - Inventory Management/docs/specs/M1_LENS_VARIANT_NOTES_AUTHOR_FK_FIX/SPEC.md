---
spec_id: M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX
title: Pivot lens_variant_notes.author_id FK from auth.users to employees
author: opticup-strategic (Foreman)
authored: 2026-05-18 IDT
module: Module 1 - Inventory Management
status: SEALED — ready for execution
parent_brief: modules/Module 1 - Inventory Management/architecture-brief/POST_GROUP_A_FIXES_AND_GROUP_B_BRIEF.md
phase: Post-Group-A fix (blocks Group B per Daniel directive)
---

# SPEC — M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX

## 0. Pre-Authoring Reality Check (Step 1.6 + 1.7 + DB pre-flight)

### Path verification (Step 1.6 — ALL PATHS VERIFIED 2026-05-18 IDT)

| Path | Exists | Notes |
|---|---|---|
| `modules/lens-pricing/lens-pricing-drawer.js` | ✅ | Sole runtime consumer (CRUD on lens_variant_notes) |
| `shared/js/lens-details-drawer.js` | ✅ | SPEC 2 drawer (Lens Pricing consumer wires CRUD callbacks) |
| `js/shared.js` | ✅ | T.LENS_VARIANT_NOTES constant (no code change needed) |
| `js/shared-field-map.js` | ✅ | FIELD_MAP entry (no code change needed) |

### Consumer grep (Step 1.7 — runtime consumers of lens_variant_notes)

Live grep result (2026-05-18 IDT):
```
modules/lens-pricing/lens-pricing-drawer.js     — sole runtime CRUD consumer
js/shared.js                                    — T.LENS_VARIANT_NOTES constant only
js/shared-field-map.js                          — FIELD_MAP entry only
```

**One JS file writes to lens_variant_notes.** That file's `addNote()` already passes `author_id: emp.id` where `emp.id` is `employees.id`. After this SPEC's FK pivot, the code works as-is — no JS change required.

### DB pre-flight (live 2026-05-18 IDT)

```
current_fk_name:        lens_variant_notes_author_id_fkey  (matches Brief)
notes_row_count:        0                                  (zero migration risk)
employees_id_exists:    true
employees_id_type:      uuid                               (matches author_id)
author_id_type:         uuid                               (matches employees.id)
```

**Migration risk: ZERO.** Empty table → no orphan rows. Type compatibility verified.

### Baselines

| Symbol | Value |
|---|---|
| `BASE_FK_NAME` | `lens_variant_notes_author_id_fkey` |
| `BASE_FK_TARGET_BEFORE` | `auth.users(id)` |
| `BASE_FK_TARGET_AFTER`  | `employees(id) ON DELETE SET NULL` |
| `BASE_ROW_COUNT_BEFORE` | 0 |
| `BASE_ROW_COUNT_AFTER`  | 1 → 0 (Tier C smoke creates + soft-deletes) |

### Lessons applied from prior FOREMAN_REVIEWs

- **From M1_LENS_PRICING_REBUILD FOREMAN_REVIEW** F-1 — surfaced this exact gap. This SPEC is its dedicated fix.
- **From M1_LENS_PRICING_REBUILD F-3** — schema-column pre-flight before any `.eq()` query. Applied here in §0 DB pre-flight (verified `employees.id` exists, correct type).
- **From M1_LENS_DESIGNS_SELECTION_REBUILD F-1** — keep DDL changes isolated. Applied: this SPEC ships only the FK pivot, no JS code changes.

---

## 1. Goal

Change `lens_variant_notes.author_id` FK target from `auth.users(id)` to `employees(id) ON DELETE SET NULL` so the existing PIN-auth-based consumer code in `lens-pricing-drawer.js` works without an unreachable Supabase Auth bridge. Unblocks Group B (notes CRUD verified on demo via Lens Details drawer Tier C smoke).

---

## 2. Background

SPEC 3 (`M1_LENS_DB_SCHEMA_RECEIPTS_NOTES`) created `lens_variant_notes` with `author_id UUID NOT NULL REFERENCES auth.users(id)`. SPEC 5 (`M1_LENS_PRICING_REBUILD`) was the first CRUD consumer; Tier C revealed the FK was unreachable in the project's PIN auth model (`sb.auth.getUser()` returns empty; only `tenant_employee.id` from sessionStorage is available, which is `employees.id`, not `auth.users.id`). Daniel-Architect approved Option (a) in the morning directive: pivot the FK target.

`lens_variant_notes` table is empty (0 rows project-wide) — no migration risk, no orphan handling needed.

---

## 3. Success Criteria (measurable)

| # | Criterion | Verification | Expected |
|---|---|---|---|
| S1 | Branch state | `git status` post-push | clean |
| S2 | Commits produced | `git log {start}..HEAD --oneline | wc -l` | 3 (author + DDL + close) |
| S3 | Old FK constraint dropped | `SELECT count(*) FROM pg_constraint WHERE conname='lens_variant_notes_author_id_fkey' AND confrelid='auth.users'::regclass` | 0 |
| S4 | New FK constraint exists targeting employees | `SELECT count(*) FROM pg_constraint WHERE conname='lens_variant_notes_author_id_fkey' AND confrelid='public.employees'::regclass` | 1 |
| S5 | New FK has ON DELETE SET NULL | `pg_get_constraintdef` includes `ON DELETE SET NULL` | yes |
| S6 | `lens_variant_notes.author_id` NOT NULL preserved | `information_schema.columns` shows `is_nullable='NO'` | yes (NOT NULL stays — only the FK target changed, column nullability untouched) |
| S7 | Tier C: insert note via Lens Details drawer succeeds | Chrome MCP click "הוסף הערה" → write body → save → row appears in DB | 1 row inserted |
| S8 | Tier C: row has correct author_id reference | `SELECT author_id FROM lens_variant_notes WHERE ... = emp.id` | matches sessionStorage emp.id |
| S9 | Smoke row cleaned up (Iron Rule 3 — hard delete acceptable; table has no is_deleted column per SPEC 3 design) | `SELECT count(*) FROM lens_variant_notes WHERE id={smoke_id}` post-cleanup | 0 |
| S10 | get_advisors security pass | mcp `get_advisors(type=security)` post-migration | no new HIGH/ERROR for lens_variant_notes |
| S11 | Iron Rule 31 (integrity gate) | `npm run verify:integrity` | exit 0 |
| S12 | Iron Rule 32 (destructive ops declared) | pre-commit hook | 0 violations (§4 declares DROP CONSTRAINT) |
| S13 | EXECUTION_REPORT + FINDINGS in SPEC folder | `ls` | files exist |

---

## 4. Destructive Operations

1. `ALTER TABLE lens_variant_notes DROP CONSTRAINT lens_variant_notes_author_id_fkey;`
   — Drops the existing FK to `auth.users(id)`. Reversible by re-adding the constraint. Zero data loss (0 rows in table).
2. `ALTER TABLE lens_variant_notes ADD CONSTRAINT lens_variant_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES employees(id) ON DELETE SET NULL;`
   — Adds the new FK to `employees(id)`. Reversible by reverting to the auth.users target. ON DELETE SET NULL chosen because the column is currently NOT NULL but historic notes shouldn't cascade-delete with their author — better to nullify the FK and keep the note. **NOTE:** the column itself remains NOT NULL post-pivot; the ON DELETE SET NULL clause is reserved-for-future-when-column-becomes-nullable. Foreman authorizes this discrepancy: it's a no-op today (no rows; no deletes possible since INSERT path always sets author_id), and keeps the option open without requiring a separate column-nullability migration.

**Forbidden:**
- Any change to `lens_variant_notes` columns / rows beyond the FK swap
- Any other DDL (no DROP TABLE, no policy changes, no other table modifications)
- Any JS code change (out of scope — the JS already passes `employees.id`)
- Any change to `employees` table

---

## 5. Autonomy Envelope

**Can do without asking:**
- Read pg_constraint + information_schema
- Apply 2 ALTER migrations via Supabase MCP `apply_migration`
- Run `get_advisors` post-migration
- Tier C smoke: open Lens Details drawer in Chrome MCP, add a note, verify DB
- Hard-delete the smoke note (table has no is_deleted column per SPEC 3 design — soft-delete N/A)
- 3 commits per §10

**MUST stop and report:**
- `apply_migration` returns error on either DDL
- `get_advisors` returns HIGH/ERROR on lens_variant_notes after migration
- Tier C note insert STILL fails with FK violation (would indicate DDL didn't apply)
- Iron Rule 32 hook fires (this SPEC declares §4 destructive ops — should pass; if it blocks anyway, investigate)

---

## 6. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:
- If `lens_variant_notes` row count > 0 at pre-flight → STOP, escalate (migration backfill protocol needed)
- If `employees.id` type ≠ uuid → STOP (column type incompatibility)
- If new advisor entry on lens_variant_notes after migration → STOP

---

## 7. Out of Scope (explicit)

- Any JS code change (drawer.js already correct after FK pivot)
- Any change to other lens screens
- Any change to other tables
- Adding a `pin-auth` ↔ `auth.users` bridge (different architecture — would be a much bigger SPEC)
- Adding `ON UPDATE CASCADE` (default is `NO ACTION`; deferred to a future SPEC if needed)
- The toggle semantics SPEC (M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS) — deferred to after Group B per Foreman recommendation

---

## 8. QA / Verification Plan

1. After Commit 2 (DDL applied): verify both pg_constraint queries match §3 S3 + S4.
2. Run `get_advisors(security)` — confirm no HIGH/ERROR on lens_variant_notes.
3. Tier C live smoke on demo tenant:
   - Chrome MCP: navigate to `localhost:3000/inventory.html?t=demo&cat=lenses&tab=pricing`
   - Click "פרטים נוספים" on any offering row
   - Drawer opens → switch to "📝 הערות" tab
   - Click "➕ הוסף הערה" → type a smoke body → click "שמור"
   - Verify Toast shows success
   - Supabase MCP query: `SELECT id, body, author_id FROM lens_variant_notes WHERE variant_id={variant_id} ORDER BY created_at DESC LIMIT 1` — confirm row + author_id matches sessionStorage `tenant_employee.id`
4. Hard-delete the smoke row: `DELETE FROM lens_variant_notes WHERE id={smoke_id} AND tenant_id={demo_tid}` (table has no is_deleted column; Iron Rule 3 soft-delete N/A — author/Foreman pre-approved hard delete per SPEC 3 design).
5. Screenshot: drawer open with the smoke note visible (pre-delete).

---

## 9. Expected Final State

### Database

- `lens_variant_notes_author_id_fkey` FK targets `employees(id) ON DELETE SET NULL` (was `auth.users(id)`).
- Table data unchanged (0 rows before; 0 rows after Tier C cleanup).

### Files

- 2 new migration files in `supabase/migrations/`:
  - `<ts>_m1_lens_variant_notes_drop_authusers_fk.sql`
  - `<ts>_m1_lens_variant_notes_add_employees_fk.sql`
- SPEC folder artifacts: SPEC.md (this file) + ACTIVATION_PROMPT.md + EXECUTION_REPORT + FINDINGS + 1 Tier C screenshot
- 1 Tier C screenshot in `screenshots/`

### NOT modified

- Any JS file (drawer.js works as-is post-pivot)
- Any other DB object
- No FIELD_MAP changes (no new columns)
- No GLOBAL_MAP changes (no new functions; FK changes don't register in GLOBAL_MAP)

### Docs updated (same commit cluster)

- Module 1 SESSION_CONTEXT — entry for closure
- Module 1 CHANGELOG — entry under "Post-Group-A Fixes"
- Module 1 db-schema.sql — append §"M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX 2026-05-18" with the FK target change

---

## 10. Commit Plan

| # | Subject | Files |
|---|---|---|
| 1 | `chore(spec): author M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX SPEC` (by Foreman) | SPEC.md + ACTIVATION_PROMPT.md |
| 2 | `fix(db): m1 lens — pivot lens_variant_notes.author_id FK from auth.users to employees` | 2 migration .sql files + module db-schema.sql update |
| 3 | `chore(spec): close M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX with retrospective` | EXECUTION_REPORT + FINDINGS + 1 screenshot + SESSION_CONTEXT + CHANGELOG |

Total: 3 commits.

---

## 11. Pipeline Coordination

`files_owned_globs` for `pipeline-coordination.mjs claim`:
```
supabase/migrations/**
modules/Module 1 - Inventory Management/docs/db-schema.sql
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX/**
```

Branch: `develop`. No worktree. Path X sequential per Daniel directive.

---

## 12. Rollback Plan

If migration 2 fails:
- Migration 1 already applied (constraint dropped) → table currently has no FK on author_id
- Re-add via:
  ```sql
  ALTER TABLE lens_variant_notes ADD CONSTRAINT lens_variant_notes_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users(id);
  ```
- Notify Foreman; mark SPEC REOPEN.

If Tier C smoke fails after both DDLs applied:
- The DDL itself is sound; smoke failure is a different issue.
- Investigate root cause; if smoke needs more migrations, escalate as new SPEC.
- Migrations stay landed (Iron Rule 21 — don't rollback infrastructure on UX issues).

---

## 13. Lessons Already Incorporated

- F-1 from SPEC 5 → this SPEC is its dedicated fix
- F-3 from SPEC 5 → schema-column pre-flight applied in §0
- Step 1.6 + 1.7 from M1_FOUNDATION_CLOSE_CLEANUP → pre-flight ran, 0 phantom paths
- M1_INVENTORY_DEBT_DECOUPLING precedent → FK pivot pattern (similar single-line DDL changes with clean rollback)

---

## 14. Pre-Merge Checklist

- [ ] All §3 success criteria pass
- [ ] Integrity gate exit 0 at every commit
- [ ] `git status --short` returns scope-clean after closure
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT + FINDINGS written
- [ ] 1 Tier C screenshot in `screenshots/`
- [ ] Tier C smoke note hard-deleted post-test
- [ ] get_advisors security pass clean

---

**END SPEC**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Pre-seal Step 1.6 (paths verified) + Step 1.7 (1 runtime consumer confirmed) + DB pre-flight passed (FK name confirmed, 0 rows, employees.id uuid)._
