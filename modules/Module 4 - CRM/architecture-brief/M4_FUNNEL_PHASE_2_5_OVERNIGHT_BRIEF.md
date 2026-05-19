# M4_FUNNEL_PHASE_2_5_OVERNIGHT — Architecture Brief

> **Status:** Brief sealed 2026-05-19 evening · Owner: Architect · Pipeline: Full-Auto (OVERNIGHT, worktree-isolated)
>
> **One-line:** Build the Funnel Health Dashboard + Weekly Optimization Brief generator + comprehensive M4 regression audit. Single overnight run, worktree-isolated, ~8-12 hours autonomous, ships as PR to develop.
>
> **Risk class:** MEDIUM. Touches frontend + cron + adds 1 index (gated). Plus extensive Chrome MCP testing on M4 flows. **Cross-Module Safety Audit §4 binding** — zero touches to existing M4 messaging path.

---

## 1. Goal

Ship 3 connected deliverables in one autonomous overnight run:

**Deliverable A — Funnel Health Dashboard.** A 14-tile dashboard inside ERP CRM module showing the FUNNEL state: leads, conversions, broadcast performance, message latency, CAPI delta, unsubscribe rate, ROAS. 5-minute cache via materialized view.

**Deliverable B — Weekly Optimization Brief.** Auto-generated Sun-morning markdown file at `roles/site-overseer/weekly-briefs/YYYY-MM-DD.md`. Compares the week against prior weeks. Identifies trends (improving / degrading / steady). Suggests focus actions in 3-5 sentences. Uses Sentinel pattern — read-only, runs via pg_cron + Edge Function or scheduled task.

**Deliverable C — Comprehensive M4 Regression Audit.** Chrome MCP runs through every CRM flow end-to-end against demo tenant: lead intake → manual lead create → event create → registration → status changes → attendance → purchase recording → broadcast → automation rule firing → message dispatch → unsubscribe. Uses whitelist phones only. If a lead is consumed in one scenario, delete + recreate for the next. Captures screenshots + state transitions. Writes regression report.

After this Brief: Daniel has a live measurement dashboard + automatic Sun-morning analysis + concrete proof that M4 hasn't regressed since the last set of SPECs.

## 2. Background

**FUNNEL Phase 2 closes today** (P2.1 + P2.2 + P2.3 all done). Phase 2.5 is the next major deliverable.

Daniel directive (multiple sessions): *"I want to always improve, to know how to improve, what to improve."* Phase 2.5 is the **mechanism** that makes that real. Dashboard = data layer. Weekly Brief = analysis layer. Both run on the same SELECT queries; neither requires manual investigation each week.

Daniel directive (2026-05-19): *"I want a comprehensive audit at the end that checks regressions, code built incorrectly, bugs, comprehensive Chrome MCP check that M4 flows are intact."* — that's Deliverable C.

**Knowledge base for this Brief:**
- `roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md` — 14 metrics catalogued; 8 ready-to-query; 5 new queries authored; 1 blocked (now unblocked by P2.1-P2.3).
- `roles/site-overseer/knowledge-build/funnel-q3/M6_M4_DISPATCH_PERFORMANCE_BASELINE.md` — latency baselines for metrics #9 + dispatch health.
- `roles/site-overseer/knowledge-build/funnel-q3/M9_SECURITY_DRIFT_SWEEP_2026_05_15.md` — security baseline; audit (Deliverable C) extends it for M4.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — what audit must verify still holds.
- `_archive/m4-qa-2026-05-18/M4_FULL_QA_REPORT_2026_05_18.md` — last comprehensive M4 audit; this audit re-runs the same surfaces + new ones.

## 3. Scope

### 3.1 Deliverable A — Dashboard (`M4_FUNNEL_HEALTH_DASHBOARD`)

**Files:**
- New `modules/crm/crm-funnel-health-dashboard.js` (~300-400 lines max; split if exceeds Iron Rule 12).
- Possibly extract `modules/crm/crm-funnel-tiles/` subdirectory with one file per metric tile if cleaner.
- Modify `crm.html` or relevant CRM SPA shell to register the new tab "מצב פאנל" / "Funnel Health".
- New CSS in `css/crm-funnel-dashboard.css` (additive only).

**Tiles (14 total — from M2 knowledge map §3):**

| # | Tile | Source query | Refresh |
|---|---|---|---|
| 1 | Leads captured (30d) + 7d delta | knowledge map §5.x existing | 5min cache |
| 2 | Lead → attendee conv rate | knowledge map §5.3 | 5min cache |
| 3 | Attendee → buyer conv rate | `v_crm_event_stats` | 5min cache |
| 4 | Total revenue 30d + 7d delta | `crm_event_attendees` SUM | 5min cache |
| 5 | Source mix donut (FB / organic / broadcast / direct) | `v_crm_lead_first_touch` | 5min cache |
| 6 | Top 5 broadcasts by CTR | knowledge map §5.2 | 5min cache |
| 7 | **Pixel/CAPI Gap tile (already exists — `crm-pixel-gap-tile.js`)** | EXISTING — reuse, move from messaging hub to here | reuse |
| 8 | CAPI queue health (sent / failed / skipped) | `crm_capi_dispatch_queue` GROUP BY status | 5min cache |
| 9 | Message send latency p50/p95/p99 | knowledge map M6 mission | 5min cache |
| 10 | Event registration funnel chart | `v_crm_event_dashboard` | 5min cache |
| 11 | Unsubscribe rate 7d / 30d | knowledge map §5.4 | 5min cache |
| 12 | Failed-send error breakdown | knowledge map §5.x new | 5min cache |
| 13 | Campaign ROAS / CAC table | `v_crm_campaign_performance` | 5min cache |
| 14 | Trend sparklines (4-week window) for #1, #2, #4 | composite | 5min cache |

**Materialized view for cache:**
- New `mv_funnel_health_dashboard` refreshed every 5 min via pg_cron.
- Single view containing aggregated tile data per tenant.
- REFRESH MATERIALIZED VIEW CONCURRENTLY to avoid locking.
- Index: `idx_crm_message_log_tenant_created` partial — knowledge map §1 TL;DR recommends.

**Layout:** 4-column grid on desktop, 2-column on tablet, 1-column on mobile (RTL Hebrew). Funnel chart spans top row. Sparklines collapse into mini-tiles. Reuse `Modal` pattern for drill-downs from each tile.

**Permissions:** new tab visible to roles with `crm.funnel_health.view` permission. Add to permissions registry.

### 3.2 Deliverable B — Weekly Optimization Brief

**File pattern:** `roles/site-overseer/weekly-briefs/YYYY-MM-DD.md` (Sunday's date).

**Generator:**
- Edge Function `weekly-funnel-brief` (new) — runs Sunday 06:00 IST via pg_cron.
- Reads `mv_funnel_health_dashboard` for current week + 4 prior weeks.
- Computes deltas per metric (current vs avg of 4 prior weeks).
- Classifies each metric: 📈 improved (>5% better) / 📉 degraded (>5% worse) / ➡️ steady.
- Writes markdown file. 3 sections: Summary (3 sentences), Improvements (bulleted), Concerns (bulleted with suggested focus).
- Commits the file to develop via service-role git? **NO — too risky.** Instead: writes to a new DB table `funnel_weekly_briefs` (one row per week per tenant) with markdown content as text column. The "file" is virtual; ERP UI surfaces it.

**ERP UI:**
- New "תקציר שבועי" panel on funnel dashboard.
- Shows current week's brief + history dropdown for past weeks.
- Read-only; AI-generated content marked clearly.

**No AI inference at runtime in v1.** The classification logic is deterministic (delta thresholds). v2 may add Anthropic API call to write the prose — that's a follow-up SPEC.

### 3.3 Deliverable C — Comprehensive M4 Regression Audit

**Execution location:** Chrome MCP against demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb) at `http://localhost:3000/crm.html?t=demo`.

**Whitelist phones (per memory `feedback_test_phone_numbers.md`):**
- `0537889878` (Daniel)
- `0503348349` (Daniel secondary)

**Audit flow — run EACH scenario, delete lead + recreate as needed for re-runs:**

1. **Lead intake via /supersale/ form on demo storefront** (3 sub-flows: HE/EN/RU). Verify lead lands in CRM with full attribution chain (UTM + fb_event_id).
2. **Manual lead create from CRM UI.** Verify required-field validation, save success.
3. **Lead status changes** (waiting → invited → confirmed → confirmed_verified, then warmed, then cancelled). Verify confirmation modal V2 fires correctly, automation rule triggers exactly once, message dispatches via cron consumer.
4. **Event create** with all 7 status types (planning → registration_open → registration_closed → in_progress → completed → cancelled → archived). Verify status-change modal flow for each transition.
5. **Attendee registration to event** via 3 paths: (a) lead form on storefront, (b) CRM manual add, (c) QR walk-in /quick-register/. Verify auto-promotion `waiting → invited` after message sent.
6. **Attendee status flips** (registered → confirmed → attended → purchased). Verify CAPI dispatch queue rows for CompleteRegistration + EventAttended + Purchase.
7. **Purchase amount entry** via event-day manage screen. Verify Purchase CAPI event fires once with correct value/currency.
8. **Broadcast wizard** end-to-end: pick template, pick audience filter, schedule, send, verify queue + log rows + recipient delivery (whitelist-only).
9. **Template editor lint (P2.3 new feature)** — save template with typo, verify warning. Save genuinely-new placeholder, verify confirmation modal.
10. **Unsubscribe flow** — click unsubscribe link in a test SMS, verify lead.unsubscribed_at populated + subsequent sends blocked.
11. **Soft-delete lead + restore** — verify activity_log row + restore RPC + UI.
12. **Dispatch queue health** — observe pg_cron tick consumes status_change events without duplication.

**For each scenario:**
- Capture before-state DB snapshot.
- Run flow via Chrome MCP.
- Capture after-state DB snapshot.
- Compare against expected delta.
- Capture screenshot at every state transition.
- Write findings to `_archive/m4-overnight-audit-2026-05-19/SCENARIO_<N>.md`.

**Lead recreation pattern:**
- Each scenario starts by ensuring a clean test lead with whitelist phone.
- If lead exists in non-clean state: delete (soft-delete RPC) then recreate.
- Maximum 20 lead create/delete cycles per session — log every one.

**Output:**
- `_archive/m4-overnight-audit-2026-05-19/AUDIT_REPORT.md` — executive summary, 1 page.
- `_archive/m4-overnight-audit-2026-05-19/SCENARIO_01.md..SCENARIO_12.md` — detail per scenario.
- `_archive/m4-overnight-audit-2026-05-19/screenshots/` — PNG per state transition.
- All findings classified: 🟢 PASS / 🟡 PARTIAL (works but suboptimal) / 🔴 REGRESSION (broken).

### 3.4 Out of scope (explicit)

- **Storefront repo work.** Pixel-fire on thank-you page already shipped (P2.2). Audit may test through demo storefront but won't modify storefront code.
- **Meta API testing on Prizma.** Demo only. Production verification deferred to manual operator check.
- **New placeholders or trigger types.** Iron Rule 35 boundary.
- **EF code changes** beyond the new `weekly-funnel-brief` EF.
- **Schema changes** beyond `mv_funnel_health_dashboard` (materialized view) + `funnel_weekly_briefs` table + 1 partial index.
- **Real-time updates.** Dashboard refreshes every 5 min via mv. No WebSocket / live polling.
- **AI prose generation in Weekly Brief v1.** Deterministic templates only. AI prose = follow-up SPEC.

## 4. Cross-Module Safety Audit (BINDING — Daniel directive after M4 incident)

This section enumerates EVERY surface the SPEC touches. Executor MUST stop if anything outside this list is needed.

### 4.1 Database tables — what this SPEC touches

| Surface | Access | Reason |
|---|---|---|
| `mv_funnel_health_dashboard` | **CREATE** (materialized view) | Dashboard cache |
| `funnel_weekly_briefs` | **CREATE** (new table) | Weekly Brief storage |
| `crm_leads` | **READ-ONLY** | Dashboard queries + audit |
| `crm_event_attendees` | **READ-ONLY + audit-only WRITES** (delete+recreate for test cases) | Dashboard queries + audit scenarios |
| `crm_events` | **READ-ONLY + audit-only WRITES** (create+delete for test cases) | Dashboard queries + audit |
| `crm_message_log` | **READ-ONLY** | Latency + error breakdown |
| `crm_message_queue` | **READ-ONLY** | Dispatch health |
| `crm_capi_dispatch_queue` | **READ-ONLY** | CAPI tiles |
| `crm_lead_touchpoints` | **READ-ONLY** | Source mix + broadcast touch |
| `crm_broadcasts` | **READ-ONLY** | Broadcast perf |
| `crm_automation_rules` | **READ-ONLY** | Audit verification |
| `crm_message_templates` | **READ-ONLY** | Audit verification |
| `crm_statuses` | **READ-ONLY** | Lookup |
| `crm_unsubscribes` | **READ-ONLY** | Unsubscribe rate |
| `short_link_clicks` | **READ-ONLY** | CTR queries |
| 1 new partial index | **CREATE INDEX CONCURRENTLY** on `crm_message_log` | Performance |

### 4.2 EXPLICITLY NOT TOUCHED

- All M4 messaging-path EFs: `automation-engine`, `dispatch-queue`, `send-message`, `lead-intake`, `submit-lead`, `fb-capi-dispatch`, `pixel-fired`.
- All M4 DB triggers.
- All non-M4 modules (M1/M2/M3/M5+).
- `_shared/template-validation.ts`.
- All `crm_*` triggers.
- `tenants`, `storefront_config`, `tenant_branches`, etc.

### 4.3 Edge Functions — what this SPEC touches

| EF | Access | Reason |
|---|---|---|
| `weekly-funnel-brief` (NEW) | CREATE | Sunday morning brief generator |

### 4.4 EFs EXPLICITLY NOT TOUCHED

All other EFs.

### 4.5 DB triggers — what this SPEC touches

NONE.

### 4.6 DB triggers — EXPLICITLY NOT TOUCHED

All M4 triggers — including the dual-path fix from M4_DUAL_PATH_CLEAN_FIX.

### 4.7 Stop-trigger — enforcement

If executor pre-flight finds need to:
- Touch any item in §4.2/§4.4/§4.6 → STOP, escalate.
- Add new placeholder, trigger_type, action_type → STOP (Iron Rule 35).
- Modify any existing EF beyond §4.3 → STOP.
- Create more than 1 new EF → STOP.
- Create more than 1 new table → STOP.

## 5. Worktree Isolation Protocol — MANDATORY

Per overnight-run convention (matches 2026-05-15 OVERNIGHT_KNOWLEDGE_BUILD pattern):

```bash
cd /sessions/cool-wonderful-wright/mnt/opticup
git fetch origin
git worktree add C:\Users\User\opticup-funnel-25 claude/funnel-phase-2-5-overnight-2026-05-19 origin/main
cd C:\Users\User\opticup-funnel-25
```

**Executor working directory:** `C:\Users\User\opticup-funnel-25\` for ALL operations.

- Do NOT cd to `C:\Users\User\opticup\` (the parallel session might be active).
- Do NOT push to `develop`.
- Push to `claude/funnel-phase-2-5-overnight-2026-05-19` branch only.
- At end: open PR to `develop`.

**Daniel removes worktree manually after PR merge.**

## 6. Locked Decisions

**D1. Materialized view + pg_cron 5-min refresh, NOT WebSocket / real-time.** Performance + simplicity. Future SPEC may add WS if Daniel demands.

**D2. Weekly Brief stored in DB table, not git-committed by EF.** Service-role git push from EF is risky + brittle. ERP UI surfaces the table content as a "virtual file".

**D3. Deterministic classification for Weekly Brief v1.** Hardcoded thresholds (±5% = improved/degraded). v2 adds AI prose. v1 ships fast.

**D4. Audit uses Chrome MCP, not just SQL probes.** Per Daniel directive: "real flow check via Chrome." SQL probes are necessary but not sufficient.

**D5. Audit may delete + recreate test leads up to 20 times per session.** Whitelist-only. Logs every action.

**D6. Audit findings classified 🟢/🟡/🔴 — Foreman closes 🟡 if ANY 🔴 found.** PR is reviewable but should not auto-merge to develop until Daniel reviews 🔴 findings.

**D7. Cross-Module Safety Audit §4 binding.** Same as P2.2b + Purchase Events.

**D8. Worktree branch is single-use.** Auto-cleanup after PR merge.

**D9. Reuse `crm-pixel-gap-tile.js` — DO NOT recreate.** Move from current location (messaging hub) to new funnel dashboard. Daniel's directive 2026-05-19.

**D10. Permissions: new `crm.funnel_health.view` permission seeded.** Maps to admin + business-owner roles by default.

## 7. Success Criteria

1. Materialized view `mv_funnel_health_dashboard` exists + populated for both tenants.
2. pg_cron job refreshes it every 5 min.
3. 14 tiles rendered on new "מצב פאנל" tab.
4. Each tile loads in <500ms (5-min mv cache makes this trivial).
5. Drill-down modals work for top 5 tiles (leads, conversions, broadcasts, latency, CAPI).
6. New table `funnel_weekly_briefs` exists.
7. Edge Function `weekly-funnel-brief` deployed.
8. pg_cron job triggers Sun 06:00 IST.
9. Manual test-run produces a brief for last completed week — markdown format, 3 sections.
10. ERP UI surfaces brief as panel.
11. Pixel gap tile moved successfully — no broken references in messaging hub.
12. Permission `crm.funnel_health.view` seeded for both tenants.
13. 1 partial index created on `crm_message_log`.
14. **AUDIT (Deliverable C):**
    - All 12 scenarios attempted.
    - At least 11/12 PASS (🟢) — single 🟡 acceptable, any 🔴 must be documented + reviewer notified.
    - Screenshots captured per state transition.
    - `AUDIT_REPORT.md` published with executive summary.
15. Smoke 7/7 PASS on worktree branch.
16. Iron Rule 31 integrity gate passes.
17. Iron Rule 32 declared = 0 destructive ops (test data delete is audit-only, declared in advance).
18. Cross-Module Safety Audit §4 holds — Reviewer confirms zero touches outside §4.1/§4.3/§4.5.
19. PR opened from `claude/funnel-phase-2-5-overnight-2026-05-19` → `develop`.
20. Total branch ahead of main by 8-15 commits (estimate).

## 8. Stop-Triggers

Executor MUST stop on any of:

- Worktree creation fails.
- Realizes accidentally in `C:\Users\User\opticup\`.
- Any write outside worktree.
- Push attempted to `develop`.
- §4.7 violation.
- Iron Rule 31 gate fails.
- Smoke regresses.
- Chrome MCP cannot connect to localhost:3000 (verify dev server up before starting audit).
- Audit scenario fails with 🔴 regression on a flow that worked yesterday — STOP audit at that scenario, document, continue with remaining scenarios.
- Materialized view refresh exceeds 30 seconds (performance regression).
- More than 50 test leads created during audit (over budget — investigate before continuing).

Per overnight convention: skip-not-stop on individual deliverable problems IF the problem is localized. Hard stop on environmental/security/scope-violation issues.

## 9. Rollback Plan

Worktree-based. Worst-case:
```
git worktree remove C:\Users\User\opticup-funnel-25 --force
git branch -D claude/funnel-phase-2-5-overnight-2026-05-19
git push origin --delete claude/funnel-phase-2-5-overnight-2026-05-19
```

Parallel session in `C:\Users\User\opticup\` completely unaffected.

DB rollback (if PR merged + needs revert):
- DROP MATERIALIZED VIEW mv_funnel_health_dashboard.
- DROP TABLE funnel_weekly_briefs.
- Undeploy weekly-funnel-brief EF.
- Unschedule pg_cron jobs.
- Revert frontend code.

All additive; safe rollback.

## 10. Expected Final State

- New branch `claude/funnel-phase-2-5-overnight-2026-05-19` ahead of main by 8-15 commits.
- PR open to develop.
- 14-tile dashboard renders on demo.
- Weekly brief generates correctly on test-run.
- Audit report shows ≥11/12 scenarios 🟢.
- Worktree at `C:\Users\User\opticup-funnel-25\`.
- Parallel `C:\Users\User\opticup\` untouched.

## 11. Commit Plan (indicative)

- C1: Materialized view + index + permission seed.
- C2: Dashboard tiles JS + CSS (Deliverable A).
- C3: Tab registration + funnel-pixel-gap-tile move.
- C4: funnel_weekly_briefs table + EF + pg_cron schedule (Deliverable B).
- C5: Weekly brief UI surface.
- C6: Audit scenarios 1-4 (Deliverable C).
- C7: Audit scenarios 5-8.
- C8: Audit scenarios 9-12.
- C9: AUDIT_REPORT.md + screenshots.
- C10: Documentation update + memory updates.
- C11: FOREMAN_REVIEW + closure.

## 12. Cross-References

- Knowledge maps M2 + M6 + M9 (overnight 2026-05-15).
- `M4_FB_CAPI_HYBRID_DEDUPLICATION` + follow-ups (closed 2026-05-15..19).
- `M4_FB_CAPI_PURCHASE_EVENTS` (closed 2026-05-19).
- `M4_TEMPLATE_VALIDATION_UNIFIED` / `M4_TEMPLATE_VALIDATION_UI_LINT` (running same day).
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — audit must verify this still holds.
- `_archive/m4-qa-2026-05-18/M4_FULL_QA_REPORT_2026_05_18.md` — prior comprehensive audit, baseline for regression.
- `FUNNEL_ROADMAP.md` Phase 2.5 + Phase 2.5 mention of weekly brief.

## 13. Author Notes

This is the **largest single Brief** in the FUNNEL roadmap. Combining the dashboard + the brief generator + the audit makes sense because:
- All 3 share the same query base (the SELECT queries from M2 knowledge map).
- The audit validates that the dashboard's data is trustworthy.
- The brief consumes the dashboard's view.

Doing them as 3 separate SPECs would mean 3 worktree setups, 3 PRs, 3 review cycles. As one overnight: 1 setup, 1 PR, 1 review.

After this Brief lands: **FUNNEL is at steady-state operation.** Dashboard live, weekly brief automatic, audit confirms M4 healthy. Daniel reads 30 seconds Sunday morning, knows where to focus.

---

*End of Brief. Activation Prompt in sibling file `M4_FUNNEL_PHASE_2_5_OVERNIGHT_ACTIVATION_PROMPT.md`.*
