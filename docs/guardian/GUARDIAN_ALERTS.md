# Guardian Alerts — Optic Up Sentinel

> **Note:** Sentinel re-generates the section above the LIGHTHOUSE-CRON marker each scan. The Lighthouse cron appends below the marker. Do not delete the marker line.

**Last refresh:** **2026-05-19 ~07:35 UTC — scheduled hourly run; Missions 1 + 2 refreshed. Delta vs 2026-05-19 ~05:50 UTC 4-hour run: 0 NEW CRITICAL, 0 NEW HIGH, 1 NEW MEDIUM (M-NEW-39-5 — Hebrew-locale + ₪ cluster extends by 4 instances across `catalog-suppliers-col.js` line 149 + `lens-pos-list-detail.js` lines 19/45/67 + `lens-pos-list-stats.js` line 9 — same finding-class as M-NEW-33-3 / M-NEW-38-5), 0 NEW LOW. 0 RESOLVED.** 6 source files modified since prior Missions 1+2 scan (3× `modules/lens-catalog-admin/` + 2× `modules/lens-pos-list/` + 1× `supabase/functions/_shared/event-variables.ts`). Live RLS verification PASS: 0 public tables without RLS, 16 tables without tenant_id all legitimately platform-scope, exactly 5 `auth.uid()` policies all on intentionally platform-admin tables. All 3 active HIGH carries unchanged. Postgres ERROR-log cadence for `v_ai_content` back to baseline (3 fires in latest 6-min returned sample, down from peak two refreshes ago). Prior refreshes: 2026-05-19 ~05:50 UTC (Missions 3+4+5+8), 2026-05-19 ~04:09 UTC (Missions 6+7+9 daily), 2026-05-18 ~07:55 UTC (Missions 3+4+5+8), 2026-05-18 ~07:10 UTC (Missions 6+7+9), 2026-05-18 ~06:10 UTC (Missions 1+2 hourly).
**Production status (this refresh):** 🟡 **WATCH — unchanged from prior 24h.** Customer-facing flows healthy: 0 customer reports; cron jobs 6/7/8/10 still firing every 60s on schedule; Supabase project `ACTIVE_HEALTHY`. Single ERROR-level `duplicate key value violates unique constraint "uq_crm_message_queue_idem"` seen in this run's log sample — this is the CRM-queue idempotency-key constraint firing as designed (replay protection), expected behavior, not a finding. The two recurring DB-side view permission errors (`v_ai_content` continuing at baseline rate, `v_content_translations` quiet this sample) continue exactly as the 4-hour-run record — still noise that hides real problems, still warrants Architect triage but no user-visible failure. **Active alerts:** **H-NEW-39-1** (M1 schema-doc drift compounded, from 4-hour run), **H-NEW-34-1** (`v_ai_content` anon-SELECT denied, 5th consecutive day); **H-NEW-36-1** (`v_content_translations` sibling, 4th consecutive day); **H-NEW-25-1** (`v_storefront_products.updated_at`, 7th silent cycle — schema mismatch persists). **Notable security-side carry:** `function_search_path_mutable` WARN count remained at 16 (was 47 two refreshes ago) — measurable hardening from this week's M1 Lens marathon `SET search_path='public'` clauses.

---

## Active CRITICAL alerts

None.

---

## Active HIGH alerts

### H-NEW-34-1 — NEW: `permission denied for view v_ai_content` recurring (6 fires/hour, anon-role consumer)

- **Status:** NEW this refresh. Postgres logs show 6 `permission denied for view v_ai_content` ERROR events in the last 60 minutes, several per minute at peak. Live `information_schema.role_table_grants` audit confirms: `anon` has `INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE` on the view but **no `SELECT`**. `authenticated`, `service_role`, `optic_readonly`, `postgres` all have SELECT. The asymmetric grant (write-but-not-read for anon) is unusual and is the root cause.
- **Impact:** A consumer routed as anon is attempting to SELECT from `v_ai_content` and the request fails server-side. The product still appears to operate (no customer reports, no 5xx on EFs), so the consumer is likely handling the error in JS — but the call is failing intermittently and any data it was supposed to render is missing. Risk: AI-generated storefront copy (description, SEO title, SEO description per the view definition) not loading on anon-side reads.
- **Action:** Architect triage at next session. Two options: (a) `GRANT SELECT ON public.v_ai_content TO anon` after verifying the view body filters/exposes `tenant_id` correctly and that there is no cross-tenant leak (this is a multi-tenant view of `ai_content`); (b) find the consumer and re-route it via service_role or off this view entirely. **Do NOT GRANT blindly** — verify tenant isolation first. Likely 15-30 min SPEC.
- **Owner:** opticup-architect (Tier 2). Bundle with H-NEW-25-1 below — both are anon-side view/schema mismatches.

### H-NEW-39-1 — NEW: 21 fresh migrations + `lens_design.version` + 4 pg sequences not in canonical schema docs (extends H-NEW-37-1)

- **Status:** NEW this refresh. `docs/GLOBAL_SCHEMA.sql` and `modules/Module 1 - Inventory Management/docs/db-schema.sql` and `docs/DB_TABLES_REFERENCE.md` all show **0 hits** for: (a) the new `lens_design.version` column added 2026-05-18 via `migrations/M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_lens_design_version.sql`, (b) the 4 new pg sequences `lot_number_seq` / `transfer_number_seq` / `box_number_seq` / `purchase_order_number_seq` (`supabase/migrations/20260518130000…20260518130003`), (c) the 4 RPC body rewrites that consume them via `nextval()` (`20260518130004…20260518130007`), (d) the 10 RPC non-numeric-safe Phase 2 migrations, (e) the `m1_platform_catalog_rls_write_bypass` policy bundle.
- **Impact:** Schema docs are the canonical reference per CLAUDE.md §7 Authority Matrix. Future M1 / M1.5 sessions reading these files would be looking at a state ~21 migrations behind reality. Compounds M4-DEBT-01 (migrations git-drift) — the migrations now exist in `supabase/migrations/` (git-tracked since 2026-05-04) but the canonical schema reference has not been refreshed. The 6 existing-not-yet-merged tables from H-NEW-37-1 (`accessory_variant`, `contact_lens_variant`, `lens_variant_notes`, `purchase_receipt.has_no_invoice`, etc.) compound here.
- **Action:** schedule an Integration-Ceremony SPEC that walks the cumulative un-merged migration delta into `docs/GLOBAL_SCHEMA.sql` + the M1 db-schema + `DB_TABLES_REFERENCE.md`. Bundle with H-NEW-37-1. Estimated ~60-90 min SPEC. Owner: opticup-strategic (M1 Foreman).

### H-NEW-25-1 — RE-OPENED: `v_storefront_products.updated_at does not exist` (recurring after 5+ silent cycles)

- **Status:** **RE-OPENED this refresh.** Previously recommended for downgrade after 5 silent cycles — now firing again at 2026-05-15 23:20 UTC (~25 min before scan). Schema audit confirms: `v_storefront_products` has 22 columns and **no `updated_at` column** despite parent table `inventory.updated_at` existing. A consumer (likely a storefront ISR refresh job or external sync) is querying it and getting an error.
- **Impact:** Same as before — the consumer's refresh task fails silently. When it fires, whatever the consumer was supposed to do (cache invalidate, ISR re-render, sync detection) does not happen. No customer-visible failure today, but the data pipeline path is broken.
- **Action:** Architect triage at next session. Two options: (a) modify the view to expose `inventory.updated_at` (must follow Iron Rule 29 View Modification Protocol — declare via SPEC, test, GRANT preservation); (b) find the consumer and stop querying `updated_at`. Recommend (a) unless consumer-side reason discovered. ~15-30 min SPEC.
- **Owner:** opticup-architect (Tier 2). Bundle with H-NEW-34-1 — both can ship in one Module 3 / Module 4 architect SPEC pass.

### ~~H-NEW-25-2~~ — RESOLVED this scan — M3 SESSION_CONTEXT.md NUL-padded (Cowork-VM artifact)

- **Status:** **RESOLVED this scan.** NUL count = 0 verified on Windows-desktop FS this run (`tr -d -c '\0' < <path> | wc -c` returned 0). Real content remains current per L-NEW-26-3 resolution.
- **Closing action:** none required. Watch-flag re-opens if a future Cowork session writes the file and re-introduces NULs.

---

## Active MEDIUM alerts

### M-NEW-39-5 — NEW: Hebrew-locale + ₪ currency cluster extends by 4 instances (M-NEW-33-3 class)

- **Status:** NEW this refresh. 6 source files modified since prior Missions 1+2 scan; 4 of them introduce new Rule 9 violations in the same finding-class as the existing M-NEW-33-3 / M-NEW-37-2 / M-NEW-38-5 cluster:
  - `modules/lens-catalog-admin/catalog-suppliers-col.js:149` — `localeCompare(..., 'he')` in supplier-list sort.
  - `modules/lens-pos-list/lens-pos-list-detail.js:19,45,67` — `'he-IL'` locale + two `'₪'` currency literals in PO detail panel.
  - `modules/lens-pos-list/lens-pos-list-stats.js:9` — `fmtMoney` helper hardcodes `'₪'` + `'he-IL'`.
- **Impact:** zero today (Prizma = ILS = correct by accident). Future tenant in a non-Hebrew, non-ILS locale would inherit Hebrew sorting + ₪ symbols everywhere on the lens-pos-list + catalog-admin surface.
- **Action:** bundle into the existing `M4_M1_5_TENANT_LOCALE_PROPAGATION` SPEC. Read locale from `OpticupConfig.tenant.ui_config.locale` (default 'he-IL'); read currency symbol from `OpticupConfig.tenant.currency.symbol` (default '₪'). The new lens-pos-list cluster adds 4 instances to the ~40+ existing literals on the SPEC's target surface — one fix shape clears all of them. ~1-2 hour SPEC bundled with prior cluster members, or accept as tenant-2 onboarding tax.

### M-NEW-39-1 — NEW: FILE_STRUCTURE.md says lens-catalog-admin has "7 files" — actual is 10

- **Status:** NEW this refresh. `docs/FILE_STRUCTURE.md` lens-catalog-admin row reads "7 files (M1 Lens Phase 1A — Optic Up team only)". Actual `ls modules/lens-catalog-admin/` returns 10: `catalog-auth.js`, `catalog-brands-col.js`, `catalog-designs-col.js`, `catalog-detail-pane.js`, `catalog-import.js`, `catalog-modal-helpers.js`, `catalog-suppliers-col.js`, `catalog-variant-modal.js`, `lens-catalog-admin-partial.html`, `lens-catalog-admin.js`. Mismatch: `catalog-import.js`, `catalog-modal-helpers.js`, `catalog-variant-modal.js` (added in M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 + M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A on 2026-05-18) plus the partial-HTML aren't in the prose.
- **Impact:** docs drift; next M1 session would have a wrong mental model of the catalog-admin surface. Zero customer impact.
- **Action:** single-line update at the lens-catalog-admin row in FILE_STRUCTURE.md. ~5 min. Bundle with M-NEW-39-2 + M-NEW-37-3 + M-NEW-37-4 next opticup-architect session.

### M-NEW-39-2 — NEW: entire `modules/admin-platform/` (10 files, ~1,907 lines) undocumented in FILE_STRUCTURE.md + GLOBAL_MAP.md

- **Status:** NEW this refresh. `grep -E "admin-platform" docs/FILE_STRUCTURE.md docs/GLOBAL_MAP.md` returns **0 hits** in either file. Directory exists at 10 JS files: `admin-activity-viewer.js`, `admin-app.js`, `admin-audit.js`, `admin-auth.js`, `admin-dashboard.js`, `admin-db.js`, `admin-feature-overrides.js`, `admin-plans.js`, `admin-provisioning.js`, `admin-tenant-detail.js` — wired from `admin.html` Platform-Admin entrypoint. Pre-existing-but-undocumented; only now caught because this scan widened the changed-surface sweep.
- **Impact:** an entire production module shell is invisible to the canonical references. Future M2 (Platform Admin) work would have no doc starting-point. Compounds with M4-DEBT-01 doc-drift class.
- **Action:** add the directory + module shell to FILE_STRUCTURE.md (one line + sub-list) and add the module to GLOBAL_MAP.md function/module registry. ~10 min. Owner: opticup-architect (Tier 2) or batched into M2 docs SPEC. Bundle with M-NEW-39-1.

### M-NEW-39-4 — NEW: `admin-tenant-detail.js` at 361 lines exceeds Rule 12 absolute 350-line cap

- **Status:** NEW this refresh. `wc -l modules/admin-platform/admin-tenant-detail.js` returns 361. Iron Rule 12: target 300 / absolute max 350.
- **Impact:** Rule 12 violation by 11 lines. Co-residents (admin-provisioning.js 320, admin-app.js 237, admin-plans.js 261, shared/js/catalog-private-admin.js 326, modules/inventory/inventory-shell-lens.js 310) are under absolute. H-3 carry (brands.js 371) unchanged.
- **Action:** 30-min SPEC to split out the audit-log sub-section (lines ~320-360) into `admin-tenant-audit.js`. Brings main file to ~310 lines (still over target but under absolute). Lower priority than M-NEW-39-2.

### M-NEW-34-3 — NEW: M1 ROADMAP Lens-1B marker still ⬜ despite 5 Phase 1B SPECs closed

- **Status:** NEW this refresh. `modules/Module 1 - Inventory Management/ROADMAP.md:84` reads `| Lens-1B | ⬜ | **מלאי עדשות — שלב 1B** — 6 מסכי לקוח | ...` but M1 SESSION_CONTEXT records FIVE Lens-1B-aligned SPECs closed in last 48h: `M1_LENS_PHASE_1B_FOUNDATION` 🟢, `M1B_FOUNDATION_PERMISSIONS_HOTFIX` 🟢, `M1_LENS_PHASE_1B_PROCUREMENT` 🟡, `M1_LENS_PHASE_1B_GAP_CLOSURE` 🟢, `M1_LENS_PHASE_2_COMPLETION` 🟡. 7 lens screens wired to ERP main menu (Part D of PHASE_2_COMPLETION). Phase 1B work is materially done; ROADMAP marker is behind reality.
- **Impact:** Future M1 sessions reading the ROADMAP would believe Phase 1B hasn't started. Architect (Foreman) is best positioned to decide ✅ vs 🟡 (the latter reflects PHASE_2_COMPLETION's deferred Part A Tier-3 work).
- **Action:** at next M1 Module Close Ceremony, flip line 84 marker (✅ or 🟡) and add a Lens-1B closure block analogous to Lens-1A pointing at the 5 SPEC folders. ~10 min. Bundle with M-NEW-34-2.

### M-NEW-34-2 — carry (GROWING): M3 SESSION_CONTEXT now 8 days stale

- **Status:** NEW this refresh. `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` reads `## Last updated: 2026-05-11`. Since then:
  - 2026-05-15 — `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF` 🟢 CLOSED (the storefront-side handoff that completes the FB CAPI dedup loop M4 shipped on the ERP side; directly impacts ad-budget attribution).
  - 2026-05-15 evening — `docs(m3): storefront outage diagnosis 2026-05-15 evening` (`e479ce7`).
  - 9 SPEC folder artifacts harvested into Module 3 docs/specs (`ee2dd03`).
- **Impact:** Per CLAUDE.md §7 Authority Matrix, this file is the **authoritative source of M3 phase status**. Next M3 session would start from a wrong baseline. Medium not high because SPEC folders themselves are correct; the storefront repo is the second authoritative source.
- **Action:** in next M3 architect session, append 3 short blocks to M3 SESSION_CONTEXT: (1) FB CAPI handoff closure, (2) outage diagnosis summary + resolution, (3) Brief harvest. ~10 min. Bundle with M-NEW-34-3.

### ~~M-NEW-34-1~~ — RESOLVED this refresh — FUNNEL_ROADMAP P2.3 flipped to ✅

- **Status:** **RESOLVED.** `roles/site-overseer/FUNNEL_ROADMAP.md` line 163 now reads `| P2.3 | M4_TEMPLATE_VALIDATION_UNIFIED | 6 | 2-3 hrs | ✅ CLOSED 2026-05-14 |`. P2.1 also flipped today to `✅ CLOSED 2026-05-15 — ERP-side CAPI substrate shipped` (per M4_FB_CAPI_HYBRID_DEDUPLICATION close).
- **Closing action:** none required. Phase 2 is now formally in progress with 2 of 3 rows closed (P2.1 + P2.3).

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

### L-NEW-34-3 — NEW: `storefront_config_public` 100% seq-scan ratio (NEW Public Data Layer mirror table)

- **Status:** NEW this refresh. `storefront_config_public` had 38,289 sequential scans / only 9 index scans lifetime (100% miss rate) under anon read load. The table is one of the 6 new Public Data Layer mirror tables (`*_public` per memory `project_public_data_layer`). Likely missing an index on the lookup key (probably `tenant_id` or `slug`).
- **Impact:** Cost is negligible today — table is tiny — but at multi-tenant scale (or at higher anon traffic) this becomes a CPU hotspot.
- **Action:** Add explicit index in the next Public Data Layer follow-up SPEC (queued: `BRAND_VISIBILITY_CASCADE` or `FUNCTION_REVOKES` per project memory). ~5 min when paired with the related SPEC. `storefront_reviews` (100% seq-scan / 1 lifetime idx_scan) has the same pattern — fix both in one pass.

### L-NEW-34-4 — NEW: single SMS `crm_message_log status='failed'` row at 06:47 UTC 2026-05-15

- **Status:** NEW this refresh. 1 row in 24h with `status='failed'`, `error_message=NULL`, `channel='sms'`, `template_id=NULL`, `broadcast_id=NULL`, created 2026-05-15 06:47 UTC. Single fire, ~21 hours old, did not recur. The 3 `rejected` rows in the same window are healthy gate behavior (Template Validation Unified is working).
- **Impact:** Low — single fire, silent since. The upstream Template Validation gate would have caught a bad-template root cause; this is likely an SMS provider transient or a manual-send failure unrelated to the validation pipeline.
- **Action:** Architect triage at next M4 session. Pull the row by id (`847e1a9d-f76b-49bb-98a8-8e7921a01af8`) and inspect — `content` field may carry context absent from the queryable columns. ~10 min triage.

### ~~L-NEW-33-1~~ — RESOLVED partially this refresh — column-not-found errors update

- **Status:** **PARTIALLY RESOLVED.** Of the 3 distinct errors tracked under L-NEW-33-1 (`b.event_id`, `"locale"`, `l.to_address`), none of the 3 specific signatures recurred in the last 24h. However, **`v_storefront_products.updated_at` re-fired today** — see H-NEW-25-1 RE-OPENED. The `"locale"` error was likely a sibling of the same outdated-consumer-query class as H-NEW-25-1; if H-NEW-25-1 fix lands, expect `"locale"` to be addressed in the same SPEC.
- **Closing action:** Close the L-NEW-33-1 wrapper as superseded by H-NEW-25-1 (re-opened). The H-NEW-25-1 root-cause SPEC should sweep the consumer codebase for ALL `updated_at|locale|to_address` SELECT on Views.

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
