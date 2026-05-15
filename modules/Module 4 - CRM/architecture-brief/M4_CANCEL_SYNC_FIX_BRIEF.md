# M4 Attendee-Cancel → Lead-Sync Fix — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~30-45 min)
**Model preference:** Sonnet (small, well-scoped JS fix + sync RPC call + demo smoke)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

The Status Model documentation (`modules/Module 4 - CRM/docs/STATUS_MODEL.md`) surfaced Finding F4 (HIGH): when an operator cancels an attendee in the UI, the client code `modules/crm/crm-attendee-cancel.js` writes the attendee row's `status='cancelled'` directly to the DB. The companion sync function `sync_lead_status_from_attendee` is NOT called. The lead's `crm_leads.status` on the Tier 2 board stays stale until another event triggers a re-sync.

Operator-visible symptom: a lead canceled on event X still appears in the Tier 2 "רשומים" board as if registered. Counts in the dashboard are silently inflated. The fix is small and local to one file.

---

## 2. Scope

### 2.1 The change
- `modules/crm/crm-attendee-cancel.js` — after the UPDATE that sets `status='cancelled'` succeeds, call `sync_lead_status_from_attendee` with the affected `lead_id` (or however the existing sync call pattern works elsewhere — Pipeline matches the convention).
- The sync recomputes the lead's main-board status based on ALL of its attendee rows. Cancelling one attendee row removes it from consideration; remaining active attendee rows (or absence thereof) dictate the new lead status.

### 2.2 Match the existing pattern
- `register_lead_to_event` RPC already calls sync at the end of registration. Inspect that call shape and replicate it client-side after the cancel.
- Two options:
  - (a) call the sync RPC directly from the client after the cancel UPDATE returns.
  - (b) move the cancel itself into a new RPC `cancel_attendee` that does UPDATE + sync atomically.
- Pipeline decides. (b) is cleaner but is bigger. (a) is the minimum viable fix.

### 2.3 Same fix anywhere else?
- During investigation, grep for any other client-side direct UPDATE of `crm_event_attendees.status`. If any others bypass sync, flag in FINDINGS but DO NOT fix them in this SPEC. Scope discipline.

---

## 3. Safety Envelope

### 3.1 Safety tag
First action:
```
git tag -a pre-m4-cancel-sync-fix-2026-05-14 -m "Pre-cancel-sync-fix baseline"
git push origin pre-m4-cancel-sync-fix-2026-05-14
```

### 3.2 DDL
- If Pipeline chooses Option (a): zero DDL. Pure client-side code change.
- If Pipeline chooses Option (b): ONE new RPC creation. Pre-approved if and only if the new RPC has Iron Rule 15 canonical policy + Iron Rule 22 FROM PUBLIC revoke + tenant_id JWT-claim guard.

### 3.3 Data writes
- Pre-flight: capture count of currently-stale leads on Prizma (cancelled attendees with leads still showing pre-cancel status). NO backfill of historical leads in this SPEC — forward-only fix.
- The new behavior writes one extra row update per cancel from this point onward.

### 3.4 No merges to main
- Daniel handles PR.

### 3.5 Commit budget
- 2-3 commits expected. Cap at 4.

### 3.6 Stop triggers
- If demo smoke shows that the sync runs but produces the WRONG lead status (e.g., overwrites to `waiting` when the lead has another active confirmed attendee elsewhere) → STOP, the sync RPC itself may need updating before the call-site fix lands.
- If grep surfaces MORE THAN 2 other client-side direct UPDATE call sites of attendee.status → STOP, escalate, scope grew.

---

## 4. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model.

---

## 5. Smoke

On demo tenant:
1. Find a test lead with one active attendee (`status='registered'` or similar).
2. Before the fix: confirm lead.status reflects the registration.
3. Cancel via the UI / client function path.
4. After the fix: confirm lead.status now reflects post-cancel state (either back to `waiting` if no other active events, or unchanged if another event still confirms).
5. Test the OTHER scenario: lead with TWO attendee rows on two events. Cancel one. Confirm lead.status reflects the remaining active one (not the cancelled one).

---

## 6. Communication

English status updates between phases. ONE concise English summary at end:
- Which option chosen (a vs b).
- File(s) touched.
- Other-callsite grep results.
- Pre-cancel stale lead count on Prizma (informational; no backfill).
- Demo smoke results.
- Ready for develop→main PR.

---

*End of Brief. Activation prompt at `M4_CANCEL_SYNC_FIX_ACTIVATION_PROMPT.md`.*
