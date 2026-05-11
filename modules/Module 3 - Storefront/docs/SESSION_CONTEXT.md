# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: POST-CUTOVER MAINTENANCE — production stable, broad SaaS hardening shipped; **demo storefront now also live (separate Vercel project)**
## Status: 🟢 PRODUCTION LIVE on `prizma-optic.co.il` (Vercel + custom domain). All 76+ published pages serving 200. PageSpeed baseline ~89. ~17 M3 SPECs closed since 2026-04-18. **Demo storefront live at `opticup-storefront-demo.vercel.app` (Phase 1 = forms only; mirrors Prizma 1:1, wired to demo `tenant_id`).**
## Last updated: 2026-05-11 (Demo Storefront Forms Phase 1 closed 🟡 — Full-Auto Pipeline; Daniel-actions pending: SERVICE_ROLE_KEY in Vercel UI + manual test cycle)
## Authority: this file is authoritative for Module 3 phase status (per CLAUDE.md §7 Authority Matrix). Sibling repo's `opticup-storefront/SESSION_CONTEXT.md` describes storefront working state but defers to this file on phase status.

---

## Recent SPECs closed (2026-04-18 → 2026-05-09)

Listed newest → oldest. Each has its own `EXECUTION_REPORT.md` + `FOREMAN_REVIEW.md` in `docs/specs/{SLUG}/`.

| Date | SPEC | Summary | Verdict |
|---|---|---|---|
| 2026-05-11 | `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT` | Phase 1: live demo storefront on new Vercel project `opticup-storefront-demo` (linked to `OpticaLis/opticup-storefront@main`), mirroring Prizma's supersale forms 1:1; `tenants.ui_config.storefront_url` updated for demo only; Prizma bit-identical; smoke 7/7. Daniel adds `SUPABASE_SERVICE_ROLE_KEY` manually + redeploy. | 🟡 |
| 2026-05-09 | `M3_REC014_ORPHAN_CLEANUP` | DB cleanup of orphan rows from REC-SITE-014 follow-ups (test-shortcodes etc.). | 🟢 |
| 2026-05-09 | `M3_SITEMAP_BRAND_404_CLEANUP` | Brand-page slug 404s in sitemap audit. | 🟢 |
| 2026-05-09 | `M3_STUDIO_TRANSLATIONS_BRAND_FILTER` | Studio translations: brand sub-tab filtered to brands with ≥1 visible product. | 🟢 |
| 2026-05-08 | `M3_PHONE_TEMPLATING_AND_CLEANUP` | Phone-display normalization across storefront blocks; tenant-config-driven format. | 🟢 |
| 2026-05-09 | `M3_SITEMAP_CONSOLIDATION` | Removed `@astrojs/sitemap` integration; canonical-www unified; verify-sitemap 9/9 PASS. | 🟢 |
| 2026-05-09 | `M3_BRANCHES_INFRA_AND_ASHKELON` | New `tenant_branches` table + `v_storefront_branches` view; first branch (Ashkelon) live; verify-branches 7/7 PASS. | 🟢 |
| 2026-05-09 | `M3_IMAGE_PROXY_ENFORCEMENT` | All images flow through `/api/image/[...path]`; build-time check `check-no-direct-supabase-image.mjs`. | 🟢 |
| 2026-05-09 | `M3_COOKIE_CONSENT_OPT_IN` | Tenant-config-driven consent banner; 5 trackers (GTM/GA4/FB Pixel/Hotjar/TikTok) wrapped in `consentGate()`. 6/6 live tests PASS. | 🟢 |
| 2026-05-08 | `M3_TENANT_NAME_FALLBACK_SAAS` | 28 hardcoded `?? 'Optic Up'` replaced by `resolveTenantNameFallback()` reading build-time `tenant-fallback-map.json`. 11/11 unit tests PASS. | 🟢 |
| 2026-05-09 | `M3_PHONE_434_LEGACY_CLEANUP` | Removed legacy 4-3-4 Israeli phone formatting paths. | 🟢 |
| 2026-05-09 | `M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL` | Restored 15 broken CMS pages + jsonb-array CHECK constraints + L-PROJECT-002 guardrail. | 🟢 |
| 2026-05-09 | `M3_WP_BLOG_POST_MAPPING` | WP-blog title-match redirects + Site Overseer skill enrichment. | 🟢 |
| 2026-05-09 | `M3_WP_SUBDOMAINS_REDIRECT` | WP-subdomain redirect mapping. | 🟢 |
| 2026-05-09 | `M3_SITE_COMPREHENSIVE_REVIEW` | Read-only audit of all storefront pages; produced `SITE_AUDIT_REPORT.md` for next-cycle planning. | 🟢 |
| 2026-04-26 | `M3_SAAS_CUSTOM_DOMAIN` | Custom-domain mapping per tenant; DNS + Vercel domain config. | 🟢 |
| 2026-04-26 | `P35_MEDIA_LIBRARY_CLEANUP` | Storefront media-library audit + 4/4 GREEN. | 🟢 |
| 2026-04-18 | `HERO_VIDEO_SELF_HOSTED` | YouTube iframe → self-hosted MP4 (`<video autoplay muted loop playsinline>`). PageSpeed maintained at ~89. | 🟢 |
| 2026-04-18 | `STOREFRONT_DEVELOP_RESET` | One-time housekeeping reset; develop = main. | 🟢 |
| 2026-04-18 | `STOREFRONT_REPO_STATE_SNAPSHOT` | Read-only diagnostic before reset. | 🟢 |

---

## Current production state

- **Domain:** `prizma-optic.co.il` (apex + www) → Vercel; SSL active
- **Pages:** 76+ published (CMS-managed via Studio), all serving 200
- **PageSpeed baseline:** ~89 (no YouTube JS penalty after self-hosted MP4)
- **ISR caching:** active (24h expiration)
- **CSP header:** Report-Only mode (vercel.json)
- **i18n:** he/en/ru locales; tenant-name fallback fully SaaS-clean (no `'Optic Up'` literal anywhere)
- **Image pipeline:** all Supabase Storage images flow through `/api/image/[...path]`; `frame-images` bucket private
- **Branches:** Ashkelon live as first non-Tel-Aviv branch; per-branch design supports multi-branch growth
- **Consent:** opt-in cookie banner gates 5 trackers (GTM/GA4/FB Pixel/Hotjar/TikTok) per tenant config
- **Sitemap:** single canonical `sitemap-dynamic.xml` (364 `<loc>` + 986 hreflang alternates, 100% canonical-www)
- **Demo storefront (new, Phase 1):** live at `https://opticup-storefront-demo.vercel.app` (Vercel project `prj_8bNP1xOFF7Lg93bt2e6ZEMPsrYU6`, linked to `OpticaLis/opticup-storefront@main`). Same codebase as Prizma, different `PUBLIC_DEFAULT_TENANT=demo`. Forms-only scope; CMS content / blog / catalog / brand pages are Phase 2+. Canonical URL bake-in is a known LOW finding (M3-FINDINGS-01 — astro.config.mjs hardcodes Prizma's domain) deferred to a separate Phase 2 SPEC. `SUPABASE_SERVICE_ROLE_KEY` is added manually by Daniel via Vercel UI (Path 2 of the env-var decision); without it the image-proxy returns errors for tenant logo but form submission flow is unaffected.

---

## Open queue (post-cutover backlog)

Listed in priority order. None block production.

1. **Studio file split** (Guardian H-3) — `studio-pages.js` (702), `studio-brands.js` (1105), `studio-campaigns.js` (731), `studio-translations.js` (1264) all exceed 350-line limit. Quick-search + focus-loss fix already shipped 2026-04-19. Decomposition deferred to dedicated SPEC `M3_STUDIO_FILE_SPLIT`.
2. **BrandShowcase scroll fixes** — 3 open issues (carryover from pre-cutover).
3. **Homepage revisions** — Daniel's block-by-block feedback queue.
4. **Contact form** — intentionally hidden (WhatsApp-only). Resend integration deferred until contact-form-via-EF SPEC is authored.
5. **Perf/SEO remaining** — supersale h1+schema, CMS page h1, image w/h, WebP brand logos. Cherry-pick from tag `perf-post-dns-reverted` one at a time.
6. **`v_public_tenant.ui_config` view extension** — already done in M3_COOKIE_CONSENT_OPT_IN; future view-additions need similar Daniel-authorized Level 3 in-flow approval.

---

## Next probable session direction

Daniel's queue (per OPEN_TASKS.md):
- Most urgent: M3 Studio file-split SPEC (H-3) — 4 files over 350 lines, Sentinel HIGH severity
- Translation workflow improvements (Cowork session, no SPEC yet)
- Campaign Cards block (M3 storefront feature, no SPEC yet)

If a new M3 session opens without explicit direction, the natural next step is authoring the M3_STUDIO_FILE_SPLIT SPEC (Foreman task, opticup-strategic skill).

---

## Key files for quick orientation

| Need | File |
|---|---|
| Module phase status (this file) | `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` |
| ERP-side commit history | `modules/Module 3 - Storefront/docs/CHANGELOG.md` |
| Per-SPEC retrospectives | `modules/Module 3 - Storefront/docs/specs/{SLUG}/EXECUTION_REPORT.md` + `FOREMAN_REVIEW.md` |
| Storefront working state | `[sibling]/opticup-storefront/SESSION_CONTEXT.md` (different repo) |
| Cross-module decisions | `MASTER_ROADMAP.md` + `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` |
| Site Overseer (operational) | `roles/site-overseer/SITE_OVERSEER_HANDOFF.md` + `SITE_OVERSEER_SKILL.md` + `SITE_MAP.md` |

---

## Historical detail

Pre-2026-04-18 history is preserved in:
- `modules/Module 3 - Storefront/docs/CHANGELOG.md` — chronological commit history per phase
- Per-SPEC `EXECUTION_REPORT.md` + `FOREMAN_REVIEW.md` files in each `docs/specs/{SLUG}/` folder
- `git log --follow -- "modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md"` for prior versions of this file (prior 445-line version archived in commits before 2026-05-09 hygiene sweep)
