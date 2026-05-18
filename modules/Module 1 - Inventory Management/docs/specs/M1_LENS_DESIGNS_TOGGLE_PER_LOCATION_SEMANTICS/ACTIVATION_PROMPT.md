# ACTIVATION_PROMPT — M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS

**For:** opticup-executor, Path X sequential. Runs AFTER SPEC 10 closes 🟢.
**Branch:** develop.

Read + execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS/SPEC.md`

## Pre-flight (in SPEC §0)

- Existing `toggle_active_offering` RPC body captured (4-arg, SECURITY DEFINER, ON CONFLICT semantics)
- 3 JS consumers in `modules/lens-active-designs/` (toggle.js + detail.js + table.js)
- `tenant_active_offerings` schema captured (location_id NULLable + partial unique index)
- Daniel-approved design: NEW `toggle_active_offerings_array` server-side iterating per (offering × location) pair atomically

## Bounded Autonomy

- §3: 21 measurable criteria
- §4 declares 1 CREATE FUNCTION (reversible by DROP)
- §5 broad: end-to-end execution

## Execution sequence

1. Claim pipeline lock per SPEC §11
2. Apply 1 migration via Supabase MCP `apply_migration`
3. Verify new RPC body + signature
4. Update 3 JS files in `modules/lens-active-designs/`
5. Tier C smoke: bulk activate 1 design × 2 demo locations → verify 2 rows + 0 NULL-location rows → bulk deactivate → soft-delete
6. get_advisors(security) clean check
7. Group A + B + C SPEC 9/10 regression
8. Write EXECUTION_REPORT + FINDINGS
9. 3-4 commits per §10, push to develop

## Stop-on-deviation

- Old `toggle_active_offering` would need modification → STOP
- Migration fails or get_advisors returns new ERROR/HIGH → STOP
- Tier C creates an "all-locations" row (location_id IS NULL) — STOP (logic regression)
- Iron Rule 32 hook fires (this SPEC declares §4 with 1 CREATE FUNCTION; should pass)

## Constraints

- All Iron Rules enforced.
- Tier C VFV mandatory (≥ 2 screenshots).
- No Prizma writes.
- **After this SPEC closes 🟢, M1 LENS 100% COMPLETE.** Final summary to Daniel.

---

**END ACTIVATION_PROMPT**
