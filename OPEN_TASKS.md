# Open Tasks — Cross-Role Single Source of Truth

> **Purpose:** ONE place to see "what's open right now" — across Architect, Module Strategists, Overseers, and any other role. When user asks "what are the open tasks?" — this is the answer.
>
> **Maintenance:** Updated at the end of every session that opens or closes a task. Never let this file drift behind reality. If unsure if a task is still open — check git log + DECISIONS_LOG; do not guess.
>
> **Scope:** Only **actionable tasks** that someone needs to do. NOT: ideas, future modules, completed work, observations.

**Last updated:** 2026-05-11 latest session (Sketch Revision **Batch 3 CLOSED** via `M1_5_SKETCH_RESKIN_BATCH_3`. 17 architecture-brief mockup files across M5/M6/M8/M11/M12/M14/M15 re-skinned to Hybrid+Navy. M7 already on Hybrid+Navy. Remaining: M13 full revision (gold-gradient → SaaS-clean) + M9 sketches-from-scratch with Daniel involvement. 4 skill improvements applied to opticup-strategic + opticup-executor SKILL.md.)

---

## 🎯 Active — pick up next session

| # | Task | Owner role | Estimated time | Why now |
|---|---|---|---|---|
| 1 | **🔍 M13 + M9 sketch revision — the 2 outliers** — Batch 3 (M5/M6/M8/M11/M12/M14/M15) closed 2026-05-11 via `M1_5_SKETCH_RESKIN_BATCH_3` — 17 files re-skinned to Hybrid+Navy. Two outliers remain: (a) **M13 Loyalty** uses a Prizma-gold palette with gradients — needs full revision, not just re-skin (gradients + gold contradict SaaS-clean design system); (b) **M9 Lab/KDS** has no sketches at all — sketches-from-scratch with Daniel involvement. Both are separate Batches per Brief §3 of Batch 3. | Architect (Daniel decides) | ~half day | Last sketch work before module builds. M7 already Hybrid+Navy (V7 Variant A). |
| 2 | **🔄 Migration of existing screens to Hybrid design system** — 4 in-production screens already have Hybrid mockups (Storefront Studio, CRM, Settings+Permissions, Suppliers Debt). One migration SPEC per screen, runs through Full Auto Pipeline. Permissions folds INTO Settings (becomes a tab). Shipments mockup transfers to M9 as a sketch (not a standalone migration — happens with M9 build). | Architect writes briefs → Full Auto | 4 days (1/screen) | Second — low-risk migrations first to validate the Pipeline on real production code. |
| 3 | **🚀 Build 10 new modules on Hybrid system** — M5, M6, M7, M8, M9 (includes shipments+boxes from absorbed M1.shipments), M11, M12, M13, M14, M15. Each gets a Foreman-authored Brief if needed (or uses existing Brief), then Full Auto Pipeline. Order: M5/M6/M7 foundation first, then M8/M9/M11/M12/M13 in parallel across split repos. Permissions sub-tab arrives with M5+M2 admin layer. M7 uses the locked V7 (Variant A) sketch. | Architect briefs → Full Auto chain | 6-8 weeks | Critical path to LIVE. |
| 4 | **📦 Module Repo Split** — Split `opticalis/opticup` into per-module repos + `opticup-shared` (design tokens + shared.js + components). Enables 3-4 parallel Full Auto pipelines without git conflicts. | Architect + Executor | 1-2 days | After migrations — once Pipeline is proven on monorepo, split makes parallel modules safe. |
| 5 | **M1 expansion — 3 missing inventory tables: lenses (משקפיים), contact-lenses (עדשות-מגע), accessories (אביזרים)** — Sketches first (Daniel involved — no sketches done yet), then Brief, then SPECs through Full Auto. Currently M1 only handles frames. **BLOCKER for M7 build (line items) + M9 build (lab routing for lens jobs).** | Architect (Daniel) → Full Auto | 1 week | Before M7/M9 build starts. Can be parallel to tasks 1-2. |
| 6 | **M13 Brief amendment** — add basic-free membership type (auto-created on first compensation/Referral, no-fee, no-bonus, but receives credits). Edit `modules/Module 13 - Loyalty Club/architecture-brief/M13_LOYALTY_BRIEF.md` D5 + add new entity slot. Surfaced 2026-05-10 during M9 D24. | Architect (Daniel) | ~30 min | Required before M9 build SPECs (M9 uses M13 entity). Can run anytime in parallel. |

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

**2026-05-11 (later session — V7 closure):**
- **🎨 M7 V7 canonical sketch ✅ LOCKED.** Daniel selected Variant A from the 3-variant redesign exploration. SPEC `M7_CLOSURE_V7_VARIANT_A` (Full-Auto Pipeline, doc-only closure) ran end-to-end in single chat. Variant A extracted as standalone `M7_ORDERS_FULL_MOCKUP_V7.html` (two-pane work surface + sticky tools strip); V6 baseline + 3-variants comparison file + earlier rejected center-column attempt moved to `_archive/m7-sketches-v6-prior/` via `git mv` (3 declared destructive operations, Iron Rule 32 gate passed). DECISIONS_LOG cross-module entry 18 + M7 sub-table entry 10 recorded. Closes Active task #1 (M7 sketch redesign); 9-sketch audit promoted to position 1.

**2026-05-11 (late session):**
- **🤖 FULL_AUTO_PIPELINE ✅ LIVE.** SPEC `M1_5_FULL_AUTO_PIPELINE` closed 🟢. 10 commits. Pipeline now runs entire SPEC end-to-end in ONE Claude Code chat via skill chaining (Foreman → Executor → Reviewer → Localhost-Tester → Foreman-review). Daniel pastes ONE prompt, sees Hebrew status lines between phases, gets ONE Hebrew summary at end. Escalation protocol: when stuck, skill writes `modules/Module N/escalations/{TS}_{TOPIC}.md` + emits one Hebrew line — Daniel opens Cowork chat with Architect, Architect returns decision template, Daniel pastes back into the running Claude Code chat (still alive). Iron Rule 32 (Destructive Ops Gate) enforced — every SPEC.md declares `## Destructive Operations` section; pre-commit `destructive-ops-declared.mjs` blocks SPECs missing it. Mandatory backups before any 5+ file refactor or 100+ line change. 2 test SPECs (docs-only + small code change) ran end-to-end successfully validating pipeline.
- **🎨 Design System Hybrid (Navy) ✅ SEALED.** v1 (staticization) failed; v2 (3 languages) succeeded with Stripe winner; v3 Hybrid merged Stripe structure + Linear sidebar + Navy `#1e3a8a` palette + sans-serif everywhere. 5 mockups live at `architecture-brief/design-system-mockups/hybrid-final/` (Storefront Studio, Permissions, Shipments, Settings, Suppliers Debt). v1/v2 retained as reference. Decisions: Permissions folds into Settings tab; Shipments mockup transfers to M9 as a sketch.

**2026-05-10 (later session):**
- **🛡️ Safety Infrastructure ✅ COMPLETED** (was Active task #1):
  - `opticup-localhost-tester` skill (4th agent in chain) ← `.claude/skills/opticup-localhost-tester/SKILL.md`
  - `scripts/start-local.ps1` (auto-launch ERP + Storefront, idempotent, dual-stack health check)
  - `tests/smoke/baseline.test.mjs` — **7/7 PASS** on demo tenant (PIN/CRM/inventory/storefront/RLS/5xx)
  - `scripts/snapshot.mjs` — git-tag pre-SPEC + rollback (Supabase branch deferred to v2)
  - `docs/AGENT_CHAIN_PROTOCOL.md` (full 5-agent chain documented)
  - CLAUDE.md §11 updated to reflect new layer + `npm run dev` / `npm run smoke` shortcuts
  - 3 bugs caught in first test: Start-Job→Start-Process, IPv4-only TcpClient→Invoke-WebRequest, /contact→/supersale
- SKILL_PENDING merge: P32-P39 promoted from 3 side-cars into opticup-architect SKILL.md (M13 + M9 Module Close Ceremonies finalized)

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
- 8 patterns added to opticup-architect SKILL.md (P24-P31)
- DECISIONS_LOG reorganized to hybrid (index + per-module)
- `__LAUNCH_PLAN_DRAFT__/` retired; `roles/` created; `_archive/` consolidated

---

## How to use this file

**At session start (Architect):** read this file first (after MASTER_ROADMAP). The "Active" section tells you what's queued. If user asks "what's open?" — this is the answer.

**At session end:** if any task moved (active → done, or backlog → active, or new task added) — update this file and commit. Use commit message pattern: `docs(open-tasks): <what changed>`.

**For other roles (Campaign Overseer, Site Overseer):** read your own handoff file in `roles/<your-role>/`. This file is project-wide; your handoff is role-specific.

---

*Owned by Architect skill. Cross-references: `MASTER_ROADMAP.md` §2.5 (build sequence), `TECH_DEBT.md` (long-term debt), `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel-detected), per-role handoffs in `roles/`.*
