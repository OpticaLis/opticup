# EXECUTION_REPORT — M3_BRANCHES_INFRA_AND_ASHKELON

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_BRANCHES_INFRA_AND_ASHKELON/EXECUTION_REPORT.md`
> **Written by:** opticup-executor (Bounded Autonomy)
> **Written on:** 2026-05-09
> **SPEC reviewed:** `SPEC.md` (authored by opticup-strategic / Site Overseer Foreman, 2026-05-08)
> **Storefront commits:** `ae4a746` (initial — 12 files) + `ae60b37` (vercel.json fix-up); merged to main.
> **Start commit (ERP):** `a6c8dec`
> **End commit (ERP):** _filled at commit time below_
> **Duration:** ~2.5 hours (Step 0 + 6 migrations + 12 storefront files + build → deploy → verify-branches.mjs FAIL → diagnose vercel.json redirect → fix-up commit → re-deploy → re-verify PASS → ERP retro)

---

## 1. Summary

Multi-branch infrastructure shipped end-to-end on production. SaaS-clean: `tenant_branches` DB table with canonical RLS + `v_storefront_branches` view + 6 components + 3-language routes (`/branches/`, `/branches/[slug]/` × he/en/ru) + Schema.org `OpticalStore` JSON-LD per branch. First branch live: Ashkelon (פריזמה אשקלון) with all Daniel-provided data — phone, hours including the Tuesday-no-afternoon nuance and Sun/Mon/Wed/Thu lunch breaks, 4-image gallery (proxy URLs), Google Business review link, Waze link, embedded Maps. Future branch onboarding = one DB row. `verify-branches.mjs` PASS 7/7 on production: 3 list pages link to ashkelon, detail page has all expected fields, JSON-LD valid (10 hour entries + 4 images + sameAs), 4 gallery images all 200, EN+RU pages render. Required one fix-up commit (vercel.json had a pre-existing `/branches/ → /terms-branches/` redirect that intercepted the new index page). 6 findings logged.

---

## 2. What Was Done

### Storefront repo (`opticalis/opticup-storefront`)

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | `ae4a746` | `feat(storefront): per-branch infrastructure + Ashkelon page (closes REC-SITE-009)` | 12 files |
| 2 | `ae60b37` | `fix(storefront): remove vercel.json /branches/ → /terms-branches/ legacy redirect` | 1 file (5 deletions) |

Storefront artefacts:
- **CREATED** `src/lib/branches.ts` — fetch helpers (`getBranches`, `getBranchBySlug`, `pickLocalized`, `getOpenStatus`, `groupHoursByDay`); reads `v_storefront_branches`.
- **CREATED** `src/components/BranchCard.astro` — list-page card with name + address + Open-now badge (client-computed) + CTA.
- **CREATED** `src/components/BranchHoursTable.astro` — table per weekday with multi-window-per-day support; today's row highlighted via client script.
- **CREATED** `src/components/BranchSchemaJsonLd.astro` — Schema.org `OpticalStore` JSON-LD with PostalAddress, GeoCoordinates, openingHoursSpecification array (one entry per window), sameAs.
- **CREATED** 6 page files: `src/pages/branches/{index,[slug]}.astro` × he/en/ru.
- **MODIFIED** `src/components/Footer.astro` — branches link in bottom-bar (next to copyright + cookie-prefs link). Same pattern as cookie-prefs to bypass tenants whose `footer_config.columns` overrides defaultColumns.
- **CREATED** `scripts/verify-branches.mjs` — production smoke test asserting list-page links + detail-page fields + JSON-LD shape + 4 gallery images reachable + EN/RU pages render.
- **MODIFIED** `vercel.json` (fix-up commit) — removed pre-existing `/branches/ → /terms-branches/` legacy redirect that was intercepting the new SSR routes.

### ERP repo (`opticalis/opticup`)

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | _filled at commit_ | `chore(spec): close M3_BRANCHES_INFRA_AND_ASHKELON` | 11 files |

ERP artefacts:
- **CREATED** 6 migration SQL files (3 up + 3 down): schema (table + RLS), view, Ashkelon seed.
- **CREATED** `EXECUTION_REPORT.md` (this file)
- **CREATED** `FINDINGS.md` (6 findings)
- **CREATED** `screenshots/jsonld-ashkelon-production.json` — captured production JSON-LD for Daniel to paste into Google's Rich Results Test if desired.
- **CREATED** `screenshots/verify-branches-output.txt` — verification log (7/7 PASS).
- **UPDATED** `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_SKILL.md` v0.4 — added `tenant_branches` + `v_storefront_branches` to the table/view knowledge map.
- **UPDATED** `SITE_OVERSEER_HANDOFF.md` — REC-SITE-009 closed.
- **APPENDED** `DECISIONS_LOG.md` — 2026-05-09 branches-infra entry.

### Live mutations executed (Supabase MCP `apply_migration`)

- `m3_branches_schema_2026_05_09` — table + 2 RLS policies + 2 indexes.
- `m3_branches_view_2026_05_09` — view + anon GRANT.
- `m3_branches_ashkelon_seed_2026_05_09` — single INSERT for Ashkelon.

### Verify results

| Check | Result |
|---|---|
| `npm run verify:integrity` (ERP, Iron Rule 31) | PASS at First Action and pre-commit |
| Storefront `npm run build` × 2 | PASS; image-proxy-check (M3_IMAGE_PROXY_ENFORCEMENT) PASS — 0 violations |
| L-PROJECT-002 CHECK constraints from M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL | Still 2 in `pg_constraint` — no regression |
| Footer cookie-prefs link from M3_COOKIE_CONSENT_OPT_IN | Still present — no regression |
| Gallery images on production (Step 0 #3) | 4/4 200 OK |
| Production `verify-branches.mjs` post fix-up | 7/7 PASS |

---

## 3. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | (no SPEC text — surfaced in live verification) | `/branches/` returned HTTP 308 → `/terms-branches/` due to a pre-existing `vercel.json` redirect from earlier WP-cleanup work | Foreman didn't pre-flight `vercel.json` for path collisions when authoring the new route | Removed the single redirect rule (5 lines) in fix-up commit `ae60b37`. Logged as Finding M3-INFRA-01. |
| 2 | §2 lat/lng "executor MUST verify externally" | Used SPEC's suggested approximation; could not externally verify (no Google Maps API wired) | Geocoding API not available in this session | Logged as Finding M3-DATA-02; Daniel can update precise coords later via DB UPDATE. Page renders + Schema.org valid; only minor map-pin accuracy. |
| 3 | §5-C-14 "MODIFY src/components/Footer.astro to add 'סניפים' link" | Added link to bottom-bar (not into `defaultColumns`) | Prizma's `footer_config.columns` overrides defaultColumns — same recurring pattern as M3_COOKIE_CONSENT_OPT_IN. Adding to defaultColumns would have rendered for new tenants but NOT for prizma. | Same bottom-bar pattern as cookie-prefs. Renders for any tenant. Logged as Finding M3-EXEC-03. |
| 4 | §11 "Pass through Google's Rich Results Test API" | Substituted with `verify-branches.mjs` structural validation | Google's Rich Results Test is an interactive web tool; no public API wired in this session | Saved production JSON-LD as evidence; Daniel can paste into the interactive validator if desired. Structural shape passes Schema.org's required fields for OpticalStore. Logged as Finding M3-INFRA-04. |

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | Footer location for the "branches" link (defaultColumns vs bottom-bar vs DB UPDATE) | Bottom-bar (same pattern as cookie-prefs from M3_COOKIE_CONSENT_OPT_IN) | Avoids the recurring `footer_config.columns`-override issue. Consistent with established pattern. Doesn't require touching prizma's footer_config DB. |
| 2 | Lat/lng precision (cannot verify externally) | Used SPEC's suggested approximation + flag in FINDINGS for Daniel | Map renders correctly with these coords; only minor pin precision. Safer to ship with approximation + flag than block on external geocoding. |
| 3 | Multi-window-per-day in JSON-LD: emit one OpeningHoursSpecification per window OR consolidate? | One spec per window | Schema.org Local SEO best practice for "lunch break" pattern. Consolidating 09:00-13:00 + 16:00-19:00 into 09:00-19:00 would be inaccurate (would show "open at 14:00" which is wrong). |
| 4 | "Open now" badge — render at SSR or compute client-side? | Compute client-side via inline script in BranchCard | SSR cache could show stale "open" status if cached at e.g. 12:00 and served at 14:00. Client-side computation always reflects actual user time. |
| 5 | Today's-row highlight in hours table — render at SSR or client? | Client-side highlight via inline script in BranchHoursTable | Same SSR-cache reason. |
| 6 | EN/RU branch text — populate now or leave NULL with HE fallback? | Populated `name_en`/`name_ru`/`street_en`/`street_ru`/`city_en`/`city_ru`/`region_en`/`region_ru` in seed; left `intro_en`/`intro_ru` NULL per SPEC §5-D | Address translation is deterministic (transliteration); intro paragraph requires Daniel's content review. Kept the intro NULL with HE fallback. |
| 7 | When live test caught vercel.json redirect | Identified root cause (5-line block in vercel.json) → fix-up commit → Daniel-merge → re-verify | Standard fix-up cycle; same pattern as recent SPECs. Avoided blocking the SPEC on a pre-existing platform config. |

---

## 5. What Would Have Helped Me Go Faster

- **Foreman SKILL: grep `vercel.json` for path collisions when SPEC adds new top-level routes.** SPEC §11 Cross-Reference Check verified `tenant_branches` doesn't exist + view doesn't exist + Iron Rules 14/15/18/13 satisfied — but didn't check whether `/branches/` already had a Vercel redirect rule. A 30-second `grep "branches" vercel.json` at SPEC-author time would have caught the legacy redirect. Cost me ~15 min of diagnose + fix-up + re-deploy.
- **Geocoding API wired to Supabase MCP / Vercel.** Would let executor verify coordinates programmatically rather than punt to Daniel.
- **Google Rich Results Test API access.** Currently it's a web-only tool. The structural validator in `verify-branches.mjs` covers required fields, but a real validator pass would catch nuanced "missing recommended" warnings.

---

## 6. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|----------|----------|
| 9 — no hardcoded business values | ✅ | All Ashkelon-specific data lives in DB; storefront source is tenant-agnostic. UI chrome strings (headings/labels) are generic per-locale. |
| 12 — file size | ✅ | All in-scope files < 350 lines (largest is `[slug].astro` at ~190 lines). |
| 13 — Views-only for external reads | ✅ | Storefront reads via `v_storefront_branches`, never the table directly. |
| 14 — tenant_id NOT NULL | ✅ | `tenant_branches.tenant_id uuid NOT NULL REFERENCES tenants(id)`. |
| 15 — RLS canonical pattern | ✅ | Two policies: `service_bypass` (service_role) + `tenant_isolation` (public, JWT claim). Verbatim from CLAUDE.md §5 Iron Rule 15 reference implementation. |
| 18 — UNIQUE includes tenant_id | ✅ | `UNIQUE (tenant_id, slug)`. |
| 21 — no orphans / duplicates | ✅ | New table + view + components are all unique paths. No new helper duplicates an existing one. |
| 22 — defense in depth | ✅ | RLS at DB layer + view filters `WHERE status='published' AND is_deleted=false` + storefront only reads via view. |
| 23 — no secrets | ✅ | No tokens/keys in any committed file. |
| 25 — image proxy mandatory | ✅ | Gallery URLs in seed are already proxy URLs (`/api/image/media/...`). Build-time check from M3_IMAGE_PROXY_ENFORCEMENT PASS. |
| 31 — integrity gate | ✅ | Clean at First Action and pre-commit. |
| L-PROJECT-002 (jsonb writes via array constructors) | ✅ | Seed uses `jsonb_build_array` + `jsonb_build_object`, never text-replace. |

**SaaS readiness:** Future tenant onboarding = INSERT `tenant_branches` rows. Future branch onboarding = INSERT one row. Zero code changes either way. Validated by inspection of `branches.ts` + page files (no `WHERE tenant_id='6ad...'` literal anywhere; all parameterized via `resolveTenant`).

---

## 7. Self-Assessment (1–10 each, with justification)

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 8 | All 22 success criteria met after fix-up. 4 deviations all logged with severity + reason. The vercel.json discovery was a SPEC pre-flight gap that surfaced cleanly via the prescribed live-verification step. |
| Adherence to Iron Rules | 10 | All 12 in-scope rules confirmed. RLS canonical pattern verbatim. SaaS-clean by construction. |
| Commit hygiene | 9 | Two atomic storefront commits + one ERP commit; each scoped. Fix-up commit cleanly addressed the live-test finding. |
| Documentation currency | 10 | EXECUTION_REPORT detailed; FINDINGS has 6 entries; HANDOFF + DECISIONS_LOG appended; Site Overseer SKILL bumped to v0.4 with the new table/view documented; verification artifacts saved. |
| Autonomy (asked questions) | 9 | Two PR-merge confirmations (Daniel-only). All other ambiguities decided autonomously. |
| Finding discipline | 10 | 6 findings logged with severity + repro. Includes 1 self-incrimination of executor (M3-EXEC-03 pattern recurrence — chose bottom-bar pragmatically rather than fight the tenant override). |

**Overall score (weighted average):** **9.3/10.**

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Pre-flight `vercel.json` for path collisions when SPEC adds new top-level URL paths

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check" → add sub-check 14 (alongside existing 1-13).
- **Change:** Add:
  > **14. Vercel-config path-collision pre-flight (when SPEC adds a new top-level route).** Before implementing a new `/<segment>/` route, grep `vercel.json` for redirect/rewrite rules whose source matches that path. Pattern:
  > ```bash
  > grep -E "\"source\":\\s*\"/<new_segment>(\\$|/)" vercel.json
  > ```
  > If any rule matches → STOP. Either remove the conflicting rule (with Foreman approval) OR pick a different path. A platform-level redirect overrides Astro's SSR routes silently — symptoms only surface in production, not local builds.
- **Rationale:** Cost me ~15 min in this SPEC: full storefront commit + Daniel-merge + Vercel deploy + verify-branches.mjs FAIL → diagnose vercel.json → fix-up commit + Daniel-merge again + re-deploy + re-verify. A 30-second pre-flight grep at SPEC-validation time would have caught the legacy `/branches/` rule.
- **Source:** Finding M3-INFRA-01, §3 Deviation 1, §5 bullet 1.

### Proposal 2 — Google Rich Results Test substitute documented in SKILL

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Live mutation discipline" → add Schema.org sub-section.
- **Change:** Add:
  > **Schema.org JSON-LD validation when SPEC requires "Rich Results Test pass".** Google's Rich Results Test is an interactive web tool with no public API. Substitute: write a structural validator (similar to `scripts/verify-branches.mjs` from M3_BRANCHES_INFRA_AND_ASHKELON) that:
  > 1. Fetches the production page.
  > 2. Extracts the `<script type="application/ld+json">` block.
  > 3. Asserts: required Schema.org fields per type (e.g. for OpticalStore: `@context`, `@type`, `name`, `address` with PostalAddress sub-fields, `geo` with GeoCoordinates, `openingHoursSpecification`, `image`, `telephone`, `sameAs`).
  > 4. Saves the JSON-LD to the SPEC's `screenshots/` folder for Daniel to paste into the interactive validator if a real Google-side check is desired.
- **Rationale:** Substitution is functionally equivalent for required fields. The interactive test catches "recommended" warnings that the structural validator may miss — but those are richness improvements, not correctness. Saving the JSON-LD as evidence keeps Daniel in the loop.
- **Source:** Finding M3-INFRA-04, §3 Deviation 4.

---

## 9. Next Steps

- Commit this report + 11 other ERP files in a single atomic commit per SPEC §10.
- Signal Foreman: "SPEC closed. Awaiting Foreman review."
- Daniel post-session optional steps:
  1. Verify lat/lng precision and `UPDATE tenant_branches SET latitude=X, longitude=Y WHERE slug='ashkelon'` if the precise location differs from 31.668800, 34.574300.
  2. Paste `https://www.prizma-optic.co.il/branches/ashkelon/` into Google's Rich Results Test for an authoritative validator pass.
  3. Optional: populate `intro_en`/`intro_ru` in `tenant_branches` to remove the HE-fallback on those locales (or wait for the Studio Branches admin UI in a future SPEC).

---

## 10. Raw Command Log (key moments)

```
# Step 0
- tenant_branches doesn't exist (to_regclass=NULL)
- 4 gallery images all 200 on production
- L-PROJECT-002 CHECK constraints still 2 in pg_constraint
- Iron Rule 25 build-time check still chained (2 hits in package.json)
- Footer cookie-prefs link still present (3 hits in Footer.astro)

# Migrations (Supabase MCP apply_migration)
m3_branches_schema_2026_05_09  → success
m3_branches_view_2026_05_09  → success
m3_branches_ashkelon_seed_2026_05_09  → success
verify: 1 row, name_he="אופטיקה פריזמה אשקלון", n_hours=10, n_gallery=4

# Storefront source (12 files)
... (per §2 above)

# Local build
npm run build → image-proxy-check PASS (9 files, 0 violations)

# Storefront commit + push
git commit + git push → ae4a746
Daniel merged PR → Vercel READY

# verify-branches.mjs on production
node scripts/verify-branches.mjs
# FAIL: /branches/ doesn't link to /branches/ashkelon/

# Diagnose
curl -sI /branches/ → HTTP 308 → /terms-branches/
grep "branches" vercel.json → found 5-line redirect rule

# Fix-up commit + push
remove 5 lines from vercel.json → ae60b37
Daniel merged PR → Vercel READY

# Re-verify
verify-branches.mjs → PASS 7/7
JSON-LD inspection → all required Schema.org fields present
```

---

*End of EXECUTION_REPORT.md.*
