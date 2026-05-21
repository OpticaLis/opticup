# REVIEW — M4_DEMO_STATIC_LINKS_BACKFILL

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_DEMO_STATIC_LINKS_BACKFILL/REVIEW.md`
> **Written by:** opticup-reviewer
> **Written on:** 2026-05-21
> **SPEC reviewed:** `SPEC.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` (Phase 2 closeout)
> **Commit range:** `pre-m4-demo-static-links-backfill` (`33b5500`) → C2 `d789014`
> **Files reviewed:** 10 (1 migration + 1 SPEC + 1 ROLLBACK + 2 Architect docs + 3 campaign docs + EXECUTION_REPORT + FINDINGS)

---

## 1. Iron Rule Compliance

✅ **All applicable rules satisfied.**

| Rule | Verdict | Evidence |
|---|---|---|
| **R14** — tenant_id NOT NULL on writes | ✅ | Both INSERTs in migration line 60 + 95 specify `tenant_id = v_demo_tenant_id` explicitly. |
| **R15** — canonical 2-policy RLS | ✅ | Spot-checked `pg_policies` on `public.short_links`: `service_bypass` on `service_role` (USING true) + `tenant_isolation` on `public` (USING JWT-claim pattern). Migration applied via `service_role` (MCP `apply_migration`) → `service_bypass` route → no RLS interference. |
| **R18** — UNIQUE includes tenant_id | ⚠️ Pre-existing deviation, NOT introduced | `short_links_code_unique` is global on `(code)`, not tenant-scoped. Documented in FINDINGS F-02, SPEC §0.1, Brief §6, Appendix A7. This SPEC RESPECTS the global-unique reality via the code-generation loop's global `NOT EXISTS` check. Deferred to separate `M4_SHORT_LINKS_CODE_UNIQUE_TENANT_SCOPING` SPEC. |
| **R21** — No Orphans / Duplicates | ✅ | Idempotency guard (`WHERE NOT EXISTS` keyed on `tenant_id + link_type + target_url`) prevents duplicate INSERT on re-apply. Verified at S6. Pre-flight name-collision grep (Phase 1 §1.5) returned 0 hits for SPEC slug + migration filename. |
| **R22** — defense in depth | ✅ | Both INSERTs specify `tenant_id` explicitly even though RLS would enforce it. |
| **R23** — no secrets | ✅ | No secrets in migration, SPEC, ROLLBACK, EXECUTION_REPORT, FINDINGS, or any docs. |
| **R31** — integrity gate | ✅ | Gate run pre-Phase 2 (caught + repaired Daniel's untracked `regopen_email_preview.html` EOF padding per IR31's own recipe); gate clean post-C1 + post-C2. |
| **R32** — destructive ops declared | ✅ | SPEC §7 declares forward path = `None.` (additive INSERTs only). Rollback DELETE lives in `ROLLBACK.md` (doc-context allowlist) — not executed in forward Pipeline. Hook `destructive-ops-declared.mjs` did not block any commit. |
| **R33** — demo-first | ✅ | Migration is `tenant_id = BASE_DEMO_TENANT_ID` scoped. Prizma untouched (S4 + S11 verified — prizma row count + hash unchanged). |
| **R34** — UI VFV | ⏸ Partial — deferred to Phase 4 | S7 (Chrome MCP screenshot of demo `crm.html` short-links tab) intentionally deferred to Localhost-Tester per SPEC §11 browser readiness pre-flight. S8/S9 (HTTP resolver) verified at Phase 2 already. |
| **R35** — config-vs-infrastructure | ✅ | Architect-routed SPEC (not Campaign Overseer scope). Brief §2 + SPEC §11 correctly anchor the routing. |

**Rules not touched** (correctly skipped): R1, R2, R3, R5, R6, R7, R8, R9, R10, R11, R12, R13, R19, R20, R24–R30 (storefront-scoped). Each was N/A for this data-backfill SPEC.

## 2. Security & SaaS Integrity

✅ **No new security issues.**

| Surface | Verdict | Evidence |
|---|---|---|
| RLS policies on `short_links` | ✅ canonical | `service_bypass` (service_role) + `tenant_isolation` (JWT-claim) — matches CLAUDE.md Iron Rule 15 reference pattern verbatim. |
| Cross-tenant data leak risk | ✅ none | Migration scoped to `BASE_DEMO_TENANT_ID`. Code-generation loop verifies global non-collision (because `short_links_code_unique` IS global). Resolver lookup at `resolve-link/index.ts:227` is global by `code` — pre-existing behavior, not introduced. |
| Defense-in-depth on writes | ✅ | INSERTs specify `tenant_id` explicitly. |
| Service-role surface | ✅ | Migration runs through MCP `apply_migration` (service_role), authorized per SPEC §4 Autonomy Envelope. |
| Rollback DELETE scope | ✅ | `ROLLBACK.md` DELETE is tenant-scoped + link_type-scoped + target_url-scoped — cannot delete cross-tenant rows or unrelated demo rows. Wrapped in `BEGIN ... COMMIT` for atomicity. |
| `regopen_email_preview.html` repair | ✅ | Truncation preserved all 13,271 bytes of HTML content; only 9 NUL bytes of EOF padding removed. File remains untracked (Daniel's scratch). FINDINGS F-01 documents the transparent repair. |

**Pre-existing security debt out of scope** (not flagged as new):
- F-02 (`short_links_code_unique` global) — already in SPEC_TEMPLATE Appendix A7's known-debt list.
- 4 pre-multitenancy tables / 3 auth.uid tables / 4 legacy RLS — tracked separately, not relevant to this SPEC.

## 3. Code Quality

### Migration file (`supabase/migrations/20260521080139_m4_demo_static_links_backfill.sql`)

- **Header comment block:** thorough, cites source SPEC + Brief + SPEC Request + Analyst doc, declares Iron Rule compliance per-rule.
- **PL/pgSQL structure:** clean DO block with explicit variable declarations, sanity guard on demo tenant existence (line 41–43), per-row idempotency guard, code-generation loop with 5-retry abort.
- **Idempotency contract:** `WHERE NOT EXISTS` keyed on `(tenant_id, link_type, target_url)`. Verified S6 hard-test — re-running the DO block inserts 0 rows.
- **Code generation:** `substr(md5(random()::text || clock_timestamp()::text || '<tag>'), 1, 8)`. Statistically near-collision-free at 8 hex chars × 16^8 = 4.3B namespace, current `short_links.code` population ~9,030 rows — collision probability ~10⁻⁷. 5-retry loop is generous safety margin.
- **NOT-NULL columns** explicitly populated (per SPEC §0.3 matrix): `tenant_id, code, target_url, link_type, expires_at`. Defaults relied on: `id, click_count, created_at`. Nullable explicit-NULL: `lead_id, event_id, broadcast_id, message_log_id`. ✅ correct.
- **RAISE NOTICE statements** for observability of which rows were inserted vs skipped. Good practice — visible in migration application log.
- **Hebrew comments / Unicode:** none. Migration is plain ASCII. ✅ portable.

**Minor improvement (not blocking):** code generation could use `encode(gen_random_bytes(6), 'base64')` for a slightly stronger entropy source, but `md5(random())` is acceptable for this scale and matches the slug-style of existing codes (`f9Avttrn`, `5CBy1Do4`).

### SPEC.md (`SPEC.md`)

- **323 lines, well-structured per template v3.**
- **§0 Live-DB Baselines:** 9 baselines pinned with runnable queries (P-AR-02 applied).
- **§0.2 Smoke-touched schema audit:** explicit fixture-present confirmation.
- **§0.3 Not-null column matrix:** caught the `link_type` default = `'other'` trap — explicitly mandates override to `'template_static'`.
- **§3 Success Criteria:** 12 criteria, every one has expected value + verify command. S7 explicitly deferred to Phase 4 with browser readiness pre-flight reference.
- **§7 Destructive Operations: `None.`** — correctly declared.
- **§12 Concurrent-Pipeline orthogonality envelope:** declared single-table demo-tenant scope. Lock claimed via `pipeline-coordination.mjs`.
- **Iron-Rule self-audit cross-referenced** to SPEC sections.

### ROLLBACK.md (`ROLLBACK.md`)

- **58 lines, focused.** Contains `DELETE` SQL fenced in ```sql block (doc-context per template §6 rule — `destructive-ops-declared.mjs` does NOT scan doc-context blocks).
- DELETE scope is appropriately narrow.
- BEGIN / COMMIT transaction wrap is present.
- Verify-after-rollback query included.
- Lists what rollback does NOT undo (Pipeline lock release, EOF-padding repair).

### EXECUTION_REPORT.md (`EXECUTION_REPORT.md`)

- **196 lines, follows template v3.**
- All 8 sections populated (Summary, What Was Done, Deviations, Decisions, What Would Help, Iron-Rule Self-Audit, Template Footprint, Self-Assessment, Improvement Proposals, Next Steps, Raw Command Log).
- 4 real-time decisions documented with rationale.
- 2 concrete executor-skill improvement proposals.
- Self-assessment 9.8/10 — honest, justified per dimension.

### FINDINGS.md (`FINDINGS.md`)

- **93 lines, 5 findings, all properly classified.**
- F-01 (INFO, repaired): EOF padding fix is correctly scoped + documented.
- F-02 (MEDIUM, deferred): IR18 deviation already in Appendix A7; correct routing to separate SPEC.
- F-03 (LOW, resolved): demo parity gap, fixed by this SPEC.
- F-04 (INFO, deferred): static-card UX clarity — separate SPEC.
- F-05 (LOW, Foreman-skill): template hint inconsistency — well-spotted; correctly routed to Foreman improvement proposal in FOREMAN_REVIEW phase.

## 4. Documentation Currency

| File | Required? | Status |
|---|---|---|
| `MASTER_ROADMAP.md` | YES — minor 1-line addition | ⏸ Queued for C4 (Foreman phase) |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | YES — note backfill in live state | ⏸ Queued for C4 |
| `docs/GLOBAL_SCHEMA.sql` | NO — no schema change | N/A |
| `docs/GLOBAL_MAP.md` | NO — no new function/contract | N/A |
| `docs/FILE_STRUCTURE.md` | NO — no new code file (only migration) | N/A |
| `docs/DB_TABLES_REFERENCE.md` | NO — no new T constant | N/A |
| `shared/js/...FIELD_MAP` | NO — no new DB field | N/A |
| Module CHANGELOG | OPTIONAL | not required for data backfill |

## 5. Commit Hygiene

| Commit | Hash | Verdict | Notes |
|---|---|---|---|
| C1 | `a585d14` | ✅ | 8 files, +1026 lines; selective `git add` by filename; explicit message enumerating chain; CRLF warnings informational (Windows) |
| C2 | `d789014` | ✅ | 2 files (EXECUTION_REPORT + FINDINGS); clean commit message |

No `git add -A` / `git add .` used. No bypass of pre-commit hooks. Both commits passed integrity gate + verify.mjs --staged with 0 violations.

## 6. Reviewer Spot-Checks Performed

1. **DB state post-C2:** `SELECT count(*) ... GROUP BY tenant` returned demo=4, prizma=4 ✓. Demo codes = `bdf88e3c, c2d22d16, dsruWc1z, NCoQWzbd` ✓.
2. **RLS policy audit on `short_links`:** confirmed canonical 2-policy pattern (`service_bypass` + `tenant_isolation` JWT-claim) ✓.
3. **Selective verify.mjs --only on each of 10 changed files:** all PASS with 0 violations / 0 warnings ✓.
4. **Migration code inspection:** header comments, idempotency contract, code-generation loop, NOT-NULL column completeness — all sound ✓.

## 7. Findings Discipline

✅ No findings absorbed silently. 5 findings logged in `FINDINGS.md`. None of the 5 blocks SPEC closure.

## 8. Verdict

🟢 **PASS** — Phase 2 (Executor) work is clean, well-documented, and ready for Phase 4 (Localhost-Tester) VFV.

**Mandatory next steps for closure:**
- Phase 4 Localhost-Tester runs S7 (Chrome MCP screenshot of demo `crm.html` short-links stats tab showing 4 rows including the 2 new codes pointing at the correct target URLs).
- Phase 4 Localhost-Tester re-runs S8/S9 via Chrome MCP to confirm browser-side resolver behavior on demo.
- Phase 5 Foreman writes FOREMAN_REVIEW.md, updates MASTER_ROADMAP + M4 SESSION_CONTEXT, releases Pipeline session lock.

**Nice-to-have (not blocking):**
- Consider proposing `encode(gen_random_bytes(6), 'base64')` as the canonical code-generation primitive for any future short_link-related SPECs (minor robustness improvement).
- F-02 + F-04 follow-up SPECs should be filed within the next 2 weeks to prevent debt drift.

---

*Review complete. Phase 4 Localhost-Tester clear to proceed.*
