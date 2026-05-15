# Activation Prompt — M1B_FOUNDATION_PERMISSIONS_HOTFIX

> Paste the block below into a fresh Claude Code chat.
> Full Auto Pipeline (Strategic → Executor → Reviewer → Strategic Foreman).
> Sibling Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1B_FOUNDATION_PERMISSIONS_HOTFIX_BRIEF.md`

---

```
Full Auto Pipeline — M1B_FOUNDATION_PERMISSIONS_HOTFIX (diagnose + fix unreachable lens screens; close Foundation UI-smoke discipline gap).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1B_FOUNDATION_PERMISSIONS_HOTFIX_BRIEF.md

Activate `opticup-strategic` skill first. Skill state already inherits all harvested patterns
(Inner-call arity + Smoke-touched schema + Concurrent-Pipeline envelope + MIGRATION.md Applied
Log + advisors-for-objects.mjs).

Read the Brief end-to-end.

PROBLEM (verified by Daniel screenshot 2026-05-15):
- localhost:3000/lens-inventory.html?t=demo → "אין הרשאה למסך זה (lens.inventory.view)"
- Same on lens-active-designs.html + lens-pricing.html
- Foundation smoke 9/9 PASSed in JWT-direct context but never exercised real-user UI

Run §0 Phase A diagnose probes (7 SQL queries + shell greps) — classify scenario:
  A: 3 permission keys missing from `permissions` table
  B: keys exist but not assigned to Daniel's role(s) on demo
  C: keys exist + assigned, but screen JS uses wrong key (typo/namespace)

Pin all probe results as §0 baseline. Classify explicitly.

Author the SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1B_FOUNDATION_PERMISSIONS_HOTFIX/SPEC.md

Required SPEC sections:
- §0 Pre-Authoring Reality Check (7 probes + 2 mandatory audits per harvest + Concurrent-Pipeline envelope)
- §1 Purpose (1 paragraph)
- §2 Scope (Phase A diagnose → Phase B scenario-fix → Phase C UI-level smoke → Phase D prizma)
- §3 Success Criteria (14+ from Brief §5)
- §4 Autonomy envelope (Level-3 DDL for migrations; Level-2 for any code fix)
- §5 Stop triggers
- §6 Rollback plan (DOWN migrations for permission seed + role assignments)
- §7 Destructive Operations: None
- §10 Commit plan (3-6 commits, single-concern)
- §11 Lessons Already Incorporated + Concurrent-Pipeline envelope

Then hand off to `opticup-executor`:
1. Step 0 — repo/branch/integrity-gate.
2. Step 1 — executor pre-flight (verify probes still match live).
3. Steps 2–N — apply Phase B fix per classified scenario:
   - Scenario A: seed migration creating 3 permission rows
   - Scenario B: role_permissions INSERTs for appropriate roles (per Brief §2 Phase B taxonomy)
   - Scenario C: code fix in screen JS
   - Apply to BOTH demo + prizma (Phase D)
4. **MANDATORY UI-LEVEL SMOKE** (Phase C — Brief §2): for each of 3 screens,
   - Generate real JWT via pin-auth EF for daniel@prizma-optic.co.il on demo
   - Fetch the page (Playwright if available, fetch+parse fallback otherwise)
   - Confirm main content renders (not "אין הרשאה" message)
   - Plus negative test: low-tier user without keys → "אין הרשאה" still shown
   - Capture in TEST_REPORT.md
   If smoke fails → STOP and escalate. No 🟢 without UI-level smoke PASS.
5. Write MIGRATION.md Applied Log (per E1).
6. Write EXECUTION_REPORT + FINDINGS + TEST_REPORT + ROLLBACK.

Then `opticup-reviewer`:
- Re-runs §3 criteria.
- Spot-checks prizma role taxonomy — confirm cashiers don't get lens.pricing.manage, owners do.
- Runs scripts/audit/advisors-for-objects.mjs (no new RPCs expected, but if any surfaced, validate).
- Writes REVIEW.md.

Then `opticup-strategic` Foreman-reviews:
- Logs the smoke discipline gap as new skill-improvement proposal counter 1/3:
  "Phase 1B-Foundation smoke ran JWT-direct only; promote UI-level smoke to mandatory in
   opticup-strategic SKILL.md §smoke for any SPEC that ships customer-facing screens."
- Writes FOREMAN_REVIEW.md.

Pipeline returns ONE Hebrew status line:
  "M1B_FOUNDATION_PERMISSIONS_HOTFIX [🟢/🟡/🔴]. דו"חות בתיקיית הספק."

Iron Rules in sharp focus: 14, 15, 18, 21, 23, 31, 32.

Out of scope:
- Phase 1A lens-catalog-admin permission retrofit (different gate, not affected)
- Procurement Pipeline (held until this SPEC closes + Daniel manual click-through PASSes)
- New permission infrastructure (reuse permissions + role_permissions)
- Playwright introduction (unless Daniel approves mid-Pipeline — recommendation is fetch+parse fallback)
- Hand-crafted JWTs (use pin-auth EF only)
- Broad super_admin-only role assignment (use proper role-tier matrix)
- Modifying mockups, decisions/M1.md, Phase 1 Brief, Foundation SPEC
- CLAUDE.md, MASTER_ROADMAP, OPEN_TASKS, TECH_DEBT beyond standard docs-only effect
- Merge to main (Daniel-only)

On escalation: write modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md
and emit one Hebrew line. Halt.

Stop on deviation, not on success. The Foundation smoke discipline gap is the actual lesson
here — apply the fix AND close the gap with UI-level smoke. No 🟢 without both.
```

---

## Pre-flight checklist for the dispatcher (Daniel)

- [ ] Brief sealed at the path above
- [ ] Phase 1B-Foundation closed 🟢 (already done)
- [ ] Daniel screenshot confirms bug on demo
- [ ] No other M1 SPEC in flight
- [ ] Supabase MCP connected
- [ ] Working directory: `C:\Users\User\opticup`

---

## Expected execution timeline

- §0 Phase A diagnose probes: ~10 min
- SPEC authoring (3-6 commits planned): ~25 min
- Phase B fix (migration OR code): ~20-40 min depending on scenario
- Phase D prizma application: ~15 min
- Phase C UI-level smoke (3 screens × 2 cases each): ~30 min
- Reports: ~30 min

**Total estimate: ~2-2.5 hours.** Single uninterrupted session.

---

## What happens after this SPEC closes

1. Pipeline returns Hebrew status line.
2. Daniel does ONE quick manual click-through (one minute) on each of the 3 screens to confirm UI loads. If pass → Procurement.
3. If fail → another hotfix.

---

*End of activation prompt.*
