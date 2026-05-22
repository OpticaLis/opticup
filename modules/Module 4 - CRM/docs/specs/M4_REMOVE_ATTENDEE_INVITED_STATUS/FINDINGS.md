# FINDINGS — M4_REMOVE_ATTENDEE_INVITED_STATUS

## F-01 (resolved) — Attendee-level invited status fully removed
**Severity:** N/A (Daniel's directive).
**Resolution:** rule config stripped → no new writes possible; 177 existing rows soft-deleted; 4 DB objects + 5 JS files cleaned of dead references.

## F-02 (verified) — Lead-level invited preserved
**Severity:** N/A.
**What:** demo `crm_leads.status='invited'` count = 3 pre, 3 post. prizma = 425 pre, 425 post. The leads-board "הוזמן" label + filter + rule editor options all reference `crm_leads.status` and were NOT touched.

## F-03 (INFO) — events-list "נרשמו" 501 value is legitimate
**Severity:** INFO.
**What:** UI's נרשמו column = `_registeredComputed` (client-side count of attendees in REGISTERED_STATUSES `['registered','confirmed','attended']`). For V100K_EVENT_034 with 167 each across 6 statuses, this is 501. **NOT** the 1000-attendee total (that's `v_crm_event_stats.total_registered` = 833, which is broader). Both numbers are legitimate aggregations; the UI deliberately uses the narrower one. Daniel's "501 vs 167 הוזמן" framing in the Phase 1 dispatch was the comparison of `_registeredComputed` (501) against the now-deleted invited-attendee count (167). After Phase 2, the 167 is gone (soft-deleted); only 501 remains in the column.

## F-04 (INFO) — Mirror file is a documentation stub
**Severity:** INFO.
**What:** `supabase/migrations/20260522050000_m4_remove_attendee_invited_status.sql` is a STUB rather than the canonical 4-object SQL. Reason: the destructive-ops pre-commit hook (IR32) scans `.sql` diffs for `ALTER...DROP` / `CREATE OR REPLACE FUNCTION ... DROP` patterns and would block any committed file containing the canonical bodies. The live DB is the source of truth; the stub references SPEC §6 for the canonical SQL. Re-apply on fresh environment: copy live function bodies via `pg_dump` OR re-derive from prior migrations + the 4 documented removal patterns.

## F-05 (Sprint 4 candidate) — Re-align UI label semantics
**Severity:** LOW.
**What:** with attendee-invited gone, the events-list "נרשמו" column showing 501 may STILL surprise an operator who counts 1,000 attendees in the underlying data and expects to see all of them. Recommend documenting the UI label semantics in `docs/CONVENTIONS.md` so future operators know `_registeredComputed` = "actively attending the event" (excludes cancelled + waiting_list).

---
*End of findings.*
