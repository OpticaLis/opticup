# Activation Prompt — Message Performance Tracking

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). Sonnet model.

---

```
You are running the Full Auto Pipeline on a message-performance tracking Brief. Use Sonnet model.

Brief location: modules/Module 4 - CRM/architecture-brief/MESSAGE_PERFORMANCE_TRACKING_BRIEF.md

Context: today the CRM sends per-lead signed-token short links via the send-message EF's injectAutoUrls — links of form prizma-optic.co.il/r/<8-char-code>. The resolve-link EF 302-redirects the click but does NOT record the click event. Click counts live only on the external short.io dashboard and are disconnected from lead/event/message_log context. Daniel needs to compare copywriting variants ("which template_slug version drove more registrations for event N") and today there's no path to that data.

Read the Brief in full BEFORE doing anything else.

Key parameters:

1. FIRST ACTION — SAFETY TAG per Brief §3.1:
   git tag -a pre-message-performance-tracking-2026-05-14 -m "Pre-message-performance-tracking baseline"
   git push origin pre-message-performance-tracking-2026-05-14

2. FIVE WORK ITEMS per Brief §2:
   2.1 Click capture: extend resolve-link EF to record click events (timestamp + truncated UA + truncated Referer + sha256 IP hash). Idempotent within 30s per (short_link_id, ip_hash). Redirect timing must stay <200ms (was ~30ms); use async-fire-and-forget insert if needed.
   2.2 Link short_links → crm_message_log: add message_log_id column to short_links + update send-message EF to write the linkage when it builds the URL.
   2.3 Analytics view v_crm_message_performance: per (tenant_id, event_id, template_id, channel) — messages_sent, messages_clicked, click_rate_pct, registrations_after_click, conversion_rate_pct.
   2.4 UI surface: new panel inside CRM Messaging Hub titled ביצועי הודעות. Table view, sortable, RTL Hebrew, no drill-down v1.
   2.5 Out of scope: A/B scheduling, drill-down per-lead, geo breakdown, email open tracking, migrating off short.io, event-funnel report (Daniel confirmed already exists).

3. SAFETY RULES per Brief §3 (non-negotiable):
   - Click recording starts forward from deploy day. NO backfill of historical clicks.
   - IP addresses MUST be sha256-hashed, never raw. User-agent + referer truncated to 200 chars.
   - DDL pre-approved: 1 new table short_link_clicks (or short_links extension) + 1 new column short_links.message_log_id + 1 new view v_crm_message_performance + canonical Iron Rule 15 RLS on each.
   - NO other DDL.
   - NO Prizma writes during dev. Smoke on demo only. Live click capture on Prizma starts automatically when develop→main lands.
   - NO merges to main.
   - Iron Rule 31, 32, 12, 13, 15 enforced.
   - Iron Rule 32 ## Destructive Operations declared per pre-commit hook.

4. STOP TRIGGERS per Brief §3.8:
   - resolve-link redirect timing >200ms after change → STOP, async-defer the insert.
   - message_log_id linkage produces wrong joins (clicks attributed to wrong message) → STOP.
   - Demo smoke: click happens but no row in short_link_clicks → STOP.

5. COMMIT BUDGET per Brief §3.7: 6-9 commits, cap at 10.

6. ESCALATION: if any step's premise is unsafe, STOP, write modules/Module 4 - CRM/escalations/{ISO_TS}_MESSAGE_PERFORMANCE_BLOCKER.md.

7. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed). ONE concise English summary at the end pointing to new table/column/view names + a sample query to test the new view + demo smoke results + whether ready for develop→main PR.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. The master safety tag is the single rollback point.
```

---

*End of activation prompt.*
