# Migration Validation Report

Generated: 2026-03-30T05:53:03.490Z

## Coverage Summary

| Status | Count | % |
|--------|-------|---|
| WILDCARD_REDIRECT | 719 | 70.2% |
| PLANNED_BLOG | 143 | 14.0% |
| REDIRECTED | 82 | 8.0% |
| PLANNED_STATIC | 34 | 3.3% |
| IGNORED | 22 | 2.1% |
| PLANNED_LANDING | 17 | 1.7% |
| ALREADY_EXISTS | 5 | 0.5% |
| BLOG_INDEX | 2 | 0.2% |
| **Total** | **1024** | **100%** |

**Coverage: 1024/1024 (100.0%)**

## Quality Gate

| Check | Result |
|-------|--------|
| Coverage > 90% | PASS (100.0%) |
| Redirects ≤ 1,024 | PASS (123) |

## Coverage by Type

| URL Type | Total | Covered | Uncovered |
|----------|-------|---------|-----------|
| product | 735 | 735 | 0 |
| blog-post | 143 | 143 | 0 |
| page | 124 | 124 | 0 |
| landing-page | 7 | 7 | 0 |
| product-category | 12 | 12 | 0 |
| homepage | 3 | 3 | 0 |

## Uncovered URLs (0)

None! All URLs have a destination.

## Coverage Method Breakdown

| Method | Count |
|--------|-------|
| Blog post — same URL in Astro (Phase 3B) | 143 |
| Internal/test page matching "multisale" | 5 |
| Landing page — same URL (Phase 3C) | 17 |
| vercel.json redirect (specific) | 82 |
| Internal/test page matching "supersale" | 6 |
| Internal/test page matching "ariha" | 1 |
| Event unsubscribe — internal | 1 |
| Internal/test page matching "test" | 1 |
| Internal/test page matching "gsuccessful" | 1 |
| Internal/test page matching "successful" | 1 |
| Static page — build new (Phase 3C) | 34 |
| Internal/test page matching "optical-excellence" | 1 |
| Internal/test page matching "brands2" | 1 |
| Internal/test page matching "general" | 1 |
| Product creation — internal page | 1 |
| Blog index page (Phase 3B) | 2 |
| Brands page already exists in Astro | 2 |
| Homepage already exists in Astro | 3 |
| Product creation — internal | 2 |
| Wildcard: /product/:path* → /products/ | 707 |
| Wildcard: /product-category/:path* → /products/ | 12 |
