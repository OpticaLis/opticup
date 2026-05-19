# M4_PIXEL_VALIDATION_GAP_DASHBOARD — Architecture Brief

> **Status:** Brief sealed 2026-05-19 · Owner: Architect · Pipeline: Full-Auto
>
> **One-line:** Read-only ERP dashboard tile + drill-down list showing leads where CAPI dispatched but the browser pixel never fired. Closes FUNNEL Phase 2.2 (the substrate ships in P2.1; this Brief is the consumer of that substrate).
>
> **Risk class:** LOW. Zero schema changes. Zero triggers. Zero EF code. Zero writes. Pure SELECT + frontend tile in ERP.

---

## 1. Goal

Surface the "pixel fire gap" metric Daniel needs to monitor FB CAPI health. After P2.1 + P2.2 substrate landed, every lead has 3 observable states:

1. `fb_event_id IS NULL` — no FB attribution flow (legacy or pre-substrate leads).
2. `fb_event_id IS NOT NULL` + `fb_pixel_fired_at IS NULL` — CAPI dispatched but pixel never fired (the gap we measure).
3. `fb_event_id IS NOT NULL` + `fb_pixel_fired_at IS NOT NULL` — full hybrid success.

This Brief ships a dashboard tile that surfaces state #2 with a 7-day trend and a drill-down list of affected leads.

## 2. Background

**P2.1 closed 2026-05-15:** ERP substrate (EF + queue + cron) shipped + live-verified end-to-end on Prizma 2026-05-19 (10 of 10 last leads `status='sent'` to Meta).

**P2.2 back-wire closed 2026-05-19:** `pixel-fired` EF deployed; storefront thank-you page POSTs to it; `crm_leads.fb_pixel_fired_at` populates when the browser pixel actually fires.

**What this Brief adds:** the visible read of those two columns into a dashboard tile. The knowledge map `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` already authored + tested the queries against live data. This SPEC turns them into UI.

## 3. Scope

**In scope:**

- New JS module `modules/crm/crm-pixel-gap-tile.js` (~80-100 lines). One tile + drill-down.
- Embed the tile in the existing CRM dashboard area (executor pre-flight identifies the parent file — likely `modules/crm/crm-messaging-performance.js` extension or new tab).
- 3 SELECT queries (already authored in the knowledge map, just wire them):
  - Aggregate counter (1 row).
  - 7-day trend (up to 7 rows).
  - Drill-down detail (up to 100 rows).
- Optional partial index on `crm_leads` for query performance — `idx_crm_leads_capi_gap_partial` per the knowledge map §7. **Defer to follow-up** if execution stays under 100ms on demo (current row count is small).
- Hebrew labels, RTL layout per existing CRM conventions.
- Reuse existing helpers: `escapeHtml`, `formatDate`, `fetchAll` from `shared/`.
- One paragraph in `docs/FB_CAPI.md` documenting the dashboard exists.

**Out of scope (explicitly):**

- Any change to `fb-capi-dispatch` or `pixel-fired` EFs (read-only consumer).
- Any change to `crm_leads`, `crm_capi_dispatch_queue` schema, indexes, RLS, or triggers.
- Any change to M4 automation engine, send-message EF, dispatch-queue EF.
- Any change to `crm_message_templates`, `crm_automation_rules`, `crm_status_change_events`.
- Any new placeholder variables (per Iron Rule 35 — Architect SPEC required, but THIS SPEC doesn't need any).
- Phase 2.5 Funnel Health Dashboard (this is a SINGLE TILE; the full dashboard is a separate SPEC).
- Storefront changes.
- Meta API integration beyond what P2.1 already does.

## 4. Cross-Module Safety Audit (NEW SECTION — added 2026-05-19)

This section explicitly enumerates every table/EF/trigger/file the SPEC touches, with a READ/WRITE classification. Executor MUST stop if any item planned for execution falls outside this list.

### 4.1 Database tables — what this SPEC touches

| Table | Access | Reason | Module affected |
|---|---|---|---|
| `crm_leads` | **READ-ONLY** (SELECT) | Aggregate count + 7-day trend + drill-down | M4 (read-only) |
| `crm_capi_dispatch_queue` | **READ-ONLY** (SELECT, LEFT JOIN) | Capi status + processed_at for drill-down | M4 (read-only) |
| `tenants` | **READ-ONLY** (SELECT, implicit via RLS) | Tenant ID binding | M2 (read-only) |

### 4.2 Database tables — what this SPEC EXPLICITLY DOES NOT TOUCH

| Table | M4-relevant | Confirmed unchanged |
|---|---|---|
| `crm_message_log` | yes (M4) | not touched |
| `crm_message_queue` | yes (M4) | not touched |
| `crm_message_templates` | yes (M4) | not touched |
| `crm_automation_rules` | yes (M4) | not touched |
| `crm_automation_runs` | yes (M4) | not touched |
| `crm_status_change_events` | yes (M4) | not touched |
| `crm_event_attendees` | yes (M4) | not touched |
| `crm_events` | yes (M4) | not touched |
| `crm_broadcasts` | yes (M4) | not touched |
| `crm_statuses` | yes (M4) | not touched |
| `crm_lead_touchpoints` | yes (M4) | not touched |
| All M1 / M2 / M3 / M5+ tables | n/a | not touched |

### 4.3 Edge Functions — what this SPEC touches

| EF | Access | Reason |
|---|---|---|
| (none) | — | This SPEC has zero EF touches. Pure frontend + SELECT. |

### 4.4 Edge Functions — what this SPEC EXPLICITLY DOES NOT TOUCH

| EF | Confirmed unchanged |
|---|---|
| `fb-capi-dispatch` | not touched (consumes its output queue only) |
| `pixel-fired` | not touched (consumes its output column only) |
| `automation-engine` | not touched |
| `dispatch-queue` | not touched |
| `send-message` | not touched |
| `lead-intake` | not touched |
| `submit-lead` | not touched |
| `pin-auth` | not touched |
| All other EFs | not touched |

### 4.5 DB triggers — what this SPEC touches

| Trigger | Access | Reason |
|---|---|---|
| (none) | — | Zero trigger work. |

### 4.6 DB triggers — what this SPEC EXPLICITLY DOES NOT TOUCH

| Trigger | Confirmed unchanged |
|---|---|
| `trg_event_status_change_event` | not touched |
| `trg_lead_status_change_event` | not touched |
| `trg_attendee_status_change_event` | not touched |
| `trg_promote_lead_on_message_sent` | not touched |
| All `sync_*_public_trg` (P_DL triggers) | not touched |
| All other triggers | not touched |

### 4.7 RLS policies, GRANTs, schemas

| Surface | Access | Reason |
|---|---|---|
| All RLS policies | not touched | Pure read via existing tenant_isolation policies |
| GRANTs | not touched | No new role, no new privilege |
| Schemas / migrations | not touched | No DDL of any kind |

### 4.8 Files modified (estimated)

| File | New / Modified | Purpose |
|---|---|---|
| `modules/crm/crm-pixel-gap-tile.js` | NEW | The tile + drill-down code |
| Parent page (executor identifies) | MODIFIED | Add `<script>` reference + container div |
| `docs/FB_CAPI.md` | MODIFIED | Add 1 paragraph documenting the tile |

### 4.9 Stop-trigger — Iron Rule cross-module enforcement

If executor pre-flight discovers a need to:
- Add ANY trigger (new or modified) → STOP, escalate.
- Add ANY new table column → STOP, escalate.
- Modify ANY EF source → STOP, escalate.
- Touch ANY of the tables in §4.2 → STOP, escalate.
- Add ANY new placeholder variable to a template → STOP, escalate (Iron Rule 35).

The Brief authorizes ONLY what's in §4.1 + §4.3 + §4.5 + §4.8. Anything beyond → Architect must approve in chat.

---

## 5. Locked Decisions

**D1. Single tile, not a full dashboard.** A "Pixel/CAPI Gap" metric is one of many funnel metrics. Phase 2.5 will assemble many tiles into a dashboard. This SPEC ships ONE tile — to ship something useful TODAY without waiting on Phase 2.5.

**D2. Embed in an existing CRM screen, not a new page.** Pre-flight identifies the parent — likely `modules/crm/crm-messaging-performance.js` or similar metrics-page. No new route / no new permission.

**D3. Drill-down opens a modal, not a new page.** Reuse `Modal` from `shared/`. Same pattern as existing CRM modals.

**D4. Performance threshold: queries < 100ms p95.** If demo measurement exceeds 100ms → executor ships the partial index from the knowledge map §7 as part of the SPEC. If < 100ms → defers index to a follow-up SPEC.

**D5. Banner removed.** The "back-wire unverified" banner per knowledge map §4 is no longer needed — `pixel-fired` EF deployed and `fb_pixel_fired_at` populates correctly. Skip the banner.

**D6. Hebrew labels per existing CRM conventions.** No new translation work.

**D7. No real-time refresh.** Tile loads on page load. User refreshes the page to refresh. (Real-time updates are Phase 2.5 work, if at all.)

## 6. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` from this Brief at `modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/SPEC.md`.
2. **Executor (opticup-executor)** implements the tile + drill-down. Default model: Sonnet (mechanical JS + SQL, no security-vocab heavy work).
3. **Reviewer (opticup-reviewer)** validates: cross-module safety audit §4 holds (no surprise touches), Iron Rule 12 (file size), Iron Rule 21 (no duplicate component), queries match knowledge map §2 + §3.
4. **Localhost-Tester** runs smoke 7/7 + opens the page in Chrome MCP, asserts tile renders with non-error state, opens drill-down modal, asserts drill-down query runs.
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill improvement proposals.

## 7. Success Criteria

1. `modules/crm/crm-pixel-gap-tile.js` exists, ≤ 100 lines.
2. Tile renders on the chosen CRM screen, shows aggregate count + percentage + sparkline.
3. Clicking "view affected leads" opens a modal with the drill-down list.
4. All 3 queries from knowledge map §2 used verbatim (no SQL re-authoring; if executor must adjust, document why in FINDINGS).
5. Queries p95 < 100ms on demo (executor measures via DevTools Network panel during smoke).
6. If p95 > 100ms → partial index from knowledge map §7 created as part of SPEC.
7. Tile gracefully handles 0-state (no `fb_event_id` leads → "אין נתונים עדיין" instead of error).
8. Drill-down respects PIN permission (CRM admin role only).
9. Smoke 7/7 PASS.
10. Iron Rule 31 integrity gate passes.
11. Cross-Module Safety Audit §4 holds — Reviewer verifies no item in §4.2/§4.4/§4.6 was touched.
12. Working tree clean at SPEC close.

## 8. Stop-Triggers

Per §4.9 + Brief §9 standard list:

- Executor finds need to touch any item in §4.2, §4.4, §4.6 → STOP.
- Executor finds need to add new placeholder, trigger_type, or action_type → STOP.
- Queries return errors or unexpected shapes (knowledge map said tested live, so unlikely).
- Iron Rule 31 fails.
- Smoke regresses.
- More than 2 placement candidates exist for the tile (need Daniel input on which).

## 9. Rollback Plan

Pure revert. Tile file deleted, parent file diff reverted. No schema, no triggers, no EF, no migrations → nothing to undo at DB level. Working tag `pre-pixel-gap-dashboard` at SPEC start.

## 10. Expected Final State

- 1 new file (`crm-pixel-gap-tile.js`).
- 1 modified parent file (+ `<script>` reference + container div).
- 1 modified doc (`docs/FB_CAPI.md` paragraph).
- Possibly 1 new index migration (if p95 > 100ms — gated).
- Demo smoke 7/7 + tile renders.

## 11. Commit Plan

- C1: `modules/crm/crm-pixel-gap-tile.js` + parent embed.
- C2: docs update + FOREMAN_REVIEW.

(If index gated → C2-pre: migration; C2: docs.)

## 12. Cross-References

- `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` — queries + UI sketch + index recommendation.
- `M4_FB_CAPI_HYBRID_DEDUPLICATION` (P2.1, closed 2026-05-15).
- `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` (closed 2026-05-15).
- `M3_FUNNEL_PIXEL_BACKWIRE` (closed 2026-05-19).
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — confirmed no template/rule/placeholder changes needed (this SPEC is pure read).
- Iron Rules 12, 21, 23, 31, 32, 35.

## 13. Author Notes

This is the smallest customer-visible deliverable in the FUNNEL Phase 2. It exists for one reason: surface a number that Daniel can use to decide if the pixel firing chain is healthy day-to-day. After this lands, the next time the pixel chain breaks (e.g., ad-blocker prevalence rises, storefront thank-you page changes URL pattern, redirect chain breaks), the number on the dashboard will signal it before customers notice.

The Cross-Module Safety Audit §4 is a new pattern starting with this Brief. It exists because M4 spent half a day on cross-module surprises that should have been caught at SPEC-author time. Every future Brief I author will include this section.

---

*End of Brief. Activation Prompt in sibling file `M4_PIXEL_VALIDATION_GAP_DASHBOARD_ACTIVATION_PROMPT.md`.*
