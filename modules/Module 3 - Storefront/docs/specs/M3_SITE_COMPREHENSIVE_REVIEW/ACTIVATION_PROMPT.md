# ACTIVATION PROMPT — M3_SITE_COMPREHENSIVE_REVIEW

Paste the block below into Claude Code (ERP repo) when ready to run the audit.

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SPEC.md

Mode: opticup-executor, Bounded Autonomy. Acting as Site Overseer (Mode A
discovery — first time creating SITE_MAP.md baseline).
Repo: opticalis/opticup (ERP). Branch: develop.

Background: Daniel directive 2026-05-06 after the 050-717-5675 phone-leak
incident — comprehensive read-only audit of prizma-optic.co.il + its
storefront_pages CMS + Astro source. Customer-facing priority. Findings
only — NO code changes, NO DB writes, NO deploys. The output is a
SITE_AUDIT_REPORT.md that Daniel reads to decide what to fix next, plus the
first Site Overseer SITE_MAP.md baseline so future targeted audits can read
specific slices without re-scanning everything.

Tooling: prefer Chrome MCP / Playwright for rendered-DOM audits over
source-grep (per FOREMAN lessons). Use Supabase MCP execute_sql for
read-only DB cross-references. Use pa11y / axe-core / Lighthouse / PageSpeed
for performance + accessibility tiers.

Whitelist of files you may CREATE (everything else is out of scope):
1. modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/SITE_AUDIT_REPORT.md
2. modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/EXECUTION_REPORT.md
3. modules/Module 3 - Storefront/docs/specs/M3_SITE_COMPREHENSIVE_REVIEW/FINDINGS.md
4. __LAUNCH_PLAN_DRAFT__/site-overseer/SITE_MAP.md
5. __LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md (overwrite ok)
6. __LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md (create empty stub)

Stop triggers (in addition to global):
- Homepage 5xx → escalate
- Any CRITICAL finding involving exposed secrets in client bundle → escalate
- >2 hours wall time → report progress, ask Daniel for scope reduction
- More than 50 findings in any single category → possible methodology error
- Need to write to DB to verify a finding → DON'T; flag as follow-up SPEC

Final deliverable: ONE atomic commit on develop. Commit message starts with
"audit(storefront): comprehensive site review M3_SITE_COMPREHENSIVE_REVIEW".

Begin Step 0 (audit harness sanity check) per SPEC §3. Stop only on
deviation from numbered success criterion in SPEC §5. Report progress every
10-15 findings or every page-tier completion.
```

---

**Notes for Daniel:**

- Estimated execution: 4-8 hours wall time. The audit is deliberately wide
  (7 categories × ~30 slugs × 3 langs).
- Risk: VERY LOW. Read-only audit, no production writes, no deploys.
- If the audit hits the 2-hour stop-trigger or 50-findings-per-category
  trigger, the executor will pause and ask whether to narrow scope.
- After completion: open SITE_AUDIT_REPORT.md. Daniel reviews findings,
  decides which become follow-up SPECs (via Site Overseer Mode B).
- The Site Overseer transitions to Mode B after this SPEC closes, meaning
  future "check the about page" or "verify all phone numbers" requests
  will be much faster — they'll read the SITE_MAP.md slice instead of
  re-scanning everything.
