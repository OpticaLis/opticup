# FINDINGS — P3C_P4_MESSAGING_PIPELINE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `SUPABASE_ANON_KEY` env var in Edge Functions returns the new `sb_publishable_*` key format

- **Code:** `M4-INFRA-01`
- **Severity:** MEDIUM
- **Discovered during:** §3 Criterion 11 verification (lead-intake → send-message dispatch returning 0 log rows)
- **Location:** Supabase Edge Runtime env layer (cross-cutting across all
  Edge Functions in this project). First observed at
  `supabase/functions/lead-intake/index.ts` line 17 during
  P3c+P4 execution.
- **Description:** Inside a Supabase Edge Function,
  `Deno.env.get("SUPABASE_ANON_KEY")` now returns the newer
  `sb_publishable_QFh28cyhVb5GQ1NM-Lgpgw_OADyeiQW` key, not the legacy
  JWT anon key that's checked into `js/shared.js`. When an Edge Function
  uses that env value as a `Bearer` token to call another Edge Function
  with `verify_jwt: true`, the gateway rejects the request with 401
  before the function runs — because the gateway's `verify_jwt`
  implementation only accepts JWT-format tokens. The observable effect
  in this SPEC was that lead-intake appeared to succeed but silently
  failed to dispatch any messages. We worked around it by hardcoding
  the legacy JWT anon key inside `lead-intake/index.ts` (same value
  that's already in `js/shared.js`).
- **Reproduction:**
  ```
  # From inside an Edge Function:
  const k = Deno.env.get("SUPABASE_ANON_KEY"); // returns "sb_publishable_..."
  fetch(`${SUPABASE_URL}/functions/v1/some-function`, {
    headers: { Authorization: `Bearer ${k}`, apikey: k },
  });
  // → HTTP 401 from the gateway, downstream function never runs.
  ```
- **Expected vs Actual:**
  - Expected: `SUPABASE_ANON_KEY` returns a JWT-format key that passes
    `verify_jwt` on the gateway, so cross-function calls work
    out-of-the-box.
  - Actual: Returns the new publishable-key format, gateway rejects
    with 401.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** The workaround (hardcoded JWT anon key in
  the one place that does cross-EF calls) is stable and documented. A
  proper fix is a future cleanup SPEC that either (a) adds an explicit
  `LEGACY_ANON_KEY` Supabase secret referenced consistently, or
  (b) migrates all code paths to the new publishable-key system once
  Supabase makes it compatible with `verify_jwt`. Neither needs to
  block P5+. File a Supabase support ticket for visibility.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Rule 23 soft deviation: legacy JWT anon key hardcoded in `lead-intake/index.ts`

- **Code:** `M4-R23-01`
- **Severity:** LOW
- **Discovered during:** Commit 4 (`fix(crm): use legacy JWT anon key for cross-EF send-message call`)
- **Location:** `supabase/functions/lead-intake/index.ts` lines 17–25
- **Description:** To unblock the cross-EF dispatch (Finding 1), the
  legacy JWT anon key is hardcoded as a `const ANON_KEY =
  "eyJ…"` constant in the Edge Function source. Rule 23 says "No
  secrets in code or docs — passwords, API keys, PINs, tokens live in
  env files, Supabase secrets, or tenant config. Never in `.js`,
  `.md`, or git history." The hardcoded value is identical to the one
  already present in `js/shared.js` (also git-tracked), so the
  exposure surface did not increase, but strictly speaking this
  violates the letter of Rule 23.
- **Reproduction:**
  ```
  grep -n 'eyJhbGciOi' supabase/functions/lead-intake/index.ts js/shared.js
  # shared.js line 3, lead-intake/index.ts line 25
  ```
- **Expected vs Actual:**
  - Expected (per Rule 23): Token read from env or Supabase secret.
  - Actual: Hardcoded constant, with a block comment explaining why.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** The cleanest long-term fix is paired with
  Finding 1's resolution — either a `LEGACY_ANON_KEY` Supabase secret
  or a full migration to the new key format. Trying to fix this in
  isolation (e.g. introducing a one-off secret just for this one
  constant) would be churn without underlying cleanup.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — `lead-intake/index.ts` exceeds 300-line soft target (342 lines)

- **Code:** `M4-DEBT-04`
- **Severity:** LOW
- **Discovered during:** pre-commit hook warning on commits 3 + 4
- **Location:** `supabase/functions/lead-intake/index.ts` (342 lines
  after commit 4)
- **Description:** The file gained 101 lines (from 241 to 342) during
  P3c+P4 execution — roughly half from the `dispatchIntakeMessages`
  helper and its `callSendMessage` inner call, and half from the
  `ANON_KEY` constant and its explanatory block comment. The pre-commit
  hook emits a WARN for files over the 300-line soft target; the
  350-line hard ceiling is still 8 lines away.
- **Reproduction:**
  ```
  wc -l supabase/functions/lead-intake/index.ts → 342
  ```
- **Expected vs Actual:**
  - Expected: ≤ 300 lines (Rule 12 soft target).
  - Actual: 342 lines, still under 350 hard max. Pre-commit hook
    emits `[file-size] WARN`.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Splitting `dispatchIntakeMessages` into
  a shared `functions/_shared/send-message-client.ts` module is the
  right fix, but "shared" folders in Supabase Edge Functions require
  extra wiring (import maps, deployment config). Worth doing when a
  second Edge Function needs the same dispatch helper — i.e., around
  P5 when event-status triggers start calling `send-message` too.
  Doing it now would be premature abstraction.
- **Foreman override (filled by Foreman in review):** { }
