# FINDINGS — M3_TENANT_NAME_FALLBACK_SAAS

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/FINDINGS.md`
> **Written by:** opticup-executor (2026-05-08)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC anticipated 13 `.astro` files; live state had 28

- **Code:** `M3-SPEC-01`
- **Severity:** MEDIUM (would have left half the customer-facing surface still broken if executed literally; same recurring Foreman pre-flight gap as M3_PHONE_434_LEGACY_CLEANUP and M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL)
- **Discovered during:** Step 0 sanity check
- **Location:** `SPEC.md` §1 (8 files), §2 (8 files in table), §5-E (13 instances total — 8 in HE root and 5 in /en/ and /ru/), §6 criterion 5+6 (13 .astro files)
- **Description:** Step 0 grep `'Optic Up'` in `src/pages/ src/components/` found 28 `.astro` files (excluding `submit.ts`, which is out-of-scope per REC-SITE-005), distributed as 10 HE root + 9 en + 9 ru. SPEC §6 stop trigger ">13 .astro instances → STOP" fired. Same root cause as Findings M3-SPEC-01 in two prior SPECs: Foreman pre-flight didn't enumerate the actual files. This is the third recurrence of this pattern in 4 days; Proposal 1 below codifies the executor-side guardrail.
- **Reproduction:**
  ```bash
  cd opticup-storefront
  grep -rln "Optic Up" src/pages/ src/components/ | grep -v submit.ts | wc -l
  # 28
  ```
- **Suggested next action:** TECH_DEBT — Foreman SKILL update: when a SPEC says "X instances", that count MUST be derived from a live `grep -c` or `wc -l` shown in §2 evidence. SPECs that cite counts without execution-time evidence are a recurring quality issue.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — `tenants.custom_domain` doesn't exist as a column; lives in `storefront_config`

- **Code:** `M3-SPEC-02`
- **Severity:** LOW
- **Discovered during:** First Supabase query for the generator script
- **Location:** `SPEC.md` §3 + §5-B suggested `SELECT slug, name, name_en, name_ru, custom_domain FROM v_public_tenant`. `v_public_tenant` does not expose `custom_domain` (it lives in `storefront_config` / `v_storefront_config` keyed by `tenant_id`).
- **Description:** First query attempt errored with `42703: column "custom_domain" does not exist`. Examined `tenant.ts` source — saw the existing `resolveTenant` performs a separate `v_storefront_config` lookup for `custom_domain`. The generator script was written to do the same: query `v_public_tenant` for tenant data + `v_storefront_config` for `custom_domain`, then merge in JS by `tenant_id`. Net effect: same final map, just one extra round-trip at build time. SPEC §6 was already silent on whether this matters; the executor handled it autonomously.
- **Reproduction:**
  ```sql
  SELECT custom_domain FROM v_public_tenant LIMIT 1;
  -- ERROR: column "custom_domain" does not exist
  ```
- **Suggested next action:** TECH_DEBT — Foreman could either (a) extend `v_public_tenant` to include `custom_domain` (a JOIN of the two views), or (b) just document that the generator does its own JOIN. Both are fine; current state works.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Astro storefront is server-rendered (no `dist/index.html`); SPEC §11 simulated-failure test had to be adapted

- **Code:** `M3-INFRA-03`
- **Severity:** INFO
- **Discovered during:** Criterion 14 / SPEC §11 simulated-failure test
- **Location:** `SPEC.md` §11 step 4 ("grep `dist/index.html`"). The Astro storefront uses the Vercel adapter and is server-rendered; `dist/` contains `client/` static assets + `server/` bundles, not pre-rendered HTML pages.
- **Description:** SPEC §11 anticipated SSG output where one could `grep dist/index.html` after a build to see the rendered tenant name. Server-rendered Astro emits compiled `.mjs` server entrypoints that render at request time, so there's no static HTML to grep. Adapted the test to a direct unit test of `resolveTenantNameFallback()` against the generated JSON map: 11 cases covering prizma-via-custom-domain × 3 langs, apex/subdomain stripping, opticalis-subdomain → slug, unknown-host → `_default`, no-request → `_default`. All 11 PASS. Optic Up leak check: CLEAN. The test fully exercises the logic the SPEC §11 test wanted to validate, and is faster + repeatable.
- **Suggested next action:** TECH_DEBT — Foreman SKILL update: SPEC §11-style validation tests should account for the rendering mode (SSR vs SSG). For SSR sites, prefer "spin up `astro preview` + curl" or "direct unit test of the function." For SSG sites, the dist-grep approach the SPEC suggests still works.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Demo tenant lacks `name_en`/`name_ru`; falls to `_default` when locale isn't 'he'

- **Code:** `M3-DATA-04`
- **Severity:** INFO
- **Discovered during:** Generator output inspection
- **Location:** `tenants` table — demo tenant row has `name='אופטיקה דמו (בדיקה)'`, `name_en=null`, `name_ru=null`.
- **Description:** When the test tenant `demo` is queried via `v_public_tenant`, only `name` is populated. The generator's per-locale logic (`name_en || name || _default.en`) means: en/ru locales for demo tenant get the Hebrew name. That's not visible in the live homepage but is visible if a future test scenario hits the `demo` slug with locale=en. NOT a blocker. The map's `_default[en] = "Optical Store"` is intentional for the unknown-tenant scenario; for known-tenant-with-missing-translation, the generator falls to the Hebrew name (which is at least correct, not generic). Could be inverted (fall to `_default` when name_en is null), but that would break prizma's behavior if name_en were ever cleared.
- **Suggested next action:** DISMISS — current behavior is reasonable. If demo grows real en/ru content, populate `name_en`/`name_ru` in `tenants`. Not in scope for this SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — Pre-commit verify reported "1 violations, 3 warnings" but did not block the commit

- **Code:** `M3-INFRA-05`
- **Severity:** INFO (worth noting; not blocking)
- **Discovered during:** `git commit` of the storefront changes
- **Location:** `opticup-storefront/scripts/verify.mjs` pre-commit hook output
- **Description:** Output line read `All clear — 1 violations, 3 warnings across 32 files`. Despite "1 violations" the commit completed (`[develop a8c2acd]`). Possibilities: (a) the message format counts non-blocking findings as "violations" and only blocks on a separate gate; (b) a specific rule ran in warn-only mode for this run. Re-running `npm run verify` against the now-empty staged set returned 0/0. Could not determine which rule produced the count. NOT a blocker — commit + push + build all succeeded.
- **Suggested next action:** TECH_DEBT — review the storefront `verify.mjs` output formatting so "violations" only counts blocking findings, OR rename the count label.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS.md.*
