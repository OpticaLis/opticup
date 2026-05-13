# Overnight R2 Blocker — M4_RAW_SB_WRAPPER_MIGRATION_PHASE_2

**Date:** 2026-05-14 18:45 UTC
**Run:** Overnight Harvest Round 2 (Brief `M4_OVERNIGHT_HARVEST_ROUND_2_BRIEF.md`)
**SPEC blocked:** SPEC #2 — `M4_RAW_SB_WRAPPER_MIGRATION_PHASE_2`
**Author:** opticup-strategic (Foreman, pre-flight discipline applied)
**Master safety tag:** `pre-overnight-m4-r2-2026-05-14`

---

## TL;DR for Daniel

Pre-flight on SPEC #2 found that the Brief's premise — "migrate next 25-30 raw `sb.from()` calls to DB.* wrappers" — is contradicted by the live code state. The existing wrappers (`fetchAll`, `batchCreate`, `batchUpdate`) only support `SELECT *` + batch INSERT/UPDATE-by-id. Almost every `sb.from()` call in the target M4 files uses a **specific column subset SELECT**, a **single-row `.single()` lookup**, or a **single-row conditional UPDATE** — none of which the wrappers cover today.

**Recommended path forward:** Either (a) author a foundational SPEC that extends the wrapper API first (`selectColumns`, `selectOne`, `updateOne`), OR (b) explicitly accept M4 as a wrapper-partial zone and document the rationale in CONVENTIONS.md.

This blocker matches the audit's Rec 3 verbatim: "Codify Iron-Rule-7 enforcement on M4. Either (a) lift `DB.*` wrapper coverage in the next M4 hygiene SPEC, or (b) explicitly accept M4 as a wrapper-exempt zone with a documented reason."

---

## What was verified

### Live `sb.from()` density in M4 (commit fb49972 + ee2a14b on 2026-05-14)

`grep -nE "sb\.from\(" modules/crm/*.js` → **120 hits** across 40 files (audit reported 129 on 2026-05-13; the 9-call delta is within drift from M4_CANCEL_SYNC_FIX and SPEC #1 of this overnight run).

### Target files per Brief §3.2 — pattern breakdown

The Brief named the next-tier candidates as `crm-events-detail.js`, `crm-event-day-manage.js`, `crm-leads-detail.js`, `crm-messaging-tab.js`. The first three have **8 total** `sb.from(...)` calls:

| File:line | Pattern | Why it can't migrate |
|---|---|---|
| `crm-events-detail.js:63` | `sb.from('crm_events').select('id, event_number, name, ...17 columns')` | specific-column SELECT — no wrapper supports |
| `crm-events-detail.js:67` | `sb.from('v_crm_event_attendees_full').select('id, lead_id, ...17 columns')` | view + specific-column SELECT |
| `crm-events-detail.js:305` | `sb.from('crm_events').update({ extra_coupons: next }).eq('id', event.id).eq('tenant_id', ...)` | single-row UPDATE — `batchUpdate(table, records)` requires `id` inside each record and is inefficient for one row |
| `crm-event-day-manage.js:261` | `sb.from('crm_event_attendees').update(patch).eq('id', id)` | single-row UPDATE |
| `crm-event-day-manage.js:285` | same | same |
| `crm-event-day-manage.js:297` | `sb.from('crm_event_attendees').select('...12 columns').eq('id', id).single()` | specific-column SELECT + `.single()` — no wrapper supports |
| `crm-leads-detail.js:73` | `sb.from('crm_lead_notes').select('id, content, event_id, employee_id, created_at')` | specific-column SELECT |
| `crm-leads-detail.js:78` | `sb.from('v_crm_lead_event_history').select('5 columns').eq('lead_id', leadId)` | view + specific-column SELECT |

`crm-messaging-tab.js` does not exist in the repo. The closest matches (`crm-messaging-broadcast.js`, `crm-messaging-broadcast-queue.js`, `crm-messaging-templates.js`) have only 1-3 calls each, all of the same patterns.

### Wrapper API gap

`js/supabase-ops.js` lines 77-172 define exactly 3 helpers:

- `fetchAll(tableName, filters)` — hardcoded `.select('*')` (line 83); cannot do specific-column SELECTs.
- `batchCreate(tableName, records)` — INSERT batches of 100; requires full records.
- `batchUpdate(tableName, records)` — UPDATE by id; iterates one row at a time; requires `id` in each record (line 156).

There is **no** `selectColumns(tableName, columns, filters)`, no `selectOne(tableName, id, columns)`, no `updateOne(tableName, id, patch)`. The audit's M4-DEBT-02 acknowledged this — the wrappers are inventory-shaped (Module 1's needs), not CRM-shaped.

### Forced migrations would be semantic changes

If the SPEC forces every specific-column SELECT to go through `fetchAll`, that means **fetching every column** instead of the 5-17 specific columns. For views with 30+ columns (`v_crm_event_attendees_full`), that's a 2-6x payload size increase per query. On the Event Day live screen — which polls per minute — this is a real perf regression. The Brief did not authorize semantic changes; only mechanical wrapper conversions.

---

## Why this is an escalation, not a silent proceed

The 2026-05-14 lesson from `M4_REMOVE_CONFIRMED_VERIFIED` was: "every SPEC's authoring step MUST verify the Brief's stated assumptions against live DB/code state BEFORE proceeding. If an assumption is contradicted → escalation, not silent proceed."

The Brief's assumption: "the next ~25-30 calls in the most-frequently-loaded files" exists and is migrateable to current wrappers. Pre-flight finding: of the 8 calls in the 3 named files, **0** are clean migrations to current wrappers. The Brief's premise is contradicted on the migrateability axis.

Per Brief §2.7, this is exactly the case: "A SPEC's premise turns out to be wrong (e.g. data assumption refuted by pre-flight, as happened with REMOVE_CONFIRMED_VERIFIED earlier today)" → STOP, write escalation, continue with independent SPECs.

---

## Options for Daniel

### Option A — Foundational wrapper-extension SPEC first (recommended)

Author a new SPEC `M4_DB_WRAPPER_API_EXTENSION` that adds:
- `selectColumns(table, columnList, filters)` — returns rows with only the requested columns; paginated; tenant-scoped.
- `selectOne(table, idOrFilters, columnList)` — single-row equivalent.
- `updateOne(table, id, patch)` — single-row UPDATE with tenant_id check baked in.

Estimate: 2-3 hours. ~200 lines added to `js/supabase-ops.js`. Smoke = call every wrapper from a smoke harness on demo. Once landed, the wrapper-migration SPECs (Phase 2, Phase 3, etc.) can actually mechanically convert call sites without semantic changes.

### Option B — Document M4 as wrapper-partial

Add a paragraph to `docs/CONVENTIONS.md` stating: "Iron Rule 7 is fully enforced in Modules 1, 2, 3. Module 4 (CRM) is a transition zone — specific-column SELECTs and single-row UPDATEs may use `sb.from()` directly until `M4_DB_WRAPPER_API_EXTENSION` lands." This is an honest documentation of the current state and removes the open-ended ambiguity.

Estimate: 30 minutes. 1 doc edit. No code change.

### Option C — Migrate only the genuine batch UPDATEs (very limited scope)

There ARE some places in M4 that do batch updates or batch creates (`crm-leads-detail-messages.js`, `crm-broadcast-filters.js`) that could legitimately use `batchUpdate` / `batchCreate`. Estimate: 5-10 call sites, ~1 hour. This is a smaller win than the Brief envisaged but is real progress without architectural extension.

---

## What this overnight run will do next

Per Brief §2.7 ("continue with OTHER independent SPECs in the queue"):
- ✅ SPEC #1 already closed GREEN (M4_STATUS_TRIGGER_FRAMEWORK_EXTENSION).
- ⏭ SPEC #2 (this one) — escalated, skipped.
- ➡ SPEC #3 (M4_STATUS_MODEL_FINETUNES) — independent of SPEC #2, proceeds.
- ➡ SPEC #4 (M4_STATUS_MODEL_DOC_UPDATE) — independent of SPEC #2 AND #3, proceeds.

Morning summary will reflect this escalation clearly with a recommendation.

---

## Files in current state

No commits introduced for SPEC #2. Working tree only has the prior SPEC-1 commits (pushed) + pre-existing untracked files (unrelated).

---

*End of escalation file.*
