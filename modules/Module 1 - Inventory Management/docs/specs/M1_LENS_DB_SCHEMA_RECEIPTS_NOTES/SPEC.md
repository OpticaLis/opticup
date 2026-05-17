# SPEC — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-17
> **Module:** 1 — Inventory Management
> **Phase:** Lens rebuild Phase 0 — Foundation (SPEC 3 of 4 sequential)
> **Author signature:** Claude Code Foreman session, Windows desktop, 2026-05-17
> **Source Brief:** `architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md` §SPEC 3

---

## 0. Pre-Authoring Reality Check

### Critical author-time finding — Brief's SQL is incorrect against live schema

The Brief's §SPEC 3 assumed a table named `lens_variant_stock_entries` with 4 columns to add (`delivery_note_number`, `supplier_id`, `has_no_invoice`, `receipt_date`). The Brief itself explicitly authorized verification ("Verify against `docs/GLOBAL_SCHEMA.sql` for the actual entry table"). Verification performed 2026-05-17:

**Actual table = `purchase_receipt`** (created by Lens-1A migration `20260514180300_m1_lens_phase_1a_operations_governance.sql`).

**Existing columns** (already in `purchase_receipt`):
- `supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT` ✅ (Brief wanted to add — already there)
- `delivery_note_number TEXT NOT NULL` ✅ (Brief wanted to add — already there)
- `goods_received_at TIMESTAMPTZ NOT NULL DEFAULT now()` — covers Brief's `receipt_date` intent (TIMESTAMPTZ is strictly richer than DATE)

**Missing column** (only this needs to be added):
- `has_no_invoice BOOLEAN NOT NULL DEFAULT FALSE` ← the only ALTER TABLE deliverable for this SPEC

This is a Rule 21 win caught at SPEC authoring time — without this verification, the executor would have attempted 4 ADD COLUMNs, 3 of which would fail with "column already exists" errors. The Brief's `lens_variant_stock_entries` table name was a guess; reality differs.

### Other tables verified

- `lens_variant_notes` — does NOT exist anywhere in the schema (grep returned 0 hits). Net-new, no Rule 21 conflict.
- `lens_variant` — exists per `supabase/migrations/20260514180000_m1_lens_phase_1a_global_catalog.sql` + module schema. Valid FK target for `lens_variant_notes.variant_id`.
- Permission keys `inventory.view_cost_price` + `lens_pricing.edit` — neither exists (grep on GLOBAL_SCHEMA + module schemas returned 0 hits). Both clean.

### Tenant scope decision

Per Iron Rules 14 + 15 + 18, the new `lens_variant_notes` table MUST have:
- `tenant_id UUID NOT NULL REFERENCES tenants(id)` ✅
- RLS enabled with canonical JWT-claim USING clause ✅
- Tenant-scoped UNIQUE if any UNIQUE constraint added (e.g., if one-note-per-variant-per-author, the UNIQUE would be on `(variant_id, author_id, tenant_id)`; since the Brief allows multiple notes per variant per author, no UNIQUE is needed beyond PRIMARY KEY id)

### Runtime semantics rehearsal (per SECURITY_HOTFIX_2 P-AUTHOR-2)

For `lens_variant_notes` RLS:
- (a) **anon caller with no JWT** → `current_setting('request.jwt.claims', true)` returns NULL → JSON parse of NULL → `tenant_id` claim is NULL → `tenant_id = NULL::uuid` → returns NULL (not FALSE) → policy denies (NULL is not TRUE) ✅ correct denial
- (b) **authenticated caller with WRONG tenant_id** → claim has wrong UUID → mismatch → policy denies ✅
- (c) **service_role caller** → `service_bypass` policy (USING true) ✅ grants
- (d) **Reads from variant context** → consumer must include `.eq('variant_id', x).eq('tenant_id', getTenantId())` defense-in-depth (Iron Rule 22) — this is consumer code in SPEC 5 (pricing rebuild), not in this SPEC

No NULL-comparison traps. Canonical pattern matches `pending_sales` reference implementation.

### Permission key seeding pattern

Existing permission seeds use INSERT INTO permissions + INSERT INTO role_permissions. Need to grep the existing permission seeding to match the pattern. Executor pre-flight task.

### Pre-existing untracked files surveyed

None new beyond pre-existing GUARDIAN_ALERTS.md modification (not my scope; leave alone).

### Lessons applied from prior SPECs

- **From `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md`:** Brief assumptions about table names/columns may drift from live schema. The §0 verification is now non-negotiable for any SPEC adding DB columns.
- **From `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md`:** runtime-semantics rehearsal for every new RLS policy. Applied above.
- **From `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md`:** status-column semantics probe — not applicable here (no enum-style columns added).
- **From this Pipeline's SPEC 1 FOREMAN_REVIEW Author Proposal A-1:** pin mockup palette tokens — NOT applicable to DB-only SPEC.

### Baselines

| Symbol | File | Metric | Value (captured 2026-05-17) |
|---|---|---|---|
| `BASE_LENS_VARIANT_NOTES_EXISTS` | Live DB | `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='lens_variant_notes')` | FALSE (expected) |
| `BASE_PURCHASE_RECEIPT_HAS_NO_INVOICE_COL` | Live DB | `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='purchase_receipt' AND column_name='has_no_invoice')` | FALSE (expected) |
| `BASE_PERMISSION_KEY_INVENTORY_VIEW_COST_PRICE` | `permissions` table | `SELECT EXISTS (SELECT FROM permissions WHERE key='inventory.view_cost_price')` | FALSE (expected) |
| `BASE_PERMISSION_KEY_LENS_PRICING_EDIT` | `permissions` table | `SELECT EXISTS (SELECT FROM permissions WHERE key='lens_pricing.edit')` | FALSE (expected) |

---

## 1. Goal

Add the minimal DB schema deltas required by the M1 lens UI rebuild Pipeline: 1 ALTER COLUMN on `purchase_receipt`, 1 new `lens_variant_notes` table with full Iron Rule 14/15/18 compliance, and 2 new permission keys. Unblocks SPEC 4a (Inventory drawer wiring) and SPEC 5 (Pricing rebuild — lens-details drawer notes tab).

---

## 2. Background & Motivation

The Brief's decision #14 (delivery note mandatory on inventory entry) requires a tenant-visible flag on the receipt row indicating whether the receipt was captured WITHOUT an invoice document (`has_no_invoice=TRUE` flows to the bookkeeper's future Invoices Inbox screen — see `architecture-brief/INVOICES_INBOX_PLACEHOLDER.md`). The other delivery-note fields already exist on `purchase_receipt` from Lens-1A.

The Brief's decision #18 (`lens_variant_notes` table) backs the Pricing screen's לוגים+הערות drawer (decision #17). Notes are freeform multi-line text per variant, scoped per tenant, with author attribution + timestamps. The Pricing screen renders them; the View vs Edit mode of the drawer controls CRUD access via the `lens_pricing.edit` permission.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | `develop`, clean post-push | `git status` → "nothing to commit" |
| 2 | Commits produced | 4 (author + ALTER migration + CREATE migration + close) | `git log {SPEC_START}..HEAD --oneline \| wc -l` → 4 |
| 3 | Migration file 1 exists | `supabase/migrations/<timestamp>_m1_lens_purchase_receipt_has_no_invoice.sql` | `ls supabase/migrations/*purchase_receipt_has_no_invoice*` |
| 4 | Migration file 2 exists | `supabase/migrations/<timestamp>_m1_lens_variant_notes.sql` | `ls supabase/migrations/*lens_variant_notes*` |
| 5 | `has_no_invoice` column added | `purchase_receipt.has_no_invoice` BOOLEAN NOT NULL DEFAULT FALSE | Supabase MCP `execute_sql` query against `information_schema.columns` |
| 6 | `lens_variant_notes` table created | columns: id, variant_id, tenant_id, author_id, body, created_at, updated_at — all NOT NULL appropriately | Supabase MCP query |
| 7 | RLS enabled on `lens_variant_notes` | row exists in `pg_tables` with `rowsecurity=true` | Supabase MCP query |
| 8 | RLS policies present | `service_bypass` (service_role) + `tenant_isolation` (public, JWT-claim USING clause) | Supabase MCP query `pg_policies` |
| 9 | Permission keys seeded | `inventory.view_cost_price` + `lens_pricing.edit` in permissions table | Supabase MCP `SELECT key FROM permissions WHERE key IN (...)` |
| 10 | Role grants seeded | `inventory.view_cost_price` granted to admin role; `lens_pricing.edit` granted to admin + manager | Supabase MCP query role_permissions |
| 11 | `docs/GLOBAL_SCHEMA.sql` updated | `lens_variant_notes` section added; `purchase_receipt.has_no_invoice` noted | grep |
| 12 | `docs/DB_TABLES_REFERENCE.md` updated | `T.LENS_VARIANT_NOTES = 'lens_variant_notes'` entry added | grep |
| 13 | Module 1 db-schema.sql updated | `lens_variant_notes` CREATE TABLE present + `purchase_receipt.has_no_invoice` documented | grep |
| 14 | `js/shared.js` FIELD_MAP updated (Iron Rule 5) | new field `has_no_invoice` mapped | grep |
| 15 | Iron Rule 14 (tenant_id NOT NULL) | both new tables/columns satisfy | code review |
| 16 | Iron Rule 15 (RLS with canonical JWT-claim pattern) | both RLS policies match canonical pattern | code review |
| 17 | Iron Rule 18 (no global UNIQUEs without tenant_id) | no UNIQUE constraints added to lens_variant_notes beyond PRIMARY KEY id | code review |
| 18 | Integrity Gate (Iron Rule 31) | exit 0 or 2 | `npm run verify:integrity; echo $?` |
| 19 | Pre-commit hooks clean per commit | 0 violations, 0 warnings (note: SPEC 3 has SQL files with `CREATE TABLE` keyword that the destructive-ops hook may flag; executor must verify hook accepts non-destructive CREATEs) | committed commits' pre-commit output |
| 20 | EXECUTION_REPORT + FOREMAN_REVIEW written | files exist in SPEC folder | `ls` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run read-only SQL (Level 1) — schema introspection via Supabase MCP
- Run Level 3 SQL (CREATE TABLE / ALTER TABLE / CREATE POLICY / INSERT seeding) **under this SPEC's Brief authorization** (per Brief "What this Brief AUTHORIZES" — "DB schema changes per SPEC 3 (delivery notes + variant notes + permission keys)")
- Write migration files under `supabase/migrations/`
- Apply migrations via Supabase MCP
- Update `docs/GLOBAL_SCHEMA.sql`, `docs/DB_TABLES_REFERENCE.md`, `js/shared.js` FIELD_MAP, module db-schema.sql
- Commit and push to `develop`

### What REQUIRES stopping and reporting
- ANY schema change beyond the 3 listed in §3 (only `has_no_invoice`, `lens_variant_notes`, 2 permission keys authorized)
- ANY DDL on `tenants`, `auth.users`, `permissions` infrastructure beyond the 2 new INSERT rows
- ANY Prizma data write (Brief forbids; demo-only seed authorized)
- ANY merge to `main`
- ANY data backfill on existing `purchase_receipt` rows (new column gets DEFAULT FALSE; no backfill needed since FALSE = "user did not check 'אין תעודה' = legacy receipts presumed to have invoices")

---

## 5. Stop-on-Deviation Triggers

In addition to CLAUDE.md §9 globals:

- If Supabase MCP `execute_sql` returns ERROR on any planned DDL → STOP, capture error, escalate (do NOT retry with workaround)
- If pre-flight `information_schema` query shows `purchase_receipt.has_no_invoice` already exists → STOP (means another Pipeline ran ahead of this one; resolve conflict before proceeding)
- If pre-flight shows `lens_variant_notes` table already exists → STOP, same reason
- If pre-commit destructive-ops hook fires on `CREATE TABLE` keyword (false-positive trap per `SECURITY_HOTFIX_3 P-EXEC-2` lesson) → STOP, document the hook trap, escalate (do NOT bypass with `--no-verify`)

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- Pre-author git tag: `pre-m1-lens-db-schema-2026-05-17` placed at SPEC_START commit
- `git reset --hard <tag>` rolls back commits + migration files (but NOT applied DB changes)
- DB rollback (if migrations were applied before rollback decision):
  - `DROP TABLE lens_variant_notes;` (cascades RLS policies)
  - `ALTER TABLE purchase_receipt DROP COLUMN has_no_invoice;`
  - `DELETE FROM role_permissions WHERE permission_key IN ('inventory.view_cost_price', 'lens_pricing.edit');`
  - `DELETE FROM permissions WHERE key IN ('inventory.view_cost_price', 'lens_pricing.edit');`
- Notify Foreman; SPEC marked REOPEN

---

## 7. Destructive Operations

`None.`

This SPEC performs only ADDITIVE schema changes:
- ALTER TABLE ADD COLUMN (additive, no data loss)
- CREATE TABLE (additive)
- CREATE POLICY (additive)
- INSERT INTO permissions / role_permissions (additive)

**Note on destructive-ops hook false-positive:** the hook (`scripts/checks/destructive-ops-declared.mjs`) scans for keywords including `DROP`, `DELETE`, `TRUNCATE`. The migration files in this SPEC do NOT contain these keywords. The §6 Rollback Plan contains `DROP TABLE / DELETE FROM` in COMMENT-form documentation only; per executor SKILL.md "Iron Rule 32 hook comment-awareness" lesson (from SECURITY_HOTFIX_3), comments with these keywords can trigger false-positives. The Rollback Plan above places destructive SQL **inside this SPEC.md**, NOT inside a `.sql` migration file — the hook scans only staged migration files, not SPEC.md content. Safe.

No `git rebase`, `git reset --hard`, `git push --force`, mass renames, or main-branch touches authorized.

---

## 8. Out of Scope (explicit)

- Any UI wiring of the new permission keys — that's SPECs 4a + 5
- Any consumer-screen code referencing `lens_variant_notes` — SPEC 5
- Any UI component for the "אין תעודה" checkbox — already in SPEC 4a's mockup, this SPEC only ships the backing column
- Any backfill of existing `purchase_receipt` rows — DEFAULT FALSE handles legacy
- Any data migration on `permissions` table beyond 2 INSERT seeds
- Iron Rule 9 (Daniel = strategic only) — this SPEC has zero Daniel-facing decisions

---

## 9. Expected Final State

### New files

1. `supabase/migrations/<timestamp>_m1_lens_purchase_receipt_has_no_invoice.sql`:
   ```sql
   ALTER TABLE purchase_receipt
     ADD COLUMN has_no_invoice BOOLEAN NOT NULL DEFAULT FALSE;

   COMMENT ON COLUMN purchase_receipt.has_no_invoice IS
     'TRUE when the user checked "אין תעודה" during receipt entry. Triggers manager-audit exception report. Per Brief decision 14.';
   ```

2. `supabase/migrations/<timestamp>_m1_lens_variant_notes.sql`:
   ```sql
   CREATE TABLE lens_variant_notes (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     variant_id  UUID NOT NULL REFERENCES lens_variant(id) ON DELETE CASCADE,
     tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     author_id   UUID NOT NULL REFERENCES auth.users(id),
     body        TEXT NOT NULL,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   CREATE INDEX idx_lens_variant_notes_variant_id ON lens_variant_notes(variant_id);
   CREATE INDEX idx_lens_variant_notes_tenant_id  ON lens_variant_notes(tenant_id);

   ALTER TABLE lens_variant_notes ENABLE ROW LEVEL SECURITY;

   CREATE POLICY service_bypass ON lens_variant_notes
     TO service_role
     USING (true);

   CREATE POLICY tenant_isolation ON lens_variant_notes
     TO public
     USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);
   ```

3. `supabase/migrations/<timestamp>_m1_lens_permission_seeds.sql`:
   ```sql
   INSERT INTO permissions (key, description) VALUES
     ('inventory.view_cost_price', 'View cost-price columns in inventory + pricing screens')
     ON CONFLICT (key) DO NOTHING;

   INSERT INTO permissions (key, description) VALUES
     ('lens_pricing.edit', 'Edit lens pricing + add/edit/delete variant notes')
     ON CONFLICT (key) DO NOTHING;

   -- Grant inventory.view_cost_price to admin role
   INSERT INTO role_permissions (role_key, permission_key) VALUES
     ('admin', 'inventory.view_cost_price')
     ON CONFLICT DO NOTHING;

   -- Grant lens_pricing.edit to admin + manager roles
   INSERT INTO role_permissions (role_key, permission_key) VALUES
     ('admin', 'lens_pricing.edit'),
     ('manager', 'lens_pricing.edit')
     ON CONFLICT DO NOTHING;
   ```

   **Note:** column names in `permissions` / `role_permissions` may differ from these guesses; executor pre-flight must verify against actual schema before writing the migration file.

### Modified files

- `docs/GLOBAL_SCHEMA.sql` — append `lens_variant_notes` section + update `purchase_receipt` CREATE to note new column
- `docs/DB_TABLES_REFERENCE.md` — add `T.LENS_VARIANT_NOTES`
- `modules/Module 1 - Inventory Management/docs/db-schema.sql` — add `lens_variant_notes` section + update purchase_receipt
- `js/shared.js` FIELD_MAP — add `has_no_invoice` field

### New SPEC folder artifacts

- `SPEC.md` (this file)
- `EXECUTION_REPORT.md` (at close)
- `FOREMAN_REVIEW.md` (at close)
- `FINDINGS.md` (if findings)

### DB state (post-migration)

- `purchase_receipt` has new column `has_no_invoice` BOOLEAN NOT NULL DEFAULT FALSE
- `lens_variant_notes` table exists, RLS enabled, 2 policies present
- `permissions` table has 2 new rows (`inventory.view_cost_price`, `lens_pricing.edit`)
- `role_permissions` has 3 new rows (admin gets both; manager gets `lens_pricing.edit`)

---

## 10. Commit Plan

| # | Subject | Files | Notes |
|---|---------|-------|-------|
| 1 | `chore(spec): author M1_LENS_DB_SCHEMA_RECEIPTS_NOTES SPEC` | SPEC.md | Author commit |
| 2 | `feat(db): m1 lens — add purchase_receipt.has_no_invoice column` | 1 migration file + GLOBAL_SCHEMA + module db-schema + FIELD_MAP additions | ALTER TABLE |
| 3 | `feat(db): m1 lens — create lens_variant_notes table with RLS` | 1 migration file + GLOBAL_SCHEMA + DB_TABLES_REFERENCE + module db-schema additions | CREATE TABLE + policies |
| 4 | `feat(db): m1 lens — seed inventory.view_cost_price + lens_pricing.edit permission keys` | 1 migration file + (no docs update — permission seeding is data) | INSERT seeds |
| 5 | `chore(spec): close M1_LENS_DB_SCHEMA_RECEIPTS_NOTES with retrospective` | EXECUTION_REPORT + FOREMAN_REVIEW + SESSION_CONTEXT + CHANGELOG | Closure |

Total: 5 commits expected.

---

## 11. Dependencies / Preconditions

- **Previous SPEC:** SPEC 1 closed (yes, as of `0949e97`). SPEC 2 NOT required for SPEC 3 — independent.
- **Tools:** Supabase MCP (`mcp__claude_ai_Supabase__execute_sql`, `apply_migration`)
- **Credentials:** Supabase URL + service-role key (already in env per project setup)
- **Live DB state:** must match §0 Baselines (executor pre-flight confirms)

---

## 12. Lessons Already Incorporated

- **FROM** `M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` → Brief assumptions can drift from live schema → APPLIED in §0 (caught the `lens_variant_stock_entries` ≠ `purchase_receipt` discrepancy)
- **FROM** `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` → runtime-semantics rehearsal for RLS → APPLIED in §0
- **FROM** `SECURITY_HOTFIX_3_2026_05_15/FOREMAN_REVIEW.md` → destructive-ops hook comment-awareness → APPLIED in §7 (Rollback Plan SQL kept in SPEC.md, not migration files)
- **FROM** Iron Rule 15 canonical RLS pattern → APPLIED in §9 lens_variant_notes RLS USING clause (JWT-claim, not auth.uid())
- **FROM** Iron Rule 5 (FIELD_MAP) → APPLIED in §9 (`js/shared.js` FIELD_MAP update for new `has_no_invoice` field)

---

## 13. Pre-Merge Checklist

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2
- [ ] `git status --short` returns empty after closure commit
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT.md + FOREMAN_REVIEW.md written in the SPEC folder
- [ ] All 3 migrations applied to demo tenant (NOT Prizma — Brief prohibits Prizma writes)
- [ ] Demo tenant smoke: insert + select + delete a test note via authenticated request; verify wrong-tenant access denied

---

## 14. Authoring Note — Execution Deferred to Dedicated Session

(Foreman transparency note.)

This SPEC was authored by opticup-strategic on 2026-05-17 during the M1 lens mockup-fidelity rebuild Pipeline marathon. The Brief estimates execution at 2h. While SPEC 3's actual scope is smaller than the Brief assumed (1 column ADD instead of 4, all per the §0 verification), the execution still requires:

- Loading Supabase MCP tools
- Pre-flight verification queries against live DB
- Writing 3 migration files
- Applying migrations via MCP
- Updating 4 docs files
- Tier C smoke (insert/select/delete test note + wrong-tenant rejection check)

Plus this SPEC is **Level 3 SQL** (CREATE TABLE / ALTER TABLE) which under the opticup-executor protocol normally requires explicit Daniel authorization — the Brief's blanket authorization covers it, but the executor's pre-flight should still confirm via a brief Hebrew status to Daniel ("מתחיל סכמת DB עדשות SPEC 3 לפי Brief autorization — ATER TABLE + CREATE TABLE + 2 הרשאות, רק demo, מאשר?") before any DDL fires. This is consistent with `opticup-executor` SKILL.md SQL Autonomy §Level 3 wording ("Always stops at Daniel. No exceptions.") — even when a Brief authorizes, a final go-ahead confirmation is best practice for DDL.

**Recommended execution path:**

1. Open a fresh opticup-executor session
2. Read this SPEC + verify §0 Baselines via Supabase MCP queries
3. Final Hebrew status to Daniel confirming DDL intent
4. Per-migration execution + apply + verify per §3 criteria
5. Tier C smoke
6. Docs updates + closure

Authoring without execution is honest hand-off when scope demands dedicated session attention. The discovery work (table-name reality check + column-existence) is captured here, making the executor's run much faster.

---

*End of SPEC. Authored 2026-05-17 by opticup-strategic (Foreman) — execution deferred to dedicated session.*
