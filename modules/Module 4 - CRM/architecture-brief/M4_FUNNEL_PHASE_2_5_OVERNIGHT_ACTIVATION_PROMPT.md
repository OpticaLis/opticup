# M4_FUNNEL_PHASE_2_5_OVERNIGHT — Activation Prompt

Paste into a NEW Claude Code chat. This is a 8-12 hour autonomous run in a worktree-isolated branch.

**Pre-condition:** Make sure the Brief is committed + pushed to `develop` OR `origin/main` before starting (so the worktree can read it). If the Brief was just authored from Cowork and isn't pushed yet — Daniel commits + pushes first.

---

```
Run an 8-12 hour OVERNIGHT FUNNEL Phase 2.5 build session.

Brief: modules/Module 4 - CRM/architecture-brief/M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md

CRITICAL FIRST STEP — WORKTREE ISOLATION (mandatory, do BEFORE anything else):

```bash
cd C:\Users\User\opticup
git fetch origin
git worktree add C:\Users\User\opticup-funnel-25 claude/funnel-phase-2-5-overnight-2026-05-19 origin/main
cd C:\Users\User\opticup-funnel-25
```

From now on your ENTIRE working directory is C:\Users\User\opticup-funnel-25\.
- Do NOT cd to C:\Users\User\opticup\.
- Do NOT git checkout develop.
- Do NOT push to develop.
- Push to claude/funnel-phase-2-5-overnight-2026-05-19 only.
- At end: open PR to develop.

If the Brief is not present in origin/main, pull from develop:
```bash
git fetch origin develop
git checkout origin/develop -- "modules/Module 4 - CRM/architecture-brief/M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md"
git checkout origin/develop -- "modules/Module 4 - CRM/architecture-brief/M4_TEMPLATE_VALIDATION_UNIFIED_BRIEF.md"
git checkout origin/develop -- "roles/site-overseer/knowledge-build/funnel-q3/"
```

MODEL: Sonnet (claude-sonnet-4-20250514) for executor work. Mechanical SQL + JS + tests.

SKILL CHAIN: This is THE longest run yet. Use the full 5-hat Pipeline:
1. opticup-strategic (Foreman): author 3 SPECs (Deliverable A, B, C) under modules/Module 4 - CRM/docs/specs/.
2. opticup-executor: build all 3 deliverables.
3. opticup-reviewer: validate Iron Rules + Cross-Module Safety Audit §4 binding.
4. opticup-localhost-tester: smoke + the Chrome MCP audit (Deliverable C).
5. opticup-strategic (Foreman closure): FOREMAN_REVIEW.md per SPEC + final summary.

THE 3 DELIVERABLES (per Brief §3):

A. Funnel Health Dashboard — 14 tiles + materialized view + 5-min refresh + drill-downs.
B. Weekly Optimization Brief — new EF + pg_cron Sunday 06:00 IST + funnel_weekly_briefs table + ERP UI panel.
C. Comprehensive M4 Regression Audit — Chrome MCP through 12 scenarios on demo, whitelist phones only, screenshots + report.

EXECUTION RULES:
- Cross-Module Safety Audit §4 is BINDING. Touch NOTHING in §4.2/§4.4/§4.6.
- 1 new EF maximum (weekly-funnel-brief). 1 new table (funnel_weekly_briefs). 1 new materialized view (mv_funnel_health_dashboard). 1 new partial index. NO other DB writes.
- Audit scenarios use whitelist phones only: 0537889878, 0503348349.
- Audit may delete + recreate test leads up to 20 times. Log every action.
- Skip-not-stop on individual deliverable issues. Hard-stop on §4.7 violation or env failures.
- 1-2 commits per deliverable. Commit messages descriptive.

STOP TRIGGERS (over and above Brief §8):
- If you ever realize you're in C:\Users\User\opticup\ instead of opticup-funnel-25\, STOP.
- Any write outside worktree.
- Push to develop.
- §4.7 violation.
- Materialized view refresh > 30s.
- More than 50 audit leads created (audit budget exceeded).
- Any 🔴 audit finding — document, continue with remaining scenarios, but flag in PR.

CLOSURE:
1. Per-deliverable FOREMAN_REVIEW.md.
2. Combined session summary in modules/Module 4 - CRM/docs/specs/M4_FUNNEL_PHASE_2_5_OVERNIGHT/SESSION_REPORT.md.
3. git push origin claude/funnel-phase-2-5-overnight-2026-05-19.
4. Open PR: claude/funnel-phase-2-5-overnight-2026-05-19 → develop. NOT main.
5. PR title: feat(funnel): Phase 2.5 — Dashboard + Weekly Brief + M4 Regression Audit.
6. PR description: list each deliverable + completion status + audit summary (X/12 scenarios PASS).
7. Surface SHORT Hebrew status line to Daniel:
   - 1 sentence overall result.
   - Deliverable A status / B status / C status.
   - Audit summary (X PASS / Y PARTIAL / Z REGRESSION).
   - PR URL.

If you encounter any issue you cannot resolve via skip-not-stop:
- Write escalation file at modules/Module 4 - CRM/escalations/PHASE_2_5_OVERNIGHT_<TS>.md.
- Emit ONE Hebrew line to Daniel.
- Pause Pipeline. Daniel returns with decision; you resume in same chat.

Total session budget: 8-12 hours. Stop at 12 hours regardless of completion; PR what's done.
```

---

*End of Activation Prompt. Brief contains §3 deliverables, §4 binding safety audit, §6 D1-D10 locked decisions, §8 stop triggers.*
