# SPEC — M3_BRANCHES_INFRA_AND_ASHKELON

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** SaaS-clean infrastructure + per-branch landing page + Schema.org Local SEO
**Severity:** MEDIUM (closes REC-SITE-009; foundation for future multi-branch growth)

---

## 1. Goal

Build the **multi-branch infrastructure** for the storefront and ship the first branch — Ashkelon (פריזמה אשקלון) — as a working public page with rich Schema.org `OpticalStore` markup that Google Local will index.

After this SPEC:

1. **`tenant_branches` DB table** holds per-branch data: name, address, phone, hours, geo, GMB URL, gallery images.
2. **`v_storefront_branches` view** exposes the data to the storefront (Iron Rule 13).
3. **`/branches/` index page** lists all branches of the tenant.
4. **`/branches/[slug]/` dynamic page** renders the per-branch detail with Schema.org `OpticalStore` JSON-LD.
5. **Footer link to `/branches/`** added in 3 langs.
6. **Ashkelon branch seeded** with all data Daniel provided 2026-05-08.

When a future branch opens (`/branches/tel-aviv/`, etc.), Daniel adds one DB row + the page is live.  Zero code changes.

---

## 2. Background — verified live 2026-05-08

### Daniel-provided data (Ashkelon)

- **Address:** הרצל 32, אשקלון, 7860131
- **Phone:** 053-364-5404
- **Hours:**
  - Sunday: 09:00–13:00 + 16:00–19:00
  - Monday: 09:00–13:00 + 16:00–19:00
  - Tuesday: **09:00–13:00 only** (no afternoon)
  - Wednesday: 09:00–13:00 + 16:00–19:00
  - Thursday: 09:00–13:00 + 16:00–19:00
  - Friday: 09:00–13:00
  - Saturday: closed
- **Google My Business URL (review/share link):** `https://share.google/hul3Tg8QJ8pvRp8RW`
- **Gallery (4 images, already in `media_library` proxied via `/api/image/media/...`):**
  - IMG-20241230-WA0094 (proxy URL provided by Daniel)
  - IMG-20241230-WA0096
  - IMG-20241230-WA0078
  - IMG-20241230-WA0069

### Live state checks

- `tenant_branches` table does NOT exist (verified 2026-05-08 via Supabase MCP). ✓
- `/branches/` route does NOT exist in storefront (verified by listing `src/pages/`). ✓
- Site Overseer SKILL v0.3 has tenant config map but no branch knowledge — this SPEC's HANDOFF will document the new table for future Mode B audits.

### Why per-branch pages

Daniel directive 2026-05-08:
> "אני רוצה להרחיב את זה בעתיד לסניפים, לכן העדפתי שלא לכתוב כתובת לכל האתר או שעות פתיחה של הסניף עצמו באתר, כי בסניפים אחרים זה יכול להשתנות"

Per-branch pages are the SaaS-clean answer:
- Each branch has its own URL → can be promoted independently in Google Local for "אופטיקאי באשקלון", "אופטיקאי בתל אביב", etc.
- Zero hardcoded branch data in code.
- New branch = new DB row → page auto-renders.

---

## 3. SaaS-clean design

### Schema — `tenant_branches`

```sql
CREATE TABLE public.tenant_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,                    -- 'ashkelon', 'tel-aviv'
  display_order int NOT NULL DEFAULT 0,

  -- Localized names
  name_he text NOT NULL,
  name_en text,
  name_ru text,

  -- Address (structured per Schema.org PostalAddress)
  street_he text NOT NULL,
  street_en text,
  street_ru text,
  city_he text NOT NULL,
  city_en text,
  city_ru text,
  postal_code text,
  country_code text NOT NULL DEFAULT 'IL',
  region_he text,                        -- "Southern District" / "מחוז דרום"
  region_en text,
  region_ru text,

  -- Contact
  phone text,                            -- E.164 or local; rendered as tel: link
  whatsapp_e164 text,                    -- optional
  email text,

  -- Geo (optional but huge for SEO)
  latitude numeric(9,6),
  longitude numeric(9,6),

  -- Hours: jsonb array of opening-hours entries
  -- e.g. [{"day":"Sunday","opens":"09:00","closes":"13:00"},
  --       {"day":"Sunday","opens":"16:00","closes":"19:00"}, ...]
  -- Multiple entries per day = breaks supported.
  hours jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- External presence
  google_business_url text,              -- review/share link Daniel provided
  facebook_url text,
  instagram_url text,
  waze_url text,                         -- per existing waze pattern in tenant config

  -- Localized intro paragraph (renders above gallery)
  intro_he text,
  intro_en text,
  intro_ru text,

  -- Gallery: jsonb array of image proxy URLs
  -- e.g. ["/api/image/media/.../img1.webp","/api/image/media/.../img2.webp"]
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,

  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  is_deleted boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,

  UNIQUE (tenant_id, slug),
  CHECK (jsonb_typeof(hours) = 'array'),
  CHECK (jsonb_typeof(gallery) = 'array')
);

-- Iron Rule 14 (tenant_id NOT NULL) ✓
-- Iron Rule 18 (UNIQUE includes tenant_id) ✓
-- L-PROJECT-002 (jsonb arrays only) ✓
```

### RLS policy (Iron Rule 15 canonical pattern)

```sql
ALTER TABLE tenant_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON tenant_branches
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY tenant_isolation ON tenant_branches
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);
```

### View — `v_storefront_branches`

Exposes published, non-deleted rows to anon for storefront read.

```sql
CREATE VIEW v_storefront_branches AS
SELECT
  id, tenant_id, slug, display_order,
  name_he, name_en, name_ru,
  street_he, street_en, street_ru,
  city_he, city_en, city_ru,
  postal_code, country_code,
  region_he, region_en, region_ru,
  phone, whatsapp_e164, email,
  latitude, longitude,
  hours,
  google_business_url, facebook_url, instagram_url, waze_url,
  intro_he, intro_en, intro_ru,
  gallery,
  updated_at
FROM tenant_branches
WHERE status='published' AND is_deleted=false
ORDER BY tenant_id, display_order, slug;

GRANT SELECT ON v_storefront_branches TO anon;
```

### Storefront pages

**`/branches/` index** (`src/pages/branches/index.astro`):
- Reads all branches for the resolved tenant.
- Renders a card per branch: name, street + city, "Open now / Closed now" badge derived from hours, "View details" CTA.
- HE root + en/ + ru/ variants.

**`/branches/[slug]/` detail** (`src/pages/branches/[slug].astro`):
- Reads the single branch by slug.
- Renders: name, intro paragraph, full address, hours table (highlighting today), phone (tel: link), WhatsApp, Waze, Google review link.
- Embeds an iframe / static-map link to Google Maps using lat/long.
- Renders the gallery (proxy URLs from `gallery` jsonb).
- Emits Schema.org JSON-LD `OpticalStore` with: name, image (gallery[0]), telephone, address (PostalAddress), geo (GeoCoordinates), openingHoursSpecification array, sameAs links (GMB, Facebook, Instagram), aggregateRating placeholder (left empty for now; future: scrape from GMB).

**Localization fallback:** if a branch row is missing `name_en`, the page falls back to `name_he` (Hebrew). Same for street, city, region, intro.

### Footer link

In `src/components/Footer.astro` (and any tenant override): add a link "סניפים" (he) / "Branches" (en) / "Филиалы" (ru) → `/branches/` (locale-prefixed for en + ru).

### Hours rendering rules

Schema.org `OpeningHoursSpecification` accepts multi-entry per day for breaks. Two entries for Sunday (09:00-13:00 and 16:00-19:00) = correct representation of an afternoon break. Do NOT collapse to "09:00-19:00" — that's the inaccurate path.

Frontend rendering: a structured table per day. Days with breaks show "09:00–13:00, 16:00–19:00". Days fully open show single range. Saturday shows "סגור / Closed / Закрыт".

The "Open now" badge: simple JS that checks current weekday + time against the hours array. Pure client-side, no DB call.

---

## 4. Step 0 — Reproduce-the-bug-first (MANDATORY)

```bash
# 1. tenant_branches does NOT exist:
# Supabase MCP: SELECT to_regclass('public.tenant_branches');
# expected: NULL

# 2. /branches/ route does NOT exist in storefront:
ls opticup-storefront/src/pages/branches/ 2>&1
# expected: file not found

# 3. The 4 gallery images Daniel provided ARE reachable via the proxy:
for url in \
  "/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0094_1775230229252.webp" \
  "/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0096_1775230678239.webp" \
  "/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0078_1775230673868.webp" \
  "/api/image/media/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/general/IMG-20241230-WA0069_1775230670721.webp"; do
  curl -sIL "https://www.prizma-optic.co.il${url}" -A "Mozilla/5.0" | grep -E "^HTTP" | tail -1;
done
# expected: 4× HTTP 200

# 4. Iron Rule 25 build-time check (added by M3_IMAGE_PROXY_ENFORCEMENT) is in place:
grep "check-no-direct-supabase-image" opticup-storefront/package.json
# expected: 1 match (must NOT regress)

# 5. CHECK constraints from M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL still present:
# Supabase MCP: SELECT conname FROM pg_constraint WHERE conname LIKE '%blocks_must_be_array%';
# expected: 2 rows

# 6. The footer cookie-preferences link from M3_COOKIE_CONSENT_OPT_IN is present (regression check):
grep -A1 "ניהול קוקיז" opticup-storefront/src/components/Footer.astro | head -3
# expected: 1 match (must NOT regress)
```

If any check deviates → STOP and reconcile.

---

## 5. Scope

### In scope

**A. DB migrations (4 files):**

1. `2026_05_08_branches_schema_up.sql` — CREATE TABLE + RLS policies.
2. `2026_05_08_branches_schema_down.sql` — DROP TABLE + reverse.
3. `2026_05_08_branches_view_up.sql` — CREATE VIEW + GRANT.
4. `2026_05_08_branches_view_down.sql` — DROP VIEW.

**B. DB seed (2 files):**

5. `2026_05_08_branches_ashkelon_seed_up.sql` — INSERT prizma's Ashkelon branch with all Daniel-provided data.
6. `2026_05_08_branches_ashkelon_seed_down.sql` — DELETE.

The seed populates HE fields with Daniel's exact text. EN + RU fields are left NULL initially (page will fall back to HE on those locales until translations are added). Coordinates: I'll use approximate lat/lng for "הרצל 32, אשקלון" (~31.6688°N, 34.5743°E) — executor MUST verify these via Google Maps API or geocoding before seeding; mark as "best-guess approximation; Daniel to confirm" in EXECUTION_REPORT if not externally verified.

**C. Storefront source (CREATE 4 + MODIFY 2):**

7. CREATE `src/lib/branches.ts` — fetch helpers `getBranches(tenantId)`, `getBranchBySlug(tenantId, slug)`, `getOpenStatus(hours, now)`.
8. CREATE `src/pages/branches/index.astro` — branch list (HE root). + `en/branches/index.astro` + `ru/branches/index.astro`.
9. CREATE `src/pages/branches/[slug].astro` — branch detail (HE root). + `en/branches/[slug].astro` + `ru/branches/[slug].astro`.
10. CREATE `src/components/BranchCard.astro` — card UI.
11. CREATE `src/components/BranchHoursTable.astro` — table with today highlighted.
12. CREATE `src/components/BranchSchemaJsonLd.astro` — JSON-LD emission.
13. MODIFY `src/lib/tenant.ts` — extend `TenantConfig` view DTO if needed (likely no change needed — branches use a separate view).
14. MODIFY `src/components/Footer.astro` (or tenant footer override) — add "סניפים" link.

**D. Translations:**

15. MODIFY `src/locales/he.json` (or wherever i18n strings live) — add: "סניפים", "כתובת", "שעות פעילות", "צרו קשר", "פתוח עכשיו", "סגור עכשיו", "צפה במפה", "ביקורות בגוגל", day names, "פתוח / סגור".
16. Same for `en.json` + `ru.json`.

**E. Tests / verification:**

17. CREATE `scripts/verify-branches.mjs` — reads `/branches/` and `/branches/ashkelon/` post-deploy, asserts: (a) all 4 gallery images load 200; (b) JSON-LD parses + has required Schema.org fields; (c) HE/EN/RU variants all render; (d) "Open now" badge renders.

**F. Site Overseer skill v0.4 update:**

18. UPDATE `roles/site-overseer/SITE_OVERSEER_SKILL.md` — add `tenant_branches` table + `v_storefront_branches` view to the knowledge-map section. So future Mode B audits know about branches without re-discovery.

### Out of scope

- Translation of EN + RU branch text — left NULL, page falls back to HE. Daniel can populate later via Studio (or a future SPEC adds Studio UI for branches).
- Aggregate rating scraping from GMB — placeholder; future SPEC.
- Branch admin UI in ERP Storefront Studio — not in this SPEC; future enhancement.
- Customer reviews on the branch page — separate domain.
- Multi-branch onboarding flow — there's only one branch today; the infrastructure supports N from day one.
- Removing any address/hours from existing pages (homepage doesn't have any per Daniel's intentional decision).

### Whitelist of write paths

**ERP repo:**
- 6 migration SQL files in SPEC's `migrations/` folder
- EXECUTION_REPORT.md + FINDINGS.md
- HANDOFF + DECISIONS_LOG updates
- SITE_OVERSEER_SKILL.md v0.4

**Storefront repo:**
- src/lib/branches.ts (CREATE)
- src/pages/branches/index.astro + en/ + ru/ (CREATE 3)
- src/pages/branches/[slug].astro + en/ + ru/ (CREATE 3)
- src/components/BranchCard.astro (CREATE)
- src/components/BranchHoursTable.astro (CREATE)
- src/components/BranchSchemaJsonLd.astro (CREATE)
- src/lib/tenant.ts (MODIFY only if needed)
- src/components/Footer.astro (MODIFY)
- src/locales/*.json (MODIFY 3)
- scripts/verify-branches.mjs (CREATE)

**Supabase production:**
- 3 DDL migrations (table + view + indexes)
- 1 Level-2 seed for Ashkelon row
- 2 RLS policies installed

---

## 6. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | All 6 sub-checks | PASS |
| 2 | `tenant_branches` table created with all CHECK constraints | `\d tenant_branches` | columns + constraints match §3 |
| 3 | RLS policies installed (canonical pattern) | `pg_policies` query | 2 policies: `service_bypass` + `tenant_isolation`, JWT-claim USING |
| 4 | `v_storefront_branches` view created + anon GRANT | `\dv` + `pg_get_viewdef` + `has_table_privilege('anon', ...)` | view exists, anon can SELECT |
| 5 | Ashkelon row seeded with all Daniel-provided data | `SELECT * FROM tenant_branches WHERE slug='ashkelon'` | matches §2 |
| 6 | Hours jsonb is array of OpeningHoursSpecification entries | jsonb_typeof + jsonb_array_length | array, ≥10 entries (each open-window per day) |
| 7 | Gallery has 4 entries, all `/api/image/media/...` proxy URLs | jsonb inspection | 4 URLs starting with `/api/image/` |
| 8 | `/branches/` index renders + lists Ashkelon | curl + grep | non-zero body, "אשקלון" present |
| 9 | `/branches/ashkelon/` detail renders + shows all data | curl + grep | name, address, phone, hours all visible |
| 10 | Schema.org JSON-LD emits valid `OpticalStore` | parse `<script type="application/ld+json">` from rendered page; check schema fields | type=OpticalStore + name + image + address (PostalAddress with all fields) + geo + telephone + openingHoursSpecification array (≥10 entries) + sameAs |
| 11 | All 4 gallery images load 200 in real Chrome MCP | Chrome MCP + screenshot | 4×200, naturalWidth>0 |
| 12 | "Open now / Closed now" badge renders correctly per current time | manual check + JS log | matches actual now-vs-hours |
| 13 | Footer "סניפים" link in 3 langs | grep + Chrome MCP | link present + clicks land on `/branches/` |
| 14 | EN + RU pages render with Hebrew fallback (no broken-template errors) | curl + grep | non-zero body for both |
| 15 | Iron Rule 25 build-time check still passes (no regression) | npm run build | exit 0, check passes |
| 16 | L-PROJECT-002 CHECK constraints not regressed | pg_constraint query | 2 still present |
| 17 | Build-time check + verify-branches.mjs both pass | npm run build && node scripts/verify-branches.mjs | exit 0, exit 0 |
| 18 | Storefront commit + ERP commit | git log | one each, descriptive |
| 19 | Both repos clean | git status | nothing to commit |
| 20 | Integrity gate clean (ERP) | npm run verify:integrity | exit 0 |
| 21 | Vercel deploy READY post-merge | Vercel MCP | state=READY, target=production |
| 22 | Live verification on production: all 14 existing pages still work | curl + Chrome MCP smoke test | no regression |

---

## 7. Autonomy Envelope

**Executor MAY autonomously:**
- Apply the 6 migrations via Supabase MCP. AUTHORIZED Level 3 (DDL) for table+view+RLS.
- INSERT the Ashkelon seed (Level 2, prizma tenant).
- Create + modify all whitelist storefront files.
- Run `npm run build` + `verify-branches.mjs`.
- Commit + push BOTH repos to develop ONCE each.
- Open the PR for storefront → main (Daniel merges).
- Run Chrome MCP verifications on production post-deploy.

**Executor MUST stop and report:**
- Step 0 #5/#6 regressions (existing constraints/footer link gone) → STOP.
- Lat/lng can't be verified externally → continue with best-guess + flag in FINDINGS for Daniel to verify post-deploy.
- Schema.org JSON-LD validator (Google's Rich Results Test or `schema.org/validator`) reports errors → STOP, fix the JSON-LD emission.
- Any of the 4 gallery images returns non-200 in production after deploy → STOP, the URLs Daniel provided don't match Storage paths.
- Hours array rendering doesn't reflect Tuesday-no-afternoon nuance → STOP, frontend logic is wrong.
- More than 1 row inserted into tenant_branches → STOP, scope drift.

**Executor MUST NOT:**
- Push directly to main (Daniel-only PR-merge).
- Add a 2nd branch row (only Ashkelon for now).
- Skip Schema.org JSON-LD validation (this is the SEO point of the SPEC).
- Hardcode Ashkelon-specific data anywhere in source code — all from DB.
- Modify tenant config to add address/hours at the tenant level (Daniel explicitly does NOT want that).

---

## 8. Stop-on-Deviation Triggers

In addition to global:
- Schema.org JSON-LD validator returns even one warning → STOP, fix.
- "Open now" badge logic shows "Open" when actual time is in a known break window → STOP.
- Vercel build takes > 3 min (premise: ~90s) → STOP, may be a build issue.
- Production fetch of `/branches/ashkelon/` returns < 5KB body → STOP, page is empty.

---

## 9. Expected Final State

**On Supabase production:**
- `tenant_branches` table + 2 RLS policies + `v_storefront_branches` view active.
- 1 row: Ashkelon for prizma, fully populated.

**On disk (storefront commit X, ERP commit Y):**
- Branches infrastructure under `src/pages/branches/` + helpers + components.
- Footer link added in 3 langs.
- Verification script.
- ERP retro + 6 migrations + skill v0.4.

**On live storefront (post-deploy):**
- `https://www.prizma-optic.co.il/branches/` → list with Ashkelon.
- `https://www.prizma-optic.co.il/branches/ashkelon/` → full detail page with gallery, hours, map link, GMB link, Schema.org JSON-LD.
- Same in `/en/branches/` + `/ru/branches/` with HE fallback for missing translations.
- Footer "סניפים" link visible in all 3 langs.

**Future tenant onboarding:** add tenant + `INSERT INTO tenant_branches (tenant_id, slug, ...) VALUES (...)` per branch. Pages auto-render.

**Future Ashkelon enhancement:** Daniel can later UPDATE `name_en`, `street_en`, `intro_en` directly via Studio (or a future Studio Branches admin SPEC).

---

## 10. Commit Plan

**Storefront commit:**
```
feat(storefront): per-branch infrastructure + Ashkelon page (closes REC-SITE-009)

Builds the SaaS-clean branches subsystem:
- src/lib/branches.ts — fetch + open-now helpers reading v_storefront_branches.
- src/pages/branches/[index|[slug]].astro × 3 langs — list + detail.
- src/components/BranchCard, BranchHoursTable, BranchSchemaJsonLd.
- Footer "סניפים" / "Branches" / "Филиалы" link in 3 langs.
- scripts/verify-branches.mjs — production smoke test.

First branch live: Ashkelon (הרצל 32, אשקלון, 7860131). Phone, hours
(including Tuesday-no-afternoon nuance and Sun/Mon/Wed/Thu lunch break),
4-image gallery, Google Business review link, Waze link.

Schema.org OpticalStore JSON-LD emitted with: name, image, address,
geo, telephone, openingHoursSpecification (multi-entry-per-day for
breaks), sameAs (GMB).

Daniel-explicit non-goal: tenant-level address/hours. Address + hours
live ONLY at the branch level so future tenants and future branches
each manage their own data.

EN + RU pages fall back to HE for un-translated fields. Future Studio
SPEC will add per-branch translation UI.
```

**ERP commit:**
```
chore(spec): close M3_BRANCHES_INFRA_AND_ASHKELON

Closes REC-SITE-009. 6 migration SQL files (table + view + Ashkelon
seed). EXECUTION_REPORT + FINDINGS in SPEC folder. Site Overseer
SKILL.md v0.4 — added tenant_branches + v_storefront_branches to the
knowledge map for future Mode B audits.
```

---

## 11. Methodology — Schema.org validation

The whole SEO point of this SPEC is the JSON-LD. Validate before commit:

1. Build locally → render `dist/branches/ashkelon/index.html` → extract `<script type="application/ld+json">` block.
2. Pass through Google's Rich Results Test API (or local validator) — `https://search.google.com/test/rich-results` if API not available, manual check on the deployed URL.
3. Required passes: type=OpticalStore, all PostalAddress fields, geo present, openingHoursSpecification array with all weekdays.
4. NO warnings allowed. If validator says "missing recommended field" — add it (e.g., aggregateRating placeholder, image[1+]).

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-08:
- No `tenant_branches` table or `v_storefront_branches` view exists. ✓
- Iron Rule 14 (tenant_id NOT NULL): satisfied. ✓
- Iron Rule 15 (canonical RLS): satisfied. ✓
- Iron Rule 18 (UNIQUE includes tenant_id): satisfied via `(tenant_id, slug)`. ✓
- Iron Rule 13 (Views-only for external reads): the storefront reads via `v_storefront_branches`, not the table. ✓
- Iron Rule 25 (image proxy mandatory): gallery URLs are already proxy URLs Daniel provided. The build-time check (added by M3_IMAGE_PROXY_ENFORCEMENT) will catch any regression. ✓
- L-PROJECT-001 (no decorative real-looking values): all data is real, Daniel-provided. ✓
- L-PROJECT-002 (jsonb arrays only): hours + gallery have CHECK constraints. ✓
- SaaS litmus test: future tenant or future branch = INSERT, no code change. ✓

**0 collisions.**

---

## 13. Lessons already incorporated

- `feedback_audit_real_world_check.md` — finding correctly MEDIUM (SEO upside, not customer harm).
- `feedback_always_saas_clean.md` — full SaaS-clean architecture from day 1, not a quick-fix.
- L-PROJECT-002 — CHECK constraints on hours + gallery jsonb arrays.
- Iron Rule 25 + the M3_IMAGE_PROXY_ENFORCEMENT build-time check — gallery URLs are proxy URLs by design.
- The "verification script" pattern (similar to `verify-images.mjs` from M3_IMAGE_PROXY_ENFORCEMENT) — gives Daniel a permanent regression-detection tool.

---

## 14. Estimated effort

- 4-6 hours executor wall time. Bulk: 6 components + helpers + 3-lang routes + Schema.org validation + verification script + Chrome MCP live tests.
- One Daniel interaction: PR-merge button click.
- One Daniel optional interaction: confirm the lat/lng if the executor's geocoding lookup is unconfident.

---

## 15. Definition of Done

All 22 success criteria pass. Two atomic commits. Both repos clean. Live production verified: `/branches/` lists Ashkelon, `/branches/ashkelon/` shows full detail page with valid Schema.org, Google Rich Results Test passes for that URL. Site Overseer HANDOFF marks REC-SITE-009 CLOSED.

The infrastructure is multi-tenant-ready and multi-branch-ready from day one. The first second branch is one INSERT away.

---

*End of SPEC.*
