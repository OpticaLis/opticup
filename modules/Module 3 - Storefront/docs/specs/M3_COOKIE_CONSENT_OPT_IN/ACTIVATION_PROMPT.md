# ACTIVATION PROMPT — M3_COOKIE_CONSENT_OPT_IN

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_COOKIE_CONSENT_OPT_IN/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro + migrations) AND
opticalis/opticup-storefront (storefront — for the implementation).
Branches: develop. Daniel merges main via GitHub PR.

Background: Closes REC-SITE-010 (Israeli 2024 privacy regulation). Adds
strict Opt-In cookie consent banner. NO tracking script (GTM, GA, FB
Pixel, Hotjar, TikTok) fires until the user explicitly accepts the
relevant category. UTM passthrough is URL-level and remains unaffected.

Daniel preference (Memory feedback_always_saas_clean.md): tenant-config-
driven over hardcoded. Banner reads tenants.ui_config.cookie_consent for
copy, categories, and tracker→category mapping. Future tenant onboarding
needs zero code changes.

Six storefront files involved (CREATE 2 + MODIFY 4):
1. CREATE src/components/CookieBanner.astro
2. CREATE src/lib/consent.ts (getConsent / setConsent / hasConsent / revokeConsent)
3. MODIFY src/lib/analytics.ts (wrap 5 tracker functions in consent guards)
4. MODIFY src/layouts/BaseLayout.astro (pre-script + banner injection)
5. MODIFY src/components/Footer.astro (cookie-preferences link in 3 langs)
6. MODIFY src/lib/tenant.ts (extend TenantConfig type)

ERP side:
- 2 migration SQL files (up/down) for tenants.ui_config.cookie_consent
  seed for prizma + demo
- EXECUTION_REPORT.md + FINDINGS.md
- HANDOFF + DECISIONS_LOG updates

Authorities:
- Level 2 SQL UPDATE on tenants.ui_config (prizma + demo) — AUTHORIZED.
- Storefront source modifications per SPEC §5 whitelist — AUTHORIZED.
- Vercel redeploy via PR-to-main → Daniel approves merge.

Stop triggers (per SPEC §7 + §8):
- More than 5 trackers found → STOP, reconcile
- Banner CSS conflicts with layout → STOP, narrow selector
- Live test "Reject all" still fires ANY tracker → STOP, gate broken
- Live test "UTMs unaffected" shows missing UTMs → STOP, side-effect
- Tracker discovered we don't know about → STOP, add to mapping

Live tests (criteria 8-13) MUST run in real Chrome via MCP/Playwright,
not curl. Screenshots saved to SPEC folder for evidence. See SPEC §11.

Two atomic commits expected:
- Storefront: "feat(storefront): cookie consent Opt-In (closes REC-SITE-010 — Israel 2024)"
- ERP: "chore(spec): close M3_COOKIE_CONSENT_OPT_IN"

After storefront push to develop → open PR to main → ASK DANIEL to click
Merge. Wait for Vercel READY before live tests.

Begin Step 0 per SPEC §4. Stop only on deviation from numbered success
criterion in SPEC §6.
```

---

**Notes for Daniel:**

- Estimated execution: 3-5 hours wall time.
- ONE thing you'll do mid-execution: click "Merge" on the GitHub PR for the storefront commit (~30 seconds).
- After deploy: first-time visitors see banner; until they choose, no Google/Facebook/Hotjar/TikTok tracking fires. Returning visitors with choice already made don't see the banner.
- UTMs continue to work fully — URL parameters aren't cookies, no consent dependency.
- Compliance: covers the 5 known trackers. If you add a new third party in the future (e.g. a new chat widget), it needs to be added to the category mapping in `tenants.ui_config.cookie_consent.tracker_categories`.
- **Optional follow-up:** consider engaging an Israeli privacy-law attorney to review the banner copy. This SPEC ships generic-but-correct text; a lawyer can fine-tune wording for full peace-of-mind.
