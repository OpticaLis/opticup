# ACTIVATION_PROMPT v2 — SPEC 3 RESUME (after ARCHITECT_DECISION 001)

**Paste into Claude Code session on Daniel's Windows desktop.** Can be the same terminal that escalated, or a fresh one.

---

You are **opticup-executor**. **RESUME** execution of:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/SPEC.md
```

The previous session HALTED at pre-flight with 2 deviations. Both are now resolved per:

```
modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/ARCHITECT_DECISION_001_SPEC3_AMENDMENT.md
```

**Read ARCHITECT_DECISION_001 in full first.** It contains the amended §9 migration template you will use instead of the original.

## Bootstrap

1. Load skill `opticup-executor`. First Action protocol.
2. **Verify SPEC 2 lock is released:**
   ```powershell
   node scripts/pipeline-coordination.mjs check-collision --spec-slug M1_LENS_DB_SCHEMA_RECEIPTS_NOTES --files-owned-globs "supabase/migrations/**,docs/GLOBAL_SCHEMA.sql,docs/DB_TABLES_REFERENCE.md,modules/Module 1/docs/db-schema.sql" --branch develop
   ```
   - Expected: no collision (SPEC 2 closed in `73c50b1`)
   - If still collision → SPEC 2 didn't release cleanly → STOP, escalate
3. Claim coordination lock:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --spec-slug M1_LENS_DB_SCHEMA_RECEIPTS_NOTES --files-owned-globs "supabase/migrations/**,docs/GLOBAL_SCHEMA.sql,docs/DB_TABLES_REFERENCE.md,modules/Module 1/docs/db-schema.sql" --branch develop
   ```

## Execute amended SPEC

Read SPEC.md + ARCHITECT_DECISION_001 + the escalation file (now obsolete-but-preserved for context).

Execute the SPEC's 4-commit plan using:
- Commits 1, 2, 3 — unchanged from SPEC.md (the column-add + new-table + RLS migrations)
- Commit 4 — uses the **amended §9 migration template from ARCHITECT_DECISION_001**, NOT the original §9

**Pre-flight verifications the amendment requires you to run before Commit 4:**
1. Verify actual UNIQUE constraint on `permissions` (probably `(id, tenant_id)`) — check via Supabase MCP
2. Verify actual UNIQUE constraint on `role_permissions` (probably `(role_id, permission_id, tenant_id)`)
3. Verify `tenants.slug` is the correct join key (might be different — check `\d tenants` first)
4. Resolve actual Prizma + demo tenant IDs and confirm both present
5. Confirm `ceo` and `manager` roles exist for both tenants

If any of these reveal an unexpected reality → STOP, write a NEW escalation (do not overwrite the previous one), do not confabulate.

## Post-migration verification (mandatory before commit)

After applying Commit 4's migration via MCP:
- Run read-only query: `SELECT count(*) FROM permissions WHERE id IN ('inventory.view_cost_price', 'lens_pricing.edit');` → expect `4` (2 keys × 2 tenants)
- Run read-only query: `SELECT count(*) FROM role_permissions WHERE permission_id IN ('inventory.view_cost_price', 'lens_pricing.edit');` → expect `8` (2 keys × 2 tenants × 2 roles)
- Run `mcp__supabase__get_advisors` — must be clean (no new HIGH)
- If any check fails → STOP, do not commit, rollback migration if possible

## TECH_DEBT entry (mandatory before Pipeline closes)

Per ARCHITECT_DECISION 001 Q2 follow-up — file TECH_DEBT entry:
- Path: `TECH_DEBT.md` at repo root
- Entry: `M1-DEBT-XX — permissions_template global table + auto-replication trigger (proposed before tenant 3 onboarding). Replaces per-tenant duplication pattern for permissions + role_permissions. Estimated effort: 4-6h. Trigger: any new tenant 3+ onboarding event, OR Architect-led Phase 0 SaaS hardening sweep. Reference: M1_LENS_DB_SCHEMA_RECEIPTS_NOTES ARCHITECT_DECISION_001.`

Get a real DEBT number from the existing TECH_DEBT.md numbering scheme.

## Closeout

1. EXECUTION_REPORT.md + FINDINGS.md (FINDINGS should reference both the Brief-side coordination defect AND the Brief-side §9 schema defect — Cowork-Architect will harvest these into the next FOREMAN_REVIEW)
2. MIGRATION.md applied-log per Executor SKILL §"SPEC Execution Protocol" Step 2 (E1 pattern)
3. Rename the escalation file from `2026-05-17T_..._PREFLIGHT_HALT.md` → `RESOLVED_2026-05-17T_..._PREFLIGHT_HALT.md` per Brief Contract E
4. Update Module 1 SESSION_CONTEXT + CHANGELOG + db-schema.sql
5. Update `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` per Integration Ceremony
6. Commit + push to `origin/develop`
7. Release coordination lock
8. Notify Daniel in chat: schema delta confirmed, advisor results, TECH_DEBT entry filed

## After SPEC 3 closes 🟢

The next dependent SPEC is `M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION` (SPEC 4a) — its existing ACTIVATION_PROMPT at `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_INVENTORY_QUICK_RECEIPT_INTEGRATION/ACTIVATION_PROMPT.md` is already correct. It has a pre-execution gate that checks both SPEC 2 + SPEC 3 close commits exist — will pass automatically after this Pipeline pushes.

**No need to ask Daniel for approval between checkpoints.** Bounded Autonomy per Iron Rule 9. Stop only on deviation.
