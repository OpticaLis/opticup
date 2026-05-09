# ACTIVATION PROMPT — M3_WP_BLOG_POST_MAPPING

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repo: opticalis/opticup (ERP). Branch: develop.

Background: REC-SITE-015 loaded 1,610 redirects on ru.prizma-optic.co.il and
prepared 1,610 for en.prizma-optic.co.il, but all 42-44 blog posts per
subdomain were funneled to the generic /blog/ index. Daniel directive
2026-05-08: "הבעיה היא עם עמודים שיש הרבה כניסות אליהם שזה בעיקר הבלוג."
This SPEC matches each WP blog post to a specific Astro blog_posts row by
title fuzzy-match and replaces the generic redirects with per-post ones.

Three deliverables:
1. Title-match mapping for ru + en (42 + 44 WP posts → 58 + 58 Astro posts).
2. Live Redirection-plugin push: delete existing post-tier fallback redirects,
   import improved per-post redirects.
3. Site Overseer skill enrichment (SITE_OVERSEER_SKILL.md v0.2) so future
   Mode B sessions don't re-discover the site structure each time.

Credentials still active for this session (Daniel will rotate after):
- ru.: daniel / "3Dzz R3Rl WtVC QhfJ 3hDt bg2f"
- en.: daniel / "pVKX juMG UScE u8Zf o16Y 1EQU"

WP REST API endpoints already verified working:
- GET /wp-json/wp/v2/posts (list)
- GET /wp-json/redirection/v1/redirect (existing redirects)
- POST /wp-json/redirection/v1/bulk/redirect/delete
- POST /wp-json/redirection/v1/import/file/1 (multipart CSV upload)

Astro blog data in Supabase: blog_posts table, columns slug+lang+title+tenant_id.
Use Supabase MCP execute_sql (read-only).

Whitelist of files you may CREATE (everything else is out of scope):
1. modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/EXECUTION_REPORT.md
2. modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/FINDINGS.md
3. modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/CRAWL_LOG_BLOG.md
4. modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/redirects/ru-blog-improved.csv
5. modules/Module 3 - Storefront/docs/specs/M3_WP_BLOG_POST_MAPPING/redirects/en-blog-improved.csv
6. __LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_SKILL.md (create)
7. __LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md (overwrite)
8. __LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md (append)

Live mutations authorized: delete + re-import redirects on both subdomains
ONLY for post-tier (target_url ending in /blog/). Do NOT touch other tiers.

Stop triggers (per SPEC §6 + §7):
- en. setup wizard not complete (REST returns rest_no_route) → wait for Daniel
- Match rate below 50% → re-examine normalization
- WP API 401/403 → token may be rotated; STOP
- Bulk delete returns >50 IDs → query too broad; STOP
- Vercel storefront 5xx during spot-check → STOP and flag

Final deliverable: ONE atomic commit on develop. Commit message starts with
"audit(storefront): blog-post title-match redirects + Site Overseer skill enrichment M3_WP_BLOG_POST_MAPPING".

Begin Step 0 per SPEC §3. Stop only on deviation from numbered success
criterion in SPEC §5.
```

---

**Notes for Daniel:**

- Estimated execution: 1.5-3 hours wall time.
- ONE thing you'll need to do mid-execution: complete the Redirection setup wizard at `https://en.prizma-optic.co.il/wp-admin/tools.php?page=redirection.php` (click "Continue" through the 2-3 screens). The executor will pause and ask. Same as you did for ru. earlier.
- After the SPEC closes, please **rotate both Application Passwords** in WP Admin → Users → Profile → Application Passwords → click "Revoke" next to "Cowork-Redirects" and "Cowork-Redirects-EN". The session is over and these were single-use.
- Risk: LOW. Only blog-post redirects changed; all other redirects untouched. No code, no DB writes.
- Bonus: SITE_OVERSEER_SKILL.md created. Future audits/fixes will be much faster — Site Overseer will know where to look without re-discovering each time.
