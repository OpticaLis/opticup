# SPEC — M3_TENANT_NAME_FALLBACK_SAAS

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-08
**Type:** SaaS-clean architecture fix (closes REC-SITE-006)
**Severity:** HIGH (potential customer-visible "Optic Up" string in failure modes; SaaS scaling correctness)

---

## 1. Goal

Replace the 8 hardcoded `?? 'Optic Up'` fallback strings in storefront pages with a **SaaS-clean fallback resolver** that derives a tenant-appropriate name from the request hostname when the live tenant config fails to load. After this SPEC, when a future tenant joins the platform, ZERO code changes are needed — the fallback works correctly out of the box.

**SaaS litmus test result:** when a second tenant arrives:
- **Quick-fix path (rejected):** "remember to change `'אופטיקה פריזמה'` to the new tenant's name in 8 files." — WRONG by SaaS rules.
- **This SPEC's path:** zero code changes needed — the fallback derives from the request hostname automatically.

---

## 2. Background — verified live 2026-05-08

### Affected files (8 customer-facing Astro pages)

Each contains a line like:
```ts
const tenantName = tenant?.name ?? 'Optic Up';
```

OR
```ts
const tenantName = tenant ? getLocalizedName(tenant, 'he') : 'Optic Up';
```

| File | Line | Pattern |
|---|---|---|
| `src/pages/index.astro` | 51 | `getLocalizedName ... 'Optic Up'` |
| `src/pages/search.astro` | 39 | `tenant?.name ?? 'Optic Up'` |
| `src/pages/products/index.astro` | 54 | `tenant?.name ?? 'Optic Up'` |
| `src/pages/products/[barcode].astro` | 41 | `tenant?.name ?? 'Optic Up'` |
| `src/pages/brands/index.astro` | 22 | `tenant?.name ?? 'Optic Up'` |
| `src/pages/brands/[slug].astro` | 84 | `getLocalizedName ... 'Optic Up'` |
| `src/pages/categories/index.astro` | 22 | `tenant?.name ?? 'Optic Up'` |
| `src/pages/category/[slug].astro` | 49 | `tenant?.name ?? 'Optic Up'` |

These also exist in the `/en/` and `/ru/` subtree (verified earlier in the audit). The executor must enumerate **all** instances under `src/pages/` and `src/components/` during Step 0.

### Out-of-scope artifacts (closed elsewhere)

- `src/pages/api/leads/submit.ts:148-163` — closed-as-no-action under REC-SITE-005 (dead code).
- Any `Optic Up` mention in comments, build configs, README — historical, not customer-facing.

### How the fallback would render today

Under normal operation, `tenant.name` returns "אופטיקה פריזמה" from `v_public_tenant`. The fallback only fires if:
1. Supabase request fails (network error / RLS issue / view broken)
2. Tenant resolution returns null (slug mismatch / DNS misroute)
3. Build-time SSG fails to fetch tenant data

In all 3 failure modes, today's user sees "Optic Up" — branding mismatch. This SPEC eliminates that.

---

## 3. The SaaS-clean design

### New helper: `resolveTenantNameFallback(request, locale)`

In `src/lib/tenant.ts`, add an exported function that:

1. **Tries** to extract a tenant slug from the request hostname:
   - Custom domain match: query a small **build-time-cached map** of `custom_domain → name_he/name_en/name_ru` (see §4-B).
   - Subdomain match: `[slug].opticalis.co.il` → derive from slug-config map.
   - Fallback: generic-but-localized "Optical Store" / "אופטיקה" / "Оптика".
2. Returns the localized name appropriate for the requested `locale` (he/en/ru).

### Build-time-cached fallback map

To avoid runtime DB calls in failure paths (the whole point of a fallback is "what to render when DB is down"), the map is **generated at build time** by a script that queries Supabase ONCE during `npm run build` and writes the result to `src/data/tenant-fallback-map.json`. The TenantNameFallback function reads from this static JSON, never the DB.

**Example output:**
```json
{
  "prizma-optic.co.il": { "he": "אופטיקה פריזמה", "en": "Prizma Optic", "ru": "Оптика Призма" },
  "prizma": { "he": "אופטיקה פריזמה", "en": "Prizma Optic", "ru": "Оптика Призма" },
  "_default": { "he": "אופטיקה", "en": "Optical Store", "ru": "Оптика" }
}
```

### Pages updated

Each affected file replaces `?? 'Optic Up'` with `?? resolveTenantNameFallback(Astro.request, locale)`.

### Why this is SaaS-clean

- **New tenant onboarding:** add tenant + custom_domain to DB. Run `npm run build`. The map regenerates automatically. ZERO code changes.
- **Failure mode:** if Supabase is down at runtime, the static JSON still works because it was written to disk at build time.
- **The `_default` fallback:** generic "אופטיקה" / "Optical Store" — never customer-visible under normal operation, but if both a build error AND DB error happen simultaneously on a new domain, customer sees a generic-but-respectable fallback, not "Optic Up".

---

## 4. Step 0 — Reproduce-the-bug-first (MANDATORY)

```bash
# 1. Confirm 8 files match the §2 list (and no more, no less):
cd opticup-storefront
grep -rln "Optic Up" src/pages/ src/components/ | sort -u
# expected: exactly 8 .astro files (+ submit.ts which is out-of-scope)

# 2. Confirm tenant.ts doesn't already have a resolveTenantNameFallback function:
grep -n "resolveTenantNameFallback" src/lib/tenant.ts
# expected: 0 results

# 3. Confirm src/data/tenant-fallback-map.json doesn't exist yet:
ls src/data/tenant-fallback-map.json 2>&1
# expected: file not found

# 4. Confirm Supabase tenants query works for prizma:
# (executor uses Supabase MCP)
SELECT slug, name, name_en, name_ru FROM tenants WHERE slug='prizma';
# expected: 1 row with all 3 names populated

# 5. Confirm the live site is currently rendering the prizma name (not the fallback):
curl -sL "https://www.prizma-optic.co.il/" -A "Mozilla/5.0" | grep -oE '<title>[^<]+</title>' | head -1
# expected: contains "פריזמה", NOT "Optic Up"
```

If any check deviates → STOP and reconcile.

---

## 5. Scope

### In scope

**A. New file: `src/data/tenant-fallback-map.json` (generated, gitignored OR committed)**

Decision: **commit it.** Reasons: small (~1KB per tenant), avoids surprise build failures if generation script breaks, gives the source-of-truth a tracked diff history.

**B. New script: `scripts/generate-tenant-fallback-map.mjs`**

Node script that:
1. Connects to Supabase (env-based).
2. Queries: `SELECT slug, name, name_en, name_ru, custom_domain FROM v_public_tenant` (or directly from `tenants` if executor finds the view doesn't include custom_domain).
3. Writes `src/data/tenant-fallback-map.json` keyed by both `slug` and `custom_domain`, with a `_default` entry derived from a hardcoded "generic optical store in 3 languages" baseline.
4. Adds entry to `package.json`: `"build": "node scripts/generate-tenant-fallback-map.mjs && astro build"` (chains generation before Astro build).

**C. New function in `src/lib/tenant.ts`: `resolveTenantNameFallback(request, locale)`**

Reads from the static JSON. Logic:
1. Extract hostname from `request.headers.get('host')` or `new URL(request.url).hostname`.
2. Strip port if present.
3. Strip `www.` prefix.
4. Try exact-match lookup in the map.
5. Try subdomain-of-opticalis.co.il extraction.
6. Fall back to `_default[locale]`.

**D. Update 8 affected `.astro` pages**

Replace each `?? 'Optic Up'` (or `: 'Optic Up'` in ternary) with `?? resolveTenantNameFallback(Astro.request, locale)` (where `locale` is the page's locale — usually 'he', 'en', or 'ru' depending on the page).

For pages already using `getLocalizedName(tenant, 'he')` pattern, replace the **else branch** of the ternary, not the function call itself.

**E. Update `/en/` and `/ru/` subtree pages too**

The audit found 13 instances total — 8 in HE root and 5 in the `/en/` and `/ru/` subtrees. Same fix applies, with appropriate locale param.

### Out of scope

- The dead-code `src/pages/api/leads/submit.ts` — already closed under REC-SITE-005.
- Any non-`.astro` files (build configs, READMEs, etc.) — historical.
- DB-side changes (no schema change; the script is read-only).
- Astro renderer changes.

### Whitelist of write paths

**Storefront repo (`opticup-storefront`):**
1. CREATE `scripts/generate-tenant-fallback-map.mjs`
2. CREATE `src/data/tenant-fallback-map.json` (committed, will be regenerated each build)
3. MODIFY `src/lib/tenant.ts` (add `resolveTenantNameFallback` export)
4. MODIFY 13 `.astro` page files in `src/pages/` (8 root + 5 subtree variants — exact list per Step 0)
5. MODIFY `package.json` (chain the script before astro build)
6. MODIFY `.gitignore` if needed (probably not — we're committing the JSON)

**ERP repo (`opticup`):**
7. CREATE `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/EXECUTION_REPORT.md`
8. CREATE `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/FINDINGS.md`
9. UPDATE `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md` (mark REC-SITE-006 closed)
10. APPEND `__LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md`

No DB writes (the script is SELECT-only). No deploys beyond standard Vercel-on-merge.

---

## 6. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 5 sub-checks PASS |
| 2 | `resolveTenantNameFallback` exported from tenant.ts | grep | function defined + exported |
| 3 | `src/data/tenant-fallback-map.json` exists with prizma + _default entries | file content | both keys present, all 3 langs populated for each |
| 4 | `scripts/generate-tenant-fallback-map.mjs` runs cleanly | `node scripts/generate-tenant-fallback-map.mjs` | exit 0, JSON regenerated identically (idempotent) |
| 5 | All 13 `.astro` files updated | grep `Optic Up` in src/pages/ | 0 results (excluding submit.ts which is out-of-scope) |
| 6 | All 13 `.astro` files import + call `resolveTenantNameFallback` | grep | 13 occurrences |
| 7 | `npm run build` succeeds end-to-end | exit code | 0 |
| 8 | Build output contains the prizma name (not "Optic Up") in homepage `<title>` | grep `dist/index.html` | "פריזמה" present, "Optic Up" absent |
| 9 | Storefront commit on develop | `git log -1 --oneline` | one commit, message starts `feat(storefront): SaaS-clean tenant-name fallback (closes REC-SITE-006)` |
| 10 | ERP commit on develop | `git log -1 --oneline` | one commit, message starts `chore(spec): close M3_TENANT_NAME_FALLBACK_SAAS` |
| 11 | Both repos clean | `git status` | `nothing to commit` |
| 12 | Integrity gate clean (ERP) | `npm run verify:integrity` | exit 0 |
| 13 | Live homepage post-deploy still shows "פריזמה" | curl + grep | PASS (regression check — fallback only fires if main path fails) |
| 14 | Simulated failure: temporarily break `tenant.ts` `resolveTenant()` to return null, run `npm run build`, confirm pages render with prizma name from JSON map (NOT "Optic Up") | local test | PASS — then revert the breakage |
| 15 | Future-tenant test: add a fake tenant row `('demo', 'אופטיקה דוגמה', 'Demo Optic', 'Демо', 'demo.opticalis.co.il')` to a temporary script invocation, regenerate map, verify entry appears for `demo.opticalis.co.il` | script test | demo entry present |

---

## 7. Autonomy Envelope

**Executor MAY autonomously:**
- Read all storefront source files.
- Read-only Supabase queries via MCP for the script.
- CREATE the new script + JSON + tenant.ts function.
- MODIFY the 13 `.astro` pages.
- Run `npm run build` to verify.
- Run criterion 14 (simulated failure test) on local — must REVERT the test breakage before commit.
- Commit + push BOTH repos to develop ONCE each.
- Open the PR-to-main on storefront.

**Executor MUST stop and report:**
- Step 0 finds more than 13 `.astro` instances → STOP, scope drift.
- Step 0 finds fewer than 8 root-level instances → STOP, possibly fixed already (like REC-SITE-002).
- `npm run build` fails → STOP, do not commit.
- Criterion 14 simulated test fails (build still shows "Optic Up" with main path broken) → STOP, fallback not wired correctly.
- Criterion 15 future-tenant test fails → STOP, the script's hostname-keying isn't generic.

**Executor MUST NOT:**
- Push directly to main (Daniel-only PR-merge).
- Modify `submit.ts` (out-of-scope per REC-SITE-005).
- Skip criterion 14 OR criterion 15 — both are the SaaS-clean validation.
- Hardcode any tenant-specific string ("Prizma", "אופטיקה פריזמה") in the script or fallback function. ALL tenant-specific values come from the DB-generated JSON.

---

## 8. Stop-on-Deviation Triggers

In addition to global:
- The generation script needs DB credentials at build time → if executor finds Vercel build doesn't have Supabase env vars → STOP, escalate (Vercel env config is a Daniel decision).
- The committed JSON gets out of sync with DB after a tenant row update → not a stop trigger, just document in EXECUTION_REPORT that future tenant changes require a build re-run (this is the by-design SaaS pattern).

---

## 9. Expected Final State

**On disk (storefront commit X, ERP commit Y):**
- 1 new script, 1 new data file, 14 modified files (13 pages + tenant.ts), 1 modified package.json.
- ERP retro + HANDOFF + DECISIONS_LOG updated.

**On production (post-Vercel-deploy):**
- Live storefront identical to today under normal operation.
- Failure modes (Supabase outage, RLS misconfig, etc.) now render "אופטיקה פריזמה" / "Prizma Optic" / "Оптика Призма" by locale, never "Optic Up".

**Future onboarding:** when a second tenant is added to the DB and gets a custom domain, no code changes needed — the next deploy regenerates the map.

---

## 10. Commit Plan

**Storefront commit:**
```
feat(storefront): SaaS-clean tenant-name fallback (closes REC-SITE-006)

Removes 13 hardcoded '?? Optic Up' fallbacks from src/pages/ and replaces
with resolveTenantNameFallback(Astro.request, locale) backed by a
build-time-generated static JSON map (src/data/tenant-fallback-map.json).

The map is regenerated each build via scripts/generate-tenant-fallback-map.mjs
which queries v_public_tenant for slug/name/name_en/name_ru/custom_domain.

SaaS-clean by design: when a new tenant is added to the DB, the next
build regenerates the map and the fallback works correctly for that
tenant's domain — zero code changes.

Failure mode: if main resolveTenant() returns null at runtime (Supabase
outage etc), pages render the tenant's localized name from the static
JSON instead of "Optic Up".

Daniel-confirmed preference: SaaS-clean fix over quick-and-dirty
mass-replace. Memory: feedback_always_saas_clean.md.
```

**ERP commit:**
```
chore(spec): close M3_TENANT_NAME_FALLBACK_SAAS

Closes REC-SITE-006. EXECUTION_REPORT + FINDINGS in SPEC folder.
HANDOFF marks REC-SITE-006 as closed via SaaS-clean fallback resolver.
```

---

## 11. Methodology — failure-mode test (criterion 14)

This is the heart of the validation. Before committing, the executor runs:

```bash
cd opticup-storefront

# 1. Backup tenant.ts
cp src/lib/tenant.ts src/lib/tenant.ts.bak

# 2. Patch resolveTenant to force a failure mode
sed -i 's/return resolveBySlug(tenantSlug);/return null; \/\/ TEMP for SaaS-clean test/' src/lib/tenant.ts

# 3. Build
npm run build

# 4. Inspect dist/index.html
grep -oE '<title>[^<]+</title>' dist/index.html | head -1
# expected: contains "פריזמה" (from JSON fallback), NOT "Optic Up"

# 5. Restore
mv src/lib/tenant.ts.bak src/lib/tenant.ts

# 6. Re-build to leave the tree clean
npm run build
```

If step 4 shows "פריזמה" — the SaaS-clean fallback is working correctly. Document the test in EXECUTION_REPORT §X.
If step 4 shows "Optic Up" — STOP, the fallback isn't wired right.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-08:
- No prior `resolveTenantNameFallback` exists in tenant.ts. ✓
- No prior `src/data/tenant-fallback-map.json` exists. ✓
- No prior `scripts/generate-tenant-fallback-map.mjs` exists. ✓
- `v_public_tenant` view exposes `name`, `name_en`, `name_ru` (verified earlier in M3_PHONE_TEMPLATING_AND_CLEANUP). ✓
- The 8+5=13 `.astro` files are all distinct, no duplicate file paths. ✓
- L-PROJECT-001 (no decorative real-looking demo values): the `_default` map fallback uses generic "אופטיקה" / "Optical Store" — these are placeholders by design, NOT realistic-looking. ✓
- L-PROJECT-002 (jsonb writes require type preservation): N/A — no DB writes.
- SaaS litmus test: applied + passed. ✓

**0 collisions.**

---

## 13. Lessons already incorporated

- **`feedback_always_saas_clean.md` (just-saved Daniel preference):** this SPEC implements option #2 (SaaS-clean), not option #1 (quick-fix). Estimated cost ~2 hours vs ~30 min — accepted as Daniel's default.
- **Step 0 + criterion 14 (failure-mode test):** validate the fallback actually fires correctly, not just that the code compiles.
- **Criterion 15 (future-tenant test):** validates the SaaS scaling claim on the next-tenant boundary.
- **Build-time generation pattern:** avoids runtime DB calls in the fallback path (which would defeat the purpose — fallbacks must work when DB is unreachable).

---

## 14. Estimated effort

- 1.5-2.5 hours executor wall time. Bulk: 13 page edits + 1 new function + 1 new script + criterion 14/15 testing.
- One Daniel interaction: PR-merge button click on storefront repo.

---

## 15. Definition of Done

All 15 success criteria pass. Two commits (storefront + ERP). Both repos clean. REC-SITE-006 marked CLOSED. Future-tenant onboarding requires zero code changes for the name fallback.

---

*End of SPEC.*
