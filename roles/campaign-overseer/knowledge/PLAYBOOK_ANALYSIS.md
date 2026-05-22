# PLAYBOOK — Campaign Performance Analysis Disciplines

> **Synthesized 2026-05-22 from retiring `opticup-campaign-performance-analyst` skill disciplines.** Captures the operational HOW for diagnosing campaign performance using REAL conversion data (business-state columns), not bot-polluted event logs.
> **Read when:** task in `CAMPAIGN_KB_MAP.md` row "Analyze campaign performance".
> **Authority surfaces:** [`KB_FUNNEL_CAPI`](KB_FUNNEL_CAPI.md) (real-vs-raw rule + cardinality table + dashboard semantics) + [`KB_MODULE_4`](KB_MODULE_4.md) (M4 mechanics). This PLAYBOOK is the analysis-discipline layer; the KBs are the canon.

---

## 1. Mode flag — analysis-only ≠ no DB writes

The consolidated `opticup-events-operations` skill has both read and write authority on M4 config. When operating in **analysis mode** (a task in this PLAYBOOK's routing), the skill is functionally read-only:

| Allowed in analysis mode | Forbidden in analysis mode |
|---|---|
| `SELECT` against any public table | `UPDATE` / `INSERT` / `DELETE` on `crm_message_templates`, `crm_automation_rules`, `crm_broadcasts`, `crm_leads`, `crm_event_attendees`, `crm_message_queue`, `crm_message_log`, `crm_audit_log` |
| Writing the analysis output (markdown file, in-chat synthesis) | DDL of any kind |
| Reading `mv_funnel_health_dashboard`, `funnel_weekly_briefs`, `short_links`, `short_link_clicks`, `crm_lead_touchpoints` | Touching EF code, migrations, RLS policies |
| Running diagnostic queries (counts, group-bys, joins) | Cleaning up data that "looks" anomalous (see §6 live-flow rule) |

If a finding implies a config change, switch out of analysis mode explicitly — open a separate operation (with `PLAYBOOK_CONFIG_OPS`'s rules) for the write. Don't conflate read with write inside the same response.

## 2. The two non-negotiable disciplines (most-broken metric rules in the field)

### 2.1 Real-vs-raw rule (the single most important)

**Source conversion / unsubscribe / purchase / registration metrics from BUSINESS-STATE columns, never from click event logs.** Full mapping in [`KB_FUNNEL_CAPI §1`](KB_FUNNEL_CAPI.md#1-the-real-vs-raw-rule-single-most-important-metric-discipline). The TL;DR:

| Metric | Use this column | Avoid this |
|---|---|---|
| Unsubscribe rate | `crm_leads.unsubscribed_at IS NOT NULL` | `short_link_clicks` to /unsubscribe |
| Purchase rate | `crm_event_attendees.purchase_amount > 0` | message log clicks |
| Registration rate | `crm_event_attendees.status IN ('registered', 'confirmed', ...)` | inferred click sequences |
| Channel deliverability | `crm_message_log.status='sent' / 'failed'` | webhook metrics (out of band) |

**Why** (in case anyone forgets): SMS-gateway preview bots fire ~95% of clicks within 6 minutes of send. Click-based metrics measure BOT behavior, not customer behavior. Caught live 2026-05-20 in `M4_SHORT_LINKS_DASHBOARD_REDESIGN` — raw CTR 36.2% → real-action rate 1.4%. Memory: `feedback_clicks_are_not_actions`.

If you MUST use clicks (no business-state column exists), label the metric `"raw"` in the output with a bot-decontamination caveat.

### 2.2 PostgREST cardinality discipline

PostgREST has a silent 1000-row cap on standalone `.select()` calls. On Prizma (2026-05-21 sizes):

| Prizma table | Approx rows | Treatment |
|---|---|---|
| `crm_leads` | ~1,340 | safe for standalone fetch, but pin estimate |
| `crm_event_attendees` | ~235 | safe |
| `crm_message_log` | ~6,000 | embed-JOIN preferred (approaching limit) |
| `short_links` | ~8,200 | **MUST use embed-JOIN or RPC** — standalone fetch silently truncates |
| `crm_message_queue` | ~4,700 | safe but pin estimate |
| `crm_capi_dispatch_queue` | ~30 | safe |

Rule: for any Prizma table that may exceed 1000 rows, estimate cardinality FIRST with a count query, then either use embedded-JOIN via FK (PostgREST embeds bypass the cap on the child side) or a server-side aggregate (RPC / MV).

**Pin the cardinality estimate** at the top of every analysis output (Reality Check section) so anyone reviewing the analysis can verify the result wasn't silently truncated. This is the difference between a real analysis and a wrong analysis dressed up as a real one — caught multiple times in the field.

## 3. PII discipline — never in analysis output

Aggregate-only outputs. If diagnosis requires per-row inspection of PII (phone, email, name), do it in the SQL workspace and emit only aggregate counts / hashes / categorical breakdowns to the analysis document. Specifically:

- ❌ Do NOT include raw phones (`0537889878`) or emails in analysis docs.
- ❌ Do NOT include lead names.
- ✅ Hash if you need to demonstrate "the same 3 leads appear in both cohorts" — `md5(phone)` prefix is enough for cross-reference.
- ✅ Aggregate by status / source / utm / channel — these are not PII.
- ✅ Report counts + percentages.

Why: analysis docs are git-tracked in `roles/campaign-overseer/analyses/` or referenced in chat exports. Both are review surfaces; PII leak there is a real customer-data leak. Iron Rule 23 (no secrets in code or docs) extends to PII.

## 4. Cohort sizing (the silent failure of "looks like a high rate")

Every metric in an analysis MUST come with a cohort size. "Confirmed rate is 80%" is meaningless if the cohort is 5 leads. The discipline:

| Metric | Cohort size | Confidence |
|---|---|---|
| Tier 2 confirmed rate | `count(*) FILTER (WHERE status IN tier2)` | if < 30, report as "indicative only" |
| Per-event purchase rate | attendee count for that event | if < 10, suspend confidence claims |
| Channel deliverability per template | sent + failed + rejected count | if < 100, label "small sample" |
| Cross-event unsub rate | `count(*) FROM crm_leads` | safe for Prizma at ~1,340; estimate before computing |

Template for analysis metric tables:

```
| Metric | Value | Source column | Cohort size | Confidence |
|---|---|---|---|---|
| Confirmed rate | 78% (39/50) | crm_event_attendees.status | 50 attendees | high |
| Unsub rate | 1.2% (16/1,340) | crm_leads.unsubscribed_at | 1,340 leads | high |
| RU confirmed rate | 60% (3/5) | crm_event_attendees.status filter language=ru | 5 attendees | indicative only — sample < 30 |
```

The "Confidence" column saves Daniel from acting on a 3-of-5 phantom signal.

## 5. Avoid-repeat skim (the long-term value)

Before diagnosing a campaign, skim the 3 most-recent analyses in `roles/campaign-overseer/analyses/` (if present) — avoid repeating prior diagnoses verbatim. If the same finding has fired 3+ times across analyses, it's not a "finding" anymore — it's a systemic pattern that needs structural change. Propose escalating to either:
- An Architect SPEC (if the structural change is infrastructure), or
- A locked SOP entry in `roles/campaign-overseer/LEARNINGS.md` (if the change is operational discipline).

Don't write the 4th "real CTR is below raw CTR because of bots" analysis. The pattern was lessoned in 2026-05-20; future appearances are confirmation, not news.

## 6. Live-flow check before any "anomaly" finding (L-005 Rule A)

Before reporting a finding as "data anomaly that needs cleanup", first identify the customer-facing OR operator-facing surface that produces that data shape:

1. Identify the producing surface (storefront form, CRM admin button, automation rule, EF, Make scenario, operator workflow).
2. Read or query that surface (not just the resulting table). Examples: open the form's HTML; read the EF source; inspect the Make scenario branches.
3. Only then frame the anomaly: intentional output of a working flow (= leave alone, document as by-design) vs. unintended artifact (= legitimate cleanup target).

History: 4 of 4 anomaly-detection RECs (REC-002/005/006/008 in the migrated DECISIONS_LOG) were rejected by Daniel because the "anomaly" was actually intentional business behavior. The rule fixes this failure mode systematically. Full context in `roles/campaign-overseer/LEARNINGS.md` L-005.

## 7. Diagnostic query crib sheet (cardinality-safe)

```sql
-- Per-tenant funnel snapshot (safe — uses MV)
SELECT * FROM mv_funnel_health_dashboard WHERE tenant_id = '<tenant_uuid>';

-- Real unsubscribe rate (not click-based) per cohort
SELECT
  count(*) AS cohort_size,
  count(*) FILTER (WHERE unsubscribed_at IS NOT NULL) AS unsubs,
  round(100.0 * count(*) FILTER (WHERE unsubscribed_at IS NOT NULL) / NULLIF(count(*), 0), 2) AS unsub_rate_pct
FROM crm_leads
WHERE tenant_id = '<tenant_uuid>' AND created_at > now() - interval '30 days';

-- Per-event purchase rate
SELECT
  e.name,
  e.event_date,
  count(a.id) AS attendees,
  count(a.id) FILTER (WHERE a.purchase_amount > 0) AS purchased,
  round(100.0 * count(a.id) FILTER (WHERE a.purchase_amount > 0) / NULLIF(count(a.id), 0), 2) AS purchase_rate_pct
FROM crm_events e
LEFT JOIN crm_event_attendees a ON a.event_id = e.id AND a.is_deleted = false
WHERE e.tenant_id = '<tenant_uuid>' AND e.event_date > now() - interval '90 days'
GROUP BY e.id, e.name, e.event_date
ORDER BY e.event_date DESC;

-- Channel deliverability per template (last 30 days)
SELECT
  template_slug,
  channel,
  count(*) AS sent_count,
  count(*) FILTER (WHERE status = 'failed') AS failed,
  count(*) FILTER (WHERE status = 'rejected') AS rejected,
  round(100.0 * count(*) FILTER (WHERE status = 'sent') / NULLIF(count(*), 0), 2) AS deliverability_pct
FROM crm_message_log
WHERE tenant_id = '<tenant_uuid>' AND created_at > now() - interval '30 days'
GROUP BY template_slug, channel
ORDER BY sent_count DESC;
```

For `short_links` ≥ 8K rows on Prizma: use embed-JOIN — `SELECT … FROM crm_lead_touchpoints t JOIN short_links sl …` lets PostgREST embed the link join without tripping the 1000-row cap on the parent side.

## 8. Anti-patterns — do not

- Do NOT compute conversion / unsubscribe / purchase rates from click logs when a business-state column exists.
- Do NOT skip the cardinality estimate for `short_links` or `crm_message_log` queries on Prizma (1000-row silent truncation).
- Do NOT include raw PII (phone / email / name) in analysis output. Aggregate or hash.
- Do NOT report a rate without its cohort size (a 100% rate over 3 attendees is noise, not signal).
- Do NOT propose CAPI replay or DB writes from analysis mode — open a separate operation under `PLAYBOOK_CONFIG_OPS`.
- Do NOT skip the live-flow check (L-005 Rule A) when a finding looks like a data anomaly.
- Do NOT write the same analysis twice — read the 3 most-recent analyses first.

---

*PLAYBOOK_ANALYSIS v1, 2026-05-22. Synthesized from `opticup-campaign-performance-analyst` SKILL.md disciplines + LEARNINGS L-005 Rule A + memory `feedback_clicks_are_not_actions` + `feedback_probe_biggest_production_tenant`. Refresh trigger: any new business-state column added to M4 tables; any structural change to the Funnel Health Dashboard; any new metric semantics decision.*
