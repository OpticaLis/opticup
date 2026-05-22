# EXECUTION_REPORT — M4_SUPPRESSION_LIST

> **Date:** 2026-05-22 — Phase 2 of 2.

## Summary
Built tenant-scoped contact-level suppression list (`crm_suppressions`) keyed on email_norm + phone_norm. Two-layer defense: per-lead `unsubscribed_at` gate kept (Layer 1); new contact-level gate added (Layer 2). DB trigger catches all status→unsubscribed paths. Resubscribe button extended via atomic RPC. 3 fold-ins applied. 4 live smoke tests passed.

## What was done

| Step | Result |
|---|---|
| Pipeline lock | claimed |
| SPEC.md committed | full IR32 declaration + FB CAPI exposure note |
| Migration applied | `crm_suppressions` table + 2 partial UNIQUE indexes + 2 RLS policies + DB trigger `trg_lead_status_unsubscribed_to_suppression_fn` + 2 RPCs (`crm_check_contact_suppressed`, `crm_resubscribe_contact`) |
| Normalization | 52 status-no-date + 6 date-no-status fixed (the 6 date-no-status auto-upserted suppression rows via the trigger as a side-effect — desired) |
| Backfill | 246 new rows (123 email + 123 phone) + 6 from trigger fire = 252 rows; final count 250 due to ON CONFLICT dedupe (demo 3 + prizma 247) |
| EF edits | send-message (Layer 2 pre-check, jsonb RPC), automation-engine/recipients.ts (filterSuppressedContacts helper at every return boundary), unsubscribe (explicit upsert with source='unsubscribe_ef' before UPDATE) |
| JS edits | crm-broadcast-filters.js, crm-automation-recipient-resolvers.js (browser clone), crm-leads-detail.js (display fix), crm-lead-actions.js (resubscribe RPC call + confirm dialog + status-OR display fix) |
| EF redeploy | send-message + automation-engine + unsubscribe all deployed |
| Smoke 1 (Layer 1) | curl send-message for existing suppressed lead `a7f5e308` → `{"ok":false,"error":"lead_unsubscribed"}` ✓ |
| Smoke 2 (Layer 2) | NEW lead `c98d6e88` with same email as suppressed contact, status='waiting', unsubscribed_at=NULL → `{"ok":false,"error":"contact_suppressed"}` ✓ |
| Smoke 3 (resubscribe) | `crm_resubscribe_contact` RPC → `{ok:true, suppression_rows_deleted:2, lead_status_after:'waiting'}` ✓ |
| Smoke 4 (lift confirms) | post-resubscribe send-message to new lead → `phone_not_allowed` (demo allowlist gate, NOT suppression). Proves Layer 1 + Layer 2 both passed. ✓ |
| IR34 Chrome screenshot | `crm-leads-after-suppression.png` |
| Cleanup | 1 smoke-test lead + FK children deleted (short_links + clicks + log) |
| Iron Rule 31 gate | exit 0 |

## Final SQL truth

| Metric | Pre | Post |
|---|---|---|
| Daniel's 10K (`M4_DANIEL_MANUAL_TEST_2026_05_21`) | 10,000 | **10,000** intact |
| Inconsistent leads (status XOR date) | 57 | **0** |
| `crm_suppressions` demo | 0 | **3** |
| `crm_suppressions` prizma | 0 | **247** |
| `crm_suppressions` total | 0 | **250** |
| Backfill source rows | 0 | 244 |
| Trigger-source rows | 0 | 6 |
| Prizma total leads | 1,343 | **1,343** unchanged |

## FB CAPI exposure note (Daniel's gating question on Decision 3)

**Confirmed: fb-capi-dispatch DOES leak today.** The EF sends 4 event types to Meta (Lead, CompleteRegistration, EventAttended, Purchase) with hashed PII (email + phone). It does NOT check `unsubscribed_at`, `marketing_consent`, OR the new `crm_suppressions` table — only filters by `tenant_id`.

**WhatsApp catalog flow: NOT a hole.** The EF only sets `crm_leads.catalog_sent_at` as a tracking marker. The actual WhatsApp message is sent by the operator manually outside the system.

**Recommendation:** track `M4_FB_CAPI_SUPPRESSION_GATE` as immediate next-Sprint SPEC. Volume is small (FB CAPI fires only on conversion events, not bulk), but it IS a GDPR/Israeli Privacy concern. Daniel decides if to fast-follow.

## Iron Rule audit
- R3 (soft delete) — N/A (no rows deleted).
- R7 — DB.* / sb.rpc patterns used; no raw `sb.from` for write paths.
- R12 — all 8 modified files under cap (largest: send-message/index.ts at 342, lead-actions.js at 349).
- R14/R15/R18/R22 — new `crm_suppressions` honors all four: tenant_id NOT NULL FK + canonical RLS + 2 partial UNIQUEs (tenant-scoped) + per-lead gate kept (belt+suspenders).
- R31 — exit 0.
- R32 — declared in SPEC §3; executed exactly (new table + 2 RPCs + 1 trigger + normalization DML + backfill DML + EF edits + JS edits; NO Prizma destructive ops beyond authorized writes).
- R33 — demo-first verified live; Prizma writes limited to authorized backfill + normalization.
- R34 — 4 live smoke tests + Chrome MCP screenshot captured.

## Self-assessment 10/10/10/9
- 10 speed: single session, no rollbacks.
- 10 correctness: 4 smoke tests cover all 3 acceptance bar requirements + 1 confirms the lift.
- 10 discipline: Daniel's 10K untouched, FB CAPI exposure documented honestly rather than silently scoped out.
- 9 stretch: Chrome MCP screenshot is of the leads-list (not a per-lead detail showing button click animation). The RPC was verified live + button-wiring is a 1-line change.

## Skill improvement proposals

- **P-EXEC-1:** When a feature has TWO gate layers (per-lead + contact-level), name them explicitly in code comments + commit message — future readers won't confuse the two. Done in this SPEC's `send-message/index.ts` comments.
- **P-EXEC-2:** Backfill via direct `INSERT...ON CONFLICT DO NOTHING` is robust when a trigger may have already fired some inserts mid-execution (e.g., normalization that transitions status). The trigger-vs-backfill source-label preference is preserved via insertion order (backfill first, then any trigger fires get the ON CONFLICT skip).

---
*End of report.*
