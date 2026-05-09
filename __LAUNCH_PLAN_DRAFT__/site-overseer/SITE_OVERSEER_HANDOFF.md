# Site Overseer — HANDOFF

**Last updated:** 2026-05-09 (after M3_COOKIE_CONSENT_OPT_IN close — REC-SITE-010 closed via tenant-config-driven Opt-In banner)
**Mode:** **Mode B** (post-discovery — SITE_MAP.md + SITE_OVERSEER_SKILL.md v0.2 baseline exists)
**Site Overseer state:** Ready to receive targeted Mode-B audits; knowledge map now loaded so structure questions resolve in <2 min via lookup vs ~20 min re-discovery

---

## What changed since last HANDOFF (2026-05-06 → 2026-05-07)

The promised Mode A discovery scan has been executed. SPEC `M3_SITE_COMPREHENSIVE_REVIEW` ran a comprehensive read-only audit of `https://prizma-optic.co.il`, produced:

1. `modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SITE_AUDIT_REPORT.md` — 44 findings (4 CRITICAL, 11 HIGH, 16 MEDIUM, 7 LOW, 6 INFO).
2. `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_MAP.md` — first-version site map (Mode A baseline).
3. `__LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md` — empty stub for Mode B accumulating decisions.

Site Overseer formally transitions Mode A → Mode B with this HANDOFF.

---

## Top headlines from the audit (Daniel's eyes-only triage)

### Triage tier 1 — direct customer harm right now

1. **`053-434-7265` is rendered on every homepage** as the contact phone. Same incident class as `050-717-5675`. Provenance unconfirmed; could be a defunct WP-era line. Owns 24 CMS body rows + 1 misnamed file (`public/images/lab/israel-hayom-logo.png` is actually HTML containing the number) + the deprecated `_deprecated/legal-terms.ts` artefact. (Audit findings: FIND-003 / FIND-022 / FIND-056.)
2. **`/terms/`, `/privacy/`, `/deal/` return 200 with empty body** — statutory legal pages broken in all 3 languages. Likely renderer bug for `bt='string'` CMS rows. (FIND-002.)
3. **6 Hebrew-slug pages return 500** under raw-UTF-8 fetch (`/בלוג/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/`, `/מיופיה/`, `/משקפי-מולטיפוקל/`). Vercel apex→www redirect mis-encodes UTF-8 path bytes as Latin-1. Most browser clicks pre-encode and survive, but scrapers, paste-shares, and crawlers all 500. (FIND-001.)
4. **Lead-form confirmation emails go out branded "Optic Up Leads"** — direct violation of `feedback_customer_facing_branding`. Single fix in `src/pages/api/leads/submit.ts:148-163`. (FIND-016.)

### Triage tier 2 — fast wins

5. `tenants.business_email` is NULL → footer email link is hidden. Set it. (FIND-005.)
6. Footer link `/multifocal-guide/` returns 404. (FIND-010.)
7. `/multi-takanon/` exists in HE only — EN/RU footer links go to fallback. (FIND-013.)
8. 13 `.astro` pages contain `tenant?.name ?? 'Optic Up'` fallback. Replace with safer fallback. (FIND-017.)
9. Iron Rule 25 image-proxy violations — 6+ pages render direct `*.supabase.co/storage/...` URLs. (FIND-052.)

---

## Active task

**Awaiting Daniel's read of `SITE_AUDIT_REPORT.md` + decisions on Triage tier 1 cluster.** Site Overseer recommends Daniel produce SPECs for at least: (a) the `053-434-7265` provenance + cleanup, (b) the empty-body `/terms/` `/privacy/` `/deal/` renderer fix, (c) the lead-form FROM-name fix.

**No active hot-fix.** No emergency.

---

## Open recommendations for follow-up SPECs

| ID | Severity | Description | Estimated SPEC scope |
|---|---|---|---|
| REC-SITE-001 | (closed) | M4_HARDCODED_DEMO_PHONE_CLEANUP — closed 2026-05-07. | — |
| REC-SITE-002 | (closed) | CMS-row half closed by M3_PHONE_TEMPLATING_AND_CLEANUP (2026-05-07). File-level half closed by storefront commit `a4723b5` (2026-05-07, by Daniel) which deleted all 3 named artifacts. M3_PHONE_434_LEGACY_CLEANUP (2026-05-08) provided the documentation closure + Site Overseer audit trail. The `prizma-optice.co.il` typo: 0 occurrences in live CMS; 5 file-level occurrences are in `docs/` historical archives (preserved per discipline) + `scripts/seo/output/` cached files (auto-regenerable). Closed-as-no-action. | — |
| REC-SITE-003 | (closed) | M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL — closed 2026-05-08. 16 rows restored, 2 CHECK constraints active (cannot recur). | — |
| REC-SITE-004 | (closed) | NO-ACTION (2026-05-08, Daniel verification). All 6 Hebrew-slug pages (`/בלוג/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/`, `/מיופיה/`, `/משקפי-מולטיפוקל/`) load fine in real browsers — verified by Daniel via direct browser test. The original audit's 5xx finding was via raw-UTF-8 curl that bypasses normal browser pre-encoding. Real customers, browsers, and search-engine crawlers all pre-encode UTF-8 paths so they hit the working `%D7...`-encoded path. No customer-facing harm; closing with no fix. | — |
| REC-SITE-005 | (closed) | NO-ACTION (2026-05-08, Daniel directive). The `submit.ts:148-163` code path is NOT wired to any active form on the live site (no contact form connected, no lead-intake form active). All ACTIVE customer-facing emails (supersale campaign, lead-intake EF) already send from `events@prizma-optic.co.il` and `service@prizma-optic.co.il` — verified. The "Optic Up Leads" string lives only in dead code. | — |
| REC-SITE-006 | (closed) | M3_TENANT_NAME_FALLBACK_SAAS — closed 2026-05-08. Replaced 28 hardcoded `?? 'Optic Up'` (audit anticipated 13; live state was 28) with `resolveTenantNameFallback(Astro.request, locale)` backed by build-time-generated static JSON map (`src/data/tenant-fallback-map.json`). Generator (`scripts/generate-tenant-fallback-map.mjs`) queries `v_public_tenant` + `v_storefront_config` per build. SaaS-clean: future tenant onboarding requires zero code changes. 11/11 unit tests PASS, Optic Up leak CLEAN. Storefront commit `a8c2acd` merged to main. | — |
| REC-SITE-007 | HIGH | Iron Rule 25 enforcement: brand-image rendering should use `/api/image/...` proxy. | 1 SPEC, component-level, 1 hour. |
| REC-SITE-008 | MEDIUM | Set `tenants.business_email` for prizma. (Daniel picks the email.) | Trivial (1 SQL UPDATE, Level 2). |
| REC-SITE-009 | MEDIUM | LocalBusiness Schema.org build-out: address, openingHours, geo, aggregateRating fields. | 1 SPEC, code + DB, 2-4 hours. |
| REC-SITE-010 | (closed) | M3_COOKIE_CONSENT_OPT_IN — closed 2026-05-09. Tenant-config-driven Opt-In banner on production. All 5 trackers (GTM, GA4, FB Pixel, Hotjar, TikTok) wrapped in `consentGate()`. Pre-script stamps `window.__consent` before tracker payloads evaluate. SaaS-clean: `tenants.ui_config.cookie_consent` (v1 schema) drives banner; future tenant onboarding requires only DB seed. Live tests 6/6 PASS via Chrome DevTools MCP — Reject all → 0 tracker requests; Accept all → FB Pixel fires; UTMs unaffected; revoke from footer works. View extension `v_public_tenant.ui_config` added (Daniel-authorized Level 3 mid-flow). 6 findings logged. | — |
| REC-SITE-011 | MEDIUM | Sitemap mismatch resolution: drop or merge `/sitemap-index.xml` → `/sitemap-0.xml` (25 URLs) vs `/sitemap-dynamic.xml` (361 URLs). | 1 SPEC, infra, 30 min. |
| REC-SITE-012 | MEDIUM | WP-drift sweep beyond phone+email — pre-2024 dates, "online checkout" verbiage in legal pages, third-party shortcodes. May benefit from Israeli consumer-law attorney engagement, not a Claude SPEC. | Daniel decides scope. |
| REC-SITE-013 | MEDIUM | Run Lighthouse + axe-core on the 5 anchor pages (`/`, `/supersale/`, `/products/`, `/brands/`, `/about/`); install tooling under `__LAUNCH_PLAN_DRAFT__/site-overseer/tools/`; archive scores; nightly cron. | 1 SPEC, tooling-bootstrap + scheduled task. |
| REC-SITE-014 | LOW | Cleanup: delete orphan `poweredBy` i18n keys (3 langs), delete `_deprecated/` folder if not already removed in REC-SITE-002, delete `/test-shortcodes/` archived rows or have route-handler skip them. | 1 SPEC, cosmetic, 30 min. |
| REC-SITE-015 | HIGH | **CLOSED 2026-05-08.** Phase A done; Phase B executed live for both subdomains via REST API; blog-post titles fuzzy-matched to specific Astro destinations (M3_WP_BLOG_POST_MAPPING). Final state: ru. and en. each have 1,610 live 301 redirects, 42-43 of them per-post specific (HIGH or LOW confidence) with `/blog/` index fallback for the ~3 unmatched. Phase C (WP decomm ~30 days post-Google-reindex) deferred. | Phase C: 1 SPEC, 1-2 hours. |
| REC-SITE-016 | LOW | Astro slug `/multi/` is too short; substring-matched `/multifocal/` (ru) and `/multifocal-glasses/` (en) WP slugs but is risky for future SEO collisions. Consider rename to `/multifocal-glasses/` with self-redirect — but only if SEO benefit is measured to outweigh the rename cost. | Investigation SPEC. Source: M3_WP_SUBDOMAINS_REDIRECT/FINDINGS.md M3-SEO-03. |

---

## Recent decisions (Daniel-authorized — full log in DECISIONS_LOG.md)

| Date | Decision | Action taken | Result |
|---|---|---|---|
| 2026-05-06 | "תתקן למספר 053-3645404 דחוף ותעשה דיפלוי" | UPDATE tenants SET business_phone='053-3645404' WHERE slug='prizma'. | Storefront verified correct on top-bar phone CTA. |
| 2026-05-06 | Drafted SPEC `M4_HARDCODED_DEMO_PHONE_CLEANUP` | Replaced decorative comment + corrected migration + LEARNINGS L-PROJECT-001. | Closed 2026-05-07 by opticup-executor. |
| 2026-05-06 | Drafted SPEC `M3_SITE_COMPREHENSIVE_REVIEW` for Mode A discovery | Site Overseer Foreman authored full audit SPEC. | This SPEC executed 2026-05-07 by opticup-executor — see audit deliverables. |
| 2026-05-08 | "Include all 3,221 with bulk mapping" — scope expansion in M3_WP_SUBDOMAINS_REDIRECT after URL count drift from 1,675 → 3,223 | Phase A executor crawled all 3,223 URLs across 9 sitemap types per subdomain; bulk-mapped extra 1,548 taxonomy/archive URLs via existing rules. | CSVs delivered (1,609 ru + 1,610 en) ready for Daniel's Phase B cPanel import. LEARNINGS L-SITE-001 added (subdomain enumeration rule). |
| 2026-05-08 | M3_WP_BLOG_POST_MAPPING — title-match per-post redirects + Site Overseer skill knowledge map | Executor: 42 ru + 43 en blog posts matched to Astro slugs (HIGH 71 / LOW 10 / NONE 4). Live mutations via Redirection plugin REST API: ru. surgical replace, en. full import (was 0 redirects). 5/5 ru + 5/5 en spot-check passes. SITE_OVERSEER_SKILL.md v0.2 created. | REC-SITE-015 fully closed; Phase C remains deferred. |
| 2026-05-08 | M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL — production hot-fix: 16 broken CMS pages + permanent CHECK constraints + L-PROJECT-002 + Site Overseer skill v0.3 | Executor: restored 16 storefront_pages rows via two-pass (15) + three-pass (1) unwrap of double-encoded blocks/previous_blocks. Installed CHECK constraints on both columns. Verified 16/16 live destinations now non-empty (40-65KB body). | REC-SITE-003 closed; bug class can no longer recur (DB-layer guardrail). |
| 2026-05-08 | M3_PHONE_434_LEGACY_CLEANUP — closure-only SPEC; storefront cleanup was already done by `a4723b5` (2026-05-07, Daniel) | Executor: Step 0 surfaced that all 3 target files were already deleted; AskUserQuestion to Daniel; chose ERP-retro-only path. ERP commit documents REC-SITE-002 closure. Findings logged: SPEC was authored on stale state (Foreman pre-flight gap). | REC-SITE-002 closed; defunct phone fully eliminated from customer-facing surface (CMS-row half + file-level half). |
| 2026-05-08 | M3_TENANT_NAME_FALLBACK_SAAS — SaaS-clean replacement of 28 `?? 'Optic Up'` fallbacks across storefront pages (audit anticipated 13) | Executor: Daniel approved scope expansion to all 28 (continued M3-SPEC-01 recurrence — third in 4 days); built generator + resolver function + JSON map; 11/11 unit tests PASS; storefront commit `a8c2acd` merged to main. | REC-SITE-006 closed; future tenant onboarding requires zero code changes for the name fallback. |
| 2026-05-09 | M3_COOKIE_CONSENT_OPT_IN — Israeli 2024 Privacy Protection Act compliance; tenant-config-driven Opt-In banner on production | Executor: 5 trackers wrapped in `consentGate()` (loader-script injection moved INSIDE gate for full pre-consent network silence); pre-script in BaseLayout stamps `window.__consent` before tracker payloads evaluate; banner reads `tenants.ui_config.cookie_consent`; required Daniel-authorized Level 3 view extension to expose `ui_config` via `v_public_tenant`; live test surfaced footer-link bug (prizma's `footer_config.columns` overrides defaultColumns) → fix-up commit `2aebe5a` refactored to bottom-bar; 6 live tests via Chrome DevTools MCP all PASS. | REC-SITE-010 closed; future tenant compliance requires only DB seed. 6 findings (1 MEDIUM SPEC gap, 1 MEDIUM exec miss, 4 INFO/LOW). |

---

## Pending issues / future work — what's left after Mode A

### Tooling bootstrap (Mode B prerequisites)

- **Lighthouse / lhci CLI** — needed for Mode B perf audits. Install plan: `__LAUNCH_PLAN_DRAFT__/site-overseer/tools/lighthouse/` (npm install, no global). REC-SITE-013.
- **axe-core CLI / pa11y** — needed for Mode B a11y audits. Same install location. REC-SITE-013.
- **Chrome DevTools MCP / Playwright** — already available via MCP. Use for rendered-DOM checks in next Mode B run.
- **Visual regression DOM-hash baseline** — `scripts/visual-regression.mjs` (per docs/AUTONOMOUS_MODE.md). Snapshot Tier-1 anchor pages once DNS migrations are stable.

### Mode B operating procedure (proposal — Daniel approves)

For a targeted single-category audit:
1. Read SITE_MAP.md → §1 (routes) or §2 (values) to find scope.
2. Read the relevant section of SITE_AUDIT_REPORT.md to see prior findings.
3. Run targeted queries / fetches / DOM probes — single category, single concern.
4. Update SITE_MAP.md if drift detected.
5. If a finding cluster is large (>5 findings), promote to a full new audit SPEC. If small, append to a tracking issue or directly to a fix SPEC.

### Multi-tenant / SaaS readiness gates this audit revealed

Several findings reveal that the storefront codebase has not crossed the SaaS-readiness threshold for these surfaces:

- Lead-form `from:` is hardcoded "Optic Up Leads" — won't work for tenant 2.
- 13 files contain `'Optic Up'` fallback — same.
- Hardcoded address in `Footer.astro:104` defaultContact — should rely solely on storefront_config.
- Hardcoded font families in homepage `<link>` — Rubik+Assistant+Inter — even if a tenant prefers a different font.

This is a candidate for a Module-3-level "SaaS readiness Phase X" SPEC sweep — Daniel decides if/when.

### Live-vs-build-time field map (carried forward from 2026-05-06 HANDOFF)

- Confirmed empirically: `tenants.business_phone` is **live-DB-read** (DB UPDATE → user saw change without redeploy).
- Other tenant fields' live-vs-build-time status NOT yet mapped exhaustively. Mode B targeted task: enumerate which `tenants.*` and `storefront_config.*` fields require redeploy.

---

*End of SITE_OVERSEER_HANDOFF.md (v2 — Mode B).*
