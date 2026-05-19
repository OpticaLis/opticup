# Escalation — M4_FB_CAPI_PURCHASE_EVENTS — uuid-ossp schema resolution failure

**From:** opticup-localhost-tester (Pipeline phase 4)
**Date:** 2026-05-19T15:50:00Z
**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_PURCHASE_EVENTS/`
**HEAD at escalation:** `e4b32f3` (Reviewer audit closed 🟢)
**Trigger:** Demo E2E Test 1 (criterion 14) attempted; INSERT into `crm_event_attendees` failed with `ERROR: 42883: function public.uuid_ns_oid() does not exist`.

---

## Stuck at:

E2E Test 1 (SPEC §3 criterion 14). Single SQL was a plain `INSERT INTO crm_event_attendees (tenant_id, lead_id, event_id, status) VALUES (demo, allowlist-lead, demo-event, 'registered')`. The INSERT triggers `trg_capi_attendee_registered` → calls `capi_enqueue_complete_registration_fn()` → fails at the `public.uuid_generate_v5(public.uuid_ns_oid(), ...)` call. Transaction rolled back. No attendee row created. No queue row enqueued. Queue total still 33 (unchanged from Reviewer baseline). Demo lead_id used: `cb6b343e-e4cc-42b0-990a-91999111a03c` (allowlist phone `+972503348349` per memory `feedback_test_data_phones`).

This is a **trigger-semantics regression** that meets the SPEC §4 STOP trigger ("Demo E2E test 14/15/16 doesn't produce the expected queue rows — STOP, escalate") and SPEC §5 stop-trigger #6 ("Demo E2E shows wrong event_name in queue row" — the strict-superset case: not just wrong, but the queue row never even gets created because the trigger function aborts the parent INSERT).

**Severity:** P0. The triggers fire on every INSERT (and every UPDATE OF status / UPDATE OF purchase_amount) on `crm_event_attendees`. Since they fail with SQLSTATE 42883, ALL attendee writes — both new registrations and existing-record updates — currently FAIL on demo AND Prizma. This is a production-impacting regression. Operators on Prizma cannot register new attendees or mark existing attendees as attended/paid without hitting the same error.

## What I tried:

1. INSERT attempt → SQLSTATE 42883 `function public.uuid_ns_oid() does not exist`. (See §0 of TEST_REPORT.md for the verbatim error trace.)
2. Pre-confirm STOP conditions (per skill "What I Never Do" + SPEC §5):
   - Did NOT retry the INSERT.
   - Did NOT attempt a fix.
   - Did NOT modify any DB object.
   - Did NOT issue any further write to demo or Prizma.
3. Diagnostic probes (read-only) to locate the actual extension functions:
   ```sql
   SELECT n.nspname || '.' || p.proname AS fn,
          pg_get_function_identity_arguments(p.oid) AS args
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE p.proname IN ('uuid_ns_oid', 'uuid_generate_v5', 'uuid_generate_v4');
   ```
   Result:
   - `extensions.uuid_generate_v4()` exists
   - `extensions.uuid_generate_v5(namespace uuid, name text)` exists
   - `extensions.uuid_ns_oid()` exists
   - `public.uuid_*` — **none exist**.
4. Confirmed Prizma queue is still clean (D7 forward-only holds; the triggers can't fire successfully anywhere).
5. Confirmed demo queue is still clean (no Purchase/CompleteRegistration/EventAttended rows produced).

## Options I see:

**Option A — Schema-qualified rewrite (recommended).** Apply a `m4_capi_purchase_events_uuid_fix` reverse-and-redeploy migration that does `CREATE OR REPLACE FUNCTION` on all 3 trigger functions, replacing `public.uuid_generate_v5(public.uuid_ns_oid(), ...)` with `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)`. Triggers themselves don't need to be re-created. Cost: 1 migration, ~30 lines. Risk: trivial — same function-body pattern as the SPEC §3.5 verbatim text, only the schema prefix changes.

**Option B — Hardcoded OID namespace literal (the SPEC's own §4 bounded-handling fallback).** The SPEC anticipated this exact failure mode and proposed `uuid_generate_v5('6ba7b812-9dad-11d1-80b4-00c04fd430c8'::uuid, ...)` (URL namespace OID literal). The Executor did not apply it because the original SPEC §3.5 text used the function call. Cost: same as Option A — 1 migration with 3 `CREATE OR REPLACE FUNCTION` calls. The deterministic event_id derivation changes (different namespace UUID) BUT since no `Purchase`/`CompleteRegistration`/`EventAttended` rows have ever been successfully enqueued, the derivation has no consumer yet — switching namespace is safe pre-launch.

**Option C — Move the functions to the `extensions` schema search_path.** Update each trigger function's `SET search_path = public` → `SET search_path = public, extensions`. Cost: same as A — 3 `CREATE OR REPLACE FUNCTION` calls. Slightly less explicit than Option A but matches a common pattern from other M4 trigger functions (the SCE bus function may already do this — worth a probe before recommending).

**Option D — Reject + rollback the SPEC.** Apply the SPEC §9 rollback (drop the 3 functions + 3 triggers + restore old constraint). Cost: roughly equal to Option A, but loses all the work. Out of scope for an LH-Tester decision — must be a Foreman call.

## My recommendation:

**Option A** (schema-qualified `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)`). Reasoning:

1. The SPEC §0.5 baseline DID probe `pg_extension WHERE extname='uuid-ossp'` and saw v1.1 enabled — what the Foreman didn't catch is that on this Supabase instance extension functions live in the `extensions` schema, not `public`. (Supabase has moved most extensions to a dedicated `extensions` schema since 2023 — a SaaS-specific pattern that the SPEC's "uuid_generate_v5(uuid_ns_oid(), ...)" snippet from public Postgres docs missed.)
2. Option A preserves the SPEC's D-AUTH-4 semantic intent (deterministic event_id derivation from `(lead_id, event_name)` via the OID namespace).
3. Schema-qualifying is the lowest-blast-radius fix: 3 functions touched, 0 triggers touched, 0 schema changes, 0 data changes.
4. No new destructive op declared by Option A — purely additive `CREATE OR REPLACE` calls.
5. Option B's namespace UUID literal would also work, but switching from OID namespace to a hardcoded literal is a semantic drift that's not currently justified.
6. Option C is fragile: search_path resolution in `SECURITY DEFINER` functions has bitten the project before (compare to the `pin-auth` EF pattern) — explicit schema qualification is the project's preferred convention.

**Foreman-side scope of this fix:** authoring a tight follow-up SPEC (call it `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX`) with §3.5 trigger function bodies re-prescribed as `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)`. Single C2 commit. Single migration. No EF change. No docs change (unless §0.5 baseline gets a footnote about Supabase-specific extension schema). Executor + Reviewer + LH-Tester re-run on the patched migration; LH-Tester resumes E2E Tests 1–6 with the fixed triggers.

## Question for Architect:

1. Confirm **Option A** is the desired fix path? (vs Option B / C / D.)
2. Should the fix be authored as a **net-new SPEC** (`M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX`) that runs the full Pipeline again, or should it be a **patch commit** appended to this SPEC's range (C5 on the existing SPEC folder)? Project convention favors net-new SPECs for any DB migration, but a 1-line-per-function patch is arguably tightly enough scoped that "C5 in this same SPEC folder" is defensible. Foreman call.
3. **Should this SPEC's overall status stay 🟢 (Reviewer approved) with a known pending hotfix, or be flipped to 🔴 pending the UUID fix?** My LH-Tester verdict is mandatorily 🔴 / RED because the deferred E2E criteria (14–19) cannot be exercised against the current code — but the Reviewer's static-evidence 🟢 stands. The Foreman owns the merged verdict.

**Until Daniel/Foreman resolves Q1+Q2+Q3, I am NOT writing further Supabase queries. TEST_REPORT.md will close as RED with the smoke 7/7 PASS captured + this escalation linked + the E2E tests marked BLOCKED / NOT RUN.**

---

*End of escalation.*
