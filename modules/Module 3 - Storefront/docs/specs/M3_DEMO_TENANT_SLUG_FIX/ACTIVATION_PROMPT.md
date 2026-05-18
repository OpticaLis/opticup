# ACTIVATION PROMPT — M3_DEMO_TENANT_SLUG_FIX

**For Daniel:** copy the block below into Claude Code on Windows desktop (`C:\Users\User\opticup`, branch `develop`). The Executor will run end-to-end under Bounded Autonomy. This is the 3rd (and final) SPEC in the demo-isolation chain — it closes the actual lead-routing leak that the prior 2 SPECs missed.

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_DEMO_TENANT_SLUG_FIX/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repo: opticalis/opticup (ERP). Branch: develop. Machine: Windows desktop.

CRITICAL CONTEXT — what the 2 prior SPECs failed to close:
Daniel filled the demo /supersale/ form at 13:10 UTC and the lead landed
in PRIZMA's crm_leads (verified read-only: tenant_id=6ad0781b-..., prizma
UUID). The 2 prior SPECs targeted the Make webhook layer (notification
side) but did NOT fix the actual routing layer: the rendered HTML's
inline JS submit handler ships data.tenant_slug='prizma' to the
lead-intake Edge Function, which INSERTs into crm_leads with prizma's
tenant_id directly. The Make webhook is a SECOND chain that runs AFTER
the INSERT — scrubbing it doesn't stop the leak.

THREE DELIVERABLES (all on demo tenant only — tenant_id=
  8d8cfa7e-ef58-49af-9702-a862d459cccb):
1. F-A — Fix tenant_slug routing on /supersale/ HE.
   UPDATE storefront_pages.blocks: tenant_slug=\"prizma\" → tenant_slug=\"demo\"
   Pattern (postgres E-string): E'tenant_slug=\\\\"prizma\\\\"'.
2. F-B — Scrub 3 additional Make webhooks discovered in demo pages:
   /multisale-brands-cat/, /premiummultisale/ (share webhook
   v8skbdwxt925tlhig7psdq4b3isw6efx), /מיופיה/, and /eventsunsubscribe/
   (share webhook tdeh8dmdgms371ve2pk8ewtevw6cseb7; the last uses a
   direct fetch('...') rather than webhook_url=... — handle separately
   per SPEC §6 Step 3b).
3. F-C — Document decision: leave 22 image-proxy paths with prizma UUID
   (no DB write — accepted per Daniel 2026-05-18).

AUTHORITIES (Bounded Autonomy):
- Level 2 SQL UPDATE on demo storefront_pages.blocks (5 rows total).
- Level 2 SQL DELETE on crm_leads WHERE full_name='SPECTEST_TENANT_SLUG_FIX'
  AND tenant_id=demo (cleanup of verification probe).
- EF call to lead-intake with test body for verification.
- Localhost storefront startup (scripts/start-local.ps1) IF curl Method A
  and Playwright Method B are both blocked.
- NO DDL. NO Vercel redeploy. NO main. NO branches.

PARALLEL SESSION COORDINATION:
Module 1 lens session running parallel — zero overlap with
storefront_pages. Still run pipeline-coordination.mjs claim +
check-collision before any write.

STOP TRIGGERS (per SPEC §10):
- Step 0 pre-flight count mismatch
- Step 2 affected_rows ≠ 1
- Step 3a affected_rows ≠ 2 OR Step 3a 2nd stmt ≠ 1
- Step 3b affected_rows ≠ 1
- Step 5a: any "expected 0" returns > 0
- Step 5b: rendered HTML still contains tenant_slug = 'prizma'
- **Step 5c LIVE FORM TEST: test lead lands in prizma — CRITICAL,
  Daniel directly, do NOT continue.**
- Any indication of prizma tenant write.

🔴 NON-NEGOTIABLE — this SPEC does NOT close 🟢 without a LIVE FORM SUBMIT
test passing. The 2 prior SPECs both closed 🟡 because they verified at
DB level only. This time the Executor MUST actually submit a test lead
to the demo /supersale/ form (via curl-to-lead-intake-EF, or Playwright,
or localhost — whichever works) and confirm the resulting crm_leads row
has tenant_id=8d8cfa7e-... (demo), NOT 6ad0781b-... (prizma). See SPEC
§6 Step 5c for exact body shape. Use phone +972503348349 (the secondary
demo allowed number — never +972537889878 which is Daniel's primary,
and never random numbers per feedback_test_phone_numbers).

ABSOLUTE RULES:
- Per feedback_no_polish_by_validation: if Step 5c live test fails, close
  🟡 PARTIAL with FINDINGS naming the failure. Do NOT silent-close 🟢.
- Per feedback_never_propose_wind_down: stop only on genuine blocker.
- Per Iron Rule 32: 4 declared ops only (3 UPDATEs on blocks + 1 DELETE
  on crm_leads). UPDATE on prizma tenant_id is FORBIDDEN.
- Daniel directive 2026-05-18: "תגיד לצוות שיעשו טסט בעצמם לפני שהם
  מסיימים שיוודאו שזה עובד" — this is what Step 5c codifies. Run it.

KEY LESSON FROM PRIOR 2 SPECS (in SPEC §13):
DB-level "no leak in column" is NOT sufficient. SaaS-isolation requires
end-to-end traversal. The 2 prior SPECs each missed this — don't repeat.

Begin Step 0 IMMEDIATELY. Run pre-flight, snapshot, the 3 UPDATEs,
DB-level verify, rendered-HTML verify, and the LIVE FORM SUBMIT test
in sequence without per-step confirmation. After live test passes,
cleanup probe row, commit, push, close 🟢 (or 🟡 with FINDINGS).

Final commit message starts:
  "fix(demo): tenant_slug routing + 3 additional webhooks scrubbed + live form-submit verified"
```

---

**Notes for Daniel:**

- **Estimated wall-clock time:** 25–40 minutes. The DB writes are 5 rows; the live form-submit + DB-confirmation + cleanup is what adds time.
- **Risk: LOW–MEDIUM.** The 3 UPDATEs are tightly scoped to specific (slug, lang) tuples. The DELETE is scoped to a unique full_name+tenant. The live test uses an allowed test phone number. Snapshots committed pre-write.
- **What you'll see when it's done:** demo `/supersale/` form submissions land in demo's `crm_leads` with `tenant_id=demo`. The same applies to `/multisale-brands-cat/`, `/premiummultisale/`, `/מיופיה/`, and `/eventsunsubscribe/` (4 additional pages now isolated). The Executor will quote the test lead's `tenant_id` verbatim in EXECUTION_REPORT — you can verify yourself by checking `crm_leads` after.
- **If Step 5c fails:** Executor closes 🟡 with FINDINGS naming exactly why. You'll know the leak is not yet closed and we'll need a 4th SPEC. But this should be the last one — the SPEC traces the exact stored bytes for both routing + webhook leaks, so the patterns are right this time.
- **About the localhost fallback:** if for any reason the live curl-to-EF probe is blocked (CSP / CORS / EF auth), the Executor will bring up localhost storefront via `scripts/start-local.ps1` and submit through the rendered form there. That's the localhost route you mentioned. The DB write happens in the same Supabase project either way, so the verification check works the same.
