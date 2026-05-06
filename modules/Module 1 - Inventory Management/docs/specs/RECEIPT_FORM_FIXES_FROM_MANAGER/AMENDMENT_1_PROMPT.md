Foreman acknowledges your stop. Your file-size analysis was correct and the SPEC's §3 #14 + §4 stop-trigger were genuinely contradictory.

**Resolution chosen: Option 1 (split into a new file).** This honors Iron Rule 12's "one responsibility per file" — sort-lock and invoice-validate are UI-validation features, distinct from row management.

The SPEC has been amended in place. Read **§13 Amendment 1** at the bottom of `modules/Module 1 - Inventory Management/docs/specs/RECEIPT_FORM_FIXES_FROM_MANAGER/SPEC.md`. It supersedes the conflicting parts of §3 #14, §4 stop-trigger, §8 Modified files, and §8 Docs.

Key changes:
- Create new file: `modules/goods-receipts/receipt-form-validate.js`. Houses sort-lock UI + invoice-compare logic.
- Move `_rcptSortKeyMap` + the column-header sort handler (current `receipt-form-items.js` lines 333–357) INTO the new file. Leave nothing of sort logic behind.
- `receipt-form-items.js` post-state target: ~337 lines (under 350). Verify with `wc -l` before each commit.
- Add `<script src="modules/goods-receipts/receipt-form-validate.js"></script>` in `inventory.html` IMMEDIATELY AFTER the existing `receipt-form-items.js` script tag.
- New file is CREATED in commit 1, EXTENDED in commit 2. Commit count and order unchanged.
- Update `docs/FILE_STRUCTURE.md` + module's `MODULE_MAP.md` per §13.6.

Resume execution from §0 §0.3 DB pre-flight, then proceed to commit 1.
