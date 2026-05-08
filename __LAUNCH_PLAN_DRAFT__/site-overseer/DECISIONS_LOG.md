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

### 2026-05-08 — wp-subdomain-redirect-scope

- **Context:** Phase A executor discovered the WordPress subdomain sitemaps expose 9 child sitemaps (post / page / product / category / post_tag / product_brand / product_cat / product_tag / author) per subdomain, totaling 3,223 URLs vs the SPEC's premised 1,675. The 4 unanticipated sitemap types (`product_brand`, `product_cat`, `product_tag`, `author`) account for +1,548 URLs of bulk-mappable taxonomy archives. SPEC §6 stop-trigger fires at >2,000 URLs.
- **Question:** Continue with all 3,223 URLs (bulk mapping under existing rules), narrow scope to original ~1,675, or split product_tag (1,350 URLs) into a separate CSV for staged review?
- **Decision:** "Include all 3,221 with bulk mapping." (Daniel via tool prompt during executor session.)
- **Rationale:** All 1,548 extra URLs funnel into 4 fixed bulk destinations (`/{lang}/categories/`, `/{lang}/products/`, `/{lang}/blog/`, `/{lang}/`) under existing rules — no per-URL decision burden, and including them prevents leaving 1,548 indexed legacy URLs uncovered for the next 30+ days.
- **Operational action:** Phase A executor mapped all 3,223 URLs into `ru.csv` (~1,611 rows) + `en.csv` (~1,611 rows). Discovery logged as a precondition gap for the SPEC author (additional sitemap types should have been enumerated upfront).
- **Cross-refs:** `modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/SPEC.md` §6 stop-trigger; `__LAUNCH_PLAN_DRAFT__/site-overseer/LEARNINGS.md` L-SITE-001.

---

*End of DECISIONS_LOG.md.*
