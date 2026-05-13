# Guardian Alerts — Optic Up Sentinel

> **Note:** Sentinel re-generates the section above the LIGHTHOUSE-CRON marker each scan. The Lighthouse cron appends below the marker. Do not delete the marker line.

**Last refresh:** 2026-05-13 11:50 UTC (Missions 1 + 2) + **2026-05-13 11:20 UTC (Missions 3 + 4 + 5 + 8 — THIS RUN)**. Missions 6+7+9 carry from 2026-05-13 04:10 UTC.
**Production status (this scan):** 🟡 stable. **3+4+5+8 incremental added: 0 NEW CRITICAL, 0 NEW HIGH, 3 NEW MEDIUM, 1 NEW LOW.** M-NEW-29-1 (`crm-queue-live.js:26` Hebrew-locale hardcode — same class as M-NEW-27-2 + previously-resolved M-6). M-NEW-29-2 (2 net-new M4 JS files missing from MODULE_MAP). M-NEW-29-3 (2 net-new tables `crm_status_change_events` + `crm_trigger_type_registry` not in GLOBAL_SCHEMA / DB_TABLES_REFERENCE — Integration Ceremony pending). L-NEW-29-1 (`automation-engine` GLOBAL_MAP says v7 ACTIVE but live is past v7). All 4 root-cause to post-cutover Integration Ceremony pause. **Recommended bundle SPEC `INTEGRATION_CEREMONY_2026_05_13`** (~30 min) clears M-NEW-29-2 + M-NEW-29-3 + L-NEW-29-1 + M-NEW-27-3 + M-NEW-28-3 + M-12 in one pass. **H-NEW-28-1 ROOT-CAUSE STILL OPEN** (config.toml block still absent; workaround migration is the only thing keeping the queue draining). Direction-of-travel positive: STATUS_CHANGE_TRIGGERS_FRAMEWORK migration is exemplary SaaS-clean (canonical RLS, tenant-scoped UNIQUE, config-table registry); pub-sub design strengthens cross-module boundaries. Other carries unchanged.

---

## Active CRITICAL alerts

None.

---

## Active HIGH alerts

### H-NEW-28-1 — NEW: `dispatch-queue` Edge Function `verify_jwt=true` regression from Daniel's CLI deploy

- **Status:** NEW this scan. Surfaced in `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FINDINGS.md` F1 (HIGH) during E2E smoke on 2026-05-13 03:01 UTC.
- **What happened:** MCP `deploy_edge_function` returned `InternalServerError` (OPEN-021 path); SPEC's CLI fallback had Daniel deploy via `supabase functions deploy dispatch-queue`. The CLI defaults to `--verify-jwt=true`, flipping `dispatch-queue`'s prior `verify_jwt=false` configuration to `true`. From that moment, the pg_cron `dispatch_queue` tick failed with HTTP 401 `UNAUTHORIZED_NO_AUTH_HEADER` because the cron's `net.http_post` did not include an `Authorization` header.
- **Workaround live:** migration `20260513030500_dispatch_queue_cron_auth_header_workaround.sql` re-scheduled `dispatch_queue` with an Authorization header. **Sentinel verified at this scan:** cron ran 60/60 successful in last 60 min. Queue is processing 100% of rows.
- **Customer impact during regression (~2-3 hours late 2026-05-12 evening):** queue rows accumulated unprocessed. Per Daniel's note: "post-cutover Prizma is in a quiet window; nightly batches not affected. Estimated affected production traffic: low."
- **Root-cause fix (Daniel-actionable, ~1 minute on Windows):**
  ```powershell
  cd C:\Users\User\opticup
  git pull origin develop
  supabase functions deploy dispatch-queue --no-verify-jwt
  ```
  Then the workaround's Authorization-header binding becomes redundant. Alternatively a `[functions.dispatch-queue]` block in `supabase/config.toml` with `verify_jwt = false` prevents future CLI-default drift.
- **Action:** open small chore SPEC `DISPATCH_QUEUE_VERIFY_JWT_REVERT` (~5 minutes) once Daniel runs the redeploy.
- **Owner:** Daniel (CLI redeploy) + Claude Code (config.toml update for permanence).

### H-NEW-25-1 — `v_storefront_products.updated_at does not exist` (consumer error in Postgres logs)

- **Status:** carry, **NOT re-observed in last 24h** (watch-flag, **3rd consecutive silent cycle**).
- **Impact:** consumer code (likely a storefront ISR refresh job) attempts to read a column that doesn't exist on the view. When it fires, the underlying refresh task fails silently.
- **Re-verified live this scan:** confirmed `v_storefront_products` columns are `id, tenant_id, barcode, brand_name, brand_id, brand_type, model, color, size, quantity, product_type, sell_price, sell_discount, website_sync, display_mode, display_mode_override, images, search_text, resolved_mode, ai_description, ai_seo_title, ai_seo_description` — no `updated_at`.
- **Action:** **Recommendation: downgrade to LOW at next daily refresh if silent for a 4th cycle.** Three silent cycles is the agreed threshold for "the consumer is no longer firing this query." If re-fires → open SPEC `M3_STOREFRONT_PRODUCTS_VIEW_FIX` to add the missing column or fix the consumer query.
- **Owner:** opticup-architect to triage at next session.

### H-NEW-25-2 — M3 SESSION_CONTEXT.md NUL-padded (Cowork-VM artifact)

- **Status:** carry. NUL count this scan: 30,753 (was 31,987 yesterday, file mtime unchanged 2026-04-26). Real content ends at byte 8,288.
- **Impact:** zero customer impact, zero runtime impact. Developer-facing only — file is binary-flagged by grep, mildly impairs static analysis. Risk: a future Cowork session that opens this file may accidentally truncate or further corrupt it.
- **Action:** **NOW PART OF** combined SPEC `COWORK_NUL_PADDING_SWEEP_2026_05_12` (see M-NEW-27-1 below).
- **Owner:** Claude Code session (cannot be done from Cowork VM — same VM produces the artifact).

---

## Active MEDIUM alerts

### M-NEW-27-1 — NEW: 7 production files NUL-padded on Cowork-VM filesystem (this scan)

- **Status:** NEW this scan. The 27-hour Mission 1+2 window touched 19 production-surface files; 7 of them now carry trailing NUL bytes on the Cowork-VM filesystem (NUL counts: crm.html=11, storefront-blog.html=102, storefront-content.html=67, storefront-landing-content.html=34, storefront-studio.html=65, scripts/checks/root-allowlist.json=25, supabase/functions/send-message/index.ts=44).
- **Source-of-truth status:** all 7 git blobs are clean (verified via `git show HEAD:<file>` — 0 NULs each). The corruption exists ONLY on the Cowork-VM filesystem.
- **Impact:** zero customer impact. Production deploy reads from `git checkout origin/main`, not from the Cowork-VM filesystem. Rule 31 gate blocks 5 of 7 (HTML/.ts) at staging time; **2 (`.json`, `.ts`) — wait, .ts IS covered → actually only `.json` slips, since `scripts/checks/null-bytes.mjs` EXTENSIONS set excludes `.json`**.
- **Action:** open SPEC `COWORK_NUL_PADDING_SWEEP_2026_05_12` bundling: (a) all 7 files this scan, (b) M3 SESSION_CONTEXT.md NUL truncation (H-NEW-25-2), (c) `modules/Module 3 - Storefront/sql/manual_action_1_rls_canonical_fixes.sql` 5 NULs (M-NEW-26-1), (d) refresh M3 SC semantic content per L-NEW-26-3, (e) `docs/guardian/` output files (M-NEW-25-2). Total: 11 files truncated in one pass (~15 minutes, no risk). PLUS open paper-SPEC `INTEGRITY_GATE_EXTEND_TO_JSON_AND_SQL` to add `.json` + `.sql` to `null-bytes.mjs` EXTENSIONS (closes the L-NEW-27-1 detection gap).
- **Owner:** Claude Code session on Windows or Mac (NOT Cowork VM — same VM produces the artifact).

### M-NEW-25-2 — `docs/guardian/` output files NUL-padded (Cowork-VM artifact)

- **Status:** carry. Counts this scan: GUARDIAN_ALERTS.md (will accumulate fresh NULs after this write), DAILY_SUMMARY.md = 443 (unchanged).
- **Impact:** zero. These files are gitignored as of 2026-05-02 (per Supervisor Pattern 20) — local-only, no propagation downstream. Sentinel cannot self-clean (read-only outside `docs/guardian/`, but writes occur from inside the VM that produces the artifact). Cosmetic / hygiene.
- **Action:** included in same `COWORK_NUL_PADDING_SWEEP_2026_05_12` SPEC. Expectation: files will accumulate fresh NULs each Sentinel run until run from a non-Cowork environment.

### M-NEW-26-1 — Legacy NUL-padding in dormant SQL file (carry)

- **Status:** carry. `modules/Module 3 - Storefront/sql/manual_action_1_rls_canonical_fixes.sql` ends with 5 trailing NULs.
- **Impact:** none — file is dormant (not loaded at runtime, not staged, content from Apr 12).
- **Action:** included in `COWORK_NUL_PADDING_SWEEP_2026_05_12` SPEC.

### M-NEW-27-2 — NEW: `shared/js/sort-utils.js:30` hardcodes Hebrew locale on string comparison (SaaS-readiness)

- **Status:** NEW this scan (Mission 3). The new utility ships with `va.localeCompare(vb, 'he')` literal — same class as the prior M-6 which was already resolved on `table-builder.js`.
- **Impact:** today zero (no callers verified yet, file is net-new). Future second-tenant in Germany/France/Russia using this utility would get Hebrew collation rules on every sortable ERP table.
- **Action:** parameterize the locale, default to current tenant's `tenants.ui_config.locale` (same pattern that resolved M-6). ~5 minute bugfix SPEC. Bundle with `COWORK_NUL_PADDING_SWEEP_2026_05_12` if staging together.

### M-NEW-27-3 — NEW: Stale `employees.html` references in CLAUDE.md + FILE_STRUCTURE.md (documentation-accuracy)

- **Status:** NEW this scan (Mission 4). After the SETTINGS_PERMISSIONS_CONSOLIDATION SPEC (`dbccbb1` + `9f61e8b`), `employees.html` is now a redirect-only stub archived to `_archive/pre-consolidation/`. But `CLAUDE.md:31` (Root Discipline Rule §0.5 Category 3 list) and `docs/FILE_STRUCTURE.md:29` ("standalone employee management page") still describe it as a live entrypoint.
- **Note:** `scripts/checks/root-allowlist.json` correctly omits `employees.html` from `category_3_html_entrypoints`. So the data-driven allowlist was updated but the human-readable prose was not — exactly the Rule 21 No-Orphan class that CLAUDE.md itself warns about.
- **Impact:** docs drift, dev-experience confusion. Zero customer impact.
- **Action:** in the next opticup-architect session, update CLAUDE.md §0.5 + FILE_STRUCTURE.md to either drop `employees.html` from the entrypoints list OR explicitly tag it as `(redirect-only stub → settings.html#permissions; archived form at _archive/pre-consolidation/employees.html)`. ~5 minute prose fix.

### M-NEW-28-1 — NEW: 7 demo-tenant SMS failed with `unsubstituted_placeholder: event_max_attendees` (fail-CLOSED catch)

- **Status:** NEW this scan. 7 rows in `crm_message_log` (status=failed, channel=sms, tenant=demo `8d8cfa7e-...`, errors all identical), first 2026-05-12 11:10:22, last 2026-05-12 11:18:41.
- **Interpretation:** The new status-change framework template engine is fail-CLOSED when a template references a placeholder the variable-substitution pipeline doesn't bind. `event_max_attendees` is defined for some template paths but not bound on the path that fired here. **The fail-CLOSED catch is exactly the desired behavior** — it blocked malformed SMS payloads before delivery rather than sending garbled content.
- **Customer impact:** zero. Demo tenant only; no Prizma customer received a failed SMS.
- **Action:** open small SPEC `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_EVENT_MAX_ATTENDEES` (~10 minutes) — either remove the placeholder from the template that fired this 7× or bind `event_max_attendees` in the variable map. **Fix before Prizma exercises the same template path.**

### M-NEW-28-2 — NEW: 4 new advisor lint types since baseline (security delta)

- **Status:** NEW this scan. Sentinel re-pulled advisors and surfaced 4 new lint types not in the prior carry-allowlist:
  - `extension_in_public` × 2 — `pg_trgm` + `pg_net` extensions in `public` schema. Recommendation: defer to a planned schema-hygiene SPEC (touches every consumer's `search_path`; not blocking).
  - ~~`rls_policy_always_true` × 1 — `platform_audit_log.audit_log_admin_insert`~~ **RESOLVED 2026-05-13** by `SECURITY_HOTFIX_2026_05_13` §6.9 — policy dropped; SECURITY DEFINER admin RPCs still write audit rows via postgres-bypass.
  - ~~`public_bucket_allows_listing` × 1 — `tenant-logos`~~ **RESOLVED 2026-05-13** by `SECURITY_HOTFIX_2026_05_13` §6.8 — 3 PUBLIC-role policies replaced with 3 authenticated-scoped policies (legacy-path-compatible). Path canonicalization deferred to TECH_DEBT M2-DEBT-LOGO-PATH-CANONICALIZATION.
  - `auth_leaked_password_protection` × 1 — HIBP password-breach gate disabled on Supabase Auth. **Not in active use today** (PIN-auth bypasses Supabase Auth) but a SaaS-readiness concern for future tenants using email/password. **Action:** enable in Supabase Dashboard → Auth → Password Settings (1-click, no migration). Bundle into next M2 SaaS hardening session.
- **Customer impact:** zero today (none of these are active attack paths against Prizma). SaaS-readiness only.

### M-NEW-28-3 — NEW: MASTER_ROADMAP.md mtime 2026-05-09 — stale vs the 4 SPEC closures since

- **Status:** NEW this scan. `MASTER_ROADMAP.md` mtime is 2026-05-09 12:47 UTC. Since then 4 major SPECs have closed (STATUS_CHANGE_TRIGGERS_FRAMEWORK, MIGRATION_3_CRM, MIGRATION_4_STOREFRONT_STUDIO, PRIZMA_CRM_BUGFIX_BACKPORT), none of which appear in MASTER_ROADMAP's "Recent decisions" section.
- **Impact:** docs drift, weak cross-reference for future sessions trying to understand recent decision history. Zero customer impact.
- **Action:** at the next architect session, append 4 entries to MASTER_ROADMAP.md "Recent decisions" covering the 4 SPECs. ~10 minute prose update. **Bundle with INTEGRATION_CEREMONY_2026_05_13** (see M-NEW-29-3 below).

### M-NEW-29-1 — NEW: `modules/crm/crm-queue-live.js:26` hardcodes `toLocaleTimeString('he-IL')` (SaaS-readiness)

- **Status:** NEW this scan. `crm-queue-live.js` (touched this window by `e1113f4`) renders queue-row timestamps via `new Date(dt).toLocaleTimeString('he-IL')` — third instance of the same SaaS-readiness class (after M-NEW-27-2 still-open and M-6 resolved).
- **Impact:** zero today (CRM queue-live is internal-staff-only). Future tenant in non-Hebrew locale would see Hebrew-Israel-formatted timestamps regardless of preference.
- **Action:** bundle with M-NEW-27-2 (sort-utils Hebrew-locale) into one SPEC `M4_M1_5_TENANT_LOCALE_PROPAGATION` (~10 min for both, plus any other locale literals discovered in a one-pass sweep). Defaults via `window.__TENANT_LOCALE__` or `OpticupConfig.tenant.ui_config.locale`.

### M-NEW-29-2 — NEW: 2 net-new M4 JS files missing from `Module 4 - CRM/docs/MODULE_MAP.md`

- **Status:** NEW this scan. The post-cutover Integration Ceremony pause means 2 net-new CRM JS files landed in production without MODULE_MAP propagation:
  - `modules/crm/crm-messaging-templates-editor.js` (155 lines, NEW commit `2df0e02`, 2026-05-12 — sibling-extracted from `crm-messaging-templates.js` to stay under Rule 12 cap).
  - `modules/crm/crm-messaging-broadcast-queue.js` (167 lines, NEW commit `e6bdd62`, 2026-05-12 — broadcast → queue enqueue path).
- **Impact:** docs drift. Any session reading MODULE_MAP for "what CRM files exist + their public API" will miss both. Iron Rule 21 (No Orphans) future-bug class.
- **Action:** append 2 rows to MODULE_MAP "Files" + their public-API entries to "Functions". **Bundle with INTEGRATION_CEREMONY_2026_05_13 SPEC.**

### M-NEW-29-3 — NEW: 2 net-new tables not propagated to docs/GLOBAL_SCHEMA / DB_TABLES_REFERENCE / M4 db-schema

- **Status:** NEW this scan. Migration `20260512184500_status_change_triggers_framework.sql` (applied to live DB 2026-05-12 ~21:00 UTC) creates 2 new tables (`crm_status_change_events` + `crm_trigger_type_registry`) — both **production-live, RLS-protected, indexed, populated for demo + Prizma** — but absent from:
  - `docs/GLOBAL_SCHEMA.sql` (0 hits): the canonical cross-module schema reference.
  - `docs/DB_TABLES_REFERENCE.md` (0 hits): the T-constant quick reference.
  - `modules/Module 4 - CRM/docs/db-schema.sql` (0 hits): M4's own schema file.
- **Impact:** schema drift, the most impactful Mission 4 finding class per the sentinel checklist. Future sessions reading the SQL files for "what tables exist" will miss them. Zero customer impact today (RLS works regardless of doc state).
- **Action:** Integration Ceremony pass — merge M4 db-schema deltas (these 2 tables + the trigger + the 2 cron migrations) into `docs/GLOBAL_SCHEMA.sql`; add T-constant rows to `docs/DB_TABLES_REFERENCE.md`. ~15 minute pass. **Bundle into INTEGRATION_CEREMONY_2026_05_13 SPEC** (clears 6 doc-drift items in one pass: M-NEW-29-2 + M-NEW-29-3 + M-NEW-27-3 + M-NEW-28-3 + L-NEW-29-1 + M-12).

### ~~M-NEW-26-3~~ — RESOLVED this scan (GROUP BY error silent for 24h)

Intermittent SQL ERROR `crm_automation_runs.started_at must appear in GROUP BY` — single occurrence at 2026-05-11 22:37 UTC; **not re-observed in this 24h cycle.** Per prior policy (1 silent cycle = downgrade, 2 silent = close). **Closed.** If re-fires → re-open with bugfix SPEC `M4_CRM_AUTOMATION_RUNS_QUERY_FIX`.

### M-5 — Live DB security advisors (carry)

- **Status:** stable carry. 26 ERROR + 116 WARN security advisors, **zero delta** from 2026-05-11 baseline (re-pulled live this Mission 1+2 scan, confirmed).
- **Top categories (unchanged):** `authenticated_security_definer_function_executable` (41), `function_search_path_mutable` (36), `anon_security_definer_function_executable` (34), `security_definer_view` (25). All are project-design choices for the canonical RPC + Views pattern; carry-allowlisted.
- **Action:** no action; review at next quarterly security audit.

### M-6 / M-12 / M-13 — pre-existing carries

Stable; no change. See full GUARDIAN_REPORT.md for details.

---

## Active LOW alerts

### L-NEW-27-1 — NEW: Rule 31 gate (`null-bytes.mjs`) does not cover `.json` or `.sql` extensions

- **Status:** NEW this scan. The `EXTENSIONS` set in `scripts/checks/null-bytes.mjs` covers `.js .mjs .cjs .jsx .ts .tsx .astro .css .html .htm` — but NOT `.json` or `.sql`. Two file classes already observed with NUL-padding (root-allowlist.json this scan, manual_action_1_rls_canonical_fixes.sql carry M-NEW-26-1) slip past the staging gate.
- **Impact:** detection gap, not active corruption. Risk: future commit that re-stages a NUL-padded `.json` or `.sql` file would not be blocked by the Rule 31 gate; corruption would propagate to the git tree until caught at deploy parse time.
- **Action:** open paper-SPEC `INTEGRITY_GATE_EXTEND_TO_JSON_AND_SQL` (~5 minutes' work — add 2 strings to a Set in `scripts/checks/null-bytes.mjs`). Bundle with the cleanup SPEC if desired.

### ~~L-NEW-26-3~~ — RESOLVED this scan (M3 SESSION_CONTEXT.md semantic content now current)

Per Mission 4 §4.5 verification: M3 SC first 300 chars now read "POST-CUTOVER MAINTENANCE … demo storefront now also live … Last updated: 2026-05-11 (Demo Storefront Forms Phase 1 closed 🟡)". Real content (8,288 bytes underneath the NUL padding) is current. File-form NUL padding remains tracked under H-NEW-25-2 (separate concern). **Closed.**

### ~~L-NEW-26-2~~ — RESOLVED 2026-05-13 — `_backup_brand_gallery_20260417` dropped

Closed by `SECURITY_HOTFIX_2026_05_13` §6.1. The orphan table (465 rows, RLS disabled, anon full CRUD per Supabase Security Advisor) has been `DROP`ed. `_backup_brand_gallery_20260417` no longer exists in `public`. Drop receipt in `MIGRATIONS_APPLIED.md` of the SPEC folder.

### L-NEW-27-2 — INFORMATIONAL: employees.html is 0 bytes on Cowork-VM filesystem post-redirect-consolidation

- **Status:** NEW this scan, watch-flag (not yet a finding). Per commit `9f61e8b refactor(links): redirect employees.html → settings.html#permissions`, employees.html should be a redirect stub. The Cowork-VM filesystem shows 0 bytes for the file. If the actual deployed body is also 0 bytes, customers hitting `/employees.html` would get an empty 200 OK rather than a redirect.
- **Impact:** unknown until verified post-deploy. Possibly the deployed file body has the redirect HTML and only the Cowork-VM mount shows 0 bytes (yet another Cowork-VM filesystem-vs-git drift instance).
- **Action:** post-deploy smoke test: `curl -I https://app.opticalis.co.il/employees.html` and verify it returns either a 30x redirect or a 200 with a meta-refresh body. If empty 200 — open hotfix SPEC. Defer to opticup-localhost-tester or manual verification.

### L-NEW-28-1 — NEW: `crm_message_log` retention/archival watch-flag

- **Status:** NEW this scan. Table is now 14 MB (2nd-largest after `inventory`), with ~3,500 messages/day post-cutover. Projected growth: ~370 MB/year at current pace. **No index pressure, no slow-query reports, no retention policy crossed** — purely a growth-trajectory watch-flag.
- **Impact:** zero today. Future: an unmanaged 370 MB/year table is fine for 2-3 years but warrants a retention policy before 2027 (e.g., move rows older than 180 days to `_archive_message_log`).
- **Action:** no action this quarter. Carry forward to 2026 Q4 SaaS-hardening planning.

### L-NEW-29-1 — NEW: `automation-engine` GLOBAL_MAP entry says "v7 ACTIVE" but live is past v7

- **Status:** NEW this scan. `docs/GLOBAL_MAP.md:205` reads `automation-engine … v7 ACTIVE`. Since v7, multiple feature increments shipped (status-change event consumption, parallel multi-channel dispatch, chunked .in(), paginated recipients, EF→DB promotion trigger).
- **Impact:** version-tag drift, informational only — no programmatic consumer. Signals staleness to humans skimming GLOBAL_MAP.
- **Action:** at next Integration Ceremony, update to current deploy version (likely v15+). **Bundle with INTEGRATION_CEREMONY_2026_05_13.**

### L-2 / L-13 / L-17 / L-20 / L-21 / L-22 / L-25 — pre-existing carries

Stable; no change. **L-20 enrichment this scan:** `tenants.ui_config.test_mode_email_allowlist` (added by `8c4c78d` send-message email gate) is now a fresh nested key inside `ui_config`. The `v_public_tenant` view exposes `ui_config` wholesale (including this nested key). If a future storefront query reads `ui_config.test_mode_email_allowlist`, it leaks Daniel's personal email + any beta-tester emails. **No active leak today** (no storefront code reads this key) but the L-20 contract should explicitly enumerate which `ui_config` keys are anon-readable BEFORE next storefront session adds nested-key exposure.

---

## Operational Note

**Cowork VM mount git index corruption (recurring, 8+ scans):** the Cowork VM mount opens with a corrupted `.git/index` (`fatal: unknown index entry format 0x74000000` / `0x21000000` this run). `git log --since=...` works without the index; `git status` / `git ls-files` are unavailable. Sentinel works around this via filesystem reads + `git log` time-window queries. This is a Cowork-VM environmental condition, not a project bug. Do NOT attempt to repair the index from a Sentinel run (Sentinel is read-only outside `docs/guardian/`). The repair is performed naturally by the next Claude Code (Windows) session via `git read-tree HEAD` or `git fetch + git reset --hard origin/develop`.

**Cowork VM mount NUL-padding regression (recurring, 4 instances now):** The same Cowork mount that produces the index corruption also pads files with trailing NUL bytes when written through the mount. This scan observed it on **7 fresh production files** (M-NEW-27-1) plus the 3 carries (M3 SC, legacy SQL, docs/guardian/). Source-of-truth in git is clean — corruption exists only on the Cowork-VM filesystem. Production unaffected. Bundling cleanup SPEC `COWORK_NUL_PADDING_SWEEP_2026_05_12` recommended.

---

<!-- LIGHTHOUSE-CRON-APPEND-MARKER — entries below this line are managed by roles/site-overseer/tools/lighthouse/scripts/append-alert.mjs. Do not edit by hand. -->

## Daily run — 2026-05-10 <!-- run:daily:2026-05-10 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 86, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-10/SUMMARY.md`

## Daily run — 2026-05-13 <!-- run:daily:2026-05-13 -->

**ALL CLEAR** — 30/30 URLs OK; 0 comparisons against no prior baseline; 0 regressions. avg perf 87, avg a11y 95.
→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-13/SUMMARY.md`
