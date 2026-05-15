# M4 Stale Invited Leads Sweep — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~30-45 min)
**Model preference:** Sonnet (small, well-scoped DB sweep using existing RPC)
**Owning module:** Module 4 — CRM

---

## 1. Purpose

Finding F-CSF-1 from `M4_CANCEL_SYNC_FIX/FINDINGS.md`: 960 leads on Prizma carry `status='invited'` but have NO active attendee rows. They are stale — they should be at `status='waiting'` (ready for the next event invitation cycle), which is what the recent waitlist-priority sync logic would assign if it were re-run on them.

These are leads whose state never got re-synced after past events closed. They've accumulated over time. Until they're swept, Daniel's Tier 2 board misrepresents their actual lifecycle state, and any future automation that targets "leads with `status=waiting`" misses them.

This Brief authorizes a one-shot retroactive sweep using the existing `sync_lead_status_from_attendee` RPC on those 960 leads.

---

## 2. Scope

### 2.1 The sweep
- Identify all Prizma leads where `status='invited'` AND lead has NO `crm_event_attendees` rows that are non-deleted on a non-closed/non-completed event.
- For each: call `sync_lead_status_from_attendee` with the lead_id. The RPC's existing logic will recompute the correct status. Most should land on `waiting` since they have no active event.
- Process in batches of 50-100 to avoid long transactions; the RPC is idempotent so partial sweep is safe.

### 2.2 Demo first
- Run the same query on Demo first. Even if Demo has 0 stale leads (likely), confirm the query shape and RPC interaction before touching Prizma.

### 2.3 Outcome verification
- Pre-sweep count: 960 leads on Prizma with `status='invited'` AND no active attendee rows.
- Post-sweep target: 0 such leads remaining.
- The 960 leads should now distribute across `waiting` (expected majority), and possibly other terminal statuses where the RPC's logic dictates.
- Capture the distribution: how many ended up in each status.

### 2.4 Out of scope
- The 960 count is a snapshot at the time of the F-CSF-1 finding. The actual count today may differ slightly — Pipeline should re-query to get fresh number before the sweep. Brief approves any count in the 800-1200 range; anything outside that → STOP, escalate.
- No code changes. No new RPC. No new view. The sweep uses ONLY the existing `sync_lead_status_from_attendee` RPC.
- Not in scope: backfilling demo with synthetic stale leads to test broader pattern. The smoke is on whatever Demo has today.

---

## 3. Safety Envelope

### 3.1 Safety tag
First action:
```
git tag -a pre-m4-stale-invited-leads-sweep-2026-05-14 -m "Pre-stale-invited-leads-sweep baseline"
git push origin pre-m4-stale-invited-leads-sweep-2026-05-14
```

### 3.2 DDL — none
- This is a data sweep only. Zero DDL.

### 3.3 Prizma data writes — EXPLICITLY AUTHORIZED
- ~960 lead-row UPDATEs on `crm_leads.status` only. No other column.
- Each UPDATE is the result of `sync_lead_status_from_attendee` RPC's internal logic — not direct UPDATE statements written by the Pipeline.
- Pre-sweep: capture the full list of affected lead_ids + their current status in EXECUTION_REPORT.md §2 as a CSV (or similar). Enables row-by-row inspection if needed post-hoc.
- Post-sweep: capture the after-status of each. Distribution table in summary.

### 3.4 Rollback
- The pre-sweep snapshot IS the rollback artifact. If something goes wrong, generate UPDATEs back to original status from the captured list. The master safety tag is for code/repo rollback; the snapshot is for data rollback.

### 3.5 No merges to main
- Daniel handles PR.

### 3.6 Commit budget
- 1-2 commits expected. Cap at 3.
- The actual sweep is run via Supabase MCP `execute_sql`; the repo commits are just the SPEC + retrospective.

### 3.7 Stop triggers
- Pre-sweep count outside the 800-1200 range → STOP, escalate (the F-CSF-1 finding's premise may have changed).
- During sweep: ANY lead that the sync RPC moves to a status NOT in `['waiting', 'invited', 'waitlist', 'confirmed', 'confirmed_verified', 'attended']` → STOP, the RPC returned an unexpected slug.
- Post-sweep verification: post-state count of stale `invited` leads is anything other than 0 → STOP, investigate.

---

## 4. Pipeline Selection

Standard Full Auto Pipeline. Sonnet model.

---

## 5. Smoke / Verification

On Demo:
1. Run the same eligibility query: count leads where `status='invited'` AND no active attendee rows.
2. If count > 0 on Demo, sweep those first (low risk, low count expected).
3. Confirm post-sweep on Demo: count = 0.

On Prizma:
1. Capture pre-state snapshot of all affected lead_ids + current status.
2. Run sweep in batches of 50-100 via RPC.
3. Capture post-state. Build distribution table.
4. Confirm post-state count of stale `invited` leads = 0.

---

## 6. Communication

English status updates between phases. ONE concise English summary at end:
- Pre-sweep counts (Demo + Prizma).
- Post-sweep counts (Demo + Prizma).
- Distribution table: how many leads moved to each status.
- Any unexpected slug encountered (none expected).
- Ready for develop→main PR (the SPEC commits, not the data sweep — data is already live on Prizma).

---

*End of Brief. Activation prompt at `M4_STALE_INVITED_LEADS_SWEEP_ACTIVATION_PROMPT.md`.*
