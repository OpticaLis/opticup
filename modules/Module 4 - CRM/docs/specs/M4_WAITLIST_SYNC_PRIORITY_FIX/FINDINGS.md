# FINDINGS — M4_WAITLIST_SYNC_PRIORITY_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_WAITLIST_SYNC_PRIORITY_FIX/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-14
> **Total findings:** 1 (1 INFO)

---

## F1 — INFO — Demo lead `P55 Daniel Secondary` carries an active waiting_list attendee but was NOT included in Brief §3.2 backfill (out of scope)

- **Severity:** INFO
- **Location:** `crm_leads.id = efc0bd54-c6ed-4430-9552-018935a7ebbc` (tenant: demo `8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- **Description:**
  - The pre-sync survey for SPEC §3.2 (executor Step 5) identified 9 leads
    with `waiting_list` attendee rows across Prizma + demo: 8 Prizma + 1
    demo.
  - The 1 demo lead is `efc0bd54-c6ed-4430-9552-018935a7ebbc`, identified
    in the predecessor investigation report
    (`WAITLIST_FLOW_INVESTIGATION_2026_05_13.md` §6 #6) as "P55 Daniel
    Secondary", and its `waiting_list` attendee row sits on demo event
    `TEST543` with `status='waiting_list'` (cap=1, occupied=1, non-closed).
  - Pre-Step-5 `lead.status` for this lead: `confirmed_verified` (because
    of an `attended` row elsewhere — the exact "Quirk A" the investigation
    identified).
  - Under the new §3.1 priority logic, calling
    `sync_lead_status_from_attendee(efc0bd54..., DEMO)` would flip this
    lead to `lead.status='waitlist'` (waiting_list takes precedence over
    attended).
  - The executor did NOT run sync on it because Brief §3.2's literal text
    is Prizma-scoped: *"After §3.1 lands, run the sync once on every lead
    currently attached to a `waiting_list` attendee row on Prizma."*

- **Suggested next action:**
  - **Option A (recommended, smallest):** Daniel can run a 1-line sync
    on demo manually if/when he wants the demo state to reflect the new
    priority logic — useful as a live QA confirmation of the new rule:
    ```sql
    SELECT sync_lead_status_from_attendee(
      'efc0bd54-c6ed-4430-9552-018935a7ebbc'::uuid,
      '8d8cfa7e-ef58-49af-9702-a862d459cccb'::uuid
    );
    ```
    Expected result: `{"ok":true,"updated":true,"old_status":"confirmed_verified","new_status":"waitlist"}`.
  - **Option B (broader cleanup):** author a small follow-up SPEC
    `M4_WAITLIST_SYNC_DEMO_BACKFILL` that runs the same sync on demo for
    any future demo leads that surface a similar shape. Negligible scope
    (≤5 lines of SQL).
  - **No action required for production correctness.** Demo waitlist
    state has zero effect on Prizma. The new RPC body will pick up this
    lead naturally the next time the lead interacts with any active event
    (re-register, automation, EF call).

- **Out of scope for this SPEC:** Brief §3.2 explicitly tenant-scoped to
  Prizma; the demo lead is a separate concern.
