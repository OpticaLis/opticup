# Phase 1 — Suppression List Design & Removal Map

> **Date:** 2026-05-22. **DIAGNOSE-ONLY pass. No changes made.**
> Brief: `M4_SUPPRESSION_LIST_BRIEF_2026_05_22.md`.

## Executive summary
**Design is clean and low-risk.** Existing `crm_unsubscribes` table is per-lead-keyed and empty (0 rows) — repurpose-or-replace decision needed (recommended: leave it alone as legacy, build new `crm_suppressions` keyed on email_norm + phone_norm). All 130 backfill candidates have email + phone in already-normalized form (all 130 emails lowercase, all 130 phones in E.164). 8 code sites total: 4 JS + 3 EF + 1 schema.

## 1. Backfill candidate inventory

| Tenant | unsub_leads | with_email | with_phone | phone E.164 (`+972…`) | email already lowercase |
|---|---|---|---|---|---|
| demo | 4 | 4 | 4 | 4 / 4 | 4 / 4 |
| prizma | 126 | 126 | 126 | 126 / 126 | 126 / 126 |
| **TOTAL** | **130** | **130** | **130** | **130** | **130** |

Backfill is trivial: every unsubscribed lead has both contact channels, and both are already in canonical form. No data cleanup needed before backfill.

## 2. Schema design — `crm_suppressions`

```sql
CREATE TABLE public.crm_suppressions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,  -- IR14
  email_norm   text,
  phone_norm   text,
  reason       text NOT NULL DEFAULT 'user_unsubscribed',
  source       text NOT NULL DEFAULT 'unsubscribe_ef',  -- unsubscribe_ef | in_app | backfill | admin
  source_lead_id  uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (email_norm IS NOT NULL OR phone_norm IS NOT NULL)
);

-- IR18 tenant-scoped UNIQUEs (partial — allow NULL on one channel)
CREATE UNIQUE INDEX crm_suppressions_tenant_email_uniq
  ON public.crm_suppressions (tenant_id, email_norm)
  WHERE email_norm IS NOT NULL;

CREATE UNIQUE INDEX crm_suppressions_tenant_phone_uniq
  ON public.crm_suppressions (tenant_id, phone_norm)
  WHERE phone_norm IS NOT NULL;

-- IR15 canonical RLS
ALTER TABLE public.crm_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON public.crm_suppressions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON public.crm_suppressions
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);

-- Performance: lookup by email or phone within tenant (covered by the partial unique indexes above).
```

**Why two partial UNIQUEs instead of one composite:**
- A contact may register once by email-only OR once by phone-only. A single composite UNIQUE on `(tenant_id, email_norm, phone_norm)` would require both fields populated to enforce uniqueness, defeating the purpose.
- Two partial UNIQUEs let us enforce "no duplicate emails per tenant" AND "no duplicate phones per tenant" independently. The CHECK ensures at least one channel is present.

**Iron Rule coverage:** R14 ✓ tenant_id NOT NULL FK. R15 ✓ canonical RLS two-policy. R18 ✓ both UNIQUEs include tenant_id. R22 ✓ defense-in-depth (the per-lead gate stays; suppression is an ADDITIONAL gate).

## 3. Normalization rules

### Email
```
email_norm = lower(trim(email))
```
- Already lowercase + trimmed in all 130 existing unsubscribed rows.
- No further normalization (e.g., Gmail-dot-stripping) — keep it simple, matches user intent.

### Phone
```
phone_norm = phone   -- when phone matches '^\+972[0-9]+$' (E.164 Israeli)
phone_norm = '+972' || substring(phone from 2)   -- when phone matches '^0[5-9][0-9]+$' (Israeli local)
phone_norm = NULL    -- when phone is malformed (skip suppression on phone, keep email-only)
```

**Canonical form decision: E.164** (`+972XXX`). Rationale:
- All current `crm_leads.phone` values are already in E.164 form per the live data sample.
- `lead-intake` EF normalizes incoming phones to E.164 at intake.
- Lookup query becomes a direct comparison: `WHERE phone_norm = lead.phone` — zero transformation overhead per send.
- The existing 5 `normalizePhone` functions in EFs (`dispatch-queue/index.ts:77`, `lead-intake/index.ts:62`, `whatsapp-catalog-flow/index.ts:47`, `send-message/allowlists.ts:21`, `fb-capi-dispatch/index.ts:49`) actually canonicalize to LOCAL `0XXX` for ALLOWLIST comparison — different use case, leave them alone. For suppression we use a DIFFERENT canonical (E.164) that matches the DB column directly.

**Recommendation:** add a `normalizePhoneE164` shared function in `supabase/functions/_shared/` (or inline in each EF that needs it — only 3 EFs need suppression: send-message, unsubscribe, automation-engine).

## 4. Write-points map — where unsubscribe HAPPENS today

| # | Site | What it does today | Phase 2 change |
|---|---|---|---|
| W1 | `supabase/functions/unsubscribe/index.ts:212-222` | UPDATE crm_leads SET unsubscribed_at + status='unsubscribed' WHERE id=leadId | **ADD: upsert email_norm + phone_norm into crm_suppressions with source='unsubscribe_ef' BEFORE the UPDATE returns.** |
| W2 | In-app status setter — operator manually changes lead.status to 'unsubscribed' | UPDATE crm_leads SET status='unsubscribed' (generic status setter in lead actions) | **ADD: DB trigger `trg_lead_status_unsubscribed` AFTER UPDATE OF status: when NEW.status='unsubscribed' and OLD.status != 'unsubscribed', upsert email+phone to suppression. Source='in_app_status_change'.** Cleanest because it catches ALL paths (manual setter, RPC, admin SQL). |
| W3 | Backfill (Phase 2 one-shot) | n/a | **INSERT into crm_suppressions** for the 130 existing rows with reason='backfill_pre_phase2', source='backfill'. |
| W4 | Bounce / spam-complaint hooks (future) | n/a | Out of scope for this SPEC. Stub source values reserved: 'bounce', 'spam_complaint'. |

## 5. Read-points map — where send-decision happens today

| # | Site | What it does today (per-lead only) | Phase 2 change |
|---|---|---|---|
| R1 | `supabase/functions/send-message/index.ts:141-153` | Checks supRow.unsubscribed_at + status='unsubscribed' for THIS lead only | **ADD: pre-check `crm_suppressions WHERE tenant_id AND (email_norm=$1 OR phone_norm=$2)`. If hit → status='rejected', error='contact_suppressed'.** Keep the existing per-lead gate (IR22). |
| R2 | `supabase/functions/automation-engine/recipients.ts` resolvers | `.is('unsubscribed_at', null).eq('is_deleted', false)` per-lead | **ADD: LEFT JOIN crm_suppressions ON (tenant_id matches AND (email_norm=lead.email OR phone_norm=lead.phone)) WHERE crm_suppressions.id IS NULL** — exclude any lead whose contact is in suppression. |
| R3 | `modules/crm/crm-automation-recipient-resolvers.js` (browser clone) | Same per-lead filter | **Same JOIN-and-filter.** |
| R4 | `modules/crm/crm-broadcast-filters.js:227` | `.eq('is_deleted', false).is('unsubscribed_at', null)` per-lead | **ADD: same suppression LEFT JOIN exclude.** Broadcast audience UI must reflect the truth. |
| R5 | (future) FB CAPI dispatch + WhatsApp catalog flow | per-lead checks | Out of scope for this SPEC unless Daniel wants them included. Recommend defer — these paths fire less often + have different consent semantics. |

## 6. Resubscribe button extension

### Current behavior (`modules/crm/crm-lead-actions.js:249-274`)
```js
async function resubscribeLead(lead) {
  await sb.from('crm_leads')
    .update({ unsubscribed_at: null })  // ONLY clears unsubscribed_at
    .eq('id', lead.id).eq('tenant_id', tenantId);
  // status='unsubscribed' is NOT reverted (the lead stays in the unsubscribed status bucket on the leads board)
}
```

### Required behavior (Phase 2)
```js
async function resubscribeLead(lead) {
  // 1. Confirm dialog explaining what re-enable means.
  // 2. RPC: crm_resubscribe_contact(tenant_id, lead_id) — server-side atomic:
  //    (a) UPDATE crm_leads SET unsubscribed_at=null, status=CASE WHEN status='unsubscribed' THEN 'waiting' ELSE status END
  //    (b) DELETE FROM crm_suppressions WHERE tenant_id AND (email_norm=l.email OR phone_norm=l.phone)
  //    (c) Returns {ok, suppression_rows_deleted, lead_status_after}
  // 3. ActivityLog write.
  // 4. Toast success.
}
```

**Important UX:** the button currently shows ONLY when `lead.unsubscribed_at` is non-null. If a contact's phone or email is in suppression but THIS lead row has no unsubscribed_at (e.g., a NEW lead row), the button won't appear. Phase 2 must also show the button when ANY of `lead.email` or `lead.phone` is in suppression. Recommend: pre-fetch suppression-membership for the lead detail panel (single query).

## 7. Backfill plan (single SQL on Phase 2)

```sql
INSERT INTO public.crm_suppressions (tenant_id, email_norm, phone_norm, reason, source, source_lead_id, created_at)
SELECT l.tenant_id,
       lower(trim(l.email))                            AS email_norm,
       l.phone                                          AS phone_norm,  -- already E.164
       'backfill_status_unsubscribed'                   AS reason,
       'backfill'                                       AS source,
       l.id                                             AS source_lead_id,
       COALESCE(l.unsubscribed_at, l.updated_at, now()) AS created_at
  FROM crm_leads l
 WHERE (l.status = 'unsubscribed' OR l.unsubscribed_at IS NOT NULL)
   AND l.email IS NOT NULL AND trim(l.email) != ''
   AND l.phone IS NOT NULL AND trim(l.phone) != ''
ON CONFLICT (tenant_id, email_norm) WHERE email_norm IS NOT NULL DO NOTHING;
-- Repeat with ON CONFLICT (tenant_id, phone_norm) where needed, OR
-- compose as INSERT ... ON CONFLICT DO NOTHING with a single row per (tenant, contact).
```

Pre-Phase-2 dry run expected: 130 rows inserted (4 demo + 126 prizma).

## 8. Existing `crm_unsubscribes` table — what to do

| Option | Effect | Pros | Cons |
|---|---|---|---|
| **A. Leave it (recommended)** | Empty table sits as legacy; new code uses `crm_suppressions` | Zero risk; no breaking change | Two tables with overlapping semantics |
| **B. DROP and replace** | Hard-drop `crm_unsubscribes`, create `crm_suppressions` | Single source of truth | Need IR32 destructive declaration; rollback awkward |
| **C. Rename to `crm_suppressions` + restructure** | Migrate column shape | Reuses existing name | Migration complexity for empty table is overkill |

**Recommendation: A (leave the empty `crm_unsubscribes` alone, build new `crm_suppressions`).** Lowest risk. Future Sprint 4 SPEC can drop `crm_unsubscribes` once we're sure nothing reads from it (Phase 1 search shows nothing in JS/EF references it for active writes).

## 9. Phase 2 commit plan

| Commit | Contents |
|---|---|
| 1 | SPEC.md + migration: CREATE TABLE + 2 unique indexes + 2 RLS policies + DB trigger `trg_lead_status_unsubscribed_to_suppression` + RPC `crm_resubscribe_contact(uuid, uuid)` |
| 2 | EF edits: send-message (R1 suppression pre-check), automation-engine/recipients.ts (R2 LEFT JOIN filter), unsubscribe (W1 upsert). EF redeploy. |
| 3 | JS edits: crm-broadcast-filters.js (R4 filter), crm-automation-recipient-resolvers.js (R3 filter — browser clone), crm-lead-actions.js (resubscribe RPC call), crm-leads-detail.js (button-show condition). |
| 4 | DML: backfill 130 rows (Daniel-authorized Prizma write for 126 rows). |
| 5 | 4 closing docs (EXECUTION_REPORT, FINDINGS, TEST_REPORT, FOREMAN_REVIEW) + IR34 Chrome MCP screenshot. |

## 10. Risks

1. **Cross-tenant phone collision** — different tenants may legitimately use the same phone number for different customers. The tenant-scoped UNIQUE handles this correctly: phone `+972502014462` can be suppressed for tenant A while being active for tenant B.
2. **Allowlist normalizers differ from suppression normalizer** — 5 existing `normalizePhone` functions canonicalize to LOCAL `0XXX`, but suppression uses E.164 `+972XXX`. This is intentional (different use cases — allowlist matches operator-typed test phones; suppression matches DB-stored E.164 phones). Document this explicitly.
3. **Operator-bypass risk** — if an operator manually changes a lead's email AFTER the contact opted out, the suppression check on the OLD email may still fire correctly (suppression is keyed on email_norm), but the new email won't be in suppression. This is INTENDED behavior — a tenant operator editing a contact's address is implicitly re-opting them in (matches existing per-lead semantics).
4. **Performance at scale** — at 100K leads + 130 suppressions, the LEFT JOIN suppression filter in recipient resolvers adds one indexed lookup per lead. Tenant-scoped index makes this O(log N). At 1M suppressions, may want a CTE that pre-builds a `tenant_id, email_norm, phone_norm` Bloom-like set; defer until counts justify it.

## 11. STOP gate for Daniel signoff

Phase 1 deliverable complete. Awaiting Daniel's decision on:

1. **Existing `crm_unsubscribes` table** — A leave / B drop / C rename? (recommendation: A)
2. **Approval to proceed to Phase 2.**
3. **Scope clarification:** include FB CAPI + WhatsApp catalog flow read-points in this SPEC, or defer to a follow-up? (recommendation: defer — different consent semantics)
4. **In-app status→unsubscribed handling:** DB trigger (W2 option, catches all paths including admin SQL) vs JS hook in the status setter (catches only UI path)? (recommendation: DB trigger — defense-in-depth)
5. **Backfill source field value:** `'backfill_pre_phase2_2026_05_22'` or just `'backfill'`? (recommendation: include date for audit clarity)

---
*End of Phase 1 findings.*
