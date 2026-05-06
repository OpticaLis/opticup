# SPEC — M4_HARDCODED_PRIZMA_REMOVAL

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_HARDCODED_PRIZMA_REMOVAL/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-05-06
> **Module:** 4 — CRM
> **Phase:** post-cutover SaaS-readiness hardening
> **Severity:** CRITICAL (Iron Rule 9 violation; SaaS-onboarding blocker for tenant 2)

## 1. Goal

Remove every hardcoded "Prizma"-specific business value from M4 source code, replace with `tenants` table reads. After this SPEC, tenant 2 onboarding requires only INSERTing a tenants row + associated records — zero code changes. Closes Phase 1 audit findings G-CRIT-4 (WhatsApp), G-HIGH-3 (STOREFRONT_URL in 3 EFs), G-HIGH-6 (brand gold colors in event-register.css), G-HIGH-7 (messaging template defaults: address, phone, URLs).

## 2. Background & Motivation

Phase 1 audit Track I §4 documented 7 hardcoded-value sites. Live verification 2026-05-06 against `tenants` table:
- **Schema is ready:** `tenants` already has `business_phone`, `business_address`, and `ui_config JSONB` columns.
- **Data is missing:** `prizma` row has `business_phone=NULL`, `business_address=NULL`, `ui_config={"default_waze_url":"..."}` (only Waze populated). The remaining values exist ONLY hardcoded in source.

**SaaS impact:** When tenant 2 onboards (e.g. אופטיקה X in city Y), every customer-facing surface from M4 will display Prizma's WhatsApp, address, brand colors, and storefront URL — because the source quotes them as literal strings. The bug is invisible at single-tenant scale; the moment a 2nd tenant is added, every customer page renders cross-tenant data.

**This SPEC is the largest Iron Rule 9 closure of the post-cutover backlog.**

### Sites to fix (all verified 2026-05-06 from Phase 1 report)

| # | File | Line(s) | Hardcoded value | Target source |
|---|------|---------|-----------------|---------------|
| 1 | `modules/crm/event-register.js` | 62 | `wa.me/972533645404` + visible `053-3645404` | `tenants.ui_config.whatsapp_phone_e164` + `tenants.ui_config.support_phone_display` |
| 2 | `modules/crm/event-register.css` | 9-11 | `--gold: #c9a555; --gold-light: #e8da94; --gold-hover: #b8943f` | `tenants.ui_config.brand` JSONB → injected as inline `<style>` from JS at page load |
| 3 | `modules/crm/crm-messaging-templates.js` | 337 | `'הרצל 32, אשקלון'` (default `%event_location%`) | `tenants.business_address` |
| 4 | `modules/crm/crm-messaging-templates.js` | 338 | `'050-717-5675'` (default `%phone%`) | `tenants.business_phone` |
| 5 | `modules/crm/crm-messaging-templates.js` | 339-340 | `'prizma-optic.co.il/r/...'` + `/u/...` | `tenants.ui_config.storefront_url` |
| 6 | `supabase/functions/quick-register/index.ts` | 23 | `STOREFRONT_URL = "https://prizma-optic.co.il"` | `tenants.ui_config.storefront_url` (per-request lookup) |
| 7 | `supabase/functions/send-message/url-builders.ts` | 19 | `STOREFRONT_URL = "https://prizma-optic.co.il"` | same |
| 8 | `supabase/functions/resolve-link/index.ts` | 10 | `STOREFRONT_URL = "https://prizma-optic.co.il"` | same |

### Architecture

**JSONB schema for `tenants.ui_config` (extend, don't replace existing keys):**
```json
{
  "default_waze_url": "...",   // already present, untouched
  "whatsapp_phone_e164": "972533645404",
  "support_phone_display": "053-3645404",
  "storefront_url": "https://prizma-optic.co.il",
  "brand": {
    "gold":       "#c9a555",
    "gold_light": "#e8da94",
    "gold_hover": "#b8943f"
  }
}
```

**Top-level columns to populate:**
- `tenants.business_phone` = `'050-717-5675'` for prizma (current default in `crm-messaging-templates.js:338`)
- `tenants.business_address` = `'הרצל 32, אשקלון'` for prizma (current default in `crm-messaging-templates.js:337`)

These already exist as columns; just need values populated for prizma. Demo gets sensible test values.

### EF helper to add

`supabase/functions/_shared/tenant-config.ts` (NEW — shared module):
```ts
export async function loadTenantConfig(db: any, tenantId: string): Promise<{
  storefront_url: string | null,
  whatsapp_phone_e164: string | null,
  support_phone_display: string | null,
  business_phone: string | null,
  business_address: string | null,
  brand: { gold: string, gold_light: string, gold_hover: string } | null,
  ui_config: Record<string, unknown>
}> {
  // Single SELECT against tenants. Returns null fields when missing — caller decides fallback.
}
```

Reused by quick-register, send-message, resolve-link, and any future EF that needs tenant-scoped config.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at end | `develop`, clean | `git status` |
| 2 | Commits produced | 4 (1 migration + 3 code commits) + 1 retrospective = 5 | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | Migration file at `migrations/2026_05_06_tenant_config_seed_up.sql` (+ `_down.sql`) | both exist | `ls` |
| 4 | Post-migration: prizma `business_phone='050-717-5675'`, `business_address='הרצל 32, אשקלון'`, `ui_config` has 5 NEW keys | SELECT | SQL |
| 5 | Post-migration: demo `ui_config` has same keys with test values | SELECT | SQL |
| 6 | New shared EF helper `_shared/tenant-config.ts` | exists | `ls` |
| 7 | EF deploys: `quick-register` v6, `send-message` v20, `resolve-link` v3 (each +1 from current) | `get_edge_function` returns expected versions | MCP |
| 8 | `event-register.js:62` no longer contains `972533645404` literal | grep | `grep -n "972533645404" modules/crm/event-register.js` returns 0 lines |
| 9 | `event-register.css:9-11` no longer contains gold hex codes | grep | `grep -nE "#c9a555\|#e8da94\|#b8943f" modules/crm/event-register.css` returns 0 lines |
| 10 | `crm-messaging-templates.js` no longer contains hardcoded address/phone/URL | grep | 3 separate greps return 0 lines |
| 11 | `quick-register/index.ts` + `send-message/url-builders.ts` + `resolve-link/index.ts` no longer have `STOREFRONT_URL` literal | grep | 3 greps |
| 12 | E2E Test 1 — public form on demo loads with demo's brand color (different from prizma's gold) | visual via Chrome | screenshot diff |
| 13 | E2E Test 2 — confirmation SMS to whitelist contact still renders correct WhatsApp + address + phone for demo | inspect message_log content | SQL |
| 14 | E2E Test 3 — short link `/r/{code}` resolves on prizma + demo correctly | curl | follow redirect |
| 15 | Whitelist enforcement | phone `0537889878`, email `daniel@prizma-optic.co.il` only | as before |
| 16 | Prizma writes outside the tenant_config seed migration | 0 | sanity |
| 17 | Integrity gate | exit 0 or 2 | `npm run verify:integrity` |

## 4. Autonomy Envelope

### CAN do without asking
- Write the seed migration (`_up` + `_down`)
- Apply migration via Supabase MCP `apply_migration`
- Edit the 5 source files listed in §2
- Create the new shared helper file
- Deploy 3 EFs via Supabase MCP (with §10 CLI fallback if MCP returns 5xx ×2)
- Run E2E tests on demo with whitelist contacts
- SELECT-only on prizma for sanity verification
- Soft-delete demo test data at end
- Commit + push to `develop`
- Update Module's CHANGELOG, SESSION_CONTEXT, db-schema.sql, MODULE_MAP (the new helper is a public function)

### REQUIRES stopping
- Any prizma write outside the seed migration's UPDATE
- Test message firing to non-whitelist contact
- Source-file edit beyond the 5 listed in §2
- Test that reveals the new tenant_config lookup adds noticeable latency to EF response (>200ms increase) — log + escalate
- DDL beyond the migration's UPDATEs (no schema changes — only column value updates + JSONB key additions)
- Iron Rule 12 violation — measure each touched file post-edit; the only file at risk is `crm-messaging-templates.js` (currently 343/350 — adding tenant_config wiring may push over). If post-edit exceeds 350, extract the wiring to a helper file in the same commit.
- Merge to main
- Total runtime exceeding 3 hours (this is the largest SPEC of the cycle)

## 5. Stop-on-Deviation Triggers

- Migration apply returns non-200 → STOP, do not retry
- After EF deploys, any short-link resolution returns 4xx/5xx for either tenant → STOP, revert deploys
- After client-JS edits, the demo CRM event-registration form fails to load OR shows console errors → STOP, revert
- E2E Test 2 confirmation SMS shows wrong values (prizma's instead of demo's) for a demo-tenant test lead → STOP, the lookup chain is broken
- prizma write attempt outside the migration → STOP, log CRITICAL
- Any hardcoded value reappears in the same file post-edit (incomplete deletion) → STOP, redo

## 6. Rollback Plan

5 commits, each its own revert point. To roll back fully:
1. `git revert <retrospective>` (no-op for code)
2. `git revert <ef_deploys_commit>` — then re-deploy v5/v19/v2 from previous source
3. `git revert <client_code_commit>` — restores hardcoded JS/CSS
4. `git revert <migration_commit>` — and apply the `_down.sql` migration
5. EF redeploys: previous versions from git; CLI:
   ```
   supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit
   supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
   supabase functions deploy resolve-link --no-verify-jwt --project-ref tsxrrxzmdxaenlvocyit
   ```
   (Verify each EF's `verify_jwt` setting before adding/omitting the flag.)

The `_down.sql` migration UNSETs the new ui_config keys + reverts business_phone/address to NULL on prizma. Demo values stay (test data, not blocking).

## 7. Out of Scope (DO NOT touch)

- The 12 anon-callable SECURITY DEFINER RPCs (G-CRIT-2) — separate Part 2 SPEC
- Storefront repo (none of the changes here cross repo boundaries — the 3 EFs are server-side; the storefront's own hardcoded values are storefront-repo's CLAUDE.md scope)
- Email template bodies — they reference the same Prizma values via `%event_location%`, `%phone%`, etc. The DEFAULTS in `crm-messaging-templates.js` are what this SPEC fixes; the templates themselves continue to use the substitution variables.
- Hardcoded Prizma references in research/mockup HTMLs (Track I §4 LOW) — those are inert
- Anon JWT in EFs (G-HIGH-2) — separate SPEC
- The `crm-helpers.js:85` `'too_far'` Ashkelon-radius logic (G-MED-4) — defer; needs business decision on radius semantics for tenant 2
- VM mount drift — leave alone

## 8. Expected Final State

### New files
- `migrations/2026_05_06_tenant_config_seed_up.sql` — UPDATE prizma + demo tenants rows
- `migrations/2026_05_06_tenant_config_seed_down.sql` — revert prizma changes; demo stays
- `supabase/functions/_shared/tenant-config.ts` — new shared helper

### Modified files (5 source)
- `modules/crm/event-register.js` — read WhatsApp from injected tenant config
- `modules/crm/event-register.css` — remove hardcoded gold; receive via inline `<style>` from JS
- `modules/crm/crm-messaging-templates.js` — replace 3 hardcoded defaults with `tenant.business_*` / `tenant.ui_config.*` reads
- `supabase/functions/quick-register/index.ts` — replace `STOREFRONT_URL` constant with `loadTenantConfig().storefront_url`
- `supabase/functions/send-message/url-builders.ts` — same pattern
- `supabase/functions/resolve-link/index.ts` — same pattern

### Migration content (forward)

```sql
BEGIN;

-- Populate prizma's hardcoded values into tenants row
UPDATE public.tenants
   SET business_phone = '050-717-5675',
       business_address = 'הרצל 32, אשקלון',
       ui_config = ui_config || jsonb_build_object(
         'whatsapp_phone_e164',    '972533645404',
         'support_phone_display',  '053-3645404',
         'storefront_url',         'https://prizma-optic.co.il',
         'brand', jsonb_build_object(
           'gold',       '#c9a555',
           'gold_light', '#e8da94',
           'gold_hover', '#b8943f'
         )
       )
 WHERE slug = 'prizma';

-- Demo tenant: same keys with TEST values so demo doesn't accidentally render prizma data
UPDATE public.tenants
   SET business_phone = '050-000-0000',
       business_address = 'דוגמה 1, דמו',
       ui_config = ui_config || jsonb_build_object(
         'whatsapp_phone_e164',    '972500000000',
         'support_phone_display',  '050-000-0000',
         'storefront_url',         'https://demo.opticalis.co.il',
         'brand', jsonb_build_object(
           'gold',       '#059669',
           'gold_light', '#d1fae5',
           'gold_hover', '#047857'
         )
       )
 WHERE slug = 'demo';

COMMIT;
```

### Modified docs
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — append
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — current focus
- `modules/Module 4 - CRM/docs/db-schema.sql` — append the JSONB schema notation
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — register the new shared helper `loadTenantConfig`

### NOT modified
- `MASTER_ROADMAP.md` (no phase boundary)
- `docs/GLOBAL_MAP.md` / `docs/GLOBAL_SCHEMA.sql` (deferred to Integration Ceremony)

## 9. Commit Plan

5 commits total:

- **Commit 1:** `feat(crm): seed tenant_config for prizma + demo (M4_HARDCODED_PRIZMA_REMOVAL)` — migration files + db-schema.sql update
- **Commit 2:** `feat(crm): _shared/tenant-config.ts helper for EF tenant lookups` — new helper file + MODULE_MAP entry
- **Commit 3:** `fix(crm): client JS/CSS reads tenant config instead of hardcoded prizma values` — 3 files in `modules/crm/`
- **Commit 4:** `fix(crm): 3 EFs use tenant_config.storefront_url instead of hardcoded constant` — 3 EF files + deploys
- **Commit 5:** `chore(spec): close M4_HARDCODED_PRIZMA_REMOVAL with retrospective`

Push after each commit. Do NOT merge to main.

## 10. Dependencies / Preconditions

- Branch `develop`, clean
- Supabase MCP available (`apply_migration`, `execute_sql`, `deploy_edge_function`, `get_edge_function`)
- Demo tenant accessible — login PIN `12345`
- Whitelist contacts: phone `0537889878`, email `daniel@prizma-optic.co.il`
- Storefront origin reachable (for E2E Test 1 visual verification)

### Edge Function deploy fallback
If MCP `deploy_edge_function` returns 5xx ×2 for any of the 3 deploys, escalate to Daniel:
```
cd C:\Users\User\opticup
supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit
supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
supabase functions deploy resolve-link --no-verify-jwt --project-ref tsxrrxzmdxaenlvocyit
```
Verify each EF's `verify_jwt` config before adding/omitting `--no-verify-jwt`:
- `quick-register`: verify_jwt=true → no flag
- `send-message`: verify_jwt=true → no flag
- `resolve-link`: verify_jwt=false → flag included

## 11. Lessons Already Incorporated

- **From M4_TENANT_ISOLATION_HARDENING_PART1 FOREMAN_REVIEW (just closed):** the new opticup-strategic Step 1.5 §6 `pg_proc.prosrc` source-search check was applied here — the SPEC's listed file paths (`event-register.js:62`, `event-register.css:9-11`, etc.) were verified live by grep, not cited from memory.
- **From M4_PUBLIC_FORM_VARIABLES_HIGH FOREMAN_REVIEW Author Proposal 2:** migration files use `_up.sql/_down.sql` convention (now in SPEC_TEMPLATE).
- **From M4_UNSUB_SUPPRESSION_CRIT FOREMAN_REVIEW:** §10 CLI deploy fallback embedded for all 3 EFs with verify_jwt-flag note per EF.
- **From feedback_overseer_decision_patterns.md:** SPEC scope is "bounded + safe" (4 commits, clear blast radius per commit) instead of one mega-commit.
- **From `feedback_test_phone_numbers.md`:** real SMS fires on demo. Whitelist enforced.
- **From `feedback_production_discipline_post_cutover.md`:** prizma is live. Migration UPDATEs prizma row but ONLY value-additions, no policy changes.
- **Iron Rule 9 (no hardcoded business values):** this entire SPEC is the closure of the largest Iron Rule 9 violation in M4.
- **Iron Rule 22 (defense in depth):** the new helper does its own SELECT (no caching across EF instances) AND the seed migration sets safe defaults so a missing config key doesn't render `undefined` to customers.

**Cross-Reference Check (Step 1.5):** New names introduced:
- `loadTenantConfig` (TypeScript function) — not in pg_proc, not in MODULE_MAP — clean
- `_shared/tenant-config.ts` (file) — not in FILE_STRUCTURE — clean
- 5 new keys in `tenants.ui_config` JSONB (`whatsapp_phone_e164`, `support_phone_display`, `storefront_url`, `brand.gold`, `brand.gold_light`, `brand.gold_hover`) — verified via SELECT that none currently exist in any tenant's ui_config — clean

0 collisions, 6 new identifiers approved.

## 12. QA Plan

After each commit's deploy/migration:

**After commit 1 (migration):**
1. SELECT prizma + demo from `tenants`; confirm `business_phone`, `business_address`, and 5 new `ui_config` keys all populated correctly per §8.

**After commit 4 (EF deploys):**
2. Test 3 — short links: `curl -L -o /dev/null -w "%{http_code}" https://prizma-optic.co.il/r/<existing_code>` returns 200 (resolves end-to-end). Same for a demo-context short link.
3. Test 2 — confirmation SMS: register whitelist lead to a demo event via the public form (or directly via send-message with `template_slug=event_registration_confirmation`). Inspect `crm_message_log.content` — confirm the body shows `050-000-0000`, `'דוגמה 1, דמו'`, demo's storefront URL — NOT prizma's values.
4. Test 1 — public form visual: open `event-register?token=<demo-token>` in Chrome. Page should render with demo's primary green (`#059669`) accents — NOT prizma's gold.

**Cleanup:**
5. Soft-delete test leads on demo.
6. Verify §3 success criteria #1-#17.

If Test 2 shows prizma's values for a demo lead → CRITICAL deviation, the tenant-context resolution is broken. Revert all commits.

*End of SPEC.*
