# M4 Message-Performance Screen — Investigation (2026-05-21)

> **Mode:** DIAGNOSE ONLY. No code changes, no migrations. Prizma READ-ONLY.
> **Trigger:** Daniel observed "screen shows `event_registration_open_sms_he = 11 sent`" while SQL truth = 2,326 sent for that template_id.

## 0. Conclusion (TL;DR)

1. **The "2,326 → 11" framing is a slug-name visual confusion**, not a data-loss bug. The screen + view are both correct. The "11" Daniel saw belongs to `event_registration_confirmation_sms_he` (event #24); `event_registration_open_sms_he` correctly displays **1,165 + 1,161 = 2,326** sent across events #25 + #24.
2. **However, two real gaps Daniel surfaced ARE valid:**
   - **No sent-date column on the screen** — operators can't tell WHEN a batch was sent.
   - **No per-template aggregation across events** — operators must mentally sum rows from each event row.
3. **Latent scale risk (Sprint-2 candidate):** view returns 22 rows on Prizma today (well under PostgREST `db-max-rows=1000` cap). At growth (50+ events × ~30 templates × 2-3 channels), the view will exceed 1000 rows and the screen will silently undercount — same family as the dashboard `1%-sample` bug we just fixed in SPEC 3.

## 1. Evidence

### View definition is correct
```sql
SELECT m.tenant_id, m.event_id, m.template_id, m.channel,
       count(DISTINCT m.id) FILTER (WHERE m.status = 'sent') AS messages_sent,
       count(DISTINCT m.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL) AS messages_clicked,
       count(DISTINCT a.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL
         AND a.registered_at > c.clicked_at AND a.is_deleted = false) AS registrations_after_click
  FROM crm_message_log m
  LEFT JOIN short_links sl ON sl.message_log_id = m.id
  LEFT JOIN short_link_clicks c ON c.short_link_id = sl.id
  LEFT JOIN crm_event_attendees a ON a.tenant_id = m.tenant_id AND a.lead_id = m.lead_id AND a.event_id = m.event_id
 WHERE m.template_id IS NOT NULL
 GROUP BY m.tenant_id, m.event_id, m.template_id, m.channel;
```
View has `security_invoker=on` → RLS applies. Aggregates COUNT (no LIMIT, no cap server-side).

### View truth for the problem template (Prizma `event_registration_open_sms_he`, id `b325481a-...`)

| event_number | event_name | template_slug | channel | messages_sent |
|---|---|---|---|---|
| 25 | אירוע המותגים - מאי 2026 | event_registration_open_sms_he | sms | **1,165** |
| 24 | אירוע המותגים - מאי 2026 | event_registration_open_sms_he | sms | **1,161** |
| **TOTAL** | | | | **2,326** ✓ |

This matches SQL truth: `SELECT count(*) FROM crm_message_log WHERE template_id=b325481a AND status='sent'` = **2,326**.

### Where the "11" actually lives (on event #24)
The screen DOES contain rows with `messages_sent=11`, but they are for a **different template**:

| event_number | template_slug | channel | messages_sent |
|---|---|---|---|
| 24 | **event_registration_confirmation**_email_he | email | **11** |
| 24 | **event_registration_confirmation**_sms_he | sms | **11** |

The slug `event_registration_open_*` (sent at status-change to registration_open) vs `event_registration_confirmation_*` (sent when a lead REGISTERS for an event) are visually similar in the screen's small slug column. Daniel most likely scanned the row showing "11 sent" + read the prefix as "event_registration_open" instead of "event_registration_confirmation".

### Date distribution truth (proves "missing dates" gap)
```
day            | sent
---------------+------
2026-05-12     | 1,161   ← event #24 went registration_open
2026-05-21     | 1,165   ← event #25 went registration_open (TODAY)
```
**Two distinct dispatch batches on two days.** The screen aggregates them under "1,165 sent" + "1,161 sent" — but says NOTHING about WHEN. Daniel can't visually distinguish "yesterday's send" from "9 days ago's send" without clicking into individual log rows.

## 2. Why 2,326 shows as 11 — pinned

**It doesn't.** The view + screen show 2,326 (1,165 + 1,161) correctly for `event_registration_open_sms_he`. The "11" Daniel reported belongs to `event_registration_confirmation_sms_he` (event #24).

This isn't a code bug — it's a UX/visual bug:
- The slug column uses small monospace-ish font.
- `event_registration_open_sms_he` and `event_registration_confirmation_sms_he` share the first 20 characters.
- No bold/color distinction between the discriminating segments (`open` vs `confirmation`).

## 3. Why the screen doesn't display sent-dates

The view doesn't expose `min(created_at)` or `max(created_at)` — it only exposes counts. The screen reads what the view exposes; no date columns to render.

`crm_message_log.created_at` IS populated on every row (2,326/2,326 confirmed via SQL). The data is there; the aggregation just doesn't surface it.

## 4. Latent scale risk (not active today)

At Prizma's CURRENT scale (5 active events × ~14 templates with sends = 22 view rows), the screen is correct. But:
- PostgREST's `db-max-rows=1000` cap applies to ALL SELECT and RPC-TABLE responses (same constraint that broke the dashboard in SPEC 3).
- The screen calls `sb.from('v_crm_message_performance').select(...)` without `.limit()` or `.range()`.
- At ~50 events × ~30 templates × 2 channels = 3,000 view rows. PostgREST would silently return only the first 1,000. The screen would show wrong totals for the ~2,000 rows that get cut off.

When this becomes active depends on Prizma's growth rate. Today it's not a problem. After 6 months of mature operation, it likely is.

## 5. Proposed fix shape (RPC)

Create a SECURITY DEFINER RPC `crm_message_performance_summary(p_tenant_id uuid)` returning a single jsonb scalar containing the full performance matrix WITH date min/max + per-template totals across events. Mirrors SPEC 3's `crm_dashboard_status_counts` pattern. Returning jsonb scalar bypasses the `db-max-rows=1000` cap.

```sql
CREATE OR REPLACE FUNCTION public.crm_message_performance_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='public'
AS $$
DECLARE
  v_jwt_tenant uuid; v_result jsonb;
BEGIN
  -- JWT tenant guard (canonical header) ...
  SELECT jsonb_build_object(
    'per_event', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'event_id', m.event_id, 'template_id', m.template_id, 'channel', m.channel,
        'messages_sent', m.sent, 'messages_clicked', m.clicked, 'registrations_after_click', m.regs,
        'first_sent_at', m.first_sent, 'last_sent_at', m.last_sent
      )), '[]'::jsonb) FROM (
        SELECT m.event_id, m.template_id, m.channel,
               count(*) FILTER (WHERE m.status='sent') AS sent,
               count(*) FILTER (WHERE m.status='sent' AND c.id IS NOT NULL) AS clicked,
               count(DISTINCT a.id) FILTER (...) AS regs,
               min(m.created_at) FILTER (WHERE m.status='sent') AS first_sent,
               max(m.created_at) FILTER (WHERE m.status='sent') AS last_sent
          FROM crm_message_log m
          LEFT JOIN short_links sl ON ...
          LEFT JOIN short_link_clicks c ON ...
          LEFT JOIN crm_event_attendees a ON ...
         WHERE m.tenant_id = p_tenant_id AND m.template_id IS NOT NULL
         GROUP BY m.event_id, m.template_id, m.channel
      ) m
    ),
    'per_template' (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'template_id', m.template_id, 'channel', m.channel,
        'messages_sent_total', m.total_sent, 'events_used_in', m.events_count,
        'first_sent_at', m.first_sent, 'last_sent_at', m.last_sent
      )), '[]'::jsonb) FROM (
        SELECT template_id, channel,
               count(*) FILTER (WHERE status='sent') AS total_sent,
               count(DISTINCT event_id) AS events_count,
               min(created_at) FILTER (WHERE status='sent') AS first_sent,
               max(created_at) FILTER (WHERE status='sent') AS last_sent
          FROM crm_message_log
         WHERE tenant_id = p_tenant_id AND template_id IS NOT NULL
         GROUP BY template_id, channel
      ) m
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;
```

The screen then:
1. Calls the RPC once.
2. Renders TWO tables: per-template totals (top, default view), per-event drill-down (expandable per template).
3. Date columns: `first_sent` + `last_sent` on both tables.
4. UX fix: highlight the discriminating slug segment (`_open_` vs `_confirmation_`) in bold so visually-similar slugs are easier to tell apart.

## 6. Proposed SPEC name + scope

`M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS` — Sprint 2 candidate.

Scope (one Pipeline run):
- 1 migration: the `crm_message_performance_summary` RPC + grants.
- 1 edit: `modules/crm/crm-messaging-performance.js` switches `loadPerformance()` from the view to the RPC + adds two date columns to the table + adds a per-template "summary" row above the per-event rows.
- 1 UX fix: bold-highlight the discriminating slug segment.
- Chrome MCP IR34 verification on demo + Prizma (read-only).

Risk: LOW. RPC is pure-additive. View stays in place (no consumers should break).

## 7. What does NOT need fixing

- The view itself (correct aggregates).
- The screen's existing query path (correct read of a correct view).
- Tenant isolation (security_invoker=on; RLS applies).
- The `crm_message_log` table (created_at populated, template_id populated, channel populated).

---
*End of investigation.*
