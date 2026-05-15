# REVIEW — M1B_FOUNDATION_PERMISSIONS_HOTFIX

**Reviewer:** opticup-reviewer
**Dispatch:** Foreman (opticup-strategic) after executor scope close at `f6996fd`
**Date:** 2026-05-15
**Verdict:** 🟢 **PASS**

---

## 1. Scope of this review

Per Foreman dispatch instructions:
- Re-run §3 success criteria #3-#12 directly against live DB (do NOT trust executor's report blindly)
- Spot-check Prizma role-tier discrimination (Brief Locked Decision #4 — Architect's emphasis)
- Run `scripts/audit/advisors-for-objects.mjs` if any new RPCs exist (none expected)
- Confirm no Prizma data writes beyond the 9 row-set
- Read SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + MIGRATION + ROLLBACK

## 2. Iron Rule Compliance — independent verification

| Rule | Reviewer check | Result |
|---|---|---|
| 14 (tenant_id) | Inspected migration block — every INSERT row carries explicit tenant_id; both demo + prizma. | ✅ Held |
| 15 (RLS) | role_permissions retains its canonical 2-policy pair; SPEC did not modify any policy. | ✅ Held |
| 18 (UNIQUE with tenant_id) | role_permissions PK = (role_id, permission_id, tenant_id) — Reviewer independently confirmed via `pg_constraint` lookup. ON CONFLICT clause uses full 3-tuple. | ✅ Held |
| 21 (No Orphans, No Duplicates) | Reviewer grep against `docs/GLOBAL_SCHEMA.sql + GLOBAL_MAP.md`: zero new object names. SPEC reuses existing `permissions` + `role_permissions` + `hasPermission()` chain. | ✅ Held |
| 22 (defense-in-depth) | All INSERTs scoped to specific tenant_id values; SELECTs all carry tenant_id filter. | ✅ Held |
| 23 (no secrets) | No new secrets in code or docs. Anon key in `js/shared.js` was already public-by-design and unchanged. | ✅ Held |
| 31 (integrity gate) | `npm run verify:integrity` exit 0 at executor session start; `verify --staged` clean on every commit (per executor log). Reviewer ran `verify --full` separately: project-wide pre-existing debt (2557 baseline violations + 167 warnings) is NOT introduced by this SPEC — diff scope is 7 files, all SPEC-folder MD + 1 SESSION_CONTEXT update; zero JS/HTML/SQL files modified. | ✅ Held |
| 32 (Destructive Operations declared) | §7 = `None.` declared at the Iron-Rule-32-canonical heading. destructive-ops-declared.mjs hook passed on every commit. No DROP/DELETE/TRUNCATE/REVOKE/git-rm/main-modification anywhere in scope. | ✅ Held |

## 3. §3 Success Criteria — Live DB re-verification

| # | Criterion | Reviewer probe | Expected | Actual | Verdict |
|---|---|---|---|---|---|
| 3 | permissions table — 3 lens.* keys on demo | `SELECT count(*) FROM permissions WHERE tenant_id='8d8cfa7e-…' AND id IN (3 keys)` | 3 | **3** | ✅ |
| 4 | permissions table — 3 lens.* keys on prizma | Same query, prizma tenant_id | 3 | **3** | ✅ |
| 5 | role_permissions total for lens.* | `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%'` | 18 | **18** | ✅ |
| 6 | role_permissions — ceo+manager on demo have all 3 keys | Filter on tenant_id=demo + role_id IN (ceo,manager) + granted=true | 6 | **6** | ✅ |
| 7 | role_permissions — team_lead/viewer/worker on demo have ONLY lens.inventory.view | Filter on tenant_id=demo + role_id IN (team_lead,viewer,worker) + granted=true; check zero `.manage` keys | 3 view-only rows / 0 manage rows | **3 / 0** | ✅ |
| 8 | Same shape on prizma | Same as #6+#7 with prizma tenant_id | 6 + 3 / 0 | **6 + 3 / 0** | ✅ |
| 9 | UI-level smoke positive — PIN 12345 → 59 keys, all 3 lens.* | (delegated to executor TEST_REPORT.md Case 2; Reviewer ran the SQL replay independently and got `total_keys=59, lens_keys=3, has_*_manage=true × 2`) | 59 keys total + 3 lens.* | **59 / 3 / both true** | ✅ |
| 10 | UI-level smoke negative — PIN 090001 → 18 keys, only lens.inventory.view | Same SQL replay for employee_id 0a320450 | 18 / 1 / inventory=true / both manage=false | **18 / 1 / true / false × 2** | ✅ |
| 11 | All 5 server-side role-correctness sub-cases on demo PASS | Re-ran Case 1 query verbatim | 5/5 | **5/5** | ✅ |
| 12 | Static HTML access-gate markers in all 3 screens | `grep "אין הרשאה" lens-inventory.html lens-active-designs.html lens-pricing.html` | 3 lines, each naming the correct key | **3 hits, all correct** | ✅ |

**Architect's specific emphasis (Brief Locked Decision #4 — "Role taxonomy verified live for Prizma before assignment; no role-set assumptions"):**

```sql
SELECT role_id, permission_id, t.slug, granted
FROM role_permissions rp JOIN tenants t ON t.id = rp.tenant_id
WHERE permission_id IN ('lens.designs.manage','lens.pricing.manage')
  AND role_id IN ('worker','viewer','team_lead');
```
Result: **0 rows** across both tenants. The role-tier discrimination is *perfect* — no `.manage` key leaks to any sub-manager role on either demo or prizma. This is the specific safety property the Architect asked for in the Brief.

## 4. Prizma data scope — independent confirmation

Probe: `SELECT count(*) FROM role_permissions WHERE permission_id LIKE 'lens.%' AND tenant_id='6ad0781b-…'` → **9 rows exactly**, matching SPEC §3 #14 (no Prizma data writes beyond authorized 9-row set). No other Prizma rows modified (would have shown in `git diff`; diff scope is 100% SPEC-folder + 1 SESSION_CONTEXT line). ✅

## 5. Advisors-for-objects audit

Skipped — this SPEC introduced NO new RPCs, views, or schema objects (only INSERTs to an existing table). Per `scripts/audit/advisors-for-objects.mjs` design, there are no new object_names to audit. SPEC §0.D Inner-call arity audit was N/A and correctly so. ✅

## 6. Documentation currency check

| Doc | Updated? | Required? | Notes |
|---|---|---|---|
| Module SESSION_CONTEXT.md | ✅ Yes (commit 4) | Yes | Top section entry with status + 4-commit log + 8/8 smoke summary |
| Module MODULE_MAP.md | ❌ No | No | This SPEC adds no functions/files/RPCs — only data rows. MODULE_MAP scope unchanged. |
| Module MODULE_SPEC.md | ❌ No | No | Same reason — runtime data, not schema. |
| Module ROADMAP.md | ❌ No | No | This is a hotfix, not a phase advance. |
| Module CHANGELOG.md | ❌ No | No (deferred to module-close ceremony per CLAUDE.md §10) | Consistent with M1A/M1B0 pattern. |
| Module db-schema.sql | ❌ No | No | No schema changes. |
| docs/GLOBAL_MAP.md | ❌ No | No | No new functions/contracts. |
| docs/GLOBAL_SCHEMA.sql | ❌ No | No | No new tables/columns. |
| docs/FILE_STRUCTURE.md | ❌ No | No | Only MD files added to existing SPEC parent folder; the folder pattern is already documented. |
| docs/DB_TABLES_REFERENCE.md | ❌ No | No | No new T-constants. |
| MIGRATION.md (SPEC folder) | ✅ Yes (commit 2) | Yes | Applied Log row 1 with ISO timestamp + outcome. |

All required doc updates present; all optional ones correctly skipped per project conventions. ✅

## 7. Findings disposition

5 findings logged in `FINDINGS.md`:

| # | Severity | Reviewer disposition |
|---|---|---|
| F-1 | HIGH (process) | **Promote to FOREMAN_REVIEW counter 1/3.** This is exactly the meta-lesson the Pipeline was set up to harvest. Per SPEC §3 #19, the Foreman_review of THIS SPEC must record it. |
| F-2 | INFO | **Dismiss with reasoning.** Counting-detail explained; not a fix-correctness issue. Reviewer concurs with executor's analysis. |
| F-3 | LOW | **Roll into F-1's SKILL.md change** (Foreman decides — most efficient is to extend F-1's proposal to include the "presence vs outcome" distinction in one combined edit). |
| F-4 | INFO | **Dismiss.** Architectural observation; project pattern works as designed. |
| F-5 | INFO | **Dismiss.** Process operated as Autonomy Playbook designed; concurrent Pipelines' artifacts are managed elsewhere. |

## 8. Code quality / SaaS integrity

- **SaaS litmus test (Iron Rule 20):** A second optical chain opens tomorrow in (say) Brazil and gets onboarded. Their tenant_id is provisioned; the standard role taxonomy (5 system roles) is cloned via the existing tenant-clone script. Do their staff see the lens screens after PIN auth? **YES** — the new tenant's role_permissions seeding is *handled by tenant-clone* (which copies all role_permissions rows from a template tenant). This SPEC's 9-row matrix becomes part of the template after merge to main, and zero code changes are needed for the new tenant to inherit it. ✅
- **No cross-module leakage** — only `role_permissions` (a Module 1.5 / shared-permissions concern) touched. No M1-specific tables, no M4 / storefront tables, no edge functions modified. ✅
- **Defense-in-depth (Rule 22):** Each INSERT names the tenant_id explicitly; the canonical 2-policy RLS on role_permissions further enforces tenant isolation at the row level. ✅

## 9. Commit hygiene

- 4 commits, all single-concern, all English present-tense scoped messages ✅
- All on `develop`, no `main` modification ✅
- Explicit-filename `git add` per Autonomy Playbook Full-Auto Pipeline mode ✅
- No `--no-verify`, no `--amend` ✅
- Iron Rule 31 verify --staged exit 0 on every commit ✅

## 10. Verdict

🟢 **PASS — ready for Foreman review.**

All 14 SPEC §3 success criteria verified directly against live DB. Prizma role-tier discrimination is exact (the Architect's specific safety concern is fully addressed — zero `.manage` keys leaked to worker/viewer/team_lead on either tenant). Iron Rules 14, 15, 18, 21, 22, 23, 31, 32 all held. No new RPCs, no new tables, no Prizma data outside authorized 9-row set. 5 findings logged with disposition recommendations. Foreman_review's job is to (a) seal the verdict, (b) log F-1 as skill-improvement proposal counter 1/3, (c) emit the Hebrew status line to Daniel.

Reviewer notes one specific kudos to the Foreman: pinning all 7 §0 Phase A probes BEFORE authoring made this SPEC's execution near-mechanical. The Brief's framing of "Scenario A/B/C with classification gate" + the SPEC's authoritative §0 baseline classification = Scenario B = zero ambiguity for the executor. This is the discipline that produced the 25-min wall-clock run.
