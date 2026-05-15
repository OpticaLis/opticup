# M1 Lens — Phase 2 Completion Night Pipeline Brief

**Author:** opticup-architect (Cowork, 2026-05-15 night)
**Type:** Extended Autonomous Night Pipeline — bounded autonomy with expanded recovery rights
**Estimated duration:** 8-14 hours (Daniel sleeps; Pipeline executes; morning summary)
**Mode:** Multi-stage Full Auto Pipeline with self-recovery + audit + visual verification
**Scope:** Close out M1 Lens department — Module 1.5 generic receipt refactor + RPC harmonization + FK indexes + main-menu wiring
**Predecessor:** `M1_LENS_PHASE_1B_GAP_CLOSURE` 🟢 + Module 1 Close Ceremony 🟢 (both today)
**Source:** Strategic Audit `M1_EXPANSION_STRATEGIC_AUDIT_REPORT.md` §4.2 sequence rows 1-4

---

## 1. Purpose & Strategic Framing

After today's Gap Closure, M1 Lens is production-correct but not production-complete. Four follow-up items remain before the lens department is genuinely shippable for daily operations:

1. **D-M1-09 violation fix** — Module 1.5 generic goods-receipt component (gates contact-lenses + accessories phases)
2. **RPC harmonization** — `record_adjustment_lost` (shipped today) + `record_adjustment_found` (Phase 1A) become twin canonical RPCs
3. **FK index sweep** — 21 missing indexes from Phase 1A Code Review H-1
4. **Main menu wiring** — connect the 7 lens screens to the ERP navigation so staff can actually open them

This Brief authorizes Claude Code to execute all 4 in a single night Pipeline with **expanded recovery autonomy** — i.e., the Pipeline may investigate failures, propose fixes, and apply them within scope, without waiting for Daniel until morning.

The strategic objective: when Daniel wakes up, M1 Lens is **complete** (all 7 screens accessible from menu, all RPCs harmonized, all infrastructure indexed, no parallel-folder debt remaining) OR has a precise list of why specific items did not close, with concrete next steps.

---

## 2. Scope — what this Pipeline ships

### 2.1 Part A — Module 1.5 generic goods-receipt component (THE BIG ONE)

**Problem:** Phase 1B Procurement shipped `modules/lens-goods-receipt/` as a parallel folder rather than extending the existing `modules/goods-receipts/` (frames-era). D-M1-09 explicitly promised "anchor on existing frames pattern, generic component in Module 1.5." That promise is unfulfilled.

**Solution:**
1. Identify the actual shared UX surface between frames-receipt and lens-receipt (modal layout, line-add affordance, manual-add banner, supplier picker, save/cancel, discrepancy display).
2. Extract the shared parts into Module 1.5 as a new generic component (e.g., `shared/js/goods-receipt-modal.js` + co-located CSS).
3. Introduce a `product_category` dispatcher pattern — the generic component takes a product-category context and renders product-type-specific fields/columns via injected slots or callbacks.
4. Rewire `modules/goods-receipts/` (frames) to use the new generic component. Verify byte-identical behavior on demo via smoke + visual.
5. Rewire `modules/lens-goods-receipt/` to use the new generic component. Verify all Phase 1B Procurement functional smokes (F-1/F-2/F-3 post-fix behavior) still pass.
6. If `modules/lens-goods-receipt/` becomes empty after refactor → archive to `_archive/spec-history/M1_LENS_PHASE_1B_PROCUREMENT_pre-refactor/` (preserves history). If it retains lens-specific logic → keep with shrunk surface.

**Autonomy band:** the executor MAY decide between extraction strategies (shared component + slots vs HOC vs render-prop) based on what fits the existing codebase patterns. Document the choice in EXECUTION_REPORT.md. Iron Rule 21 + Iron Rule 12 (file size) honored.

**Risk note:** this touches LIVE production code (frames receipt is used daily at Prizma). All verification on demo tenant only. Prizma branch verification limited to row-count delta = 0 + md5 invariant pre/post.

### 2.2 Part B — RPC harmonization

`record_adjustment_lost` (shipped today) and `record_adjustment_found` (Phase 1A) must be twin canonical RPCs:

1. Read both RPC bodies. Identify signature drift, error-handling drift, audit-log shape drift, REVOKE drift.
2. Harmonize: same parameter naming convention, same return shape, same error-class mapping, same writeLog payload structure, same REVOKE EXECUTE FROM PUBLIC, anon.
3. If `record_adjustment_found` deviates from the canonical Phase 1A standard (`SECURITY_HOTFIX_2026_05_13` pattern with JWT-claim tenant validation) → upgrade it.
4. Update audit trail: ensure both RPCs write to `stock_adjustment` consistently (same reason-id resolution, same direction column semantics).

**Autonomy band:** if harmonization reveals a third pre-existing RPC in the same family (e.g., `record_count_correction`), the executor MAY include it in the harmonization within the same SPEC, documented in EXECUTION_REPORT.md.

### 2.3 Part C — FK index sweep

Phase 1A Code Review H-1 flagged 21 unindexed FK columns across 11 Phase 1A tables. Apply 21 partial indexes:

1. Re-run the advisor probe `0001_unindexed_foreign_keys` to capture the live list (the list may have grown since Phase 1A — Phase 1B Procurement + Gap Closure added new FKs).
2. For each flagged FK, generate a partial index (`CREATE INDEX ... ON ... (fk_col) WHERE fk_col IS NOT NULL`).
3. Apply via single migration. Verify advisor re-run shows 0 unindexed FKs in scope.

**Autonomy band:** new FKs introduced after H-1 was filed should be included.

### 2.4 Part D — Main menu wiring

The 7 lens screens currently exist as standalone HTML files but are NOT linked from the ERP main navigation. Staff at the shop cannot open them. Wire them in:

1. Identify the ERP main menu component (likely in `index.html` + `js/shared.js` or similar).
2. Add a "עדשות" (Lenses) section/submenu under inventory navigation, following the existing pattern for frames (do NOT invent a new pattern — Iron Rule 21).
3. Add menu items for each of the 7 screens with appropriate permission gates (e.g., catalog admin link only for platform-admin role; pricing only for users with `lens.pricing.manage`).
4. Verify on demo: navigate from menu → each screen → renders → permission gating works.
5. If menu structure requires architectural change (e.g., the existing pattern doesn't support sub-menus) → STOP and escalate; don't invent.

**Autonomy band:** the executor MAY add 1-2 new permission keys if needed for menu visibility, following the existing permission pattern.

---

## 3. Pipeline Stages (mandatory execution order)

### Stage 1 — Strategic SPEC authoring
Load `opticup-strategic`. Author `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_PHASE_2_COMPLETION/SPEC.md` covering Parts A-D. Include §1.5 Pre-flight findings (run probes for each part). MIGRATION.md scaffolded if Part A or C will produce migrations.

### Stage 2 — Part A execution (highest risk first)
Load `opticup-executor`. Execute Part A commit-by-commit. After each commit: `npm run smoke`, `npm run test:integrity-gate`, visual check via Localhost Tester on the affected receipt screen. If ANY check fails → investigate, root-cause, fix in next commit, document in EXECUTION_REPORT.md §"In-flight decisions". If failure is unrecoverable within scope → write `escalations/{ISO_TS}_PART_A_BLOCKER.md`, archive Part A work to a branch tag, continue to Parts B/C/D on a clean base.

### Stage 3 — Part B execution
Same pattern as Stage 2. Lower risk; should be ~2 hours.

### Stage 4 — Part C execution
Same pattern. ~1 hour. If advisor re-run reveals NEW indexes needed → include them.

### Stage 5 — Part D execution
Same pattern. ~1-2 hours. Visual verification via Chrome (Claude_in_Chrome MCP) of each of the 7 menu items rendering correctly on demo.

### Stage 6 — Full Reviewer pass
Load `opticup-reviewer`. Full review against all SPEC §3 success criteria. If findings → classify CRITICAL/HIGH/MEDIUM/LOW. CRITICAL or HIGH → fix in next commit. MEDIUM → log to FINDINGS.md for next-session work. LOW → log only.

### Stage 7 — Localhost Tester runtime smoke
Load `opticup-localhost-tester`. Full smoke matrix:
- All 7 lens screens HTTP 200 + render correctly on demo
- `npm run smoke` baseline 7/7 PASS
- F-1/F-2/F-3 functional probes from Gap Closure still PASS after refactor
- Menu navigation: each of 7 menu items clicks-through to correct screen
- Permissions: log in as different roles, verify menu visibility matches permission grants
- Chrome visual: take 7 screenshots (one per screen), save to `_archive/night-pipeline-2026-05-15/screenshots/`. Compare to mockups in `architecture-brief/mockups/` — flag any major visual deviations as findings.

### Stage 8 — Sentinel audit (read-only)
Load `opticup-sentinel`. Run Mission 1 (rule compliance) + Mission 10 (structure discipline) + Mission 8 (cross-module integrity) — these are the three most relevant for this Pipeline. Report findings to `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel's normal output path). Sentinel NEVER modifies project files.

### Stage 9 — Foreman closure + morning summary
Load `opticup-strategic` again. Write FOREMAN_REVIEW.md. Harvest skill improvements (2 author + 2 executor proposals minimum). Write the morning Hebrew summary to a file at `_archive/night-pipeline-2026-05-15/MORNING_SUMMARY_FOR_DANIEL.md` AND also paste it in the closing message.

---

## 4. Expanded Autonomy — what executor MAY decide tonight without Daniel

This Brief grants Claude Code expanded recovery autonomy. The executor MAY make the following decisions on its own, documenting each in EXECUTION_REPORT.md §"Autonomous decisions taken":

1. **Mid-execution SPEC amendment** — if Part A pre-flight reveals a smaller/larger surface than authored, amend the SPEC inline (document delta in MIGRATION.md / EXECUTION_REPORT.md).
2. **Commit reordering** — if Part A's commit 3 depends on Part C's index, reorder them. Document.
3. **Additional commits within scope** — if a bug surfaces in the refactor (e.g., the frames receipt had a latent issue that the refactor exposes), fix it within the same SPEC if it's strictly within the goods-receipt UX surface. Document. Otherwise log finding.
4. **Skip a Part if its predecessor failed** — if Part A genuinely cannot close tonight, the executor MAY skip ahead to Parts B/C/D on a clean base, and present Part A as 🟡 deferred in the morning summary.
5. **Run additional audits** — if the executor suspects a cross-module impact, it MAY spawn a sub-agent for read-only investigation, capturing findings in FINDINGS.md.
6. **Add new permission keys** — Part D may need 1-2 new permissions for menu visibility. Following the canonical pattern is enough; no need to wake Daniel.
7. **Apply skill-improvement proposals immediately** — if during execution a clear skill pattern emerges (e.g., "every refactor SPEC needs to capture frames-side md5 in §0"), the executor MAY add it to a pending-entries file at `_archive/architect-pending-entries/2026-05-16_*.md` for next session to apply.

### What executor MUST NOT do, even with expanded autonomy

1. **NEVER touch main branch.** All work on develop.
2. **NEVER modify Prizma tenant data.** All writes to demo only. Prizma row-count + md5 invariant must hold pre/post-every-stage.
3. **NEVER bypass Iron Rule 31 (integrity gate).** Even on a stuck Pipeline.
4. **NEVER do destructive ops beyond those declared in §6.** If a new destructive need surfaces → escalation, skip Part if needed.
5. **NEVER modify other modules' files** (M4 CRM, M3 Storefront, M5+, etc.). Only M1 + Module 1.5.
6. **NEVER force-push, force-rebase, force-merge.** Linear history only.
7. **NEVER deploy Edge Functions to production** without Supabase MCP `deploy_edge_function` succeeding (which is the canonical path; do not fallback to CLI without explicit authorization).
8. **NEVER modify .claude/skills/ files.** Use pending-entries pattern (Cowork file-write restriction also applies to Claude Code as a courtesy/protection here).

---

## 5. Failure Recovery Protocol

If something breaks:

**Tier 1 — Auto-recover within commit:** standard executor behavior. Retry the failed step, re-read, fix, continue.

**Tier 2 — Auto-recover within Part:** if a commit produces unexpected smoke failure → investigate via SQL probes / file reads / log inspection. If root cause is within the Part's scope → fix in next commit. Document in EXECUTION_REPORT.md.

**Tier 3 — Defer the Part:** if a Part genuinely cannot close (e.g., Part A reveals the frames-side has hidden state the refactor breaks), tag the Pipeline progress (`git tag pre-night-2026-05-15-part-A-blocked`), check out the pre-Part-A state, continue with Parts B/C/D on a clean base. Document the Part-A blocker as Finding #1 in FINDINGS.md for the morning.

**Tier 4 — Halt Pipeline:** ONLY if all of (a) integrity gate fails repeatedly, (b) demo tenant becomes unusable, or (c) a cross-module unintended impact is detected. Write `escalations/{ISO_TS}_HALT.md` + Hebrew SMS-style line to the morning summary location. Stop. Daniel handles in morning.

**Tier 5 — Self-rollback:** if Pipeline state is genuinely corrupted → `git reset --hard <last-known-good-tag>`, push to develop (force-push EXCEPTION authorized ONLY here, on develop only, never main). Write FAILURE_REPORT.md documenting everything. This is the absolute last resort.

---

## 6. Destructive Operations (Iron Rule 32)

Declared destructive operations for this Brief:

1. **`git mv` of `modules/lens-goods-receipt/*` files into Module 1.5 generic component location** — atomic moves preserving git history. Authorized for Part A.
2. **`git rm` of files that become empty/orphan after Part A refactor** — only if a file is truly empty after refactor. Otherwise leave as a shrunken file.
3. **Migration `DROP INDEX IF EXISTS ...`** — only if Part C identifies a previously-erroneous index that conflicts with the new partial indexes. Document each DROP with reason.
4. **`_archive/` move of pre-refactor lens-goods-receipt snapshot** — non-destructive but declared for completeness.
5. **`_archive/night-pipeline-2026-05-15/` creation** — for screenshots + reports.
6. **`git tag` operations** — pre-flight tag + per-Part tags. Tags are append-only.
7. **`git reset --hard <tag>` + `git push --force-with-lease origin develop`** — Tier 5 ONLY. Develop branch only. Never main.

**NOT authorized:**
- Any modification of main branch
- Any DROP TABLE, DROP COLUMN, DROP POLICY
- Any TRUNCATE
- Any mass DELETE without tenant_id-scoped WHERE
- Any file delete outside the lens-goods-receipt refactor scope
- Any rebase on develop

If a destructive op outside §6 becomes necessary → Tier 4 halt + escalation.

---

## 7. Success Criteria

Pipeline returns 🟢 in morning summary if ALL of:

1. Part A: frames-receipt + lens-receipt both use the new generic Module 1.5 component; smoke 7/7 PASS; visual on both screens unchanged (verified via Chrome screenshots vs pre-refactor)
2. Part B: `record_adjustment_lost` + `record_adjustment_found` byte-identical in signature/return-shape/audit-log/REVOKE
3. Part C: advisor `0001_unindexed_foreign_keys` returns 0 findings in M1 Lens scope
4. Part D: all 7 lens screens accessible from ERP main menu; permission gates working; visual verification of each click-through
5. Iron Rule 31 integrity gate: exit 0 throughout
6. Smoke 7/7 PASS at every stage
7. Prizma untouched: row-count + md5 delta = 0 on all touched tables
8. No escalations (or escalations clearly documented if Tier 3 deferral happened)
9. Reviewer + Sentinel produce no NEW HIGH findings
10. Morning summary file exists at `_archive/night-pipeline-2026-05-15/MORNING_SUMMARY_FOR_DANIEL.md`

🟡 if 1-2 Parts deferred to next session with clear reason + next-step recommendation.
🔴 if Tier 4 halt OR Prizma data touched OR main branch touched.

---

## 8. Morning Summary Template

File at `_archive/night-pipeline-2026-05-15/MORNING_SUMMARY_FOR_DANIEL.md`:

```markdown
# Night Pipeline 2026-05-15 → 2026-05-16 — Morning Summary

**Status:** 🟢 / 🟡 / 🔴
**Started:** [ISO timestamp]
**Ended:** [ISO timestamp]
**Total duration:** [hh:mm]

## What was completed
- Part A — [status + 1 line]
- Part B — [status + 1 line]
- Part C — [status + 1 line]
- Part D — [status + 1 line]

## Production state
- M1 Lens department: [accessible from menu? Y/N]
- 7 screens functional on demo: [Y/N + which ones]
- Prizma untouched: [Y/N + md5 evidence line]

## Findings opened (if any)
[max 5 bullets]

## What needs Daniel in the morning
[max 3 bullets — if anything; "nothing" is a valid answer]

## Hebrew summary
[4 lines max, plain language, ready to paste into Cowork]
```

---

## 9. Pre-flight Safety Gates (mandatory before Stage 1)

1. `git status` clean on develop (after the 3-commit triage closeout). If not — STOP, do not start Pipeline.
2. `git log --oneline -5` confirms last commit is the triage closeout, not stale state.
3. `npm run verify:integrity` exit 0.
4. `npm run smoke` baseline 7/7 PASS BEFORE any Pipeline work.
5. Local dev servers (ERP :3000 + Storefront :4321) running and reachable.
6. `git tag pre-night-pipeline-2026-05-15` — anchor point for Tier 5 rollback if needed.
7. Branch confirmed = develop.
8. Push tag immediately: `git push origin pre-night-pipeline-2026-05-15`.

If any pre-flight gate fails → write `escalations/{ISO_TS}_PRE_FLIGHT_BLOCKER.md` + halt. Daniel handles in morning.

---

## 10. Hebrew morning summary template (for Daniel)

```
ריצת לילה הסתיימה [🟢/🟡/🔴]. משך: [hh:mm].
חלק A (רכיב משותף 1.5): [status]
חלק B (RPC הרמוניזציה): [status]
חלק C (אינדקסים): [status]
חלק D (תפריט ראשי): [status]
מצב מחלקת עדשות: [שורה אחת — האם פעילה לצוות בחנות].
פריזמה ללא נגיעה: [כן/לא + שורה].
[אם צריך פעולה ממך: שורה. אחרת: "אין פעולה דרושה"]
```

---

*End of Night Brief. Iron Rule 32 §Destructive Operations declared above. Bounded autonomy expanded for night execution. Daniel sleeps; Pipeline executes; morning summary at the declared file path.*
