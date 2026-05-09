```
You are opticup-executor. Load your skill: opticup-skills:opticup-executor.

Execute SPEC at:
modules/Module 1 - Inventory/docs/specs/PERMISSIONS_HOTFIX_NULL_BYTES_2026_04_27/SPEC.md

CRITICAL HOTFIX: production matrix UI broken because employee-list.js has 4788 trailing null bytes (Cowork-VM truncation). Browser parser fails → matrix hangs on "טוען...".

Hard constraints:
- VISUAL QA IS MANDATORY in this SPEC. Daniel's direct demand. Do not skip with SQL or code review substitution.
- Use Chrome MCP `new_page` (isolated context) for QA. DO NOT navigate Daniel's existing tab — his prizma session must stay logged in.
- DO NOT touch any other file in modules/permissions/. Bug is isolated to employee-list.js.
- DO NOT make any DB writes.
- DO NOT touch the storefront repo.

Verify file is corrupted before fixing:
  hexdump -C modules/permissions/employee-list.js | grep '00 00' | head -1
  → expect first hit at offset ~0x31cc

Repair: truncate trailing null bytes, complete the dangling
  "(PERMISSIONS_PHASE2_FIX_2026_04_27 — file-size com"
  to
  "(PERMISSIONS_PHASE2_FIX_2026_04_27 — file-size compliance)."
+ trailing newline.

Strengthen Iron Rule 31 gate to catch null bytes ANYWHERE in file (not just at EOF).

Visual QA (per SPEC §12):
1. new_page → localhost:3000/employees.html?t=prizma → matrix renders fully, .perm-row count > 30, no "טוען" text, 0 console errors.
2. new_page → localhost:3000/?t=demo → sign in as Demo manager test user → inventory.html → bulk inventory ops accessible and functional.

Mandatory deliverables in SPEC folder:
1. EXECUTION_REPORT.md
2. FINDINGS.md (especially: was the truncation in commit 7d37e62 blob or did it appear later?)

3 commits per §9 plan. Both repos clean at end. Push ERP to origin/develop.

Hebrew status to Daniel when done:
"מטריצת ההרשאות נטענת ובדוקה ויזואלית. Iron Rule 31 חוזק. הבאג של Manager אומת חי בדפדפן."
List 3 commit hashes.
```
