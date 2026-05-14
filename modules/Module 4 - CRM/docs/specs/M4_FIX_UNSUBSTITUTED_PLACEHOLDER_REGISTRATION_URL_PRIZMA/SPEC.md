# SPEC — M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA

**Status at write:** 🟡 CLOSED-DEFERRED (diagnostic complete, repair escalated to Daniel-decision)
**Module:** Module 4 — CRM
**Tier:** T1.1 of `OVERNIGHT_BUNDLE_2_2026_05_14`
**Author:** opticup-strategic (Foreman, overnight Bundle 2)
**Pre-execution date:** 2026-05-14

---

## 1. Why this SPEC exists

Bundle 1 D1 diagnostic surfaced 758 unsubstituted-placeholder failures in Prizma's `crm_message_log` since 2026-05-13. Demo had 7 (closed by `M4_TEMPLATE_VALIDATION_UNIFIED` 2026-05-14). Production lost 758 broadcast deliveries to customers silently. Three hypotheses to test:

- **H1** — broadcast wizard did NOT pass `event_id` to `crm_message_queue` (BROADCAST_EVENT_LINK_SUPPORT, also same-day 2026-05-13, may have post-dated the failing wave).
- **H2** — template uses `%registration_url%` but the linked event has no public registration URL configured.
- **H3** — `send-message` EF version mismatch.

This SPEC: diagnose → root-cause → repair (if mechanical) / escalate (if Daniel-decision).

## 2. Scope

- **Reads:** `crm_message_log`, `crm_message_queue`, `crm_broadcasts`, `crm_events`, `crm_event_attendees`, `crm_leads`. Prizma tenant only.
- **Writes:** ZERO at SPEC close. Originally allowed Level 2 UPDATE on `crm_message_log` to reset status='pending' + populate event_id IF root-cause was mechanical AND Daniel-decision not surfaced. Repair phase EXITED via escalation trigger — no writes performed.

## 3. Acceptance criteria

1. Root cause identified, ≤ 1 of H1/H2/H3.
2. Affected row count reconciled with Brief's 758 number (exact-match).
3. Daniel-decision triggers (e.g. "should we re-send to N customers?") → escalation file written, SPEC closes 🟡, downstream tiers continue.
4. Mechanical repairs (if any) verified post-write: 0 remaining failures with same signature.
5. Backup snapshot of the 758 row IDs + lead_ids + content_md5 + aggregate digest saved to SPEC folder regardless of repair path.

## 4. Destructive Operations

**None.** Diagnostic-only path taken. Originally authorized Level 2 UPDATE on `crm_message_log` subset scoped to `WHERE id IN (<758-row-list>)` was NOT executed — escalation trigger fired before any write. If Daniel approves a re-send via follow-up SPEC, that SPEC declares its own destructive ops.

## 5. Plan

1. Find Prizma tenant_id and verify `crm_message_log` schema. ✅
2. Confirm 758-row count + breakdown by status/error_message. ✅
3. Sample 5 rows for content inspection — does the literal `%registration_url%` appear in the substituted content? ✅
4. Identify the broadcast(s) in `crm_broadcasts` with matching time window. ✅
5. Check whether `filter_criteria` carried `event_id` (H1 test). ✅
6. Find the brands event #24 and its current registration state. ✅
7. Compute overlap between the 758 failed-lead set and current event attendees (did anyone register through another channel?). ✅
8. Decide between mechanical repair vs Daniel-decision escalation per Brief §1 STOP trigger.
9. Backup the 758 row IDs + metadata to SPEC folder.
10. If escalation: write `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_2026_05_14.md` to `modules/Module 4 - CRM/escalations/`.
11. Write FINDINGS.md, EXECUTION_REPORT.md, FOREMAN_REVIEW.md.
12. Commit + push to develop.

## 6. Expected outputs

- `BACKUP_758_ROWS.json` — full 758-row metadata snapshot (this folder).
- `FINDINGS.md` — diagnostic conclusions + the data points Daniel needs.
- `EXECUTION_REPORT.md` — what happened during the run.
- `FOREMAN_REVIEW.md` — verdict + skill-improvement harvest.
- Escalation file under `modules/Module 4 - CRM/escalations/` with the re-send decision options.

End of SPEC.
