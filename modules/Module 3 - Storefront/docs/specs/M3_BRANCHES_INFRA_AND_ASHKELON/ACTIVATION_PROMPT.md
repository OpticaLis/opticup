# ACTIVATION PROMPT — M3_BRANCHES_INFRA_AND_ASHKELON

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_BRANCHES_INFRA_AND_ASHKELON/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro + migrations) AND
opticalis/opticup-storefront (storefront — for the implementation).
Branches: develop. Daniel merges main via GitHub PR.

Background: Closes REC-SITE-009 (Schema.org Local SEO). Builds full
multi-branch infrastructure (DB table + view + RLS + 3-lang routes +
Schema.org JSON-LD) and ships first branch — Ashkelon (פריזמה אשקלון).

Daniel directive: per-branch URLs (NOT tenant-level address/hours)
because future branches will have different data. Future branch
onboarding = one INSERT into tenant_branches + page auto-renders.
Future tenant onboarding = same pattern, zero code changes.

Daniel-provided data (verbatim in SPEC §2):
- Address: הרצל 32, אשקלון, 7860131
- Phone: 053-364-5404
- Hours: Sun/Mon/Wed/Thu 09:00-13:00 + 16:00-19:00; Tuesday 09:00-13:00
  ONLY (no afternoon); Friday 09:00-13:00; Saturday closed
- GMB review URL: https://share.google/hul3Tg8QJ8pvRp8RW
- Gallery: 4 images already in media_library, all proxied via
  /api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/...
  (full URLs in SPEC §4 Step 0 #3)

Six DB migration files (in SPEC's migrations/ folder):
1-2: tenant_branches schema + RLS (up/down)
3-4: v_storefront_branches view (up/down)
5-6: Ashkelon seed (up/down)

Storefront source — CREATE 9 files + MODIFY 4:
- src/lib/branches.ts (helpers)
- src/pages/branches/index.astro × 3 langs (list)
- src/pages/branches/[slug].astro × 3 langs (detail)
- src/components/BranchCard.astro, BranchHoursTable.astro,
  BranchSchemaJsonLd.astro
- src/components/Footer.astro (add "סניפים" link in 3 langs)
- src/locales/{he,en,ru}.json (i18n strings)
- scripts/verify-branches.mjs (smoke test)

Authorities:
- Level 3 DDL (CREATE TABLE + RLS + VIEW + GRANT) — AUTHORIZED.
- Level 2 INSERT (one Ashkelon row) — AUTHORIZED.
- Storefront source modifications per SPEC §5 whitelist — AUTHORIZED.
- Vercel redeploy via PR-to-main → Daniel approves merge.

CRITICAL stop triggers (SPEC §7 + §8):
- Step 0 regressions on existing constraints (CHECK from
  M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL, build-time image check from
  M3_IMAGE_PROXY_ENFORCEMENT, footer cookie link from
  M3_COOKIE_CONSENT_OPT_IN) — STOP, do not regress
- Schema.org JSON-LD validator returns ANY warning → STOP, fix
- "Open now" badge logic shows "open" in known break window → STOP
- Any of 4 gallery images returns non-200 in production → STOP, URL
  paths don't match Storage
- More than 1 row inserted into tenant_branches → STOP, scope drift
- Vercel build > 3 min → STOP

Lat/lng (~31.6688°N, 34.5743°E) is best-guess for "הרצל 32 אשקלון".
Executor MUST verify externally before committing or flag in FINDINGS
for Daniel to confirm.

Two atomic commits expected:
- Storefront: "feat(storefront): per-branch infrastructure + Ashkelon page (closes REC-SITE-009)"
- ERP: "chore(spec): close M3_BRANCHES_INFRA_AND_ASHKELON"

Order:
1. Step 0 sanity (read-only)
2. Apply 6 DB migrations
3. Build storefront source
4. npm run build → confirm no regressions on Iron Rule 25 / L-PROJECT-002
5. Push storefront develop → wait for Vercel preview (SSO-walled, OK)
6. Open PR → ASK DANIEL to merge
7. Wait for Vercel production READY
8. Run scripts/verify-branches.mjs against production
9. Run Chrome MCP verification (gallery images load, JSON-LD valid,
   "Open now" matches actual time)
10. Pass Google Rich Results Test on the production URL
11. ONLY THEN commit ERP retro

Begin Step 0 per SPEC §4. Stop only on deviation from numbered success
criterion in SPEC §6.
```

---

**Notes for Daniel:**

- Estimated execution: 4-6 hours wall time. Bulk: 9 new files + i18n + Schema.org validation + Chrome MCP tests.
- ONE thing you'll do mid-execution: click "Merge" on the GitHub PR (~30 seconds).
- After deploy: `https://www.prizma-optic.co.il/branches/ashkelon/` is live with all the data. Schema.org markup tells Google: "this is an OpticalStore at this address with these hours, here's the gallery, and here's the GMB review link."
- **Lat/lng confirmation:** the executor will use a best-guess for the Ashkelon address (~31.6688°N, 34.5743°E). After deploy, please open `/branches/ashkelon/`, click the embedded map link, and tell me if the pin lands on the correct entrance. If it's off — easy fix, one DB UPDATE.
- **Future branch:** when you open Tel Aviv (or any other branch), the executor will need: address, phone, hours, GMB URL, 4 photos. One DB INSERT and the new branch page is live in 1 minute.
- EN + RU pages fall back to HE for un-translated fields. When you want full translations, future SPEC adds per-branch translation UI in Studio.
