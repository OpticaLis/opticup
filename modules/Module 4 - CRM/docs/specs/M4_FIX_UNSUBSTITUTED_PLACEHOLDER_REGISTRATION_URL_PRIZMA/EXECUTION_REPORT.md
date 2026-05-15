# EXECUTION_REPORT — M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA

**Status:** 🟡 CLOSED-DEFERRED (diagnostic complete, repair escalated)
**Run date:** 2026-05-14 (overnight Bundle 2 T1.1)
**Executor:** opticup-executor + opticup-strategic (combined, overnight chain)

---

## Summary

T1.1 ran end-to-end through the diagnostic phase. Root cause = H1 confirmed (broadcast `ab7341c9` pre-dated BROADCAST_EVENT_LINK_SUPPORT fix → `event_id` arrived NULL on queue rows → `injectAutoUrls` skipped registration-token branch → `%registration_url%` reached safety scan unsubstituted → 758 rejected at send-message).

Repair phase exited via the Brief §1 STOP trigger ("Daniel-decision question surfaces → write escalation, do NOT silently re-send"). Reason: re-sending 755 customers (758 minus 3 already-registered) to an event that is `status='closed'` tomorrow requires Daniel's call between 4 plausible options (A re-open+resend, B resend-anyway, C accept-loss, D partial-resend on waitlist intersect). 0 Prizma writes.

## Steps executed

1. ✅ Verified tenant IDs (Prizma `6ad0781b-…`, Demo `8d8cfa7e-…`).
2. ✅ Verified `crm_message_log` schema — confirmed `broadcast_id`, `template_id`, `event_id` columns all exist.
3. ✅ Counted failures by signature: exactly 758 `status='failed' AND error_message='unsubstituted_placeholder: registration_url'` in [2026-05-12, 2026-05-15) — matches Brief number.
4. ✅ Sampled 5 rows → full content of row `39ec0ca1-…` shows substituted `%name%` + substituted brand short.gy URL + literal `%registration_url%` in the registration line. Smoking gun for H1.
5. ✅ Found candidate broadcast `ab7341c9` (06:12:18 creation, 1135 recipients, `filter_criteria.event_id` ABSENT). Compared to later broadcast `702d34f0` (07:37 creation, 1 recipient, `filter_criteria.event_id` PRESENT) — confirms the wizard's event-link gap closed mid-day on 2026-05-13.
6. ✅ Found event #24 (`a7c9f174-…`, brands event, 2026-05-15, `status='closed'`, 9/50 active).
7. ✅ Computed overlap: 125/758 are now-attendees somewhere, but only 3/758 on event #24 — i.e. 755 of 758 never registered for this event by any route.
8. ✅ Spot-checked 2026-05-12 (potential adjacent failure cohort) — 0 failures. The 758 is isolated to broadcast `ab7341c9`.
9. ✅ Backed up the 758 row IDs + lead_ids + content_md5 + aggregate digest to `BACKUP_758_ROWS.json` (191 KB).
10. ✅ Decided: Daniel-decision STOP → wrote escalation file `modules/Module 4 - CRM/escalations/2026-05-14T22-35Z_brands_event_24_resend_decision.md`.
11. ✅ Wrote SPEC.md, FINDINGS.md (7 findings), this EXECUTION_REPORT.md.
12. ⏭️ Write FOREMAN_REVIEW.md (next).
13. ⏭️ Commit + push develop.

## Steps NOT executed (deferred)

- ❌ Did NOT modify any Prizma row (`crm_message_log`, `crm_message_queue`, `crm_events`, `crm_leads`, `crm_event_attendees` all untouched).
- ❌ Did NOT re-enqueue any message.
- ❌ Did NOT re-open event #24.
- ❌ Did NOT silently mark the 758 as "accepted loss" — that's a Daniel-decision documented in FOREMAN_REVIEW after his call.

## Iron-rule compliance

- **Rule 14 (tenant_id):** every read filtered by `tenant_id`. No cross-tenant query touched these results.
- **Rule 15 (RLS):** read-only via MCP using `service_role` — RLS bypass is by design; not a violation.
- **Rule 21 (no orphans):** SPEC folder co-located in `modules/Module 4 - CRM/docs/specs/`. Escalation file in correct `escalations/` directory per `STATUS_CHANGE_TRIGGERS_FRAMEWORK` precedent.
- **Rule 22 (defense-in-depth on writes):** N/A — no writes.
- **Rule 32 (destructive ops):** SPEC §4 declared `None.` — diagnostic-only path taken. Repair-write authority was scoped to the 758 row IDs but never exercised. Consistent.

## Smoke / verify

- `verify:integrity` exit 0 at session start.
- No code changes → no localhost smoke needed for this SPEC.

## Repo state at close

- Branch: develop. No checkouts.
- New files: 4 in SPEC folder + 1 escalation file. All under `modules/Module 4 - CRM/`.
- Pre-existing untracked files (overnight Bundle context): unchanged.

## Time

- Diagnostic phase: ~30 min wall-clock (within Brief's 2-hour estimate).
- Repair phase: 0 min (escalated).

End of EXECUTION_REPORT.
