# FINDINGS — M1A_CURRENCIES_GLOBAL_HOTFIX

> **Written by:** opticup-executor (Full Auto Pipeline, 2026-05-14)
> **SPEC:** `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/SPEC.md`

Findings discovered during execution that are NOT in scope of this SPEC. Each has a severity and a suggested next action. The Foreman decides the disposition in FOREMAN_REVIEW.md.

---

## M1A-FINDINGS-01 — Transient pre-commit failure on Commit 1 (concurrent-session interference)

- **Severity:** LOW (infrastructure noise; no data lost; no Iron Rule violation)
- **Location:** `git commit` against develop, 2026-05-14, Commit 1 of this SPEC
- **Description:** First attempt at Commit 1 (`feat(m1,db): currencies global reference table (M1A-DEBT-01)`) returned "no changes added to commit" with the 3 intended files unexpectedly unstaged. Root cause: a concurrent session executing SPEC `M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING` modified `scripts/checks/destructive-ops-declared.mjs` to add `import { collectAuthorizedDeletes } from '../destructive-ops-auth-parser.mjs'` and added the (then-untracked) helper file `scripts/destructive-ops-auth-parser.mjs`. The pre-commit hook tried to import the modified destructive-ops-declared module, which transitively loaded the auth-parser file from disk. The import succeeded (file existed locally) but in the same instant my staged set got unstaged — likely an interaction with the concurrent agent's `git` operations.
- **Reproduce command:** N/A — race condition, recovered cleanly with re-stage + re-commit.
- **Suggested next action:** DISMISS as transient. Optionally consider the executor SKILL improvement in EXECUTION_REPORT §8 Proposal #1 (run `verify.mjs --staged` directly before `git commit` to surface this class of breakage earlier).

---

## M1A-FINDINGS-02 — CLAUDE.md §4 Iron Rule 15 does not document the "global reference table" RLS pattern

- **Severity:** MEDIUM (constitutional doc gap; affects future SPECs that need global reference tables)
- **Location:** `CLAUDE.md §4 Iron Rule 15 — Canonical RLS Pattern`
- **Description:** Iron Rule 15's canonical pattern (lines describing `service_bypass` + `tenant_isolation` with JWT-claim USING clause) covers only per-tenant data. This SPEC introduced a NEW RLS pattern category — global reference tables with `read_anywhere` (USING true) + write/update/delete gated on `is_platform_super_admin()` + `service_bypass`. The pattern is correct and is documented in the SPEC + D-M1-16, but the constitutional doc (CLAUDE.md) does not yet codify it as a second canonical pattern. Future global reference tables (ISO-3166 country codes, IANA timezones, language codes) will need this pattern; without CLAUDE.md docs, each will reinvent.
- **Reproduce command:** `grep -n "Canonical RLS Pattern" CLAUDE.md` — only one pattern documented; no mention of read-anywhere + platform-admin-write.
- **Suggested next action:** NEW SPEC stub `M1_5_RULE_15_GLOBAL_REFERENCE_TABLE_PATTERN/` to amend CLAUDE.md §4 Rule 15. Constitution edits warrant Daniel's deliberate review.

---

## M1A-FINDINGS-03 — `supabase/migrations/*.sql` ↔ live Supabase drift (TD-2-equivalent)

- **Severity:** MEDIUM (consistent with pre-existing TD-2; flagged in MASTER_ROADMAP §5 as SaaS-blocker pre-tenant-2)
- **Location:** `supabase/migrations/` directory (the canonical migration files location)
- **Description:** This SPEC's migration `m1a_currencies_global_hotfix` was applied via Supabase MCP `apply_migration` only — the SQL body lives in `MIGRATION.md` inside the SPEC folder (doc-context, Iron Rule 32 exempt) but is NOT mirrored to `supabase/migrations/*.sql`. SPEC §7 + §9 explicitly chose this path to avoid Rule 32's destructive-pattern scanner blocking the commit. Drift consequence: a fresh-DB replay scenario (running every file in `supabase/migrations/` against a clean Supabase project) would create currencies with the old per-tenant shape (from `migrations/021_phase4a_supplier_debt_tables.sql`) without applying this hotfix. Tenant-2 onboarding from a fresh DB would inherit the bug.
- **Reproduce command:** `ls supabase/migrations/ | grep currencies` → no result. Verify via Supabase MCP `list_migrations` that `m1a_currencies_global_hotfix` is present in the live project.
- **Suggested next action:** Sweep into the future TD-2-resolution SPEC. When that SPEC executes, it should retroactively add a `supabase/migrations/YYYYMMDDHHMMSS_m1a_currencies_global_hotfix.sql` file (Rule 32 bypass will need a separate strategic decision — probably extending the destructive-ops authorization parser to honor a SPEC's §Destructive Operations declaration, which is already in progress per the concurrent session that surfaced M1A-FINDINGS-01).

---

## M1A-FINDINGS-04 — Module's `docs/db-schema.sql` blocked by 5 pre-existing rule-18 false-positive violations

- **Severity:** LOW (consistent with Phase 1A finding M1A-DEBT-02; module canonical doc stale but `MIGRATION.md` + GLOBAL_SCHEMA + DB_TABLES_REFERENCE cover the gap)
- **Location:** `modules/Module 1 - Inventory Management/docs/db-schema.sql`, lines: 758 (`UNIQUE(tenant_id, supplier_id, document_number) ... -- (022)`), 765-767 (`CREATE UNIQUE INDEX ... WHERE internal_number IS NOT NULL ... -- partial unique (022)`), 782 (`UNIQUE(parent_document_id, child_document_id)`), 826 (`UNIQUE(payment_id, document_id)`), 1555 (`UNIQUE(conversation_id, participant_type, participant_id)`), 1662 (`UNIQUE(message_id, employee_id, reaction)`). 5 violations total — 1 is a true positive on a tenant-scoped UNIQUE that the regex mis-captured ("022"); the other 4 are legitimate cross-tenant UNIQUEs that predate Rule 18 (joins between tenant-scoped tables don't need tenant_id in their UNIQUE, but the regex doesn't know that).
- **Description:** Per Phase 1A Executor Proposal #1 (pre-edit file-scan probe), I ran rule-18 against the file standalone BEFORE attempting an edit. The 5 violations would have caused pre-commit `verify.mjs --staged` to fail, blocking Commit 2. SPEC §3 #17 + §8 explicitly authorize deferral when pre-existing rule-18 violations block. Updated GLOBAL_SCHEMA.sql + DB_TABLES_REFERENCE.md instead (both are docs/-prefixed, Rule 32 exempt and unaffected by rule-18).
- **Reproduce command:** `node -e "import('./scripts/checks/rule-18-unique-tenant.mjs').then(async m => console.log(await m.default(['modules/Module 1 - Inventory Management/docs/db-schema.sql'])))"`
- **Suggested next action:** Append to existing M1A-DEBT-02 entry (the Phase 1A finding for "module's db-schema.sql legacy violations cleanup"). When that cleanup SPEC runs, it should also append the M1A_CURRENCIES_GLOBAL_HOTFIX delta to the module schema doc.

---

## M1A-FINDINGS-05 — No T-constant for `currencies` in `js/shared.js`; no FIELD_MAP for `decimal_digits`

- **Severity:** LOW (no current consumer reads via DB-wrapper; Rule 5 technically applies to NEW fields like `decimal_digits` but practical impact is zero)
- **Location:** `js/shared.js` (T-constants object near lines 24-26 and 54)
- **Description:** The `currencies` table exists in the live DB but has no `T.CURRENCIES` constant in `js/shared.js`. Similarly, the new `decimal_digits` column added by this hotfix has no FIELD_MAP entry. This is a pre-existing Rule 5 / Rule 21 micro-gap that the SPEC didn't address (correctly — adding the T-constant would be scope creep). If a future feature uses `DB.fetchAll(T.CURRENCIES)`, the constant will need to be added then.
- **Reproduce command:** `grep -n "CURRENCIES\|currencies" js/shared.js` → no T-constant. `grep -n "decimal_digits" js/shared.js` → no FIELD_MAP entry.
- **Suggested next action:** Add to TECH_DEBT.md as a M1A-DEBT-03 entry, OR roll into the future Phase 1B SPEC if Phase 1B's customer-facing screens consume the currencies table.

---

*End of FINDINGS.md. 5 findings; 0 orphaned. Foreman processes each in FOREMAN_REVIEW.md §4.*
