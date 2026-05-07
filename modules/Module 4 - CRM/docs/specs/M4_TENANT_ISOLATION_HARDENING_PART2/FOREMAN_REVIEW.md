# FOREMAN_REVIEW — M4_TENANT_ISOLATION_HARDENING_PART2

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART2/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06
> **Reviewed:** SPEC.md (2026-05-06) + EXECUTION_REPORT.md (2026-05-06) + FINDINGS.md (3 findings)
> **Commit range:** `df89db9..f4a0317`

---

## 1. SPEC Quality Audit

**Verdict: 🟡 GOOD — DDL CORRECTNESS GAP CAUGHT MID-FLIGHT.**

### What the SPEC got right
- Caller classification was empirical (live grep) per just-codified Step 1.5 §6 + §7. All 12 RPC consumers verified at actual call sites.
- Three-tier classification (KEEP-ANON / REVOKE-ANON / REVOKE-ANON-AND-AUTH) was correct in principle.
- Stop-triggers per §5 caught the Stage 1 no-op (executor saw `has_function_privilege('anon')` still TRUE post-migration → stopped before declaring success → applied Stage 2 corrective).
- Single migration scope — no source files modified, no EFs deployed → minimum blast radius.
- Whitelist enforcement maintained.
- Iron Rule 22 preserved: GRANT layer + body-internal `tenant_id` check both stay.

### What the SPEC got wrong (executor-flagged)

**Flaw 1 — Missed Postgres `EXECUTE TO PUBLIC` default (M4-DB-01).**
The §8 migration body said:
```sql
REVOKE EXECUTE ON FUNCTION ... FROM anon;
```
This is incomplete. PostgreSQL grants `EXECUTE TO PUBLIC` at function creation by default. Anon inherits EXECUTE via PUBLIC even after the explicit revocation. The check `has_function_privilege('anon', oid, 'EXECUTE')` returns `true` because role-tree inheritance from PUBLIC.

The correct DDL is:
```sql
REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION ... FROM anon;
```

**The SPEC's first Stage was a security-no-op.** Anon could still execute every "revoked" RPC. Only Stage 2 (corrective) actually closed the hole.

This is an **architecturally important finding** — the same pattern will hit every future RPC-permission SPEC across all modules. **It must be codified in both skill files.**

### Severity rollup
- 0 issues that broke production (Stage 1 was security-equivalent to pre-migration; Stage 2 closed the gap)
- 1 architectural lesson worth permanent codification (M4-DB-01)
- 2 process observations (M4-INFRA-07, M4-DOC-10) for skill-evolution backlog

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.5/10. The Stage 1 → Stage 2 corrective IS the executor doing its job.**

### Adherence
- Stop-trigger #1 (verification post-migration) caught the no-op exactly as intended. ✓
- Stage 2 corrective applied the canonical fix without speculation. ✓
- All 4 QA tests post-Stage-2 confirm the target matrix. ✓
- 0 prizma writes outside the 2 migration runs. ✓
- Iron Rule 22: REVOKE FROM PUBLIC + REVOKE FROM anon (defense in depth at GRANT layer). ✓

### Deviations (3 in EXECUTION_REPORT)
1. **Stage 1 no-op + Stage 2 corrective** — handled correctly. The §5 stop-trigger was the safety net that caught it.
2. **`_up.sql` consolidation** of both stages — correct: the canonical migration script reproduces the final state in a clean run. Audit trail preserved via two migration-history entries. (M4-DOC-10 INFO documents this.)
3. **Test 3 (Chrome MCP CRM walk) deferred to Daniel UAT** — substituted SQL matrix verification (stronger). 2nd occurrence; logged as M4-INFRA-07.

### Spot-check verifications I ran
- `git log df89db9..HEAD --oneline` → 2 commits as planned. ✓
- DB matrix:
  ```
  9 RPCs  Group 1: anon=false, auth=true,  service=true ✓
  2 RPCs  Group 2: anon=false, auth=false, service=true ✓
  3 RPCs  Group 3: anon=true,  auth=true,  service=true ✓
  ```
- Test 4 (anon→move_attendee_between_events): 42501 permission denied ✓
- Test 1 (event-register): 200 + attendee created ✓

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-DB-01 | MEDIUM | `REVOKE EXECUTE FROM anon` is a no-op due to PUBLIC inheritance | **APPLY immediately to BOTH skill files** | This is the most important finding of the entire M4 cycle. Every future RPC-permission SPEC across every module will hit this if not codified. See §5 Proposal 1. |
| M4-INFRA-07 | LOW | Chrome MCP CRM walk deferred-with-SQL-substitute (2nd occurrence) | **APPLY** — codify the substitution pattern in opticup-executor SKILL §Common Test Patterns | 2-occurrence rule for process patterns: codify so future executors don't re-deviate. See §6 Proposal 2. |
| M4-DOC-10 | INFO | Two-stage migration history for one git commit | **DISMISS** | Audit trail correctness; corrective story already documented in EXECUTION_REPORT §3 Deviation #1. |

**No findings re-opened the SPEC.** Stage 2 corrective is the SPEC's actual security delta.

---

## 4. Master Doc Update Checklist

| File | Touched? | Status |
|------|----------|--------|
| `MASTER_ROADMAP.md` | No | ✅ Not in scope |
| `docs/GLOBAL_MAP.md` / `GLOBAL_SCHEMA.sql` | No | ✅ Deferred to Integration Ceremony |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | No | ✅ No new code names |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | Yes | ✅ Verified |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Yes | ✅ Verified |
| `modules/Module 4 - CRM/docs/db-schema.sql` | Yes — appended GRANT/REVOKE documentation | ✅ Verified |

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — APPLY immediately: PUBLIC-inheritance check for every RPC-permission SPEC

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check (MANDATORY)" — add bullet 9.

**Change:** Add:
> *"9. **PUBLIC-inheritance check (MANDATORY — applied 2026-05-06 after M4-DB-01).**
> Whenever a SPEC will REVOKE or GRANT EXECUTE on a function, INSPECT the
> function's existing ACL FIRST:*
> *```sql*
> *SELECT proname, proacl FROM pg_proc*
> *WHERE pronamespace='public'::regnamespace AND proname=?;*
> *```*
> *Look for the `=X/postgres` entry — that IS the PUBLIC grant. Postgres adds*
> *`EXECUTE TO PUBLIC` at function creation by default. `REVOKE EXECUTE FROM*
> *anon` strips only the direct grant; anon still inherits EXECUTE via PUBLIC.*
> *The SPEC's migration body MUST include `REVOKE EXECUTE ... FROM PUBLIC` for*
> *every function being locked down. Verify post-migration via*
> *`has_function_privilege('anon', oid, 'EXECUTE')` returning `false` —*
> *anything else means the PUBLIC inheritance is still active.*
>
> *This rule is non-negotiable on first introduction — no 3-occurrence wait. Source:*
> *M4_TENANT_ISOLATION_HARDENING_PART2/M4-DB-01. Stage 1 of that SPEC was a*
> *security no-op until the corrective added FROM PUBLIC."*

**Rationale:** This is a Postgres-architectural behavior, not a name-from-memory issue. It WILL repeat on every future RPC-permission SPEC across every module. Codifying it now saves the next executor from a Stage 1 → Stage 2 corrective cycle.

### Proposal 2 — SPEC_TEMPLATE migration body must include REVOKE FROM PUBLIC

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §8 Expected Final State.

**Change:** Add to the migration-file naming guidance:
> *"For SPECs that REVOKE function-level GRANTs: the migration MUST include both `REVOKE EXECUTE ... FROM PUBLIC` AND any role-specific revocation. The PUBLIC line is mandatory because Postgres grants `EXECUTE TO PUBLIC` at function creation by default; revoking from `anon` alone is a no-op due to PUBLIC inheritance."*

**Source:** Finding M4-DB-01.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 (executor + Foreman) — Mirror PUBLIC-inheritance check
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
**Change:** Add bullet 5e — *"Before any migration that REVOKEs function EXECUTE, inspect `pg_proc.proacl` for the `=X/...` PUBLIC entry. If present (and it always is for Supabase functions by default), the migration MUST include `REVOKE EXECUTE FROM PUBLIC` in addition to any role-specific revocation. Verify post-migration via `has_function_privilege()` — if anon still has EXECUTE despite the FROM-anon revoke, you missed the FROM PUBLIC."*
**Endorsed:** Yes. Mirror of my Author Proposal 1.

### Proposal 2 — Codify SQL-matrix as sanctioned UI-walk substitute
**Where:** `.claude/skills/opticup-executor/SKILL.md` new §"Common Test Patterns" subsection.
**Change:** Add: *"When SPEC §12 requires a Chrome MCP CRM walk-through to verify CRM staff regression AND Chrome MCP is unavailable in the executor session, substitute via SQL `has_function_privilege()` matrix or RLS-context simulation (`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = ...`). This is strictly stronger for security verification (deterministic, role-explicit) but does not test UI rendering or click-handler bindings. Document the substitution in EXECUTION_REPORT §3 Deviations + flag for Daniel UAT pickup. Don't escalate — Daniel UAT is the right place for UI sanity."*
**Source:** M4-INFRA-07 (2-occurrence pattern: M4_TENANT_ISOLATION_HARDENING_PART1 + this SPEC).

---

## 7. Verdict

🟢 **CLOSED.**

**Closed:**
- M4_TENANT_ISOLATION_HARDENING_PART2 SPEC complete; 12 RPCs at target EXECUTE matrix; anon attempt on revoked RPC returns 42501.
- 2 commits on `develop`. Awaiting Daniel-only main merge.

🎯 **MILESTONE: ALL 4 AUDIT CRITICALs CLOSED.**

| Finding | Closed by |
|---|---|
| G-CRIT-1 (cms_leads policy bypass) | M4_TENANT_ISOLATION_HARDENING_PART1 |
| G-CRIT-3 (7 SECURITY DEFINER views) | M4_TENANT_ISOLATION_HARDENING_PART1 |
| G-CRIT-4 (hardcoded Prizma values) | M4_HARDCODED_PRIZMA_REMOVAL |
| G-CRIT-2 (12 anon-callable RPCs) | M4_TENANT_ISOLATION_HARDENING_PART2 ← this SPEC |

**Action items for the next opticup-strategic session:**
1. **APPLY Proposal 1 NOW** (PUBLIC-inheritance check in Step 1.5 §9). Non-negotiable on first introduction — the architectural reality won't change.
2. **APPLY Proposal 2 NOW** (SPEC_TEMPLATE §8 REVOKE FROM PUBLIC requirement).
3. **APPLY executor Proposals 1+2** (mirror PUBLIC check + SQL-matrix substitution).
4. Daniel-only: morning monitoring of CRM staff actions (Test 3 deferred items: delete event, restore, check-in, attendee move, refund). If any breaks, escalate.
5. Daniel-only: merge `develop` → `main` after monitoring confirms stability.

**Module 4 audit progress:**
- ✅ All 4 CRITICALs closed
- ⏳ HIGH/MEDIUM/LOW phase next: 5 HIGHs + 3 MEDIUM/LOW
- 📍 Estimated 3-5 working days to module close + Integration Ceremony

**Production status confirmed:** Anon role no longer has EXECUTE on 9 internal RPCs + 2 admin-only RPCs. 3 public-ingress RPCs remain anon-callable with body-internal tenant validation. M4 multi-tenant security boundary is now closed at all 4 layers (RLS policies, view security_invoker, hardcoded values removed, RPC permissions revoked).

*End of FOREMAN_REVIEW.*
