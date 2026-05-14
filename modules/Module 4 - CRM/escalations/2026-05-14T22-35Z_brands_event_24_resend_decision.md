# ESCALATION — Brands Event #24 (Prizma) Re-Send Decision

**Time (ISO):** 2026-05-14T22:35:00Z
**Origin SPEC:** `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA` (overnight Bundle 2 T1.1)
**Tier:** T1.1 Daniel-decision STOP trigger per `OVERNIGHT_BUNDLE_2_2026_05_14_BRIEF.md` §1
**Routes to:** Daniel — morning review

---

## Why this escalation fires

The activation prompt explicitly authorized halting T1.1 at the Daniel-decision boundary:

> T1.1 surfaces a Daniel-decision question (e.g. "should we re-send to 758 customers?") → STOP T1.1, write escalation, continue with T2+.

Diagnostic complete (root cause = H1, confirmed). The Brief's mechanical-repair option ("re-build + re-enqueue with right event_id") IS technically feasible — the 758-row backup is at `modules/Module 4 - CRM/docs/specs/M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/BACKUP_758_ROWS.json` — but the QUESTION "should we send to 755 customers right now" depends on facts only Daniel knows.

## The 2-line situation

- 758 marketing SMS for brands event #24 (Prizma) failed silently on 2026-05-13 06:13 with `%registration_url%` unsubstituted (root cause: broadcast pre-dated BROADCAST_EVENT_LINK_SUPPORT fix that landed the same evening).
- Event is **tomorrow** (2026-05-15, Friday). Event currently `status='closed'`. 9/50 capacity used. Only 3/758 customers ever registered through any channel.

## The decision

| Option | Action | Pros | Cons |
|---|---|---|---|
| **A — re-open + re-send** | Flip `crm_events.status closed → registration_open`, write follow-up SPEC `M4_RESEND_BRANDS_EVENT_INVITES_2026_05_14`, re-enqueue 755 SMS (758 minus 3 already registered) with event_id propagated | Recovers ~755 invitations; 41 of 50 seats still open; aligns with broadcast intent on 2026-05-13 | Last-minute marketing push 1 day before event; risk of over-response → over-capacity; if Daniel deliberately closed event (e.g. logistics frozen), this reverses that |
| **B — keep closed + re-send anyway** | Re-enqueue 755 SMS without re-opening event | Acknowledges customers got an SMS attempt without the friction of reverse-decision | Awful customer UX: marketing SMS → "event is closed" landing page friction; mixed signals from brand |
| **C — accept loss + close cleanly** | Mark in FINDINGS as accepted data loss; no re-send; Daniel notes the lesson in DECISIONS_LOG | Cleanest; preserves event's apparent intentional closure; minimal customer impact (none of the 755 ever pursued registration) | 755 customers got a literal-text-glitch SMS as their only contact for an event 2 days away |
| **D — partial re-send (waitlist intersect)** | Compute the intersection of `crm_leads.status='waiting'` on Prizma AND the 758 failed-lead set. Re-send only that subset (~likely small) | Surgical; respects customer intent (people who said "I want to attend"); doesn't blast 755 | Requires re-open event OR a different routing target; smallest population |

## What I recommend (for record only — Daniel decides)

**Option D** if Daniel can confirm there is enough capacity to absorb the waiting-list intersection. **Option C** if Daniel intended to close the event. Avoid Option A unless the event was closed by accident.

## Inputs Daniel needs to choose

1. Was event #24's `status='closed'` deliberate? (If yes → Option C; if no → Option A or D.)
2. Is capacity (max 50, current 9 active) honest? Any pre-committed seats not reflected in `active_registered`?
3. Is the marketing template's content still appropriate to send 1 day before the event, or does the body need refreshed copy?

## Process after Daniel decides

- **A or D:** Author follow-up SPEC `M4_RESEND_BRANDS_EVENT_INVITES_2026_05_14` (Foreman) → opticup-executor runs it under standard Full-Auto Pipeline. SPEC writes new `crm_message_queue` rows for the selected subset with `event_id` correctly populated, leaves the original 758 `crm_message_log` rows untouched as historical record (do NOT modify status — they ARE failed history).
- **B:** Same as A but skip the status flip.
- **C:** Add a closure note to `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/FOREMAN_REVIEW.md` titling the 758 as "accepted data loss".

## State at escalation

- 0 Prizma writes performed during T1.1.
- 0 Daniel-decision questions resolved unilaterally.
- Backup snapshot of 758 rows safely on disk (`BACKUP_758_ROWS.json`, 191 KB, aggregate md5 `7b66b5789a3c61658d01c3a6366daee9`).
- Bundle 2 continues with T2+T3+T4+T5+T6 per Brief.

End of escalation.
