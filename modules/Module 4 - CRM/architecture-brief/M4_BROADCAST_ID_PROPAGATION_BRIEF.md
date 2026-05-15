# M4_BROADCAST_ID_PROPAGATION — Architecture Brief

**Type:** Phase 1 P1.2 of `roles/site-overseer/FUNNEL_ROADMAP.md`. Third execution-SPEC of Phase 1 (after P1.4 RPC map + RETURN_SHAPE_FIX + P1.1 UTM Triple Layer, all closed 2026-05-14).

**Purpose:** Wire `broadcast_id` end-to-end through the messaging chain so every dispatched message AND every resulting short-link click + downstream touchpoint can be attributed to its originating broadcast with certainty (not heuristic). Closes the broadcast-bookkeeping gap that has been broken since 2026-05-12 — today `crm_broadcasts.total_sent` is never updated and no `broadcast_id` exists on `crm_message_queue` / `crm_message_log` / short-link clicks.

**Decision context (Daniel + Architect, 2026-05-14):**
- **Option X chosen** — broadcast_id encoded explicitly in every short-link URL emitted by a broadcast.
- **Option Y rejected** — time-window heuristic join would give "probably this broadcast" not "definitely this broadcast"; unacceptable for the marketing-maturity tier Daniel is building toward.

---

## 1. Scope

**In scope (end-to-end broadcast attribution chain):**

1. **DB additions:**
   - `crm_message_queue.broadcast_id uuid NULL` (FK to `crm_broadcasts.id`, indexed).
   - `crm_message_log.broadcast_id uuid NULL` (FK, indexed).
   - `short_link_clicks.broadcast_id uuid NULL` (FK, indexed) — captures broadcast attribution on every click.
   - `crm_lead_touchpoints.broadcast_id` already exists per P1.1 — confirm wired here.
   - All RLS unchanged (existing tenant_id-scoped policies cover the new FK columns automatically).
   - Index strategy: `(tenant_id, broadcast_id, created_at)` composite on each of the 4 tables for the dashboards in Phase 2.5.

2. **Broadcast send-path changes** (the path that enqueues messages when a broadcast fires):
   - When `crm_broadcasts.send` (or equivalent dispatcher) writes rows to `crm_message_queue`, it MUST populate `broadcast_id` on each row.
   - Every short-link the broadcast embeds (`/r/<code>`) gets a per-broadcast unique code OR a query-string broadcast tag — Foreman picks one of:
     - **X1 (code-level):** Each broadcast generates fresh short-link codes pointing to the same target URL. `short_links.broadcast_id` stamped at code creation. → cleanest, no URL noise.
     - **X2 (query-string):** Existing short-link codes are reused; broadcast tag is appended as `?b=<broadcast_id>` (or short alias). `resolve-link` EF reads + records on click. → simpler enqueue, slightly noisier URLs.
   - Foreman MUST pick one and document the rationale; Architect's leaning is X1 (cleaner SaaS-clean separation, no URL noise visible to users).

3. **`send-message` EF changes** (the function that actually drains the queue and calls Make):
   - Propagate `broadcast_id` from `crm_message_queue` row to `crm_message_log` row 1:1.
   - No new external call needed; pure column propagation.

4. **`resolve-link` EF changes** (the function that handles `/r/<code>` clicks):
   - On click: look up `broadcast_id` per the X1/X2 mechanism chosen.
   - Record `broadcast_id` on the new `short_link_clicks` row AND on the `crm_lead_touchpoints` row created from this click (P1.1 wiring).

5. **`register_lead_to_event` RPC changes** (per P1.4 we now have the canonical body):
   - Accept optional `p_broadcast_id uuid` param.
   - Propagate to the `crm_lead_touchpoints` row emitted on event_register.

6. **Counter update — `crm_broadcasts.total_sent`:**
   - Triggered post-drain. Foreman picks: synchronous UPDATE per-row vs. periodic aggregation pg_cron job vs. one final UPDATE when the queue for the broadcast is empty. Architect's leaning: **periodic aggregation pg_cron** (every 1 min) — single-source-of-truth from `crm_message_log` count, idempotent, recoverable. Same pattern as the consumer queue introduced in `STATUS_CHANGE_TRIGGERS_FRAMEWORK`.

7. **Backfill — historical broadcasts (2026-05-12 onward):**
   - Heuristic backfill is BLOCKED by Option-X decision (we explicitly rejected heuristic). Skip backfill. Document the 2026-05-12 → 2026-05-14 gap as known unattributed in FINDINGS.md (acceptable — this is "from now on, every broadcast is measurable" not retro-active).

**Out of scope:**

- Backfill of historical broadcasts (per §1.7 above — skipped by Option-X choice).
- Per-channel broadcast attribution (SMS vs Email vs WhatsApp) at the touchpoint level — already covered by existing `crm_message_log.channel` column.
- Broadcast performance dashboard UI — Phase 2.5.1.
- CAPI integration — Phase 2 P2.1.
- Changing the broadcast dispatcher's targeting logic, audience selection, scheduling, or any business logic beyond `broadcast_id` propagation.
- New broadcast types or templates.

---

## 2. Critical Design Constraints

**Forward-compat (per FUNNEL_ROADMAP Phase 4):**

- **E1 (MTA Engine):** broadcast_id now lives on every touchpoint → distributable across attribution models without further schema change.
- **E4 (Creative A/B at scale):** if each variant becomes its own broadcast, broadcast_id IS the creative_id. Foreman documents this in SPEC.
- **E6 (Cross-channel orchestration):** broadcast_id chains naturally with `parent_message_id` / `chain_id` fields when those land in a future SPEC.

**SaaS-clean (Iron Rules 14, 15, 18, 20):**

- All new columns: `tenant_id`-aware via inherited table tenant_id, indexes scoped, RLS unchanged.
- No tenant-specific behavior in the code paths.
- Multi-tenant: the same broadcast row from tenant A can never collide with tenant B's because broadcast_id is uuid + tenant_id scoping is preserved.

**Backward compatibility:**

- `crm_message_queue.broadcast_id` is NULL-able → existing flows (lead-intake auto-message, manual sends, event automations) that aren't broadcasts continue working with broadcast_id=NULL.
- All readers of `crm_message_log` (CRM UI, retry-failed EF, etc.) continue working — they just see an additional optional column.
- `register_lead_to_event` gains an optional param with NULL default → P1.1 + earlier callers still work.

**Performance & cost:**

- 4 new indexed columns. ~5-10ms added to broadcast-row enqueue (negligible).
- pg_cron counter UPDATE: 1 query per minute scanning recently-completed `crm_message_log` rows by broadcast_id. < 50ms per run.
- Volume: ~3-5 broadcasts/month at current Prizma scale, ~hundreds of messages each → trivial.

---

## 3. Method (high-level for Foreman)

1. **Foreman authors SPEC.** Includes: 4-column-add migration + RPC modification + 2 EF changes + pg_cron job + integration test plan covering the full chain (broadcast send → queue → log → click → touchpoint → counter).

2. **Executor runs migrations** via MCP `apply_migration` in order:
   - Add 4 columns + indices + FKs.
   - Modify `register_lead_to_event` (CREATE OR REPLACE) to accept p_broadcast_id.
   - Create pg_cron job for total_sent aggregation.

3. **Executor deploys EFs:**
   - `send-message` (broadcast_id propagation from queue → log).
   - `resolve-link` (broadcast_id capture on click → short_link_clicks + touchpoints).
   - Per the newly-encoded `opticup-executor/SKILL.md` rule: MCP-first, auto-fall-back to CLI on 5xx, no Daniel interaction needed.

4. **Executor runs integration test on demo:**
   - Create a test broadcast with 1 recipient + 1 short-link URL.
   - Verify: `crm_message_queue` row has broadcast_id. `crm_message_log` post-drain row has broadcast_id. Click the short-link → `short_link_clicks` row has broadcast_id, `crm_lead_touchpoints` row has broadcast_id. Wait 1 min for pg_cron → `crm_broadcasts.total_sent` updated.

5. **Reviewer verifies success criteria.**

6. **Localhost-Tester runs smoke 7/7 PASS** pre and post.

7. **Foreman closes** with FOREMAN_REVIEW.

---

## 4. Destructive Operations

**None.**

- Migrations are additive columns + new pg_cron job.
- `register_lead_to_event` modification is `CREATE OR REPLACE`.
- EF updates are version increments.
- Zero DROP, zero ALTER…DROP, zero file deletions, zero historical-broadcast backfill writes, zero main deploys.

If any deviation surfaces requiring a destructive op mid-run → STOP, escalate.

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | `crm_message_queue` + `crm_message_log` + `short_link_clicks` each have `broadcast_id uuid NULL` + FK to `crm_broadcasts(id)` + composite index `(tenant_id, broadcast_id, created_at)` | `\d+` per table |
| 2 | `crm_lead_touchpoints.broadcast_id` continues to populate end-to-end through new flows (P1.1 carry-over) | demo integration test |
| 3 | Demo broadcast → queue → log → click → touchpoint → counter chain: every row in the chain has matching broadcast_id | demo integration test |
| 4 | `register_lead_to_event` accepts optional `p_broadcast_id` param with NULL default; old callers (no param) still work | re-run P1.4 caller inventory queries |
| 5 | pg_cron `crm_broadcast_total_sent_refresh` runs every 1 min + UPDATEs `total_sent` from `crm_message_log` count | `pg_cron.job` query + observe over 2 min |
| 6 | `send-message` EF version incremented; broadcast_id propagated from queue row to log row 1:1 | `get_edge_function` + smoke |
| 7 | `resolve-link` EF version incremented; broadcast_id captured on click per X1/X2 mechanism | `get_edge_function` + smoke |
| 8 | All existing automation rules continue to fire (no broadcast_id required) — lead-intake auto-message, event-automations, manual sends still work | smoke + manual probe |
| 9 | Prizma untouched: zero writes during SPEC's session against Prizma `crm_broadcasts` / `crm_message_log` / `short_link_clicks` | audit log check |
| 10 | Smoke 7/7 PASS pre- AND post-migration | `npm run smoke` |
| 11 | Integrity gate exit 0 | `npm run verify:integrity` |
| 12 | KNOWLEDGE_MAP.md Layer 5 (Broadcasts) updated with broadcast_id chain documented | grep |
| 13 | FUNNEL_ROADMAP.md P1.2 status flipped to ✅ CLOSED | grep |
| 14 | Repo clean at close | `git status` |

---

## 6. Notes for the Foreman

- **Critical decision in §1.2:** X1 (per-broadcast short-link codes) vs X2 (query-string broadcast tag). Architect's leaning is X1. Foreman should validate by checking what `short_links` table looks like today — if codes are already 1:1 to events (not broadcasts), X1 means creating fresh codes per broadcast; if codes are reused, X2 is less disruptive. Foreman picks AND documents rationale in SPEC.
- **Critical decision in §1.6:** counter update mechanism. Architect's leaning: pg_cron periodic aggregation. Foreman validates the same pg_cron infrastructure used by `STATUS_CHANGE_TRIGGERS_FRAMEWORK` consumer is available + Foreman picks the schedule cadence (1 min vs 5 min).
- **Backfill is OUT OF SCOPE** by design. The 2026-05-12 → 2026-05-14 broadcast gap is documented as known-unattributed; Phase 2.5 dashboards filter to "broadcasts after 2026-05-14" for clean charts.
- **Mandatory backup** under `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M4_BROADCAST_ID_PROPAGATION/` — touches >5 files: 2 EFs + RPC + migration + KNOWLEDGE_MAP + FUNNEL_ROADMAP + SESSION_CONTEXT.
- **Estimated effort:** 3-4 hours including tests.

---

## 7. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat. Standard STOP triggers from CLAUDE.md §9 + the SPEC-specific list below:

- The chosen X1/X2 mechanism breaks the existing short-link click resolution → STOP, do NOT proceed.
- pg_cron job UPDATEs the wrong counter (e.g. total_attempted instead of total_sent) → STOP, fix the query.
- Any caller of `register_lead_to_event` breaks on new param → STOP.
- Touchpoint INSERT inside RPC transaction fails (broadcast_id chain regression from P1.1) → STOP.
- `send-message` EF fails to drain queue after redeploy → STOP, this is a production breaker.
- Smoke <7/7 PASS pre-migration → STOP, something regressed.

End of Brief.
