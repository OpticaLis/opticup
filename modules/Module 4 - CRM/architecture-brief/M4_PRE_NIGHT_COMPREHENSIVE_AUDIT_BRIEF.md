# M4_PRE_NIGHT_COMPREHENSIVE_AUDIT — Architecture Brief

> **Status:** Brief sealed 2026-05-20 · Owner: Architect · Pipeline: READ-ONLY single-skill (Localhost-Tester)
>
> **One-line:** Comprehensive read-only audit of Module 4 + all dependencies, mapping the exact risk surface for the planned night-run changes (Resend Failed Messages button + Skill Harvest + side audits). Returns a single Audit Report that the night-run Brief will reference. Zero code changes, zero DB writes, zero EF deploys.
>
> **Risk class:** ZERO. Pure read.

---

## 1. Goal

Before running the planned overnight Pipeline (Resend button + Skill Harvest + comprehensive M4 regression sweep), perform a complete pre-flight that proves with 100% confidence:

1. Every table the night-run will touch — has the columns we expect, in the count we expect, with the indexes we expect.
2. Every EF the night-run will modify — currently works correctly + has clear test paths.
3. Every UI surface the night-run will change — has its existing behavior documented + screenshot-captured for regression baseline.
4. Every M4 flow currently in production works (regression baseline) — so if the night-run breaks something, we know it wasn't already broken.

Deliverable: ONE document `_archive/pre-night-audit-2026-05-20/AUDIT_REPORT.md` summarizing all findings + risk classification + go/no-go recommendation for each planned night-run deliverable.

**The audit's job is to find every possible thing that could go wrong, BEFORE we change anything.**

## 2. Background

**Today's track record:**
- 4 successful merges to main (SMS hotfix, funnel-tab render hotfix, short-links 400 fix, short-links redesign).
- 3 regressions caught in-thread during short-links redesign (F-LEAD-ID, F-POSTGREST-1000, F-BOT-NOISE) — all surfaced ONLY because Daniel re-verified live on Chrome MCP after each pipeline closure. Without his manual verification, all 3 would have shipped silently to production.

**Lessons that justify this audit-first approach:**
- `feedback_probe_biggest_production_tenant` (saved today): demo-only verification masks scale-dependent bugs.
- `feedback_clicks_are_not_actions` (saved today): metric design must come from business state, not click events.
- 5 P-AUTHOR + P-EXEC proposals queued in FOREMAN_REVIEWs of today's SPECs — not yet harvested into SKILL.md.

**Why audit BEFORE night-run, not during:**
- Night-run runs autonomous (Daniel asleep). Cannot escalate every 30 minutes.
- Pre-flight catches schema/state issues in advance → night-run executes with zero surprises.
- Audit also serves as the regression baseline if night-run breaks something.

## 3. Scope — 9 audit missions

Each mission produces a section in the final AUDIT_REPORT.md. Missions are independent (skip-not-stop on individual blockers).

### Mission 1 — Resend-button pre-flight (~30 min)

Daniel wants a "שלח שוב" button on (a) crm_messaging_log + (b) crm_messaging_queue rows in 'failed' status. The button writes the row back to status='queued' so the dispatcher picks it up.

**Probe:**
- `crm_message_log` schema + indexes. Confirm: id, status, error_message columns exist + their types.
- `crm_message_queue` schema. Confirm same.
- Does status='failed' actually mean what we think? SELECT count(*) FROM crm_message_log GROUP BY status, error_message ORDER BY count DESC LIMIT 20. We need a clear taxonomy of failure reasons.
- Is there an existing similar mechanism that we can extend (Iron Rule 21)? Search for 'resend', 'retry', 'requeue' in modules/crm/*.js.
- Pre-flight on production: how many currently-failed messages exist on Prizma? If >1000, the button needs paging.
- RLS check: who's authorized to write status changes to queue/log? Confirm the resend button respects the same permissions.
- Identify ALL places in the codebase that currently update status on queue/log. The button must follow same pattern.

**Output:** Mission 1 section with: yes/no on existing-mechanism reuse, exact schema, exact UI placement candidates, risk-graded recommendation.

### Mission 2 — Skill Harvest pre-flight (~15 min)

5 patterns queued for skill update (P-AUTHOR-3/4/5 + P-EXEC-3/4/5 from FOREMAN_REVIEWs of today + Pattern A-E from earlier in session). Plus 2 feedback memories saved.

**Probe:**
- Read all FOREMAN_REVIEW files from today + yesterday. List every queued P-AUTHOR-N / P-EXEC-N proposal not yet applied to SKILL.md.
- Read current SKILL.md files (`.claude/skills/opticup-architect/SKILL.md` + `.claude/skills/opticup-executor/SKILL.md`). Confirm none of the queued proposals already exist (Iron Rule 21).
- Read `_archive/architect-pending-entries/`. List any DECISIONS_LOG entries pending.
- Confirm none of the proposed updates contradict existing SKILL content.

**Output:** Mission 2 section with: complete list of patterns to harvest, target file + section for each, prerequisite memory updates, conflict resolution if any.

### Mission 3 — M4 regression baseline (~60 min)

Comprehensive flow-by-flow check that current production state works. THIS IS THE BASELINE — if the night-run breaks something, we compare to this snapshot.

**Probe (Chrome MCP, demo tenant, whitelist phones only):**
- Lead intake via /supersale/ form (HE/EN/RU on demo storefront).
- Manual lead create from CRM UI.
- Lead status changes: full walk through actual demo status taxonomy (use `crm_statuses` table actual values, not assumed values).
- Event create + status walk through actual demo status taxonomy.
- Attendee registration via 3 paths (storefront / manual / quick_register).
- Attendee status flips (registered → confirmed → attended → purchased via purchase_amount).
- CAPI dispatch: confirm CompleteRegistration + EventAttended + Purchase events fire correctly.
- Purchase amount entry via event-day manage screen.
- Broadcast wizard end-to-end (DRAFT only — do NOT send).
- Template editor lint (P2.3 — verify Layer D fires on typo + new placeholder).
- Unsubscribe flow.
- Soft-delete + restore lead.
- Dispatch queue health observation (read-only).
- Funnel Health Dashboard load.
- Weekly Brief panel load.
- Short-links tab load (all 4 components — verify yesterday's regression-fixed state).

**Each flow:** capture before-DB-state snapshot → run flow via Chrome MCP → capture after-DB-state snapshot → screenshot every state transition → diff against expected delta.

**Test data:** whitelist phones (0537889878 + 0503348349). Delete + recreate leads as needed. Budget 50 leads max.

**Output:** Mission 3 section with: scenario-by-scenario PASS/PARTIAL/REGRESSION, screenshots in `_archive/pre-night-audit-2026-05-20/screenshots/`, full DB diffs.

### Mission 4 — Cross-Module ripple analysis (~30 min)

The night-run's resend button + skill harvest could affect:
- Messaging path (crm_message_queue → dispatch-queue EF → send-message EF → crm_message_log).
- Activity log writes.
- Permission system.
- Sentinel monitoring scripts.

**Probe:**
- Trace the FULL messaging path from button click → DB write → cron pickup → EF dispatch → SMS provider → log write. Document every hop + every table touched.
- Confirm activity_log writes are tied to the resend action correctly (audit trail).
- Confirm Sentinel rules don't flag legitimate resends as anomalies.
- Identify any sentinel/monitoring scripts that count failures — they might double-count if a resent message fails again.

**Output:** Mission 4 section with: dependency graph, list of secondary touches, recommendations to update sentinel rules if needed.

### Mission 5 — Pixel infrastructure pre-flight (~30 min)

Tomorrow morning we'll create a new Facebook Pixel + dual-deploy. Pre-flight what's needed:

**Probe:**
- Read existing pixel infrastructure: `storefront_config.analytics.pixel_events`, `facebook_pixel_id`, `fb_capi_token`. Document current Prizma values.
- Map the storefront code that consumes these (in opticup-storefront repo if accessible, else document via knowledge map).
- Confirm dual-pixel firing is supported (or document what changes are needed).
- Identify CAPI dispatcher: does fb-capi-dispatch EF support routing to multiple pixel_ids? Read source.
- Cost/limit considerations: does Meta have any "multiple pixels per domain" restrictions we should know?

**Output:** Mission 5 section with: dual-pixel architecture map, expected schema changes (if any), risk graded, "ready for morning execution" yes/no.

### Mission 6 — Database health snapshot (~15 min)

**Probe:**
- pg_size_pretty on all M4 tables. Confirm reasonable sizes.
- Run `get_advisors` (Supabase). Document any new findings since last sweep.
- pg_stat_statements top 20 slowest queries. Are any M4-related?
- Index usage stats — any unused indexes? Missing indexes implied by sequential scans?

**Output:** Mission 6 section with: table sizes, advisor findings count + severity, slow queries, index recommendations.

### Mission 7 — Production state safety check (~15 min)

**Probe:**
- Confirm Prizma has no in-flight broadcast right now (would conflict with night-run).
- Confirm no other Pipeline session is running (worktree-isolated or otherwise). Check `_archive/pipeline-sessions/`.
- Confirm clean working tree on develop + develop synced with main.
- Confirm last 6 commits are documented + traceable.

**Output:** Mission 7 section with: green-light or specific blockers for night-run.

### Mission 8 — Sentinel + Guardian state (~10 min)

**Probe:**
- Read `docs/guardian/GUARDIAN_ALERTS.md`. Any CRITICAL or HIGH alerts that affect night-run targets?
- Recent Sentinel mission outputs — anything that suggests night-run will trip an alert?
- Outstanding Foreman backlog: list every FOREMAN_REVIEW that ended 🟡 in last 7 days + the follow-ups they queued.

**Output:** Mission 8 section with: active alerts list, expected sentinel impact of night-run changes.

### Mission 9 — Executive summary + go/no-go (~5 min)

After Missions 1-8 complete, write a 1-page summary:
- Total findings classified by severity.
- For each planned night-run deliverable (Resend button, Skill Harvest, comprehensive M4 audit), assign: 🟢 SAFE / 🟡 PROCEED-WITH-MITIGATION / 🔴 BLOCK.
- List the 3-5 most important "things to know before night-run starts."

**Output:** Mission 9 section. THIS IS THE PRIMARY OUTPUT — Daniel reads this first when he comes back.

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches

| Surface | Access |
|---|---|
| `_archive/pre-night-audit-2026-05-20/` | NEW directory + audit files (write only here) |
| All M4 tables (crm_*) | **READ-ONLY** (SELECT only) |
| All M4 EFs (source files) | **READ-ONLY** |
| All M4 JS files | **READ-ONLY** |
| All SKILL.md files | **READ-ONLY** |
| Demo tenant test leads | INSERT + UPDATE for Mission 3 flows ONLY (whitelist phones, up to 50 leads, cleanup at end) |

### 4.2 EXPLICITLY NOT TOUCHED

| Surface | Confirmed |
|---|---|
| Any production data (Prizma tenant) | NO writes |
| Any EF deploy | NO |
| Any schema migration | NO |
| Any new table/column/index/RPC | NO |
| Any DB trigger | NO |
| Any storefront repo file | NO |
| Any change to develop branch | NO commits (audit writes are gitignored or in _archive) |

### 4.3 Stop trigger

If executor finds need to write outside `_archive/pre-night-audit-2026-05-20/` OR to make any production change → STOP and escalate. The audit's job is to READ, not to fix.

## 5. Pipeline

**SINGLE-SKILL audit:**

- **opticup-localhost-tester** is the lead skill (this is its primary domain).
- NO Foreman, NO Executor (no code), NO Reviewer (nothing to review).
- Default model: Sonnet (mechanical read-only work).
- No Pipeline lock claim required (audit isn't a Pipeline).
- Estimated duration: 3-4 hours total across all 9 missions.

## 6. Locked Decisions

**D1. Read-only is BINDING.** Audit makes zero changes outside test-lead lifecycle on demo. If executor finds a critical bug mid-audit, document in report; do NOT fix.

**D2. Skip-not-stop on individual missions.** Per Daniel's directive (Q3): if Mission 4 hits a blocker, skip to Mission 5 and document the skip.

**D3. Test budget 50 leads on demo MAX.** If exceeded → STOP and escalate.

**D4. Production safety: Mission 7 must pass for any other mission's findings to apply to night-run plan.** If Prizma has in-flight broadcast → defer night-run.

**D5. Mission 9 (executive summary) is the canonical output for Daniel.** Other missions are detail backup.

**D6. Quality over speed.** No artificial time cap. Better to surface 1 risk we didn't know about than to finish faster missing it.

**D7. Output structure:** All audit artifacts under `_archive/pre-night-audit-2026-05-20/`. Folder includes AUDIT_REPORT.md (Mission 9), MISSION_01-08.md detail files, screenshots/ subfolder.

## 7. Success Criteria

1. AUDIT_REPORT.md exists in `_archive/pre-night-audit-2026-05-20/` with all 9 mission sections.
2. Mission 3 scenarios: ≥ 14/16 PASS (regression baseline).
3. Mission 9 gives explicit 🟢/🟡/🔴 verdict for each planned night-run deliverable.
4. Zero writes to production data (Prizma).
5. Zero changes to develop branch beyond _archive folder additions.
6. Zero EF deploys.
7. Smoke 8/8 PASS post-audit (confirms baseline unchanged).
8. Test leads cleaned up at end (count < 50 + Daniel notified if any remain).
9. Audit duration recorded.

## 8. Stop-Triggers

- Any write outside _archive/pre-night-audit-2026-05-20/.
- Test budget exceeded (>50 leads).
- Prizma row write detected.
- EF deploy attempted.
- Iron Rule 31 gate fails.

## 9. Rollback Plan

Pure read-only. Worst case: delete `_archive/pre-night-audit-2026-05-20/` folder + clean test leads. No rollback complexity.

## 10. Expected Final State

- 1 new folder under `_archive/` with 9 mission detail files + AUDIT_REPORT.md.
- Possibly 1 commit (audit artifacts) to develop.
- Working tree clean.
- Up to 50 test leads cleaned up on demo.
- Daniel reads AUDIT_REPORT.md when he returns and decides night-run plan.

## 11. Commit Plan

- C1: All audit artifacts committed in one commit. Branch: develop. Title: `docs(audit): M4 pre-night comprehensive audit — 9 missions, [X] findings`.

## 12. Cross-References

- Today's FOREMAN_REVIEWs (3 SPECs): M4_SHORT_LINKS_400_FIX + M4_SMS_RATE_LIMIT_HOTFIX + M4_SHORT_LINKS_DASHBOARD_REDESIGN.
- Memory: `feedback_probe_biggest_production_tenant` + `feedback_clicks_are_not_actions`.
- Yesterday's audit baseline: `_archive/m4-overnight-audit-2026-05-19/AUDIT_REPORT.md`.
- Iron Rules 12, 21, 22, 31, 32, 34, 35.
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`.

## 13. Author Notes

This audit is the **insurance policy** for the night-run. Today we caught 3 regressions because Daniel manually verified. Tonight he won't be there. The audit's job is to compress that manual verification into a structured read-only sweep BEFORE the changes are made, so the night-run executes against known-safe baseline.

Daniel returns later today. He'll read the AUDIT_REPORT.md, decide night-run plan based on findings, then I author the night-run Brief.

---

*End of Brief. Activation Prompt in sibling file `M4_PRE_NIGHT_COMPREHENSIVE_AUDIT_ACTIVATION_PROMPT.md`.*
