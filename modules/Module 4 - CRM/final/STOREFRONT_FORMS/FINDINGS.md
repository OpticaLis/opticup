# FINDINGS — STOREFRONT_FORMS (Part A)

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — M4-DEBT-FINAL-01 is now cross-EF triplicated

- **Code:** `M4-DEBT-FINAL-01` (pre-existing, re-opened by this SPEC)
- **Severity:** MEDIUM
- **Discovered during:** Track A implementation — duplicating HMAC helpers into event-register as ACTIVATION_PROMPT explicitly authorized
- **Location:**
  - `supabase/functions/unsubscribe/index.ts:29-87` — `b64urlDecode`, `hmacSha256`, `timingSafeEqual`, `verifyToken`
  - `supabase/functions/send-message/index.ts:75-107` — `b64urlEncode`, `signToken`, `buildUnsubscribeUrl`, `buildRegistrationUrl`
  - `supabase/functions/event-register/index.ts:45-80` — `verifyRegistrationToken` (inlines b64url decode + HMAC check)
- **Description:** The HMAC-SHA256 token machinery is now independently implemented in three EFs. Each implementation is locally correct and produces identical outputs for identical inputs, but Rule 21 (No Duplicates) flags this as a maintenance hazard: a future change to the HMAC algorithm, the payload separator, the TTL, or the base64url encoding must be applied in three places. A sign/verify pair that drifts would silently stop accepting tokens without any compile-time signal. The ACTIVATION_PROMPT acknowledged this as "acceptable for now" under the SPEC §7 constraint that this SPEC may not create new files. The debt, previously held to two EFs (unsubscribe + send-message), is now in three.
- **Reproduction:**
  ```
  $ grep -l "crypto.subtle.sign\|crypto.subtle.importKey" supabase/functions/*/index.ts
  supabase/functions/event-register/index.ts
  supabase/functions/send-message/index.ts
  supabase/functions/unsubscribe/index.ts
  ```
- **Expected vs Actual:**
  - Expected: one shared module at `supabase/functions/_shared/hmac-token.ts` exporting `signToken`, `verifyToken`, and URL builders. Each EF imports.
  - Actual: three independent copies, each complete enough to not import from the others.
- **Suggested next action:** `NEW_SPEC`
- **Rationale for action:** This requires creating `_shared/hmac-token.ts` and refactoring three EFs to import from it — structurally non-trivial because Supabase EF deployment and Deno import resolution need to be exercised together, and a bug in the shared module would affect all three EFs. A focused SPEC lets the executor test sign/verify pairs end-to-end after the extraction. A dedicated SPEC also gives room to consider whether `signToken`/`verifyToken` should be generalized over payload shape (2, 3, 4 fields) instead of keeping distinct per-use helpers.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — STOREFRONT_ORIGIN hardcoded; SaaS cutover blocker

- **Code:** `M4-DEBT-FINAL-02` (new; paired with Finding 1 in theme)
- **Severity:** LOW (today) / HIGH (when second tenant joins)
- **Discovered during:** Track C implementation — adding `const STOREFRONT_ORIGIN = "https://prizma-optic.co.il"` to send-message EF
- **Location:** `supabase/functions/send-message/index.ts:75`
- **Description:** The storefront origin used to build `%unsubscribe_url%` and `%registration_url%` is a single-tenant literal. SPEC §12 explicitly scopes the debt: "Future SaaS-ification: the domain should come from a `tenants.storefront_domain` column (doesn't exist yet — out of scope). For now, hardcoded is acceptable because only Prizma is live." This is correct short-term pragmatism, but it's the kind of debt that silently outlasts its cover story — today Prizma is the only tenant, but the moment a second tenant onboards, every outbound email/SMS from send-message will point the new tenant's recipients at `prizma-optic.co.il`. This is not merely wrong-branding: unsubscribe clicks from Tenant B would hit Tenant A's storefront, which is a cross-tenant data exposure vector (depending on how the storefront handles unknown tokens).
- **Reproduction:** not reproducible today (single-tenant); trivially reproducible after a second tenant row is inserted into `tenants`.
- **Expected vs Actual:**
  - Expected: `SELECT storefront_domain FROM tenants WHERE id = $1` → use that, with a fallback to a project-level default.
  - Actual: single literal for all tenants.
- **Suggested next action:** `TECH_DEBT` (entry in Module 4 debt log) → convert to `NEW_SPEC` the moment tenant #2 onboarding is scheduled.
- **Rationale for action:** No action required while Prizma is alone. The debt must be tracked so it surfaces in the second-tenant pre-flight, not discovered after the first mis-routed email.
- **Foreman override (filled by Foreman in review):** { }

---

## Note on a third issue, handled in-scope

A third pre-existing latent bug surfaced during Track C but was **fixed within
this SPEC** rather than logged here: the `send-message` EF's
`if (typeof variables.unsubscribe_url !== "string")` check was unconditionally
skipping injection whenever the client passed a string value — including the
`'[קישור הסרה — יצורף אוטומטית]'` preview placeholder that
`crm-automation-engine.js buildVariables` always sets. The placeholder was
therefore reaching recipients verbatim in any message dispatched through
`CrmAutomation.evaluate` + fallback `dispatchPlanDirect`. I replaced the check
with a `isPlaceholder` helper (`typeof v === "string" && v.startsWith("[")`)
that applies to both `unsubscribe_url` and the new `registration_url` injection.

This was mild scope expansion (acknowledged in EXECUTION_REPORT.md §4 row 2).
Rationale for fixing rather than logging: once the SPEC asked me to add
`registration_url` injection using "the same pattern as unsubscribe_url", a
broken pattern would have propagated. The Foreman may reverse this decision
and roll back the `isPlaceholder` branch; in that case the unsubscribe_url
leak becomes a finding of its own and the main dispatch path should be audited
for real-world impact before any rollback.
