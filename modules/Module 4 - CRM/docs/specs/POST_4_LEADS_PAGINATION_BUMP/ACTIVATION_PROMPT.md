# ACTIVATION PROMPT — POST_4_LEADS_PAGINATION_BUMP

> **Tiny SPEC, single 1-line change. Estimated executor time: 5 minutes.**

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/POST_4_LEADS_PAGINATION_BUMP/SPEC.md

Read SPEC.md fully. 1-line change.

EXECUTION ORDER:

0. PRE-FLIGHT:
   a. First Action protocol per CLAUDE.md §1 — branch=develop, pull, integrity gate clean.
   b. Verify clean repo.

1. Pre-edit verification:
   a. grep -n "SERVER_PAGE" modules/crm/crm-leads-tab.js → expect 3 hits (line 31 declaration, line 72 + 76 usage).
   b. grep "SERVER_PAGE" across the entire repo → expect those 3 hits only (no external readers).
   STOP if grep returns more than 3 hits or any other file references SERVER_PAGE.

2. Edit:
   - File: modules/crm/crm-leads-tab.js
   - Line 31: change `var SERVER_PAGE = 200;` to `var SERVER_PAGE = 1000;`

3. Iron Rule 12 + 31 verify (file size + integrity gate clean).

4. Single commit: `perf(crm): raise leads tab SERVER_PAGE from 200 to 1000 (1158 leads → 2 batches)`. Add only modules/crm/crm-leads-tab.js. Push origin develop.

5. Tell Daniel commit pushed; ask him to verify §12 manual QA from SPEC (open CRM, leads tab loads in 2 batches max).

6. After Daniel confirms:
   a. Write modules/Module 4 - CRM/docs/specs/POST_4_LEADS_PAGINATION_BUMP/EXECUTION_REPORT.md (success criteria outcomes + commit hash + smoke test).
   b. Write FINDINGS.md (likely "No findings; SPEC closed cleanly.").
   c. Single retro commit: `chore(spec): close POST_4_LEADS_PAGINATION_BUMP with retrospective`. Push.

CONSTRAINTS:
- Demo + prizma both work the same way; no tenant-scoped behavior in this change.
- Single 1-line code commit + 1 retro = 2 commits total. NEVER merge to main.
- Stop on any deviation per CLAUDE.md §9.

Begin with step 0.
```
