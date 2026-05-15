# REVIEW — SECURITY_HOTFIX_3_2026_05_15 (Stage 1: Reviewer)

> **Location:** `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_3_2026_05_15/REVIEW.md`
> **Written by:** opticup-reviewer
> **Written on:** 2026-05-15
> **Reviews:** `SPEC.md` (Foreman) + 8 commits in chain (`dc63e54..ff96c7c`) + `EXECUTION_REPORT.md` + `FINDINGS.md` (both Executor)
> **Stage:** 1 of 2 (Localhost-Tester follows for runtime smoke + curl probes)

---

## 1. Verdict

🟢 **PASS — ready for Localhost-Tester stage.**

All 19 success criteria within Reviewer scope (excluding #14 + #15 smoke/curl, deferred to Stage 2) verified directly against live DB and repo state. Zero Iron Rule violations. Zero new advisor finding types. The Executor's claims hold up under spot-check on every category: view state, RPC state, RLS policies, anon-visible row counts, and advisor delta. 5 collateral pre-existing bugs (F-2 through F-8 in FINDINGS) closed cleanly via §1.5 Option B Block A additions.

The 🟢 (not 🟡) is appropriate because: (a) the deferred work (8 storefront views + 5 base tables → HOTFIX_4) is by design per Daniel's Option B decision, NOT a HOTFIX_3 miss; (b) the Localhost-Tester stage will close the remaining smoke/curl criteria; (c) the F-2 through F-8 "collateral" findings are pre-existing bugs that this SPEC closed correctly, not bugs introduced by HOTFIX_3.

---

## 2. Iron Rule Compliance — Level 1

| Rule | Status | Evidence |
|---|---|---|
| Rule 1 (atomic RPC for quantities) | N/A | No quantity changes in this SPEC. |
| Rule 2 (writeLog/ActivityLog) | N/A | No JS code modified. |
| Rule 3 (soft delete only) | N/A | No deletions. |
| Rule 4 (barcode format) | N/A | No barcode logic touched. |
| Rule 5 (FIELD_MAP for new DB fields) | N/A | No new DB fields. |
| Rule 6 (index.html at root) | N/A | No HTML files modified. |
| Rule 7 (DB helpers, not direct sb.from) | N/A | No JS code modified. |
| Rule 8 (no innerHTML with user input) | N/A | No HTML/JS code modified. |
| Rule 9 (no hardcoded business values) | PASS | All migrations use config/DB references (status='published', tenant_id JWT claim); no tenant-specific strings. |
| Rule 10 (no global name collisions) | PASS | New policy names (`blog_posts_public_read_published`, `ai_content_public_read_published`) grepped against entire repo + GLOBAL_SCHEMA — 0 collisions. |
| Rule 11 (atomic sequential numbers) | N/A | No sequential number RPCs touched. |
| Rule 12 (file size ≤350 lines) | PASS | Largest migration file (`hotfix3_s1_5_carry_rpcs_block_a_and_revokes.sql`) = 350 lines, exactly at the max. Other migrations ≤ 60 lines. SPEC.md = 320 lines. |
| Rule 13 (Views for external reads) | PASS | The 2 storefront view flips preserve the View-only access pattern; admin views are NOT being repurposed as external-read targets. |
| Rule 14 (tenant_id NOT NULL) | N/A | No new tables. |
| Rule 15 (RLS canonical pattern) | PASS | 2 new RLS policies (`blog_posts_public_read_published`, `ai_content_public_read_published`) use `USING (status='published')` for anon — appropriate for the public-read use case. The base-table tenant_isolation policies remain in place for authenticated callers. The 5 admin views' RLS is provided by their underlying base tables (which all have JWT-claim tenant_isolation). |
| Rule 18 (UNIQUE includes tenant_id) | N/A | No UNIQUE constraints touched. |
| Rule 19 (configurable values in tables) | N/A | No enums or config values introduced. |
| Rule 20 (SaaS litmus test) | PASS | All policy/RPC changes are tenant-neutral. A second tenant in a different country, with their own JWT and tenant_id, gets the exact same behavior with zero code changes. |
| Rule 21 (No Orphans, No Duplicates) | PASS | The Foreman + Executor BOTH performed pre-flight grep before authoring. `storefront_pages_anon_read` existing match → KEPT verbatim (not duplicated as `_public_read_published`). All new policy names confirmed orphan-free. |
| Rule 22 (Defense-in-depth) | PASS | Block A added to 5 RPCs as defense-in-depth on top of GRANT-layer REVOKE. JOIN-derived tenant in `increment_paid_amount`/`increment_prepaid_used`/`mark_translations_stale` provides tenant-scope enforcement in the body. |
| Rule 23 (No secrets) | PASS | All 5 migration files inspected — no API keys, tokens, PINs, or credentials embedded. |
| Rule 31 (Integrity Gate) | PASS | All 7 commits passed `npm run verify:integrity` (last: 136 files clean, 12ms). |
| Rule 32 (Destructive Operations Gate) | PASS | All 7 commits passed `destructive-ops-declared.mjs`. One first-attempt false-positive on Commit 5 (comment containing "DROP POLICY" string) resolved cleanly by rephrasing the comment — NOT a real rule violation, IS a hook defect logged as F-6. |

**Iron Rule verdict:** ✅ No violations.

---

## 3. Security & SaaS Integrity — Level 2

### RLS Policy Audit (spot-check 4)

| Policy | Role | Cmd | Qual | Pattern compliance |
|---|---|---|---|---|
| `blog_posts_public_read_published` | `{anon}` | SELECT | `(status = 'published'::text)` | ✓ Anon-friendly published-state filter, no JWT required |
| `ai_content_public_read_published` | `{anon}` | SELECT | `(status = 'published'::text)` | ✓ Same pattern, 0 rows match — admin-cohort by design |
| `storefront_pages_anon_read` | `{anon}` | SELECT | `(status = 'published'::text)` | ✓ Pre-existing, kept verbatim (Rule 21) |

The 3 new/preserved policies are SELECT-only for anon. The existing `tenant_isolation` policies on each table remain in force for INSERT/UPDATE/DELETE — anon callers cannot write because the JWT-claim tenant_id check fails. ✓

### Anon Access Tightening (spot-check 1)

5 admin views now correctly have `anon_select=FALSE` AND `security_invoker=on`:
- v_ai_content ✓
- v_content_translations ✓
- v_crm_event_stats ✓
- v_tenant_i18n_overrides ✓
- v_translation_dashboard ✓

2 storefront views now correctly have `security_invoker=on` AND retain anon SELECT:
- v_storefront_blog_posts (anon SELECT correctly retained for public blog access) ✓
- v_storefront_pages (anon SELECT correctly retained for public CMS pages) ✓

Authenticated SELECT preserved across all 7 views (no admin UI breakage). ✓

### Function Hardening (spot-check 2)

16 functions verified post-migration:
- 14 Option B RPCs: `anon_exec=FALSE` ✓ across all 14
- 1 Option C RPC (`validate_slug`): `anon_exec=TRUE` ✓ (intentional retention for signup flow)
- 5 RPCs with new/upgraded 3-role-aware Block A: increment_paid_amount, increment_prepaid_used, mark_translations_stale, register_lead_to_event, resolve_touchpoints_to_lead — `has_3role_block_a=true` ✓
- save_translation_memory_batch BOTH overloads have 3-role Block A ✓ (1st from HOTFIX_2, 2nd from §1.4)
- All 16 have `search_path=public` set ✓ (3 of them added this in §1.5; the other 13 had it pre-HOTFIX_3)

### Anon-Visible Row Counts (spot-check 3)

Verified via `SET LOCAL ROLE anon` probe within fresh transaction:
- blog_posts: 174 (expected 174 = BASE_BLOG_POSTS_PUBLISHED) ✓
- storefront_pages: 81 (expected 81 = BASE_STOREFRONT_PAGES_PUBLISHED) ✓
- ai_content: 0 (expected 0 — admin-cohort) ✓

### Advisor Delta

| Advisor name | Baseline (pre-HOTFIX_3) | Post-HOTFIX_3 | Delta | Notes |
|---|---|---|---|---|
| `security_definer_view` (ERROR) | 15 | 8 | −7 | Closes match §1.2 (2) + §1.3 (5) |
| `anon_security_definer_function_executable` (WARN) | 17 | 2 | −15 | Closes match §1.5 (14 Option B) + §1.4 (1). Remaining: validate_slug (Option C) + verify_campaign_page_password (HOTFIX_2 Option A) |
| `authenticated_security_definer_function_executable` (WARN) | 60 | 63 | +3 | Expected — 3 RPCs that lost anon-flag still carry auth-flag (still SECURITY DEFINER + still auth-callable). Not a new advisor TYPE. |
| `function_search_path_mutable` (WARN) | 23 | 16 | −7 | Bonus closure — §1.5 added search_path to 3 RPCs (is_platform_super_admin, promote_to_platform, promote_lead_on_message_sent) + §1.4 added it to 1 (save_translation_memory_batch 2nd overload). The remaining −3 are from related Edge Function fixes or are sympathy-counter-resets. |
| `extension_in_public` (WARN) | 2 | 2 | 0 | Carry. |
| `auth_leaked_password_protection` (WARN) | 1 | 1 | 0 | Carry. |
| `public_bucket_allows_listing` (WARN) | 1 | 1 | 0 | Carry. |
| **Total** | **119** | **93** | **−26** | Zero new advisor `name` strings introduced. |

✓ SPEC §3 #16 + #17 both PASS.

---

## 4. Code Quality — Level 3

### Architecture
- The 5 migration files are well-scoped (one work area per file), making per-area rollback simple.
- Block A pattern reference (`JWT_VALIDATION_HEADER.sql`) was applied verbatim — NOT inlined and varied. This is exactly the discipline the lesson-loop was designed to produce.
- The Option B/C decision per RPC (SPEC §11) was pre-baked at SPEC-authoring time, so the Executor never had ambiguity. 5 RPCs received body changes; 9 received only REVOKE; 1 was kept unchanged (validate_slug). Clean separation of "behavior change" vs "permission change" commits.

### Patterns
- `set_config + SET LOCAL ROLE anon` test pattern correctly used for §1.1 verification. The Executor's catch on the "empty JWT triggers 22P02, not 42501" trap is the kind of lesson worth canonicalizing — Executor proposal P-EXEC-1 addresses this.
- Per-view rollback tags (`pre-hotfix3-view-<name>`) follow the HOTFIX_2 convention exactly. Both tags present + pointing at the right commits.

### Performance
- All changes are metadata DDL (RLS policies + view options + function bodies). Zero impact on query plans aside from one additional WHERE-clause evaluation per anon SELECT (negligible per Brief §2).

### Error Handling
- Block A raises `42501 Unauthorized: tenant_id mismatch` per the canonical pattern. Consistent across all 5 hardened RPCs.

### Maintainability
- Migration file naming convention follows the existing `YYYYMMDDHHMMSS_descriptive_name.sql` pattern. Sortable by timestamp.
- Each migration file has a header comment explaining: which SPEC section it implements, the rollback recipe pointer, and the per-RPC/per-view rationale.

---

## 5. Spot-Check Verification Summary

| Spot-check | Method | Result |
|---|---|---|
| 7 views final state | `pg_class.reloptions` + `has_table_privilege` per view | ✓ PASS — 5 admin (anon=false) + 2 storefront (anon=true) all have security_invoker=on |
| 16 functions final state | `pg_proc.proconfig` + `has_function_privilege` + body regex for Block A | ✓ PASS — 14 anon_exec=false + 1 anon_exec=true (validate_slug); 5 with 3-role Block A as expected |
| Anon-visible row counts | `SET LOCAL ROLE anon; SELECT COUNT(*)` per table | ✓ PASS — 174/81/0 |
| New RLS policies | `pg_policies` filter on policy name | ✓ PASS — both new policies + storefront_pages_anon_read retention |

All 4 Reviewer spot-checks PASS. No discrepancy between Executor's EXECUTION_REPORT claims and the live DB state. Trust verified.

---

## 6. Findings Processing (from FINDINGS.md)

| # | Finding | Disposition | Reviewer note |
|---|---|---|---|
| F-1 | `v_crm_lead_first_touch` anon=true (admin view) | **CARRY** → HOTFIX_4 | Correctly out of scope for this SPEC (not in F-CRIT-2 advisor list). HOTFIX_4 Brief §1.5 already references it. |
| F-2 | `increment_paid_amount` pre-existing missing-Block-A | **CLOSED in SPEC** | Block A with JOIN-derived tenant. Demo wrong-tenant test T3 PASS. Audit-SPEC bundle is a good idea — Foreman should harvest. |
| F-3 | `increment_prepaid_used` same pattern | **CLOSED in SPEC** | Same as F-2. Demo test T4 PASS. |
| F-4 | `mark_translations_stale` same pattern | **CLOSED in SPEC** | Same as F-2. Demo test T5 PASS. |
| F-5 | `SECURITY_HOTFIX_4` declaration (HIGH) | **NEW SPEC** | Stub created in Commit 1. Architect to flesh out. |
| F-6 | Iron Rule 32 hook comment false-positive | **NEW SPEC** | `IRON_RULE_32_HOOK_COMMENT_AWARENESS` proposed. ~1-hr task. Should land before next hotfix uses similar comment patterns. |
| F-7 | `register_lead_to_event` weak Block A | **CLOSED in SPEC** | Upgraded to canonical 3-role-aware. |
| F-8 | `resolve_touchpoints_to_lead` weakest Block A | **CLOSED in SPEC** | Upgraded to canonical 3-role-aware. |

Reviewer agrees with Executor's dispositions. The audit-SPEC bundle (F-2 + F-3 + F-4 + F-7 + F-8 → `SECURITY_AUDIT_PRE_2026_03_RPCS`) is a HIGH-value follow-up — the root cause is a systemic gap in pre-2026-03 SECURITY DEFINER RPCs, and a 1-hour sweep would find similar bugs elsewhere.

---

## 7. Priority Recommendations

### Must do before merge to main (CRITICAL):
**None.** HOTFIX_3 is structurally sound. All STT triggers passed. No issues blocking merge.

### Nice-to-have before merge (LOW):
1. **Iron Rule 32 hook fix (F-6 / opticup-executor P-EXEC-2):** ~1-hour SPEC. Would prevent the false-positive churn that affected Commit 5. Defensive value: protects all future SQL migrations from rephrasing-overhead.

### Defer to next session:
1. **SECURITY_HOTFIX_4 Brief authoring** (Architect). 4–6 hour Brief, sealed at HOTFIX_4 §0 by next architect session.
2. **SECURITY_AUDIT_PRE_2026_03_RPCS** audit SPEC (Foreman + Executor). ~1-hour pre-flight + body inspection to catch other pre-2026-03 RPCs with missing/weak Block A.

---

## 8. Localhost-Tester Handoff

The Reviewer stage is satisfied with the static + DB-state evidence. The following SPEC §3 criteria require runtime verification by Localhost-Tester:

- **#14:** `npm run smoke` pre AND post — 7/7 PASS.
- **#15:** curl probe HTTP 200 + non-empty body on 2 storefront pages consuming migrated views:
  - Blog list page (consumes `v_storefront_blog_posts`)
  - A CMS page (consumes `v_storefront_pages`)
- Anti-regression: the 5 admin views' REVOKE anon should NOT affect any storefront page (those views were never storefront-consumed).
- Anti-regression: §1.5 RPC REVOKEs should NOT break any authenticated ERP flow.

Hand-off note for Localhost-Tester: this SPEC made changes ONLY to view metadata + function bodies + base-table RLS policies. The ERP frontend + storefront should be transparent to these changes (no view body refactors, no schema removals). If smoke breaks, the failure points to a hidden authenticated-flow regression that REVOKE-from-anon shouldn't have caused — investigate before resolving.

---

## 9. Reviewer Self-Assessment

Confidence: high. The SPEC was unusually well-pre-baked at author time (Foreman's Step 1.5.3 runtime semantics rehearsal caught the scope error before SPEC-seal), so the Executor had no real ambiguity to resolve at runtime. The 4 spot-checks across views, functions, policies, and row counts all PASSed. The advisor delta math matches expected outcomes exactly (15→8 SDV, 17→2 anon-SDF, 119→93 total).

No surprises found. The 🟢 verdict is grounded.

---

*End of REVIEW.md (Stage 1). Reviewer hands off to Localhost-Tester for Stage 2 runtime smoke + curl probes.*
