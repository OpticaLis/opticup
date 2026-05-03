# SPEC — C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL

> **Author:** Campaign Overseer (Cowork session) acting as SPEC drafter; Foreman review pending.
> **Date:** 2026-05-03 morning
> **Status:** DRAFT — Foreman to review + write activation prompt.
> **Pre-cutover priority:** CRITICAL — surfaced as finding **C-001** in QA night-run report 2026-05-03. The hardcoded 3-phone allowlist in `send-message` EF will silently drop every real customer SMS the moment cutover happens. This is the smallest, safest cutover-blocker fix.
> **Cutover-blocker?** YES.

---

## 1. Why this SPEC exists

The `send-message` Edge Function (the function every dispatch path calls when a real SMS or email needs to go out) has a **hardcoded 3-phone allowlist** baked into its source:

```ts
const ALLOWED_PHONES = ["0537889878", "0503348349", "0507168471"];
function phoneAllowed(phone: string | null): boolean {
  if (!phone) return true;
  const n = normalizePhone(phone);
  return ALLOWED_PHONES.some(a => normalizePhone(a) === n);
}
```

(See `supabase/functions/send-message/index.ts:38-45`.)

When a phone is NOT in this list, the EF writes a `crm_message_log` row with `status='rejected'` and `error_message='phone_not_allowed: ...'` — and returns **HTTP 200** with `{ ok: false, error: 'phone_not_allowed' }`.

This guardrail was added during the overnight scale-test phase (the comment block calls it "OVERNIGHT_M4_SCALE_AND_UI Phase 1 — 3-layer phone allowlist (layer 1 of 3)"). It exists *deliberately* to prevent runaway blasts during testing from sending real SMS to strangers.

**The exact comment in the source already calls out the cutover requirement:**

> "Remove after P7 cutover and replace with a tenant-level test_mode flag."

**Concrete operational risk if not removed before cutover:**

The moment Sunday morning's cutover flips and real Prizma customer leads start flowing into the new pipeline, every SMS to any customer whose phone is NOT one of the three test numbers will be silently rejected. From the customer's perspective: zero SMS arrives. From operations' perspective: `crm_message_log` fills with `status='rejected'` rows that look like delivery failures (not user-visible "we have a guardrail" rows).

This is the highest-blast-radius pre-cutover finding in the QA night-run report.

---

## 2. Goal

Replace the hardcoded 3-phone allowlist with a **tenant-level test_mode** that, when enabled, restricts SMS to a tenant-configurable allowlist; when disabled (default for production tenants), lets all SMS through.

---

## 3. What exists today

### 3.1 The hardcoded allowlist

`supabase/functions/send-message/index.ts:38-45` — verified live (EF version 17 as of 2026-05-03).

The check fires in `index.ts` after recipient resolution, around line 270:
```ts
if (channel === "sms" && !phoneAllowed(recipientPhone)) {
  await db.from("crm_message_log").insert({...status: "rejected"...});
  return jsonResponse({ ok: false, error: "phone_not_allowed" }, 200);
}
```

### 3.2 The other two layers it claims to be part of

The comment claims this is "layer 1 of 3":
- **Layer 1:** this hardcoded allowlist in `send-message` (subject of this SPEC).
- **Layer 2:** the queue gate in `dispatch-queue` EF (presumably mirrors the same allowlist).
- **Layer 3:** the CRM UI guard.

Pre-flight verification REQUIRED: confirm whether layers 2 and 3 actually exist in code, and whether they have the same hardcoded allowlist that needs the same removal.

### 3.3 The tenant-config columns that already exist

`tenants` table currently has these JSONB columns:
- `config` — generic tenant config (verify what's in it).
- `payment_links` — JSONB for `%payment_url_*%` resolution (Pattern P12).
- `ui_config` — UI defaults (used for `default_waze_url` per PRE_CUTOVER_QA_A B7).

**No `test_mode` field exists today** at the tenant level. This SPEC adds one.

---

## 4. Iron Rule check

| Rule | Applies | Notes |
|---|---|---|
| 9 (no hardcoded business values) | YES — this rule is the entire reason | hardcoded phones must move to config |
| 14/15 (tenant_id + RLS) | YES | the new flag lives on `tenants` (tenant-scoped by definition) |
| 20 (SaaS litmus) | YES | a second tenant joining must have its OWN allowlist control, not inherit Prizma's three numbers |
| 21 (No orphans/duplicates) | YES | if layers 2+3 exist with the same hardcoded list, they must be removed in the same SPEC, not left as orphans |
| 22 (defense-in-depth) | YES | the new EF check passes tenant_id explicitly when reading the test_mode flag |
| 31 (integrity gate) | YES | `verify:integrity` exit 0 |

---

## 5. Proposed shape

### 5.1 Schema addition

Add a single column to `tenants`:
```sql
ALTER TABLE tenants
  ADD COLUMN test_mode_sms_allowlist JSONB NULL;

COMMENT ON COLUMN tenants.test_mode_sms_allowlist IS
'When NULL: SMS to any phone is allowed (production mode).
When NOT NULL: must be a JSONB array of E.164 phone strings — only those phones receive SMS, all others are rejected with phone_not_allowed (test mode).
Set during pre-cutover QA windows, set to NULL when going live.
Replaces the hardcoded ALLOWED_PHONES constant in send-message EF (commit 2026-05-03).';
```

Settings for the cutover transition:
- **Pre-cutover (now):** `prizma.test_mode_sms_allowlist = ["+972537889878", "+972503348349", "+972507168471"]` — preserves current behavior exactly.
- **At cutover (Sunday morning):** Daniel sets `prizma.test_mode_sms_allowlist = NULL` as part of the cutover-day operational checklist. From that moment, real customers receive SMS.

### 5.2 send-message EF refactor

Replace the hardcoded constant with a tenant lookup:

```ts
// Phone allowlist — when tenants.test_mode_sms_allowlist is set, only those
// E.164 phones receive SMS. NULL = production mode (all phones allowed).
async function phoneAllowed(db: any, tenantId: string, phone: string | null): Promise<boolean> {
  if (!phone) return true;
  const { data: tenant, error } = await db
    .from("tenants")
    .select("test_mode_sms_allowlist")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) {
    console.warn("phoneAllowed: tenant lookup failed; failing CLOSED for safety", error);
    return false;
  }
  const allowlist = tenant?.test_mode_sms_allowlist;
  if (allowlist == null) return true;  // production mode
  if (!Array.isArray(allowlist)) {
    console.warn("phoneAllowed: malformed allowlist on tenant", tenantId);
    return false;
  }
  const normalized = normalizePhone(phone);
  return allowlist.some((a: unknown) =>
    typeof a === "string" && normalizePhone(a) === normalized
  );
}
```

Key change in behavior:
- **Fail-closed on lookup error.** If the tenant lookup fails (DB hiccup, bad tenant_id), the SMS is rejected. This is more conservative than today's hardcoded path, but the right default — never accidentally blast.
- **Fail-closed on malformed JSON.** Same reasoning.
- **NULL = wide open.** This is the production state.

### 5.3 dispatch-queue EF (layer 2) — verify and refactor in parallel

Pre-flight: read `supabase/functions/dispatch-queue/index.ts` and check for the same allowlist. If present, refactor identically to read from `tenants.test_mode_sms_allowlist`.

If absent, document in FINDINGS.md that "layer 2" referenced in the comment doesn't exist in code — the comment is misleading.

### 5.4 CRM UI guard (layer 3) — verify and refactor in parallel

Pre-flight: grep `modules/crm/` for any phone allowlist constant. The guard is likely in a messaging helper file. If found, refactor to read from `tenants.test_mode_sms_allowlist` via the same pattern.

If absent, document.

### 5.5 Cutover-day flip mechanism

Daniel's cutover-day operational checklist will include:
```sql
-- Production-mode flip for prizma at cutover:
UPDATE tenants
SET test_mode_sms_allowlist = NULL
WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
```

This is a single-row UPDATE, fast, reversible. Documented in the cutover sequence section of HANDOFF.md.

---

## 6. Success criteria

1. Column `tenants.test_mode_sms_allowlist` exists with the canonical comment.
2. Prizma's row pre-populated with the existing 3-phone array as JSONB. Demo's row pre-populated with same.
3. `send-message` EF: hardcoded `ALLOWED_PHONES` constant removed. `phoneAllowed` is now async and accepts `(db, tenantId, phone)`.
4. `[functions.send-message]` block already exists in config.toml (verified in M4_AUTOMATION_ENGINE_SERVER_SIDE Foreman review). No change needed there.
5. Curl test on prizma BEFORE cutover-day flip:
   - Test A: `+972537889878` → 200 + `ok:true`. SMS delivered.
   - Test B: `+15551234567` (random foreign phone) → 200 + `ok:false, error:phone_not_allowed`. NO SMS.
6. Curl test on prizma AFTER cutover-day flip (test on Sunday morning, document in cutover-day report):
   - Test A: any phone → 200 + `ok:true`. SMS delivered.
7. Layers 2+3 audit complete. Either refactored same-commit (Option A) or documented as "non-existent" (Option B) in FINDINGS.md.
8. `verify:integrity` exit 0.
9. Pre-commit hooks pass.

---

## 7. Autonomy envelope

- Schema add + EF refactor + tenant pre-population: execute autonomously after Foreman approval. Reversible (DROP COLUMN + revert EF).
- The Sunday-morning flip itself: Daniel executes manually. Not part of this SPEC's execution scope.

---

## 8. Stop triggers

- `tenants.test_mode_sms_allowlist` already exists at pre-flight (someone added it in another SPEC) → STOP, reconcile.
- `send-message` EF source structure differs materially from above (e.g., the allowlist has been moved or renamed) → STOP, report.
- Curl test B (foreign phone) returns 200 + `ok:true` BEFORE the cutover flip → CRITICAL, the guardrail is broken, do NOT proceed.

---

## 9. Rollback

- Drop the column: `ALTER TABLE tenants DROP COLUMN test_mode_sms_allowlist`.
- Revert the EF to version 17 via redeploy from a saved copy of the pre-change source (capture in EXECUTION_REPORT.md).

---

## 10. Out of scope

- Email allowlist. The QA night-run flagged "no email allowlist" as a separate MEDIUM finding — that's a different SPEC for post-cutover.
- Per-template channel restrictions (e.g., "this template never sends to non-Israeli phones"). Out of scope.
- Replacing the cutover-day flip with a graceful storefront banner. Out of scope.

---

## 11. Pre-flight checks

1. Read `supabase/functions/send-message/index.ts` end-to-end. Confirm line numbers + structure match SPEC §3.1.
2. Read `supabase/functions/dispatch-queue/index.ts` and grep for `ALLOWED_PHONES` or `phoneAllowed` or any hardcoded phone array. Document presence/absence.
3. Grep `modules/crm/` for the same. Document.
4. Confirm `tenants.test_mode_sms_allowlist` column does NOT exist:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='tenants' AND column_name='test_mode_sms_allowlist';
   ```
   Expected: 0 rows.
5. Confirm `tenants` table has `id`, `name`, `slug`, plus the JSONB columns mentioned in §3.3.

---

## 12. Foreman handoff

Suggested 1-Rung structure (whole SPEC ships in one commit):

- **Rung 1 (cutover blocker):** Schema add + EF refactor + tenant pre-population + (if applicable) layers 2 + 3 refactor. Curl-test verification on prizma. Atomic ship.

If layers 2 + 3 are larger than expected (e.g., layer 3 touches multiple CRM UI files), Foreman may split into:
- **Rung 1A:** schema + send-message EF (layer 1).
- **Rung 1B:** dispatch-queue + CRM UI (layers 2+3) — same day, same SPEC.

But default = single Rung. The blast radius is small and the change is well-bounded.

---

## 13. Lessons from prior SPECs

- M4_AUTOMATION_ENGINE_SERVER_SIDE Foreman review caught a citation error in the SPEC frontmatter. This SPEC's frontmatter cites C-001 directly from the QA night-run REPORT.md — Foreman should verify.
- M4_LEAD_EYE_EXAM_DEFAULT discovered mid-execution that the data path went through a view, not a direct table. This SPEC's data path is direct (EF reads `tenants` row directly via service-role) — no view layer. Confirmed via the existing event-variables.ts pattern that already reads `tenants` directly.
- send-message EF is well-tested ground (version 17, 6 files, established patterns). Lower architectural risk than the engine SPEC.

---

*End of SPEC.*
