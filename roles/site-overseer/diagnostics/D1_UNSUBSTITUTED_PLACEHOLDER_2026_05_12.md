# D1 — Unsubstituted-Placeholder Count for 2026-05-12 Broadcast Event

> **Task source:** `roles/site-overseer/FUNNEL_ROADMAP.md` → Diagnostic Tasks → D1.
> **Run mode:** read-only diagnostic, zero DB writes.
> **Run date:** 2026-05-14 (overnight Tier C.2 of OVERNIGHT_BUNDLE_2026_05_14).
> **Author:** Site Overseer (read-only agent).
> **Window queried:** `created_at >= 2026-05-12 00:00:00+00 AND < 2026-05-13 00:00:00+00`.
> **Tenants queried:** `demo` (`8d8cfa7e-ef58-49af-9702-a862d459cccb`) + `prizma` (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`).

---

## Executive Summary

The 2026-05-12 broadcast event surfaced exactly **7 fail-CLOSED rejections** on the **demo** tenant — all identical: SMS channel, template `event_will_open_tomorrow_sms_he` (id `9f41b6e1-b246-414a-a28a-fcd5a0f92fe5`), error `unsubstituted_placeholder: event_max_attendees`. Three distinct demo recipients (Daniel's two personal phones plus one third demo seed) received 0 SMS — the universal scanner at `send-message/index.ts:263-278` blocked every send before it left the dispatch path. **Zero prizma rejections in the 2026-05-12 window** — the production tenant was untouched by this defect on the day in question. The 7 rows match `GUARDIAN_ALERTS.md` M-NEW-28-1 byte-for-byte (first row 11:10:22.697682+00, last row 11:18:41.398804+00). Two corresponding `crm_broadcasts` rows (`b7c9a6d6-…` at 11:10:21 + `66fd7fb6-…` at 11:12:17) both ended `status='partial'` with `total_sent=0`. This is exactly the desired fail-CLOSED behavior: garbled-content delivery was prevented.

The much larger story is **outside** the requested D1 window but flagged here for completeness: on **2026-05-13** the prizma tenant suffered **758 rejections** with `unsubstituted_placeholder: registration_url` between 06:13:01 and 06:32:06 (~19 minutes), all with `template_id=NULL` and `broadcast_id=NULL` on the log row — every distinct recipient (758/758) only once. That is the same fail-CLOSED catch class. The recipient blast pattern + bypassed bookkeeping make this the more urgent SPEC target. A single demo `unsubstituted_placeholder: nonsense` row also appeared on 2026-05-13 (clearly a smoke-test from a Foreman session). D1's scope is the 2026-05-12 demo cluster; the 2026-05-13 prizma cluster is recommended as a separate but adjacent follow-up.

---

## 1. Per-Tenant Breakdown (D1 window: 2026-05-12 only)

| Tenant | Status | Rows | First seen (UTC) | Last seen (UTC) | Channel | Template | Error verbatim |
|---|---|---:|---|---|---|---|---|
| `demo` | `failed` | **7** | `2026-05-12 11:10:22.697682+00` | `2026-05-12 11:18:41.398804+00` | sms | `event_will_open_tomorrow_sms_he` (`9f41b6e1-b246-414a-a28a-fcd5a0f92fe5`) | `unsubstituted_placeholder: event_max_attendees` |
| `prizma` | (none) | **0** | — | — | — | — | — |

**Total D1-window rejections:** 7. **Total demo D1-window rejections:** 7. **Total prizma D1-window rejections:** 0.

### Row-level detail (all 7 demo rows)

| # | log_id | created_at (UTC) | recipient phone pattern | lead_id | event_id | broadcast_id | run_id |
|---|---|---|---|---|---|---|---|
| 1 | `fc162f7b-20cf-4f10-8ff2-7d0e1860b50f` | 2026-05-12 11:10:22.697682+00 | `+97250334XXXX` | `efc0bd54-c6ed-4430-9552-018935a7ebbc` | NULL | NULL | NULL |
| 2 | `ad502f9c-3bfc-43e5-b672-28fe0471cc8d` | 2026-05-12 11:10:22.700837+00 | `+97253788XXXX` | `152e6188-2af6-413e-86b1-a44f15e71e66` | NULL | NULL | NULL |
| 3 | `1832e3ce-947e-447f-a590-58d9c57cb8ec` | 2026-05-12 11:10:22.763987+00 | `+97250716XXXX` | `a7f5e308-878c-4431-90af-0200595dce4a` | NULL | NULL | NULL |
| 4 | `36e4ddf0-bd86-4b53-b72b-fb135712c82d` | 2026-05-12 11:12:19.005224+00 | `+97253788XXXX` | `152e6188-2af6-413e-86b1-a44f15e71e66` | NULL | NULL | NULL |
| 5 | `c2729307-1fec-4a24-8160-332a0fead785` | 2026-05-12 11:12:19.015491+00 | `+97250334XXXX` | `efc0bd54-c6ed-4430-9552-018935a7ebbc` | NULL | NULL | NULL |
| 6 | `a0e16213-818e-45b7-a2b6-32c4bddef553` | 2026-05-12 11:12:19.036409+00 | `+97250716XXXX` | `a7f5e308-878c-4431-90af-0200595dce4a` | NULL | NULL | NULL |
| 7 | `49b9d757-af89-45a8-a7a0-627f6a2c4fb4` | 2026-05-12 11:18:41.398804+00 | `+97250716XXXX` | `a7f5e308-878c-4431-90af-0200595dce4a` | NULL | NULL | NULL |

Recipients: 3 distinct demo leads (3 phones). Note that `broadcast_id` is NULL on every row — this predates P1.2 (`M4_BROADCAST_ID_PROPAGATION`, closed 2026-05-14), which is exactly why the corresponding `crm_broadcasts` rows below have `total_sent=0` rather than `total_sent=7`. Post-P1.2 these 7 would have been attributed to the parent broadcast.

### Linked `crm_broadcasts` rows (same window, demo)

| broadcast_id | created_at (UTC) | template_id | status | total_sent |
|---|---|---|---|---|
| `b7c9a6d6-5e80-4652-b174-ee0e28143467` | 2026-05-12 11:10:21.645671+00 | `9f41b6e1-b246-414a-a28a-fcd5a0f92fe5` | `partial` | 0 |
| `66fd7fb6-90c1-4d94-9376-d1864afe6700` | 2026-05-12 11:12:17.66737+00 | `9f41b6e1-b246-414a-a28a-fcd5a0f92fe5` | `partial` | 0 |

These are the parent broadcasts that produced the 7 fail-CLOSED rejections. Each was scheduled 3 recipients deep; recipient 3 (`+97250716XXXX`) was retried at 11:18:41 from a separate path that didn't create a parent broadcast row (run/automation-triggered, not manual broadcast).

---

## 2. Top Placeholder Names Ranked by Failure Count

### 2a. Within the D1 window (2026-05-12 only)

| Rank | Tenant | Placeholder | Failures |
|---:|---|---|---:|
| 1 | demo | `event_max_attendees` | 7 |

(only one placeholder appears in the D1 window; all other tenants/dates are zero.)

### 2b. All-time, for context (cross-window — both tenants)

| Rank | Tenant | Placeholder | Failures | First seen (UTC) | Last seen (UTC) |
|---:|---|---|---:|---|---|
| 1 | **prizma** | `registration_url` | **758** | 2026-05-13 06:13:01.713039+00 | 2026-05-13 06:32:06.886937+00 |
| 2 | demo | `event_max_attendees` | 7 | 2026-05-12 11:10:22.697682+00 | 2026-05-12 11:18:41.398804+00 |
| 3 | demo | `nonsense` | 1 | 2026-05-13 07:05:02.896695+00 | 2026-05-13 07:05:02.896695+00 |

**Why row 1 matters for D1's spirit:** the question Daniel asked in Q5 (KNOWLEDGE_MAP.md Layer 6) was triggered by a screenshot of `unsubstituted_placeholder: registration_url` — almost certainly one of these 758 prizma rows from 2026-05-13. It is therefore the strongest evidence that the fail-CLOSED pattern is doing its job at production scale, but it is also a much louder fire than D1's 7 demo rows.

---

## 3. Where the `event_max_attendees` Placeholder Lives in the Template Library

Cross-tenant inventory: **21 active templates currently reference `%event_max_attendees%`** (10 demo + 10 prizma + 1 demo duplicate slug). Both tenants have a 1:1 mirror — every demo template has a matching prizma template by slug. The placeholder appears in:

| Template slug (both tenants) | Channel | Hits in body |
|---|---|---:|
| `event_will_open_tomorrow_sms_he` | sms | 1 |
| `event_will_open_tomorrow_email_he` | email | 2 |
| `event_invite_new_sms_he` | sms | 1 |
| `event_invite_new_email_he` | email | 2 |
| `event_invite_waiting_list_sms_he` | sms | 1 |
| `event_invite_waiting_list_email_he` | email | 2 |
| `event_registration_open_sms_he` | sms | 1 |
| `event_registration_open_email_he` | email | 3 |
| `event_waiting_list_email_he` | email | 2 |
| `event_day_email_he` | email | 2 |

**Risk assessment:** prizma has the IDENTICAL `event_will_open_tomorrow_sms_he` template (id `a18a9670-bdde-4cf2-99f4-870448f9f736`) ready to fire. If the same status-change trigger that ran on demo at 11:10:21 / 11:12:17 ever fires on a prizma event with the same payload shape, prizma will hit the SAME fail-CLOSED catch — the only thing preventing 0 prizma rejections on 2026-05-12 was that the trigger did not fire on prizma that day. **All 10 prizma templates are loaded gunpowder.** Recommend remediation BEFORE the next prizma event reaches the `will-open-tomorrow` state.

---

## 4. Recommended Remediation

Two paths, in priority order:

### 4a. Immediate — bind `event_max_attendees` in the variable map for the status-change framework

The status-change framework template engine builds a `vars` bag and hands it to `send-message`. The 7 demo rows show the bag was missing `event_max_attendees`. Two acceptable fixes (Foreman to choose in the SPEC):

1. **Bind the variable** — add `event_max_attendees: <crm_events.max_attendees_per_event or similar column>` to the variable-building path that fires on `event_will_open_tomorrow` (and verify the same path covers the other 9 `%event_max_attendees%` templates). This is the no-template-edit path and preserves the marketing copy.
2. **Remove the placeholder from the 10 templates** — drop `%event_max_attendees%` from each body. Faster but loses the personalization. Daniel's SaaS-rule discipline (no hardcoded business values, Rule 9) makes this a worse choice if the value can be sourced from a column.

**Recommended:** option 1 (bind), because the value exists per-event in `crm_events` and per-tenant in tenant config. Removing it would degrade message quality.

### 4b. Adjacent — open a sibling SPEC for the 758 prizma `registration_url` rejections (2026-05-13)

Out of D1 scope but adjacent. Same fail-CLOSED class. Recommend a sibling SPEC after the D1 SPEC lands. The 758 rows have `template_id=NULL` on the log row, which suggests a different dispatch path than the M-NEW-28-1 cluster (manual broadcast or a Make-scenario-fired path that pre-dates broadcast_id propagation). Worth a separate trace.

---

## 5. Recommended Next SPEC

Per `GUARDIAN_ALERTS.md` M-NEW-28-1 the SPEC slug is already named:

**`M4_FIX_UNSUBSTITUTED_PLACEHOLDER_EVENT_MAX_ATTENDEES`**

- **Location:** `modules/Module 4 - CRM/docs/specs/M4_FIX_UNSUBSTITUTED_PLACEHOLDER_EVENT_MAX_ATTENDEES/SPEC.md`.
- **Owner:** opticup-strategic (M4 Foreman).
- **Estimated:** ~10-15 minutes (per M-NEW-28-1; verified — single variable to bind, one path to touch, then a 7-row smoke test on demo).
- **Scope:** bind `event_max_attendees` in the status-change framework's variable bag for all 10 demo + 10 prizma templates that reference it. Re-run the M-NEW-28-1 trigger sequence on demo, expect 3 sent rows (not 3 rejected).
- **Verification gate:** after the SPEC ships, repeat this diagnostic query for any window post-fix → expect 0 new `unsubstituted_placeholder: event_max_attendees` rows on either tenant.
- **Sibling SPEC (separate folder, not bundled):** `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA` — covers the 758-row prizma cluster from 2026-05-13. Sibling rather than bundled because the dispatch path differs (`template_id=NULL` on log rows points at a different code path than the status-change framework).

---

## Appendix A — SQL run for this diagnostic (read-only)

All queries used `mcp__claude_ai_Supabase__execute_sql` against project `tsxrrxzmdxaenlvocyit` in SELECT-only mode. Zero writes. No DDL. No `apply_migration`.

Queries executed:

1. Aggregate count of failed/rejected/placeholder-error rows per tenant + status, 2026-05-12 window.
2. Detail of 7 demo `failed` rows (with template + lead phone pattern, phone masked to last-4-XXXX).
3. Template-body sweep for `%event_max_attendees%` across both tenants (metadata only — body length + hit count, not the full body, to stay within token limits).
4. All-time aggregation of `unsubstituted_placeholder` errors grouped by placeholder name + tenant.
5. Drill on the prizma `registration_url` cluster: per-template + per-recipient + per-broadcast attribution.
6. `crm_broadcasts` rows in the 2026-05-12 window.
7. Column-introspection queries on `crm_message_log` and `crm_message_templates`.

---

## Appendix B — Cross-References

- `roles/site-overseer/FUNNEL_ROADMAP.md` § Diagnostic Tasks → D1.
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Layer 5 (lines 240-247) and Layer 6 (lines 252-278) — `crm_message_log` schema and Pattern P33 Fix B (universal scanner at `send-message/index.ts:263-278`).
- `docs/guardian/GUARDIAN_ALERTS.md` § M-NEW-28-1 — Sentinel's prior surfacing of this exact cluster.
- Modules: Module 4 (CRM) — owner of `crm_message_log`, `crm_message_templates`, `crm_broadcasts`, status-change framework.
- Phase 1 SPECs closed 2026-05-14: P1.4 (RPC map), P1.1 (UTM triple-layer), P1.2 (broadcast_id propagation), P1.3 (short.gy → internal).

---

*End of D1 diagnostic. Read-only run. No DB writes performed.*
