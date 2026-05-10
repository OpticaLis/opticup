# Open Tasks — Cross-Role Single Source of Truth

> **Purpose:** ONE place to see "what's open right now" — across Main Strategic, Module Strategists, Overseers, and any other role. When user asks "what are the open tasks?" — this is the answer.
>
> **Maintenance:** Updated at the end of every session that opens or closes a task. Never let this file drift behind reality. If unsure if a task is still open — check git log + DECISIONS_LOG; do not guess.
>
> **Scope:** Only **actionable tasks** that someone needs to do. NOT: ideas, future modules, completed work, observations.

**Last updated:** 2026-05-10 (M9 Brief sealed — last Brief before LIVE. Module Close Ceremony performed: P37+P38+P39 promoted to skill via pending-merge files. All 10 Briefs done. Path now clear for Module Strategists to write SPECs.)

---

## 🎯 Active — pick up next session

| # | Task | Owner role | Estimated time | Why now |
|---|---|---|---|---|
| 1 | **🛡️ Safety infrastructure (BEFORE any module work)** — Build: (a) `opticup-localhost-tester` skill (4th agent in chain, runs after Reviewer, validates localhost:3000+:4321 with smoke-tests on demo tenant), (b) `start-local.ps1` PowerShell script that auto-launches both servers, (c) baseline smoke-tests (login / create-customer / create-order / cross-module flows), (d) Snapshot+rollback workflow (git tag + Supabase branch before each SPEC, auto-rollback on failure). **All future SPEC executions depend on this layer.** Without it, multi-agent autonomous chain is unsafe on a live system. | Main Strategic + Executor | 2-3 days | First — prerequisite for everything else. |
| 2 | **🎨 Unified design system across all modules** — Design tokens (colors, typography, spacing, shadows, border-radius), component library (buttons, modals, tables, forms, cards), accessibility standards. Build via Claude Designs. Replaces ad-hoc styling across modules. Sketches per module then conform to this system. | Main Strategic (Daniel involved) | 1-2 days | Second — locks the visual contract before any UI is built. |
| 3 | **📦 Module Repo Split** — Decision Apr 2026 finally executed: split `opticalis/opticup` into per-module repos + `opticup-shared` (npm package or git submodule with shared.js + design tokens + components). Enables 3-4 parallel Claude Code sessions + onboarding additional contributors. | Main Strategic + Executor | 1-2 days | Third — enables parallel SPEC execution downstream. |
| 4 | **M1 expansion — 3 missing inventory tables: lenses (משקפיים), contact-lenses (עדשות-מגע), accessories (אביזרים)** — Sketches first (Daniel involved — no sketches done yet), then Brief, then SPECs. Currently M1 only handles frames. **BLOCKER for M7 + M9 implementation.** | Main Strategic (Daniel) → M1 Module Strategist | 1 week | Fourth — Daniel-involved sketches required first; then unblocks M7/M9. |
| 5 | **M13 Brief amendment** — add basic-free membership type (auto-created on first compensation/Referral, no-fee, no-bonus, but receives credits). Edit `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` D5 + add new entity slot. Surfaced 2026-05-10 during M9 D24. | Main Strategic (Daniel) | ~30 min | Required for M9 Brief execution — can run anytime before M9 SPECs start. |
| 6 | **🚀 Module SPEC authoring + execution (parallel)** — After tasks 1-4 complete: 3-agent chain (Foreman → Executor → Reviewer → Localhost-Tester → back to Foreman) on each module in parallel across split repos. Order: M5/M6/M7 (foundation) first, then M8/M9/M11/M12/M13 in parallel. Foreman escalates blockers to Main Strategic (me); Main Strategic escalates non-resolvable issues to Daniel; every Daniel-resolved issue → SKILL.md update so it never repeats. | Module Strategists + Executors + Reviewer + Tester | 6-8 weeks | Final — critical path to LIVE. |

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
| M5 / M6 / M7 / M8 / M11 / M12 / M13 / M14 / M15 | ✅ Brief sealed |
| **M9 (Lab/KDS)** | ✅ Brief sealed 2026-05-10 — last one |

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
