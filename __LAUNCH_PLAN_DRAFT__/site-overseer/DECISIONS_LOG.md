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
