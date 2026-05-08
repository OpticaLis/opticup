# Site Overseer — HANDOFF

**Last updated:** 2026-05-08
**Mode:** **Mode B** (post-discovery — SITE_MAP.md baseline now exists)
**Site Overseer state:** Ready to receive targeted Mode-B audits

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
| REC-SITE-002 | CRITICAL | Provenance + cleanup of `053-434-7265` and `prizma-optice.co.il` typo. Includes: bulk CMS row update (24 rows), delete `_deprecated/legal-terms.ts` + `_deprecated/legal-privacy.ts`, delete misnamed `public/images/lab/israel-hayom-logo.png`. **Daniel must first confirm the phone's status.** | 1 SPEC, 1-2 commits, includes DB writes (Level 2), 1-3 hours executor time. |
| REC-SITE-003 | CRITICAL | Fix `bt='string'` CMS-body renderer (or migrate the 9 affected rows to `array` form). Restores `/terms/`, `/privacy/`, `/deal/` × 3 langs. | 1 SPEC, code-only or migration, 1-3 hours. |
| REC-SITE-004 | HIGH | Vercel redirect UTF-8 mis-encoding fix. Investigate redirect rule, replace with host-only redirect. Affects 6 Hebrew-slug pages. | 1 SPEC, infra-config-only, 30-60 min. |
| REC-SITE-005 | HIGH | Lead-intake EF / API: `from:` header derivation from tenant config (not hardcoded "Optic Up Leads"). Touches `src/pages/api/leads/submit.ts:148-163`. | 1 SPEC, code-only, 30 min + QA. |
| REC-SITE-006 | HIGH | `tenant?.name ?? 'Optic Up'` fallback sweep across 13 files. Replace with empty string or safer fallback. | 1 SPEC, code-only, 1-2 hours. |
| REC-SITE-007 | HIGH | Iron Rule 25 enforcement: brand-image rendering should use `/api/image/...` proxy. | 1 SPEC, component-level, 1 hour. |
| REC-SITE-008 | MEDIUM | Set `tenants.business_email` for prizma. (Daniel picks the email.) | Trivial (1 SQL UPDATE, Level 2). |
| REC-SITE-009 | MEDIUM | LocalBusiness Schema.org build-out: address, openingHours, geo, aggregateRating fields. | 1 SPEC, code + DB, 2-4 hours. |
| REC-SITE-010 | MEDIUM | Tracker consent-mode v2 audit (FIND-035). Israeli privacy regulation 2024 compliance. | Investigation SPEC, 1-2 hours. |
| REC-SITE-011 | MEDIUM | Sitemap mismatch resolution: drop or merge `/sitemap-index.xml` → `/sitemap-0.xml` (25 URLs) vs `/sitemap-dynamic.xml` (361 URLs). | 1 SPEC, infra, 30 min. |
| REC-SITE-012 | MEDIUM | WP-drift sweep beyond phone+email — pre-2024 dates, "online checkout" verbiage in legal pages, third-party shortcodes. May benefit from Israeli consumer-law attorney engagement, not a Claude SPEC. | Daniel decides scope. |
| REC-SITE-013 | MEDIUM | Run Lighthouse + axe-core on the 5 anchor pages (`/`, `/supersale/`, `/products/`, `/brands/`, `/about/`); install tooling under `__LAUNCH_PLAN_DRAFT__/site-overseer/tools/`; archive scores; nightly cron. | 1 SPEC, tooling-bootstrap + scheduled task. |
| REC-SITE-014 | LOW | Cleanup: delete orphan `poweredBy` i18n keys (3 langs), delete `_deprecated/` folder if not already removed in REC-SITE-002, delete `/test-shortcodes/` archived rows or have route-handler skip them. | 1 SPEC, cosmetic, 30 min. |
| REC-SITE-015 | HIGH | **Phase A done 2026-05-08.** Legacy WP subdomains `ru.` + `en.` crawled, mapped, CSVs ready (`modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/`). 3,219 unique source URLs → bulk-mapped to `www.prizma-optic.co.il/{lang}/...`. 20 high-confidence page overrides via slug-match. **Phase B (Daniel's manual cPanel import) pending.** Phase C (WP decomm ~30 days post-Google-reindex) deferred. | Phase B: 30-60 min Daniel manual. Phase C: 1 SPEC, 1-2 hours. |
| REC-SITE-016 | LOW | Astro slug `/multi/` is too short; substring-matched `/multifocal/` (ru) and `/multifocal-glasses/` (en) WP slugs but is risky for future SEO collisions. Consider rename to `/multifocal-glasses/` with self-redirect — but only if SEO benefit is measured to outweigh the rename cost. | Investigation SPEC. Source: M3_WP_SUBDOMAINS_REDIRECT/FINDINGS.md M3-SEO-03. |

---

## Recent decisions (Daniel-authorized — full log in DECISIONS_LOG.md)

| Date | Decision | Action taken | Result |
|---|---|---|---|
| 2026-05-06 | "תתקן למספר 053-3645404 דחוף ותעשה דיפלוי" | UPDATE tenants SET business_phone='053-3645404' WHERE slug='prizma'. | Storefront verified correct on top-bar phone CTA. |
| 2026-05-06 | Drafted SPEC `M4_HARDCODED_DEMO_PHONE_CLEANUP` | Replaced decorative comment + corrected migration + LEARNINGS L-PROJECT-001. | Closed 2026-05-07 by opticup-executor. |
| 2026-05-06 | Drafted SPEC `M3_SITE_COMPREHENSIVE_REVIEW` for Mode A discovery | Site Overseer Foreman authored full audit SPEC. | This SPEC executed 2026-05-07 by opticup-executor — see audit deliverables. |
| 2026-05-08 | "Include all 3,221 with bulk mapping" — scope expansion in M3_WP_SUBDOMAINS_REDIRECT after URL count drift from 1,675 → 3,223 | Phase A executor crawled all 3,223 URLs across 9 sitemap types per subdomain; bulk-mapped extra 1,548 taxonomy/archive URLs via existing rules. | CSVs delivered (1,609 ru + 1,610 en) ready for Daniel's Phase B cPanel import. LEARNINGS L-SITE-001 added (subdomain enumeration rule). |

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
