You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). Read your bootstrap files per CLAUDE.md §1 First Action, then execute the revised Brief at `modules/Module 4 - CRM/architecture-brief/M4_FAILED_MESSAGE_BADGE_CLEANUP_BRIEF.md`.

This is the morning follow-up to overnight Bundle 2 T1.1 escalation. Daniel reviewed and decided: event #24 was deliberately closed (deferred); 758 customers received follow-up SMS that succeeded; the failed `crm_message_log` rows are historical noise. Daniel ALSO asked for a reusable "acknowledge" mechanism so future failed-message noise can be cleared by staff via a button.

**Daniel decisions baked into the Brief (do not re-litigate):**
- Option C — TWO surfaces: per-lead small × on the ⚠️ badge + bulk via the "הודעות כושלות (N)" chip → modal.
- Option A — full audit trail: `acknowledged_at` + `acknowledged_by` + `acknowledged_reason` (optional). Visible in per-lead history.
- One backend RPC drives both surfaces.
- The 758 specific Prizma row_ids get the new mechanism applied as the one-time historical cleanup.

**Phase 0 is mandatory.** Foreman MUST identify EXACTLY where the badge value comes from (D1 live aggregate vs D2 cached column) AND pick the permission model BEFORE authoring the repair section. Time-box: 45 min. If unclear → STOP, escalate.

Run the Full-Auto Pipeline end-to-end in this chat:
1. Load skill `opticup-strategic` as Foreman → Phase 0 diagnostic FIRST (badge source + permission model). Then author SPEC at `modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/SPEC.md`. Declare `## Destructive Operations` per Brief §6.
2. Load skill `opticup-executor` → execute:
   - Apply migrations (3 columns + index + new RPC).
   - Implement 2 UI surfaces (per-lead × + chip-modal).
   - Run full demo end-to-end chain test per Brief §5 step 5.
   - Backup re-confirmation of `BACKUP_758_ROWS.json` (md5 match).
   - Call RPC on Prizma to clear the 758 rows.
3. Load skill `opticup-reviewer` → verify all 19 success criteria.
4. Load skill `opticup-localhost-tester` → smoke 7/7 PASS pre- AND post-migration + manual UI walkthrough of both surfaces.
5. Back to `opticup-strategic` → FOREMAN_REVIEW.md. Update Bundle 2 T1.1 escalation file at `modules/Module 4 - CRM/escalations/2026-05-14T22-35Z_brands_event_24_resend_decision.md` with Option E decision + completion timestamp. 2 author + 2 executor skill improvements.

Hard constraints (STOP triggers per CLAUDE.md §9 + Iron Rule 32):
- Phase 0 inconclusive after 45 min → STOP, escalate.
- ANY UPDATE on Prizma touches row OUTSIDE the 758 backup set → STOP, rollback.
- RPC fails tenant-isolation test (allows cross-tenant ack) → STOP, fix RLS canon.
- Demo end-to-end chain breaks at any link → STOP, do NOT proceed to Prizma cleanup.
- Prizma chip post-cleanup ≠ expected leftover (760 - 758 = 2, or document the exact leftover) → STOP, investigate.
- Smoke <7/7 PASS pre-migration → STOP.
- Event #24's `crm_events.status` changes during the run → STOP (deliberately closed per Daniel).

MANDATORY backup (per CLAUDE.md §9 #9 — multi-file SPEC):
- Path: `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M4_FAILED_MESSAGE_BADGE_CLEANUP/`
- Files: pre-edit copies of every modified JS/HTML/CSS file + pre-migration `pg_get_tabledef('public.crm_message_log')` + pre-state JSON of the 758 rows (re-dump to confirm matches prior backup) + CLAUDE.md + relevant M4 docs (SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/ROADMAP/CHANGELOG/db-schema).

Do NOT:
- Re-send any message to any customer (Daniel: already received follow-up).
- Touch event #24's status.
- Acknowledge the 2 unrelated leftover failures.
- Acknowledge failures across other tenants.
- Build un-acknowledge / undo feature (out of scope).
- Build "history of cleared failures" filter (out of scope).
- Build auto-acknowledge-by-age (out of scope).
- Commit to main.
- Run `git checkout main`, `git merge`, `git rebase`.

Demo tenant only for the test scenarios. Prizma writes ONLY the 758 specific row UPDATE.

Whitelist for any test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

When done, return ONE Hebrew status block summarizing: Phase 0 diagnostic result (D1 or D2 + badge source file + permission key chosen), columns added (yes/no), RPC created (yes/no + signature), 2 UI surfaces working (per-lead × + chip-modal), demo full chain test (PASS/FAIL each step), Prizma 758 cleared (count), Prizma chip count pre/post, 5 spot-checked Prizma leads ⚠️ gone (yes/no), 5 spot-checked Prizma leads history view shows "מטופל" tag (yes/no), event #24 status untouched (yes/no), smoke pre/post, escalation file updated (yes/no), repo clean at close (yes/no).

End of activation prompt.
