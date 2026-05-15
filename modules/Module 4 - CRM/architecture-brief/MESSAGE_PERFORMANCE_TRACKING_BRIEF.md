# Message Performance Tracking — Brief

**Brief version:** v1
**Date:** 2026-05-14
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single Claude Code chat, ~3-4 hours)
**Model preference:** Sonnet (CRUD-shaped: schema + EF + view + simple UI panel)
**Owning module:** Module 4 — CRM (with light touch to Module 3 — Storefront for the redirect endpoint)

---

## 1. Purpose

Daniel needs visibility into per-message engagement to improve copywriting between events. Today, the system already sends per-lead signed-token short links via `send-message` EF's `injectAutoUrls`, BUT click tracking lives on the external short.io dashboard — disconnected from lead/event/message_log context.

We already own:
- A `short_links` table populated on every per-lead URL build.
- A `resolve-link` Edge Function that 302-redirects users on `/r/<code>`.
- The full `crm_message_log` history of which lead got which message.

What's missing:
- The `resolve-link` EF doesn't currently record the click event.
- No view aggregates "messages sent → clicks → conversions" per template / per event.
- No UI surface for Daniel to compare nuscha A vs nuscha B side-by-side.

This Brief authorizes building the click-tracking pipeline + a basic analytics surface so Daniel can finally answer "which message text drove the most registrations for event N?"

---

## 2. Scope

### 2.1 Click capture
- Extend `resolve-link` EF to record click events. Each redirect creates one row in a new `short_link_clicks` table (or extends `short_links` with click metadata — Pipeline decides; defensible either way).
- Captured per click: `short_link_id` (FK), `clicked_at` (UTC timestamp), `user_agent` (truncated), `referer` (truncated), `ip_hash` (sha256 of IP — never raw IP, GDPR-friendly).
- Idempotent on rapid double-clicks (a single tap shouldn't double-count) — debounce by `(short_link_id, ip_hash)` within 30 seconds.

### 2.2 Link short_links to crm_message_log
- Current state: when `send-message` EF calls `buildRegistrationUrl` or `buildUnsubscribeUrl`, it inserts a row into `short_links` with `lead_id` + `event_id` + `link_type` — but doesn't reference the message_log row.
- Add a `message_log_id` column to `short_links` (or write the linkage via a backfill query after both rows exist — Pipeline decides). This lets us trace click → exact message.
- This is the critical join that unlocks "which template_slug version had the highest click-through."

### 2.3 Analytics view
- New view `v_crm_message_performance` aggregating per (tenant_id, event_id, template_id, channel):
  - `messages_sent` (count from message_log where status='sent')
  - `messages_clicked` (count distinct of clicks linked back to that message)
  - `click_rate_pct` (clicked / sent)
  - `registrations_after_click` (count of attendees who registered AFTER their click on a message linked to that event)
  - `conversion_rate_pct` (registered after click / clicked)
- Tenant-scoped per Iron Rule 13. Anon access if needed for any future storefront/admin surface — TBD by Pipeline.

### 2.4 Basic UI surface
- New panel inside the existing CRM Messaging tab (Daniel knows it as "Messaging Hub") titled "ביצועי הודעות" or similar.
- Table view, sortable by event/date: event name + template name + channel + sent + clicked + click % + registered + conversion %.
- One screen, no drill-down in v1.
- Hebrew RTL.
- Use existing CrmHelpers tooling; no new shared infrastructure.

### 2.5 Out of scope (explicitly excluded)
- A/B test scheduling (Daniel manually authors two templates today; analytics surface them).
- Drill-down per-lead click view (future enhancement).
- Geographic / device breakdown beyond user_agent capture (future).
- Email open tracking (requires tracking pixel — separate sensitivity discussion).
- Migrating off short.io (we already have our own /r/ pipeline; short.io is a parallel concern).
- Funnel report at the event level — already exists in the Events tab (Daniel confirmed in chat 2026-05-14).

---

## 3. Safety Envelope

### 3.1 Safety tag
First action:
```
git tag -a pre-message-performance-tracking-2026-05-14 -m "Pre-message-performance-tracking baseline"
git push origin pre-message-performance-tracking-2026-05-14
```

### 3.2 DDL — pre-approved
- ONE new table `short_link_clicks` (or column additions to `short_links` — Pipeline decides; one approach only).
- ONE column addition to `short_links`: `message_log_id uuid NULL` (FK to `crm_message_log.id`).
- ONE new view `v_crm_message_performance`.
- All with canonical Iron Rule 15 RLS (tenant_isolation + service_bypass).
- NO other DDL.

### 3.3 Edge Function changes
- `resolve-link` EF: extend behavior to record click. Existing redirect behavior must stay byte-identical for the user (302 to same target_url).
- `send-message` EF: link the short_links row it just created to the message_log row it's about to write. Order-of-operations tricky — Pipeline solves.

### 3.4 No Prizma data writes during dev
- All smoke tests on demo.
- Once live on develop and Daniel reviews: the click-recording starts on Prizma traffic automatically. That's expected and explicitly authorized — it's the whole point.
- Backfill of historical short_link_clicks: NONE. We start tracking forward from deploy day.

### 3.5 Privacy
- IP addresses MUST be hashed (sha256), never stored raw. Iron Rule alignment + Israeli privacy norms.
- User-agent truncated to 200 chars to bound storage.
- Referer also truncated to 200 chars; strip query strings if they could carry PII.
- Storage policy: clicks retained for 12 months by convention (no auto-delete cron in v1; manual cleanup if ever needed).

### 3.6 No merges to main
- Daniel handles PR after review.

### 3.7 Commit budget
- 6-9 commits expected. Cap at 10.

### 3.8 Stop triggers
- If `resolve-link` redirect timing degrades (was ~30ms, becomes >200ms after click-recording added) → STOP, optimize before shipping. Inserting one row should not be a perf hit; if it is, async-fire-and-forget the insert.
- If the message_log_id linkage produces wrong joins (clicks attributed to wrong message_log row) → STOP, fix the linkage logic.
- If demo smoke shows a click NOT recorded → STOP.

---

## 4. Pipeline Selection

Standard Full Auto Pipeline:
- `opticup-strategic` (Foreman) authors SPEC.
- `opticup-executor` implements DDL + EF extensions + view + UI panel.
- `opticup-reviewer` audits SQL + RLS + EF code.
- `opticup-localhost-tester` smokes demo: send message → click link → verify row in short_link_clicks → view shows the click + 1.
- `opticup-strategic` (Foreman-Review) closes.

Sonnet model.

---

## 5. Communication

English status updates between phases. ONE concise English summary at end pointing to:
- New table/column/view names.
- Sample query to test the new view.
- Demo smoke results.
- Whether ready for develop→main PR.

---

*End of Brief. Activation prompt at `MESSAGE_PERFORMANCE_TRACKING_ACTIVATION_PROMPT.md`.*
