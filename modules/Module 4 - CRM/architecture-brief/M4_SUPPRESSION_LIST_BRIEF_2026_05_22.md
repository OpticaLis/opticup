# M4 Tenant-Scoped Suppression List (Email + Phone) — Brief

> **Synthesized 2026-05-22 from Daniel's dispatch prompt.** Authored to canonical path.

## Goal
Add a tenant-scoped **suppression list** (blacklist) keyed on normalized email + normalized phone, so unsubscribe survives across lead-row identity. Today's per-lead `unsubscribed_at` gate fails any NEW lead with the same email/phone of a prior opt-out, and re-registering bypasses the opt-out. The change must add a contact-level layer WITHOUT replacing the per-lead gate (defense-in-depth IR22).

## Legal-compliance scope
GDPR / Israeli Privacy Law: an opt-out is on the natural person (the contact), not on a particular DB row. Adding a fresh lead row must NOT undo the opt-out. The same applies to coupon/SMS dispatch laws.

## Required behavior
1. **Tenant-scoped suppression list** keyed by normalized email AND normalized phone. A contact is suppressed if EITHER its email OR its phone matches an entry. (A person may register once by email-only, once by phone-only — block both.)
2. **Every unsubscribe path** also upserts email+phone into suppression (reason + source + timestamp). Per-lead `unsubscribed_at` stays (belt + suspenders).
3. **send-message** checks suppression by email OR phone BEFORE every send, in addition to the existing per-lead check. New lead with suppressed email/phone → `status='rejected', error='contact_suppressed'`.
4. **"החזר לדיוור" button** extension: clears the per-lead state AND removes both email + phone from the suppression list. Single explicit action with a confirm dialog.

## Phases
- **Phase 1 (this run):** diagnose + design + write the removal/upsert map + propose backfill. NO changes. STOP for Daniel signoff.
- **Phase 2 (after signoff):** apply schema migration, 6 code edits, EF redeploy, backfill 130 existing rows, demo-first verification, IR34 Chrome screenshot.

## Rails for Phase 1
- Prizma READ-ONLY (no writes).
- Daniel's 10K (`M4_DANIEL_MANUAL_TEST_2026_05_21`) NEVER touched.
- 90K verify-leads (`M4_100K_VERIFY_2026_05_22`) NEVER touched.
- Develop branch only.

## Destructive Operations (declared upfront per IR32 for both phases)

**Phase 1:** NONE — investigation only.

**Phase 2 (after signoff):**
1. DDL: `CREATE TABLE public.crm_suppressions` (new table) + 2 partial UNIQUE indexes + RLS policies (additive).
2. DDL: `CREATE OR REPLACE FUNCTION` for suppression upsert + lookup RPCs (additive).
3. DML: backfill INSERT of ~130 rows (4 demo + 126 prizma) into `crm_suppressions`. Daniel-authorized Prizma write.
4. JS edits at 4 sites + TS edits at 3 EF sites.
5. EF redeploy: `send-message`, `unsubscribe`, `automation-engine`.
6. NO Prizma destructive ops beyond #3.
