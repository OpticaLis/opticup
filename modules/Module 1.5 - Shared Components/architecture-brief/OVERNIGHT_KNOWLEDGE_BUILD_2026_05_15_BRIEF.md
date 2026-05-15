# OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15 — Architecture Brief

> **Status:** Brief sealed 2026-05-15 night · Owner: Architect · Mode: READ-ONLY KNOWLEDGE BUILD
>
> **Duration target:** 12+ hours autonomous, single Claude Code session.
>
> **Isolation:** **MANDATORY** — runs in a separate git worktree on a dedicated branch (`claude/overnight-knowledge-build-2026-05-15`). The user has a parallel Claude Code session running on `develop` in `C:\Users\User\opticup\`. Zero interference allowed.
>
> **One-line:** Read-only, 12+ hour knowledge build that pre-flights 7+ upcoming SPECs (P2.3, Phase 2.5, FB CAPI validation, M11 Supplier Portal, M4 dispatch performance, M1B downstream, security drift) so tomorrow's work skips from "investigate" straight to "execute."

---

## 1. Goal

Convert 12+ overnight hours into a documentation deposit that makes the next 1-2 weeks of FUNNEL + Module work measurably faster. Every knowledge map produced reduces the corresponding SPEC's author time from hours to minutes — because the SPEC author can cite real measurements instead of guesses.

**What "success" means:** tomorrow morning, every SPEC stub queued in `OPEN_TASKS.md` has a knowledge-build report behind it. SPEC authoring becomes a 30-min activity per SPEC, not a 3-hour investigation each.

## 2. Background

**Why this Brief exists:**

Today (2026-05-15) closed 5 merges to main, ~410 commits including STOREFRONT_PUBLIC_DATA_LAYER + FB CAPI hybrid dedup (both halves). System is in a stable post-merge state. Daniel wants overnight value but has a parallel session running and cannot tolerate file conflicts.

**Why knowledge build over Sentinel audit:**

Sentinel finds tickets. Knowledge build builds momentum. P2.3 + Phase 2.5 + FB CAPI validation + 0c + 0d are all queued — each currently requires ~2-3 hours of investigation before its SPEC can be authored. Doing the investigation upfront, ONCE, in a 12-hour read-only sweep, compounds: the next 5+ SPEC sessions become "implement what's already mapped" instead of "discover then implement."

The pattern is proven — `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` (the original site-overseer knowledge map) produced 11 gap findings + 10 open questions in one session, which then drove all of Phase 1 + Phase 2 of the funnel work. We are reusing that template for FUNNEL Phase 2.3 + Phase 2.5 + adjacent module foundations.

## 3. Scope — 9 Missions

Each mission produces ONE knowledge map file under `roles/site-overseer/knowledge-build/funnel-q3/` (or appropriate role/module subfolder). Missions are **independent** — if one hits a blocker, the executor skips it and continues with the next (per `feedback_overnight_run_pattern.md` memory).

**Priority order** (most FUNNEL-value first):

### Mission 1 — Template Validation Map (P2.3 pre-flight) — 1-1.5 hrs
**File:** `roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md`

- Enumerate every row in `crm_templates` on Prizma (production) + demo.
- Parse each template body for placeholders (`%variable%` syntax + any other patterns).
- Compare against `required_variables` column (if it exists — verify schema first).
- Cross-reference with `send-message` EF source code: which placeholders are substituted, which trigger `unsubstituted_placeholder` errors.
- Map: where does validation run today (EF source / DB constraint / UI check / nowhere)?
- Identify: how many templates have validation gaps; classify each.
- **Deliverable:** complete validation gap list + recommendation on whether validation belongs in EF only, DB only, or both.

### Mission 2 — Phase 2.5 Funnel Health Dashboard Data Model — 1.5-2 hrs
**File:** `roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md`

- Map every metric that "funnel health" implies: touchpoint counts (by source/UTM/broadcast), broadcast performance (sent/delivered/clicked), lead→attendee conversion rate, FB pixel fired vs CAPI dispatched delta, no_match rate on CAPI queue, message send latency p50/p95, event registration funnel by event type.
- For each metric: which table(s) hold the data, which query computes it, is there an existing query in the repo or does it need to be authored.
- Identify gaps where data isn't being captured (e.g., "click-through rate" needs a derived column or rollup table).
- Sketch a 1-page dashboard layout (which metric goes where, refresh cadence, drill-down paths).
- **Deliverable:** complete data model spec — ready for Phase 2.5 build SPEC author.

### Mission 3 — FB CAPI Post-Launch Validation Plan — 1-1.5 hrs
**File:** `roles/site-overseer/knowledge-build/funnel-q3/M3_FB_CAPI_VALIDATION_PLAN.md`

- Investigate Meta Events Manager API: which endpoints expose match-quality scores, dedup metrics, event delivery rates programmatically.
- Find if there's a Make scenario template or Edge Function pattern for periodic Meta API polling.
- Document the required Meta Business Manager permissions for token holder to enable API access.
- Sketch a "CAPI health check" cron-driven job: every N hours, query Meta API for last X events, write to a new monitoring table, alert if match_quality drops below threshold.
- **Deliverable:** SPEC stub for `M4_FB_CAPI_POST_LAUNCH_MONITORING` (estimated effort, schema deltas needed, cron schedule, alert thresholds).

### Mission 4 — Pixel Validation Gap Dashboard Query Authoring — 30-60 min
**File:** `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md`

- P2.1 D5 absorbed P2.2 substrate into the CAPI queue. The remaining work is a one-page dashboard query.
- Author the query: rows where `crm_leads.fb_pixel_fired_at IS NULL` AND `crm_leads.created_at < NOW() - INTERVAL '1 hour'` AND `crm_leads.fb_event_id IS NOT NULL` (CAPI dispatched but pixel never fired = pixel gap).
- Test on demo (read-only).
- Sketch dashboard UI snippet (vanilla JS, where to host in ERP).
- **Deliverable:** ready-to-implement query + UI sketch.

### Mission 5 — M11 Supplier Portal Data Layer Mapping — 2-2.5 hrs
**File:** `modules/Module 11 - Reports/architecture-brief/M11_SUPPLIER_PORTAL_DATA_LAYER_MAP.md`

- STOREFRONT_PUBLIC_DATA_LAYER established the mirror-table pattern (`*_public`). M11's Supplier Portal will reuse the pattern with a sibling projection (`supplier_*_public`).
- Enumerate every table that a supplier should see: purchase orders involving them, debt rows for their account, return-to-supplier requests, payment status, inventory levels of their products.
- For each: define the proposed `supplier_*_public` projection (columns to expose vs hide).
- Cross-reference with M11 Architecture Brief (sealed 2026-05-09) to confirm consistency.
- Identify any tables not already in the pattern that need to be added.
- **Deliverable:** complete supplier_*_public projection map — ready for M11 build SPEC author.

### Mission 6 — M4 Dispatch Performance Baseline — 1-1.5 hrs
**File:** `modules/Module 4 - CRM/docs/state/M4_DISPATCH_PERFORMANCE_BASELINE_2026_05_15.md`

- STATUS_CHANGE_TRIGGERS_FRAMEWORK (closed 2026-05-13) measured 38ms multi-channel delta vs ~1000ms pre-fix (26× improvement).
- Build a current-baseline dataset: query last 7 days of `crm_message_log` + `crm_message_queue` to compute send-to-deliver latency p50/p95/p99 by channel (SMS / Email / WhatsApp).
- Identify outliers: which scenarios fall outside p99.
- Compare with pre-STATUS_CHANGE_TRIGGERS baseline if available (audit-harvest reports from earlier May).
- **Deliverable:** performance baseline doc — proves the dispatch pipeline is stable post-cutover; flags any regressions for SPEC.

### Mission 7 — M1B Phase 1B Downstream Inventory — 1.5-2 hrs
**File:** `modules/Module 1 - Inventory Management/architecture-brief/M1B_PHASE_1B_DOWNSTREAM_INVENTORY.md`

- M1 Lens Phase 1A schema landed 2026-05-14. M1B0_PURCHASE_ORDER_SCHEMA landed 2026-05-15.
- Phase 1B (6 customer-facing screens) is deferred — but the build prerequisites (M7 Order Entry, M9 Lab/KDS integration) can be inventoried now.
- Map every place in the codebase + DB that touches lens-related tables. Identify what's already wired, what's stub, what's missing.
- Cross-reference with M9 Brief sealed 2026-05-10 (Lab/KDS routing for lens jobs).
- **Deliverable:** complete downstream inventory — accelerates M1B Phase 1B SPEC authoring.

### Mission 8 — 0c BRAND_VISIBILITY_CASCADE Pre-Flight — 1 hr
**File:** `modules/Module 1.5 - Shared Components/architecture-brief/M1_5_BRAND_VISIBILITY_CASCADE_PREFLIGHT.md`

- Map the existing reactive cache implementation: `brands_public.has_sellable_inventory` + 3rd satellite trigger.
- Sketch E2E test cases for brand visibility cascade (brand toggles inactive → all child inventory_public rows must remain consistent until next trigger pass; concurrent INSERT ordering invariants).
- Decide on architecture for periodic pg_cron reconciler (vs trigger-only). Document trade-offs.
- **Deliverable:** SPEC stub ready for authoring — reduces 0c from 2-3 hrs to ~45 min SPEC + execution.

### Mission 9 — Security Drift Detection Sweep — 1-1.5 hrs
**File:** `docs/guardian/SECURITY_DRIFT_SWEEP_2026_05_15.md`

- Run Supabase advisor (`get_advisors`) on the post-merge state.
- Compare findings against the baseline from SECURITY_HOTFIX_3 closure (F-CRIT-1 100%, F-CRIT-2 17→0, F-CRIT-3 42→2).
- Identify any NEW findings introduced by today's 48 commits.
- For each new finding: classify severity, identify likely SPEC origin, propose remediation.
- This is 0d FUNCTION_REVOKES pre-flight + general security hygiene.
- **Deliverable:** if any new findings → SPEC stub for SECURITY_HOTFIX_5; if clean → confirmation report.

---

**Bonus — opportunistic discoveries:**

If executor finishes 9 missions before 12 hours, additional read-only work allowed:
- M5 Customer Card data audit (which fields exist, which are populated, which are dead).
- M7 Order Entry schema gap analysis (against M1 lens inventory schema, post-Phase 1A).
- M13 Loyalty Club seed data preparation (config rows for tier engine).
- Iron Rule audit on commits from last 14 days (Rule 14/15/21/22/23 spot-checks across 100+ commits).

**STOP rule:** if executor runs out of read-only work but still has time, write a meta-report summarizing what was learned, ranked by likely SPEC-acceleration value. Do NOT improvise into write operations.

## 4. Destructive Operations

Per Iron Rule 32: **None.**

This SPEC is purely read-only. No file deletes. No table drops. No git operations beyond `git log --read`, `git status`, `git diff`. No `git push --force`, no `git rebase`, no `git reset --hard`. No SQL writes (only SELECT). No EF deploys, no migration applies.

Single allowed file-write target: the knowledge-build files this SPEC creates under `roles/site-overseer/knowledge-build/funnel-q3/` + module-specific paths listed in §3.

## 5. Worktree Isolation Protocol — MANDATORY FIRST STEP

The user has a parallel Claude Code session running on `develop`. Zero interference is required.

**Setup (MUST be the executor's first action, before any other work):**

```bash
# In the existing C:\Users\User\opticup\ working tree:
git fetch origin
git worktree add C:\Users\User\opticup-overnight claude/overnight-knowledge-build-2026-05-15 origin/main
```

This creates an entirely separate working directory at `C:\Users\User\opticup-overnight\` checked out on a NEW branch `claude/overnight-knowledge-build-2026-05-15` based on `origin/main` (NOT develop — to avoid catching mid-flight develop work from the parallel session).

**From this point on:**
- Executor's working directory: `C:\Users\User\opticup-overnight\`
- All file reads, file writes, git commits happen in the worktree.
- The user's parallel session in `C:\Users\User\opticup\` is untouched.
- **Do not** `cd C:\Users\User\opticup\` for any reason during this SPEC.
- **Do not** `git checkout develop` in either working tree.
- **Do not** push to `develop`. Push only to `claude/overnight-knowledge-build-2026-05-15`.

**At SPEC close:**
- Final commit + push of the branch.
- Open a Pull Request from `claude/overnight-knowledge-build-2026-05-15` → `develop` (NOT main).
- Provide the PR URL in the closure status line.
- Daniel will merge the PR at his convenience.

**Worktree teardown (after merge — NOT in this SPEC):**

The user removes the worktree manually with `git worktree remove C:\Users\User\opticup-overnight\` once the PR is merged. The branch can be deleted then too.

**Why this exception to CLAUDE.md §9 #8 "No worktree branches":**

§9 #8 prevents orphan branches accumulating from execution sessions. This SPEC is read-only knowledge build with mandatory PR-to-develop closeout. The branch is explicitly temporary, named, and feeds back into develop via merge. It does NOT bypass the rule's spirit (clean ledger of work); it satisfies it via the PR mechanism.

## 6. Pipeline

Single executor session, no Foreman → Executor → Reviewer chain. Pure single-skill operation.

- **Skill:** opticup-executor.
- **Model:** Sonnet (`claude-sonnet-4-20250514`). Reasoning: 12+ hours, heavy file reads, mechanical data-gathering. Sonnet is faster + cheaper + lower content-filter risk than Opus for this workload. Save Opus for SPEC authoring tomorrow.
- **No Reviewer/Tester chain:** read-only output, no runtime surfaces changed, smoke regression impossible. Reviewer can run tomorrow on the PR before merge if Daniel wants — not part of this SPEC.

## 7. Locked Decisions

**D1. Worktree isolation is mandatory, not optional.** §5 above.

**D2. Branch `claude/overnight-knowledge-build-2026-05-15` is single-use.** Deleted after PR merge. Documented in §5.

**D3. Mission independence — skip-not-stop.** Per `feedback_overnight_run_pattern.md`: if one mission hits a blocker (e.g., a table doesn't exist as expected), executor writes a short FINDING.md note for that mission and continues to the next. STOP only on environmental failure (git broken, can't read repo).

**D4. Sub-agent authorization.** For data-gathering missions requiring large file enumeration (Mission 7 codebase-wide search), executor MAY spawn sub-agents via the Task tool. Sub-agent outputs feed back into the main mission file.

**D5. Output target: PR to develop, not main.** Per §5. Daniel reviews the PR; merge happens at his convenience.

**D6. Read-only enforcement.** §4. Executor must reject any in-flight temptation to "fix while reading." Findings are documented, not patched.

**D7. Commit cadence.** Aim for 1 commit per mission completion. 9-12 commits total. Each commit message: `docs(knowledge-build): mission <N> — <one-line summary>`.

**D8. Hebrew status line at close.** Per `feedback_overnight_run_pattern.md`: SHORT status line at end summarizing missions completed + missions skipped (with reason) + PR URL.

## 8. Success Criteria

1. Worktree created and isolated per §5 — zero interference with parallel session in `C:\Users\User\opticup\`.
2. Missions 1-9 attempted; outputs landed at their declared paths (or FINDING.md substitute if skipped).
3. ≥ 7 of 9 missions produce full knowledge maps (not just stubs).
4. Each mission file ≥ 200 lines OR ≥ 5 distinct sections (depth signal — not arbitrary length).
5. ≥ 3 SPEC stubs queued in mission outputs (P2.3, Phase 2.5, FB CAPI monitoring at minimum).
6. ≥ 9 commits on `claude/overnight-knowledge-build-2026-05-15`.
7. Branch pushed to `origin`.
8. Pull Request opened: `claude/overnight-knowledge-build-2026-05-15` → `develop`.
9. PR description summarizes missions + lists deliverable files.
10. Zero writes to any file outside the worktree.
11. Zero writes to `develop` branch.
12. Zero SQL writes (only SELECT statements).
13. Total runtime ≥ 8 hours (12+ target, 8 hours minimum to count as full session).
14. Final Hebrew status line provided.

## 9. Stop-Triggers

Executor MUST stop on any of:

- Worktree creation fails (git worktree command errors).
- Discovers it accidentally is in `C:\Users\User\opticup\` instead of `C:\Users\User\opticup-overnight\`.
- Any write attempted outside the worktree.
- Any SQL write (INSERT/UPDATE/DELETE/DROP/ALTER) — must be SELECT-only.
- Any EF deploy attempted.
- Branch protection prevents push to `claude/overnight-knowledge-build-2026-05-15`.

Per D3, individual mission blockers do NOT trigger stop — skip and continue.

## 10. Rollback Plan

Rollback is trivial since this is a worktree on a fresh branch. If anything goes wrong:
- `git worktree remove C:\Users\User\opticup-overnight\ --force` removes the entire worktree.
- `git branch -D claude/overnight-knowledge-build-2026-05-15` removes the branch.
- `git push origin --delete claude/overnight-knowledge-build-2026-05-15` removes the remote.

The `develop` branch + parallel session are completely unaffected by any failure mode.

## 11. Expected Final State

- New branch `claude/overnight-knowledge-build-2026-05-15` on `origin`, ahead of `main` by 9-12 commits (all documentation).
- Pull Request open from that branch → `develop`.
- 7-9 knowledge maps under `roles/site-overseer/knowledge-build/funnel-q3/` + module-specific paths.
- 3-5 SPEC stubs queued for tomorrow's work.
- Parallel session in `C:\Users\User\opticup\` 100% undisturbed.
- Worktree exists at `C:\Users\User\opticup-overnight\` ready for Daniel to remove after PR merge.

## 12. Out-of-Scope (explicit)

- Any execution work (code changes, schema changes, EF deploys).
- Tomorrow's SPEC authoring (deferred to next architect session).
- Tomorrow's execution (deferred to per-SPEC Pipeline runs).
- Worktree teardown (Daniel handles after PR merge).
- Sentinel missions (different skill, different output channel).
- FOREMAN_REVIEW (no Foreman in this pipeline).
- Iron Rule 31 integrity gate (read-only session, gate is for write integrity).
- Smoke test (no runtime change, smoke unchanged).

## 13. Cross-References

- `roles/site-overseer/FUNNEL_ROADMAP.md` Phase 2 + Phase 2.5.
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` (the prior knowledge-build deliverable).
- Memory: `feedback_overnight_run_pattern.md` (skip-not-stop rule + commit target + Hebrew status format).
- M11 Architecture Brief (sealed 2026-05-09).
- M1 Phase 1A SPEC + M1B0_PURCHASE_ORDER_SCHEMA closure (2026-05-15).
- STOREFRONT_PUBLIC_DATA_LAYER closure (2026-05-15) for Mission 8.
- M4_FB_CAPI_HYBRID_DEDUPLICATION + M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF (closed 2026-05-15) for Missions 3 + 4.

## 14. Author Notes

This is a 12-hour bet that documentation upfront beats discovery-during-execution. The pattern was validated by the original site-overseer knowledge-build (Phase 1 funnel infrastructure shipped end-to-end in 1 day after the knowledge map was ready). We're applying it again, this time for Phase 2.3 + Phase 2.5 + adjacent module foundations.

The worktree isolation matters more than the missions themselves. If the parallel session is corrupted by this work, the net effect is negative — we've slowed down two sessions at once. Worktree-first is non-negotiable.

---

*End of Brief. Activation Prompt in sibling file `OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_ACTIVATION_PROMPT.md`.*
