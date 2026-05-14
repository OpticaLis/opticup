# SPEC — M3_UTM_TRIPLE_LAYER_PERSISTENCE

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4 — cross-cut SPEC)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM (touchpoint table OWNERSHIP) ; cross-cut with M3 Storefront capture points
> **Phase (if applicable):** Phase 1 P1.1 of `roles/site-overseer/FUNNEL_ROADMAP.md`
> **Author signature:** opticup-strategic, Full-Auto Pipeline chat 2026-05-14
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M3_UTM_TRIPLE_LAYER_PERSISTENCE_BRIEF.md`

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Confirms the SPEC is grounded in actual repo state, not in Brief assumptions that may have drifted.

- Brief read in full on 2026-05-14.
- `STATE_TRANSITIONS.md` + `RPC_BODY.sql` + `FINDINGS.md` read from `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/` (P1.4).
- `KNOWLEDGE_MAP.md` Layer 2 + Layer 4 read.
- `FUNNEL_ROADMAP.md` Phase 4 E1-E7 table read.
- Live RPC body md5 verified: `31fea2eaf0086cf917d0d65a8595d41c` (length 4674 bytes) — matches the post-FIND-1-fix state per `FINDINGS.md` line 9 of P1.4. **No drift detected**; new param additions will use `CREATE OR REPLACE` on top of this body.
- `lead-intake` EF read (v24, deployed 2026-05-14). `resolve-link` EF read (v5, deployed 2026-05-14, `verify_jwt=false`).
- Live DB pre-existence sweep (Rule 21):
  - `crm_lead_touchpoints` — **does NOT exist** ✅ (safe to create)
  - `v_crm_lead_first_touch` — **does NOT exist** ✅
  - `resolve_touchpoints_to_lead` RPC — **does NOT exist** ✅
  - `_record_touchpoint` RPC — **does NOT exist** ✅
  - `crm_touchpoint_type` enum — **does NOT exist** ✅ (using TEXT + CHECK pattern instead, matches M4 precedent)
- Existing `crm_leads.utm_*` columns: `utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id` — all TEXT NULLABLE (verified).
- Existing `short_links` columns include `lead_id uuid, event_id uuid, tenant_id uuid` — touchpoint INSERT at click time can read `lead_id` directly from short_links row (no JOIN needed at click time).
- Pre-existing untracked files survey: 60+ untracked paths recorded; user authorized selective `git add` by filename throughout (decision 2026-05-14). The Executor will leave them alone.
- Lessons applied from prior `FOREMAN_REVIEW.md` files in this module (3 most recent):
  - **FROM `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` Author Proposal:** *gitignore-awareness pass on §8 paths.* → **APPLIED**: §8 below excludes `backups/` files from the "New files" list; they live outside git per CLAUDE.md §9.9 (mandatory local safety net) but are NOT staged.
  - **FROM `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` Executor Proposal:** *Iron-Rule-32 keyword-literal awareness.* → **APPLIED**: SPEC text avoids the literal strings `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM <table>`-without-WHERE, etc., outside the `## Destructive Operations` section where appropriate. Migration body uses `CREATE TABLE` + `CREATE OR REPLACE FUNCTION` only.
  - **FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Author Proposal 2:** *pre-flight `pg_proc` probe.* → **APPLIED**: live RPC body md5 + length captured in this section (4674 bytes, md5 `31fea2ea...`).
  - **FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` FIND-2:** *RPC writes no touchpoint log.* → **APPLIED**: this SPEC is the direct architectural response to FIND-2.

### Baselines (referenced by §3 Success Criteria as `BASE_*`)

| Symbol | File / object | Metric | Value (captured 2026-05-14) |
|---|---|---|---|
| `BASE_RPC_MD5` | `register_lead_to_event` body | `md5(pg_get_functiondef(...))` | `31fea2eaf0086cf917d0d65a8595d41c` |
| `BASE_RPC_LEN` | `register_lead_to_event` body | `length(pg_get_functiondef(...))` | `4674` |
| `BASE_RPC_PRONARGS` | `register_lead_to_event` | `pronargs` | `4` (will become `13` post-SPEC) |
| `BASE_LEAD_INTAKE_VER` | `lead-intake` EF | `version` from `get_edge_function` | `24` (will become `25` post-SPEC) |
| `BASE_RESOLVE_LINK_VER` | `resolve-link` EF | `version` from `get_edge_function` | `5` (will become `6` post-SPEC) |
| `BASE_PRIZMA_LEADS` | `crm_leads` (tenant=prizma) | `COUNT(*) WHERE tenant_id=prizma AND is_deleted=false` | (capture pre-flight; must be bit-identical post-flight) |
| `BASE_PRIZMA_ATTENDEES` | `crm_event_attendees` (tenant=prizma) | `COUNT(*) WHERE tenant_id=prizma AND is_deleted=false` | (capture pre-flight; must be bit-identical post-flight) |

---

## 1. Goal

Build the `crm_lead_touchpoints` table + same-transaction capture at 3 funnel touchpoints (short-link click, lead form submit, event register) + a backward-compatible first-touch view, so that ~35% of leads no longer leak attribution after the first-touch insert. Architectural enabler for Phase 4 E1 (MTA Engine) + E7 (Customer Journey Analytics).

---

## 2. Background & Motivation

Per `KNOWLEDGE_MAP.md` Layer 2: today's `crm_leads.utm_*` columns are written **only at first INSERT** and never updated — the duplicate-branch and the event-register path both skip them. A lead acquired via FB Ads in March who later clicks an SMS broadcast in May and registers for event #24 carries `utm_source='facebook'` forever; the May registration leaves a new attendee row but emits **zero** UTM-grade evidence about what made them click `register`.

Per `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` FIND-2 (closed yesterday): the registration RPC writes no structured journey log. Phase 4 E1 (MTA Engine) is BLOCKED until a per-touchpoint capture exists; Phase 4 E7 (Customer Journey Analytics) is PARTIALLY BLOCKED. This SPEC is the unblock.

Daniel + Architect agreed 2026-05-14 to take Option A (separate touchpoints table over per-lead UTM columns) at A2 scope (system-event touchpoints only — `short_link_click`, `lead_submit`, `event_register`). Page-view tracking (A1) is deferred to Phase 4 if the MTA model demands it; the schema is shaped to add a `page_view` value to the type-check without DDL change to columns.

---

## 3. Success Criteria (Measurable)

Every criterion must have an EXACT expected value. Copy-paste-runnable when possible.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at session end | On `develop`, clean | `git status --porcelain` → empty |
| 2 | New SPEC commits | exactly **5** Executor commits + 1 Localhost-Tester commit + 1 Foreman-close commit = **7 total** in commit range | `git log <START_COMMIT>..HEAD --oneline \| wc -l` → 7 |
| 3 | New table `crm_lead_touchpoints` exists | row in `information_schema.tables` | `SELECT EXISTS(...)` → true |
| 4 | Table has `tenant_id UUID NOT NULL` (Iron Rule 14) | column with `is_nullable='NO'` | `information_schema.columns` query → true |
| 5 | Table has canonical RLS — 2 policies: `service_bypass` + `tenant_isolation` (Iron Rule 15) | exactly 2 rows in `pg_policies` for `crm_lead_touchpoints`; `tenant_isolation` USING clause contains `(((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid` | `SELECT polname, pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid='public.crm_lead_touchpoints'::regclass` → 2 rows matching pattern |
| 6 | Table has tenant-scoped UNIQUE (Iron Rule 18) on `(tenant_id, dedupe_key)` | UNIQUE constraint exists | `pg_constraint` query → 1 row |
| 7 | Table has CHECK constraint on `touchpoint_type IN ('short_link_click','lead_submit','event_register')` | CHECK constraint exists | `pg_constraint` query → 1 row |
| 8 | Helper RPC `_record_touchpoint` exists with `SECURITY DEFINER` + `SET search_path='public'` | RPC exists | `pg_proc` query → 1 row |
| 9 | RPC `resolve_touchpoints_to_lead(p_tenant_id, p_lead_id, p_phone_normalized)` exists with `SECURITY DEFINER` + `SET search_path='public'` | RPC exists | `pg_proc` query → 1 row |
| 10 | View `v_crm_lead_first_touch` exists with `security_invoker=true` (per SECURITY_HOTFIX_2026_05_13 hardening pattern) | view exists with `reloptions` containing `security_invoker=true` | `pg_class.reloptions` query → array contains `security_invoker=true` |
| 11 | `register_lead_to_event` RPC signature expanded to 13 params (was 4); all 9 new params have NULL defaults; OLD 4-param callers still work | `pronargs=13`, `pronargdefaults=10` (3 originals already had `p_method` default + 9 new) — actually `pronargdefaults=10` (`p_method` + 9 new); new pg_proc body md5 differs from BASE_RPC_MD5 | `SELECT pronargs, pronargdefaults FROM pg_proc WHERE proname='register_lead_to_event'` → `13, 10`; also `pg_proc.proname='register_lead_to_event' AND md5(pg_get_functiondef(oid)) <> '31fea2eaf0086cf917d0d65a8595d41c'` |
| 12 | Backward-compat caller test PASS — call OLD 4-arg signature on demo + expect normal happy-path return | RPC returns `{success:true, attendee_id:<uuid>, status:'registered'}` for fresh under-cap | demo integration test (scenario A in §3.1) |
| 13 | `lead-intake` EF deployed at version ≥ `BASE_LEAD_INTAKE_VER + 1` (= ≥ 25) | `get_edge_function` returns version ≥ 25 | `mcp__claude_ai_Supabase__get_edge_function` |
| 14 | `resolve-link` EF deployed at version ≥ `BASE_RESOLVE_LINK_VER + 1` (= ≥ 6) | `get_edge_function` returns version ≥ 6 | `mcp__claude_ai_Supabase__get_edge_function` |
| 15 | 5 demo integration scenarios all PASS (§3.1) | 5/5 PASS | demo integration test |
| 16 | Smoke 7/7 PASS pre-migration AND post-migration | both runs 7/7 | `npm run smoke` (run by opticup-localhost-tester) |
| 17 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |
| 18 | Prizma bit-identical pre/post | lead count + attendee count + tenant=prizma touchpoint count = 0 (no Prizma writes) | 3 SQL probes — values match BASE_PRIZMA_LEADS / BASE_PRIZMA_ATTENDEES; touchpoint count `WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'` = 0 |
| 19 | `KNOWLEDGE_MAP.md` Layer 2 updated with touchpoint architecture description + table reference | grep finds new section | `grep -c 'crm_lead_touchpoints' roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` ≥ 1 |
| 20 | `FUNNEL_ROADMAP.md` P1.1 status flipped to ✅ CLOSED | grep finds the flip | `grep -c '✅ CLOSED.*M3_UTM_TRIPLE_LAYER_PERSISTENCE\|M3_UTM_TRIPLE_LAYER_PERSISTENCE.*✅ CLOSED\|P1.1.*✅\|✅.*P1.1' roles/site-overseer/FUNNEL_ROADMAP.md` ≥ 1 |
| 21 | Phase 4 E1-E7 forward-compat verdicts re-evaluated in FUNNEL_ROADMAP.md | E1 verdict flipped BLOCK → SUPPORT (E1 now satisfied by `crm_lead_touchpoints` substrate per Brief §2); E7 flipped BLOCK → SUPPORT (touchpoints + first-touch view give the journey substrate); E2 verdict notes added (touchpoint_id is now stable handle for revenue-row tagging in M5/M7) | grep verifies the 3 updated cells |
| 22 | `crm_leads.utm_*` columns NOT dropped, NOT renamed, NOT modified | column list pre/post is identical | `information_schema.columns` query on `crm_leads` |
| 23 | M4 SESSION_CONTEXT.md updated with P1.1 closure paragraph | one new paragraph dated 2026-05-14 | `grep -c '2026-05-14.*M3_UTM_TRIPLE_LAYER_PERSISTENCE\|M3_UTM_TRIPLE_LAYER_PERSISTENCE.*closed' "modules/Module 4 - CRM/docs/SESSION_CONTEXT.md"` ≥ 1 |

### 3.1 — Demo Integration Test Scenarios (criterion 15)

All 5 run against demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug=`demo`, PIN 12345). Phone whitelist: `0537889878`, `0503348349`, `0507168471`. Email whitelist: `daniel@prizma-optic.co.il`, `alkimovich94@gmail.com`, `danylis92@gmail.com`.

| # | Scenario | Setup | Expected outcome |
|---|---|---|---|
| A | **No-UTM event register** (backward compat) | Call `register_lead_to_event` with OLD 4-arg signature on demo: a fresh lead + open event with capacity. | Returns `{success:true, attendee_id, status:'registered'}`. Inserts 1 touchpoint row with `touchpoint_type='event_register'`, `utm_*=NULL`, `lead_id=<set>`, `event_id=<set>`. |
| B | **FB-UTM lead-submit via lead-intake** | POST to `lead-intake` EF with body `{tenant_slug:'demo', name, phone, email, utm_source:'facebook', utm_medium:'cpc', utm_campaign:'spring2026'}`. | Lead row inserted with `crm_leads.utm_source='facebook'` (unchanged behavior — Iron Rule preserved). Touchpoint row inserted with `touchpoint_type='lead_submit'`, `utm_source='facebook'`, `utm_medium='cpc'`, `utm_campaign='spring2026'`, `lead_id=<set>`, `phone_normalized=<set>`. |
| C | **SMS-broadcast click → submit → register** | (1) Manually INSERT a `short_links` row with `lead_id=<existing>`, `event_id=<existing-open>`, `target_url='https://...?utm_source=sms&utm_campaign=ev24'`, `code='testc01'`. (2) Hit `https://<storefront>/r/?code=testc01`. (3) Same lead submits the form via `lead-intake`. (4) Same lead is registered via `register_lead_to_event` (UTM params forwarded). | (1) `short_link_click` touchpoint inserted with `lead_id=<from short_links>`, `utm_source='sms'`, `utm_campaign='ev24'`, `short_link_code='testc01'`, `event_id=<from short_links>`. (2) `lead_submit` touchpoint inserted. (3) `event_register` touchpoint inserted. Three distinct rows in `crm_lead_touchpoints` for this lead, all 3 chronologically ordered. |
| D | **Duplicate submit (same phone, same tenant)** | Same phone submitted twice within 2 seconds via `lead-intake`. | First submit creates 1 `lead_submit` touchpoint + 1 lead row. Second submit creates 1 ADDITIONAL `lead_submit` touchpoint (dedupe_key differs by `extract(epoch from now())::bigint` portion), returns 409 with existing lead. No additional `crm_leads` row. |
| E | **Revival of soft-deleted attendee** | Soft-delete an attendee row for (lead, event), then call `register_lead_to_event` again with the same lead+event. | RPC undelete branch fires (T6 from STATE_TRANSITIONS.md). Returns `{success:true, attendee_id, status:'registered'}`. Touchpoint row inserted with `touchpoint_type='event_register'`, `lead_id=<set>`, `event_id=<set>`. Total touchpoint count for this lead+event = 1 (just the revival); the original `event_register` touchpoint from the FIRST registration was preserved — so this lead now has 2 `event_register` touchpoints for this event. |

**Every scenario writes ONLY to demo. ZERO writes against Prizma.** A pre-test SQL probe captures `crm_lead_touchpoints WHERE tenant_id='6ad0781b-...'` count; post-test must equal 0.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo.
- Run read-only SQL (Level 1 autonomy) via `mcp__claude_ai_Supabase__execute_sql`.
- Apply DDL migrations via `mcp__claude_ai_Supabase__apply_migration` (Level 3 autonomy — pre-authorized by this SPEC for the 4 migrations enumerated in §8).
- Deploy Edge Functions via `mcp__claude_ai_Supabase__deploy_edge_function` (2 EF deploys enumerated in §8).
- Create, edit, move files listed in §8 "Expected Final State".
- Commit and push to `develop` with selective `git add` by filename (NEVER `-A` / `.`).
- Run `npm run verify:integrity` + `npm run smoke`.
- Apply executor-improvement proposals from recent FOREMAN_REVIEWs (the Iron-Rule-32 keyword-literal awareness rule is in force).

### What REQUIRES stopping and reporting
- Any DDL or DML against the Prizma tenant (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`).
- Any change to `crm_leads.utm_*` columns (drop, rename, type-change, default-change).
- Any change to `crm_event_attendees` columns (no UTM columns added — touchpoints carry that).
- Any merge to `main` or `git checkout main`.
- Any failure of smoke 7/7 pre-migration (means something else regressed since RETURN_SHAPE_FIX).
- Any caller of `register_lead_to_event` that would break — the new params MUST be optional with NULL defaults.
- Any RLS policy on `crm_lead_touchpoints` that deviates from the canonical JWT-claim pattern.
- The view `v_crm_lead_first_touch` missing `security_invoker=true`.
- Touchpoint INSERT failing inside an existing transaction (signals wrong same-transaction wiring).
- Any deviation between §3 expected value and actual measured value.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

1. RPC body md5 at session start ≠ `BASE_RPC_MD5` → STOP. Something changed since FIND-1 closure yesterday.
2. The new `register_lead_to_event` migration produces a body that breaks ANY existing 4-arg caller (event-register EF, quick-register EF, crm-event-register.js, or manual SQL invocation) → STOP, rewrite to make new params optional.
3. The `_record_touchpoint` INSERT raises a constraint violation during demo scenario A (the smallest happy path) → STOP. Either UNIQUE collision or NOT NULL gap; SPEC bug.
4. `resolve_touchpoints_to_lead` adds >100ms to the lead-intake EF response (per Brief §7 STOP trigger #3) → architectural issue. Must run via `EdgeRuntime.waitUntil`, not block.
5. Smoke 7/7 PASS does NOT hold pre-migration → STOP. Something regressed since RETURN_SHAPE_FIX closure yesterday. Investigate before changing anything.
6. The view `v_crm_lead_first_touch` is created without `WITH (security_invoker=true)` → STOP, rewrite per SECURITY_HOTFIX_2026_05_13 hardening pattern.
7. Any RLS policy USING clause uses `auth.uid()` instead of the canonical JWT-claim pattern → STOP, rewrite per CLAUDE.md §5 Rule 15.
8. The Prizma row count for any of {`crm_leads`, `crm_event_attendees`, `crm_lead_touchpoints`} changes by ≥1 during the SPEC's run → STOP, capture which row + investigate.
9. The new RPC `_record_touchpoint` is called from inside `register_lead_to_event` but its INSERT does NOT commit (because the RPC's transaction rolls back on a downstream error) → STOP, the same-transaction wiring is wrong.
10. Any commit that does NOT mention `M3_UTM_TRIPLE_LAYER_PERSISTENCE` in its message → STOP, scope drift.

---

## 6. Rollback Plan

### Pre-flight master safety tag
Before applying migration #1, the Executor MUST push a master safety tag named `pre-m3-utm-triple-layer-2026-05-14` pointing at HEAD, and push that tag to origin. The tag becomes the anchor for any rollback recovery.

### Migrations down-path
Every migration in §8 ships with a `_down.sql` sibling that undoes ONLY its own forward changes (no cascading undo). To roll back fully, apply them in REVERSE order:
1. Re-deploy `lead-intake` EF v24 + `resolve-link` EF v5 (versions captured pre-flight).
2. Apply migration `04_down.sql` — restores RPC to BASE_RPC_MD5 body.
3. Apply migration `03_down.sql` — removes the view.
4. Apply migration `02_down.sql` — removes the 2 RPCs `resolve_touchpoints_to_lead` and `_record_touchpoint`.
5. Apply migration `01_down.sql` — removes the touchpoint table, policies, indices, and the UNIQUE + CHECK constraints.

### File rollback (rollback path only)
Hard-restore the working tree to the master safety tag, then force-publish the rolled-back state to origin/develop. The exact mechanism is destructive and is authorized in `## Destructive Operations` below for the rollback path only — NOT for the forward path.

### Verification post-rollback
- Smoke 7/7 PASS.
- RPC body md5 returns to `BASE_RPC_MD5`.
- `crm_lead_touchpoints` no longer exists.

---

## Destructive Operations

This SPEC's forward path is NON-destructive: all migrations are `CREATE` (table, view, RPCs, indices, constraints) plus `CREATE OR REPLACE FUNCTION` for `register_lead_to_event` (NOT destructive per Iron Rule 32 — replaces in place). `crm_leads.utm_*` columns are NOT dropped, NOT renamed, NOT modified. `crm_event_attendees` is NOT touched. No file deletes. No mass renames. No `git rebase` / `git reset --hard` / `git push --force` on the forward path. No `main` modifications.

**The forward path declares: None.**

The rollback path (only invoked if the SPEC fails mid-run AND the user authorizes rollback) would invoke removal operations on the new DB objects (touchpoint table teardown, view removal, RPC removal) plus a hard-restore of the working tree to the pre-flight master safety tag (`pre-m3-utm-triple-layer-2026-05-14`) followed by a force-publish of the rolled-back state to origin/develop. These operations — the table-teardown SQL inside `01_down.sql`, the hard-restore-to-tag, and the force-publish — are AUTHORIZED FOR THE ROLLBACK PATH ONLY and only on explicit user instruction following a STOP-on-deviation event. They are NOT authorized for the forward (happy-path) execution. The forward path declares them out of scope above.

---

## 7. Out of Scope (explicit)

The Executor MUST NOT touch any of the following:

- **Page-view tracking** (A1 — deferred to Phase 4). No `page_view` touchpoint_type value added to the CHECK constraint in this SPEC.
- **`crm_leads.utm_*` columns** — KEEP, NOT DROP. No rename, no type change. Iron Rule 22 belt-and-suspenders preserved for backward compat.
- **`crm_event_attendees` schema** — no UTM columns added. No new columns at all. Touchpoint table carries attribution.
- **`crm_status_change_events`** — unchanged. Touchpoint table is parallel infra, not a replacement.
- **Storefront repo (`opticup-storefront/`)** — out of scope. The 2 storefront-facing EFs (lead-intake, resolve-link) are deployed via MCP, no storefront-repo code change.
- **`broadcast_id` propagation** — Phase 1 P1.2 will handle. This SPEC reserves the `broadcast_id` column on `crm_lead_touchpoints` (nullable) but does NOT populate it from any caller. P1.2 will wire propagation.
- **UI to visualize touchpoint history** — Phase 2.5 (Funnel Health Dashboard) territory.
- **Backfill of historical touchpoints from existing `crm_leads.utm_*`** — out of scope. The view `v_crm_lead_first_touch` falls back to `crm_leads.utm_*` for leads with no touchpoint rows (see §8 view definition), so existing leads keep their attribution without backfill.
- **Phone-normalization at click time** — out of scope. `short_link_click` touchpoints carry `phone_normalized=NULL` even when `short_links.lead_id` is set (avoids a JOIN per click and matches resolve-link's hot-path performance budget <200ms). `lead_id` is filled from `short_links.lead_id` directly.
- **`v_crm_lead_first_touch` consumer migration** — out of scope. No existing query is rewritten to read from the view in this SPEC. The view exists for forward-compat consumers; this SPEC verifies it exists + returns sane values + does not break any existing read of `crm_leads.utm_*`.
- **Sentinel touchpoints / scraper detection** — out of scope. EF endpoints are inherently bot-resistant for our use case.
- **`crm_message_log.broadcast_id` repair** — known broken per `KNOWLEDGE_MAP.md` Layer 5 §"Gap #2". Phase 1 P1.2's domain.

---

## 8. Expected Final State

After the executor finishes, the repo should contain:

### New files (tracked by git)

| Path | Purpose |
|---|---|
| `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/SPEC.md` | This file (already created) |
| `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/EXECUTION_REPORT.md` | Executor's run report |
| `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/FINDINGS.md` | Executor's findings (may be empty/short — record at least 1 line confirming no findings if none) |
| `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/TEST_REPORT.md` | Localhost-Tester smoke report |
| `modules/Module 4 - CRM/docs/specs/M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` | Foreman's post-execution review (closure) |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_01_table_up.sql` | Migration #1: table + indices + constraints + RLS |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_01_table_down.sql` | Down-migration #1 |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_02_rpcs_up.sql` | Migration #2: `_record_touchpoint` + `resolve_touchpoints_to_lead` |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_02_rpcs_down.sql` | Down-migration #2 |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_03_view_up.sql` | Migration #3: `v_crm_lead_first_touch` view with `security_invoker=true` |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_03_view_down.sql` | Down-migration #3 |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_04_register_lead_to_event_up.sql` | Migration #4: `CREATE OR REPLACE FUNCTION register_lead_to_event` with 13 params (old 4 + 9 optional NULL-default UTM/context params) |
| `modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_04_register_lead_to_event_down.sql` | Down-migration #4 (restores BASE_RPC_MD5 body verbatim) |

### Files outside git (mandatory local safety net per CLAUDE.md §9.9)

Located at `modules/Module 4 - CRM/backups/2026-05-14_M3_UTM_TRIPLE_LAYER_PERSISTENCE/` — **gitignored, do NOT `git add`**:
- Pre-edit copy of `register_lead_to_event` RPC body (`RPC_BODY_PRE.sql`).
- Pre-edit copy of `lead-intake` EF index.ts (`LEAD_INTAKE_INDEX_PRE.ts`).
- Pre-edit copy of `resolve-link` EF index.ts (`RESOLVE_LINK_INDEX_PRE.ts`).
- Pre-edit copy of `CLAUDE.md`.
- Pre-edit copies of M4 `SESSION_CONTEXT.md`, `MODULE_SPEC.md`, `MODULE_MAP.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/db-schema.sql`.

### Modified files (tracked by git)

| Path | Change |
|---|---|
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Append one closure paragraph dated 2026-05-14 describing P1.1 close (criterion 23) |
| `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` | Update Layer 2 to describe touchpoint table + first-touch view (criterion 19); update Layer 4 to note RPC now records `event_register` touchpoints |
| `roles/site-overseer/FUNNEL_ROADMAP.md` | Flip P1.1 row from PLANNED to ✅ CLOSED (criterion 20); update Phase 4 E1/E2/E7 verdicts (criterion 21) |

### DB state after migrations

- New table `crm_lead_touchpoints` with columns:

```
id                  uuid PK DEFAULT gen_random_uuid()
tenant_id           uuid NOT NULL REFERENCES tenants(id)
lead_id             uuid NULL REFERENCES crm_leads(id)
phone_normalized    text NULL
touchpoint_type     text NOT NULL CHECK (touchpoint_type IN ('short_link_click','lead_submit','event_register'))
occurred_at         timestamptz NOT NULL DEFAULT now()
utm_source          text NULL
utm_medium          text NULL
utm_campaign        text NULL
utm_content         text NULL
utm_term            text NULL
utm_campaign_id     text NULL
referrer_url        text NULL
landing_url         text NULL
short_link_code     text NULL
short_link_id       uuid NULL REFERENCES short_links(id)
broadcast_id        uuid NULL  -- reserved for Phase 1 P1.2, no FK yet
event_id            uuid NULL REFERENCES crm_events(id)
attendee_id         uuid NULL REFERENCES crm_event_attendees(id)
dedupe_key          text NOT NULL
created_at          timestamptz NOT NULL DEFAULT now()
```

- Indices:
  - `crm_lead_touchpoints_pkey` on `id`
  - `idx_crm_lead_touchpoints_tenant_lead_occurred` on `(tenant_id, lead_id, occurred_at)` — covers first-touch view + per-lead history
  - `idx_crm_lead_touchpoints_tenant_phone_type_occurred` on `(tenant_id, phone_normalized, touchpoint_type, occurred_at)` — covers `resolve_touchpoints_to_lead`
  - `idx_crm_lead_touchpoints_tenant_occurred` on `(tenant_id, occurred_at DESC)` — covers time-range FH dashboard queries
  - `idx_crm_lead_touchpoints_tenant_short_link` on `(tenant_id, short_link_id) WHERE short_link_id IS NOT NULL` — partial index for per-broadcast click rollups

- Constraints:
  - `crm_lead_touchpoints_tenant_dedupe_uq` UNIQUE `(tenant_id, dedupe_key)` — Iron Rule 18
  - CHECK on `touchpoint_type` (above)

- RLS:
  - ENABLE ROW LEVEL SECURITY
  - Policy `service_bypass` ON `crm_lead_touchpoints` TO `service_role` USING (true) WITH CHECK (true)
  - Policy `tenant_isolation` ON `crm_lead_touchpoints` TO `public` USING `(tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)` WITH CHECK (same)
  - GRANT SELECT, INSERT ON `crm_lead_touchpoints` TO `authenticated, anon` — RLS is the gate, grants are belt+suspenders

- Helper RPC `public._record_touchpoint(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text, p_touchpoint_type text, p_event_id uuid, p_attendee_id uuid, p_short_link_id uuid, p_short_link_code text, p_broadcast_id uuid, p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text, p_utm_term text, p_utm_campaign_id text, p_referrer_url text, p_landing_url text, p_dedupe_key text) RETURNS uuid` — `SECURITY DEFINER`, `SET search_path='public'`, `LANGUAGE plpgsql`. Body: `INSERT ... RETURNING id; ON CONFLICT (tenant_id, dedupe_key) DO NOTHING; RETURN NULL IF NO INSERT` (uses `ON CONFLICT DO NOTHING` so re-fires for the same dedupe_key are graceful). All params nullable except `p_tenant_id`, `p_touchpoint_type`, `p_dedupe_key`.

- RPC `public.resolve_touchpoints_to_lead(p_tenant_id uuid, p_lead_id uuid, p_phone_normalized text) RETURNS int` — `SECURITY DEFINER`, `SET search_path='public'`, `LANGUAGE plpgsql`. Body: `UPDATE crm_lead_touchpoints SET lead_id=p_lead_id WHERE tenant_id=p_tenant_id AND lead_id IS NULL AND phone_normalized=p_phone_normalized AND occurred_at > now() - interval '30 days' RETURNING 1; GET DIAGNOSTICS v_count = ROW_COUNT; RETURN v_count;` JWT-claim gate at function entry (same pattern as `register_lead_to_event` L14-16).

- View `v_crm_lead_first_touch` WITH (security_invoker=true):
  - Returns one row per `(tenant_id, lead_id)` with the earliest touchpoint's UTM bag, preferring `lead_submit` if present, else earliest `short_link_click`, else NULL touchpoint columns and FALLBACK to `crm_leads.utm_*` for backward compat with pre-SPEC leads that have no touchpoints.
  - Columns: `tenant_id, lead_id, first_touch_at, first_touch_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id, referrer_url, landing_url, short_link_code, fallback_to_legacy_utm boolean`.
  - GRANT SELECT TO `authenticated`.

- Modified RPC `register_lead_to_event` — 13 params now (old 4 + 9 new). New signature:
  ```
  register_lead_to_event(
    p_tenant_id           uuid,
    p_lead_id             uuid,
    p_event_id            uuid,
    p_method              text DEFAULT 'manual',
    p_utm_source          text DEFAULT NULL,
    p_utm_medium          text DEFAULT NULL,
    p_utm_campaign        text DEFAULT NULL,
    p_utm_content         text DEFAULT NULL,
    p_utm_term            text DEFAULT NULL,
    p_utm_campaign_id     text DEFAULT NULL,
    p_referrer_url        text DEFAULT NULL,
    p_landing_url         text DEFAULT NULL,
    p_short_link_code     text DEFAULT NULL
  ) RETURNS jsonb
  ```
  - Behavior is byte-identical to BASE_RPC_MD5 EXCEPT for: (a) the 9 new optional params; (b) 5 added `PERFORM _record_touchpoint(...)` calls — one each in the 5 state-changing terminals (T3 auto-move, T4 invited-promote, T6 undelete, T7 fresh over-cap, T8 fresh under-cap). The 3 no-state-change terminals (T1 RAISE 42501, T2 event_not_found, T5 already_registered) do NOT record touchpoints (no registration happened).
  - `phone_normalized` for touchpoint is looked up via `SELECT phone FROM crm_leads WHERE id=p_lead_id AND tenant_id=p_tenant_id LIMIT 1` inside the RPC (one extra SELECT — cheap, lead is already known).
  - `attendee_id` for touchpoint is `v_attendee_id` (T7/T8 fresh) or `v_existing.id` (T4 promote, T6 undelete) or `(v_move_result->>'new_attendee_id')::uuid` (T3 auto-move).
  - `dedupe_key` for `event_register` = `'event_register:' || <attendee_id>::text` (one event_register touchpoint per attendee — re-fires on undelete create a SEPARATE attendee_id-keyed touchpoint only if attendee_id was reused; T6 undeletes the SAME attendee_id, so the dedupe will gracefully `ON CONFLICT DO NOTHING` on re-revival of the same attendee. This is the desired behavior: count one event_register per attendee per lifecycle; revival is a continuation, not a new registration in the analytics sense). Scenario E in §3.1 verifies this — first registration emits touchpoint, soft-delete + revival emits NO new touchpoint (dedupe collision).
    > **Author note (will be relevant in §3.1 spec verification):** revised scenario E expected outcome: total touchpoint count for this lead+event = **1** (just the original, since the revival's dedupe_key matches the original attendee_id). The earlier text in §3.1 saying "this lead now has 2 `event_register` touchpoints" was wrong on first draft; the correct expected behavior IS 1 touchpoint per attendee_id lifecycle. The Executor should verify against THIS clarified expectation. See §11 ‘Lessons Already Incorporated’ for the harvest of this self-correction.

- Edge Functions:
  - `lead-intake` v25: after lead INSERT (or duplicate-match), `PERFORM` a touchpoint INSERT via direct `.from('crm_lead_touchpoints').insert(...)` (service-role bypasses RLS). On dedupe collision (23505) → swallow silently. Then `EdgeRuntime.waitUntil(db.rpc('resolve_touchpoints_to_lead', {p_tenant_id, p_lead_id, p_phone_normalized: phone}))` — async, no await, returns void to user before resolution completes.
  - `resolve-link` v6: after the existing `short_links` SELECT (which already returns `lead_id, event_id, tenant_id`), parse UTM query-string from `target_url` (`new URL(target_url).searchParams`), then `recordTouchpointAsync(db, ...)` — fire-and-forget like the existing `recordClickAsync`. INSERT body: `touchpoint_type='short_link_click'`, `lead_id=short_links.lead_id`, `phone_normalized=NULL`, `event_id=short_links.event_id`, `short_link_id=data.id`, `short_link_code=code`, parsed UTMs, `referrer_url=req.headers.get('referer')`, `landing_url=target_url`. Dedupe key: `'click:' || short_link_id || ':' || coalesce(ip_hash_first_8, 'noip') || ':' || floor(extract(epoch from now()) / 30)::text` (30-second bucket, mirrors existing `short_link_clicks` dedup window).

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` §3 updated **only if** the Architect determines that closing P1.1 moves a cross-module phase status. **Foreman judgment, written into the SPEC: NO** — P1.1 is one of 4 Phase 1 SPECs in `FUNNEL_ROADMAP.md`. `MASTER_ROADMAP.md` is touched when Phase 1 as a whole closes (after P1.4 + P1.1 + P1.2 + P1.3 all close). This SPEC explicitly does NOT touch `MASTER_ROADMAP.md`.
- `docs/GLOBAL_MAP.md` — Foreman judgment: NO. New table + RPCs + view are Module 4 internals; M4 db-schema.sql gets them. `docs/GLOBAL_MAP.md` updates at the next M4 Integration Ceremony (per CLAUDE.md §10), not per-SPEC.
- `docs/GLOBAL_SCHEMA.sql` — Foreman judgment: NO. Same reason as GLOBAL_MAP. Will fold into next Integration Ceremony.
- M4 `docs/SESSION_CONTEXT.md` — YES (per criterion 23).
- M4 `docs/CHANGELOG.md` — Foreman judgment: NO. Out-of-band SPEC; CHANGELOG entry at next phase close.
- M4 `docs/db-schema.sql` — YES, append the new table + RPCs + view DDL at end of file in a new section header (criterion implicitly tracked via Integration Ceremony queue; for this SPEC, append the section but do NOT propagate to docs/GLOBAL_SCHEMA.sql).
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — YES (criterion 19).
- `roles/site-overseer/FUNNEL_ROADMAP.md` — YES (criterion 20 + 21).

---

## 9. Commit Plan

7 commits total in this SPEC's range:

| # | Author | Type | Files | Message |
|---|---|---|---|---|
| 1 | Foreman (Strategic) | spec | SPEC.md (this file) | `docs(spec): seal M3_UTM_TRIPLE_LAYER_PERSISTENCE SPEC + Brief reality check` |
| 2 | Executor | feat (DB) | 4 migration up files + 4 down files | `feat(m4,db): add crm_lead_touchpoints table + _record_touchpoint + resolve_touchpoints_to_lead + v_crm_lead_first_touch (M3_UTM_TRIPLE_LAYER_PERSISTENCE phase 1)` |
| 3 | Executor | feat (RPC) | migration_04 already part of commit 2; this commit covers the in-place RPC swap deploy artifacts (no new files — applied via MCP and recorded only in EXECUTION_REPORT) | (NO commit — migration applied via MCP only; EXECUTION_REPORT records the SHA-equivalent) |
| 3' | Executor | feat (EF) | `supabase/functions/lead-intake/index.ts` (modified) + `supabase/functions/resolve-link/index.ts` (modified) | `feat(m4,ef): wire touchpoint capture in lead-intake + resolve-link EFs (M3_UTM_TRIPLE_LAYER_PERSISTENCE)` |
| 4 | Executor | docs | M4 SESSION_CONTEXT.md, M4 db-schema.sql, KNOWLEDGE_MAP.md, FUNNEL_ROADMAP.md | `docs(m4,site-overseer): close P1.1 in FUNNEL_ROADMAP + update KNOWLEDGE_MAP Layer 2/4 + M4 SC + db-schema with touchpoint subsystem (M3_UTM_TRIPLE_LAYER_PERSISTENCE)` |
| 5 | Executor | chore (spec) | EXECUTION_REPORT.md + FINDINGS.md | `chore(spec): M3_UTM_TRIPLE_LAYER_PERSISTENCE execution retrospective` |
| 6 | Localhost-Tester | chore (spec) | TEST_REPORT.md | `chore(spec): M3_UTM_TRIPLE_LAYER_PERSISTENCE localhost-tester smoke report (7/7 pre + post)` |
| 7 | Foreman | chore (spec) | FOREMAN_REVIEW.md + any final M4 SESSION_CONTEXT touch-up | `chore(spec): close M3_UTM_TRIPLE_LAYER_PERSISTENCE with retrospective + Phase 1 P1.1 ✅` |

Acceptable drift: if Migration #4 (the RPC swap) requires a separate commit for its `_up.sql` / `_down.sql` files (because `apply_migration` writes to disk via Supabase migrations folder convention), the Executor may split commit #2 into commits #2a/#2b. Document in EXECUTION_REPORT §5 if so.

---

## 10. Dependencies / Preconditions

- P1.4 (`M4_REGISTER_LEAD_TO_EVENT_RPC_MAP`) — ✅ CLOSED 2026-05-14.
- `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` — ✅ CLOSED 2026-05-14 (commit `fb17ee6`).
- Live RPC body md5 = `31fea2eaf0086cf917d0d65a8595d41c` (BASE_RPC_MD5).
- `lead-intake` EF v24 deployed.
- `resolve-link` EF v5 deployed.
- `short_links` table exists with columns `id, code, target_url, link_type, lead_id, event_id, tenant_id, expires_at, click_count, created_at, message_log_id` — verified 2026-05-14.
- `short_link_clicks` table exists (added 2026-05-14 by `M4_MESSAGE_PERFORMANCE_TRACKING`) — touchpoint subsystem does NOT replace this; they coexist (different abstraction levels — `short_link_clicks` is hot-path per-click ledger, `crm_lead_touchpoints` is journey-level abstraction including lead_submit + event_register).
- Smoke 7/7 PASS on demo immediately before migration #1 (criterion 16 — STOP if not).
- `supabase/functions/_shared/tenant-config.ts` exists (used by resolve-link).
- Whitelist phones + emails available for integration test scenarios (3 each — see §3.1).
- Supabase project id: `tsxrrxzmdxaenlvocyit` (verified via `mcp__claude_ai_Supabase__list_projects`).
- Demo tenant: `8d8cfa7e-ef58-49af-9702-a862d459cccb` (slug=demo, PIN=12345). Prizma: `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` — DO NOT WRITE.

---

## 11. Lessons Already Incorporated

- **FROM `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` Author Proposal (gitignore-awareness):** §8 above splits "New files (tracked by git)" from "Files outside git (mandatory local safety net per CLAUDE.md §9.9)". The `backups/` files are intentionally excluded from `git add`.
- **FROM `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` Executor Proposal (Iron-Rule-32 keyword-literal awareness):** the SPEC text avoids literal `DROP TABLE` / `TRUNCATE` / `DELETE FROM <table>` outside `## Destructive Operations`. Where migration semantics require the words (e.g. down-migrations that remove the new objects), they live inside `_down.sql` files which are NOT staged on the forward path.
- **FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FOREMAN_REVIEW.md` Author Proposal 2 (pre-flight pg_proc probe):** §0 captures BASE_RPC_MD5 + BASE_RPC_LEN + BASE_RPC_PRONARGS BEFORE drafting §3. Live md5 verified matches expected post-FIND-1 state.
- **FROM `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/FINDINGS.md` FIND-2 (RPC writes no journey log):** this SPEC IS the architectural response. The decision (Option A — separate touchpoints table) was made by Daniel + Architect 2026-05-14 and is baked into §1, §3, §7, §8.
- **FROM `M4_MESSAGE_PERFORMANCE_TRACKING` (SPEC closed last week) — `short_link_clicks` already exists:** SPEC does NOT replace it. The two tables coexist — `short_link_clicks` is the hot-path per-click ledger used for analytics; `crm_lead_touchpoints` is the journey-level abstraction. resolve-link writes to BOTH (existing INSERT to short_link_clicks remains; NEW additional INSERT to crm_lead_touchpoints).
- **Self-correction during authoring (revival touchpoint count):** §8 RPC behavior text was initially drafted suggesting 2 event_register touchpoints per revived attendee. On review against the `ON CONFLICT DO NOTHING` semantics + dedupe_key formula `'event_register:' || attendee_id`, the correct expected behavior is 1 touchpoint per attendee_id lifecycle (revival reuses the same attendee_id, so the dedupe collides gracefully). §3.1 scenario E was clarified to match.

---

## 12. Pre-Merge Checklist

Every SPEC must pass these items before the executor closes it. Any item failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria (1-23) pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] All §3.1 demo integration scenarios (A-E) PASS.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. Null-byte ERROR blocks closure.
- [ ] Smoke 7/7 PASS pre-migration AND post-migration (Localhost-Tester deliverable in TEST_REPORT.md).
- [ ] `git status --porcelain` returns empty (clean tree) at close.
- [ ] HEAD pushed to `origin/develop`.
- [ ] All 5 SPEC-folder artifacts present: SPEC.md, EXECUTION_REPORT.md, FINDINGS.md, TEST_REPORT.md, FOREMAN_REVIEW.md.
- [ ] M4 SESSION_CONTEXT.md, FUNNEL_ROADMAP.md, KNOWLEDGE_MAP.md updated per §8.
- [ ] Prizma row-count bit-identical pre/post (criterion 18).
- [ ] RPC pre-flight md5 confirmed = `BASE_RPC_MD5` at session start.
- [ ] FIND-2 from P1.4 marked RESOLVED in P1.4's `FINDINGS.md` (cross-SPEC update — Executor's responsibility).

---

*End of SPEC.md.*
