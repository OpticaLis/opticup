# SPEC — M4_SUPPRESSION_LIST

> **Authored:** 2026-05-22 — Phase 2 (post-signoff).
> **Phase 1 findings:** `modules/Module 4 - CRM/architecture-brief/M4_SUPPRESSION_LIST_PHASE_1_FINDINGS_2026_05_22.md`.

## 0. Goal
Build tenant-scoped contact-level (email + phone) suppression so unsubscribe survives lead identity. Per-lead `unsubscribed_at` gate KEPT (defense-in-depth IR22). Fold-ins:
- DISPLAY FIX: treat lead as unsubscribed if `status='unsubscribed' OR unsubscribed_at IS NOT NULL` (resubscribe button + שיווק row).
- DATA NORMALIZATION: fix 52 demo+prizma rows with status='unsubscribed' AND unsubscribed_at IS NULL + 5 with the reverse. All future writes set BOTH fields together.
- BACKFILL: 130 truly-unsubscribed contacts (4 demo + 126 prizma) → `crm_suppressions`.

## 1. Acceptance bar
- `crm_suppressions` table live with full canonical (R14/R15/R18/R22).
- DB trigger fires on `crm_leads.status` → 'unsubscribed' (any path).
- RPC `crm_resubscribe_contact(tenant, lead_id)` atomically clears suppression + reverts lead state.
- send-message blocks both an existing suppressed lead AND a brand-new lead with suppressed email/phone (Chrome MCP IR34).
- Resubscribe button removes both rows (email + phone) from suppression + reverts lead status (IR34).
- 130 rows backfilled (4 demo + 126 prizma). 0 cross-tenant collisions.
- 57 normalization rows (52+5) cleaned up.
- Lead-side `unsubscribed_at` still set on every existing path (IR22 belt+suspenders).

## 2. FB CAPI exposure note (per Daniel's Decision 3 gating question)
- **fb-capi-dispatch EF (`supabase/functions/fb-capi-dispatch/index.ts`) DOES leak today.** It sends Lead / CompleteRegistration / EventAttended / Purchase events to Meta with hashed PII. The EF does NOT check `crm_leads.unsubscribed_at` or `marketing_consent` — only filters by `tenant_id` (IR22 comment line 9). A suppressed contact's email+phone hash still goes to Meta.
- **whatsapp-catalog-flow EF: NOT a hole** — it's a tracking endpoint that sets `crm_leads.catalog_sent_at`. The actual WhatsApp message is sent by the operator manually outside the system; this EF only records the marker.
- **Recommendation:** track `M4_FB_CAPI_SUPPRESSION_GATE` as the immediate next SPEC after this one. The hole is small in volume (FB CAPI fires only on conversion events, not bulk), but it IS a GDPR/Israeli Privacy concern. Daniel should decide if to fast-follow.

## Destructive Operations
1. DDL: `CREATE TABLE crm_suppressions` + 2 partial UNIQUE indexes + RLS enable + 2 policies (additive).
2. DDL: `CREATE FUNCTION trg_lead_status_unsubscribed_to_suppression` + trigger on `crm_leads` AFTER UPDATE OF status (additive).
3. DDL: `CREATE FUNCTION crm_resubscribe_contact(uuid, uuid)` (additive).
4. DDL: `CREATE FUNCTION crm_check_contact_suppressed(uuid, text, text)` (additive lookup helper).
5. DML normalization: `UPDATE crm_leads` setting `unsubscribed_at=now()` on 52 prizma rows where status='unsubscribed' AND date NULL; setting `status='unsubscribed'` on 5 prizma rows where date NOT NULL AND status differs. Daniel-authorized Prizma writes.
6. DML backfill: `INSERT INTO crm_suppressions` ~130 rows. Daniel-authorized Prizma writes (126 rows).
7. EF code updates + redeploy (send-message, automation-engine, unsubscribe).
8. NO Prizma destructive ops beyond #5+#6.
9. NO touch on `M4_DANIEL_MANUAL_TEST_2026_05_21` 10K leads OR `M4_100K_VERIFY_2026_05_22` 90K leads.

## 4. Files modified
| Type | File | Change |
|---|---|---|
| Migration | `supabase/migrations/20260522060000_m4_crm_suppressions.sql` | table + indexes + RLS + trigger + 2 RPCs |
| EF | `supabase/functions/send-message/index.ts` | suppression pre-check before existing per-lead gate |
| EF | `supabase/functions/automation-engine/recipients.ts` | LEFT JOIN suppression filter in tier2 + cross-event resolvers |
| EF | `supabase/functions/unsubscribe/index.ts` | upsert email+phone to suppression after UPDATE |
| JS | `modules/crm/crm-broadcast-filters.js` | broadcast audience exclude suppressed |
| JS | `modules/crm/crm-automation-recipient-resolvers.js` | browser clone of recipients.ts filter |
| JS | `modules/crm/crm-leads-detail.js` | display fix: button shows when `status='unsubscribed' OR unsubscribed_at IS NOT NULL` |
| JS | `modules/crm/crm-lead-actions.js` | resubscribe calls new RPC instead of bare UPDATE |

## 5. Verification (IR34 Chrome MCP)
1. SQL truth: 0 active leads `WHERE (status='unsubscribed' AND unsubscribed_at IS NULL) OR (unsubscribed_at IS NOT NULL AND status NOT IN ('unsubscribed'))` post-normalization (was 57; expect 0).
2. SQL truth: 130 rows in `crm_suppressions` (4 demo + 126 prizma).
3. **Live smoke 1:** curl send-message for an EXISTING suppressed lead (one of the 130) → expect `status='rejected', error_message='contact_suppressed'` in `crm_message_log`.
4. **Live smoke 2:** create a BRAND-NEW lead with email matching a suppression row → curl send-message → expect same rejection.
5. **Live smoke 3:** Chrome MCP click resubscribe button on a suppressed demo lead → verify suppression rows deleted + lead.status reverted to 'waiting'.

---
*End of SPEC.*
