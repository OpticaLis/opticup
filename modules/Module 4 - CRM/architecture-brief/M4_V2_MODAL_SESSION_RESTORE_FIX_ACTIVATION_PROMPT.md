# Activation Prompt — M4 v2 Modal Session-Restore Fix + Allowlist

> Paste the block below into a fresh Claude Code chat. Sonnet model. ~1-1.5 hours.
>
> **BEFORE PASTING:** confirm localhost is running:
> ```
> cd C:\Users\User\opticup
> .\scripts\start-local.ps1
> ```

---

```
You are running the Full Auto Pipeline on a small CRM bug fix Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_V2_MODAL_SESSION_RESTORE_FIX_BRIEF.md

Context: two follow-ups from the 2026-05-14 v2 modal E2E validation:
1. M4-V2-SESSION-RESTORE-01 (medium): selections saved on close, not loaded on reopen.
2. Allowlist drift: add danylis92@gmail.com to the formal whitelist.

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §4.1:
   git tag -a pre-v2-session-restore-fix-2026-05-14 -m "Pre-session-restore-fix baseline"
   git push origin pre-v2-session-restore-fix-2026-05-14

2. SECOND ACTION — LOCALHOST HEALTH CHECK per Brief §4.4.

3. TWO WORK ITEMS per Brief §3:
   3.1 Fix the session-restore wire in the v2 modal showAsync path. Save logic was verified working in validation. Load logic needs to be wired: read sessionStorage key, apply on render, restore badge or quick-undo button. 6h TTL enforced. Stale lead_ids silently skipped.
   3.2 UPDATE demo's tenants.ui_config.test_mode_email_allowlist to formally include danylis92@gmail.com (already present in DB today; this is authoritative confirmation). NO Prizma touch.

4. WHITELIST per Brief §4.2 — formal list NOW INCLUDES:
   - Phones: 0537889878, 0503348349, 0507168471
   - Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

5. SAFETY RULES per Brief §4 (non-negotiable):
   - Demo tenant ONLY. One UPDATE on demo tenants row authorized. Zero Prizma writes.
   - NO DDL.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 15, 21, 22 enforced.

6. STOP TRIGGERS per Brief §4.8:
   - Save-on-close turns out to not work (premise refuted) → STOP.
   - Regression in modal flow → STOP.

7. SMOKE per Brief §5: 7-step recipe on demo, validating the restore wire end-to-end including stale-id graceful + 6h TTL clear.

8. COMMIT BUDGET per Brief §4.7: 2-3 commits, cap at 4.

9. ESCALATION: write modules/Module 4 - CRM/escalations/{ISO_TS}_V2_SESSION_RESTORE_BLOCKER.md if blocked.

10. COMMUNICATION: English status updates between phases. ONE concise English summary at end: file path, allowlist UPDATE confirmation, smoke results, ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
