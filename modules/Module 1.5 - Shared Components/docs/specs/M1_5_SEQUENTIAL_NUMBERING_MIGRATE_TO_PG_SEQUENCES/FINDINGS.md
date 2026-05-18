---
spec_id: M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES
executor: opticup-executor
authored: 2026-05-18 IDT
---

# FINDINGS — M1_5_SEQUENTIAL_NUMBERING_MIGRATE_TO_PG_SEQUENCES

## F-1 — Self-introduced JWT-guard deviation (INFO; self-corrected)

**Severity:** INFO (caught + reverted mid-execution, before Tier C ran)

**What:** My v1 CREATE OR REPLACE FUNCTION migrations for the 4 in-scope RPCs accidentally added a `service_role` JWT-claim bypass branch to the guard:
```sql
IF v_jwt_role <> 'service_role' THEN
  IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
  END IF;
END IF;
```
The original RPC bodies had a simpler 2-line guard with no role check:
```sql
IF v_jwt_tenant IS NULL OR v_jwt_tenant <> p_tenant_id THEN
  RAISE EXCEPTION 'Unauthorized: tenant_id mismatch' USING ERRCODE = '42501';
END IF;
```

**Why it happened:** Pattern-matching from `JWT_VALIDATION_HEADER.sql` + `BLOCK_A_DEMO_TESTS.sql` references in the opticup-executor skill. Both are the canonical Phase 2 hardening pattern for *new* SECURITY DEFINER RPCs that need to support service_role callers — but the SPEC scope here was *structural only* (replace MAX/SUBSTRING with nextval), with explicit forbidden-list "Changing the canonical `REVOKE PUBLIC + REVOKE anon + GRANT authenticated` grant footer" and CLAUDE.md §9.4 "No logic changes during structural work — copy verbatim, zero behavior changes unless explicitly requested." Adding the service_role branch was a behavior change not authorized by the SPEC.

**How it was caught:** Self-review immediately after applying the 4 v1 migrations and before running Tier C. Recognized the guard had drifted from the original.

**Resolution:** 4 v2 CREATE OR REPLACE FUNCTION migrations re-applied to restore the exact 2-line original JWT guard. Verified post-fix:
```
has_service_bypass=false  for all 4 in-scope RPCs
has_jwt_guard=true        for all 4 in-scope RPCs
```
Final state has byte-equivalent JWT guard pattern with pre-migration bodies.

**Impact:** 0 to success criteria. Tier C ran against the v2 (correct) bodies. No execution time lost beyond the 4 extra MCP migrations.

**Proposal for codification:** The `opticup-executor` SKILL.md's "Code Patterns — How We Write Code Here" section already mentions Block A 3-role JWT hardening, but as a forward-looking pattern for *new* hardening SPECs. Adding a tighter cue: **"When a SPEC scope is structural (replace one body fragment with another) — do NOT add 3-role hardening even if it would be defensible in isolation. The Phase 2 hardening pattern is only authorized when the SPEC §4 explicitly lists 'replace JWT guard'."** See P-EXEC suggestion in the Foreman review for the canonical phrasing.

---

**Total: 1 finding (1 INFO).**
