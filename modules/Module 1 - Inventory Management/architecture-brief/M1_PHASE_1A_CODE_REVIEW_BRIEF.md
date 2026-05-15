# Module Brief — M1 Lens Inventory Phase 1A — Code Review (Security / Schema / RLS / Performance)

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Skill to load:** `opticup-reviewer`
**Mode:** **READ-ONLY review.** No code changes, no SQL writes, no migrations, no commits. Output is one report file.
**Sibling Brief (parallel):** `M1_PHASE_1A_STRATEGIC_REVIEW_BRIEF.md` (executes in a separate Claude Code chat with `opticup-strategic`)

---

## 1. Purpose

Phase 1A of M1 Lens Inventory shipped 17 new DB tables, 9 atomic RPCs, 1 trigger, 1 view, 1 Edge Function, 1 HTML page + 7 JS modules, and 5 migrations to live Supabase (demo + prizma). The Foreman closed the SPEC 🟡 with follow-ups, but the Foreman authored the SPEC + ran the Executor's retro — there has been **no independent code/security audit** of what's actually live.

Before we open Phase 1B (which will build six more screens on top of this schema and add tens of writes per minute under real staff use), we want an **independent code/security/performance audit** by a fresh `opticup-reviewer` session.

This Brief commissions that audit. Its sibling Brief commissions a parallel business-logic review.

**This review is NOT:**
- A re-execution of the SPEC.
- A business-logic review of decisions/mockups (that's the sibling Brief).
- An attempt to refactor or rewrite the shipped code.
- A rubber-stamp of the FOREMAN_REVIEW.

**This review IS:**
- A skeptical pass over the 5 migrations, 9 RPCs, K3 trigger, K5 view, lens-catalog-import EF, and the Platform Catalog Admin screen.
- A hunt for RLS leaks, missing tenant_id defenses, sequence-generator races, SECURITY-DEFINER misuse, performance landmines, and Iron-Rule violations the Foreman didn't catch.
- A pre-Phase-1B safety check: "if we add 60-100 concurrent staff writes per minute on top of this schema, what breaks?"

---

## 2. Scope — In

The reviewer reads all Phase 1A artifacts + the live Supabase state via MCP (`execute_sql` SELECT-only, `list_tables`, `get_advisors`), and tests for issues across **nine axes**.

### Axis A — Migration audit (5 files, supabase/migrations/20260514180*.sql)

For each of the 5 migration files:

- **Idempotency:** can it be re-run without error? (Should use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.)
- **DOWN migration:** is there a reversible DROP path documented in `ROLLBACK.md`? Does the order respect FK dependencies?
- **Transactional safety:** is each migration wrapped in a single transaction, or does it leave the DB in a partial state if it fails mid-way?
- **`SET search_path`:** every SECURITY DEFINER function uses `SET search_path = public` (defense against schema-injection)? EXECUTION_REPORT claims this; verify on a sample of 3 RPCs.
- **Comments + provenance:** every new table has a `COMMENT ON TABLE` explaining its purpose. Yes/no.

### Axis B — RLS audit (17 new tables)

For each of the 17 new tables, run via Supabase MCP `execute_sql`:

```sql
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COUNT(p.polname) AS policy_count
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN ( /* 17 new tables */ )
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity;
```

Then for each table:

- **`relrowsecurity = true`?** (Iron Rule 15 — non-negotiable.)
- **`relforcerowsecurity = true`?** (Force RLS even for table owner.)
- **Policy count matches expected pattern:** 2 policies for tenant-scoped (`service_bypass` + `tenant_isolation`); 3 policies for platform-owned (`owner_view` + `public_view` + service-bypass equivalent).
- **`USING` clause uses the canonical JWT-claim pattern** (per CLAUDE.md §5 Rule 15 — `tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid`), NOT `auth.uid()`.
- **Cross-tenant attack:** can a JWT with tenant_id=A read rows where tenant_id=B? Run a 2-row INSERT (demo only, on a non-prod-flagged table) + a JWT-context SELECT for tenant A then tenant B and verify zero leakage. If too risky for live, document the test as "would-run-on-branch-only" + score the policy from inspection.
- **`anon` grants:** any `GRANT SELECT ... TO anon` on the new tables? (Should be zero — these tables are staff-only.) Use `\dp` output equivalent.

### Axis C — RPC audit (9 atomic RPCs)

For each of the 9 RPCs deployed in Phase 1A (per EXECUTION_REPORT §3 commit `ee132c6`):

- **`prosecdef = true`?** (SECURITY DEFINER.)
- **`SET search_path = public`** in the function body?
- **JWT tenant_id is validated** as the first statement of the RPC body (per Rule 22 defense-in-depth), even though RLS would also enforce it?
- **`FOR UPDATE`** on the lock-target row for every sequential generator (next_lot_number, next_transfer_number, next_receipt_number, next_po_number, etc. — per Iron Rule 11)?
- **`REVOKE EXECUTE FROM PUBLIC, anon`** — verify each RPC is not callable by anon. (Recent SECURITY_HOTFIX_2026_05_13 established this pattern; new RPCs must follow.)
- **Race condition surface:** for `record_stock_movement` specifically, can two concurrent calls produce a negative stock balance? Inspect the lock order vs the FIFO-lot UPDATE vs the stock_movement INSERT.
- **Error paths:** does the RPC raise a meaningful exception when tenant_id mismatches, or does it silently return zero rows?
- **Signature stability:** are the RPC signatures documented in `docs/GLOBAL_MAP.md`? If not, that's a Phase 1B blocker.

### Axis D — K3 trigger audit (`m9_lens_received_for_sale_order_trg`)

The trigger fires AFTER INSERT on `stock_movement` and enqueues a row into `pending_lens_advancement_queue`. Test:

- **Idempotency:** if the same INSERT is replayed (e.g., transaction retry), is the queue deduped, or do we get double-enqueue?
- **Performance:** the trigger fires on every stock_movement insert. What's the per-insert cost? Phase 1B will see 60–100 inserts/minute under staff use.
- **NULL handling:** the trigger condition is "sale_order_id IS NOT NULL AND purchase_receipt_id IS NOT NULL." Confirm both NULL paths exit cleanly (no queue row, no error).
- **Tenant isolation:** does the enqueued row carry tenant_id correctly? If pending_lens_advancement_queue doesn't have tenant_id NOT NULL with RLS, we have a leak.

### Axis E — K5 view audit (`v_suppliers_for_m9`)

The view exposes supplier identity to M9. Test:

- **`security_invoker = on`?** (Iron Rule per SECURITY_HOTFIX_2026_05_13 — views default to definer; we want invoker.)
- **`anon` SELECT grant:** revoked? (M9 will read this with a tenant JWT, not anon.)
- **WHERE clause:** does the view filter by tenant_id, or rely on the underlying suppliers table RLS? Either is fine, but document which.
- **Column set:** the view exposes (id, tenant_id, name, supplier_number, phone, email, active). Is anything sensitive leaked unnecessarily (e.g., supplier internal-cost-margin, supplier bank-account fields that exist on the underlying suppliers table)?
- **Read-only:** is the view non-updatable, or does the absence of INSTEAD OF triggers leave UPDATE paths theoretically open?

### Axis F — Edge Function audit (`lens-catalog-import`)

Read `supabase/functions/lens-catalog-import/` (3 files per EXECUTION_REPORT §3).

- **`verify_jwt = true`?** (Per EXECUTION_REPORT criterion 16, yes — verify by reading config.)
- **JWT claim validation:** does the EF check `is_platform_super_admin`? What's the gate code? Is it bypassable by a non-platform-admin tenant user?
- **Input validation:** xlsx parsing — is there a size limit, a row-count limit, a schema validation step? What happens if a row has SQL-injection-style characters?
- **Error paths:** if 1 of 1000 rows fails, does the EF roll back all 1000 or commit the 999? (Either is acceptable; just be explicit.)
- **CORS:** is the EF CORS-locked to the ERP Origin, or open?
- **Secrets:** any hardcoded service-role keys, tokens, or URLs in the EF source?

### Axis G — Platform Catalog Admin screen (lens-catalog-admin.html + 7 modules)

Read `lens-catalog-admin.html` + `modules/lens-catalog-admin/*.js`.

- **Iron Rule 7 (API abstraction):** does the screen use `DB.fetchAll`, `DB.batchCreate`, etc., or does it call `sb.from()` directly?
- **Iron Rule 8 (sanitization):** any `innerHTML` with user-supplied data? `escapeHtml()` used?
- **Iron Rule 12 (file size):** any file >350 lines?
- **Iron Rule 22 (defense-in-depth):** every `.insert()` includes `tenant_id: getTenantId()`?
- **Permissions gate:** the screen is platform-admin-only. What's the client-side gate? What's the server-side gate (RPC `is_platform_super_admin`)? Both present?
- **Error UX:** what does the user see when an import fails mid-way? Toast? Modal? Silent?
- **Accessibility:** basic — keyboard nav, ARIA labels on form controls, RTL correctness for Hebrew labels.

### Axis H — Performance + index audit

For each new table:

- **Indexes on FK columns:** every FK has an accompanying index. Check `pg_indexes`.
- **Indexes on tenant_id:** `tenant_id` is the most-filtered column in every query. There should be either a single-column index on tenant_id OR a multi-column index leading with tenant_id, on every tenant-scoped table.
- **Composite indexes for common queries:** for `stock_movement`, the common query is "by tenant_id, lens_variant_id, ordered by created_at DESC." Is there an index?
- **Hot tables:** `stock_movement` will be inserted ~60–100×/minute under Phase 1B staff use. Is it a heap table with appropriate fillfactor? Any partitioning needed pre-LIVE? (Likely no for Prizma's volume, but flag for tenant 2+.)
- **Supabase Advisor:** run `mcp__supabase__get_advisors` for both PERFORMANCE and SECURITY lints and pin any HIGH/MEDIUM findings against the 17 new tables.

### Axis I — Cross-repo + Iron-Rule sweep

- **Iron Rule 6:** `lens-catalog-admin.html` lives at repo root. Is it allowlisted in `scripts/checks/root-allowlist.json`?
- **Iron Rule 21 (No Duplicates):** any new helper function in `js/shared.js` that already had an equivalent? Any new T-constant whose underlying table duplicates an existing one?
- **Iron Rule 23 (No Secrets):** grep the 5 migrations + the EF + the new JS modules for any hardcoded JWT, service-role key, supplier-API token, or Supabase URL outside the env-based pattern.
- **Iron Rule 31 (Integrity Gate):** the EXECUTION_REPORT says the gate ran clean every commit. Sanity check `git log --grep "M1 Lens"` shows 12 commits with no `--no-verify` bypass.
- **Iron Rule 32 (Destructive Ops):** the SPEC declared `None`. Sanity check the actual commits did not perform any (no `DROP`, no `git rm`, no rebase).
- **Tech debt cross-check:** are the 2 new TECH_DEBT entries (M1A-DEBT-01, M1A-DEBT-02) actually in `TECH_DEBT.md` with proper IDs and Daniel-flagged severity?

---

## 3. Scope — Out

The reviewer **does not**:

- Run any SQL writes, migrations, RPC invocations, or DDL. **Read-only**: `execute_sql` for SELECTs is fine. INSERT/UPDATE/DELETE/CREATE/DROP/ALTER ARE FORBIDDEN. Cross-tenant attack test is "by inspection" if executing is too risky.
- Touch any file in the repo except the output report `CODE_REVIEW_REPORT.md`.
- Commit, branch, push, or merge.
- Open follow-up SPECs. Findings go into the report; Daniel + Architect decide which become SPECs.
- Review business logic, decisions, or mockup completeness — that's the sibling reviewer's job.
- Refactor or rewrite any code. A finding may say "function X should be rewritten because of Y" but the reviewer never writes the rewrite.

---

## 4. Deliverable

ONE file: `modules/Module 1 - Inventory Management/architecture-brief/CODE_REVIEW_REPORT.md`

**Required structure:**

```
# Code Review Report — M1 Lens Inventory Phase 1A

**Reviewer:** opticup-reviewer (fresh independent session)
**Reviewed:** 5 migrations + 9 RPCs + 1 trigger + 1 view + 1 EF + lens-catalog-admin.html + 7 JS modules + 12 commits + live Supabase state
**Verdict:** 🟢 / 🟡 / 🔴 (with one-paragraph rationale)
**Phase 1B readiness:** READY / READY-WITH-FOLLOWUPS / BLOCKED

## 1. Axis-by-axis findings (A through I)
For each axis, list findings with: title, severity (CRITICAL/HIGH/MEDIUM/LOW),
location (file:line OR DB object name OR migration ref OR RPC name),
evidence (exact query result OR code snippet OR test result),
proposed action (defer / new SPEC / clarify in Phase 1B SPEC / dismiss).

## 2. Iron Rule scorecard
One row per rule (1-32), columns: Rule | Compliance (✅ / 🟡 / ❌) | Evidence | Notes.

## 3. Supabase Advisor results
Pin every HIGH/MEDIUM advisor finding against Phase 1A tables; classify each as
pre-existing OR Phase-1A-introduced; recommend disposition.

## 4. Top 5 production-risk findings
The 5 highest-severity items the Foreman missed. Each with one-line mitigation.

## 5. Phase 1B technical readiness gate
Concrete YES/NO + 1-2 sentences. "Phase 1B can start safely under this state, provided X / X / X."

## 6. Pre-Phase-1B questions for Daniel
ONE recommendation per question. Code/security only — not business.
```

**Severity definitions** (per `opticup-guardian`):

- **CRITICAL** — Active security hole (RLS leak, anon-callable mutator, hardcoded secret) or guaranteed data corruption under concurrent load. Block Phase 1B until fixed.
- **HIGH** — Production-risk under realistic Phase 1B load (race condition, missing index on hot path, SECURITY DEFINER without search_path). Fix before LIVE.
- **MEDIUM** — Iron-Rule violation that doesn't immediately leak or corrupt but is a foot-gun (no FK index, missing FORCE RLS, missing tenant_id defense layer).
- **LOW** — Cosmetic, doc-only, or pre-existing-debt scope.

**Target length:** 2000–4000 words. Tight reasoning. Every finding evidence-backed (query result, file:line, advisor ID). No padding.

---

## 5. Reading list (in this order)

1. `CLAUDE.md` §4–§7 — Iron Rules (especially Rules 1, 11, 14, 15, 18, 22, 31, 32) + canonical RLS pattern.
2. `MASTER_ROADMAP.md` §3 + §"Last reconciled" — current production state + recent security hotfix context.
3. `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md` — what got hardened in the recent security pass; new Phase 1A code MUST inherit these patterns.
4. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/SPEC.md` — what was meant to ship.
5. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/EXECUTION_REPORT.md` — what actually shipped.
6. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FINDINGS.md` — Foreman's 8 self-findings.
7. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/FOREMAN_REVIEW.md` — Foreman's self-review (🟡 CLOSED).
8. `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN/ROLLBACK.md` — declared rollback path.
9. `modules/Module 1 - Inventory Management/docs/specs/M1A_CURRENCIES_GLOBAL_HOTFIX/*.md` — sibling SPEC (currencies promoted to global).
10. `modules/Module 1 - Inventory Management/docs/specs/M1A_DEBT_SWEEP/*.md` — sibling SPEC (debt cleanups).
11. `supabase/migrations/20260514180*.sql` — the 5 migration files end-to-end.
12. `supabase/functions/lens-catalog-import/` — EF source (3 files).
13. `lens-catalog-admin.html` (root) + `modules/lens-catalog-admin/*.js` — the screen.
14. `js/shared.js` (T-constants section), `js/shared-field-map.js` (FIELD_MAP section) — Phase 1A diffs.
15. `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `docs/DB_TABLES_REFERENCE.md` — confirm Phase 1A merge.
16. `TECH_DEBT.md` — confirm M1A-DEBT-01 + M1A-DEBT-02 entries.
17. **Live Supabase via MCP** — `list_tables`, `get_advisors(SECURITY)`, `get_advisors(PERFORMANCE)`, targeted `execute_sql` SELECT queries against `pg_class`, `pg_policy`, `pg_proc`, `pg_indexes`, `information_schema.columns`.

---

## 6. Critical questions the reviewer must answer

Before submitting the report, the reviewer self-checks that each of these has a defensible answer with evidence in the report:

1. Can a tenant-A JWT read a tenant-B row in any of the 17 new tables? (RLS test result.)
2. Can an `anon` JWT execute any of the 9 RPCs? (REVOKE check.)
3. Are any of the 9 RPCs SECURITY DEFINER without `SET search_path = public`?
4. Does `record_stock_movement` use `FOR UPDATE` on the stock-lot row before computing FIFO?
5. Can the K3 trigger leak a tenant_id across tenant boundaries?
6. Is the lens-catalog-import EF callable by a non-platform-admin tenant user?
7. Are any of the new tables missing a tenant_id index (single or leading)?
8. Are any HIGH-severity Supabase Advisor lints introduced by Phase 1A unaddressed?

Each → one paragraph with evidence in the report.

---

## 7. Pre-flight checks (before writing the report)

1. Confirm branch is `develop`, repo is `opticalis/opticup`.
2. Confirm 12 Phase 1A commits exist (`git log --oneline | grep -i "m1.*lens.*phase.1a\|m1a"` should show ≥ 12 lines).
3. Confirm `lens-catalog-admin.html` at repo root, `modules/lens-catalog-admin/` exists.
4. Confirm 5 migrations under `supabase/migrations/` matching the pattern `20260514180*.sql`.
5. Confirm Supabase MCP is connected (the reviewer needs `list_tables`, `get_advisors`, `execute_sql`).
6. Confirm `npm run verify:integrity` exit 0 on current HEAD.

If any pre-flight fails → STOP and write a one-paragraph escalation note in the report explaining what's missing, then halt.

---

## 8. What "good" looks like

A high-quality code review report:

- Names ≥ 3 production-risk findings the Foreman missed.
- Runs the cross-tenant RLS test (or documents why it was inspection-only) and produces a verifiable result for every one of the 17 new tables.
- Spot-checks ≥ 3 RPCs end-to-end (signature, gate, lock order, error path).
- Pins each finding to file:line or DB object name (no "RLS looks ok").
- Cross-references the recent SECURITY_HOTFIX_2026_05_13 patterns — confirms Phase 1A inherited them.
- Is < 4000 words. Tight, evidence-dense.

A low-quality report:

- Just confirms the EXECUTION_REPORT's claims.
- Uses words like "looks safe" without evidence.
- Skips the cross-tenant test entirely.
- Re-runs the Foreman's findings.
- Padding, repetition, ceremony.

---

## 9. Hand-off

After the report is written + committed (single commit, message: `docs(m1): add Phase 1A code review report`), the reviewer emits ONE short Hebrew line to Daniel of the form:

> "Code Review הסתיים. Verdict: [🟢/🟡/🔴]. דו"ח: `modules/Module 1 - Inventory Management/architecture-brief/CODE_REVIEW_REPORT.md`."

That's all. Architect (Daniel + Cowork session) will read both reports together + the sibling strategic review in one sitting and decide Phase 1B kickoff.

---

*End of Brief. Read-only audit, single report, no code changes.*
