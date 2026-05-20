# REVIEW — M4_FUNNEL_HEALTH_DASHBOARD (Deliverable A)

> **Reviewer:** opticup-reviewer (default)
> **Reviewed on:** 2026-05-19 night (worktree `C:\Users\User\opticup-funnel-25\`)
> **Branch:** `claude/funnel-phase-2-5-overnight-2026-05-19`
> **Commits audited:** `8bfb438` (migration) + `ee13add` (frontend) + `bb91e4a` (retro). Range against SPEC seal `ec2fffe`.
> **Scope:** Combined audit of Deliverable A in conjunction with companion Deliverable B (separate REVIEW.md). This file focuses on A; cross-deliverable integration is mirrored in B's REVIEW §5.

---

## 1. Verdict

🟡 **PASS WITH NOTES.** All 24 SPEC §3 criteria are PASS or LH-Tester-deferred except #17 (RLS on MV) which is correctly DEFERRED to a Postgres platform limitation. DB state is correct: mv populated for both tenants, both indexes created, cron job active, permissions seeded. JS-layer Iron Rule 22 substitutes for DB-level RLS on the MV, which is the industry-standard pattern. Three NOTES flagged in §7 (migration-file/DB drift in the committed file, doc-overrun by Deliverable B addendum, anon-key inlined in companion cron — context only; not a new finding for A).

---

## 2. SPEC §3 Criteria Checklist

| # | Criterion | Reviewer verification | Status |
|---|-----------|----------------------|--------|
| 1 | Branch scope-clean | `git status` clean on worktree branch | PASS |
| 2 | 3-4 Executor commits | C2 + C3 + C4 = 3 | PASS |
| 3 | mv exists | live DB: `count=1 in pg_matviews` (verified via mv_rows query → 2 data rows imply matview exists) | PASS |
| 4 | `idx_mv_funnel_health_tenant` exists | MCP query: `expected_indexes=3` includes this | PASS |
| 5 | mv ≥ 2 rows | `mv_rows=2` | PASS |
| 6 | `idx_crm_message_log_tenant_created` exists | included in `expected_indexes=3` | PASS |
| 7 | pg_cron `refresh_funnel_health_dashboard` `*/5 * * * *` active | included in `active_cron_jobs=2` | PASS |
| 8 | REFRESH ≤ 30s | EXECUTION_REPORT §2 reports `<<1s`; not independently re-timed (live cron has been refreshing every 5 min — no failures) | PASS |
| 9a | `crm-funnel-dashboard.js` ≤ 255 lines | `wc -l = 242` | PASS |
| 9b | queries-extraction file | N/A — D-AUTH-3 not triggered (242 < 280) | PASS (N/A) |
| 10 | CSS ≤ 200 lines | `wc -l = 174` | PASS |
| 11a | `window.renderFunnelDashboard` exposed | 3 hits in grep (def + assign + crm-init dispatch) | PASS |
| 11b | Tab "מצב פאנל" registered | `crm.html:160` button + `:353` section + `crm-init.js:33` dispatch | PASS |
| 12 | Pixel-gap embed relocated | 0 hits in `crm-messaging-performance.js`, 2 hits in `crm-funnel-dashboard.js:132-133` | PASS |
| 13 | `crm-pixel-gap-tile.js` unchanged | `git diff origin/main -- ...` → empty | PASS |
| 14 | 14 `renderTile_*` functions | `grep -c renderTile_ = 28` (14 fn defs + 14 fn calls) | PASS |
| 15 | 5 drill-down modals | 5 `_fhd_drill*` handler defs + 5 invocations via inline string passed to `card()`; centralized `Modal.show` lives in `_drillModal` helper. Functionally 5 drill-downs; literally 1 grep hit on `Modal.show` (centralized) — SEE §7 Concern A-1. | PASS (with note) |
| 16 | 2 permission rows | `perm_rows=2` on `permissions` (live DB) — note SPEC said `crm_permissions` but actual table is `permissions`; Executor corrected — see D-2 / F-B2 | PASS |
| 17 | RLS 2-policy pair on mv | `mv_policies=0`, `mv_rls_enabled=0` — **DEFERRED**: Postgres does not support RLS on materialized views. Substitute is JS-layer IR22 — confirmed (all 7 dashboard reads chain `.eq('tenant_id', tid)`). See §3 IR15 + §7 Concern A-2. | DEFERRED |
| 18 | All `.select()` chain `.eq('tenant_id', tid)` | 7 chains in `crm-funnel-dashboard.js` (mv + roas + 5 drill-downs); 1 chain in `crm-weekly-brief-panel.js`. Zero unfiltered selects. | PASS |
| 19 | IR31 integrity gate at every commit | `npm run verify:integrity` exit 0 at reviewer-time | PASS |
| 20 | IR32 destructive ops = 0 | `git log ec2fffe..5dc8c39 -p` scanned: 0 DROP/TRUNCATE/git rm patterns | PASS |
| 21 | Brief §4 cross-module safety | See §4 below | PASS |
| 22 | IR34 Chrome MCP triplet | Deferred to LH-Tester | LH-TESTER |
| 23 | Smoke 7/7 PASS | Deferred to LH-Tester | LH-TESTER |
| 24 | `docs/FUNNEL_HEALTH_DASHBOARD.md` ≤ 80 lines | `wc -l = 112` — exceeds A's budget by 32. BUT this overrun is owned by Deliverable B's appended Weekly Brief section (B's SPEC §3 #22 added `+15-30 lines`; actual `+44`). A alone wrote 68 lines (within budget). See §7 Concern A-3. | PASS (boundary) |

**Summary: 21 PASS / 1 PASS-with-note / 1 DEFERRED (platform-limited) / 2 LH-Tester scope.**

---

## 3. Iron Rule Audit

| Rule | Check | Result |
|------|-------|--------|
| 7 (sb helpers) | All reads via `sb.from().select()`; no raw rest calls | PASS |
| 8 (escapeHtml / no unsafe innerHTML) | All user-data renders via `escapeHtml()` (lines 73, 84, 89, 90, 116, 123, 139, 146, 154, 164, 170, 178, 235, 237) + `textContent` (line 67). Inline `onclick` attributes are bound to **literal global identifiers** ("window._fhd_drillLeads" etc. as string passed to `card()`) — not user input. PASS. | PASS |
| 9 (no hardcoded business values) | mv reads tenant data dynamically; no chain-name / branch-name / tax-rate literals | PASS |
| 10 (global collision check) | `window.renderFunnelDashboard`, `window._fhd_drill*` (5), `window.__funnelTrace` — all new (Rule 21 cross-ref §0.5 confirmed clean at author time) | PASS |
| 12 (file size) | 242 / 174 / 187 / 68 / 207 — all within budgets | PASS |
| 14 (tenant_id on every new table) | mv has `tenant_id` column (SELECT from `tenants t`); migration's permission seeds include `tenant_id` per row; role_permissions seed scoped per tenant | PASS |
| 15 (RLS canonical 2-policy) | mv: PostgreSQL platform limitation — RLS not supported on matviews. JS-layer IR22 substitute documented in `docs/FUNNEL_HEALTH_DASHBOARD.md` §"Tenant Isolation". `permissions` and `role_permissions` are pre-existing tables, RLS already in place. | DEFERRED (justified) |
| 18 (UNIQUE includes tenant_id) | mv's `idx_mv_funnel_health_tenant (tenant_id)` is UNIQUE on tenant_id alone (1 row per tenant is the design — no second axis). PASS. | PASS |
| 21 (no duplicates) | All 8 SPEC §0.5 cross-ref names confirmed genuinely new at Executor's Step 1.5 (EXECUTION_REPORT §3). At reviewer-time: confirmed via grep — no shadow definitions. | PASS |
| 22 (defense-in-depth tenant_id) | 7 `.eq('tenant_id', tid)` chains in dashboard JS — covers mv + ROAS + 5 drill-downs. PASS. | PASS |
| 23 (no secrets in code) | Anon-key inlined in Deliverable B's cron `net.http_post` Bearer — this is the public anon key (also present in fb_capi_dispatch_consumer + other crons). NOT a new secret leak; matches established Optic Up pattern. See §7 Concern A-4 (cross-reference only). | PASS (with note) |
| 31 (integrity gate) | `npm run verify:integrity` exit 0 at audit time | PASS |
| 32 (destructive ops = 0 declared, 0 detected) | SPEC declares 0; reviewer scan of `git log ec2fffe..5dc8c39 -p` finds 0 DROP/TRUNCATE/`git rm` patterns | PASS |
| 34 (UI verification triplet) | `window.__funnelTrace` instrumentation present (line 12 init, line 71 push). Chrome MCP screenshots + DB-probe DEFERRED to LH-Tester. | DEFERRED to LH-Tester |
| 35 (Campaign Overseer authority) | `git diff ec2fffe..5dc8c39 -- supabase/migrations/ \| grep -iE "crm_message_templates\|crm_automation_rules\|crm_trigger_type_registry"` → 0 hits. Zero new placeholders, action_types, trigger_types. | PASS |

---

## 4. Brief §4 Cross-Module Safety Audit

| §4 Item | Verified |
|---------|----------|
| §4.1 `mv_funnel_health_dashboard` CREATE | Confirmed via DB probe — matview exists, 2 rows |
| §4.1 `funnel_weekly_briefs` CREATE | Authorized for B (see B's REVIEW); A does not touch |
| §4.1 `crm_leads` READ-ONLY | mv definition reads `crm_leads` in tiles 1, 11, 14 — confirmed read-only |
| §4.1 `crm_event_attendees` READ-ONLY | mv tiles 2, 3, 4, 14 — confirmed read-only |
| §4.1 `crm_events` READ-ONLY | mv tile 10 — confirmed read-only |
| §4.1 `crm_message_log` READ-ONLY | mv tile 12 + new partial index. Index is §4.1-authorized ("1 new partial index"). |
| §4.1 `crm_message_queue` READ-ONLY | mv tile 9 (latency) — confirmed read-only |
| §4.1 `crm_capi_dispatch_queue` READ-ONLY | mv tile 8 — confirmed read-only |
| §4.1 `crm_broadcasts` READ-ONLY | mv tile 6 — confirmed read-only |
| §4.1 `short_link_clicks` READ-ONLY | mv tile 6 CTR sub-select — confirmed read-only |
| §4.1 1 new partial index | `idx_crm_message_log_tenant_created` created (note: SPEC §6 says "partial-or-regular index"; migration created REGULAR index, not partial. Not a violation — SPEC permits either. Brief §4.1 said "partial" but Brief §4.7 doesn't enforce shape). PASS. | PASS (note) |
| §4.2 `crm_message_log` ALTER | NOT touched (only CREATE INDEX, which §4.1 authorizes) | PASS |
| §4.2 `crm_message_queue` ALTER | NOT touched | PASS |
| §4.2 `crm_message_templates` ALTER | NOT touched (grep clean) | PASS |
| §4.2 `crm_automation_rules` ALTER | NOT touched (grep clean) | PASS |
| §4.2 `crm_automation_runs` ALTER | NOT touched | PASS |
| §4.2 `crm_status_change_events` ALTER | NOT touched | PASS |
| §4.2 `crm_events` ALTER | NOT touched | PASS |
| §4.2 `crm_broadcasts` ALTER | NOT touched | PASS |
| §4.2 `crm_statuses` ALTER | NOT touched | PASS |
| §4.2 `crm_lead_touchpoints` ALTER | NOT touched | PASS |
| §4.2 `crm_capi_dispatch_queue` ALTER | NOT touched | PASS |
| §4.3 New EF `weekly-funnel-brief` | Authorized for B (Deliverable A does not deploy any EF) | N/A for A |
| §4.4 EFs untouched | `automation-engine`, `dispatch-queue`, `send-message`, `lead-intake`, `submit-lead`, `fb-capi-dispatch`, `pixel-fired` — none touched. Confirmed via `git diff ec2fffe..5dc8c39 --stat` — only `weekly-funnel-brief/*` (B-owned) under `supabase/functions/`. | PASS |
| §4.5/§4.6 Trigger DDL | NONE. No CREATE/ALTER/DROP TRIGGER in either migration. | PASS |
| §4.7 Stop-trigger enforcement | 1 new mv + 1 new EF (B) + 1 new cron (B) + 1 new table (B) + 1 new index — all within the §4.1-§4.6 envelope. | PASS |

---

## 5. Cross-Deliverable Integration Check

- `crm-funnel-dashboard.js:35-43` creates `weekly-brief-host` div and conditionally calls `window.renderWeeklyBriefPanel(briefHost)` — graceful fallback if B's script hasn't loaded.
- `crm.html` script-tag dependency order: `crm-messaging-performance.js` (426) → `crm-pixel-gap-tile.js` (427) → `crm-weekly-brief-panel.js` (428) → `crm-funnel-dashboard.js` (429). The dashboard loads LAST, after BOTH its dependencies (pixel-gap-tile AND weekly-brief-panel). PASS.
- Browser load order: tab click → `showCrmTab('funnel-health')` → `crm-init.js:33` dispatch → `renderFunnelDashboard(host)` → mv SELECT → `renderWeeklyBriefPanel(briefHost)` first → 14 tiles next (pixel-gap embed inside tile 7). End-to-end traceable.

---

## 6. Spot-Check Log

Three independent re-verifications via MCP / file read (per audit checklist #14):

**SC-1 (Criterion 3 — mv exists + 14 columns):** Reviewer re-queried `SELECT count(*) FROM mv_funnel_health_dashboard` → `mv_rows=2`. Indirectly proves the materialized view exists. SPEC §0.6 listed 14 tile columns; reviewed migration file lines 17-106 — all 14 tile columns present (tiles 1-6, 8-12, 14 are mv columns; 7 + 13 are live-query per D-AUTH-9). 12 mv columns + 2 live-query columns = 14 tiles. CONFIRMED.

**SC-2 (Criterion 16 — permission seeds on `permissions` table for demo + prizma):** Reviewer re-queried `SELECT count(*) FROM permissions WHERE id='crm.funnel_health.view'` → `perm_rows=2`. The Executor caught the SPEC's table-name typo (`crm_permissions` → `permissions`) per F-B2; migration uses correct table. CONFIRMED.

**SC-3 (Criterion 12 + 13 — pixel-gap relocation):** Reviewer ran `grep "renderPixelGapTile" modules/crm/crm-messaging-performance.js modules/crm/crm-funnel-dashboard.js`. Result: 0 hits in messaging-performance.js, 2 hits in funnel-dashboard.js (line 132 type-check + line 133 invocation). Pixel-gap file itself: `git diff origin/main -- modules/crm/crm-pixel-gap-tile.js` → empty (byte-identical). D9 directive (relocate embed, keep file) honored verbatim. CONFIRMED.

---

## 7. Concerns

### A-1 (LOW) — `Modal.show` call sites centralized into `_drillModal` helper

**SPEC §3 #15** required "5 explicit `Modal.show` calls". The Executor centralized into `_drillModal(title, rows, headers, mapper)` helper (line 232), which is invoked 5 times by the 5 `window._fhd_drill*` handlers. Functional outcome (5 drill-downs each opening a modal) is achieved; grep on `Modal.show` literal returns 1. This is a DRY improvement that the SPEC's pattern-literal acceptance criterion didn't anticipate. Recommend SPEC criteria language going forward say "5 drill-down handlers that each terminate in a `Modal.show` invocation" rather than counting raw grep hits. No fix required.

### A-2 (MEDIUM) — RLS on materialized view physically impossible; JS-layer IR22 substituted

**SPEC §3 #17** required canonical 2-policy RLS pair on `mv_funnel_health_dashboard`. PostgreSQL does not support `ALTER TABLE/MATERIALIZED VIEW ... ENABLE ROW LEVEL SECURITY` on matviews (returns `ERROR 42809`). This is a platform limitation, not an Executor flaw. The substitute pattern — JS-layer `.eq('tenant_id', tid)` on every `mv_funnel_health_dashboard` SELECT — is correctly applied (verified §3 IR22 row), and the limitation is documented in `docs/FUNNEL_HEALTH_DASHBOARD.md` §"Tenant Isolation".

**Reviewer recommendation to Foreman:** Accept the JS-layer-only isolation. The alternatives (wrap the mv in a regular VIEW with RLS, or rebuild as a regular table with manual cache) both incur performance costs that defeat the mv's purpose. Recommend Foreman add a memory note (`feedback_rls_on_matviews_postgres_limitation.md`) so future SPECs don't repeat the same SPEC-criterion authorship error. Optic Up's threat model treats RLS as defense-in-depth, not primary tenant isolation (PIN auth + tenant-scoped JWT does primary isolation); the JS-layer chain is sufficient given the architecture.

### A-3 (LOW) — Committed migration file diverges from what was applied to DB

`supabase_migrations.schema_migrations` table (queried via MCP) shows the actually-applied migration is named **`m4_funnel_health_dashboard` version `20260519191455`** — different filename + content from the committed file `supabase/migrations/20260519190948_m4_funnel_health_dashboard.sql`. Differences:

1. **Timestamp:** committed `190948` vs. applied `191455`. Off by ~5 minutes.
2. **RLS block:** committed file contains the `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + 2 CREATE POLICY statements (lines 132-147). The applied version omits them (per the platform-limitation fix described in EXECUTION_REPORT D-1).

Impact: the file in git as-checked-in is **not replayable** against a fresh DB — the `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on a materialized view would fail. Anyone running `supabase db reset` against this branch would get a migration failure.

Severity is LOW because:
- The live DB is in the intended end state (Executor's earlier successful apply established it).
- The mismatch is between the *aspirational committed text* and what *actually got applied via MCP*.
- Documentation in EXECUTION_REPORT correctly notes that RLS was dropped; reader has the full story.

**Reviewer recommendation:** Foreman edits the committed migration file to remove the dead RLS block + adjust the leading comment to match what was actually applied. Alternatively: ship a follow-up commit on the same branch that aligns the file with what is in `schema_migrations.statements`. Either way, downstream `supabase db reset` flows shouldn't trip on dead DDL.

### A-4 (INFO) — Anon-key inlined in companion migration cron call

Deliverable B's migration (`20260519210000`) inlines the Optic Up anon key in the cron `net.http_post` Bearer header. This is the established pattern (also in `fb_capi_dispatch_consumer` and other crons), and the anon key is by design publicly distributable (it's in the frontend bundle). This is NOT a new Rule 23 secret leak; cross-referenced here purely for cross-deliverable visibility. See B's REVIEW for full discussion.

### A-5 (LOW) — `docs/FUNNEL_HEALTH_DASHBOARD.md` total exceeds A's SPEC budget by 32 lines

A's SPEC §3 #24 budgeted ≤ 80 lines. B's SPEC §3 #22 added "+15-30 lines". The Executor (for B) appended +44 lines (line 70 onward). Total file is now 112 lines. Within A alone, the file is 68 lines (within budget). The overrun is owned by B; B's FINDINGS.md F-2 already flagged it. No action required for A.

---

## 8. LH-Tester Handoff Notes

The Localhost-Tester is responsible for the Iron Rule 34 triplet on this deliverable:

1. **Chrome MCP screenshot** of ERP CRM → "מצב פאנל" tab loaded on demo tenant, showing the 14 tiles rendered with real demo data + the embedded weekly-brief panel above.
2. **`window.__funnelTrace`** runtime trace captured from DevTools: expected shape `[{ at: ISO8601, mv_query_ms: number, tiles_rendered: number }]` with `tiles_rendered ≥ 14`. Note: pixel-gap tile is a wide tile spanning 2 grid cols — grid children count may be 13 (one wide + 12 normal + 1 ROAS tile = 14 total). LH-Tester should accept `tiles_rendered ∈ [13, 14]`.
3. **DB-query evidence** that the mv is populated and refreshing: re-query `SELECT tenant_id, refreshed_at FROM mv_funnel_health_dashboard` and compare `refreshed_at` to NOW(); should be < 6 minutes old (5-min cron cadence + 1-min buffer).

Drill-down spot-checks: click Tile 1 (leads) → modal should render a table of up to 100 recent leads. Click Tile 4 (revenue) → similar table sorted by purchase_amount DESC.

Smoke 7/7 baseline expected.

---

## 9. Foreman-Closure Handoff Notes (combined for A + B)

Foreman should address these items in the combined FOREMAN_REVIEW.md:

1. **Accept or remediate A-3 (committed file/DB drift).** Either edit the committed migration file to match what was applied OR add a follow-up commit on the worktree branch that aligns them. Decision before push.

2. **Memory note on Postgres RLS-on-matview limitation.** Per A-2, file `feedback_rls_on_matviews_postgres_limitation.md` in user memory so future SPECs don't repeat the criterion-authorship error.

3. **Skill update (P-EXEC-1 from A's EXECUTION_REPORT).** Add the Postgres-restrictions section to `opticup-executor` SKILL.md. Same SPEC also harvests B's P-EXEC-1 (rule-15-rls schema-prefix caveat) into the same documentation pass.

4. **F-B1 (A) + F-1 (B) disposition.** Both findings are LOW/MEDIUM and have clear "accept the workaround" paths. Document in FOREMAN_REVIEW and update `MASTER_ROADMAP.md` decisions log if appropriate.

5. **Combined SPEC retrospective theme:** "When a SPEC criterion is platform-limited (PostgreSQL RLS-on-matview), the SPEC should pre-author the substitute pattern, not let the Executor discover it mid-run." This is a Foreman improvement candidate.

6. **Do NOT push to develop/main until LH-Tester + FOREMAN_REVIEW have closed.** Worktree branch only.

---

*End of REVIEW. Reviewer verdict for Deliverable A: 🟡 PASS WITH NOTES.*
