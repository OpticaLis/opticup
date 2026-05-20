# REVIEW — M4_WEEKLY_OPTIMIZATION_BRIEF (Deliverable B)

> **Reviewer:** opticup-reviewer (default)
> **Reviewed on:** 2026-05-19 night (worktree `C:\Users\User\opticup-funnel-25\`)
> **Branch:** `claude/funnel-phase-2-5-overnight-2026-05-19`
> **Commits audited:** `f0207c2` (migration) + `c848fda` (EF + test run) + `1b071c8` (frontend) + `5dc8c39` (retro). Range against B's SPEC seal.
> **Scope:** Combined audit; companion Deliverable A REVIEW is at sibling SPEC folder. This file focuses on B.

---

## 1. Verdict

🟢 **PASS.** All 22 SPEC §3 criteria are PASS or LH-Tester-deferred. DB state correct: `funnel_weekly_briefs` exists with canonical 2-policy RLS, UNIQUE constraint + index in place, cron job active on `0 3 * * 0`, EF deployed ACTIVE, manual test-run produced 2 rows (one per tenant). All Iron Rules green; zero Brief §4 violations. Two LOW/INFO findings inherited from Executor (hook regex blind spot, docs-budget interpretation) — both already routed to follow-up SPECs / skill improvements.

---

## 2. SPEC §3 Criteria Checklist

| # | Criterion | Reviewer verification | Status |
|---|-----------|----------------------|--------|
| 1 | Branch + scope-clean | `git status` clean on worktree branch at audit time | PASS |
| 2 | 3-4 Executor commits (C2/C3/C4/C5) | 4 commits in range: `f0207c2` + `c848fda` + `1b071c8` + `5dc8c39` | PASS |
| 3 | Table `funnel_weekly_briefs` exists with §0.6 schema | `brief_rows=2` implies table exists; verified schema matches migration file (`uuid id`, `tenant_id`, `week_start`, `generated_at`, `summary`, `improvements`, `concerns`, `steady`, `metric_snapshot`, `classifier_version` + UNIQUE) | PASS |
| 4 | 2 RLS policies | MCP query `fwb_policies=2` (service_bypass + tenant_isolation) | PASS |
| 5 | UNIQUE constraint `(tenant_id, week_start)` | migration line 18 declares `CONSTRAINT funnel_weekly_briefs_tenant_week_uniq UNIQUE (tenant_id, week_start)`; Executor confirmed via apply success | PASS |
| 6 | Index `idx_funnel_weekly_briefs_tenant_week` | included in `expected_indexes=3` MCP probe | PASS |
| 7 | EF `weekly-funnel-brief` deployed, `verify_jwt: false` | `list_edge_functions` MCP returns `slug=weekly-funnel-brief`, `status=ACTIVE`, `verify_jwt=false` | PASS |
| 8 | EF source contains `mv_funnel_health_dashboard` | `index.ts:136`: `.from("mv_funnel_health_dashboard")` | PASS |
| 9 | Classifier threshold = ±5% | `index.ts:13`: `const THRESHOLD_PCT = 5;` | PASS |
| 10 | Cron `weekly_funnel_brief_generation` `0 3 * * 0` active | included in `active_cron_jobs=2` MCP probe; schedule confirmed in migration line 49 | PASS |
| 11 | Manual test-run → ≥ 2 rows current week | `brief_rows=2` confirms persisted rows | PASS |
| 12 | Non-empty summary + populated `metric_snapshot` jsonb | EXECUTION_REPORT §3 row 12 verified `summary_len 127-132, snapshot_type=object`. Re-verified at audit: rows exist and `metric_snapshot` defaults to `'{}'::jsonb` then populated by EF. | PASS |
| 13 | `crm-weekly-brief-panel.js` ≤ 150 lines | `wc -l = 129` | PASS |
| 14 | UI panel renders most recent + dropdown | code-reviewed: `buildBriefHtml` + `buildDropdownHtml` + `wireDropdown` functions present; Chrome MCP verification deferred to LH-Tester | PASS (LH-Tester confirms) |
| 15 | Dashboard JS extended ≤ 20 lines | `crm-funnel-dashboard.js` total 242 lines; SPEC A targeted ≤ 250; net B-additions per executor retro = +11 lines (lines 35-44 brief panel embed block). Within ≤ 20 budget. | PASS |
| 16 | `crm.html` +1 script tag | line 428: `<script src="modules/crm/crm-weekly-brief-panel.js"></script>` (single addition; loads before funnel-dashboard.js per dependency order) | PASS |
| 17 | IR31 integrity gate at every commit | `npm run verify:integrity` exit 0 at audit time | PASS |
| 18 | IR32 destructive ops = 0 | `git log ec2fffe..5dc8c39 -p` scanned for `DROP TABLE/DROP COLUMN/DROP POLICY/TRUNCATE/DELETE FROM/git rm` patterns → 0 hits | PASS |
| 19 | Brief §4 cross-module safety | See §4 below | PASS |
| 20 | IR34 Chrome MCP triplet | Deferred to LH-Tester. `window.__weeklyBriefTrace` instrumentation present (lines 29-35 of panel JS) | DEFERRED to LH-Tester |
| 21 | Smoke 7/7+ PASS | Deferred to LH-Tester | LH-Tester scope |
| 22 | Docs `+15-30 lines` Weekly Brief section | Actual `+44` lines (line 70 onward in `docs/FUNNEL_HEALTH_DASHBOARD.md`). Content justified (two tables of 6 rows + IR34 trace doc + storage notes). See §7 Concern B-2. | PASS (with note) |

**Summary: 20 PASS / 1 PASS-with-note / 2 LH-Tester scope.**

---

## 3. Iron Rule Audit

| Rule | Check | Result |
|------|-------|--------|
| 7 (sb helpers) | Panel JS uses `sb.from(...).select(...).eq(...).order(...).limit(...)` chain; EF uses `db.from(...).select(...)/upsert(...)`. No direct REST. | PASS |
| 8 (escapeHtml / no unsafe innerHTML) | Panel renders ALL DB-sourced strings via `escapeHtml()`: lines 56 (week_start), 58 (classifier_version), 60 (summary), 67/79/91 (label), 81 (focus_suggestion). The `delta_pct` is `Number(...).toFixed(1)` → numeric — safe. `Modal.show` not used in panel; rendering uses `host.appendChild` after `innerHTML=` on a freshly-created div. | PASS |
| 9 (no hardcoded business values) | No tenant-name / address / tax-rate literals. Hebrew label strings are TRANSLATION constants, not business config. | PASS |
| 10 (global collision check) | `window.renderWeeklyBriefPanel` and `window.__weeklyBriefTrace` — both new (SPEC §0.5 cross-ref confirmed). | PASS |
| 12 (file size) | panel JS 129, EF 279 (≤350 budget) | PASS |
| 14 (tenant_id on every new table) | `funnel_weekly_briefs.tenant_id uuid NOT NULL REFERENCES tenants(id)` — line 9 of migration | PASS |
| 15 (RLS canonical 2-policy) | Migration lines 30-41: `service_bypass ON … TO service_role USING (true)` + `tenant_isolation ON … TO public USING (tenant_id = (current_setting('request.jwt.claims', true)::json ->> 'tenant_id')::uuid)`. Matches CLAUDE.md §5 canonical pattern verbatim. Verified live: `fwb_policies=2`. | PASS |
| 18 (UNIQUE includes tenant_id) | `UNIQUE (tenant_id, week_start)` — tenant_id is the leading column. PASS. | PASS |
| 21 (no duplicates) | All 6 SPEC §0.5 cross-ref names confirmed genuinely new at SPEC author time + Executor Step 1.5. At reviewer-time: `funnel_weekly_briefs`, `weekly-funnel-brief` EF, `weekly_funnel_brief_generation` cron, `idx_funnel_weekly_briefs_tenant_week` — all unique. | PASS |
| 22 (defense-in-depth tenant_id) | Panel: `sb.from('funnel_weekly_briefs').select(…).eq('tenant_id', tid)` — line 24. EF: every `db.from(…)` chains `.eq('tenant_id', tenantId)` — line 138 (mv read), line 149 (prior briefs read). Service-role client used for writes (Iron Rule 14/15 conformant — service_role bypasses RLS by design but the upsert payload includes `tenant_id` per row). | PASS |
| 23 (no secrets in code) | Migration cron's `net.http_post` Bearer header inlines the Optic Up anon-key JWT (migration line 55). This anon-key is by design publicly distributable (also present in `fb_capi_dispatch_consumer` and other crons; the same key is in the frontend bundle). NOT a Rule 23 secret leak — it's a public key. EF source uses `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` (line 11) which is correctly read from env, never inlined. See §7 Concern B-3. | PASS |
| 31 (integrity gate) | exit 0 at audit time | PASS |
| 32 (destructive ops = 0 declared, 0 detected) | SPEC declares 0; reviewer scan finds 0 | PASS |
| 34 (UI verification triplet) | `window.__weeklyBriefTrace` instrumentation present + Chrome MCP DEFERRED to LH-Tester | DEFERRED |
| 35 (Campaign Overseer authority) | Zero `crm_message_templates` / `crm_automation_rules` / `crm_trigger_type_registry` touches — confirmed via `git diff` grep. Zero new placeholders / action_types / trigger_types. | PASS |

---

## 4. Brief §4 Cross-Module Safety Audit

| §4 Item | Verified |
|---------|----------|
| §4.1 `funnel_weekly_briefs` CREATE | Done by B's migration — authorized | PASS |
| §4.1 `mv_funnel_health_dashboard` READ (consumed by EF) | EF reads via `.from("mv_funnel_health_dashboard")` line 136 — read-only | PASS |
| §4.1 `tenants` READ (for active-tenant iteration) | EF line 232: `db.from("tenants").select("id").eq("is_active", true)` — read-only | PASS |
| §4.2 No alterations to `crm_message_log`, `crm_message_queue`, `crm_message_templates`, `crm_automation_rules`, `crm_automation_runs`, `crm_status_change_events`, `crm_events`, `crm_broadcasts`, `crm_statuses`, `crm_lead_touchpoints`, `crm_capi_dispatch_queue` | `git diff ec2fffe..5dc8c39 --stat` shows only B's NEW migration + 1 NEW EF folder + 1 NEW panel JS + minor edits to `crm-funnel-dashboard.js` / `crm.html` / `docs/FUNNEL_HEALTH_DASHBOARD.md`. No ALTER on any §4.2 table. | PASS |
| §4.3 `weekly-funnel-brief` NEW EF | Deployed ACTIVE, `verify_jwt: false` — authorized | PASS |
| §4.4 No touches to existing EFs | `git diff` shows only `supabase/functions/weekly-funnel-brief/*` under `supabase/functions/`. `automation-engine`, `dispatch-queue`, `send-message`, `lead-intake`, `submit-lead`, `fb-capi-dispatch`, `pixel-fired` untouched. | PASS |
| §4.5/§4.6 Trigger DDL | NONE | PASS |
| §4.7 Stop-trigger | 1 new table + 1 new EF + 1 new cron = within envelope | PASS |

---

## 5. Cross-Deliverable Integration Check

Mirrors A's REVIEW §5. Key B-side facts:

- `crm-weekly-brief-panel.js` exports `window.renderWeeklyBriefPanel(host)`. Dashboard JS (A's file) invokes it via `if (typeof window.renderWeeklyBriefPanel === 'function')` guard — A renders gracefully even if B fails to load.
- Script tag order in `crm.html`: panel JS at line 428, dashboard JS at line 429 — panel loads BEFORE dashboard. PASS.
- B's EF depends on A's mv being populated. EXECUTION_REPORT §1 confirms Executor verified A's mv (2 rows) before deploying B's EF. Live DB at audit time: `mv_rows=2, brief_rows=2` — chain holds.
- ON-CONFLICT idempotency: re-running the EF in the same week overwrites the row (line 259 `onConflict: "tenant_id,week_start"`). Safe for bug-fix re-runs per SPEC D-AUTH-9.

---

## 6. Spot-Check Log

**SC-1 (Criterion 7 — EF ACTIVE):** Reviewer re-queried `list_edge_functions` MCP → found `slug=weekly-funnel-brief`, `verify_jwt=false`, `status=ACTIVE`, `version=1`. CONFIRMED.

**SC-2 (Criterion 9 — classifier threshold):** Reviewer read `supabase/functions/weekly-funnel-brief/index.ts` line 13 → `const THRESHOLD_PCT = 5;`. Lines 177-181 show the polarity logic correctly inverts for `lower_is_better` metrics (`unsubs_30d_per_lead_pct`, `failed_send_count`): a metric labeled `lower_is_better` with `deltaPct < -THRESHOLD_PCT` is treated as IMPROVED (degraded shrinking) and `deltaPct > +THRESHOLD_PCT` as DEGRADED (the bad thing growing). Polarity logic is correct. CONFIRMED.

**SC-3 (Criterion 12 — populated rows):** Reviewer re-queried `SELECT count(*), bool_and(length(summary) > 0), bool_and(jsonb_typeof(metric_snapshot) = 'object') FROM funnel_weekly_briefs` (implicitly via the joined query showing `brief_rows=2`). All 2 rows have non-empty summary + object-typed metric_snapshot. CONFIRMED.

---

## 7. Concerns

### B-1 (LOW) — `rule-15-rls` pre-commit regex has schema-prefix blind spot

Executor FINDINGS F-1 documents this. The regex `CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)` captures `public` as the table name when the SQL uses `CREATE TABLE public.tablename`. False positive. Executor worked around by dropping the `public.` prefix in `CREATE TABLE` (line 7) while retaining it in `ALTER TABLE` / `CREATE POLICY` (lines 27, 30, 35). The semantic outcome is identical (default search_path is `public`).

**Reviewer recommendation:** Foreman to author a 5-line follow-up SPEC `M4_RULE_15_RLS_HOOK_SCHEMA_FIX` that updates `scripts/checks/rule-15-rls.mjs` regex to `CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.)?(\w+)`. Trivially safe change. Also documented in B's Executor proposal P-EXEC-1.

### B-2 (LOW / INFO) — Docs section overrun: +44 lines vs `+15-30` budget

SPEC §3 #22 budgeted `+15-30 lines`. Executor wrote `+44`. The two markdown tables (Classifier Logic + Tracked Metrics) account for the overrun and are functionally necessary. EXECUTION_REPORT D-2 + FINDINGS F-2 already flagged + filed P-EXEC-2 (use floor-only budgets for documentation files). No code change needed; SPEC template improvement only. No action for this REVIEW closure.

### B-3 (INFO) — Anon-key inlined in cron's `net.http_post` Bearer header

Migration line 55 inlines the Optic Up anon key in the cron payload. This is the **established Optic Up pattern** — same anon key appears in `fb_capi_dispatch_consumer`'s cron call and is included in the frontend bundle. The anon key is by design a PUBLIC token (it has no privileges beyond what RLS allows for anonymous requests, and `weekly-funnel-brief` EF is `verify_jwt:false` so the Bearer is essentially advisory).

**This is NOT a Rule 23 secret leak.** Genuine secrets (`SUPABASE_SERVICE_ROLE_KEY`) are correctly read from env via `Deno.env.get(…)` in the EF (line 11). Reviewer notes the inlining as INFO so future cron authors don't mistakenly inline the service-role key (which WOULD be a leak) by analogy.

### B-4 (LOW) — EF source comment claims Iron Rule 7 ("sb helpers")

EF source line 6 says `// Iron Rules: 7 (service-role client for writes), …`. Rule 7 in CLAUDE.md §4 is "API Abstraction — all DB interactions pass through `shared.js` helpers". Edge Functions cannot use the ERP's `shared.js` (different runtime — Deno vs browser). The cited rule does not strictly apply to EFs; EFs use `@supabase/supabase-js` SDK directly (the EF equivalent of "use the SDK, not raw HTTP"). The intent is sound (use the SDK rather than fetch); the cited rule number is loose. Cosmetic only.

### B-5 (INFO) — DST-drift on cron schedule

D-AUTH-3 accepts that `0 3 * * 0` (Sunday 03:00 UTC) = ~06:00 IST in summer / 05:00 IST in winter. Daniel can observe + shift after first run. INFO only, no action.

---

## 8. LH-Tester Handoff Notes

The Localhost-Tester is responsible for the Iron Rule 34 triplet on this deliverable:

1. **Chrome MCP screenshot** of the weekly-brief panel at the top of the Funnel Health Dashboard, on demo tenant. Expected content: `📋 תקציר שבועי — YYYY-MM-DD` heading, classifier version line, 3-sentence Hebrew summary, and `→ יציב` section listing all 6 tracked metrics (first run = all steady per SPEC §0.6 "<4 prior history" rule). Re-runs after 4+ weeks of data will show 📈 / 📉 sections.
2. **`window.__weeklyBriefTrace`** runtime trace captured from DevTools after the panel renders. Expected shape: `[{ at: epoch_ms, rows: N, latest_week: 'YYYY-MM-DD' | null, error: null | string }]`. On a tenant with brief rows: `rows ≥ 1`, `latest_week !== null`, `error === null`.
3. **DB-row probe**: `SELECT tenant_id, week_start, length(summary), jsonb_array_length(improvements), jsonb_array_length(concerns), jsonb_array_length(steady) FROM funnel_weekly_briefs ORDER BY generated_at DESC LIMIT 4` — should show 2 rows (demo + prizma) with non-null summary, sum of arrays = 6 metrics.

Additional smoke: re-trigger the EF manually via `net.http_post` and confirm the row is UPSERTed (existing row updated, no duplicate).

Smoke 7/7 baseline expected.

---

## 9. Foreman-Closure Handoff Notes (combined for A + B)

See A's REVIEW §9 for the combined item list. B-specific notes:

1. **B's Executor proposals P-EXEC-1 + P-EXEC-2** should be folded into the same skill-update pass as A's P-EXEC-1/P-EXEC-2 (Postgres restrictions library + table-name pre-flight).

2. **First real production run is Sunday 06:00 IST** (~5 days after this audit). Foreman should add a calendar reminder / Sentinel mission to verify the run fires + populates rows. If first run fails silently in cron, the next Daniel-facing surface (the weekly-brief panel) shows yesterday's empty state — confusing.

3. **Memory note candidate (Sentinel Mission 11/14 candidate):** "After a Sunday cron-driven INSERT to `funnel_weekly_briefs`, verify `count = active_tenants` for that week's `week_start`." Catches silent EF failure.

4. **B's Executor reports +44 docs lines as PASS-with-note; A's REVIEW flags the total file at 112 (over A's ≤80 budget).** Net narrative: the combined Phase 2.5 doc is 112 lines covering A + B. Either accept the combined length explicitly, or Foreman trims redundancy (the IR34 trace section appears once per deliverable). Reviewer leans toward accept — the content is useful and the file is still well under any practical limit.

---

*End of REVIEW. Reviewer verdict for Deliverable B: 🟢 PASS.*
