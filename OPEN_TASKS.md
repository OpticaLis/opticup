# Open Tasks — Cross-Role Single Source of Truth

> **Purpose:** ONE place to see "what's open right now" — across Main Strategic, Module Strategists, Overseers, and any other role. When user asks "what are the open tasks?" — this is the answer.
>
> **Maintenance:** Updated at the end of every session that opens or closes a task. Never let this file drift behind reality. If unsure if a task is still open — check git log + DECISIONS_LOG; do not guess.
>
> **Scope:** Only **actionable tasks** that someone needs to do. NOT: ideas, future modules, completed work, observations.

**Last updated:** 2026-05-09 (end-of-day Cowork session)

---

## 🎯 Active — pick up next session

| # | Task | Owner role | Estimated time | Why now |
|---|---|---|---|---|
| 1 | **Skills audit** — Claude Code reviews all 7 skills, returns report on structure / gaps / duplication. | Main Strategic + opticup-strategic executor | ~45 min | Daniel asked end-of-day 2026-05-09. Must run BEFORE building new role-specific skills. |
| 2 | **GITIGNORE_CLEANUP SPEC** — fix 3 cleanup leftovers from POST_MERGE_QA: stray `-p/` directory, `.gitignore` line 34 duplicate `.claude/`, recursive Module 3 backups bloat. | Main Strategic → opticup-executor | ~30 min | All 3 are LOW severity but visible nuisance. Bundle into one SPEC. |
| 3 | **M13 (Loyalty Club) — Architecture Brief** — next module in build sequence per MASTER_ROADMAP §2.5. Handoff already at `modules/Module 13 - Loyalty Club/architecture-brief/M13_HANDOFF.md`. | Main Strategic | ~2-3 hours | Critical-path to LIVE. Only M13 + M9 remain before Module Strategists begin SPEC authoring. |

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
| H-3 | 24 files exceed 350-line Iron Rule 12 limit | HIGH | Refactor candidates module-by-module |
| M-7 | SESSION_CONTEXT files outdated in some modules | MEDIUM | Per-module cleanup |
| M-13 | Phone source-of-truth scattered | MEDIUM | M3 cleanup partially addressed; verify |

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

## ✅ Completed today (2026-05-09) — for context

- M11 (Reports) Architecture Brief sealed
- M12 (Communications) Architecture Brief sealed (4 mockups, 15 locked decisions)
- PROJECT_STRUCTURE_CLEANUP SPEC executed (11 commits)
- MODULES_HOME_UNIFICATION SPEC executed (12 commits)
- STRUCTURE_PROTECTIONS SPEC executed (10 commits) — 3 enforcement layers active
- Merged develop → main via PR (~40 commits)
- POST_MERGE_QA: 🟢 GREEN
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
