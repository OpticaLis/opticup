# ACTIVATION PROMPT — M3_PHONE_434_LEGACY_CLEANUP

Paste the block below into Claude Code (ERP repo).

---

```
Execute SPEC at:
modules/Module 3 - Storefront/docs/specs/M3_PHONE_434_LEGACY_CLEANUP/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repos: BOTH opticalis/opticup (ERP — for SPEC retro) AND
opticalis/opticup-storefront (storefront — for the 3 file deletes).
Branches: develop. Daniel merges main via GitHub PR.

Background: Closes REC-SITE-002 (file-level half). The 053-434-7265
phone-cleanup at the CMS-row layer was done by M3_PHONE_TEMPLATING_AND_CLEANUP.
This SPEC removes the 3 remaining file-level legacy artifacts:

1. opticup-storefront/public/images/lab/israel-hayom-logo.png
   (misnamed HTML, NOT a PNG — verified 0 references in src/)
2. opticup-storefront/src/_deprecated/legal-terms.ts
   (defunct, _deprecated/ folder)
3. opticup-storefront/src/_deprecated/legal-privacy.ts
   (defunct, _deprecated/ folder)

All 3 verified by Site Overseer pre-flight to have ZERO live references.
The prizma-optice.co.il typo finding from REC-SITE-002 is closed as
already-resolved (0 occurrences in live CMS); it lives only in historical
docs and auto-regenerable SEO cache files.

Whitelist of operations:
- DELETE the 3 storefront files listed above
- (optional) DELETE empty src/_deprecated/ folder if no other files remain
- CREATE EXECUTION_REPORT.md + FINDINGS.md in ERP SPEC folder
- UPDATE __LAUNCH_PLAN_DRAFT__/site-overseer/SITE_OVERSEER_HANDOFF.md
- APPEND __LAUNCH_PLAN_DRAFT__/site-overseer/DECISIONS_LOG.md

Stop triggers (per SPEC §6 + §7):
- Step 0 reveals ANY src/ import of the 3 files → STOP
- npm run build fails post-delete → STOP, roll back
- 4th file with 053-434-7265 appears outside §1 list → STOP, scope drift
- src/_deprecated/ contains files other than the 2 named → leave intact

Two atomic commits expected:
- Storefront: "chore(storefront): remove legacy 053-434-7265 artifacts"
- ERP: "chore(spec): close M3_PHONE_434_LEGACY_CLEANUP"

After storefront push to develop → open PR to main → ASK DANIEL to click
Merge. Then proceed with ERP retrospective commit.

Begin Step 0 per SPEC §3. Stop only on deviation from numbered success
criterion in SPEC §5.
```

---

**Notes for Daniel:**

- Estimated execution: 15-30 minutes.
- Risk: VERY LOW. All 3 files have ZERO live references; deleting them is hygiene only. Production is unaffected.
- ONE thing you'll do: click "Merge" on the GitHub PR for the storefront commit (~30 seconds).
- After: REC-SITE-002 closed. The defunct phone `053-434-7265` is fully eliminated from the customer-facing surface. Last CRITICAL finding from the audit handled.
