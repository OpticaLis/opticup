# ACTIVATION PROMPT — M3_WP_SUBDOMAINS_REDIRECT (Phase A)

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repo: opticalis/opticup (ERP). Branch: develop.

Background: legacy WordPress subdomains ru.prizma-optic.co.il and
en.prizma-optic.co.il are still live and indexed (~837 + ~838 URLs).
Customer harm: old phone, stale prices, duplicate-content SEO penalty.
Task: crawl both subdomains, classify URLs, map each to a destination
on the new Astro site (www.prizma-optic.co.il/{lang}/...), produce
2 CSV files Daniel can paste into the WordPress Redirection plugin.

THIS IS PHASE A ONLY. No deploys, no DB writes, no source edits, no WP
changes. Daniel does Phase B manually via cPanel.

Whitelist of files you may CREATE (everything else is out of scope):
1. modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/EXECUTION_REPORT.md
2. modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/FINDINGS.md
3. modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/CRAWL_LOG.md
4. modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/ru.csv
5. modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/en.csv
6. modules/Module 3 - Storefront/docs/specs/M3_WP_SUBDOMAINS_REDIRECT/redirects/IMPORT_INSTRUCTIONS.md
7. roles/site-overseer/SITE_OVERSEER_HANDOFF.md (overwrite ok)
8. roles/site-overseer/DECISIONS_LOG.md (append)
9. roles/site-overseer/LEARNINGS.md (create)

Crawl politely: 2-5 req/sec max. Use sitemap_index.xml as authoritative
source of URLs (do NOT HTML-crawl). Use Supabase MCP read-only queries
to slug-match Astro pages for override proposals.

Stop triggers (per SPEC §6 + §7):
- WP server 5xx/captcha → slow down, retry, escalate if persists
- >2,000 URLs found (premise was 1,675) → reconcile before mass mapping
- >50 override-match candidates → ask Daniel which to use
- Crawl >2 hours → report progress, ask whether to narrow scope

Final deliverable: ONE atomic commit on develop. Commit message starts
with "audit(storefront): WP-subdomain redirect mapping M3_WP_SUBDOMAINS_REDIRECT".

Begin Step 0 (sanity check) per SPEC §3. Stop only on deviation from
numbered success criterion in SPEC §5. Report progress every 200 URLs
crawled.
```

---

**Notes for Daniel:**

- Estimated execution: 2-3 hours (mostly crawl + classify + slug-match).
- Risk: VERY LOW. Read-only crawl + file generation. No production writes anywhere.
- After Claude Code finishes: open `redirects/IMPORT_INSTRUCTIONS.md`. It walks you step-by-step through cPanel WP-Toolkit + Redirection plugin import. Roughly 15 minutes per subdomain on your end.
- After import + verification: ~30 days of letting Google re-index, then a follow-up SPEC to remove the WP subdomains entirely.
