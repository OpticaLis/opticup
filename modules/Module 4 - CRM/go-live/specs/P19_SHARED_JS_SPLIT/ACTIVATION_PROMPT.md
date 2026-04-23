# Claude Code — Execute P19 shared.js Split SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P19 splits `js/shared.js` (407 lines, 57 over the 350-line hard max) into
2 files to unblock all future Rule 5 FIELD_MAP additions. Adds P18's
deferred FIELD_MAP entries (`max_coupons`, `extra_coupons`).

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P19_SHARED_JS_SPLIT/SPEC.md`

**Known untracked:** SPEC folders from prior SPECs may be untracked. Ignore
them, use selective `git add` by filename.

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully
3. **Verify shared.js line count:** `wc -l js/shared.js` — expected: ~407
4. **Verify section markers:** `grep -n "^// —" js/shared.js` — expected: 4
5. **Verify no CONFIG/UI deps in COMPAT section:** `sed -n '137,314p' js/shared.js | grep -c "sb \|getTenantId\|SUPABASE_\|resolveTenant"` — expected: 0
6. Start `localhost:3000`, verify ERP loads on `index.html?t=demo`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Single Commit — All Tracks Together

1. **Create `js/shared-field-map.js`** with lines 137–314 from shared.js
2. **Add P18 FIELD_MAP entries** under `crm_events` in the new file
3. **Remove lines 137–314 from `js/shared.js`**, leave a comment pointer
4. **Update all 18 HTML files** (15 pages + 3 test) with `<script src="js/shared-field-map.js"></script>` BEFORE the shared.js tag
5. **Update `docs/FILE_STRUCTURE.md`** — add `js/shared-field-map.js`
6. **Verify:** `wc -l js/shared.js js/shared-field-map.js` — both ≤ 350
7. **Browser check:** load `index.html?t=demo` and `crm.html?t=demo`, 0 console errors
8. Commit: `refactor(shared): split shared.js — extract FIELD_MAP to shared-field-map.js, add P18 coupon entries`

---

## Key Rules

- **Rule 12:** both files ≤ 350 lines
- **Rule 5:** add P18's deferred FIELD_MAP entries after the split
- **Rule 4:** do NOT change barcode logic
- **Zero behavior changes** — this is a mechanical split
- **Clean ALL test data** at end (if any created)

---

*End of ACTIVATION_PROMPT — P19_SHARED_JS_SPLIT*
