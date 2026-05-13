# M4 Cancel-Sync Fix — Findings

**SPEC:** M4_CANCEL_SYNC_FIX
**Author:** opticup-executor
**Date:** 2026-05-14

These are findings surfaced *during* execution but explicitly out of scope per Brief §2.3 / §3.3. Each is logged for the Foreman (opticup-strategic) and Architect (opticup-architect) to triage into follow-up SPECs or to dismiss.

---

## F-CSF-1 — Demo P55 lead.status was pre-existing stale; sync precedence has shifted under it (INFO)

**Severity:** INFO
**Location:** `crm_leads.id='efc0bd54-c6ed-4430-9552-018935a7ebbc'` (demo tenant, lead "P55 Daniel Secondary"), but the symptom is general.
**Description:** Before this SPEC's smoke run, P55 had `lead.status='confirmed_verified'`. After cancelling all active attendees and restoring them to their original statuses (waiting_list + 4 invited + registered + attended), a re-sync derived `lead.status='waitlist'` — not the original `confirmed_verified`. This is because the `WAITLIST_SYNC_PRIORITY_FIX` migration (commit `20260513122419_m4_waitlist_sync_rpc_waitlist_precedence_2026_05_14.sql`) recently changed the sync RPC to give `waiting_list` highest precedence; no backfill was performed at the time, so existing leads with mixed-status attendees still carry their pre-fix derived `lead.status` values. The new derivation is the correct one per current logic; the old value is the stale one.
**Implication:** Prizma's 960 `invited`-status leads with no active attendees (the Brief §3.3 informational count) is one slice of a broader staleness problem. Other leads on both tenants likely have `lead.status` values that don't match what the current sync RPC would derive — driven by:
1. Cancel paths that never called sync (fixed by this SPEC, but historical staleness remains).
2. The recent waiting_list-precedence sync change without a backfill pass.
3. Possibly other paths that updated attendee.status outside the sync chain (e.g., DB-level UPDATEs from past one-off migrations).
**Suggested next action:** Architect-level SPEC to plan a **forward sweep**: run `sync_lead_status_from_attendee` on every non-terminal lead in both tenants, in chunks of N, with before/after counts logged. Brief §3.3 explicitly excluded backfill from THIS SPEC — that is correct. The follow-up belongs in its own SPEC with its own safety envelope.

---

## F-CSF-2 — Demo lead `33cba7ca-...` was soft-deleted mid-smoke by an unidentified automation (MEDIUM)

**Severity:** MEDIUM
**Location:** `crm_leads.id='33cba7ca-4165-423e-ae85-651f215ecb67'` (demo), and by extension whatever trigger/automation caused the flip.
**Description:** At smoke setup, this lead was `is_deleted=false`, `status='confirmed'`, `attendees=[]` per the candidate-discovery query. After running the smoke's setup (INSERT one `registered` attendee on event `f028cf33-...`, run sync, UPDATE that attendee to `cancelled`, run sync), the lead's `is_deleted` flipped to `true` and a previously-invisible attendee `70a66d73-...` from 2026-05-04 became visible. The `is_deleted=true` flip blocked restoration because a sibling lead with phone `+972537889878` is also active and the UNIQUE constraint `crm_leads_tenant_phone_active_uniq` is partial on `is_deleted=false`.
**Hypothesis:** Either (a) the initial `attendees=[]` finding was a quirk of LEFT JOIN ordering / cache (the row was there but the GROUP+aggregate dropped it), or (b) an automation rule fired on attendee-insert that ran a dedupe-merge against the sibling Daniel-test leads and soft-deleted this one. Hypothesis (a) is more likely (the attendee was clearly visible in the post-smoke direct query), but the soft-delete flip during the smoke is unexplained — the original candidate query DID filter `WHERE l.is_deleted=false`.
**Implication:** Demo tenant has some active path that soft-deletes leads in response to attendee mutations on adjacent-phone leads. This is opaque and worth surfacing. It does not affect the F4 fix itself.
**Suggested next action:** New SPEC or audit task — trace what changed `is_deleted` on this lead between 14:55Z and 14:58Z on 2026-05-13. Candidates: lead-dedupe RPC, automation-engine post-action, or a manual sweep run by an overseer. If found and intentional, document it; if found and unintentional, fix or gate it.

---

## F-CSF-3 — `sync_lead_status_from_attendee` uses composite-NULL check that may misbehave (LOW)

**Severity:** LOW
**Location:** `public.sync_lead_status_from_attendee(p_lead_id, p_tenant_id)` body, line:
```sql
IF v_lead IS NULL THEN
  RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
END IF;
```
**Description:** `v_lead` is a `crm_leads%ROWTYPE`. PL/pgSQL composite `IS NULL` evaluates to true only when **every** column is NULL. The canonical idiom for "SELECT INTO found no row" is `IF NOT FOUND THEN ...`. The current check works in practice today because `crm_leads.id` is NEVER NULL on a found row, but it would mis-fire if SELECT-INTO landed a row whose every column happened to be NULL (vanishingly unlikely) or — relevant to a future refactor — if someone changes the SELECT to use OUTER JOINs.
**Implication:** Latent defect; no current functional impact.
**Suggested next action:** Tiny refactor — replace `IF v_lead IS NULL` with `IF NOT FOUND` — bundled into the next M4 sync-RPC change SPEC (don't ship as its own SPEC; it's a 1-line fix).

---

## F-CSF-4 — STATUS_MODEL.md §6.4 entry "Direct .update({status}) writes bypass the sync RPC" is now partially obsolete (LOW)

**Severity:** LOW
**Location:** `modules/Module 4 - CRM/docs/STATUS_MODEL.md` §6.4 Issue #1.
**Description:** The §6.4 entry calls out `crm-attendee-cancel.js:73,106` as bypass sites. After this SPEC's fix those lines now DO call sync. The doc was not updated as part of this SPEC because the Brief did not request a doc edit. The bullet about "operator dropdown attendee status changes (if any)" remains accurate — none were found in this SPEC's grep, but the doc-writer hedged.
**Suggested next action:** Bundle a doc touch into the next M4 SPEC that closes out F-CSF-3 or another sync-adjacent finding. Strike the `crm-attendee-cancel.js:73,106` reference and add a parenthetical "(fixed in M4_CANCEL_SYNC_FIX, 2026-05-14)" to preserve the historical pointer.

---

*End of FINDINGS. Four entries — one INFO, one MEDIUM, two LOW. None block the fix itself.*
