# FINDINGS — M4_INVITED_GHOST_ATTENDEE_FIX

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_INVITED_GHOST_ATTENDEE_FIX/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-13/14 (overnight)

---

## Finding #1 — Pre-existing `crm_leads.status` drift exposed by smoke-cleanup `sync_lead_status_from_attendee` call

**Severity:** LOW (data hygiene).

**What:** After the smoke cleanup, I called `sync_lead_status_from_attendee` for each of the 3 whitelisted demo leads (152e6188, a7f5e308, efc0bd54) to re-derive their lead.status from their remaining attendee state. The third lead (efc0bd54) returned `old_status='invited', new_status='confirmed_verified'`. Pre-smoke that lead had `crm_leads.status='invited'`, but the canonical derivation from their existing attendee rows (multiple `'attended'` rows) was `'confirmed_verified'`. The function therefore corrected the drift.

**This is not caused by SPEC #1.** It's a pre-existing manual-vs-derived divergence in demo data. The SPEC's smoke merely surfaced it (because `register_lead_to_event` calls `PERFORM sync_lead_status_from_attendee` after every register).

**Why it matters:** If similar drift exists on the OTHER 2 leads (152e6188 + a7f5e308), or on production Prizma leads, then any future `register_lead_to_event` call against them will silently auto-correct `lead.status` — which means lead-status filters in the CRM Leads tab will spontaneously shift rows between tiers without operator action. That's a UX surprise.

**Suggested disposition:** Log as `M4-DEBT-LEAD-STATUS-MANUAL-DRIFT` in `TECH_DEBT.md` (out-of-scope to fix in this overnight run). Suggested fix later: one-time `sync_lead_status_from_attendee` batch run on demo + Prizma, audit the diffs, then add a daily cron that runs it.

**Audit cross-reference:** Audit §3.2.3 noted that 92% of Prizma leads have `crm_leads.status='invited'` — a flat lifecycle. This finding suggests that some of those 92% may actually be derivable to richer states. If the strategic answer is "we want lead.status to reflect engagement state, not latest campaign touch" (audit §3.2.3 Proposed Fix option a), then triggering sync widely is part of that fix.

---

## Finding #2 — Brief premise drift detected in pre-flight for SPEC #3 (`M4_DEAD_WAITLIST_SLUG_CLEANUP`)

**Severity:** MEDIUM (escalation required for that SPEC, not this one).

**What:** During pre-flight for SPEC #3, I queried `SELECT t.slug, l.status, COUNT(*) FROM crm_leads l JOIN tenants t ON t.id=l.tenant_id WHERE l.status IN ('waitlist','waiting') GROUP BY ...`. Result: **Prizma has 1 lead with `status='waitlist'`** (audit claimed 0). Demo has 3 leads with `status='waiting'`, 0 with `'waitlist'` (audit said "1 lead with `waiting`, 0 with `waitlist`" — was slightly off on the `waiting` count too).

**Why it matters for THIS SPEC:** It doesn't change SPEC #1's plan. The audit's lead-status numbers don't affect attendee capacity. Logging here because the same pre-flight pass surfaced it, and the overnight Pipeline will write an escalation file for SPEC #3.

**Disposition:** SPEC #3 will be ESCALATED (file written by the Pipeline coordinator at `modules/Module 4 - CRM/escalations/`). SPEC #1 is unaffected.

---

## Finding #3 — `register_lead_to_event` "auto-move" branch acts on `invited` rows on OTHER events even after this fix

**Severity:** INFO (intentional behavior, not a bug — flagged for visibility).

**What:** The RPC's first branch after `event_not_found` check is the "Rung 3 auto-move": if the lead has an active `invited` or `waiting_list` attendee row on a DIFFERENT event (status NOT in completed/cancelled), MOVE that row to the target event instead of fresh-inserting. This branch was unchanged by SPEC #1.

**Why it matters:** The `'invited'` semantics are now bifurcated — invited rows are EXCLUDED from capacity counts (per this fix) but STILL trigger the auto-move branch as an implicit "this lead has an open invitation elsewhere" signal. This is consistent: capacity is about "how many bookings/slots are taken on THIS event"; auto-move is about "does this lead have an open commitment elsewhere worth honoring". Different concerns.

**However:** A future architectural cleanup (audit §7 Rec 4 — separate marketing-object from booking-object) would dissolve this entirely by making "invited" not exist on the attendee table at all. Until then, the auto-move branch is correctly preserved.

**Disposition:** No action. Documented for the next reader who's confused about the post-fix semantics of `'invited'`.

---

*End of FINDINGS.*
