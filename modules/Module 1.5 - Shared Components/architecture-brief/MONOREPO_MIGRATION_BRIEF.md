# Module Brief — MONOREPO_MIGRATION (Pipelines 1 + 2)

**Brief version:** v1
**Date:** 2026-05-15
**Author:** Architect
**Status:** Sealed — awaiting Pipeline 1 dispatch (held until M1 Phase 2 + Funnel work is complete).
**Hand-off to:** Module Strategist (`opticup-strategic`) → Executor (`opticup-executor`) → Reviewer (`opticup-reviewer`) → Strategist Foreman.
**Pipeline:** TWO-PIPELINE CHAIN. Pipeline 1 (Phases A-E, zero production impact). Daniel verification break. Pipeline 2 (Phases F-H, production reconfig + smoke + archive).
**Total estimated time:** ~5 hours (3h + 15min break + 1h45min).
**Branch:** New repo `opticalis/opticup-monorepo`, branch `develop`. Old repos `opticalis/opticup` + `opticalis/opticup-storefront` archived in Phase H.

---

## 1. Purpose

Consolidate `opticalis/opticup` (ERP, vanilla JS on GitHub Pages) + `opticalis/opticup-storefront` (Astro on Vercel) into ONE monorepo with pnpm workspaces + Turborepo. After migration, parallel Pipelines on M7, M9, future modules will not contend for `develop`; atomic cross-cutting commits (e.g., the May 2026 SECURITY_HOTFIX 7+1-commits-manually-serialized pattern) become a single PR; the documented SESSION_CONTEXT drift between Module 3 ERP-side and storefront-side eliminated.

**Rationale (decided after 5 research agents, including security analysis + industry-standard SaaS architecture survey + comprehensive current-state audits):**
- Every world-class TypeScript SaaS at peer scale and at-scale (Supabase, Cal.com, Notion, Vercel, Linear, Shopify, Stripe) runs monorepo with internal app boundaries. None splits marketing-from-product as a separate-repo default.
- The security argument for keeping storefront separate collapses under scrutiny: every real CVE researched (tj-actions, event-stream, Lovable/Supabase, Next.js sourcemap, Astro SSR) was caused by env-scoping or bundler-config failure that polyrepo does NOT prevent. Monorepo with declarative env scoping + per-Vercel-project env separation + ESLint boundaries gives stronger, audit-able isolation than two repos accidentally separated by distance.
- Documented cross-repo coordination pain in May 2026 (SECURITY_HOTFIX 7+1 cross-repo commits manually serialized, tenant-fallback-map drift, Module 3 phase-letter collision) is structural, not incidental. At target scale (50+ engineers, hundreds of tenants) it becomes a P1 source of production incidents.

**Bias:** Maximum preservation of working code paths. Structural moves only. No refactors. The whole point is to leave business logic 100% byte-identical and only change the directory layout + workspace tooling + deploy configuration.

---

## 2. Scope — In

### 2.1 Target monorepo architecture (final state — locked)

```
opticup-monorepo/                          # new repo: opticalis/opticup-monorepo
├── apps/
│   ├── erp/                               # Phase A — entire ERP, internal layout preserved
│   │   ├── (24 root HTML pages stay at apps/erp/ root)
│   │   ├── js/                            # 13 files — implicit shared layer
│   │   ├── css/                           # global stylesheets
│   │   ├── shared/                        # 26 files — newer shared layer
│   │   ├── modules/                       # 16 Module N + 22 legacy folders
│   │   ├── campaigns/, roles/, watcher-deploy/, tests/, scripts/, docs/, _archive/
│   │   ├── package.json                   # @opticup/erp workspace member
│   │   ├── CNAME                          # app.opticalis.co.il
│   │   ├── .nojekyll
│   │   └── README.md
│   └── storefront/                        # Phase B — entire storefront, verbatim
│       ├── src/, public/, scripts/, sql/, docs/
│       ├── astro.config.mjs, tailwind.config.mjs, tsconfig.json, vercel.json
│       ├── package.json                   # @opticup/storefront workspace member
│       └── README.md
├── supabase/                              # MONOREPO ROOT (CLI demands it)
│   ├── functions/                         # 25 EFs
│   ├── migrations/                        # 32 current SQL
│   └── config.toml
├── packages/                              # EMPTY on Day 1 — deferred per §4 D2
│   └── .gitkeep
├── scripts/                               # cross-cutting (monorepo-level)
│   ├── checks/
│   │   ├── env-segregation.mjs            # NEW (Phase E)
│   │   ├── workspace-boundary.mjs         # NEW (Phase E)
│   │   ├── check-root-discipline.mjs      # rewritten for monorepo root
│   │   ├── root-allowlist.json            # rewritten
│   │   └── (other cross-cutting checks moved here)
│   ├── verify.mjs                         # rewritten to dispatch via turbo
│   └── audit/
├── .github/
│   ├── workflows/
│   │   ├── verify.yml                     # pnpm + turbo run verify
│   │   ├── erp-pages-deploy.yml           # NEW: publishes apps/erp/ to gh-pages
│   │   ├── lighthouse-daily.yml
│   │   └── lighthouse-weekly.yml
│   └── CODEOWNERS
├── .husky/pre-commit                      # rewritten: pnpm verify
├── .vscode/
├── CLAUDE.md                              # rewritten (monorepo constitution)
├── MASTER_ROADMAP.md, OPEN_TASKS.md, TECH_DEBT.md, README.md
├── package.json, pnpm-workspace.yaml, turbo.json, pnpm-lock.yaml
├── .gitignore, .gitattributes, .editorconfig, .nvmrc
└── .mcp.json (gitignored, per-machine)
```

### 2.2 Locked architectural decisions (10)

| # | Decision | Reason |
|---|---|---|
| 1 | `supabase/` lives at monorepo ROOT, not under `apps/edge-functions/` | Supabase CLI hardcodes `supabase/functions/` + `supabase/migrations/` relative to project root. Sub-directorying breaks every `supabase functions deploy` invocation across CI, MCP, executor skill. |
| 2 | `packages/shared/` and `packages/contracts/` DEFERRED to Day 1+N | The ERP uses 506 `window.X = ...` globals + 0 ES-module surface. Extracting `js/shared.js` into `@opticup/shared` needs a build step the ERP doesn't have — that's a refactor SPEC, not a migration step. Iron Rule 21 (No Orphans) → no empty packages. |
| 3 | `apps/erp/` preserves ERP's internal layout VERBATIM | All 24 root HTML pages have hardcoded `<script src="js/shared.js">` paths. Co-locating preserves every relative path. Zero HTML edits required. |
| 4 | `git subtree add` (NOT `git rm + cp -r`) for both imports | Preserves full commit history; satisfies no-data-loss constraint. Old repos retain history independently after archive. |
| 5 | TWO-PIPELINE execution shape | Phase F (Vercel + Pages reconfig) is the only production-affecting phase. Daniel verification break before F isolates the abort point. Aligns with CLAUDE.md §9 "Stop-on-deviation" + Iron Rule "Daniel-only authorizes production touches". |
| 6 | ERP GitHub Pages deploys via NEW workflow (`erp-pages-deploy.yml`) that publishes `apps/erp/` to `gh-pages` branch | GitHub Pages cannot natively serve from a subdirectory of `main`. Alternatives rejected: (a) keep HTML at monorepo root (violates target architecture); (b) migrate ERP to Vercel (bigger change, defer to future SPEC). The new workflow uses `actions/deploy-pages@v4` with `path: apps/erp`. |
| 7 | Vercel storefront project preserved by ID (`prj_HGz6OkwugkH6Nlw3FiomNPDp96QH`) | Re-link to monorepo source; set `rootDirectory: apps/storefront`. Env vars + custom domain `prizma-optic.co.il` stay attached to the project — no DNS change. |
| 8 | Env-segregation enforced at FOUR layers | (1) Turborepo `globalEnv: []` + per-task `env: [...]`. (2) `scripts/checks/env-segregation.mjs` in pre-commit + CI. (3) ESLint `eslint-plugin-boundaries` with Nx-style tags inside storefront. (4) `scripts/checks/workspace-boundary.mjs` belt-and-suspenders for non-JS files (HTML script-src, etc.). |
| 9 | CLAUDE.md rewrite preserves ALL 32 Iron Rules verbatim | Only path references update (e.g., `modules/Module N/...` becomes `apps/erp/modules/Module N/...`). §0.5 Root Discipline rewritten for monorepo root; `root-allowlist.json` updated in the SAME commit per the rule's own self-enforcement clause. |
| 10 | Old repos ARCHIVED, not deleted, immediately after H1 | Full history preservation; archive banner directs to monorepo. `git subtree` source remotes can be removed from local clones after H1; old repos still exist for archeology. |

### 2.3 Pipeline 1 — Phases A through E (zero production impact)

Detailed step-by-step in §3 below. Summary:
- **Phase A (10 steps, ~35 min):** create `opticalis/opticup-monorepo`, subtree-import ERP under `apps/erp/`, hoist `supabase/` to root, move governance files to root, smoke-test ERP serves from `apps/erp/`.
- **Phase B (6 steps, ~20 min):** subtree-import storefront under `apps/storefront/`, byte-verify `vercel.json` (8,594 lines), rename to `@opticup/storefront`, wire to pnpm workspace.
- **Phase C (4 steps, ~25 min):** write `turbo.json` (`globalEnv: []`, per-task env), root `package.json`, rewrite husky pre-commit to dispatch via turbo, verify pnpm+turbo bootstrap.
- **Phase D (5 steps, ~40 min):** rewrite REPO constant in 10 scripts/checks files, rewrite `root-allowlist.json`, rewrite `file-size.mjs` hardcoded paths, rewrite `destructive-ops-declared.mjs` SPEC glob, rewrite GitHub Actions workflows.
- **Phase E (5 steps, ~35 min):** write + wire `env-segregation.mjs`, install ESLint boundaries (storefront), write `workspace-boundary.mjs`, rewrite CLAUDE.md to monorepo constitution.

**Pipeline 1 exit gate:** `pnpm verify:full` from monorepo root exit 0; smoke matrix items 46-55 (CI + security gates) pass; **production untouched**.

### 2.4 Pipeline 2 — Phases F through H (production reconfig + smoke + archive)

- **Phase F (4 steps, ~45 min):** update Vercel storefront project root directory to `apps/storefront`, disconnect old storefront repo from Vercel, reconnect monorepo, set up ERP GitHub Pages deploy workflow, configure Pages source on new monorepo.
- **Phase G (1 wrapper step, ~30 min):** execute the 60-item functional smoke matrix.
- **Phase H (4 steps, ~25 min):** archive old repos, update MEMORY.md cross-references, write monorepo README.md, author FOREMAN_REVIEW.md.

**Pipeline 2 exit gate:** All 60 smoke items pass (or document any pre-existing failures matching source-repo TECH_DEBT baselines); both archive banners visible on old repos.

---

## 3. The 34-step execution plan

The Module Strategist authors the SPEC with these 34 steps. Each step has: What / Why / How (exact commands) / Verify / Rollback / Risk / Deps. The complete plan is the appendix to this Brief — full text in `MONOREPO_MIGRATION_EXECUTION_PLAN.md` (a sibling document the Module Strategist creates from §3 of `Research #5` output).

**For brevity here, only the step IDs + risk levels:**

| Phase | Step | Title | Risk |
|---|---|---|---|
| A | A1 | Create empty `opticalis/opticup-monorepo` repo | LOW |
| A | A2 | Clone empty monorepo; seed `main` + `develop` | LOW |
| A | A3 | Add ERP source as remote; fetch | LOW |
| A | A4 | `git subtree add --prefix=apps/erp erp-source/develop` | MED |
| A | A5 | Verify ERP subtree count match | LOW |
| A | A6 | `git mv apps/erp/supabase/ supabase/` (hoist to root) | MED |
| A | A7 | Skeleton monorepo files (package.json, pnpm-workspace, turbo, gitignore, etc.) | LOW |
| A | A8 | Create `apps/erp/package.json` workspace member | LOW |
| A | A9 | Move `.github/`, `.husky/`, `.vscode/`, governance docs out of `apps/erp/` to root | MED |
| A | A10 | Local smoke: serve `apps/erp/` via http-server; verify HTML loads | MED |
| B | B1 | Add storefront source as remote; fetch | LOW |
| B | B2 | `git subtree add --prefix=apps/storefront storefront-source/develop` | MED |
| B | B3 | Byte-verify `vercel.json` (8,594 lines exactly) | LOW |
| B | B4 | Rename storefront workspace member to `@opticup/storefront` | LOW |
| B | B5 | Delete `apps/storefront/supabase/` scratch | LOW |
| B | B6 | Update `pnpm-workspace.yaml` to include `apps/storefront` | LOW |
| C | C1 | Write `turbo.json` with `globalEnv: []` + per-task env | MED |
| C | C2 | Write root `package.json` with turbo dispatch scripts | LOW |
| C | C3 | Rewrite `.husky/pre-commit` to call `pnpm verify` | MED |
| C | C4 | `pnpm install && pnpm verify` end-to-end | MED |
| D | D1 | Rewrite REPO constant in 10 `scripts/checks/*.mjs` files | **HIGH** |
| D | D2 | Rewrite `root-allowlist.json` for monorepo root | **HIGH** |
| D | D3 | Rewrite `file-size.mjs` hardcoded `modules/storefront/` path | MED |
| D | D4 | Rewrite `destructive-ops-declared.mjs` SPEC glob | MED |
| D | D5 | Rewrite GitHub Actions workflows | **HIGH** |
| E | E1 | Write `scripts/checks/env-segregation.mjs` | MED |
| E | E2 | Wire env-segregation to pnpm + turbo + pre-commit | LOW |
| E | E3 | Install ESLint Nx-style tag boundaries in storefront | LOW |
| E | E4 | Write `scripts/checks/workspace-boundary.mjs` | LOW |
| E | E5 | Rewrite CLAUDE.md to monorepo constitution (all 32 Iron Rules verbatim) | **HIGH** |
| -- | -- | **DANIEL VERIFICATION BREAK (15 min)** | -- |
| F | F1 | Update Vercel storefront project root directory to `apps/storefront` | **HIGH** |
| F | F2 | Disconnect old storefront repo from Vercel; reconnect monorepo | **HIGH** |
| F | F3 | Create `erp-pages-deploy.yml`; deploy `apps/erp/` to `gh-pages` branch | **HIGH** |
| F | F4 | Configure GitHub Pages source on new monorepo + verify DNS | **HIGH** |
| G | G1 | Execute 60-item smoke matrix | -- |
| H | H1 | Archive old `opticup` + `opticup-storefront` repos | LOW |
| H | H2 | Update MEMORY.md cross-references | LOW |
| H | H3 | Write monorepo README.md | LOW |
| H | H4 | Author FOREMAN_REVIEW.md | LOW |

**Total: 34 steps + Daniel break + smoke wrapper.**

---

## 4. Functional smoke matrix (60 items)

The Module Strategist's SPEC §3 Success Criteria reproduces the 60 items from `Research #5 §5`. Summary by category:

| Category | Items | Notes |
|---|---|---|
| ERP screens (24 HTML) | 1-24 | All load, no console errors, PIN auth works, CEO permissions resolve |
| Storefront pages | 25-37 | Hebrew home + EN + RU + products + brands + categories + branches + lab + supersale + short-link + sitemap + CMS catch-all + image proxy |
| API routes | 38-41 | `/api/image`, `/api/leads/submit`, `/api/normalize-logo`, `/api/supersale-stock` |
| Edge Functions baseline | 42-45 | pin-auth, submit-lead, lead-intake, send-message |
| CI/CD | 46-50 | `verify.yml`, husky pre-commit, Vercel preview, ERP Pages deploy, Lighthouse |
| Security gates | 51-55 | env-segregation, ESLint boundaries, workspace-boundary, Iron Rule 31, Iron Rule 32 |
| Post-migration acceptance | 56-60 | Old repos archived, no false deploys, `pnpm verify:full` from root, Sentinel Mission 10, first cross-app PR |

**Pass criterion:** 60/60 PASS (or documented pre-existing failures matching source-repo TECH_DEBT baselines — none introduced by migration).

---

## 5. Pre-Migration Setup (Phase 0 — Daniel-side, before dispatching Pipeline 1)

| # | Requirement | Daniel action |
|---|---|---|
| 0.1 | Fresh `git clone` of both repos in a NEW directory (avoid the existing working copies with index corruption) | Confirm at session start |
| 0.2 | Backup tags pushed on both repos: `pre-monorepo-migration-2026-MM-DD` | Daniel runs `git tag` + `git push --tags` on both before Pipeline 1 |
| 0.3 | `gh` CLI authenticated for org `opticalis`, scopes: `repo`, `workflow`, `admin:org` (to create new repo + delete-on-rollback) | Daniel confirms `gh auth status` |
| 0.4 | `vercel` CLI authenticated, team `team_4pZvxSwlV0sJeAnzb7RYxBL2` selected | Daniel confirms `vercel teams ls` |
| 0.5 | `pnpm` 9.x installed | Daniel confirms `pnpm --version` |
| 0.6 | Supabase MCP connected (already in environment) | Verified by Pipeline at bootstrap |
| 0.7 | M1 Phase 2 work + Funnel work COMPLETE and merged to main on both repos | **Daniel confirms.** This Brief is dispatched AFTER both lines settle. |
| 0.8 | No in-flight Pipelines on either source repo | Daniel confirms; no other Claude Code session running |
| 0.9 | Working directory has ≥10 GB free | The recursive `modules/Module 3 - Storefront/backups/` is 138k files |
| 0.10 | Vercel dashboard access (web UI fallback for project settings) | Daniel logged in |
| 0.11 | `.gitignore` includes `modules/*/backups/` patterns BEFORE Phase A step 4 | Verified pre-A4 |

---

## 6. Scope — Out (anti-creep)

Explicitly NOT in this migration:

- **Refactoring `js/shared.js`, `js/auth-service.js`, or any module business logic** — move-only, byte-identical.
- **Cleaning up the 18 storefront TECH_DEBT items** — survives unchanged.
- **Resolving TD-2** (31 MCP-applied migrations not in git) — separate SPEC, blocks tenant-2 onboarding but not this migration.
- **Splitting the 24 Iron Rule 12 file-size violators** (inventory.html 1046 lines, etc.) — separate refactor SPECs.
- **Moving `apps/erp/js/` into `packages/shared/`** — deferred per locked decision #2.
- **M1 Phase 2 quartet** (foundation-permissions / K2 / variant-less / stock-adjustment) — must complete BEFORE this migration (Phase 0 requirement #0.7).
- **The storefront-demo Vercel project** (`prj_8bNP1xOFF7Lg93bt2e6ZEMPsrYU6`) — out of scope; production project only.
- **Module 3 phase-letter governance rule** (CLAUDE.md §7) — survives unchanged; storefront uses descriptive names, ERP-side owns letters.
- **Iron Rules 24-30 text** (storefront-scoped) — survives; only paths in their cross-references update.
- **`apps/erp/_archive/` content reorg** — keep verbatim.
- **Edge Function consolidation or refactor** — none.
- **Supabase database touches** — ZERO during migration. No migrations applied. No policies changed. No EF redeployed.

---

## 7. What MUST NOT happen during migration

| Constraint | Value |
|---|---|
| Storefront prod (`prizma-optic.co.il`) downtime | ≤ 2 min |
| ERP prod (`app.opticalis.co.il`) downtime | ≤ 10 min |
| Supabase RLS / policy / EF / migration changes | **ZERO** |
| Commit history loss in either repo | **ZERO** (`git subtree add` mandatory; `git rm + cp -r` forbidden) |
| Manual interventions Daniel must perform mid-Pipeline | (a) approve Vercel project re-link via web UI if CLI insufficient (1 click), (b) verify smoke matrix results between Pipelines, (c) confirm archive of old repos in Phase H |
| Production database touches | **ZERO** |
| `git push --force` to monorepo `main` | Forbidden after F4 |
| Iron Rule 31 (integrity gate) silent bypass | **ZERO** — husky pre-commit must keep firing |
| Iron Rule 32 (destructive ops gate) silent bypass | **ZERO** — must keep firing on monorepo root + apps/erp/scripts/ |

---

## 8. Risk Register (top 10 — see Research #5 §4 for full table)

| Step | Failure mode | Likelihood | Mitigation | Rollback |
|---|---|---|---|---|
| A4 | Subtree-add silently corrupts ERP history; backup files bloat tree | MED | Pre-flight `du -sh` + A5 count match | `git reset --hard HEAD~1` (safe — quiescent monorepo) |
| A6 | Hoisting `supabase/` breaks paths in `apps/erp/scripts/` | MED | Inventory `../supabase/` refs pre-move; rewrite in D-phase | Reverse `git mv` |
| C3 | husky pre-commit doesn't fire Iron Rule 31+32 → silent governance breach | HIGH | Manual test commits with planted null-byte + undeclared destructive op | Reinstate hook from old `.husky/` |
| D1 | REPO constant mis-resolution → 10 checks silently pass when they should fail | **HIGH** | Plant known-failing input in each check; verify it fails post-rewrite | Revert path-rewrite commit |
| D2 | root-allowlist.json + CLAUDE.md §0.5 drift → root discipline breaks | **HIGH** | Single PR with both files; reviewer cross-checks | Revert PR |
| D5 | ERP Pages workflow misconfig → `app.opticalis.co.il` 404s | **HIGH** | F3 + F4 staging: test on side-branch first | Keep old repo Pages serving 7 days as fallback |
| F1-F2 | Vercel project root directory misconfig → storefront prod blank | **HIGH** | Test preview deploy on feature branch BEFORE switching production | Re-link old storefront repo; force redeploy |
| F3-F4 | ERP DNS propagation delay → up to 1 hour ERP downtime worst case | **HIGH** | Pre-staged workflow tested on staging Pages first; CNAME byte-identical | DNS-level temporary redirect to old Pages URL |
| E5 | CLAUDE.md rewrite introduces governance ambiguity | MED | Side-by-side diff with Daniel; preserve every Iron Rule verbatim | Revert; rewrite minimally |
| H1 | Archive too early → loses ability to fast-rollback | LOW | H1 runs only after G1 (smoke matrix) ALL pass | Unarchive via gh CLI (reversible) |

---

## 9. Rollback plan (full)

**Trigger conditions for full abort:**
- F1, F2, F3, or F4 fails after >30 min of debugging.
- Smoke matrix items 25-37 (storefront prod routes) return 5xx >5 min.
- Smoke items 1-24 (ERP prod) return 5xx >15 min.
- Daniel calls abort.

**Procedure to restore two-repo state:**
1. Vercel: re-link `opticalis/opticup-storefront` to project `prj_HGz6OkwugkH6Nlw3FiomNPDp96QH`; trigger redeploy from last known good commit. (~5 min)
2. GitHub Pages: unarchive `opticalis/opticup` if archived; Pages keeps serving from `main` root. DNS unchanged → ERP recovers ≤10 min cache.
3. Delete `opticalis/opticup-monorepo` (clean state).
4. Restore both source repos' archive status to false.
5. Daniel verifies both prod sites.

**Data loss surface:** ZERO. Subtree adds preserve full history; deletion of monorepo doesn't touch source repos; backup tags remain.

**Downtime exposure per phase:**
- Phases A-E: zero (Pipeline 1 happens in brand-new repo, not yet wired to production).
- Daniel break: zero (no changes).
- Phase F: ≤2 min storefront (Vercel re-link), up to 10 min ERP realistic (Pages cache).
- Phase G+H: zero.

---

## 10. Inherited discipline patterns (from M1 Pipelines)

The Pipeline must apply ALL harvested patterns from prior M1 work:

- **§0 Inner-call arity audit + Smoke-touched schema audit** (mandatory per harvested A1 + A2 patterns).
- **§11 Concurrent-Pipeline awareness orthogonality envelope** — declare which files this Pipeline touches (essentially the entire repo, since this IS a structural reorg) and assert no other Pipeline can run in parallel.
- **MIGRATION.md Applied Log** convention (per harvested E1) — every `git subtree add` / `git mv` / `gh` / `vercel` / `pnpm` command logged with timestamp.
- **`advisors-for-objects.mjs` gate** (per harvested E2) — N/A for this migration (no new DB objects); skip but document.
- **P-AUTHOR-1 UI-level smoke MANDATORY for screen-gated SPECs** (counter 2/3 — promote here if firing again, which Phase G does for ALL screens) — the smoke matrix items 1-37 are UI-level smoke; this Pipeline auto-promotes P-AUTHOR-1 to skill.
- **P-AUTHOR-3 RPC body pre-flight probe** (counter 1/3) — N/A (no RPC changes).
- **P-AUTHOR-4 Brief-vs-DB-reality gap audit** (counter 1/3) — N/A (no DB).
- **Iron Rule 32 declared Destructive Operations:** `git subtree add` is NOT destructive (additive history merge). `git mv` of `apps/erp/supabase/` to `supabase/` IS a rename (declared). `git rm apps/storefront/supabase/` scratch dir IS destructive (declared). Repo archive is NOT destructive. **Explicit declaration in SPEC §7.**

---

## 11. Reading list for the Module Strategist (in order)

1. This Brief — start here.
2. The 5 research outputs (synthesized into this Brief but full text useful for deep dives):
   - Research #1 — File inventory + module classification.
   - Research #2 — Secrets, env vars, deploy chains, CI.
   - Research #3 — Cross-file dependency graph.
   - Research #4 — Storefront repo inventory.
   - Research #5 — Migration plan synthesis (34 steps + 60 smokes).
3. `CLAUDE.md` (current ERP) — all sections; the rewrite preserves 100% of Iron Rules verbatim.
4. `opticup-storefront/CLAUDE.md` — Iron Rules 24-30, Frozen Files, Quality Gates.
5. `MASTER_ROADMAP.md` — current state, Module 3 SESSION_CONTEXT drift documentation.
6. `OPEN_TASKS.md` item #4 — the original "Module Repo Split" placeholder that this Brief supersedes.
7. `docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md` — the 7+1 cross-repo coordination pattern that this migration eliminates.

---

## 12. Hand-off — Pipeline shape

**Pipeline 1 Activation Prompt:** `MONOREPO_MIGRATION_PIPELINE_1_ACTIVATION_PROMPT.md` (sibling file). Daniel pastes into a fresh Claude Code chat to run Phases A-E end-to-end (~3 hours). Pipeline 1 ends with `pnpm verify:full` PASS + smoke items 46-55 PASS + ONE Hebrew status line to Daniel.

**Daniel verification break (15 min):** Daniel reviews CLAUDE.md rewrite + the new tree + EXECUTION_REPORT.md from Pipeline 1. On GO: dispatches Pipeline 2.

**Pipeline 2 Activation Prompt:** `MONOREPO_MIGRATION_PIPELINE_2_ACTIVATION_PROMPT.md` (sibling file). Daniel pastes into a fresh Claude Code chat to run Phases F-H + smoke matrix (~1.75 hours). Pipeline 2 ends with all 60 smoke items + ONE Hebrew status line.

After 🟢 on both: `M7` and `M9` Pipelines can be authored on the monorepo. The Module 1.5 placeholder in `OPEN_TASKS.md` #4 closes.

---

*End of Brief. Two-Pipeline monorepo migration. Zero Supabase touches. Zero data loss. Daniel-only authorization gates between Pipelines.*
