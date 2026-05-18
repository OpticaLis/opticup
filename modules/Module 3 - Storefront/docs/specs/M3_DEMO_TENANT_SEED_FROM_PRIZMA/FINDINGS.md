# FINDINGS — M3_DEMO_TENANT_SEED_FROM_PRIZMA

**SPEC closed:** 2026-05-18, status 🟡 **PARTIAL** (8/9 success criteria pass)
**Executor:** opticup-executor (Claude Opus 4.7)

Findings categorized by severity. Each entry: WHAT, WHY IT MATTERS, SUGGESTED ACTION.

---

## CRITICAL severity — must address before relying on demo for any form-flow testing

### F-1. /supersale/ HE form still POSTs to prizma's Make webhook (real SaaS-isolation defect)

**Location:** demo tenant, `storefront_pages WHERE slug='/supersale/' AND lang='he'`, inside `blocks::text` at offset surrounding `webhook_url=\"https://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki\"`. Confirmed live via `curl https://opticup-storefront-demo.vercel.app/supersale/` returning 1 occurrence of `jewyavndaly` in the form HTML.

**Why it matters:** Any user submitting the demo supersale form triggers prizma's production Make automation chain — leaking demo test leads into prizma's CRM. Directly violates the SPEC's stated #1 motivation ("supersale form on prizma posts to a Make webhook that fires prizma's automation. If demo's `/supersale/` posts to the same webhook, demo testing will leak data into prizma's CRM").

**Root cause:** SPEC §3 INSERT's `replace()` chain used the literal pattern `'webhook_url="https://hook.eu2.make.com/..."'`. The actual stored bytes in `blocks::text` are `webhook_url=\"https://hook.eu2.make.com/...\"` (inner JSON quotes escaped as `\"`, 2 bytes). The literal pattern matched 0 occurrences and the replacement was effectively a no-op. Same root cause applies to the `tenant_slug="prizma"` rewrite (also produced 0 matches in this SPEC's data — that pattern wasn't actually present in any prizma page in this exact form).

**Suggested action — NEW SPEC `M3_DEMO_WEBHOOK_SCRUB`:**
- Author: opticup-strategic (Site Overseer / Foreman).
- Scope: one UPDATE on `storefront_pages` where `tenant_id='8d8cfa7e-...'` AND `slug='/supersale/'` AND `lang='he'`. Use escape-aware patterns. Validate via `curl ... | grep -c jewyavndaly` returns 0.
- Add to SPEC §4 declared destructive list: `UPDATE storefront_pages.blocks WHERE tenant_id=demo AND slug='/supersale/'` (per Iron Rule 32, must be explicit).
- Implementation sketch (escape-aware):
  ```sql
  UPDATE storefront_pages
  SET blocks = replace(
                 blocks::text,
                 E'webhook_url=\\"https://hook.eu2.make.com/jewyavndaly70jd59tj9pt85s9ad1pki\\"',
                 E'webhook_url=\\"\\"'
               )::jsonb,
      updated_at = now()
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND slug='/supersale/'
    AND lang='he';
  -- Verify: SELECT count(*) FROM storefront_pages
  --   WHERE tenant_id='8d8cfa7e-...' AND blocks::text LIKE '%jewyavndaly%'
  -- Expected: 0.
  ```
- Estimated effort: 30 min (1 UPDATE + 1 verification + 1 commit). Far smaller than the original SPEC.

---

## HIGH severity — should address before demo storefront is used as a public-facing demo

### F-2. 29 demo pages display prizma contact emails (`service@`, `nayedet@`, `events@ prizma-optic.co.il`)

**Location:** demo tenant, `storefront_pages` rows for these slugs (across he/en/ru): `/accessibility/`, `/deal/`, `/multi-takanon/`, `/premiummultisale/`, `/privacy/`, `/prizma-express-terms/`, `/successfulmulti/`, `/successfulsupersale/`, `/multisale-brands-cat/`, `/multisale-brands-cat2/`, `/multifocal-guide/`, `/multi-takanon/`, `/eventsunsubscribe/`, `/מיופיה/`, `/supersalepricescatalog/`. Each contains 1+ occurrences of `service@prizma-optic.co.il` or `nayedet@prizma-optic.co.il` or `events@prizma-optic.co.il`, often inside `<a href="mailto:..."` markup.

**Why it matters:** When a demo storefront user clicks an email link in the privacy page, their mail client opens with a prizma support address pre-filled. Sending it would email prizma staff. Lower-severity than F-1 because (a) it requires user action (click), (b) it's plain text in legal pages users rarely interact with, (c) it's not a programmatic SaaS-isolation breach. But for a public-facing demo, this is still cross-contamination.

**Root cause:** SPEC §3's `replace()` chain handled URLs (`https://www.prizma-optic.co.il`, `https://prizma-optic.co.il`) but did not handle EMAILS (`*@prizma-optic.co.il`). Conceptually emails and URLs are different — the SPEC's pre-flight investigation conflated them ("29 pages contain prizma URL or webhook strings").

**Suggested action — INCLUDE in `M3_DEMO_WEBHOOK_SCRUB` SPEC (F-1 above), OR separate SPEC `M3_DEMO_EMAIL_REWRITE`:**
- Rewrite `*@prizma-optic.co.il` → `demo@prizma-optic.co.il` (or `support@opticup-storefront-demo.vercel.app`, depending on what Daniel wants demo's contact email to be).
- Cheap (single `replace()` against jsonb-text per row, 29 affected rows, all demo tenant).
- Add to SPEC §4 declared destructive list.

### F-3. Demo HTML `<title>` and hero text identify the site as "אופטיקה פריזמה"

**Location:** demo tenant, `storefront_config.seo` + `storefront_config.hero_title` + `storefront_config.hero_subtitle` — all copied verbatim from prizma per SPEC §6 Step 2. Curl of demo homepage returns `<title>אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים</title>`.

**Why it matters:** Demo identifies as Prizma to search engines and visitors at the brand-name level. Daniel's stated SPEC intent was to clone CONTENT (page bodies) but preserve demo's ui_config IDENTITY (green theme, demo phones, allowlists). The SEO/hero brand strings sit in `storefront_config`, NOT `tenants.ui_config` — so the SPEC's "ui_config preserved" promise did not cover them.

**Why it might NOT matter:** the storefront is `noindex` for demo via Vercel headers (would need to confirm — outside scope of this SPEC's verification). If demo is `noindex,nofollow`, the SEO title is irrelevant to search engines and only matters for visual identity in the browser tab.

**Suggested action — INCLUDE as field-by-field rewrite in `M3_DEMO_WEBHOOK_SCRUB` or separate SPEC:**
- `storefront_config.hero_title` → `'אופטיקה דמו — שואב מתוכן פריזמה לבדיקות'` (or whatever brand Daniel wants for demo).
- `storefront_config.hero_subtitle` → same logic.
- `storefront_config.seo` jsonb → rewrite title/description fields.
- Add to declared destructive list.

---

## MEDIUM severity — operational lessons + housekeeping

### F-4. Vercel redeploy was NOT needed (SPEC §6 was over-cautious)

**Location:** SPEC §6 Step 6 instructed "Trigger redeploy of demo project (does NOT touch production prizma project)."

**Why it matters:** The Executor verified via curl during Steps 4-5 that the storefront is SSR/ISR — demo homepage went from 34KB (broken pre-state) to 92KB (full chrome rendered) immediately after Step 2 UPDATE, with NO new Vercel deployment. The SPEC's redeploy instruction was unnecessary work (would have cost ~3-5 min + a wasted deploy slot). Latest production deployment `dpl_FMro1x6PTjx8Zkr1hJ9tJWPcCopE` from May 16 remains state=READY and is now correctly serving the seeded demo content.

**Suggested action:** Future SPECs that only touch `storefront_*` tables should note: "Verify SSR/ISR picks up changes via curl before triggering a redeploy. If curl reflects the change, no redeploy needed." Add to opticup-strategic SKILL.md as a SPEC-authoring tip.

### F-5. SPEC's stop-trigger language conflicts with Daniel's "no wind down" + "PARTIAL close" directives

**Location:** SPEC §10 "Stop Triggers (non-overridable)" + dispatch's ABSOLUTE RULES (`feedback_no_polish_by_validation` + `feedback_never_propose_wind_down`).

**Why it matters:** A literal reading of SPEC §10 ("MUST stop and emit an escalation file if ANY of these conditions trip") forces the Executor to halt + escalate. A literal reading of the ABSOLUTE RULES forces the Executor to continue + close PARTIAL. These are not contradictory in spirit (both want the deviation visible, neither wants silent green-close) but the surface language conflicts. The Executor in this run chose continue-to-PARTIAL based on the dispatch's later-listed ABSOLUTE RULES winning over the SPEC's §10 — this is a defensible interpretation but should be made explicit.

**Suggested action:** Update SPEC template to add a "When STOP trigger fires" sub-section that names which path (abandon + escalate vs. continue + PARTIAL close) applies for that SPEC. Or add to opticup-executor SKILL.md a global decision tree (see proposal #2 in EXECUTION_REPORT §9).

### F-6. `pipeline-coordination.mjs check-collision` UX

**Location:** `scripts/pipeline-coordination.mjs`.

**Why it matters:** After this SPEC ran `claim`, the subsequent `check-collision` without `--session-id` reports "branch develop already owned by spec_slug=M3_DEMO_TENANT_SEED_FROM_PRIZMA" (i.e., the SPEC reports a collision with its own lock). The user must dig the session-id out of the lock filename to make the check return "no collision". A `--self` flag that auto-detects the most recent lock matching `--spec-slug` would be more ergonomic.

**Suggested action:** Quick PR to `pipeline-coordination.mjs` adding `--self` flag (5-10 lines). Track as TECH_DEBT entry.

---

## LOW severity — informational, no action required

### F-7. Demo had 1 pre-existing draft page (`/test-page/`)

**Location:** demo tenant, `storefront_pages` row `id='c276fc0e-1976-4e2e-98de-b047b16f9034'`, status='draft', created 2026-04-01.

**Why it matters:** SPEC §3 Step 0c counted only `status='published'` pages (got 0). This draft page exists, was preserved through the seed, and now coexists with the 64 newly-seeded published pages. Demo's total `storefront_pages` count for this tenant is now 65 (64 published + 1 draft), not 64. SPEC §7 success criterion #2 says "storefront_pages count for demo = 64 (30+17+17)" — which is true if scoped to `updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA'`, but false if read literally as "total rows for demo tenant."

**Suggested action:** none. Document in SESSION_CONTEXT.md if anyone gets confused. The draft is unreachable (status='draft', no slug routing) so it's a no-op.

### F-8. Demo `tenants.business_email='demo@prizma-optic.co.il'` uses prizma's domain

**Location:** SPEC §3 Step 4 — Daniel-approved value in SPEC text.

**Why it matters:** demo's outgoing business email IS at prizma's domain. This was explicit in the SPEC and Daniel-authored. Not a defect, but worth flagging: if Daniel later wants demo to be 100% identity-isolated from prizma, this is one of the strings that would need to change.

**Suggested action:** none. Log for future SaaS-onboarding-flow SPEC.

---

## Out-of-scope items the SPEC explicitly deferred (re-list per `feedback_no_polish_by_validation`)

Per SPEC §8, these are NOT in scope for this SPEC and are NOT FAILURES:
- Demo-specific Make webhook URLs (kept empty by intent — but see F-1, this didn't actually empty them).
- Demo `tenants.ui_config` updates (preserved as-is by intent).
- Demo lens inventory population.
- Schema changes (DDL).
- Code changes in either repo.
- Translation updates (translation_group_id stays NULL on copied pages).
- Auto-fix of `<img src="/wp-content/uploads/...">` legacy markup (verified ZERO leakage on /lab/ and homepage — Astro proxies these, so the legacy paths work in practice).

---

## Summary table — Success Criteria scorecard

| # | Criterion | Status |
|---|---|---|
| 1 | storefront_config.enabled=true, footer non-NULL, langs=[he,en,ru] | ✅ |
| 2 | storefront_pages count=64 for `updated_by='M3_DEMO_TENANT_SEED_FROM_PRIZMA'` | ✅ |
| 3 | Zero leakage of prizma URL / tenant_slug / webhook ID | 🟡 29 email + 1 webhook (see F-1, F-2) |
| 4 | tenants.logo_url non-NULL, business_email='demo@prizma-optic.co.il' | ✅ |
| 5 | tenant_branches count=1 for demo | ✅ |
| 6 | Vercel deployment state=READY | ✅ (no new deploy needed — SSR) |
| 7 | /lab/ ≥2 `<style>` + 0 wp-content | ✅ |
| 8 | /supersale/ contains `ss-hero-title` | ✅ |
| 9 | prizma /lab/ title contains "מעבדת מסגורים" | ✅ |

**8 PASS / 1 PARTIAL → SPEC closes 🟡 PARTIAL.**

---

*End of FINDINGS.md. Foreman: please read EXECUTION_REPORT.md + this file and write FOREMAN_REVIEW.md. Primary follow-up SPEC is M3_DEMO_WEBHOOK_SCRUB (F-1 + F-2 + F-3 bundled is recommended).*
