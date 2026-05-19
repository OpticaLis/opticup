# ACTIVATION_PROMPT — SPEC 2: M1_5_SHARED_COMPONENTS_PHASE_0

**Paste into a NEW Claude Code session on Daniel's Windows desktop.** Open in **terminal #1**.

---

You are **opticup-executor**. Execute the SPEC authored at:

```
modules/Module 1.5 - Shared Components/docs/specs/M1_5_SHARED_COMPONENTS_PHASE_0/SPEC.md
```

The SPEC was authored 2026-05-17 by the Foreman (opticup-strategic) as part of the M1 Lens Mockup-Fidelity Full Rebuild Pipeline. The parent Brief is at `modules/Module 1 - Inventory Management/architecture-brief/M1_LENS_MOCKUP_FIDELITY_FULL_REBUILD_BRIEF.md`.

## Bootstrap

1. Load skill `opticup-executor`. Run First Action protocol.
2. Pre-Action Collision Check per CLAUDE.md §9 Parallel Pipeline Coordination:
   ```powershell
   node scripts/pipeline-coordination.mjs claim --pipeline M1_5_SHARED_COMPONENTS_PHASE_0 --files-owned "shared/**,modules/Module 1.5/**" --branch develop
   ```
3. **Important parallel-session awareness:** A second Claude Code session is running SPEC 3 (`M1_LENS_DB_SCHEMA_RECEIPTS_NOTES`) concurrently in terminal #2. Its `files_owned_globs` should be DB-only (`supabase/migrations/**`, `docs/GLOBAL_SCHEMA.sql`, `modules/Module 1/docs/db-schema.sql`). Verify no overlap before claiming.
4. If collision detected → STOP, escalate, do not proceed.

## Execute SPEC

Read `SPEC.md` in full, then execute end-to-end per Bounded Autonomy (Iron Rule 9). The SPEC contains:

- 8 shared components to build (5 from audit recommendation + 3 surfaced during planning: data-table, quick-receipt-drawer, lens-details-drawer)
- CSS tokens to add to `shared/css/tokens.css`
- Module 1.5 wiring (index, GLOBAL_MAP registration)
- Tier C smoke tests per component

## No time budget

Per Brief §"No time budget per Pipeline" — mockup fidelity wins. If the SPEC takes 12 hours instead of 8, that's correct execution. If you can only complete 4 of 8 components in this session, STOP and report — do not rush the remainder.

## Stop-on-deviation triggers (additional to SPEC's own)

- Pipeline coordination collision detected during work
- Any component overlaps with existing `shared/` code beyond what SPEC 2 explicitly authorized → propose merge in FINDINGS.md
- Any Iron Rule 12 file-size violation that requires a SPEC change → escalate
- Cowork-side artifact dependencies (mockups, Briefs) inaccessible → escalate

## Closeout

When SPEC executes end-to-end:

1. Write `EXECUTION_REPORT.md` + `FINDINGS.md` in the SPEC folder
2. Update `modules/Module 1.5 - Shared Components/docs/SESSION_CONTEXT.md` + `CHANGELOG.md` + `MODULE_MAP.md`
3. Commit per the SPEC's commit plan + push to `origin/develop`
4. Release coordination lock: `node scripts/pipeline-coordination.mjs release --pipeline M1_5_SHARED_COMPONENTS_PHASE_0`
5. Notify Daniel in chat with: commit hashes, components shipped, blockers if any, next-step recommendation

After this Pipeline closes, Cowork-Architect writes the FOREMAN_REVIEW.md.

**No need to ask Daniel for per-step approval.** Execute under Bounded Autonomy. Stop only on deviation.
