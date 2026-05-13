# M4_MESSAGE_PERFORMANCE_TRACKING — SPEC

**Author:** opticup-strategic (Foreman)
**Module owner:** Module 4 — CRM
**SPEC date:** 2026-05-14
**Source Brief:** `modules/Module 4 - CRM/architecture-brief/MESSAGE_PERFORMANCE_TRACKING_BRIEF.md` (v1)
**Safety tag:** `pre-message-performance-tracking-2026-05-14` (already pushed)
**Model:** Sonnet (CRUD-shaped — DDL + EF extensions + view + UI panel)

---

## 1. Goal

Wire per-message click tracking end-to-end so Daniel can compare copywriting variants (`template_slug` A vs B) and see which produced more registrations for a given event. Today, the `resolve-link` EF redirects clicks but only bumps a `short_links.click_count` counter — there is no per-click row, no linkage from a short link to the `crm_message_log` row that generated it, and no analytics view.

After this SPEC:
- Every `/r/<code>` click writes one row to a new `short_link_clicks` table (sha256 IP hash, truncated UA + referer, 30s idempotency per `(short_link_id, ip_hash)`).
- Every `short_links` row created during `send-message` is linked to its `crm_message_log.id` via a new nullable column.
- A new SQL view `v_crm_message_performance` aggregates `messages_sent / messages_clicked / click_rate / registrations_after_click / conversion_rate` per `(tenant_id, event_id, template_id, channel)`.
- A new sub-tab inside CRM Messaging Hub titled "📊 ביצועי הודעות" renders that view as a sortable RTL Hebrew table.

---

## 2. Scope

### 2.1 Click capture (new table)

**Decision: separate `short_link_clicks` table** (one row per click event), NOT a JSONB-array extension to `short_links`. Rationale: the analytics view needs `MAX(clicked_at) > registered_at` semantics on individual click rows, and 30-second idempotency is most naturally expressed as a per-row partial unique index.

Schema (final):
```sql
CREATE TABLE public.short_link_clicks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id),
  clicked_at    timestamptz NOT NULL DEFAULT now(),
  ip_hash       text NULL,          -- sha256 hex, 64 chars
  user_agent    text NULL,          -- truncated to 200 chars in EF
  referer       text NULL,          -- truncated to 200 chars in EF
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

Indexes:
- `(short_link_id, clicked_at)` — drives view joins.
- `(tenant_id, clicked_at)` — drives tenant-scoped queries.
- 30s idempotency: enforced in the EF (debounce window query) rather than as a DB UNIQUE, because the 30s window does not map to a UNIQUE constraint. A partial unique index `(short_link_id, ip_hash, date_trunc('minute', clicked_at))` was considered and rejected — it would block legitimate clicks at minute boundaries.

### 2.2 short_links → crm_message_log linkage

**Decision: nullable column + backfill in `send-message` after the log row exists** (Brief §2.2 Option B). Rationale: the log row's `id` is DB-generated and not known when `injectAutoUrls` creates the short links. Pre-generating the UUID in TS works but couples `send-message` and `dispatch.ts` more tightly than needed. The backfill UPDATE is one cheap query at the end of the happy path.

```sql
ALTER TABLE public.short_links
  ADD COLUMN message_log_id uuid NULL
    REFERENCES public.crm_message_log(id) ON DELETE SET NULL;

CREATE INDEX idx_short_links_message_log_id
  ON public.short_links(message_log_id) WHERE message_log_id IS NOT NULL;
```

**Flow change in `send-message`:**
1. `injectAutoUrls` is modified to return the short_link IDs it created (was: `void`).
2. `writeDispatchAndSend` in `dispatch.ts` accepts the returned IDs and, immediately after the pending `crm_message_log` insert returns the log row's `id`, runs:
   `UPDATE short_links SET message_log_id = $logId WHERE id = ANY($shortLinkIds)`
3. Failure paths above `injectAutoUrls` (template_not_found, missing_required_variable, suppression gate) are unaffected — they fail before short links are created.
4. Failure paths below `injectAutoUrls` (payment_url_mismatch, unsubstituted, phone_not_allowed) DO create short_links rows but do NOT create a corresponding `sent` log row. Those orphan short_links keep `message_log_id IS NULL` — correct behavior (they were never the source of an actually-sent message).

### 2.3 Analytics view

```sql
CREATE OR REPLACE VIEW public.v_crm_message_performance AS
SELECT
  m.tenant_id,
  m.event_id,
  m.template_id,
  m.channel,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'sent')                                            AS messages_sent,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'sent' AND c.id IS NOT NULL)                       AS messages_clicked,
  COUNT(DISTINCT a.id) FILTER (WHERE a.registered_at > c.clicked_at AND a.is_deleted = false)      AS registrations_after_click
FROM public.crm_message_log m
LEFT JOIN public.short_links sl       ON sl.message_log_id = m.id
LEFT JOIN public.short_link_clicks c  ON c.short_link_id   = sl.id
LEFT JOIN public.crm_event_attendees a
       ON a.tenant_id = m.tenant_id
      AND a.lead_id   = m.lead_id
      AND a.event_id  = m.event_id
WHERE m.template_id IS NOT NULL
GROUP BY m.tenant_id, m.event_id, m.template_id, m.channel;
```

Click-rate and conversion-rate are computed in the UI rather than in the view, since the view's GROUP BY rows are the natural shape and pct columns just divide two numbers we already have. (Brief §2.3 spec asks for `click_rate_pct` + `conversion_rate_pct` — I'm implementing them as computed in the UI table; if the Reviewer or Daniel prefers them in the view, that's a trivial cosmetic change.)

**Security_invoker:** `security_invoker = on` on the view so RLS on the underlying tables (already canonical 2-policy on `crm_message_log` + `short_links`; will be canonical on `short_link_clicks`) determines visibility per the calling JWT. No extra GRANT to anon.

### 2.4 UI panel

- New 5th sub-tab in `crm-messaging-tab.js` `SUB_TABS` array: `{ key: 'performance', label: '📊 ביצועי הודעות' }`.
- New file `modules/crm/crm-messaging-performance.js` exposing `window.renderMessagingPerformance(host)`.
- Rendered table columns: event name + template slug + channel + sent + clicked + click_% + registrations + conversion_%. Sortable by any column (click headers).
- Reads `v_crm_message_performance` via `sb.from('v_crm_message_performance')`, joins client-side to `crm_events.name` and `crm_message_templates.slug` for display.
- No drill-down v1. Empty-state shows: "אין נתונים להציג עדיין — לאחר שלידים יקליקו על הודעות עם קישורים, הנתונים יופיעו כאן."
- RTL Hebrew, Tailwind classes consistent with the other 4 sub-tabs.

### 2.5 Click capture in resolve-link EF

Pseudocode (final implementation in `index.ts`):
```ts
// Existing: lookup short_links by code → check expires_at → 302 to target_url
// After the early return on expiry/404, AND after the existing click_count fire-and-forget,
// ALSO do:
const ipHash = await sha256Hex(getClientIp(req));
const ua     = (req.headers.get('user-agent') ?? '').slice(0, 200);
const ref    = (req.headers.get('referer')    ?? '').slice(0, 200);
// 30s debounce: skip insert if a row exists for (short_link_id, ip_hash) in last 30s
// Wrapped in fire-and-forget so redirect is not blocked
recordClickAsync(db, data.id, data.tenant_id, ipHash, ua, ref);
```

The `recordClickAsync` helper is fire-and-forget — the Promise chain `.then().catch()` pattern same as the existing `click_count` UPDATE. The response is returned immediately after kicking off the async insert. Target: redirect timing stays under 200ms (was ~30ms).

Client IP source: `req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()` (Supabase EF infra adds this header).

---

## 3. Destructive Operations

None.

This SPEC adds 1 table, 1 column, 1 view, 2 indexes, and 4 RLS policies. It modifies 2 Edge Functions (`resolve-link/index.ts` and `send-message/{url-builders.ts, event-variables.ts, dispatch.ts, index.ts}`) and creates 1 new UI file (`modules/crm/crm-messaging-performance.js`). It edits `crm.html` to register the sub-tab + load the new script. None of these are reversible-only-by-revert operations per Iron Rule 32's destructive-op list:
- No file deletes
- No mass file renames (≥5)
- No `git rebase`, `git reset --hard`, `git push --force`
- No `DROP / TRUNCATE / ALTER TABLE DROP / DELETE FROM ... without tenant_id WHERE`
- No edits that delete sections of CLAUDE.md / SKILL.md / governance files (this SPEC is append-only there — and we don't even touch them)
- No `main` branch modifications

If during execution the Executor discovers a need for any destructive op (e.g., re-doing the migration mid-run): STOP, write `modules/Module 4 - CRM/escalations/{ISO_TS}_MESSAGE_PERFORMANCE_DESTRUCTIVE_OP.md`, halt the pipeline.

---

## 4. Success Criteria (measurable)

Each item has an exact expected value. The Executor compares actual to expected and stops on deviation.

1. **Safety tag exists.** `git tag --list pre-message-performance-tracking-2026-05-14` returns exactly that line. ✅ Already done.
2. **New table created.** `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='short_link_clicks'` returns 1.
3. **New column on short_links.** `SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='short_links' AND column_name='message_log_id'` returns 1.
4. **RLS canonical on short_link_clicks.** `SELECT count(*) FROM pg_policy WHERE polrelid='public.short_link_clicks'::regclass` returns 2; their names are `service_bypass` and `tenant_isolation`; the `tenant_isolation` USING expression matches the canonical Iron Rule 15 JWT-claim form.
5. **New view exists.** `SELECT count(*) FROM information_schema.views WHERE table_schema='public' AND table_name='v_crm_message_performance'` returns 1.
6. **resolve-link EF deployed and click-capturing.** After a demo smoke send + click: `SELECT count(*) FROM short_link_clicks WHERE tenant_id = demo_uuid AND clicked_at > now() - interval '5 minutes'` returns ≥ 1.
7. **send-message EF backfills message_log_id.** After a demo smoke send: `SELECT count(*) FROM short_links WHERE tenant_id = demo_uuid AND message_log_id IS NOT NULL AND created_at > now() - interval '5 minutes'` returns ≥ 1.
8. **resolve-link redirect timing under 200ms.** A `curl -w '%{time_total}'` measurement on a demo `/r/<code>` returns < 0.200 seconds (was ~0.030s pre-change — the goal is no meaningful regression). If > 0.200s → STOP per Brief §3.8.
9. **30s idempotency holds.** Two consecutive clicks on the same `/r/<code>` within 30 seconds (same ip_hash) produce exactly 1 row in `short_link_clicks`, not 2.
10. **UI sub-tab renders.** Loading `crm.html` on demo, opening Messaging Hub, clicking "📊 ביצועי הודעות" → page does not error, table renders with at least the demo smoke row's data after the smoke send + click.
11. **No console errors on the new sub-tab.** Open browser devtools → 0 errors in the console while clicking through the sub-tab.
12. **Commit budget honored.** `git log --oneline pre-message-performance-tracking-2026-05-14..HEAD` returns between 6 and 10 commits inclusive.
13. **Integrity gate green.** `npm run verify:integrity` exits 0 at the end of execution.
14. **Pre-commit hooks green on every commit.** `scripts/verify.mjs --staged` (run by husky) does not block any commit.
15. **No Prizma writes.** `SELECT count(*) FROM short_link_clicks WHERE tenant_id = '47b34dc1-...'` (Prizma uuid) returns 0 at end of SPEC. (Prizma traffic will start writing only after develop→main merges, which is Daniel's responsibility — not in this SPEC's scope.)
16. **No new SPEC at repo root.** `ls *.md | wc -l` shows no SPEC-shaped files at root.

---

## 5. Stop-on-deviation Triggers (project-specific, in addition to CLAUDE.md §9 global triggers)

STOP and escalate via `modules/Module 4 - CRM/escalations/{ISO_TS}_MESSAGE_PERFORMANCE_BLOCKER.md` if ANY of:

- **S1.** resolve-link redirect timing > 200ms after change → optimize (move insert further off the hot path or async-defer via pg_net) before continuing.
- **S2.** `message_log_id` linkage produces wrong joins — i.e., the demo smoke shows a click attributed to a different `crm_message_log` row than the one that generated the short link. → debug the backfill UPDATE before continuing.
- **S3.** Demo smoke: click happens but no row appears in `short_link_clicks` within 30 seconds. → check the fire-and-forget insert error log; do not proceed.
- **S4.** A migration fails partway (e.g., index creation aborts) → STOP, do NOT attempt corrective DDL without escalation.
- **S5.** `crm_message_log` schema differs from the SPEC's assumed columns (no `template_id`, etc.) — verified live during reality check, but if migrate breaks the assumption → STOP.
- **S6.** Commit count would exceed 10 → STOP, escalate before commit #11. Bundle remaining work.
- **S7.** RLS canonical-pattern check on `short_link_clicks` returns anything but the exact JWT-claim USING expression → STOP, do not rewrite the policy without escalation; the canonical pattern is non-overridable per Iron Rule 15.

---

## 6. Autonomy Envelope

The Executor may proceed without asking when:
- A success criterion matches its expected value.
- A migration applies cleanly (returns 0 rows affected for DDL, expected indexes/policies exist after).
- An EF deploys (MCP `deploy_edge_function` returns success, smoke 302 still works).
- An existing test still passes.
- All checks in `scripts/verify.mjs --staged` pass.
- All Brief §3 safety rules hold (no Prizma writes, sha256-only IP, truncated UA/referer, no other DDL than declared).

The Executor MUST stop on the triggers in §5 above and on the global triggers in CLAUDE.md §9.

The Executor MAY choose:
- The exact migration filename (date-prefixed per project convention).
- Whether to use a CTE vs joined subquery inside the view (semantically identical).
- Tailwind class details on the UI panel as long as they match the other 4 sub-tabs.
- The exact 30s debounce SELECT pattern (e.g., `SELECT 1 FROM ... LIMIT 1` vs `EXISTS(...)`).

The Executor MAY NOT:
- Add columns/tables/views beyond §3.2 of the Brief.
- Modify the existing `resolve-link` 302 redirect behavior (status code, Location header).
- Modify `crm_message_log` schema.
- Touch `main` branch.
- Write to Prizma data.

---

## 7. Out of Scope (explicit)

- A/B test scheduling — Daniel manually authors two templates; this SPEC surfaces their analytics.
- Drill-down per-lead click view.
- Geo/device breakdown beyond UA capture.
- Email open tracking (no tracking pixel).
- Migrating off short.io — parallel concern.
- Funnel report at the event level — already exists in Events tab.
- Historical backfill of clicks — tracking starts forward from deploy day.
- Auto-cleanup cron for clicks older than 12 months — Brief §3.5 says manual only.
- `click_rate_pct` and `conversion_rate_pct` as view columns — these are computed in the UI for now. Adding them to the view is a no-op trivial follow-up if Daniel prefers.

---

## 8. Expected Final State

After SPEC closes:

- **Files added (4):**
  - `migrations/{date}_message_performance_tracking.sql`
  - `modules/crm/crm-messaging-performance.js`
  - `modules/Module 4 - CRM/docs/specs/M4_MESSAGE_PERFORMANCE_TRACKING/EXECUTION_REPORT.md`
  - `modules/Module 4 - CRM/docs/specs/M4_MESSAGE_PERFORMANCE_TRACKING/FINDINGS.md` (if findings; otherwise omit)
- **Files modified (5):**
  - `supabase/functions/resolve-link/index.ts` — add click recording
  - `supabase/functions/send-message/url-builders.ts` — `createShortLink` returns `{ url, id }`
  - `supabase/functions/send-message/event-variables.ts` — `injectAutoUrls` returns `string[]` of short_link_ids
  - `supabase/functions/send-message/dispatch.ts` — `writeDispatchAndSend` accepts and backfills short_link_ids
  - `supabase/functions/send-message/index.ts` — wire the return value through
  - `crm.html` — register sub-tab + load the new JS file
- **Files added (close):**
  - `modules/Module 4 - CRM/docs/specs/M4_MESSAGE_PERFORMANCE_TRACKING/FOREMAN_REVIEW.md` (closing artifact)
- **DB state changes:**
  - 1 new table `public.short_link_clicks` with 2 RLS policies + 2 indexes
  - 1 new column `public.short_links.message_log_id` + 1 partial index
  - 1 new view `public.v_crm_message_performance` (security_invoker=on)
- **Commit count:** 6–9 (cap 10).

---

## 9. Commit Plan

Suggested grouping (Executor may adjust within budget):

1. `feat(m4,db): add short_link_clicks table + short_links.message_log_id + v_crm_message_performance view (M4_MESSAGE_PERFORMANCE_TRACKING)` — the migration.
2. `feat(m4,ef): record clicks in resolve-link with sha256 ip + truncated ua/referer (async fire-and-forget)` — resolve-link EF change + deploy.
3. `feat(m4,ef): link short_links to crm_message_log via backfill in send-message dispatch` — send-message EF changes + deploy (single commit covers all 4 EF files because the change is one logical change spread across them).
4. `feat(m4,ui): add ביצועי הודעות sub-tab in CRM Messaging Hub` — UI file + crm.html wiring.
5. `chore(m4,spec): close M4_MESSAGE_PERFORMANCE_TRACKING with execution report + findings + foreman review` — the close commit.

If a stop-trigger fires mid-execution, a 6th commit may add a fix or a smoke-result snapshot.

---

## 10. Rollback Plan

If something goes wrong AND we need to roll back:
1. `git reset --hard pre-message-performance-tracking-2026-05-14` — reverts all code changes.
2. The migration can be rolled back with the following inverse SQL (record this in the migration file as a `-- ROLLBACK` comment block, NOT as a separate migration):
   ```sql
   DROP VIEW IF EXISTS public.v_crm_message_performance;
   ALTER TABLE public.short_links DROP COLUMN IF EXISTS message_log_id;
   DROP TABLE IF EXISTS public.short_link_clicks;
   ```
   (This rollback IS a destructive op — running it requires explicit Daniel authorization. The forward migration is the safe path; rollback is only for catastrophic failure.)
3. Redeploy the prior versions of `resolve-link` and `send-message` EFs via `git checkout pre-message-performance-tracking-2026-05-14 -- supabase/functions/{resolve-link,send-message}` then `supabase functions deploy`.

Rollback is destructive per Iron Rule 32 — DO NOT execute without explicit Daniel sign-off.

---

## 11. Lessons Already Incorporated

- **Cross-Reference Check completed 2026-05-14 against live DB:** 0 collisions. Searched `short_link_clicks`, `v_crm_message_performance`, `message_log_id` across `docs/GLOBAL_SCHEMA.sql` (no hits), `docs/DB_TABLES_REFERENCE.md` (no hits), `modules/Module 4 - CRM/docs/db-schema.sql` (no hits), live `information_schema.tables` + `information_schema.columns` + `pg_views` (no hits).
- **Iron Rule 15 canonical pattern verified** against live `short_links` policies (returned the canonical JWT-claim USING expression) — same pattern copied verbatim into the migration.
- **Order-of-operations issue** between short_links creation (early in send-message) and crm_message_log creation (late in dispatch.ts) — resolved by Option B (backfill UPDATE) per Brief §2.2 author's note "Pipeline decides". Option A (pre-allocated UUID) was considered and rejected as more invasive.
- **Click count fire-and-forget pattern** already exists in `resolve-link/index.ts:82-87` — the new click insert reuses the same Promise-chain-and-discard idiom.
- **Sub-tab integration** in Messaging Hub follows the existing 4-sub-tab pattern in `crm-messaging-tab.js`. No new infrastructure.

---

## 12. Handoff Note for Executor

You inherit a SPEC with measurable success criteria, an autonomy envelope that maximizes uninterrupted execution, and 7 stop-triggers narrow enough to be unambiguous. The migration is pre-approved by the Brief; the EF changes are non-breaking (additive); the UI is one self-contained file plus 2 lines of HTML wiring. Execute end-to-end under Bounded Autonomy.

After execution, write:
- `EXECUTION_REPORT.md` — what was done, commit hashes, success-criteria matches/misses, smoke results.
- `FINDINGS.md` — anything notable for the Foreman review (proposals for follow-ups, surprises).

Then the Foreman (this SPEC's author) will read both and produce `FOREMAN_REVIEW.md`.
