# ACTIVATION PROMPT — M3_SITEMAP_CONSOLIDATION

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_SITEMAP_CONSOLIDATION/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro) AND
opticalis/opticup-storefront (storefront — for the implementation).
Branches: develop. Daniel merges main via GitHub PR.

Background: Closes REC-SITE-011. The storefront has TWO sitemaps that
overlap (sitemap-0.xml has 28 URLs all duplicated in sitemap-dynamic.xml's
362 URLs). Both use the bare apex domain (prizma-optic.co.il) which
307-redirects to www. New /branches/ routes from M3_BRANCHES_INFRA_AND_ASHKELON
are NOT yet in either sitemap. This SPEC consolidates to one canonical
sitemap, switches to www, and adds branches.

Daniel directive 2026-05-09: "שבסוף יעבור על העמודים שזה נוגע להם
ויוודא שהכל תקין ויעשה QA שקשור לשינויים האלה." Codified as SPEC §5-E
+ §11 — Chrome MCP smoke tests on /branches/ and /branches/ashkelon/
in all 3 langs PLUS scripts/verify-sitemap.mjs that fetches the new
sitemap and asserts: 100% www prefix, ≥368 URLs, 30-URL random-sample
all-200, all 6 branch-URL variants present + 200.

Five storefront write paths (CREATE/MODIFY):
1. MODIFY astro.config.mjs (confirm site = https://www.prizma-optic.co.il)
2. MODIFY OR CREATE the dynamic sitemap generator (locate first; likely
   src/pages/sitemap-dynamic.xml.ts or @astrojs/sitemap config)
3. DELETE OR REDIRECT sitemap-0.xml source
4. MODIFY public/robots.txt (Sitemap directive → canonical)
5. CREATE scripts/verify-sitemap.mjs

ERP side:
- EXECUTION_REPORT.md + FINDINGS.md
- qa/ folder with ≥6 Chrome MCP screenshots + curl outputs
- HANDOFF + DECISIONS_LOG updates

Authorities:
- Storefront source modifications per SPEC §5 whitelist — AUTHORIZED.
- NO DB writes (generator reads existing v_storefront_branches view only).
- Vercel redeploy via PR-to-main → Daniel approves merge.

CRITICAL stop triggers (SPEC §7 + §8):
- Sitemap generator pattern is exotic → STOP, propose narrow fix
- ANY URL in new sitemap returns non-200 → STOP
- /branches/ regresses (was working, now 404) → STOP, fix-up
- robots.txt change reveals unrelated issue → STOP, surface
- New sitemap exceeds 50,000 URLs → STOP, need to split
- More than 5% of sampled URLs return non-200 → STOP

Two atomic commits expected:
- Storefront: "chore(storefront): consolidate sitemap, switch to canonical www domain, add /branches/ routes (closes REC-SITE-011)"
- ERP: "chore(spec): close M3_SITEMAP_CONSOLIDATION"

Order:
1. Step 0 sanity (read-only)
2. Locate sitemap generator(s) — write findings to EXECUTION_REPORT
3. Modify generator + astro.config + robots.txt
4. npm run build → confirm Iron Rule 25 + L-PROJECT-002 not regressed
5. Push storefront develop → wait for Vercel preview (SSO-walled, OK)
6. Open PR → ASK DANIEL to merge
7. Wait for Vercel production READY
8. Run scripts/verify-sitemap.mjs against production
9. Run Chrome MCP smoke on 6 branch-URL variants — save screenshots
10. Sample 30 random URLs from new sitemap, curl each → all-200 check
11. ONLY THEN commit ERP retro

Begin Step 0 per SPEC §4. Stop only on deviation from numbered success
criterion in SPEC §6.
```

---

**Notes for Daniel:**

- Estimated execution: 1.5-3 hours wall time.
- ONE thing you'll do mid-execution: click "Merge" on the GitHub PR (~30 seconds).
- After deploy: Google sees one canonical sitemap with all URLs (including the new branches), all using www. Should improve crawl efficiency + SEO authority.
- Future branch (Tel Aviv etc.) gets added to sitemap automatically — no code change needed.
- The new `verify-sitemap.mjs` script can be re-run any time to check sitemap health (e.g. as part of monthly site checks).
