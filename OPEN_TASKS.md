# Open Tasks — Cross-Role Single Source of Truth

> **Purpose:** ONE place to see "what's open right now" — across Main Strategic, Module Strategists, Overseers, and any other role. When user asks "what are the open tasks?" — this is the answer.
>
> **Maintenance:** Updated at the end of every session that opens or closes a task. Never let this file drift behind reality. If unsure if a task is still open — check git log + DECISIONS_LOG; do not guess.
>
> **Scope:** Only **actionable tasks** that someone needs to do. NOT: ideas, future modules, completed work, observations.

**Last updated:** 2026-05-09 (post-overnight-sweep — 12 of 16 items closed, 4 documented-skips; see `_archive/spec-history/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/EXECUTION_REPORT.md` after Module Close Ceremony)

---

## 🎯 Active — pick up next session

| # | Task | Owner role | Estimated time | Why now |
|---|---|---|---|---|
| 1 | **M9 (Lab/KDS) — Architecture Brief** — last remaining Brief before LIVE. Depends on third Access audit being complete. After M9 sealed → all Briefs done → Module Strategists begin SPEC authoring. | Main Strategic | ~2-3 hours | Critical-path to LIVE. Only Brief remaining. |

---

## 📋 Backlog — known but not active

### Post-cutover backlog (from 2026-05-03 cutover; non-blocking)

| ID | Task | Severity | Notes |
|---|---|---|---|
| POST-4 | CRM leads pagination — currently bumped from 200→1000, ideally proper pagination UI | LOW | Active need only when leads >1000 |
| POST-5 | Storefront form — Hebrew lock | LOW | Edge case |
| POST-6 | Campaign metrics UI | MEDIUM | Daniel hasn't pushed for this yet |
| REC-005 | 8 MultiSale archive events — needs `event_type` schema first | LOW | Blocked on schema decision |

### Tech debt (pre-LIVE blocker class)

| ID | Task | Severity | Notes |
|---|---|---|---|
| TD-2 | Migrations git drift — 31 MCP-applied Supabase migrations not in git | HIGH (SaaS-blocker pre-tenant-2) | Per `project_migrations_git_drift.md` memory — Daniel directive Apr 28 |
| TD-3 | Multi-tenant URL strategy | MEDIUM | Deferred until tenant 2 onboards |
| WAZE-1 | 16 messages with hardcoded Waze URL — `%waze_url%` infrastructure built but messages not migrated | LOW | Per `project_waze_url_migration_pending.md` — first opportunity post-cutover stability |

### Sentinel HIGH/MEDIUM alerts (last full sweep — check `docs/guardian/GUARDIAN_ALERTS.md` for current)

| ID | Task | Severity | Notes |
|---|---|---|---|
| H-3 | 24 files exceed 350-line Iron Rule 12 limit | HIGH | Refactor candidates module-by-module. **Note (2026-05-09):** receipt-ocr-review.js (402 lines) blocked overnight Item 12's full T.INV migration — 1 of 5 files deferred. |
| M-1 / M-2 / M-10 / M-11 | RLS performance — 118 `auth_rls_initplan` + 67 multiple-permissive | MEDIUM | Bundle into one post-cutover RLS-perf SPEC. Out-of-scope for overnight sweep per design. |
| M-13 | Phone source-of-truth scattered | MEDIUM | Partially addressed by M3_PHONE_TEMPLATING_AND_CLEANUP + L-21 + L-23 cleanup in overnight sweep. Verify current state next sweep. |

**✅ Closed by `OVERNIGHT_HYGIENE_SWEEP_2026_05_09` (2026-05-09):** M-6 (currency hardcodes), M-7 (SESSION_CONTEXT staleness M1.5+M3), M-9 (production console.log), M-12 (DB_TABLES_REFERENCE — partial, see report), L-4 (PRIZMA_PHONE_RE rename), L-7 (HTTP 406 on meta.json), L-10 (short-link domain — already-done), L-18 (GLOBAL_SCHEMA header), L-21 (currency in receipt-form-items), L-22 (5 oldest M3 FOREMAN_REVIEWs caught up), L-23 ('inventory' → T.INV — partial), L-24 (SMS double-suffix — already-done).

### Storefront / overseer queues

- **Site Overseer** has open items in `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` (REC-SITE-XXX) — separate role, separate cadence
- **Campaign Overseer** has open items in `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` — separate role

---

## 🔮 Roadmap — Architecture Briefs remaining before LIVE

Per `MASTER_ROADMAP.md` §2.5:

| Module | Status |
|---|---|
| M5 / M6 / M7 / M8 / M11 / M12 / M14 / M15 | ✅ Brief sealed |
| **M13 (Loyalty Club)** | ⬜ **NEXT** — handoff ready |
| M9 (Lab) | ⬜ Final — depends on third Access audit |

After M9 → Module Strategists write SPECs → Executors build → cutover.

---

## ✅ Completed recently — for context

**2026-05-10:**
- **M13 (Loyalty Club) Architecture Brief sealed** — 5 sketches, 13 locked decisions, 6 entities, 4 engines, contracts with M5/M7/M8/M11/M12/M3 (commits 7cafa9e + 6022da2)
- **GITIGNORE_CLEANUP follow-up CLOSED** — verified: new `decisions/M13.md` showed as `??` in git status (not silently ignored), confirming the dedupe + explicit-ignores fix from overnight sweep works as intended
- OVERNIGHT_HYGIENE_SWEEP_2026_05_09 Module Close Ceremony complete (commit eaf4f72)

**2026-05-09:**
- M11 (Reports) Architecture Brief sealed
- M12 (Communications) Architecture Brief sealed (4 mockups, 15 locked decisions)
- PROJECT_STRUCTURE_CLEANUP SPEC executed (11 commits)
- MODULES_HOME_UNIFICATION SPEC executed (12 commits)
- STRUCTURE_PROTECTIONS SPEC executed (10 commits) — 3 enforcement layers active
- Merged develop → main via PR (~40 commits)
- POST_MERGE_QA: 🟢 GREEN
- **OVERNIGHT_HYGIENE_SWEEP_2026_05_09 — 12 of 16 items CLOSED, 4 documented-skips. ~17 commits across ERP + storefront repos.** Skills audit report, M3 SESSION_CONTEXT 445→95 lines, 5 oldest M3 FOREMAN_REVIEWs caught up, formatMoney refactor, console.log cleanup, T.INV migration (4/5), 'inventory'→T.INV in goods-receipts, IL_PHONE_RE rename, GLOBAL_SCHEMA header fix, scripts/README split, tenant-fallback-map regen (storefront), HTTP 406 fix (storefront). Skipped: Item 3 (CRM tables not in GLOBAL_SCHEMA as DDL + no T-constants), Item 6 (already fixed), Item 9 (already done by M4_CLOSURE), Item 16 (already fixed). Full retrospective in `_archive/spec-history/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/EXECUTION_REPORT.md` after Module Close Ceremony.
- 8 patterns added to opticup-main-strategic SKILL.md (P24-P31)
- DECISIONS_LOG reorganized to hybrid (index + per-module)
- `__LAUNCH_PLAN_DRAFT__/` retired; `roles/` created; `_archive/` consolidated

---

## How to use this file

**At session start (Main Strategic):** read this file first (after MASTER_ROADMAP). The "Active" section tells you what's queued. If user asks "what's open?" — this is the answer.

**At session end:** if any task moved (active → done, or backlog → active, or new task added) — update this file and commit. Use commit message pattern: `docs(open-tasks): <what changed>`.

**For other roles (Campaign Overseer, Site Overseer):** read your own handoff file in `roles/<your-role>/`. This file is project-wide; your handoff is role-specific.

---

*Owned by Main Strategic skill. Cross-references: `MASTER_ROADMAP.md` §2.5 (build sequence), `TECH_DEBT.md` (long-term debt), `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel-detected), per-role handoffs in `roles/`.*
