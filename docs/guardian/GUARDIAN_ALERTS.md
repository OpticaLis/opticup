# Guardian Alerts — Optic Up Sentinel

> **Note:** Sentinel re-generates the section above the LIGHTHOUSE-CRON marker each scan. The Lighthouse cron appends below the marker. Do not delete the marker line.

**Last refresh:** **2026-05-14 18:37 UTC (FULL 10-mission sweep — OVERNIGHT_BUNDLE_2026_05_14 Tier C.1)**.
**Production status (this scan):** 🟢 healthy. **Delta vs prior 2026-05-14 06:08 UTC scan:** 0 NEW CRITICAL, 0 NEW HIGH, 4 NEW MEDIUM (M-NEW-33-1 M1 SESSION_CONTEXT 8 days stale + M-NEW-33-2 19 new M1 Phase 1A tables un-propagated to GLOBAL_SCHEMA + db-schema + DB_TABLES_REFERENCE; M-NEW-33-3 same Hebrew-locale class extended; M-NEW-33-4 CLAUDE.md §0.5 prose drift extended by `lens-catalog-admin.html` + `employees.html` stub asymmetry), 2 NEW LOW (L-NEW-33-1 3 distinct Postgres column-not-found errors single-fired in last hour; L-NEW-33-2 `snapshots/` dir not on root-allowlist). **CONFIRMED RESOLVED this scan:** M-NEW-25-2 + M-NEW-26-1 + M-NEW-27-1 + H-NEW-25-2 (entire NUL-padding suite — Windows-desktop FS is 100% clean; sweep SPEC no longer needs to run from this machine), M-NEW-28-1 (event_max_attendees unsubstituted_placeholder — 0 failed messages in 24h, 2nd silent cycle = CLOSE), Rule 5 / FIELD_MAP propagation gap for M1 Phase 1A (resolved by commit `48b150c chore(m1,shared): add 17 T-constants` mid-scan). Scan window: 57 commits / ~10 hours covering M1 Phase 1A end-to-end + M4 Funnel Phase 1 P1.1/P1.2/P1.3/P1.4 closures (FUNNEL_ROADMAP Phase 1 COMPLETE 🎉). Quality: every new SQL migration follows canonical RLS + tenant-isolation (or platform-catalog 3-policy pattern where appropriate); every new EF carries env-only secrets + explicit auth-gate (lens-catalog-import: platform-super-admin RPC); every new `.insert(...)` stamps `tenant_id` or `owner_tenant_id`. Integrity gate exit 0. **No CRITICAL/HIGH delta.**

---

## Active CRITICAL alerts

None.

---

## Active HIGH alerts

### H-NEW-25-1 — `v_storefront_products.updated_at does not exist` (consumer error in Postgres logs)

- **Status:** carry, **NOT re-observed in last 24h** (5th consecutive silent cycle — RECOMMEND downgrade to LOW at next refresh).
- **Impact:** consumer code (likely a storefront ISR refresh job) attempts to read a column that doesn't exist on the view. When it fires, the underlying refresh task fails silently.
- **Action:** **Downgrade to LOW or close at next daily refresh if silent for a 5th+ cycle.** Three+ silent cycles is the agreed threshold for "the consumer is no longer firing this query." If re-fires → open SPEC `M3_STOREFRONT_PRODUCTS_VIEW_FIX`.
- **Owner:** opticup-architect to triage at next session.

### ~~H-NEW-25-2~~ — RESOLVED this scan — M3 SESSION_CONTEXT.md NUL-padded (Cowork-VM artifact)

- **Status:** **RESOLVED this scan.** NUL count = 0 verified on Windows-desktop FS this run (`tr -d -c '\0' < <path> | wc -c` returned 0). Real content remains current per L-NEW-26-3 resolution.
- **Closing action:** none required. Watch-flag re-opens if a future Cowork session writes the file and re-introduces NULs.

---

## Active MEDIUM alerts

### M-NEW-33-1 — NEW: M1 SESSION_CONTEXT.md 8 days stale despite massive Phase 1A work landing today

- **Status:** NEW this scan. `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` last-updated banner reads "RECEIPT_FORM_FIXES_FROM_MANAGER — 2026-05-06" (8 days ago). The 5 M1 Phase 1A migrations + 1 EF (`lens-catalog-import`) + 1 admin HTML (`lens-catalog-admin.html`) + 17 T-constants landed today (2026-05-14) — the largest M1 work in months — but the SC banner does not mention it.
- **Impact:** doc drift, future-session confusion. A new M1 session reading SESSION_CONTEXT first will not learn about the platform-catalog substrate now live.
- **Action:** in next M1 session, write SC entry summarizing Phase 1A close (19 new tables / 9 RPCs / 1 trigger / 1 view / 1 EF / 1 admin screen). ~15 min. Bundle with M-NEW-33-2 below into single Integration Ceremony SPEC.

### M-NEW-33-2 — NEW: 19 new M1 Phase 1A tables un-propagated to GLOBAL_SCHEMA / db-schema / DB_TABLES_REFERENCE

- **Status:** NEW this scan. Live DB now has 19 new M1 Phase 1A tables (`lens_brand`, `lens_design`, `lens_variant`, `lens_variant_display_seq`, `supplier_brand_distribution`, `supplier_catalog_offering`, `pricing_overlay`, `vat_rates`, `tenant_location`, `tenant_active_offerings`, `tenant_lens_stock`, `stock_lot`, `stock_movement`, `stock_transfer`, `purchase_receipt`, `purchase_receipt_line`, `supplier_permissions`, `change_approval_log`, `pending_lens_advancement_queue`) — none of them appear in `docs/GLOBAL_SCHEMA.sql` (0 hits), `modules/Module 1 - Inventory Management/docs/db-schema.sql` (0 hits), or `docs/DB_TABLES_REFERENCE.md` (0 hits).
- **Mitigation already in place:** `js/shared.js` got 17 T-constants + FIELD_MAP entries via commit `48b150c` mid-scan — so RUNTIME code knows about the tables (Rule 5 satisfied). Documentation lags.
- **Impact:** doc drift, the most impactful Mission 4 finding class. Future sessions reading the SQL files for "what tables exist" will miss them. Zero customer impact today (RLS works regardless of doc state).
- **Action:** open Integration Ceremony SPEC `M1_M4_INTEGRATION_CEREMONY_2026_05_14` bundling: (a) write M1 db-schema.sql delta (19 tables + 9 RPCs + 1 view + 1 trigger), (b) merge into `docs/GLOBAL_SCHEMA.sql`, (c) add 17 T-constant rows to `docs/DB_TABLES_REFERENCE.md`, (d) refresh M1 SESSION_CONTEXT (M-NEW-33-1), (e) refresh M4 MODULE_MAP for 11 net-new M4 JS files (M-NEW-29-2 + M-NEW-31-2 + 3 from this scan: `crm-confirm-send-v2.js`, `crm-confirm-send-v2-render.js`, `crm-short-links-stats.js`). ~30-45 min total. **Clears 6+ doc-drift findings in one pass.**

### M-NEW-33-3 — NEW: Hebrew-locale hardcoding suite extends (carry-class)

- **Status:** NEW this scan **as carry-class extension only** — no individual file finding this window's diff. The pattern `'he-IL'` / `localeCompare('he')` is present in 40+ JS files across the repo. Prior carries M-NEW-27-2 (`shared/js/sort-utils.js`), M-NEW-29-1 (`crm-queue-live.js`), M-NEW-32-1 (`crm-helpers.js`) are all in the same class. This window's new files (`crm-confirm-send-v2.js`, `crm-short-links-stats.js`) do NOT introduce new locale-API literals (they use template-string Hebrew copy only, not the locale API), so the count holds at 40+.
- **Impact:** zero today (Prizma is `he-IL`). Future second tenant in a non-Hebrew locale would inherit Hebrew formatting everywhere.
- **Action:** open SPEC `M4_M1_5_TENANT_LOCALE_PROPAGATION` bundling all 40+ files. Read tenant locale from `OpticupConfig.tenant.ui_config.locale` (default 'he-IL'). ~1-2 hour SPEC. Or accept as "future tenant-2 onboarding tax" and defer to first SaaS prospect.

### M-NEW-33-4 — NEW: CLAUDE.md §0.5 prose + FILE_STRUCTURE.md stale vs root-allowlist.json (data-driven source of truth)

- **Status:** NEW this scan. `CLAUDE.md` line 31 still says "17 other ERP HTML pages" and lists `employees.html` (which is redirect-only stub since `9f61e8b refactor(links): redirect employees.html → settings.html#permissions`). The data-driven `scripts/checks/root-allowlist.json` has 18 entries in `category_3_html_entrypoints`, includes `lens-catalog-admin.html` (new this scan window), and CORRECTLY excludes `employees.html`. The allowlist is the source of truth (it's the file pre-commit hook reads); the prose is stale.
- **Extends prior:** this finding supersedes M-NEW-27-3 by adding the `lens-catalog-admin.html` asymmetry on top of the prior `employees.html` issue.
- **Impact:** docs drift, dev-experience confusion. Zero customer impact.
- **Action:** in next opticup-architect session, update CLAUDE.md §0.5 line 31 + `docs/FILE_STRUCTURE.md` to: (a) drop `employees.html` from literal list OR annotate `(redirect-only stub → settings.html#permissions; archived at _archive/pre-consolidation/employees.html)`, (b) add `lens-catalog-admin.html`, (c) bump the "17" count to match the 18-entry allowlist. ~5 min prose fix.

### ~~M-NEW-25-2~~ — RESOLVED this scan — `docs/guardian/` output files NUL-padded

- **Status:** **RESOLVED this scan.** NUL counts on FS this run: GUARDIAN_ALERTS.md = 0, DAILY_SUMMARY.md = 0. Windows-desktop FS produces clean files; the Cowork-VM artifact only fires on the Cowork mount.

### ~~M-NEW-26-1~~ — RESOLVED this scan — Legacy NUL-padding in dormant SQL file

- **Status:** **RESOLVED this scan.** `modules/Module 3 - Storefront/sql/manual_action_1_rls_canonical_fixes.sql` NUL count = 0 on FS this run.

### ~~M-NEW-27-1~~ — RESOLVED this scan — 7 production files NUL-padded on Cowork-VM filesystem

- **Status:** **RESOLVED this scan.** NUL sweep across all 15 changed code files this window + 5 prior-carry files: every count is 0. The Windows-desktop machine does not produce the Cowork-VM artifact. Sweep SPEC no longer needed (or only needed if a Cowork session re-introduces NULs). The complementary L-NEW-27-1 (`null-bytes.mjs` doesn't cover `.json` / `.sql`) remains open as detection-gap finding but no longer has active corruption to detect.

### ~~M-NEW-27-2~~ — carry — `shared/js/sort-utils.js` Hebrew-locale hardcoding

- Bundled under M-NEW-33-3 above.

### ~~M-NEW-27-3~~ — superseded by M-NEW-33-4

- The `employees.html` half is now bundled with the new `lens-catalog-admin.html` half under M-NEW-33-4. Same fix clears both.

### ~~M-NEW-28-1~~ — RESOLVED this scan — `event_max_attendees` unsubstituted_placeholder

- **Status:** **RESOLVED this scan.** 0 rows in `crm_message_log WHERE status='failed' AND created_at > now() - interval '24 hours'`. 2nd consecutive silent cycle → CLOSE per project policy.

### M-NEW-28-2 — 4 net-new advisor lint types (security delta) — partially resolved

- **Status:** carry, partially resolved. `extension_in_public` × 2 still open (defer SPEC). `auth_leaked_password_protection` × 1 still open (not active today, defer to email/password tenant onboarding). `public_bucket_allows_listing` was reduced to 1 (`inventory-images` — the last public bucket; `tenant-logos` was hardened 2026-05-13). `rls_policy_always_true` resolved 2026-05-13.
- **Total advisor count this scan: 149 (17 ERROR + 132 WARN) — ZERO DELTA from baseline.**
- **Action:** carry as-is.

### M-NEW-29-1 — carry — `modules/crm/crm-queue-live.js:26` hardcodes `toLocaleTimeString('he-IL')`

- Bundled under M-NEW-33-3.

### M-NEW-29-2 — carry — 2 net-new M4 JS files missing from MODULE_MAP.md

- Bundled into the M-NEW-33-2 Integration Ceremony SPEC.

### M-NEW-29-3 — carry — 2 net-new tables not propagated to docs/GLOBAL_SCHEMA / DB_TABLES_REFERENCE / M4 db-schema

- Bundled into the M-NEW-33-2 Integration Ceremony SPEC.

### M-NEW-31-1 — carry — M4 db-schema.sql out of sync with live DB (5 new objects in last 27h)

- Bundled into the M-NEW-33-2 Integration Ceremony SPEC.

### M-NEW-31-2 — carry — 6 net-new M4 JS/TS files absent from MODULE_MAP.md

- Bundled into the M-NEW-33-2 Integration Ceremony SPEC (now 11 net-new M4 JS files counting the 3 from this scan).

### M-NEW-32-1 — carry — `modules/crm/crm-helpers.js` Hebrew-locale hardcoding

- Bundled under M-NEW-33-3.

### M-5 — Live DB security advisors (carry)

- **Status:** stable carry. 17 ERROR + 132 WARN security advisors **across all advisor levels (149 total) — zero delta vs 2026-05-14 baseline.**
- **Top categories (unchanged):** `authenticated_security_definer_function_executable` (56), `anon_security_definer_function_executable` (42), `function_search_path_mutable` (30 ← +0 new from M1 Phase 1A's 9 RPCs which inherit the same pre-existing project pattern), `security_definer_view` (17). All are project-design choices for the canonical RPC + Views pattern; carry-allowlisted.
- **Action:** no action; review at next quarterly security audit.

### M-NEW-30-1 — carry — `media_library` 99.8% seq-scan ratio

- **Status:** stable carry (not re-verified this scan; not in top-15 tables by size).

### M-NEW-30-2 — carry — M4 SC slightly behind 14 newer commits

- **Status:** RESOLVED this scan implicitly — M4 SC has 4 distinct dated entries from today (2026-05-14) covering P1.1, P1.2, P1.3, P1.4 closures. Most-current of any module SESSION_CONTEXT.

### M-6 / M-12 / M-13 — pre-existing carries

Stable; no change. See full `GUARDIAN_REPORT.md` for details.

---

## Active LOW alerts

### L-NEW-33-1 — NEW: 3 distinct Postgres column-not-found errors single-fired in last hour

- **Status:** NEW this scan. Postgres logs show 3 distinct ERROR events in the last hour, each fired once:
  - `column b.event_id does not exist` (2026-05-14 18:23 UTC) — qualifier suggests outdated alias in consumer query.
  - `column "locale" does not exist` (2026-05-14 18:25 UTC) — `tenants.locale` exists; the unqualified reference suggests an outdated query.
  - `column l.to_address does not exist` (2026-05-14 18:27 UTC) — `to_address` does NOT exist on `crm_message_log`. Same single-fire pattern as H-NEW-25-1's `v_storefront_products.updated_at` carry.
- **Impact:** zero customer impact. The consumer code that fires these queries gets an error and presumably handles it; nothing observable in product.
- **Action:** watch-flag, 4 silent cycles → close. If re-fires consistently in next 24h → open hotfix SPEC. Likely the same outdated-client-query class as H-NEW-25-1.

### L-NEW-33-2 — NEW: `snapshots/` directory at repo root not on `root-allowlist.json`

- **Status:** NEW this scan. `snapshots/` directory is tracked at repo root (contains `log.json` per `scripts/snapshot.mjs` Bounded Autonomy infra per CLAUDE.md §11) but not on `scripts/checks/root-allowlist.json` directories list.
- **Impact:** the pre-commit `check-root-discipline.mjs` would WARN (exit 2) on `snapshots/` if it were freshly added, but since it's pre-existing it does not block anything today. Cosmetic/maintenance.
- **Action:** add `snapshots` to allowlist `directories.category_2_sources_of_truth` section. Bundle with M-NEW-33-4 prose fix.

### L-NEW-32-1 — carry — `modules/crm/crm-broadcast-cancel.js:108,113` innerHTML interpolation without escapeHtml

- **Status:** carry-stable. Same 2 lines unchanged. Low realistic risk (server side is JWT-authenticated EF; values are operator-controlled error strings + numerics).
- **Action:** trivial wrap (`escapeHtml(String(r.X))`) in next CRM-UX SPEC. ~3 min.

### L-NEW-27-1 — carry — Rule 31 gate (`null-bytes.mjs`) does not cover `.json` or `.sql` extensions

- **Status:** carry, detection-gap class only. Since M-NEW-27-1 is RESOLVED (no active corruption to detect this scan), the urgency drops further, but the gap remains.
- **Action:** paper-SPEC `INTEGRITY_GATE_EXTEND_TO_JSON_AND_SQL` (~5 min — add 2 strings to a Set in `scripts/checks/null-bytes.mjs`).

### L-NEW-27-2 — carry — `employees.html` is 0 bytes post-redirect-consolidation

- **Status:** carry until post-deploy verification. `curl -I https://app.opticalis.co.il/employees.html` to confirm redirect HTML is served.

### L-NEW-28-1 — carry — `crm_message_log` retention/archival watch-flag (14 MB, ~370 MB/year projected)

- **Status:** carry. Defer to 2026 Q4 SaaS-hardening planning.

### L-NEW-29-1 — carry — `automation-engine` GLOBAL_MAP entry says "v7 ACTIVE" but live is past v7

- Bundled into the M-NEW-33-2 Integration Ceremony SPEC.

### L-NEW-30-1 / L-NEW-31-1 / L-2 / L-13 / L-17 / L-20 / L-21 / L-22 / L-25 — pre-existing carries

Stable; no change.

---

## Operational Note

**Sentinel scan environment this run:** Windows desktop (`C:\Users\User\opticup`), NOT Cowork VM. Filesystem is clean; the recurring Cowork-VM mount-drift + NUL-padding artifacts do not affect this run. All 4 NUL-padding carry findings (H-NEW-25-2, M-NEW-25-2, M-NEW-26-1, M-NEW-27-1) are RESOLVED on this machine's FS view. If a future Cowork session re-introduces NULs, the alerts will re-open at the next Sentinel run from that VM. Production was never affected by any of the NUL-padding instances (production deploys from `git checkout origin/main`, not from any Cowork-VM FS).

**Funnel Phase 1 COMPLETE 🎉.** P1.1 (UTM triple-layer persistence), P1.2 (broadcast_id propagation), P1.3 (short.gy → internal redirect), P1.4 (register_lead_to_event RPC map) all closed today via Full-Auto Pipeline. End-to-end funnel attribution chain wired: `crm_broadcasts → crm_message_queue → crm_message_log → short_links → short_link_clicks → crm_lead_touchpoints`.

**M1 Phase 1A platform-catalog substrate is live.** 19 new tables + 9 atomic RPCs + 1 K3 trigger + 1 K5 view + 1 Edge Function (`lens-catalog-import`) + 1 admin HTML page (`lens-catalog-admin.html`) + 17 new T-constants in `shared.js`. Customer-facing screens deferred to Phase 1B (separate SPEC stub already sealed). Documentation propagation incomplete — see M-NEW-33-1 + M-NEW-33-2.

---

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

→ Full report: `docs/guardian/lighthouse-reports/daily/2026-05-14/SUMMARY.md`
