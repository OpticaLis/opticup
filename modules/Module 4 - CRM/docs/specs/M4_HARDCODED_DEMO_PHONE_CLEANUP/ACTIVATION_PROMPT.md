# ACTIVATION PROMPT — M4_HARDCODED_DEMO_PHONE_CLEANUP

Paste the block below into Claude Code (ERP repo) when the current task is complete.

---

```
Execute SPEC at:
modules/Module 4 - CRM/docs/specs/M4_HARDCODED_DEMO_PHONE_CLEANUP/SPEC.md

Mode: opticup-executor, Bounded Autonomy.
Repo: opticalis/opticup (ERP). Branch: develop.

Background (one paragraph): On 2026-05-06 the Prizma storefront displayed an
unfamiliar phone number (050-717-5675) in the top bar. Site Overseer traced it
to a decorative comment in modules/crm/crm-helpers.js:16 (commit 3fb06b7,
2026-04-20) that was an invented format-conversion example, never a real
Prizma number. SPEC M4_HARDCODED_PRIZMA_REMOVAL (today) promoted the value
from a copied location (modules/crm/crm-messaging-templates.js:338) to
tenants.business_phone for prizma, and the storefront read it. The DB has
already been hot-fixed to '053-3645404' (verified live). This SPEC closes the
regression vector: replace the decorative comment with a placeholder, correct
the migration file's hardcoded value, add a project-wide LEARNINGS entry
(L-PROJECT-001) constraining future skills/SPECs from making the same class
of mistake, and fix one MODULE_MAP citation.

Do NOT touch the production DB (already correct). Do NOT modify EFs. Do NOT
edit historical SPEC files in docs/specs/M4_HARDCODED_PRIZMA_REMOVAL/ or
docs/specs/M4_OVERNIGHT_AUDIT/ — those are historical records.

Whitelist of editable files (everything else is out of scope):
1. modules/crm/crm-helpers.js
2. modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_up.sql
3. modules/Module 4 - CRM/migrations/2026_05_06_tenant_config_seed_down.sql
4. docs/LEARNINGS.md (create if missing)
5. modules/Module 4 - CRM/docs/MODULE_MAP.md

Final deliverable: ONE atomic commit on develop, pushed. Plus
EXECUTION_REPORT.md + FINDINGS.md in the SPEC folder.

Begin Step 1 (per SPEC §5). Stop only on deviation from a numbered success
criterion in SPEC §3. Report progress every 3-4 steps.
```

---

**Notes for Daniel:**

- Estimated execution time: 10-15 minutes (5 small file edits + verification + commit).
- Risk: LOW. No production data writes, no EF deploys, no schema changes.
- After Claude Code finishes, the Site Overseer will read EXECUTION_REPORT.md + FINDINGS.md and the next opticup-strategic session will write FOREMAN_REVIEW.md per the standard lifecycle.
