# Guardian Alerts — Optic Up Sentinel

> **Note:** Sentinel re-generates the section above the LIGHTHOUSE-CRON marker each scan. The Lighthouse cron appends below the marker. Do not delete the marker line.

**Last refresh:** **2026-05-23 ~07:20 UTC — scheduled 4-hour run; Missions 3 (SaaS Readiness) + 4 (Documentation Accuracy) + 5 (Technical Debt) + 8 (Cross-Module Integrity) refreshed.** Delta this 4-hour run: **0 NEW CRITICAL, 0 NEW HIGH, 0 NEW MEDIUM, 0 NEW LOW, 0 RESOLVED.** Focused sweep of the 24h window (7 commits; headline = M5 Customers + M6 Prescriptions Phase A+B schema foundation + `js/shared.js` + `fb-capi-dispatch` EF + 1 M4 migration). **Mission 3:** all 15 new M5+M6 tables SaaS-perfect (live: tenant_id NOT NULL + RLS + 2-policy + tenant-scoped UNIQUE × 15); `shared.js` ADDED config-driven `formatMoney()` and made `formatILS()` a delegating wrapper — net debt REDUCTION. **Mission 4:** M5+M6 §10 Integration Ceremony is exemplary (all 15 tables + RPCs propagated to global + per-module docs); the standing M4 doc-drift HIGH **H-NEW-41-1 re-verified — UNCHANGED, not growing** (M4 untouched this window; `crm_suppressions`/`m4_dispatch_lock`/`mv_crm_lead_event_history` still 0 hits in schema docs); M3 SESSION_CONTEXT now 12 days stale (carry, +1 day, MEDIUM). **Mission 5:** 0 NEW; `brands.js` 371 remains the lone over-cap HIGH carry (untouched). **Mission 8:** CLEAN — every M5/M6 RPC stays within own tables; cross-module surfaces are declared contracts. All findings verified against `git show HEAD:` + live Supabase (never the CRLF-phantom working tree). **All HIGH/MEDIUM alerts below are carried unchanged** — this run added and resolved none.

**Prior refresh:** **2026-05-23 ~04:10 UTC — scheduled daily run; Missions 6 (Supabase Health) + 7 (Progress Tracking) + 9 (Executive Summary) refreshed.** Delta vs prior daily run: **1 NEW HIGH (H-NEW-23-1 — `_backup_supersale_pages_20260522` RLS-off + full anon/authenticated grants; the DB now has TWO RLS-disabled backup tables where yesterday there was one)**, 1 NEW MEDIUM (M-NEW-23-1 — `crm_suppressions` heavy seq-scan / missing lookup index: 181K seq-scans / 45M tuples read on 251 rows, hit on every message dispatch), 0 NEW CRITICAL, 0 NEW LOW. **Carries re-verified live:** H-NEW-45-1 (`_events_ops_backups` RLS off, row count grew 42→60 — still actively written), H-NEW-1-2 (`v_crm_event_stats` still SECURITY DEFINER), H-NEW-41-1 (M4 schema-doc drift — `crm_suppressions` still 0 hits in all schema docs), M-NEW-1-2 (`v_storefront_pages` SECURITY DEFINER). **Positive:** M5 (Customers) + M6 (Prescriptions) Phase A+B schema foundations landed with a correct §10 Integration Ceremony (global + per-module docs all merged). (Missions 1+2 hourly and 3+4+5+8 four-hour carries below are from prior runs, preserved for continuity.)
**Production status (this refresh):** 🟢 **HEALTHY.** Project `tsxrrxzmdxaenlvocyit` (prizma-optic) `ACTIVE_HEALTHY`; all 29 Edge Functions ACTIVE; Postgres 24h logs clean (the only ERROR was the Sentinel's own probe using a wrong table name — no real application errors, no RLS-violation events); message pipeline quiet (20 sent / 1 rejected / 0 failed in 24h). **No finding here is a live runtime failure** — there is only ONE tenant (Prizma), so no cross-tenant data has actually leaked; the RLS-off backup tables + SECURITY DEFINER views break the *isolation guarantee* (a problem the moment a 2nd store is added) but cause no customer-facing error today. The supersale backup table holds largely public-by-design page content; `_events_ops_backups` carries real tenant payloads and is the higher-sensitivity of the two. No evidence in logs of anon misuse.
**Scan environment:** Cowork VM, FUSE-stale snapshot (~2,513 phantom-modified files = pure CRLF↔LF churn — sample unchanged file showed 325 ins / 325 del on 325 identical lines; ghost `.git/*.lock` blocked only cosmetic ref updates during `git pull`, file *contents* are at the correct commit). On-disk HEAD `a384aad` = origin/develop (0 behind). Sentinel is read-only — no destructive git recovery attempted (correct per CLAUDE.md §3a Phase 2.5: Cowork = read+plan, desktop = execute).

---

## Active CRITICAL alerts

None.

---

## Active HIGH alerts

### H-NEW-23-1 — NEW: `_backup_supersale_pages_20260522` public table has RLS DISABLED + full anon/authenticated grants

- **Status:** NEW this refresh (Mission 6). Live verification: a dated backup table created 2026-05-22 (during the supersale page work) has `relrowsecurity=false` (RLS off) and both `anon` and `authenticated` hold full `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` grants. **The DB now has TWO RLS-disabled public base tables** (this one + `_events_ops_backups`) where yesterday there was one.
- **What's in it:** 12 rows — a snapshot of `storefront_pages`. Columns include `tenant_id`, `slug`, `title`, `blocks(jsonb)`, `previous_blocks(jsonb)`, `meta_title`, `meta_description`, SEO fields. The page content is largely **public-by-design** (storefront pages are world-readable), so data sensitivity is lower than `_events_ops_backups`. **But** anon also holds DELETE/TRUNCATE, so an unauthenticated caller could wipe the backup, and the table still carries `tenant_id` so it violates the isolation guarantee (Iron Rule 15) the moment a 2nd store exists. No log evidence of anon access.
- **Suggested action:** This is a one-off dated rollback backup. Cleanest fix: **drop it** once Daniel confirms the supersale page work is settled (it has served its purpose). If retained: `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL … FROM anon, authenticated` (service_role-only). Bundle into the same security-hardening SPEC as H-NEW-45-1. Add a Reviewer guard: any future `_backup_*` table created via `CREATE TABLE … AS SELECT` must enable RLS + revoke client grants in the same migration (CTAS inherits no RLS). Owner: opticup-architect (Tier 2).

### H-NEW-45-1 — CARRY: `_events_ops_backups` public table has RLS DISABLED + full anon/authenticated grants

- **Status:** CARRY (first reported 2026-05-22 ~04:11, Mission 6; re-verified live this scan — RLS=false, **row count grew 42 → 60** so still actively written, anon SELECT=true). The Supabase security advisor reports `rls_disabled_in_public` on `public._events_ops_backups`. Live verification confirms: `relrowsecurity=false` (RLS off) and both `anon` and `authenticated` roles hold full `SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` grants on it.
- **What's in it:** 60 rows. Columns: `backup_id, created_at, spec_slug, source_table, source_id, tenant_id, slug, lang, payload(jsonb), note`. It is an ops-backup vault holding JSONB snapshots of real tenant rows captured during SPEC executions. It **carries `tenant_id` and real tenant data inside `payload`** — higher-sensitivity than the supersale backup above.
- **Impact:** Because RLS is off and anon has SELECT, an unauthenticated client could in principle `SELECT * FROM _events_ops_backups` and read backed-up row payloads **across all tenants** (today only Prizma exists, so no cross-tenant leak yet — but the multi-tenant isolation guarantee is violated, Iron Rule 15). anon also holds DELETE/TRUNCATE, so the backup vault could be wiped by an unauthenticated caller. No evidence in the 24h logs that this access has actually occurred.
- **Suggested action:** Architect triage. Recommended fix: `ALTER TABLE public._events_ops_backups ENABLE ROW LEVEL SECURITY;` + add the canonical two-policy pattern (`service_bypass` to service_role + `tenant_isolation` JWT-claim USING clause per CLAUDE.md Rule 15), AND `REVOKE ALL ON public._events_ops_backups FROM anon, authenticated;` (a backup vault should be service_role-only). Verify which process writes to it (likely an Events-Ops/SPEC backup step using service_role) before revoking, so the writer keeps working. ~15-30 min SPEC. Owner: opticup-architect (Tier 2).

### H-NEW-1-2 — CARRY: `v_crm_event_stats` runs SECURITY DEFINER → RLS bypass on cross-tenant CRM revenue stats

- **Status:** CARRY (first reported 2026-05-22 ~06:10, Mission 2; re-verified live this scan — `security_invoker` still NOT SET → runs SECURITY DEFINER as the view owner, bypassing the *querying user's* RLS on base tables `crm_events` + `crm_event_attendees`). The view selects `tenant_id` but has **no `WHERE tenant_id` filter** — it relied on caller RLS, which is bypassed.
- **Exposure:** view returns internal event analytics — `total_revenue`, `purchase_amount` sums, registration/attendance/purchase counts per event. `anon` has **no SELECT** (no unauthenticated leak), but `authenticated` **has SELECT**, so an authenticated user scoped to tenant A could read tenant B's event revenue. **No live leak today (single tenant — Prizma only), but multi-tenant isolation is broken.**
- **Suggested action:** Recreate the view `WITH (security_invoker = on)` (project standard) — the caller's RLS then re-applies and the view becomes tenant-safe; also confirm whether `authenticated` should hold SELECT directly. Add a migration-template/Reviewer guard so any `CREATE OR REPLACE VIEW` on a public view re-asserts `security_invoker=on`. ~15-30 min. Bundle with M-NEW-1-2 (same fix on `v_storefront_pages`). Owner: opticup-architect (Tier 2).


### H-NEW-41-1 — CARRY (GROWN): M4 schema/file docs drifted from live DB — new `crm_suppressions` table + MV + ~8 RPCs undocumented

- **Status:** CARRY since 2026-05-19 (Mission 4); **GROWN this 3+4+5+8 refresh.** Live Supabase MCP confirms these objects EXIST but are absent from every schema doc: new table **`crm_suppressions`** (commit `94fd920`, 2026-05-22) = 0 hits in `docs/GLOBAL_SCHEMA.sql` + `docs/DB_TABLES_REFERENCE.md` + `modules/Module 4 - CRM/docs/db-schema.sql`; **`m4_dispatch_lock`** (prior carry) still 0 hits; materialized view **`mv_crm_lead_event_history`** 0 hits in schema docs; ~8 new RPCs (`bulk_approve_leads_to_tier2`, `create_static_short_link`, `edit_static_short_link`, `delete_static_short_link`, `dashboard_status_counts`, `message_performance_summary`, `claim_unconsumed_status_change_events`, `enqueue_crm_messages_idempotent`) = 0 hits in `docs/GLOBAL_MAP.md`. Plus the long-standing FILE_STRUCTURE.md half (0 hits for `crm-messaging-resend`, `short-links-tiles/`, `template-static-card.js`).
- **Why it's real drift (not a SPEC-only pattern):** the M4 db-schema.sql DOES document the *previous* new-table batch (`crm_capi_dispatch_queue` / `crm_status_change_events` / `crm_lead_touchpoints` — 23 hits), proving the project convention is to propagate new tables. The docs simply lag: M4 db-schema.sql last touched 2026-05-15 (7d), GLOBAL_SCHEMA.sql 2026-05-17, GLOBAL_MAP.md 2026-05-17, FILE_STRUCTURE.md 2026-05-19.
- **Impact:** a future session reading the schema docs would not know `crm_suppressions` (a customer-contact-data table) exists — exactly the drift class that causes duplicate-table / wrong-assumption bugs (Rule 21). No live runtime impact.
- **Suggested action:** bundled `M4_DOC_RESYNC` SPEC — add the 3 tables/MV to GLOBAL_SCHEMA.sql + DB_TABLES_REFERENCE.md + M4 db-schema.sql, the ~8 RPCs to GLOBAL_MAP.md, and the file/dir rows to FILE_STRUCTURE.md, in one Integration-Ceremony-style merge. ~30-45 min. Owner: opticup-architect (Tier 2) / next M4 phase close.
---

## Active MEDIUM alerts

> MEDIUM/LOW are summarized here for continuity but are NOT commit-blocking. Full detail in `GUARDIAN_REPORT.md`.

### M-NEW-23-1 — NEW: `crm_suppressions` heavy seq-scan / missing lookup index

- Live verification (Mission 6.5): the new suppression table (added 2026-05-22) shows **181,255 seq-scans / 45.3M tuples read / only 404 idx-scans** on 251 rows — by far the highest seq_tup_read in the DB. It is queried on every message dispatch (FB-CAPI suppression gate + send-message suppression check), so the missing index is hit hard. Low absolute cost today (tiny table) but it is the single clearest missing-index signal and worsens as the suppression list grows. Action: add a lookup index — probably `(tenant_id, contact_value)` or `(tenant_id, channel, contact_value)` — at the next M4 phase. ~10 min.

### M-NEW-1-2 — CARRY: `v_storefront_pages` runs SECURITY DEFINER (public-by-design data, lower risk)

- Re-verified live this scan: `v_storefront_pages` still has `security_invoker` **NOT SET** (SECURITY DEFINER); `anon` + `authenticated` both have SELECT. It exposes `storefront_pages WHERE status='published' AND is_deleted=false`. **Unlike `v_crm_event_stats`, this data is intentionally public** — the storefront is a public site and published pages are world-readable (app filters by tenant/domain), so real-world exposure is low. But it still deviates from the `security_invoker=on` standard. Action: recreate `WITH (security_invoker=on)` in the same SPEC as H-NEW-1-2. ~5 min incremental.

### M-NEW-23-2 — M4 SESSION_CONTEXT ~18 commits behind (carry, grown)

- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` last updated 2026-05-21 17:36. Since then 18 M4 commits landed (suppression-list Phase 1+2, FB-CAPI suppression gate that closed a GDPR PII-to-Meta leak, attendee invited-status removal). Materially current (2 days) but behind the suppression-list + GDPR-gate batch — none mentioned in SC. Action: append a suppression-list + FB-CAPI-gate closure block at next M4 session. ~10 min.

### M3 SESSION_CONTEXT 12 days stale (carry, growing)

- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` last updated 2026-05-11; per Authority Matrix it is the authoritative source of M3 phase status. Was 11 days in prior report; now 12. No M3 commits in 24h (dormant), so low risk, but next M3 session would start from a stale baseline. Action: append FB-CAPI handoff closure + outage diagnosis + brief harvest. ~10 min.

---

## Active LOW alerts

### L-NEW-23-1 — M4 CHANGELOG significantly behind (grown)

- `modules/Module 4 - CRM/docs/CHANGELOG.md` last touched 2026-05-15; 116 M4 commits have landed since (Sprint 1-3 batch + suppression list + FB-CAPI gate not reflected). This carry has grown well beyond the prior ~17-commit estimate — the CHANGELOG is now meaningfully out of date as a phase-history record. Watch for promotion to MEDIUM. Action: bring CHANGELOG current at next M4 phase close; fold into the same M4 doc-resync that closes H-NEW-41-1.

### Performance seq-scan carries (unchanged)

- `storefront_config_public` (629K seq-scans / 2 rows / 12 idx-scans), `storefront_reviews` (27K seq-scans / 5 rows), `media_library` (174K seq-scans / 451 rows) — tiny tables, negligible cost today; add lookup indexes in the next Public Data Layer follow-up SPEC. Carry.

---

## Operational Note

**Anon-view-grant carries quiet this cycle.** The three recurring HIGH view-grant findings from prior daily runs (H-NEW-34-1 / H-NEW-36-1 / H-NEW-25-1) produced ZERO `permission denied for view` ERROR events in the full 24h Postgres-log sample this run. They are not asserted as active HIGH this refresh. If they re-fire on a future scan, they re-open.

**Postgres-log security state (this scan):** the 24h Postgres-log sample is clean — the ONLY ERROR is the Sentinel's own probe (a query against `public.crm_messages`, a table that does not exist; the live tables are `crm_message_queue` / `crm_message_log`). No real application errors, no `permission denied for view`, no RLS-violation patterns. Live RLS check found exactly 2 RLS-disabled public base tables: `_events_ops_backups` (H-NEW-45-1) and `_backup_supersale_pages_20260522` (H-NEW-23-1). Live SECURITY DEFINER view check found exactly 2: `v_crm_event_stats` (H-NEW-1-2) and `v_storefront_pages` (M-NEW-1-2) — both unchanged from yesterday. The WARN bands (security_definer_function_executable, function_search_path_mutable, extension_in_public, materialized_view_in_api, public_bucket_allows_listing, auth_leaked_password_protection) are the established project-design carries for the canonical RPC + Views + JWT-claim-RLS pattern — carry-allowlisted, review at quarterly security audit.

**Single highest-ROI action this scan:** one short security-hardening SPEC that (1) drops or secures the 2 RLS-disabled backup tables (`_backup_supersale_pages_20260522` — recommend drop; `_events_ops_backups` — enable RLS + revoke anon/authenticated, keeping the service_role writer working), (2) recreates `v_crm_event_stats` + `v_storefront_pages` `WITH (security_invoker=on)`, and (3) adds two Reviewer/migration-template guards: any `CREATE OR REPLACE VIEW` on a public view must re-assert `security_invoker=on`, and any `_backup_*` table created via `CREATE TABLE … AS SELECT` must enable RLS + revoke client grants in the same migration (CTAS inherits no RLS). Closes H-NEW-23-1 + H-NEW-45-1 + H-NEW-1-2 + M-NEW-1-2 and prevents recurrence. ~45-60 min total. Owner: opticup-architect (Tier 2). All four are isolation-guarantee gaps, not live customer-facing failures (single tenant today).

<!-- LIGHTHOUSE-CRON-APPEND-MARKER — entries below this line are managed by roles/site-overseer/tools/lighthouse/scripts/append-alert.mjs. Do not edit by hand. -->

## Daily run — 2026-05-10 <!-- run:daily:2026-05-10 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 86, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-10/SUMMARY.md`

## Daily run — 2026-05-13 <!-- run:daily:2026-05-13 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 87, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-13/SUMMARY.md`

## Daily run — 2026-05-14 <!-- run:daily:2026-05-14 -->

**REGRESSION** — 2 regression(s) detected vs. 2026-05-13:

| URL | metric | prior | current | delta/floor | report |
|-----|--------|-------|---------|-------------|--------|
| https://www.prizma-optic.co.il/supersale/ | performance | 85 | 76 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-14/he-supersale.json) |
| https://www.prizma-optic.co.il/ru/supersale/ | performance | 79 | 77 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-14/ru-supersale.json) |

<<<<<<< Updated upstream
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-14/SUMMARY.md`

## Daily run — 2026-05-15 <!-- run:daily:2026-05-15 -->

**REGRESSION** — 4 regression(s) detected vs. 2026-05-14:

| URL | metric | prior | current | delta/floor | report |
|-----|--------|-------|---------|-------------|--------|
| https://www.prizma-optic.co.il/about/ | performance | 81 | 79 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-15/he-about.json) |
| https://www.prizma-optic.co.il/ | performance | 84 | 57 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-15/he-home.json) |
| https://www.prizma-optic.co.il/ru/category/sunglasses | performance | 84 | 79 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-15/ru-category-sunglasses.json) |
| https://www.prizma-optic.co.il/ru/ | performance | 87 | 67 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-15/ru-home.json) |

→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-15/SUMMARY.md`

## Daily run — 2026-05-16 <!-- run:daily:2026-05-16 -->

**REGRESSION** — 4 regression(s) detected vs. 2026-05-15:

| URL | metric | prior | current | delta/floor | report |
|-----|--------|-------|---------|-------------|--------|
| https://www.prizma-optic.co.il/category/eyeglasses | performance | 81 | 78 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-16/he-category-eyeglasses.json) |
| https://www.prizma-optic.co.il/ | performance | 57 | 52 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-16/he-home.json) |
| https://www.prizma-optic.co.il/supersale/ | performance | 86 | 79 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-16/he-supersale.json) |
| https://www.prizma-optic.co.il/ru/category/eyeglasses | performance | 91 | 83 | -8 pts | [json](docs/guardian/lighthouse-reports/daily/2026-05-16/ru-category-eyeglasses.json) |

→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-16/SUMMARY.md`

## Daily run — 2026-05-18 <!-- run:daily:2026-05-18 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 87, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-18/SUMMARY.md`

## Daily run — 2026-05-19 <!-- run:daily:2026-05-19 -->

**REGRESSION** — 5 regression(s) detected vs. 2026-05-18:

| URL | metric | prior | current | delta/floor | report |
|-----|--------|-------|---------|-------------|--------|
| https://www.prizma-optic.co.il/en/ | performance | 89 | 83 | -6 pts | [json](docs/guardian/lighthouse-reports/daily/2026-05-19/en-home.json) |
| https://www.prizma-optic.co.il/en/supersale/ | performance | 87 | 77 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-19/en-supersale.json) |
| https://www.prizma-optic.co.il/category/eyeglasses | performance | 88 | 79 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-19/he-category-eyeglasses.json) |
| https://www.prizma-optic.co.il/category/sunglasses | performance | 82 | 77 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-19/he-category-sunglasses.json) |
| https://www.prizma-optic.co.il/ | performance | 59 | 61 | < floor 80 | [json](docs/guardian/lighthouse-reports/daily/2026-05-19/he-home.json) |

→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-19/SUMMARY.md`

## Daily run — 2026-05-21 <!-- run:daily:2026-05-21 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 86, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-21/SUMMARY.md`

## Daily run — 2026-05-23 <!-- run:daily:2026-05-23 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 87, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-23/SUMMARY.md`
=======
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-14/SUMMA
>>>>>>> Stashed changes
