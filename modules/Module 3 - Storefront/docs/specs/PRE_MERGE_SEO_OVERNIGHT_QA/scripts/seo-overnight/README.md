# SEO Overnight QA — Scripts

Scoped Node scripts for the PRE_MERGE_SEO_OVERNIGHT_QA audit. All output lands under `../../artifacts/` and `../../SEO_QA_REPORT.md`. Nothing here writes outside the SPEC folder.

## Prerequisites

1. Windows desktop (Cowork sandbox cannot reach Windows `localhost`).
2. Storefront dev server running: `cd C:/Users/User/opticup-storefront && npm run dev` → `http://localhost:4321/`
3. ERP dev server (sanity only): `http://localhost:3000/`
4. GSC CSVs present at `C:/Users/User/opticup/modules/Module 3 - Storefront/docs/current prompt/{Pages,Queries}.csv`
5. `npm install` run inside this folder once (installs `csv-parse`, `jsdom`, `p-limit`, `lighthouse` locally).

## Run order

Execute in numeric order. Each script reads the previous one's artifacts; rerun any script independently if needed.

```bash
node 01_parse_gsc.mjs              # → artifacts/pages.json, queries.json         (~5s)
node 02_check_redirects.mjs        # → artifacts/redirect-coverage.{json,csv}     (~2 min)
node 03_check_sitemap.mjs          # → artifacts/sitemap-check.json, robots-check.json
node 04_check_404.mjs              # → artifacts/404-check.json
node 05_onpage_top100.mjs          # → artifacts/onpage-top100.json, noindex-sweep.json  (~8 min)
node 05b_reanalyze_canonical.mjs   # URL-encoding-aware canonical_ok re-check (fast)
node 06_internal_links.mjs         # → artifacts/internal-links.json              (~3 min)
node 07_query_coverage.mjs         # → artifacts/query-coverage.json              (~5 min)
node 08_lighthouse.mjs             # → artifacts/lighthouse-summary.json + per-URL  (~45 min)
node 09_assemble_report.mjs        # → ../SEO_QA_REPORT.md
```

## Files

| File | Purpose |
|---|---|
| `01_parse_gsc.mjs` | Parse GSC CSVs (Pages.csv + Queries.csv) into normalized JSON. |
| `02_check_redirects.mjs` | For every GSC URL, simulate `vercel.json` redirects (honoring `has.host`), then GET on `localhost:4321`. Classify as `OK_200` / `OK_301_REDIRECT` / `OK_410_INTENTIONAL` / `MISSING`. |
| `03_check_sitemap.mjs` | Fetch `/sitemap-dynamic.xml`, HEAD-check every `<loc>`. Parse `/robots.txt`. |
| `04_check_404.mjs` | Probe 3 known-bogus paths, assert HTTP 404. |
| `05_onpage_top100.mjs` | Deep HTML audit of top-100 traffic URLs (canonical, hreflang, OG, Twitter, JSON-LD, title, desc, alt, robots). Lightweight noindex sweep across all 959 OK URLs. |
| `05b_reanalyze_canonical.mjs` | Re-evaluate `canonical_ok` with a URL-encoding-aware comparator (fixes 43 false negatives from 05). Safe to re-run; doesn't re-fetch. |
| `06_internal_links.mjs` | Extract internal `<a href>` set from top-100 + home + /en/ + /ru/; HEAD-check each. |
| `07_query_coverage.mjs` | For all 1000 GSC queries, pick a likely landing page from Pages.csv, visit it, check whether the query term appears in title/h1/h2/body. Confidence HIGH/MEDIUM/LOW. |
| `08_lighthouse.mjs` | Run Lighthouse CLI on top-20 URLs (mobile). Retries once; collects scores per category. |
| `09_assemble_report.mjs` | Read all artifacts; emit `SEO_QA_REPORT.md` (10 sections). |
| `lib/vercel-redirects.mjs` | Shared `compileSource` / `matchRedirect` for the vercel.json simulator. |

## Notes

- All scripts use `p-limit(≤10)` concurrency. They are CPU/bandwidth-polite; fine to run in the background.
- The Astro dev server does NOT execute `vercel.json` redirects. Scripts 02, 09 simulate them in Node. Post-deploy, re-run 02 against production to confirm.
- Full audit takes ~60–90 min on Daniel's Windows desktop (Lighthouse dominates).
- Audit is **read-only**: no file writes outside this SPEC folder, no DB mutations.
