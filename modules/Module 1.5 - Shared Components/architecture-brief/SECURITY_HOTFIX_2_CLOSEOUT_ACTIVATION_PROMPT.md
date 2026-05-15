You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action. This is the CLOSEOUT run for `SECURITY_HOTFIX_2_2026_05_15` — the Executor stage already completed in a prior chat and pushed 4 commits to develop (566e810..47f9967). Your job is the remaining Pipeline steps: Reviewer + Localhost-Tester + Foreman closure.

**Read these in order BEFORE starting:**
1. `modules/Module 1.5 - Shared Components/architecture-brief/SECURITY_HOTFIX_2_2026_05_15_BRIEF.md` (origin scope)
2. `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md` (sealed plan)
3. `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/EXECUTION_REPORT.md` (what shipped)
4. `modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/FINDINGS.md` (gaps + skill harvest source)
5. The 3 RESOLVED escalation files under `modules/Module 1.5 - Shared Components/escalations/RESOLVED_*` (Daniel's decisions on inverted-count + Block-A pattern + storefront-outage-risk)

**Context summary from Executor closeout:**
- §1.1: applied ✅ (sync_lead_status_from_attendee search_path restored).
- §1.2: 2 of 17 applied ✅ (v_storefront_reviews + v_storefront_components — the only 2 base tables with anon_read RLS). 15 deferred to SECURITY_HOTFIX_3 per Daniel decision (Option A).
- §1.3: 24 of 24 hardened ✅ (Block A 3-role-aware on 23 + Block A-alt slug-validation on 1). 16 REVOKE FROM anon (Option B) + 1 KEEP anon (Option A). 17 of 17 anon-callable disposed.
- Advisor delta: F-CRIT-1 GONE, F-CRIT-3 closed 25/42 (16 OUT-OF-SCOPE + 1 intentionally kept), F-CRIT-2 partial (2/17 closed, 15 deferred).

Run these 3 stages sequentially in this chat:

### Stage 1 — Reviewer (skill: opticup-reviewer)

Verify all 17 success criteria from SPEC.md §5. For each criterion, mark PASS / FAIL / PARTIAL with the observed value. Specific attention to:
- Criterion #1 — pre-flight queries documented (was 17 not 7 anon-callable; was 24 of 24 hardened — verify SPEC.md was amended OR that the deviations are captured in EXECUTION_REPORT).
- Criterion #5 — Option A/B disposition for the 17 anon-callable (not 7 as Brief stated).
- Criterion #6 — storefront-facing views verified anon-readable post-migration (only 2 fixed; verify the 2, not the 17).
- Criterion #14 — Supabase advisor: 3 known CRITICAL findings status (F-CRIT-1 GONE, F-CRIT-2 partial-close documented, F-CRIT-3 in-scope subset closed).
Write `REVIEW.md` in the SPEC folder with PASS/FAIL/PARTIAL per criterion + 1-2 lines justification each. Note any criterion that needs SECURITY_HOTFIX_3 follow-up.

### Stage 2 — Localhost-Tester (skill: opticup-localhost-tester)

Servers are already up (ERP :3000 + Storefront :4321). Run:
- `npm run smoke` — must be 7/7 PASS post-migration.
- Curl-probe 2 storefront pages that use the migrated views:
  - One that lists reviews (uses `v_storefront_reviews`) — verify HTTP 200 + non-empty review data.
  - One that uses `v_storefront_components` — verify HTTP 200 + non-empty data.
- Demo invocation of `sync_lead_status_from_attendee` (or its trigger fire path) — verify §1.1 behavior unchanged.
- Demo invocation of 2 random RPCs from the 24 hardened — verify wrong-tenant rejection + right-tenant success.
Write `TEST_REPORT.md` in the SPEC folder with PASS/FAIL per check + observed values.

### Stage 3 — Foreman closure (skill: opticup-strategic)

After Stage 1 + Stage 2 reports exist:
- Read REVIEW.md + TEST_REPORT.md + EXECUTION_REPORT.md + FINDINGS.md.
- Write `FOREMAN_REVIEW.md` with verdict (🟢 CLOSED / 🟡 CLOSED WITH FOLLOW-UPS — likely the latter given F-CRIT-2 partial). Include:
  - Per-criterion status summary
  - Skill improvements harvested (≥2 author + ≥2 executor) — sourced from FINDINGS F-5/F-7 + EXECUTION_REPORT §9 + escalation decisions
  - APPLY the harvested improvements directly to `.claude/skills/opticup-strategic/SKILL.md` + `.claude/skills/opticup-executor/SKILL.md`
  - Mandatory SECURITY_HOTFIX_3 follow-up SPEC declaration (for the 15 deferred views + their base-table RLS) — include a "Next SPEC" section with scope outline so Architect can author the Brief tomorrow
- Update audit reports:
  - `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` — mark F-CRIT-1 RESOLVED with SHA 40cde93
  - `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` — mark F-CRIT-2 PARTIAL (2/17) + F-CRIT-3 RESOLVED (in-scope subset) with SHA 40cde93
- Update OPEN_TASKS.md to reflect SECURITY_HOTFIX_2 closed + SECURITY_HOTFIX_3 added as next active task.
- Commit + push: SPEC artifacts + skill updates + audit report updates + OPEN_TASKS update. Selective add by filename. NEVER `git add -A`.

Hard constraints (STOP triggers per CLAUDE.md §9):
- Stage 1 finds a CRITERION that was claimed PASS but isn't → STOP, document, escalate.
- Stage 2 smoke <7/7 → STOP, escalate (something regressed post-migration).
- Stage 2 storefront page returns non-200 → STOP, escalate (silent storefront break).
- Demo wrong-tenant test FAILS to reject (i.e. RPC accepts wrong tenant_id) → STOP, this means JWT header isn't working — rollback applicable.
- Any commit to main → STOP entire run.

MANDATORY: clean repo for the scope of this SPEC's artifacts at close (per CLAUDE.md §9). Pre-existing untracked from earlier sessions stay untouched per the leave-alone protocol established at session start of the Executor stage.

Whitelist for any test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: Stage 1 PASS/FAIL/PARTIAL per-criterion rollup, Stage 2 smoke + storefront probe results, Stage 3 verdict (🟢 or 🟡), skill improvements applied (count + which P-numbers), audit reports updated (yes/no), SECURITY_HOTFIX_3 declared as next SPEC (yes/no), commits in closeout range (SHAs), repo clean at close (yes/no).

End of activation prompt.
