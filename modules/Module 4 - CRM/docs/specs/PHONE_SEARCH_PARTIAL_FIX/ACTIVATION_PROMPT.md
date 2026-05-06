# ACTIVATION PROMPT — PHONE_SEARCH_PARTIAL_FIX

> **Tiny SPEC, ~5-line code patch. Estimated executor time: 10-15 minutes including QA.**

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/SPEC.md

Read SPEC.md fully. ~5-line patch in ONE file.

EXECUTION ORDER:

0. PRE-FLIGHT:
   a. First Action protocol per CLAUDE.md §1 — branch=develop, pull, integrity gate clean.
   b. Verify clean repo.

1. Cross-reference verification:
   a. Confirm modules/crm/crm-helpers.js:31-42 contains normalizePhone returning null on partial input. DO NOT modify this file.
   b. Confirm modules/crm/crm-leads-tab.js:145-152 contains the search filter described in SPEC §2.
   c. grep "normalizePhone" across modules/crm/ → identify any other tab using the same pattern. If found, list them but DO NOT modify in this SPEC (out of scope §7).
   STOP if the search code shape differs materially from SPEC §2.

2. Edit modules/crm/crm-leads-tab.js around line 145:
   - Add helper logic that tests an additional fallback: if `s` is all digits AND length >= 2 AND starts with '0', synthesize a partial-E.164 form: `'+972' + s.slice(1)` and `'972' + s.slice(1)` — test phone.indexOf against both.
   - Keep the existing 4 conditions (name, phone-substring, sNorm full-match, email).
   - Do NOT widen the heuristic to single-char input — require length >= 2 to avoid false-positives on a single '0'.

   Concrete suggested edit (adapt to actual style):
   ```js
   var s = search.trim().toLowerCase();
   var sNorm = (window.CrmHelpers && CrmHelpers.normalizePhone) ? CrmHelpers.normalizePhone(s) : '';
   var sPartial972 = '';
   if (s && /^0\d+$/.test(s) && s.length >= 2 && s.length <= 10) {
     sPartial972 = '+972' + s.slice(1);
   }
   _filtered = afterAdv.filter(function (r) {
     if (_failuresOnly && !(_failedCounts[r.id] > 0)) return false;
     if (!s) return true;
     var name = (r.full_name || '').toLowerCase();
     var phone = (r.phone || '').toLowerCase();
     var email = (r.email || '').toLowerCase();
     return name.indexOf(s) !== -1
         || phone.indexOf(s) !== -1
         || (sNorm && phone.indexOf(sNorm) !== -1)
         || (sPartial972 && phone.indexOf(sPartial972) !== -1)
         || email.indexOf(s) !== -1;
   });
   ```

3. Iron Rule 12 (file size) + Iron Rule 31 (integrity gate) verify.

4. Single commit: `fix(crm): partial Israeli-format phone search — handle 0-prefixed prefixes shorter than 10 digits`. Add only modules/crm/crm-leads-tab.js. Push origin develop.

5. Tell Daniel commit pushed; ask him to verify §12 manual QA from SPEC (5 search variants).

6. After Daniel confirms:
   a. Write modules/Module 4 - CRM/docs/specs/PHONE_SEARCH_PARTIAL_FIX/EXECUTION_REPORT.md.
   b. Write FINDINGS.md (likely 1-line if clean; or note any other tabs that have the same bug as a tech-debt follow-up).
   c. Single retro commit: `chore(spec): close PHONE_SEARCH_PARTIAL_FIX with retrospective`. ALSO add the SPEC + ACTIVATION_PROMPT files in this same retro commit (they're untracked from Cowork). Push.

CONSTRAINTS:
- Demo + prizma both work the same way; no tenant-scoped behavior in this change.
- DO NOT modify modules/crm/crm-helpers.js. The search-side fix lives in crm-leads-tab.js.
- 1 code commit + 1 retro = 2 commits total. NEVER merge to main.
- Stop on any deviation per CLAUDE.md §9.

Begin with step 0.
```
