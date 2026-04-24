# FOREMAN_REVIEW — STOREFRONT_FORMS (Part A)

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Cowork)
> **Written on:** 2026-04-23
> **SPEC reviewed:** `SPEC.md` (authored 2026-04-23)
> **Executor report:** `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Verdict:** CLOSED

---

## 1. Verdict

**CLOSED.** All 4 tracks landed cleanly. 12/12 Part-A success criteria
verified. 3 EFs deployed and curl-tested. Zero DB changes, zero new files,
all files ≤350 hard limit. Backwards compat preserved (legacy UUID params
still work, HTML unsubscribe still served to browsers). One in-scope bug
fix (placeholder leak) was the right call. Repo clean on develop.

---

## 2. Execution Scoring

| Dimension | Score | Notes |
|-----------|-------|-------|
| Adherence to SPEC | 5/5 | 12/12 criteria pass. Two small additive decisions (pre-fill IDs in GET response, placeholder detector) both defensible and correctly documented. |
| Iron Rule compliance | 4.5/5 | Rule 21 duplication (HMAC helpers ×3) was explicitly authorized by SPEC. Rule 9 hardcoded domain explicitly waived. Both re-filed as findings — good discipline. |
| Commit hygiene | 5/5 | 2 clean code commits + 1 retrospective, each logically scoped. Messages descriptive. |
| Documentation | 4.5/5 | EF header comments updated. SESSION_CONTEXT not updated — correct per Module 4 convention (Foreman batches). |
| Autonomy discipline | 5/5 | Zero questions asked. 4 ambiguities resolved correctly in real time. |
| Finding discipline | 5/5 | 2 findings logged, 1 pre-existing debt re-filed (not absorbed). The placeholder fix was correctly handled in-scope with rationale. |

**Execution score: 4.83/5**

---

## 3. SPEC Scoring (self-assessment by Foreman)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Correctness | 4/5 | Tracks A-D all valid. Missed the `unsubscribe_url` placeholder leak that the executor caught — should have read the existing code more carefully during authoring. |
| Completeness | 4.5/5 | All necessary changes covered. Could have included a "line-count budget" per-file to prevent the trim-header loop. |
| Clarity | 4.5/5 | Executor made zero ambiguity-related errors. Track D's "recommended approach" was correctly followed without confusion. Minor: could have mentioned the anon-key header for curl verification. |
| Estimates | 4/5 | 2 commits landed (matched plan). File-size impact was underestimated — all 3 EFs hit soft-target warnings. |

**SPEC score: 4.25/5**

---

## 4. Finding Dispositions

### M4-DEBT-FINAL-01 (MEDIUM) — HMAC helpers tripled across 3 EFs

**Disposition: DEFER to post-Part-B SPEC.** Three copies is manageable for
go-live. When Part B is deployed and the full registration+unsubscribe flow
is verified end-to-end on the storefront, author a small extraction SPEC
(`_shared/hmac-token.ts`). Combining with the send-message dispatch helper
extraction (original M4-DEBT-FINAL-01) makes sense — one SPEC, one deploy
of all 3 EFs.

### M4-DEBT-FINAL-02 (LOW/HIGH) — STOREFRONT_ORIGIN hardcoded

**Disposition: TECH_DEBT — track.** Currently LOW (single tenant). Add
`tenants.storefront_domain` column + EF lookup when tenant #2 is being
onboarded. Not blocking anything today.

### Placeholder leak fix (in-scope)

**Disposition: APPROVED.** The executor's decision to fix the
`isPlaceholder` check in-scope was correct. The alternative (duplicating
a known-broken pattern) would have guaranteed `[קישור הסרה — יצורף אוטומטית]`
appearing in real SMS messages. Good engineering judgment.

---

## 5. SPEC-Author Lessons (2 concrete improvements)

### Lesson 1 — Include file-size budget in SPEC §8

**Problem:** All 3 EFs hit the 300-line soft target. The executor had to
trim header comments mid-edit (5 min wasted ×2 files). The SPEC knew the
starting line counts but didn't compute the budget.

**Action:** Add to opticup-strategic SKILL.md a rule: "When §8 lists a
modified file, include its current line count and the estimated delta.
If `current + delta > 330`, prescribe where to trim or extract BEFORE
the executor starts."

### Lesson 2 — Include curl headers for EF verification

**Problem:** The executor discovered mid-verification that Supabase
gateway requires anon-key headers even for `verify_jwt=false` EFs.

**Action:** Add a standard note in SPEC §3 verification commands:
"All EF curl commands must include `-H 'apikey: $ANON' -H 'Authorization: Bearer $ANON'`.
See `js/shared.js` for the anon key value."

---

## 6. Status After This SPEC

**STOREFRONT_FORMS Part A is CLOSED.** ERP-side changes deployed:
- `event-register` EF accepts HMAC tokens + returns pre-fill data ✅
- `unsubscribe` EF returns JSON for API calls ✅
- `send-message` EF generates storefront-domain URLs ✅
- `crm-automation-engine.js` uses server-side URL injection ✅

**Next:**
1. Part B — Storefront Astro pages (`/event-register/` + `/unsubscribe/`)
   in the `opticup-storefront` repo. Separate SPEC + execution.
2. After Part B: end-to-end test (send a real registration SMS from CRM
   on demo → click the link → confirm on storefront → verify attendee
   row created).
3. Then: Automation Rules v2 (§3 of PRE_PRODUCTION_ROADMAP).
