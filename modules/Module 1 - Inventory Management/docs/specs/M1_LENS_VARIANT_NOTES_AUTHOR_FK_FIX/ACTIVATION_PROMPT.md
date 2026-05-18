# ACTIVATION_PROMPT — M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX

**For:** opticup-executor in Claude Code session on Daniel's Windows desktop.
**Branch:** develop. Path X sequential authorization in effect.

Read and execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/M1_LENS_VARIANT_NOTES_AUTHOR_FK_FIX/SPEC.md`

## Bounded Autonomy

- All §3 success criteria are measurable
- §4 Destructive Operations are declared (2 DDLs: DROP CONSTRAINT + ADD CONSTRAINT)
- §5 Autonomy Envelope is broad: full execution end-to-end without per-step approval
- Stop ONLY on deviation per §6
- No Prizma writes — Tier C runs on demo tenant only

## Pre-flight already validated (in SPEC §0)

- Both FK names verified live (current target: auth.users; target after: employees)
- Table row count = 0 (zero migration risk)
- employees.id verified as uuid (type-compatible with author_id)
- 1 runtime consumer in JS (`lens-pricing-drawer.js`); no code change needed

## Execution sequence

1. Claim pipeline lock with files_owned_globs per SPEC §11
2. Apply 2 migrations via Supabase MCP `apply_migration`
3. Run S3+S4+S5 pg_constraint queries via `execute_sql` — verify FK pivot
4. Run S6 information_schema query — verify NOT NULL preserved
5. Run S10 `get_advisors(security)` — verify no new HIGH/ERROR
6. Tier C VFV per §8:
   - Start local servers if not running (`scripts/start-local.ps1`)
   - Chrome MCP: navigate to `http://localhost:3000/inventory.html?t=demo&cat=lenses&tab=pricing`
   - Click "פרטים נוספים" on any offering row
   - Switch to "📝 הערות" tab
   - Click "➕ הוסף הערה", type smoke body, click "שמור"
   - Verify Toast + DB row + author_id matches sessionStorage tenant_employee.id
   - Screenshot to `screenshots/`
   - Hard-delete the smoke row
7. Run `npm run verify:integrity` (S11)
8. Write EXECUTION_REPORT.md + FINDINGS.md
9. Update module SESSION_CONTEXT + CHANGELOG + db-schema.sql
10. 3 commits per §10. Push to develop. Release lock.

## Stop-on-deviation triggers

- Any DDL fails
- Any §3 criterion fails to match
- `get_advisors` returns new HIGH/ERROR on lens_variant_notes
- Tier C fails after both DDLs successfully applied (would indicate a deeper issue)
- Iron Rule 32 hook blocks any commit
- pre-existing FOREMAN_REVIEW Tier C still fails (FK violation should be GONE — if present, escalate)

## Constraints

- All Iron Rules enforced. No bypass.
- Mockup IS the spec (Pattern P-AR-16) — N/A for this SPEC (no UI change).
- Tier C VFV mandatory.
- No Prizma writes.
- Path X sequential — after this SPEC closes 🟢, the session moves on to Group B authoring per parent Brief Step 4.

## Final report to Foreman

Standard executor final report format:
- Commits made (hash + subject)
- git status post-push
- verify_integrity result
- Tier C screenshot path
- FINDINGS count (0 expected; if any, severity)
- Next: "FK fix closed 🟢; ready for Group B authoring per parent Brief Step 4"

---

**END ACTIVATION_PROMPT**

_Authored 2026-05-18 IDT by opticup-strategic (Foreman). Path X sequential per Daniel directive._
