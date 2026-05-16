# Guardian Alerts — Optic Up Sentinel

> **Note:** Sentinel re-generates the section above the LIGHTHOUSE-CRON marker each scan. The Lighthouse cron appends below the marker. Do not delete the marker line.

**Last refresh:** **2026-05-16 00:10 UTC+3 — targeted Pipeline audit on `M1_LENS_PHASE_2_COMPLETION` (Night Pipeline Stage 8). Missions 1+8+10 ran clean: 0 NEW CRITICAL / 0 NEW HIGH / 0 NEW MEDIUM / 0 NEW LOW. 23 files changed across 7 Pipeline commits (`pre-night-pipeline-2026-05-15..538157e`), all in-scope (M1 + shared/js + root HTML on allowlist + _archive). Zero out-of-scope drift; no main-branch ops; Prizma row-count delta = 0 across 4 stock tables; smoke 7/7 PASS throughout. Full audit report: `_archive/night-pipeline-2026-05-15/SENTINEL_AUDIT.md`. The carry-state pending-entry hook warning persists (Foreman to decide sweep timing at Stage 9). All other prior carry items unchanged.** Prior refreshes: 2026-05-15 06:07 UTC — scheduled hourly run, Missions 1 + 2 refreshed. Prior refreshes: 2026-05-15 07:50 UTC (Missions 3 + 4 + 5 + 8 four-hour), 2026-05-15 03:25 UTC (Missions 6 + 7 + 9 daily). Initial 10-mission sweep was 2026-05-14 18:37 UTC; Mission 10 section preserved from prior run (per Sentinel "incremental scan" protocol).
**Production status (this refresh):** 🟢 healthy. **Delta vs 2026-05-15 07:50 UTC refresh:** 0 NEW CRITICAL, 0 NEW HIGH, 0 NEW MEDIUM, **1 NEW LOW (L-NEW-34-2 — Cowork-VM-mount truncation artifact on `scripts/checks/*` + `verify.mjs`; git content is correct, only the VM filesystem view is truncated; zero production / Windows-desktop / Claude Code execution impact)**. **CONFIRMED RESOLVED this refresh:** Rule 18 UNIQUE constraints on 4 M1 tables (M1A-DEBT-02 — `document_links`, `payment_allocations`, `conversation_participants`, `message_reactions` all now lead with `tenant_id`); FIELD_MAP currencies gap (M1A-DEBT-03 — T.CURRENCIES + 6 currency rows landed in `js/shared.js` + `js/shared-field-map.js`); verify-hook regex fixes (rule-15 quoted policy names + rule-21 top-level anchor per commit `913fa47` — git content correct, 38 prior false-positives eliminated). **Window scope:** 10 commits since prior 1+2 scan, all within M1A_DEBT_SWEEP closure cycle. **Zero new tables / RPCs / migrations / Edge Functions / production JS / production HTML.** **Persisting:** M-NEW-34-1 (FUNNEL_ROADMAP P2.3 still PLANNED), M-NEW-33-3 (Hebrew-locale class), M-NEW-33-4 (CLAUDE.md §0.5 prose stale), L-NEW-33-1 (column-not-found errors silent — cycle 1/4 toward close), L-NEW-33-2 (`snapshots/` not on root-allowlist), L-NEW-29-1 (GLOBAL_MAP automation-engine v7 stale), M-NEW-29-2 (M4 MODULE_MAP backlog). **No CRITICAL/HIGH delta.**

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

### M-NEW-34-1 — NEW: FUNNEL_ROADMAP P2.3 row stale (says PLANNED, SPEC closed today)

- **Status:** NEW this refresh. `roles/site-overseer/FUNNEL_ROADMAP.md` line 163 still reads `| P2.3 | M4_TEMPLATE_VALIDATION_UNIFIED | 6 | 2-3 hrs | PLANNED |` but per M4 SESSION_CONTEXT 2026-05-14, this SPEC `🟢 CLOSED via Full-Auto Pipeline (Overnight Bundle Tier A.1)` — "first Phase 2 SPEC to close." Doc-drift class: ROADMAP marker behind reality.
- **Impact:** A Site Overseer session reading FUNNEL_ROADMAP would believe P2.3 is still open and could attempt to re-author it. The SPEC is fully closed in code (send-message v25→v26, automation-engine v15→v16, new `_shared/template-validation.ts`, new `crm_automation_rules.last_error` column). M4 SC and the SPEC folder accurately reflect closure.
- **Action:** in the next Site Overseer / opticup-architect session, flip P2.3 row from `PLANNED` to `✅ CLOSED 2026-05-14 — modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UNIFIED/`. Consider also adjusting the Phase 2 header banner (Phase 2 has now started — first row closed). ~3 min prose fix. Bundle with M-NEW-33-4 in the same architect session.

### ~~M-NEW-33-1~~ — RESOLVED post-scan — M1 SESSION_CONTEXT.md refreshed

- **Status:** **RESOLVED.** Mid-scan window concurrent commit `b448c1e docs(m1): module-level docs reflect Phase 1A close` (2026-05-14 ~18:38 UTC) updated M1 SESSION_CONTEXT.md. Further verified this refresh: M1 SC now also carries M1A_CURRENCIES_GLOBAL_HOTFIX entry from later same day. Two-tier verification.
- **Closing action:** none required.

### ~~M-NEW-33-2~~ — FULLY RESOLVED 2026-05-15 07:50 UTC — M1 Phase 1A db-schema.sql delta merged

- **Status:** **FULLY RESOLVED.** The M1-owned `modules/Module 1 - Inventory Management/docs/db-schema.sql` Phase 1A delta merged via commit `fdf3e2c` — 17 tables + 9 RPCs + 1 trigger + 1 K5 view + Phase 1A summary section (lines 1969-2034) documented. Prior partial-resolution (GLOBAL_SCHEMA + DB_TABLES_REFERENCE via commit `0cf6123`) is now fully complete.
- **Carry items still tracked elsewhere:** the M4 MODULE_MAP backlog (M-NEW-29-2 + M-NEW-31-2 + 3 CRM v2 files: `crm-confirm-send-v2.js`, `crm-confirm-send-v2-render.js`, `crm-short-links-stats.js`) is its own separate finding — see M-NEW-29-2 below. The M-NEW-33-2 bundle references in older items below are historical; their target is now M-NEW-29-2 / the M4 Integration Ceremony.
- **Closing action:** none required for the M1 schema doc. M4 MODULE_MAP work remains open under M-NEW-29-2.

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

### ~~M-NEW-28-1~~ — PERMANENTLY CLOSED — `event_max_attendees` unsubstituted_placeholder

- **Status:** **PERMANENTLY CLOSED.** 3rd consecutive silent cycle (2026-05-15 03:25 UTC refresh: 0 failed messages in 24h, 0 failed in last 1h, 21 total messages sent). Upstream architectural fix shipped today via `M4_TEMPLATE_VALIDATION_UNIFIED` (Phase 2 P2.3): pre-enqueue validation now catches unsubstituted placeholders BEFORE they reach the send path; bad templates write `crm_message_log status='rejected'` + populate `crm_automation_rules.last_error` for operator visibility, rather than failing at send-time. Defense-in-depth: validation runs at plan-time (automation-engine) AND at send-time (send-message). No further monitoring required.

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

### L-NEW-34-2 — NEW: Cowork-VM-mount truncation on `scripts/checks/*` + `verify.mjs`

- **Status:** NEW this refresh. Detection class: file truncation on the Cowork-VM filesystem mount — a different symptom of the same FS class as the historical NUL-padding artifact (M-NEW-25-2 / M-NEW-26-1 / M-NEW-27-1, all RESOLVED on Windows-desktop FS).
- **Affected (6 files, disk vs git byte-count):** `scripts/checks/rule-14-tenant-id.mjs` (git=2569, disk=1164 — truncated 55%), `scripts/checks/destructive-ops-declared.mjs` (git=14113, disk=12136 — truncated 14%), `scripts/checks/rule-15-rls.mjs` (git=1284, disk=1319 — trailing garbage past truncation), `scripts/checks/rule-21-orphans.mjs` (git=1758, disk=1812), `scripts/checks/null-bytes.mjs` (git=1658, disk=1710), `scripts/verify.mjs` (git=5371, disk=5512). Evidence: `node -c scripts/checks/rule-15-rls.mjs` fails with `SyntaxError: Unexpected end of input` because the on-disk file ends mid-token (`return { violations, warn`). `git show HEAD:` returns the correct full content for every file.
- **Impact:** ZERO on production / on Windows-desktop / on Claude Code execution paths. A pre-commit hook executed FROM INSIDE the Cowork VM mount would crash with SyntaxError on import; everywhere else (Windows-desktop, Mac, CI) sees the correct git content.
- **Action:** none on the repo. Implement L-NEW-27-1 (extend `scripts/checks/null-bytes.mjs` to also detect the truncation class + cover `.json` / `.sql` extensions) — that work would catch this artifact at the gate level. Currently a known-and-tolerated cross-FS artifact.

### L-NEW-33-1 — 3 distinct Postgres column-not-found errors — silent 1/4 cycles

- **Status:** carry, ON TRACK TO CLOSE. Refresh 2026-05-15 03:25 UTC: zero ERROR-severity events in the last 60 minutes — none of the 3 (`b.event_id`, `"locale"`, `l.to_address`) recurred over 9 hours. **Silent cycle 1 of 4.** If silent through next 3 daily refreshes → CLOSE.
- **Impact:** zero customer impact; consumer code surfaces an error and handles it; nothing observable in product.
- **Action:** continue watch-flag. If re-fires → open hotfix SPEC. Likely the same outdated-client-query class as H-NEW-25-1.

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
