# Overnight Run — M4 CRM Repair, 4 SPECs end-to-end (2026-05-18 → 2026-05-19)

You are running an **overnight autonomous chain** of 4 Full-Auto Pipeline SPECs in sequence on the Optic Up project. Daniel approved this run. Operate under Bounded Autonomy: skip-not-stop on deterministic success, halt only on genuine deviation from acceptance criteria.

The 4 SPECs and their Briefs (read each Brief in full before authoring its SPEC):

1. `modules/Module 4 - CRM/architecture-brief/M4_CONFIG_SYNC_INFRASTRUCTURE_BRIEF.md`
2. `modules/Module 4 - CRM/architecture-brief/M4_CONFIG_PARITY_RUN_1_BRIEF.md`
3. `modules/Module 4 - CRM/architecture-brief/M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX_BRIEF.md`
4. `modules/Module 4 - CRM/architecture-brief/M4_STATUS_CHANGE_MODAL_GATE_FIX_BRIEF.md`

SPEC 5 (`M4_DUAL_PATH_DEPRECATION_PHASE_1`) is intentionally NOT in this run — it requires soak time that doesn't fit overnight. Schedule for a future day.

---

## Pre-flight (do all of these BEFORE starting SPEC 1)

1. **Verify M1 Pipeline closed:** confirm `_archive/pipeline-sessions/2026-05-18T16-09-48-483Z_M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_executor-2a.lock` does NOT exist. If it exists, STOP — Daniel said M1 would close before this runs.
2. **Working tree clean:** `git status` must show clean develop. If untracked files exist, STOP and emit a Hebrew line listing them.
3. **Integrity gate:** `npm run verify:integrity` exit 0.
4. **Smoke baseline:** `npm run test:smoke` 7/7 PASS.
5. **Commit the 5 Briefs + 5 Activation Prompts + this master prompt to develop FIRST** (single commit, message `docs(m4): add M4 overnight repair Briefs + Activation Prompts`). Then push to origin/develop.
6. **Master safety tag:** `git tag pre-m4-overnight-2026-05-18 develop && git push origin pre-m4-overnight-2026-05-18`. This is the universal rollback point for the entire overnight run.
7. **DB snapshot to disk (5 tables × 2 tenants = 10 files):** for each of `crm_message_templates`, `crm_automation_rules`, `crm_statuses`, `crm_field_visibility`, `crm_tags` × each tenant (demo + prizma), run `SELECT * FROM <table> WHERE tenant_id = <uuid>` and write the JSON result to `_archive/m4-overnight-2026-05-18/db-snapshots/<table>_<tenant_slug>.json`. Commit these to develop (`chore(m4): pre-overnight DB snapshots`). These are the per-row rollback source for SPEC 2.
8. **EF version capture:** read the current `automation-engine` and `dispatch-queue` EF source via Supabase MCP `get_edge_function`. Save to `_archive/m4-overnight-2026-05-18/ef-snapshots/automation-engine.ts` and `dispatch-queue.ts`. Commit (`chore(m4): pre-overnight EF snapshots`). Rollback source for SPEC 3.
9. **Pipeline lock:** claim `M4_OVERNIGHT_REPAIR_2026_05_18` with all 4 SPECs' file globs combined (the master claim — covers `modules/Module 4 - CRM/**`, `modules/crm/**`, `supabase/functions/automation-engine/**`, `scripts/**`, `tests/smoke/**`, `docs/guardian/sentinel/**`, `CLAUDE.md`, `docs/FILE_STRUCTURE.md`).

If any pre-flight step fails, STOP and emit Hebrew line. Do NOT proceed with partial pre-flight.

---

## Execution Loop

For each of the 4 SPECs, in order:

1. **Author the SPEC** using `opticup-strategic` skill (Foreman role). Read the Brief, write the SPEC into `modules/Module 4 - CRM/docs/specs/<SPEC_SLUG>/SPEC.md`. Include explicit Pre-Flight section per Iron Rule from P28/P29 (executor pre-flight catches author bugs).

2. **Execute the SPEC** using `opticup-executor` skill. Follow the SPEC verbatim. Standard Bounded Autonomy — skip-not-stop, halt only on deviation. Write EXECUTION_REPORT.md and FINDINGS.md at end.

3. **Review the SPEC** using `opticup-reviewer` skill. Write REVIEW.md.

4. **Localhost-test** using `opticup-localhost-tester` skill (or skip if SPEC §3 doesn't require runtime tests — SPECs 1+2 are infra/data, no runtime UI). Write TEST_REPORT.md.

5. **Foreman close** using `opticup-strategic` skill. Write FOREMAN_REVIEW.md with 4 skill-harvest proposals (2 author + 2 executor).

6. **Verify the SPEC's success criteria** end-to-end before moving to the next SPEC. If any criterion fails, STOP and emit Hebrew line. Do not proceed to next SPEC.

7. **Heartbeat update:** every 30 min, append a line to `_archive/m4-overnight-2026-05-18/heartbeat.md` with timestamp + current SPEC + current phase. So Daniel can read progress in the morning.

---

## SPEC-specific overrides for overnight mode

### SPEC 2 (`M4_CONFIG_PARITY_RUN_1`)

The sync script in SPEC 1 was written with interactive confirmation (`Type 'YES SYNC'`). For this overnight run, **modify the script to also accept a non-interactive flag** `--confirm-destructive=YES-I-READ-THE-DIFF`. The Pipeline-authoring of SPEC 1 must include this flag handling. The Foreman of SPEC 2 then runs `node scripts/sync-prizma-config-to-demo.mjs --allow-destructive --confirm-destructive=YES-I-READ-THE-DIFF` AFTER:
- The pre-run snapshot is verified to exist (per Brief §2.1).
- The diff is printed and saved to `_archive/m4-overnight-2026-05-18/sync-diff.txt`.
- The diff is reviewed by the Foreman against the QA report's drift baseline (7 DIVERGED + 6 DEMO_ONLY + 1 PRIZMA_ONLY). If the diff has MORE rows than expected by >10% → STOP. The author-intended diff is documented; surprises are stop triggers.

### SPEC 3 (`M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX`)

Standard run. The EF deploy fallback (OPEN-021) is the only blocker — if `deploy_edge_function` returns `InternalServerErrorException`, write `_archive/m4-overnight-2026-05-18/SPEC_3_DEPLOY_FALLBACK.md` and STOP. Daniel will CLI-deploy in the morning, then the chain resumes from SPEC 4.

### SPEC 4 (`M4_STATUS_CHANGE_MODAL_GATE_FIX`)

This is the only SPEC that requires UI smoke. Chrome MCP must capture screenshots showing:
- Status change with no matching rule → no modal opens, just status toast.
- Status change with matching rule → modal opens, stays open until user interaction.
- Cancel button → status NOT committed.

Save screenshots to `_archive/m4-overnight-2026-05-18/spec-4-chrome/`. If Chrome MCP is not available in the overnight session, STOP and document — Daniel will run Tier C VFV in the morning.

---

## Stop triggers (non-negotiable, halt entire chain)

1. Any SPEC's success criteria failure.
2. Any commit that fails Iron Rule 31 (integrity gate) or Iron Rule 32 (destructive ops gate).
3. Any production Prizma write that wasn't authorized (Prizma is read-only the entire run except via the shared EF — and even that is only invoked by Prizma's own cron at 08:30, which is AFTER overnight cutoff).
4. Smoke test failure on demo at any point.
5. Pipeline lock collision with another session.
6. Deploy fallback needed (SPEC 3).
7. Diff surprise in SPEC 2 (>10% rows beyond baseline).
8. Chrome MCP unavailable for SPEC 4.

On any stop trigger: write `_archive/m4-overnight-2026-05-18/STOP_TRIGGER.md` describing the trigger + current state + recommended action + git SHA at stop. Emit one Hebrew line to Daniel.

---

## Rollback procedures (for Daniel, if morning reveals a problem)

**Full rollback (everything undone):**
```
git checkout develop
git reset --hard pre-m4-overnight-2026-05-18
git push --force-with-lease origin develop  # only if pushed
# then restore EFs:
supabase functions deploy automation-engine --no-verify-jwt --file _archive/m4-overnight-2026-05-18/ef-snapshots/automation-engine.ts
# then restore DB rows for demo from snapshots if SPEC 2 ran:
for table in crm_message_templates crm_automation_rules crm_statuses crm_field_visibility crm_tags; do
  DELETE FROM $table WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  INSERT FROM _archive/m4-overnight-2026-05-18/db-snapshots/${table}_demo.json;
done
```

**Partial rollback (specific SPEC):**
- SPEC 1: `git revert <SPEC_1_merge_sha>` — script files removed, Iron Rule 33 reverted.
- SPEC 2: Restore demo DB from snapshots (above).
- SPEC 3: Redeploy old EF from snapshot.
- SPEC 4: `git revert <SPEC_4_merge_sha>` — JS files revert to old behavior.

---

## Final report (when all 4 SPECs close)

Write `_archive/m4-overnight-2026-05-18/MORNING_SUMMARY_FOR_DANIEL.md` containing:
- Hebrew executive summary (≤200 words).
- Per-SPEC status: 🟢/🟡/🔴 + commit count + git SHA range + key metrics.
- Verification matrix: 1 row per SPEC × verification criterion.
- Any findings opened (severity-classified).
- All skill-harvest proposals collected (typically 16 across 4 SPECs).
- Recommended next action.

Emit one Hebrew line to Daniel:

> "ריצת לילה M4 הושלמה. [N] SPECs נסגרו 🟢. [M] commits. EFs מעודכנים. דמו מסונכרן לפריזמה. דוח: `_archive/m4-overnight-2026-05-18/MORNING_SUMMARY_FOR_DANIEL.md`."

If chain halted mid-run, emit:

> "ריצת לילה M4 נעצרה ב-SPEC [N]. סיבה: [trigger]. STOP_TRIGGER.md + heartbeat.md ב-_archive/m4-overnight-2026-05-18/."

---

## Constraints summary

- All Pipeline work on demo tenant only.
- Prizma read-only.
- Test phone numbers: `0537889878` / `0503348349` only.
- Iron Rules 12/21/23/31/32 enforced on every commit.
- One Foreman → Executor → Reviewer → Localhost-Tester → Foreman cycle per SPEC. Linear, no parallel SPECs.
- Heartbeats every 30 min.
- Master safety tag is the ultimate rollback.

Start with the pre-flight checklist. Then SPEC 1.
