# Site Overseer — DECISIONS_LOG

> **Purpose:** Append-only log of Site-Overseer-related decisions Daniel makes.
> Mirrors the format of `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md`.
> Each entry is timestamped, dated, and lists: the question, Daniel's call, the rationale (if shared), and the operational action taken.
> **Created:** 2026-05-07 (empty stub, Mode B baseline).

---

## Format

```
### YYYY-MM-DD — short-name

- **Context:** What was being decided.
- **Question:** What Daniel was asked.
- **Decision:** Daniel's exact call (verbatim where possible).
- **Rationale:** Why (if shared).
- **Operational action:** What was done in response.
- **Cross-refs:** SPEC paths, audit findings, etc.
```

---

## Entries

### 2026-05-09 — cookie-consent-opt-in (M3_COOKIE_CONSENT_OPT_IN)

- **Context:** REC-SITE-010 — Israeli 2024 Privacy Protection Act amendment requires explicit Opt-In for non-essential cookies; storefront fired 5 trackers (GTM, GA4, FB Pixel, Hotjar, TikTok) unconditionally on page load with no consent gate.
- **Question 1 (mid-flow):** SPEC §3 placed `cookie_consent` in `tenants.ui_config`, but storefront reads via `v_public_tenant` (Iron Rule 13/24) which did NOT expose `ui_config`. SPEC §7 only authorized Level 2 UPDATEs. Three paths: extend the view (Level 3 DDL), move data to storefront_config, or bypass the view.
- **Decision 1:** "Extend v_public_tenant to include ui_config (Recommended)." (Daniel via tool prompt.)
- **Question 2 (post-deploy):** Storefront PR #1 deployed; live test surfaced cookie-preferences footer link missing (prizma's `footer_config.columns` overrides defaultColumns). Three paths: ERP-retro-only, empty marker commit, fix-up commit.
- **Decision 2:** Fix-up commit (implicit — proceeded without re-asking; user just said "Done — merged" after second PR notice).
- **Rationale:** Daniel's preference (memory `feedback_always_saas_clean.md`): SaaS-clean over quick-fix. Authorizing the view extension keeps the architecture clean (all reads via views) without polluting storefront_config with tenant-config data. The footer fix-up was straightforward (refactor to bottom-bar) and necessary for criterion 12 to pass.
- **Operational action:** 4 ERP migration files (extend view + seed; up + down for each). Storefront commits `36ff488` + `2aebe5a` merged to main as `2e906cf`. Vercel deployed. 6/6 live tests PASS via Chrome DevTools MCP: banner visible on fresh visit, Reject all → 0 tracker requests, Accept all → FB Pixel fires, choice persists, footer revoke works, UTMs unaffected. 6 findings logged including the recurring Foreman pre-flight gap pattern (M3-SPEC-01 Level 3 view extension; M3-EXEC-02 footer override gap).
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_COOKIE_CONSENT_OPT_IN/`; storefront commits `36ff488` + `2aebe5a`; Vercel deploy `dpl_EzMbiBp47eLBJ3UAkpP4iujVJwMm`; REC-SITE-010.

### 2026-05-08 — tenant-name-fallback-saas (M3_TENANT_NAME_FALLBACK_SAAS)

- **Context:** REC-SITE-006 — 13 hardcoded `?? 'Optic Up'` fallbacks across storefront pages. SPEC §1/§2/§5-E specified 13 .astro files; Step 0 found 28 (10 HE root + 9 en + 9 ru). Same recurring Foreman pre-flight gap as M3_PHONE_434_LEGACY_CLEANUP and M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL — third recurrence in 4 days.
- **Question:** Continue with all 28 (intent-vs-literal — same fix applies uniformly), stick to the 13 in SPEC §2 (would leave 15 still broken), or abort & re-author?
- **Decision:** "Continue with all 28 (Recommended)." (Daniel via tool prompt during executor session.)
- **Rationale:** Same pattern as previous SPEC-internal contradictions; SaaS-clean fix applies uniformly to all 28; partial fix would necessitate a follow-up SPEC. Foreman SKILL needs cited-count pre-flight (executor proposal §8 Proposal 1 in EXECUTION_REPORT).
- **Operational action:** Built `scripts/generate-tenant-fallback-map.mjs` (queries v_public_tenant + v_storefront_config), `src/data/tenant-fallback-map.json` (3 keys: _default + prizma + prizma-optic.co.il), `resolveTenantNameFallback(request, locale)` export in tenant.ts, modified 28 .astro files. `npm run build` succeeded. 11/11 unit tests on the resolver PASS. Optic Up leak check CLEAN. Storefront commit `a8c2acd` pushed to develop and merged to main by Daniel via GitHub UI; Vercel auto-deploy triggered.
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/`; storefront commit `a8c2acd`; REC-SITE-006.

### 2026-05-08 — phone-434-legacy-cleanup-closure (M3_PHONE_434_LEGACY_CLEANUP)

- **Context:** SPEC `M3_PHONE_434_LEGACY_CLEANUP` authored 2026-05-08 to close REC-SITE-002 file-level half by deleting 3 storefront files containing the defunct `053-434-7265`. Step 0 verification revealed all 3 files were ALREADY DELETED by storefront commit `a4723b5` (2026-05-07, by Daniel) — the same commit that did the M3_PHONE_TEMPLATING_AND_CLEANUP CMS-row work. SPEC was authored on stale state. Live homepage already 0 occurrences of `053-434-7265`.
- **Question:** Three closure paths surfaced via AskUserQuestion: (a) ERP retro only — skip storefront commit, (b) empty marker commit on storefront for criterion-6 literal compliance, (c) abort SPEC entirely.
- **Decision:** "ERP retro only — skip storefront commit." (Daniel via tool prompt during executor session.)
- **Rationale:** The cleanup work was genuinely already done; no storefront-side change has any content. An empty marker commit would have been pure ceremony. Aborting entirely would have lost the audit trail (Site Overseer needs to formally mark REC-SITE-002 closed). ERP retro captures the documentation closure + the Foreman pre-flight learning.
- **Operational action:** ERP commit on develop with EXECUTION_REPORT + FINDINGS + HANDOFF (REC-SITE-002 closed) + DECISIONS_LOG (this entry). 0 storefront commits. 0 PRs. Findings: M3-SPEC-01 (MEDIUM — Foreman authored SPEC on stale state) + M3-DATA-02 (INFO — `_deprecated/` retains 5 unrelated files, leave intact per §7).
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_PHONE_434_LEGACY_CLEANUP/`; storefront commit `a4723b5`; REC-SITE-002.

### 2026-05-08 — cms-blocks-restore-incident-hot-fix (M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL)

- **Context:** 16 customer-facing CMS pages on `www.prizma-optic.co.il` rendering empty bodies for ~24 hours. Root cause: M3_PHONE_TEMPLATING_AND_CLEANUP migration on 2026-05-07 did string-level `.replace()` on jsonb content and saved the result as a top-level JSON string instead of a native array. Astro renderer's `Array.isArray()` returned false → empty render. (3 of the 16 — `/accessibility/` ×3 — broken earlier on 2026-05-01 via a separate manual session that hit the same anti-pattern.)
- **Question:** Step 0 returned count = 16 broken rows, not the 15 in SPEC §1/§5/§6 stop trigger. SPEC §2's enumerated inventory actually lists 16 explicitly (1+3+3+3+3+3). Should executor STOP per literal §6 trigger or continue per intent (live state matches §2 inventory verbatim)?
- **Decision:** Continue with all 16 — Bounded-Autonomy intent-vs-literal applied. SPEC author's "15" is a §1/§5 arithmetic miscount of §2's enumerated table. Logged as Deviation 1 in EXECUTION_REPORT.
- **Rationale:** Genuine SPEC-internal contradiction; live state aligns perfectly with §2 inventory which is the most-detailed enumeration; stopping mid-flow with 16 broken pages in production was clearly worse than continuing with evidence-based count. Foreman to ratify.
- **Operational action:** Restored all 16 rows (15 single-encoded via pass2 unwrap, 1 double-encoded `/terms/` he via pass3 unwrap) plus 13 `previous_blocks` (12 pass2 + 1 pass3). Installed CHECK constraints on `storefront_pages.blocks` AND `.previous_blocks`. Verified all 16 live destinations render 40-65KB bodies. LEARNINGS L-PROJECT-002 added project-wide. Site Overseer SKILL v0.3 with case study + jsonb pre-write checklist.
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL/`; `docs/LEARNINGS.md` L-PROJECT-002; `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_SKILL.md` §5b + §5c.

### 2026-05-08 — wp-blog-post-mapping (REC-SITE-015 follow-up)

- **Context:** Daniel directive 2026-05-08: "אין לי בעיה שכל עמודי המוצר הישנים יפנו את המשתמש לעמוד המותגים או משהו בסגנון. הבעיה היא עם עמודים שיש הרבה כניסות אליהם שזה בעיקר הבלוג." Bulk-fallback `/blog/` for blog posts loses high-intent SEO traffic; specific per-post mapping preserves it.
- **Question:** SPEC §2 stated Astro blog post route as `/{lang}/blog/{slug}/`, but executor's destination spot-check found that pattern returns 404; actual canonical is `/{lang}/{slug}/`. Should executor (a) STOP and re-route via Foreman, (b) fix the URL pattern in-flight and continue?
- **Decision:** Executor applied (b) under Bounded-Autonomy intent-vs-literal rule. Logged as Deviation 1 in EXECUTION_REPORT.
- **Rationale:** SPEC's intent ("send blog visitors to the matched post") is fully satisfied by the corrected URL pattern. Literal text was a Foreman fact-check failure, well-evidenced by 6/6 spot-check 404s on `/{lang}/blog/{slug}/` and 6/6 200s on `/{lang}/{slug}/`. Stopping mid-flow would have wasted ~40 min for a one-line fix. Foreman to ratify in FOREMAN_REVIEW.md.
- **Operational action:** 42 ru. post-tier redirects bulk-deleted + 42 improved imported (delta 0). en. (which had 0 redirects loaded) imported full 1,610-row CSV including REC-SITE-015 base + 43 improved blog targets. Spot-checks: 5/5 ru + 5/5 en return 301 to specific Astro posts. Both subdomains: 1,610 redirects total. SITE_OVERSEER_SKILL.md v0.2 created with knowledge map.
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/` (SPEC, EXECUTION_REPORT, FINDINGS, CRAWL_LOG_BLOG); `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_SKILL.md`; FINDINGS M3-INFRA-01.

### 2026-05-08 — wp-subdomain-redirect-scope

- **Context:** Phase A executor discovered the WordPress subdomain sitemaps expose 9 child sitemaps (post / page / product / category / post_tag / product_brand / product_cat / product_tag / author) per subdomain, totaling 3,223 URLs vs the SPEC's premised 1,675. The 4 unanticipated sitemap types (`product_brand`, `product_cat`, `product_tag`, `author`) account for +1,548 URLs of bulk-mappable taxonomy archives. SPEC §6 stop-trigger fires at >2,000 URLs.
- **Question:** Continue with all 3,223 URLs (bulk mapping under existing rules), narrow scope to original ~1,675, or split product_tag (1,350 URLs) into a separate CSV for staged review?
- **Decision:** "Include all 3,221 with bulk mapping." (Daniel via tool prompt during executor session.)
- **Rationale:** All 1,548 extra URLs funnel into 4 fixed bulk destinations (`/{lang}/categories/`, `/{lang}/products/`, `/{lang}/blog/`, `/{lang}/`) under existing rules — no per-URL decision burden, and including them prevents leaving 1,548 indexed legacy URLs uncovered for the next 30+ days.
- **Operational action:** Phase A executor mapped all 3,223 URLs into `ru.csv` (~1,611 rows) + `en.csv` (~1,611 rows). Discovery logged as a precondition gap for the SPEC author (additional sitemap types should have been enumerated upfront).
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/SPEC.md` §6 stop-trigger; `__LAUNCH_PLAN_DRAFT__/site-overseer/LEARNINGS.md` L-SITE-001.

---

*End of DECISIONS_LOG.md.*
