# SESSION_CONTEXT — Phase 3A (Foundation Rewrite)

**Module:** 3.1 — Project Reconstruction
**Phase:** 3A — Foundation Rewrite (ERP Side A `opticup/docs/` + root)
**Status:** ✅ COMPLETE
**Date range:** 2026-04-11 to 2026-04-12
**Branch:** develop (opticalis/opticup)

---

## Files Rewritten (7)

| # | File | Commit | Part |
|---|------|--------|------|
| 1 | `opticup/README.md` | 46756f5 | Part 1 |
| 2 | `opticup/STRATEGIC_CHAT_ONBOARDING.md` | 74a1ba1 | Part 1 |
| 3 | `opticup/CLAUDE.md` (§4–§6 surgical edit: Iron Rules 24–30 cross-reference) | 1ccc28d | Part 1 |
| 4 | `opticup/docs/TROUBLESHOOTING.md` | 57ec5cf | Part 1 |
| 5 | `opticup/docs/GLOBAL_SCHEMA.sql` | 3857b8a | Part 2 |
| 6 | `opticup/docs/GLOBAL_MAP.md` | 7da9d7f | Part 2 |
| 7 | `opticup/MASTER_ROADMAP.md` | ae33d9d | Part 2 |

---

## Manual Actions Completed (2)

1. **Manual Action #1 — optic_readonly Postgres role:** Created in Supabase
   Dashboard by Daniel. Grants `SELECT` on `information_schema` + `pg_catalog`
   for future automated DB audit scripts. Role exists but is not yet used by
   any automated tooling (run-audit.mjs deferred).

2. **Manual Action #2 — DB audit baseline:** Daniel ran the 6 audit queries
   from `db-audit/audit-queries.sql` manually in the Supabase SQL Editor and
   pasted results into the 6 baseline files (`01-tables.md` through
   `06-sequences.md`). This replaced the originally planned automated
   `run-audit.mjs` script, which was deferred to Module 3 Phase B preamble
   after discovering that `supabase-js` cannot execute catalog queries
   (credentials only provide REST API access, not direct Postgres).

---

## Commits on develop (12 total — 8 from Part 1/1.5 chat, 4 from Part 2 chat)

### Part 1 + Part 1.5 (8 commits)

| # | Hash | Description |
|---|------|-------------|
| 1 | 00a14e6 | backup foundation files before rewrite |
| 2 | 46756f5 | rewrite README.md for SaaS identity |
| 3 | 74a1ba1 | harmonize chat hierarchy + replace PROJECT_GUIDE orphan |
| 4 | 1ccc28d | cross-reference Iron Rules 24-30 in storefront CLAUDE.md |
| 5 | 57ec5cf | add Phase 0 rails category to TROUBLESHOOTING |
| 6 | 83bf7e7 | add audit-queries.sql for live DB reconciliation |
| 7 | d6410cf | add DB audit baseline (manual, one-time) |
| 8 | 700b0ee | handback to Part 2 (transition document) |

### Part 2 (4 commits)

| # | Hash | Description |
|---|------|-------------|
| 9 | 3857b8a | rewrite GLOBAL_SCHEMA.sql from live DB baseline |
| 10 | 7da9d7f | rewrite GLOBAL_MAP.md for dual-repo architecture |
| 11 | ae33d9d | rewrite MASTER_ROADMAP.md; add Module 3 Phase B preamble checklist |
| 12 | (this) | SESSION_CONTEXT_PHASE_3A — phase complete |

Note: Parallel 3B and 3C secondary-chat sessions also produced commits on the
same develop branch (pre-approved by Daniel, zero file-scope overlap). Their
commits are interleaved in `git log` but did not conflict with Phase 3A work.

---

## Critical Findings (6 — from DB audit Manual Action #2)

These findings were discovered during the manual SQL Editor audit and are now
documented in `docs/GLOBAL_SCHEMA.sql` as SECURITY-FINDING blocks and tracked
in `MASTER_ROADMAP.md` §5 (Known Debt) and §6 (Phase B Preamble Checklist).

1. **4 tables with anon_all_* RLS policies** — customers, prescriptions, sales,
   work_orders have unrestricted public access and lack tenant_id entirely.
2. **Inconsistent tenant isolation patterns** — 3 RLS idioms (JWT standard,
   session-var legacy, auth.uid() bug) across 162 policies.
3. **Zero Postgres sequences** — all sequential numbers via RPC (Iron Rule #13
   architecture validated; FOR UPDATE compliance unverified).
4. **31 pg_trgm extension functions** in 05-functions.md are noise, not project
   code (72 total functions, 41 project).
5. **View column drift in 02-columns.md** — information_schema returns columns
   for views AND tables. Must filter by 01-tables.md when reconciling.
6. **24 views missing from GLOBAL_SCHEMA.sql** — now fixed (commit 3857b8a
   added VIEWS section with v_storefront_products GOLDEN REFERENCE verbatim).

---

## Deferred Work (tracked in MASTER_ROADMAP.md §6)

All deferred items are tracked in `MASTER_ROADMAP.md` Section 6 (Module 3
Phase B Preamble Checklist):

- **run-audit.mjs script** — build automated DB audit tooling. Requires
  DATABASE_URL in `~/.optic-up/credentials.env`. Deferred from Phase 3A
  Part 1.5 after discovering credential/connection constraints.
- **Security debt cleanup** — retrofit 4 legacy tables with tenant_id, replace
  anon_all_* policies (SECURITY-FINDING #1).
- **RLS pattern migration** — migrate 4 session-var tables to JWT pattern, fix
  3 auth.uid()-as-tenant tables (SECURITY-FINDING #3).
- **service_bypass fix** — supplier_balance_adjustments policy (SECURITY-FINDING #2).
- **Iron Rule #13 verification** — inspect next_*_number function bodies for
  FOR UPDATE compliance (separate task, not Phase B preamble).

---

## Deviations from SPEC

1. **Parallel execution of 3A / 3B / 3C** — pre-approved by Daniel before SPECs
   were written. All three have disjoint file scopes. Cosmetic git-log
   interleaving, no functional impact.
2. **Part 1.5 automation replaced with manual baseline** — original plan was
   `run-audit.mjs` script; correctly stopped when credentials limitation was
   discovered. Manual SQL Editor baseline approved mid-phase.
3. **Translation pivot decision omitted from MASTER_ROADMAP.md §4** — could not
   find authoritative source document to cite. Reported to Daniel for future
   addition if source is identified.

---

## Handback

Phase 3A complete. 7 files rewritten (README, STRATEGIC_CHAT_ONBOARDING,
CLAUDE §4–§6, TROUBLESHOOTING, GLOBAL_SCHEMA.sql, GLOBAL_MAP.md,
MASTER_ROADMAP.md). 2 manual actions (optic_readonly role + DB audit)
completed. 6 DB baseline files committed. 12 commits on develop.
Phase 3A's deferred work tracked in MASTER_ROADMAP.md §6 (Module 3 Phase B
preamble checklist). Ready for Phase 3D (closure ceremony).
