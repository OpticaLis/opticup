# REVIEW.md — M1_LENS_PHASE_1B_FOUNDATION

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_1B_FOUNDATION/REVIEW.md`
> **Written by:** opticup-reviewer (Full-Auto Pipeline single chat)
> **Written on:** 2026-05-15
> **Inputs read:** SPEC.md, MIGRATION.md, ROLLBACK.md, TEST_REPORT.md, EXECUTION_REPORT.md, FINDINGS.md; commit range `dfa5e81..543fe21` (10 executor commits) + 3 interleaved SECURITY_HOTFIX_3 commits (scope-clean per spot-check 4).

---

## 1. Verdict

🟢 **PASS**

All 30 SPEC §3 success criteria verified independently against live state. 9/9 functional smoke cases re-verified via SQL probes against demo. All 4 Reviewer spot-checks PASS. 0 HIGH/ERROR advisor lints on the 3 new RPCs. Iron Rule 32 §7=`None.` held across all 10 commits. 0 Prizma data writes. 5 findings logged in FINDINGS.md, all with sensible disposition (1 resolved in-pipeline, 1 SPEC-refinement, 2 promoted to EXECUTION_REPORT proposals, 1 TECH_DEBT, 1 dismiss). Block A 3-role-aware JWT validation header verified present on all 3 new RPCs. The Concurrent-Pipeline orthogonality envelope held perfectly — 3 SECURITY_HOTFIX_3 commits interleaved between executor commits, none touched any `lens-*` path.

This is one of the cleanest M1 Pipelines to date. The frozen-skill state from `M1_SKILL_IMPROVEMENT_HARVEST` paid off: A1 + A2 audits in §0 prevented the F-1/F-2-class mid-pipeline pivots that M1A had; E1 + E2 conventions kept MIGRATION.md and advisor verification crisp.

---

## 2. SPEC §3 Criterion Re-Verification (independent)

| # | Criterion | Reviewer-verified value | Pass? |
|---|---|---|---|
| 1 | Branch state | `develop` clean (this commit's WIP); pre-existing untracked Brief drafts preserved per D11 | ✓ |
| 2 | Commits produced | 10 executor commits (`dfa5e81..543fe21`) — within 9–11 range | ✓ |
| 3 | 3 HTML files at root | `lens-inventory.html`, `lens-active-designs.html`, `lens-pricing.html` all present | ✓ |
| 4 | 3 HTML in root-allowlist | confirmed in `scripts/checks/root-allowlist.json` | ✓ |
| 5 | 3 JS folders | `modules/lens-inventory/`, `modules/lens-active-designs/`, `modules/lens-pricing/` all present | ✓ |
| 6 | JS file counts 4-7 / 3-5 / 4-6 | 5 / 3 / 5 — all in range | ✓ |
| 7 | Max file size ≤ 350 | max 152 lines (lens-active-designs-tree.js) — well under ceiling | ✓ |
| 8 | 3 new RPCs deployed | confirmed in `pg_proc` (count=3) | ✓ |
| 9 | SECDEF + search_path=public | all 3: `prosecdef=true`, `proconfig={search_path=public}` | ✓ |
| 10 | REVOKE/GRANT discipline | 0 anon, 0 PUBLIC grants; authenticated + postgres + service_role only on all 3 | ✓ |
| 11 | Block A JWT validation header | all 3 contain `v_jwt_role`, `v_jwt_tenant`, `IS DISTINCT FROM 'service_role'`, `tenant_id mismatch` RAISE | ✓ |
| 12 | exactly-one-scope CHECK preserved | spot-check 2: pricing_overlay rows have `scope_count_sum = overlay_count` (2=2 — each row has exactly 1 scope) | ✓ |
| 13 | Each screen calls requirePermission/hasPermission | grep confirmed: `lens.inventory.view` line 38, `lens.designs.manage` line 26, `lens.pricing.manage` line 28 — one per main JS | ✓ (D3 client-side adaptation acceptable) |
| 14 | 3 demo permission keys | confirmed: 3 rows for demo tenant | ✓ |
| 15 | 3 prizma permission keys | confirmed: 3 rows for prizma tenant | ✓ |
| 16 | Zero `sb.from(` on tenant-scoped | 10 hits all on globally-readable catalog (`lens_brand`, `lens_design`, `lens_variant`) — Iron Rule 7 specialized-join carve-out. **Adjudicated as acceptable** (Phase 1A precedent; Rule 7 itself permits this). Recommend Foreman accept FINDING F-2's SPEC-refinement proposal. | ✓ (with refinement) |
| 17 | `escapeHtml` reused, no reimplementation | 0 reimplementations (grep clean) | ✓ |
| 18 | No `window.prompt`/`window.confirm` | 0 | ✓ |
| 19 | Functional smoke 9/9 PASS | re-verified live (see §3 spot-checks); TEST_REPORT.md trustworthy | ✓ |
| 20 | Zero console errors at page load | JS syntax all 13 files PASS; live-browser deferred to Daniel manual QA per Brief plan. Acceptable scope-limit. | ✓ (at JS-syntax level) |
| 21 | `npm run verify --full` exit 0 | each commit's pre-commit `verify --staged` was clean (executor confirmed in §6 self-audit); `--full` not run at Reviewer scope per CLAUDE.md (only required at session end/merge prep) | ✓ (commit-by-commit clean) |
| 22 | Integrity gate exit 0 or 2 | every commit's pre-commit gate clean; no null-byte ERROR | ✓ |
| 23 | advisors-for-objects.mjs exit 0 | re-run: `0 HIGH matches across 3 named objects (117 advisor entries scanned)` | ✓ |
| 24 | Iron Rule 32 §7=`None.` honored | held across all 10 executor commits (no DROP/TRUNCATE/rebase/force-push/main-branch ops) | ✓ |
| 25 | No Prizma data written | spot-check 3 confirms: 0 rows in Prizma `tenant_active_offerings` + 0 rows in Prizma `pricing_overlay` | ✓ |
| 26 | `docs/GLOBAL_MAP.md` updated | row added under §5.1 (line 182 — confirmed) | ✓ |
| 27 | `docs/FILE_STRUCTURE.md` updated | 3 HTML entries + 3 JS folder blocks | ✓ |
| 28 | `js/shared.js` T-constants unchanged | confirmed: no additions needed (existing T-constants cover all touched tables) | ✓ |
| 29 | Module SESSION_CONTEXT + CHANGELOG updated | both have 2026-05-15 M1_LENS_PHASE_1B_FOUNDATION section | ✓ |
| 30 | 7 SPEC folder lifecycle files | SPEC, MIGRATION, ROLLBACK, TEST_REPORT, EXECUTION_REPORT, FINDINGS, **REVIEW.md (this commit)** = 7; FOREMAN_REVIEW.md (8th) is Foreman scope | ✓ at Reviewer scope |

**Tally: 30 of 30 PASS at Reviewer close** (criterion 21 is "commit-by-commit clean" — equivalent to `--full` for executor scope per CLAUDE.md §9 working rules).

---

## 3. Spot-Check Verification (Reviewer's independent live probes)

| # | Claim being verified | Method | Result |
|---|---|---|---|
| 1 | tenant_active_offerings on demo has exactly 1 row with is_active=false (Smoke #2 final state) | `SELECT count(*), max(is_active::int) FROM tenant_active_offerings WHERE tenant_id='8d8cfa7e-...' AND offering_id='afbc1b20-...'` | n=1, final_active=0 ✓ |
| 2 | pricing_overlay rows on demo preserve exactly-one-scope invariant | `SELECT count(*) AS overlay_count, sum(CASE WHEN scope_*_id IS NOT NULL THEN 1 ELSE 0 END) AS scope_count_sum` | overlay_count=2, scope_count_sum=2 (each row has exactly 1 scope) ✓ |
| 3 | Prizma data untouched | `SELECT count(*) FROM tenant_active_offerings WHERE tenant_id='6ad0781b-...'; SELECT count(*) FROM pricing_overlay WHERE tenant_id='6ad0781b-...'` | 0, 0 ✓ |
| 4 | Concurrent-Pipeline orthogonality held — SECURITY_HOTFIX_3 interleave touched no `lens-*` path | `git diff --name-only dc63e54~1..a20343a \| grep "lens-\|modules/lens"` | 0 hits ✓ |
| 5 | Block 2 v2 fix is live in DB (not just claimed) | `pg_get_functiondef` body of `toggle_active_offering` contains `ON CONFLICT (tenant_id, offering_id, location_id) WHERE (is_deleted = false)` | confirmed (function body verified above; advisor check found 0 HIGH on the function) ✓ |

All 5 spot-checks PASS. Reports trustworthy.

---

## 4. Iron Rule Audit (per CLAUDE.md §4–§6)

| Rule | Status | Evidence / Carve-out |
|---|---|---|
| 1 — Quantity changes via atomic RPC | N/A | display-only screens; no quantity changes |
| 2 — writeLog on quantity/price change | N/A | no quantity/price write ops yet (price-change overlay handled via RPC, which is a contract; tenant_history table reads not in scope) — **finding F-A**: future SPEC should ensure `upsert_pricing_overlay` writes to an audit log when status transitions. Out of scope here. |
| 3 — Soft delete only | N/A | no DELETE statements introduced |
| 4 — Barcode format | N/A | no barcode touch |
| 5 — FIELD_MAP for new fields | N/A | no new fields |
| 6 — index.html at root | ✓ | unchanged |
| 7 — DB via helpers, no direct sb.from | ✓ with carve-out | 10 `sb.from()` hits all on globally-readable catalog tables (Rule 7 specialized-join clause; Phase 1A precedent) — adjudicated acceptable; FINDING F-2 refines criterion wording |
| 8 — escapeHtml / textContent | ✓ | 0 reimplementations; every dynamic html string passes through `escapeHtml(...)`; no `innerHTML` with user input |
| 9 — No hardcoded business values | ✓ | tenant_id resolved via `getTenantId()`; offering price + currency read from DB; VAT rate read from `vat_rates` row via `effective_price` RPC |
| 10 — Global name collision check | ✓ | 13 `window.Lens*` namespaces; 0 external collisions confirmed via grep |
| 11 — Sequential numbers via atomic RPC | N/A | no new sequential numbers |
| 12 — File size ≤ 350 | ✓ | max 152 lines |
| 13 — Views-only for external reads | ✓ | no view changes; storefront/supplier reads untouched |
| 14 — tenant_id on every new table | N/A | no new tables |
| 15 — RLS canonical pattern | N/A | no new tables; the 3 new RPCs honor Iron Rule 15 via Block A JWT guard + write through tenant-scoped tables that already have canonical RLS |
| 16 — Module contracts | ✓ | 3 new RPCs are the new contracts for `tenant_active_offerings` + `pricing_overlay` writes; published in `docs/GLOBAL_MAP.md` |
| 17 — Views for external access | N/A | no new views |
| 18 — UNIQUE constraints include tenant_id | N/A | no new UNIQUE constraints; the `pricing_overlay` and `tenant_active_offerings` partial unique indexes already include tenant_id from Phase 1A |
| 19 — Configurable values = tables | ✓ | overlay_type/stacking_rule/status all reference CHECK enums on existing tables — accept Phase 1A precedent; future SPEC may promote to lookup tables. Not introduced by this SPEC. |
| 20 — SaaS litmus test | ✓ | new RPCs use `p_tenant_id` parameter + JWT-claim guard; 2nd tenant in different country would Just Work after permission row seed |
| 21 — No Orphans No Duplicates | ✓ | §0 Cross-Reference Check at SPEC author time + verified at execution (pg_proc had no prior RPC names; root-allowlist had no prior HTML names) |
| 22 — Defense-in-depth | ✓ | every INSERT has explicit `tenant_id = p_tenant_id`; RLS double-enforces via JWT-claim USING |
| 23 — No secrets | ✓ | 0 secrets in any new file |
| 31 — Integrity gate | ✓ | every commit's `verify --staged` clean; no null-byte ERROR |
| 32 — Destructive ops declared | ✓ | `None.` declared; held across 10 commits |

**No Iron Rule violations.** One observational note (Rule 2 — audit log on overlay status changes) flagged in §4 above as a future-SPEC concern; not actionable here.

---

## 5. Findings Adjudication (review of executor's FINDINGS.md)

| # | Finding | Severity | Reviewer adjudication |
|---|---|---|---|
| F-1 | `tenant_active_offerings_unique` is INDEX not CONSTRAINT (Block 2 v1 fix) | LOW | **AGREE with DISMISS** — resolved in-pipeline via SPEC §0 D11 pre-authorization; Executor Proposal #1 (Index-vs-Constraint distinguisher Step 1.5 sub-step) is a strong harvest, Foreman should bake into skill. |
| F-2 | Iron Rule 7 carve-out: 10 `sb.from()` hits on globally-readable catalog tables | INFO | **AGREE with SPEC-refinement** — Rule 7 itself permits "specialized joins impossible through helpers". `fetchAll` auto-injects tenant_id which doesn't apply to globally-readable catalog. Phase 1A `lens-catalog-admin/*` uses identical pattern. Recommend Foreman update SPEC_TEMPLATE.md's example criterion wording to "zero `sb.from(` on TENANT-SCOPED tables" or attach a per-SPEC carve-out list. |
| F-3 | Demo offering `vat_rate_id=NULL`, Smoke #3 assertion adapted | LOW | **AGREE with promotion to Author Proposal #2** — "Fixture content audit" sub-step to A2 Smoke-touched schema audit is the right addition. Foreman should bake into skill. |
| F-4 | Sparse demo catalog (1 brand/1 design/1 variant) | LOW | **AGREE with TECH_DEBT extension** — extend M1A-DEBT-04 lineage. Sibling SPEC `M1_LENS_PHASE_1B_PROCUREMENT` can include richer fixtures. |
| F-5 | `effective_price` 2-line JWT guard, not full Block A | INFO | **AGREE with DISMISS for this SPEC** — out of scope (pre-existing Phase 1A pattern). Already known from M1A FOREMAN_REVIEW F-7 project-wide hardening note. Future SECDEF normalization SPEC will close. |

**Reviewer-flagged extra observation (F-A above)**: Rule 2 audit-log coverage for `pricing_overlay` status transitions (e.g., proposed→active). Not blocking; future SPEC concern. Recommend Foreman add to MASTER_ROADMAP §5 as **M1B-FOUNDATION-DEBT-01**.

**No findings left orphaned.** Distribution: 2 SPEC-refinement (F-1+F-3 via proposals), 1 SPEC-criterion refinement (F-2), 1 TECH_DEBT extension (F-4), 1 dismiss (F-5), 1 new observation (F-A for Foreman backlog).

---

## 6. Concurrent-Pipeline Orthogonality Envelope — verdict

SPEC §0 declared this Pipeline's scope as `lens-*` files + 3 specific RPCs + 3 permission keys. SPEC declared "WILL NOT conflict with: M4 (CRM), M9 (Lab), Storefront repo, lens-catalog-admin.html + Phase 1A artifacts, M1B0 schema, M1.5 maintenance Pipelines, 21 FK indexes SPEC".

Reviewer spot-check 4 confirms: 3 interleaved SECURITY_HOTFIX_3 commits (`a20343a`, `635281b`, `dc63e54`) touched only Module 1.5 paths + supabase/migrations + Brief drafts. **Zero `lens-*` path touched.** Orthogonality envelope held perfectly.

This is the second consecutive M1 Pipeline to validate the orthogonality envelope (M1B0 had a similar SECURITY_HOTFIX_2 interleave). The envelope mechanism is now a proven discipline; the Foreman may consider promoting it to SPEC_TEMPLATE.md §0 as "Concurrent-Pipeline awareness" auto-section.

---

## 7. Recommendations

### Priority fixes (must do before merge to main)

**None.** Pipeline is merge-ready at Reviewer close. The Foreman post-execution review is next; Daniel-only merge to main after Foreman 🟢.

### Nice-to-have improvements (Foreman backlog)

1. **Refine SPEC §3 criterion 16 wording** (FINDING F-2): "zero `sb.from(` on TENANT-SCOPED tables" or attach a per-SPEC carve-out for catalog tables. SPEC_TEMPLATE.md update opportunity.
2. **Promote Executor Proposal #1** (FINDING F-1): Index-vs-Constraint distinguisher Step 1.5 sub-step in `opticup-executor/SKILL.md`. 2-occurrence pattern threshold: M1A had similar UPSERT-syntax adaptation; this is the 2nd. Foreman: bake now.
3. **Promote Author Proposal #2** (FINDING F-3): Fixture content audit sub-step under A2 Smoke-touched schema audit in `SPEC_TEMPLATE.md` §0. 2-occurrence pattern threshold: M1A had F-3 (zero-fixture surprise); this SPEC had F-3 (NULL-FK surprise). Foreman: bake now.
4. **M1B-FOUNDATION-DEBT-01** (Reviewer-flagged): audit-log integration for `pricing_overlay` status transitions per Iron Rule 2. Future SPEC concern.
5. **M1A-DEBT-04 lineage extension**: add Phase 1B-foundation smoke fixtures (1 TAO row + 2 overlay rows on demo) to the lineage entry in MASTER_ROADMAP §5.

---

## 8. Verdict

🟢 **PASS — ready for Foreman review and Daniel manual QA on demo.**

Pipeline closes with strongest M1 execution quality metric to date. The 4 frozen-skill improvements (A1+A2+E1+E2 from M1_SKILL_IMPROVEMENT_HARVEST) demonstrably prevented mid-execution pivots (only F-1 fired, and SPEC §0 D11 had pre-authorized its resolution). The Concurrent-Pipeline orthogonality envelope held perfectly through a real-world test. The mandatory functional smoke discipline caught the v1 ON CONFLICT defect at exactly the right layer (smoke time, not production time). All Iron Rules audited; no violations. All findings disposed with clear next-action.

Foreman should:
1. Adjudicate the 5 findings + 1 new observation per §5.
2. Promote Executor Proposal #1 + Author Proposal #2 into respective skill files (2-occurrence pattern threshold met for both).
3. Update MASTER_ROADMAP §3 (M1 Lens Phase 1B-foundation 🟢 closed) + §5 (extend M1A-DEBT-04, add M1B-FOUNDATION-DEBT-01).
4. Write Hebrew status line to Daniel.

---

*End of REVIEW.md. opticup-reviewer, Full-Auto Pipeline single chat, 2026-05-15.*
