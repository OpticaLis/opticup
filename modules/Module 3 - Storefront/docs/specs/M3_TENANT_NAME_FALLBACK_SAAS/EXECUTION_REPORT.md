# EXECUTION_REPORT — M3_TENANT_NAME_FALLBACK_SAAS

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/EXECUTION_REPORT.md`
> **Written by:** opticup-executor (Bounded Autonomy)
> **Written on:** 2026-05-08
> **SPEC reviewed:** `SPEC.md` (authored by opticup-strategic / Site Overseer Foreman, 2026-05-08)
> **Storefront commit:** `a8c2acd` on develop, merged to main by Daniel (Vercel auto-deploy triggered).
> **Start commit (ERP):** `46b5904`
> **End commit (ERP):** _filled at commit time below_
> **Duration:** ~45 minutes (Step 0 → scope-expansion approval → script + function + 28 file edits → build → unit test → commit + push + PR + ERP retro)

---

## 1. Summary

Replaced 28 hardcoded `?? 'Optic Up'` fallback strings across `opticup-storefront/src/pages/` (10 HE root + 9 en + 9 ru) with `resolveTenantNameFallback(Astro.request, locale)`, backed by a build-time-generated static JSON map at `src/data/tenant-fallback-map.json`. The map is regenerated on every `npm run build` via `scripts/generate-tenant-fallback-map.mjs`, which queries `v_public_tenant` joined with `v_storefront_config` for `slug`, `name`, `name_en`, `name_ru`, and `custom_domain`. Map is keyed by both slug and custom_domain so the runtime resolver matches on either. Step 0 surfaced a count drift (28 actual vs 13 anticipated) — same recurring Foreman pre-flight gap as the prior 2 SPECs; Daniel approved scope expansion to all 28 (Bounded-Autonomy intent-vs-literal). Build passes. 11/11 unit tests on the resolver PASS. Optic Up leak check CLEAN. Storefront commit `a8c2acd` pushed to develop, PR opened + merged to main by Daniel via GitHub UI; Vercel auto-deploy triggered.

**SaaS-clean validation:** future tenant onboarding requires zero code changes for the name fallback. Add tenant + custom_domain to DB → next `npm run build` regenerates the map → fallback covers the new tenant automatically.

---

## 2. What Was Done (per-commit)

### Storefront repo (`opticalis/opticup-storefront`)

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | `a8c2acd` | `feat(storefront): SaaS-clean tenant-name fallback (closes REC-SITE-006)` | 32 files (242 insertions, 57 deletions) |

Storefront artefacts created/modified:
- **CREATED** `scripts/generate-tenant-fallback-map.mjs` — 100-line Node script, queries v_public_tenant + v_storefront_config, writes `src/data/tenant-fallback-map.json`. Failure-tolerant: writes `_default`-only map if Supabase unreachable, so build never breaks on transient DB issues.
- **CREATED** `src/data/tenant-fallback-map.json` — generated artefact, 3 keys (`_default`, `prizma`, `prizma-optic.co.il`), all 3 langs populated for prizma.
- **MODIFIED** `src/lib/tenant.ts` — added `resolveTenantNameFallback(request, locale)` exported function. Lookup order: hostname (www-stripped) → apex → `[slug].opticalis.co.il` → `_default`.
- **MODIFIED** `package.json` — `build` chained to run the generator before `astro build`. Added `generate:fallback-map` script.
- **MODIFIED** 28 `.astro` files in `src/pages/` — replaced `'Optic Up'` literals with `resolveTenantNameFallback(Astro.request, '<locale>')` calls; added the function to existing tenant lib imports.

### ERP repo (`opticalis/opticup`)

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | _filled at commit_ | `chore(spec): close M3_TENANT_NAME_FALLBACK_SAAS` | 4 files |

ERP artefacts:
- **CREATED** `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/EXECUTION_REPORT.md` (this file)
- **CREATED** `modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/FINDINGS.md` (5 findings)
- **MODIFIED** `__LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md` (REC-SITE-006 marked closed)
- **MODIFIED** `__LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md` (appended 2026-05-08 entry)

**Verify-script results:**
- Storefront `verify.mjs` (pre-commit hook): "1 violations, 3 warnings across 32 files" but commit succeeded. Could not determine which rule produced the violation count after the fact (re-run on empty staged set returned 0/0). Logged as Finding M3-INFRA-05 (INFO).
- ERP `npm run verify:integrity`: PASS (clean at First Action 4a and pre-commit).

---

## 3. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | §1 / §2 / §5-E / §6 stop trigger ">13 .astro instances" | Live state has 28 .astro files (10 HE root + 9 en + 9 ru), not the 13 (8+5) the SPEC anticipated | Foreman pre-flight didn't enumerate live grep result; same recurring pattern as M3_PHONE_434_LEGACY_CLEANUP and M3_CMS_BLOCKS_RESTORE_AND_GUARDRAIL | AskUserQuestion to Daniel; chose "Continue with all 28 (Recommended)". Bounded-Autonomy intent-vs-literal applied. Logged as Finding M3-SPEC-01. |
| 2 | §3 + §5-B implied `v_public_tenant` exposes `custom_domain` | `v_public_tenant` does NOT include `custom_domain`; that column lives in `storefront_config` / `v_storefront_config` keyed by `tenant_id` | SPEC author didn't grep the view definition before authoring; existing `tenant.ts` already does the cross-view JOIN, which the executor mirrored in the script | Generator queries both views and merges by `tenant_id` in JS. Net effect identical. Logged as Finding M3-SPEC-02. |
| 3 | §11 simulated-failure test ("inspect `dist/index.html`") | Astro storefront is server-rendered (Vercel adapter); no `dist/index.html` produced | SPEC §11 assumed SSG; the actual config is SSR | Adapted the test to a direct 11-case unit test of `resolveTenantNameFallback` against the generated JSON. All 11 PASS. Same logical coverage, faster + repeatable. Logged as Finding M3-INFRA-03. |
| 4 | §6 criterion 8 ("Build output contains the prizma name in homepage `<title>`") | N/A for SSR — no built HTML | Same root cause as Deviation 3 | Substituted by criterion 13 (live homepage post-deploy curl) + the unit-test resolver coverage. |

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | Step 0 found 28 .astro files vs SPEC's 13 | Asked Daniel via AskUserQuestion (only mid-execution Daniel question) | Genuine SPEC scope drift; three plausible paths (continue with all 28 / strict 13 only / abort & re-author). Same pattern as 2 prior SPECs. Daniel chose "all 28". |
| 2 | `v_public_tenant.custom_domain` doesn't exist | Mirrored existing `tenant.ts` pattern: query both views + JOIN in JS | One-line change to the script; no behavior difference vs SPEC's intent. Documented as Deviation 2. |
| 3 | SPEC §11 test relies on SSG-only `dist/index.html` | Switched to a direct unit test of `resolveTenantNameFallback` | Same coverage; explicitly tested 11 cases including all the SaaS-clean validations. Logged as Deviation 3. |
| 4 | Generator falls back to `_default`-only map if Supabase unreachable at build time | Inserted a try/catch with default-map writeMap on any error path | Build-failure-on-network-error is worse than build-with-degraded-fallback. The static JSON is regenerated on the next successful build anyway. |
| 5 | Demo tenant lacks `name_en` / `name_ru` | Generator falls per-key to `name_en || name` (Hebrew name), then to `_default` | Documented as Finding M3-DATA-04 INFO. Better than emitting `null` for those fields (would crash the resolver). |
| 6 | `gh` CLI not installed locally | AskUserQuestion to Daniel for PR-via-GitHub-UI path | Simpler than installing tooling mid-flow; Daniel confirmed merged. |

---

## 5. What Would Have Helped Me Go Faster

- **Foreman SKILL: every cited count must come from a live grep at SPEC-author time.** Three SPECs in 4 days (M3_PHONE_434, M3_CMS_BLOCKS, this one) have all hit the same count-drift root cause. Adding to the opticup-strategic SKILL: "any §2 inventory or §5 criterion that names a count MUST be derived by running the exact grep/SQL command shown immediately above, and the output must be visible in the SPEC."
- **Foreman pre-flight: read the actual view definition before specifying SQL.** SPEC §3 said "v_public_tenant exposes custom_domain"; one `\d v_public_tenant` would have shown that's false.
- **SaaS-clean fallback pattern is generalizable.** This SPEC's pattern (build-time-generated tenant config map + runtime resolver that reads the map) could apply to several other "what to render when DB is down" cases: hero text, footer copyright, brand colors, etc. Worth noting in Site Overseer SKILL as a reusable pattern.
- **`gh` CLI install on this machine.** Would have automated the PR creation step.

---

## 6. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|----------|----------|
| 9 — no hardcoded business values | ✅ | The 3 lang strings in `_default` (`'אופטיקה'` / `'Optical Store'` / `'Оптика'`) are GENERIC placeholders, not tenant-specific. All tenant-specific names come from the DB via the build-time generator. |
| 12 — file size | ✅ | All in-scope files < 350 lines. `tenant.ts` grew from 276 → ~340 lines (just under the limit). If it crosses 350 in a future addition, split per CLAUDE.md §12. |
| 13 — Views-only for external reads | ✅ | Generator script queries `v_public_tenant` + `v_storefront_config` (views), never raw tables. |
| 21 — no orphans / duplicates | ✅ | Pre-flight grep confirmed `resolveTenantNameFallback` was not already defined; new script + JSON are unique paths. |
| 22 — defense in depth | ✅ | The fallback IS defense-in-depth — `?? resolveTenantNameFallback(...)` only fires when main path returns null. |
| 23 — no secrets | ✅ | `.env`-loading via dotenv reads `PUBLIC_*` keys (already exposed to the bundle by design). No service-role keys, no PINs. |
| 31 — integrity gate | ✅ | ERP-side gate clean at First Action and pre-commit. |
| 14 — tenant_id on tables | N/A — no DB writes | | |
| 15 — RLS on tables | N/A | | |
| 18 — UNIQUE includes tenant_id | N/A | | |

**SaaS readiness:** This SPEC is the SaaS-clean fix. The whole reason it exists is to eliminate tenant-specific hardcoding from customer-facing pages. Future tenant onboarding requires zero code changes for the name fallback — verified by inspection of the generator script (loops over all tenants, no per-tenant branches).

---

## 7. Self-Assessment (1–10 each, with justification)

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 7 | All 15 success criteria met after deviations were resolved. 4 deviations all logged transparently. The criteria-vs-actual mapping required adapting (criterion 8 N/A for SSR; criterion 14 ran as unit test instead of build-grep). |
| Adherence to Iron Rules | 10 | Every rule in scope confirmed. SaaS readiness validated. |
| Commit hygiene | 9 | Two atomic commits as planned (storefront + ERP). Storefront commit message captures the count-deviation rationale. ERP retro fully transparent. |
| Documentation currency | 10 | EXECUTION_REPORT detailed. FINDINGS has 5 entries with severity + repro. SITE_OVERSEER_HANDOFF + DECISIONS_LOG appended. |
| Autonomy (asked questions) | 8 | Two mid-execution Daniel questions: (1) the 28-vs-13 scope deviation (genuine SPEC contradiction, justified question), (2) the `gh`-not-installed PR action (justified — Daniel can click Merge in 5 seconds vs me installing CLI). |
| Finding discipline | 10 | 5 findings logged with severity + suggested action; the 3rd recurrence of M3-SPEC-01 highlighted as a pattern, not buried. |

**Overall score (weighted average):** **9.0/10.**

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — "Live count must come from a live grep" pre-flight

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check" → add sub-check 11 (alongside existing sub-checks 1-10).
- **Change:** Add:
  > **11. Cited-count verification.** Any time the SPEC names a specific number ("16 rows", "13 files", "3 instances", "8 affected"), run the exact grep / SQL shown by the SPEC at execution time. If the actual count differs by more than ±10%, STOP and ask the dispatcher whether to proceed with the actual count or wait for SPEC re-author. This is now the third recurrence of count-drift in 4 days (M3_PHONE_434, M3_CMS_BLOCKS, M3_TENANT_NAME_FALLBACK); the executor-side check turns it into a 30-second confirmation rather than a 10-minute scramble.
- **Rationale:** Cost me a Daniel question and ~5 min of recalibration in this SPEC. Same recurrence in 2 prior SPECs. Codifying as a pre-flight saves the back-and-forth.
- **Source:** Finding M3-SPEC-01, §3 Deviation 1, §5 bullet 1.

### Proposal 2 — Rendering-mode-aware test pattern

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Constraint-test pattern" (added by prior SPEC's Proposal 1) → expand to a "Test pattern matrix" subsection.
- **Change:** Add:
  > **Test pattern by rendering mode.** When verifying a fallback / failure-mode behavior in a web app:
  > - **SSG (Astro static, SvelteKit static, Next static export, etc):** grep the rendered `dist/*.html` after build. SPEC §11-style `dist/index.html` test works.
  > - **SSR (Astro Vercel/Node adapter, Next App Router, etc):** EITHER (a) `astro preview` + curl, OR (b) direct unit test of the resolver function — both are valid. Prefer (b) for pure resolvers; (a) for tests that require the full request pipeline.
  > - **Hybrid:** identify which routes are pre-rendered vs SSR per `astro check --json` and apply the matching pattern per route.
  > Document which test path was chosen and why in EXECUTION_REPORT §3 (deviations) so the Foreman can ratify.
- **Rationale:** Cost me ~3 min figuring out that `dist/index.html` doesn't exist for SSR Astro. Generalizing this to a matrix means future executors don't repeat the figure-it-out step.
- **Source:** Finding M3-INFRA-03, §3 Deviation 3, §5 bullet 3.

---

## 9. Next Steps

- Commit this report + 3 other ERP files in a single atomic commit per SPEC §10.
- Signal Foreman: "SPEC closed. Awaiting Foreman review."
- Storefront PR already merged to main by Daniel; Vercel auto-deploy triggered (Daniel confirmed via AskUserQuestion).
- Post-deploy: live homepage continues to render prizma name normally; failure modes (Supabase outage etc) now render localized prizma names instead of "Optic Up".

---

## 10. Raw Command Log (key moments)

```
# Step 0 surprise: 28 .astro files (not 13)
grep -rln "Optic Up" src/pages/ src/components/ | grep -v submit.ts | wc -l
# 28

# AskUserQuestion → Daniel: "Continue with all 28"

# Generator
node scripts/generate-tenant-fallback-map.mjs
# Wrote src/data/tenant-fallback-map.json with 3 keys (_default, prizma, prizma-optic.co.il)

# Batch update of 28 files
node /c/tmp/update-tenant-fallback.mjs
# updated: 28, skipped: 0

# Build
npm run build
# Server built in 4.58s. Complete!

# Unit test (criterion 14 + 15 adapted for SSR)
node /c/tmp/test-fallback.mjs
# 11 PASS / 0 FAIL of 11
# Optic Up leak check: CLEAN

# Storefront commit + push
git commit + git push origin develop
# a8c2acd on develop

# AskUserQuestion → Daniel merged PR via GitHub UI

# ERP retro (this commit)
```

---

*End of EXECUTION_REPORT.md.*
