# SPEC — M4_LEAD_INTAKE_ASYNC_DISPATCH

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_LEAD_INTAKE_ASYNC_DISPATCH/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, Site Overseer hat — but this work is Module 4 / CRM territory)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM (Edge Function `lead-intake`)
> **Repo:** `opticup` (Edge Functions in `supabase/functions/`)

---

## 1. Goal

Reduce the user-facing wait time on the `/supersale/` lead form (and any other form that POSTs to the `lead-intake` Edge Function) from 10-15 seconds down to 1-2 seconds, by decoupling the synchronous Make-webhook dispatch from the user response. The lead row will still be persisted to `crm_leads` **before** the response is returned (so legal/audit trail is preserved), but the SMS + email dispatch via Make will run as a background task using Deno's `EdgeRuntime.waitUntil()` API.

---

## 2. Background & Motivation

Daniel observed 2026-05-13 a 10-15 second delay between clicking "שריינו לי מקום" on `/supersale/` and arriving at `/successfulsupersale/`. Root cause investigation (Site Overseer pre-flight 2026-05-14):

The current `lead-intake` EF call chain is fully synchronous:

```
[Frontend POST] → lead-intake EF
  ├── INSERT crm_leads                    (~50ms)
  ├── await dispatchFreshLead()           (synchronous wrapper)
  │   ├── SELECT active event             (~30ms)
  │   ├── dispatchIntakeMessages()        (synchronous wrapper)
  │   │   └── Promise.allSettled([
  │   │         await fetch(send-message)  ← SMS path
  │   │           └── INSERT crm_message_log status='pending'
  │   │           └── await fetch(Make webhook)   ← 5-10 sec
  │   │           └── UPDATE crm_message_log status='sent'
  │   │         await fetch(send-message)  ← Email path
  │   │           (same shape, 5-10 sec)
  │   │       ])
  │   └── closeRun()
  └── return 201 to frontend  ← user finally sees redirect
```

The two `send-message` calls happen in parallel (`Promise.allSettled`), so total Make wait time is `max(SMS, Email)` not `SMS+Email`. But Make's synchronous scenario execution means each individual call takes 5-10 seconds. The user waits for the slower of the two.

The fix is to:
1. Keep the `crm_leads` INSERT synchronous + the response returned immediately.
2. Move the `dispatchFreshLead()` call into a background task that continues after the response is sent, using `EdgeRuntime.waitUntil()`.
3. Add a one-row reliability backstop: if the Edge Function instance dies before Make completes, the `crm_message_log` row stays at `status='pending'` and the existing `retry-failed` EF can pick it up later (or a follow-up SPEC adds a cron retry — not in this SPEC's scope).

This is SaaS-clean: works for any tenant, doesn't change the data model, no new tables. Preserves the audit trail (`crm_message_log` per-message state) and aligns with how modern serverless message dispatch is typically done.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | ERP repo, branch | `opticup`, `develop`, clean before & after | `git status` |
| 2 | Pre-flight: `lead-intake/index.ts:301` has `await dispatchFreshLead(...)` | grep finds 1 match | `grep -n 'await dispatchFreshLead' supabase/functions/lead-intake/index.ts` → 1 match on line 301 |
| 3 | After change: `lead-intake/index.ts:301` wraps the call in `EdgeRuntime.waitUntil(...)` instead of awaiting | grep finds `EdgeRuntime.waitUntil(dispatchFreshLead` | `grep -n 'EdgeRuntime.waitUntil(dispatchFreshLead' supabase/functions/lead-intake/index.ts` → 1 match |
| 4 | The `await` is removed (was line 301) | 0 occurrences of `await dispatchFreshLead` in this file | `grep -c 'await dispatchFreshLead' supabase/functions/lead-intake/index.ts` → 0 |
| 5 | A defensive try/catch wraps the background call so an unhandled rejection doesn't crash the worker | `EdgeRuntime.waitUntil(dispatchFreshLead(...).catch(err => { console.error(...) }))` | `grep -A 2 'EdgeRuntime.waitUntil' supabase/functions/lead-intake/index.ts` includes `.catch(` |
| 6 | Lead is still inserted BEFORE response returns | INSERT runs at line ~288 (existing), response returns at line ~303 (existing) — UNCHANGED ordering | Manual code review |
| 7 | Edge Function deploys cleanly | `supabase functions deploy lead-intake` → exit 0 | `supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit` |
| 8 | Smoke test: submit on demo tenant `/supersale/` (or via curl with demo phone `0537889878`) | Response arrives in <3 seconds. `crm_leads` row created within 1 second. `crm_message_log` rows appear within 30 seconds with eventual status='sent'. | Manual curl + DB SELECT |
| 9 | Live production smoke: Daniel submits a real test form on `https://www.prizma-optic.co.il/supersale/` with test phone `0537889878` | Redirect to `/successfulsupersale/` within 3 seconds. Lead row exists immediately in DB. SMS + email arrive within 30 seconds. | Manual Daniel verification post-deploy |
| 10 | Failure mode: if Make is down, the lead is STILL saved | `crm_leads` row exists; `crm_message_log` rows stay at `status='pending'` (or `failed`); user still gets redirect to thank-you | Manual: temporarily mock Make webhook URL to a 500-returning endpoint, submit, verify lead exists + log row is pending/failed + frontend got 201 |
| 11 | Commit count | 1 commit | `git log origin/develop..HEAD --oneline` → 1 |
| 12 | HANDOFF + DECISIONS_LOG updated | New entry under 2026-05-14 | grep |

Criteria 9 + 10 are post-deploy + Daniel-manual. Executor reports completion at criterion 12.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in `opticup` and `opticup-storefront`
- Modify `supabase/functions/lead-intake/index.ts` — specifically wrap line 301's call in `EdgeRuntime.waitUntil(...).catch(...)`
- Run `supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit` to deploy the new version
- Run smoke test via curl against the deployed EF (with demo phone `0537889878`, never a real customer phone)
- Read DB rows via Supabase MCP `execute_sql` (Level 1) to verify smoke results
- Commit + push to ERP `develop`

### What REQUIRES stopping and reporting
- Any change to `supabase/functions/send-message/*` — out of scope for this SPEC
- Any change to `supabase/functions/lead-intake/dispatch.ts` — out of scope (dispatch logic itself stays unchanged; only the calling pattern changes)
- Any DB schema change
- Any other Edge Function deployment
- Any change to the frontend `lead-form-validation.ts` — out of scope; the frontend already handles a fast response correctly (no code changes needed there)
- Any merge to `main` — Daniel-only

---

## 5. Stop-on-Deviation Triggers

- If `lead-intake/index.ts:301` does NOT currently have `await dispatchFreshLead(...)` → STOP (file structure differs from pre-flight; don't change blindly)
- If `EdgeRuntime` global is not available in the deployed Deno runtime → STOP and report (Supabase Edge Functions DO support `EdgeRuntime.waitUntil()` per their docs, but verify on the live runtime)
- If smoke test (Criterion 8) shows the response is still >3 seconds → STOP, the change didn't have the intended effect, investigate before declaring success
- If smoke test shows the `crm_leads` row is NOT created → STOP and rollback immediately (worse failure mode than the original slow-but-working state)
- If smoke test shows the `crm_message_log` rows never transition from `pending` to `sent`/`failed` → log as finding but don't block close (the original retry-failed EF can recover this)

---

## 6. Rollback Plan

Trivial single-call change. Rollback:
- `git revert {COMMIT_HASH} && git push origin develop`
- Redeploy lead-intake via `supabase functions deploy lead-intake`
- Pre-revert state had a single `await dispatchFreshLead(...)` line at index.ts:301 — same place, just put `await` back

Zero DB rollback. Zero data risk: the lead INSERT is unchanged and remains synchronous.

---

## 7. Destructive Operations

**1. `supabase functions deploy lead-intake`** — overwrites the currently-deployed version of the `lead-intake` Edge Function on the production Supabase project. The previous version is retained as a historical version in Supabase; rollback is a redeploy of an older commit. Authorized 2026-05-14 in chat by Daniel ("כן" for option ג').

No other destructive operations. No SQL DDL. No DROP/DELETE/TRUNCATE. No file deletions. No force-push. No main-branch modifications.

---

## 8. Out of Scope

- The `send-message` EF — unchanged. Make-webhook latency is its inherent characteristic; this SPEC just stops the user from waiting on it.
- The frontend `lead-form-validation.ts` — already correctly handles a fast 201 response. No change needed.
- The Make scenarios themselves — unchanged.
- The `retry-failed` EF — already exists; not modified. A future SPEC could add a cron to auto-retry stuck pending rows, but that's separate.
- Adding test infrastructure for Edge Functions — out of scope. There are no existing tests for these EFs; adding the testing scaffold is a separate SPEC.
- Other forms that use `lead-intake` (e.g. `/quick-register/`, the homepage contact form) — they ALL benefit from this change automatically since the EF is shared. No per-form work needed.
- Observability / logging improvements — could add `console.time` for measurement, but out of scope here.
- The `/quick-register/` cookie-consent wiring — already correctly reverted; this SPEC doesn't touch it.

---

## 9. Expected Final State

### Modified files (ERP repo)
- `supabase/functions/lead-intake/index.ts` — line 301 changed:
  - Before:
    ```typescript
    await dispatchFreshLead(db, tenantId, inserted.id, name, phone, email);
    ```
  - After (approximate — executor finalizes the exact shape):
    ```typescript
    // Background dispatch — Make webhooks can take 5-15s. Don't make the
    // user wait for SMS+email; the lead is already persisted. Failure
    // here is recovered via crm_message_log pending-row retry (manual
    // for now; future cron in a follow-up SPEC).
    EdgeRuntime.waitUntil(
      dispatchFreshLead(db, tenantId, inserted.id, name, phone, email)
        .catch(err => console.error("[lead-intake] background dispatch failed", err))
    );
    ```

### New files
**Deliverable artifacts:** None.
**Protocol artifacts (created at SPEC close):**
- `modules/Module 4 - CRM/docs/specs/M4_LEAD_INTAKE_ASYNC_DISPATCH/EXECUTION_REPORT.md`
- `modules/Module 4 - CRM/docs/specs/M4_LEAD_INTAKE_ASYNC_DISPATCH/FINDINGS.md` (if any)

### Deleted files
None.

### DB state
No changes.

### Deployed state
- Supabase project `tsxrrxzmdxaenlvocyit`: `lead-intake` EF redeployed at new version (Supabase tracks deployed versions; rollback is a redeploy of the prior commit)

### Docs updated
- `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` — REC-SITE-024 added (closed) noting the fix
- `roles/site-overseer/DECISIONS_LOG.md` — closure entry under 2026-05-14
- This SPEC folder's `EXECUTION_REPORT.md` + `FINDINGS.md`

---

## 10. Commit Plan

**Single commit:**
- Files staged (explicit): `supabase/functions/lead-intake/index.ts` + `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` + `roles/site-overseer/DECISIONS_LOG.md` + this SPEC folder's `EXECUTION_REPORT.md` + `FINDINGS.md`
- Message:
  ```
  perf(lead-intake): dispatch SMS+email in background, return immediately

  Wrap dispatchFreshLead() in EdgeRuntime.waitUntil() so the user gets
  the form-submit response in 1-2s instead of 10-15s. The lead is still
  INSERT'd to crm_leads synchronously before the response — only the
  Make-webhook calls (SMS + email via send-message EF) run in the
  background. crm_message_log per-row state preserves the audit trail;
  retry-failed EF can recover any stuck pending row.

  Refs: REC-SITE-024, SPEC M4_LEAD_INTAKE_ASYNC_DISPATCH
  ```
- Deploy: `supabase functions deploy lead-intake --project-ref tsxrrxzmdxaenlvocyit`
- Push: `git push origin develop`. PR to main: open via `gh` if authenticated, else surface compare URL.

---

## 11. Dependencies / Preconditions

- ERP repo on `develop`, scope-clean
- `supabase` CLI installed + linked to project `tsxrrxzmdxaenlvocyit` (executor checks at Step 0)
- Demo tenant exists with PIN `12345` for smoke testing (verified — slug=`demo`)
- `gh` authentication checked at Step 0 per executor SKILL §4b
- Daniel-machine identified
- M3_SUPERSALE_MARKETING_CHECKBOX + M3_SUPERSALE_CHECKBOX_COMMA_FIX have closed (they have — commits on main + DB live)

---

## 12. Lessons Already Incorporated

- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Author Proposal 1 — explicit Destructive Operations. APPLIED in §7.
- M3_QUICK_REGISTER_MARKETING_PRETICK_REMOVAL/FOREMAN_REVIEW Author Proposal 2 — Protocol artifacts split. APPLIED in §9.
- L-PROJECT-002 (jsonb parse-then-modify) — not applicable; no jsonb writes.
- L-SITE-002 (supersale terminology) — applied; SPEC targets `/supersale/` correctly via the shared EF.

**Cross-Reference Check (Rule 21):**
- New symbols: NONE. `EdgeRuntime.waitUntil` is a Deno-runtime global, not a new project symbol.
- No new files, no new functions, no new DB objects.
- Sweep is trivially clean.

---

## 13. Why this is the right architectural choice

For Daniel's reference, the three options surfaced in conversation 2026-05-14:

- **(א)** Loading spinner only — pure cosmetic. User still waits 10-15s, just sees a spinner instead of a tense button. Doesn't solve the real problem.
- **(ב)** Fire-and-forget at the Make level — drop `await` on the Make webhook fetch inside `send-message`. Fast, simple, BUT loses the per-row `crm_message_log` state transition because we'd never know if Make succeeded. The audit trail breaks.
- **(ג)** Background dispatch at the lead-intake level via `EdgeRuntime.waitUntil()` — what this SPEC implements. The `send-message` EF still awaits its Make call internally, so the `crm_message_log` state transitions correctly. The user just doesn't wait for the chain. Audit trail preserved. SaaS-clean. Failure mode is "lead saved, messages possibly stuck pending" — recoverable.

(ג) was Daniel's choice with one-word "כן" 2026-05-14.

---

*End of SPEC.*
