# ACTIVATION PROMPT — M3_TENANT_NAME_FALLBACK_SAAS

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro) AND
opticalis/opticup-storefront (storefront — for the implementation).
Branches: develop. Daniel merges main via GitHub PR.

Background: Closes REC-SITE-006. The 13 hardcoded `?? 'Optic Up'`
fallback strings in storefront pages are replaced with a SaaS-clean
build-time-generated tenant fallback map. Future tenant onboarding
requires zero code changes for the name fallback — the build script
queries the DB and regenerates src/data/tenant-fallback-map.json each
build.

Daniel preference (Memory feedback_always_saas_clean.md):
SaaS-clean over quick-fix even at 2-4× time cost. This SPEC implements
the SaaS-clean path; do NOT propose mass-string-replace alternatives.

Three deliverables (storefront repo):
1. NEW scripts/generate-tenant-fallback-map.mjs — queries v_public_tenant
   at build time, writes src/data/tenant-fallback-map.json
2. NEW resolveTenantNameFallback(request, locale) export in src/lib/tenant.ts
3. MODIFY 13 .astro pages: replace `?? 'Optic Up'` with the new resolver

Plus chain script in package.json build step. Plus criterion-14
failure-mode test (temporary tenant.ts breakage to confirm fallback
fires correctly under simulated DB-down conditions). Plus criterion-15
future-tenant test (script handles new domain entries correctly).

Whitelist of write paths (storefront):
- scripts/generate-tenant-fallback-map.mjs (CREATE)
- src/data/tenant-fallback-map.json (CREATE, committed)
- src/lib/tenant.ts (MODIFY — add export)
- 13 .astro files in src/pages/ (MODIFY)
- package.json (MODIFY — chain script before astro build)

Whitelist (ERP):
- modules/Module 3 - Storefront/docs/specs/M3_TENANT_NAME_FALLBACK_SAAS/
  EXECUTION_REPORT.md + FINDINGS.md (CREATE)
- roles/site-overseer/SITE_OVERSEER_HANDOFF.md (UPDATE)
- roles/site-overseer/DECISIONS_LOG.md (APPEND)

NO DB writes. NO Astro renderer changes. NO touching submit.ts (out-of-
scope per REC-SITE-005). NEVER hardcode tenant-specific strings in the
script or fallback function — all values come from the DB-generated JSON.

Stop triggers (per SPEC §7 + §8):
- Step 0 finds >13 or <8 .astro instances → STOP, scope drift
- npm run build fails → STOP, do not commit
- Criterion 14 simulated test still shows "Optic Up" → STOP, fallback
  not wired correctly
- Criterion 15 future-tenant test fails → STOP
- Vercel build env lacks Supabase creds for build-time script → STOP,
  escalate to Daniel
- Any tenant-specific string discovered in script or function code →
  STOP, refactor to map-driven

Two atomic commits expected:
- Storefront: "feat(storefront): SaaS-clean tenant-name fallback (closes REC-SITE-006)"
- ERP: "chore(spec): close M3_TENANT_NAME_FALLBACK_SAAS"

After storefront push to develop → open PR to main → ASK DANIEL to click
Merge. Then proceed with ERP retrospective commit.

Begin Step 0 per SPEC §4. Stop only on deviation from numbered success
criterion in SPEC §6.
```

---

**Notes for Daniel:**

- Estimated execution: 1.5-2.5 hours.
- Risk: LOW. Fallback paths only fire on failure conditions. Normal operation unchanged.
- ONE thing you'll do: click "Merge" on the GitHub PR for the storefront commit (~30 seconds).
- After: zero tenant-name-fallback code paths show "Optic Up" anywhere. Adding a future tenant requires zero code changes — the build map regenerates automatically.
