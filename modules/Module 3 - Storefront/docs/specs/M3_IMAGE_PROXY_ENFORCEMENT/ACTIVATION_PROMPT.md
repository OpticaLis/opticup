# ACTIVATION PROMPT — M3_IMAGE_PROXY_ENFORCEMENT

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_IMAGE_PROXY_ENFORCEMENT/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro) AND
opticalis/opticup-storefront (storefront — for the implementation).
Branches: develop. Daniel merges main via GitHub PR.

Background: Closes REC-SITE-007 (Iron Rule 25 enforcement). Routes all
storefront image renders through /api/image/[...path].ts proxy instead
of direct supabase.co/storage URLs. Improves performance, hides DB
URLs, enables future-storage-provider portability.

Daniel directive 2026-05-08: "תוודא שהוא לא שובר שום דבר והכל עובר חלק
ואחרי שהוא מסיים את השינוי שיעשה בדיקה בכל העמודים שיש בהם תמונות של
מוצרים." This SPEC has TWO non-negotiable safety nets:

1. PRE-CHANGE INVENTORY (§4-A): full enumeration of every image-render
   site (source files + CMS rows + components + structured data + CSS)
   written to INVENTORY.md BEFORE any edit. If a render site is found
   AFTER the inventory phase → STOP and reconcile.

2. POST-CHANGE LIVE VERIFICATION (§4-G + §10): Chrome MCP opens 14+
   customer-facing pages on the Vercel preview AND on production. For
   each page: per-image count vs baseline + HTTP 200 check + naturalWidth
   > 0 check + screenshot saved to SPEC folder. ANY single failure
   triggers an immediate STOP and fix-up cycle.

Plus: a build-time check script (scripts/check-no-direct-supabase-image.mjs)
chained into npm run build that scans dist/**/*.html and exits non-zero
if a regression slips through. Permanent guardrail per L-PROJECT-002 pattern.

Six storefront write paths (CREATE 2 + MODIFY all inventory):
1. CREATE src/lib/image-url.ts (toProxyUrl helper, idempotent + safe)
2. CREATE scripts/check-no-direct-supabase-image.mjs (build-time check)
3. MODIFY package.json (chain check after astro build)
4. MODIFY all source files identified in INVENTORY.md (count TBD)
5. (CONDITIONAL) tenant.ts if image URL flows from tenant config
6. (CONDITIONAL) CMS migration if storefront_pages.blocks contains
   direct Supabase URLs — use jsonb_set, NOT text-replace (L-PROJECT-002)

ERP side:
- INVENTORY.md (deliverable, written before edits)
- EXECUTION_REPORT.md + FINDINGS.md
- screenshots/ folder with 14+ PNGs from live verification
- (CONDITIONAL) 2 migration files for CMS rewrites
- HANDOFF + DECISIONS_LOG updates

Authorities:
- Storefront source modifications per SPEC §4 whitelist — AUTHORIZED.
- (CONDITIONAL) Level 2 SQL UPDATEs on storefront_pages.blocks for prizma
  IF inventory finds direct URLs there — AUTHORIZED.
- Vercel redeploy via PR-to-main → Daniel approves merge.

Stop triggers (per SPEC §6 + §7):
- Inventory finds an unfamiliar render pattern → STOP, ask
- Per-page image count drops below baseline → STOP, fix-up
- ANY image returns non-200 in Chrome MCP → STOP
- Build-time check fails to catch synthetic regression → STOP
- CMS migration would rewrite > 100 rows (premise: 0-30) → STOP
- L-PROJECT-002 CHECK constraint fires → STOP, migration is doing wrong edit

Two atomic commits expected:
- Storefront: "fix(storefront): route all images through /api/image proxy (closes REC-SITE-007 — Iron Rule 25)"
- ERP: "chore(spec): close M3_IMAGE_PROXY_ENFORCEMENT"

Order:
1. Inventory (read-only) → INVENTORY.md
2. Local edits → npm run build → confirm dist/ clean of supabase.co/storage
3. Push storefront develop → wait for Vercel preview deploy
4. Chrome MCP verification on PREVIEW (14+ pages, screenshots)
5. ONLY THEN open PR → ASK DANIEL to merge
6. Wait for production Vercel READY
7. Chrome MCP verification on PRODUCTION (same 14+ pages, screenshots)
8. ONLY AFTER production verifies: commit ERP retro

Begin Step 0 per SPEC §3. Stop only on deviation from numbered success
criterion in SPEC §5.
```

---

**Notes for Daniel:**

- Estimated execution: 2-4 hours wall time. Bulk: inventory + 28 Chrome MCP verifications (14 preview + 14 prod).
- Risk: LOW-MEDIUM. The safety nets (pre-inventory + post-verification + build-time check) catch regressions before they reach customers.
- ONE thing you'll do mid-execution: click "Merge" on the GitHub PR (~30 seconds).
- After deploy: customers see the same images. First page-load may be marginally slower (one indirection); subsequent loads are FASTER (Vercel caches).
- Bucket privacy: separate finding. The `frame-images` bucket is supposed to be private per Iron Rule 25 but currently must be public for direct URLs to work. After this SPEC succeeds, a follow-up SPEC will flip the bucket to private (the proxy uses service-role key and will continue to work).
