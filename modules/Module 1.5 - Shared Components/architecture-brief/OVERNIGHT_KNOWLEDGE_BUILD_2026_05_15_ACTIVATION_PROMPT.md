# OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15 — Activation Prompt

Paste the block below into a **NEW** Claude Code chat. This is a 12+ hour autonomous read-only session that runs in a **separate git worktree** to avoid conflicts with your other running session.

**Before pasting:**
1. The Brief file lives at `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_BRIEF.md` in your current ERP repo. Make sure it's committed to develop OR present in the working tree before activating (Claude Code will need to read it via the worktree).
2. Best to commit the Brief first so the worktree (which starts from origin/main) has access to it via `git fetch` + cherry-pick if needed, OR alternative: pass the full Brief content inline if pre-commit timing is an issue.

---

```
Run a 12+ hour OVERNIGHT READ-ONLY knowledge-build session.

Brief: modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_BRIEF.md

CRITICAL FIRST STEP — WORKTREE ISOLATION (mandatory, do this BEFORE anything else):

The user has a parallel Claude Code session running on develop in C:\Users\User\opticup\. You MUST NOT interfere with it.

```bash
cd C:\Users\User\opticup
git fetch origin
git worktree add C:\Users\User\opticup-overnight claude/overnight-knowledge-build-2026-05-15 origin/main
cd C:\Users\User\opticup-overnight
```

From this point on, your ENTIRE working directory is C:\Users\User\opticup-overnight\. Do NOT cd back to C:\Users\User\opticup\ for any reason. Do NOT git checkout develop on either tree. Do NOT push to develop.

If the Brief is not present in origin/main (because it was just committed to develop), pull it manually:
```bash
cd C:\Users\User\opticup
cat "modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_BRIEF.md" > /tmp/brief.md
# then copy /tmp/brief.md content into the worktree at the same path
```
OR: Daniel commits the Brief to develop before starting this session + cherry-picks the Brief commit into the worktree.

MODEL: Sonnet (claude-sonnet-4-20250514). 12+ hour mechanical workload; Sonnet is faster + cheaper + lower content-filter risk than Opus.

SKILL: opticup-executor only. NO Foreman/Reviewer chain. Single-skill autonomous run.

THE 9 MISSIONS (per Brief §3, do them in priority order):

1. Template Validation Map (P2.3 pre-flight) → roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md
2. Funnel Health Dashboard Data Model → roles/site-overseer/knowledge-build/funnel-q3/M2_FUNNEL_HEALTH_DASHBOARD_DATA_MODEL.md
3. FB CAPI Post-Launch Validation Plan → roles/site-overseer/knowledge-build/funnel-q3/M3_FB_CAPI_VALIDATION_PLAN.md
4. Pixel Validation Gap Dashboard Query → roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md
5. M11 Supplier Portal Data Layer Mapping → modules/Module 11 - Reports/architecture-brief/M11_SUPPLIER_PORTAL_DATA_LAYER_MAP.md
6. M4 Dispatch Performance Baseline → modules/Module 4 - CRM/docs/state/M4_DISPATCH_PERFORMANCE_BASELINE_2026_05_15.md
7. M1B Phase 1B Downstream Inventory → modules/Module 1 - Inventory Management/architecture-brief/M1B_PHASE_1B_DOWNSTREAM_INVENTORY.md
8. 0c BRAND_VISIBILITY_CASCADE Pre-Flight → modules/Module 1.5 - Shared Components/architecture-brief/M1_5_BRAND_VISIBILITY_CASCADE_PREFLIGHT.md
9. Security Drift Detection Sweep → docs/guardian/SECURITY_DRIFT_SWEEP_2026_05_15.md

BONUS WORK (only if you finish 9 missions before 12 hours): Brief §3 lists 4 opportunistic targets.

EXECUTION RULES:
- READ-ONLY everywhere. SELECT queries only. No INSERT/UPDATE/DELETE/DROP/ALTER. No EF deploys. No file deletes.
- Skip-not-stop on mission blockers. If mission N can't be completed (table missing, data not available), write a short FINDING.md for that mission and continue to mission N+1.
- Sub-agents allowed via Task tool for large file enumerations (e.g., Mission 7 codebase-wide search).
- 1 commit per mission completion. 9-12 total commits expected.
- Commit messages: `docs(knowledge-build): mission <N> — <one-line summary>`.

STOP TRIGGERS (over and above Brief §9):
- If you ever realize you're in C:\Users\User\opticup\ instead of opticup-overnight\, STOP IMMEDIATELY and report.
- Any write attempt outside the worktree triggers stop.
- Any SQL write attempt triggers stop.
- Any push attempt to `develop` triggers stop.

CLOSURE (at end of 12 hours, or after all 9 missions + bonus if time remains):
1. Final commit summarizing the session (`docs(knowledge-build): overnight session 2026-05-15 closure — N missions complete`).
2. git push origin claude/overnight-knowledge-build-2026-05-15
3. Open Pull Request: claude/overnight-knowledge-build-2026-05-15 → develop. NOT main.
4. PR title: `docs(knowledge-build): overnight session 2026-05-15 — funnel + module foundations`
5. PR description: list each mission, its deliverable file path, completion status (full / partial / skipped), and 1-line summary of key finding.
6. Surface a SHORT Hebrew status line per `feedback_overnight_run_pattern.md`:
   - 1 sentence overall result
   - N missions complete / M skipped
   - PR URL
   - (no technical detail)

If you encounter any issue you cannot resolve via skip-not-stop (e.g., git worktree fails, repo permissions break, branch protection blocks push), write an escalation file at modules/Module 1.5 - Shared Components/escalations/OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_<TS>.md describing what happened, and emit one Hebrew line to Daniel.

When done, the user will review the PR + merge it at his convenience. The worktree at C:\Users\User\opticup-overnight\ stays in place until he removes it manually after merge.
```

---

*End of Activation Prompt. The Brief contains the full mission list, isolation protocol, success criteria, stop-triggers, and rollback plan.*
