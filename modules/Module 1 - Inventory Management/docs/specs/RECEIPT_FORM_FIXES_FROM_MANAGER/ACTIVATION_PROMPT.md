You are running under the **opticup-executor** skill. Load it now if not already loaded, then execute the SPEC at:

`modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/SPEC.md`

This is a 4-commit hotfix bundle for the goods-receipt form, addressing items 13/14/15 from the Prizma branch manager's fix list. Item 14 has a measured production incident behind it (receipt 8119464877, +3,710.64 ₪ over invoice). The data correction is OUT OF SCOPE — Daniel handles those 4 rows manually. This SPEC ships only the prevention.

**Critical execution rules:**
- Run the §0 §0.3 DB pre-flight FIRST. If `sort_order`/`position`/`seq`/`row_num` already exists on `goods_receipt_items`, STOP — schema has changed since SPEC was authored.
- Ship the 4 commits in the exact order in §9. Commit 3 is the only one with DB changes.
- All QA in §12 runs on the **Demo** tenant. Never on Prizma. Confirm working before reporting close.
- End with `git status --porcelain | wc -l` returning `0`. Push to `develop` (not `main` — Daniel-only via PR).
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` in the SPEC folder before commit 4.
- Update `SESSION_CONTEXT.md` and `CHANGELOG.md` per §8.

Begin.
