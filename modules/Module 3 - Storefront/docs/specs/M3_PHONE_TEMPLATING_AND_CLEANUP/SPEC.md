# SPEC — M3_PHONE_TEMPLATING_AND_CLEANUP

**Module:** Module 3 — Storefront
**Author:** opticup-strategic (Site Overseer Foreman)
**Created:** 2026-05-07
**Type:** Customer-facing data fix + architecture (template) + cleanup
**Severity of bug being closed:** CRITICAL (rendered customer-contact phone is wrong on every homepage in 3 langs + 21 CMS rows)
**Closes:** REC-SITE-002 (HANDOFF 2026-05-07) and partially REC-SITE-014 (`_deprecated/`)

---

## 1. Goal

Two things, indivisible:

**1. Fix.** Replace every live, customer-facing occurrence of phone `053-434-7265` (defunct WP-era line) with the correct Prizma support line `053-364-5404` across the storefront's CMS rows, source files, and one misnamed binary artefact. **Direct customer harm right now** (user calls a defunct number).

**2. Architecture.** Introduce a **two-channel phone template** model in tenant config so that today both channels render the same number, but Daniel can split them in the future without touching site content again:

| Channel | Purpose | Where it renders | Initial value |
|---|---|---|---|
| `phone_general` | Default site-wide contact (footer, top-bar, contact page, terms, FAQ, generic CTAs) | Everywhere except product catalog/PDP | `053-364-5404` |
| `phone_catalog` | Product-page contact (PDP, brand pages, product listings, "ask about this product" CTAs, future WhatsApp deep-links from product pages) | Product detail pages, brand pages, product cards | `053-364-5404` (same as general today) |

Both channels resolve via **a single source of truth in `tenants.ui_config`**. The storefront reads the channel-appropriate value via tenant config — never a hardcoded literal. When Daniel later changes `phone_catalog` to a branch number, every product surface updates automatically; the rest of the site stays on `phone_general`. **No content edits required at flip time.**

**Why this SPEC exists:** the audit that closed yesterday found 21 CMS rows + the homepage hero rendering `053-434-7265` — a number that was never a real Prizma support line for the current org structure. Daniel's directive: "תחליף את המספר הזה ב053-364-5404 ... חשוב שזה יהיה בנוי בצורת טמפלייט שלא תצטרך להחליף בכל מקום בנפרד." This SPEC operationalizes both halves of that directive in a single atomic change.

---

## 2. Background (verified live, 2026-05-07)

### Where the wrong number lives RIGHT NOW

**A. CMS — `storefront_pages.blocks` (21 published rows for tenant=prizma):**
| Slug | Langs | page_type |
|---|---|---|
| `/` | en, he, ru | homepage |
| `/deal/` | en, he, ru | legal |
| `/privacy/` | en, he, ru | legal |
| `/terms/` | en, he, ru | legal |
| `/משלוחים-והחזרות/` | en, he, ru | legal |
| `/צרו-קשר/` | en, he, ru | custom |
| `/שאלות-ותשובות/` | en, he, ru | custom |

(Verified by Site Overseer Foreman 2026-05-07 via `SELECT slug, lang, page_type FROM storefront_pages WHERE tenant_id=(prizma) AND status='published' AND blocks::text LIKE '%053-434-7265%'`. The previous audit's "24 rows" figure included variant formats (with/without dashes, leading 0); the canonical-format match is 21.)

**B. Storefront repo source (15 files):**
- `src/_deprecated/legal-terms.ts` — defunct, slated for delete
- `src/_deprecated/legal-privacy.ts` — defunct, slated for delete
- `sql/031-seed-pages.sql` — seed file (historical; left as record but updated)
- `public/images/lab/israel-hayom-logo.png` — **misnamed**: file is HTML, not a PNG. Delete.
- `docs/wp-general-page.html`, `docs/TRANSLATION-REVIEW-2026-04-06.md`, `docs/TRANSLATION-REVIEW-2026-04-05.md`, `docs/TRANSLATION-BACKUP-2026-04-05.json`, `docs/SEO_PARITY_AUDIT.md` — historical/audit records (reference data; flagged in §11.2 below; do not edit per discipline of historical documents)
- `.claude/text.txt`, `.claude/terms_astro.html`, `.claude/privacy_astro.html`, `.claude/deal_astro.html` — local Claude scratch (gitignored by convention; not customer-facing; out of scope)
- `scripts/seo/output/missing-pages-content.json`, `scripts/seo/output/landing-pages-content.json` — generated SEO scrape outputs (regenerable; not edited directly)

**C. Tenant config (current state):**
- `tenants.business_phone` for prizma = `053-3645404` ✓ (correct)
- `tenants.ui_config.support_phone_display` = `053-3645404` ✓ (correct)
- `tenants.ui_config.whatsapp_phone_e164` = `972533645404` ✓ (correct)

**Critical observation:** today the CMS rows for `/`, `/terms/`, `/privacy/`, `/deal/`, `/צרו-קשר/`, `/שאלות-ותשובות/`, `/משלוחים-והחזרות/` carry the phone as **a literal string inside the `blocks` JSON**. They do NOT reference tenant config. That is why the `business_phone` correction yesterday did NOT fix these pages. **The fix has to happen at the data layer for the CMS rows AND at the architecture layer for the future.**

### Where `tenant?.phone` is already wired in source

`tenant?.phone` is already read from `v_public_tenant.phone` (which maps to `tenants.business_phone`) in `src/lib/tenant.ts`. The `Header.astro` and `Footer.astro` components consume it. The CMS rows are the gap — they bypass tenant config entirely.

---

## 3. Step 0 — Reproduce-the-bug-first (MANDATORY)

Before authoring §1 of any change, the executor MUST run these verifications:

```bash
# 1. Live storefront still shows the wrong number on the homepage:
curl -sL "https://prizma-optic.co.il/" | grep -c "053-434-7265"
# expected: ≥ 1 (probably 1-2; the rendered hero/footer block)

# 2. CMS row count for the wrong number:
# Supabase MCP execute_sql:
#   SELECT COUNT(*) FROM storefront_pages
#   WHERE tenant_id=(SELECT id FROM tenants WHERE slug='prizma')
#   AND status='published' AND blocks::text LIKE '%053-434-7265%';
# expected: 21

# 3. tenant config still correct:
# Supabase MCP execute_sql:
#   SELECT business_phone, ui_config->>'support_phone_display' FROM tenants WHERE slug='prizma';
# expected: business_phone='053-3645404', support_phone_display='053-3645404'

# 4. Confirm new ui_config keys do NOT yet exist (this SPEC creates them):
#   SELECT ui_config ? 'phone_general', ui_config ? 'phone_catalog' FROM tenants WHERE slug='prizma';
# expected: false, false
```

If any of (1), (2), (3) deviates → STOP and report. The premise has shifted.

---

## 4. Scope

### In scope

**A. tenant config — add 2 new ui_config keys (Level 2 SQL UPDATE on prizma + demo):**
- `ui_config.phone_general` = `'053-364-5404'` (prizma) / `'050-000-0000'` (demo placeholder, per existing demo convention)
- `ui_config.phone_catalog` = `'053-364-5404'` (prizma) / `'050-000-0000'` (demo)

**B. Storefront source code — wire the templates and consume them:**
- `src/lib/tenant.ts` — extend `TenantConfig` shape with `phone_general` and `phone_catalog` (both `string | null`); read from `v_public_tenant`'s newly-added passthrough OR from `v_storefront_config.ui_config_json` (executor decides cleanest path; SPEC §11 spells the trade-off).
- `src/components/Header.astro` — update the top-bar tel-CTA to consume `phone_general` (falling back to `business_phone` if `phone_general` is null, for backward-compat during rollout).
- `src/components/Footer.astro` — same wiring as Header.
- All product surfaces (`src/pages/products/[barcode].astro`, `src/pages/products/index.astro`, `src/pages/brands/[slug].astro`, `src/pages/brands/index.astro` + the `/en/` and `/ru/` variants) — consume `phone_catalog` for any phone CTA on those pages. If those pages currently show NO phone CTA, ADD ONE in the existing component conventions (the SPEC author confirms the pages should expose a contact CTA per Daniel's intent of differentiating product-channel from general-channel).

**C. View layer (Iron Rule 13 — Views-only for external reads):**
Either extend `v_public_tenant` to expose `phone_general` + `phone_catalog`, OR extend `v_storefront_config` to passthrough the relevant ui_config keys. Prefer the SAME view that already exposes tenant phone today (`v_public_tenant`). Both options are SaaS-clean.

**D. CMS row cleanup — replace `053-434-7265` with token-based references in the 21 affected rows:**

For each of the 21 published rows, find every literal `053-434-7265` (and known variant formats) inside `blocks` jsonb and replace them with the Liquid-style token `{{phone_general}}` (for non-catalog pages) or `{{phone_catalog}}` (for catalog pages). All 21 rows in the §2 list are non-catalog → all use `{{phone_general}}`. The storefront's CMS-block renderer must understand these tokens at render time and substitute the value from tenant config.

**E. CMS-block renderer — token substitution:**
The component that renders `blocks` (likely under `src/components/blocks/` or `src/lib/cms-render.ts`) must be extended to substitute `{{phone_general}}` and `{{phone_catalog}}` at render time using the tenant config above. Use a defensive substitute: any token format that looks like `{{phone_*}}` but doesn't match a known channel renders as the empty string (NOT the literal token, NOT a fallback to `business_phone` — that would mask future architecture mistakes).

**F. Source-file cleanup:**
- Delete `src/_deprecated/legal-terms.ts` (defunct).
- Delete `src/_deprecated/legal-privacy.ts` (defunct).
- Delete `public/images/lab/israel-hayom-logo.png` (misnamed; HTML masquerading as PNG; surveyed for inbound references first).
- Update `sql/031-seed-pages.sql` to use the token form (so a fresh seed produces token-based content, not hardcoded numbers).
- Verify there are no inbound `<img src>` references to `israel-hayom-logo.png` BEFORE deleting it. If any exist, fix the references first; if any are in CMS rows, include those in the §D pass.

### Out of scope

- The 4 historical `docs/` files containing the wrong number (`wp-general-page.html`, the 2 TRANSLATION-REVIEW files, the TRANSLATION-BACKUP json, SEO_PARITY_AUDIT.md). These are **historical records of past site state** and must remain accurate to what was true then. Add a one-line annotation file at `docs/PHONE_NUMBER_HISTORICAL_NOTE.md` instead, pointing to this SPEC.
- The 2 generated SEO scrape outputs in `scripts/seo/output/`. These regenerate when the SEO script reruns; out of scope here.
- The `.claude/` files — local Claude scratch, not customer-facing.
- The `business_phone` field itself — already correct (`053-3645404`); not modified by this SPEC. (Note: the new format `053-364-5404` and existing format `053-3645404` are the SAME number; the dashes differ. This SPEC standardizes on `053-364-5404` per Daniel's spelling. A future SPEC can decide whether to also re-format `business_phone` for visual parity.)
- ANY change to ERP-side files except this SPEC + its retrospective.
- The lead-form FROM-name fix (REC-SITE-005), the empty-body legal pages renderer fix (REC-SITE-003), and the Hebrew-slug 5xx fix (REC-SITE-004). All separate SPECs.

### Whitelist of write paths

**Storefront repo (`opticup-storefront`) — branch `develop`:**
1. `src/lib/tenant.ts` (modify)
2. `src/components/Header.astro` (modify)
3. `src/components/Footer.astro` (modify)
4. `src/components/blocks/*` and/or `src/lib/cms-render.ts` (modify — exact path resolved by executor in step 1)
5. `src/pages/products/[barcode].astro` + `src/pages/products/index.astro` + `src/pages/brands/[slug].astro` + `src/pages/brands/index.astro` (modify, if phone CTA needed there)
6. `src/pages/en/products/...`, `src/pages/en/brands/...`, `src/pages/ru/products/...`, `src/pages/ru/brands/...` (modify same as above)
7. `src/_deprecated/legal-terms.ts` (DELETE)
8. `src/_deprecated/legal-privacy.ts` (DELETE)
9. `public/images/lab/israel-hayom-logo.png` (DELETE)
10. `sql/031-seed-pages.sql` (modify)
11. New: `docs/PHONE_NUMBER_HISTORICAL_NOTE.md` (create)

**ERP repo (`opticup`) — branch `develop`:**
12. `modules/Module 3 - Storefront/docs/specs/M3_PHONE_TEMPLATING_AND_CLEANUP/EXECUTION_REPORT.md` (create)
13. `modules/Module 3 - Storefront/docs/specs/M3_PHONE_TEMPLATING_AND_CLEANUP/FINDINGS.md` (create)
14. `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md` (modify — close REC-SITE-002, log decision)
15. `__LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md` (append decision)
16. `modules/Module 3 - Storefront/docs/specs/M3_PHONE_TEMPLATING_AND_CLEANUP/migrations/2026_05_07_phone_channels_up.sql` (create — Level 2 UPDATE on tenants.ui_config + v_public_tenant view extension)
17. `modules/Module 3 - Storefront/docs/specs/M3_PHONE_TEMPLATING_AND_CLEANUP/migrations/2026_05_07_phone_channels_down.sql` (create — rollback)

**Supabase production:** Apply the migrations via `apply_migration` (preferred) or `execute_sql` (fallback) — DDL allowed for the view extension; data UPDATE allowed for the new ui_config keys on prizma + demo.

---

## 5. Success Criteria

| # | Criterion | Verification | Expected |
|---|---|---|---|
| 1 | Step 0 sanity passed | Step 0 outputs | All 4 sub-checks PASS |
| 2 | `tenants.ui_config.phone_general` for prizma = `'053-364-5404'` | Supabase MCP `SELECT ui_config->>'phone_general' FROM tenants WHERE slug='prizma'` | `053-364-5404` |
| 3 | `tenants.ui_config.phone_catalog` for prizma = `'053-364-5404'` | same query, different key | `053-364-5404` |
| 4 | Demo tenant gets placeholder values for both keys | same queries with `slug='demo'` | `050-000-0000` for both |
| 5 | View `v_public_tenant` (or `v_storefront_config`) exposes the 2 new keys | `SELECT phone_general, phone_catalog FROM v_public_tenant WHERE slug='prizma'` | `053-364-5404` and `053-364-5404` |
| 6 | 0 CMS rows still contain literal `053-434-7265` | `SELECT COUNT(*) FROM storefront_pages WHERE tenant_id=(prizma) AND status='published' AND blocks::text LIKE '%053-434-7265%'` | `0` |
| 7 | The 21 previously-affected CMS rows now contain `{{phone_general}}` or `{{phone_catalog}}` instead | `SELECT COUNT(*) FROM storefront_pages WHERE tenant_id=(prizma) AND status='published' AND blocks::text LIKE '%{{phone_general}}%'` | `≥21` |
| 8 | Live storefront homepage renders `053-364-5404` | `curl -sL https://prizma-optic.co.il/ \| grep -c "053-364-5404"` after Vercel redeploy | `≥1` |
| 9 | Live storefront homepage NO LONGER renders `053-434-7265` | `curl -sL https://prizma-optic.co.il/ \| grep -c "053-434-7265"` | `0` |
| 10 | Live `/terms/` (he) returns body containing `053-364-5404` (or empty body — depends on REC-SITE-003 status; if empty, mark "blocked by REC-SITE-003" and accept) | curl + grep | `≥1` OR documented as blocked |
| 11 | `src/_deprecated/legal-terms.ts` and `src/_deprecated/legal-privacy.ts` no longer exist in storefront repo | `ls src/_deprecated/` | files absent |
| 12 | `public/images/lab/israel-hayom-logo.png` no longer exists | `ls public/images/lab/israel-hayom-logo.png` | file absent |
| 13 | NO inbound references remain to `israel-hayom-logo.png` (verified before delete + post-delete) | `grep -rn "israel-hayom-logo"` across storefront source + CMS | 0 hits |
| 14 | Header.astro top-bar tel-CTA reads `phone_general` (with fallback to `business_phone`) | `grep -A 3 "tel:" src/components/Header.astro` | shows `phone_general` consumption |
| 15 | Footer.astro reads `phone_general` (with fallback) | grep | shows consumption |
| 16 | Product page (`/products/[barcode]`) consumes `phone_catalog` if it has a phone CTA | grep | shows consumption (or finding logged if no CTA) |
| 17 | CMS-block renderer substitutes `{{phone_general}}` and `{{phone_catalog}}` correctly | render `/he/` page locally and grep DOM | live phone visible |
| 18 | All Astro pages build successfully | `npm run build` (storefront) | exit 0, no errors |
| 19 | Integrity gate clean (ERP repo) | `npm run verify:integrity` | exit 0 |
| 20 | Single atomic commit on storefront `develop` (push to develop, NOT main) | `git log -1 --oneline` storefront | One commit, message starts `feat(storefront): phone-channel templates + cleanup of stale 053-434-7265` |
| 21 | Single atomic commit on ERP `develop` for SPEC retrospective + handoff | `git log -1 --oneline` ERP | One commit, message starts `chore(spec): close M3_PHONE_TEMPLATING_AND_CLEANUP` |
| 22 | Production deploy verified — Vercel build READY for the storefront commit, prizma-optic.co.il fetch shows new number | Vercel MCP `list_deployments` + `curl` | new deployment is `READY` and `target=production`, fetch criteria 8+9 pass |

---

## 6. Autonomy Envelope

**Executor MAY autonomously:**
- Apply the 2 migrations (DDL view extension + data UPDATE on prizma + demo) via Supabase MCP. SPEC explicitly authorizes this; Bounded Autonomy applies.
- Modify the whitelisted storefront source files.
- Delete the 3 whitelisted files.
- Build and test storefront locally.
- Commit + push BOTH repos to develop ONCE each.
- Trigger Vercel redeploy via the existing mechanism (PR + merge to main, OR Vercel CLI if Daniel's machine has it; opticup-storefront branch model: develop → main via PR per `feedback_storefront_branch_model`).

**Executor MUST stop and report:**
- Any product-page audit reveals there's no existing phone CTA pattern → STOP and ask Daniel whether to add one or skip §B for product pages.
- View extension breaks any consumer (e.g. `quick-register` page errors after the view change) → STOP and roll back.
- A CMS row substitution introduces invalid JSON → STOP, do not commit; fix and retry.
- More than 25 CMS rows match `053-434-7265` (premise was 21) → STOP, the row count drifted; reconcile before mass UPDATE.
- The merge-to-main protocol on storefront repo blocks the deploy (per `feedback_main_merge_via_pr`) → STOP after develop is pushed; deliver PR-link to Daniel for him to merge to main.

**Executor MUST NOT:**
- Push directly to `main` on either repo (Daniel-only).
- Modify ERP-side files outside the 6 whitelisted under §4.
- Touch the 4 historical `docs/` files.
- Touch the `.claude/` scratch files.
- Touch business_phone or support_phone_display (already correct).
- Skip Step 0 or Vercel deploy verification.

---

## 7. Stop-on-Deviation Triggers

In addition to global triggers:
- View extension causes more than 5 lines of TypeScript compile errors → STOP, propose narrower path.
- CMS row update affects rows in tenants OTHER than prizma → STOP, the WHERE clause was wrong.
- Vercel build fails on the storefront commit → STOP, do not merge to main; investigate locally first.
- Deploy succeeds but criterion #9 (no `053-434-7265` on live homepage) fails → STOP; Vercel may be serving cache. Wait 5 min, retry, escalate if still failing.

---

## 8. Expected Final State

**On storefront repo `develop` (commit hash X):**
- Source updated: tenant.ts + Header.astro + Footer.astro + product/brand pages + CMS renderer all consuming `phone_general` / `phone_catalog`.
- 3 files deleted (`_deprecated/legal-terms.ts`, `_deprecated/legal-privacy.ts`, `israel-hayom-logo.png`).
- Seed file (`sql/031-seed-pages.sql`) updated to use tokens.
- Historical-note file created.

**On ERP repo `develop` (commit hash Y):**
- SPEC folder populated with EXECUTION_REPORT, FINDINGS, and the 2 migration files.
- HANDOFF.md updated; DECISIONS_LOG.md appended.

**In Supabase production:**
- `tenants.ui_config` for prizma + demo has 2 new keys (`phone_general`, `phone_catalog`).
- View `v_public_tenant` (or `v_storefront_config`) exposes them.
- 21 CMS rows now have token references instead of literal `053-434-7265`.

**On live site (post-Vercel-redeploy):**
- `https://prizma-optic.co.il/` shows `053-364-5404` in header + footer + body.
- 0 occurrences of `053-434-7265` anywhere in served HTML.

**Future work unlocked:** when Daniel later wants product-channel calls to route to a different number, ONE Supabase UPDATE on `ui_config.phone_catalog` flips every product surface, with no content edits and no redeploy needed (live-DB read path).

---

## 9. Commit Plan

**Storefront commit:**
```
feat(storefront): phone-channel templates + cleanup of stale 053-434-7265

Closes Site Overseer REC-SITE-002. Two changes, one commit:

1. ARCHITECTURE — two-channel phone templates:
   - tenant config gains ui_config.phone_general + ui_config.phone_catalog
   - v_public_tenant exposes both as nullable strings
   - tenant.ts reads them; Header/Footer consume phone_general
   - Product + brand pages consume phone_catalog
   - CMS-block renderer substitutes {{phone_general}} / {{phone_catalog}}
   - Both channels = 053-364-5404 today; Daniel can split phone_catalog
     to a branch number later by single Supabase UPDATE, no redeploy
     and no content edits.

2. CLEANUP of stale 053-434-7265 (defunct WP-era line):
   - 21 published storefront_pages rows (homepage + 6 legal/custom × 3 langs)
     migrated from literal phone to {{phone_general}} token.
   - Deleted src/_deprecated/legal-terms.ts and legal-privacy.ts.
   - Deleted public/images/lab/israel-hayom-logo.png (misnamed HTML).
   - Updated sql/031-seed-pages.sql to use tokens.
   - Added docs/PHONE_NUMBER_HISTORICAL_NOTE.md pointing to this SPEC.

Verified post-deploy: live site renders 053-364-5404 in 3 langs; 0 hits on
053-434-7265.

SPEC: opticup ERP repo modules/Module 3 - Storefront/docs/specs/M3_PHONE_TEMPLATING_AND_CLEANUP/SPEC.md
```

**ERP commit (separate, in opticup repo):**
```
chore(spec): close M3_PHONE_TEMPLATING_AND_CLEANUP

EXECUTION_REPORT + FINDINGS for the storefront-side phone templating
+ cleanup. 2 migration SQL files. Site Overseer HANDOFF moved to
REC-SITE-002 closed; DECISIONS_LOG appended.
```

---

## 10. Methodology Notes

**The order of operations matters:**
1. Apply migrations FIRST (config + view). View changes should be backward-compatible (additive columns, nullable). After this step, the storefront still works on production with `business_phone` because the new fields are not yet consumed.
2. THEN edit storefront source — wire consumers, add fallbacks (`phone_general ?? business_phone`).
3. THEN update CMS rows. The renderer must already understand the tokens by the time the rows reference them; otherwise the homepage shows `{{phone_general}}` literally to customers.
4. Build + test locally on storefront.
5. Commit + push storefront develop.
6. PR to main → Daniel merges → Vercel auto-deploys.
7. Verify live (criteria 8+9).
8. Commit ERP retrospective.
9. Update HANDOFF.

**Single-source-of-truth defense:** the SPEC enforces that there is ONE place to change either phone going forward (`ui_config.phone_general` or `ui_config.phone_catalog`). LEARNINGS L-PROJECT-001 applies: do NOT introduce additional hardcoded `053-364-5404` literals in source files; if you find one, route it through the template.

---

## 11. Trade-off notes for the executor

### 11.1 — Where to expose the new keys

Two options, executor picks:
- **(a) Extend `v_public_tenant`** with 2 new columns by reading `t.ui_config->>'phone_general'`. Pros: one view, all tenant identity in one place, matches existing `phone` column convention. Cons: every consumer of `v_public_tenant` retypes their SELECT.
- **(b) Extend `v_storefront_config`** with the same 2 columns. Pros: storefront-config-related fields stay together. Cons: tenant.ts has to read from both views, slight asymmetry with `business_phone` which lives in `v_public_tenant`.

**SPEC author recommends (a)** — symmetry with the existing `phone` mapping, which is already a `t.business_phone AS phone` projection. Add `t.ui_config->>'phone_general' AS phone_general` and same for catalog.

### 11.2 — Historical doc files

The 4 `docs/` files in the storefront repo (`wp-general-page.html`, the 2 TRANSLATION-REVIEW, the TRANSLATION-BACKUP, and SEO_PARITY_AUDIT.md) all contain `053-434-7265` as historical record of past site state. They are intentionally NOT modified by this SPEC. The new `docs/PHONE_NUMBER_HISTORICAL_NOTE.md` annotates this for future readers so no one tries to "fix" them in a later sweep. (Pattern: "historical records remain accurate to what was true then" — also applied in M4_HARDCODED_DEMO_PHONE_CLEANUP.)

### 11.3 — Demo tenant treatment

Demo gets placeholder values (`050-000-0000`) for both new keys, mirroring the existing demo convention where contact fields are obviously-fake. This is intentional per L-PROJECT-001 (no realistic-looking demo values).

### 11.4 — Deploy mechanism

Per `feedback_main_merge_via_pr`: opticup-storefront's `main` branch has GitHub branch protection. Direct `git push origin main` fails with GH013. The deploy path is: push to `develop` → open compare URL → Daniel reviews + merges via GitHub PR Merge button → Vercel auto-deploys from main.

The executor MUST push to `develop` only, deliver the PR link to Daniel, and wait for Daniel's merge before claiming deploy complete.

### 11.5 — Cache invalidation after CMS update

Tenant cache in `tenant.ts` has a TTL (currently 5 min in the source). After Supabase config update, the storefront may serve stale data for up to 5 min. Either restart Vercel functions (forces cache flush) OR wait + verify. Document in EXECUTION_REPORT.

---

## 12. Cross-Reference Check (Step 1.5)

Performed 2026-05-07 against:
- `docs/GLOBAL_SCHEMA.sql` — no existing column or function named `phone_general` or `phone_catalog`. ✓
- `docs/GLOBAL_MAP.md` — no contracts naming these. ✓
- `tenants.ui_config` for prizma — 2 new keys do NOT yet exist (verified §3 step 4). ✓
- `v_public_tenant` definition (read 2026-05-07 from db-audit/03-views.md) — adding 2 new column projections is additive, backward-compatible. ✓
- Storefront `src/lib/tenant.ts` — `TenantConfig` shape has `phone: string | null`; adding `phone_general` and `phone_catalog` is additive. Existing consumers of `tenant.phone` keep working. ✓
- LEARNINGS L-PROJECT-001 — every literal in this SPEC is the verified real value; no decorative examples introduced. ✓

**0 collisions.** SPEC ready for dispatch.

---

## 13. Lessons already incorporated

- **Step 0 (reproduce-the-bug-first)** — §3 verifies the live state of all 4 premises before any change.
- **Step 0.1 #1 (live-state baseline probe)** — §2 cites verified live values + a correction to the audit's "24 rows" figure based on canonical-format query.
- **Step 0.1 #2 (identifier verification)** — every column, view, file path, and SQL-key in this SPEC was grep'd against the live repo + DB on 2026-05-07.
- **Step 0.1 #3 (cross-asset coupling)** — §F enumerates 5 asset families (CMS rows, Astro source, view layer, seed SQL, generated SEO outputs) and classifies each as in/out of scope.
- **Step 0.1 #5 (cross-section consistency)** — §6 stop triggers, §5 success criteria, §9 commit messages, and §11 trade-offs all reconciled.
- **Step 0.1 #6 (per-consumer enumeration)** — §11.2 enumerates the 4 historical doc consumers and classifies each as KEEP-as-historical with annotation.
- **L-PROJECT-001** — demo gets `050-000-0000` placeholder, not a realistic-looking number.
- **`feedback_storefront_branch_model`** — explicit develop→main-via-PR path in §6 + §11.4.
- **`feedback_main_merge_via_pr`** — same.
- **`feedback_clean_repo_in_specs`** — §5 #11/#12 enforce clean repos.
- **`feedback_no_storefront_prices`** — N/A (no prices added).
- **3-occurrence rule** — every catalog-name (table, view, file path, function) cited in this SPEC was verified live on 2026-05-07. The pattern of "phantom value cited from memory" does not apply here.

---

## 14. Estimated effort

- 2-4 hours executor wall time across both repos. Bulk: CMS row substitution (21 rows × careful jsonb editing) + view extension testing + Vercel deploy verification.

---

## 15. Definition of Done

All 22 success criteria pass. Two atomic commits (one storefront, one ERP). Live site verified post-deploy. Site Overseer HANDOFF closes REC-SITE-002. EXECUTION_REPORT + FINDINGS written.

---

*End of SPEC.*
