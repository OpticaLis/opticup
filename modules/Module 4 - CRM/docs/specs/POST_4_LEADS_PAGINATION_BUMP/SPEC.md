# SPEC — POST_4_LEADS_PAGINATION_BUMP

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer)
> **Authored on:** 2026-05-04 late night (M4 closure rush)
> **Module:** 4 — CRM
> **Source:** POST-4 in `project_post_cutover_backlog.md` — Daniel observed only ~4 pages of leads visible at entry; needs ~6 "load more" clicks to see all 1,158 leads.
> **Production discipline:** 1-line change. Demo + prizma read-only test (no DB writes).

---

## 1. Goal

Raise `SERVER_PAGE` constant in `modules/crm/crm-leads-tab.js:31` from 200 to 1000 so the leads tab loads ~1,158 leads in 2 batches instead of 6. Cosmetic improvement; no UX risk.

---

## 2. Background & Verified Evidence

- ✅ `var SERVER_PAGE = 200;` at `modules/crm/crm-leads-tab.js:31` (probed 2026-05-04 late night).
- ✅ Used at line 72 (`q.range(_svrOffset, _svrOffset + SERVER_PAGE - 1)`) and line 76 (`if (rows.length < SERVER_PAGE) _svrHasMore = false;`).
- ✅ Today: 1,158 active leads on prizma → 6 server batches at 200/batch.
- ✅ Supabase default max return is 1000 rows per query. Setting `SERVER_PAGE=1000` aligns with the platform's natural ceiling and reduces round-trips by ~5×.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 3.1 | `SERVER_PAGE = 1000` in `modules/crm/crm-leads-tab.js:31` | constant raised | grep |
| 3.2 | All 3 references to `SERVER_PAGE` still read the same constant (no inline hardcoded 200 introduced) | 3 hits, all reading the var | grep |
| 3.3 | Leads tab loads all ~1,158 prizma leads in 2 batches (1000 + 158) | 2 round trips | browser DevTools network tab |
| 3.4 | "load more" button appears once after batch 1, disappears after batch 2 | UX correct | manual browse |
| 3.5 | Iron Rule 12 (file size ≤350) | crm-leads-tab.js still under 350 lines | wc -l |
| 3.6 | Iron Rule 31 (integrity gate) | clean | post-commit |
| 3.7 | Single commit | exactly 1 commit | `git log` |

---

## 4. Autonomy Envelope

**Executor CAN:**
- Edit line 31: `var SERVER_PAGE = 200;` → `var SERVER_PAGE = 1000;`
- Run integrity gate, commit, push.
- Smoke test: open leads tab on demo (or prizma after merge to main) → confirm 2-batch behavior.
- Write 1-line FINDINGS.md.

**Executor MUST stop:**
- If grep finds hardcoded `200` elsewhere coupled to leads pagination — STOP, ask Foreman.
- If `SERVER_PAGE` is referenced from another file (it shouldn't be) — STOP.
- Any merge to main.

---

## 5. Stop Triggers

1. Browser shows weird pagination behavior post-bump (e.g. infinite "load more", empty page) — STOP.
2. Supabase returns >1000 rows somehow — STOP, the platform default is being bypassed by a setting we don't know about.

---

## 6. Rollback

`git revert <commit>` — restores 200.

---

## 7. Out of Scope

- "Load all" button instead of incremental loading.
- Server-side filtering optimization.
- Refactor to virtualized rendering for >5K leads (future when data grows).
- Other tabs' pagination (incoming, events, etc.).

---

## 8. Expected Final State

```
modules/crm/crm-leads-tab.js:31   var SERVER_PAGE = 1000;   (was 200)
modules/Module 4 - CRM/docs/specs/POST_4_LEADS_PAGINATION_BUMP/
  SPEC.md                          (this file)
  ACTIVATION_PROMPT.md             (sibling)
  EXECUTION_REPORT.md              (added by executor)
  FINDINGS.md                      (likely 1-line)
```

---

## 9. Commit Plan

**Commit 1:** `perf(crm): raise leads tab SERVER_PAGE from 200 to 1000 (1158 leads → 2 batches)`. File: `modules/crm/crm-leads-tab.js`.

**Commit 2 (retro):** `chore(spec): close POST_4_LEADS_PAGINATION_BUMP with retrospective`.

**No merge to main.** Daniel handles PR.

---

## 10. Cross-Reference Check

| Name | Result | Resolution |
|---|---|---|
| `SERVER_PAGE` | EXISTS at line 31, used at 72 + 76 | Edit value only |
| Other files referencing leads pagination | NONE found | Single-file change |

---

## 11. Lessons Already Incorporated

- L-005 Rule B (REC class-tagging): this SPEC is `[feature-request]` class — Daniel-proactive operational quality-of-life ask. Counter-trend with feature-request 100% agree pattern.

---

## 12. Manual QA — Daniel runs

1. Open CRM → רשומים tab.
2. Wait for first batch.
3. Click "load more" once → all leads visible (no second "load more" needed).

**Stop trigger:** if "load more" still requires multiple clicks, the bump didn't ship.

---

## 13. Deferrals

- "Load all" button — future if Daniel wants.
- Virtualized rendering for >5K leads — future.

---

*End of SPEC.*
