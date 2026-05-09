# SPEC — QUICK_REGISTER_QR_HOTFIX_TENANT_AND_EMAIL

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer)
> **Authored on:** 2026-05-04
> **Module:** 4 — CRM
> **Type:** Hotfix on top of QUICK_REGISTER_QR_FLOW Rung 1 (commits `d01f006` + storefront `74e2225`).
> **Production discipline:** test ONLY on demo (`8d8cfa7e-ef58-49af-9702-a862d459cccb`).

---

## 1. Goal

Fix two issues blocking demo testing of the quick-register flow surfaced during Daniel's first end-to-end test 2026-05-04:

1. **Tenant routing — bug in SPEC.** The storefront `/quick-register/` page hardcodes `tenant_slug='prizma'`, so testing on demo events is impossible (demo event #11 returns "אירוע לא נמצא"). Fix: storefront reads `?tenant=demo` URL param. When absent → defaults to `prizma`.
2. **Email field — must be required.** Daniel directive 2026-05-04: email is required like phone, not optional. Both the storefront form AND the EF must reject submissions without an email.

After this hotfix lands, all future quick-register testing happens on demo via `?tenant=demo&event=N`. The default behavior on production prizma URLs (no `?tenant=` param) remains unchanged.

---

## 2. Background & Motivation

**Verified evidence (Pre-Authoring Sweep, 2026-05-04 evening):**

- Daniel browsed `https://prizma-optic.co.il/quick-register/?event=11` and `http://localhost:4321/quick-register/?event=11` — both returned "אירוע לא נמצא". Event #11 verified to exist on demo tenant only (`crm_events` row for tenant `8d8cfa7e-...`, status `registration_open`, max_capacity 50). The EF code at `supabase/functions/quick-register/index.ts:107-128` correctly scopes `crm_events.tenant_id = tenant.id` — by design. So the bug is the storefront caller, not the EF.
- The EF accepts `tenant_slug` from request body; tenant resolution is correct. No EF change needed for fix #1 — only storefront change.
- Email field on the storefront form is currently labeled `(אופציונלי)` per SPEC §3.1.10. EF validates email regex but accepts null per `index.ts:199-201`. Both surfaces must change for fix #2.
- Daniel locked the email-required decision verbally: "אני צריך שתחייב להכניס אימייל - אימייל זה שדה חובה כמו מספר טלפון!!!!!!!!"

**Why a hotfix and not amending the original SPEC:** the original Rung 1 already shipped to develop (both repos) and the EF deployed as v1 ACTIVE. Hotfix is the cleanest path; folder-per-SPEC discipline keeps the lifecycle honest.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Storefront page reads `?tenant=` URL param, defaults to `prizma` when absent | grep `tenant` in `src/pages/quick-register/index.astro` finds URL param parsing | code inspection |
| 2 | Storefront form passes `tenant_slug` to EF based on URL param | DevTools network tab on submit shows `tenant_slug` matching URL param | manual smoke test |
| 3 | Email field label changed from `(אופציונלי)` to required indicator (red `*`) | grep page source — no "(אופציונלי)" near email field | code |
| 4 | Storefront form validates email is non-empty + regex match before submit (HTML5 `required` + `type="email"` minimum) | submit with empty email → blocked client-side | manual test |
| 5 | EF rejects request with missing or invalid email — new `error: 'missing_email'` or `'invalid_email'` 400 response | curl with no email → 400 | curl |
| 6 | Existing happy path with valid email still works on demo for event #11 | curl/manual submit with all fields → `{ok:true, status:'registered', ...}` | manual smoke test |
| 7 | `?tenant=demo&event=11` test on localhost storefront submits successfully + creates lead+attendee on demo tenant | new row in `crm_leads` with `source='quick_register_qr'` + `tenant_id=8d8cfa7e-...` | DB query post-submit |
| 8 | Iron Rule 12 file-size + Iron Rule 31 integrity gate clean | wc -l + verify:integrity exit 0/2 | post-commit |
| 9 | Single commit per repo (1 commit on opticup repo for EF, 1 commit on opticup-storefront for page) | 2 commits total | git log |
| 10 | Both pushed to develop on each repo, NEVER to main | post-push verify origin/develop = HEAD | git status |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Modify `supabase/functions/quick-register/index.ts` to require email (~3 lines added: `if (!emailRaw) return errorResponse("missing_email", 400);` + tighten the existing regex pass to error instead of nullify)
- Modify `src/pages/quick-register/index.astro` (or its component) in opticup-storefront repo:
  - Read URL param `tenant` (default `prizma`)
  - Pass to EF in submit body
  - Make email field required (HTML5 `required` + `type="email"` + visible `*`)
  - Remove `(אופציונלי)` label from email
- Run integrity gate on both repos
- Commit + push develop on both repos
- Single commit per repo

**Executor MUST stop and ask:**
- ANY DDL, RPC change, schema change — none should be needed
- Any prizma write
- Any merge to main
- If the storefront page structure differs materially from what the original Rung 1 commit added (use the file as it stands; do NOT rewrite)
- If adding the email regex requires a new dependency

---

## 5. Stop Triggers

1. **Storefront page uses a framework helper for URL params that doesn't exist** — STOP, paste actual import error.
2. **EF call signature changes break existing Make-side caller** (the `lookup_url` op) — STOP. The lookup_url op does NOT need email; only the default `register` op tightens.
3. **Email regex inconsistent between storefront and EF** — keep them aligned: simple `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is fine. If executor wants stricter — STOP and ask.
4. **Storefront `?tenant=demo` works but breaks Vercel deploy / build** — STOP, paste build output.

---

## 6. Rollback Plan

- `git revert <hotfix-commit>` on each repo. EF redeploys via CLI. Storefront redeploys via Vercel auto-pickup of revert commit.
- The two existing test artifacts (no rows yet on demo since the original event=11 test failed) → no DB cleanup needed.

---

## 7. Out of Scope

- Adding tenant param to ALL storefront pages (only `/quick-register/` for now)
- Hardening the EF against more nuanced email validation (DNS check, disposable-email filtering)
- Hardening the EF rate-limit or bot-protection (deferred to P5_6)
- Fixing the original SPEC §3.1.10 retroactively — superseded by this hotfix
- The end-of-M4 cleanup (revert tenant default to enforce tenant=prizma always once demo testing is done) — logged in §10 below as a follow-up task, NOT this SPEC's job

---

## 8. Expected Final State

```
opticup repo (ERP):
  supabase/functions/quick-register/index.ts   (MODIFIED — adds email-required)
  modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_HOTFIX_TENANT_AND_EMAIL/
    SPEC.md                                    (this file)
    ACTIVATION_PROMPT.md                       (sibling)
    EXECUTION_REPORT.md                        (added by executor)
    FINDINGS.md                                (added by executor — even if 0 findings, leave a stub note)

opticup-storefront repo:
  src/pages/quick-register/index.astro          (MODIFIED — tenant param + email required)
  (or whichever file the original Rung 1 created — executor inspects)

Supabase:
  Edge Functions: quick-register v2 (was v1)

After hotfix deploys + Daniel verifies on demo:
  - http://localhost:4321/quick-register/?tenant=demo&event=11 → form loads, submit succeeds, creates lead+attendee on demo tenant
  - https://prizma-optic.co.il/quick-register/?event=N (no tenant param) → still defaults to prizma (production behavior unchanged)
  - Empty-email submission → blocked (both client-side and server-side)
```

---

## 9. Commit Plan

**Commit on opticup repo:**
- Message: `fix(crm): require email + accept tenant_slug from request body in quick-register EF`
- Files: `supabase/functions/quick-register/index.ts`
- After commit: Daniel runs CLI deploy → v2 ACTIVE

**Commit on opticup-storefront repo:**
- Message: `fix(quick-register): read ?tenant URL param + require email field`
- Files: `src/pages/quick-register/index.astro` (and any direct imports)
- After commit: Daniel triggers Vercel deploy via PR-merge to main per §10 follow-up

**No merges to main from this SPEC by the executor.** Daniel handles PR-merge himself.

---

## 10. End-of-M4 Cleanup Task (CAPTURED, not part of this SPEC)

When all M4 closure work is fully verified on demo and we're ready to lock down to production-only behavior, a final cleanup SPEC needs to:

1. Either **lock the storefront** so `?tenant=` param is ignored when not in `?dev=1` mode (or some employee-only marker), OR document that `?tenant=` is a valid debug param for staff-only use.
2. Verify default behavior (no `?tenant=`) remains rock-solid for prizma's production traffic.
3. Document the design decision in `roles/campaign-overseer/HANDOFF.md` so a 2nd-tenant onboarding knows where the tenant-routing seam is.

**This task is logged in HANDOFF §"M4 cleanup follow-ups" by the Overseer right now (not the executor's job).**

---

## 11. Cross-Reference Check (Step 1.5 sweep, 2026-05-04 evening)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| `?tenant` URL param on storefront | Not used elsewhere on storefront for tenant-routing | New, no collision |
| `missing_email` error code | Not used elsewhere in EF | New, OK |
| `invalid_email` error code | Not used in `quick-register` EF; used in `lead-intake` EF for the same purpose | Reuse the same string semantics — consistent |

Sweep complete: 0 collisions / 3 names checked.

---

## 12. Manual QA — Daniel runs (after hotfix deploys)

On demo tenant only:

1. Hard-refresh storefront localhost (Ctrl+F5 on Windows).
2. Open `http://localhost:4321/quick-register/?tenant=demo&event=11`. Form loads with "אירוע מספר 11" header.
3. Try to submit with empty email → expect client-side block (browser native validation OR Hebrew error text).
4. Fill: name=`דניאל בדיקה רישום מהיר`, phone=`0537889878`, email=`test+rishum@example.com`, eye_exam=any, terms ✓, marketing ✓.
5. Submit → expect "registered, coupon coming" success screen.
6. Verify in CRM demo: new lead with `source='quick_register_qr'`, attendee on event #11 with `registration_method='quick_register_qr'`.
7. Verify coupon delivery email + SMS sent (existing automation).
8. Smoke-test the no-tenant-param fallback (production-shape URL): open `http://localhost:4321/quick-register/?event=99` (no tenant) → should hit prizma tenant; expect "אירוע לא נמצא" since no event 99 on prizma — confirms tenant fallback is `prizma`.

**Stop trigger:** ANY prizma write during this QA → halt and escalate.

---

*End of SPEC.*
