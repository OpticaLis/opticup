# ACTIVATION PROMPT — M3_PHONE_TEMPLATING_AND_CLEANUP

Paste the block below into Claude Code (ERP repo) when the current task is complete.

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_PHONE_TEMPLATING_AND_CLEANUP/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro + migrations) AND
opticalis/opticup-storefront (storefront — for source changes).
Branches: develop in both repos. NEVER push to main. Daniel merges main via
GitHub PR per feedback_main_merge_via_pr.

Background: SPEC closes Site Overseer REC-SITE-002 (phantom phone
053-434-7265 rendered on every Prizma homepage + 21 CMS rows). Two
deliverables in one execution:

1. ARCHITECTURE: introduce two-channel phone templates (phone_general +
   phone_catalog) in tenant.ui_config + view layer + storefront source.
   Both channels = 053-364-5404 today; future-proofs Daniel's plan to
   route product-page calls to a branch number later via single
   Supabase UPDATE, no redeploy.

2. CLEANUP: replace the 21 CMS row literals with {{phone_general}}
   tokens, delete 2 _deprecated/ files + 1 misnamed PNG, update 1 seed
   SQL, add 1 historical-note doc.

Authorities:
- Level 2 SQL UPDATE on tenants.ui_config (prizma + demo) — AUTHORIZED.
- Level 3 DDL on v_public_tenant (additive view extension) — AUTHORIZED.
- File deletes per SPEC §4 whitelist — AUTHORIZED.
- Storefront source modifications per §4 whitelist — AUTHORIZED.

Stop triggers (per SPEC §6 + §7):
- Product-page audit shows no existing phone CTA pattern → ASK Daniel.
- View extension breaks ANY existing consumer → roll back.
- CMS substitution makes invalid JSON → STOP.
- More than 25 rows match (premise was 21) → STOP, reconcile.
- Vercel build fails → STOP.
- Live homepage still shows 053-434-7265 after deploy → STOP, may be
  cache; wait 5 min retry, escalate if persists.

Order of operations (SPEC §10):
  apply migrations → edit storefront source → update CMS rows → build →
  push storefront develop → DELIVER PR LINK to Daniel for main merge →
  wait for merge + Vercel deploy → verify live → commit ERP retrospective.

Final deliverable: TWO atomic commits (one per repo). Plus EXECUTION_REPORT.md
+ FINDINGS.md in the SPEC folder. Plus updated HANDOFF + DECISIONS_LOG.

Begin Step 0 per SPEC §3. Stop only on deviation from numbered success
criterion in SPEC §5.
```

---

**Notes for Daniel:**

- Estimated execution: 2-4 hours wall time.
- Risk: LOW-to-MEDIUM. DB writes (UPDATE on prizma.ui_config + DDL view
  extension) — both authorized, both reversible (down migration provided).
  Source changes pass through PR flow + Vercel build before going live.
- After Claude Code pushes to develop on the storefront, you'll get a
  GitHub PR link. Review it briefly, then click Merge. Vercel auto-deploys.
  Total time for that step: ~5 minutes including the build.
- After deploy, the executor verifies live and only THEN commits the ERP
  retrospective.
- Future-proof effect: when you decide to route product-page calls to
  the branch number, ONE Supabase UPDATE flips every product surface,
  no redeploy, no content edits, no risk.
