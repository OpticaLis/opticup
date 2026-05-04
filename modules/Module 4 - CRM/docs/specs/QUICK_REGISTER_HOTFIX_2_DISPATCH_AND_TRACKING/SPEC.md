# SPEC — QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING

> **Authored by:** opticup-strategic (Foreman, in-session via Campaign Overseer)
> **Authored on:** 2026-05-04 evening
> **Module:** 4 — CRM
> **Type:** Hotfix #2 on top of QUICK_REGISTER_QR_FLOW Rung 1 + Hotfix #1.
> **Production discipline:** test ONLY on demo.

---

## 1. Goal

Three fixes from end-to-end smoke test 2026-05-04 (post-hotfix-1):

1. **eye_exam_needed must be required** — currently optional on the form. Daniel directive: required like phone/email.
2. **Coupon not delivered automatically after quick-register submit** — the EF creates the attendee but never dispatches the coupon-delivery email/SMS. The success screen on storefront tells the customer "הקופון בדרך אליך" — that promise is currently a lie. Fix: after successful registration with a coupon slot available, fire `event_coupon_delivery` template (email + SMS) directly from the EF, mirroring the dispatch pattern in `event-register`.
3. **`acquired_via` column on `crm_leads`** — the existing `source` column captures how a lead first entered the system. We need a sibling column to capture every flow the lead traversed. The quick-register EF must populate `acquired_via='quick_register_qr'` on every call regardless of whether the lead was new or pre-existing.

---

## 2. Background & Motivation

**Verified evidence (2026-05-04 evening, post-hotfix-1 smoke test):**

- Daniel submitted `?tenant=demo&event=14` form via `localhost:4321/quick-register/`. The EF returned success ("הרישום הושלם!"). DB query confirmed the attendee row was created on `crm_event_attendees` (event 14, tenant=demo, status=registered, registration_method=quick_register_qr). **However:** `coupon_sent=false`, zero rows in `crm_message_log` for that lead+event, no message dispatch was triggered.
- The reason: `quick-register` EF returns success after the `register_lead_to_event` RPC succeeds, but never calls any dispatch function. The `event-register` EF (the legacy public form path) calls `dispatchRegistrationMessages()` after the RPC succeeds — `quick-register` simply forgot to do this.
- The `event_coupon_delivery_email_he` + `event_coupon_delivery_sms_he` templates already exist on demo (verified via `crm_message_templates` query 2026-05-04). They render `%lead_id%` as the QR code via `api.qrserver.com` plus the `%coupon_code%` text. Same templates that the existing automation rule "הרשמה: אישור הרשמה" would have used if reached.
- Daniel verbal directive 2026-05-04: "גם את הבדיקת ראייה חשוב לעשות חובה בבחירה". The form has a `<select>` for eye_exam with default `--בחר/י--`; submission with default value is currently allowed.
- Daniel verbal directive 2026-05-04 (option A): add `acquired_via` column. Rationale: same phone might be a repeat lead from a different flow; we want to track all flows, not overwrite the original `source`.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | New column `crm_leads.acquired_via` exists | `text NULL` (no default; values are flow tags like `quick_register_qr`, `lead_intake`, `event_register`, `manual`) | `information_schema.columns` query |
| 2 | Migration also backfills existing leads' `acquired_via` from current `source` value (so old data has historical flow tag too) | `SELECT COUNT(*) FROM crm_leads WHERE acquired_via IS NULL` returns 0 on both demo + prizma | DB query post-migration |
| 3 | `quick-register` EF sets `acquired_via='quick_register_qr'` on EVERY call (new lead OR pre-existing lead update path) | DB shows the value updated even for pre-existing leads | manual smoke test + DB query |
| 4 | `quick-register` EF dispatches `event_coupon_delivery_email_he` + `event_coupon_delivery_sms_he` after successful registration with coupon-available status | new rows in `crm_message_log` for the test attendee+event | DB query post-submit |
| 5 | If status returned is `waiting_list` (event full), dispatch `event_waiting_list_confirmation` instead of `event_coupon_delivery` | conditional template selection | manual test on a full event |
| 6 | Storefront form: eye_exam dropdown must be selected (HTML5 `required` + non-empty default value rejected) | empty submit blocked client-side | manual test |
| 7 | EF rejects request if `eye_exam_needed` is missing or empty | 400 `error: 'missing_eye_exam'` | curl test |
| 8 | Iron Rule 12 file size + integrity gate clean across both repos | wc -l + verify:integrity | post-commit |
| 9 | Single commit per repo + 1 migration commit | 3 commits total | git log |
| 10 | Both pushed to develop (NEVER main) | post-push verify | git status |
| 11 | Existing flows (event-register, lead-intake) NOT affected by the new `acquired_via` column (column is nullable, no NOT NULL constraint, so old INSERTs keep working) | event-register smoke test still works | manual test |

---

## 4. Autonomy Envelope

**Executor CAN do without asking:**
- Add migration `20260504_add_acquired_via_to_crm_leads.sql` that:
  - `ALTER TABLE crm_leads ADD COLUMN acquired_via text;`
  - `UPDATE crm_leads SET acquired_via = source WHERE acquired_via IS NULL;` (backfill)
  - **No NOT NULL constraint** — backward compatible with existing INSERTs.
- Apply migration via Supabase MCP `apply_migration`.
- Modify `supabase/functions/quick-register/index.ts`:
  - Reject empty `eye_exam_needed` with `errorResponse("missing_eye_exam", 400)`
  - On lead create: include `acquired_via: SOURCE_TAG` in insert row
  - On lead update (existing lead path): set `acquired_via: SOURCE_TAG` in the update patch
  - After successful RPC: implement `dispatchRegistrationMessages` mirroring the pattern in `event-register/index.ts:91-95+330` — but use `event_coupon_delivery` for `registered` status and `event_waiting_list_confirmation` for `waiting_list`.
  - Fire-and-forget pattern (don't block the response on dispatch result; log errors)
- Modify storefront `src/pages/quick-register/...`:
  - eye_exam `<select>` gets `required` attribute
  - Default option's value must be empty string (so `required` validation rejects it)
  - Change red `*` to all required fields

**Executor MUST stop and ask:**
- If the migration would touch RLS policies or trigger functions
- If the DDL fails to apply (lock timeout, etc.)
- If the dispatch helper from event-register has changed shape and the copy isn't clean
- Any prizma write
- Any merge to main

---

## 5. Stop Triggers

1. **Migration fails to apply** — STOP, paste error, wait for Foreman.
2. **Existing crm_leads row has `source IS NULL`** (would break backfill) — STOP, count nulls, ask whether to use `'unknown'` literal or skip.
3. **`event_coupon_delivery` template variables differ from what the EF can supply** — STOP, list missing variables.
4. **Dispatch fires but `crm_message_log` rows aren't created** (vendor-side failure) — accept (not a SPEC blocker; log it as finding).
5. **`event-register` EF imports a shared module that doesn't exist in `quick-register`'s scope** — STOP, paste import errors.

---

## 6. Rollback Plan

- `git revert <hotfix-2-commit>` on each repo.
- For migration: write a follow-up migration that `ALTER TABLE crm_leads DROP COLUMN acquired_via;` IF needed (column is nullable + non-load-bearing, so leaving it is also fine).
- EF redeploys via CLI.

---

## 7. Out of Scope

- Adding `acquired_via` to other EFs (`event-register`, `lead-intake`) — those should populate it in a future SPEC, but for now they continue setting `source` only. The backfill in migration covers historical data.
- Reviving cancelled attendees → registered (Daniel's NEW feature request — captured separately for post-M4 backlog).
- Refactoring the dispatch helper into a shared module reusable by 3 EFs — duplication across `event-register` and `quick-register` is acceptable for now. Refactor in a future "shared dispatch lib" SPEC.
- Adding a UI in CRM to show `acquired_via` — analytics-only column for now.

---

## 8. Expected Final State

```
opticup repo (ERP):
  supabase/migrations/20260504_add_acquired_via_to_crm_leads.sql   (NEW)
  supabase/functions/quick-register/index.ts                        (MODIFIED ~80 lines added)
  modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING/
    SPEC.md, ACTIVATION_PROMPT.md, EXECUTION_REPORT.md, FINDINGS.md

opticup-storefront repo:
  src/pages/quick-register/...   (MODIFIED — eye_exam required)

Supabase:
  Edge Functions: quick-register v4 (was v3)
  Schema: crm_leads gains 1 nullable column acquired_via

Live state after deploy + smoke test:
  - Daniel submits quick-register form on event 14 with all fields filled
  - DB shows: lead row has acquired_via='quick_register_qr', attendee created,
    crm_message_log has 2 new rows (email + SMS for event_coupon_delivery)
  - Storefront blocks empty eye_exam submit
```

---

## 9. Commit Plan

**Commit 1 — opticup repo (migration):**
- Message: `feat(crm): add acquired_via column to crm_leads with backfill`
- Files: `supabase/migrations/20260504_add_acquired_via_to_crm_leads.sql`
- After commit: applied via MCP `apply_migration`.

**Commit 2 — opticup repo (EF):**
- Message: `feat(crm): quick-register dispatches coupon-delivery + sets acquired_via + requires eye_exam`
- Files: `supabase/functions/quick-register/index.ts`
- After commit: Daniel runs CLI deploy → v4 ACTIVE.

**Commit 3 — opticup-storefront repo:**
- Message: `fix(quick-register): require eye_exam dropdown selection`
- Files: storefront page modified
- Push to develop. Daniel triggers PR-merge to main for Vercel deploy.

**No merges to main from this SPEC by the executor.**

---

## 10. Cross-Reference Check (Step 1.5 sweep)

| Name | Lookup result | Resolution |
|------|--------------|------------|
| `crm_leads.acquired_via` | NOT in current schema (verified 2026-05-04) | New column, OK |
| `missing_eye_exam` error code | Not used in any EF | New code, OK |
| `event_coupon_delivery_email_he` / `_sms_he` templates | Exist on demo + prizma (verified) | Reused as-is |
| `dispatchRegistrationMessages` function | Exists in `event-register/index.ts:91-95` | Pattern copied (Iron Rule 21 — not literal copy of code, but same shape) |
| `event_waiting_list_confirmation` template | Already used by event-register | Reused for quick-register too |

Sweep: 0 collisions / 5 names.

---

## 11. Manual QA — Daniel runs

1. After all 3 commits land + Daniel deploys EF v4 + Vercel publishes:
2. Hard-refresh `http://localhost:4321/quick-register/?tenant=demo&event=14` (or another event with empty seats).
3. Try empty-eye-exam submit → expect block.
4. Fill all fields, submit → expect success.
5. Within 60s expect SMS + email at the test phone/email with the coupon QR.
6. Verify in CRM demo: attendee row + 2 message_log rows (email + SMS).
7. Verify the lead's `acquired_via` column = `'quick_register_qr'`.

---

## 12. Captured for backlog (NOT this SPEC)

- **Daniel feature request 2026-05-04:** ability to revive cancelled attendee → registered (when a slot opens up). Logged in `__LAUNCH_PLAN_DRAFT__/campaign-overseer/POST_CUTOVER_TECH_DEBT.md` (Overseer logs this immediately, NOT executor's job).
- Rule-21 unification of dispatch helpers across `event-register`, `quick-register` (and future `whatsapp-catalog-flow` if any) — future SPEC.
- Locking the `?tenant=` storefront param after M4 closes (already in HANDOFF as M4-cleanup task).

---

*End of SPEC.*
