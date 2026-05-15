# SPEC — M4_FB_CAPI_HYBRID_DEDUPLICATION

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-15 (evening)
> **Module:** 4 — CRM
> **Phase:** FUNNEL_ROADMAP Phase 2 P2.1
> **Author signature:** Claude Code single-chat Full-Auto Pipeline (Opus author → Sonnet executor → default reviewer → default LH-tester → Opus closure)
> **Brief origin:** `modules/Module 4 - CRM/architecture-brief/M4_FB_CAPI_HYBRID_DEDUPLICATION_BRIEF.md` (sealed 2026-05-15 evening)

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Confirms the SPEC is grounded in actual repo + DB state, not in Brief assumptions that may have drifted.

- ✅ Brief read in full on 2026-05-15.
- ✅ Live DB probed via Supabase MCP at SPEC-authoring time. Findings below.
- ✅ Recent FOREMAN_REVIEW.md files harvested for lessons (P1.2 `M4_BROADCAST_ID_PROPAGATION`, P1.4 `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP`, P2.3 `M4_TEMPLATE_VALIDATION_UNIFIED`).
- ✅ Pre-existing untracked files surveyed via `git status --porcelain | grep '^??'` — counted at SPEC author time. Executor leaves them alone; selective `git add` by filename throughout.
- ✅ Cross-Reference Check (Rule 21) completed 2026-05-15 against live DB. Zero collisions; one Brief↔reality divergence resolved at author time (token storage location — see baseline D-AUTH-1 below).

### Brief↔Reality divergences resolved at author time

| Brief said | Reality | Resolution in this SPEC |
|---|---|---|
| `tenants.fb_capi_token` column already exists | Column does NOT exist on `tenants` (verified via `information_schema.columns` probe). | Token storage moves to `storefront_config.analytics->>'fb_capi_token'` JSONB key — consistent with `storefront-config.analytics.facebook_pixel_id` precedent (Prizma value `304574492100180` already there). This is exactly Brief §8 Stop Trigger #1: *"`tenants.fb_capi_token` schema differs from expectation (e.g., column moved to `storefront_config` JSONB instead of `tenants` column — executor pre-flight discovers actual location)."* Foreman resolves at author time per skill mandate ("Where the Brief's assumptions diverge from repo reality, the SPEC's success criteria are written against repo reality"). Brief D6 ("token stays in `tenants.fb_capi_token`") is overridden by reality; D6's intent (per-tenant config, no new secrets table, SaaS-axis-clean) is preserved — the JSONB path satisfies the same intent. |
| Pipeline ships "1 storefront change" (UUID generation + hidden field + thank-you-page pixel) in this SPEC | Activation prompt's stop trigger: *"If storefront-repo changes are needed, halt and escalate — the storefront sibling repo requires its own PR per its CLAUDE.md."* | This SPEC scopes ERP-side ONLY. Storefront-side change is deferred to a follow-up SPEC `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` authored in `opticalis/opticup-storefront`. `lead-intake` is updated here to ACCEPT `fb_event_id` field (null-tolerant); the storefront SPEC fills the field. Until then: CAPI dispatch runs without event_id — Meta will count Lead events normally (no dedup yet, no double-counting risk because browser pixel still binds to thank-you-page URL only and CAPI fires at row insert; Meta's default behavior treats them as separate events but the architectural substrate is in place). |
| Brief §6 D2 says shared `event_id` round-trip via URL param or sessionStorage | Storefront-side responsibility — out of scope for this SPEC. | Documented in `docs/FB_CAPI.md` as the contract that the follow-up storefront SPEC must implement. |

### Lessons Applied from Prior 3 FOREMAN_REVIEWs

| From SPEC | Lesson | How honored in this SPEC |
|---|---|---|
| `M4_BROADCAST_ID_PROPAGATION` Author Proposal #1 | Function-signature-change discipline (DROP FUNCTION before CREATE OR REPLACE on changed arg list) | N/A — this SPEC creates new objects; does not modify existing function signatures. `lead-intake` is an Edge Function (Deno TS), not a PL/pgSQL function; signature changes there are TS-level and don't require DROP. |
| `M4_BROADCAST_ID_PROPAGATION` Author Proposal #2 | Smoke pre/post in Pipeline mode — LH-Tester runs ONCE post-state only | §3 criteria 9a/9b split: "smoke pre" delegated to most recent green TEST_REPORT.md (latest M4 SPEC's LH-Tester report); "smoke post" is the LH-Tester deliverable. |
| `M4_BROADCAST_ID_PROPAGATION` Executor Proposal #1 | Skip MCP simplified-payload retry — go straight to CLI on first `InternalServerErrorException` | §4 Autonomy Envelope pre-authorizes: on first `deploy_edge_function` 5xx, Executor goes directly to `supabase functions deploy fb-capi-dispatch --project-ref tsxrrxzmdxaenlvocyit` from the local shell without the simplified-payload retry. |
| `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` Author Proposal #2 | Pre-flight pg_proc probe for RPC SPECs | N/A — this SPEC does not create or modify any PL/pgSQL RPC. The pg_cron consumer is a SQL statement embedded in `cron.schedule(...)`, not a named RPC. |
| `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` Executor Proposal #1 | Tool availability pre-flight (npx mmdc, playwright, etc.) | §4 pre-authorizes: if Executor needs Supabase CLI (`supabase` binary), check `supabase --version` at session start. |
| `M4_TEMPLATE_VALIDATION_UNIFIED` Author Proposal #1 | Pre-emptively prescribe `ROLLBACK.md` over `_down.sql` when §Destructive Operations is `None.` for substantive parts | §Destructive Operations declares 1 op (Make scenario retirement). Rollback artifact lives at `ROLLBACK.md` (doc-context, fenced SQL blocks), NOT `_down.sql`. Avoids hook collision with `DROP COLUMN` regex inside rollback artifact. |
| `M4_TEMPLATE_VALIDATION_UNIFIED` Author Proposal #2 | Cleanup SQL block in integration tests | §3.2 integration test scenario A bundles its cleanup into a single idempotent block filtered by `tenant_id=demo AND event_id=<TEST_EVENT_ID>` so re-running is safe; cleanup runs as 1 MCP call. |
| `M4_TEMPLATE_VALIDATION_UNIFIED` Executor Proposal #1 | After `git add <path>`, run `git diff --cached --name-only` and confirm only intended files staged | §4 Autonomy Envelope codifies this — Executor MUST run the check before every `git commit`. Unexpected files → `git reset HEAD <file>` to unstage, then commit. |
| `M4_TEMPLATE_VALIDATION_UNIFIED` Executor Proposal #2 | Multi-file EF with shared deps: prefer Supabase CLI over MCP `deploy_edge_function` | `fb-capi-dispatch` is single-file (no `_shared/` imports per Brief §3) → MCP-first is appropriate. If MCP returns 5xx → CLI fallback per OPEN-021 (immediate, no retry). Documented in §4. |

### Live DB Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | Source | Value (captured 2026-05-15) |
|---|---|---|
| `BASE_CAPI_TABLES` | `information_schema.tables WHERE table_name ILIKE '%capi%'` | 0 (only `crm_facebook_campaigns` exists — different domain, no collision) |
| `BASE_CRM_LEADS_FB_COLS` | `information_schema.columns WHERE table_name='crm_leads' AND column_name ILIKE '%fb%' OR ILIKE '%event_id%' OR ILIKE '%pixel%'` | 0 |
| `BASE_TENANTS_FB_CAPI_COL` | `information_schema.columns WHERE table_name='tenants' AND column_name ILIKE '%fb_capi%'` | 0 (Brief assumption was wrong — see divergence table above) |
| `BASE_STOREFRONT_CONFIG_ANALYTICS_PRIZMA` | `SELECT analytics FROM storefront_config WHERE tenant_id=<prizma>` | `{"facebook_pixel_id":"304574492100180","pixel_events":[…]}` (no `fb_capi_token` key yet) |
| `BASE_STOREFRONT_CONFIG_ANALYTICS_DEMO` | `SELECT analytics FROM storefront_config WHERE tenant_id=<demo>` | `{}` |
| `BASE_PG_CRON_JOBS` | `SELECT count(*) FROM cron.job` | 6 (no `fb_capi_dispatch_consumer` exists) |
| `BASE_ACTIVE_EFS` | `mcp__claude_ai_Supabase__list_edge_functions` count | 25 (no `fb-capi-dispatch` exists; closest neighbor is `facebook-campaigns-sync` — different domain, no collision) |
| `BASE_CRM_LEADS_PRIZMA_ROWS` | `SELECT count(*) FROM crm_leads WHERE tenant_id=<prizma>` | TBD — Executor captures at Step 1.5 pre-flight, must equal post-SPEC count for Prizma read-only invariant |
| `BASE_MAKE_SCENARIO_8542928` | Make MCP `scenarios_get(8542928)` | Exists, INACTIVE (per Brief §2; Executor re-confirms) |

### D-AUTH (Foreman decisions pre-committed at author time)

- **D-AUTH-1 (token storage path).** Token lives at `storefront_config.analytics->>'fb_capi_token'`. NO new column on `tenants`. NO new `secrets` table. Defended by Brief D6 intent (per-tenant config, no new secrets table) + KNOWLEDGE_MAP reference + the precedent of `facebook_pixel_id` already being a JSONB key there.
- **D-AUTH-2 (storefront scope cut).** Storefront-side change is OUT OF SCOPE for this SPEC. The `lead-intake` EF is updated to ACCEPT a new optional `fb_event_id` body field (null-tolerant). Storefront-side substrate (UUID gen + hidden field + thank-you-page pixel `eventID`) is queued as follow-up `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` SPEC in `opticalis/opticup-storefront`. Until that ships: `crm_leads.fb_event_id` is NULL for all rows; CAPI dispatch fires without event_id; Meta does not dedup (no double-counting risk because browser pixel still binds to thank-you-page URL → CAPI fires at insert → Meta treats them as two events; this is a pre-existing accepted state, just with one additional CAPI-side Lead per submission — small lift in ROAS measurement, full dedup ships in follow-up). Substrate is built so the follow-up is a one-day storefront PR, not an architecture project.
- **D-AUTH-3 (demo CAPI dispatch).** Daniel did NOT supply a demo sandbox CAPI token at SPEC dispatch time. Demo behavior: CAPI dispatch row writes with `status='skipped_no_token'` and `error_message='no fb_capi_token configured for tenant in storefront_config.analytics'`. Logged, dispatched as no-op. Prizma behavior: dispatch with real token IF Daniel populates `storefront_config.analytics.fb_capi_token` for Prizma post-SPEC. If still empty at SPEC end → Prizma also runs in skipped_no_token mode until populated. The Edge Function code path is identical regardless of which tenant; the gate is "is `fb_capi_token` key present and non-empty?"
- **D-AUTH-4 (Iron Rule 32 declared destructive op count).** §Destructive Operations declares 1 op: Make scenario 8542928 retirement (delete OR archive depending on Make MCP capability). All DB work is purely additive (1 new table, 2 new columns, 1 new EF, 1 new pg_cron job, 1 new doc). The Iron-Rule-32 hook will pass at every commit boundary. If the Executor encounters a need for any other destructive op mid-run → STOP per Brief §8 + global stop triggers.
- **D-AUTH-5 (Iron Rule 15 RLS pattern on `crm_capi_dispatch_queue`).** Canonical 2-policy: `service_bypass` (`USING true` for `service_role`) + `tenant_isolation` (`USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)` for `public`). Byte-identical to `crm_message_queue` template verified in §0 baselines. NO `auth.uid()`. NO custom variants.
- **D-AUTH-6 (queue idempotency).** Each row in `crm_capi_dispatch_queue` corresponds to one CAPI dispatch attempt. The pg_cron consumer claims rows with `FOR UPDATE SKIP LOCKED LIMIT N` (N=20 per tick by default) and dispatches per row. After dispatch, status transitions: `queued` → `sent` / `failed` / `skipped_no_token` / `no_match` / `permanent_error`. `failed` rows with retries < 3 stay re-queueable; `permanent_error` rows are terminal. Idempotency key = the queue row's `id` (UUID, gen_random_uuid). NO concurrent dispatch of the same row (SKIP LOCKED).
- **D-AUTH-7 (advanced matching parameters).** EF computes `em` = `sha256(lowercase(trim(crm_leads.email)))` hex digest and `ph` = `sha256(E.164(crm_leads.phone))` hex digest at dispatch time. Phone normalization: prefix `+972` after stripping leading `0`. If `email` or `phone` missing — that parameter omitted from the dispatch (union not intersection, per Brief D4). If BOTH missing → status `no_match`, dispatch skipped (Meta requires at least one matchable param). Cookies (`_fbp`, `_fbc`) are NOT available server-side without explicit forwarding from the browser; this SPEC does NOT forward them — they remain a follow-up enrichment in the storefront SPEC.
- **D-AUTH-8 (no PII in queue rows).** The queue row stores `lead_id` (uuid pointer to `crm_leads`) and a JSONB `event_payload` cache built at enqueue time. The EF re-reads `crm_leads` at dispatch time to get fresh email/phone (in case lead was updated), hashes server-side, sends to Meta. Plaintext email/phone DO NOT live in `event_payload` JSONB — only the already-hashed values for replayability. Storage minimization per Rule 23 (no secrets in code) and GDPR posture.

---

## 1. Goal

Ship ERP-side substrate for hybrid Facebook Pixel + Conversions API (CAPI) Lead-event deduplication: new `crm_capi_dispatch_queue` table + `crm_leads.fb_event_id`/`fb_pixel_fired_at` columns + new `fb-capi-dispatch` Edge Function + 1-minute pg_cron consumer + `lead-intake` update to accept `fb_event_id`, plus token-storage convention in `storefront_config.analytics.fb_capi_token`, plus canonical documentation. Storefront-side handoff (UUID generation + thank-you-page pixel `eventID`) deferred to sibling-repo follow-up SPEC. Retire Make scenario 8542928 at SPEC end.

---

## 2. Background & Motivation

Phase 1 funnel infrastructure closed 2026-05-14 (P1.1/P1.2/P1.3/P1.4). Measurement chain is intact end-to-end on demo. But the Facebook side of the funnel still measures with a known gap: the browser pixel fires only on thank-you-page load — when the post-submit redirect fails or an ad-blocker strips the pixel, the lead lands in our DB but Facebook never gets a `Lead` event → ROAS under-counts.

This SPEC builds the **server-side CAPI substrate** to fire `Lead` events the moment `crm_leads` is created — the substrate that the eventual hybrid Pixel+CAPI deduplication requires. The shared `event_id` round-trip is a storefront-side follow-up; once it ships, the same substrate provides Meta's dedup. Until then: ERP runs CAPI server-side without dedup (no double-counting risk because browser pixel still binds to thank-you-page URL only). Match quality lift via advanced matching (`em` + `ph`) is delivered immediately and independently of the storefront PR.

Architecture decision (Brief D1, preserved): retire Make scenario 8542928 (`שליחת רכישות לפייסבוק`, currently inactive) — Messaging Architecture v2 says Make = pipe only, zero DB access; CAPI needs to enrich each event with `crm_leads` data, must be an Edge Function. Make-side cleanup is the SPEC's single declared destructive op.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value + a verify command.

| # | Criterion | Expected value | Verify command |
|---|-----------|----------------|----------------|
| 1 | Branch state | On `develop`, working tree clean at SPEC close | `git status --short` → empty |
| 2 | Commits produced | 7 commits in this SPEC's range (1 SPEC.md seal + 1 DB migration + 1 EF + 1 lead-intake update + 1 docs + 1 Make retirement + 1 retrospective trio); ±1 acceptable for Pipeline-mode consolidation | `git log {SPEC_SEAL_COMMIT}..HEAD --oneline \| wc -l` → 6–8 |
| 3a | New table `crm_capi_dispatch_queue` exists | 1 | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_capi_dispatch_queue'` → 1 |
| 3b | New table has `tenant_id UUID NOT NULL` (Iron Rule 14) | TRUE | `SELECT is_nullable, data_type FROM information_schema.columns WHERE table_name='crm_capi_dispatch_queue' AND column_name='tenant_id'` → `('NO','uuid')` |
| 3c | New table has canonical 2-policy RLS (Iron Rule 15) | exactly 2 policies, both byte-identical to `crm_message_queue` USING clauses | `SELECT policyname, qual FROM pg_policies WHERE tablename='crm_capi_dispatch_queue' ORDER BY policyname` → `service_bypass(true)` + `tenant_isolation(JWT-claim canonical)` |
| 3d | New table has tenant-scoped UNIQUE on `(lead_id, tenant_id)` (Iron Rule 18 — prevents duplicate dispatch rows per lead per tenant) | 1 | `SELECT count(*) FROM pg_constraint WHERE conrelid='public.crm_capi_dispatch_queue'::regclass AND contype='u'` → 1 |
| 4a | `crm_leads.fb_event_id` column added (UUID nullable) | exists, `data_type=uuid, is_nullable=YES` | `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='fb_event_id'` |
| 4b | `crm_leads.fb_pixel_fired_at` column added (timestamptz nullable) | exists, `data_type='timestamp with time zone', is_nullable=YES` | `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='fb_pixel_fired_at'` |
| 5 | pg_cron job `fb_capi_dispatch_consumer` exists, schedule `* * * * *`, active=true | exists | `SELECT jobname, schedule, active FROM cron.job WHERE jobname='fb_capi_dispatch_consumer'` → 1 row, schedule=`* * * * *`, active=true |
| 6 | Edge Function `fb-capi-dispatch` deployed, ACTIVE, `verify_jwt=false` (Origin-allowlisted in EF source like `lead-intake` + `submit-lead`) | 1 | `mcp__claude_ai_Supabase__list_edge_functions` returns `slug='fb-capi-dispatch', status='ACTIVE', verify_jwt=false` |
| 7a | `lead-intake` EF accepts new optional body field `fb_event_id` (UUID string, null-tolerant), writes to `crm_leads.fb_event_id`, enqueues a `crm_capi_dispatch_queue` row on successful lead INSERT | curl test on demo: POST `lead-intake` with body containing `fb_event_id` → 200 OK, `crm_leads.fb_event_id` populated, `crm_capi_dispatch_queue` row created | See §3.2 integration test scenario A |
| 7b | `lead-intake` EF without `fb_event_id` still works (backward-compat) | curl test on demo: POST `lead-intake` without `fb_event_id` → 200 OK, `crm_leads.fb_event_id` IS NULL, `crm_capi_dispatch_queue` row created with `event_id` NULL | See §3.2 integration test scenario B |
| 7c | Storefront-side handoff deferred — `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` SPEC stub written to OPEN_TASKS | New row in OPEN_TASKS.md referencing follow-up | `grep -c "M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF" OPEN_TASKS.md` → ≥ 1 |
| 8a | Demo CAPI dispatch path runs (with `status='skipped_no_token'` since Daniel did not supply a sandbox token per D-AUTH-3) — proves the pg_cron consumer + EF + queue → status transition wiring works end-to-end | 1 row in `crm_capi_dispatch_queue` for demo with `status='skipped_no_token'` within ≤ 90s of test lead INSERT | See §3.2 integration test scenario A |
| 8b | Prizma CAPI dispatch path is IDLE until Daniel populates `storefront_config.analytics.fb_capi_token` for Prizma post-SPEC (no rows generated for Prizma during SPEC run because no Prizma test lead is created) — Prizma read-only invariant | `SELECT count(*) FROM crm_capi_dispatch_queue WHERE tenant_id=<prizma>` → 0 at SPEC close | Direct SQL probe |
| 9a | Smoke 7/7 PRE: delegate to most recent green TEST_REPORT.md from prior M4 SPEC chain (latest = M4_BROADCAST_ID_PROPAGATION 2026-05-14 close at `c8b5279`) | "delegated to prior green" annotation in TEST_REPORT.md §1 | TEST_REPORT.md §1 references prior commit hash |
| 9b | Smoke 7/7 POST: LH-Tester runs `npm run test:smoke` and reports 7/7 PASS | 7 PASS, 0 FAIL | LH-Tester writes TEST_REPORT.md §2 with full run output |
| 10 | Iron Rule 31 integrity gate exit code | 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 11 | Iron Rule 32 destructive-ops gate exit code at every commit | 0 (gate passes) at all 6–8 commits | `node scripts/checks/destructive-ops-declared.mjs` per pre-commit hook |
| 12 | Make scenario 8542928 retired | Either `scenarios_get(8542928)` returns "not found" (deleted) OR scenario shows in an archived/disabled state inconsistent with active use | Make MCP `scenarios_get(8542928)` |
| 13 | Doc `docs/FB_CAPI.md` exists and covers: contract, event_id flow (including the storefront-deferred handoff), advanced matching (em+ph spec), queue mechanics, replay procedure, troubleshooting (status enum values) | file exists, ≥ 200 lines | `wc -l docs/FB_CAPI.md` → ≥ 200 |
| 14 | KNOWLEDGE_MAP.md Gap #5 marked CLOSED via P2.1 with note about the deduplication preserving Q7 thank-you-only conversion model | Line annotated | `grep -A 3 "Gap #5" roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` shows CLOSED marker referencing this SPEC |
| 15 | FUNNEL_ROADMAP P2.1 row flipped PLANNED → ✅ CLOSED | Line edited | `grep "P2.1" roles/site-overseer/FUNNEL_ROADMAP.md` shows ✅ CLOSED with commit reference |
| 16 | Prizma read-only invariant | `crm_leads` Prizma count, `tenants` Prizma row, `storefront_config` Prizma row — all bit-identical pre/post except for any token Daniel may populate POST-SPEC | Compare pre-flight (`BASE_CRM_LEADS_PRIZMA_ROWS`) vs post-SPEC; both equal |
| 17 | EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md written into this SPEC folder | 4 files exist | `ls modules/Module\ 4\ -\ CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/` → contains all 5 (incl. SPEC.md) and optionally ROLLBACK.md |

### 3.1 Integration Test Scenario A — `lead-intake` with `fb_event_id` on demo

**Setup (Executor runs before EF deploy + after EF deploy for control):**
```sql
-- 1. Pick demo tenant id
SELECT id FROM tenants WHERE slug='demo';  -- expect 8d8cfa7e-ef58-49af-9702-a862d459cccb
```

**Test (after EF deploy, after lead-intake v26+ deploy):**
```bash
TEST_UUID=$(uuidgen)
TEST_EMAIL="fb-capi-test-$(date +%s)@example.com"
TEST_PHONE="+972501234567"
echo "Test event_id: $TEST_UUID"

curl -X POST 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/lead-intake' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://demo.opticalis.co.il' \
  -d '{
    "tenant_slug": "demo",
    "name": "FB CAPI Test",
    "email": "'$TEST_EMAIL'",
    "phone": "'$TEST_PHONE'",
    "source": "supersale",
    "fb_event_id": "'$TEST_UUID'"
  }'
# Expect HTTP 200, response includes lead_id
```

**Verify (within 90s of POST — pg_cron tick guaranteed within 60s + EF dispatch ~30s):**
```sql
-- A1. crm_leads row created with fb_event_id populated
SELECT id, email, phone, fb_event_id
  FROM crm_leads
 WHERE email = '<TEST_EMAIL>' AND tenant_id = (SELECT id FROM tenants WHERE slug='demo');
-- Expect: 1 row, fb_event_id = TEST_UUID

-- A2. crm_capi_dispatch_queue row created
SELECT id, lead_id, event_id, status, error_message, retries
  FROM crm_capi_dispatch_queue
 WHERE lead_id = (SELECT id FROM crm_leads WHERE email = '<TEST_EMAIL>');
-- Expect: 1 row, event_id = TEST_UUID (or NULL if storefront didn't send), status = 'skipped_no_token' after cron tick

-- A3. pg_cron picked up the row
SELECT j.jobname, jrd.status, jrd.start_time, jrd.end_time
  FROM cron.job_run_details jrd
  JOIN cron.job j ON j.jobid = jrd.jobid
 WHERE j.jobname = 'fb_capi_dispatch_consumer'
 ORDER BY jrd.start_time DESC LIMIT 3;
-- Expect: at least 1 'succeeded' row in last 2 minutes
```

**Cleanup SQL (single idempotent block — runnable end of test, idempotent on re-run):**
```sql
WITH demo_id AS (SELECT id FROM tenants WHERE slug='demo'),
     test_leads AS (SELECT id FROM crm_leads WHERE email LIKE 'fb-capi-test-%@example.com' AND tenant_id = (SELECT id FROM demo_id))
DELETE FROM crm_capi_dispatch_queue WHERE lead_id IN (SELECT id FROM test_leads);

DELETE FROM crm_leads WHERE email LIKE 'fb-capi-test-%@example.com' AND tenant_id = (SELECT id FROM tenants WHERE slug='demo');
```

### 3.2 Integration Test Scenario B — `lead-intake` without `fb_event_id` (backward-compat)

Same as Scenario A but WITHOUT `fb_event_id` in POST body. Expect: lead created, `fb_event_id IS NULL`, queue row created with `event_id IS NULL`, status `skipped_no_token`. Confirms backward-compat for any callers (Make, manual entries, etc.) that don't supply the new field.

Cleanup uses the same WITH block (idempotent — handles both scenarios in one block).

### 3.3 Iron Rule 14 (defense-in-depth) probe

Executor verifies the new EF + queue table both use `tenant_id` filtering belt+suspenders style:
- `fb-capi-dispatch/index.ts` includes `.eq('tenant_id', tenantId)` filter on every `.from('crm_capi_dispatch_queue')` and `.from('crm_leads')` query (Iron Rule 22).
- INSERT into queue passes `tenant_id` explicitly even though it's also FK-derived.
- Grep verification: `grep -n "tenant_id" supabase/functions/fb-capi-dispatch/index.ts` → ≥ 4 hits.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file in `opticalis/opticup` repo
- Run read-only SQL on `tsxrrxzmdxaenlvocyit` (Level 1 autonomy)
- Apply DDL via `mcp__claude_ai_Supabase__apply_migration` for the 1 new table + 2 new columns + 1 new pg_cron job (Level 2, pre-authorized by this SPEC)
- Create the EF source at `supabase/functions/fb-capi-dispatch/index.ts` + `deno.json`
- Deploy the EF: try `mcp__claude_ai_Supabase__deploy_edge_function` FIRST. On `InternalServerErrorException` (any 5xx) → **immediately switch to** `supabase functions deploy fb-capi-dispatch --project-ref tsxrrxzmdxaenlvocyit` from the local shell — do NOT retry with simplified payload (OPEN-021 pattern, 7+ recurrences; harvested rule). Pre-flight: confirm `supabase --version` returns ≥ 1.x at session start.
- Update `lead-intake` EF source + deploy (single-file, no `_shared/` deps → MCP-first; CLI fallback if 5xx, same OPEN-021 rule)
- Write `docs/FB_CAPI.md`, update `KNOWLEDGE_MAP.md` Gap #5, update `FUNNEL_ROADMAP.md` P2.1, update M4 `SESSION_CONTEXT.md` + `db-schema.sql`
- Retire Make scenario 8542928 via `mcp__claude_ai_Make__scenarios_delete` (preferred) or `scenarios_deactivate` followed by archival annotation in the scenario's name (acceptable fallback if delete refuses)
- Selective `git add <file_path>` by name throughout. **After every `git add`, run `git diff --cached --name-only` to confirm only intended files are staged.** If unexpected files appear → `git reset HEAD <file>` to unstage (Executor Proposal #1 harvested from M4_TEMPLATE_VALIDATION_UNIFIED). Never `git add -A`. Never `git add .`. Never `git commit -am`.
- Commit and push to `develop`
- Run `npm run verify:integrity`, `npm run test:smoke` (the latter is the LH-Tester's deliverable — Executor may run it ONCE to verify own work before handing off)

### What REQUIRES stopping and reporting

- Any storefront-repo (`opticalis/opticup-storefront`) file modification — D-AUTH-2 keeps the storefront work in a follow-up SPEC. If the Executor finds that the SPEC genuinely cannot close without a storefront commit → STOP, write escalation file `modules/Module 4 - CRM/escalations/{ISO_TS}_storefront-required.md`, halt.
- Any DDL beyond what §8 Expected Final State lists (e.g., new function, new policy outside the 2 canonical ones, new role) — STOP
- Make MCP `scenarios_delete(8542928)` returns an error AND `scenarios_deactivate(8542928)` ALSO returns an error → STOP, escalate per Brief §8 Stop Trigger 3
- The integrity gate (Iron Rule 31) returns exit 1 (null-byte ERROR) at any commit boundary → STOP
- The destructive-ops gate (Iron Rule 32) blocks a commit → STOP, do NOT bypass with `--no-verify`. Investigate. The only declared destructive op is the Make-side cleanup (see §Destructive Operations) which does not touch repo files — so the hook should pass clean on all DB+EF+docs commits.
- Smoke 7/7 fails post-deploy → STOP (substrate broke a baseline test)
- Any merge to `main` → NEVER. The Executor never merges to main; per CLAUDE.md §9 Working Rule 7 only Daniel authorizes that.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals and §4 above)

- If `lead-intake` EF post-update returns 4xx/5xx on the existing Prizma supersale form payload (without `fb_event_id`) — i.e., backward-compat broken → STOP, the v26 deploy regressed production
- If `crm_capi_dispatch_queue` rows accumulate WITHOUT the pg_cron consumer advancing them past `queued` → STOP (consumer broken)
- If `fb-capi-dispatch` EF panics on a row with missing email AND missing phone instead of writing `status='no_match'` → STOP (no-match path not implemented)
- If integration test Scenario A's `crm_capi_dispatch_queue` row never appears within 90s of POST → STOP (lead-intake-side enqueue broken)
- If integration test Scenario B (without `fb_event_id`) fails — meaning the optional field path broke backward-compat → STOP
- If `tenants.fb_capi_token` column accidentally gets created (Executor following the Brief literally instead of the SPEC's D-AUTH-1 resolution) → STOP, this is a Foreman-decision violation
- If a CRITICAL Sentinel alert fires during SPEC run referencing any file the SPEC touched → STOP, report to Foreman

---

## 6. Rollback Plan

See `ROLLBACK.md` (sibling file in this folder — fenced SQL, doc-context, NOT `_down.sql`). Author Proposal #1 from M4_TEMPLATE_VALIDATION_UNIFIED applied: ROLLBACK.md avoids the hook regex collision with `DROP COLUMN` patterns.

Quick summary (full SQL in ROLLBACK.md):
- Drop pg_cron job `fb_capi_dispatch_consumer`
- Undeploy `fb-capi-dispatch` EF (or set inactive)
- Revert `lead-intake` to v25 (prior version)
- `DROP TABLE crm_capi_dispatch_queue` (additive, no FK back-pointers from other tables)
- `ALTER TABLE crm_leads DROP COLUMN fb_event_id, DROP COLUMN fb_pixel_fired_at` (additive)
- Restore Make scenario 8542928 (if Make MCP supports — likely manual recreation from Make's deleted-scenarios history if needed)

Master safety git tag: `pre-fb-capi-start` at SPEC seal commit. Rollback is `git reset --hard pre-fb-capi-start` for the repo side + ROLLBACK.md SQL execution for the DB side. No production data destruction.

---

## Destructive Operations

Required by Iron Rule 32. List every destructive operation this SPEC authorizes — file deletes, mass renames (≥ 5 files), `git rebase`, `git reset --hard`, `git push --force`, SQL `DROP`/`TRUNCATE`/tenant-unscoped `DELETE`, deletions from governance docs, modification of `main`. The hook regex (`scripts/checks/destructive-ops-declared.mjs`) DOES NOT accept `§N.` prefixes — heading text MUST be exactly `## Destructive Operations` or `## N. Destructive Operations`.

1. Make scenario 8542928 retirement at SPEC end via Make MCP — `scenarios_delete(8542928)` preferred; `scenarios_deactivate(8542928)` + name-annotation as `[ARCHIVED 2026-05-15 by M4_FB_CAPI_HYBRID_DEDUPLICATION SPEC]` acceptable fallback if delete is unavailable. This is a Make-side state change, NOT a repo-file change — the Iron-Rule-32 hook does not scan Make. Declared here for SPEC discipline.

No other destructive ops authorized. All DB work is purely additive (new table, new columns, new pg_cron job, new EF, new doc). If the Executor encounters a need for any other destructive op mid-run → STOP per §4 + Brief §8.

---

## 7. Out of Scope (explicit)

- **Purchase events** — follow-up SPEC `M4_FB_CAPI_PURCHASE_EVENTS` after ≥ 200 dispatched Lead events validated against Meta Events Manager (7-day stability window). Queue substrate is event-name-agnostic; adding Purchase later is a new EF code path + new template, not new infrastructure.
- **Storefront-side UUID generation, hidden form field, thank-you-page pixel `eventID`** — follow-up SPEC `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` in `opticalis/opticup-storefront`. Per D-AUTH-2.
- **Cookie forwarding (`_fbp`, `_fbc`)** — server-side EF doesn't have direct access to browser cookies. Forwarding requires storefront-side capture + body field passthrough — follow-up.
- **WhatsApp QR walk-in Lead attribution** — `/quick-register/` is a different funnel with a different attribution model. Out of scope.
- **Custom or standard events beyond `Lead`** — v1 ships `Lead` only.
- **Storefront pixel architecture rework** — pixel stays where it is.
- **P2.2 pixel-validation-gap dashboard UI** — Brief D5 reduced this to a one-page dashboard query that consumes `crm_capi_dispatch_queue.status` counts joined with `crm_leads.fb_pixel_fired_at`. Substrate ships here; dashboard query ships in a 30-60 min follow-up after the storefront PR populates `fb_pixel_fired_at`.
- **Phase 2.5 Funnel Health Dashboard** — separate downstream initiative.
- **Make scenario 8542928 logic reconstruction** — it is being retired, not migrated.
- **Tenant onboarding flow for second tenant** — SaaS-clean by construction (token lives in JSONB, no per-tenant code); second-tenant docs handled at first SaaS prospect, not here.

---

## 8. Expected Final State

After Executor finishes, the repo + DB contain:

### New files (repo)
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md` — this file
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/ROLLBACK.md` — rollback SQL doc-context (fenced)
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/EXECUTION_REPORT.md` — Executor deliverable
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/FINDINGS.md` — Executor deliverable
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/TEST_REPORT.md` — LH-Tester deliverable
- `modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` — Foreman closure
- `supabase/functions/fb-capi-dispatch/index.ts` — new EF source
- `supabase/functions/fb-capi-dispatch/deno.json` — EF Deno config
- `docs/FB_CAPI.md` — canonical reference for the substrate, the contract, and the deferred storefront handoff

### Modified files (repo)
- `supabase/functions/lead-intake/index.ts` — accept optional `fb_event_id` field, persist on `crm_leads`, enqueue `crm_capi_dispatch_queue` row on successful INSERT. Backward-compat preserved (field is optional, null-tolerant).
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — top-bullet entry referencing SPEC closure
- `modules/Module 4 - CRM/docs/db-schema.sql` — append section documenting the new table + columns + pg_cron job (M4 owns this; canonical merge into `docs/GLOBAL_SCHEMA.sql` deferred to next M4 Integration Ceremony)
- `roles/site-overseer/FUNNEL_ROADMAP.md` — P2.1 row PLANNED → ✅ CLOSED
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — Gap #5 marked CLOSED via P2.1
- `OPEN_TASKS.md` — 2 new rows queued: (a) `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` (storefront follow-up), (b) `M4_FB_CAPI_PURCHASE_EVENTS` (after 7-day Lead stability)

### New files (NOT in repo — Make state change only)
- Make scenario 8542928 — retired (deleted or archived). Make MCP records the change; no repo trace.

### DB state (purely additive)
- New table `crm_capi_dispatch_queue` with columns: `id uuid PK`, `tenant_id uuid NOT NULL`, `lead_id uuid NOT NULL REFERENCES crm_leads(id)`, `event_id uuid NULL` (the shared FB event_id; NULL when storefront not yet sending), `event_name text NOT NULL DEFAULT 'Lead'`, `event_payload jsonb NULL`, `status text NOT NULL DEFAULT 'queued'` (enum-via-CHECK: `queued|sent|failed|skipped_no_token|no_match|permanent_error`), `retries int NOT NULL DEFAULT 0`, `error_message text NULL`, `meta_response jsonb NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `scheduled_at timestamptz NOT NULL DEFAULT now()`, `processed_at timestamptz NULL`, `UNIQUE(lead_id, tenant_id)`.
- New columns on `crm_leads`: `fb_event_id uuid NULL`, `fb_pixel_fired_at timestamptz NULL`.
- New pg_cron job `fb_capi_dispatch_consumer` schedule `* * * * *` active=true, SQL body invokes the EF for each `queued` row claimed via `FOR UPDATE SKIP LOCKED LIMIT 20`.
- 2 RLS policies on `crm_capi_dispatch_queue`: `service_bypass` + `tenant_isolation` (canonical, byte-identical to `crm_message_queue`).

### Docs updated
- M4 `SESSION_CONTEXT.md`: ✅ closure paragraph prepended
- M4 `db-schema.sql`: section appended documenting new objects
- `docs/FB_CAPI.md`: new canonical reference (≥ 200 lines)
- `KNOWLEDGE_MAP.md`: Gap #5 CLOSED
- `FUNNEL_ROADMAP.md`: P2.1 ✅
- `OPEN_TASKS.md`: 2 new queue rows
- **NOT updated this SPEC (deferred per Brief §7 / Authority Matrix):** `MASTER_ROADMAP.md` §3, `docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`. These update at the next M4 Integration Ceremony, not per-SPEC.

---

## 9. Commit Plan

7 commits indicative; ±1 acceptable for consolidation. Executor adjusts after pre-flight. Selective `git add` by name throughout.

- **C1 — SPEC seal:** `docs(spec): seal M4_FB_CAPI_HYBRID_DEDUPLICATION SPEC.md + ROLLBACK.md` — `SPEC.md` + `ROLLBACK.md`
- **C2 — DB migration:** `feat(m4): add crm_capi_dispatch_queue table + fb_event_id/fb_pixel_fired_at on crm_leads + pg_cron consumer` — applied via `apply_migration` MCP; repo side gets `db-schema.sql` append for M4
- **C3 — Edge Function:** `feat(m4): add fb-capi-dispatch Edge Function` — `supabase/functions/fb-capi-dispatch/index.ts` + `deno.json`
- **C4 — lead-intake update:** `feat(m4): lead-intake accepts fb_event_id, enqueues CAPI dispatch row` — `supabase/functions/lead-intake/index.ts`
- **C5 — Docs:** `docs(m4): add FB_CAPI.md + update KNOWLEDGE_MAP Gap #5 + FUNNEL_ROADMAP P2.1` — `docs/FB_CAPI.md`, `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md`, `roles/site-overseer/FUNNEL_ROADMAP.md`, `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`, `OPEN_TASKS.md`
- **C6 — Make retirement:** `chore(make): retire scenario 8542928 (replaced by fb-capi-dispatch EF)` — repo touches only if cleanup metadata is recorded somewhere; otherwise the Make MCP call is the side-effect and this commit is empty-body / not needed. If empty → skip C6 and roll into C7.
- **C7 — Retrospective trio:** `chore(spec): close M4_FB_CAPI_HYBRID_DEDUPLICATION with EXECUTION_REPORT + FINDINGS + TEST_REPORT` — Executor + LH-Tester deliverables.

Foreman closure commit (`FOREMAN_REVIEW.md`) is separate; it follows after the LH-Tester chain.

---

## 10. Dependencies / Preconditions

- ✅ Phase 1 closed (P1.1–P1.4 all 🟢 CLOSED 2026-05-14) — confirmed in MASTER_ROADMAP §3
- ✅ `lead-intake` EF v25 active (verified at SPEC author time via `list_edge_functions`)
- ✅ Make MCP available (Make scenario retirement step requires it)
- ✅ Supabase CLI available locally — Executor confirms `supabase --version` at session start (OPEN-021 fallback path)
- ✅ Repo on `develop`, clean tree at SPEC dispatch (Executor confirms in Step 0 / §1.5)
- ✅ Iron Rule 31 integrity gate exit 0 at session start
- ⚠️ Daniel has NOT supplied a demo sandbox CAPI token (per D-AUTH-3) — SPEC handles this with `status='skipped_no_token'` no-op mode

---

## 11. Lessons Already Incorporated

All lessons listed in §0 "Lessons Applied from Prior 3 FOREMAN_REVIEWs" are honored in the SPEC body. Cross-reference:

- ROLLBACK.md substituted for `_down.sql` (M4_TEMPLATE_VALIDATION_UNIFIED Author #1) → see §6 + ROLLBACK.md sibling file
- Cleanup SQL block as single idempotent statement (M4_TEMPLATE_VALIDATION_UNIFIED Author #2) → see §3.1 cleanup block
- Smoke pre/post split in Pipeline mode (M4_BROADCAST_ID_PROPAGATION Author #2) → see §3 criteria 9a/9b
- MCP→CLI EF deploy fallback on first 5xx, no simplified-payload retry (M4_BROADCAST_ID_PROPAGATION Executor #1) → see §4 Autonomy Envelope
- Stage-exactly-named-files verification (M4_TEMPLATE_VALIDATION_UNIFIED Executor #1) → see §4 Autonomy Envelope
- Canonical JWT validation header → N/A (no SECURITY DEFINER RPCs in this SPEC; queue is RLS-isolated only)
- Function-signature DROP rule → N/A (no PL/pgSQL function signature changes)

---

## 12. Pre-Merge Checklist

Every SPEC must pass these before closure. Any failure → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria PASS with actual values captured in `EXECUTION_REPORT.md §2` (numeric/text proof per criterion)
- [ ] **Iron Rule 31 Integrity Gate:** `npm run verify:integrity` exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] **Iron Rule 32 Destructive Ops Gate:** every commit passed the pre-commit hook. No `--no-verify` bypasses anywhere in the commit range.
- [ ] `git status --short` returns empty (clean tree)
- [ ] HEAD pushed to `origin/develop`
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md + FOREMAN_REVIEW.md all written in the SPEC folder
- [ ] M4 SESSION_CONTEXT.md + db-schema.sql updated; FUNNEL_ROADMAP P2.1 + KNOWLEDGE_MAP Gap #5 marked CLOSED
- [ ] OPEN_TASKS.md has the 2 new follow-up SPEC rows
- [ ] Smoke 7/7 POST-state GREEN per LH-Tester TEST_REPORT.md
- [ ] Prizma read-only invariant preserved (criterion 16)

---

*End of SPEC.md — M4_FB_CAPI_HYBRID_DEDUPLICATION.*
