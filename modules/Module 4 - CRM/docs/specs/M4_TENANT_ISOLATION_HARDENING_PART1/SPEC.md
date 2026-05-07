# SPEC — M4_TENANT_ISOLATION_HARDENING_PART1

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART1/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — at the request of Daniel + Phase 1 audit G-CRIT-1 + G-CRIT-3
> **Authored on:** 2026-05-06
> **Module:** 4 — CRM
> **Phase:** post-cutover critical security hardening (Part 1 of 2)
> **Severity:** CRITICAL (cross-tenant data leak surface — RLS bypass via cms_leads policies + 7 SECURITY DEFINER views)

## 1. Goal

Close 2 of the 4 CRITICAL tenant-isolation findings from the M4 overnight audit:
- **G-CRIT-1:** Replace `cms_leads_anon_insert` (`WITH CHECK = true`) and `cms_leads_authenticated_read` (`USING = true`) with tenant-scoped policies.
- **G-CRIT-3:** Recreate the 7 `v_crm_*` views with `security_invoker=on` so RLS applies on the underlying tables when the view is queried.

The 12 anon-callable SECURITY DEFINER RPCs (G-CRIT-2) are explicitly deferred to **Part 2** — separate SPEC, separate session — because each RPC needs caller-classification (legitimate-anon vs anon-debt) and that requires more deliberation than this SPEC's scope allows.

## 2. Background & Motivation

Phase 1 audit (2026-05-05 OVERNIGHT_AUDIT_REPORT) verified all 3 findings via Supabase advisors and pg_policy queries. Live re-verification 2026-05-06 by Foreman:

**G-CRIT-1 confirmed:**
```
polname=cms_leads_anon_insert      cmd=INSERT  roles={anon}            check_clause=true   (NULL using_clause)
polname=cms_leads_authenticated_read cmd=SELECT roles={authenticated}  using_clause=true   (NULL check_clause)
polname=cms_leads_service_all      cmd=ALL     roles={service_role}    using_clause=true   check_clause=true
```
- Anon can `INSERT` any payload with any `tenant_id` (the policy permits everything via `WITH CHECK = true`).
- Authenticated user can `SELECT` rows for ANY tenant (`USING = true`).
- 291 rows in `cms_leads` today, 283 in last 30 days, 1 distinct tenant (prizma is the only writer).

**G-CRIT-3 confirmed:** 7 views without `security_invoker=on` reloption:
```
v_crm_campaign_performance, v_crm_event_attendees_full, v_crm_event_dashboard,
v_crm_event_stats, v_crm_lead_event_history, v_crm_lead_timeline, v_crm_leads_with_tags
```
Postgres default for views is `security_invoker=off` → view runs with the OWNER's privileges (typically `postgres`/`supabase_admin`) and bypasses RLS on underlying tables.

**Customer impact (G-CRIT-1):** Today, anyone who has the supabase URL + anon JWT (which is publicly baked into the storefront — see Phase 1 G-HIGH-2) can craft a `POST /rest/v1/cms_leads` with any tenant_id. With 1 tenant, this is theoretical; with tenant 2, it becomes a cross-tenant write.

**Customer impact (G-CRIT-3):** If any of the 7 views is GRANTed to anon (current grants need verification at execution time), an unauthenticated query without a tenant filter would return cross-tenant rows. Even without anon GRANT, an authenticated user from tenant A can read tenant B's rows because the view's owner-role bypass means the view's WHERE clause is the ONLY tenant filter — and these views don't filter on `tenant_id` at the view level (they expect RLS on the underlying tables to do it).

**Architecture decision (locked here):**
- For `cms_leads`, use the canonical two-policy pattern from CLAUDE.md §5 Rule 15: (1) `service_bypass` for service_role with `qual=true, check=true`, (2) `tenant_isolation` for `public` with the JWT-claim USING + WITH CHECK clause.
- For the 7 views, add `security_invoker=on` reloption via `ALTER VIEW`. This makes the view query run as the QUERYING user, so RLS on the underlying CRM tables applies normally.

**Out of scope for this SPEC (deferred to PART 2):** the 12 anon-callable SECURITY DEFINER RPCs. Their fix requires per-RPC classification (which legitimately need anon access — `submit_storefront_lead`, `register_lead_to_event`, `verify_campaign_page_password` — vs which are legacy/debt — `import_leads_from_monday`, `cascade_attendee_soft_delete`, `next_crm_event_number`). Each kept-anon RPC ALSO needs internal tenant validation. That deserves its own SPEC.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state at end | `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | 1 (migration + docs) + 1 (retrospective) = 2 | `git log origin/develop..HEAD --oneline \| wc -l` → 2 |
| 3 | New migration file | 1 SQL file at `modules/Module 4 - CRM/migrations/2026_05_06_tenant_isolation_part1.sql` (or whatever the project's migration naming convention is — confirm via `ls modules/Module 4 - CRM/migrations/`) | `ls` |
| 4 | `cms_leads` policies post-migration | exactly 2 policies (service_bypass + tenant_isolation) — drop the 3 old ones | SELECT polname FROM pg_policy WHERE polrelid='public.cms_leads'::regclass |
| 5 | `cms_leads` tenant_isolation USING clause | matches CLAUDE.md §5 Rule 15 canonical: `tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid` | pg_get_expr(polqual, polrelid) |
| 6 | `cms_leads` tenant_isolation WITH CHECK clause | same expression as USING | pg_get_expr(polwithcheck, polrelid) |
| 7 | 7 views post-migration have `security_invoker=on` | all 7 | `SELECT relname FROM pg_class WHERE relname LIKE 'v_crm%' AND 'security_invoker=on' = ANY(reloptions)` returns all 7 |
| 8 | Production functional regression — CRM tabs still load | 10 sidebar tabs on demo CRM still render with no console errors | manual click-through after migration applied |
| 9 | Production functional regression — storefront lead submission still works | submit a test lead via storefront `/api/leads/submit` (or whatever endpoint writes to `cms_leads`) → 1 row appears in `cms_leads` with correct tenant_id | curl + SQL |
| 10 | Whitelist enforcement during E2E | every fired test message → phone `0537889878`, email `daniel@prizma-optic.co.il` | as before |
| 11 | Prizma writes during run | 0 outside the migration's policy/view DDL itself | sanity check |
| 12 | Integrity gate | `npm run verify:integrity` exit 0 or 2 | shell |

## 4. Autonomy Envelope

### CAN do without asking
- Write a new SQL migration file at the path referenced in §3 #3
- Apply the migration via Supabase MCP `apply_migration` (single transaction; rollback on any error)
- Re-verify the migration's effect via SELECT against pg_policy + pg_class
- Drive Claude in Chrome MCP against demo CRM at `localhost:3000/crm.html?t=demo` (PIN 12345) to verify the 10 tabs still load
- Submit a test lead via the storefront flow — directly POSTing to the `cms_leads` ingress (whatever endpoint exists) using whitelist contacts to confirm post-policy lead intake still works
- SELECT-only on prizma for sanity verification
- Soft-delete demo test data at end of run
- Commit + push to `develop`
- Update Module's CHANGELOG.md (single line) + SESSION_CONTEXT.md

### REQUIRES stopping
- Any change to RPCs (out of scope — Part 2)
- Any change to Edge Functions (out of scope)
- Any prizma-tenant write outside the migration DDL itself
- Test message firing to non-whitelist contact
- Migration that returns ANY error (rollback automatically; do not patch and retry without escalating)
- Iron Rule 15 (canonical RLS pattern) violation — use the EXACT JWT-claim USING expression from CLAUDE.md §5 Rule 15
- Merge to main
- Total runtime exceeding 90 minutes

## 5. Stop-on-Deviation Triggers

- Migration apply returns a non-200 status → STOP, the DDL is wrong; do NOT retry speculatively. Inspect the error.
- After migration, any of the 10 CRM tabs breaks (console error, 4xx/5xx network, white screen) → STOP, regression in views; revert the migration.
- After migration, the storefront lead-submission test fails (HTTP non-2xx OR no row appears OR row appears with wrong tenant_id) → STOP, the new policies are over-restrictive; revert.
- Any prizma write attempt outside the migration → STOP, log CRITICAL incident.
- `cms_leads` row count drops vs pre-migration baseline → STOP, the policy migration accidentally affected data; revert.

## 6. Rollback Plan

- Migration is a SINGLE transaction file — partial application is impossible.
- If migration fails or QA fails: write a rollback migration that restores the 3 old policies + drops `security_invoker=on` from the 7 views. Apply it via Supabase MCP.
- The rollback migration SQL skeleton:
  ```sql
  -- Rollback for M4_TENANT_ISOLATION_HARDENING_PART1
  -- Restore cms_leads original 3 policies
  DROP POLICY IF EXISTS tenant_isolation ON public.cms_leads;
  DROP POLICY IF EXISTS service_bypass ON public.cms_leads;
  CREATE POLICY cms_leads_anon_insert ON public.cms_leads FOR INSERT TO anon WITH CHECK (true);
  CREATE POLICY cms_leads_authenticated_read ON public.cms_leads FOR SELECT TO authenticated USING (true);
  CREATE POLICY cms_leads_service_all ON public.cms_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
  -- Strip security_invoker from 7 views
  ALTER VIEW public.v_crm_campaign_performance RESET (security_invoker);
  ALTER VIEW public.v_crm_event_attendees_full RESET (security_invoker);
  -- (and the other 5)
  ```
- The rollback migration goes into the `migrations/` folder alongside the forward one with the same date prefix + `_rollback` suffix, but is NOT applied unless triggered.

## 7. Out of Scope (DO NOT touch)

- The 12 anon-callable SECURITY DEFINER RPCs (G-CRIT-2) — Part 2 SPEC
- Any Edge Function source code
- Any storefront repo change
- Any change to other tables' RLS policies (only `cms_leads` is touched here)
- Any other view (only the 7 `v_crm_*` views listed in Phase 1 G-CRIT-3)
- Hardcoded Prizma values (G-CRIT-4) — separate SPEC
- The anon JWT in EFs (G-HIGH-2) — separate SPEC
- VM mount drift — leave alone
- Iron Rule 31 integrity gate against working tree — do not run

## 8. Expected Final State

### New migration file: `modules/Module 4 - CRM/migrations/2026_05_06_tenant_isolation_part1.sql`

(Confirm naming convention by listing `modules/Module 4 - CRM/migrations/` first — the executor uses whatever pattern the existing files follow.)

Migration content (single transaction, exact contents the executor writes):

```sql
-- M4_TENANT_ISOLATION_HARDENING_PART1
-- Closes Phase 1 audit G-CRIT-1 (cms_leads policy bypass) + G-CRIT-3 (7 SECURITY DEFINER views).
-- Apply atomically; rollback in companion file if QA fails.

BEGIN;

-- Part A: cms_leads — replace 3 broken policies with 2 canonical ones (CLAUDE.md §5 Rule 15)

DROP POLICY IF EXISTS cms_leads_anon_insert ON public.cms_leads;
DROP POLICY IF EXISTS cms_leads_authenticated_read ON public.cms_leads;
DROP POLICY IF EXISTS cms_leads_service_all ON public.cms_leads;

-- Service role bypass (canonical pattern — service_role is trusted infra)
CREATE POLICY service_bypass ON public.cms_leads
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Tenant isolation for public (anon + authenticated) — JWT-claim USING per Iron Rule 15
CREATE POLICY tenant_isolation ON public.cms_leads
  FOR ALL TO public
  USING (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  )
  WITH CHECK (
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
  );

-- Part B: 7 v_crm_* views — add security_invoker=on so RLS applies on underlying tables when queried

ALTER VIEW public.v_crm_campaign_performance SET (security_invoker = on);
ALTER VIEW public.v_crm_event_attendees_full SET (security_invoker = on);
ALTER VIEW public.v_crm_event_dashboard       SET (security_invoker = on);
ALTER VIEW public.v_crm_event_stats           SET (security_invoker = on);
ALTER VIEW public.v_crm_lead_event_history    SET (security_invoker = on);
ALTER VIEW public.v_crm_lead_timeline         SET (security_invoker = on);
ALTER VIEW public.v_crm_leads_with_tags       SET (security_invoker = on);

COMMIT;
```

### Companion rollback file: `modules/Module 4 - CRM/migrations/2026_05_06_tenant_isolation_part1_rollback.sql`

Contents per §6 (NOT applied — exists only as documented rollback path).

### Modified docs (1 single-line append each)
- `modules/Module 4 - CRM/docs/CHANGELOG.md`
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md`
- `modules/Module 4 - CRM/docs/db-schema.sql` — append the new policies + view reloption changes (Authority Matrix §7 — module owns its db-schema)

### NOT modified
- `MASTER_ROADMAP.md` (no phase boundary)
- `docs/GLOBAL_MAP.md` (no new contracts)
- `docs/GLOBAL_SCHEMA.sql` (deferred to next Integration Ceremony per existing Module 4 deferral)

## 9. Commit Plan

ONE migration commit + ONE retrospective commit:

- **Commit 1:** `fix(crm): tenant-scoped cms_leads policy + security_invoker on 7 v_crm views (M4_TENANT_ISOLATION_HARDENING_PART1)`
  - Migration file (forward)
  - Migration file (rollback companion)
  - CHANGELOG.md
  - SESSION_CONTEXT.md
  - db-schema.sql
- **Commit 2:** `chore(spec): close M4_TENANT_ISOLATION_HARDENING_PART1 with retrospective`
  - SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md (Foreman writes the last one in a separate session)

Push to `origin/develop`. Do NOT merge to main — Daniel handles main merges.

## 10. Dependencies / Preconditions

- Branch `develop`, clean
- Supabase MCP available (`apply_migration`, `execute_sql`, `list_extensions`)
- Demo tenant accessible — login PIN `12345`
- Whitelist contacts for the storefront-lead-submission test: phone `0537889878`, email `daniel@prizma-optic.co.il`
- Storefront URL or direct `cms_leads` ingress endpoint identified — executor finds the path via grep on `cms_leads` in storefront source OR by examining `submit_storefront_lead` RPC (the legitimate caller path; even though G-CRIT-2 deferred fixes that RPC, it CALLS `cms_leads` and is the path to test)

### Edge Function deploy fallback
This SPEC does NOT deploy any Edge Function. The MCP `apply_migration` failure path is different — if it fails, STOP and escalate (no CLI fallback documented for migrations; ask Daniel). The 3-occurrence MCP-deploy pattern is documented in the prior FOREMAN_REVIEW; migrations are a separate API path with no documented flake history.

## 11. Lessons Already Incorporated

- **From `M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md` Author Proposal 1 + `M4_UNSUB_SUPPRESSION_CRIT/FOREMAN_REVIEW.md` Author Proposal 1 (2-occurrence rule):** Pre-Authoring Sweep Step 1.5 included a live-DB confirmation of EVERY cited identifier. Verified 2026-05-06: cms_leads policies (3 rows), v_crm_* views without security_invoker (7 rows), 12 anon-RPCs (12 rows). All names quoted in this SPEC are confirmed live-state.
- **From CLAUDE.md §5 Rule 15:** the canonical RLS USING expression is the EXACT one in §3 #5/#6 + the §8 migration body. Copy-paste verbatim, never paraphrase.
- **From CLAUDE.md §5 Rule 15:** the canonical two-policy pattern is `service_bypass` (service_role) + `tenant_isolation` (public). Both required.
- **From `feedback_production_discipline_post_cutover.md`:** prizma is live. §5 stop-trigger rolls back on any regression.
- **From `feedback_clean_repo_in_specs.md`:** §3 #1 enforces clean tree at end.
- **Defense in depth (Iron Rule 22):** beyond RLS, application code in Edge Functions still does `.eq('tenant_id', body.tenant_id!)` on every query. This SPEC adds the DB-level second layer; the application layer was already there.

**Cross-Reference Check (Step 1.5):** This SPEC introduces 2 new policy NAMES (`service_bypass`, `tenant_isolation`) on `cms_leads`. Verified 2026-05-06: those exact names are not currently used as policies on `cms_leads` (the 3 old ones use `cms_leads_*` prefixed names). They ARE used as canonical pattern names elsewhere (per CLAUDE.md §5 example) — the convention is intentional. 0 collisions.

## 12. QA Plan

After migration applied, before marking SPEC closed:

1. Pre-migration baseline: `SELECT COUNT(*) FROM cms_leads` → record count (~291). Same for each of the 7 views (`SELECT COUNT(*) FROM v_crm_*` for each). These are sanity baselines; not blockers but useful for diff.
2. **Apply migration** via Supabase MCP `apply_migration` — single transaction.
3. **Verify migration effect:**
   - `SELECT polname, polcmd, pg_get_expr(polqual,polrelid), pg_get_expr(polwithcheck,polrelid) FROM pg_policy WHERE polrelid='public.cms_leads'::regclass` → expects EXACTLY 2 rows (`service_bypass`, `tenant_isolation`).
   - `SELECT relname, reloptions FROM pg_class WHERE relkind='v' AND relname IN ('v_crm_campaign_performance','v_crm_event_attendees_full','v_crm_event_dashboard','v_crm_event_stats','v_crm_lead_event_history','v_crm_lead_timeline','v_crm_leads_with_tags') AND 'security_invoker=on' = ANY(reloptions)` → expects 7 rows.
4. **Test 1 — CRM regression check:** open `localhost:3000/crm.html?t=demo` via Claude in Chrome. PIN 12345. Click through ALL 10 sidebar tabs (Dashboard / Leads incoming / Registered / Events / Campaigns / Message Center / Event Day / Automation History / Queue / Activity Log). For each: verify NO console error (red), NO 4xx/5xx network request, page renders with data.
5. **Test 2 — Storefront lead submission still works:** submit a test lead via the storefront flow (or, if that's not available locally, directly call `submit_storefront_lead` RPC with whitelist contact fields and demo tenant_id). Expected: HTTP 200, 1 new row in `cms_leads` with the demo tenant_id. Run on demo, NOT prizma.
6. **Test 3 — Cross-tenant write is now BLOCKED for anon:** simulate an anon attempt to insert into `cms_leads` with prizma's tenant_id (using the storefront's anon JWT). Expected: HTTP 403 / RLS error. This is the security verification — proves the bug is closed.
7. **Test 4 — `v_crm_*` data still readable from CRM staff role:** the same 10-tab walk in Test 1 implicitly covers this (the views are queried by the dashboard).
8. Post-migration row counts match pre-migration (no data leak).
9. Cleanup: soft-delete any test leads created in Test 2.
10. Verify §3 success criteria #1-#12.

If Test 1, 2, or 4 fails → APPLY ROLLBACK IMMEDIATELY (per §6) + log as CRITICAL deviation + STOP. Do not redeploy speculatively.

*End of SPEC.*
