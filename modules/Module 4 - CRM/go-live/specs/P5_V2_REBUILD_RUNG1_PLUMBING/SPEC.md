# SPEC — P5_V2_REBUILD_RUNG1_PLUMBING

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P5_V2_REBUILD_RUNG1_PLUMBING/`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-28
> **Parent SPEC:** `../P5_V2_TEMPLATE_REBUILD/SPEC.md` (Rung split, Decision #2)
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-cutover blocker — must land BEFORE Rung 2. Target: Friday 2026-05-01 EOD.
> **Origin:** Foreman split of P5_V2_TEMPLATE_REBUILD into 3 rungs after resolving 6 Foreman Decisions on 2026-04-28.

---

## 1. Goal

Land all substitution-engine plumbing + 22 V2 template bodies on demo so render-verify produces zero literal `%X%` substrings on every V2 template against a representative demo event. After this Rung the templates are correct in the DB; rules still fire today's V1 wiring (Rung 2 rewires them). Failures here surface as visible bugs at cutover, so Rung 1 must be airtight.

---

## 2. Background & Motivation

The Campaign Overseer locked 22 V2 message bodies in `campaigns/supersale/MESSAGES_V2/` on 2026-04-28. The bodies reference:

- 8 variables that already resolve through the existing pipeline (`%name%`, `%phone%`, `%email%`, `%event_name%`, `%event_date%`, `%event_time%`, `%registration_url%`, `%unsubscribe_url%`).
- 3 NEW substitution variables that do not yet resolve: `%event_day_of_week%` (Hebrew weekday computed from `event_date`), `%event_max_attendees%` (alias of existing `crm_events.max_capacity`), `%event_deposit_amount%` (alias of existing `crm_events.booking_fee`). Foreman Decision #2 confirmed these are aliases, not new columns — Rule 21 collision avoidance.
- 1 NEW dynamic variable family `%payment_url_<fee>%` (e.g., `%payment_url_50%`) that resolves against a NEW `tenants.payment_links` JSONB column. Daniel directive (Pattern P12 in `COPY_DECISIONS_LOG.md`): missing key MUST cause loud send failure — never substitute a placeholder or fallback URL.

Once those four variable types resolve, the 22 V2 bodies can be loaded into `crm_message_templates` for the demo tenant, replacing the 18 V1 bodies that ship there today (T10's two rows stay seeded but `is_active` flips to `false` in Rung 2). The 4 new manual-move templates (T11_unpaid + T12_paid pairs) require fresh INSERTs since they have no V1 predecessors.

**Sequencing rationale:** templates without working variables render with literal placeholders, which is a visible production bug at cutover. Rung 2's rule rewires fan out from these template rows — if Rung 1 hasn't landed, the rules fire correctly but the rendered body is broken.

---

## 3. Success Criteria (Measurable)

### Part A — Substitution engine extensions in `send-message` Edge Function

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | `send-message/index.ts` exports/uses a helper that injects event-derived variables when `event_id` is present | New helper function (e.g. `injectEventVariables`) referenced once in main handler before substitution call | `grep -c "injectEventVariables\|event_day_of_week" supabase/functions/send-message/index.ts` → ≥2 |
| 2 | `%event_day_of_week%` resolves to Hebrew weekday for given event_date | Sunday `event_date` (e.g. `2026-05-03`, JS getDay()=0) → "יום ראשון". Tuesday → "יום שלישי". Friday → "יום שישי". Saturday → "שבת". | Manual unit verification by curling EF with raw body containing `%event_day_of_week%` against 3 distinct event dates |
| 3 | `%event_max_attendees%` resolves to `crm_events.max_capacity` integer for the bound event | Demo seed event with `max_capacity=50` → renders as `50` | Curl EF with raw body containing `%event_max_attendees%`; check response.body |
| 4 | `%event_deposit_amount%` resolves to `crm_events.booking_fee` (integer-formatted, no decimal trail when whole) | Event with `booking_fee=50.00` → renders as `50` (NOT `50.00`) | Curl EF; confirm body contains the integer string |
| 5 | `%payment_url_<fee>%` resolves to `tenants.payment_links[<fee>]` for `<fee>` = stringified `event.booking_fee` rounded to integer | Event booking_fee=50, `tenants.payment_links={"50":"https://example.com/pay50"}` → renders that URL | Curl EF |
| 6 | **Loud failure on missing payment link** — when template references `%payment_url_<fee>%` and `tenants.payment_links[<fee>]` is null/absent, EF returns `{ ok: false, error: 'payment_link_missing:<fee>' }` AND writes a `crm_message_log` row with `status='failed'`, `error_message='payment_link_missing:<fee>'`, AND does NOT call Make webhook | Test: clear payment_links for demo, attempt send of `event_attendee_moved_unpaid_sms_he` → 4xx response with payment_link_missing error; log row exists; 0 Make webhook calls observable | Curl + SQL check on log + Make ops counter |
| 7 | **Loud failure on payment_url fee mismatch** — when post-substitution body still contains a literal `%payment_url_<digits>%` (e.g., template hardcodes `%payment_url_75%` but event booking_fee=50), EF fails with `error: 'payment_link_mismatch:<expected>:<found>'` and does NOT call Make | Test: temporarily change demo event booking_fee to 75 with payment_links={"50":...} → send attempt fails | Curl + log check |
| 8 | EF size remains ≤350 lines (Rule 12) | `wc -l` ≤ 350 | `wc -l supabase/functions/send-message/index.ts` |
| 9 | EF deployed to Supabase | New version active | `mcp supabase.list_edge_functions` shows new send-message version > existing |

### Part B — `tenants.payment_links` JSONB column

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 10 | Column `tenants.payment_links` exists, type `jsonb`, NOT NULL, default `'{}'::jsonb` | DDL applied | `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='tenants' AND column_name='payment_links'` |
| 11 | Demo tenant has `payment_links={"50": "<URL provided by Daniel>"}` | non-empty JSON with key "50" | `SELECT payment_links FROM tenants WHERE id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` |
| 12 | RLS unchanged on `tenants` (no new policies needed; existing tenant_isolation covers reads) | No new policy | `SELECT policyname FROM pg_policies WHERE tablename='tenants'` — count unchanged |

### Part C — 22 V2 template bodies in `crm_message_templates` (demo only)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 13 | All 9 V2 email bodies match V2 file contents byte-for-byte (CRLF normalization allowed) | 9 rows pass | For each slug: `SELECT body FROM crm_message_templates WHERE tenant_id='demo-uuid' AND slug=$1 AND channel='email' AND language='he'` compared byte-by-byte against `MESSAGES_V2/<slug>.html` |
| 14 | All 9 V2 SMS bodies match V2 .txt files byte-for-byte (preserve blank lines per Pattern P8) | 9 rows pass | Same as #13 with `.txt` files |
| 15 | 4 new manual-move template rows INSERTed for demo (`event_attendee_moved_unpaid_{sms,email}_he`, `event_attendee_moved_paid_{sms,email}_he`) | 4 rows created, `is_active=true`, bodies match files byte-for-byte | `SELECT count(*) FROM crm_message_templates WHERE tenant_id='demo-uuid' AND slug LIKE 'event_attendee_moved_%'` → 4 |
| 16 | T10 rows remain in DB but unchanged in Rung 1 (Rung 2 deactivates them) | 2 rows still exist with `is_active=true` after Rung 1 (this Rung does not touch them) | `SELECT slug, is_active FROM crm_message_templates WHERE slug LIKE 'event_closed_%_he' AND tenant_id='demo-uuid'` → 2 rows is_active=true |
| 17 | Total template count for demo after Rung 1 | 28 (24 existing including 2 confirmation × 2 channels = 4, minus the 18 that get UPDATEd in place + 4 new INSERTs = 24 + 4) — **executor MUST baseline this exact number before running** | `SELECT count(*) FROM crm_message_templates WHERE tenant_id='demo-uuid'` |

### Part D — Render-verify smoke test on demo

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 18 | All 22 V2 templates render against a representative demo event with all variables populated, producing ZERO literal `%X%` substrings (except T11_unpaid/T12_paid which require `payment_links["50"]` set per #11) | 22/22 pass | Test harness: for each slug, POST to send-message with `tenant_id`/`lead_id`/`event_id` of demo seed, `dry_run` mode (or use a "dryrun" flag if not present, otherwise actually send to allowed phone). Assert no `%[a-z_0-9]+%` remaining in `final_body` from log row. |
| 19 | Optional fields rendered as empty without breaking layout | ≥1 explicit test of an event with no `location_waze_url` (some templates reference it) → no broken HTML | Manual check |

### Part E — Repo hygiene

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 20 | The 22 V2 files in `campaigns/supersale/MESSAGES_V2/` are committed to develop | 22 files tracked | `git ls-files campaigns/supersale/MESSAGES_V2/` shows all 22 |
| 21 | Iron Rule 31 integrity gate passes | exit 0 | `npm run verify:integrity` |
| 22 | Clean repo at session end | nothing to commit | `git status` after final push |
| 23 | Commits produced | 4–6 commits (1: V2 file commit, 2: schema+EF, 3: template UPDATEs+INSERTs, 4: smoke verify, 5: docs, 6: retro) | `git log --oneline` from start hash |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in the repo
- Run read-only SQL (Level 1) on demo tenant for verification
- Run write SQL on demo tenant for column add + payment_links seed + 18 UPDATEs + 4 INSERTs (Level 2 — pre-authorized for demo only by this SPEC)
- Modify `supabase/functions/send-message/index.ts`
- Deploy `send-message` Edge Function (this SPEC pre-authorizes the redeploy)
- Commit the 22 V2 template files (`campaigns/supersale/MESSAGES_V2/*.html` + `*.txt`) to develop
- Update `SESSION_CONTEXT.md`, `go-live/ROADMAP.md`, `MODULE_MAP.md` (this Rung's docs entry)
- Browser QA on `localhost:3000/crm.html?t=demo` if helpful for sanity-render
- Call `mcp supabase.execute_sql` for verification queries (Level 1) and the bounded writes above (Level 2)

### What REQUIRES stopping and reporting

- **Any DDL beyond `tenants.payment_links` JSONB add.** No new columns on `crm_events`, `crm_message_templates`, `crm_automation_rules`, etc. The Foreman finding is that the existing columns suffice via aliasing.
- **Any UPDATE to `tenants.payment_links` for any tenant other than demo.** Production tenant (Prizma) has its own onboarding path — out of scope here.
- **Any change to `crm_automation_rules`.** That's Rung 2's territory — Rung 1 must NOT rewire any rule. Risk: silent regression where today's rules fire V2 templates with un-aliased variables before Rung 1 lands. Mitigation: Rung 1 deploys EF + variable injection BEFORE the template UPDATEs, so even today's rules render correctly during the seam.
- **Any UPDATE/INSERT against the production tenant `83bd9d0a-...` (Prizma).** This Rung is demo-only.
- **Any change to copy in the 22 V2 files.** They are LOCKED. If the executor finds a copy issue, surface to Daniel + Cowork Overseer; do NOT silently change copy.
- **Adding `payment_url` substitution as a "best-effort" or fallback.** Daniel directive Pattern P12: missing → fail loudly. No fallback URL, no warning-and-substitute-empty. The send fails, the log row records `failed`, the operator sees it.
- **Production deploy of the send-message EF if its current production-side caller (Prizma) is in a fragile state.** Verify no in-flight Prizma sends before deploy.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. `tenants` table DDL fails (e.g. RLS forbids ALTER, or column already exists with different type) → STOP, do not retry with a different shape.
2. Any of the 22 V2 file bodies fails byte-by-byte comparison after UPDATE/INSERT — DB write either truncated or escaping mangled the body. STOP before committing.
3. Render-verify smoke produces ANY literal `%[a-z_0-9]+%` substring in any rendered body for a fully-populated event. STOP — variable wiring is broken; do not deploy.
4. Loud-failure test (criterion #6) does NOT actually fail with `payment_link_missing` — the EF silently succeeded with a missing payment link. STOP — Pattern P12 violated, never deploy this version.
5. `wc -l send-message/index.ts` exceeds 350. STOP and plan a split (likely: extract `injectEventVariables` to its own helper file like `event-variables.ts`).
6. Iron Rule 31 integrity gate fails at any commit boundary.
7. `mcp supabase.execute_sql` returns access denied or unexpected schema during verification — STOP and re-confirm the demo tenant UUID, do not proceed with assumed answers.

---

## 6. Rollback Plan

- **EF rollback:** redeploy previous version (`supabase functions deploy send-message --version-tag previous`). Previous version still resolves the 8 already-working variables; it just won't resolve the new aliases or `payment_url_*`. With Rung 1's templates loaded, that means rendered bodies have literal `%event_max_attendees%` etc. This is exactly the failure mode #3 stop-trigger catches BEFORE deploy, so rollback should be unnecessary. Still, the EF has version history in Supabase; rollback is one click.
- **Template rollback:** re-run `seed-templates-demo.sql` — restores the 18 V1 bodies + 2 T10 rows + 4 confirmation templates to their pre-Rung-1 state. The 4 new manual-move INSERTs need a separate `DELETE FROM crm_message_templates WHERE tenant_id='demo-uuid' AND slug LIKE 'event_attendee_moved_%'`.
- **Schema rollback:** `ALTER TABLE tenants DROP COLUMN payment_links` — safe because no other code reads it before Rung 2.
- **`tenants.payment_links` data:** `UPDATE tenants SET payment_links='{}' WHERE id='8d8cfa7e-...'` — does not affect production.

---

## 7. Out of Scope (explicit)

- Any rule rewires (`crm_automation_rules` UPDATEs) — that is Rung 2's exclusive territory.
- T10 deactivation — Rung 2 (it's coupled to the rule that fires T10).
- `register_lead_to_event` RPC changes — Rung 3.
- Manual-move admin UI (toggle, dialog, RPC) — Rung 3.
- Production tenant migration of payment_links — separate cutover SPEC.
- Tenant-variable plumbing (SPEC #11) — deferred until tenant 2 onboards.
- Scheduler infrastructure for T8/T9 reminders — Rung 2 wires the queue-insertion engine action; the queue itself + dispatch-queue EF + pg_cron already exist (built in OVERNIGHT_M4_SCALE_AND_UI).
- Storefront / public registration form — unaffected.
- WhatsApp / Russian / English channels — unaffected.
- `lead-intake` Edge Function refactor — Rung 2 (rule 2.1 fires from there).

---

## 8. Expected Final State

### Modified files

| File | Current lines | Expected | Change |
|------|---------------|----------|--------|
| `supabase/functions/send-message/index.ts` | 333 | ~340 (≤350) | Add `injectEventVariables` helper + post-substitution mismatch scan; deploy |

### New files

- `supabase/functions/send-message/event-variables.ts` — IF `index.ts` would exceed 350 with the helper inline. Optional split.

### Deleted files

None.

### DB state (demo tenant)

- `tenants.payment_links` column added (cross-tenant DDL — null/`'{}'` default for non-demo rows).
- Demo row: `payment_links={"50": "<URL Daniel provides>"}`.
- 18 rows in `crm_message_templates` UPDATEd in place (slug unchanged, body replaced with V2 content) — the 9 lifecycle slugs × 2 channels.
- 4 rows INSERTed (`event_attendee_moved_{unpaid,paid}_{sms,email}_he`).
- 0 rows deleted.
- T10 rows untouched in Rung 1.

### Docs updated

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — add P5_V2_REBUILD_RUNG1_PLUMBING CLOSED entry.
- `modules/Module 4 - CRM/go-live/ROADMAP.md` — add the rung as a closed line under Module 4 Go-Live.
- `MASTER_ROADMAP.md` — NO (not a module milestone).
- `docs/GLOBAL_MAP.md` — NO (no new public functions).
- `docs/GLOBAL_SCHEMA.sql` — NO (`tenants.payment_links` is one column add; merge at the next Integration Ceremony, not now).

---

## 9. Commit Plan

| # | Message | Files |
|---|---------|-------|
| 1 | `feat(campaigns): commit 22 V2 message templates to develop` | `campaigns/supersale/MESSAGES_V2/*.html` + `*.txt` (if not already tracked) |
| 2 | `feat(send-message): inject event variables + payment_url with loud failure` | `supabase/functions/send-message/index.ts` (+ optional `event-variables.ts`) |
| 3 | `feat(crm): add tenants.payment_links jsonb column for per-tenant payment URLs` | DB migration artifact (SQL) — saved under `modules/Module 4 - CRM/go-live/` for replay |
| 4 | `feat(crm): load V2 message templates on demo tenant (22 rows: 18 update + 4 insert)` | DB SQL (saved as artifact `go-live/seed-templates-v2-demo.sql` for replay parity with the existing `seed-templates-demo.sql` pattern) |
| 5 | `docs(crm): mark P5_V2_REBUILD_RUNG1_PLUMBING CLOSED` | `SESSION_CONTEXT.md` + `ROADMAP.md` |
| 6 | `chore(spec): close P5_V2_REBUILD_RUNG1_PLUMBING with retrospective` | `EXECUTION_REPORT.md` + `FINDINGS.md` (executor writes at end) |

Budget: 6 commits ± 1 fix = 7 max.

---

## 10. Dependencies / Preconditions

| Dependency | Status | Verification |
|------------|--------|--------------|
| Demo tenant exists, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb` | ✅ STABLE | Used by all M4 specs |
| `crm_events.max_capacity` column exists | ✅ VERIFIED | `001_crm_schema.sql:82` |
| `crm_events.booking_fee` column exists | ✅ VERIFIED | `001_crm_schema.sql:83` |
| `crm_message_templates` table has 24 rows for demo today | ⚠️ EXECUTOR VERIFIES | `SELECT count(*) FROM crm_message_templates WHERE tenant_id='demo-uuid'` — record actual baseline before any write |
| `send-message` EF currently deployed and functional | ✅ VERIFIED | M4 P10 retro confirms v3 ACTIVE |
| 22 V2 files present in `campaigns/supersale/MESSAGES_V2/` | ✅ VERIFIED | Foreman confirmed via `ls` 2026-04-28 |
| Daniel has provided the `payment_links["50"]` URL value | ⚠️ DANIEL CONFIRMS PRE-EXECUTION | Executor MUST confirm this URL string with Daniel before running #11 |

---

## 11. Lessons Already Incorporated

| Source | Proposal | Applied? |
|--------|----------|----------|
| WORKING_TREE_RECOVERY FR Proposal 1 — STATE_SNAPSHOT before destructive action | Executor must record baseline counts before any UPDATE | ✅ Criterion #17 + Dependencies row require pre-write baselines |
| WORKING_TREE_RECOVERY FR Proposal 2 — Execution-environment parity check | EF substitution behavior verified by curling the deployed EF (not local mock) | ✅ Criteria #2-#7 specify curl against deployed EF |
| POST_WAITING_LIST_FIXES F1 — pg_get_functiondef snapshot before RPC edits | N/A — no RPC changes in Rung 1 |
| OVERNIGHT_M4_SCALE_AND_UI — phone allowlist | All test sends use approved phones (`+972537889878`, `+972503348349`, `+972507168471`) | ✅ Stop-trigger catches non-approved phone use |
| Cross-Reference Check completed 2026-04-28 against GLOBAL_SCHEMA + GLOBAL_MAP + DB_TABLES_REFERENCE + FILE_STRUCTURE: | | |
| — `payment_links` column name in `tenants` | 0 hits → unique | ✅ |
| — `injectEventVariables` function name | 0 hits → unique | ✅ |
| — `event_day_of_week` substitution variable | 1 hit (NEW_SYSTEM_VARIABLES_REQUIRED.md, declared) → no code collision | ✅ |
| — `event_attendee_moved_*` slug family | 0 hits in DB seed → unique | ✅ |
| — Template slugs (22) | All 18 lifecycle slugs match seed; 4 new are unique | ✅ |
| **0 collisions, 1 expected reference (declared NEW). Foreman cross-reference complete.** | | |

---

## 12. Pre-Merge Checklist (Iron Rule 31)

- Before any commit: `npm run verify:integrity` — exit 0 required.
- Before any DB write: baseline counts captured in EXECUTION_REPORT §1 ("Pre-state").
- Before EF deploy: confirm previous version is still tagged in Supabase for one-click rollback.
- Before final push: `git status` clean + integrity gate clean.

---

## 13. Technical Design

### 13.1 EF substitution flow (after change)

```
POST /send-message
  ↓
parse + validate
  ↓
DB client (service role)
  ↓
NEW: if (eventId) await injectEventVariables(db, eventId, tenantId, variables)
  ↓
inject unsubscribe_url + registration_url (existing)
  ↓
fetch template body (existing)
  ↓
substituteVariables(body, variables)
  ↓
NEW: scanForPaymentUrlMismatch(finalBody) → fail-loud if leftover %payment_url_*%
  ↓
log(pending) → call Make → log(sent|failed)
```

### 13.2 `injectEventVariables` pseudo-code

```ts
async function injectEventVariables(
  db: SupabaseClient,
  eventId: string,
  tenantId: string,
  vars: Record<string, unknown>,
): Promise<void> {
  const { data: ev } = await db
    .from("crm_events")
    .select("event_date, max_capacity, booking_fee")
    .eq("id", eventId)
    .eq("tenant_id", tenantId)
    .single();
  if (!ev) return; // event lookup failure handled upstream

  // Aliases (only set if caller didn't already set)
  if (vars.event_max_attendees == null) vars.event_max_attendees = ev.max_capacity;
  if (vars.event_deposit_amount == null) vars.event_deposit_amount = Math.round(Number(ev.booking_fee));
  if (vars.event_day_of_week == null) {
    const HEBREW_DOW = ["יום ראשון","יום שני","יום שלישי","יום רביעי","יום חמישי","יום שישי","שבת"];
    const d = new Date(ev.event_date + "T00:00:00+03:00"); // Israel TZ — anchored to date
    vars.event_day_of_week = HEBREW_DOW[d.getUTCDay()];
  }

  // payment_url_<fee> — load tenant's link table once
  const fee = Math.round(Number(ev.booking_fee));
  const feeKey = String(fee);
  const { data: tenant } = await db
    .from("tenants")
    .select("payment_links")
    .eq("id", tenantId)
    .single();
  const links: Record<string, string> = tenant?.payment_links ?? {};
  const url = links[feeKey];
  if (typeof url === "string" && url.length > 0) {
    vars[`payment_url_${feeKey}`] = url;
  }
  // If url missing AND template references %payment_url_<feeKey>% → caught by post-sub mismatch scan
}
```

### 13.3 Post-substitution mismatch scan

```ts
function scanForPaymentUrlMismatch(body: string): { ok: true } | { ok: false; error: string } {
  const m = body.match(/%payment_url_(\d+)%/);
  if (!m) return { ok: true };
  return { ok: false, error: `payment_link_missing_or_mismatch:${m[1]}` };
}
```

If `{ ok: false }`: write `crm_message_log` row with `status='failed'`, `error_message=<error>`, return `errorResponse(error, 422)`. Do NOT call Make.

### 13.4 DDL for `tenants.payment_links`

```sql
ALTER TABLE tenants
  ADD COLUMN payment_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Demo seed (Daniel will provide the actual URL string before execution):
UPDATE tenants
   SET payment_links = '{"50": "<URL_FROM_DANIEL>"}'::jsonb
 WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
```

### 13.5 Template body load — idempotent UPDATE pattern

For each of the 18 V2 lifecycle templates:

```sql
UPDATE crm_message_templates
   SET body = $1
 WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
   AND slug      = $2
   AND channel   = $3
   AND language  = 'he';
```

The `$1` body is read from the V2 file by the executor at run time. Executor MUST verify byte-equality after the UPDATE by re-SELECTing and comparing.

For the 4 new manual-move templates (no V1 row to UPDATE):

```sql
INSERT INTO crm_message_templates (tenant_id, slug, name, channel, language, subject, body, is_active, created_at)
VALUES (...)
ON CONFLICT (tenant_id, slug) DO UPDATE SET body = EXCLUDED.body, subject = EXCLUDED.subject, is_active = EXCLUDED.is_active;
```

(`ON CONFLICT` covers re-runs.) Subject for emails is read from each `<title>` tag or, if missing, from the `lead_intake` SPEC pattern. Subject for SMS is `NULL`.

### 13.6 Render-verify smoke harness

The executor builds a small Node script or uses `mcp supabase.execute_sql` to:

1. Pick a representative demo event (the seed event — executor records its UUID).
2. Pick a representative demo lead (Daniel's approved phone `+972537889878`).
3. For each of 22 V2 slugs, call `send-message` EF with `template_slug=<base>`, `channel=<sms|email>`, `language=he`, `tenant_id=demo`, `lead_id=<demo lead>`, `event_id=<demo event>`, `variables={}` (let EF inject everything).
4. Read `crm_message_log` row created. Assert: `status='sent'` (or `failed` ONLY if it's a payment_url loud-fail test — that is intentional). Assert: `final_body` (or `content` column) does NOT match regex `/%[a-z_0-9]+%/`.
5. Cleanup: `DELETE FROM crm_message_log WHERE tenant_id='demo-uuid' AND created_at > '<smoke start time>'` to restore baseline.

### 13.7 Loud-failure tests for criteria #6 + #7

- #6 test: temporarily `UPDATE tenants SET payment_links='{}' WHERE id='demo-uuid'`. Send `event_attendee_moved_unpaid_sms_he` against an event with `booking_fee=50`. Expect 4xx + log row with `status='failed'` + 0 Make webhook calls. Restore `payment_links` afterwards.
- #7 test: temporarily `UPDATE crm_events SET booking_fee=75 WHERE id='<demo event>'`. Send `event_attendee_moved_unpaid_sms_he` (which hardcodes `%payment_url_50%`). Expect 4xx with `payment_link_missing_or_mismatch:50`. Restore booking_fee=50 afterwards.

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `tenants` DDL fails on cross-tenant table | LOW | MEDIUM | Service-role connection bypasses RLS. Verified column type/nullable already tested in P10's pattern (similar cross-tenant column adds). |
| Template body byte mismatch after UPDATE (escaping issue) | MEDIUM | HIGH | Criterion #13/#14 enforces byte-by-byte verification before commit. Executor MUST re-SELECT and `diff` against V2 file. |
| `event_day_of_week` Israel-TZ off-by-one (UTC vs IDT) | MEDIUM | HIGH | EF helper anchors with `+03:00` and uses `getUTCDay()` after that anchor (Israel never observes DST shifting weekday boundary at midnight in practice — events are always Friday morning, no edge case). Manual smoke against a Sunday + Saturday event date is criterion #2. |
| Loud-failure missing — silent send with literal `%payment_url_50%` | LOW (criterion #6 catches it) | CRITICAL (broken URL to customer) | Two layers: (a) injection-time check, (b) post-substitution scan. Both must pass for the send to succeed. Test #7 verifies the second layer. |
| Daniel hasn't provided `payment_links["50"]` URL by execution time | MEDIUM | BLOCKING for Rung 1 close | Executor stops on missing URL, asks Daniel before continuing. Do NOT seed a placeholder URL. |
| EF size exceeds 350 lines after the helper add | LOW | LOW | If exceeded, extract helper to `event-variables.ts` (single import). Stop-trigger #5. |
| In-flight Prizma sends collide with EF redeploy | LOW | LOW | Brief deploy window; redeploy is atomic; previous version still resolves the 8 already-working variables, so retry succeeds. |

---

*End of SPEC — P5_V2_REBUILD_RUNG1_PLUMBING*
